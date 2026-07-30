export type RbacMutation =
  | {
      kind: 'role'
      action: 'grant' | 'revoke'
      targetUserId: string
      roleCode: string
      reason: string
    }
  | {
      kind: 'permission'
      action: 'grant' | 'revoke'
      roleCode: string
      permissionCode: string
      reason: string
    }

export interface RbacMutationResult {
  changed: boolean
  action: 'grant' | 'revoke'
  roleCode?: string
  permissionCode?: string
  activationState?: 'pending' | 'active' | 'revoked'
}

const UNCONFIRMED_MUTATION_MESSAGE = 'Máy chủ không xác nhận thay đổi phân quyền.'
const GENERIC_MUTATION_ERROR = 'Không thể cập nhật phân quyền. Vui lòng thử lại.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function validateRbacMutationResult(
  payload: unknown,
  mutation: RbacMutation,
): RbacMutationResult {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new Error(UNCONFIRMED_MUTATION_MESSAGE)
  }

  const result = payload.data
  const validAction = result.action === mutation.action
  const validChanged = typeof result.changed === 'boolean'
  const validIdentifier =
    mutation.kind === 'role'
      ? result.roleCode === mutation.roleCode
      : result.permissionCode === mutation.permissionCode && result.roleCode === mutation.roleCode

  const validActivationState =
    mutation.kind === 'permission' ||
    (mutation.action === 'grant'
      ? result.activationState === 'pending' || result.activationState === 'active'
      : result.activationState === 'revoked')

  if (!validAction || !validChanged || !validIdentifier || !validActivationState) {
    throw new Error(UNCONFIRMED_MUTATION_MESSAGE)
  }

  return result as unknown as RbacMutationResult
}

async function readServerError(error: unknown): Promise<string | null> {
  if (!isRecord(error) || !(error.context instanceof Response)) return null

  try {
    const body = (await error.context.clone().json()) as unknown
    return isRecord(body) && typeof body.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

export async function getRbacMutationErrorMessage(error: unknown): Promise<string> {
  const serverError = await readServerError(error)

  switch (serverError) {
    case 'Unauthorized.':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 'Forbidden.':
      return 'Phiên quản trị chưa hợp lệ hoặc tài khoản chưa đủ quyền/MFA để thay đổi phân quyền.'
    case 'Invalid request.':
      return 'Yêu cầu phân quyền không hợp lệ. Vui lòng tải lại trang và thử lại.'
    case 'Unable to update access configuration.':
      return 'Không thể cập nhật cấu hình truy cập. Vui lòng thử lại.'
  }

  const message = error instanceof Error ? error.message : ''
  if (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch')
  ) {
    return 'Không thể kết nối tới Supabase Edge Function `manage-rbac`. Vui lòng kiểm tra kết nối và trạng thái deploy.'
  }

  if (message === UNCONFIRMED_MUTATION_MESSAGE) return message
  return GENERIC_MUTATION_ERROR
}
