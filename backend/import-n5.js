/**
 * Import JLPT N5 vocabulary from Excel into the Nihongo Vocab database
 * 
 * Maps word types from Excel to database categories:
 * - Kata benda, Kata ganti, Angka, Counter, Kata tanya, Kata penentu → "Kata Benda" category
 * - Kata kerja → "Kata Kerja" category
 * - Kata sifat-i, Kata sifat-na → "Kata Sifat" category
 * - Kata keterangan, Ungkapan, Penghubung, Partikel, etc → "Lainnya" category
 */

const XLSX = require('xlsx');
const path = require('path');
const db = require('./db/index.js');

const EXCEL_PATH = path.join(__dirname, '..', 'JLPT_N5_Full_Vocabulary_List.xlsx');

// Map Excel "Kelas Kata" to our category names
const WORD_TYPE_MAP = {
  'Kata benda': { category: 'Kata Benda', type: 'noun' },
  'Kata ganti': { category: 'Kata Benda', type: 'noun' },
  'Angka': { category: 'Kata Benda', type: 'noun' },
  'Counter': { category: 'Kata Benda', type: 'noun' },
  'Kata tanya': { category: 'Kata Benda', type: 'noun' },
  'Kata penentu': { category: 'Kata Benda', type: 'noun' },
  'Kata kerja': { category: 'Kata Kerja', type: 'verb' },
  'Kata sifat-i': { category: 'Kata Sifat', type: 'adjective' },
  'Kata sifat-na': { category: 'Kata Sifat', type: 'adjective' },
  'Kata keterangan': { category: 'Lainnya', type: 'other' },
  'Ungkapan': { category: 'Lainnya', type: 'other' },
  'Penghubung': { category: 'Lainnya', type: 'other' },
  'Partikel': { category: 'Lainnya', type: 'other' },
  'Kata keterangan / penghubung': { category: 'Lainnya', type: 'other' },
};

function importN5Vocabulary() {
  console.log('📖 Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['Kosakata N5 Lengkap'];
  const rawData = XLSX.utils.sheet_to_json(sheet);

  // The columns have weird names due to merged header cells
  const COL_KEY = Object.keys(rawData[0])[0]; // First column (No / section header)
  const COL_KANJI = '__EMPTY';
  const COL_HIRAGANA = '__EMPTY_1';
  const COL_ROMAJI = '__EMPTY_2';
  const COL_TYPE = '__EMPTY_3';
  const COL_MEANING = '__EMPTY_4';
  const COL_EXAMPLE_JP = '__EMPTY_5';
  const COL_EXAMPLE_ID = '__EMPTY_6';

  // Filter only actual word rows (have hiragana + word type, skip header row)
  const wordRows = rawData.filter(row => 
    row[COL_HIRAGANA] && 
    row[COL_TYPE] && 
    row[COL_TYPE] !== 'Kelas Kata' // skip header
  );

  console.log(`📊 Found ${wordRows.length} words to import`);

  // Get N5 level ID
  const level = db.prepare('SELECT id FROM levels WHERE code = ?').get('N5');
  if (!level) {
    console.error('❌ Level N5 not found in database!');
    process.exit(1);
  }

  // Get categories for N5
  const categories = db.prepare('SELECT id, name FROM categories WHERE level_id = ?').all(level.id);
  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.name] = c.id; });
  console.log('📂 Categories:', Object.keys(categoryMap).join(', '));

  // Prepare insert statement
  const insertWord = db.prepare(`
    INSERT OR IGNORE INTO words (category_id, japanese, hiragana, romaji, meaning, example_sentence_jp, example_sentence_id, word_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Track stats
  const stats = { inserted: 0, skipped: 0, errors: 0, byCategory: {} };

  // Use transaction for performance
  const importAll = db.transaction(() => {
    for (const row of wordRows) {
      try {
        const japanese = (row[COL_KANJI] || row[COL_HIRAGANA] || '').toString().trim();
        const hiragana = (row[COL_HIRAGANA] || '').toString().trim();
        const romaji = (row[COL_ROMAJI] || '').toString().trim();
        const wordTypeRaw = (row[COL_TYPE] || '').toString().trim();
        const meaning = (row[COL_MEANING] || '').toString().trim();
        const exampleJp = (row[COL_EXAMPLE_JP] || '').toString().trim();
        const exampleId = (row[COL_EXAMPLE_ID] || '').toString().trim();

        if (!japanese || !hiragana || !meaning) {
          stats.skipped++;
          continue;
        }

        // Map to our category
        const mapping = WORD_TYPE_MAP[wordTypeRaw] || { category: 'Lainnya', type: 'other' };
        const categoryId = categoryMap[mapping.category];

        if (!categoryId) {
          console.warn(`⚠️ Category not found for "${wordTypeRaw}" → "${mapping.category}"`);
          stats.errors++;
          continue;
        }

        const result = insertWord.run(
          categoryId,
          japanese,
          hiragana,
          romaji,
          meaning,
          exampleJp || null,
          exampleId || null,
          mapping.type
        );

        if (result.changes > 0) {
          stats.inserted++;
          stats.byCategory[mapping.category] = (stats.byCategory[mapping.category] || 0) + 1;
        } else {
          stats.skipped++;
        }
      } catch (err) {
        console.error(`❌ Error inserting word:`, err.message);
        stats.errors++;
      }
    }
  });

  importAll();

  // Activate N5 level since we now have content
  db.prepare('UPDATE levels SET is_active = 1 WHERE id = ?').run(level.id);

  console.log('\n✅ Import complete!');
  console.log(`📊 Results:`);
  console.log(`   ✅ Inserted: ${stats.inserted}`);
  console.log(`   ⏭️  Skipped (duplicates): ${stats.skipped}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  console.log(`\n📂 By category:`);
  Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} words`);
  });

  // Verify total
  const total = db.prepare('SELECT COUNT(*) as count FROM words WHERE category_id IN (SELECT id FROM categories WHERE level_id = ?)').get(level.id);
  console.log(`\n🎯 Total N5 words in database: ${total.count}`);
  console.log('🟢 Level N5 activated!');
}

importN5Vocabulary();
