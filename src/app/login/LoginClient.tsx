"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Invalid credentials. Please try again.");
      setLoading(false);
      return;
    }
    const redirect = searchParams.get("redirect") || "/admin/dashboard";
    router.push(redirect);
    router.refresh();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0A1628 0%, #1E293B 50%, #003300 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "56px", height: "56px", background: "#C8A951", borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", margin: "0 auto 16px"
          }}>🎓</div>
          <div style={{ color: "white", fontSize: "22px", fontWeight: 700 }}>NOUN Quiz System</div>
          <div style={{ color: "#4ade80", fontSize: "13px", marginTop: "4px" }}>Smart Active Recall Engine</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "32px" }}>
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Admin Login</div>
            <div style={{ color: "#64748B", fontSize: "14px" }}>Sign in to manage courses and quizzes</div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "16px" }}>
              <label className="label">Email Address</label>
              <input
                type="email" className="input"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@noun.edu.ng" required autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label className="label">Password</label>
              <input
                type="password" className="input"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-full">
              {loading ? <><span className="spinner" /> Signing in...</> : "Sign In"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: "12px", marginTop: "20px" }}>
          National Open University of Nigeria
        </div>
      </div>
    </div>
  );
}
