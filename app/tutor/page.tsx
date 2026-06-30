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
    const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
    const [pendingHW, setPendingHW] = useState<number>(0);
    const [pendingPayments, setPendingPayments] = useState<number>(0);
    const [loading, setLoading] = useState(true);

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

        const { data: upcoming } = await supabase.from("schedule").select("*")
            .gte("lesson_date", today)
            .order("lesson_date", { ascending: true })
            .order("lesson_time", { ascending: true })
            .limit(5);
        setUpcomingLessons(upcoming || []);

        const { data: hw } = await supabase.from("homework").select("id").eq("status", "submitted");
        setPendingHW((hw || []).length);

        const { data: pays } = await supabase.from("payments").select("id").eq("status", "pending");
        setPendingPayments((pays || []).length);

        setLoading(false);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Загрузка...</div>;

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8 pb-24 md:pb-8">

            {/* Приветствие */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Привет, {profile?.name?.split(" ")[0] || "Репетитор"} 👋
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                </p>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                    <div className="text-2xl md:text-3xl font-bold text-violet-600">{todayLessons.length}</div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1">Уроков сегодня</div>
                </div>
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                    <div className="text-2xl md:text-3xl font-bold text-violet-600">{students.length}</div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1">Учеников</div>
                </div>
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm relative">
                    <div className="text-2xl md:text-3xl font-bold text-amber-500">{pendingHW}</div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1">Ждут проверки</div>
                    {pendingHW > 0 && <div className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full" />}
                </div>
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm relative">
                    <div className="text-2xl md:text-3xl font-bold text-rose-500">{pendingPayments}</div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1">Долгов</div>
                    {pendingPayments > 0 && <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full" />}
                </div>
            </div>

            {/* Быстрый доступ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                <Link href="/materials" className="bg-sky-50 hover:bg-sky-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-sky-100">
                    <span className="text-xl md:text-2xl">📂</span>
                    <div>
                        <div className="font-medium text-sky-900 text-sm">Материалы</div>
                        <div className="text-xs text-sky-500 hidden md:block">Справочные материалы</div>
                    </div>
                </Link>
                <Link href="/payments" className="bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-emerald-100">
                    <span className="text-xl md:text-2xl">💳</span>
                    <div>
                        <div className="font-medium text-emerald-900 text-sm">Оплата</div>
                        <div className="text-xs text-emerald-500 hidden md:block">Счета и долги</div>
                    </div>
                </Link>
            </div>

            {/* Ближайшие уроки */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900">📅 Ближайшие уроки</h2>
                    <Link href="/schedule" className="text-sm text-violet-600 hover:underline">Все →</Link>
                </div>
                {upcomingLessons.length === 0 ? (
                    <div className="px-5 py-12 text-center text-gray-400 text-sm">
                        Уроков пока нет — <Link href="/schedule" className="text-violet-500 hover:underline">добавить урок</Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {upcomingLessons.map((lesson) => (
                            <div key={lesson.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className="text-center bg-violet-50 rounded-xl px-3 py-2 min-w-[56px] flex-shrink-0">
                                        <div className="text-xs text-violet-500">
                                            {new Date(lesson.lesson_date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                                        </div>
                                        <div className="text-sm font-bold text-violet-700">{lesson.lesson_time?.slice(0, 5)}</div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900 text-sm truncate">{lesson.subject}</div>
                                        <div className="text-xs text-gray-400 truncate">{lesson.student_name}</div>
                                    </div>
                                </div>
                                {lesson.zoom_link && (
                                    <a href={lesson.zoom_link} target="_blank" className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex-shrink-0">
                                        🔗 Войти
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
