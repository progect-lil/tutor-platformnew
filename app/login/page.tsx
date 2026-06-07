"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Role = "tutor" | "student" | "parent";
type Mode = "signin" | "signup";

const roles = [
    { id: "student" as Role, label: "Ученик", icon: "🎒", desc: "Домашка, расписание, тесты", color: "border-indigo-200 bg-indigo-50 text-indigo-700", active: "border-indigo-500 bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300" },
    { id: "parent" as Role, label: "Родитель", icon: "👨‍👩‍👧", desc: "Прогресс, оплата, расписание", color: "border-emerald-200 bg-emerald-50 text-emerald-700", active: "border-emerald-500 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300" },
    { id: "tutor" as Role, label: "Репетитор", icon: "👩‍🏫", desc: "Управление всем", color: "border-violet-200 bg-violet-50 text-violet-700", active: "border-violet-500 bg-violet-100 text-violet-800 ring-2 ring-violet-300" },
];

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<Role>("student");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const redirectByRole = (r: string) => {
        if (r === "tutor") router.push("/tutor");
        else if (r === "student") router.push("/student");
        else if (r === "parent") router.push("/parent");
        else router.push("/student");
    };

    const signIn = async () => {
        setError("");
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError("Неверный email или пароль");
            setLoading(false);
            return;
        }

        const user = data.user;
        if (!user) { setLoading(false); return; }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        setLoading(false);

        if (profileError || !profile) {
            setError("Профиль не найден. Попробуй зарегистрироваться заново.");
            return;
        }

        redirectByRole(profile.role);
    };

    const signUp = async () => {
        setError("");
        if (!name.trim()) { setError("Введи своё имя"); return; }
        if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
        setLoading(true);

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            setError(error.message === "User already registered" ? "Этот email уже зарегистрирован" : error.message);
            setLoading(false);
            return;
        }

        const user = data.user;
        if (!user) { setError("Не удалось создать аккаунт"); setLoading(false); return; }

        const { error: profileError } = await supabase.from("profiles").insert([{
            id: user.id,
            email: user.email,
            name: name,
            role: role,
        }]);

        if (profileError) {
            setError(profileError.message);
            setLoading(false);
            return;
        }

        setLoading(false);
        redirectByRole(role);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-2xl mb-4 shadow-lg">📖</div>
                    <h1 className="text-2xl font-bold text-gray-900">Платформа репетитора</h1>
                    <p className="text-gray-500 text-sm mt-1">Обучение стало удобнее</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl p-8">

                    <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
                        <button onClick={() => { setMode("signin"); setError(""); }}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === "signin" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                            Войти
                        </button>
                        <button onClick={() => { setMode("signup"); setError(""); }}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === "signup" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                            Регистрация
                        </button>
                    </div>

                    {mode === "signup" && (
                        <div className="mb-5">
                            <p className="text-sm font-medium text-gray-700 mb-3">Кто ты?</p>
                            <div className="grid grid-cols-3 gap-2">
                                {roles.map((r) => (
                                    <button key={r.id} onClick={() => setRole(r.id)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all text-center ${role === r.id ? r.active : r.color}`}>
                                        <span className="text-2xl">{r.icon}</span>
                                        <span className="text-xs font-semibold">{r.label}</span>
                                        <span className="text-xs opacity-70 leading-tight hidden sm:block">{r.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === "signup" && (
                        <input type="text" placeholder="Твоё имя" value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border border-gray-200 px-4 py-3 rounded-xl w-full mb-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    )}

                    <input type="email" placeholder="Email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border border-gray-200 px-4 py-3 rounded-xl w-full mb-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />

                    <input type="password" placeholder="Пароль (минимум 6 символов)" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? signIn() : signUp())}
                        className="border border-gray-200 px-4 py-3 rounded-xl w-full mb-4 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <button onClick={mode === "signin" ? signIn : signUp} disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? "Загрузка..." : mode === "signin" ? "Войти" : `Зарегистрироваться как ${roles.find(r => r.id === role)?.label}`}
                    </button>

                </div>

                <p className="text-center text-xs text-gray-400 mt-6">Платформа для репетиторов и учеников</p>
            </div>
        </div>
    );
}
