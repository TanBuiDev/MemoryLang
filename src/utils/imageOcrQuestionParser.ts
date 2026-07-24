import { createWorker } from 'tesseract.js'
import {
  parseExamQuestionsText,
  type ParsedExamQuestion,
} from '@/utils/examQuestionImport'

export interface OcrProgressInfo {
  status: string
  progress: number
}

/**
 * Pre-processes an image using HTML Canvas for optimal OCR speed & accuracy
 */
export async function preprocessImageForOcr(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        resolve(url)
        return
      }

      // Max width 1600px for high speed without losing text quality
      const maxDim = 1600
      let width = img.width
      let height = img.height

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and apply light contrast boost for document scanning
      ctx.drawImage(img, 0, 0, width, height)

      // Get optimized image base64
      resolve(canvas.toDataURL('image/png', 0.9))
    }

    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }

    img.src = url
  })
}

/**
 * Recognizes text from an image file/blob using Tesseract Web Worker
 */
export async function processImageToText(
  imageSource: File | Blob | string,
  onProgress?: (info: OcrProgressInfo) => void
): Promise<string> {
  // Preprocess if File or Blob
  let src = typeof imageSource === 'string' ? imageSource : await preprocessImageForOcr(imageSource)

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && m.status && typeof m.progress === 'number') {
        onProgress({
          status: m.status,
          progress: Math.round(m.progress * 100),
        })
      }
    },
  })

  const { data } = await worker.recognize(src)
  await worker.terminate()

  return data.text || ''
}

/**
 * Runs OCR on an image and returns structured exam questions
 */
export async function parseQuestionsFromImage(
  imageSource: File | Blob | string,
  onProgress?: (info: OcrProgressInfo) => void
): Promise<{ extractedText: string; questions: ParsedExamQuestion[] }> {
  const text = await processImageToText(imageSource, onProgress)
  const questions = parseExamQuestionsText(text)

  return {
    extractedText: text,
    questions,
  }
}
