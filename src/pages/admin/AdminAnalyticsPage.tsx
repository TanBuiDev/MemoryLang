import { BarChart3, TrendingUp, DollarSign, Award } from 'lucide-react'

export default function AdminAnalyticsPage() {

  // Dữ liệu DAU/MAU mockup (Vẽ cột CSS)
  const dauData = [
    { day: 'T2', val: 45 },
    { day: 'T3', val: 55 },
    { day: 'T4', val: 75 },
    { day: 'T5', val: 60 },
    { day: 'T6', val: 90 },
    { day: 'T7', val: 110 },
    { day: 'CN', val: 130 },
  ]

  const retentionData = [
    { week: 'W1', rate: '85%' },
    { week: 'W2', rate: '65%' },
    { week: 'W3', rate: '50%' },
    { week: 'W4', rate: '42%' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">THỐNG KÊ & PHÂN TÍCH NÂNG CAO</h1>
        <p className="text-muted-foreground font-bold">Thống kê dữ liệu tương tác người dùng, hiệu năng học tập và ước tính chi phí Cloud.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase">Tỷ lệ DAU / MAU</span>
            <span className="text-2xl font-black text-foreground">33.3%</span>
            <span className="text-xs font-bold text-muted-foreground mt-1">Chỉ số tương tác (Engagement)</span>
          </div>
          <div className="p-2 border border-border rounded bg-[#fdc800]">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase">Ước tính chi phí API (Tháng)</span>
            <span className="text-2xl font-black text-foreground">$1.45</span>
            <span className="text-xs font-bold text-muted-foreground mt-1">Google TTS + MyMemory + R2</span>
          </div>
          <div className="p-2 border border-border rounded bg-[#c084fc]">
            <DollarSign size={16} />
          </div>
        </div>

        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase">Tỷ lệ thuộc bài (SM-2)</span>
            <span className="text-2xl font-black text-foreground">78.5%</span>
            <span className="text-xs font-bold text-muted-foreground mt-1">Đánh giá Quality 4 (Remembered)</span>
          </div>
          <div className="p-2 border border-border rounded bg-[#86efac]">
            <Award size={16} />
          </div>
        </div>
      </div>

      {/* Row Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        {/* Chart Column: DAU trend (Neobrutalist Chart) */}
        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
          <h3 className="text-sm font-black border-b border-border pb-2 text-foreground flex items-center gap-1.5">
            <BarChart3 size={16} />
            BIỂU ĐỒ HOẠT ĐỘNG NGÀY (DAU TREND)
          </h3>
          
          <div className="h-48 flex items-end justify-between px-2 pt-6 pb-2 border-b-2 border-l-2 border-border">
            {dauData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                {/* CSS Bar Chart */}
                <div
                  className="w-8 bg-[#fdc800] border-2 border-border hover:bg-[#e0b000] transition-all cursor-pointer relative group flex justify-center"
                  style={{ height: `${(d.val / 150) * 120}px` }}
                >
                  {/* Tooltip */}
                  <span className="absolute -top-7 scale-0 group-hover:scale-100 bg-foreground text-background text-[10px] font-black px-1.5 py-0.5 rounded border border-border transition-all">
                    {d.val}
                  </span>
                </div>
                <span className="text-[10px] font-black text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table Column: User Retention */}
        <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4">
          <h3 className="text-sm font-black border-b border-border pb-2 text-foreground">
            TỶ LỆ GIỮ CHÂN USER (RETENTION COHORT)
          </h3>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-black border-b border-border pb-1 text-muted-foreground">
              <span>MỐC THỜI GIAN</span>
              <span>TỶ LỆ GIỮ CHÂN</span>
            </div>
            {retentionData.map((r, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0 text-xs font-bold">
                <span>Tuần {i + 1} ({r.week})</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 border border-border h-3.5 rounded overflow-hidden">
                    <div className="bg-[#c084fc] h-full" style={{ width: r.rate }} />
                  </div>
                  <span className="font-black w-8 text-right">{r.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
