'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { getDashboardData } from '../../lib/api';
import AdminGuard from '../../components/AdminGuard';

const PHOTO = (id) => `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/get-student-photo.php?student_id=${id}`;
const DEPT_COLORS = ['#2563eb', '#10b981', '#06b6d4', '#8b5cf6', '#3b82f6', '#059669', '#14b8a6'];
const card = { background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(59, 130, 246, 0.25)', boxShadow: '0 10px 35px rgba(0,0,0,0.5)' };

/* ── Circular progress ring ── */
function Ring({ value, max = 100, size = 64, stroke = 5, color = '#2563eb' }) {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const safeValue = isNaN(value) || value === null || value === undefined ? 0 : value;
    const offset = circ - (circ * Math.min(safeValue, max)) / max;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${color}80)` }} />
        </svg>
    );
}

/* ── Attendance badge ── */
function Badge({ pct }) {
    if (pct >= 90) return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">⭐ Excellent</span>;
    if (pct >= 80) return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">✓ On Track</span>;
    if (pct >= 75) return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">↗ Good</span>;
    if (pct >= 60) return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">⚠ Fair</span>;
    return <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">✕ At Risk</span>;
}

export default function DashboardPage() {
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({ department: 'all', semester: 'all', year_intake: 'all' });
    const [available, setAvailable] = useState({ departments: [], semesters: [1,2,3], intakes: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getDashboardData(filters);
            if (data && data.success) {
                setStudents(data.students || []);
                setStats(data.stats || null);
                if (data.filters) {
                    setAvailable({
                        departments: data.filters.departments || [],
                        semesters: data.filters.semesters || [1,2,3],
                        intakes: data.filters.intakes || [],
                    });
                }
            } else if (data && data.students) {
                // Compatible format fallback
                setStudents(data.students || []);
                setStats(data.statistics || null);
            } else {
                toast.error(data?.message || 'Failed to load dashboard data');
            }
        } catch (error) {
            toast.error(error.message || 'Error loading dashboard');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { const t = setInterval(fetchData, 60000); return () => clearInterval(t); }, [fetchData]);

    const filtered = students.filter(s =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase())
    );
    const absent = stats ? Math.max(0, (stats.total_students || 0) - (stats.today_present || 0)) : 0;

    return (
        <AdminGuard title="Salvation Heritage Analytics & Management Dashboard">
            <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                <style>{`
                    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
                    @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                    @keyframes count-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                    select option { background-color: #0f172a !important; color: #fff !important; }
                    select { color-scheme: dark; }
                `}</style>

                <Toaster position="top-right" toastOptions={{
                    style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' }
                }} />

                {/* ── Top School Banner ── */}
                <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[11px] py-1.5 px-4 text-center font-semibold tracking-wide border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>🛡️</span>
                        <span>Salvation Heritage Schools • Central Administrative Terminal</span>
                    </div>
                    <div className="text-emerald-400 font-bold text-[10px]">
                        Admin Authorization Active
                    </div>
                </div>

                {/* ── Navbar ── */}
                <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500">
                                SH
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-white text-base sm:text-lg">Salvation Heritage</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Analytics
                                    </span>
                                </div>
                                <span className="hidden md:block text-slate-400 text-xs">Real-Time Attendance Analytics</span>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                            <Link href="/" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                                Kiosk
                            </Link>
                            <Link href="/dashboard" className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-600/30 no-underline">
                                Dashboard
                            </Link>
                            <Link href="/students" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                                Students
                            </Link>
                            <Link href="/lecturer" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                                Faculty
                            </Link>
                            <Link href="/register" className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all no-underline">
                                + Register
                            </Link>
                        </nav>

                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="hidden sm:block text-right">
                                <p className="text-xs text-slate-400">{now.toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                <p className="text-sm font-mono font-bold text-emerald-400">{now.toLocaleTimeString()}</p>
                            </div>
                            <button onClick={fetchData}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all">
                                ↻ Refresh
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Main Content ── */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    {/* ── Stats Grid ── */}
                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* Total Students */}
                            <div className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-blue-500" />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-500/15 border border-blue-500/30">
                                            <span className="text-lg">🎓</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black text-white">{stats.total_students || 0}</span>
                                        <span className="text-sm font-semibold text-slate-400 mb-1">students</span>
                                    </div>
                                </div>
                            </div>

                            {/* Present Today */}
                            <div className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-emerald-500" />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Today</span>
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30">
                                            <span className="text-lg">✓</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black text-emerald-400">{stats.today_present || 0}</span>
                                        <span className="text-sm font-semibold text-slate-400 mb-1">
                                            {stats.total_students > 0 ? `${Math.round(((stats.today_present || 0) / stats.total_students) * 100)}%` : '0%'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Absent Today */}
                            <div className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-amber-500" />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absent Today</span>
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30">
                                            <span className="text-lg">⏳</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black text-amber-400">{absent}</span>
                                        <span className="text-sm font-semibold text-slate-400 mb-1">
                                            {stats.total_students > 0 ? `${Math.round((absent / stats.total_students) * 100)}%` : '0%'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Avg Attendance */}
                            <div className="relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-cyan-500" />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rate</span>
                                        <Ring value={stats.average_attendance || 0} max={100} size={36} stroke={4} color="#06b6d4" />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black text-cyan-400">
                                            {Math.round(stats.average_attendance || 0)}%
                                        </span>
                                        <span className="text-sm font-semibold text-slate-400 mb-1">overall</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Student Attendance Roster Table ── */}
                    <div className="rounded-3xl p-6 mb-8" style={card}>
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Student Attendance Records</h3>
                                <p className="text-xs text-slate-400">Salvation Heritage live biometric attendance tracking</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search students..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-slate-950 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-emerald-500"
                                />
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center">
                                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-slate-400 text-xs">Loading records...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-xs">
                                No student records found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[650px]">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                                            <th className="text-left py-3 px-4">Student</th>
                                            <th className="text-left py-3 px-4">Class</th>
                                            <th className="text-left py-3 px-4">Term</th>
                                            <th className="text-left py-3 px-4">Attendance Rate</th>
                                            <th className="text-left py-3 px-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filtered.map(s => {
                                            const pct = s.attendance_percentage ?? 0;
                                            return (
                                                <tr key={s.student_id || s.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                                                                <img src={PHOTO(s.student_id)} alt={s.full_name} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white text-sm">{s.full_name}</p>
                                                                <p className="text-xs text-slate-400 font-mono">{s.student_id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-bold text-slate-300">{s.department}</td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-xl text-white bg-blue-600/80">
                                                            {s.semester === 1 ? '1st Term' : s.semester === 2 ? '2nd Term' : s.semester === 3 ? '3rd Term' : `Term ${s.semester}`}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                                                                <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{pct}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <Badge pct={pct} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AdminGuard>
    );
}
