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
    topic: string;
    lesson_notes: string;
};

type Student = {
    id: string;
    name: string;
    email: string;
};

function getLocalToday(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function SchedulePage() {
    const router = useRouter();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [lessonData, setLessonData] = useState({ topic: "", lesson_notes: "" });
    const [viewMode, setViewMode] = useState<"month" | "list">("month");

    // Текущий месяц для навигации
    const todayStr = getLocalToday();
    const todayDate = new Date(todayStr + "T00:00:00");
    const [currentYear, setCurrentYear] = useState(todayDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth()); // 0-11

    const [form, setForm] = useState({
        student_id: "",
        topic: "",
        subject: "",
        lesson_date: todayStr,
        lesson_time: "17:00",
        duration_minutes: 60,
        zoom_link: "",
        notes: "",
    });

    useEffect(() => { checkAuth(); }, []);

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
        const { data } = await supabase.from("profiles").select("id, name, email").eq("role", "student");
        setStudents(data || []);
    };

    const addLesson = async () => {
        if (!form.subject || !form.lesson_date || !form.lesson_time) {
            alert("Заполните предмет, дату и время");
            return;
        }
        const student = students.find((s) => s.id === form.student_id);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("schedule").insert([{
            tutor_id: user?.id,
            student_id: form.student_id || null,
            student_name: student?.name || "Без ученика",
            subject: form.subject,
            topic: form.topic,
            lesson_date: form.lesson_date,
            lesson_time: form.lesson_time,
            duration_minutes: form.duration_minutes,
            zoom_link: form.zoom_link,
            notes: form.notes,
        }]);
        if (error) { alert(error.message); return; }
        setShowForm(false);
        setForm({ student_id: "", topic: "", subject: "", lesson_date: todayStr, lesson_time: "17:00", duration_minutes: 60, zoom_link: "", notes: "" });
        fetchLessons();
    };

    const updateStatus = async (id: string, status: string) => {
        const lesson = lessons.find((l) => l.id === id);
        await supabase.from("schedule").update({ status }).eq("id", id);
        if (status === "completed" && lesson?.topic) {
            await supabase.from("topics").delete()
                .eq("student_name", lesson.student_name)
                .eq("completed_at", lesson.lesson_date)
                .eq("subject", lesson.subject);
            const { data: { user: cu1 } } = await supabase.auth.getUser();
            await supabase.from("topics").insert([{
                tutor_id: cu1?.id,
                student_name: lesson.student_name,
                subject: lesson.subject,
                topic: lesson.topic,
                notes: lesson.notes || "",
                completed_at: lesson.lesson_date,
            }]);
        }
        if ((status === "cancelled" || status === "planned") && lesson) {
            await supabase.from("topics").delete()
                .eq("student_name", lesson.student_name)
                .eq("completed_at", lesson.lesson_date)
                .eq("subject", lesson.subject);
        }
        fetchLessons();
    };

    const deleteLesson = async (id: string) => {
        if (!confirm("Удалить урок?")) return;
        await supabase.from("schedule").delete().eq("id", id);
        fetchLessons();
    };

    const saveLessonInfo = async () => {
        if (!editingLesson) return;
        const { error } = await supabase.from("schedule")
            .update({ topic: lessonData.topic, lesson_notes: lessonData.lesson_notes })
            .eq("id", editingLesson.id);
        if (error) { alert(error.message); return; }
        if (lessonData.topic && editingLesson.status === "completed") {
            await supabase.from("topics").delete()
                .eq("student_name", editingLesson.student_name)
                .eq("completed_at", editingLesson.lesson_date)
                .eq("subject", editingLesson.subject);
            const { data: { user: cu2 } } = await supabase.auth.getUser();
            await supabase.from("topics").insert([{
                tutor_id: cu2?.id,
                student_name: editingLesson.student_name,
                subject: editingLesson.subject,
                topic: lessonData.topic,
                notes: lessonData.lesson_notes || "",
                completed_at: editingLesson.lesson_date,
            }]);
        }
        setEditingLesson(null);
        setLessonData({ topic: "", lesson_notes: "" });
        fetchLessons();
    };

    // Навигация по месяцам
    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    };

    // Генерация ячеек месячного календаря
    const getMonthCells = () => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1; // Пн=0
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const cells: (string | null)[] = [];
        for (let i = 0; i < offset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const y = currentYear;
            const m = String(currentMonth + 1).padStart(2, "0");
            const day = String(d).padStart(2, "0");
            cells.push(`${y}-${m}-${day}`);
        }
        return cells;
    };

    const getLessonsForDate = (dateStr: string) =>
        lessons.filter((l) => l.lesson_date === dateStr);

    const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

    const formatDate = (dateStr: string) =>
        new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

    const statusColors: Record<string, string> = {
        planned: "bg-blue-100 text-blue-700",
        completed: "bg-green-100 text-green-700",
        cancelled: "bg-red-100 text-red-700",
    };
    const statusLabels: Record<string, string> = {
        planned: "Запланировано",
        completed: "Проведено",
        cancelled: "Отменён",
    };

    const todayLessons = lessons.filter((l) => l.lesson_date === todayStr);
    const upcomingLessons = lessons.filter((l) => l.lesson_date >= todayStr && l.status !== "cancelled");

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
            {/* Шапка */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">📅 Расписание</h1>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setViewMode("month")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "month" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                            Месяц
                        </button>
                        <button onClick={() => setViewMode("list")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                            Список
                        </button>
                    </div>
                    <button onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
                        + Добавить урок
                    </button>
                </div>
            </div>

            {/* Переключатель на мобильном */}
            <div className="flex md:hidden bg-gray-100 rounded-lg p-1 mb-4">
                <button onClick={() => setViewMode("month")}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "month" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                    Месяц
                </button>
                <button onClick={() => setViewMode("list")}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                    Список
                </button>
            </div>

            {/* Сегодня */}
            {todayLessons.length > 0 && (
                <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                    <div className="font-semibold text-indigo-800 mb-3">🔔 Сегодня</div>
                    <div className="flex flex-wrap gap-3">
                        {todayLessons.map((l) => (
                            <div key={l.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                                <div>
                                    <div className="font-medium text-gray-900">{l.lesson_time.slice(0, 5)} — {l.subject}</div>
                                    <div className="text-sm text-gray-500">{l.student_name}</div>
                                </div>
                                {l.zoom_link && (
                                    <a href={l.zoom_link} target="_blank" rel="noreferrer"
                                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700">
                                        Zoom
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Месячный вид */}
            {viewMode === "month" && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
                    {/* Навигация по месяцам */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 text-xl px-2">‹</button>
                        <span className="font-semibold text-gray-900">{MONTHS_RU[currentMonth]} {currentYear}</span>
                        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 text-xl px-2">›</button>
                    </div>

                    {/* Заголовки дней */}
                    <div className="grid grid-cols-7 border-b border-gray-100">
                        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
                        ))}
                    </div>

                    {/* Ячейки */}
                    <div className="grid grid-cols-7">
                        {getMonthCells().map((dateStr, i) => {
                            if (!dateStr) return <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r border-gray-50" />;
                            const isToday = dateStr === todayStr;
                            const isPast = dateStr < todayStr;
                            const dayLessons = getLessonsForDate(dateStr);
                            const dayNum = new Date(dateStr + "T00:00:00").getDate();
                            return (
                                <div key={dateStr}
                                    className={`min-h-[80px] md:min-h-[100px] border-b border-r border-gray-50 p-1.5 md:p-2 ${isPast && !isToday ? "bg-gray-50/50" : ""}`}>
                                    <div className={`text-xs md:text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : isPast ? "text-gray-400" : "text-gray-700"}`}>
                                        {dayNum}
                                    </div>
                                    <div className="space-y-0.5">
                                        {dayLessons.map((l) => (
                                            <div key={l.id}
                                                className={`text-xs rounded px-1 py-0.5 truncate cursor-pointer ${l.status === "completed" ? "bg-green-100 text-green-700" : l.status === "cancelled" ? "bg-red-100 text-red-400 line-through" : "bg-indigo-100 text-indigo-700"}`}
                                                title={`${l.lesson_time.slice(0, 5)} ${l.subject} — ${l.student_name}`}
                                                onClick={() => {
                                                    setEditingLesson(l);
                                                    setLessonData({ topic: l.topic || "", lesson_notes: l.lesson_notes || "" });
                                                }}>
                                                <span className="hidden md:inline">{l.lesson_time.slice(0, 5)} </span>
                                                {l.subject.slice(0, 10)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Список */}
            {viewMode === "list" && (
                <div className="space-y-3 mb-6">
                    {upcomingLessons.length === 0 && (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-4xl mb-3">📅</div>
                            <div>Нет предстоящих уроков</div>
                            <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:underline text-sm">
                                Добавить первый урок
                            </button>
                        </div>
                    )}
                    {upcomingLessons.map((lesson) => (
                        <div key={lesson.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 md:gap-4">
                            <div className="text-center bg-indigo-50 rounded-xl px-3 md:px-4 py-3 min-w-[70px] md:min-w-[80px] flex-shrink-0">
                                <div className="text-xs text-indigo-500 font-medium">{formatDate(lesson.lesson_date)}</div>
                                <div className="text-lg md:text-xl font-bold text-indigo-700">{lesson.lesson_time.slice(0, 5)}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm md:text-base">{lesson.subject}</div>
                                {lesson.topic && <div className="text-xs text-indigo-600 mt-1">📖 {lesson.topic}</div>}
                                <div className="text-xs md:text-sm text-gray-500">👤 {lesson.student_name} · {lesson.duration_minutes} мин</div>
                                {lesson.notes && <div className="text-xs text-gray-400 mt-1 truncate">📝 {lesson.notes}</div>}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
                                {lesson.zoom_link && (
                                    <a href={lesson.zoom_link} target="_blank" rel="noreferrer"
                                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700">
                                        🎥 Zoom
                                    </a>
                                )}
                                <button onClick={() => { setEditingLesson(lesson); setLessonData({ topic: lesson.topic || "", lesson_notes: lesson.lesson_notes || "" }); }}
                                    className="bg-violet-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-violet-700">
                                    📝 Тема
                                </button>
                                <select value={lesson.status} onChange={(e) => updateStatus(lesson.id, e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                                    <option value="planned">Запланировано</option>
                                    <option value="completed">Проведено</option>
                                    <option value="cancelled">Отменён</option>
                                </select>
                                <button onClick={() => deleteLesson(lesson.id)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* История */}
            <div className="mt-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">История уроков</div>
                <div className="space-y-2">
                    {lessons
                        .filter((l) => l.lesson_date < todayStr || l.status === "completed")
                        .slice(-5).reverse()
                        .map((lesson) => (
                            <div key={lesson.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 opacity-70">
                                <div className="text-xs text-gray-500 min-w-[100px]">{formatDate(lesson.lesson_date)}</div>
                                <div className="text-sm font-medium text-gray-700 flex-1 truncate">{lesson.subject}</div>
                                <div className="text-xs text-gray-400 hidden md:block">{lesson.student_name}</div>
                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[lesson.status]}`}>
                                    {statusLabels[lesson.status]}
                                </span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Модалка добавления урока */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Добавить урок</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ученик</label>
                                <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                                    <option value="">Выбери ученика</option>
                                    {students.map((s) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                                <input type="text" placeholder="Математика, английский..."
                                    value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Тема урока</label>
                                <input type="text" placeholder="Треугольники, дроби, функции..."
                                    value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                                    <input type="date" value={form.lesson_date}
                                        onChange={(e) => setForm({ ...form, lesson_date: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                                    <input type="time" value={form.lesson_time}
                                        onChange={(e) => setForm({ ...form, lesson_time: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Длительность</label>
                                <select value={form.duration_minutes}
                                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                                    <option value={30}>30 минут</option>
                                    <option value={45}>45 минут</option>
                                    <option value={60}>60 минут</option>
                                    <option value={90}>90 минут</option>
                                    <option value={120}>120 минут</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка на Zoom / Meet</label>
                                <input type="url" placeholder="https://zoom.us/j/..."
                                    value={form.zoom_link} onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
                                <textarea placeholder="Дополнительные заметки..."
                                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" rows={2} />
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowForm(false)}
                                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm">Отмена</button>
                            <button onClick={addLesson}
                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">Добавить урок</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка редактирования темы */}
            {editingLesson && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Тема и заметки урока</h2>
                                <div className="text-xs text-gray-400 mt-0.5">{formatDate(editingLesson.lesson_date)} · {editingLesson.subject} · {editingLesson.student_name}</div>
                            </div>
                            <button onClick={() => setEditingLesson(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Тема урока</label>
                                <input type="text" placeholder="Треугольники, дроби, функции..."
                                    value={lessonData.topic}
                                    onChange={(e) => setLessonData({ ...lessonData, topic: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки по уроку</label>
                                <textarea placeholder="Что прошли, что задали..."
                                    value={lessonData.lesson_notes}
                                    onChange={(e) => setLessonData({ ...lessonData, lesson_notes: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" rows={4} />
                            </div>
                            <div className="flex gap-2">
                                <select value={editingLesson.status}
                                    onChange={(e) => { updateStatus(editingLesson.id, e.target.value); setEditingLesson({ ...editingLesson, status: e.target.value }); }}
                                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white">
                                    <option value="planned">Запланировано</option>
                                    <option value="completed">Проведено</option>
                                    <option value="cancelled">Отменён</option>
                                </select>
                                <button onClick={() => { deleteLesson(editingLesson.id); setEditingLesson(null); }}
                                    className="text-red-400 hover:text-red-600 border border-red-200 rounded-xl px-3 py-2.5 text-sm">
                                    Удалить
                                </button>
                            </div>
                            {editingLesson.status !== "completed" && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                                    💡 Тема появится в разделе «Темы» автоматически, когда урок будет отмечен как «Проведено»
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setEditingLesson(null)}
                                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm">Отмена</button>
                            <button onClick={saveLessonInfo}
                                className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700">Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}