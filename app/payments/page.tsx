"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Subscription = {
    id: string;
    student_id: string;
    student_name: string;
    price_per_lesson: number;
    lessons_count: number;
    total_amount: number;
    date_from: string;
    date_to: string;
    status: "pending" | "paid" | "cancelled";
    paid_at: string | null;
    notes: string;
    created_at: string;
    lessons?: ScheduledLesson[];
};

type ScheduledLesson = {
    id?: string;
    lesson_date: string;
    lesson_time: string;
    subject: string;
    duration_minutes: number;
};

type Student = { id: string; name: string; email: string };

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

// Получаем локальную дату без сдвига UTC
function getLocalToday(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

function formatDateFull(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

function getDays(from: string): string[] {
    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
        days.push(addDays(from, i));
    }
    return days;
}

export default function PaymentsPage() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");

    const today = getLocalToday();
    const twoWeeksLater = addDays(today, 13);

    const [form, setForm] = useState({
        student_id: "",
        price_per_lesson: "",
        subject: "",
        date_from: today,
        date_to: twoWeeksLater,
        notes: "",
    });

    const [selectedLessons, setSelectedLessons] = useState<Record<string, { time: string; duration: number }>>({});

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        await Promise.all([fetchSubscriptions(), fetchStudents()]);
        setLoading(false);
    };

    const fetchSubscriptions = async () => {
        const { data: subs } = await supabase
            .from("subscriptions")
            .select("*")
            .order("created_at", { ascending: false });

        if (!subs) { setSubscriptions([]); return; }

        const withLessons = await Promise.all(subs.map(async (sub) => {
            const { data: lessons } = await supabase
                .from("schedule")
                .select("id, lesson_date, lesson_time, subject, duration_minutes")
                .eq("subscription_id", sub.id)
                .order("lesson_date");
            return { ...sub, lessons: lessons || [] };
        }));

        setSubscriptions(withLessons);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from("profiles").select("id, name, email").eq("role", "student");
        setStudents(data || []);
    };

    const toggleDay = (date: string) => {
        setSelectedLessons(prev => {
            const next = { ...prev };
            if (next[date]) {
                delete next[date];
            } else {
                next[date] = { time: "17:00", duration: 60 };
            }
            return next;
        });
    };

    const updateLesson = (date: string, field: "time" | "duration", value: string | number) => {
        setSelectedLessons(prev => ({
            ...prev,
            [date]: { ...prev[date], [field]: value },
        }));
    };

    const createSubscription = async () => {
        const lessonDates = Object.keys(selectedLessons);
        if (!form.student_id || !form.price_per_lesson || !form.subject) {
            alert("Выбери ученика, предмет и цену за урок");
            return;
        }
        if (lessonDates.length === 0) {
            alert("Выбери хотя бы один день для занятий");
            return;
        }

        const student = students.find(s => s.id === form.student_id);
        const { data: { user } } = await supabase.auth.getUser();

        const pricePerLesson = Number(form.price_per_lesson);
        const totalAmount = lessonDates.length * pricePerLesson;

        const { data: sub, error: subError } = await supabase
            .from("subscriptions")
            .insert([{
                tutor_id: user?.id,
                student_id: form.student_id,
                student_name: student?.name || student?.email,
                price_per_lesson: pricePerLesson,
                lessons_count: lessonDates.length,
                total_amount: totalAmount,
                date_from: form.date_from,
                date_to: form.date_to,
                notes: form.notes,
                status: "pending",
            }])
            .select()
            .single();

        if (subError || !sub) { alert(subError?.message); return; }

        const lessonRows = lessonDates.map(date => ({
            tutor_id: user?.id,
            student_id: form.student_id,
            student_name: student?.name || student?.email,
            subject: form.subject,
            lesson_date: date,
            lesson_time: selectedLessons[date].time,
            duration_minutes: selectedLessons[date].duration,
            status: "planned",
            subscription_id: sub.id,
            price: pricePerLesson,
        }));

        const { error: lessonsError } = await supabase.from("schedule").insert(lessonRows);
        if (lessonsError) { alert(lessonsError.message); return; }

        setShowForm(false);
        setForm({ student_id: "", price_per_lesson: "", subject: "", date_from: today, date_to: twoWeeksLater, notes: "" });
        setSelectedLessons({});
        fetchSubscriptions();
    };

    const markPaid = async (id: string) => {
        await supabase
            .from("subscriptions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", id);
        fetchSubscriptions();
    };

    const cancelSubscription = async (id: string) => {
        if (!confirm("Отменить абонемент?")) return;
        await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id);
        fetchSubscriptions();
    };

    const filtered = filter === "all"
        ? subscriptions
        : subscriptions.filter(s => s.status === filter);

    const totalPaid = subscriptions.filter(s => s.status === "paid").reduce((sum, s) => sum + s.total_amount, 0);
    const totalPending = subscriptions.filter(s => s.status === "pending").reduce((sum, s) => sum + s.total_amount, 0);

    const days = getDays(form.date_from);

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">💰 Абонементы</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                    + Создать абонемент
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-3 md:p-4">
                    <div className="text-xs md:text-sm text-green-600 font-medium">Получено</div>
                    <div className="text-lg md:text-2xl font-bold text-green-700 mt-1">{totalPaid.toLocaleString()} ₽</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 md:p-4">
                    <div className="text-xs md:text-sm text-orange-600 font-medium">Ожидается</div>
                    <div className="text-lg md:text-2xl font-bold text-orange-700 mt-1">{totalPending.toLocaleString()} ₽</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-3 md:p-4">
                    <div className="text-xs md:text-sm text-gray-500 font-medium">Абонементов</div>
                    <div className="text-lg md:text-2xl font-bold text-gray-800 mt-1">{subscriptions.length}</div>
                </div>
            </div>

            {totalPending > 0 && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-orange-800 text-sm">Ожидают оплаты</div>
                        <div className="text-xs text-orange-600 truncate">
                            {subscriptions.filter(s => s.status === "pending").map(s => s.student_name).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                        </div>
                    </div>
                    <button onClick={() => setFilter("pending")} className="text-sm text-orange-700 underline flex-shrink-0">Показать</button>
                </div>
            )}

            <div className="flex gap-2 mb-4">
                {(["all", "pending", "paid"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
                        {f === "all" && "Все"}
                        {f === "pending" && `Ожидается (${subscriptions.filter(s => s.status === "pending").length})`}
                        {f === "paid" && "Оплачено"}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">🗓️</div>
                    <div>Нет абонементов</div>
                    <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:underline text-sm">Создать первый абонемент</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(sub => (
                        <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div
                                className="px-4 md:px-5 py-4 flex items-center gap-3 md:gap-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sub.status === "paid" ? "bg-green-500" : sub.status === "cancelled" ? "bg-gray-300" : "bg-orange-400"}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 text-sm">{sub.student_name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {formatDate(sub.date_from)} — {formatDate(sub.date_to)} · {sub.lessons_count} {sub.lessons_count === 1 ? "урок" : sub.lessons_count < 5 ? "урока" : "уроков"} · {sub.price_per_lesson.toLocaleString()} ₽/урок
                                    </div>
                                </div>
                                <div className="font-bold text-gray-900 text-base flex-shrink-0">{sub.total_amount.toLocaleString()} ₽</div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {sub.status === "pending" && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); markPaid(sub.id); }}
                                            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700"
                                        >
                                            ✓ Оплачено
                                        </button>
                                    )}
                                    {sub.status === "paid" && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1.5 rounded-lg font-medium">Оплачено</span>
                                    )}
                                    {sub.status === "cancelled" && (
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1.5 rounded-lg">Отменён</span>
                                    )}
                                    <span className="text-gray-400 text-sm">{expandedId === sub.id ? "▲" : "▼"}</span>
                                </div>
                            </div>

                            {expandedId === sub.id && (
                                <div className="border-t border-gray-100 px-4 md:px-5 py-4">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Занятия в абонементе</div>
                                    {sub.lessons && sub.lessons.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {sub.lessons.map((lesson, i) => {
                                                const d = new Date(lesson.lesson_date + "T00:00:00");
                                                return (
                                                    <div key={lesson.id || i} className="bg-indigo-50 rounded-xl p-3">
                                                        <div className="text-xs font-medium text-indigo-500">{DAYS_RU[d.getDay()]}, {formatDate(lesson.lesson_date)}</div>
                                                        <div className="text-sm font-bold text-indigo-800 mt-1">{lesson.lesson_time.slice(0, 5)}</div>
                                                        <div className="text-xs text-indigo-600">{lesson.duration_minutes} мин</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400">Уроки не найдены</div>
                                    )}

                                    {sub.notes && (
                                        <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">📝 {sub.notes}</div>
                                    )}

                                    {sub.status === "paid" && sub.paid_at && (
                                        <div className="mt-3 text-xs text-green-600">✓ Оплачено {new Date(sub.paid_at).toLocaleDateString("ru-RU")}</div>
                                    )}

                                    {sub.status === "pending" && (
                                        <button
                                            onClick={() => cancelSubscription(sub.id)}
                                            className="mt-3 text-xs text-red-400 hover:text-red-600"
                                        >
                                            Отменить абонемент
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-bold text-gray-900">Новый абонемент</h2>
                            <button onClick={() => { setShowForm(false); setSelectedLessons({}); }} className="text-gray-400 text-xl">✕</button>
                        </div>

                        <div className="p-5 space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ученик</label>
                                    <select
                                        value={form.student_id}
                                        onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    >
                                        <option value="">Выбери ученика</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                                    <input
                                        type="text"
                                        placeholder="Математика..."
                                        value={form.subject}
                                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Цена за урок (₽)</label>
                                    <input
                                        type="number"
                                        placeholder="1500"
                                        value={form.price_per_lesson}
                                        onChange={(e) => setForm({ ...form, price_per_lesson: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Начало абонемента</label>
                                    <input
                                        type="date"
                                        value={form.date_from}
                                        onChange={(e) => {
                                            const from = e.target.value;
                                            const to = addDays(from, 13);
                                            setForm({ ...form, date_from: from, date_to: to });
                                            setSelectedLessons({});
                                        }}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                    />
                                </div>
                            </div>

                            {Object.keys(selectedLessons).length > 0 && form.price_per_lesson && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                                    <div className="text-sm text-indigo-700">
                                        {Object.keys(selectedLessons).length} {Object.keys(selectedLessons).length === 1 ? "урок" : Object.keys(selectedLessons).length < 5 ? "урока" : "уроков"} × {Number(form.price_per_lesson).toLocaleString()} ₽
                                    </div>
                                    <div className="text-base font-bold text-indigo-800">
                                        = {(Object.keys(selectedLessons).length * Number(form.price_per_lesson)).toLocaleString()} ₽
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Выбери дни занятий
                                    <span className="text-gray-400 font-normal ml-2">{formatDateFull(form.date_from)} — {formatDateFull(form.date_to)}</span>
                                </label>
                                {/* Заголовки дней недели: Пн — Вс */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
                                        <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1 mb-3">
                                    {(() => {
                                        const firstDay = new Date(form.date_from + "T00:00:00").getDay();
                                        // getDay(): 0=Вс,1=Пн,...,6=Сб
                                        // Нам нужен офсет от Пн: Пн=0, Вт=1, ..., Вс=6
                                        const offset = firstDay === 0 ? 6 : firstDay - 1;
                                        const cells = [];
                                        for (let i = 0; i < offset; i++) {
                                            cells.push(<div key={`empty-${i}`} />);
                                        }
                                        days.forEach(date => {
                                            const d = new Date(date + "T00:00:00");
                                            const isSelected = !!selectedLessons[date];
                                            cells.push(
                                                <button
                                                    key={date}
                                                    onClick={() => toggleDay(date)}
                                                    className={`rounded-xl py-2 text-sm font-medium transition-all ${isSelected
                                                        ? "bg-indigo-600 text-white shadow-md"
                                                        : "bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                                                        }`}
                                                >
                                                    {d.getDate()}
                                                </button>
                                            );
                                        });
                                        return cells;
                                    })()}
                                </div>

                                {Object.keys(selectedLessons).length > 0 && (
                                    <div className="space-y-2 mt-3">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Время занятий</div>
                                        {Object.entries(selectedLessons)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([date, lesson]) => {
                                                const d = new Date(date + "T00:00:00");
                                                return (
                                                    <div key={date} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                                        <div className="text-sm text-gray-700 w-28 flex-shrink-0">
                                                            {DAYS_RU[d.getDay()]}, {formatDate(date)}
                                                        </div>
                                                        <input
                                                            type="time"
                                                            value={lesson.time}
                                                            onChange={(e) => updateLesson(date, "time", e.target.value)}
                                                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                                                        />
                                                        <select
                                                            value={lesson.duration}
                                                            onChange={(e) => updateLesson(date, "duration", Number(e.target.value))}
                                                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1"
                                                        >
                                                            <option value={30}>30 мин</option>
                                                            <option value={45}>45 мин</option>
                                                            <option value={60}>60 мин</option>
                                                            <option value={90}>90 мин</option>
                                                            <option value={120}>120 мин</option>
                                                        </select>
                                                        <button onClick={() => toggleDay(date)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки (необязательно)</label>
                                <textarea
                                    placeholder="Дополнительная информация..."
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
                            <button
                                onClick={() => { setShowForm(false); setSelectedLessons({}); }}
                                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={createSubscription}
                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700"
                            >
                                Создать абонемент
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
