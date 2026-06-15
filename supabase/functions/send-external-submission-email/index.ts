import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async req => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const {
      type,
      projectName,
      submittedBy,
      submittedByEmail,
      subject,
      message,
      reviewUrl,
    } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing.')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PMOCorex <pmo@pmocorex.com>',
        to: ['pmo@yourdomain.com'],
        subject: `New External Submission: ${type}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#0c1014;padding:32px;color:#ede8de;">
            <div style="max-width:640px;margin:auto;background:#111820;border:1px solid #2a3440;border-radius:18px;padding:28px;">
              <h1 style="color:#c49e48;margin-bottom:4px;">PMOCorex</h1>
              <p style="color:#8a98a8;margin-top:0;">External Submission Notification</p>

              <h2 style="color:#ffffff;">${type} Submitted</h2>

              <div style="background:#0c1014;border:1px solid #2a3440;border-radius:14px;padding:18px;margin:20px 0;">
                <p><strong>Project:</strong> ${projectName || 'Project'}</p>
                <p><strong>Submitted By:</strong> ${submittedBy || 'External User'}</p>
                <p><strong>Email:</strong> ${submittedByEmail || 'Not provided'}</p>
                <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
                <p><strong>Message:</strong><br/>${message || 'No message provided'}</p>
              </div>

              <a href="${reviewUrl}" style="display:inline-block;background:#c49e48;color:#0c1014;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">
                Review Submission
              </a>
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
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})