import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "ebikienmo.bi@gmail.com",
      subject: "🚨 Lakowe Spa Daily Alert",
      html: `
        <h2>Daily Project Alert</h2>
        <p><strong>Project:</strong> Lakowe Lakes Spa Centre</p>

        <ul>
          <li>7 Overdue Tasks</li>
          <li>3 Pending Approvals</li>
          <li>2 Procurement Risks</li>
          <li>1 Critical Snag</li>
        </ul>

        <p><strong>Handover Target:</strong> 18 Sept 2026</p>

        <p>Generated automatically by SiteFlow PM.</p>
      `
    });

    res.status(200).json({ sent: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
