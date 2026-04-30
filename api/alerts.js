import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .lt("due_date", new Date().toISOString())
      .neq("status", "Completed");

    const { data: approvals } = await supabase
      .from("approvals")
      .select("*")
      .eq("status", "Pending");

    const { data: procurement } = await supabase
      .from("procurement")
      .select("*")
      .lte("days_remaining", 14);

    const overdueCount = tasks?.length || 0;
    const approvalCount = approvals?.length || 0;
    const procurementCount = procurement?.length || 0;

    await resend.emails.send({
      from: "onboarding@resend.dev",
     to: [
    "ebikienmo.bi@gmail.com",
    "e.bio-ibogomo@mixtafrica.com"
  ],
      subject: "🚨 Lakowe Spa Live Daily Alert",
      html: `
        <h2>Live Daily Alert</h2>

        <ul>
          <li>${overdueCount} Overdue Tasks</li>
          <li>${approvalCount} Pending Approvals</li>
          <li>${procurementCount} Procurement Risks</li>
        </ul>

        <p>Generated automatically from SiteFlow database.</p>
      `
    });

    res.status(200).json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
