import type { AnswerRecord, MissionDefinition, MissionStageType, QuestionDefinition } from './mission.types'

export interface MissionReviewItem {
  stageType: MissionStageType
  question: QuestionDefinition
  answer: AnswerRecord
}

export function buildMissionReviewItems(definition: MissionDefinition, answers: AnswerRecord[]): MissionReviewItem[] {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))
  return definition.stages.flatMap((stage) => stage.questions.flatMap((question) => {
    const answer = byQuestion.get(question.id)
    return answer ? [{ stageType: stage.type, question, answer }] : []
  }))
}
