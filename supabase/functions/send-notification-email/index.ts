import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL =
  Deno.env.get('NOTIFICATION_FROM_EMAIL') ||
  'PMOCorex <no-reply@yourdomain.com>'

serve(async req => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing.')
    }

    const {
      to,
      subject,
      type,
      projectName,
      submittedBy,
      submittedByEmail,
      message,
      reviewUrl,
    } = await req.json()

    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error('At least one recipient email is required.')
    }

    const safeSubject =
      subject || `PMOCorex Notification: ${type || 'Update'}`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject: safeSubject,
        html: `
          <div style="font-family:Arial,sans-serif;background:#0c1014;padding:32px;color:#ede8de;">
            <div style="max-width:640px;margin:auto;background:#111820;border:1px solid #2a3440;border-radius:18px;padding:28px;">
              <h1 style="color:#c49e48;margin-bottom:4px;">PMOCorex</h1>
              <p style="color:#8a98a8;margin-top:0;">Project Notification</p>

              <h2 style="color:#ffffff;">${type || 'New Update'}</h2>

              <div style="background:#0c1014;border:1px solid #2a3440;border-radius:14px;padding:18px;margin:20px 0;">
                <p><strong>Project:</strong> ${projectName || 'Project'}</p>
                <p><strong>From:</strong> ${submittedBy || 'PMOCorex User'}</p>
                <p><strong>Email:</strong> ${submittedByEmail || 'Not provided'}</p>
                <p><strong>Message:</strong><br/>${message || 'No message provided.'}</p>
              </div>

              ${
                reviewUrl
                  ? `<a href="${reviewUrl}" style="display:inline-block;background:#c49e48;color:#0c1014;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">
                      Open PMOCorex
                    </a>`
                  : ''
              }
            </div>
          </div>
        `,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.message || 'Unable to send email.')
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})