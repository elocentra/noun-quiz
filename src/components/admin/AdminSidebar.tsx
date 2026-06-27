"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard",       icon: "📊" },
  { href: "/admin/upload",    label: "Upload Material", icon: "📤" },
  { href: "/admin/questions", label: "Question Pool",   icon: "🧩" },
  { href: "/admin/quizzes",   label: "Quizzes",         icon: "📝" },
  { href: "/admin/students",  label: "Students",        icon: "👥" },
];

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside style={{
      width: "220px", background: "#0A1628",
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 16px",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        display: "flex", alignItems: "center", gap: "10px"
      }}>
        <div style={{
          width: "36px", height: "36px", background: "#C8A951",
          borderRadius: "8px", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "18px", flexShrink: 0
        }}>🎓</div>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: "13px", lineHeight: 1.3 }}>NOUN Quiz</div>
          <div style={{ color: "#4ade80", fontSize: "11px" }}>Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className={`nav-item${active ? " active" : ""}`} style={{ marginBottom: "2px" }}>
                <span style={{ fontSize: "15px", width: "18px", textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ color: "rgba(255,255,255,.3)", fontSize: "12px", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,.12)",
            color: "rgba(255,255,255,.4)", borderRadius: "6px",
            padding: "5px 10px", fontSize: "12px", cursor: "pointer",
            width: "100%", textAlign: "left"
          }}
        >
          → Sign Out
        </button>
      </div>
    </aside>
  );
}
