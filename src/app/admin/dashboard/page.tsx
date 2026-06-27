import { createAdminSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

interface RecentAttempt {
  id: string;
  student_name: string;
  score_percentage: number | null;
  correct_count: number | null;
  total_questions: number | null;
  quizzes: { title: string; courses: { code: string } } | null;
}

export default async function DashboardPage() {
  const supabase = createAdminSupabaseClient();
  const [
    { count: courseCount },
    { count: quizCount },
    { count: questionCount },
    { count: attemptCount }
  ] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("student_attempts").select("id", { count: "exact", head: true }).eq("status", "submitted")
  ]);

  const { data: recentAttempts } = await supabase
    .from("student_attempts")
    .select("id, student_name, score_percentage, correct_count, total_questions, quizzes(title, courses(code))")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Active Courses",     value: courseCount  || 0, icon: "📚", color: "#006400", bg: "#e6f0e6" },
    { label: "Published Quizzes",  value: quizCount    || 0, icon: "📝", color: "#1d4ed8", bg: "#dbeafe" },
    { label: "Questions in Pool",  value: questionCount|| 0, icon: "🧩", color: "#6d28d9", bg: "#ede9fe" },
    { label: "Completed Attempts", value: attemptCount || 0, icon: "👥", color: "#92400e", bg: "#fdf6e3" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Dashboard</h1>
        <p style={{ color: "#64748B", fontSize: "14px" }}>Overview of your NOUN Quiz System</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "28px" }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: "20px" }}>
            <div style={{ width: "40px", height: "40px", background: s.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "12px" }}>
              {s.icon}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: "13px", color: "#64748B", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Quick Actions */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px" }}>Quick Actions</div>
          {[
            { href: "/admin/upload",   icon: "📤", bg: "#006400", label: "Upload Course Material",  sub: "PDF, DOCX, or TXT",       hover: "#e6f0e6" },
            { href: "/admin/quizzes",  icon: "📝", bg: "#1d4ed8", label: "Create & Publish Quiz",   sub: "Generate public quiz link", hover: "#dbeafe" },
            { href: "/admin/students", icon: "👥", bg: "#C8A951", label: "View Student Results",     sub: "Scores and performance",    hover: "#fdf6e3" },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px", borderRadius: "10px", border: "1px solid #E2E8F0",
                marginBottom: "10px", cursor: "pointer", transition: "background .15s"
              }}
                onMouseEnter={e => (e.currentTarget.style.background = a.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <div style={{ width: "34px", height: "34px", background: a.bg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0A1628" }}>{a.label}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>{a.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Submissions */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px" }}>Recent Submissions</div>
          {(recentAttempts as RecentAttempt[] | null)?.length ? (
            <div>
              {(recentAttempts as RecentAttempt[]).map(a => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: "#F8FAFC", borderRadius: "8px",
                  border: "1px solid #E2E8F0", marginBottom: "8px"
                }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{a.student_name}</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{a.quizzes?.courses?.code} — {a.quizzes?.title}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: (a.score_percentage||0) >= 50 ? "#006400" : "#dc2626" }}>
                      {a.score_percentage?.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{a.correct_count}/{a.total_questions}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748B", fontSize: "14px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
              No submissions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
