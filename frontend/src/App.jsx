import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './lib/auth';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FlashcardPage from './pages/FlashcardPage';
import TestPage from './pages/TestPage';
import StudyPlanSetupPage from './pages/StudyPlanSetupPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ContentManagementPage from './pages/admin/ContentManagementPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AISettingsPage from './pages/settings/AISettingsPage';
import AITutorPage from './pages/AITutorPage';
import VocabularyPage from './pages/VocabularyPage';
import { PenTool } from 'lucide-react';



export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes with layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/flashcard"
        element={
          <ProtectedRoute>
            <Layout><FlashcardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/:levelCode"
        element={
          <ProtectedRoute>
            <Layout><StudyPlanSetupPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test"
        element={
          <ProtectedRoute>
            <Layout><TestPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kanji"
        element={
          <ProtectedRoute>
            <Layout>
              <ComingSoonPage
                title="Latihan Kanji ✍️"
                icon={PenTool}
                description="Fitur latihan menulis kanji dengan canvas akan segera hadir. Nantikan!"
              />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout><AnalyticsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Layout><LeaderboardPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/ai"
        element={
          <ProtectedRoute>
            <Layout><AISettingsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-tutor"
        element={
          <ProtectedRoute>
            <Layout><AITutorPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vocabulary"
        element={
          <ProtectedRoute>
            <Layout><VocabularyPage /></Layout>
          </ProtectedRoute>
        }
      />


      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout><AdminDashboardPage /></Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/content"
        element={
          <AdminRoute>
            <Layout><ContentManagementPage /></Layout>
          </AdminRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
