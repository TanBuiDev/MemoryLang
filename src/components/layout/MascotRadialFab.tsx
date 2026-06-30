import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Settings, X } from 'lucide-react'
import { QuickNotesDrawer } from './QuickNotesDrawer'

// Mascot SVG Component
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

export function MascotRadialFab() {
  const [isOpen, setIsOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-6 z-[9999] select-none flex flex-col items-end">
      
      {/* Secondary item 1: Quick Notes */}
      <div 
        className={`absolute transition-all duration-300 flex flex-col items-center justify-center ${
          isOpen 
            ? 'opacity-100 scale-100 translate-x-0 -translate-y-[85px] sm:-translate-y-[106px]' 
            : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
        }`}
      >
        <button 
          type="button"
          onClick={() => {
            setIsOpen(false)
            setIsNotesOpen(true)
          }}
          title="Ghi chú nhanh"
          className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-[#fdc800] text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
        >
          <FileText className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
        </button>
        <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
          Ghi chú
        </span>
      </div>

      {/* Secondary item 2: Add Word (Diagonal Top-Left: x/y [60px] on mobile, [76px] on desktop) */}
      <div 
        className={`absolute transition-all duration-300 delay-[40ms] flex flex-col items-center justify-center ${
          isOpen 
            ? 'opacity-100 scale-100 -translate-x-[60px] -translate-y-[60px] sm:-translate-x-[76px] sm:-translate-y-[76px]' 
            : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
        }`}
      >
        <Link 
          to="/app/vocabulary/new"
          onClick={() => setIsOpen(false)}
          title="Thêm từ vựng"
          className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-[#432dd7] text-white flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
        >
          <Plus className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
        </Link>
        <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
          Thêm từ
        </span>
      </div>

      {/* Secondary item 3: Settings (Left: translate-x-[85px] on mobile, [106px] on desktop) */}
      <div 
        className={`absolute transition-all duration-300 delay-[80ms] flex flex-col items-center justify-center ${
          isOpen 
            ? 'opacity-100 scale-100 -translate-x-[85px] translate-y-0 sm:-translate-x-[106px]' 
            : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
        }`}
      >
        <Link 
          to="/app/settings"
          onClick={() => setIsOpen(false)}
          title="Cấu hình tài khoản"
          className="w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 border-border bg-emerald-400 text-foreground flex items-center justify-center shadow-[2px_2px_0px_#1c293c] hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none"
        >
          <Settings className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
        </Link>
        <span className="absolute -bottom-6 bg-white text-[9px] font-black border-2 border-border px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#1c293c] whitespace-nowrap text-foreground">
          Cài đặt
        </span>
      </div>

      {/* Main Mascot Button (Trigger) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] border-border bg-white flex items-center justify-center shadow-[3px_3px_0px_#1c293c] hover:shadow-[5px_5px_0px_#1c293c] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1c293c] transition-all neo-wobble-hover z-20 group"
      >
        {/* Transitioning Content: Mascot vs Close Icon */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className={`transition-all duration-300 ${isOpen ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
            <MascotIcon className="w-10 h-10 sm:w-11 sm:h-11" />
          </div>
          <div className={`absolute transition-all duration-300 ${isOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}>
            <X className="w-6 h-6 text-foreground font-black" />
          </div>
        </div>
      </button>

      {/* Quick Notes Popup Component */}
      <QuickNotesDrawer 
        isOpen={isNotesOpen} 
        onClose={() => setIsNotesOpen(false)} 
      />
    </div>
  )
}
