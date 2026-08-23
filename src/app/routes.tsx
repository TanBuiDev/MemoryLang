import React from 'react'
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { AdminRoute } from '@/app/AdminRoute'
import { GlobalAiTutorModal } from '@/components/chat/GlobalAiTutorModal'
import { AppLoading } from '@/components/common/AppLoading'
import { FeatureGuard } from '@/components/auth/FeatureGuard'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DeckDetailPage } from '@/pages/decks/DeckDetailPage'
import { DeckListPage } from '@/pages/decks/DeckListPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { MfaChallengePage } from '@/pages/public/MfaChallengePage'
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
import { UpgradePage } from '@/pages/subscription/UpgradePage'
import { UpgradeSuccessPage } from '@/pages/subscription/UpgradeSuccessPage'
import { lazyWithChunkRecovery } from '@/utils/chunkLoadRecovery'

// Lazy-load Admin Layout & Pages
const LazyAdminLayout = lazyWithChunkRecovery(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboardPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminUsersPage'))
const AdminRolesPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminRolesPage'))
const AdminSubscriptionsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminSubscriptionsPage'))
const AdminTtsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminTtsPage'))
const AdminSecretsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminSecretsPage'))
const AdminFeaturesPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminFeaturesPage'))
const AdminVocabularyPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminVocabularyPage'))
const AdminGrammarPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminGrammarPage'))
const AdminListeningPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminListeningPage'))
const AdminStoragePage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminStoragePage'))
const AdminFunctionsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminFunctionsPage'))
const AdminI18nPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminI18nPage'))
const AdminAuditPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminAuditPage'))
const AdminAnalyticsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminAnalyticsPage'))
const AdminNotificationsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminNotificationsPage'))
const GrammarLessonPage = lazyWithChunkRecovery(() => import('@/pages/grammar/GrammarLessonPage'))
const ChatPage = lazyWithChunkRecovery(() => import('@/pages/chat/ChatPage').then(m => ({ default: m.ChatPage })))
const AdminGrammarLessonEditPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminGrammarLessonEditPage'))
const GameHubPage = lazyWithChunkRecovery(() => import('@/pages/games/GameHubPage'))
const MatchingGamePage = lazyWithChunkRecovery(() => import('@/pages/games/MatchingGamePage'))
const AdminGamesPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminGamesPage'))
const AdminSoundsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminSoundsPage'))
const ReadingHubPage = lazyWithChunkRecovery(() => import('@/pages/reading/ReadingHubPage'))
const ReadingDetailPage = lazyWithChunkRecovery(() => import('@/pages/reading/ReadingDetailPage'))
const AdminReadingListPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminReadingListPage'))
const AdminReadingEditorPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminReadingEditorPage'))
const AdminExamsPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminExamsPage'))
const AdminExamBuilderPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminExamBuilderPage'))
const AdminB1ExamContentBuilderPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminB1ExamContentBuilderPage'))
const AdminExamMediaPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminExamMediaPage'))
const ExamHubPage = lazyWithChunkRecovery(() => import('@/pages/exams/ExamHubPage').then(m => ({ default: m.ExamHubPage })))
const ExamAttemptPage = lazyWithChunkRecovery(() => import('@/pages/exams/ExamAttemptPage').then(m => ({ default: m.ExamAttemptPage })))
const ExamResultPage = lazyWithChunkRecovery(() => import('@/pages/exams/ExamResultPage').then(m => ({ default: m.ExamResultPage })))
const StandaloneLayout = lazyWithChunkRecovery(() => import('@/components/layout/StandaloneLayout').then(m => ({ default: m.StandaloneLayout })))
const StandaloneExamLandingPage = lazyWithChunkRecovery(() => import('@/pages/exams/StandaloneExamLandingPage').then(m => ({ default: m.StandaloneExamLandingPage })))

function RootLayout() {
  return (
    <>
      <Outlet />
      <GlobalAiTutorModal />
    </>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/mfa-challenge', element: <MfaChallengePage /> },
      { path: '/register', element: <Navigate to="/login" replace /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/create-password', element: <CreatePasswordPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/e',
            element: (
              <React.Suspense fallback={<AppLoading />}>
                <StandaloneLayout />
              </React.Suspense>
            ),
            children: [
              { path: ':examId', element: <React.Suspense fallback={<AppLoading />}><StandaloneExamLandingPage /></React.Suspense> },
              { path: 'attempt/:attemptId', element: <React.Suspense fallback={<AppLoading />}><ExamAttemptPage /></React.Suspense> },
              { path: 'attempt/:attemptId/result', element: <React.Suspense fallback={<AppLoading />}><ExamResultPage /></React.Suspense> },
            ]
          },
          {
            path: '/app',
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/app/dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              
              /* Vocabulary Module */
              {
                element: <FeatureGuard flag="vocabulary_module" />,
                children: [
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
                ],
              },

              { path: 'templates', element: <TemplateListPage /> },
              { path: 'templates/new', element: <TemplateBuilderPage /> },
              { path: 'templates/:id/edit', element: <TemplateBuilderPage /> },

              /* Listening Module */
              {
                element: <FeatureGuard flag="listening_module" />,
                children: [
                  { path: 'listening', element: <TopicSelectionPage /> },
                  { path: 'listening/:topicId', element: <TestSelectionPage /> },
                  { path: 'listening/:topicId/:testId', element: <PartSelectionPage /> },
                  { path: 'listening/session/:partId/:mode', element: <ListeningSessionPage /> },
                  { path: 'listening/result/:partId', element: <ListeningResultPage /> },
                ],
              },

              /* Grammar Module */
              {
                element: <FeatureGuard flag="grammar_module" />,
                children: [
                  { path: 'grammar', element: <GrammarPage /> },
                  {
                    path: 'grammar/:topicId',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <GrammarLessonPage />
                      </React.Suspense>
                    ),
                  },
                ],
              },

              {
                path: 'chat',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <ChatPage />
                  </React.Suspense>
                ),
              },

              /* Reading Module */
              {
                element: <FeatureGuard flag="reading_module" />,
                children: [
                  {
                    path: 'reading',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <ReadingHubPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'reading/:articleId',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <ReadingDetailPage />
                      </React.Suspense>
                    ),
                  },
                ],
              },

              { path: 'upgrade', element: <UpgradePage /> },
              { path: 'upgrade/success', element: <UpgradeSuccessPage /> },

              {
                path: 'exams',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <ExamHubPage />
                  </React.Suspense>
                ),
              },
              {
                path: 'exams/attempt/:attemptId',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <ExamAttemptPage />
                  </React.Suspense>
                ),
              },
              {
                path: 'exams/attempt/:attemptId/result',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <ExamResultPage />
                  </React.Suspense>
                ),
              },

              /* Games Module */
              {
                element: <FeatureGuard flag="games_module" />,
                children: [
                  {
                    path: 'games',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <GameHubPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'games/matching',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <MatchingGamePage />
                      </React.Suspense>
                    ),
                  },
                ],
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
                  { path: 'roles', element: <AdminRolesPage /> },
                  { path: 'subscriptions', element: <AdminSubscriptionsPage /> },
                  { path: 'tts', element: <AdminTtsPage /> },
                  {
                    path: 'sounds',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminSoundsPage />
                      </React.Suspense>
                    ),
                  },
                  { path: 'secrets', element: <AdminSecretsPage /> },
                   { path: 'features', element: <AdminFeaturesPage /> },
                  {
                    path: 'games',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminGamesPage />
                      </React.Suspense>
                    ),
                  },
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
                  { path: 'exams/:id/media', element: <AdminExamMediaPage /> },
                  {
                    path: 'reading',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminReadingListPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'reading/new',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminReadingEditorPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'reading/:id/edit',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminReadingEditorPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'exams',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminExamsPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'exams/:id/builder',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminExamBuilderPage />
                      </React.Suspense>
                    ),
                  },
                  {
                    path: 'exams/:id/content',
                    element: (
                      <React.Suspense fallback={<AppLoading />}>
                        <AdminB1ExamContentBuilderPage />
                      </React.Suspense>
                    ),
                  },
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
