"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function StudentPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [todayLessons, setTodayLessons] = useState<any[]>([]);
    const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
    const [pendingHW, setPendingHW] = useState<number>(0);
    const [completedHW, setCompletedHW] = useState<number>(0);
    const [totalLessons, setTotalLessons] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => { init(); }, []);

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!prof || prof.role !== "student") { router.push("/login"); return; }
        setProfile(prof);

        const today = new Date().toISOString().split("T")[0];

        const { data: lessons } = await supabase
            .from("schedule")
            .select("*")
            .eq("student_id", user.id)
            .eq("lesson_date", today);
        setTodayLessons(lessons || []);

        const { data: upcoming } = await supabase
            .from("schedule")
            .select("*")
            .eq("student_id", user.id)
            .gte("lesson_date", today)
            .order("lesson_date", { ascending: true })
            .order("lesson_time", { ascending: true })
            .limit(5);
        setUpcomingLessons(upcoming || []);

        const { data: hwPending } = await supabase
            .from("homework")
            .select("id")
            .eq("student_id", user.id)
            .eq("status", "assigned");
        setPendingHW((hwPending || []).length);

        const { data: hwDone } = await supabase
            .from("homework")
            .select("id")
            .eq("student_id", user.id)
            .eq("status", "submitted");
        setCompletedHW((hwDone || []).length);

        const { count } = await supabase
            .from("schedule")
            .select("id", { count: "exact", head: true })
            .eq("student_id", user.id);
        setTotalLessons(count || 0);

        setLoading(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const getDayLabel = (dateStr: string) => {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        if (dateStr === today) return "Сегодня";
        if (dateStr === tomorrow) return "Завтра";
        return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen text-gray-400">Загрузка...</div>
    );

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Мобайл шапка */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">У</div>
                    <span className="font-semibold text-gray-900 text-sm">Кабинет ученика</span>
                </div>
                <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                    {menuOpen ? "✕" : "☰"}
                </button>
            </div>

            {/* Мобайл меню */}
            {menuOpen && (
                <div className="md:hidden fixed inset-0 z-10" onClick={() => setMenuOpen(false)}>
                    <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-56" onClick={e => e.stopPropagation()}>
                        <nav className="flex flex-col gap-1">
                            <Link href="/student" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium">🏠 Главная</Link>
                            <Link href="/student/schedule" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📅 Расписание</Link>
                            <Link href="/student/homework" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📚 Домашка</Link>
                            <Link href="/topics" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📊 Темы</Link>
                            <Link href="/materials" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">📂 Материалы</Link>
                            <Link href="/student/grades" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">⭐ Оценки</Link>
                            <Link href="/student/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 text-sm">👤 Профиль</Link>
                            <div className="my-1 border-t border-gray-100" />
                            <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 text-sm text-left">🚪 Выйти</button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Основной контент */}
            <div className="max-w-5xl mx-auto p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8">

                {/* Приветствие */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Привет, {profile?.name?.split(" ")[0] || "Ученик"} 👋
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-indigo-600">{todayLessons.length}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Уроков сегодня</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-violet-500">{totalLessons}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Уроков всего</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                        <div className="text-2xl md:text-3xl font-bold text-emerald-500">{completedHW}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Сдано заданий</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm relative">
                        {pendingHW > 0 && <div className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full" />}
                        <div className="text-2xl md:text-3xl font-bold text-amber-500">{pendingHW}</div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">Нужно сдать</div>
                    </div>
                </div>

                {/* Быстрый доступ */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    <Link href="/student/schedule" className="bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-indigo-100">
                        <span className="text-xl md:text-2xl">📅</span>
                        <div>
                            <div className="font-medium text-indigo-900 text-sm">Расписание</div>
                            <div className="text-xs text-indigo-400 hidden md:block">Мои уроки</div>
                        </div>
                    </Link>
                    <Link href="/student/homework" className="bg-amber-50 hover:bg-amber-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-amber-100 relative">
                        <span className="text-xl md:text-2xl">📚</span>
                        <div>
                            <div className="font-medium text-amber-900 text-sm">Домашка</div>
                            <div className="text-xs text-amber-400 hidden md:block">Задания</div>
                        </div>
                        {pendingHW > 0 && (
                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{pendingHW}</span>
                        )}
                    </Link>
                    <Link href="/topics" className="bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-emerald-100">
                        <span className="text-xl md:text-2xl">📊</span>
                        <div>
                            <div className="font-medium text-emerald-900 text-sm">Темы</div>
                            <div className="text-xs text-emerald-400 hidden md:block">Пройденный материал</div>
                        </div>
                    </Link>
                    <Link href="/materials" className="bg-sky-50 hover:bg-sky-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-sky-100">
                        <span className="text-xl md:text-2xl">📂</span>
                        <div>
                            <div className="font-medium text-sky-900 text-sm">Материалы</div>
                            <div className="text-xs text-sky-400 hidden md:block">Учебные материалы</div>
                        </div>
                    </Link>
                    <Link href="/student/grades" className="bg-violet-50 hover:bg-violet-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-violet-100">
                        <span className="text-xl md:text-2xl">⭐</span>
                        <div>
                            <div className="font-medium text-violet-900 text-sm">Оценки</div>
                            <div className="text-xs text-violet-400 hidden md:block">Мои результаты</div>
                        </div>
                    </Link>
                    <Link href="/student/profile" className="bg-gray-100 hover:bg-gray-200 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-gray-200">
                        <span className="text-xl md:text-2xl">👤</span>
                        <div>
                            <div className="font-medium text-gray-800 text-sm">Профиль</div>
                            <div className="text-xs text-gray-400 hidden md:block">Настройки</div>
                        </div>
                    </Link>
                </div>

                {/* Ближайшие уроки */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <h2 className="font-semibold text-gray-900">📅 Ближайшие уроки</h2>
                        <Link href="/student/schedule" className="text-sm text-indigo-600 hover:underline">Все →</Link>
                    </div>
                    {upcomingLessons.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <div className="text-3xl mb-2">📭</div>
                            <div className="text-gray-400 text-sm">Уроков пока нет</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {upcomingLessons.map(lesson => (
                                <div key={lesson.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                        <div className="text-center bg-indigo-50 rounded-xl px-3 py-2 min-w-[64px] flex-shrink-0">
                                            <div className="text-xs text-indigo-400 font-medium">{getDayLabel(lesson.lesson_date)}</div>
                                            <div className="text-sm font-bold text-indigo-700">{lesson.lesson_time?.slice(0, 5)}</div>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-gray-900 text-sm truncate">{lesson.subject}</div>
                                            {lesson.topic && <div className="text-xs text-indigo-400 mt-0.5 truncate">📌 {lesson.topic}</div>}
                                            {lesson.duration_minutes && <div className="text-xs text-gray-400 mt-0.5">⏱ {lesson.duration_minutes} мин</div>}
                                        </div>
                                    </div>
                                    {lesson.zoom_link && (
                                        <a href={lesson.zoom_link} target="_blank" rel="noopener noreferrer"
                                            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium flex-shrink-0">
                                            🔗 Войти
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Мобайл нижняя навигация */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-1 py-2 z-20">
                <div className="flex items-center justify-around">
                    <Link href="/student" className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl bg-indigo-50">
                        <span className="text-lg">🏠</span>
                        <span className="text-xs text-indigo-700 font-medium">Главная</span>
                    </Link>
                    <Link href="/student/schedule" className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl">
                        <span className="text-lg">📅</span>
                        <span className="text-xs text-gray-500">Уроки</span>
                    </Link>
                    <Link href="/student/homework" className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl relative">
                        <span className="text-lg">📚</span>
                        <span className="text-xs text-gray-500">Домашка</span>
                        {pendingHW > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{pendingHW}</span>}
                    </Link>
                    <Link href="/topics" className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl">
                        <span className="text-lg">📊</span>
                        <span className="text-xs text-gray-500">Темы</span>
                    </Link>
                    <Link href="/student/profile" className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl">
                        <span className="text-lg">👤</span>
                        <span className="text-xs text-gray-500">Профиль</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
