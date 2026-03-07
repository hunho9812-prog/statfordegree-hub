import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DarkModeSync from "@/components/DarkModeSync";

export const metadata: Metadata = {
  title: "Statfordegree Hub",
  description: "팀 지식관리 시스템 — 업무 메뉴얼 & 업무 관리",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = JSON.parse(localStorage.getItem('statfordegree-hub-storage') || '{}');
                if (s.state && s.state.darkMode) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#e6e6e4] antialiased">
        <DarkModeSync />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
