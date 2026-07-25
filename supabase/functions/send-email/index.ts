import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  to: string
  subject: string
  template: 'transactional_welcome' | 'transactional_payment_success' | 'daily_reminder' | 'weekly_digest'
  data: {
    displayName?: string
    dueCount?: number
    rememberedCount?: number
    planName?: string
    unsubscribeUrl?: string
    [key: string]: any
  }
}

function renderHtmlTemplate(template: SendEmailRequest['template'], data: SendEmailRequest['data']): string {
  const displayName = data.displayName || 'Learner'
  const unsubscribeUrl = data.unsubscribeUrl || 'https://memorylang.app/app/settings'

  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #fbfbf9;
    color: #1c293c;
    padding: 24px;
    margin: 0;
  `
  const cardStyle = `
    max-width: 560px;
    margin: 0 auto;
    background: #ffffff;
    border: 3px solid #1c293c;
    box-shadow: 4px 4px 0px #1c293c;
    border-radius: 8px;
    padding: 32px;
  `
  const buttonStyle = `
    display: inline-block;
    background-color: #fdc800;
    color: #1c293c;
    font-weight: 800;
    font-size: 16px;
    text-decoration: none;
    padding: 14px 28px;
    border: 2px solid #1c293c;
    box-shadow: 3px 3px 0px #1c293c;
    border-radius: 6px;
    margin-top: 20px;
  `
  const footerStyle = `
    margin-top: 32px;
    padding-top: 16px;
    border-top: 2px dashed #e2e8f0;
    font-size: 12px;
    color: #64748b;
    text-align: center;
  `

  let bodyContent = ''

  switch (template) {
    case 'daily_reminder': {
      const dueCount = data.dueCount || 10
      bodyContent = `
        <h1 style="font-size: 24px; font-weight: 900; margin-top: 0; color: #1c293c;">
          ⚡ Chào ${displayName}, đến giờ học từ vựng rồi!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #334155;">
          Hôm nay bạn đang có <strong style="background-color: #fef08a; padding: 2px 6px; border: 1px solid #1c293c; border-radius: 4px;">${dueCount} từ vựng</strong> cần ôn tập theo thuật toán lặp lại ngắt quãng SM-2.
        </p>
        <p style="font-size: 15px; color: #475569;">
          Chỉ mất khoảng 3-5 phút để duy trì chuỗi ghi nhớ dài hạn. Đừng bỏ lỡ bài học hôm nay nhé!
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://memorylang.app/app/study" style="${buttonStyle}">🔥 Mở App & Ôn Tập Ngay</a>
        </div>
      `
      break
    }
    case 'weekly_digest': {
      const rememberedCount = data.rememberedCount || 0
      bodyContent = `
        <h1 style="font-size: 24px; font-weight: 900; margin-top: 0; color: #1c293c;">
          🎉 Báo cáo học tập tuần qua của ${displayName}!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #334155;">
          Chúc mừng! Trong tuần qua bạn đã ghi nhớ thêm <strong>${rememberedCount} từ vựng</strong> thành công.
        </p>
        <div style="background-color: #f1f5f9; border: 2px solid #1c293c; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-weight: 700; font-size: 14px; color: #1c293c;">💡 Mẹo nhỏ:</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">Duy trì học đều đặn mỗi ngày giúp bạn ghi nhớ từ lâu hơn 300% so với học nhồi nhét một lần.</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://memorylang.app/app/dashboard" style="${buttonStyle}">📊 Xem Chi Tiết Tiến Độ</a>
        </div>
      `
      break
    }
    case 'transactional_payment_success': {
      const planName = data.planName || 'MemoryLang Pro'
      bodyContent = `
        <h1 style="font-size: 24px; font-weight: 900; margin-top: 0; color: #1c293c;">
          ✅ Kích hoạt thành công gói ${planName}!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #334155;">
          Cảm ơn ${displayName} đã nâng cấp tài khoản! Tất cả tính năng Pro như AI Tutor, luyện nghe không giới hạn và kho từ vựng mở rộng đã sẵn sàng sử dụng.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://memorylang.app/app/dashboard" style="${buttonStyle}">🚀 Trải Nghiệm Pro Ngay</a>
        </div>
      `
      break
    }
    case 'transactional_welcome':
    default: {
      bodyContent = `
        <h1 style="font-size: 24px; font-weight: 900; margin-top: 0; color: #1c293c;">
          👋 Chào mừng ${displayName} đến với MemoryLang!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #334155;">
          Rất vui vì bạn đã chọn MemoryLang làm người bạn đồng hành ghi nhớ từ vựng hiệu quả.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://memorylang.app/app/dashboard" style="${buttonStyle}">✨ Khám Phá MemoryLang</a>
        </div>
      `
      break
    }
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.subject || 'MemoryLang Notification'}</title>
      </head>
      <body style="${baseStyle}">
        <div style="${cardStyle}">
          <div style="margin-bottom: 24px; text-align: left;">
            <span style="font-weight: 900; font-size: 20px; background-color: #fdc800; color: #1c293c; padding: 4px 12px; border: 2px solid #1c293c; box-shadow: 2px 2px 0px #1c293c;">
              MEMORYLANG
            </span>
          </div>
          ${bodyContent}
          <div style="${footerStyle}">
            <p style="margin: 0 0 8px 0;">Bạn nhận được email này vì đã đăng ký tài khoản tại MemoryLang.</p>
            <p style="margin: 0;">
              <a href="${unsubscribeUrl}" style="color: #475569; text-decoration: underline;">Quản lý tùy chọn nhận email</a> | 
              <a href="${unsubscribeUrl}" style="color: #475569; text-decoration: underline;">Hủy đăng ký (Unsubscribe)</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const senderEmail = Deno.env.get('RESEND_SENDER_EMAIL') || 'MemoryLang <notifications@memorylang.app>'

    const payload: SendEmailRequest = await req.json()

    if (!payload.to || !payload.template) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: to and template' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const htmlContent = renderHtmlTemplate(payload.template, payload.data)
    const unsubscribeUrl = payload.data?.unsubscribeUrl || 'https://memorylang.app/app/settings'

    // Mock response if RESEND_API_KEY is not set yet
    if (!resendApiKey) {
      console.log(`[MOCK EMAIL SEND] To: ${payload.to}, Subject: ${payload.subject}, Template: ${payload.template}`)
      return new Response(
        JSON.stringify({
          success: true,
          mock: true,
          message: 'RESEND_API_KEY is missing. Logged email payload to console.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [payload.to],
        subject: payload.subject,
        html: htmlContent,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    const resData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('[RESEND API ERROR]', resData)
      return new Response(JSON.stringify({ error: resData }), {
        status: resendRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[SEND-EMAIL ERROR]', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
