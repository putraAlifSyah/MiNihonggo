/**
 * AES-256-GCM encryption/decryption for API keys.
 * Key must be 32-byte hex string in AI_ENCRYPTION_KEY env var.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_SOURCE = process.env.AI_ENCRYPTION_KEY || 'nihongo-vocab-default-encryption-key-2024';

// Always derive exactly 32 bytes via SHA-256 — safe regardless of KEY_SOURCE format
const KEY = crypto.createHash('sha256').update(KEY_SOURCE).digest();

/**
 * Encrypt a plaintext string.
 * @param {string} text - Plain text to encrypt
 * @returns {string} - JSON string: { iv, authTag, ciphertext }
 */
function encrypt(text) {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let ciphertext = cipher.update(text, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag,
    ciphertext,
  });
}

/**
 * Decrypt a previously encrypted value.
 * @param {string} stored - JSON string from encrypt()
 * @returns {string} - Original plain text
 */
function decrypt(stored) {
  try {
    const { iv, authTag, ciphertext } = JSON.parse(stored);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let text = decipher.update(ciphertext, 'hex', 'utf8');
    text += decipher.final('utf8');
    return text;
  } catch (err) {
    throw new Error('Failed to decrypt API key — check AI_ENCRYPTION_KEY');
  }
}

module.exports = { encrypt, decrypt };
