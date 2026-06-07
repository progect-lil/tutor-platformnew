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
    status: string;
    notes: string;
};

type Student = {
    id: string;
    name: string;
    email: string;
};

export default function SchedulePage() {
    const router = useRouter();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [viewMode, setViewMode] = useState<"week" | "list">("week");

    // форма
    const [form, setForm] = useState({
        student_id: "",
        student_name: "",
        subject: "",
        lesson_date: new Date().toISOString().split("T")[0],
        lesson_time: "17:00",
        duration_minutes: 60,
        zoom_link: "",
        notes: "",
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        await Promise.all([fetchLessons(), fetchStudents()]);
        setLoading(false);
    };

    const fetchLessons = async () => {
        const { data } = await supabase
            .from("schedule")
            .select("*")
            .order("lesson_date", { ascending: true })
            .order("lesson_time", { ascending: true });
        setLessons(data || []);
    };

    const fetchStudents = async () => {
        const { data } = await supabase
            .from("profiles")
            .select("id, name, email")
            .eq("role", "student");
        setStudents(data || []);
    };

    const addLesson = async () => {
        if (!form.subject || !form.lesson_date || !form.lesson_time) {
            alert("Заполни предмет, дату и время");
            return;
        }

        const student = students.find(s => s.id === form.student_id);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from("schedule").insert([{
            tutor_id: user?.id,
            student_id: form.student_id || null,
            student_name: student?.name || form.student_name || "Без ученика",
            subject: form.subject,
            lesson_date: form.lesson_date,
            lesson_time: form.lesson_time,
            duration_minutes: form.duration_minutes,
            zoom_link: form.zoom_link,
            notes: form.notes,
        }]);

        if (error) { alert(error.message); return; }
        setShowForm(false);
        setForm({ ...form, student_id: "", subject: "", zoom_link: "", notes: "" });
        fetchLessons();
    };

    const updateStatus = async (id: string, status: string) => {
        await supabase.from("schedule").update({ status }).eq("id", id);
        fetchLessons();
    };

    const deleteLesson = async (id: string) => {
        if (!confirm("Удалить урок?")) return;
        await supabase.from("schedule").delete().eq("id", id);
        fetchLessons();
    };

    const getWeekDays = () => {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    };

    const getDayLabel = (date: Date) => {
        const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        return days[date.getDay()];
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    };

    const getLessonsForDate = (date: Date) => {
        const dateStr = date.toISOString().split("T")[0];
        return lessons.filter(l => l.lesson_date === dateStr);
    };

    const statusColors: Record<string, string> = {
        planned: "bg-blue-100 text-blue-700",
        completed: "bg-green-100 text-green-700",
        cancelled: "bg-red-100 text-red-700",
    };

    const statusLabels: Record<string, string> = {
        planned: "Запланирован",
        completed: "Проведён",
        cancelled: "Отменён",
    };

    const upcomingLessons = lessons.filter(l => {
        const today = new Date().toISOString().split("T")[0];
        return l.lesson_date >= today && l.status !== "cancelled";
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const todayLessons = lessons.filter(l => l.lesson_date === todayStr);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-gray-400 text-lg">Загрузка...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Шапка */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/tutor")}
                        className="text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        ← Назад
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">📅 Расписание</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("week")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "week" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                        >
                            Неделя
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
                        >
                            Список
                        </button>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + Добавить урок
                    </button>
                </div>
            </div>

            <div className="p-6 max-w-5xl mx-auto">
                {/* Сегодня */}
                {todayLessons.length > 0 && (
                    <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                        <div className="font-semibold text-indigo-800 mb-3">🔔 Сегодня</div>
                        <div className="flex flex-wrap gap-3">
                            {todayLessons.map(l => (
                                <div key={l.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                                    <div>
                                        <div className="font-medium text-gray-900">{l.lesson_time.slice(0, 5)} — {l.subject}</div>
                                        <div className="text-sm text-gray-500">{l.student_name}</div>
                                    </div>
                                    {l.zoom_link && (
                                        <a href={l.zoom_link} target="_blank" className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700">
                                            Zoom
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Вид: неделя */}
                {viewMode === "week" && (
                    <div className="grid grid-cols-7 gap-2 mb-6">
                        {getWeekDays().map((day, i) => {
                            const isToday = day.toISOString().split("T")[0] === todayStr;
                            const dayLessons = getLessonsForDate(day);
                            return (
                                <div
                                    key={i}
                                    className={`rounded-2xl p-3 min-h-[120px] ${isToday ? "bg-indigo-600 text-white" : "bg-white"} shadow-sm`}
                                >
                                    <div className={`text-xs font-medium mb-1 ${isToday ? "text-indigo-200" : "text-gray-400"}`}>
                                        {getDayLabel(day)}
                                    </div>
                                    <div className={`text-lg font-bold mb-2 ${isToday ? "text-white" : "text-gray-900"}`}>
                                        {day.getDate()}
                                    </div>
                                    {dayLessons.map(l => (
                                        <div
                                            key={l.id}
                                            className={`text-xs rounded-lg px-2 py-1.5 mb-1 cursor-pointer ${isToday ? "bg-indigo-500" : "bg-indigo-50 text-indigo-700"}`}
                                            onClick={() => setSelectedDate(day.toISOString().split("T")[0])}
                                        >
                                            {l.lesson_time.slice(0, 5)} {l.subject}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Вид: список */}
                {viewMode === "list" && (
                    <div className="space-y-3">
                        {upcomingLessons.length === 0 && (
                            <div className="text-center py-16 text-gray-400">
                                <div className="text-4xl mb-3">📅</div>
                                <div>Нет предстоящих уроков</div>
                                <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:underline text-sm">
                                    Добавить первый урок
                                </button>
                            </div>
                        )}
                        {upcomingLessons.map(lesson => (
                            <div key={lesson.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                                <div className="text-center bg-indigo-50 rounded-xl px-4 py-3 min-w-[80px]">
                                    <div className="text-xs text-indigo-500 font-medium">{formatDate(lesson.lesson_date)}</div>
                                    <div className="text-xl font-bold text-indigo-700">{lesson.lesson_time.slice(0, 5)}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">{lesson.subject}</div>
                                    <div className="text-sm text-gray-500">👤 {lesson.student_name} · {lesson.duration_minutes} мин</div>
                                    {lesson.notes && <div className="text-sm text-gray-400 mt-1">📝 {lesson.notes}</div>}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {lesson.zoom_link && (
                                        <a href={lesson.zoom_link} target="_blank" className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700">
                                            🎥 Zoom
                                        </a>
                                    )}
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[lesson.status]}`}>
                                        {statusLabels[lesson.status]}
                                    </span>
                                    <select
                                        value={lesson.status}
                                        onChange={(e) => updateStatus(lesson.id, e.target.value)}
                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                                    >
                                        <option value="planned">Запланирован</option>
                                        <option value="completed">Проведён</option>
                                        <option value="cancelled">Отменён</option>
                                    </select>
                                    <button
                                        onClick={() => deleteLesson(lesson.id)}
                                        className="text-red-400 hover:text-red-600 text-sm px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Прошедшие уроки */}
                <div className="mt-8">
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">История уроков</div>
                    <div className="space-y-2">
                        {lessons.filter(l => l.lesson_date < todayStr || l.status === "completed").slice(-5).reverse().map(lesson => (
                            <div key={lesson.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 opacity-70">
                                <div className="text-sm text-gray-500 min-w-[120px]">{formatDate(lesson.lesson_date)}</div>
                                <div className="text-sm font-medium text-gray-700">{lesson.subject}</div>
                                <div className="text-sm text-gray-400">{lesson.student_name}</div>
                                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${statusColors[lesson.status]}`}>
                                    {statusLabels[lesson.status]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Модалка добавления урока */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Добавить урок</h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                                <input
                                    type="text"
                                    placeholder="Математика, Английский..."
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                                    <input
                                        type="date"
                                        value={form.lesson_date}
                                        onChange={(e) => setForm({ ...form, lesson_date: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                                    <input
                                        type="time"
                                        value={form.lesson_time}
                                        onChange={(e) => setForm({ ...form, lesson_time: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (мин)</label>
                                <select
                                    value={form.duration_minutes}
                                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                >
                                    <option value={30}>30 минут</option>
                                    <option value={45}>45 минут</option>
                                    <option value={60}>60 минут</option>
                                    <option value={90}>90 минут</option>
                                    <option value={120}>120 минут</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка на Zoom / Meet</label>
                                <input
                                    type="url"
                                    placeholder="https://zoom.us/j/..."
                                    value={form.zoom_link}
                                    onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
                                <textarea
                                    placeholder="Тема урока, что повторить..."
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={addLesson}
                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700"
                            >
                                Добавить урок
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
