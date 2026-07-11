import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Rocket } from 'lucide-react'
import { useI18n } from '@/i18n'

export function ComingSoonPage() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <div className="w-full py-12 flex items-center justify-center bg-transparent">
      <Card className="w-full max-w-lg border-4 border-border bg-card p-8 shadow-[6px_6px_0px_#000] text-center flex flex-col items-center">
        <div className="h-16 w-16 rounded-full border-4 border-border bg-[#ffe05c] flex items-center justify-center shadow-[3px_3px_0px_#000] mb-6 animate-bounce">
          <Rocket size={30} className="text-foreground stroke-[2.5] -rotate-45" />
        </div>

        <CardTitle className="text-2xl font-black mb-3 text-foreground flex items-center gap-2 justify-center">
          {t('comingSoon.title', 'Tính năng đang phát triển!')}
          <Sparkles size={20} className="text-amber-500 fill-amber-500 animate-pulse" />
        </CardTitle>

        <p className="text-sm font-bold text-muted-foreground mb-8 max-w-sm leading-relaxed">
          {t('comingSoon.description', 'Hãy chờ đợi đi, tính năng này sắp ra mắt rồi! 😉 Chúng tôi đang nỗ lực hoàn thiện để mang lại trải nghiệm học tập tốt nhất cho bạn.')}
        </p>

        <Button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 min-h-10 font-black shadow-[3px_3px_0px_#000] bg-primary hover:bg-[#ffe05c]"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" />
          <span>{t('error.goBack', 'Quay lại')}</span>
        </Button>
      </Card>
    </div>
  )
}

export default ComingSoonPage
