"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function TutorPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [todayLessons, setTodayLessons] = useState<any[]>([]);
    const [pendingHW, setPendingHW] = useState<number>(0);
    const [pendingPayments, setPendingPayments] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => { init(); }, []);

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!prof || prof.role !== "tutor") { router.push("/login"); return; }
        setProfile(prof);
        const { data: studs } = await supabase.from("profiles").select("*").eq("role", "student");
        setStudents(studs || []);
        const today = new Date().toISOString().split("T")[0];
        const { data: lessons } = await supabase.from("schedule").select("*").eq("lesson_date", today);
        setTodayLessons(lessons || []);
        const { data: hw } = await supabase.from("homework").select("id").eq("status", "submitted");
        setPendingHW((hw || []).length);
        const { data: pays } = await supabase.from("payments").select("id").eq("status", "pending");
        setPendingPayments((pays || []).length);
        setLoading(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen text-gray-400">Загрузка...</div>
    );

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Десктоп сайдбар */}
            <div className="hidden md:flex fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-100 flex-col p-4 z-10">
                <div className="flex items-center gap-2 mb-8 px-2 pt-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold">Р</div>
                    <span className="font-semibold text-gray-900">Репетитор</span>
                </div>
                <nav className="flex flex-col gap-1 flex-1">
                    <Link href="/tutor" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50 text-violet-700 text-sm font-medium">🏠 Главная</Link>
                    <Link href="/schedule" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📅 Расписание</Link>
                    <Link href="/homework" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📚 Домашка</Link>
                    <Link href="/tests" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">🧪 Тесты</Link>
                    <Link href="/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">💰 Оплата</Link>
                    <Link href="/topics" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📊 Темы</Link>
                    <div className="my-2 border-t border-gray-100" />
                    <Link href="/student/manage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">👨‍🎓 Ученики</Link>
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">👤 Профиль</Link>
                </nav>
                <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 text-gray-400 hover:text-red-500 text-sm transition-colors">🚪 Выйти</button>
            </div>

            {/* Мобайл шапка */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold">Р</div>
                    <span className="font-semibold text-gray-900 text-sm">Репетитор</span>
                </div>
                <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                    {menuOpen ? "✕" : "☰"}
                </button>
            </div>

            {/* Мобайл выдвижное меню */}
            {menuOpen && (
                <div className="md:hidden fixed inset-0 z-10" onClick={() => setMenuOpen(false)}>
                    <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-56" onClick={e => e.stopPropagation()}>
                        <nav className="flex flex-col gap-1">
                            <Link href="/tutor" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50 text-violet-700 text-sm font-medium">🏠 Главная</Link>
                            <Link href="/schedule" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📅 Расписание</Link>
                            <Link href="/homework" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📚 Домашка</Link>
                            <Link href="/tests" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">🧪 Тесты</Link>
                            <Link href="/payments" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">💰 Оплата</Link>
                            <Link href="/topics" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📊 Темы</Link>
                            <div className="my-1 border-t border-gray-100" />
                            <Link href="/student/manage" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">👨‍🎓 Ученики</Link>
                            <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">👤 Профиль</Link>
                            <div className="my-1 border-t border-gray-100" />
                            <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 text-sm text-left">🚪 Выйти</button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Контент */}
            <div className="md:ml-56 pt-16 md:pt-0 p-4 md:p-6 pb-24 md:pb-6">

                <div className="mb-6 md:mb-8">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                        Привет, {profile?.name?.split(" ")[0] || "Репетитор"} 👋
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                </div>

                {/* Stats — уроков сегодня первая карточка */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-emerald-600">{todayLessons.length}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Уроков сегодня</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-violet-600">{students.length}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Учеников</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-amber-500">{pendingHW}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Ждут проверки</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-rose-500">{pendingPayments}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Долгов</div>
                    </div>
                </div>

                {/* Quick Actions — тесты перед оплатой */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 md:mb-8">
                    <Link href="/schedule" className="bg-violet-50 hover:bg-violet-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-violet-100">
                        <span className="text-xl md:text-2xl">📅</span>
                        <div>
                            <div className="font-medium text-violet-900 text-sm">Расписание</div>
                            <div className="text-xs text-violet-500 hidden md:block">Управлять уроками</div>
                        </div>
                    </Link>
                    <Link href="/homework" className="bg-amber-50 hover:bg-amber-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-amber-100">
                        <span className="text-xl md:text-2xl">📚</span>
                        <div>
                            <div className="font-medium text-amber-900 text-sm">Домашка</div>
                            <div className="text-xs text-amber-500 hidden md:block">Задать и проверить</div>
                        </div>
                    </Link>
                    <Link href="/tests" className="bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-indigo-100">
                        <span className="text-xl md:text-2xl">🧪</span>
                        <div>
                            <div className="font-medium text-indigo-900 text-sm">Тесты</div>
                            <div className="text-xs text-indigo-500 hidden md:block">Создать тест</div>
                        </div>
                    </Link>
                    <Link href="/payments" className="bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-emerald-100">
                        <span className="text-xl md:text-2xl">💰</span>
                        <div>
                            <div className="font-medium text-emerald-900 text-sm">Оплата</div>
                            <div className="text-xs text-emerald-500 hidden md:block">Счета и долги</div>
                        </div>
                    </Link>
                </div>

                {/* Список учеников */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <h2 className="font-semibold text-gray-900">Мои ученики</h2>
                        <Link href="/student/manage" className="text-sm text-violet-600 hover:underline">Управлять →</Link>
                    </div>
                    {students.length === 0 ? (
                        <div className="px-5 py-12 text-center text-gray-400 text-sm">Ученики пока не зарегистрировались</div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {students.map((student) => (
                                <div key={student.id} className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-medium text-sm flex-shrink-0">
                                        {(student.name || student.email || "У")[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900 text-sm">{student.name || "Без имени"}</div>
                                        <div className="text-xs text-gray-400 truncate">{student.email}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Мобайл нижняя навигация */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-20">
                <div className="flex items-center justify-around">
                    <Link href="/tutor" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50">
                        <span className="text-lg">🏠</span>
                        <span className="text-xs text-violet-700 font-medium">Главная</span>
                    </Link>
                    <Link href="/schedule" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">📅</span>
                        <span className="text-xs text-gray-500">Уроки</span>
                    </Link>
                    <Link href="/homework" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl relative">
                        <span className="text-lg">📚</span>
                        <span className="text-xs text-gray-500">Домашка</span>
                        {pendingHW > 0 && (
                            <span className="absolute top-0 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{pendingHW}</span>
                        )}
                    </Link>
                    <Link href="/tests" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">🧪</span>
                        <span className="text-xs text-gray-500">Тесты</span>
                    </Link>
                    <Link href="/payments" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl relative">
                        <span className="text-lg">💰</span>
                        <span className="text-xs text-gray-500">Оплата</span>
                        {pendingPayments > 0 && (
                            <span className="absolute top-0 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{pendingPayments}</span>
                        )}
                    </Link>
                </div>
            </div>

        </div>
    );
}
 
  
 