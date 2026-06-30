"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tab = "schedule" | "hw" | "topics";

type Lesson = {
    id: string;
    lesson_date: string;
    lesson_time: string;
    subject: string;
    duration_minutes: number;
    status: string;
};

type Homework = {
    id: string;
    title: string;
    description: string;
    due_date: string;
    status: string;
    student_name: string;
    tutor_comment: string | null;
    grade: string | null;
    created_at: string;
};

type Topic = {
    id: string;
    topic: string;
    subject: string;
    completed_at: string | null;
    notes: string | null;
    created_at: string;
};

const DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

function ProgressContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) || "schedule");
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [homework, setHomework] = useState<Homework[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, child_id, role")
            .eq("id", user.id)
            .single();

        if (!profile) { setLoading(false); return; }

        let studentIds: string[] = [];

        if (profile.role === "student") {
            studentIds = [profile.id];
        } else if (profile.role === "parent") {
            if (profile.child_id) {
                studentIds = [profile.child_id];
            } else {
                const { data: children } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("parent_id", user.id)
                    .eq("role", "student");
                if (children) studentIds = children.map((c: { id: string }) => c.id);
            }
        }

        if (studentIds.length === 0) { setLoading(false); return; }

        // Расписание через абонементы
        const { data: subs } = await supabase
            .from("subscriptions")
            .select("id")
            .in("student_id", studentIds)
            .neq("status", "cancelled");

        if (subs && subs.length > 0) {
            const { data: lessonData } = await supabase
                .from("schedule")
                .select("id, lesson_date, lesson_time, subject, duration_minutes, status")
                .in("subscription_id", subs.map(s => s.id))
                .order("lesson_date", { ascending: false });
            setLessons(lessonData || []);
        }

        // ДЗ из таблицы homework
        const { data: hwData } = await supabase
            .from("homework")
            .select("id, title, description, due_date, status, student_name, tutor_comment, grade, created_at")
            .in("student_id", studentIds)
            .order("due_date", { ascending: false });
        setHomework(hwData || []);

        // Темы
        const { data: topicData } = await supabase
            .from("topics")
            .select("id, topic, subject, completed_at, notes, created_at")
            .in("student_id", studentIds)
            .order("created_at");
        setTopics(topicData || []);

        setLoading(false);
    };

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: "schedule", label: "Расписание", icon: "📅" },
        { id: "hw", label: "Домашние задания", icon: "📝" },
        { id: "topics", label: "Темы", icon: "📚" },
    ];

    const today = new Date().toISOString().split("T")[0];
    const completedLessons = lessons.filter(l => l.status === "completed").length;
    const skippedLessons = lessons.filter(l => l.lesson_date < today && l.status !== "completed" && l.status !== "cancelled").length;
    const hwDone = homework.filter(h => h.status === "submitted" || h.status === "graded" || h.status === "checked").length;
    const topicsDone = topics.filter(t => t.completed_at !== null).length;

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 md:pb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-5">📊 Прогресс</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Расписание */}
            {activeTab === "schedule" && (
                <div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="text-xs text-green-600 font-medium mb-1">Проведено уроков</div>
                            <div className="text-2xl font-bold text-green-700">{completedLessons}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                            <div className="text-xs text-orange-600 font-medium mb-1">Пропущено</div>
                            <div className="text-2xl font-bold text-orange-700">{skippedLessons}</div>
                        </div>
                    </div>

                    {lessons.length === 0 ? <Empty text="Уроков пока нет" /> : (
                        <div className="space-y-2">
                            {lessons.map(lesson => {
                                const d = new Date(lesson.lesson_date + "T00:00:00");
                                const isPast = lesson.lesson_date < today;
                                const isCompleted = lesson.status === "completed";
                                const isCancelled = lesson.status === "cancelled";
                                const isSkipped = isPast && !isCompleted && !isCancelled;

                                return (
                                    <div key={lesson.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${isCompleted ? "bg-green-50" : isCancelled ? "bg-gray-50 opacity-50" : isSkipped ? "bg-orange-50" : "bg-indigo-50"
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? "bg-green-500" : isCancelled ? "bg-gray-300" : isSkipped ? "bg-orange-400" : "bg-indigo-400"
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800">
                                                {DAYS_RU[d.getDay()]}, {formatDate(lesson.lesson_date)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {lesson.lesson_time.slice(0, 5)} · {lesson.duration_minutes} мин · {lesson.subject}
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0 ${isCompleted ? "bg-green-100 text-green-700" :
                                            isCancelled ? "bg-gray-100 text-gray-500" :
                                                isSkipped ? "bg-orange-100 text-orange-700" :
                                                    "bg-indigo-100 text-indigo-700"
                                            }`}>
                                            {isCompleted ? "✓ Проведён" : isCancelled ? "Отменён" : isSkipped ? "Пропущен" : "Запланирован"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Домашние задания */}
            {activeTab === "hw" && (
                <div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="text-xs text-green-600 font-medium mb-1">Сдано</div>
                            <div className="text-2xl font-bold text-green-700">{hwDone}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                            <div className="text-xs text-orange-600 font-medium mb-1">Не сдано</div>
                            <div className="text-2xl font-bold text-orange-700">{homework.length - hwDone}</div>
                        </div>
                    </div>

                    {homework.length === 0 ? <Empty text="Домашних заданий пока нет" /> : (
                        <div className="space-y-2">
                            {homework.map(hw => {
                                const isDone = hw.status === "submitted" || hw.status === "graded" || hw.status === "checked";
                                const isOverdue = !isDone && hw.due_date < today;
                                return (
                                    <div key={hw.id} className={`rounded-xl px-4 py-3 ${isDone ? "bg-green-50" : isOverdue ? "bg-red-50" : "bg-amber-50"
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isDone ? "bg-green-500" : isOverdue ? "bg-red-400" : "bg-amber-400"
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="text-sm font-medium text-gray-800">{hw.title}</div>
                                                    <div className={`text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0 ${isDone ? "bg-green-100 text-green-700" :
                                                        isOverdue ? "bg-red-100 text-red-700" :
                                                            "bg-amber-100 text-amber-700"
                                                        }`}>
                                                        {hw.status === "checked" ? `✓ Проверено ${hw.grade ? `(${hw.grade})` : ""}` :
                                                            hw.status === "graded" ? `✓ Оценка: ${hw.grade || "—"}` :
                                                                hw.status === "submitted" ? "✓ Сдано" :
                                                                    isOverdue ? "Просрочено" : "Не сдано"}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    Срок: {formatDate(hw.due_date)}
                                                </div>
                                                {hw.description && (
                                                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{hw.description}</div>
                                                )}
                                                {hw.tutor_comment && (
                                                    <div className="text-xs text-indigo-600 mt-1.5 bg-indigo-50 rounded-lg px-2 py-1">
                                                        💬 {hw.tutor_comment}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Темы */}
            {activeTab === "topics" && (
                <div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="text-xs text-green-600 font-medium mb-1">Пройдено тем</div>
                            <div className="text-2xl font-bold text-green-700">{topicsDone}</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                            <div className="text-xs text-gray-500 font-medium mb-1">Всего тем</div>
                            <div className="text-2xl font-bold text-gray-700">{topics.length}</div>
                        </div>
                    </div>

                    {topics.length > 0 && (
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Общий прогресс</span>
                                <span>{Math.round((topicsDone / topics.length) * 100)}%</span>
                            </div>
                            <div className="bg-gray-100 rounded-full h-2">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.round((topicsDone / topics.length) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {topics.length === 0 ? <Empty text="Темы пока не добавлены" /> : (
                        <div className="space-y-2">
                            {topics.map((topic, i) => {
                                const isDone = topic.completed_at !== null;
                                return (
                                    <div key={topic.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${isDone ? "bg-white border border-gray-100 shadow-sm" : "bg-gray-50"
                                        }`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-400"
                                            }`}>
                                            {isDone ? "✓" : i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium ${isDone ? "text-gray-800" : "text-gray-400"}`}>
                                                {topic.topic}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {topic.subject}
                                                {isDone && topic.completed_at && (
                                                    <> · Пройдена {formatDate(topic.completed_at)}</>
                                                )}
                                            </div>
                                            {topic.notes && isDone && (
                                                <div className="text-xs text-gray-500 mt-1 italic">{topic.notes}</div>
                                            )}
                                        </div>
                                        {!isDone && (
                                            <div className="text-xs text-gray-300 mt-1">Ещё не пройдена</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div>{text}</div>
        </div>
    );
}

export default function ParentProgressPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>}>
            <ProgressContent />
        </Suspense>
    );
}
