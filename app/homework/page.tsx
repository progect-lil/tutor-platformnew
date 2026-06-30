"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Homework = {
    id: string;
    student_name: string;
    title: string;
    description: string;
    due_date: string;
    status: string;
    file_url: string;
    student_files: string[] | null; // файлы, которые сдал ученик
    test_link: string;
    tutor_comment: string;
    grade: string;
    created_at: string;
};

type Student = { id: string; name: string; email: string };

const statusColors: Record<string, string> = {
    assigned: "bg-yellow-100 text-yellow-700",
    submitted: "bg-blue-100 text-blue-700",
    checked: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
    assigned: "Задано",
    submitted: "Сдано",
    checked: "Проверено",
};

export default function HomeworkTutorPage() {
    const router = useRouter();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "assigned" | "submitted" | "checked">("all");
    const [form, setForm] = useState({
        student_id: "",
        title: "",
        description: "",
        due_date: "",
        file: null as File | null,
        test_link: "",
    });
    const [checkForm, setCheckForm] = useState({ comment: "", grade: "" });

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        await Promise.all([fetchHomeworks(), fetchStudents()]);
        setLoading(false);
    };

    const fetchHomeworks = async () => {
        const { data } = await supabase.from("homework").select("*").order("created_at", { ascending: false });
        setHomeworks(data || []);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from("profiles").select("id, name, email").eq("role", "student");
        setStudents(data || []);
    };

    const cleanFileName = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, "_").toLowerCase();

    const uploadFile = async (file: File) => {
        const fileName = `${Date.now()}_${cleanFileName(file.name)}`;
        const { error } = await supabase.storage.from("homework-files").upload(fileName, file);
        if (error) { alert("Ошибка загрузки файла: " + error.message); return ""; }
        const { data } = supabase.storage.from("homework-files").getPublicUrl(fileName);
        return data.publicUrl;
    };

    const addHomework = async () => {
        if (!form.student_id || !form.title) { alert("Выбери ученика и заполни название"); return; }
        const student = students.find(s => s.id === form.student_id);
        const { data: { user } } = await supabase.auth.getUser();

        let file_url = "";
        if (form.file) {
            file_url = await uploadFile(form.file);
        }

        const { error } = await supabase.from("homework").insert([{
            tutor_id: user?.id,
            student_id: form.student_id,
            student_name: student?.name || student?.email,
            title: form.title,
            description: form.description,
            due_date: form.due_date || null,
            file_url,
            test_link: form.test_link || "",
            status: "assigned",
            created_at: new Date().toISOString(),
        }]);
        if (error) { alert(error.message); return; }

        setShowForm(false);
        setForm({ student_id: "", title: "", description: "", due_date: "", file: null, test_link: "" });
        fetchHomeworks();
    };

    const checkHomework = async (id: string) => {
        const { error } = await supabase.from("homework").update({
            status: "checked",
            tutor_comment: checkForm.comment,
            grade: checkForm.grade,
        }).eq("id", id);
        if (error) { alert(error.message); return; }
        setCheckingId(null);
        setCheckForm({ comment: "", grade: "" });
        fetchHomeworks();
    };

    const deleteHomework = async (id: string) => {
        if (!confirm("Удалить задание?")) return;
        await supabase.from("homework").delete().eq("id", id);
        fetchHomeworks();
    };

    const filtered = filter === "all" ? homeworks : homeworks.filter(h => h.status === filter);
    const counts = {
        all: homeworks.length,
        assigned: homeworks.filter(h => h.status === "assigned").length,
        submitted: homeworks.filter(h => h.status === "submitted").length,
        checked: homeworks.filter(h => h.status === "checked").length,
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">

            {/* Шапка */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">📚 Домашние задания</h1>
                <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
                    + Задать ДЗ
                </button>
            </div>

            {/* Фильтры */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {(["all", "assigned", "submitted", "checked"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
                        {f === "all" && `Все (${counts.all})`}
                        {f === "assigned" && `Задано (${counts.assigned})`}
                        {f === "submitted" && `Сдано ✓ (${counts.submitted})`}
                        {f === "checked" && `Проверено (${counts.checked})`}
                    </button>
                ))}
            </div>

            {/* Список домашек */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">📚</div>
                    <div>Нет заданий</div>
                    <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:underline text-sm">Задать первое ДЗ</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(hw => (
                        <div key={hw.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-4 flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[hw.status]}`}>{statusLabels[hw.status]}</span>
                                        {hw.due_date && <span className="text-xs text-gray-400">до {new Date(hw.due_date).toLocaleDateString("ru-RU")}</span>}
                                    </div>
                                    <div className="font-semibold text-gray-900">{hw.title}</div>
                                    <div className="text-sm text-gray-500 mt-0.5">👤 {hw.student_name}</div>
                                    {hw.description && <div className="text-sm text-gray-600 mt-1">{hw.description}</div>}

                                    {/* Файл задания от репетитора */}
                                    {hw.file_url && (
                                        <a href={hw.file_url} target="_blank" className="text-blue-600 text-sm underline mt-1 block">📎 Файл задания</a>
                                    )}
                                    {hw.test_link && (
                                        <a href={hw.test_link} target="_blank" className="text-blue-600 text-sm underline mt-1 block">🔗 Тест</a>
                                    )}

                                    {/* Файлы, которые сдал ученик */}
                                    {hw.student_files && hw.student_files.length > 0 && (
                                        <div className="mt-2 bg-indigo-50 rounded-xl p-3 space-y-1">
                                            <div className="text-xs text-indigo-600 font-medium mb-1">📥 Файлы ученика ({hw.student_files.length}):</div>
                                            {hw.student_files.map((url, i) => (
                                                <a key={i} href={url} target="_blank" className="text-indigo-700 text-sm underline block hover:text-indigo-900">
                                                    📄 Файл {i + 1}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {hw.grade && (
                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                            <span className="bg-green-50 text-green-700 text-sm px-3 py-1 rounded-lg font-medium">Оценка: {hw.grade}</span>
                                            {hw.tutor_comment && <span className="text-sm text-gray-500">💬 {hw.tutor_comment}</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                                    {hw.status === "submitted" && (
                                        <button onClick={() => { setCheckingId(hw.id); setCheckForm({ comment: "", grade: "" }); }}
                                            className="bg-indigo-600 text-white text-xs md:text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                                            Проверить
                                        </button>
                                    )}
                                    <button onClick={() => deleteHomework(hw.id)} className="text-red-400 hover:text-red-600 text-sm">Удалить</button>
                                </div>
                            </div>

                            {checkingId === hw.id && (
                                <div className="border-t border-gray-100 bg-gray-50 p-4">
                                    <div className="text-sm font-medium text-gray-700 mb-3">Проверка работы</div>
                                    <div className="flex flex-col md:flex-row gap-3 mb-3">
                                        <input type="text" placeholder="Оценка" value={checkForm.grade}
                                            onChange={(e) => setCheckForm({ ...checkForm, grade: e.target.value })}
                                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:w-40" />
                                        <input type="text" placeholder="Комментарий" value={checkForm.comment}
                                            onChange={(e) => setCheckForm({ ...checkForm, comment: e.target.value })}
                                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCheckingId(null)} className="text-sm text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg">Отмена</button>
                                        <button onClick={() => checkHomework(hw.id)} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">✓ Принять</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Модалка добавления */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Задать домашнее задание</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ученик</label>
                                <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                                    <option value="">Выбери ученика</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Название задания</label>
                                <input type="text" placeholder="Упражнение 5.3..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                                <textarea placeholder="Что нужно сделать..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" rows={3} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Срок сдачи</label>
                                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Файл</label>
                                <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка на тест</label>
                                <input type="url" placeholder="https://..." value={form.test_link} onChange={(e) => setForm({ ...form, test_link: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm">Отмена</button>
                            <button onClick={addHomework} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">Задать ДЗ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
