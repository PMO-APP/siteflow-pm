import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async req => {
  try {
    const {
      to,
      assigneeName,
      taskTitle,
      taskDescription,
      projectName,
      dueDate,
      priority,
      taskUrl,
      assignedBy,
    } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing')
    }

    if (!to || !taskTitle || !taskUrl) {
      throw new Error('Missing required task email fields')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PMOCorex <no-reply@pmocorex.com>',
        to,
        subject: `New PMOCorex Task: ${taskTitle}`,
        html: `
          <div style="font-family:Arial,sans-serif;background:#0c1014;padding:32px;color:#ede8de;">
            <div style="max-width:640px;margin:auto;background:#111820;border:1px solid #2a3440;border-radius:18px;padding:28px;">
              <h1 style="color:#c49e48;margin-bottom:4px;">PMOCorex</h1>
              <p style="color:#8a98a8;margin-top:0;">Portfolio Control System</p>

              <h2 style="color:#ffffff;">New Task Assigned</h2>

              <p>Hello ${assigneeName || 'Team Member'},</p>
              <p>You have been assigned a new task on PMOCorex.</p>

              <div style="background:#0c1014;border:1px solid #2a3440;border-radius:14px;padding:18px;margin:20px 0;">
                <p><strong>Project:</strong> ${projectName || 'Project'}</p>
                <p><strong>Task:</strong> ${taskTitle}</p>
                <p><strong>Priority:</strong> ${priority || 'Medium'}</p>
                <p><strong>Due Date:</strong> ${dueDate || 'Not set'}</p>
                <p><strong>Assigned By:</strong> ${assignedBy || 'PMOCorex Team'}</p>
                ${
                  taskDescription
                    ? `<p><strong>Description:</strong><br/>${taskDescription}</p>`
                    : ''
                }
              </div>

              <a href="${taskUrl}" style="display:inline-block;background:#c49e48;color:#0c1014;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">
                Open Task
              </a>

              <p style="color:#8a98a8;font-size:12px;margin-top:28px;">
                This is an automated PMOCorex task notification.
              </p>
            </div>
          </div>
        `,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.message || 'Unable to send email')
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