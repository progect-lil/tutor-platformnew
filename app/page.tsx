"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [newStudent, setNewStudent] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    fetchStudents();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);
    setLoading(false);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase.from("students").select("*");
    if (!error) setStudents(data || []);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const addStudent = async () => {
    if (!newStudent.trim()) return;
    const { error } = await supabase
      .from("students")
      .insert([{ name: newStudent, level: "Beginner", attendance: "100%" }]);
    if (!error) {
      setNewStudent("");
      setShowAdd(false);
      fetchStudents();
    }
  };

  const deleteStudent = async (id: number) => {
    await supabase.from("students").delete().eq("id", id);
    fetchStudents();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Добро пожаловать 👋</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors border border-gray-200 px-4 py-2 rounded-xl hover:border-red-200"
        >
          Выйти
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-3xl font-bold text-indigo-600">{students.length}</div>
          <div className="text-sm text-gray-500 mt-1">Учеников</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-3xl font-bold text-emerald-600">0</div>
          <div className="text-sm text-gray-500 mt-1">Уроков сегодня</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-3xl font-bold text-amber-500">0</div>
          <div className="text-sm text-gray-500 mt-1">Несданных ДЗ</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-3xl font-bold text-rose-500">0</div>
          <div className="text-sm text-gray-500 mt-1">Долгов</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <Link href="/schedule" className="bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-indigo-100">
          <span className="text-2xl">📅</span>
          <div>
            <div className="font-medium text-indigo-900 text-sm">Расписание</div>
            <div className="text-xs text-indigo-500">Управлять уроками</div>
          </div>
        </Link>
        <Link href="/homework" className="bg-amber-50 hover:bg-amber-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-amber-100">
          <span className="text-2xl">📚</span>
          <div>
            <div className="font-medium text-amber-900 text-sm">Домашка</div>
            <div className="text-xs text-amber-500">Задать и проверить</div>
          </div>
        </Link>
        <Link href="/tests" className="bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-2xl p-4 flex items-center gap-3 border border-emerald-100">
          <span className="text-2xl">🧪</span>
          <div>
            <div className="font-medium text-emerald-900 text-sm">Тесты</div>
            <div className="text-xs text-emerald-500">Создать тест</div>
          </div>
        </Link>
      </div>

      {/* Students */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Ученики</h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            + Добавить
          </button>
        </div>

        {/* Add Student Form */}
        {showAdd && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex gap-3">
            <input
              type="text"
              placeholder="Имя ученика..."
              value={newStudent}
              onChange={(e) => setNewStudent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStudent()}
              className="border border-gray-200 px-4 py-2 rounded-xl flex-1 text-sm focus:outline-none focus:border-indigo-400"
              autoFocus
            />
            <button
              onClick={addStudent}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700"
            >
              Сохранить
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewStudent(""); }}
              className="text-gray-400 px-3 py-2 rounded-xl text-sm hover:text-gray-600"
            >
              Отмена
            </button>
          </div>
        )}

        {/* Student List */}
        {students.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Ученики пока не добавлены
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map((student) => (
              <div key={student.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <Link href={`/students/${student.name?.toLowerCase()}`} className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm">
                    {student.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                    <div className="text-xs text-gray-400">{student.level || "Beginner"} · {student.attendance || "100%"}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {student.file_url && (
                    <a href={student.file_url} target="_blank" className="text-indigo-500 text-xs hover:underline">📎</a>
                  )}
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
