"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
    id: string;
    name: string;
    email: string;
    role: string;
    child_id: string | null;
};

export default function StudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Profile[]>([]);
    const [parents, setParents] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState<{ parentId: string; studentId: string } | null>(null);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        await fetchProfiles();
        setLoading(false);
    };

    const fetchProfiles = async () => {
        const { data } = await supabase.from("profiles").select("*");
        const all = data || [];
        setStudents(all.filter(p => p.role === "student"));
        setParents(all.filter(p => p.role === "parent"));
    };

    const linkParentToStudent = async (parentId: string, studentId: string) => {
        const { error } = await supabase
            .from("profiles")
            .update({ child_id: studentId })
            .eq("id", parentId);
        if (error) { alert(error.message); return; }
        setLinking(null);
        fetchProfiles();
    };

    const unlinkParent = async (parentId: string) => {
        if (!confirm("Отвязать родителя от ученика?")) return;
        await supabase.from("profiles").update({ child_id: null }).eq("id", parentId);
        fetchProfiles();
    };

    const getChildName = (childId: string | null) => {
        if (!childId) return null;
        const student = students.find(s => s.id === childId);
        return student?.name || student?.email || "Неизвестный";
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
                <button onClick={() => router.push("/tutor")} className="text-slate-500 hover:text-slate-800">← Назад</button>
                <h1 className="text-xl font-bold text-slate-900">👥 Ученики и родители</h1>
            </div>

            <div className="p-6 max-w-3xl mx-auto space-y-8">

                {/* Ученики */}
                <div>
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        Ученики ({students.length})
                    </div>
                    {students.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 shadow-sm border border-slate-100">
                            Нет учеников. Они появятся после регистрации на сайте.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {students.map(s => (
                                <div key={s.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                        {(s.name || s.email || "У")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900">{s.name || "Без имени"}</div>
                                        <div className="text-sm text-slate-400">{s.email}</div>
                                    </div>
                                    <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">Ученик</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Родители */}
                <div>
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                        Родители ({parents.length})
                    </div>
                    {parents.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 shadow-sm border border-slate-100">
                            Нет родителей. Они появятся после регистрации на сайте.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {parents.map(p => {
                                const childName = getChildName(p.child_id);
                                return (
                                    <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                                {(p.name || p.email || "Р")[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-slate-900">{p.name || "Без имени"}</div>
                                                <div className="text-sm text-slate-400">{p.email}</div>
                                                {childName && (
                                                    <div className="text-sm text-indigo-600 mt-1">👤 Ребёнок: {childName}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {p.child_id ? (
                                                    <>
                                                        <button
                                                            onClick={() => setLinking({ parentId: p.id, studentId: "" })}
                                                            className="text-sm border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                                                        >
                                                            Изменить
                                                        </button>
                                                        <button
                                                            onClick={() => unlinkParent(p.id)}
                                                            className="text-sm text-red-400 hover:text-red-600 px-2"
                                                        >
                                                            Отвязать
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setLinking({ parentId: p.id, studentId: "" })}
                                                        className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700"
                                                    >
                                                        + Привязать ученика
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Форма привязки */}
                                        {linking?.parentId === p.id && (
                                            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                                                <div className="text-sm font-medium text-slate-700 mb-3">Выбери ученика для привязки:</div>
                                                <div className="space-y-2">
                                                    {students.map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => linkParentToStudent(p.id, s.id)}
                                                            className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                                {(s.name || s.email || "У")[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-900 text-sm">{s.name || "Без имени"}</div>
                                                                <div className="text-xs text-slate-400">{s.email}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setLinking(null)}
                                                    className="mt-3 text-sm text-slate-400 hover:text-slate-600"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
