'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AOSInit from '../../components/AOSInit';
import { getStudents, deleteStudent } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';
import AdminGuard from '../../components/AdminGuard';

const PHOTO = (id) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/get-student-photo.php?student_id=${id}`;

function initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function semColor(sem) {
    const colors = [
        '#2563eb',  // Term 1 - Royal Blue
        '#10b981',  // Term 2 - Emerald Green
        '#06b6d4',  // Term 3 - Cyan
        '#8b5cf6',  // Purple
        '#3b82f6',  // Blue
        '#14b8a6'   // Teal
    ];
    return colors[(sem - 1) % colors.length] || '#2563eb';
}

function StudentCard({ student, onDelete }) {
    const [imgError, setImgError] = useState(false);
    const col = semColor(student.semester);
    const reg = student.registered_at
        ? new Date(student.registered_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return (
        <div className="group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-slate-900 border border-blue-500/25 shadow-xl">
            {/* Hover glow border */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.5), 0 0 30px rgba(37,99,235,0.2)' }} />

            {/* Top accent bar */}
            <div className="h-1.5 w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{ animation: 'shimmer 2s infinite' }} />
            </div>

            {/* Photo */}
            <div className="relative h-52 overflow-hidden bg-slate-950">
                {!imgError ? (
                    <img src={PHOTO(student.student_id)} alt={student.full_name}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-2xl bg-gradient-to-tr from-blue-600 to-emerald-500">
                            {initials(student.full_name)}
                        </div>
                    </div>
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-slate-950/85 backdrop-blur-sm">
                    <div className="text-center px-4 space-y-2">
                        <div className="bg-slate-900/90 rounded-2xl px-4 py-2 border border-blue-500/30">
                            <p className="text-xs font-mono text-emerald-300 font-bold tracking-wider">{student.student_id}</p>
                        </div>
                        <p className="text-xs text-slate-300">Enrolled {reg}</p>
                        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Salvation Heritage Student
                        </span>
                    </div>
                </div>

                {/* Term badge */}
                <div className="absolute top-3 left-3 z-10">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-xl text-white shadow-lg bg-slate-900/80 backdrop-blur border border-white/20">
                        {student.semester === 1 ? '1st Term' : student.semester === 2 ? '2nd Term' : student.semester === 3 ? '3rd Term' : `Term ${student.semester}`}
                    </span>
                </div>

                {/* Class badge */}
                <div className="absolute top-3 right-3 z-10">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-blue-600/90 text-white backdrop-blur border border-blue-400/40">
                        {student.department}
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-base truncate group-hover:text-emerald-400 transition-colors">
                            {student.full_name}
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">{student.student_id}</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(student); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        title="Delete Student Record">
                        🗑️
                    </button>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Salvation Heritage</span>
                    <span className="text-emerald-400 font-semibold">Active Profile</span>
                </div>
            </div>
        </div>
    );
}

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [filterSem, setFilterSem] = useState('all');
    const [view, setView] = useState('grid');
    const [deletingId, setDeletingId] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);

    const loadStudents = useCallback(() => {
        setLoading(true);
        getStudents()
            .then(data => setStudents(data || []))
            .catch(() => toast.error('Failed to load students'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    const handleDelete = useCallback(async (student) => {
        if (!confirm(`Delete ${student.full_name}? This will remove them from the database and face collection.`)) return;
        setDeletingId(student.student_id);
        try {
            const data = await deleteStudent(student.student_id);
            if (data.success) {
                toast.success(`${student.full_name} deleted.`);
                setStudents(prev => prev.filter(s => s.student_id !== student.student_id));
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setDeletingId(null);
        }
    }, []);

    // Filter & search
    const filtered = useMemo(() => {
        return students.filter(s => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                s.full_name?.toLowerCase().includes(q) ||
                s.student_id?.toLowerCase().includes(q) ||
                s.department?.toLowerCase().includes(q);
            const matchDept = filterDept === 'all' || s.department === filterDept;
            const matchSem  = filterSem  === 'all' || String(s.semester) === String(filterSem);
            return matchSearch && matchDept && matchSem;
        });
    }, [students, search, filterDept, filterSem]);

    const departments = useMemo(() => {
        const set = new Set(students.map(s => s.department).filter(Boolean));
        return Array.from(set).sort();
    }, [students]);

    const semesters = useMemo(() => [1, 2, 3], []);

    return (
        <AdminGuard title="Salvation Heritage Student Directory">
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-0" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                <AOSInit />
                <style>{`
                    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
                    @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                    .animate-float { animation: float 8s ease-in-out infinite; }
                    select option { background-color: #0f172a !important; color: #fff !important; }
                    select { color-scheme: dark; }
                `}</style>

                <Toaster position="top-right" toastOptions={{
                    style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' }
                }} />

                {/* ── Top School Banner ── */}
                <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[11px] py-1.5 px-3 sm:px-4 font-semibold tracking-wide border-b border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex-shrink-0">👥</span>
                        <span className="truncate">Salvation Heritage Schools • Student Registry</span>
                    </div>
                    <div className="text-emerald-400 font-bold text-[10px] flex-shrink-0 hidden sm:block">
                        Admin Authorization Active
                    </div>
                </div>

                {/* ── Navbar ── */}
                <nav className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                        <Link href="/" className="flex items-center gap-3 no-underline flex-shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500">
                                SH
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-white text-base sm:text-lg">Salvation Heritage</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Directory
                                    </span>
                                </div>
                                <span className="hidden md:block text-slate-400 text-xs">Official Student Roster & Records</span>
                            </div>
                        </Link>

                        {/* Desktop Navbar without Faculty */}
                        <div className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                            <Link href="/" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                                Kiosk
                            </Link>
                            <Link href="/dashboard" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                                Dashboard
                            </Link>
                            <Link href="/students" className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-600/30 no-underline">
                                Students
                            </Link>
                            <Link href="/register" className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all no-underline">
                                + Register
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link href="/register"
                                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-lg shadow-blue-600/30 active:scale-95 transition-all no-underline flex-shrink-0">
                                <span>+</span>
                                <span>Add Student</span>
                            </Link>
                            <button onClick={() => setMobileOpen(v => !v)}
                                aria-label="Toggle mobile menu"
                                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 transition-colors">
                                {mobileOpen ? '✕' : '☰'}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation Dropdown */}
                    {mobileOpen && (
                        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-2">
                            <Link href="/" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 no-underline">
                                📸 Attendance Kiosk
                            </Link>
                            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 no-underline">
                                📊 Admin Dashboard
                            </Link>
                            <Link href="/students" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 no-underline">
                                👥 Student Directory
                            </Link>
                            <Link href="/register" onClick={() => setMobileOpen(false)} className="block py-2.5 px-3 rounded-xl text-xs font-bold text-emerald-400 hover:bg-slate-900 no-underline">
                                📝 Register Student
                            </Link>
                        </div>
                    )}
                </nav>

                {/* ── Blue-Emerald School Hero Section ── */}
                <div className="relative text-white overflow-hidden py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 bg-blue-500 blur-3xl animate-float" />
                        <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full opacity-20 bg-emerald-400 blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                        <div className="absolute -bottom-16 right-10 w-96 h-96 rounded-full opacity-25 bg-teal-500 blur-3xl" style={{ animation: 'float 12s ease-in-out infinite 1s' }} />
                    </div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                            <div className="flex-1 min-w-0" data-aos="fade-right">
                                <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                                    <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80"></div>
                                        <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Student Roster</span>
                                    </div>
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                        Salvation Heritage
                                    </span>
                                </div>

                                <h1 className="font-black tracking-tight leading-none mb-4">
                                    <span className="block text-4xl sm:text-6xl lg:text-7xl text-white font-serif">Student</span>
                                    <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Directory</span>
                                </h1>

                                <p className="text-slate-200 text-base sm:text-lg max-w-xl leading-relaxed mb-6 font-medium">
                                    Browse, search, and manage enrolled students with biometric credentials across Salvation Heritage schools.
                                </p>

                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { icon: '👥', val: students.length, label: 'Enrolled Students' },
                                        { icon: '🏫', val: Math.max(0, departments.length - 1), label: 'Active Classes' },
                                        { icon: '📚', val: Math.max(0, semesters.length - 1), label: 'Academic Terms' },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-default">
                                            <span className="text-2xl">{s.icon}</span>
                                            <div>
                                                <p className="text-white font-black text-xl leading-none">{s.val}</p>
                                                <p className="text-emerald-300 text-xs mt-0.5">{s.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                                <div className="relative group w-80 sm:w-96 md:w-[26rem]">
                                    <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                                    <div className="relative rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900">
                                        <img src="/crowed.jpg" alt="Students in Classroom"
                                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                            style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '320px' }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Filter & Search Bar ── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="rounded-3xl p-5 mb-8 bg-slate-900/90 border border-blue-500/25 shadow-xl">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            {/* Search */}
                            <div className="relative w-full md:w-96">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by name, student ID, or class..."
                                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-xs bg-slate-950 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <select
                                    value={filterDept}
                                    onChange={e => setFilterDept(e.target.value)}
                                    className="px-4 py-3 rounded-2xl text-xs bg-slate-950 text-white border border-slate-700 focus:outline-none focus:border-emerald-500">
                                    <option value="all">All Classes</option>
                                    {departments.filter(d => d !== 'all').map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>

                                <select
                                    value={filterSem}
                                    onChange={e => setFilterSem(e.target.value)}
                                    className="px-4 py-3 rounded-2xl text-xs bg-slate-950 text-white border border-slate-700 focus:outline-none focus:border-emerald-500">
                                    <option value="all">All Terms</option>
                                    {semesters.filter(s => s !== 'all').map(s => (
                                        <option key={s} value={s}>{s === 1 ? '1st Term' : s === 2 ? '2nd Term' : s === 3 ? '3rd Term' : `Term ${s}`}</option>
                                    ))}
                                </select>

                                {/* View Switcher */}
                                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                                    <button
                                        onClick={() => setView('grid')}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                            view === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                        }`}>
                                        Grid
                                    </button>
                                    <button
                                        onClick={() => setView('list')}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                            view === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                        }`}>
                                        Table
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Student List / Grid ── */}
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400 text-sm font-medium">Loading Salvation Heritage student records...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-3xl p-16 text-center bg-slate-900/80 border border-slate-800">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-slate-950 border border-slate-800 text-2xl">
                                🔍
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">No Students Found</h3>
                            <p className="text-slate-400 text-xs mb-6">No matching records found for the selected search and filter criteria.</p>
                            <button onClick={() => { setSearch(''); setFilterDept('all'); setFilterSem('all'); }}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600">
                                Reset Filters
                            </button>
                        </div>
                    ) : view === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filtered.map(s => (
                                <div key={s.student_id || s.id} className={deletingId === s.student_id ? 'opacity-40 pointer-events-none scale-95 transition-all' : ''}>
                                    <StudentCard student={s} onDelete={handleDelete} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                                            <th className="text-left px-6 py-4">Student</th>
                                            <th className="text-left px-6 py-4">Class</th>
                                            <th className="text-left px-6 py-4">Term</th>
                                            <th className="text-left px-6 py-4">Enrolled</th>
                                            <th className="text-right px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filtered.map(s => (
                                            <tr key={s.student_id || s.id} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4">
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
                                                <td className="px-6 py-4 text-xs font-bold text-slate-300">{s.department}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl text-white bg-blue-600/80">
                                                        {s.semester === 1 ? '1st Term' : s.semester === 2 ? '2nd Term' : s.semester === 3 ? '3rd Term' : `Term ${s.semester}`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400">
                                                    {s.registered_at ? new Date(s.registered_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDelete(s)} disabled={deletingId === s.student_id}
                                                        className="text-xs px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all font-bold">
                                                        {deletingId === s.student_id ? '...' : 'Delete'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <footer className="mt-16 py-6 border-t border-slate-800 bg-slate-950 text-slate-500 text-xs">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-tr from-blue-700 to-emerald-500">
                                SH
                            </div>
                            <span className="font-semibold text-slate-300">Salvation Heritage Student Registry</span>
                        </div>
                        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 no-underline">
                            ← Return to Analytics Dashboard
                        </Link>
                    </div>
                </footer>

                {/* Mobile Bottom Bar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-3 flex items-center justify-around shadow-2xl shadow-black">
                    <Link href="/" className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white no-underline">
                        <span className="text-xl">📸</span>
                        <span className="text-[10px] font-bold">Kiosk</span>
                    </Link>
                    <Link href="/register" className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white no-underline">
                        <span className="text-xl">📝</span>
                        <span className="text-[10px] font-bold">Register</span>
                    </Link>
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white no-underline">
                        <span className="text-xl">📊</span>
                        <span className="text-[10px] font-bold">Admin</span>
                    </Link>
                    <Link href="/students" className="flex flex-col items-center gap-1 py-1 px-3 text-cyan-400 font-black no-underline">
                        <span className="text-xl">👥</span>
                        <span className="text-[10px] font-bold">Students</span>
                    </Link>
                </div>
            </div>
        </AdminGuard>
    );
}
