import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  X,
  BookOpen,
  GraduationCap,
  Sparkles,
  Settings,
  Search,
  Volume2,
  ChevronLeft,
  ChevronRight,
  History,
  Award,
  ArrowLeft,
  Info
} from 'lucide-react'

// Mascot SVG Component for Model 5 and Combined Model
function MascotIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book Base (Mascot Body) */}
      <rect x="15" y="20" width="70" height="65" rx="10" fill="#432dd7" stroke="#1c293c" strokeWidth="6" />
      {/* Book Pages Side */}
      <path d="M25 85h50v6H25z" fill="#fbfbf9" stroke="#1c293c" strokeWidth="4" />
      {/* Book Cover Line */}
      <path d="M15 75h70" stroke="#1c293c" strokeWidth="4" strokeDasharray="4 4" />
      {/* Mascot Eyes */}
      <circle cx="38" cy="48" r="8" fill="#fdc800" stroke="#1c293c" strokeWidth="4" />
      <circle cx="38" cy="48" r="3" fill="#1c293c" />
      <circle cx="62" cy="48" r="8" fill="#fdc800" stroke="#1c293c" strokeWidth="4" />
      <circle cx="62" cy="48" r="3" fill="#1c293c" />
      {/* Mascot Smile */}
      <path d="M42 62c4 4 12 4 16 0" stroke="#fbfbf9" strokeWidth="4" strokeLinecap="round" />
      {/* Academic Cap */}
      <path d="M30 18l20-10 20 10-20 10-20-10z" fill="#fdc800" stroke="#1c293c" strokeWidth="4" />
      <path d="M50 28v12M70 18v15" stroke="#1c293c" strokeWidth="4" strokeLinecap="round" />
      <circle cx="70" cy="35" r="3" fill="#1c293c" />
    </svg>
  )
}

export function FloatingWidgetsDemoPage() {
  // Default to model 6 (Combined) as the featured recommendation
  const [activeGlobalModel, setActiveGlobalModel] = useState<number | null>(6)
  
  // Local toggles for each model inside their preview boxes
  const [isOpenM6, setIsOpenM6] = useState(false)
  const [isOpenM1, setIsOpenM1] = useState(false)
  const [isOpenM3, setIsOpenM3] = useState(false)
  const [isOpenM4, setIsOpenM4] = useState(true)
  const [isOpenM5, setIsOpenM5] = useState(false)

  // Global state toggles (when active in the viewport corners)
  const [isGlobalOpenM6, setIsGlobalOpenM6] = useState(false)
  const [isGlobalOpenM1, setIsGlobalOpenM1] = useState(false)
  const [isGlobalOpenM3, setIsGlobalOpenM3] = useState(false)
  const [isGlobalOpenM4, setIsGlobalOpenM4] = useState(false)
  const [isGlobalOpenM5, setIsGlobalOpenM5] = useState(false)

  return (
    <div className="space-y-8 pb-20">
      {/* Header section with Neobrutalist design */}
      <div className="neo-card p-6 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Sparkles className="w-36 h-36" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link to="/app/dashboard" className="inline-flex items-center gap-1 text-sm font-bold bg-[#1c293c] text-[#fbfbf9] px-3 py-1 rounded border-2 border-transparent hover:bg-transparent hover:text-[#1c293c] hover:border-[#1c293c] transition-all mb-3">
              <ArrowLeft className="w-4 h-4" /> Quay lại Dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Phòng Trải Nghiệm Giao Diện: Floating Action Widgets
            </h1>
            <p className="mt-2 text-sm font-bold text-foreground/80 max-w-2xl">
              Khám phá và tương tác trực tiếp với các mẫu nút hành động nổi (FAB) được thiết kế riêng theo phong cách Neobrutalist của MemoryLang.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="neo-card bg-white px-4 py-2 text-xs font-black text-foreground flex items-center gap-1.5 shadow-[2px_2px_0px_#1c293c]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Đã cập nhật Mẫu Kết Hợp
            </span>
          </div>
        </div>
      </div>

      {/* Global Preview Settings (Sandbox) */}
      <div className="neo-card p-5 bg-card">
        <h2 className="text-lg font-black flex items-center gap-2">
          <Info className="w-5 h-5 text-secondary" />
          Khu vực Thử nghiệm Thực tế (Sandbox)
        </h2>
        <p className="text-xs text-muted-foreground mt-1 font-medium">
          Chọn một mẫu dưới đây để hiển thị trực tiếp ở **góc phải dưới của màn hình**. Bạn có thể cuộn trang và xem cách nó hoạt động thực tế trên điện thoại hoặc máy tính.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 6, name: '★ Mẫu Đặc Biệt: Mascot Radial (Kết hợp 3 & 5)' },
            { id: 1, name: 'Mẫu 1: Classic Speed Dial' },
            { id: 2, name: 'Mẫu 2: Expandable Pill FAB' },
            { id: 3, name: 'Mẫu 3: Radial Arc FAB' },
            { id: 4, name: 'Mẫu 4: Docked Quick Toolbar' },
            { id: 5, name: 'Mẫu 5: Mascot Help Bubble' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveGlobalModel(m.id)
                // Reset all states
                setIsGlobalOpenM6(false)
                setIsGlobalOpenM1(false)
                setIsGlobalOpenM3(false)
                setIsGlobalOpenM4(m.id === 4) // default open for toolbar
                setIsGlobalOpenM5(false)
              }}
              className={`px-3 py-1.5 text-xs font-black transition-all ${
                activeGlobalModel === m.id
                  ? 'bg-secondary text-secondary-foreground border-2 border-border translate-x-[2px] translate-y-[2px] shadow-none'
                  : 'bg-white text-foreground border-2 border-border shadow-[2px_2px_0px_#1c293c] hover:-translate-y-0.5'
              }`}
            >
              {activeGlobalModel === m.id ? '✓ ' : ''}{m.name}
            </button>
          ))}
          <button
            onClick={() => setActiveGlobalModel(null)}
            className={`px-3 py-1.5 text-xs font-black transition-all bg-danger text-white border-2 border-border ${
              activeGlobalModel === null
                ? 'bg-red-800'
                : 'shadow-[2px_2px_0px_#1c293c] hover:-translate-y-0.5'
            }`}
          >
            Ẩn hoàn toàn nút góc màn hình
          </button>
        </div>
      </div>

      {/* FEATURED MODEL 6: Combined Mascot Radial FAB */}
      <div className="neo-card bg-card p-6 border-4 border-secondary space-y-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bg-secondary text-white text-[10px] font-black px-4 py-1.5 rounded-bl-lg shadow-sm uppercase tracking-wider">
          Đề Xuất Hợp Nhất (Mẫu 3 + 5)
        </div>
        
        <div className="max-w-3xl">
          <h2 className="text-2xl font-black text-foreground">Mẫu Đặc Biệt: Mascot Radial FAB</h2>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            Sự kết hợp hoàn hảo giữa **Mascot đáng yêu** (Mẫu 5) và cơ chế **bay tỏa tròn Radial 45 độ** (Mẫu 3). Nút Mascot được thiết kế lớn để dễ chạm trên điện thoại, trang bị tính năng rung lắc cơ học nhẹ (wobble) để tăng tương tác, cùng với nhãn chữ đi kèm tự động định vị tối ưu trên thiết bị di động.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulation Box */}
          <div className="lg:col-span-2 relative h-72 bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center">
            <div className="absolute top-2 left-2 neo-card bg-white px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#1c293c]">
              Khung mô phỏng (Di chuột / Tap thử)
            </div>
            
            {/* Mascot Radial Widget */}
            <div className="absolute bottom-6 right-6 z-10 select-none">
              
              {/* Secondary item 1: Sound (Top: translate-y-[85px] on mobile, [106px] on desktop) */}
              <div 
                className={`absolute transition-all duration-300 flex flex-col items-center justify-center ${
                  isOpenM6 
                    ? 'opacity-100 scale-100 translate-x-0 -translate-y-[85px] sm:-translate-y-[106px]' 
                    : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
                }`}
              >
                <button 
                  title="Phát âm"
                  className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-[#fdc800] text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
                >
                  <Volume2 className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
                </button>
                <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
                  Phát âm
                </span>
              </div>

              {/* Secondary item 2: Search (Diagonal Top-Left: x/y [60px] on mobile, [76px] on desktop) */}
              <div 
                className={`absolute transition-all duration-300 delay-[40ms] flex flex-col items-center justify-center ${
                  isOpenM6 
                    ? 'opacity-100 scale-100 -translate-x-[60px] -translate-y-[60px] sm:-translate-x-[76px] sm:-translate-y-[76px]' 
                    : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
                }`}
              >
                <button 
                  title="Tìm kiếm"
                  className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-[#432dd7] text-white flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
                >
                  <Search className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
                </button>
                <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
                  Tìm từ
                </span>
              </div>

              {/* Secondary item 3: Settings (Left: translate-x-[85px] on mobile, [106px] on desktop) */}
              <div 
                className={`absolute transition-all duration-300 delay-[80ms] flex flex-col items-center justify-center ${
                  isOpenM6 
                    ? 'opacity-100 scale-100 -translate-x-[85px] translate-y-0 sm:-translate-x-[106px]' 
                    : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
                }`}
              >
                <button 
                  title="Cấu hình"
                  className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-emerald-400 text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
                >
                  <Settings className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
                </button>
                <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
                  Cấu hình
                </span>
              </div>

              {/* Main Mascot Button (Trigger) */}
              <button 
                onClick={() => setIsOpenM6(!isOpenM6)}
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-border bg-white flex items-center justify-center shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all neo-wobble-hover z-20 group"
              >
                {/* Red Pulse Notification Dot */}
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-danger border-2 border-border text-[9px] font-black text-white items-center justify-center">1</span>
                </span>

                {/* Transitioning Content: Mascot vs Close Icon */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className={`transition-all duration-300 ${isOpenM6 ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                    <MascotIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                  </div>
                  <div className={`absolute transition-all duration-300 ${isOpenM6 ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
                    <X className="w-6 h-6 text-foreground font-black" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Details & Specs */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-black text-secondary">Thông số Tương tác</h3>
              <ul className="text-xs space-y-2 text-muted-foreground font-medium list-disc pl-4">
                <li><strong className="text-foreground">Wobble Animation:</strong> Mascot tự động lắc lư cơ học sinh động khi di chuột qua.</li>
                <li><strong className="text-foreground">Smart Radial Offset:</strong> Khoảng cách bay của nút con tự thu gọn trên màn hình nhỏ để tránh chạm mép ngoài.</li>
                <li><strong className="text-foreground">Trạng thái đóng/mở:</strong> Mascot xoay nhẹ rồi biến mất để hiển thị biểu tượng đóng `X` gọn gàng.</li>
                <li><strong className="text-foreground">Touch-friendly:</strong> Đạt tiêu chuẩn kích thước chạm trên di động (&gt;44px), giúp dễ dàng thao tác bằng một tay.</li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                setActiveGlobalModel(6)
                setIsGlobalOpenM6(false)
              }}
              className="w-full neo-button py-2.5 bg-secondary text-white text-xs font-black hover:bg-[#321fb0] active:neo-button-active"
            >
              Kích hoạt xem thực tế góc màn hình
            </button>
          </div>
        </div>
      </div>

      <hr className="border-border border-2" />

      {/* Grid containing other 5 models side-by-side inside parent containers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* MODEL 1: Classic Speed Dial */}
        <div className="neo-card bg-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">
                Mẫu 1
              </span>
              <span className="text-xs text-muted-foreground font-mono">Popular</span>
            </div>
            <h3 className="text-xl font-black mt-2">Classic Speed Dial</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Nút tròn chính mở ra danh sách các hành động xếp chồng dọc lên trên. Sử dụng hiệu ứng xoay biểu tượng và bóng đổ kép Neobrutalist đặc trưng.
            </p>
          </div>

          {/* Local Simulated Viewport */}
          <div className="relative h-56 bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground pointer-events-none select-none">
              Mô phỏng Góc Màn Hình (Mẫu 1)
            </span>
            
            {/* The Widget */}
            <div className="absolute bottom-4 right-4 flex flex-col items-end z-10">
              <div 
                className={`flex flex-col items-end gap-3 mb-3 transition-all duration-300 ${
                  isOpenM1 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                {[
                  { text: 'Thêm từ mới', color: 'bg-primary text-foreground', icon: <Plus className="w-4 h-4" /> },
                  { text: 'Học Flashcard', color: 'bg-secondary text-white', icon: <BookOpen className="w-4 h-4" /> },
                  { text: 'Học Ngữ pháp', color: 'bg-emerald-400 text-foreground', icon: <GraduationCap className="w-4 h-4" /> },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 group cursor-pointer"
                    style={{ transitionDelay: isOpenM1 ? `${idx * 50}ms` : '0ms' }}
                  >
                    <span className="neo-card bg-white px-2 py-1 text-xs font-black text-foreground shadow-[2px_2px_0px_#1c293c] transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[4px_4px_0px_#1c293c]">
                      {item.text}
                    </span>
                    <button className={`w-10 h-10 rounded-full border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all ${item.color} active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c]`}>
                      {item.icon}
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsOpenM1(!isOpenM1)}
                className={`w-12 h-12 rounded-full border-2 border-border flex items-center justify-center bg-primary text-foreground shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all`}
              >
                <Plus className={`w-6 h-6 transition-transform duration-300 ${isOpenM1 ? 'rotate-135' : 'rotate-0'}`} />
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGlobalModel(1)
              setIsGlobalOpenM1(false)
            }}
            className="w-full neo-button py-2 bg-primary text-foreground text-xs font-black hover:bg-[#ffe05c] active:neo-button-active"
          >
            Kích hoạt xem thực tế góc màn hình
          </button>
        </div>

        {/* MODEL 2: Expandable Pill FAB */}
        <div className="neo-card bg-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-secondary text-white border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">
                Mẫu 2
              </span>
              <span className="text-xs text-muted-foreground font-mono">Modern</span>
            </div>
            <h3 className="text-xl font-black mt-2">Expandable Pill FAB</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Thiết kế dạng viên thuốc gọn gàng, tự động mở rộng theo chiều ngang khi người dùng di chuột qua để làm lộ rõ nhãn văn bản. Rất tiết kiệm diện tích.
            </p>
          </div>

          {/* Local Simulated Viewport */}
          <div className="relative h-56 bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground pointer-events-none select-none">
              Mô phỏng Góc Màn Hình (Mẫu 2 - Hover thử nút)
            </span>
            
            {/* The Widget */}
            <div className="absolute bottom-4 right-4 z-10">
              <button 
                className="group relative flex items-center justify-end h-12 w-12 hover:w-44 bg-secondary text-white border-2 border-border rounded-full shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] transition-all duration-300 ease-out overflow-hidden active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c]"
              >
                <span className="absolute right-12 top-0 bottom-0 flex items-center pl-4 pr-1 font-black text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                  Học bài tiếp theo
                </span>
                <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGlobalModel(2)
            }}
            className="w-full neo-button py-2 bg-secondary text-white text-xs font-black hover:bg-[#321fb0] active:neo-button-active"
          >
            Kích hoạt xem thực tế góc màn hình
          </button>
        </div>

        {/* MODEL 3: Radial Arc FAB */}
        <div className="neo-card bg-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-foreground border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">
                Mẫu 3
              </span>
              <span className="text-xs text-muted-foreground font-mono">Creative</span>
            </div>
            <h3 className="text-xl font-black mt-2">Radial Arc FAB</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Khi nhấn vào, các nút con sẽ bay ra theo hình quạt tròn (góc chéo 45 độ), tạo cảm giác sống động, vui nhộn và vô cùng độc đáo.
            </p>
          </div>

          {/* Local Simulated Viewport */}
          <div className="relative h-56 bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground pointer-events-none select-none">
              Mô phỏng Góc Màn Hình (Mẫu 3)
            </span>
            
            {/* The Widget */}
            <div className="absolute bottom-4 right-4 z-10">
              <button 
                title="Cài đặt"
                className={`absolute w-10 h-10 rounded-full border-2 border-border bg-white text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all duration-300 ${
                  isOpenM3 
                    ? 'opacity-100 scale-100 -translate-x-[72px] -translate-y-[72px]' 
                    : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
                } hover:-translate-y-[74px] hover:-translate-x-[74px] hover:shadow-[3px_3px_0px_#1c293c]`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                title="Tìm kiếm"
                className={`absolute w-10 h-10 rounded-full border-2 border-border bg-primary text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all duration-300 delay-[50ms] ${
                  isOpenM3 
                    ? 'opacity-100 scale-100 -translate-x-[102px] translate-y-0' 
                    : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
                } hover:-translate-x-[104px] hover:shadow-[3px_3px_0px_#1c293c]`}
              >
                <Search className="w-4 h-4" />
              </button>
              <button 
                title="Phát âm"
                className={`absolute w-10 h-10 rounded-full border-2 border-border bg-purple-500 text-white flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all duration-300 delay-[100ms] ${
                  isOpenM3 
                    ? 'opacity-100 scale-100 translate-x-0 -translate-y-[102px]' 
                    : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
                } hover:-translate-y-[104px] hover:shadow-[3px_3px_0px_#1c293c]`}
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setIsOpenM3(!isOpenM3)}
                className={`relative w-12 h-12 rounded-full border-2 border-border flex items-center justify-center bg-emerald-400 text-foreground shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all z-20`}
              >
                <Sparkles className={`w-5 h-5 transition-transform duration-300 ${isOpenM3 ? 'rotate-90' : 'rotate-0'}`} />
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGlobalModel(3)
              setIsGlobalOpenM3(false)
            }}
            className="w-full neo-button py-2 bg-emerald-400 text-foreground text-xs font-black hover:bg-emerald-300 active:neo-button-active"
          >
            Kích hoạt xem thực tế góc màn hình
          </button>
        </div>

        {/* MODEL 4: Docked Quick Toolbar */}
        <div className="neo-card bg-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-white border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">
                Mẫu 4
              </span>
              <span className="text-xs text-muted-foreground font-mono">Productive</span>
            </div>
            <h3 className="text-xl font-black mt-2">Docked Quick Toolbar</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Thanh công cụ thu gọn nép gọn vào lề màn hình. Thích hợp cho các chế độ học tập tập trung hoặc các tác vụ nhanh, có nút đóng/mở tiện dụng.
            </p>
          </div>

          {/* Local Simulated Viewport */}
          <div className="relative h-56 bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground pointer-events-none select-none">
              Mô phỏng Góc Màn Hình (Mẫu 4)
            </span>
            
            {/* The Widget */}
            <div className="absolute bottom-4 right-0 z-10 flex items-center">
              <button 
                onClick={() => setIsOpenM4(!isOpenM4)}
                className="h-10 w-6 bg-primary border-y-2 border-l-2 border-border rounded-l flex items-center justify-center shadow-[-2px_2px_0px_#1c293c] z-20 hover:bg-[#ffe05c]"
              >
                {isOpenM4 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>

              <div 
                className={`neo-card bg-white p-1.5 flex items-center gap-2 rounded-r-none transition-all duration-300 ease-out shadow-[-3px_3px_0px_#1c293c] ${
                  isOpenM4 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-full opacity-0 pointer-events-none'
                }`}
              >
                <button 
                  title="Thêm từ vựng"
                  className="w-8 h-8 rounded border-2 border-border bg-[#fdc800] hover:bg-[#ffe05c] flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4 text-foreground" />
                </button>
                <div className="w-[2px] h-6 bg-border" />
                <button 
                  title="Tìm kiếm từ"
                  className="w-8 h-8 rounded border-2 border-border bg-white hover:bg-muted flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Search className="w-4 h-4 text-foreground" />
                </button>
                <button 
                  title="Lịch sử học"
                  className="w-8 h-8 rounded border-2 border-border bg-white hover:bg-muted flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <History className="w-4 h-4 text-foreground" />
                </button>
                <button 
                  title="Thành tích"
                  className="w-8 h-8 rounded border-2 border-border bg-white hover:bg-muted flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Award className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGlobalModel(4)
              setIsGlobalOpenM4(true)
            }}
            className="w-full neo-button py-2 bg-white text-foreground text-xs font-black hover:bg-muted active:neo-button-active"
          >
            Kích hoạt xem thực tế góc màn hình
          </button>
        </div>

        {/* MODEL 5: Mascot Help Bubble */}
        <div className="neo-card bg-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#432dd7] text-white border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">
                Mẫu 5
              </span>
              <span className="text-xs text-muted-foreground font-mono">Engagement</span>
            </div>
            <h3 className="text-xl font-black mt-2">Mascot Help Bubble</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tích hợp Mascot thương hiệu siêu đáng yêu. Nút lắc nhẹ (wobble) khi hover thu hút sự chú ý, mở ra bong bóng thoại tương tác cao.
            </p>
          </div>

          {/* Local Simulated Viewport */}
          <div className="relative h-56 bg-muted/20 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground pointer-events-none select-none">
              Mô phỏng Góc Màn Hình (Mẫu 5)
            </span>
            
            {/* The Widget */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end">
              <div 
                className={`neo-card bg-white p-4 w-60 rounded-xl mb-3 shadow-[4px_4px_0px_#1c293c] transition-all duration-300 relative ${
                  isOpenM5 
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
                }`}
              >
                <div className="absolute bottom-[-10px] right-5 w-4 h-4 bg-white border-r-2 border-b-2 border-border transform rotate-45" />
                <p className="text-xs font-black text-foreground">Hôm nay học gì đây bạn?</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">Hãy chọn một hoạt động để tôi đồng hành cùng bạn nhé!</p>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 px-2 py-1 bg-primary text-foreground text-[10px] font-black border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">Học từ mới</button>
                  <button className="flex-1 px-2 py-1 bg-secondary text-white text-[10px] font-black border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">Thi thử</button>
                </div>
              </div>

              <button 
                onClick={() => setIsOpenM5(!isOpenM5)}
                className={`w-14 h-14 rounded-full border-2 border-border bg-white flex items-center justify-center shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all hover:animate-wiggle`}
              >
                {isOpenM5 ? <X className="w-6 h-6 text-foreground" /> : <MascotIcon className="w-10 h-10" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveGlobalModel(5)
              setIsGlobalOpenM5(false)
            }}
            className="w-full neo-button py-2 bg-white text-foreground text-xs font-black hover:bg-muted active:neo-button-active"
          >
            Kích hoạt xem thực tế góc màn hình
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* GLOBAL SANDBOX RENDERER (Appears in bottom-right corner) */}
      {/* ========================================================= */}
      
      {/* SPECIAL COMBINED MODEL 6 */}
      {activeGlobalModel === 6 && (
        <div className="fixed bottom-6 right-6 z-[9999] select-none flex flex-col items-end">
          
          {/* Secondary item 1: Sound (Top: translate-y-[85px] on mobile, [106px] on desktop) */}
          <div 
            className={`absolute transition-all duration-300 flex flex-col items-center justify-center ${
              isGlobalOpenM6 
                ? 'opacity-100 scale-100 translate-x-0 -translate-y-[85px] sm:-translate-y-[106px]' 
                : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
            }`}
          >
            <button 
              title="Phát âm"
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-[#fdc800] text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
            >
              <Volume2 className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
            </button>
            <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
              Phát âm
            </span>
          </div>

          {/* Secondary item 2: Search (Diagonal Top-Left: x/y [60px] on mobile, [76px] on desktop) */}
          <div 
            className={`absolute transition-all duration-300 delay-[40ms] flex flex-col items-center justify-center ${
              isGlobalOpenM6 
                ? 'opacity-100 scale-100 -translate-x-[60px] -translate-y-[60px] sm:-translate-x-[76px] sm:-translate-y-[76px]' 
                : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
            }`}
          >
            <button 
              title="Tìm kiếm"
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-[#432dd7] text-white flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
            >
              <Search className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
            </button>
            <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
              Tìm từ
            </span>
          </div>

          {/* Secondary item 3: Settings (Left: translate-x-[85px] on mobile, [106px] on desktop) */}
          <div 
            className={`absolute transition-all duration-300 delay-[80ms] flex flex-col items-center justify-center ${
              isGlobalOpenM6 
                ? 'opacity-100 scale-100 -translate-x-[85px] translate-y-0 sm:-translate-x-[106px]' 
                : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
            }`}
          >
            <button 
              title="Cấu hình"
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-emerald-400 text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
            >
              <Settings className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
            </button>
            <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
              Cấu hình
            </span>
          </div>

          {/* Main Mascot Button (Trigger) */}
          <button 
            onClick={() => setIsGlobalOpenM6(!isGlobalOpenM6)}
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-border bg-white flex items-center justify-center shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all neo-wobble-hover z-20 group"
          >
            {/* Red Pulse Notification Dot */}
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-danger border-2 border-border text-[9px] font-black text-white items-center justify-center">1</span>
            </span>

            {/* Transitioning Content: Mascot vs Close Icon */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div className={`transition-all duration-300 ${isGlobalOpenM6 ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
                <MascotIcon className="w-10 h-10 sm:w-11 sm:h-11" />
              </div>
              <div className={`absolute transition-all duration-300 ${isGlobalOpenM6 ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
                <X className="w-6 h-6 text-foreground font-black" />
              </div>
            </div>
          </button>
        </div>
      )}

      {activeGlobalModel === 1 && (
        <div className="fixed bottom-6 right-6 flex flex-col items-end z-[9999] select-none">
          <div 
            className={`flex flex-col items-end gap-3 mb-3 transition-all duration-300 ${
              isGlobalOpenM1 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            {[
              { text: 'Thêm từ mới', color: 'bg-primary text-foreground', icon: <Plus className="w-4 h-4" /> },
              { text: 'Học Flashcard', color: 'bg-secondary text-white', icon: <BookOpen className="w-4 h-4" /> },
              { text: 'Học Ngữ pháp', color: 'bg-emerald-400 text-foreground', icon: <GraduationCap className="w-4 h-4" /> },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 group cursor-pointer"
                style={{ transitionDelay: isGlobalOpenM1 ? `${idx * 50}ms` : '0ms' }}
              >
                <span className="neo-card bg-white px-2 py-1 text-xs font-black text-foreground shadow-[2px_2px_0px_#1c293c]">
                  {item.text}
                </span>
                <button className={`w-10 h-10 rounded-full border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all ${item.color} active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c]`}>
                  {item.icon}
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setIsGlobalOpenM1(!isGlobalOpenM1)}
            className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center bg-primary text-foreground shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all"
          >
            <Plus className={`w-7 h-7 transition-transform duration-300 ${isGlobalOpenM1 ? 'rotate-135' : 'rotate-0'}`} />
          </button>
        </div>
      )}

      {activeGlobalModel === 2 && (
        <div className="fixed bottom-6 right-6 z-[9999] select-none">
          <button 
            className="group relative flex items-center justify-end h-14 w-14 hover:w-48 bg-secondary text-white border-2 border-border rounded-full shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] transition-all duration-300 ease-out overflow-hidden active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c]"
          >
            <span className="absolute right-14 top-0 bottom-0 flex items-center pl-4 pr-1 font-black text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
              Học bài tiếp theo
            </span>
            <div className="w-13 h-13 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      )}

      {activeGlobalModel === 3 && (
        <div className="fixed bottom-6 right-6 z-[9999] select-none">
          <button 
            title="Cài đặt"
            className={`absolute w-10 h-10 rounded-full border-2 border-border bg-white text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all duration-300 ${
              isGlobalOpenM3 
                ? 'opacity-100 scale-100 -translate-x-[72px] -translate-y-[72px]' 
                : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
            } hover:-translate-y-[74px] hover:-translate-x-[74px] hover:shadow-[3px_3px_0px_#1c293c]`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            title="Tìm kiếm"
            className={`absolute w-10 h-10 rounded-full border-2 border-border bg-primary text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all duration-300 delay-[50ms] ${
              isGlobalOpenM3 
                ? 'opacity-100 scale-100 -translate-x-[102px] translate-y-0' 
                : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
            } hover:-translate-x-[104px] hover:shadow-[3px_3px_0px_#1c293c]`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            title="Phát âm"
            className={`absolute w-10 h-10 rounded-full border-2 border-border bg-purple-500 text-white flex items-center justify-center shadow-[2px_2px_0px_#1c293c] transition-all duration-300 delay-[100ms] ${
              isGlobalOpenM3 
                ? 'opacity-100 scale-100 translate-x-0 -translate-y-[102px]' 
                : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
            } hover:-translate-y-[104px] hover:shadow-[3px_3px_0px_#1c293c]`}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsGlobalOpenM3(!isGlobalOpenM3)}
            className="relative w-14 h-14 rounded-full border-2 border-border flex items-center justify-center bg-emerald-400 text-foreground shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all z-20"
          >
            <Sparkles className={`w-6 h-6 transition-transform duration-300 ${isGlobalOpenM3 ? 'rotate-90' : 'rotate-0'}`} />
          </button>
        </div>
      )}

      {activeGlobalModel === 4 && (
        <div className="fixed bottom-6 right-0 z-[9999] flex items-center select-none">
          <button 
            onClick={() => setIsGlobalOpenM4(!isGlobalOpenM4)}
            className="h-12 w-6 bg-primary border-y-2 border-l-2 border-border rounded-l flex items-center justify-center shadow-[-2px_2px_0px_#1c293c] z-20 hover:bg-[#ffe05c]"
          >
            {isGlobalOpenM4 ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          <div 
            className={`neo-card bg-white p-2 flex items-center gap-3 rounded-r-none transition-all duration-300 ease-out shadow-[-4px_4px_0px_#1c293c] ${
              isGlobalOpenM4 
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-full opacity-0 pointer-events-none'
            }`}
          >
            <button 
              title="Thêm từ vựng"
              className="w-9 h-9 rounded border-2 border-border bg-[#fdc800] hover:bg-[#ffe05c] flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-5 h-5 text-foreground" />
            </button>
            <div className="w-[2px] h-8 bg-border" />
            <button 
              title="Tìm kiếm từ"
              className="w-9 h-9 rounded border-2 border-border bg-white hover:bg-muted flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <button 
              title="Lịch sử học"
              className="w-9 h-9 rounded border-2 border-border bg-white hover:bg-muted flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <History className="w-5 h-5 text-foreground" />
            </button>
            <button 
              title="Thành tích"
              className="w-9 h-9 rounded border-2 border-border bg-white hover:bg-muted flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Award className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      )}

      {activeGlobalModel === 5 && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end select-none">
          <div 
            className={`neo-card bg-white p-4 w-64 rounded-xl mb-3 shadow-[4px_4px_0px_#1c293c] transition-all duration-300 relative ${
              isGlobalOpenM5 
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
            }`}
          >
            <div className="absolute bottom-[-10px] right-5 w-4 h-4 bg-white border-r-2 border-b-2 border-border transform rotate-45" />
            <p className="text-xs font-black text-foreground">Hôm nay học gì đây bạn?</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Hãy chọn một hoạt động để tôi đồng hành cùng bạn nhé!</p>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 px-2 py-1 bg-primary text-foreground text-[10px] font-black border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">Học từ mới</button>
              <button className="flex-1 px-2 py-1 bg-secondary text-white text-[10px] font-black border-2 border-border rounded shadow-[1px_1px_0px_#1c293c]">Thi thử</button>
            </div>
          </div>

          <button 
            onClick={() => setIsGlobalOpenM5(!isGlobalOpenM5)}
            className="w-16 h-16 rounded-full border-2 border-border bg-white flex items-center justify-center shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all hover:animate-bounce"
          >
            {isGlobalOpenM5 ? <X className="w-7 h-7 text-foreground" /> : <MascotIcon className="w-12 h-12" />}
          </button>
        </div>
      )}
    </div>
  )
}

export default FloatingWidgetsDemoPage
