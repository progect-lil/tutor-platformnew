"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Payment = {
    id: string;
    student_name: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    paid_at: string;
    created_at: string;
};

type Student = { id: string; name: string; email: string };

export default function PaymentsPage() {
    const router = useRouter();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");

    const [form, setForm] = useState({
        student_id: "",
        amount: "",
        description: "",
    });

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        await Promise.all([fetchPayments(), fetchStudents()]);
        setLoading(false);
    };

    const fetchPayments = async () => {
        const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
        setPayments(data || []);
    };

    const fetchStudents = async () => {
        const { data } = await supabase.from("profiles").select("id, name, email").eq("role", "student");
        setStudents(data || []);
    };

    const addPayment = async () => {
        if (!form.student_id || !form.amount) { alert("Выбери ученика и введи сумму"); return; }
        const student = students.find(s => s.id === form.student_id);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("payments").insert([{
            tutor_id: user?.id,
            student_id: form.student_id,
            student_name: student?.name || student?.email,
            amount: Number(form.amount),
            description: form.description || "Оплата урока",
            status: "pending",
        }]);
        if (error) { alert(error.message); return; }
        setShowForm(false);
        setForm({ student_id: "", amount: "", description: "" });
        fetchPayments();
    };

    const markPaid = async (id: string) => {
        await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
        fetchPayments();
    };

    const deletePayment = async (id: string) => {
        if (!confirm("Удалить запись?")) return;
        await supabase.from("payments").delete().eq("id", id);
        fetchPayments();
    };

    const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);

    const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
    const totalPending = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/tutor")} className="text-gray-500 hover:text-gray-800">← Назад</button>
                    <h1 className="text-xl font-bold text-gray-900">💰 Оплата</h1>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                    + Добавить оплату
                </button>
            </div>

            <div className="p-6 max-w-4xl mx-auto">
                {/* Итоги */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                        <div className="text-sm text-green-600 font-medium">Получено</div>
                        <div className="text-2xl font-bold text-green-700 mt-1">{totalPaid.toLocaleString()} ₽</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                        <div className="text-sm text-orange-600 font-medium">Ожидается</div>
                        <div className="text-2xl font-bold text-orange-700 mt-1">{totalPending.toLocaleString()} ₽</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="text-sm text-gray-500 font-medium">Всего записей</div>
                        <div className="text-2xl font-bold text-gray-800 mt-1">{payments.length}</div>
                    </div>
                </div>

                {/* Долги — отдельный блок */}
                {totalPending > 0 && (
                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <div className="font-semibold text-orange-800">Ожидают оплаты</div>
                            <div className="text-sm text-orange-600">
                                {payments.filter(p => p.status === "pending").map(p => p.student_name).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                            </div>
                        </div>
                        <button onClick={() => setFilter("pending")} className="ml-auto text-sm text-orange-700 underline">Показать</button>
                    </div>
                )}

                {/* Фильтры */}
                <div className="flex gap-2 mb-4">
                    {(["all", "pending", "paid"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200"
                                }`}
                        >
                            {f === "all" && "Все"}
                            {f === "pending" && `Ожидается (${payments.filter(p => p.status === "pending").length})`}
                            {f === "paid" && "Оплачено"}
                        </button>
                    ))}
                </div>

                {/* Список */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-4xl mb-3">💰</div>
                        <div>Нет записей об оплате</div>
                        <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 hover:underline text-sm">Добавить первую запись</button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(p => (
                            <div key={p.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.status === "paid" ? "bg-green-500" : "bg-orange-400"}`} />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{p.student_name}</div>
                                    <div className="text-sm text-gray-400">{p.description} · {new Date(p.created_at).toLocaleDateString("ru-RU")}</div>
                                    {p.paid_at && (
                                        <div className="text-xs text-green-600">Оплачено {new Date(p.paid_at).toLocaleDateString("ru-RU")}</div>
                                    )}
                                </div>
                                <div className="text-lg font-bold text-gray-900">{p.amount.toLocaleString()} ₽</div>
                                <div className="flex items-center gap-2">
                                    {p.status === "pending" && (
                                        <button
                                            onClick={() => markPaid(p.id)}
                                            className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700"
                                        >
                                            ✓ Оплачено
                                        </button>
                                    )}
                                    {p.status === "paid" && (
                                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium">Оплачено</span>
                                    )}
                                    <button onClick={() => deletePayment(p.id)} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Добавить оплату</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
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
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                                <input
                                    type="number"
                                    placeholder="2000"
                                    value={form.amount}
                                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                                <input
                                    type="text"
                                    placeholder="Оплата за апрель, 4 урока..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm">Отмена</button>
                            <button onClick={addPayment} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700">Добавить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
