import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOUN Smart Active Recall Quiz System",
  description: "National Open University of Nigeria — Active Recall Learning Engine",
  icons: { icon: "/favicon.ico" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "8px",
              background: "#1E293B",
              color: "#fff",
              fontSize: "14px"
            },
            success: { iconTheme: { primary: "#006400", secondary: "#fff" } },
            error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } }
          }}
        />
      </body>
    </html>
  );
}
