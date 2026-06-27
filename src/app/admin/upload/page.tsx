"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Course, CourseMaterial } from "@/types";

export default function UploadPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(5);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCourses(); fetchMaterials(); }, []);

  async function fetchCourses() {
    const res = await fetch("/api/admin/courses");
    if (res.ok) setCourses(await res.json());
  }
  async function fetchMaterials() {
    const res = await fetch("/api/admin/materials");
    if (res.ok) setMaterials(await res.json());
  }

  async function createCourse() {
    if (!newCode || !newTitle) return toast.error("Fill in both fields");
    const res = await fetch("/api/admin/courses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, title: newTitle })
    });
    if (res.ok) {
      const c = await res.json();
      setCourses(p => [c, ...p]);
      setSelectedCourse(c.id);
      setShowNewCourse(false); setNewCode(""); setNewTitle("");
      toast.success(`Course ${c.code} created`);
    } else toast.error((await res.json()).error);
  }

  async function handleUpload() {
    if (!file || !selectedCourse || !title) return toast.error("Fill all fields and select a file");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("course_id", selectedCourse);
    fd.append("week_number", weekNumber.toString()); fd.append("title", title);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Material uploaded!");
      setFile(null); setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      fetchMaterials();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function generateQuestions(materialId: string) {
    setGenerating(materialId);
    try {
      const res = await fetch("/api/admin/generate-questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material_id: materialId, mcq_count: mcqCount, short_answer_count: shortCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.questions_generated} questions generated!`);
      fetchMaterials();
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(null); }
  }

  const visibleMaterials = materials.filter(m => !filterCourse || m.course_id === filterCourse);

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>Upload Course Material</h1>
        <p style={{ color: "#64748B", fontSize: "14px" }}>Upload files — AI extracts content and generates quiz questions from your material only.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Upload form */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "20px" }}>New Upload</div>

          <div style={{ marginBottom: "14px" }}>
            <label className="label">Course</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select className="input" style={{ flex: 1 }} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                <option value="">Select a course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
              <button className="btn btn-outline" style={{ padding: "0 12px" }} onClick={() => setShowNewCourse(!showNewCourse)} title="Add course">+</button>
            </div>
          </div>

          {showNewCourse && (
            <div style={{ background: "#e6f0e6", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#006400", marginBottom: "10px" }}>Add New Course</div>
              <input className="input" placeholder="Course code (e.g. EDU231)" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} style={{ marginBottom: "8px" }} />
              <input className="input" placeholder="Course title" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-primary btn-sm" onClick={createCourse}>Create</button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowNewCourse(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label className="label">Week Number</label>
              <input type="number" min={1} max={52} className="input" value={weekNumber} onChange={e => setWeekNumber(parseInt(e.target.value)||1)} />
            </div>
            <div>
              <label className="label">Material Title</label>
              <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Week 3: Morphology" />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? "#006400" : "#E2E8F0"}`,
              borderRadius: "12px", padding: "32px", textAlign: "center",
              cursor: "pointer", background: file ? "#e6f0e6" : "",
              transition: "all .2s", marginBottom: "14px"
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files?.[0]||null)} style={{ display: "none" }} />
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{file ? "📄" : "📁"}</div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: file ? "#006400" : "#0A1628" }}>
              {file ? file.name : "Click to upload file"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
              {file ? `${(file.size/1024).toFixed(0)} KB` : "PDF, DOCX, or TXT (max 10MB)"}
            </div>
          </div>

          {/* Generation settings */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>Question Generation Settings</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label className="label" style={{ fontSize: "12px" }}>MCQ Questions</label>
                <input type="number" min={1} max={20} className="input" value={mcqCount} onChange={e => setMcqCount(parseInt(e.target.value)||5)} />
              </div>
              <div>
                <label className="label" style={{ fontSize: "12px" }}>Short Answer</label>
                <input type="number" min={1} max={20} className="input" value={shortCount} onChange={e => setShortCount(parseInt(e.target.value)||5)} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading||!file||!selectedCourse||!title}>
            {uploading ? <><span className="spinner"/>Uploading...</> : <>📤 Upload Material</>}
          </button>
        </div>

        {/* Materials list */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>Uploaded Materials</div>
          </div>
          <select className="input" style={{ marginBottom: "14px" }} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>

          {visibleMaterials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📂</div>
              <div style={{ fontSize: "14px" }}>No materials uploaded yet</div>
            </div>
          ) : (
            <div style={{ maxHeight: "460px", overflowY: "auto", paddingRight: "4px" }}>
              {visibleMaterials.map(m => {
                const course = courses.find(c => c.id === m.course_id);
                const isGen = generating === m.id;
                return (
                  <div key={m.id} style={{ padding: "14px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>{course?.code} · Week {m.week_number} · {m.file_name}</div>
                      </div>
                      <span className={`badge badge-${m.processing_status === "done" ? "green" : m.processing_status === "error" ? "red" : "gold"}`}>
                        {m.processing_status}
                      </span>
                    </div>
                    <button
                      onClick={() => generateQuestions(m.id)}
                      disabled={isGen}
                      className="btn btn-primary btn-full btn-sm"
                    >
                      {isGen ? <><span className="spinner"/>Generating...</> : <>⚡ Generate {mcqCount} MCQ + {shortCount} Short Answer</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
