import { supabase } from '@/services/supabase/client'
import type { Exam, ExamCategory, ExamDetail, ExamPassageSet, ExamQuestion } from '@/types/exam.types'

export const adminExamService = {
  // 1. List all exams for Admin
  async listExams(category?: ExamCategory): Promise<Exam[]> {
    let query = supabase
      .from('exams')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to list exams:', error)
      throw error
    }
    return (data as Exam[]) || []
  },

  // 2. Get full detail of an exam with all passage sets and questions
  async getExamDetail(id: string): Promise<ExamDetail | null> {
    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (examErr || !exam) {
      console.error('Failed to get exam detail:', examErr)
      return null
    }

    // Fetch passage sets
    const { data: sets, error: setsErr } = await supabase
      .from('exam_passage_sets')
      .select('*')
      .eq('exam_id', id)
      .order('order_index', { ascending: true })

    if (setsErr) {
      console.error('Failed to get passage sets:', setsErr)
      throw setsErr
    }

    const passageSetIds = (sets || []).map((s) => s.id)
    let questionsMap: Record<string, ExamQuestion[]> = {}

    if (passageSetIds.length > 0) {
      const { data: questions, error: qErr } = await supabase
        .from('exam_questions')
        .select('*')
        .in('passage_set_id', passageSetIds)
        .order('question_number', { ascending: true })

      if (qErr) {
        console.error('Failed to get exam questions:', qErr)
        throw qErr
      }

      (questions || []).forEach((q: any) => {
        if (!questionsMap[q.passage_set_id]) {
          questionsMap[q.passage_set_id] = []
        }
        questionsMap[q.passage_set_id].push(q as ExamQuestion)
      })
    }

    const passage_sets: ExamPassageSet[] = (sets || []).map((s: any) => ({
      ...s,
      passages: Array.isArray(s.passages) ? s.passages : [],
      questions: questionsMap[s.id] || [],
    }))

    return {
      ...(exam as Exam),
      passage_sets,
    }
  },

  // 3. Create a new Exam
  async createExam(input: Partial<Exam>): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .insert({
        title: input.title,
        category: input.category || 'TOEIC',
        description: input.description || null,
        time_limit_minutes: input.time_limit_minutes || 75,
        total_questions: input.total_questions || 100,
        is_published: input.is_published ?? false,
        access_tier: input.access_tier || 'free',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create exam:', error)
      throw error
    }
    return data as Exam
  },

  // 4. Update an Exam
  async updateExam(id: string, input: Partial<Exam>): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .update({
        title: input.title,
        category: input.category,
        description: input.description,
        time_limit_minutes: input.time_limit_minutes,
        total_questions: input.total_questions,
        is_published: input.is_published,
        access_tier: input.access_tier,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update exam:', error)
      throw error
    }
    return data as Exam
  },

  // 5. Delete an Exam (Soft delete)
  async deleteExam(id: string): Promise<void> {
    const { error } = await supabase
      .from('exams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete exam:', error)
      throw error
    }
  },

  // 6. Save (Create or Update) a Passage Set with questions
  async savePassageSet(
    examId: string,
    setId: string | null,
    setData: Partial<ExamPassageSet>,
    questionsData: Partial<ExamQuestion>[]
  ): Promise<ExamPassageSet> {
    let savedSetId = setId

    if (!savedSetId) {
      const { data, error } = await supabase
        .from('exam_passage_sets')
        .insert({
          exam_id: examId,
          part_number: setData.part_number || 5,
          passage_type: setData.passage_type || 'single',
          title: setData.title || null,
          instruction_text: setData.instruction_text || null,
          passages: setData.passages || [],
          order_index: setData.order_index || 0,
        })
        .select()
        .single()

      if (error) throw error
      savedSetId = data.id
    } else {
      const { error } = await supabase
        .from('exam_passage_sets')
        .update({
          part_number: setData.part_number,
          passage_type: setData.passage_type,
          title: setData.title,
          instruction_text: setData.instruction_text,
          passages: setData.passages,
          order_index: setData.order_index,
        })
        .eq('id', savedSetId)

      if (error) throw error
    }

    // Replace questions in set
    if (savedSetId) {
      await supabase.from('exam_questions').delete().eq('passage_set_id', savedSetId)

      if (questionsData.length > 0) {
        const rowsToInsert = questionsData.map((q, idx) => ({
          passage_set_id: savedSetId,
          question_number: q.question_number || idx + 101,
          question_text: q.question_text || '',
          question_type: q.question_type || 'multiple_choice',
          options: q.options || [],
          points: q.points || 1,
          explanation_html: q.explanation_html || null,
          order_index: idx,
        }))

        const { error: qInsertErr } = await supabase.from('exam_questions').insert(rowsToInsert)
        if (qInsertErr) throw qInsertErr
      }
    }

    const { data: updatedSet, error: fetchErr } = await supabase
      .from('exam_passage_sets')
      .select('*')
      .eq('id', savedSetId)
      .single()

    if (fetchErr) throw fetchErr

    return updatedSet as ExamPassageSet
  },

  // 7. Delete a Passage Set
  async deletePassageSet(setId: string): Promise<void> {
    const { error } = await supabase.from('exam_passage_sets').delete().eq('id', setId)
    if (error) throw error
  },
}
