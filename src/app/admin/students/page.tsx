"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";

function StudentsContent() {
  const searchParams = useSearchParams();
  const [quizzes, setQuizzes]   = useState<any[]>([]);
  const [selected, setSelected] = useState(searchParams.get("quiz") || "");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => { fetch("/api/admin/quizzes").then(r=>r.json()).then(setQuizzes); }, []);
  useEffect(() => { if (selected) loadAnalytics(selected); }, [selected]);

  async function loadAnalytics(id: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/analytics/${id}`);
    if (res.ok) setAnalytics(await res.json());
    setLoading(false);
  }

  async function resetAttempt(id: string) {
    if (!confirm("Reset this attempt? The student can retake.")) return;
    const res = await fetch(`/api/admin/attempts/${id}/reset`, { method:"POST" });
    if (res.ok) { toast.success("Attempt reset"); loadAnalytics(selected); }
  }

  const submitted = analytics?.attempts?.filter((a:any) => a.status === "submitted") || [];

  return (
    <div>
      <div style={{ marginBottom:"28px" }}>
        <h1 style={{ fontSize:"22px", fontWeight:700, marginBottom:"4px" }}>Student Performance</h1>
        <p style={{ color:"#64748B", fontSize:"14px" }}>View scores, individual answers, and reset attempts</p>
      </div>

      <div className="card" style={{ padding:"16px 20px", marginBottom:"20px" }}>
        <label className="label">Select Quiz</label>
        <select className="input" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Choose a quiz to view results...</option>
          {quizzes.map((q:any) => <option key={q.id} value={q.id}>{q.courses?.code} — {q.title}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign:"center", padding:"60px" }}>
          <div className="spinner-green" style={{ margin:"0 auto" }} />
        </div>
      )}

      {analytics && !loading && (
        <>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"20px" }}>
            {[
              { label:"Total Attempts", value: analytics.stats.total_attempts },
              { label:"Average Score",  value: `${analytics.stats.avg_score?.toFixed(1)}%` },
              { label:"Highest Score",  value: `${analytics.stats.highest_score?.toFixed(1)}%` },
              { label:"Lowest Score",   value: `${analytics.stats.lowest_score?.toFixed(1)}%` },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:"18px", textAlign:"center" }}>
                <div style={{ fontSize:"24px", fontWeight:700 }}>{s.value}</div>
                <div style={{ fontSize:"12px", color:"#64748B", marginTop:"2px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          {submitted.length === 0 ? (
            <div className="card" style={{ padding:"60px", textAlign:"center", color:"#64748B" }}>
              <div style={{ fontSize:"36px", marginBottom:"12px" }}>👥</div>
              No submissions yet for this quiz
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                <thead>
                  <tr>
                    {["Student Name","Score","Correct","Time Taken","Submitted","Actions"].map(h=>(
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submitted.map((a:any) => (
                    <>
                      <tr key={a.id} style={{ cursor:"pointer" }} onClick={() => setExpanded(expanded===a.id?null:a.id)}>
                        <td className="table-td" style={{ fontWeight:600 }}>{a.student_name}</td>
                        <td className="table-td">
                          <span style={{ fontWeight:700, color:(a.score_percentage||0)>=70?"#006400":(a.score_percentage||0)>=50?"#ca8a04":"#dc2626" }}>
                            {a.score_percentage?.toFixed(0)}%
                          </span>
                          <div style={{ width:"72px", height:"4px", background:"#E2E8F0", borderRadius:"99px", marginTop:"4px" }}>
                            <div style={{ width:`${a.score_percentage||0}%`, height:"100%", background:(a.score_percentage||0)>=70?"#006400":(a.score_percentage||0)>=50?"#ca8a04":"#dc2626", borderRadius:"99px" }} />
                          </div>
                        </td>
                        <td className="table-td" style={{ color:"#64748B" }}>{a.correct_count}/{a.total_questions}</td>
                        <td className="table-td" style={{ color:"#64748B" }}>
                          {a.time_taken_seconds ? `${Math.floor(a.time_taken_seconds/60)}m ${a.time_taken_seconds%60}s` : "—"}
                        </td>
                        <td className="table-td" style={{ color:"#64748B" }}>
                          {a.submitted_at ? format(new Date(a.submitted_at),"MMM d, yyyy") : "—"}
                        </td>
                        <td className="table-td">
                          <div style={{ display:"flex", gap:"6px" }}>
                            <button className="btn btn-outline btn-sm" style={{ color:"#ea580c", borderColor:"#fed7aa" }} onClick={e=>{e.stopPropagation();resetAttempt(a.id);}}>Reset</button>
                            <button className="btn btn-outline btn-sm">{expanded===a.id?"▲":"▼"}</button>
                          </div>
                        </td>
                      </tr>
                      {expanded===a.id && (
                        <tr key={a.id+"-exp"}>
                          <td colSpan={6} style={{ padding:"0 16px 16px", background:"#F8FAFC" }}>
                            <div style={{ paddingTop:"12px" }}>
                              {(a.student_answers||[]).map((ans:any, i:number) => (
                                <div key={ans.id} style={{
                                  padding:"12px 14px", borderRadius:"10px", marginBottom:"8px",
                                  border:`1px solid ${ans.is_correct?"#bbf7d0":"#fecaca"}`,
                                  background: ans.is_correct?"#f0fdf4":"#fef2f2"
                                }}>
                                  <div style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                                    <span style={{ fontSize:"16px", flexShrink:0 }}>{ans.is_correct?"✅":"❌"}</span>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:"13px", fontWeight:600, marginBottom:"6px" }}>
                                        Q{i+1}: {ans.questions?.question_text}
                                      </div>
                                      <div style={{ fontSize:"12px" }}>
                                        <span style={{ color:"#64748B" }}>Answered: </span>
                                        <span style={{ color:ans.is_correct?"#166534":"#dc2626", fontWeight:600 }}>"{ans.student_answer}"</span>
                                      </div>
                                      {!ans.is_correct && <>
                                        <div style={{ fontSize:"12px", marginTop:"2px" }}>
                                          <span style={{ color:"#64748B" }}>Correct: </span>
                                          <span style={{ color:"#166534", fontWeight:600 }}>"{ans.questions?.correct_answer}"</span>
                                        </div>
                                        {ans.ai_feedback && (
                                          <div style={{ fontSize:"12px", marginTop:"8px", background:"#fef3c7", border:"1px solid #fde68a", borderLeft:"3px solid #C8A951", borderRadius:"6px", padding:"8px 10px", color:"#92400e" }}>
                                            📖 {ans.ai_feedback}
                                          </div>
                                        )}
                                      </>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StudentsPage() {
  return <Suspense fallback={<div style={{padding:"60px",textAlign:"center",color:"#64748B"}}>Loading...</div>}><StudentsContent /></Suspense>;
}
