"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", subject: "", level: "", phone: "", about: "" });
    const [success, setSuccess] = useState(false);

    useEffect(() => { init(); }, []);

    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!prof) { router.push("/login"); return; }
        setProfile(prof);
        setForm({
            name: prof.name || "",
            subject: prof.subject || "",
            level: prof.level || "",
            phone: prof.phone || "",
            about: prof.about || "",
        });
        setLoading(false);
    };

    const saveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").update({
            name: form.name,
            subject: form.subject,
            level: form.level,
            phone: form.phone,
            about: form.about,
        }).eq("id", profile.id);
        setSaving(false);
        if (!error) {
            setProfile({ ...profile, ...form });
            setEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Загрузка...</div>;

    const isTutor = profile?.role === "tutor";
    const isStudent = profile?.role === "student";

    const roleLabel = isTutor ? "Репетитор" : isStudent ? "Ученик" : "Родитель";
    const roleColor = isTutor ? "bg-violet-100 text-violet-700" : isStudent ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700";
    const sidebarColor = isTutor ? "bg-violet-600" : "bg-indigo-600";
    const activeColor = isTutor ? "bg-violet-50 text-violet-700" : "bg-indigo-50 text-indigo-700";

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Sidebar */}
            <div className="fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-100 flex flex-col p-4 z-10">
                <div className="flex items-center gap-2 mb-8 px-2 pt-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${sidebarColor}`}>
                        {profile?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span className="font-semibold text-gray-900">{isTutor ? "Репетитор" : "Кабинет ученика"}</span>
                </div>
                <nav className="flex flex-col gap-1 flex-1">
                    <Link href={isTutor ? "/tutor" : "/student"} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">🏠 Главная</Link>
                    <Link href="/schedule" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📅 Расписание</Link>
                    <Link href="/homework" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">📚 Домашка</Link>
                    <Link href="/tests" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">🧪 Тесты</Link>
                    {isTutor && <>
                        <div className="my-2 border-t border-gray-100" />
                        <Link href="/payments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">💰 Оплата</Link>
                        <Link href="/student/manage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 text-sm font-medium">👨‍🎓 Ученики</Link>
                    </>}
                    <Link href="/profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${activeColor}`}>👤 Профиль</Link>
                </nav>
                <button onClick={logout} className="flex items-center gap-2 px-3 py-2.5 text-gray-400 hover:text-red-500 text-sm transition-colors">🚪 Выйти</button>
            </div>

            {/* Main */}
            <div className="ml-56 p-6 max-w-2xl">

                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">👤 Профиль</h1>
                    {!editing && (
                        <button onClick={() => setEditing(true)}
                            className={`text-sm px-4 py-2 rounded-xl border transition-colors ${isTutor ? "border-violet-200 text-violet-600 hover:bg-violet-50" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`}>
                            ✏️ Редактировать
                        </button>
                    )}
                </div>

                {success && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-4">
                        ✅ Профиль обновлён!
                    </div>
                )}

                {/* Аватар и роль */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold ${sidebarColor}`}>
                            {profile?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-900">{profile?.name}</div>
                            <div className="text-sm text-gray-500">{profile?.email}</div>
                            <span className={`inline-block mt-1 text-xs font-medium px-3 py-1 rounded-full ${roleColor}`}>
                                {roleLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Информация */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Личная информация</h2>

                    {editing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Имя</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    {isTutor ? "Предмет(ы)" : "Изучаемый предмет"}
                                </label>
                                <input type="text" value={form.subject}
                                    placeholder={isTutor ? "Математика, Физика..." : "Математика"}
                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    {isTutor ? "Опыт" : "Уровень"}
                                </label>
                                <input type="text" value={form.level}
                                    placeholder={isTutor ? "5 лет опыта" : "Beginner / Intermediate / Advanced"}
                                    onChange={e => setForm({ ...form, level: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Телефон</label>
                                <input type="text" value={form.phone} placeholder="+7 999 123-45-67"
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">О себе</label>
                                <textarea value={form.about} rows={3}
                                    placeholder={isTutor ? "Расскажи об опыте и подходе к обучению..." : "Расскажи о себе..."}
                                    onChange={e => setForm({ ...form, about: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={saveProfile} disabled={saving}
                                    className={`text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors ${isTutor ? "bg-violet-600 hover:bg-violet-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                                    {saving ? "Сохраняю..." : "Сохранить"}
                                </button>
                                <button onClick={() => setEditing(false)}
                                    className="text-gray-500 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                                    Отмена
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {[
                                { label: isTutor ? "Предмет(ы)" : "Предмет", value: profile?.subject },
                                { label: isTutor ? "Опыт" : "Уровень", value: profile?.level },
                                { label: "Телефон", value: profile?.phone },
                                { label: "О себе", value: profile?.about },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex gap-4 py-3 border-b border-gray-50 last:border-0">
                                    <div className="text-sm text-gray-400 w-32 flex-shrink-0">{label}</div>
                                    <div className="text-sm text-gray-900">{value || <span className="text-gray-300">Не указано</span>}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Кнопка выйти */}
                <div className="mt-4">
                    <button onClick={logout}
                        className="w-full border border-red-100 text-red-400 hover:bg-red-50 py-3 rounded-xl text-sm font-medium transition-colors">
                        🚪 Выйти из аккаунта
                    </button>
                </div>
            </div>
        </div>
    );
}
