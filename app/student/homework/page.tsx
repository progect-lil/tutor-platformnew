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
    student_files: string[];
    test_link: string;
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
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    const submitHomework = async (hw: Homework) => {
        const files = selectedFiles[hw.id] || [];
        setErrorMsg(null);
        setUploadingId(hw.id);

        const uploadedUrls: string[] = [];

        for (const file of files) {
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const fileName = `${hw.id}_${Date.now()}_${safeName}`;

            const { error } = await supabase.storage
                .from("homework-files")
                .upload(fileName, file);

            if (error) {
                console.error("Upload error:", error);
                setErrorMsg(`Ошибка загрузки файла "${file.name}": ${error.message}`);
                setUploadingId(null);
                return;
            }

            const { data } = supabase.storage.from("homework-files").getPublicUrl(fileName);
            uploadedUrls.push(data.publicUrl);
        }

        // Объединяем старые файлы с новыми (не затираем предыдущие)
        const existingFiles = hw.student_files || [];
        const allFiles = [...existingFiles, ...uploadedUrls];

        const { error: updateError } = await supabase
            .from("homework")
            .update({
                status: "submitted",
                student_files: allFiles,
            })
            .eq("id", hw.id);

        if (updateError) {
            console.error("Update error:", updateError);
            setErrorMsg(`Ошибка сохранения: ${updateError.message}`);
            setUploadingId(null);
            return;
        }

        setUploadingId(null);
        setSelectedFiles(prev => {
            const copy = { ...prev };
            delete copy[hw.id];
            return copy;
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchHomeworks(user.id);
    };

    const submitWithoutFile = async (id: string) => {
        await supabase.from("homework").update({ status: "submitted" }).eq("id", id);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchHomeworks(user.id);
    };

    const removeSelectedFile = (hwId: string, index: number) => {
        setSelectedFiles(prev => {
            const updated = [...(prev[hwId] || [])];
            updated.splice(index, 1);
            return { ...prev, [hwId]: updated };
        });
    };

    // Добавление новых файлов к уже выбранным (не заменяем, а добавляем)
    const handleFileChange = (hwId: string, newFiles: FileList | null) => {
        if (!newFiles) return;
        const newArr = Array.from(newFiles);
        setSelectedFiles(prev => ({
            ...prev,
            [hwId]: [...(prev[hwId] || []), ...newArr],
        }));
    };

    const filtered = filter === "all" ? homeworks : homeworks.filter(h => h.status === filter);
    const pendingCount = homeworks.filter(h => h.status === "assigned").length;

    const statusInfo: Record<string, { label: string; color: string; icon: string }> = {
        assigned: { label: "Нужно сдать", color: "bg-orange-100 text-orange-700", icon: "📝" },
        submitted: { label: "На проверке", color: "bg-blue-100 text-blue-700", icon: "⏳" },
        checked: { label: "Проверено", color: "bg-green-100 text-green-700", icon: "✅" },
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-6">

            {/* Шапка БЕЗ кнопки "Задать ДЗ" */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center gap-3">
                <button onClick={() => router.push("/student")} className="text-slate-500 hover:text-slate-800 text-sm">← Назад</button>
                <h1 className="text-lg md:text-xl font-bold text-slate-900">📚 Домашние задания</h1>
            </div>

            <div className="p-4 md:p-6 max-w-2xl mx-auto">

                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-start justify-between gap-3">
                        <span>⚠️ {errorMsg}</span>
                        <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                    </div>
                )}

                {/* Фильтры */}
                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                    {(["all", "assigned", "submitted", "checked"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
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
                                                    <span className={`text-xs ${new Date(hw.due_date) < new Date() && hw.status === "assigned" ? "text-red-500 font-medium" : "text-slate-400"}`}>
                                                        до {new Date(hw.due_date).toLocaleDateString("ru-RU")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-bold text-slate-900 text-base md:text-lg">{hw.title}</div>
                                            {hw.description && <div className="text-slate-600 text-sm mt-1.5">{hw.description}</div>}
                                        </div>
                                    </div>

                                    {/* Материал от репетитора */}
                                    {hw.file_url && (
                                        <a href={hw.file_url} target="_blank" className="text-indigo-600 text-sm underline mt-1 block">📎 Материал к заданию</a>
                                    )}

                                    {/* Ссылка на тест */}
                                    {hw.test_link && (
                                        <a href={hw.test_link} target="_blank" className="text-emerald-600 text-sm underline mt-1 block">🧪 Ссылка на тест</a>
                                    )}

                                    {/* Результат проверки */}
                                    {hw.status === "checked" && (
                                        <div className="bg-green-50 rounded-xl p-3 md:p-4 border border-green-100 mt-3">
                                            {hw.grade && (
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-sm font-medium text-green-800">Оценка:</span>
                                                    <span className="bg-green-600 text-white text-sm font-bold px-3 py-0.5 rounded-lg">{hw.grade}</span>
                                                </div>
                                            )}
                                            {hw.tutor_comment && (
                                                <div className="text-sm text-green-700">💬 <span className="font-medium">Репетитор:</span> {hw.tutor_comment}</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Уже сданные файлы ученика */}
                                    {hw.student_files && hw.student_files.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                            <div className="text-xs text-slate-500 font-medium">Твои файлы:</div>
                                            {hw.student_files.map((url, i) => (
                                                <a key={i} href={url} target="_blank" className="text-blue-600 text-sm underline block">
                                                    📎 Файл {i + 1}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Форма сдачи задания */}
                                    {hw.status === "assigned" && (
                                        <div className="mt-4 space-y-3">
                                            <label className="cursor-pointer block">
                                                <div className="border-2 border-dashed border-indigo-200 rounded-xl py-3 text-center text-sm text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                                    📎 Выбрать файлы (можно несколько)
                                                </div>
                                                <input
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => handleFileChange(hw.id, e.target.files)}
                                                />
                                            </label>

                                            {selectedFiles[hw.id]?.length > 0 && (
                                                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                                                    <div className="text-xs text-slate-500 font-medium mb-1">Выбрано файлов: {selectedFiles[hw.id].length}</div>
                                                    {selectedFiles[hw.id].map((file, i) => (
                                                        <div key={i} className="flex items-center justify-between text-sm text-slate-600">
                                                            <span className="truncate flex-1">📄 {file.name}</span>
                                                            <button onClick={() => removeSelectedFile(hw.id, i)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex flex-col md:flex-row gap-2">
                                                <button
                                                    onClick={() => submitHomework(hw)}
                                                    disabled={!selectedFiles[hw.id]?.length || uploadingId === hw.id}
                                                    className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                                                >
                                                    {uploadingId === hw.id ? "Отправка..." : `📤 Отправить файлы (${selectedFiles[hw.id]?.length || 0})`}
                                                </button>
                                                <button
                                                    onClick={() => submitWithoutFile(hw.id)}
                                                    disabled={uploadingId === hw.id}
                                                    className="text-sm text-slate-500 border border-slate-200 px-4 py-3 rounded-xl hover:bg-slate-50 whitespace-nowrap disabled:opacity-50"
                                                >
                                                    Сдать без файла
                                                </button>
                                            </div>
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

            {/* Мобильная навигация */}
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
                            <span className="absolute top-0 right-1 bg-orange-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{pendingCount}</span>
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
