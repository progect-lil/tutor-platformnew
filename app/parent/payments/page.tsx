"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Subscription = {
    id: string;
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
    id: string;
    lesson_date: string;
    lesson_time: string;
    subject: string;
    duration_minutes: number;
    status: string;
};

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

export default function ParentPaymentsPage() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, child_id, role")
            .eq("id", user.id)
            .single();

        if (!profile) { setLoading(false); return; }

        if (profile.role === "student") {
            // Если сам ученик заходит — показываем его абонементы
            await fetchSubscriptions([profile.id]);
        } else if (profile.role === "parent") {
            if (profile.child_id) {
                // child_id заполнен — используем его
                await fetchSubscriptions([profile.child_id]);
            } else {
                // child_id пустой — ищем детей у которых parent_id = user.id
                const { data: children } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("parent_id", user.id)
                    .eq("role", "student");

                if (children && children.length > 0) {
                    await fetchSubscriptions(children.map((c: { id: string }) => c.id));
                }
            }
        }

        setLoading(false);
    };

    const fetchSubscriptions = async (studentIds: string[]) => {
        const { data: subs } = await supabase
            .from("subscriptions")
            .select("*")
            .in("student_id", studentIds)
            .neq("status", "cancelled")
            .order("created_at", { ascending: false });

        if (!subs) { setSubscriptions([]); return; }

        const withLessons = await Promise.all(subs.map(async (sub) => {
            const { data: lessons } = await supabase
                .from("schedule")
                .select("id, lesson_date, lesson_time, subject, duration_minutes, status")
                .eq("subscription_id", sub.id)
                .order("lesson_date");
            return { ...sub, lessons: lessons || [] };
        }));

        setSubscriptions(withLessons);
    };

    const totalPending = subscriptions.filter(s => s.status === "pending").reduce((sum, s) => sum + s.total_amount, 0);
    const totalPaid = subscriptions.filter(s => s.status === "paid").reduce((sum, s) => sum + s.total_amount, 0);

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-6">

            {/* Шапка */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">💰 Оплата занятий</h1>

            {/* Итог */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <div className="text-sm text-green-600 font-medium">Оплачено</div>
                    <div className="text-2xl font-bold text-green-700 mt-1">{totalPaid.toLocaleString()} ₽</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <div className="text-sm text-orange-600 font-medium">Ожидает оплаты</div>
                    <div className="text-2xl font-bold text-orange-700 mt-1">{totalPending.toLocaleString()} ₽</div>
                </div>
            </div>

            {/* Предупреждение о долге */}
            {totalPending > 0 && (
                <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">💳</span>
                    <div>
                        <div className="font-semibold text-red-800 text-sm">Задолженность: {totalPending.toLocaleString()} ₽</div>
                        <div className="text-xs text-red-600 mt-0.5">Пожалуйста, оплатите занятия репетитору</div>
                    </div>
                </div>
            )}

            {/* Список абонементов */}
            {subscriptions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">🗓️</div>
                    <div>Нет активных абонементов</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {subscriptions.map(sub => {
                        const completedCount = sub.lessons?.filter(l => l.status === "completed").length || 0;
                        const totalCount = sub.lessons?.length || 0;
                        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                            <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                {/* Шапка карточки */}
                                <div
                                    className="px-4 md:px-5 py-4 cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.status === "paid" ? "bg-green-500" : "bg-orange-400"}`} />
                                                <div className="font-semibold text-gray-900 text-sm">{sub.student_name}</div>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {formatDate(sub.date_from)} — {formatDate(sub.date_to)} · {sub.lessons_count} {sub.lessons_count === 1 ? "урок" : sub.lessons_count < 5 ? "урока" : "уроков"} · {sub.price_per_lesson.toLocaleString()} ₽/урок
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="font-bold text-gray-900 text-lg">{sub.total_amount.toLocaleString()} ₽</div>
                                            {sub.status === "paid" ? (
                                                <div className="text-xs text-green-600 font-medium">✓ Оплачено</div>
                                            ) : (
                                                <div className="text-xs text-orange-600 font-medium">Ожидает оплаты</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Прогресс уроков */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-indigo-500 h-2 rounded-full transition-all"
                                                style={{ width: `${progressPct}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-500 flex-shrink-0">
                                            {completedCount} из {totalCount} уроков проведено
                                        </div>
                                        <span className="text-gray-400 text-xs">{expandedId === sub.id ? "▲" : "▼"}</span>
                                    </div>
                                </div>

                                {/* Детали: расписание уроков */}
                                {expandedId === sub.id && (
                                    <div className="border-t border-gray-100 px-4 md:px-5 py-4">
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Расписание занятий</div>

                                        {sub.lessons && sub.lessons.length > 0 ? (
                                            <div className="space-y-2">
                                                {sub.lessons.map(lesson => {
                                                    const d = new Date(lesson.lesson_date + "T00:00:00");
                                                    const isPast = lesson.lesson_date < new Date().toISOString().split("T")[0];
                                                    const isCompleted = lesson.status === "completed";
                                                    const isCancelled = lesson.status === "cancelled";

                                                    return (
                                                        <div
                                                            key={lesson.id}
                                                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isCompleted ? "bg-green-50" : isCancelled ? "bg-gray-50 opacity-50" : isPast ? "bg-orange-50" : "bg-indigo-50"
                                                                }`}
                                                        >
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? "bg-green-500" : isCancelled ? "bg-gray-300" : isPast ? "bg-orange-400" : "bg-indigo-400"
                                                                }`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-gray-800">
                                                                    {DAYS_RU[d.getDay()]}, {formatDate(lesson.lesson_date)}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {lesson.lesson_time.slice(0, 5)} · {lesson.duration_minutes} мин · {lesson.subject}
                                                                </div>
                                                            </div>
                                                            <div className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 ${isCompleted ? "bg-green-100 text-green-700" :
                                                                isCancelled ? "bg-gray-100 text-gray-500" :
                                                                    isPast ? "bg-orange-100 text-orange-700" :
                                                                        "bg-indigo-100 text-indigo-700"
                                                                }`}>
                                                                {isCompleted ? "✓ Проведён" : isCancelled ? "Отменён" : isPast ? "Пропущен?" : "Запланирован"}
                                                            </div>
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
                                            <div className="mt-3 text-xs text-green-600 bg-green-50 rounded-xl p-3">
                                                ✓ Оплата получена {new Date(sub.paid_at).toLocaleDateString("ru-RU")}
                                            </div>
                                        )}

                                        {sub.status === "pending" && (
                                            <div className="mt-3 text-xs text-orange-600 bg-orange-50 rounded-xl p-3">
                                                💳 Итого к оплате: <strong>{sub.total_amount.toLocaleString()} ₽</strong> — переведите репетитору на карту
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
