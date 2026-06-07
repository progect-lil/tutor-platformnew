"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Homework = {
    id: string;
    title: string;
    grade: string;
    tutor_comment: string;
    created_at: string;
};

export default function StudentGradesPage() {
    const router = useRouter();
    const [grades, setGrades] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data } = await supabase
            .from("homework")
            .select("*")
            .eq("student_id", user.id)
            .eq("status", "checked")
            .order("created_at", { ascending: false });
        setGrades(data || []);
        setLoading(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">

            {/* Шапка */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center gap-3">
                <button onClick={() => router.push("/student")} className="text-slate-500 hover:text-slate-800 text-sm">← Назад</button>
                <h1 className="text-lg md:text-xl font-bold text-slate-900">⭐ Мои оценки</h1>
            </div>

            <div className="p-4 md:p-6 max-w-2xl mx-auto">

                {/* Итог */}
                {grades.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">⭐</div>
                        <div>
                            <div className="font-bold text-slate-900">{grades.length} проверенных работ</div>
                            <div className="text-sm text-slate-400">Продолжай в том же духе!</div>
                        </div>
                    </div>
                )}

                {grades.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <div className="text-5xl mb-4">⭐</div>
                        <div className="text-base">Оценок пока нет</div>
                        <div className="text-sm mt-2">Сдай домашку и получи первую оценку!</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {grades.map(g => (
                            <div key={g.id} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-lg md:text-xl font-bold flex-shrink-0">
                                    {g.grade || "—"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-900 text-sm md:text-base truncate">{g.title}</div>
                                    {g.tutor_comment && (
                                        <div className="text-xs md:text-sm text-slate-500 mt-1">💬 {g.tutor_comment}</div>
                                    )}
                                    <div className="text-xs text-slate-400 mt-1">
                                        {new Date(g.created_at).toLocaleDateString("ru-RU")}
                                    </div>
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
                    <Link href="/student/schedule" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">📅</span>
                        <span className="text-xs text-slate-500">Уроки</span>
                    </Link>
                    <Link href="/student/homework" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
                        <span className="text-lg">📚</span>
                        <span className="text-xs text-slate-500">Домашка</span>
                    </Link>
                    <Link href="/student/grades" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50">
                        <span className="text-lg">⭐</span>
                        <span className="text-xs text-indigo-700 font-medium">Оценки</span>
                    </Link>
                </div>
            </div>

        </div>
    );
}
