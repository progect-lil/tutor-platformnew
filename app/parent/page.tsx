"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Summary = {
    totalPaid: number;
    totalPending: number;
    lessonsCompleted: number;
    lessonsTotal: number;
    hwDone: number;
    hwTotal: number;
    topicsDone: number;
};

const StatCard = ({
    href, icon, iconBg, accentColor, title, sub, subClass, progress, progressColor,
}: {
    href: string; icon: string; iconBg: string; accentColor: string;
    title: string; sub: string; subClass?: string; progress: number; progressColor: string;
}) => (
    <Link href={href}
        className="block"
        style={{
            background: "#fff", borderRadius: 16, border: "0.5px solid #E8E6F0",
            padding: "20px", textDecoration: "none", transition: "border-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E8E6F0")}>

        <div className="flex items-center justify-center text-xl"
            style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, marginBottom: 14 }}>
            {icon}
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1523", marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 12, color: subClass === "success" ? "#059669" : subClass === "warn" ? "#D97706" : "#9490A4", fontWeight: subClass ? 500 : 400 }}>
            {sub}
        </div>

        <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#C4B5FD", marginBottom: 4 }}>
                <span>Прогресс</span><span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 4, background: "#F1EFF8", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: progressColor, borderRadius: 99, transition: "width 0.6s ease" }} />
            </div>
        </div>
    </Link>
);

export default function ParentHomePage() {
    const router = useRouter();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [studentName, setStudentName] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase
            .from("profiles").select("id, child_id, role").eq("id", user.id).single();

        if (!profile) { setLoading(false); return; }

        let studentIds: string[] = [];
        if (profile.role === "student") {
            studentIds = [profile.id];
        } else if (profile.role === "parent") {
            if (profile.child_id) {
                studentIds = [profile.child_id];
            } else {
                const { data: children } = await supabase
                    .from("profiles").select("id, full_name")
                    .eq("parent_id", user.id).eq("role", "student");
                if (children && children.length > 0) {
                    studentIds = children.map((c: any) => c.id);
                    if (children[0]?.full_name) setStudentName(children[0].full_name);
                }
            }
        }

        if (studentIds.length === 0) { setLoading(false); return; }

        const { data: subs } = await supabase
            .from("subscriptions").select("id, total_amount, status")
            .in("student_id", studentIds).neq("status", "cancelled");

        const totalPaid = (subs || []).filter(s => s.status === "paid").reduce((a, s) => a + s.total_amount, 0);
        const totalPending = (subs || []).filter(s => s.status === "pending").reduce((a, s) => a + s.total_amount, 0);

        const subIds = (subs || []).map(s => s.id);
        let lessonsCompleted = 0, lessonsTotal = 0;
        if (subIds.length > 0) {
            const { data: lessons } = await supabase
                .from("schedule").select("status").in("subscription_id", subIds);
            lessonsTotal = (lessons || []).length;
            lessonsCompleted = (lessons || []).filter(l => l.status === "completed").length;
        }

        const { data: hw } = await supabase
            .from("homework").select("status").in("student_id", studentIds);
        const hwTotal = (hw || []).length;
        const hwDone = (hw || []).filter(h => h.status === "submitted" || h.status === "graded").length;

        const { data: topics } = await supabase
            .from("topics").select("id").in("student_id", studentIds).eq("is_completed", true);
        const topicsDone = (topics || []).length;

        setSummary({ totalPaid, totalPending, lessonsCompleted, lessonsTotal, hwDone, hwTotal, topicsDone });
        setLoading(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64" style={{ color: "#C4B5FD", fontSize: 14 }}>
            Загрузка...
        </div>
    );

    const hwPct = summary && summary.hwTotal > 0 ? (summary.hwDone / summary.hwTotal) * 100 : 0;
    const lessonsPct = summary && summary.lessonsTotal > 0 ? (summary.lessonsCompleted / summary.lessonsTotal) * 100 : 0;

    return (
        <div style={{ padding: "32px 28px", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1523" }}>Привет 👋</h1>
                {studentName && (
                    <p style={{ fontSize: 13, color: "#9490A4", marginTop: 5 }}>
                        Вы следите за успехами:{" "}
                        <span style={{ color: "#6B6578", fontWeight: 500 }}>{studentName}</span>
                    </p>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <StatCard
                    href="/parent/payments"
                    icon="💰" iconBg="#ECFDF5" accentColor="#A7F3D0"
                    title="Оплата"
                    sub={summary?.totalPending ? `Ожидает: ${summary.totalPending.toLocaleString()} ₽` : "Всё оплачено ✓"}
                    subClass={summary?.totalPending ? "warn" : "success"}
                    progress={100} progressColor="#10B981"
                />
                <StatCard
                    href="/parent/progress?tab=hw"
                    icon="📝" iconBg="#FFFBEB" accentColor="#FDE68A"
                    title="Домашние задания"
                    sub={summary ? `Сдано ${summary.hwDone} из ${summary.hwTotal}` : "—"}
                    progress={hwPct} progressColor="#F59E0B"
                />
                <StatCard
                    href="/parent/progress?tab=schedule"
                    icon="📅" iconBg="#EEF2FF" accentColor="#C7D2FE"
                    title="Расписание"
                    sub={summary ? `Проведено ${summary.lessonsCompleted} из ${summary.lessonsTotal} уроков` : "—"}
                    progress={lessonsPct} progressColor="#6366F1"
                />
                <StatCard
                    href="/parent/progress?tab=topics"
                    icon="📚" iconBg="#F5F3FF" accentColor="#DDD6FE"
                    title="Темы и прогресс"
                    sub={summary ? `Пройдено тем: ${summary.topicsDone}` : "—"}
                    progress={0} progressColor="#8B5CF6"
                />
            </div>

            {summary && summary.totalPending > 0 && (
                <Link href="/parent/payments"
                    style={{
                        marginTop: 16, display: "flex", alignItems: "center", gap: 12,
                        background: "#FFFBEB", border: "0.5px solid #FDE68A", borderRadius: 14,
                        padding: "14px 16px", textDecoration: "none"
                    }}>
                    <span style={{ fontSize: 20 }}>💳</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>
                            Ожидает оплаты: {summary.totalPending.toLocaleString()} ₽
                        </div>
                        <div style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>
                            Нажмите, чтобы перейти к оплате
                        </div>
                    </div>
                    <span style={{ marginLeft: "auto", color: "#D97706" }}>→</span>
                </Link>
            )}
        </div>
    );
}