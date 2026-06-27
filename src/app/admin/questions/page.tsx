import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Question } from "@/types";

export default async function QuestionsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: questions } = await supabase
    .from("questions")
    .select("*, courses(code)")
    .eq("is_active", true)
    .order("week_number", { ascending: true });

  const qs = (questions || []) as (Question & { courses: { code: string } })[];
  const mcqCount   = qs.filter(q => q.question_type === "mcq").length;
  const shortCount = qs.filter(q => q.question_type === "short_answer").length;
  const weeks = Array.from(new Set(qs.map(q => q.week_number))).sort((a,b) => a - b);

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Question Pool</h1>
        <p style={{ color: "#64748B", fontSize: "14px" }}>Permanent cumulative pool — questions are never deleted. Every upload adds to the pool.</p>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#006400" }}>{qs.length}</span>
            <span style={{ color: "#64748B", fontSize: "14px", marginLeft: "6px" }}>total questions</span>
          </div>
          <div style={{ width: "1px", height: "32px", background: "#E2E8F0" }} />
          <span className="badge badge-blue">{mcqCount} MCQ</span>
          <span className="badge badge-purple">{shortCount} Short Answer</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {weeks.map(w => <span key={w} className="badge badge-gold">Week {w}</span>)}
        </div>
      </div>

      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        {qs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#64748B" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧩</div>
            <div style={{ fontSize: "14px" }}>No questions yet. Upload material and generate questions first.</div>
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {qs.map((q, i) => (
              <div key={q.id} style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", width: "24px" }}>{i + 1}.</span>
                  <span className={`badge ${q.question_type === "mcq" ? "badge-blue" : "badge-purple"}`} style={{ fontSize: "10px" }}>
                    {q.question_type === "mcq" ? "MCQ" : "Short Answer"}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, background: "#fdf6e3", color: "#92400e", border: "1px solid #fcd34d", padding: "1px 8px", borderRadius: "99px" }}>
                    Week {q.week_number}
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>{q.courses?.code}</span>
                </div>
                <div
                  style={{ fontSize: "13px", color: "#0A1628", paddingLeft: "32px", lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{
                    __html: q.question_text.replace(
                      "________",
                      `<span style="background:#e6f0e6;color:#006400;font-weight:700;padding:1px 8px;border-radius:4px;">${q.correct_answer}</span>`
                    )
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
