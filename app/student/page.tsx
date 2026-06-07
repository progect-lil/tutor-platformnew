"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Lesson = {
    id: string;
    subject: string;
    lesson_date: string;
    lesson_time: string;
    duration_minutes: number;
    zoom_link: string;
    status: string;
};

type Homework = {
    id: string;
    title: string;
    due_date: string;
    status: string;
    grade: string;
    tutor_comment: string;
};

export default function StudentPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        setUser(user);
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(profile);
        const today = new Date().toISOString().split("T")[0];
        const { data: lessonsData } = await supabase.from("schedule").select("*").eq("student_id", user.id).gte("lesson_date", today).order("lesson_date", { ascending: true }).limit(5);
        setLessons(lessonsData || []);
        const { data: hwData } = await supabase.from("homework").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(5);
        setHomeworks(hwData || []);
        setLoading(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const todayStr = new Date().toISOString().split("T")[0];
    const todayLessons = lessons.filter(l => l.lesson_date === todayStr);
    const pendingHW = homeworks.filter(h => h.status === "assigned");
    const newGrades = homeworks.filter(h => h.status === "checked" && h.grade);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-slate-400">Загрузка...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">

            {/* Шапка */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {(profile?.name || user?.email || "У")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm">{profile?.name || "Ученик"}</div>
                        <div className="text-xs text-slate-400 truncate hidden md:block">{user?.email}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 md:px-3 py-1 rounded-full font-medium">Ученик</span>
                    <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-600">Выйти</button>
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-3xl mx-auto">

                {/* Приветствие */}
                <div className="mb-5">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                        Привет, {profile?.name?.split(" ")[0] || "Ученик"} 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                </div>

                {/* Карточки статистики */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 text-center">
                        <div className="text-xl md:text-2xl font-bold text-indigo-600">{lessons.length}</div>
                        <div className="text-xs text-slate-500 mt-1">Уроков впереди</div>
                    </div>
                    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 text-center">
                        <div className="text-xl md:text-2xl font-bold text-orange-500">{pendingHW.length}</div>
                        <div className="text-xs text-slate-500 mt-1">Сдать ДЗ</div>
                    </div>
                    <div className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-slate-100 text-center">
                        <div className="text-xl md:text-2xl font-bold text-green-600">{newGrades.length}</div>
                        <div className="text-xs text-slate-500 mt-1">Новых оценок</div>
                    </div>
                </div>

                {/* Урок сегодня */}
                {todayLessons.length > 0 && (
                    <div className="mb-5 bg-indigo-600 rounded-2xl p-4 md:p-5 text-white">
                        <div className="text-xs font-medium text-indigo-200 mb-2">🔔 Сегодня</div>
                        {todayLessons.map(l => (
                            <div key={l.id} className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-lg md:text-xl font-bold">{l.subject}</div>
                                    <div className="text-indigo-200 text-sm mt-0.5">{l.lesson_time?.slice(0, 5)} · {l.duration_minutes} мин</div>
                                </div>
                                {l.zoom_link && (
                                    <a href={l.zoom_link} target="_blank" className="bg-white text-indigo-600 font-semibold px-3 md:px-4 py-2 rounded-xl text-sm hover:bg-indigo-50 flex-shrink-0">
                                        🎥 Войти
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Навигация десктоп */}
                <div className="hidden md:grid grid-cols-4 gap-3 mb-6">
                    <Link href="/student/schedule" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-300 transition-colors text-center">
                        <div className="text-2xl mb-2">📅</div>
                        <div className="text-sm font-medium text-slate-700">Расписание</div>
                    </Link>
                    <Link href="/student/homework" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-300 transition-colors text-center relative">
                        <div className="text-2xl mb-2">📚</div>
                        <div className="text-sm font-medium text-slate-700">Домашка</div>
                        {pendingHW.length > 0 && (
                            <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                {pendingHW.length}
                            </span>
                        )}
                    </Link>
                    <Link href="/student/grades" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-300 transition-colors text-center">
                        <div className="text-2xl mb-2">⭐</div>
                        <div className="text-sm font-medium text-slate-700">Оценки</div>
                    </Link>
                    <Link href="/topics" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-300 transition-colors text-center">
                        <div className="text-2xl mb-2">📊</div>
                        <div className="text-sm font-medium text-slate-700">Темы</div>
                    </Link>
                </div>

                {/* Ближайшие уроки */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
                    <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="font-semibold text-slate-900 text-sm md:text-base">Ближайшие уроки</div>
                        <Link href="/student/schedule" className="text-xs md:text-sm text-indigo-600 hover:underline">Все →</Link>
                    </div>
                    {lessons.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400 text-sm">Нет запланированных уроков</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {lessons.slice(0, 3).map(l => (
                                <div key={l.id} className="px-4 md:px-5 py-3 flex items-center gap-3">
                                    <div className="text-center bg-indigo-50 rounded-xl px-3 py-2 min-w-[56px] flex-shrink-0">
                                        <div className="text-xs text-indigo-500">
                                            {new Date(l.lesson_date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                                        </div>
                                        <div className="text-sm font-bold text-indigo-700">{l.lesson_time?.slice(0, 5)}</div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-800 text-sm truncate">{l.subject}</div>
                                        <div className="text-xs text-slate-400">{l.duration_minutes} мин</div>
                                    </div>
                                    {l.zoom_link && (
                                        <a href={l.zoom_link} target="_blank" className="text-xs bg-blue-100 text-blue-700 px-2 md:px-3 py-1.5 rounded-lg hover:bg-blue-200 flex-shrink-0">Zoom</a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Домашка */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="font-semibold text-slate-900 text-sm md:text-base">Домашние задания</div>
                        <Link href="/student/homework" className="text-xs md:text-sm text-indigo-600 hover:underline">Все →</Link>
                    </div>
                    {homeworks.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400 text-sm">Нет заданий</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {homeworks.slice(0, 3).map(hw => (
                                <div key={hw.id} className="px-4 md:px-5 py-3 flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hw.status === "assigned" ? "bg-orange-400" : hw.status === "submitted" ? "bg-blue-400" : "bg-green-400"}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-800 text-sm truncate">{hw.title}</div>
                                        {hw.due_date && <div className="text-xs text-slate-400">до {new Date(hw.due_date).toLocaleDateString("ru-RU")}</div>}
                                    </div>
                                    {hw.grade && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium flex-shrink-0">{hw.grade}</span>}
                                    {hw.status === "assigned" && (
                                        <Link href="/student/homework" className="text-xs bg-indigo-100 text-indigo-700 px-2 md:px-3 py-1.5 rounded-lg flex-shrink-0">Сдать</Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Нижняя навигация мобиле */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 z-20">
                <div className="flex items-center justify-around">
                    <Link href="/student" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50">
                        <span className="text-lg">🏠</span>
                        <span className="text-xs text-indigo-700 font-medium">Главная</span>
                    </Link>
                    <Link href="/student/schedule" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">📅</span>
                        <span className="text-xs text-slate-500">Уроки</span>
                    </Link>
                    <Link href="/student/homework" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl relative">
                        <span className="text-lg">📚</span>
                        <span className="text-xs text-slate-500">Домашка</span>
                        {pendingHW.length > 0 && (
                            <span className="absolute top-0 right-1 bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {pendingHW.length}
                            </span>
                        )}
                    </Link>
                    <Link href="/student/grades" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">⭐</span>
                        <span className="text-xs text-slate-500">Оценки</span>
                    </Link>
                    <Link href="/topics" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">📊</span>
                        <span className="text-xs text-slate-500">Темы</span>
                    </Link>
                </div>
            </div>

        </div>
    );
}
