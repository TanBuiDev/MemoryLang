import React, { useState, useMemo, useRef, useCallback, useEffect, cloneElement } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { Flag, Search, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, Trash2, Loader2, Maximize2, Minimize2, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { TagEditor } from '@/components/ui/tag-editor'
import { TranslationChips } from '@/components/ui/translation-chips'
import { InlineEditableField } from '@/components/ui/inline-editable-field'
import { demoVocabulary } from '@/features/demo/demoData'
import { vocabularyUpdateFormSchema } from '@/features/vocabulary/vocabulary.schema'
import { useI18n } from '@/i18n'
import { enrichVocabulary } from '@/services/api/enrichVocabulary.api'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { isSupabaseConfigured, supabase } from '@/services/supabase/client'
import { createEmptyRelationshipGroups, relationshipService } from '@/services/supabase/relationship.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { RelatedTermsSection } from '@/components/vocabulary/RelatedTermsSection'
import { relationshipDisplayOrder, relationshipLabelKeys } from '@/components/vocabulary/relationshipDisplay'
import type { RelationType, VocabularyItem, VocabularyItemType, VocabularyStatus } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'
import { filterActiveVocabulary } from '@/utils/vocabulary'

const itemTypeLabelKeys: Record<VocabularyItemType, string> = {
  word: 'vocabulary.word',
  phrase: 'vocabulary.phrase',
  idiom: 'vocabulary.idiom',
  sentence: 'vocabulary.sentence',
}

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

interface HotkeyTooltipProps {
  children: React.ReactElement
  hotkey: string
  delay?: number
  position?: 'top' | 'bottom'
}

export function HotkeyTooltip({ children, hotkey, delay = 1000, position = 'bottom' }: HotkeyTooltipProps) {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setShow(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShow(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const trigger = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter()
      if (children.props.onMouseEnter) children.props.onMouseEnter(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave()
      if (children.props.onMouseLeave) children.props.onMouseLeave(e)
    },
    onClick: (e: React.MouseEvent) => {
      handleMouseLeave()
      if (children.props.onClick) children.props.onClick(e)
    }
  } as any)

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2'

  return (
    <div className="relative inline-block">
      {trigger}
      {show && (
        <div className={`absolute ${positionClasses} left-1/2 -translate-x-1/2 z-50 whitespace-nowrap p-1.5 border-2 border-border bg-card shadow-[3px_3px_0_var(--border)] rounded-md text-xs font-bold text-foreground`}>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px] shadow-[1px_1px_0_var(--border)]">{hotkey}</kbd>
        </div>
      )}
    </div>
  )
}

export function VocabularyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, language } = useI18n()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)

  const [formError, setFormError] = useState<string | null>(null)
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [enrichingIpa, setEnrichingIpa] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [relationType, setRelationType] = useState<RelationType>('synonym')
  const [targetId, setTargetId] = useState('')
  const [relationSearch, setRelationSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [relationHighlightIndex, setRelationHighlightIndex] = useState(-1)
  const relationListRef = useRef<HTMLDivElement>(null)
  const relationWrapperRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [imageFit, setImageFit] = useState<'fit' | 'cover'>(() => {
    return (localStorage.getItem('vocab_image_fit') as 'fit' | 'cover') || 'fit'
  })
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null)

  const vocabularyCardQuery = useQuery({
    queryKey: ['vocabulary-card', id],
    queryFn: () => relationshipService.getCard(id!),
    enabled: shouldUseRemoteData && Boolean(id),
    placeholderData: keepPreviousData,
  })

  const vocabularyListQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData && Boolean(user?.id),
  })

  const item = shouldUseRemoteData
    ? vocabularyCardQuery.data?.entry
    : demoVocabulary.find((entry) => entry.id === id) ?? demoVocabulary[0]

  const relationships = shouldUseRemoteData
    ? vocabularyCardQuery.data?.relationships ?? createEmptyRelationshipGroups()
    : createEmptyRelationshipGroups()

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth && naturalHeight) {
      setNaturalRatio(naturalWidth / naturalHeight)
    }
  }

  useEffect(() => {
    setNaturalRatio(null)
  }, [item?.image_url])

  const handleCopyEntry = async () => {
    if (!item?.source_text) return
    try {
      await navigator.clipboard.writeText(item.source_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const vocabularyIds = useMemo(() => {
    if (location.state && Array.isArray((location.state as any).vocabularyIds)) {
      return (location.state as any).vocabularyIds as string[]
    }
    const baseList = shouldUseRemoteData
      ? vocabularyListQuery.data ?? []
      : demoVocabulary

    return filterActiveVocabulary(baseList)
      .filter((v) => v.item_type !== 'grammar' && !v.tags?.some((tag) => tag === 'grammar' || tag === 'pattern'))
      .map((v) => v.id)
  }, [location.state, shouldUseRemoteData, vocabularyListQuery.data])

  const currentIndex = useMemo(() => {
    if (!id || !vocabularyIds) return -1
    return vocabularyIds.indexOf(id)
  }, [id, vocabularyIds])

  const prevId = currentIndex > 0 ? vocabularyIds[currentIndex - 1] : null
  const nextId = currentIndex >= 0 && currentIndex < vocabularyIds.length - 1 ? vocabularyIds[currentIndex + 1] : null

  // Tải trước (prefetch) dữ liệu của từ vựng tiếp theo và từ vựng phía trước để tránh độ trễ khi chuyển từ
  useEffect(() => {
    if (!shouldUseRemoteData) return

    if (nextId) {
      queryClient.prefetchQuery({
        queryKey: ['vocabulary-card', nextId],
        queryFn: () => relationshipService.getCard(nextId),
        staleTime: 5 * 60 * 1000, // 5 phút cache
      })
    }
    if (prevId) {
      queryClient.prefetchQuery({
        queryKey: ['vocabulary-card', prevId],
        queryFn: () => relationshipService.getCard(prevId),
        staleTime: 5 * 60 * 1000,
      })
    }
  }, [nextId, prevId, queryClient, shouldUseRemoteData])

  const [pageInputValue, setPageInputValue] = useState('')

  useEffect(() => {
    if (currentIndex !== -1) {
      setPageInputValue(String(currentIndex + 1))
    }
  }, [currentIndex])

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(pageInputValue, 10)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= vocabularyIds.length) {
        const targetId = vocabularyIds[pageNum - 1]
        if (targetId && targetId !== id) {
          navigate(`/app/vocabulary/${targetId}`, { state: { vocabularyIds } })
        }
      } else {
        setPageInputValue(String(currentIndex + 1))
      }
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setPageInputValue(String(currentIndex + 1))
      e.currentTarget.blur()
    }
  }

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= vocabularyIds.length) {
      const targetId = vocabularyIds[pageNum - 1]
      if (targetId && targetId !== id) {
        navigate(`/app/vocabulary/${targetId}`, { state: { vocabularyIds } })
      }
    } else {
      setPageInputValue(String(currentIndex + 1))
    }
  }

  const targetOptions = useMemo(
    () => filterActiveVocabulary(vocabularyListQuery.data ?? []).filter((entry) => entry.id !== id),
    [id, vocabularyListQuery.data]
  )

  const filteredTargetOptions = useMemo(
    () => {
      const q = relationSearch.trim().toLowerCase()
      if (!q) return targetOptions.slice(0, 10)
      return targetOptions
        .filter((t) => t.source_text.toLowerCase().startsWith(q) || (t.translation?.toLowerCase().startsWith(q) ?? false))
        .slice(0, 10)
    },
    [relationSearch, targetOptions]
  )

  const handleRelationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isSearching || filteredTargetOptions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setRelationHighlightIndex((prev) => (prev < filteredTargetOptions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setRelationHighlightIndex((prev) => (prev > 0 ? prev - 1 : filteredTargetOptions.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const idx = relationHighlightIndex >= 0 ? relationHighlightIndex : 0
        const entry = filteredTargetOptions[idx]
        if (entry) {
          setTargetId(entry.id)
          setRelationSearch(entry.source_text)
          setIsSearching(false)
          setRelationHighlightIndex(-1)
          requestAnimationFrame(() => pillRefs.current.get(relationType)?.focus())
        }
      } else if (e.key === 'Escape') {
        setRelationSearch('')
        setIsSearching(false)
        setRelationHighlightIndex(-1)
      }
    },
    [relationSearch, filteredTargetOptions, relationHighlightIndex, relationType]
  )

  const invalidateVocabularyQueries = async (targetTermId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vocabulary-card', id] }),
      targetTermId ? queryClient.invalidateQueries({ queryKey: ['vocabulary-card', targetTermId] }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
    ])
  }

  useEffect(() => {
    if (relationHighlightIndex < 0 || !relationListRef.current) return
    const items = relationListRef.current.querySelectorAll('button')
    const el = items[relationHighlightIndex]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [relationHighlightIndex])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (relationWrapperRef.current && !relationWrapperRef.current.contains(e.target as Node)) {
        setIsSearching(false)
        if (!targetId) setRelationSearch('')
        setRelationHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [targetId])

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement
      const isInputFocused =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable

      // Alt + ArrowLeft hoặc (ArrowLeft khi không focus ô nhập liệu): Lùi lại
      if ((e.altKey && e.key === 'ArrowLeft') || (!isInputFocused && e.key === 'ArrowLeft')) {
        if (prevId) {
          e.preventDefault()
          navigate(`/app/vocabulary/${prevId}`, { state: { vocabularyIds } })
        }
      }
      // Alt + ArrowRight hoặc (ArrowRight khi không focus ô nhập liệu): Tiếp theo
      else if ((e.altKey && e.key === 'ArrowRight') || (!isInputFocused && e.key === 'ArrowRight')) {
        if (nextId) {
          e.preventDefault()
          navigate(`/app/vocabulary/${nextId}`, { state: { vocabularyIds } })
        }
      }
      // Alt + P hoặc (Ctrl + Space): Phát âm thanh
      else if ((e.altKey && e.key.toLowerCase() === 'p') || (e.ctrlKey && e.key === ' ')) {
        if (item) {
          e.preventDefault()
          speak(item.source_text, { audioUrl: item.audio_url })
        }
      }
      // Alt + F: Gắn cờ / Bỏ gắn cờ
      else if (e.altKey && e.key.toLowerCase() === 'f') {
        if (item) {
          e.preventDefault()
          const action = item.flagged ? vocabularyService.unflagTerm(item.id) : vocabularyService.flagTerm(item.id)
          action.then(() => invalidateVocabularyQueries()).catch(() => { /* non-critical */ })
        }
      }
      // Alt + D hoặc Alt + Delete: Xác nhận xóa từ vựng
      else if (e.altKey && (e.key.toLowerCase() === 'd' || e.key === 'Delete')) {
        e.preventDefault()
        setIsDeleting(true)
      }
      // Escape: Quay lại danh sách từ vựng khi không có modal nào mở và không focus input
      else if (e.key === 'Escape') {
        if (isZoomed) {
          e.preventDefault()
          setIsZoomed(false)
          return
        }
        if (isDeleting) {
          return
        }
        if (!isInputFocused) {
          e.preventDefault()
          navigate('/app/vocabulary')
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [id, prevId, nextId, vocabularyIds, item, isDeleting, isZoomed, navigate, invalidateVocabularyQueries])

  const updateMutation = useMutation({
    mutationFn: (updatedFields: Partial<VocabularyItem>) => {
      if (!item || !id) throw new Error(t('vocabulary.emptyTitle'))

      const parsed = vocabularyUpdateFormSchema.safeParse({
        source_text: item.source_text,
        source_language: item.source_language,
        native_language: item.native_language,
        item_type: item.item_type,
        status: item.status,
        part_of_speech: item.part_of_speech,
        ipa: item.ipa,
        audio_url: item.audio_url ?? '',
        image_url: item.image_url ?? '',
        note: item.note,
        translation: item.translation,
        meanings: item.meanings,
        examples: item.examples,
        tags: item.tags ?? [],
        ...updatedFields,
      })

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? t('vocabulary.editDescription'))
      }

      return vocabularyService.update(id, parsed.data)
    },
    onSuccess: async () => {
      setFormError(null)
      await invalidateVocabularyQueries()
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    },
    onError: async (error, variables) => {
      setFormError(error instanceof Error ? error.message : String(error))
      setAutoSaveStatus('idle')
      if (user && item) {
        await studyLocalDb.enqueueMutation({
          id: `${item.id}-update-${Date.now()}`,
          userId: user.id,
          type: 'update',
          payload: { ...item, ...variables },
          createdAt: new Date().toISOString(),
        })
      }
    },
  })

  const handleSaveField = async (fields: Partial<VocabularyItem>) => {
    try {
      setAutoSaveStatus('saving')
      await updateMutation.mutateAsync(fields)
    } catch {
      setAutoSaveStatus('idle')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !item) return

    if (!file.type.startsWith('image/')) {
      setFormError('Vui lòng chọn tệp hình ảnh hợp lệ.')
      return
    }

    try {
      setUploadingImage(true)
      setFormError(null)

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${item.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('vocabulary-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('vocabulary-images')
        .getPublicUrl(fileName)

      await handleSaveField({ image_url: publicUrl })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể tải ảnh lên.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageDelete = async () => {
    if (!item) return
    try {
      setFormError(null)
      await handleSaveField({ image_url: null })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể xóa ảnh.')
    }
  }

  const deleteVocabulary = useMutation({
    mutationFn: () => vocabularyService.remove(id!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
      ])
      navigate('/app/vocabulary')
    },
    onError: async () => {
      if (user && item) {
        await studyLocalDb.enqueueMutation({
          id: `${item.id}-delete-${Date.now()}`,
          userId: user.id,
          type: 'delete',
          payload: item,
          createdAt: new Date().toISOString(),
        })
        navigate('/app/vocabulary')
      }
    },
  })

  const addRelationshipMutation = useMutation({
    mutationFn: async () => {
      if (!id || !targetId) throw new Error(t('vocabulary.relationshipTarget'))
      await relationshipService.createAuto(id, targetId, relationType)
    },
    onSuccess: async () => {
      const addedTargetId = targetId
      setTargetId('')
      setRelationSearch('')
      setIsSearching(false)
      setFormError(null)
      await invalidateVocabularyQueries(addedTargetId)
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : String(error)),
  })

  const handlePillKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIdx = relationshipDisplayOrder.indexOf(relationType)
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const next = e.key === 'ArrowRight'
          ? (currentIdx + 1) % relationshipDisplayOrder.length
          : (currentIdx - 1 + relationshipDisplayOrder.length) % relationshipDisplayOrder.length
        setRelationType(relationshipDisplayOrder[next])
        requestAnimationFrame(() => pillRefs.current.get(relationshipDisplayOrder[next])?.focus())
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (targetId && !addRelationshipMutation.isPending) {
          addRelationshipMutation.mutate()
        }
      }
    },
    [relationType, targetId, addRelationshipMutation]
  )

  const removeRelationshipMutation = useMutation({
    mutationFn: async ({ targetTermId, selectedRelationType }: { targetTermId: string; selectedRelationType: RelationType }) => {
      if (!id) throw new Error(t('vocabulary.emptyTitle'))
      setRemovingKey(`${selectedRelationType}:${targetTermId}`)
      await relationshipService.removeAuto(id, targetTermId, selectedRelationType)
      return targetTermId
    },
    onSuccess: async (targetTermId) => {
      setFormError(null)
      setRemovingKey(null)
      await invalidateVocabularyQueries(targetTermId)
    },
    onError: (error) => {
      setRemovingKey(null)
      setFormError(error instanceof Error ? error.message : String(error))
    },
  })

  if (shouldUseRemoteData && vocabularyCardQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (vocabularyCardQuery.error) {
    return <Card className="font-black text-danger">{vocabularyCardQuery.error.message}</Card>
  }

  if (!item) {
    return (
      <Card className="text-center">
        <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
        <Button asChild className="mt-4">
          <Link to="/app/vocabulary">{t('actions.cancel')}</Link>
        </Button>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-2 max-w-full">
            <InlineEditableField
              value={item.source_text}
              onSave={(val) => handleSaveField({ source_text: val })}
              className="text-4xl font-black md:text-5xl border-dashed w-fit"
              editClassName="w-[300px] md:w-[500px]"
              placeholder={t('vocabulary.sourceText')}
            />
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors rounded-md"
              onClick={handleCopyEntry}
              title={t('vocabulary.copyTooltip')}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-2 mt-2 h-5">
            {autoSaveStatus === 'saving' && (
              <span className="text-xs font-bold text-muted-foreground animate-pulse">{t('vocabulary.autoSaving')}</span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-xs font-bold text-success">{t('vocabulary.saved')}</span>
            )}
            {formError && <span className="text-xs font-bold text-danger">{formError}</span>}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HotkeyTooltip hotkey="Alt + ←">
              <Button
                variant="ghost"
                disabled={!prevId}
                onClick={() => navigate(`/app/vocabulary/${prevId}`, { state: { vocabularyIds } })}
                title={t('study.previousCard')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </HotkeyTooltip>
            {currentIndex !== -1 && (
              <div className="flex items-center text-xs font-black px-2 py-1 rounded bg-muted border-2 border-border text-center select-none">
                <input
                  type="number"
                  min={1}
                  max={vocabularyIds.length}
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  onBlur={handlePageInputBlur}
                  className="w-12 bg-transparent text-center focus:outline-none focus:bg-card rounded border border-transparent focus:border-border p-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Vị trí trang"
                />
                <span className="pr-1.5 text-muted-foreground">/ {vocabularyIds.length}</span>
              </div>
            )}
            <HotkeyTooltip hotkey="Alt + →">
              <Button
                variant="ghost"
                disabled={!nextId}
                onClick={() => navigate(`/app/vocabulary/${nextId}`, { state: { vocabularyIds } })}
                title={t('study.nextCard')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </HotkeyTooltip>
            <div className="h-6 w-[2px] bg-border mx-1" />
            {item.flagged ? (
              <HotkeyTooltip hotkey="Alt + F">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await vocabularyService.unflagTerm(item.id)
                    await invalidateVocabularyQueries()
                  }}
                >
                  <Flag className="h-4 w-4 text-warning" fill="currentColor" />
                </Button>
              </HotkeyTooltip>
            ) : (
              <HotkeyTooltip hotkey="Alt + F">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await vocabularyService.flagTerm(item.id)
                    await invalidateVocabularyQueries()
                  }}
                >
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </Button>
              </HotkeyTooltip>
            )}
            <HotkeyTooltip hotkey="Alt + D">
              <Button variant="danger" onClick={() => setIsDeleting(true)}>
                {t('vocabulary.delete')}
              </Button>
            </HotkeyTooltip>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground mr-1 whitespace-nowrap">Loại:</span>
          <InlineEditableField
            value={item.item_type}
            type="select"
            options={Object.entries(itemTypeLabelKeys).map(([val, labelKey]) => ({
              value: val,
              label: t(labelKey),
            }))}
            onSave={(val) => handleSaveField({ item_type: val as VocabularyItemType })}
            displayValue={<Badge className="cursor-pointer font-black">{t(itemTypeLabelKeys[item.item_type])}</Badge>}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground mr-1 whitespace-nowrap">Trạng thái:</span>
          <InlineEditableField
            value={item.status}
            type="select"
            options={Object.entries(statusLabelKeys).map(([val, labelKey]) => ({
              value: val,
              label: t(labelKey),
            }))}
            onSave={(val) => handleSaveField({ status: val as VocabularyStatus })}
            displayValue={<Badge className="cursor-pointer font-black">{t(statusLabelKeys[item.status])}</Badge>}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground mr-1 whitespace-nowrap">Từ loại:</span>
          <InlineEditableField
            value={item.part_of_speech ?? ''}
            type="input"
            onSave={(val) => handleSaveField({ part_of_speech: val || null })}
            placeholder={t('vocabulary.partOfSpeech')}
            displayValue={
              item.part_of_speech ? (
                <Badge className="cursor-pointer bg-muted text-foreground font-black">{item.part_of_speech}</Badge>
              ) : (
                <Badge className="cursor-pointer bg-muted text-muted-foreground italic border-dashed font-bold">
                  {t('vocabulary.partOfSpeech')}
                </Badge>
              )
            }
          />
        </div>
      </div>

      <div className={cn(
        "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] transition-opacity duration-200",
        shouldUseRemoteData && vocabularyCardQuery.isFetching && vocabularyCardQuery.data?.entry?.id !== id && "opacity-50 pointer-events-none"
      )}>
        <Card className="flex flex-col gap-6">
          <div>
            <Label className="text-xs uppercase text-muted-foreground mb-1 block">{t('vocabulary.ipa')}</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-sm">
                <InlineEditableField
                  value={item.ipa ?? ''}
                  onSave={(val) => handleSaveField({ ipa: val || null })}
                  placeholder="/.../"
                  className="font-mono text-xl font-black"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-3 text-xs"
                disabled={enrichingIpa}
                onClick={async () => {
                  setEnrichingIpa(true)
                  try {
                    const enriched = await enrichVocabulary(item.source_text, item.source_language, item.native_language)
                    await handleSaveField({
                      ipa: enriched.ipa ?? item.ipa,
                      part_of_speech: enriched.partOfSpeech ?? item.part_of_speech,
                    })
                  } catch {
                    /* ignored */
                  }
                  setEnrichingIpa(false)
                }}
              >
                {enrichingIpa ? (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="inline-block animate-bounce [animation-delay:0ms]">.</span>
                    <span className="inline-block animate-bounce [animation-delay:150ms]">.</span>
                    <span className="inline-block animate-bounce [animation-delay:300ms]">.</span>
                  </span>
                ) : (
                  t('vocabulary.regenerateIpa')
                )}
              </Button>
            </div>
          </div>

          <div>
            <HotkeyTooltip hotkey="Alt + P" position="top">
              <Button
                onClick={() =>
                  speak(item.source_text, { audioUrl: item.audio_url })
                }
              >
                {t('actions.playAudio')}
              </Button>
            </HotkeyTooltip>
          </div>

          <hr className="border-border border-dashed" />

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-1">{t('vocabulary.meaning')}</CardTitle>
            <InlineEditableField
              value={item.meanings[0]?.text ?? ''}
              type="textarea"
              onSave={(val) =>
                handleSaveField({
                  meanings: val ? [{ text: val, language: item.native_language }] : [],
                })
              }
              placeholder={t('vocabulary.noNotes')}
              className="font-semibold text-muted-foreground"
            />
          </div>

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-1">{t('vocabulary.translation')}</CardTitle>
            <InlineEditableField
              value={item.translation ?? ''}
              type="custom"
              onSave={(val) => handleSaveField({ translation: val })}
              placeholder={t('vocabulary.translation')}
              displayValue={<span className="text-2xl text-primary font-black underline decoration-2">{item.translation || t('vocabulary.translation')}</span>}
              renderCustomInput={(val, onChange, save, cancel) => (
                <div className="flex flex-col gap-2">
                  <TranslationChips value={val} onChange={onChange} />
                  <div className="flex gap-2 justify-end mt-1">
                    <Button
                      type="button"
                      tabIndex={-1}
                      className="h-8 py-1 px-3 text-xs bg-emerald-400"
                      onClick={save}
                    >
                      {t('actions.saveChanges')}
                    </Button>
                    <Button type="button" tabIndex={-1} className="h-8 py-1 px-3 text-xs" variant="ghost" onClick={cancel}>
                      {t('actions.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-2">{t('vocabulary.tags')}</CardTitle>
            <TagEditor
              tags={item.tags}
              onChange={(newTags) => handleSaveField({ tags: newTags })}
            />
          </div>

          <hr className="border-border border-dashed" />

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-3">{t('vocabulary.examples')}</CardTitle>
            <div className="flex flex-col gap-4">
              <div className="p-3 border-2 border-border rounded-md bg-slate-50/50">
                <Label className="text-xs text-muted-foreground font-semibold mb-1 block">Câu ví dụ (English)</Label>
                <InlineEditableField
                  value={item.examples[0]?.sentence ?? ''}
                  type="textarea"
                  onSave={(val) => {
                    const trans = item.examples[0]?.translation ?? ''
                    handleSaveField({
                      examples: val ? [{ sentence: val, translation: trans }] : [],
                    })
                  }}
                  placeholder="Ví dụ: We should apologize for an error."
                  className="font-semibold"
                />
              </div>
              <div className="p-3 border-2 border-border rounded-md bg-slate-50/50">
                <Label className="text-xs text-muted-foreground font-semibold mb-1 block">Dịch nghĩa câu ví dụ (Vietnamese)</Label>
                <InlineEditableField
                  value={item.examples[0]?.translation ?? ''}
                  type="input"
                  onSave={(val) => {
                    const sent = item.examples[0]?.sentence ?? ''
                    if (sent) {
                      handleSaveField({
                        examples: [{ sentence: sent, translation: val }],
                      })
                    }
                  }}
                  placeholder="Dịch nghĩa: Chúng tôi xin lỗi vì sai sót."
                  className="text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <hr className="border-border border-dashed" />

          <div>
            <CardTitle className="text-sm uppercase text-muted-foreground mb-1">{t('vocabulary.note')}</CardTitle>
            <InlineEditableField
              value={item.note ?? ''}
              type="textarea"
              onSave={(val) => handleSaveField({ note: val || null })}
              placeholder={t('vocabulary.noNotes')}
              className="font-semibold text-muted-foreground"
            />
          </div>
        </Card>

        <div className="grid gap-4 self-start">
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase text-muted-foreground">{t('vocabulary.illustration')}</CardTitle>
              {item.image_url && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const newFit = imageFit === 'fit' ? 'cover' : 'fit'
                      setImageFit(newFit)
                      localStorage.setItem('vocab_image_fit', newFit)
                    }}
                    title={imageFit === 'fit' ? t('vocabulary.imageFitCover') : t('vocabulary.imageFitContain')}
                  >
                    {imageFit === 'fit' ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('vocabulary.changeImage')}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="h-7 w-7 p-0 border-2 border-border shadow-[1px_1px_0_var(--border)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                    onClick={handleImageDelete}
                    title={t('vocabulary.deleteImage')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              aria-label="Tải ảnh minh họa"
            />

            {uploadingImage ? (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-md bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-bold text-muted-foreground mt-2">{t('vocabulary.uploading')}</span>
              </div>
            ) : item.image_url ? (
              <div
                onClick={() => setIsZoomed(true)}
                style={imageFit === 'fit' && naturalRatio ? { aspectRatio: `${naturalRatio}` } : undefined}
                className={cn(
                  "relative group overflow-hidden rounded-md border-2 border-border shadow-[3px_3px_0_var(--border)] bg-muted/5 flex items-center justify-center cursor-zoom-in transition-all duration-200",
                  imageFit === 'fit'
                    ? cn("w-full min-h-[8rem] max-h-[24rem]", !naturalRatio && "h-48")
                    : "w-full h-56"
                )}
              >
                {imageFit === 'fit' && (
                  <div
                    className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-40"
                    style={{ backgroundImage: `url(${item.image_url})` }}
                  />
                )}
                <img
                  src={item.image_url}
                  alt={item.source_text}
                  onLoad={handleImageLoad}
                  className={cn(
                    "relative z-10 transition-all duration-200",
                    imageFit === 'fit'
                      ? "max-h-[23.5rem] w-full object-contain p-1"
                      : "w-full h-full object-cover"
                  )}
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-md bg-muted/10 hover:bg-slate-50/50 cursor-pointer transition-all gap-2"
              >
                <div className="p-3 rounded-full bg-muted border-2 border-border shadow-[2px_2px_0_var(--border)]">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <span className="text-xs font-black text-muted-foreground">{t('vocabulary.uploadImage')}</span>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="text-base font-black">{t('vocabulary.addRelationship')}</CardTitle>
            <div className="mt-4 grid gap-3">
              <div className="relative" ref={relationWrapperRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder={t('vocabulary.search')}
                  value={relationSearch}
                  onChange={(e) => { setRelationSearch(e.target.value); setIsSearching(true); setRelationHighlightIndex(-1) }}
                  onKeyDown={handleRelationKeyDown}
                  disabled={!shouldUseRemoteData}
                  className="pl-9"
                />
                {isSearching && targetOptions.length > 0 && (
                  <div ref={relationListRef} className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-auto rounded-md border-2 border-border bg-card divide-y-2 divide-border shadow-[4px_4px_0_var(--border)] z-20">
                    {filteredTargetOptions.length > 0 ? (
                      filteredTargetOptions.map((entry, idx) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => { setTargetId(entry.id); setRelationSearch(entry.source_text); setIsSearching(false); setRelationHighlightIndex(-1); requestAnimationFrame(() => pillRefs.current.get(relationType)?.focus()) }}
                          className={`w-full px-3 py-2 text-left text-sm font-semibold transition hover:bg-muted ${entry.id === targetId || idx === relationHighlightIndex ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                          <span className="font-black">{entry.source_text}</span>
                          {entry.translation ? <span className="text-muted-foreground ml-2">— {entry.translation}</span> : null}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-muted-foreground">{t('decks.noAvailableTerms')}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="group flex flex-wrap gap-3" onKeyDown={handlePillKeyDown}>
                {relationshipDisplayOrder.map((type) => (
                  <button
                    key={type}
                    type="button"
                    ref={(el) => { if (el) pillRefs.current.set(type, el); else pillRefs.current.delete(type); }}
                    onClick={(e) => { e.stopPropagation(); setRelationType(type); }}
                    className={`px-2.5 py-1 rounded-md border-2 text-xs font-bold transition-transform transition-shadow duration-150 focus-visible:outline-none hover:scale-105 hover:-translate-y-0.5 hover:relative hover:z-10 hover:shadow-[3px_3px_0_var(--border)] focus-visible:scale-110 focus-visible:-translate-y-0.5 focus-visible:relative focus-visible:z-10 focus-visible:shadow-[3px_3px_0_var(--border)] ${
                      relationType === type
                        ? 'border-border bg-primary text-primary-foreground group-hover:bg-card group-hover:text-foreground hover:bg-primary hover:text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                        : 'border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                    }`}
                  >
                    {t(relationshipLabelKeys[type])}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                disabled={!shouldUseRemoteData || !targetId || addRelationshipMutation.isPending}
                onClick={() => addRelationshipMutation.mutate()}
              >
                {addRelationshipMutation.isPending ? '...' : t('vocabulary.addRelationship')}
              </Button>
            </div>
          </Card>

          <RelatedTermsSection
            relationships={relationships}
            removingKey={removingKey}
            onRemove={(targetTermId, selectedRelationType) =>
              removeRelationshipMutation.mutate({ targetTermId, selectedRelationType })
            }
          />

        </div>
      </div>

      {isZoomed && item.image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-card p-2 border-4 border-border shadow-[8px_8px_0_rgba(0,0,0,1)] rounded-lg">
            <img
              src={item.image_url}
              alt={item.source_text}
              className="max-w-full max-h-[80vh] object-contain rounded-md"
            />
            <div className="absolute bottom-4 right-4 bg-card border-2 border-border px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_rgba(0,0,0,1)] rounded">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={isDeleting}
        title={t('vocabulary.deleteConfirmSingle', { word: item.source_text })}
        confirmLabel={t('vocabulary.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        confirmDisabled={deleteVocabulary.isPending}
        onConfirm={() => deleteVocabulary.mutate()}
        onCancel={() => setIsDeleting(false)}
      />
    </>
  )
}
