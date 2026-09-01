'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AOSInit from '../../components/AOSInit';
import { getStudents, deleteStudent } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

const PHOTO = (id) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/get-student-photo.php?student_id=${id}`;

function initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function semColor(sem) {
    // Each semester gets a unique, vibrant color for easy identification
    const colors = [
        '#3b82f6',  // Sem 1 - Blue
        '#10b981',  // Sem 2 - Green
        '#f59e0b',  // Sem 3 - Orange
        '#8b5cf6',  // Sem 4 - Purple
        '#ec4899',  // Sem 5 - Pink
        '#06b6d4'   // Sem 6 - Cyan
    ];
    return colors[(sem - 1) % colors.length] || '#3b82f6';
}

function StudentCard({ student, onDelete }) {
    const [imgError, setImgError] = useState(false);
    const col = semColor(student.semester);
    const reg = student.registered_at
        ? new Date(student.registered_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return (
        <div className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 cursor-pointer"
            style={{ background: 'linear-gradient(145deg, #1a0a0a, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>

            {/* Hover glow border */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(193,18,31,0.6), 0 0 30px rgba(193,18,31,0.15)' }} />

            {/* Top accent bar */}
            <div className="h-1 w-full relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, #C1121F, ${col}, #ff6b6b)` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{ animation: 'shimmer 2s infinite' }} />
            </div>

            {/* Photo */}
            <div className="relative h-52 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0a, #2d0a0a)' }}>
                {!imgError ? (
                    <img src={PHOTO(student.student_id)} alt={student.full_name}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1a0a0a, #2d0a0a)' }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-2xl"
                            style={{ background: `linear-gradient(135deg, #C1121F, ${col})`, boxShadow: '0 0 30px rgba(193,18,31,0.5)' }}>
                            {initials(student.full_name)}
                        </div>
                    </div>
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
                    style={{ background: 'linear-gradient(135deg, rgba(193,18,31,0.92), rgba(15,15,15,0.85))', backdropFilter: 'blur(4px)' }}>
                    <div className="text-center px-4 space-y-2">
                        <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/20">
                            <p className="text-xs font-mono text-white tracking-wider">{student.student_id}</p>
                        </div>
                        <p className="text-xs text-red-200">Registered {reg}</p>
                        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-white/15 text-white border border-white/25">
                            Active Student
                        </span>
                    </div>
                </div>

                {/* Term badge */}
                <div className="absolute top-3 right-3 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/30 shadow-lg"
                    style={{ background: col, boxShadow: `0 0 15px ${col}80` }}>
                    <span className="text-xs font-bold text-white">
                        {student.semester === 1 ? '1st Term' : student.semester === 2 ? '2nd Term' : student.semester === 3 ? '3rd Term' : `${student.semester}th Term`}
                    </span>
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
                <p className="text-xs text-gray-400 truncate mb-3">
                    Class {student.department} · {student.semester === 1 ? 'First Term' : student.semester === 2 ? 'Second Term' : student.semester === 3 ? 'Third Term' : `${student.semester}th Term`}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col, boxShadow: `0 0 6px ${col}` }} />
                        <span className="text-xs text-gray-400 truncate max-w-[120px]">{student.department}</span>
                    </div>
                    <button onClick={() => onDelete(student)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                        style={{ background: 'rgba(193,18,31,0.15)', border: '1px solid rgba(193,18,31,0.3)' }}
                        title="Delete student">
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Registered</p>
                        <p className="text-xs font-semibold text-gray-300">{reg}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.3)' }}>
                        Active
                    </span>
                </div>
            </div>

            {/* Bottom glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(90deg, transparent, #C1121F, transparent)' }} />
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
        const result = await deleteStudent(student.student_id);
        setDeletingId(null);
        if (result.success) {
            toast.success(`${student.full_name} deleted.`);
            loadStudents();
        } else {
            toast.error(result.message || 'Failed to delete student.');
        }
    }, [loadStudents]);

    const departments = useMemo(() => ['all', ...new Set(students.map(s => s.department).filter(Boolean))], [students]);
    const semesters   = useMemo(() => ['all', ...new Set(students.map(s => s.semester).filter(Boolean)).values()].sort(), [students]);

    const filtered = useMemo(() => students.filter(s => {
        const q = search.toLowerCase();
        return (
            (!q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q)) &&
            (filterDept === 'all' || s.department === filterDept) &&
            (filterSem  === 'all' || String(s.semester) === String(filterSem))
        );
    }), [students, search, filterDept, filterSem]);

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes glow-pulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(193,18,31,0.4); }
                    50% { box-shadow: 0 0 40px rgba(193,18,31,0.8), 0 0 60px rgba(193,18,31,0.3); }
                }
                select option { background-color: #1a0a0a !important; color: #fff !important; }
            `}</style>

            <Toaster position="top-right" toastOptions={{
                style: { borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#1a0a0a', color: '#fff', border: '1px solid rgba(193,18,31,0.3)' }
            }} />

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 w-full" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 20px rgba(193,18,31,0.5)' }}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm sm:text-base tracking-tight">Face Attendance</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                            </div>
                            <span className="hidden md:block text-gray-500 text-xs">Student Management Portal</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        {[['/', 'Home'], ['/dashboard', 'Dashboard'], ['/register', 'Register'], ['/students', 'Students', true], ['/lecturer', 'Lecturer']].map(([href, label, active]) => (
                            <Link key={href} href={href}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={active
                                    ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' }
                                    : { color: '#9ca3af' }}
                                onMouseEnter={e => { if (!active) { e.target.style.color = '#fff'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}}
                                onMouseLeave={e => { if (!active) { e.target.style.color = '#9ca3af'; e.target.style.background = 'transparent'; }}}>
                                {label}
                            </Link>
                        ))}
                    </div>

                    <Link href="/register"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 15px rgba(193,18,31,0.4)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Register</span>
                    </Link>
                </div>
            </nav>

            {/* ── RED Hero Section ── */}
            <div className="relative text-white overflow-hidden py-16 sm:py-20 px-4 sm:px-6"
                style={{ background: 'linear-gradient(135deg, #6b0000 0%, #9b0d18 25%, #C1121F 55%, #e63946 80%, #ff6b6b 100%)' }}>

                {/* Animated circles background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #ff0000, transparent)', animation: 'float 8s ease-in-out infinite' }} />
                    <div className="absolute top-10 right-1/3 w-64 h-64 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #ff4444, transparent)', animation: 'float 10s ease-in-out infinite 2s' }} />
                    <div className="absolute -bottom-10 right-10 w-96 h-96 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #c0392b, transparent)', animation: 'float 12s ease-in-out infinite 1s' }} />
                    <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #ff6b6b, transparent)', animation: 'float 9s ease-in-out infinite 3s' }} />
                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-5" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

                        {/* Left — text */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-3 mb-5 flex-wrap">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px #4ade80' }}></div>
                                    <span className="text-white text-xs font-semibold uppercase tracking-widest">Student Portal</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                                    by BENX
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4">
                                <span className="block text-5xl sm:text-6xl lg:text-7xl text-white">Student</span>
                                <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{ color: 'rgba(255,200,200,0.9)' }}>Management</span>
                            </h1>

                            <p className="text-red-100 text-base sm:text-lg max-w-xl leading-relaxed mb-8">
                                Comprehensive enrollment and attendance management powered by Amazon Rekognition facial recognition technology.
                            </p>

                            {/* Stats row */}
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { icon: '👥', val: students.length, label: 'Total Students' },
                                    { icon: '🏫', val: departments.length - 1, label: 'Classes' },
                                    { icon: '📚', val: semesters.length - 1, label: 'Terms' },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                        <span className="text-2xl">{s.icon}</span>
                                        <div>
                                            <p className="text-white font-black text-xl leading-none">{s.val}</p>
                                            <p className="text-red-200 text-xs">{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — student.jpg with premium frame - BIGGER & RESPONSIVE */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                {/* Outer glow */}
                                <div className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
                                    style={{ background: 'radial-gradient(circle, rgba(193,18,31,0.6), transparent)', animation: 'glow-pulse 3s ease-in-out infinite' }} />

                                {/* Image card */}
                                <div className="relative rounded-3xl overflow-hidden"
                                    style={{ border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                    <img src="/crowed.jpg" alt="Student"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.1) contrast(1.05) saturate(1.1)', minHeight: '400px' }} />

                                    {/* Bottom gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                    {/* Corner brackets */}
                                    {[
                                        'top-3 left-3 border-t-2 border-l-2 rounded-tl-lg',
                                        'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
                                        'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg',
                                        'bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg',
                                    ].map((cls, i) => (
                                        <div key={i} className={`absolute w-8 h-8 border-white/70 ${cls}`} />
                                    ))}

                                    {/* Verified badge */}
                                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 15px rgba(34,197,94,0.6)' }}>
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>

                                    {/* Live badge */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
                                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-white text-[10px] font-semibold">LIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* ── Filter Bar ── */}
                <div className="rounded-2xl p-5 mb-8" data-aos="fade-up"
                    style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input type="text" placeholder="Search by name or student ID..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(193,18,31,0.6)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                            {search && (
                                <button onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Dropdowns */}
                        <div className="flex flex-wrap gap-3">
                            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                                className="px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer transition-all duration-200"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '160px' }}>
                                <option value="all">All Classes</option>
                                {departments.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            <select value={filterSem} onChange={e => setFilterSem(e.target.value)}
                                className="px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer transition-all duration-200"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '140px' }}>
                                <option value="all">All Terms</option>
                                {semesters.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s === 1 ? 'First Term' : s === 2 ? 'Second Term' : s === 3 ? 'Third Term' : `${s}th Term`}</option>)}
                            </select>

                            {/* View toggle */}
                            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                {[['grid', '⊞'], ['list', '☰']].map(([v, icon]) => (
                                    <button key={v} onClick={() => setView(v)}
                                        className="px-4 py-3 text-sm font-semibold transition-all duration-200"
                                        style={view === v
                                            ? { background: 'linear-gradient(135deg, #C1121F, #e63946)', color: '#fff' }
                                            : { background: 'transparent', color: '#6b7280' }}>
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary row */}
                    <div className="mt-4 pt-4 flex items-center justify-between flex-wrap gap-3"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black" style={{ color: '#C1121F' }}>{filtered.length}</span>
                            <span className="text-gray-400 text-sm">student{filtered.length !== 1 ? 's' : ''} found</span>
                        </div>
                        {(search || filterDept !== 'all' || filterSem !== 'all') && (
                            <button onClick={() => { setSearch(''); setFilterDept('all'); setFilterSem('all'); }}
                                className="text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 hover:scale-105"
                                style={{ background: 'rgba(193,18,31,0.15)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.3)' }}>
                                ✕ Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(193,18,31,0.2)' }} />
                            <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '3px solid transparent', borderTopColor: '#C1121F' }} />
                            <div className="absolute inset-2 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#e63946', animationDirection: 'reverse', animationDuration: '1.5s' }} />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-semibold">Loading Students...</p>
                            <p className="text-gray-500 text-sm mt-1">Fetching enrollment data</p>
                        </div>
                        <div className="flex gap-2">
                            {[0, 0.15, 0.3].map((d, i) => (
                                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#C1121F', animationDelay: `${d}s` }} />
                            ))}
                        </div>
                    </div>

                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl p-16 text-center"
                        style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.15)' }}>
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(193,18,31,0.1)', border: '1px solid rgba(193,18,31,0.2)' }}>
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No Students Found</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Try adjusting your filters or register a new student.</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={() => { setSearch(''); setFilterDept('all'); setFilterSem('all'); }}
                                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                                style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)' }}>
                                Clear Filters
                            </button>
                            <Link href="/register"
                                className="px-6 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all hover:scale-105"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                Register Student
                            </Link>
                        </div>
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
                    /* List view */
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr style={{ background: 'rgba(193,18,31,0.1)', borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                                        {['Student', 'Class', 'Term', 'Registered', ''].map(h => (
                                            <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#ff6b6b' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s, i) => (
                                        <tr key={s.student_id || s.id}
                                            className="transition-colors"
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,18,31,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                                                        style={{ border: '1px solid rgba(193,18,31,0.3)' }}>
                                                        <img src={PHOTO(s.student_id)} alt={s.full_name}
                                                            className="w-full h-full object-cover"
                                                            onError={e => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentNode.style.background = 'linear-gradient(135deg,#C1121F,#e63946)';
                                                                e.target.parentNode.style.display = 'flex';
                                                                e.target.parentNode.style.alignItems = 'center';
                                                                e.target.parentNode.style.justifyContent = 'center';
                                                                e.target.parentNode.style.color = '#fff';
                                                                e.target.parentNode.style.fontSize = '11px';
                                                                e.target.parentNode.style.fontWeight = '700';
                                                                e.target.parentNode.textContent = initials(s.full_name);
                                                            }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{s.full_name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{s.student_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-400 text-xs">{s.department}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                                                    style={{ background: semColor(s.semester), boxShadow: `0 0 8px ${semColor(s.semester)}60` }}>
                                                    {s.semester === 1 ? '1st Term' : s.semester === 2 ? '2nd Term' : s.semester === 3 ? '3rd Term' : `${s.semester}th Term`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500 text-xs">
                                                {s.registered_at ? new Date(s.registered_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <button onClick={() => handleDelete(s)} disabled={deletingId === s.student_id}
                                                    className="text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-40"
                                                    style={{ background: 'rgba(193,18,31,0.15)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.3)' }}>
                                                    {deletingId === s.student_id ? '...' : '✕ Delete'}
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
            <footer className="mt-12 py-6" style={{ borderTop: '1px solid rgba(193,18,31,0.15)', background: 'rgba(0,0,0,0.5)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)' }}>
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">Face Attendance System</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                            </div>
                            <p className="text-gray-600 text-xs">Advanced facial recognition attendance solution</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        {[
                            { dot: '#C1121F', label: `${students.length} students` },
                            { dot: '#e63946', label: `${departments.length - 1} classes` },
                            { dot: '#22c55e', label: 'System Active', pulse: true },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.pulse ? 'animate-pulse' : ''}`}
                                    style={{ background: item.dot, boxShadow: `0 0 6px ${item.dot}` }} />
                                <span className="text-gray-400 text-xs font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>© 2024 Face Attendance System by BENX. All rights reserved.</span>
                    <div className="flex items-center gap-4">
                        {['/dashboard', '/register', '/'].map((href, i) => (
                            <Link key={href} href={href}
                                className="hover:text-red-400 transition-colors">
                                {['Dashboard', 'Register', 'Home'][i]}
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
