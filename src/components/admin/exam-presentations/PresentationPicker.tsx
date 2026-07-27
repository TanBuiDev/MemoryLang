import { BookOpen, FileText, Image, ListChecks, Mic2, PenLine, Rows3, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRESENTATION_REGISTRY } from '@/features/exam-content/presentationRegistry'
import type { ExamPresentationType } from '@/types/exam.types'

interface PresentationPickerProps {
  resourceKind: 'activity' | 'prompt'
  value: ExamPresentationType
  onChange: (value: ExamPresentationType) => void
  disabled?: boolean
}

const presentationIcons: Record<ExamPresentationType, typeof FileText> = {
  choice_list: ListChecks,
  boolean_list: ListChecks,
  image_choice_list: Image,
  passage_choice_inline: Rows3,
  passage_text_inline: Type,
  passage_questions: BookOpen,
  sentence_transformation: PenLine,
  short_answer_list: Type,
  long_form_prompt: FileText,
  speaking_script_prompt: Mic2,
  matching: Rows3,
  ordering: Rows3,
}

export function PresentationPicker({ resourceKind, value, onChange, disabled = false }: PresentationPickerProps) {
  const presentations = Object.values(PRESENTATION_REGISTRY)
    .filter((presentation) => presentation.resourceKind === resourceKind)

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-black text-foreground">Học viên sẽ làm theo cách nào?</legend>
      <p className="text-xs font-semibold text-muted-foreground">
        Chọn một cách trình bày. Hệ thống sẽ chỉ hiển thị các trường nội dung và cách chấm phù hợp.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {presentations.map((presentation) => {
          const Icon = presentationIcons[presentation.type]
          const isSelected = presentation.type === value
          return (
            <Button
              key={presentation.type}
              type="button"
              variant={isSelected ? 'secondary' : 'ghost'}
              aria-pressed={isSelected}
              onClick={() => onChange(presentation.type)}
              className="h-auto min-h-32 items-start justify-start whitespace-normal p-4 text-left"
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <span className="space-y-1.5">
                <span className="block text-sm font-black">{presentation.label}</span>
                <span className="block text-xs font-semibold leading-relaxed opacity-90">{presentation.description}</span>
              </span>
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}
