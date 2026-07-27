import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileAudio, Loader2, Sparkles, Upload, Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { generateAudio } from '@/services/api/generateAudio.api'
import { adminExamMediaService, type B1MediaResource } from '@/services/supabase/adminExamMedia.service'

const languageOptions = [
  { value: 'de-DE', label: 'Tiếng Đức (de-DE)' },
  { value: 'en-US', label: 'Tiếng Anh (en-US)' },
]

export default function AdminExamMediaPage() {
  const queryClient = useQueryClient()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<B1MediaResource | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [language, setLanguage] = useState('de-DE')
  const resourcesQuery = useQuery({ queryKey: ['admin-b1-media'], queryFn: adminExamMediaService.listResources })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-b1-media'] })
  const updateAudio = useMutation({
    mutationFn: ({ resource, url }: { resource: B1MediaResource; url: string | null }) => adminExamMediaService.setAudioUrl(resource, url),
    onSuccess: async () => { await refresh(); showToast({ type: 'success', title: 'Đã lưu audio cho nội dung B1' }) },
    onError: () => showToast({ type: 'error', title: 'Không thể lưu audio' }),
  })
  const publish = useMutation({
    mutationFn: ({ resource, value }: { resource: B1MediaResource; value: boolean }) => adminExamMediaService.setPublished(resource, value),
    onSuccess: refresh,
  })
  const generate = useMutation({
    mutationFn: async (resource: B1MediaResource) => {
      const result = await generateAudio(resource.text, language)
      if (!result.audioUrl) throw new Error('TTS chưa tạo được audio')
      await adminExamMediaService.setAudioUrl(resource, result.audioUrl)
    },
    onSuccess: async () => { await refresh(); showToast({ type: 'success', title: 'Đã tạo và gắn audio TTS' }) },
    onError: (error) => showToast({ type: 'error', title: 'Tạo TTS thất bại', message: error instanceof Error ? error.message : undefined }),
  })

  const chooseResource = (resource: B1MediaResource) => { setSelected(resource); setAudioUrl(resource.audio_url ?? '') }
  const onUpload = async (file?: File) => {
    if (!file || !selected) return
    try {
      const url = await adminExamMediaService.uploadAudio(file, selected.source_key)
      setAudioUrl(url)
      await updateAudio.mutateAsync({ resource: selected, url })
    } catch { showToast({ type: 'error', title: 'Không thể tải file audio lên' }) }
  }

  return <div className="space-y-6">
    <header className="neo-card bg-primary p-6"><div className="flex items-center gap-3"><FileAudio size={30} /><div><h1 className="text-2xl font-black">Media cho đề thi B1</h1><p className="font-semibold">Thêm file audio hoặc tạo TTS cho Listening, Writing và Speaking trước khi xuất bản.</p></div></div></header>
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        {resourcesQuery.isLoading && <div className="neo-card animate-pulse p-6 font-black">Đang tải nội dung…</div>}
        {(resourcesQuery.data ?? []).map((resource) => <article key={`${resource.kind}-${resource.id}`} className="neo-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-secondary">{resource.skill} · {resource.kind}</p><h2 className="font-black">{resource.title}</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">{resource.audio_url ? 'Đã có audio' : 'Chưa có audio'} · {resource.is_published ? 'Đã xuất bản' : 'Bản nháp'}</p></div><div className="flex gap-2"><Button variant="ghost" onClick={() => chooseResource(resource)}><Volume2 size={16} />Quản lý</Button><Button variant={resource.is_published ? 'ghost' : 'secondary'} onClick={() => publish.mutate({ resource, value: !resource.is_published })}>{resource.is_published ? 'Ẩn' : 'Xuất bản'}</Button></div></article>)}
      </section>
      <aside className="neo-card h-fit p-5">
        <h2 className="text-xl font-black">{selected ? selected.title : 'Chọn một nội dung'}</h2>
        {selected ? <div className="mt-5 space-y-4"><div><Label htmlFor="audio-url">Đường dẫn audio</Label><Input id="audio-url" className="mt-1" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…/audio.mp3" /></div><Button className="w-full" onClick={() => updateAudio.mutate({ resource: selected, url: audioUrl.trim() || null })} disabled={updateAudio.isPending}>Lưu đường dẫn audio</Button><input ref={uploadInputRef} type="file" accept="audio/*" className="sr-only" onChange={(event) => void onUpload(event.target.files?.[0])} /><Button variant="ghost" className="w-full" onClick={() => uploadInputRef.current?.click()}><Upload size={16} />Tải file audio lên</Button><div className="border-t-2 border-border pt-4"><Label htmlFor="tts-language">Tạo bằng TTS</Label><Select id="tts-language" value={language} onChange={setLanguage} options={languageOptions} className="mt-1" /><Button variant="secondary" className="mt-3 w-full" disabled={!selected.text.trim() || generate.isPending} onClick={() => generate.mutate(selected)}>{generate.isPending ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}Tạo audio TTS</Button></div>{audioUrl && <audio className="w-full" controls src={audioUrl} />}</div> : <p className="mt-2 text-sm font-semibold text-muted-foreground">Chọn nội dung ở bên trái để gắn media.</p>}
      </aside>
    </div>
  </div>
}
