"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Homework = {
    id: string;
    title: string;
    description: string;
    due_date: string;
    status: string;
    file_url: string;
    tutor_comment: string;
    grade: string;
    created_at: string;
};

export default function StudentHomeworkPage() {
    const router = useRouter();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "assigned" | "submitted" | "checked">("all");

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        fetchHomeworks(user.id);
    };

    const fetchHomeworks = async (userId: string) => {
        const { data } = await supabase
            .from("homework")
            .select("*")
            .eq("student_id", userId)
            .order("created_at", { ascending: false });
        setHomeworks(data || []);
        setLoading(false);
    };

    const submitHomework = async (hw: Homework, file: File) => {
        setUploadingId(hw.id);
        const fileName = `${hw.id}_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from("homework-files")
            .upload(fileName, file);

        if (uploadError) {
            await supabase.from("homework").update({ status: "submitted" }).eq("id", hw.id);
            setUploadingId(null);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) fetchHomeworks(user.id);
            return;
        }

        const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/homework-files/${fileName}`;
        await supabase.from("homework").update({ status: "submitted", file_url: fileUrl }).eq("id", hw.id);
        setUploadingId(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchHomeworks(user.id);
    };

    const submitWithoutFile = async (id: string) => {
        await supabase.from("homework").update({ status: "submitted" }).eq("id", id);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchHomeworks(user.id);
    };

    const filtered = filter === "all" ? homeworks : homeworks.filter(h => h.status === filter);
    const pendingCount = homeworks.filter(h => h.status === "assigned").length;

    const statusInfo: Record<string, { label: string; color: string; icon: string }> = {
        assigned: { label: "Нужно сдать", color: "bg-orange-100 text-orange-700", icon: "📝" },
        submitted: { label: "На проверке", color: "bg-blue-100 text-blue-700", icon: "⏳" },
        checked: { label: "Проверено", color: "bg-green-100 text-green-700", icon: "✅" },
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">

            {/* Шапка */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center gap-3">
                <button onClick={() => router.push("/student")} className="text-slate-500 hover:text-slate-800 text-sm">← Назад</button>
                <h1 className="text-lg md:text-xl font-bold text-slate-900">📚 Домашние задания</h1>
            </div>

            <div className="p-4 md:p-6 max-w-2xl mx-auto">

                {/* Фильтры — скролл на мобиле */}
                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                    {(["all", "assigned", "submitted", "checked"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                                filter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                            }`}
                        >
                            {f === "all" && `Все (${homeworks.length})`}
                            {f === "assigned" && `Сдать (${homeworks.filter(h => h.status === "assigned").length})`}
                            {f === "submitted" && `На проверке (${homeworks.filter(h => h.status === "submitted").length})`}
                            {f === "checked" && `Проверено (${homeworks.filter(h => h.status === "checked").length})`}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <div className="text-5xl mb-4">📚</div>
                        <div className="text-sm">Заданий нет</div>
                    </div>
                ) : (
                    <div className="space-y-3 md:space-y-4">
                        {filtered.map(hw => (
                            <div key={hw.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-4 md:p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo[hw.status]?.color}`}>
                                                    {statusInfo[hw.status]?.icon} {statusInfo[hw.status]?.label}
                                                </span>
                                                {hw.due_date && (
                                                    <span className={`text-xs ${
                                                        new Date(hw.due_date) < new Date() && hw.status === "assigned"
                                                            ? "text-red-500 font-medium"
                                                            : "text-slate-400"
                                                    }`}>
                                                        до {new Date(hw.due_date).toLocaleDateString("ru-RU")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-bold text-slate-900 text-base md:text-lg">{hw.title}</div>
                                            {hw.description && (
                                                <div className="text-slate-600 text-sm mt-1.5">{hw.description}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Оценка */}
                                    {hw.status === "checked" && (
                                        <div className="bg-green-50 rounded-xl p-3 md:p-4 border border-green-100">
                                            {hw.grade && (
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-sm font-medium text-green-800">Оценка:</span>
                                                    <span className="bg-green-600 text-white text-sm font-bold px-3 py-0.5 rounded-lg">{hw.grade}</span>
                                                </div>
                                            )}
                                            {hw.tutor_comment && (
                                                <div className="text-sm text-green-700">
                                                    💬 <span className="font-medium">Репетитор:</span> {hw.tutor_comment}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hw.file_url && (
                                        <a href={hw.file_url} target="_blank" className="mt-3 text-sm text-blue-600 underline block">
                                            📎 Твой файл
                                        </a>
                                    )}

                                    {/* Кнопки сдать */}
                                    {hw.status === "assigned" && (
                                        <div className="mt-4 flex flex-col md:flex-row gap-2">
                                            <label className={`cursor-pointer flex-1 ${uploadingId === hw.id ? "opacity-50 pointer-events-none" : ""}`}>
                                                <div className="border-2 border-dashed border-indigo-200 rounded-xl py-3 text-center text-sm text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                                    {uploadingId === hw.id ? "Загрузка..." : "📎 Прикрепить файл и сдать"}
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) submitHomework(hw, file);
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={() => submitWithoutFile(hw.id)}
                                                className="text-sm text-slate-500 border border-slate-200 px-4 py-3 rounded-xl hover:bg-slate-50 whitespace-nowrap"
                                            >
                                                Сдать без файла
                                            </button>
                                        </div>
                                    )}

                                    {hw.status === "submitted" && (
                                        <div className="mt-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-700 text-center">
                                            ⏳ Работа отправлена, ждём проверки репетитора
                                        </div>
                                    )}
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
                    <Link href="/student/homework" className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 relative">
                        <span className="text-lg">📚</span>
                        <span className="text-xs text-indigo-700 font-medium">Домашка</span>
                        {pendingCount > 0 && (
                            <span className="absolute top-0 right-1 bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {pendingCount}
                            </span>
                        )}
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
