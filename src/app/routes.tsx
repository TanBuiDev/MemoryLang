import React from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { AdminRoute } from '@/app/AdminRoute'
import { AppLoading } from '@/components/common/AppLoading'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DeckDetailPage } from '@/pages/decks/DeckDetailPage'
import { DeckListPage } from '@/pages/decks/DeckListPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { CreatePasswordPage } from '@/pages/public/CreatePasswordPage'
import { QuizResultPage } from '@/pages/quiz/QuizResultPage'
import { QuizSessionPage } from '@/pages/quiz/QuizSessionPage'
import { QuizSetupPage } from '@/pages/quiz/QuizSetupPage'
import { ReviewTodayPage } from '@/pages/review/ReviewTodayPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { FlashcardStudyPage } from '@/pages/study/FlashcardStudyPage'
import { StudyResultPage } from '@/pages/study/StudyResultPage'
import { StudySetupPage } from '@/pages/study/StudySetupPage'
import { TemplateBuilderPage } from '@/pages/templates/TemplateBuilderPage'
import { TemplateListPage } from '@/pages/templates/TemplateListPage'
import { AddVocabularyPage } from '@/pages/vocabulary/AddVocabularyPage'
import { VocabularyDetailPage } from '@/pages/vocabulary/VocabularyDetailPage'
import { VocabularyListPage } from '@/pages/vocabulary/VocabularyListPage'
import { TopicSelectionPage } from '@/pages/listening/TopicSelectionPage'
import { TestSelectionPage } from '@/pages/listening/TestSelectionPage'
import { PartSelectionPage } from '@/pages/listening/PartSelectionPage'
import { ListeningSessionPage } from '@/pages/listening/ListeningSessionPage'
import { ListeningResultPage } from '@/pages/listening/ListeningResultPage'
import { GrammarPage } from '@/pages/grammar/GrammarPage'
import { ErrorPage } from '@/pages/public/ErrorPage'
import { ComingSoonPage } from '@/pages/public/ComingSoonPage'

// Lazy-load Admin Layout & Pages
const LazyAdminLayout = React.lazy(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboardPage = React.lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = React.lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminTtsPage = React.lazy(() => import('@/pages/admin/AdminTtsPage'))
const AdminSecretsPage = React.lazy(() => import('@/pages/admin/AdminSecretsPage'))
const AdminFeaturesPage = React.lazy(() => import('@/pages/admin/AdminFeaturesPage'))
const AdminVocabularyPage = React.lazy(() => import('@/pages/admin/AdminVocabularyPage'))
const AdminGrammarPage = React.lazy(() => import('@/pages/admin/AdminGrammarPage'))
const AdminListeningPage = React.lazy(() => import('@/pages/admin/AdminListeningPage'))
const AdminStoragePage = React.lazy(() => import('@/pages/admin/AdminStoragePage'))
const AdminFunctionsPage = React.lazy(() => import('@/pages/admin/AdminFunctionsPage'))
const AdminI18nPage = React.lazy(() => import('@/pages/admin/AdminI18nPage'))
const AdminAuditPage = React.lazy(() => import('@/pages/admin/AdminAuditPage'))
const AdminAnalyticsPage = React.lazy(() => import('@/pages/admin/AdminAnalyticsPage'))
const AdminNotificationsPage = React.lazy(() => import('@/pages/admin/AdminNotificationsPage'))
const GrammarLessonPage = React.lazy(() => import('@/pages/grammar/GrammarLessonPage'))
const AdminGrammarLessonEditPage = React.lazy(() => import('@/pages/admin/AdminGrammarLessonEditPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <Navigate to="/login" replace /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/create-password', element: <CreatePasswordPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/app',
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/app/dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'vocabulary', element: <VocabularyListPage /> },
              { path: 'vocabulary/new', element: <AddVocabularyPage /> },
              { path: 'vocabulary/:id', element: <VocabularyDetailPage /> },
              { path: 'decks', element: <DeckListPage /> },
              { path: 'decks/:id', element: <DeckDetailPage /> },
              { path: 'study', element: <StudySetupPage /> },
              { path: 'study/session/:sessionId', element: <FlashcardStudyPage /> },
              { path: 'study/result/:sessionId', element: <StudyResultPage /> },
              { path: 'quiz', element: <QuizSetupPage /> },
              { path: 'quiz/session/:sessionId', element: <QuizSessionPage /> },
              { path: 'quiz/result/:resultId', element: <QuizResultPage /> },
              { path: 'review', element: <ReviewTodayPage /> },
              { path: 'templates', element: <TemplateListPage /> },
              { path: 'templates/new', element: <TemplateBuilderPage /> },
              { path: 'templates/:id/edit', element: <TemplateBuilderPage /> },
              { path: 'listening', element: <TopicSelectionPage /> },
              { path: 'listening/:topicId', element: <TestSelectionPage /> },
              { path: 'listening/:topicId/:testId', element: <PartSelectionPage /> },
              { path: 'listening/session/:partId/:mode', element: <ListeningSessionPage /> },
              { path: 'listening/result/:partId', element: <ListeningResultPage /> },
              { path: 'grammar', element: <GrammarPage /> },
              {
                path: 'grammar/:topicId',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <GrammarLessonPage />
                  </React.Suspense>
                ),
              },
              { path: 'statistics', element: <Navigate to="/app/dashboard" replace /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: '*', element: <ComingSoonPage /> },
            ],
          },
          // Admin Routes Group
          {
            element: <AdminRoute />,
            children: [
              {
                path: '/app/admin',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <LazyAdminLayout />
                  </React.Suspense>
                ),
                children: [
                  { index: true, element: <AdminDashboardPage /> },
                  { path: 'users', element: <AdminUsersPage /> },
                  { path: 'tts', element: <AdminTtsPage /> },
                  { path: 'secrets', element: <AdminSecretsPage /> },
                  { path: 'features', element: <AdminFeaturesPage /> },
                  // Phase 3 & 4 routes mapping to real pages
                  { path: 'vocabulary', element: <AdminVocabularyPage /> },
                  { path: 'grammar', element: <AdminGrammarPage /> },
                  {
                    path: 'grammar/:topicId',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminGrammarLessonEditPage />
                      </React.Suspense>
                    ),
                  },
                  { path: 'listening', element: <AdminListeningPage /> },
                  { path: 'storage', element: <AdminStoragePage /> },
                  { path: 'functions', element: <AdminFunctionsPage /> },
                  { path: 'i18n', element: <AdminI18nPage /> },
                  { path: 'audit', element: <AdminAuditPage /> },
                  { path: 'analytics', element: <AdminAnalyticsPage /> },
                  { path: 'notifications', element: <AdminNotificationsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
