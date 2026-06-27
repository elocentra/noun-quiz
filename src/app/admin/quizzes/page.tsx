"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Quiz, Course } from "@/types";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ course_id:"", slug:"", title:"", week_number:1, mcq_count:5, short_answer_count:5, time_limit_minutes:"" });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [qr, cr] = await Promise.all([fetch("/api/admin/quizzes"), fetch("/api/admin/courses")]);
    if (qr.ok) setQuizzes(await qr.json());
    if (cr.ok) setCourses(await cr.json());
  }

  function autoSlug(courseId: string, week: number) {
    const c = courses.find(x => x.id === courseId);
    return c ? `${c.code.toLowerCase()}-week${week}-quiz` : "";
  }

  async function createQuiz() {
    if (!form.course_id || !form.slug || !form.title) return toast.error("Fill all required fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Quiz created!");
      setShowForm(false);
      setForm({ course_id:"", slug:"", title:"", week_number:1, mcq_count:5, short_answer_count:5, time_limit_minutes:"" });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function togglePublish(quiz: any) {
    const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !quiz.is_published })
    });
    if (res.ok) { toast.success(quiz.is_published ? "Unpublished" : "Quiz published! 🎉"); fetchAll(); }
  }

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz and all student attempts?")) return;
    const res = await fetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetchAll(); }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${slug}`);
    toast.success("Link copied!");
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"28px" }}>
        <div>
          <h1 style={{ fontSize:"22px", fontWeight:700, marginBottom:"4px" }}>Quizzes</h1>
          <p style={{ color:"#64748B", fontSize:"14px" }}>Create, publish, and manage quiz sessions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ New Quiz</button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ padding:"24px", marginBottom:"20px", borderLeft:"4px solid #006400" }}>
          <div style={{ fontSize:"15px", fontWeight:600, marginBottom:"20px" }}>Create New Quiz</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label className="label">Course *</label>
              <select className="input" value={form.course_id} onChange={e => { const cid=e.target.value; setForm(f=>({...f,course_id:cid,slug:autoSlug(cid,f.week_number)})); }}>
                <option value="">Select course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Week Number *</label>
              <input type="number" min={1} className="input" value={form.week_number}
                onChange={e => { const w=parseInt(e.target.value)||1; setForm(f=>({...f,week_number:w,slug:autoSlug(f.course_id,w)})); }} />
            </div>
            <div>
              <label className="label">Quiz Title *</label>
              <input type="text" className="input" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="EDU231 Week 3 Active Recall" />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label className="label">Quiz Slug *</label>
              <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                <span style={{ color:"#64748B", fontSize:"13px", whiteSpace:"nowrap" }}>/quiz/</span>
                <input type="text" className="input" style={{ fontFamily:"monospace", fontSize:"13px" }} value={form.slug}
                  onChange={e => setForm(f=>({...f,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"")}))} placeholder="edu231-week3-quiz" />
              </div>
              {form.slug && <div style={{ fontSize:"11px", color:"#64748B", marginTop:"4px" }}>Students access at: /quiz/{form.slug}</div>}
            </div>
            <div>
              <label className="label">MCQ Questions</label>
              <input type="number" min={1} max={50} className="input" value={form.mcq_count} onChange={e => setForm(f=>({...f,mcq_count:parseInt(e.target.value)||5}))} />
            </div>
            <div>
              <label className="label">Short Answer Questions</label>
              <input type="number" min={1} max={50} className="input" value={form.short_answer_count} onChange={e => setForm(f=>({...f,short_answer_count:parseInt(e.target.value)||5}))} />
            </div>
            <div>
              <label className="label">Time Limit (minutes, optional)</label>
              <input type="number" min={5} className="input" value={form.time_limit_minutes} onChange={e => setForm(f=>({...f,time_limit_minutes:e.target.value}))} placeholder="No limit" />
            </div>
          </div>
          <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
            <button className="btn btn-primary" onClick={createQuiz} disabled={saving}>{saving ? "Creating..." : "Create Quiz"}</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="card" style={{ padding:"60px", textAlign:"center", color:"#64748B" }}>
          <div style={{ fontSize:"36px", marginBottom:"12px" }}>📝</div>
          <div>No quizzes yet. Create your first quiz above.</div>
        </div>
      ) : (
        <div>
          {quizzes.map((q: any) => (
            <div key={q.id} className="card" style={{ padding:"18px 20px", marginBottom:"10px", display:"flex", alignItems:"center", gap:"16px" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                  <span className={`badge ${q.is_published ? "badge-green" : "badge-gray"}`}>{q.is_published ? "Published" : "Draft"}</span>
                  <span style={{ fontSize:"12px", color:"#64748B" }}>{q.courses?.code}</span>
                </div>
                <div style={{ fontSize:"14px", fontWeight:600, marginBottom:"2px" }}>{q.title}</div>
                <div style={{ fontSize:"12px", color:"#64748B" }}>Week {q.week_number} · {q.mcq_count} MCQ + {q.short_answer_count} Short Answer{q.time_limit_minutes ? ` · ${q.time_limit_minutes} min` : ""}</div>
                {q.is_published && <div style={{ fontSize:"11px", color:"#006400", fontFamily:"monospace", marginTop:"4px" }}>/quiz/{q.slug}</div>}
              </div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", justifyContent:"flex-end" }}>
                {q.is_published && <>
                  <button className="btn btn-outline btn-sm" onClick={() => copyLink(q.slug)}>📋 Copy Link</button>
                  <a href={`/quiz/${q.slug}`} target="_blank" className="btn btn-outline btn-sm" style={{ textDecoration:"none" }}>👁 Preview</a>
                </>}
                <a href={`/admin/students?quiz=${q.id}`} className="btn btn-outline btn-sm" style={{ textDecoration:"none" }}>📊 Results</a>
                <button
                  onClick={() => togglePublish(q)}
                  className="btn btn-sm"
                  style={{ border:`1px solid ${q.is_published?"#fed7aa":"#bbf7d0"}`, background:"white", color:q.is_published?"#ea580c":"#006400" }}
                >
                  {q.is_published ? "Unpublish" : "✓ Publish"}
                </button>
                <button className="btn btn-sm" style={{ background:"none", border:"1px solid #fecaca", color:"#dc2626" }} onClick={() => deleteQuiz(q.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
