import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'bi.ebikienmo@yahoo.com',
    subject: 'Lakowe SPA Daily Alert',
    html: `
      <h2>Daily Site Alerts</h2>
      <p>24 procurement items approaching due date</p>
      <p>4 high risks need urgent mitigation</p>
      <p>9 pending approvals</p>
    `
  })

  res.status(200).json({ success: true })
}
