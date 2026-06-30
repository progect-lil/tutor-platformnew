"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const NAV = [
    { href: "/parent", label: "Главная", icon: "🏠", exact: true },
    { href: "/parent/payments", label: "Оплата", icon: "💳" },
    { href: "/parent/progress", label: "Прогресс", icon: "📊" },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [userName, setUserName] = useState("");

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { router.push("/login"); return; }
            supabase.from("profiles").select("full_name").eq("id", user.id).single()
                .then(({ data }) => { if (data?.full_name) setUserName(data.full_name); });
        });
    }, []);

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const initials = userName ? userName[0].toUpperCase() : "Р";

    return (
        <div className="min-h-screen flex" style={{ background: "#F8F7FF" }}>
            {/* Sidebar — desktop */}
            <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full z-20"
                style={{ width: 224, background: "#fff", borderRight: "0.5px solid #E8E6F0" }}>

                <div className="flex items-center gap-3 px-4 py-5"
                    style={{ borderBottom: "0.5px solid #E8E6F0" }}>
                    <div className="flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm"
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "linear-gradient(135deg, #7C5CFC, #A855F7)"
                        }}>
                        {initials}
                    </div>
                    <div className="overflow-hidden">
                        <div className="text-xs font-semibold leading-tight" style={{ color: "#1A1523" }}>
                            Кабинет родителя
                        </div>
                        {userName && (
                            <div className="text-xs truncate" style={{ color: "#9490A4" }}>{userName}</div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-2 py-3 space-y-0.5">
                    {NAV.map(item => (
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all"
                            style={{
                                borderRadius: 10,
                                background: isActive(item.href, item.exact) ? "#F3EFFF" : "transparent",
                                color: isActive(item.href, item.exact) ? "#7C5CFC" : "#6B6578",
                                fontWeight: isActive(item.href, item.exact) ? 500 : 400,
                            }}>
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ borderTop: "0.5px solid #E8E6F0", padding: "12px 8px" }}>
                    <button onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2.5 w-full text-sm transition-all"
                        style={{ borderRadius: 10, color: "#9490A4", background: "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F8F7FF")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <span>🚪</span> Выйти
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 pb-20 md:pb-0"
                style={{ marginLeft: "224px" }}>
                {children}
            </main>

            {/* Bottom nav — mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 flex z-20"
                style={{ background: "#fff", borderTop: "0.5px solid #E8E6F0" }}>
                {NAV.map(item => (
                    <Link key={item.href} href={item.href}
                        className="flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-all"
                        style={{ color: isActive(item.href, item.exact) ? "#7C5CFC" : "#9490A4", fontWeight: isActive(item.href, item.exact) ? 500 : 400 }}>
                        <span className="text-xl">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}