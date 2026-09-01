'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AOSInit from '../../../../components/AOSInit';
import toast, { Toaster } from 'react-hot-toast';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api';

const STATUS_COLOR = {
    good: 'text-green-600',
    warning: 'text-yellow-500',
    at_risk: 'text-red-600',
};

function PctBar({ pct, status }) {
    const color = status === 'good' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#C1121F';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[80px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
            </div>
            <span className={`text-xs font-bold tabular-nums w-10 text-right ${STATUS_COLOR[status] ?? 'text-gray-400'}`}>
                {pct ?? 0}%
            </span>
        </div>
    );
}

function Modal({ title, subtitle, onClose, children }) {
    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col"
                style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.3)', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                    <div>
                        <p className="font-bold text-white text-sm">{title}</p>
                        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-sm ml-4 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-6">{children}</div>
            </div>
        </div>
    );
}

function SessionModal({ session, lecturerId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [photoView, setPhotoView] = useState(null); // { url, name }

    useEffect(() => {
        fetch(`${BASE}/lecturer-report.php?lecturer_id=${encodeURIComponent(lecturerId)}&view=session&session_id=${session.id}`)
            .then(r => r.json())
            .then(d => { if (d.success) setDetail(d); else toast.error(d.message); })
            .catch(() => toast.error('Failed to load roster'))
            .finally(() => setLoading(false));
    }, [lecturerId, session.id]);

    const s = detail?.session ?? session;
    const present = s.present ?? s.marked_students ?? 0;
    const enrolled = s.enrolled ?? s.enrolled_students ?? 0;
    const absent = s.absent ?? (enrolled - present);

    return (
        <Modal
            title={`${s.course_name} (${s.course_code})`}
            subtitle={`${s.day_name}, ${s.date} at ${s.time}`}
            onClose={onClose}>
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    ['Present', present, '#10b981'],
                    ['Absent',  absent,  '#C1121F'],
                    ['Rate',    `${s.attendance_pct ?? 0}%`, '#3b82f6'],
                ].map(([label, val, color]) => (
                    <div key={label} className="rounded-2xl p-3 text-center transition-all duration-300 hover:scale-105"
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}30` }}>
                        <p className="text-xl font-extrabold" style={{ color }}>{val}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 rounded-full border-2 border-[#C1121F] border-t-transparent animate-spin" />
                </div>
            ) : detail?.roster?.length > 0 ? (
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {['Student', 'Time In', 'Status'].map(h => (
                                <th key={h} className="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {detail.roster.map((r, i) => (
                            <tr key={r.student_id} className="transition-colors"
                                style={{ background: i % 2 !== 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            onClick={() => r.photo_url && setPhotoView({ url: r.photo_url, name: r.full_name })}
                                            className={r.photo_url ? 'cursor-pointer' : 'cursor-default'}>
                                            {r.photo_url
                                                ? <img src={r.photo_url} alt={r.full_name}
                                                    className="w-10 h-10 rounded-xl object-cover border-2 flex-shrink-0 hover:border-[#C1121F] transition-colors"
                                                    style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                                                    onError={e => { e.target.style.display = 'none'; }} />
                                                : <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-400"
                                                    style={{ background: 'rgba(255,255,255,0.1)' }}>
                                                    {r.full_name?.[0] ?? '?'}
                                                  </div>
                                            }
                                        </button>
                                        <div>
                                            <p className="font-semibold text-white text-xs">{r.full_name}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{r.student_id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-400">{r.time_in ?? '—'}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`text-xs font-bold ${r.status === 'present' ? 'text-green-400' : 'text-red-400'}`}>
                                        {r.status === 'present' ? '✅ Present' : '❌ Absent'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center text-gray-500 text-sm py-8">No roster data available.</p>
            )}

            {/* Photo lightbox */}
            {photoView && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
                    onClick={() => setPhotoView(null)}>
                    <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <img src={photoView.url} alt={photoView.name}
                            className="w-full rounded-3xl object-cover shadow-2xl border-4 border-white" />
                        <p className="text-center text-white font-bold mt-3 text-sm">{photoView.name}</p>
                        <button onClick={() => setPhotoView(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-700 font-bold shadow-lg text-sm">
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

function StudentModal({ student, lecturerId, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${BASE}/lecturer-report.php?lecturer_id=${encodeURIComponent(lecturerId)}&view=student&student_id=${encodeURIComponent(student.student_id)}`)
            .then(r => r.json())
            .then(d => { if (d.success) setDetail(d); else toast.error(d.message); })
            .catch(() => toast.error('Failed to load student history'))
            .finally(() => setLoading(false));
    }, [lecturerId, student.student_id]);

    const st = detail?.student ?? student;

    return (
        <Modal
            title={st.full_name}
            subtitle={`Class ${st.department} · ${st.semester === 1 ? 'First Term' : st.semester === 2 ? 'Second Term' : st.semester === 3 ? 'Third Term' : `${st.semester}th Term`}`}
            onClose={onClose}>
            {/* Large photo banner */}
            <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {st.photo_url
                    ? <img src={st.photo_url} alt={st.full_name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    : null
                }
                <div className="absolute inset-0 flex items-center justify-center"
                    style={{ display: st.photo_url ? 'none' : 'flex', background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                    <span className="text-white text-6xl font-extrabold">{st.full_name?.[0] ?? '?'}</span>
                </div>
                {/* Gradient overlay with name */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                    <p className="text-white font-bold text-base">{st.full_name}</p>
                    <p className="text-white/70 text-xs font-mono">{st.student_id}</p>
                </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    ['Attended',  st.sessions_attended ?? 0,          '#10b981'],
                    ['Absent',    (st.sessions_held ?? 0) - (st.sessions_attended ?? 0), '#C1121F'],
                    ['Rate',      `${st.attendance_pct ?? 0}%`,        STATUS_COLOR[st.status]?.replace('text-','#').replace('green-600','10b981').replace('yellow-500','f59e0b').replace('red-600','C1121F') ?? '#3b82f6'],
                ].map(([label, val, color]) => (
                    <div key={label} className="rounded-2xl p-3 text-center transition-all duration-300 hover:scale-105"
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}30` }}>
                        <p className="text-xl font-extrabold" style={{ color }}>{val}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 rounded-full border-2 border-[#C1121F] border-t-transparent animate-spin" />
                </div>
            ) : detail?.history?.length > 0 ? (
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {['Date', 'Course', 'Time In', 'Status'].map(h => (
                                <th key={h} className="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {detail.history.map((h, i) => (
                            <tr key={h.session_id} className="transition-colors"
                                style={{ background: i % 2 !== 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td className="py-2.5 px-3">
                                    <p className="text-xs font-semibold text-gray-300">{h.date}</p>
                                    <p className="text-[10px] text-gray-500">{h.day_name}</p>
                                </td>
                                <td className="py-2.5 px-3">
                                    <p className="text-xs font-semibold text-gray-300">{h.course_name}</p>
                                    <p className="text-[10px] text-gray-500">{h.course_code}</p>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-400">{h.time_in ?? '—'}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`text-xs font-bold ${h.status === 'present' ? 'text-green-400' : 'text-red-400'}`}>
                                        {h.status === 'present' ? '✅ Present' : '❌ Absent'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center text-gray-500 text-sm py-8">No attendance history found.</p>
            )}
        </Modal>
    );
}

export default function LecturerReportPage({ params }) {
    const { id: lecturerId } = use(params);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('sessions');
    const [courseFilter, setCourseFilter] = useState('all');
    const [modal, setModal] = useState(null);

    const load = useCallback((course) => {
        const cf = course ?? courseFilter;
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams({ lecturer_id: lecturerId, view: 'overview' });
        if (cf !== 'all') qs.set('course_code', cf);
        fetch(`${BASE}/lecturer-report.php?${qs}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setData(d);
                else setError(d.message || 'Failed to load report');
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [lecturerId, courseFilter]);

    useEffect(() => { load(); }, [load]);

    const closeModal = useCallback(() => setModal(null), []);

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
                @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(193,18,31,0.4); } 50% { box-shadow: 0 0 40px rgba(193,18,31,0.8), 0 0 60px rgba(193,18,31,0.3); } }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#1a0a0a', color: '#fff', border: '1px solid rgba(193,18,31,0.3)' },
                success: { iconTheme: { primary: '#C1121F', secondary: '#fff' } },
            }} />

            {/* Navbar */}
            <nav className="sticky top-0 z-50 w-full" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
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
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                            </div>
                            <span className="hidden md:block text-gray-500 text-xs">Lecturer Report</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {[['/', 'Home'], ['/dashboard', 'Dashboard'], ['/register', 'Register'], ['/students', 'Students'], ['/lecturer', 'Lecturer']].map(([href, label]) => (
                            <Link key={href} href={href}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{ color: '#9ca3af' }}
                                onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={e => { e.target.style.color = '#9ca3af'; e.target.style.background = 'transparent'; }}>
                                {label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Link href="/lecturer"
                            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                            ← Back
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero with report.jpg */}
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
                            <div className="flex items-center gap-3 mb-5 flex-wrap" data-aos="fade-up" data-aos-delay="100">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px #4ade80' }}></div>
                                    <span className="text-white text-xs font-semibold uppercase tracking-widest">Lecturer Report</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                                    by BENX
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-5xl sm:text-6xl lg:text-7xl text-white">View My</span>
                                <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{ color: 'rgba(255,200,200,0.9)' }}>Report</span>
                            </h1>

                            <p className="text-red-100 text-base sm:text-lg max-w-xl leading-relaxed mb-8" data-aos="fade-up" data-aos-delay="300">
                                {data ? `Report for ${lecturerId}` : `Loading report for ${lecturerId}...`}
                                {data?.sessions?.[0] && (
                                    <span className="block mt-2 text-red-200 text-sm">
                                        Class {data.sessions[0].department} · {data.sessions[0].semester === 1 ? 'First Term' : data.sessions[0].semester === 2 ? 'Second Term' : data.sessions[0].semester === 3 ? 'Third Term' : `${data.sessions[0].semester}th Term`}
                                    </span>
                                )}
                            </p>

                            {/* Stats cards */}
                            {data && (
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                        <span className="text-2xl">📅</span>
                                        <div>
                                            <p className="text-white font-black text-xl leading-none">{data.summary.total_sessions}</p>
                                            <p className="text-red-200 text-xs">Sessions</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                        <span className="text-2xl">👥</span>
                                        <div>
                                            <p className="text-white font-black text-xl leading-none">{data.summary.total_students}</p>
                                            <p className="text-red-200 text-xs">Students</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                        <span className="text-2xl">📊</span>
                                        <div>
                                            <p className="text-white font-black text-xl leading-none">{data.summary.avg_attendance_pct ?? 0}%</p>
                                            <p className="text-red-200 text-xs">Avg Rate</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right — report.jpg with premium frame - BIG & RESPONSIVE */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                {/* Outer glow */}
                                <div className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
                                    style={{ background: 'radial-gradient(circle, rgba(193,18,31,0.6), transparent)', animation: 'glow-pulse 3s ease-in-out infinite' }} />

                                {/* Image card */}
                                <div className="relative rounded-3xl overflow-hidden"
                                    style={{ border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                    <img src="/report.jpg" alt="Lecturer Report"
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

                                    {/* Report badge */}
                                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 15px rgba(59,130,246,0.6)' }}>
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                        </svg>
                                    </div>

                                    {/* Data badge */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
                                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        <span className="text-white text-[10px] font-semibold">DATA</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {error && (
                    <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
                        <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
                        <div className="flex-1">
                            <p className="font-semibold text-red-400 text-sm">{error}</p>
                            <p className="text-red-300 text-xs mt-1">
                                Make sure the PHP backend is running and lecturer ID <code className="bg-red-900/30 px-1 rounded">{lecturerId}</code> exists.
                            </p>
                        </div>
                        <button onClick={() => load()}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                            Retry
                        </button>
                    </div>
                )}

                {loading && !data && !error && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-2xl p-5 animate-pulse h-24" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)' }} />
                            ))}
                        </div>
                        <div className="rounded-2xl animate-pulse h-64" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)' }} />
                    </div>
                )}

                {data && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: 'Total Sessions Run',  value: data.summary.total_sessions,             icon: '📅', accent: '#3b82f6' },
                                { label: 'Total Students',      value: data.summary.total_students,             icon: '👥', accent: '#8b5cf6' },
                                { label: 'Avg Attendance Rate', value: `${data.summary.avg_attendance_pct ?? 0}%`, icon: '📊', accent: '#10b981' },
                            ].map(({ label, value, icon, accent }) => (
                                <div key={label} className="rounded-2xl p-5 transition-all duration-300 hover:scale-105"
                                    style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                                        style={{ background: `${accent}20` }}>{icon}</div>
                                    <p className="text-3xl font-extrabold tracking-tight text-white">{value}</p>
                                    <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
                                </div>
                            ))}
                        </div>

                        {data.summary.courses?.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {[{ course_code: 'all', course_name: 'All Courses' }, ...data.summary.courses].map(c => (
                                    <button key={c.course_code}
                                        onClick={() => { setCourseFilter(c.course_code); load(c.course_code); }}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                                            courseFilter === c.course_code
                                                ? 'text-white'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                        style={courseFilter === c.course_code 
                                            ? { background: 'linear-gradient(135deg,#C1121F,#E63946)', boxShadow: '0 0 15px rgba(193,18,31,0.4)' } 
                                            : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {c.course_code === 'all' ? 'All Courses' : `${c.course_code} — ${c.course_name}`}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {[['sessions', '📅 My Sessions'], ['students', '👥 My Students']].map(([key, label]) => (
                                <button key={key} onClick={() => setTab(key)}
                                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        tab === key ? 'text-white' : 'text-gray-400 hover:text-white'
                                    }`}
                                    style={tab === key ? { background: 'linear-gradient(135deg,#C1121F,#E63946)', boxShadow: '0 4px 12px rgba(193,18,31,0.3)' } : {}}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'sessions' && (
                            <div className="rounded-2xl overflow-hidden"
                                style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                {!data.sessions?.length ? (
                                    <div className="py-16 text-center">
                                        <p className="text-4xl mb-3">📅</p>
                                        <p className="text-gray-300 font-semibold text-sm">No sessions found</p>
                                        <p className="text-gray-500 text-xs mt-1">Start a session from the Lecturer panel to see it here.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm min-w-[580px]">
                                            <thead>
                                                <tr style={{ background: 'rgba(193,18,31,0.1)', borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                                                    {['Course', 'Date & Time', 'Present / Enrolled', 'Rate'].map(h => (
                                                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-red-400">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.sessions.map((s, i) => {
                                                    const pct = s.attendance_pct ?? 0;
                                                    const status = pct >= 75 ? 'good' : pct >= 50 ? 'warning' : 'at_risk';
                                                    return (
                                                        <tr key={s.id}
                                                            className="border-b transition-colors cursor-pointer hover:bg-white/5"
                                                            style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                                                            onClick={() => setModal({ type: 'session', item: s })}>
                                                            <td className="px-5 py-3.5">
                                                                <p className="font-semibold text-white">{s.course_name}</p>
                                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{s.course_code}</p>
                                                                {s.is_active && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 mt-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                                                                        LIVE
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <p className="text-xs font-semibold text-gray-300">{s.day_name}, {s.date}</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">at {s.time}</p>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <p className="text-sm font-bold text-white">
                                                                    {s.marked_students}
                                                                    <span className="text-gray-500 font-normal"> / {s.enrolled_students}</span>
                                                                </p>
                                                            </td>
                                                            <td className="px-5 py-3.5">
                                                                <PctBar pct={pct} status={status} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'students' && (
                            <div className="rounded-2xl overflow-hidden"
                                style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                {!data.students?.length ? (
                                    <div className="py-16 text-center">
                                        <p className="text-4xl mb-3">👥</p>
                                        <p className="text-gray-300 font-semibold text-sm">No students found</p>
                                        <p className="text-gray-500 text-xs mt-1">Students appear here once they mark attendance in your sessions.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm min-w-[580px]">
                                            <thead>
                                                <tr style={{ background: 'rgba(193,18,31,0.1)', borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                                                    {['Student', 'Class / Term', 'Sessions', 'Attendance'].map(h => (
                                                        <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-red-400">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.students.map((s, i) => (
                                                    <tr key={s.student_id}
                                                        className="border-b transition-colors cursor-pointer hover:bg-white/5"
                                                        style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                                                        onClick={() => setModal({ type: 'student', item: s })}>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                {s.photo_url
                                                                    ? <img src={s.photo_url} alt={s.full_name}
                                                                        className="w-9 h-9 rounded-full object-cover border-2 flex-shrink-0"
                                                                        style={{ borderColor: 'rgba(193,18,31,0.3)' }}
                                                                        onError={e => { e.target.style.display = 'none'; }} />
                                                                    : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                                        style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                                                                        {s.full_name?.[0] ?? '?'}
                                                                      </div>
                                                                }
                                                                <div>
                                                                    <p className="font-semibold text-white">{s.full_name}</p>
                                                                    <p className="text-xs text-gray-500 font-mono">{s.student_id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <p className="text-xs text-gray-300">{s.department}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{s.semester === 1 ? 'First Term' : s.semester === 2 ? 'Second Term' : s.semester === 3 ? 'Third Term' : `${s.semester}th Term`}</p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <p className="text-sm font-bold text-white">
                                                                {s.sessions_attended}
                                                                <span className="text-gray-500 font-normal"> / {s.sessions_held}</span>
                                                            </p>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <PctBar pct={s.attendance_pct} status={s.status} />
                                                            <span className={`text-[10px] font-bold mt-1 block ${STATUS_COLOR[s.status] ?? 'text-gray-500'}`}>
                                                                {s.status === 'good' ? '● On Track' : s.status === 'warning' ? '● Warning' : '● At Risk'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {modal?.type === 'session' && (
                <SessionModal session={modal.item} lecturerId={lecturerId} onClose={closeModal} />
            )}
            {modal?.type === 'student' && (
                <StudentModal student={modal.item} lecturerId={lecturerId} onClose={closeModal} />
            )}
        </div>
    );
}
