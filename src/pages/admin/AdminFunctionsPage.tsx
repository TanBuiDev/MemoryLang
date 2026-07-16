import { useState } from 'react'
import { Terminal, RefreshCw, Cpu } from 'lucide-react'
import { showToast } from '@/components/ui/toast'

interface EdgeFunction {
  name: string
  status: 'ACTIVE' | 'ERROR' | 'DEPLOYING'
  invocations: number
  avgDurationMs: number
  lastDeployed: string
}

export default function AdminFunctionsPage() {
  const [loading, setLoading] = useState(false)
  const [functions, setFunctions] = useState<EdgeFunction[]>([
    {
      name: 'enrich-vocabulary',
      status: 'ACTIVE',
      invocations: 1240,
      avgDurationMs: 850,
      lastDeployed: '2026-06-25 10:20',
    },
    {
      name: 'search-images',
      status: 'ACTIVE',
      invocations: 850,
      avgDurationMs: 420,
      lastDeployed: '2026-06-24 16:45',
    },
    {
      name: 'generate-audio',
      status: 'ACTIVE',
      invocations: 3105,
      avgDurationMs: 1200,
      lastDeployed: '2026-06-26 09:12',
    },
  ])

  const [logs, setLogs] = useState<string[]>([
    '[INFO] [2026-06-26 14:15:20] generate-audio: Synthesis start for text "hello"',
    '[INFO] [2026-06-26 14:15:21] generate-audio: Cache miss. Calling Google TTS API.',
    '[INFO] [2026-06-26 14:15:22] generate-audio: Uploaded synthesis output to R2 cache.',
    '[INFO] [2026-06-26 14:15:22] generate-audio: Return response 200 OK. Duration: 1150ms',
    '[INFO] [2026-06-26 14:17:10] search-images: Query "apple" on source "all"',
    '[INFO] [2026-06-26 14:17:11] search-images: Found 120 results on Unsplash. Return response 200 OK.',
    '[INFO] [2026-06-26 14:18:05] enrich-vocabulary: Lookup word "employment"',
    '[INFO] [2026-06-26 14:18:06] enrich-vocabulary: Dictionaryapi.dev success. MyMemory translation success.',
    '[INFO] [2026-06-26 14:18:06] enrich-vocabulary: Return response 200 OK. Duration: 920ms',
  ])

  const handleDeploy = async (funcName: string) => {
    // Trạng thái Deploying
    setFunctions(prev =>
      prev.map(f => (f.name === funcName ? { ...f, status: 'DEPLOYING' } : f))
    )

    // Giả lập deploy
    setTimeout(() => {
      setFunctions(prev =>
        prev.map(f =>
          f.name === funcName
            ? { ...f, status: 'ACTIVE', lastDeployed: new Date().toISOString().replace('T', ' ').substring(0, 16) }
            : f
        )
      )
      setLogs(prev => [
        `[INFO] [${new Date().toISOString().replace('T', ' ').substring(0, 19)}] CLI: Redeployed edge function "${funcName}" successfully via CLI API.`,
        ...prev,
      ])
      showToast({
        type: 'success',
        title: 'Deploy thành công',
        message: `Edge Function "${funcName}" đã được deploy lại.`,
      })
    }, 2000)
  }

  const handleRefreshLogs = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setLogs(prev => [
        `[INFO] [${new Date().toISOString().replace('T', ' ').substring(0, 19)}] CLI: Refreshed function execution logs.`,
        ...prev.slice(0, 15),
      ])
    }, 500)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">EDGE FUNCTIONS MONITOR</h1>
        <p className="text-muted-foreground font-bold">Giám sát trạng thái hoạt động, lượt gọi và logs của các Edge Functions.</p>
      </div>

      {/* Grid Functions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {functions.map(f => (
          <div
            key={f.name}
            className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 rounded bg-muted border border-border text-[9px] font-black font-mono">
                EDGE FUNCTION
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                f.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : f.status === 'DEPLOYING'
                  ? 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {f.status}
              </span>
            </div>
            <div>
              <h3 className="text-md font-black text-foreground font-mono">{f.name}</h3>
              <p className="text-[10px] text-muted-foreground font-bold mt-1">Deploy: {f.lastDeployed}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs font-bold text-muted-foreground">
              <div className="flex flex-col">
                <span className="text-[9px] font-black">LƯỢT GỌI</span>
                <span className="text-sm font-black text-foreground">{f.invocations} calls</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-black">DUR AVERAGE</span>
                <span className="text-sm font-black text-foreground">{f.avgDurationMs}ms</span>
              </div>
            </div>
            <button
              onClick={() => handleDeploy(f.name)}
              disabled={f.status === 'DEPLOYING'}
              className="w-full mt-1 neo-button min-h-0 py-2 rounded border-2 border-border bg-[#fdc800] text-foreground text-xs font-black flex items-center justify-center gap-1.5 hover:bg-[#e0b000] active:neo-button-active transition-all disabled:opacity-50"
            >
              <Cpu size={14} />
              Deploy lại Function
            </button>
          </div>
        ))}
      </div>

      {/* Logs Console */}
      <div className="neo-card p-5 bg-card border-2 border-border shadow-[4px_4px_0_var(--border)] flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-border pb-2">
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <Terminal size={18} />
            CONSOLES & RECENT LOGS
          </h3>
          <button
            onClick={handleRefreshLogs}
            disabled={loading}
            className="p-1 rounded hover:bg-muted border border-border bg-card transition-all"
            title="Làm mới log"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="bg-[#1c293c] text-[#fbfbf9] p-4 rounded-md font-mono text-xs flex flex-col gap-1.5 min-h-[220px] max-h-[350px] overflow-y-auto shadow-inner border-2 border-border">
          {logs.map((log, idx) => (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed select-text">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
