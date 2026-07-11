import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react'
import { useI18n } from '@/i18n'

export function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { t } = useI18n()

  let title = t('error.title', 'Lỗi ứng dụng')
  let description = t('error.description', 'Đã xảy ra lỗi không mong muốn.')
  let is404 = false

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = t('error.notFoundTitle', 'Không tìm thấy trang (404)')
      description = t('error.notFoundDescription', 'Trang bạn đang tìm kiếm không tồn tại hoặc chưa được phát triển.')
      is404 = true
    } else {
      description = error.statusText || description
    }
  } else if (error instanceof Error) {
    description = error.message
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background grid line pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <Card className="w-full max-w-lg border-4 border-border bg-card p-8 shadow-[8px_8px_0px_#000] relative z-10 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full border-4 border-border bg-[#ffe05c] flex items-center justify-center shadow-[4px_4px_0px_#000] mb-6 animate-bounce">
          <AlertTriangle size={32} className="text-foreground stroke-[2.5]" />
        </div>
        
        <CardTitle className="text-2xl font-black mb-3 text-foreground tracking-tight">
          {title}
        </CardTitle>
        
        <p className="text-sm font-semibold text-muted-foreground mb-8 max-w-sm leading-relaxed">
          {description}
        </p>

        {is404 && (
          <div className="mb-8 p-3 rounded-md border-2 border-border bg-secondary/10 font-mono text-xs font-bold text-muted-foreground select-all">
            URL: {window.location.pathname}
          </div>
        )}
        
        <div className="flex flex-wrap gap-3 justify-center w-full">
          <Button 
            type="button" 
            variant="secondary"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 min-h-11 font-black shadow-[3px_3px_0px_#000]"
          >
            <ArrowLeft size={16} className="stroke-[2.5]" />
            <span>{t('error.goBack', 'Quay lại')}</span>
          </Button>

          <Button 
            asChild
            className="flex items-center gap-2 px-5 min-h-11 font-black shadow-[3px_3px_0px_#000] bg-primary hover:bg-[#ffe05c]"
          >
            <Link to="/" className="no-underline">
              <Home size={16} className="stroke-[2.5]" />
              <span>{t('error.goHome', 'Về trang chủ')}</span>
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default ErrorPage
