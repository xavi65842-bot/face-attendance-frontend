'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { getDashboardData } from '../../lib/api';

const PHOTO = (id) => `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/get-student-photo.php?student_id=${id}`;
const FALLBACK = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a0a0a"/><text x="50" y="62" text-anchor="middle" fill="%23C1121F" font-size="42" font-family="sans-serif">?</text></svg>`;
const DEPT_COLORS = ['#C1121F','#e63946','#ff6b6b','#ff4757','#c0392b','#e74c3c','#ff3838'];
const card = { background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' };



/* ── Circular progress ring ── */
function Ring({ value, max = 100, size = 64, stroke = 5, color = '#C1121F' }) {
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
    if (pct >= 90) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>⭐ Excellent</span>;
    if (pct >= 80) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>✓ On Track</span>;
    if (pct >= 75) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>↗ Good</span>;
    if (pct >= 60) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>⚠ Fair</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(193,18,31,0.15)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.3)' }}>✕ At Risk</span>;
}

/* ── Liquid bar ── */
function LiquidBar({ presentDays, totalDays = 90 }) {
    const pct = Math.min(Math.round((presentDays / totalDays) * 100), 100);
    const met = pct >= 80;
    const color = met ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#C1121F';
    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Attendance</span>
                <span className="text-[10px] font-bold" style={{ color }}>{pct}% · {presentDays}/{totalDays}</span>
            </div>
            <div className="relative h-5 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}30` }}>
                <div className="absolute left-0 top-0 h-full rounded-lg transition-all duration-1000"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}40` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
                </div>
                <div className="absolute top-0 bottom-0 w-px" style={{ left: '80%', background: met ? '#22c55e' : 'rgba(255,255,255,0.2)' }} />
                {pct > 15 && <span className="absolute inset-0 flex items-center pl-2 text-[9px] font-black text-white">{pct}%</span>}
            </div>
            <p className="mt-1 text-[9px] font-semibold" style={{ color }}>
                {met ? '✓ 80% rule met' : `${80 - pct}% more needed`}
            </p>
        </div>
    );
}

function barColor(pct) {
    if (pct >= 90) return '#22c55e';
    if (pct >= 75) return '#3b82f6';
    if (pct >= 60) return '#f59e0b';
    return '#C1121F';
}

export default function DashboardPage() {
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({ department: 'all', semester: 'all', year_intake: 'all' });
    const [available, setAvailable] = useState({ departments: [], semesters: [1,2,3,4,5,6], intakes: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('grid');
    const [hoveredId, setHoveredId] = useState(null);
    const [now, setNow] = useState(new Date());
    const [lastRefresh, setLastRefresh] = useState(null);

    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDashboardData(filters);
            if (data) {
                setStudents(data.students);
                setStats(data.statistics);
                setAvailable({ departments: data.filters.departments, semesters: data.filters.semesters, intakes: data.filters.intakes });
                setLastRefresh(new Date());
            }
        } catch { toast.error('Failed to load dashboard data'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { const t = setInterval(fetchData, 60000); return () => clearInterval(t); }, [fetchData]);

    const filtered = students.filter(s =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase())
    );
    const absent = stats ? stats.total_students - stats.today_present : 0;

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <style>{`
                @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
                @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(193,18,31,0.4)} 50%{box-shadow:0 0 40px rgba(193,18,31,0.8)} }
                @keyframes count-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                select option { background-color: #1a0a0a !important; color: #fff !important; }
                select { color-scheme: dark; }
            `}</style>

            <Toaster position="top-right" toastOptions={{
                style: { borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#1a0a0a', color: '#fff', border: '1px solid rgba(193,18,31,0.3)' }
            }} />

            {/* ── Navbar ── */}
            <header className="sticky top-0 z-40 w-full" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 20px rgba(193,18,31,0.5)' }}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm sm:text-base">Face Attendance</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                            </div>
                            <span className="hidden md:block text-gray-500 text-xs">Real-time attendance tracking</span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-1">
                        {[['/', 'Home'], ['/dashboard', 'Dashboard', true], ['/register', 'Register'], ['/students', 'Students'], ['/lecturer', 'Lecturer']].map(([href, label, active]) => (
                            <Link key={href} href={href}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
                                style={active ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' } : { color: '#9ca3af' }}>
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="hidden sm:block text-right">
                            <p className="text-xs text-gray-500">{now.toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            <p className="text-sm font-mono font-bold" style={{ color: '#ff6b6b' }}>{now.toLocaleTimeString()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={fetchData}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 12px rgba(193,18,31,0.4)' }}>
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
                        <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: '#C1121F' }} />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Students</span>
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(193,18,31,0.15)' }}>
                                        <svg className="w-5 h-5" style={{ color: '#ff6b6b' }} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M16 17V19H2V17S2 13 9 13 16 17 16 17M12.5 7.5A3.5 3.5 0 1 0 9 11A3.5 3.5 0 0 0 12.5 7.5M15.94 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13M15 4A3.39 3.39 0 0 0 13.07 4.59A5 5 0 0 1 13.07 10.41A3.39 3.39 0 0 0 15 11A3.5 3.5 0 0 0 15 4Z"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-white" style={{ animation: 'count-up 0.5s ease' }}>{stats.total_students}</span>
                                    <span className="text-sm font-semibold text-gray-500 mb-1">enrolled</span>
                                </div>
                            </div>
                        </div>

                        {/* Present Today */}
                        <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: '#22c55e' }} />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Present Today</span>
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                                        <svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black" style={{ color: '#22c55e', animation: 'count-up 0.5s ease' }}>{stats.today_present}</span>
                                    <span className="text-sm font-semibold text-gray-500 mb-1">
                                        {stats.total_students > 0 ? `${Math.round((stats.today_present / stats.total_students) * 100)}%` : '0%'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Absent Today */}
                        <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: '#f59e0b' }} />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Absent Today</span>
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                                        <svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black" style={{ color: '#f59e0b', animation: 'count-up 0.5s ease' }}>{absent}</span>
                                    <span className="text-sm font-semibold text-gray-500 mb-1">
                                        {stats.total_students > 0 ? `${Math.round((absent / stats.total_students) * 100)}%` : '0%'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Avg Attendance */}
                        <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105" style={card}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: '#3b82f6' }} />
                            <div className="relative">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Attendance</span>
                                    <Ring value={stats.average_attendance} max={100} size={40} stroke={4} color="#3b82f6" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black" style={{ color: '#3b82f6', animation: 'count-up 0.5s ease' }}>
                                        {Math.round(stats.average_attendance)}%
                                    </span>
                                    <span className="text-sm font-semibold text-gray-500 mb-1">overall</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Class Statistics ── */}
                {stats && (
                    <div className="mb-8">
                        <div className="rounded-2xl p-6" style={card}>
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(193,18,31,0.15)' }}>
                                    <svg className="w-5 h-5" style={{ color: '#ff6b6b' }} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                    </svg>
                                </div>
                                Class Statistics
                            </h3>
                            
                            {/* Each Class gets its own Circle */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                {stats.department_stats?.map((dept, idx) => {
                                    const deptColor = DEPT_COLORS[idx % DEPT_COLORS.length];
                                    const maxStudents = Math.max(...stats.department_stats.map(d => d.count));
                                    const percentage = maxStudents > 0 ? (dept.count / maxStudents) * 100 : 0;
                                    
                                    return (
                                        <div key={dept.department} className="text-center p-4 rounded-xl transition-all duration-300 hover:scale-105" 
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            
                                            {/* Circle for this Class */}
                                            <div className="relative mb-3 flex justify-center">
                                                <Ring 
                                                    value={percentage} 
                                                    max={100} 
                                                    size={90} 
                                                    stroke={6} 
                                                    color={deptColor} 
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-black text-white">{dept.count}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Students</span>
                                                </div>
                                            </div>

                                            {/* Class Name */}
                                            <h4 className="font-bold text-white text-sm mb-1 truncate" title={dept.department}>
                                                {dept.department}
                                            </h4>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Term Stats ── */}
                {stats && (
                    <div className="mb-8">
                        {/* Term Distribution */}
                        <div className="rounded-2xl p-6" style={card}>
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                                    <svg className="w-4 h-4" style={{ color: '#3b82f6' }} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V5H19V19Z"/>
                                    </svg>
                                </div>
                                Term Distribution
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {stats.semester_stats?.map((sem, idx) => {
                                    const maxSemStudents = Math.max(...stats.semester_stats.map(s => s.count));
                                    const percentage = maxSemStudents > 0 ? (sem.count / maxSemStudents) * 100 : 0;
                                    const semColor = ['#3b82f6','#06b6d4','#10b981'][idx % 3];
                                    const termLabel = sem.semester === 1 ? 'First Term' : sem.semester === 2 ? 'Second Term' : sem.semester === 3 ? 'Third Term' : `${sem.semester}th Term`;
                                    
                                    return (
                                        <div key={sem.semester} className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="relative mb-3 flex justify-center">
                                                <Ring value={percentage} max={100} size={80} stroke={6} color={semColor} />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-lg font-black text-white">{sem.count}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-300">{termLabel}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Filters & Search ── */}
                <div className="rounded-2xl p-6 mb-8" style={card}>
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Search Students</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name, ID, or Class..."
                                    className="w-full px-4 py-3 pl-11 rounded-xl text-sm font-medium text-white transition-all focus:outline-none focus:ring-2"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(193,18,31,0.2)' }}
                                />
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-2/3">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Class</label>
                                <select
                                    value={filters.department}
                                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white transition-all focus:outline-none focus:ring-2"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(193,18,31,0.2)' }}>
                                    <option value="all">All Classes</option>
                                    {available.departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Term</label>
                                <select
                                    value={filters.semester}
                                    onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white transition-all focus:outline-none focus:ring-2"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(193,18,31,0.2)' }}>
                                    <option value="all">All Terms</option>
                                    {available.semesters.map(s => <option key={s} value={s}>{s === 1 ? 'First Term' : s === 2 ? 'Second Term' : s === 3 ? 'Third Term' : `${s}th Term`}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={() => setView('grid')}
                                className="px-4 py-3 rounded-xl text-sm font-bold transition-all"
                                style={view === 'grid' ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' } : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Grid
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className="px-4 py-3 rounded-xl text-sm font-bold transition-all"
                                style={view === 'list' ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' } : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                                List
                            </button>
                        </div>
                    </div>

                    {/* Results Count */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(193,18,31,0.2)' }}>
                        <p className="text-sm font-semibold text-gray-400">
                            Showing <span style={{ color: '#ff6b6b' }}>{filtered.length}</span> of <span style={{ color: '#ff6b6b' }}>{students.length}</span> students
                            {lastRefresh && <span className="ml-2 text-xs">· Last updated {lastRefresh.toLocaleTimeString()}</span>}
                        </p>
                    </div>
                </div>

                {/* ── Students Grid/List ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#C1121F', borderTopColor: 'transparent' }} />
                            <p className="text-sm font-semibold text-gray-400">Loading students...</p>
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl p-12 text-center" style={card}>
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <h3 className="text-xl font-bold text-white mb-2">No students found</h3>
                        <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map((student, idx) => {
                            const pct = Math.round((student.present_days / 90) * 100);
                            const deptColor = DEPT_COLORS[idx % DEPT_COLORS.length];
                            return (
                                <div
                                    key={student.student_id}
                                    onMouseEnter={() => setHoveredId(student.student_id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                                    style={{ background: 'linear-gradient(145deg, #1a0a0a, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
                                    
                                    {/* Hover glow border */}
                                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                        style={{ boxShadow: `inset 0 0 0 1px ${deptColor}99, 0 0 30px ${deptColor}40` }} />

                                    {/* Top accent bar */}
                                    <div className="h-1 w-full relative overflow-hidden">
                                        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, #C1121F, ${deptColor}, #ff6b6b)` }} />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                            style={{ animation: 'shimmer 2s infinite' }} />
                                    </div>

                                    {/* Photo - BIGGER */}
                                    <div className="relative h-52 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0a, #2d0a0a)' }}>
                                        <img
                                            src={PHOTO(student.student_id)}
                                            alt={student.full_name}
                                            onError={(e) => e.target.src = FALLBACK}
                                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                        />

                                        {/* Dark overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                        {/* Hover overlay with attendance info */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
                                            style={{ background: 'linear-gradient(135deg, rgba(193,18,31,0.92), rgba(15,15,15,0.85))', backdropFilter: 'blur(4px)' }}>
                                            <div className="text-center px-4 space-y-2">
                                                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/20">
                                                    <p className="text-xs font-mono text-white tracking-wider">{student.student_id}</p>
                                                </div>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Ring value={pct} max={100} size={48} stroke={4} color={barColor(pct)} />
                                                    <div className="text-left">
                                                        <p className="text-2xl font-black text-white">{pct}%</p>
                                                        <p className="text-xs text-red-200">Attendance</p>
                                                    </div>
                                                </div>
                                                <Badge pct={pct} />
                                            </div>
                                        </div>

                                        {/* Semester badge */}
                                        <div className="absolute top-3 right-3 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/20"
                                            style={{ background: 'rgba(0,0,0,0.7)' }}>
                                            <span className="text-xs font-bold text-white">{student.semester === 1 ? '1st Term' : student.semester === 2 ? '2nd Term' : student.semester === 3 ? '3rd Term' : `${student.semester}th Term`}</span>
                                        </div>

                                        {/* Live dot */}
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg" style={{ boxShadow: '0 0 6px #4ade80' }}></div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-white text-base mb-0.5 group-hover:text-red-400 transition-colors duration-300 truncate">
                                            {student.full_name}
                                        </h3>
                                        <p className="text-xs text-gray-400 truncate mb-3">Class {student.department} · {student.semester === 1 ? 'First Term' : student.semester === 2 ? 'Second Term' : student.semester === 3 ? 'Third Term' : `${student.semester}th Term`}</p>

                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: deptColor, boxShadow: `0 0 6px ${deptColor}` }} />
                                                <span className="text-xs text-gray-400 truncate">{student.semester === 1 ? '1st Term' : student.semester === 2 ? '2nd Term' : student.semester === 3 ? '3rd Term' : `${student.semester}th Term`}</span>
                                            </div>
                                            <Badge pct={pct} />
                                        </div>

                                        {/* Liquid Bar */}
                                        <LiquidBar presentDays={student.present_days} totalDays={90} />
                                    </div>

                                    {/* Bottom glow line */}
                                    <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ background: `linear-gradient(90deg, transparent, ${deptColor}, transparent)` }} />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={card}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ background: 'rgba(193,18,31,0.1)', borderBottom: '2px solid rgba(193,18,31,0.3)' }}>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Class</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Term</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((student, idx) => {
                                        const pct = Math.round((student.present_days / 90) * 100);
                                        const color = barColor(pct);
                                        return (
                                            <tr key={student.student_id}
                                                className="transition-all duration-200 hover:bg-opacity-50"
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: hoveredId === student.student_id ? 'rgba(193,18,31,0.05)' : 'transparent' }}
                                                onMouseEnter={() => setHoveredId(student.student_id)}
                                                onMouseLeave={() => setHoveredId(null)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={PHOTO(student.student_id)}
                                                            alt={student.full_name}
                                                            onError={(e) => e.target.src = FALLBACK}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            style={{ border: `2px solid ${DEPT_COLORS[idx % DEPT_COLORS.length]}` }}
                                                        />
                                                        <span className="text-sm font-semibold text-white">{student.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-mono text-gray-400">{student.student_id}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-gray-300">{student.department}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold" style={{ color: DEPT_COLORS[idx % DEPT_COLORS.length] }}>
                                                        {student.semester === 1 ? '1st Term' : student.semester === 2 ? '2nd Term' : student.semester === 3 ? '3rd Term' : `${student.semester}th Term`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', maxWidth: '120px' }}>
                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                                                        </div>
                                                        <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge pct={pct} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
