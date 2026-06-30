"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SUBJECTS = ["Математика", "Английский", "Русский", "Физика", "Химия", "История", "Биология", "Информатика", "Другое"];

export default function TopicsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState("all");
    const [selectedSubject, setSelectedSubject] = useState("all");

    const [form, setForm] = useState({
        student_name: "",
        subject: "Математика",
        topic: "",
        notes: "",
        completed_at: new Date().toISOString().split("T")[0],
    });

    useEffect(() => { init(); }, []);

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!prof) { router.push("/login"); return; }
        setProfile(prof);

        if (prof.role === "tutor") {
            const { data: studs } = await supabase.from("profiles").select("*").eq("role", "student");
            setStudents(studs || []);
            await fetchTopics(null);
        } else {
            await fetchTopics(prof.name);
        }
        setLoading(false);
    };

    const fetchTopics = async (studentName: string | null) => {
        let query = supabase.from("topics").select("*").order("completed_at", { ascending: false }).order("created_at", { ascending: false });
        if (studentName) query = query.eq("student_name", studentName);
        const { data } = await query;
        setTopics(data || []);
    };

    const addTopic = async () => {
        if (!form.topic || !form.student_name || !form.subject) return;
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Найти id ученика по имени
        const student = students.find(s => s.name === form.student_name);

        await supabase.from("topics").insert([{
            tutor_id: user?.id,
            student_id: student?.id,
            student_name: form.student_name,
            subject: form.subject,
            topic: form.topic,
            notes: form.notes,
            completed_at: form.completed_at,
        }]);
        setSaving(false);
        setShowForm(false);
        setForm({ student_name: "", subject: "Математика", topic: "", notes: "", completed_at: new Date().toISOString().split("T")[0] });
        if (profile.role === "tutor") fetchTopics(null);
        else fetchTopics(profile.name);
    };

    const deleteTopic = async (id: string) => {
        await supabase.from("topics").delete().eq("id", id);
        if (profile.role === "tutor") fetchTopics(null);
        else fetchTopics(profile.name);
    };

    const isTutor = profile?.role === "tutor";

    const filtered = topics.filter(t => {
        if (selectedStudent !== "all" && t.student_name !== selectedStudent) return false;
        if (selectedSubject !== "all" && t.subject !== selectedSubject) return false;
        return true;
    });

    const usedSubjects = [...new Set(topics.map(t => t.subject))];

    const studentStats = students.map(s => ({
        name: s.name,
        count: topics.filter(t => t.student_name === s.name).length,
        subjects: [...new Set(topics.filter(t => t.student_name === s.name).map(t => t.subject))],
    }));

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen text-gray-400">Загрузка...</div>
    );

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-8">

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📊 Пройденные темы</h1>
                    <p className="text-gray-500 text-sm mt-1">{filtered.length} тем</p>
                </div>
                {isTutor && (
                    <button onClick={() => setShowForm(!showForm)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        + Добавить тему
                    </button>
                )}
            </div>

            {isTutor && studentStats.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {studentStats.map(s => (
                        <div key={s.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                            </div>
                            <div className="text-2xl font-bold text-violet-600">{s.count}</div>
                            <div className="text-xs text-gray-400">тем пройдено</div>
                            {s.subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(s.subjects as string[]).map(sub => (
                                        <span key={sub} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sub}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showForm && isTutor && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Новая тема</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Ученик</label>
                            <select value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })}
                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400">
                                <option value="">Выбери ученика</option>
                                {students.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Предмет</label>
                            <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400">
                                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Тема</label>
                            <input type="text" placeholder="Например: Квадратные уравнения" value={form.topic}
                                onChange={e => setForm({ ...form, topic: e.target.value })}
                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Дата урока</label>
                            <input type="date" value={form.completed_at} onChange={e => setForm({ ...form, completed_at: e.target.value })}
                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Заметки (необязательно)</label>
                            <input type="text" placeholder="Что разобрали, на что обратить внимание..." value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={addTopic} disabled={saving || !form.topic || !form.student_name}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
                            {saving ? "Сохраняю..." : "Сохранить"}
                        </button>
                        <button onClick={() => setShowForm(false)}
                            className="text-gray-500 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            {topics.length > 0 && (
                <div className="flex gap-3 mb-4">
                    {isTutor && (
                        <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                            className="border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-400 bg-white">
                            <option value="all">Все ученики</option>
                            {students.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    )}
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                        className="border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-400 bg-white">
                        <option value="all">Все предметы</option>
                        {usedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="text-4xl mb-3">📚</div>
                    <div className="text-gray-500 text-sm">Тем пока нет</div>
                    {isTutor && (
                        <button onClick={() => setShowForm(true)} className="mt-4 text-violet-600 text-sm hover:underline">
                            Добавить первую тему
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {filtered.map(topic => (
                            <div key={topic.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
                                        ✅
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{topic.topic}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400">{topic.subject}</span>
                                            {isTutor && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{topic.student_name}</span></>}
                                            {topic.completed_at && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{new Date(topic.completed_at).toLocaleDateString("ru")}</span></>}
                                        </div>
                                        {topic.notes && <div className="text-xs text-gray-400 mt-0.5">{topic.notes}</div>}
                                    </div>
                                </div>
                                {isTutor && (
                                    <button onClick={() => deleteTopic(topic.id)}
                                        className="text-gray-300 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                        Удалить
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}