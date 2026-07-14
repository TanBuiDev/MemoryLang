import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

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

    const colors = ['#fdc800', '#432dd7', '#22c55e', '#f43f5e', '#3b82f6']
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      color: string
      size: number
      life: number
    }> = []

    // Tạo confetti
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 2,
        life: 1,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = 0
      for (const p of particles) {
        if (p.life <= 0) continue
        alive++

        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05 // gravity
        p.vx *= 0.99
        p.life -= 0.003

        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size * 1.5)
      }

      ctx.globalAlpha = 1

      if (alive > 0) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center relative">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />

      {/* Content */}
      <div className="relative z-20">
        {/* Success icon */}
        <div
          className="inline-flex items-center justify-center w-24 h-24 mb-6
            rounded-full bg-[#FFF9E5] border-[4px] border-[#1c293c]
            shadow-[6px_6px_0_#1c293c] text-5xl"
        >
          🎉
        </div>

        <h1 className="text-3xl font-bold text-[#1c293c] mb-2">
          Nâng cấp thành công!
        </h1>

        <p className="text-lg text-[#64748b] mb-2">
          Bạn đã là thành viên{' '}
          <span className="font-bold text-[#fdc800]">MemoryLang Pro</span> 👑
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
