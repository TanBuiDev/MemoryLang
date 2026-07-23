import React from 'react'
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { AdminRoute } from '@/app/AdminRoute'
import { GlobalAiTutorModal } from '@/components/chat/GlobalAiTutorModal'
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
import { UpgradePage } from '@/pages/subscription/UpgradePage'
import { UpgradeSuccessPage } from '@/pages/subscription/UpgradeSuccessPage'
import { lazyWithChunkRecovery } from '@/utils/chunkLoadRecovery'

// Lazy-load Admin Layout & Pages
const LazyAdminLayout = lazyWithChunkRecovery(() => import('@/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboardPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazyWithChunkRecovery(() => import('@/pages/admin/AdminUsersPage'))
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
                path: 'chat',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <ChatPage />
                  </React.Suspense>
                ),
              },
              {
                path: 'grammar/:topicId',
                element: (
                  <React.Suspense fallback={<AppLoading />}>
                    <GrammarLessonPage />
                  </React.Suspense>
                ),
              },
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
              { path: 'upgrade', element: <UpgradePage /> },
              { path: 'upgrade/success', element: <UpgradeSuccessPage /> },
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
