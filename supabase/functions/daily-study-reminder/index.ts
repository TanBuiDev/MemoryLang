import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch users with email reminders enabled
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, email_reminders_enabled, inactivity_paused, last_reminder_sent_at')
      .eq('email_reminders_enabled', true)
      .eq('inactivity_paused', false)
      .limit(100)

    if (profileErr) {
      console.error('[DAILY REMINDER] Error fetching profiles:', profileErr)
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'No eligible users found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sentCount = 0

    // 2. Loop through users and check due SRS terms
    for (const userProfile of profiles) {
      // Get user email from auth.users via admin API
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userProfile.id)
      if (!authUser?.user?.email) continue

      // Count due SRS terms
      const nowIso = new Date().toISOString()
      const { count: dueCount, error: countErr } = await supabaseAdmin
        .from('user_terms')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .is('deleted_at', null)
        .lte('next_review_at', nowIso)

      if (countErr || !dueCount || dueCount === 0) continue

      // Trigger send-email Edge Function internally or call Resend API
      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`
      const sendRes = await fetch(sendEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: authUser.user.email,
          subject: `⚡ [MemoryLang] Bạn có ${dueCount} từ vựng cần ôn tập hôm nay`,
          template: 'daily_reminder',
          data: {
            displayName: userProfile.display_name || authUser.user.email.split('@')[0],
            dueCount: dueCount,
            unsubscribeUrl: 'https://memorylang.app/app/settings',
          },
        }),
      })

      if (sendRes.ok) {
        sentCount++
        // Update last_reminder_sent_at
        await supabaseAdmin
          .from('profiles')
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq('id', userProfile.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eligibleUsers: profiles.length,
        emailsSent: sentCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('[DAILY REMINDER ERROR]', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
