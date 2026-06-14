import type { ListeningTopic, ListeningTest, ListeningPart, ListeningQuestion } from '@/types/listening.types'

export const demoTopic: ListeningTopic = {
  id: 'ets2026',
  title: 'ETS 2026',
  description: 'Bộ đề TOEIC Listening ETS 2026',
  order: 1,
}

export const demoTest: ListeningTest = {
  id: 'ets2026-test1',
  topicId: 'ets2026',
  title: 'Test 1',
  order: 1,
}

export const demoParts: ListeningPart[] = [
  {
    id: 'ets2026-test1-part1',
    testId: 'ets2026-test1',
    partNumber: 1,
    directions: 'For each question, you will hear four statements about a picture. Select the statement that best describes the picture.',
    audioSrc: '/audio/listening/part1-sample.mp3',
    imageUrl: 'https://placehold.co/600x400/1c293c/fbfbf9?text=Part+1+Sample',
  },
  {
    id: 'ets2026-test1-part2',
    testId: 'ets2026-test1',
    partNumber: 2,
    directions: 'You will hear a question and three responses. Choose the best response.',
    audioSrc: '/audio/listening/part2-sample.mp3',
    transcript: "Who is in charge of the marketing project?\nMr. Thompson has been leading it since January.\nThe deadline is next Friday.",
  },
  {
    id: 'ets2026-test1-part3',
    testId: 'ets2026-test1',
    partNumber: 3,
    directions: 'You will hear conversations between two or three people. Answer three questions about each conversation.',
    audioSrc: '/audio/listening/part3-sample.mp3',
    transcript: "W: Hello, I'd like to inquire about the conference room booking.\nM: Certainly. Which date are you looking at?\nW: March 15th, for the whole afternoon.\nM: Let me check... Yes, Room 302 is available. Would you like me to reserve it?\nW: Yes, please. And could you arrange for a projector as well?",
  },
  {
    id: 'ets2026-test1-part4',
    testId: 'ets2026-test1',
    partNumber: 4,
    directions: 'You will hear short talks. Answer three questions about each talk.',
    audioSrc: '/audio/listening/part4-sample.mp3',
    transcript: "Good morning everyone. This is your captain speaking. We are currently flying at 35,000 feet and expect to arrive in Tokyo at approximately 3:30 PM local time. The weather in Tokyo is partly cloudy with a temperature of 18 degrees Celsius. The cabin crew will be serving refreshments shortly. Thank you for flying with us.",
  },
]

export const demoQuestions: ListeningQuestion[] = [
  { id: 'p1q1', partId: 'ets2026-test1-part1', order: 1, questionText: 'Look at the picture.', options: ['The man is reading a book', 'The woman is typing on a laptop', 'They are having a meeting', 'The people are standing in line'], correctIndex: 2, explanation: 'The picture shows people sitting around a table having a meeting.' },
  { id: 'p1q2', partId: 'ets2026-test1-part1', order: 2, questionText: 'Look at the picture.', options: ['The car is parked on the street', 'The car is being repaired', 'The car is driving on the highway', 'The car is in the showroom'], correctIndex: 0 },
  { id: 'p2q1', partId: 'ets2026-test1-part2', order: 1, questionText: 'Who is in charge of the marketing project?', options: ['Last month', 'Mr. Thompson', 'In the conference room'], correctIndex: 1 },
  { id: 'p2q2', partId: 'ets2026-test1-part2', order: 2, questionText: 'When will the report be ready?', options: ['By Friday afternoon', 'Yes, I have it', 'At the front desk'], correctIndex: 0 },
  { id: 'p2q3', partId: 'ets2026-test1-part2', order: 3, questionText: "Where is the manager's office?", options: ['On the third floor', 'Her name is Sarah', "At 3 o'clock"], correctIndex: 0 },
  { id: 'p3q1', partId: 'ets2026-test1-part3', order: 1, questionText: 'What does the woman want to do?', options: ['Book a conference room', 'Cancel a reservation', 'Order lunch', 'Schedule a flight'], correctIndex: 0 },
  { id: 'p3q2', partId: 'ets2026-test1-part3', order: 2, questionText: 'Which date is she looking at?', options: ['March 5th', 'March 10th', 'March 15th', 'March 20th'], correctIndex: 2 },
  { id: 'p3q3', partId: 'ets2026-test1-part3', order: 3, questionText: 'What extra equipment does she request?', options: ['A microphone', 'A projector', 'A whiteboard', 'A television'], correctIndex: 1 },
  { id: 'p4q1', partId: 'ets2026-test1-part4', order: 1, questionText: 'What is the current altitude?', options: ['25,000 feet', '30,000 feet', '35,000 feet', '40,000 feet'], correctIndex: 2 },
  { id: 'p4q2', partId: 'ets2026-test1-part4', order: 2, questionText: 'What is the destination?', options: ['Seoul', 'Tokyo', 'Beijing', 'Bangkok'], correctIndex: 1 },
  { id: 'p4q3', partId: 'ets2026-test1-part4', order: 3, questionText: 'What is the temperature at the destination?', options: ['15 degrees', '18 degrees', '21 degrees', '25 degrees'], correctIndex: 1 },
]

export function getDemoPartById(partId: string): ListeningPart | undefined {
  return demoParts.find((p) => p.id === partId)
}

export function getDemoQuestionsByPartId(partId: string): ListeningQuestion[] {
  return demoQuestions.filter((q) => q.partId === partId)
}
