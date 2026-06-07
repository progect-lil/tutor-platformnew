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
    notes: string;
};

export default function StudentSchedulePage() {
    const router = useRouter();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
            .from("schedule")
            .select("*")
            .eq("student_id", user.id)
            .gte("lesson_date", today)
            .order("lesson_date", { ascending: true });
        setLessons(data || []);
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    };

    const todayStr = new Date().toISOString().split("T")[0];

    const grouped: Record<string, Lesson[]> = {};
    lessons.forEach(l => {
        if (!grouped[l.lesson_date]) grouped[l.lesson_date] = [];
        grouped[l.lesson_date].push(l);
    });

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">

            {/* Шапка */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center gap-3">
                <button onClick={() => router.push("/student")} className="text-slate-500 hover:text-slate-800 text-sm">← Назад</button>
                <h1 className="text-lg md:text-xl font-bold text-slate-900">📅 Моё расписание</h1>
            </div>

            <div className="p-4 md:p-6 max-w-2xl mx-auto">
                {lessons.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <div className="text-5xl mb-4">📅</div>
                        <div className="text-base md:text-lg">Нет запланированных уроков</div>
                        <div className="text-sm mt-2">Репетитор ещё не добавил уроки</div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {Object.entries(grouped).map(([date, dayLessons]) => (
                            <div key={date}>
                                {/* Дата */}
                                <div className={`text-sm font-semibold mb-2 capitalize ${date === todayStr ? "text-indigo-600" : "text-slate-400"}`}>
                                    {date === todayStr ? "🔔 Сегодня" : formatDate(date)}
                                </div>

                                <div className="space-y-3">
                                    {dayLessons.map(l => (
                                        <div
                                            key={l.id}
                                            className={`bg-white rounded-2xl shadow-sm border ${date === todayStr ? "border-indigo-200" : "border-slate-100"}`}
                                        >
                                            {/* Сегодняшний урок — акцентный */}
                                            {date === todayStr ? (
                                                <div className="p-4 md:p-5">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-base md:text-lg font-bold text-slate-900">{l.subject}</div>
                                                            <div className="text-slate-500 text-sm mt-1">
                                                                🕐 {l.lesson_time.slice(0, 5)} · {l.duration_minutes} мин
                                                            </div>
                                                            {l.notes && (
                                                                <div className="text-slate-400 text-xs md:text-sm mt-1.5">📝 {l.notes}</div>
                                                            )}
                                                        </div>
                                                        {l.zoom_link ? (
                                                            <a
                                                                href={l.zoom_link}
                                                                target="_blank"
                                                                className="bg-indigo-600 text-white px-3 md:px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 flex-shrink-0"
                                                            >
                                                                🎥 Войти
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs flex-shrink-0">Ссылки нет</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Обычный урок — компактнее */
                                                <div className="p-4 flex items-center gap-3">
                                                    <div className="text-center bg-slate-50 rounded-xl px-3 py-2 min-w-[56px] flex-shrink-0">
                                                        <div className="text-xs text-slate-400">
                                                            {new Date(l.lesson_date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-700">{l.lesson_time.slice(0, 5)}</div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-slate-900 text-sm">{l.subject}</div>
                                                        <div className="text-xs text-slate-400">{l.duration_minutes} мин</div>
                                                        {l.notes && <div className="text-xs text-slate-400 mt-0.5 truncate">📝 {l.notes}</div>}
                                                    </div>
                                                    {l.zoom_link ? (
                                                        <a
                                                            href={l.zoom_link}
                                                            target="_blank"
                                                            className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 flex-shrink-0"
                                                        >
                                                            🎥 Zoom
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs flex-shrink-0">Нет ссылки</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Нижняя навигация — только мобил */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 z-20">
                <div className="flex items-center justify-around">
                    <Link href="/student" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">🏠</span>
                        <span className="text-xs text-slate-500">Главная</span>
                    </Link>
                    <Link href="/student/schedule" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50">
                        <span className="text-lg">📅</span>
                        <span className="text-xs text-indigo-700 font-medium">Уроки</span>
                    </Link>
                    <Link href="/student/homework" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">📚</span>
                        <span className="text-xs text-slate-500">Домашка</span>
                    </Link>
                    <Link href="/student/grades" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">⭐</span>
                        <span className="text-xs text-slate-500">Оценки</span>
                    </Link>
                </div>
            </div>

        </div>
    );
}
