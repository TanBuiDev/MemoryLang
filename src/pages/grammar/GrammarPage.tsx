import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, PencilLine, Check, X, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useI18n } from '@/i18n'
import { grammarService } from '@/services/supabase/grammar.service'
import type { GrammarTopic, GrammarExercise } from '@/types/admin.types'

type Tab = 'reference' | 'practice'

const demoGrammarTopics: GrammarTopic[] = [
  {
    id: 'demo-used-to',
    title: 'Used to + V',
    category: 'Verb Patterns',
    level: 'intermediate',
    explanation: 'Dùng để diễn tả một thói quen hoặc hành động đã từng xảy ra thường xuyên trong quá khứ nhưng hiện tại không còn nữa.',
    examples: [
      { sentence: 'I used to play soccer when I was a child.', translation: 'Tôi đã từng chơi bóng đá khi còn là một đứa trẻ.' },
      { sentence: 'She used to live in London.', translation: 'Cô ấy đã từng sống ở London.' }
    ],
    is_published: true,
    created_at: new Date().toISOString()
  }
]

const demoGrammarExercises: Record<string, GrammarExercise[]> = {
  'demo-used-to': [
    {
      id: 'demo-ex-1',
      topic_id: 'demo-used-to',
      question: 'When I was young, I ________ go swimming every morning.',
      options: ['used to', 'am used to', 'use to', 'get used to'],
      answer: 'used to',
      explanation: 'Diễn tả thói quen trong quá khứ đã chấm dứt ở hiện tại dùng "used to + V-infinitive".',
      created_at: new Date().toISOString()
    }
  ]
}

export function GrammarPage() {
  const { t } = useI18n()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('reference')
  const [filterCat, setFilterCat] = useState<string>('all')
  
  // Trạng thái cho tab Practice
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState<GrammarTopic | null>(null)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  // Fetch topics
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['grammar-topics', user?.id],
    queryFn: async () => {
      if (!shouldUseRemoteData) return demoGrammarTopics
      try {
        const list = await grammarService.listTopics()
        return list.length > 0 ? list : demoGrammarTopics
      } catch (err) {
        console.error('Error fetching grammar topics:', err)
        return demoGrammarTopics
      }
    }
  })

  // Fetch exercises for selected topic
  const { data: exercises = [], isLoading: loadingExercises } = useQuery({
    queryKey: ['grammar-exercises', selectedPracticeTopic?.id],
    queryFn: async () => {
      if (!selectedPracticeTopic) return []
      if (!shouldUseRemoteData || selectedPracticeTopic.id.startsWith('demo-')) {
        return demoGrammarExercises[selectedPracticeTopic.id] || []
      }
      try {
        return await grammarService.listExercises(selectedPracticeTopic.id)
      } catch (err) {
        console.error('Error fetching grammar exercises:', err)
        return demoGrammarExercises[selectedPracticeTopic.id] || []
      }
    },
    enabled: Boolean(selectedPracticeTopic)
  })

  const categories = useMemo(() => {
    const cats = new Set<string>()
    topics.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [topics])

  const grouped = useMemo(() => {
    const map: Record<string, GrammarTopic[]> = {}
    for (const item of topics) {
      const cat = item.category || 'Other'
      if (!map[cat]) map[cat] = []
      map[cat].push(item)
    }
    return map
  }, [topics])

  const filteredCategories = filterCat === 'all' ? Object.keys(grouped).sort() : [filterCat]

  const currentExercise = exercises[practiceIndex]

  const handleStartPractice = (topic: GrammarTopic) => {
    setSelectedPracticeTopic(topic)
    setPracticeIndex(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setScore({ correct: 0, total: 0 })
    setTab('practice')
  }

  const handleSelectOption = (option: string) => {
    if (isAnswered) return
    setSelectedOption(option)
    const isCorrect = option === currentExercise.answer
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    setIsAnswered(true)
  }

  const handleNext = () => {
    setPracticeIndex((i) => i + 1)
    setSelectedOption(null)
    setIsAnswered(false)
  }

  const handleResetPractice = () => {
    setPracticeIndex(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setScore({ correct: 0, total: 0 })
  }

  const handleChooseOtherTopic = () => {
    setSelectedPracticeTopic(null)
  }

  if (loadingTopics) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('grammar.title')} description={t('grammar.description', { count: 0 })} />
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('grammar.title')}
        description={t('grammar.description', { count: topics.length })}
      />

      <div className="flex gap-2 border-b-2 border-border pb-0">
        <button
          onClick={() => setTab('reference')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
            tab === 'reference' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {t('grammar.reference')}
        </button>
        <button
          onClick={() => setTab('practice')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
            tab === 'practice' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PencilLine className="w-4 h-4" />
          {t('grammar.practice')}
        </button>
      </div>

      {tab === 'reference' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              className={`cursor-pointer ${filterCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              onClick={() => setFilterCat('all')}
            >
              {t('grammar.allCategories')}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                className={`cursor-pointer ${filterCat === cat ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
              >
                {cat} ({grouped[cat]?.length || 0})
              </Badge>
            ))}
          </div>

          {filteredCategories.map((cat) => (
            <div key={cat} className="flex flex-col gap-3">
              <h3 className="text-sm font-black uppercase text-muted-foreground mb-1 border-b-2 border-border pb-2 mt-4">{cat}</h3>
              <div className="grid gap-4">
                {grouped[cat]?.map((item) => (
                  <Card key={item.id} className="p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-base font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {item.title}
                          </code>
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[10px] uppercase">
                            {item.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground font-bold mt-3 bg-muted/40 p-3 rounded border border-border">
                          💡 {item.explanation}
                        </p>
                      </div>
                      <Button onClick={() => handleStartPractice(item)} className="shrink-0 text-xs py-1.5 px-3 min-h-0">
                        {t('grammar.practiceThisTopic')}
                      </Button>
                    </div>

                    {item.examples && item.examples.length > 0 && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-border">
                        <span className="text-xs font-black uppercase text-muted-foreground">{t('grammar.topicExamples')}</span>
                        <div className="grid gap-2">
                          {item.examples.map((ex, idx) => (
                            <div key={idx} className="p-2 border-l-2 border-primary/50 pl-3 text-sm bg-muted/20">
                              <p className="font-semibold italic text-foreground">{ex.sentence}</p>
                              {ex.translation && (
                                <p className="text-muted-foreground text-xs mt-0.5">{ex.translation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {topics.length === 0 && (
            <EmptyState
              title={t('grammar.emptyTitle')}
              description={t('grammar.emptyDescription')}
            />
          )}
        </div>
      ) : (
        // Tab Practice
        <div className="flex flex-col gap-4">
          {!selectedPracticeTopic ? (
            <Card className="p-5">
              <h3 className="text-md font-black mb-4">{t('grammar.selectTopicToPractice')}</h3>
              <div className="grid gap-3">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => handleStartPractice(topic)}
                    className="p-4 border-2 border-border rounded-md bg-card hover:bg-muted cursor-pointer transition flex justify-between items-center"
                  >
                    <div>
                      <span className="font-black text-sm text-foreground">{topic.title}</span>
                      <span className="ml-2 text-xs font-bold text-muted-foreground uppercase">({topic.category})</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]">
                      {topic.level}
                    </Badge>
                  </div>
                ))}
              </div>

              {topics.length === 0 && (
                <EmptyState
                  title={t('grammar.emptyTitle')}
                  description={t('grammar.emptyDescription')}
                />
              )}
            </Card>
          ) : loadingExercises ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded-lg" />
            </div>
          ) : exercises.length === 0 ? (
            <Card className="p-6 text-center">
              <CardTitle>Chưa có bài tập</CardTitle>
              <CardDescription className="mt-2">
                Chủ đề "{selectedPracticeTopic.title}" hiện tại chưa có câu hỏi luyện tập nào.
              </CardDescription>
              <Button onClick={handleChooseOtherTopic} className="mt-4">
                {t('grammar.chooseOtherTopic')}
              </Button>
            </Card>
          ) : practiceIndex >= exercises.length ? (
            // Kết quả luyện tập
            <Card className="p-6 flex flex-col items-center text-center gap-4">
              <CardTitle className="text-xl font-black">{t('grammar.score')}</CardTitle>
              <div className="neo-card p-4 rounded-lg bg-yellow-100 border-2 border-border w-48 shadow-[4px_4px_0_var(--border)]">
                <span className="text-3xl font-black text-foreground">
                  {score.correct} / {exercises.length}
                </span>
                <p className="text-xs font-bold text-muted-foreground mt-2">
                  {t('grammar.correctPercentage', { percentage: Math.round((score.correct / exercises.length) * 100) })}
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button onClick={handleResetPractice} variant="secondary">
                  {t('grammar.retry')}
                </Button>
                <Button onClick={handleChooseOtherTopic}>
                  {t('grammar.chooseOtherTopic')}
                </Button>
              </div>
            </Card>
          ) : (
            // Đang làm bài tập
            <Card className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-dashed border-border">
                <button
                  onClick={handleChooseOtherTopic}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại</span>
                </button>
                <span className="text-xs font-black uppercase text-muted-foreground">
                  {selectedPracticeTopic.title} — {practiceIndex + 1} / {exercises.length}
                </span>
              </div>

              <div className="my-2">
                <p className="text-lg font-bold text-foreground bg-muted/30 p-4 rounded border-2 border-border shadow-[2px_2px_0_var(--border)]">
                  {currentExercise.question}
                </p>
              </div>

              <div className="grid gap-3 mt-2">
                {currentExercise.options.map((option) => {
                  const isCurrentSelected = selectedOption === option
                  const isCorrectAnswer = option === currentExercise.answer
                  
                  let buttonStyle = 'border-border bg-card hover:bg-muted text-foreground'
                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      buttonStyle = 'border-green-500 bg-green-100 text-green-900 shadow-[2px_2px_0_#22c55e]'
                    } else if (isCurrentSelected) {
                      buttonStyle = 'border-red-500 bg-red-100 text-red-900 shadow-[2px_2px_0_#ef4444]'
                    } else {
                      buttonStyle = 'border-border bg-card opacity-60 text-muted-foreground'
                    }
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleSelectOption(option)}
                      disabled={isAnswered}
                      className={`neo-button min-h-0 text-sm font-semibold py-3 px-4 rounded-md border-2 text-left transition flex items-center justify-between ${buttonStyle}`}
                    >
                      <span>{option}</span>
                      {isAnswered && isCorrectAnswer && <Check size={16} className="text-green-600 shrink-0" />}
                      {isAnswered && isCurrentSelected && !isCorrectAnswer && <X size={16} className="text-red-600 shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {isAnswered && (
                <div className="p-4 bg-muted/40 rounded-lg border-2 border-border mt-4 flex flex-col gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {selectedOption === currentExercise.answer ? (
                      <span className="text-green-700">🎉 Chính xác!</span>
                    ) : (
                      <span className="text-red-700">❌ Chưa chính xác. Đáp án đúng là: <code className="bg-green-100 px-1.5 py-0.5 rounded text-green-800 font-mono font-black">{currentExercise.answer}</code></span>
                    )}
                  </p>
                  {currentExercise.explanation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 {currentExercise.explanation}
                    </p>
                  )}
                  <Button onClick={handleNext} className="self-end mt-2 text-xs py-1.5 px-4 min-h-0">
                    {t('grammar.next')}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
