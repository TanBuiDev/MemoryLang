import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Search,
  Filter,
  Flame,
  Clock,
  FileText,
  Lock,
  Crown,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { readingService } from '@/services/supabase/reading.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import type { CEFRLevel, ReadingArticle, ReadingFilters, ReadingStatsSummary } from '@/types/reading.types'
import { ReadingProModal } from '@/components/reading/ReadingProModal'
import { isRestrictedReadingTier } from '@/utils/readingContent'

const levelOptions = [
  { value: 'all', label: 'Tất cả Trình độ' },
  { value: 'A1', label: 'A1 - Beginner' },
  { value: 'A2', label: 'A2 - Elementary' },
  { value: 'B1', label: 'B1 - Intermediate' },
  { value: 'B2', label: 'B2 - Upper Intermediate' },
  { value: 'C1', label: 'C1 - Advanced' },
  { value: 'C2', label: 'C2 - Mastery' },
]

const purposeOptions = [
  { value: 'all', label: 'Tất cả Mục đích' },
  { value: 'IELTS', label: 'Luyện thi IELTS' },
  { value: 'TOEFL', label: 'Luyện thi TOEFL' },
  { value: 'General', label: 'Đọc Giao tiếp Chung' },
  { value: 'Academic', label: 'Học thuật Academic' },
]

const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'difficulty_asc', label: 'Độ khó: Dễ → Khó' },
  { value: 'difficulty_desc', label: 'Độ khó: Khó → Dễ' },
]

const DEMO_ARTICLES: ReadingArticle[] = [
  {
    id: 'demo-ai-future',
    title: 'The Future of Artificial Intelligence',
    subtitle: 'Exploring how AI will transform our world and daily work.',
    content_html: '<p>Artificial intelligence (AI) is rapidly transforming the way we live and work...</p>',
    plain_text: 'Artificial intelligence (AI) is rapidly transforming the way we live and work...',
    cefr_level: 'B2',
    difficulty: 'medium',
    topics: ['Technology', 'AI', 'Future'],
    purpose: 'IELTS',
    word_count: 850,
    estimated_reading_time: 7,
    audio_url: 'https://example.com/audio.mp3',
    audio_duration: 180,
    is_published: true,
    access_tier: 'free',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-climate-solutions',
    title: 'Global Climate Change Solutions',
    subtitle: 'Innovations in renewable energy and sustainability.',
    content_html: '<p>Climate change poses unprecedented challenges to our global ecosystem...</p>',
    plain_text: 'Climate change poses unprecedented challenges to our global ecosystem...',
    cefr_level: 'C1',
    difficulty: 'hard',
    topics: ['Environment', 'Science'],
    purpose: 'Academic',
    word_count: 1200,
    estimated_reading_time: 10,
    audio_url: null,
    audio_duration: null,
    is_published: true,
    access_tier: 'pro',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-daily-coffee',
    title: 'The History of Coffee Culture',
    subtitle: 'From ancient origins to modern espresso bars.',
    content_html: '<p>Coffee is one of the most popular beverages in the world...</p>',
    plain_text: 'Coffee is one of the most popular beverages in the world...',
    cefr_level: 'A2',
    difficulty: 'easy',
    topics: ['Culture', 'Lifestyle'],
    purpose: 'General',
    word_count: 450,
    estimated_reading_time: 4,
    audio_url: null,
    audio_duration: null,
    is_published: true,
    access_tier: 'free',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export function ReadingHubPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const hasProSubscription = useSubscriptionStore((s) => s.isPro)
  const isPro = Boolean(profile?.is_admin) || hasProSubscription

  const [articles, setArticles] = useState<ReadingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReadingStatsSummary | null>(null)
  const [proModalOpen, setProModalOpen] = useState(false)
  const [proModalReason, setProModalReason] = useState<string>('')

  // Filter state
  const [filters, setFilters] = useState<ReadingFilters>({
    level: 'all',
    purpose: 'all',
    search: '',
    sort: 'newest',
  })

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [result, userStats] = await Promise.all([
          readingService.listArticles(filters),
          readingService.getUserStats(),
        ])

        if (result.articles.length > 0) {
          setArticles(result.articles)
        } else {
          setArticles(DEMO_ARTICLES)
        }
        setStats(userStats)
      } catch (err) {
        console.error('Failed to load reading hub data:', err)
        setArticles(DEMO_ARTICLES)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [filters])

  const handleArticleClick = (article: ReadingArticle) => {
    if (isRestrictedReadingTier(article.access_tier) && !isPro) {
      setProModalReason('Bài đọc này dành riêng cho tài khoản Pro. Hãy nâng cấp để trải nghiệm!')
      setProModalOpen(true)
      return
    }
    navigate(`/app/reading/${article.id}`)
  }

  const getLevelColor = (level: CEFRLevel) => {
    switch (level) {
      case 'A1':
      case 'A2':
        return 'bg-emerald-100 text-emerald-900 border-slate-900'
      case 'B1':
      case 'B2':
        return 'bg-[#fdc800] text-slate-900 border-slate-900'
      case 'C1':
      case 'C2':
        return 'bg-purple-100 text-purple-900 border-slate-900'
      default:
        return 'bg-slate-100 text-slate-900 border-slate-900'
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Banner Neobrutalism */}
      <div className="neo-card p-6 sm:p-8 bg-[#432dd7] text-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#fdc800] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-full">
            <BookOpen className="w-4 h-4 text-slate-900" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Thư Viện Bài Đọc & Ngữ Cảnh
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Luyện Đọc Hiểu Đa Dạng Chủ Đề
          </h1>
          <p className="text-xs sm:text-sm font-bold text-indigo-100 leading-relaxed">
            Tuyển tập bài đọc báo, truyện ngắn, bài báo khoa học được phân cấp CEFR chuẩn xác. Tra từ điển trực tiếp và luyện nghe TTS tức thì.
          </p>
        </div>

        {/* User Stats Card in Hero */}
        <div className="neo-card p-4 bg-white text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl shrink-0 space-y-2.5 w-full md:w-64">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
            <span className="text-xs font-black uppercase text-slate-500">Tiến độ của bạn</span>
            <Flame size={18} className="text-amber-500 fill-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-amber-50 rounded-lg border border-slate-900">
              <span className="text-lg font-black text-slate-900">{stats?.total_articles_read ?? 0}</span>
              <p className="text-[10px] font-black uppercase text-slate-500">Bài đã đọc</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg border border-slate-900">
              <span className="text-lg font-black text-slate-900">{stats?.streak_days ?? 0} ngày</span>
              <p className="text-[10px] font-black uppercase text-slate-500">Streak đọc</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-amber-600" />
            <h2 className="text-base font-black text-slate-900">Bộ Lọc & Tìm Kiếm Bài Đọc</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setFilters({ level: 'all', purpose: 'all', search: '', sort: 'newest' })}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Đặt lại</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-1">
            <input
              type="text"
              placeholder="Tìm tên bài đọc, từ khóa..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border-2 border-slate-900 rounded-xl bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[2px_2px_0px_0px_#000]"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          {/* Level Select */}
          <Select
            value={filters.level || 'all'}
            onChange={(val) => setFilters((prev) => ({ ...prev, level: val as CEFRLevel | 'all' }))}
            options={levelOptions}
          />

          {/* Purpose Select */}
          <Select
            value={filters.purpose || 'all'}
            onChange={(val) => setFilters((prev) => ({ ...prev, purpose: val as any }))}
            options={purposeOptions}
          />

          {/* Sort Select */}
          <Select
            value={filters.sort || 'newest'}
            onChange={(val) => setFilters((prev) => ({ ...prev, sort: val as any }))}
            options={sortOptions}
          />
        </div>
      </div>

      {/* Article Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">
            DANH SÁCH BÀI ĐỌC ({articles.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-center font-bold text-slate-500 py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-[#fdc800] rounded-full animate-spin" />
            <span>Đang tải danh sách bài đọc...</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="neo-card p-8 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl text-center space-y-2">
            <p className="font-black text-slate-800">Không tìm thấy bài đọc nào phù hợp bộ lọc.</p>
            <p className="text-xs text-slate-500 font-bold">Hãy thử thay đổi trình độ hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => {
              const isLocked = isRestrictedReadingTier(article.access_tier) && !isPro
              return (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all rounded-2xl flex flex-col justify-between gap-4 cursor-pointer relative group"
                >
                  <div className="space-y-2.5">
                    {/* Level & Access Badges */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg border shadow-[1px_1px_0px_0px_#000] ${getLevelColor(article.cefr_level)}`}>
                        Level {article.cefr_level}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 border border-slate-900 text-slate-700">
                          {article.purpose}
                        </span>
                        {isRestrictedReadingTier(article.access_tier) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                            <Crown size={11} className="text-amber-600" />
                            {article.access_tier}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="font-black text-slate-900 text-base group-hover:text-purple-700 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      {article.subtitle && (
                        <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2">
                          {article.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="pt-3 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileText size={14} className="text-slate-400" />
                        {article.word_count} từ
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        ~{article.estimated_reading_time} phút
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      className={`neo-button min-h-0 px-3 py-1 h-8 text-xs font-black border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg cursor-pointer ${
                        isLocked ? 'bg-amber-100 text-amber-900' : 'bg-[#fdc800] hover:bg-amber-300 text-slate-900'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Lock size={12} />
                          <span>Pro</span>
                        </>
                      ) : (
                        <>
                          <span>Đọc ngay</span>
                          <ArrowRight size={12} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pro Upgrade Modal */}
      <ReadingProModal
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        reason={proModalReason}
      />
    </div>
  )
}

export default ReadingHubPage
