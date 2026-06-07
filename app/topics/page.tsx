"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
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
        let query = supabase.from("topics").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
        if (studentName) query = query.eq("student_name", studentName);
        const { data } = await query;
        setTopics(data || []);
    };

    const addTopic = async () => {
        if (!form.title || !form.student_name || !form.subject) return;
        setSaving(true);
        await supabase.from("topics").insert([{
            student_name: form.student_name,
            subject: form.subject,
            title: form.title,
            description: form.description,
            date: form.date,
            status: "done",
        }]);
        setSaving(false);
        setShowForm(false);
        setForm({ student_name: "", subject: "Математика", title: "", description: "", date: new Date().toISOString().split("T")[0] });
        if (profile.role === "tutor") fetchTopics(null);
        else fetchTopics(profile.name);
    };

    const deleteTopic = async (id: string) => {
        await supabase.from("topics").delete().eq("id", id);
        if (profile.role === "tutor") fetchTopics(null);
        else fetchTopics(profile.name);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isTutor = profile?.role === "tutor";

    // Фильтрация
    const filtered = topics.filter(t => {
        if (selectedStudent !== "all" && t.student_name !== selectedStudent) return false;
        if (selectedSubject !== "all" && t.subject !== selectedSubject) return false;
        return true;
    });

    // Уникальные предметы из тем
    const usedSubjects = [...new Set(topics.map(t => t.subject))];

    // Группировка по ученику для статистики
    const studentStats = students.map(s => ({
        name: s.name,
        count: topics.filter(t => t.student_name === s.name).length,
        subjects: [...new Set(topics.filter(t => t.student_name === s.name).map(t => t.subject))],
    }));

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Sidebar */}
            <div className="fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-100 flex flex-col p-4 z-10">
                <div className="flex items-center gap-2 mb-8 px-2 pt-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${isTutor ? "bg-violet-600" : "bg-indigo-600"}`}>
                        {isTutor ? "Р" : "У"}
                    </div>
                    <span className="font-semibold text-gray-900">{isTutor ? "Репетитор" : "Кабинет ученика"}</span>
                </div>
                <nav className="flex flex-col gap-1 flex-1">
                    <Link href={isTutor ? "/tutor" : "/student"} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">🏠 Главная</Link>
                    <Link href="/schedule" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📅 Расписание</Link>
                    <Link href="/homework" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📚 Домашка</Link>
                    <Link href="/tests" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">🧪 Тесты</Link>
                    <Link href="/topics" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isTutor ? "bg-violet-50 text-violet-700" : "bg-indigo-50 text-indigo-700"}`}>📊 Темы</Link>
                    {isTutor && <>
                        <div className="my-2 border-t border-gray-100" />
                        <Link href="/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">💰 Оплата</Link>
                        <Link href="/student/manage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">👨‍🎓 Ученики</Link>
                    </>}
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">👤 Профиль</Link>
                </nav>
                <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 text-gray-400 hover:text-red-500 text-sm transition-colors">🚪 Выйти</button>
            </div>

            <div className="ml-56 p-6">

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

                {/* Статистика по ученикам — только для репетитора */}
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
                                        {s.subjects.map(sub => (
                                            <span key={sub} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sub}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Форма добавления */}
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
                                <input type="text" placeholder="Например: Квадратные уравнения" value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Дата урока</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-gray-500 mb-1 block">Заметки (необязательно)</label>
                                <input type="text" placeholder="Что разобрали, на что обратить внимание..." value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={addTopic} disabled={saving || !form.title || !form.student_name}
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

                {/* Фильтры */}
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

                {/* Список тем */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                        <div className="text-4xl mb-3">📚</div>
                        <div className="text-gray-500 text-sm">Тем пока нет</div>
                        {isTutor && <button onClick={() => setShowForm(true)} className="mt-4 text-violet-600 text-sm hover:underline">Добавить первую тему</button>}
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
                                            <div className="font-medium text-gray-900">{topic.title}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-400">{topic.subject}</span>
                                                {isTutor && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{topic.student_name}</span></>}
                                                {topic.date && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{new Date(topic.date).toLocaleDateString("ru")}</span></>}
                                            </div>
                                            {topic.description && <div className="text-xs text-gray-400 mt-0.5">{topic.description}</div>}
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
        </div>
    );
}
