"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Lesson = {
    id: string;
    subject: string;
    lesson_date: string;
    lesson_time: string;
    duration_minutes: number;
    status: string;
};

type Homework = {
    id: string;
    title: string;
    due_date: string;
    status: string;
    grade: string;
    tutor_comment: string;
};

type Payment = {
    id: string;
    amount: number;
    status: string;
    description: string;
    created_at: string;
    paid_at: string;
};

export default function ParentPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [child, setChild] = useState<any>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"schedule" | "homework" | "payments">("schedule");

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        setUser(user);

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        setProfile(profile);

        // Ищем ребёнка — привязан через поле child_id в profiles
        if (profile?.child_id) {
            const { data: childData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", profile.child_id)
                .single();
            setChild(childData);

            const today = new Date().toISOString().split("T")[0];

            // Расписание ребёнка
            const { data: lessonsData } = await supabase
                .from("schedule")
                .select("*")
                .eq("student_id", profile.child_id)
                .gte("lesson_date", today)
                .order("lesson_date", { ascending: true });
            setLessons(lessonsData || []);

            // Домашка ребёнка
            const { data: hwData } = await supabase
                .from("homework")
                .select("*")
                .eq("student_id", profile.child_id)
                .order("created_at", { ascending: false });
            setHomeworks(hwData || []);

            // Оплата
            const { data: payData } = await supabase
                .from("payments")
                .select("*")
                .eq("student_id", profile.child_id)
                .order("created_at", { ascending: false });
            setPayments(payData || []);
        }

        setLoading(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const statusHW: Record<string, { label: string; color: string }> = {
        assigned: { label: "Не сдано", color: "bg-orange-100 text-orange-700" },
        submitted: { label: "На проверке", color: "bg-blue-100 text-blue-700" },
        checked: { label: "Проверено", color: "bg-green-100 text-green-700" },
    };

    const pendingPayments = payments.filter(p => p.status === "pending");
    const totalDebt = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Шапка */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                        {(profile?.name || "Р")[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900 text-sm">{profile?.name || "Родитель"}</div>
                        <div className="text-xs text-slate-400">{user?.email}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">Родитель</span>
                    <button onClick={logout} className="text-sm text-slate-400 hover:text-slate-600">Выйти</button>
                </div>
            </div>

            <div className="p-6 max-w-2xl mx-auto">
                {/* Нет ребёнка */}
                {!child ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">👶</div>
                        <div className="text-lg font-semibold text-slate-700">Ребёнок ещё не привязан</div>
                        <div className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                            Напишите репетитору — он привяжет аккаунт ребёнка к вашему, и здесь появится вся информация
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Карточка ребёнка */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                                    {(child.name || "У")[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-lg">{child.name || child.email}</div>
                                    <div className="text-sm text-slate-400">Ученик</div>
                                </div>
                                <div className="ml-auto flex gap-3 text-center">
                                    <div>
                                        <div className="text-xl font-bold text-indigo-600">{lessons.length}</div>
                                        <div className="text-xs text-slate-400">Уроков</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-orange-500">{homeworks.filter(h => h.status === "assigned").length}</div>
                                        <div className="text-xs text-slate-400">ДЗ сдать</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Долг */}
                        {totalDebt > 0 && (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                                <span className="text-2xl">💳</span>
                                <div>
                                    <div className="font-semibold text-red-800">Задолженность: {totalDebt.toLocaleString()} ₽</div>
                                    <div className="text-sm text-red-600">Пожалуйста, оплатите занятия</div>
                                </div>
                                <button onClick={() => setActiveTab("payments")} className="ml-auto text-sm text-red-700 underline">Подробнее</button>
                            </div>
                        )}

                        {/* Табы */}
                        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-100 mb-6">
                            {(["schedule", "homework", "payments"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === tab ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    {tab === "schedule" && "📅 Расписание"}
                                    {tab === "homework" && "📚 Домашка"}
                                    {tab === "payments" && "💰 Оплата"}
                                </button>
                            ))}
                        </div>

                        {/* Расписание */}
                        {activeTab === "schedule" && (
                            <div className="space-y-3">
                                {lessons.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">Нет запланированных уроков</div>
                                ) : lessons.map(l => (
                                    <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="text-center bg-indigo-50 rounded-xl px-4 py-2 min-w-[70px]">
                                            <div className="text-xs text-indigo-500">{new Date(l.lesson_date + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</div>
                                            <div className="text-base font-bold text-indigo-700">{l.lesson_time.slice(0, 5)}</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">{l.subject}</div>
                                            <div className="text-sm text-slate-400">{l.duration_minutes} минут</div>
                                        </div>
                                        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${l.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                            {l.status === "completed" ? "Проведён" : "Запланирован"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Домашка */}
                        {activeTab === "homework" && (
                            <div className="space-y-3">
                                {homeworks.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">Нет заданий</div>
                                ) : homeworks.map(hw => (
                                    <div key={hw.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-semibold text-slate-900">{hw.title}</div>
                                                {hw.due_date && (
                                                    <div className="text-xs text-slate-400 mt-1">до {new Date(hw.due_date).toLocaleDateString("ru-RU")}</div>
                                                )}
                                                {hw.grade && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="bg-green-600 text-white text-sm font-bold px-3 py-0.5 rounded-lg">{hw.grade}</span>
                                                        {hw.tutor_comment && <span className="text-sm text-slate-500">{hw.tutor_comment}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusHW[hw.status]?.color}`}>
                                                {statusHW[hw.status]?.label}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Оплата */}
                        {activeTab === "payments" && (
                            <div className="space-y-3">
                                {payments.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">Нет записей об оплате</div>
                                ) : payments.map(p => (
                                    <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.status === "paid" ? "bg-green-500" : "bg-orange-400"}`} />
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-900">{p.description || "Оплата урока"}</div>
                                            <div className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString("ru-RU")}</div>
                                            {p.paid_at && <div className="text-xs text-green-600">Оплачено {new Date(p.paid_at).toLocaleDateString("ru-RU")}</div>}
                                        </div>
                                        <div className="font-bold text-slate-900">{p.amount.toLocaleString()} ₽</div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                            {p.status === "paid" ? "Оплачено" : "Ожидается"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
