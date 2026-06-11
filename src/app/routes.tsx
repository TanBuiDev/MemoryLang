import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
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

export const router = createBrowserRouter([
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
          { path: 'statistics', element: <Navigate to="/app/dashboard" replace /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
