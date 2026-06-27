"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateDeviceFingerprint } from "@/lib/device-fingerprint";

interface Question {
  id: string;
  question_type: "mcq" | "short_answer";
  question_text: string;
  options?: string[];
}

interface QuizMeta {
  id: string; slug: string; title: string;
  course: { code: string; title: string };
  week_number: number; time_limit_minutes?: number; total_questions: number;
}

interface AnswerResult {
  question_id: string; question_text: string; question_type: string;
  student_answer: string; correct_answer: string; options?: string[];
  is_correct: boolean; ai_feedback?: string; explanation: string;
}

type State = "landing"|"quiz"|"submitting"|"results"|"error"|"done";

export default function QuizPage({ params }: { params: { slug: string } }) {
  const [state, setState]           = useState<State>("landing");
  const [quiz, setQuiz]             = useState<QuizMeta|null>(null);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [name, setName]             = useState("");
  const [attemptId, setAttemptId]   = useState<string|null>(null);
  const [answers, setAnswers]       = useState<Record<string, {text:string; optIdx?:number}>>({});
  const [currentQ, setCurrentQ]     = useState(0);
  const [results, setResults]       = useState<{score:any; results:AnswerResult[]}|null>(null);
  const [error, setError]           = useState("");
  const [timeLeft, setTimeLeft]     = useState<number|null>(null);
  const [loading, setLoading]       = useState(true);
  const startTime = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    fetch(`/api/quiz/${params.slug}`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); setState("error"); } else { setQuiz(d.quiz); setQuestions(d.questions); setQuestionIds(d.question_ids); } })
      .catch(() => { setError("Could not load quiz."); setState("error"); })
      .finally(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    if (state === "quiz" && quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft(p => { if (!p || p <= 1) { clearInterval(timerRef.current); submitQuiz(true); return 0; } return p-1; });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [state]);

  async function startQuiz() {
    if (!name.trim()) return;
    const fp = generateDeviceFingerprint();
    const res = await fetch(`/api/quiz/${params.slug}/start`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ student_name:name.trim(), device_fingerprint:fp, question_ids:questionIds })
    });
    const data = await res.json();
    if (res.status === 409 && data.already_submitted) { setState("done"); return; }
    if (!res.ok) { setError(data.error); setState("error"); return; }
    setAttemptId(data.attempt_id);
    setState("quiz");
  }

  const submitQuiz = useCallback(async (auto=false) => {
    if (!attemptId || !quiz) return;
    setState("submitting");
    const subs = questions
      .map(q => ({ question_id:q.id, student_answer:answers[q.id]?.text||"", selected_option_index:answers[q.id]?.optIdx }))
      .filter(a => a.student_answer);
    if (!subs.length && !auto) { setState("quiz"); return; }
    const timeTaken = Math.floor((Date.now()-startTime.current)/1000);
    try {
      const res = await fetch(`/api/quiz/${params.slug}/submit`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ attempt_id:attemptId, answers:subs, time_taken_seconds:timeTaken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
      setState("results");
    } catch(e:any) { setError(e.message); setState("error"); }
  }, [attemptId, quiz, questions, answers, params.slug]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A1628,#1E293B,#003300)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div className="spinner" style={{ margin:"0 auto 12px" }}/>
        <div style={{ color:"rgba(255,255,255,.5)", fontSize:"13px" }}>Loading quiz...</div>
      </div>
    </div>
  );

  if (state==="error") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A1628,#1E293B,#003300)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ textAlign:"center", color:"white" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>⚠️</div>
        <div style={{ fontSize:"20px", fontWeight:700, marginBottom:"8px" }}>Quiz Unavailable</div>
        <div style={{ color:"rgba(255,255,255,.5)", fontSize:"14px" }}>{error}</div>
      </div>
    </div>
  );

  if (state==="done") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A1628,#1E293B,#003300)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ textAlign:"center", color:"white" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>✅</div>
        <div style={{ fontSize:"20px", fontWeight:700, marginBottom:"8px" }}>Already Submitted</div>
        <div style={{ color:"rgba(255,255,255,.5)", fontSize:"14px" }}>You have already completed this quiz from this device.<br/>Contact your instructor to reset your attempt.</div>
      </div>
    </div>
  );

  /* ── LANDING ── */
  if (state==="landing" && quiz) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A1628 0%,#1E293B 50%,#003300 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ width:"100%", maxWidth:"420px" }}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ width:"56px", height:"56px", background:"#C8A951", borderRadius:"16px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", margin:"0 auto 14px" }}>🎓</div>
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#4ade80", marginBottom:"8px" }}>{quiz.course.code} — Active Recall Quiz</div>
          <div style={{ color:"white", fontSize:"20px", fontWeight:700 }}>{quiz.title}</div>
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:"13px", marginTop:"4px" }}>{quiz.course.title}</div>
        </div>
        <div style={{ background:"white", borderRadius:"20px", padding:"32px", boxShadow:"0 24px 64px rgba(0,0,0,.3)" }}>
          <div style={{ background:"#F8FAFC", borderRadius:"10px", padding:"14px 16px", marginBottom:"24px" }}>
            {[
              { dot:"#006400", text:`${quiz.total_questions} questions (MCQ + short answer)` },
              { dot:"#C8A951", text:"Questions randomly shuffled every session" },
              { dot:"#dc2626", text:"One attempt per device — submit carefully" },
              { dot:"#3b82f6", text:"AI grades answers from course material only" },
            ].map((item,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"4px 0", fontSize:"13px", color:"#64748B" }}>
                <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:item.dot, flexShrink:0 }}/>
                {item.text}
              </div>
            ))}
          </div>
          <div style={{ marginBottom:"20px" }}>
            <label className="label">Your Full Name *</label>
            <input type="text" className="input" style={{ fontSize:"15px", padding:"12px" }}
              value={name} onChange={e=>setName(e.target.value)}
              placeholder="Enter your full name"
              onKeyDown={e=>e.key==="Enter"&&name.trim()&&startQuiz()}
              autoFocus />
          </div>
          <button className="btn btn-primary btn-full" onClick={startQuiz} disabled={!name.trim()} style={{ padding:"13px", fontSize:"15px" }}>
            Begin Quiz →
          </button>
        </div>
        <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:"12px", marginTop:"20px" }}>National Open University of Nigeria</div>
      </div>
    </div>
  );

  /* ── ACTIVE QUIZ ── */
  if ((state==="quiz"||state==="submitting") && quiz) {
    const q = questions[currentQ];
    const answered = Object.keys(answers).length;
    const progress = (answered/questions.length)*100;
    const mins = timeLeft!==null ? Math.floor(timeLeft/60) : null;
    const secs = timeLeft!==null ? timeLeft%60 : null;

    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A1628,#003300)" }}>
        {/* Header */}
        <div style={{ background:"rgba(10,22,40,.92)", backdropFilter:"blur(8px)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:20, borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div>
            <div style={{ color:"white", fontWeight:600, fontSize:"14px" }}>{quiz.course.code} — Active Recall</div>
            <div style={{ color:"#4ade80", fontSize:"12px" }}>{answered}/{questions.length} answered</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            {timeLeft!==null && (
              <div style={{ fontFamily:"monospace", fontSize:"15px", fontWeight:700, color: timeLeft<60?"#f87171":"#C8A951" }}>
                {mins}:{String(secs).padStart(2,"0")}
              </div>
            )}
            <button className="btn btn-gold btn-sm" onClick={()=>submitQuiz()} disabled={state==="submitting"}>
              {state==="submitting" ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </div>
        {/* Progress */}
        <div style={{ height:"3px", background:"rgba(255,255,255,.1)" }}>
          <div style={{ width:`${progress}%`, height:"100%", background:"#C8A951", transition:"width .3s" }}/>
        </div>

        <div style={{ maxWidth:"680px", margin:"0 auto", padding:"32px 24px" }}>
          {/* Q Navigator */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"24px" }}>
            {questions.map((qq,i)=>(
              <button key={qq.id} onClick={()=>setCurrentQ(i)}
                style={{
                  width:"32px", height:"32px", borderRadius:"6px", border:"none", cursor:"pointer",
                  fontSize:"12px", fontWeight:600, transition:"all .15s",
                  background: i===currentQ?"#C8A951":answers[qq.id]?"#006400":"rgba(255,255,255,.12)",
                  color: i===currentQ?"#0A1628":answers[qq.id]?"white":"rgba(255,255,255,.7)"
                }}>{i+1}</button>
            ))}
          </div>

          {/* Question card */}
          <div style={{ background:"white", borderRadius:"16px", padding:"32px", boxShadow:"0 8px 32px rgba(0,0,0,.12)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
              <span style={{ fontSize:"11px", fontWeight:700, padding:"3px 10px", borderRadius:"99px", background:q.question_type==="mcq"?"#dbeafe":"#ede9fe", color:q.question_type==="mcq"?"#1e40af":"#5b21b6" }}>
                {q.question_type==="mcq"?"Multiple Choice":"Short Answer"}
              </span>
              <span style={{ fontSize:"12px", color:"#64748B" }}>Question {currentQ+1} of {questions.length}</span>
            </div>

            {/* Question text with blank */}
            <div style={{ fontSize:"18px", fontWeight:600, color:"#0A1628", lineHeight:1.55, marginBottom:"24px" }}>
              {q.question_text.split("________").map((part,i,arr)=>(
                <span key={i}>
                  {part}
                  {i<arr.length-1 && (
                    <span style={{ display:"inline-block", background:"rgba(0,100,0,.08)", borderBottom:"2.5px solid #006400", color:answers[q.id]?"#006400":"rgba(0,100,0,.3)", fontWeight:700, padding:"0 12px", minWidth:"90px", textAlign:"center", borderRadius:"4px 4px 0 0", fontSize:"16px" }}>
                      {answers[q.id]?.text || "________"}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* MCQ */}
            {q.question_type==="mcq" && q.options && (
              <div>
                {q.options.map((opt,i)=>(
                  <button key={i} className={`option-btn${answers[q.id]?.text===opt?" selected":""}`}
                    onClick={()=>{ setAnswers(p=>({...p,[q.id]:{text:opt,optIdx:i}})); setTimeout(()=>{ if(currentQ<questions.length-1) setCurrentQ(currentQ+1); },320); }}>
                    <div className="opt-letter">{["A","B","C","D"][i]}</div>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Short answer */}
            {q.question_type==="short_answer" && (
              <div>
                <label className="label" style={{ color:"#64748B", fontSize:"12px" }}>Type the missing word or phrase:</label>
                <input type="text" className="input" style={{ fontSize:"15px", padding:"14px" }}
                  value={answers[q.id]?.text||""}
                  onChange={e=>{ const v=e.target.value; if(v.trim()) setAnswers(p=>({...p,[q.id]:{text:v}})); else setAnswers(p=>{const n={...p};delete n[q.id];return n;}); }}
                  placeholder="Your answer..."
                  autoFocus
                />
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:"28px", paddingTop:"20px", borderTop:"1px solid #E2E8F0" }}>
              <button className="btn btn-outline" onClick={()=>setCurrentQ(Math.max(0,currentQ-1))} disabled={currentQ===0}>← Previous</button>
              {currentQ<questions.length-1
                ? <button className="btn btn-primary" onClick={()=>setCurrentQ(currentQ+1)}>Next →</button>
                : <button className="btn btn-gold" onClick={()=>submitQuiz()} disabled={state==="submitting"}>Submit Quiz</button>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── RESULTS ── */
  if (state==="results" && results) {
    const { score, results:ans } = results;
    const pass = score.percentage >= 50;
    const circ = 2*Math.PI*50;
    const dash = circ*(score.percentage/100);

    return (
      <div style={{ minHeight:"100vh", background:"#F8FAFC" }}>
        {/* Hero */}
        <div style={{ background:pass?"linear-gradient(135deg,#006400,#004d00)":"linear-gradient(135deg,#991b1b,#7f1d1d)", padding:"48px 24px", textAlign:"center", color:"white" }}>
          <div style={{ fontSize:"13px", color:"rgba(255,255,255,.6)", marginBottom:"16px" }}>{name}</div>
          <svg width="120" height="120" style={{ display:"block", margin:"0 auto 16px" }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke={pass?"#4ade80":"#f87171"} strokeWidth="8"
              strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4}
              strokeLinecap="round" transform="rotate(-90 60 60)"/>
            <text x="60" y="67" textAnchor="middle" fontSize="22" fontWeight="800" fill="white">{score.percentage.toFixed(0)}%</text>
          </svg>
          <div style={{ fontSize:"20px", fontWeight:700, marginBottom:"4px" }}>{score.correct} of {score.total} correct</div>
          <div style={{ color:"rgba(255,255,255,.5)", fontSize:"13px", marginBottom:"16px" }}>{quiz?.title}</div>
          <div style={{ display:"inline-block", background:"rgba(255,255,255,.15)", padding:"8px 20px", borderRadius:"99px", fontSize:"13px", fontWeight:600 }}>
            {pass?"✓ Well done! Keep recalling.":"📚 Review the material and try again."}
          </div>
        </div>

        {/* Review */}
        <div style={{ maxWidth:"680px", margin:"0 auto", padding:"32px 24px" }}>
          <div style={{ fontSize:"17px", fontWeight:700, marginBottom:"16px" }}>Answer Review</div>
          {ans.map((a,i)=>(
            <div key={a.question_id} style={{ padding:"18px", borderRadius:"12px", border:`1px solid ${a.is_correct?"#bbf7d0":"#fecaca"}`, background:a.is_correct?"#f0fdf4":"#fef2f2", marginBottom:"12px", borderLeft:`4px solid ${a.is_correct?"#22c55e":"#ef4444"}` }}>
              <div style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
                <span style={{ fontSize:"18px", flexShrink:0 }}>{a.is_correct?"✅":"❌"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"11px", color:"#64748B", marginBottom:"6px" }}>Q{i+1} · {a.question_type==="mcq"?"Multiple Choice":"Short Answer"}</div>
                  <div style={{ fontSize:"14px", fontWeight:600, color:"#0A1628", marginBottom:"10px", lineHeight:1.5 }}>{a.question_text}</div>

                  {a.question_type==="mcq"&&a.options&&(
                    <div style={{ marginBottom:"8px" }}>
                      {a.options.map((opt,oi)=>(
                        <div key={oi} style={{ fontSize:"12px", padding:"6px 10px", borderRadius:"6px", marginBottom:"4px", background:opt===a.correct_answer?"#f0fdf4":opt===a.student_answer&&!a.is_correct?"#fef2f2":"#F8FAFC", color:opt===a.correct_answer?"#166534":opt===a.student_answer&&!a.is_correct?"#dc2626":"#64748B", fontWeight:opt===a.correct_answer?600:400 }}>
                          {["A","B","C","D"][oi]}. {opt}{opt===a.correct_answer?" ✓":""}
                        </div>
                      ))}
                    </div>
                  )}

                  {a.question_type==="short_answer"&&(
                    <div style={{ fontSize:"13px", marginBottom:"6px" }}>
                      <span style={{ color:"#64748B" }}>You answered: </span>
                      <span style={{ color:a.is_correct?"#166534":"#dc2626", fontWeight:600 }}>"{a.student_answer||"(no answer)"}"</span>
                      {!a.is_correct&&<><br/><span style={{ color:"#64748B" }}>Correct: </span><span style={{ color:"#166534", fontWeight:600 }}>"{a.correct_answer}"</span></>}
                    </div>
                  )}

                  {!a.is_correct&&a.ai_feedback&&(
                    <div style={{ fontSize:"12px", background:"#fef3c7", border:"1px solid #fde68a", borderLeft:"3px solid #C8A951", borderRadius:"6px", padding:"10px 12px", color:"#92400e", marginTop:"8px" }}>
                      <strong>📖 From course material:</strong> {a.ai_feedback}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
