"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SUBJECTS = ["Математика", "Английский", "Русский", "Физика", "Химия", "История", "Биология", "Информатика", "Другое"];

export default function TestsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"list" | "create" | "take">("list");
    const [activeTest, setActiveTest] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [testType, setTestType] = useState<"own" | "link">("own");

    const [testForm, setTestForm] = useState({
        title: "", subject: "Математика", student_name: "", description: "", external_link: ""
    });
    const [questionForms, setQuestionForms] = useState([
        { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a" }
    ]);
    const [saving, setSaving] = useState(false);

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
            const { data: res } = await supabase.from("test_results").select("*").order("created_at", { ascending: false });
            setResults(res || []);
        }
        await fetchTests(prof);
        setLoading(false);
    };

    const fetchTests = async (prof: any) => {
        let query = supabase.from("tests").select("*").order("created_at", { ascending: false });
        if (prof.role === "student") query = query.eq("student_name", prof.name);
        const { data } = await query;
        setTests(data || []);
    };

    const addQuestion = () => {
        setQuestionForms([...questionForms, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a" }]);
    };

    const removeQuestion = (i: number) => {
        setQuestionForms(questionForms.filter((_, idx) => idx !== i));
    };

    const updateQuestion = (i: number, field: string, value: string) => {
        const updated = [...questionForms];
        updated[i] = { ...updated[i], [field]: value };
        setQuestionForms(updated);
    };

    const saveTest = async () => {
        if (!testForm.title || !testForm.student_name) return;
        if (testType === "own" && questionForms.some(q => !q.question || !q.option_a || !q.option_b)) return;
        if (testType === "link" && !testForm.external_link) return;
        setSaving(true);

        const { data: test, error } = await supabase.from("tests").insert([{
            title: testForm.title,
            subject: testForm.subject,
            student_name: testForm.student_name,
            description: testForm.description,
            external_link: testType === "link" ? testForm.external_link : null,
        }]).select().single();

        if (error || !test) { setSaving(false); return; }

        if (testType === "own") {
            await supabase.from("test_questions").insert(
                questionForms.map((q, i) => ({ ...q, test_id: test.id, order_num: i }))
            );
        }

        setSaving(false);
        setView("list");
        setTestForm({ title: "", subject: "Математика", student_name: "", description: "", external_link: "" });
        setQuestionForms([{ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a" }]);
        setTestType("own");
        fetchTests(profile);
    };

    const startTest = async (test: any) => {
        if (test.external_link) {
            window.open(test.external_link, "_blank");
            return;
        }
        const { data: qs } = await supabase.from("test_questions").select("*").eq("test_id", test.id).order("order_num");
        setActiveTest(test);
        setQuestions(qs || []);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
        setView("take");
    };

    const submitTest = async () => {
        let correct = 0;
        questions.forEach(q => { if (answers[q.id] === q.correct_answer) correct++; });
        setScore(correct);
        setSubmitted(true);
        await supabase.from("test_results").insert([{
            test_id: activeTest.id,
            student_name: profile.name,
            score: correct,
            total: questions.length,
            answers: answers,
        }]);
    };

    const deleteTest = async (id: string) => {
        await supabase.from("tests").delete().eq("id", id);
        fetchTests(profile);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const isTutor = profile?.role === "tutor";

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
                    <Link href="/tests" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isTutor ? "bg-violet-50 text-violet-700" : "bg-indigo-50 text-indigo-700"}`}>🧪 Тесты</Link>
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

                {/* ===== СПИСОК ТЕСТОВ ===== */}
                {view === "list" && (
                    <>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">🧪 Тесты</h1>
                                <p className="text-gray-500 text-sm mt-1">{tests.length} {tests.length === 1 ? "тест" : "тестов"}</p>
                            </div>
                            {isTutor && (
                                <button onClick={() => setView("create")} className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                                    + Добавить тест
                                </button>
                            )}
                        </div>

                        {isTutor && results.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                                <div className="px-6 py-4 border-b border-gray-50">
                                    <h2 className="font-semibold text-gray-900">📊 Последние результаты</h2>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {results.slice(0, 5).map(r => {
                                        const pct = Math.round((r.score / r.total) * 100);
                                        return (
                                            <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{r.student_name}</div>
                                                    <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("ru")}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-sm text-gray-600">{r.score}/{r.total}</div>
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                                                        {pct}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {tests.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                                <div className="text-4xl mb-3">🧪</div>
                                <div className="text-gray-500 text-sm">Тестов пока нет</div>
                                {isTutor && <button onClick={() => setView("create")} className="mt-4 text-violet-600 text-sm hover:underline">Добавить первый тест</button>}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {tests.map(test => (
                                    <div key={test.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${test.external_link ? "bg-blue-50" : "bg-violet-50"}`}>
                                                {test.external_link ? "🔗" : "📝"}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{test.title}</div>
                                                <div className="text-sm text-gray-500 mt-0.5">{test.subject} · {test.student_name}</div>
                                                {test.description && <div className="text-xs text-gray-400 mt-0.5">{test.description}</div>}
                                                {test.external_link && (
                                                    <div className="text-xs text-blue-400 mt-0.5">Внешний тест · откроется в новой вкладке</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {!isTutor && (
                                                <button onClick={() => startTest(test)}
                                                    className={`text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors ${test.external_link ? "bg-blue-500 hover:bg-blue-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                                                    {test.external_link ? "Открыть →" : "Пройти →"}
                                                </button>
                                            )}
                                            {isTutor && test.external_link && (
                                                <a href={test.external_link} target="_blank"
                                                    className="text-blue-500 text-xs px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors">
                                                    Открыть ссылку
                                                </a>
                                            )}
                                            {isTutor && (
                                                <button onClick={() => deleteTest(test.id)} className="text-gray-300 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ===== СОЗДАНИЕ ТЕСТА ===== */}
                {view === "create" && isTutor && (
                    <>
                        <div className="flex items-center gap-4 mb-8">
                            <button onClick={() => setView("list")} className="text-gray-400 hover:text-gray-600 text-sm">← Назад</button>
                            <h1 className="text-2xl font-bold text-gray-900">Новый тест</h1>
                        </div>

                        {/* Выбор типа теста */}
                        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 max-w-sm">
                            <button onClick={() => setTestType("own")}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${testType === "own" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                                📝 Свои вопросы
                            </button>
                            <button onClick={() => setTestType("link")}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${testType === "link" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                                🔗 Внешняя ссылка
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
                            <h2 className="font-semibold text-gray-900 mb-4">Основная информация</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Название теста</label>
                                    <input type="text" placeholder="Например: Квадратные уравнения" value={testForm.title}
                                        onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                                        className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Предмет</label>
                                    <select value={testForm.subject} onChange={e => setTestForm({ ...testForm, subject: e.target.value })}
                                        className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400">
                                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Для ученика</label>
                                    <select value={testForm.student_name} onChange={e => setTestForm({ ...testForm, student_name: e.target.value })}
                                        className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400">
                                        <option value="">Выбери ученика</option>
                                        {students.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Описание (необязательно)</label>
                                    <input type="text" placeholder="Подсказка для ученика" value={testForm.description}
                                        onChange={e => setTestForm({ ...testForm, description: e.target.value })}
                                        className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                                </div>

                                {/* Поле ссылки — только для внешнего теста */}
                                {testType === "link" && (
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500 mb-1 block">Ссылка на тест</label>
                                        <input type="url" placeholder="https://forms.google.com/... или https://kahoot.it/..." value={testForm.external_link}
                                            onChange={e => setTestForm({ ...testForm, external_link: e.target.value })}
                                            className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                                        <p className="text-xs text-gray-400 mt-1">Google Forms, Kahoot, Quizlet, или любая другая ссылка</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Вопросы — только для своих тестов */}
                        {testType === "own" && (
                            <>
                                {questionForms.map((q, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">Вопрос {i + 1}</h3>
                                            {questionForms.length > 1 && (
                                                <button onClick={() => removeQuestion(i)} className="text-red-400 text-xs hover:text-red-600">Удалить</button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <input type="text" placeholder="Текст вопроса" value={q.question}
                                                onChange={e => updateQuestion(i, "question", e.target.value)}
                                                className="border border-gray-200 px-3 py-2.5 rounded-xl w-full text-sm focus:outline-none focus:border-violet-400" />
                                            <div className="grid grid-cols-2 gap-3">
                                                {["a", "b", "c", "d"].map(opt => (
                                                    <div key={opt} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${q.correct_answer === opt ? "border-emerald-400 bg-emerald-50" : "border-gray-200"}`}>
                                                        <button onClick={() => updateQuestion(i, "correct_answer", opt)}
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.correct_answer === opt ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 text-gray-400"}`}>
                                                            {opt.toUpperCase()}
                                                        </button>
                                                        <input type="text" placeholder={`Вариант ${opt.toUpperCase()}`}
                                                            value={(q as any)[`option_${opt}`]}
                                                            onChange={e => updateQuestion(i, `option_${opt}`, e.target.value)}
                                                            className="flex-1 text-sm focus:outline-none bg-transparent" />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400">Нажми на букву чтобы отметить правильный ответ</p>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addQuestion} className="border border-violet-200 text-violet-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-50 transition-colors mr-3">
                                    + Добавить вопрос
                                </button>
                            </>
                        )}

                        <button onClick={saveTest} disabled={saving || !testForm.title || !testForm.student_name || (testType === "link" && !testForm.external_link)}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
                            {saving ? "Сохраняю..." : "Сохранить тест"}
                        </button>
                    </>
                )}

                {/* ===== ПРОХОЖДЕНИЕ ТЕСТА ===== */}
                {view === "take" && activeTest && (
                    <>
                        <div className="flex items-center gap-4 mb-8">
                            {!submitted && <button onClick={() => setView("list")} className="text-gray-400 hover:text-gray-600 text-sm">← Назад</button>}
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{activeTest.title}</h1>
                                <p className="text-gray-500 text-sm mt-1">{activeTest.subject} · {questions.length} вопросов</p>
                            </div>
                        </div>

                        {submitted ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                                <div className="text-6xl mb-4">{score / questions.length >= 0.8 ? "🎉" : score / questions.length >= 0.5 ? "👍" : "📚"}</div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">{score} / {questions.length}</div>
                                <div className={`text-lg font-semibold mb-4 ${score / questions.length >= 0.8 ? "text-emerald-600" : score / questions.length >= 0.5 ? "text-amber-500" : "text-red-500"}`}>
                                    {Math.round((score / questions.length) * 100)}%
                                </div>
                                <p className="text-gray-500 text-sm mb-6">
                                    {score / questions.length >= 0.8 ? "Отлично! Ты отлично знаешь материал 🌟" : score / questions.length >= 0.5 ? "Неплохо! Но есть что повторить 💪" : "Нужно повторить тему и попробовать снова 📖"}
                                </p>
                                <button onClick={() => setView("list")} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                                    К списку тестов
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Прогресс</span>
                                        <span>{Object.keys(answers).length} / {questions.length}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-4 mb-6">
                                    {questions.map((q, i) => (
                                        <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                            <div className="font-medium text-gray-900 mb-4">{i + 1}. {q.question}</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {["a", "b", "c", "d"].map(opt => (
                                                    <button key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${answers[q.id] === opt ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-200"}`}>
                                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${answers[q.id] === opt ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                                                            {opt.toUpperCase()}
                                                        </span>
                                                        <span className="text-sm text-gray-800">{(q as any)[`option_${opt}`]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={submitTest} disabled={Object.keys(answers).length < questions.length}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
                                    {Object.keys(answers).length < questions.length ? `Ответь на все вопросы (${Object.keys(answers).length}/${questions.length})` : "Сдать тест →"}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
