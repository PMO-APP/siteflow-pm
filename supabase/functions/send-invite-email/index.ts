import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'PMOCorex Workspace <onboarding@pmocorex.com>'

// Replace with your Supabase Storage public URLs
const HERO_IMAGE = 'https://ykdnxkwpvdvjbzuejked.supabase.co/storage/v1/object/public/email-assets/pmocorex.jpeg'
const LOGO_IMAGE = '' // Optional. Leave empty if you do not have a logo yet.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function titleCase(value?: string) {
  if (!value) return ''
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function roleLabel(role?: string) {
  if (!role) return 'Team Member'

  const labels: Record<string, string> = {
    admin: 'Administrator',
    pmo: 'PMO',
    project_manager: 'Project Manager',
    portfolio_manager: 'Portfolio Manager',
    consultant: 'Consultant',
    contractor: 'Contractor',
    viewer: 'Viewer',
  }

  return labels[role] || titleCase(role.replace(/_/g, ' '))
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      email,
      fullName,
      role,
      inviteLink,
      invitedBy,
      organizationName,
    } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set.')
    }

    if (!email || !inviteLink) {
      throw new Error('Email and invite link are required.')
    }

    const safeName = titleCase(fullName) || 'there'
    const safeRole = roleLabel(role)
    const safeInvitedBy = invitedBy || 'A workspace administrator'
    const safeOrg = organizationName || 'your workspace'

    const logoBlock = LOGO_IMAGE
      ? `<img src="${LOGO_IMAGE}" alt="PMOCorex" width="180" style="display:block;border:0;" />`
      : `<div style="font-size:28px;font-weight:900;color:#ffffff;"><span style="color:#c49e48;">⬟</span> PMOCorex</div>`

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 0;">
    <tr>
      <td align="center">
        <table width="760" cellpadding="0" cellspacing="0" style="max-width:760px;width:100%;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 45px rgba(15,23,42,0.12);">
          
          <tr>
            <td>
              <img src="${HERO_IMAGE}" alt="PMOCorex" width="760" style="display:block;width:100%;max-width:760px;border:0;" />
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;padding:0 28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;margin-top:-34px;border-radius:18px;border:1px solid #e5e7eb;box-shadow:0 14px 35px rgba(15,23,42,0.16);">
                <tr>
                  <td style="padding:42px 42px 36px;">
                    <h2 style="margin:0 0 18px;font-size:25px;line-height:1.3;color:#111827;">
                      Welcome to PMOCorex, ${safeName}.
                    </h2>

                    <p style="font-size:16px;line-height:1.8;color:#374151;margin:0 0 18px;">
                      <strong>${safeInvitedBy}</strong> has invited you to join <strong>${safeOrg}</strong> on PMOCorex.
                    </p>

                    <div style="margin:20px 0 26px;">
                      <span style="display:inline-block;background:#fff7e6;color:#9a6a08;border:1px solid #f1d28a;padding:9px 16px;border-radius:999px;font-size:14px;font-weight:800;">
                        ${safeRole} Access
                      </span>
                    </div>

                    <p style="font-size:16px;line-height:1.8;color:#374151;margin:0 0 32px;">
                      PMOCorex helps delivery teams manage projects, portfolios, risks, approvals, documents, governance, and performance from one control system.
                    </p>

                    <div style="text-align:center;margin:38px 0 28px;">
                      <a href="${inviteLink}" style="background:#c49e48;color:#0c1014;text-decoration:none;padding:20px 46px;border-radius:12px;font-weight:900;display:inline-block;font-size:18px;box-shadow:0 10px 24px rgba(196,158,72,0.35);">
                        Accept Invitation →
                      </a>
                    </div>

                    <p style="text-align:center;color:#6b7280;font-size:13px;margin:0;">
                      This invitation link expires in 7 days for security reasons.
                    </p>

                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:34px 0;" />

                    <p style="text-align:center;color:#6b7280;font-size:14px;margin:0 0 12px;">
                      If the button does not work, copy and paste this secure link:
                    </p>

                    <div style="background:#f9fafb;padding:14px;border:1px solid #e5e7eb;border-radius:10px;word-break:break-all;text-align:center;">
                      <a href="${inviteLink}" style="color:#2563eb;font-size:14px;">${inviteLink}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 46px 38px;background:#ffffff;">
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                <h3 style="margin:0 0 10px;font-size:16px;color:#111827;">
                  Why am I receiving this email?
                </h3>

                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                  You were invited to PMOCorex by an authorized workspace administrator.
                  If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#08111d;padding:38px 42px;text-align:center;">
              <div style="margin-bottom:14px;">
                ${logoBlock}
              </div>

              <p style="color:#d1d5db;margin:14px 0 6px;font-size:14px;">
                Project Portfolio Management · Governance · Risk Management · Reporting
              </p>

              <p style="color:#9ca3af;margin:0 0 22px;font-size:13px;">
                Questions? Contact your PMO Administrator.
              </p>

              <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:18px;font-size:12px;color:#6b7280;">
                © 2026 PMOCorex. All rights reserved.<br />
                This is an automated email. Please do not reply to this message.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `You have been invited to join ${safeOrg} on PMOCorex`,
        html,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send invite email',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})