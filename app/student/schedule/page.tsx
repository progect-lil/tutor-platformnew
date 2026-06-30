"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Lesson = {
    id: string;
    student_name: string;
    subject: string;
    lesson_date: string;
    lesson_time: string;
    duration_minutes: number;
    zoom_link: string;
    status: "planned" | "completed" | "cancelled";
    topic: string;
    lesson_notes: string;
};

export default function StudentSchedulePage() {
    const router = useRouter();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { init(); }, []);

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase.from("schedule")
            .select("*")
            .eq("student_id", user.id) // ✅ только уроки этого ученика
            .gte("lesson_date", today)
            .order("lesson_date", { ascending: true })
            .order("lesson_time", { ascending: true });

        setLessons(data || []);
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-6 p-4 md:p-6 max-w-4xl mx-auto">

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">📅 Расписание уроков</h1>

            {lessons.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <div className="text-5xl mb-4">📅</div>
                    <div>Нет запланированных уроков</div>
                </div>
            ) : (
                <div className="space-y-4">
                    {lessons.map(lesson => (
                        <div key={lesson.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-5 flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lesson.status === "planned" ? "bg-yellow-100 text-yellow-700" : lesson.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                            {lesson.status === "planned" ? "Запланирован" : lesson.status === "completed" ? "Проведен" : "Отменен"}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatDate(lesson.lesson_date)}</span>
                                    </div>
                                    <div className="font-semibold text-gray-900 text-lg">{lesson.subject}</div>
                                    {lesson.lesson_time && (
                                        <div className="text-sm text-gray-500 mt-0.5">🕐 {lesson.lesson_time?.slice(0, 5)} · {lesson.duration_minutes} мин</div>
                                    )}
                                    {lesson.topic && <div className="text-sm text-gray-600 mt-1">📖 {lesson.topic}</div>}
                                    {lesson.lesson_notes && <div className="text-xs text-gray-400 mt-1">📝 {lesson.lesson_notes}</div>}
                                </div>

                                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                                    {lesson.zoom_link && (
                                        <a href={lesson.zoom_link} target="_blank" className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                                            🎥 Войти
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
