import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { Crown, Sparkles } from 'lucide-react'

export function UpgradeSuccessPage() {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Confetti animation
  useEffect(() => {
    let animationId: number
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#fdc800', '#432dd7', '#22c55e', '#ef4444', '#3b82f6']
    const particles = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.lineWidth = p.r / 2
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2)
        ctx.stroke()
      })

      update()
    }

    const update = () => {
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2
        p.x += Math.sin(p.tiltAngle)
        if (p.y > canvas.height) {
          particles[idx] = {
            x: Math.random() * canvas.width,
            y: -20,
            r: p.r,
            d: p.d,
            color: p.color,
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: p.tiltAngleIncremental,
            tiltAngle: p.tiltAngle,
          }
        }
      })
    }

    const animLoop = () => {
      draw()
      animationId = requestAnimationFrame(animLoop)
    }

    animLoop()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-4 text-center overflow-hidden">
      {/* Canvas background for confetti */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Content */}
      <div className="relative z-20">
        {/* Success icon */}
        <div
          className="inline-flex items-center justify-center w-24 h-24 mb-6
            rounded-full bg-[#FFF9E5] border-[4px] border-[#1c293c]
            shadow-[6px_6px_0_#1c293c]"
        >
          <Sparkles size={40} className="text-[#fdc800] fill-[#fdc800]" />
        </div>

        <h1 className="text-3xl font-bold text-[#1c293c] mb-2">
          Nâng cấp thành công!
        </h1>

        <p className="text-lg text-[#64748b] mb-2">
          Bạn đã là thành viên{' '}
          <span className="font-bold text-[#fdc800] inline-flex items-center gap-1">
            MemoryLang Pro <Crown size={16} className="fill-[#fdc800] text-[#fdc800]" />
          </span>
        </p>

        {subscription?.current_period_end && (
          <p className="text-sm text-[#94a3b8] mb-8">
            Có hiệu lực đến:{' '}
            {new Date(subscription.current_period_end).toLocaleDateString(
              'vi-VN',
              { day: '2-digit', month: '2-digit', year: 'numeric' }
            )}
          </p>
        )}

        {/* Features unlocked checklist */}
        <div
          className="neo-card text-left p-5 border-[3px] border-[#1c293c]
            shadow-[4px_4px_0_#1c293c] rounded-lg mb-8"
        >
          <h2 className="text-sm font-bold text-[#1c293c] mb-3 uppercase tracking-wider">
            ✨ Đã mở khóa
          </h2>
          <ul className="space-y-2.5">
            {[
              'Từ vựng không giới hạn',
              'Bộ thẻ không giới hạn',
              'Toàn bộ bài Listening & Grammar',
              'Xuất dữ liệu (CSV/JSON)',
              'Badge Pro trên profile',
              'Ưu tiên hỗ trợ',
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2.5 text-sm text-[#1c293c]"
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5
                    rounded-full bg-[#22c55e] text-white text-xs font-bold"
                >
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            to="/app/dashboard"
            className="neo-button neo-button-active w-full justify-center font-bold
              bg-[#fdc800] hover:bg-[#e6b800] text-[#1c293c]"
          >
            Quay về Dashboard
          </Link>

          <Link
            to="/app/vocabulary"
            className="neo-button w-full justify-center text-sm"
          >
            Thêm từ vựng mới →
          </Link>
        </div>
      </div>
    </div>
  )
}
