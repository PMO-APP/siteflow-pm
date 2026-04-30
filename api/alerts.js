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
     to:  "ebikienmo.bi@gmail.com",
      subject: "🚨 Lakowe Spa Live Daily Alert",
      html: `
<h1 style="color:#0a2540;">🏗 Lakowe Spa Executive Daily Report</h1>

<p><strong>Project Health:</strong> 🟢 Good</p>
<p><strong>Completion:</strong> 74%</p>
<p><strong>Handover Countdown:</strong> 141 Days</p>

<hr>

<ul>
<li>🔴 ${overdueCount} Overdue Tasks</li>
<li>🟠 ${approvalCount} Pending Approvals</li>
<li>🟡 ${procurementCount} Procurement Risks</li>
<li>🟣 3 Critical Snags</li>
</ul>

<hr>

<p><strong>Today's Focus:</strong> Roofing Completion + Internal MEP Works</p>

<p style="font-size:12px;color:gray;">
Generated automatically by SiteFlow PM Executive Engine
</p>
`,
    });

    res.status(200).json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
