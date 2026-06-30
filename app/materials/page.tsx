"use client";

import Link from "next/link";

export default function MaterialsPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">

            <div className="max-w-6xl mx-auto">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            📂 Материалы
                        </h1>

                        <p className="text-gray-500 mt-2">
                            Справочные материалы для учеников
                        </p>
                    </div>

                    <Link
                        href="/tutor"
                        className="bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50"
                    >
                        ← Назад
                    </Link>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-8">

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="text-3xl mb-3">📄</div>
                        <div className="font-semibold">
                            Конспекты
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Пока пусто
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="text-3xl mb-3">📚</div>
                        <div className="font-semibold">
                            Теория
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Пока пусто
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="text-3xl mb-3">📐</div>
                        <div className="font-semibold">
                            Формулы
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Пока пусто
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="text-3xl mb-3">🎥</div>
                        <div className="font-semibold">
                            Видео
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Пока пусто
                        </div>
                    </div>

                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">

                    <div className="text-6xl mb-4">
                        📂
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Материалы скоро появятся
                    </h2>

                    <p className="text-gray-500">
                        Здесь будут конспекты, формулы, справочники,
                        PDF-файлы и полезные материалы для учеников.
                    </p>

                </div>

            </div>

        </div>
    );
}