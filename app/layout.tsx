"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

function Sidebar({ role, name, onLogout }: { role: string; name: string; onLogout: () => void }) {
  const pathname = usePathname();
  const isTutor = role === "tutor";
  const isStudent = role === "student";

  const color = isTutor ? "bg-violet-600" : isStudent ? "bg-indigo-600" : "bg-emerald-600";
  const active = isTutor ? "bg-violet-50 text-violet-700" : isStudent ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700";
  const letter = isTutor ? "Р" : "У";
  const title = isTutor ? "Репетитор" : isStudent ? "Кабинет ученика" : "Кабинет родителя";
  const home = isTutor ? "/tutor" : isStudent ? "/student" : "/parent";

  const link = (href: string, icon: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === href ? active : "text-gray-600 hover:bg-gray-50"
        }`}
    >
      {icon} {label}
    </Link>
  );

  return (
    <div className="hidden md:flex fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-100 flex-col p-4 z-10">
      <div className="flex items-center gap-2 mb-8 px-2 pt-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white text-sm font-bold`}>
          {letter}
        </div>
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {link(home, "🏠", "Главная")}

        {isTutor && <>
          {link("/schedule", "📅", "Расписание")}
          {link("/homework", "📚", "Домашка")}
          {link("/topics", "📊", "Темы")}
          {link("/materials", "📂", "Материалы")}
          {link("/payments", "💰", "Оплата")}
          <div className="my-2 border-t border-gray-100" />
          {link("/student/manage", "👨‍🎓", "Ученики")}
        </>}

        {isStudent && <>
          {link("/student/schedule", "📅", "Расписание")}
          {link("/student/homework", "📚", "Домашка")}
          {link("/topics", "📊", "Темы")}
          {link("/materials", "📂", "Материалы")}
          {link("/student/grades", "⭐", "Оценки")}
        </>}

        {link(isTutor ? "/profile" : "/student/profile", "👤", "Профиль")}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-3 py-2.5 text-gray-400 hover:text-red-500 text-sm transition-colors"
      >
        🚪 Выйти
      </button>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const noSidebar = pathname === "/login" || pathname === "/";

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: prof } = await supabase.from("profiles").select("role, name").eq("id", user.id).single();
      if (prof) { setRole(prof.role); setName(prof.name || ""); }
      setLoading(false);
    };
    getUser();
  }, [pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    router.push("/login");
  };

  return (
    <html lang="ru">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <div className="min-h-screen bg-gray-50 flex">
          {!noSidebar && !loading && role && (
            <Sidebar role={role} name={name} onLogout={logout} />
          )}
          <main className={`flex-1 ${!noSidebar && !loading && role ? "md:ml-56" : ""}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
