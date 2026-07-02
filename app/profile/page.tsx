"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
        setForm({ name: prof.name || "", subject: prof.subject || "", level: prof.level || "", phone: prof.phone || "", about: prof.about || "" });
        setLoading(false);
    };

    const saveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from("profiles").update({
            name: form.name, subject: form.subject, level: form.level, phone: form.phone, about: form.about,
        }).eq("id", profile.id);
        setSaving(false);
        if (!error) { setProfile({ ...profile, ...form }); setEditing(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
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
    const accentColor = isTutor ? "bg-violet-600" : "bg-indigo-600";

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">👤 Профиль</h1>
                {!editing && (
                    <button onClick={() => setEditing(true)}
                        className={`text-sm px-4 py-2 rounded-xl border transition-colors ${isTutor ? "border-violet-200 text-violet-600 hover:bg-violet-50" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`}>
                        ✏️ Редактировать
                    </button>
                )}
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-4">✅ Профиль обновлён!</div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ${accentColor}`}>
                        {profile?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                        <div className="text-lg font-bold text-gray-900 truncate">{profile?.name}</div>
                        <div className="text-sm text-gray-500 truncate">{profile?.email}</div>
                        <span className={`inline-block mt-1 text-xs font-medium px-3 py-1 rounded-full ${roleColor}`}>{roleLabel}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Личная информация</h2>
                {editing ? (
                    <div className="space-y-4">
                        {[
                            { key: "name", label: "Имя", placeholder: "Ваше имя" },
                            { key: "subject", label: isTutor ? "Предмет(ы)" : "Предмет", placeholder: "Математика..." },
                            { key: "level", label: isTutor ? "Опыт" : "Уровень", placeholder: "5 лет опыта" },
                            { key: "phone", label: "Телефон", placeholder: "+7 999 123-45-67" },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                                <input type="text" value={(form as any)[key]} placeholder={placeholder}
                                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                                    className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                            </div>
                        ))}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">О себе</label>
                            <textarea value={form.about} rows={3} placeholder="Расскажи о себе..."
                                onChange={e => setForm({ ...form, about: e.target.value })}
                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400 resize-none" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={saveProfile} disabled={saving}
                                className={`text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${accentColor}`}>
                                {saving ? "Сохраняю..." : "Сохранить"}
                            </button>
                            <button onClick={() => setEditing(false)} className="text-gray-500 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-100">Отмена</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {[
                            { label: isTutor ? "Предмет(ы)" : "Предмет", value: profile?.subject },
                            { label: isTutor ? "Опыт" : "Уровень", value: profile?.level },
                            { label: "Телефон", value: profile?.phone },
                            { label: "О себе", value: profile?.about },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex gap-4 py-3 border-b border-gray-50 last:border-0">
                                <div className="text-sm text-gray-400 w-28 flex-shrink-0">{label}</div>
                                <div className="text-sm text-gray-900">{value || <span className="text-gray-300">Не указано</span>}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <button onClick={logout} className="w-full border border-red-100 text-red-400 hover:bg-red-50 py-3 rounded-xl text-sm font-medium transition-colors">
                    🚪 Выйти из аккаунта
                </button>
            </div>
        </div>
    );
}