"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenCheck, Bot, Clock3, History, LayoutDashboard, ListTodo, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agent", label: "AI Study Agent", icon: Bot },
  { href: "/plans", label: "Study Plans", icon: BookOpenCheck },
  { href: "/tasks", label: "My Tasks", icon: ListTodo },
  { href: "/focus", label: "Focus Session", icon: Clock3 },
  { href: "/history", label: "Study History", icon: History },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "text-[#04241a]" : "hover:bg-[#111f45]"}`}
            style={active ? { background: "linear-gradient(135deg,#1fd6a2,#17b8a6)" } : { color: "#c9d6f5" }}>
            <Icon size={18} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { db, saveError } = useStore();
  return (
    <div className={`min-h-screen ${db.preferences.reducedMotion ? "reduced-motion" : ""}`} style={{ background: "radial-gradient(900px 500px at 85% -10%, rgba(31,214,162,.10), transparent 60%), radial-gradient(700px 500px at -10% 110%, rgba(154,140,255,.10), transparent 60%), #070d1f" }}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r p-5 lg:flex" style={{ borderColor: "#22315f", background: "rgba(10,20,46,.85)", backdropFilter: "blur(10px)" }}>
        <Link href="/" className="mb-7 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full text-lg font-black text-[#04241a]" style={{ background: "radial-gradient(circle at 35% 30%, #b8ffe9, #1fd6a2 55%, #0e7f8c)" }} aria-hidden>◉</span>
          <span><span className="block text-lg font-extrabold tracking-tight">StudyFlow</span><span className="block text-xs" style={{ color: "#9fb0d8" }}>Learn with intent</span></span>
        </Link>
        <NavLinks />
        <p className="mt-auto text-xs leading-relaxed" style={{ color: "#63749c" }}>Local-first MVP. Data stays in this browser unless you export it. Agent runs a labelled local fallback — no AI key required.</p>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden" style={{ borderColor: "#22315f", background: "rgba(10,20,46,.92)", backdropFilter: "blur(10px)" }}>
        <Link href="/" className="flex items-center gap-2 font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-full text-[#04241a]" style={{ background: "radial-gradient(circle at 35% 30%, #b8ffe9, #1fd6a2 55%, #0e7f8c)" }} aria-hidden>◉</span> StudyFlow</Link>
        <button className="btn-ghost !px-3 !py-2" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
      </header>
      {open && (
        <div className="border-b p-4 lg:hidden" style={{ borderColor: "#22315f", background: "#0a142e" }}>
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-10 lg:py-9">
        {saveError && <div role="alert" className="card mb-5 border !border-[#5c2233] p-4 text-sm" style={{ color: "#ffb4c0" }}>{saveError}</div>}
        {children}
      </main>
    </div>
  );
}
