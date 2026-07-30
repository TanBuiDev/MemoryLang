import { describe, expect, it } from 'vitest'
import {
  getRbacMutationErrorMessage,
  validateRbacMutationResult,
} from './rbacMutationFeedback'

const targetUserId = '69cb6e9b-4a4d-4bab-ba57-1d67c6eebd0f'

describe('validateRbacMutationResult', () => {
  it('accepts a confirmed pending role grant', () => {
    expect(() =>
      validateRbacMutationResult(
        {
          data: {
            changed: true,
            action: 'grant',
            roleCode: 'exam_admin',
            activationState: 'pending',
          },
        },
        {
          kind: 'role',
          action: 'grant',
          targetUserId,
          roleCode: 'exam_admin',
          reason: 'confirmed',
        },
      ),
    ).not.toThrow()
  })

  it('rejects a response that does not confirm the requested mutation', () => {
    expect(() =>
      validateRbacMutationResult(
        { data: {} },
        {
          kind: 'role',
          action: 'grant',
          targetUserId,
          roleCode: 'exam_admin',
          reason: 'confirmed',
        },
      ),
    ).toThrow('Máy chủ không xác nhận thay đổi phân quyền.')
  })
})

describe('getRbacMutationErrorMessage', () => {
  it('maps a forbidden Edge Function response without exposing arbitrary server text', async () => {
    const error = {
      context: new Response(
        JSON.stringify({
          error: 'Forbidden.',
          details: 'internal-policy-name-must-not-be-exposed',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    }

    const message = await getRbacMutationErrorMessage(error)

    expect(message).toMatch(/phiên quản trị|quyền|MFA/i)
    expect(message).not.toContain('internal-policy-name-must-not-be-exposed')
  })

  it('uses a generic message for an unknown server error', async () => {
    const error = {
      context: new Response(JSON.stringify({ error: 'database_secret_error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    }

    expect(await getRbacMutationErrorMessage(error)).toBe(
      'Không thể cập nhật phân quyền. Vui lòng thử lại.',
    )
  })
})
