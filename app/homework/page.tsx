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
        const { data } = await supabase
            .from("homework")
            .select("*")
            .order("created_at", { ascending: false });
        setHomeworks(data || []);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from("profiles").select("id, name, email").eq("role", "student");
        setStudents(data || []);
    };

    const addHomework = async () => {
        if (!form.student_id || !form.title) { alert("Выбери ученика и заполни название"); return; }
        const student = students.find(s => s.id === form.student_id);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("homework").insert([{
            tutor_id: user?.id,
            student_id: form.student_id,
            student_name: student?.name || student?.email,
            title: form.title,
            description: form.description,
            due_date: form.due_date || null,
        }]);
        if (error) { alert(error.message); return; }
        setShowForm(false);
        setForm({ student_id: "", title: "", description: "", due_date: "" });
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

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Шапка */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/tutor")} className="text-gray-500 hover:text-gray-800">← Назад</button>
                    <h1 className="text-xl font-bold text-gray-900">📚 Домашние задания</h1>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                    + Задать ДЗ
                </button>
            </div>

            <div className="p-6 max-w-4xl mx-auto">
                {/* Фильтры */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {(["all", "assigned", "submitted", "checked"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                                }`}
                        >
                            {f === "all" && `Все (${counts.all})`}
                            {f === "assigned" && `Задано (${counts.assigned})`}
                            {f === "submitted" && `Сдано ✓ (${counts.submitted})`}
                            {f === "checked" && `Проверено (${counts.checked})`}
                        </button>
                    ))}
                </div>

                {/* Алерт: сданные не проверены */}
                {counts.submitted > 0 && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-2xl">📥</span>
                        <div>
                            <div className="font-semibold text-blue-800">Ждут проверки: {counts.submitted}</div>
                            <div className="text-sm text-blue-600">Ученики сдали работы — не забудь проверить!</div>
                        </div>
                        <button onClick={() => setFilter("submitted")} className="ml-auto text-sm text-blue-700 underline">Смотреть</button>
                    </div>
                )}

                {/* Список заданий */}
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
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[hw.status]}`}>
                                                {statusLabels[hw.status]}
                                            </span>
                                            {hw.due_date && (
                                                <span className="text-xs text-gray-400">
                                                    до {new Date(hw.due_date).toLocaleDateString("ru-RU")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="font-semibold text-gray-900">{hw.title}</div>
                                        <div className="text-sm text-gray-500 mt-0.5">👤 {hw.student_name}</div>
                                        {hw.description && <div className="text-sm text-gray-600 mt-2">{hw.description}</div>}
                                        {hw.file_url && (
                                            <a href={hw.file_url} target="_blank" className="text-blue-600 text-sm underline mt-1 block">
                                                📎 Файл от ученика
                                            </a>
                                        )}
                                        {hw.grade && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="bg-green-50 text-green-700 text-sm px-3 py-1 rounded-lg font-medium">
                                                    Оценка: {hw.grade}
                                                </span>
                                                {hw.tutor_comment && (
                                                    <span className="text-sm text-gray-500">💬 {hw.tutor_comment}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        {hw.status === "submitted" && (
                                            <button
                                                onClick={() => { setCheckingId(hw.id); setCheckForm({ comment: "", grade: "" }); }}
                                                className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                                            >
                                                Проверить
                                            </button>
                                        )}
                                        <button onClick={() => deleteHomework(hw.id)} className="text-red-400 hover:text-red-600 text-sm">
                                            Удалить
                                        </button>
                                    </div>
                                </div>

                                {/* Форма проверки */}
                                {checkingId === hw.id && (
                                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                                        <div className="text-sm font-medium text-gray-700 mb-3">Проверка работы</div>
                                        <div className="flex gap-3 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Оценка (5, отлично, A...)"
                                                value={checkForm.grade}
                                                onChange={(e) => setCheckForm({ ...checkForm, grade: e.target.value })}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Комментарий для ученика..."
                                                value={checkForm.comment}
                                                onChange={(e) => setCheckForm({ ...checkForm, comment: e.target.value })}
                                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setCheckingId(null)} className="text-sm text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg">Отмена</button>
                                            <button onClick={() => checkHomework(hw.id)} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">
                                                ✓ Принять работу
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка добавления ДЗ */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Задать домашнее задание</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ученик</label>
                                <select
                                    value={form.student_id}
                                    onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                >
                                    <option value="">Выбери ученика</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name || s.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Название задания</label>
                                <input
                                    type="text"
                                    placeholder="Упражнение 5.3, Эссе на тему..."
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Описание / инструкция</label>
                                <textarea
                                    placeholder="Подробное описание что нужно сделать..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Срок сдачи</label>
                                <input
                                    type="date"
                                    value={form.due_date}
                                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Отмена</button>
                            <button onClick={addHomework} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">Задать ДЗ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
