'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AOSInit from '../../components/AOSInit';
import toast, { Toaster } from 'react-hot-toast';
import { validateLecturer, startSession, stopSession, getSessionStatus } from '../../lib/api';

const DEPARTMENTS = [
    'JSS1',
    'JSS2',
    'JSS3',
    'SS1',
    'SS2',
    'SS3',
];

function toDatetimeString(timeStr) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    // Create a datetime for today with the selected time
    const selectedDateTime = new Date(`${today} ${timeStr}:00`);
    
    // If the selected time is in the past (earlier today), add one day
    if (selectedDateTime <= now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().slice(0, 10);
        return `${tomorrowDate} ${timeStr}:00`;
    }
    
    // Otherwise, use today's date (this handles future times today)
    return `${today} ${timeStr}:00`;
}

function formatCountdown(endsAt) {
    const diff = new Date(endsAt) - new Date();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function Countdown({ endsAt }) {
    const [display, setDisplay] = useState(formatCountdown(endsAt));
    const [expired, setExpired] = useState(new Date(endsAt) <= new Date());
    useEffect(() => {
        const t = setInterval(() => {
            const isExpired = new Date(endsAt) <= new Date();
            setExpired(isExpired);
            setDisplay(isExpired ? '00:00:00' : formatCountdown(endsAt));
        }, 1000);
        return () => clearInterval(t);
    }, [endsAt]);
    if (expired) {
        return (
            <div className="text-center">
                <span className="font-mono font-extrabold text-xl text-amber-500">Time&apos;s up</span>
                <p className="text-xs text-amber-600 mt-1 font-medium">Please stop the session manually</p>
            </div>
        );
    }
    return <span className="font-mono font-extrabold text-2xl text-emerald-600">{display}</span>;
}

// ── Login screen ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
    const [lecturerId, setLecturerId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const id = lecturerId.trim().toUpperCase();
        if (!id) { setError('Please enter your Lecturer ID.'); return; }
        setLoading(true);
        setError('');
        const res = await validateLecturer(id);
        setLoading(false);
        if (res.success) {
            localStorage.setItem('fa_lecturer', JSON.stringify(res.lecturer));
            toast.success(res.message || `Welcome, ${res.lecturer.full_name}!`);
            onLogin(res.lecturer);
        } else {
            setError(res.message || 'Invalid Lecturer ID.');
        }
    };

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
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
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                            </div>
                            <span className="hidden md:block text-gray-500 text-xs">Lecturer Portal</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        {[['/', 'Home'], ['/dashboard', 'Dashboard'], ['/register', 'Register'], ['/students', 'Students'], ['/lecturer', 'Lecturer', true]].map(([href, label, active]) => (
                            <Link key={href} href={href}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={active
                                    ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' }
                                    : { color: '#9ca3af' }}>
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            {/* RED Hero Section with BIG Image */}
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
                                    <span className="text-white text-xs font-semibold uppercase tracking-widest">Lecturer Portal</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                                    by BENX
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-5xl sm:text-6xl lg:text-7xl text-white">Lecturer</span>
                                <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{ color: 'rgba(255,200,200,0.9)' }}>Sign In</span>
                            </h1>

                            <p className="text-red-100 text-base sm:text-lg max-w-xl leading-relaxed mb-8" data-aos="fade-up" data-aos-delay="300">
                                Enter your pre-assigned Lecturer ID to access the session control panel and manage attendance.
                            </p>

                            {/* Info cards */}
                            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="400">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">🎓</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">LEC001-020</p>
                                        <p className="text-red-200 text-xs">Pre-assigned IDs</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">⏱️</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Session Control</p>
                                        <p className="text-red-200 text-xs">Start & Stop</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — lecturer.jpg with premium frame - BIG & RESPONSIVE */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                {/* Outer glow */}
                                <div className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
                                    style={{ background: 'radial-gradient(circle, rgba(193,18,31,0.6), transparent)', animation: 'glow-pulse 3s ease-in-out infinite' }} />

                                {/* Image card */}
                                <div className="relative rounded-3xl overflow-hidden"
                                    style={{ border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                    <img src="/main.jpg" alt="Lecturer Portal"
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

                                    {/* Secure badge */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
                                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-white text-[10px] font-semibold">SECURE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Card */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <div className="max-w-md mx-auto" data-aos="zoom-in" data-aos-delay="300">
                    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                        <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                                style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>🎓</div>
                            <div>
                                <p className="font-bold text-white">Lecturer Login</p>
                                <p className="text-xs text-gray-400">IDs are pre-assigned (LEC001–LEC020)</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                                    Lecturer ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={lecturerId}
                                    onChange={e => { setLecturerId(e.target.value); setError(''); }}
                                    placeholder="e.g. LEC001"
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-widest focus:outline-none focus:ring-2 transition-all uppercase"
                                    style={{ 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(193,18,31,0.2)', 
                                        color: '#fff',
                                        focusRing: 'rgba(193,18,31,0.3)'
                                    }}
                                />
                                {error && (
                                    <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
                                        <span className="text-red-500 flex-shrink-0 text-sm">⚠</span>
                                        <p className="text-red-400 text-xs font-medium">{error}</p>
                                    </div>
                                )}
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)', boxShadow: '0 4px 20px rgba(193,18,31,0.35)' }}>
                                {loading ? '⏳ Verifying...' : '🔐 Sign In'}
                            </button>
                        </form>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        Don&apos;t know your ID? Contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function LecturerPage() {
    const [lecturer, setLecturer] = useState(null);       // null = not logged in
    const [authChecked, setAuthChecked] = useState(false); // avoid flash

    // Restore from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('fa_lecturer');
            if (saved) setLecturer(JSON.parse(saved));
        } catch { /* ignore */ }
        setAuthChecked(true);
    }, []);

    const handleLogin = (lecturerData) => setLecturer(lecturerData);

    const handleLogout = () => {
        localStorage.removeItem('fa_lecturer');
        sessionStorage.removeItem('fa_session');
        setLecturer(null);
    };

    if (!authChecked) return null; // avoid hydration flash
    if (!lecturer) return <LoginScreen onLogin={handleLogin} />;
    return <SessionPanel lecturer={lecturer} onLogout={handleLogout} />;
}

// ── Session panel (shown after login) ────────────────────────────────────
function SessionPanel({ lecturer, onLogout }) {
    const [form, setForm] = useState({
        department: lecturer.department || '',
        semester: '',
        course_code: '',
        course_name: '',
        end_time: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [markedCount, setMarkedCount] = useState(0);
    const pollRef = useRef(null);

    const inputCls = (field) =>
        `w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
            errors[field]
                ? 'border-red-500 focus:ring-red-500/20 bg-red-500/5 text-red-400'
                : 'border-gray-700 focus:ring-red-500/20 focus:border-red-500 bg-white/5 text-white'
        }`;

    // Restore active session on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('fa_session');
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            getSessionStatus(parsed.department, parsed.semester)
                .then(data => {
                    if (data.active && data.session) {
                        setActiveSession({ ...parsed, ...data.session });
                        setMarkedCount(data.session.marked_students ?? 0);
                    } else {
                        sessionStorage.removeItem('fa_session');
                    }
                })
                .catch(() => sessionStorage.removeItem('fa_session'));
        } catch {
            sessionStorage.removeItem('fa_session');
        }
    }, []);

    // Poll while session active
    const pollStatus = useCallback(async (session) => {
        if (!session) return;
        try {
            const data = await getSessionStatus(session.department, session.semester);
            if (data.active && data.session) {
                setMarkedCount(data.session.marked_students ?? 0);
            } else {
                setActiveSession(null);
                sessionStorage.removeItem('fa_session');
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (activeSession) {
            pollRef.current = setInterval(() => pollStatus(activeSession), 30000);
        }
        return () => clearInterval(pollRef.current);
    }, [activeSession, pollStatus]);

    const validate = () => {
        const e = {};
        if (!form.department)           e.department  = 'Required';
        if (!form.semester)             e.semester    = 'Required';
        if (!form.course_code.trim())   e.course_code = 'Required';
        if (!form.course_name.trim())   e.course_name = 'Required';
        if (!form.end_time)             e.end_time    = 'Required';
        // Removed future time validation - lecturers can set any time
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleStart = async () => {
        if (!validate()) { toast.error('Please fill in all required fields.', { icon: '⚠️' }); return; }
        setLoading(true);
        try {
            const data = await startSession({
                lecturer_id:   lecturer.lecturer_id,
                lecturer_name: lecturer.full_name,
                department:    form.department,
                semester:      Number(form.semester),
                course_code:   form.course_code.trim(),
                course_name:   form.course_name.trim(),
                ends_at:       toDatetimeString(form.end_time),
            });
            if (data.success) {
                const sessionData = { ...data.session, lecturer_id: lecturer.lecturer_id, lecturer_name: lecturer.full_name };
                setActiveSession(sessionData);
                setMarkedCount(0);
                sessionStorage.setItem('fa_session', JSON.stringify(sessionData));
                toast.success('Session started! Students can now mark attendance.', { duration: 5000 });
            } else {
                toast.error(data.message || 'Failed to start session.', {
                    duration: 8000, icon: '🚫',
                    style: { border: '1px solid #fca5a5', background: '#fff1f2', maxWidth: 420 },
                });
            }
        } catch { toast.error('Network error. Check if PHP backend is running.'); }
        finally { setLoading(false); }
    };

    const handleStop = async () => {
        if (!activeSession) return;
        setLoading(true);
        try {
            const data = await stopSession({ session_id: activeSession.id, lecturer_id: lecturer.lecturer_id });
            if (data.success) {
                setActiveSession(null);
                sessionStorage.removeItem('fa_session');
                toast.success('Session stopped. Attendance is now closed.', { duration: 5000 });
            } else {
                toast.error(data.message || 'Failed to stop session.');
            }
        } catch { toast.error('Network error. Check if PHP backend is running.'); }
        finally { setLoading(false); }
    };

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
                            <span className="hidden md:block text-gray-500 text-xs">Lecturer Session Control</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        {[['/', 'Home'], ['/dashboard', 'Dashboard'], ['/register', 'Register'], ['/students', 'Students'], ['/lecturer', 'Lecturer', true]].map(([href, label, active]) => (
                            <Link key={href} href={href}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={active
                                    ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' }
                                    : { color: '#9ca3af' }}>
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Lecturer identity + logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-xs font-bold text-white">{lecturer.full_name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{lecturer.lecturer_id}</p>
                        </div>
                        <button onClick={onLogout}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                            style={{ background: 'rgba(193,18,31,0.2)', border: '1px solid rgba(193,18,31,0.3)' }}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero with clock.jpg */}
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
                                    <span className="text-white text-xs font-semibold uppercase tracking-widest">Session Control</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                                    by BENX
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-5xl sm:text-6xl lg:text-7xl text-white">Lecturer</span>
                                <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{ color: 'rgba(255,200,200,0.9)' }}>Panel</span>
                            </h1>

                            <p className="text-red-100 text-base sm:text-lg max-w-xl leading-relaxed mb-8" data-aos="fade-up" data-aos-delay="300">
                                Signed in as <span className="font-bold text-white">{lecturer.full_name}</span>
                                <span className="text-red-200 font-mono ml-2 text-xs">({lecturer.lecturer_id})</span>
                            </p>

                            {/* Info cards */}
                            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="400">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">🎓</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Start Session</p>
                                        <p className="text-red-200 text-xs">Control Attendance</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">⏱️</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Real-Time</p>
                                        <p className="text-red-200 text-xs">Live Tracking</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — clock.jpg with premium frame - BIG & RESPONSIVE */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                {/* Outer glow */}
                                <div className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
                                    style={{ background: 'radial-gradient(circle, rgba(193,18,31,0.6), transparent)', animation: 'glow-pulse 3s ease-in-out infinite' }} />

                                {/* Image card */}
                                <div className="relative rounded-3xl overflow-hidden"
                                    style={{ border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                    <img src="/clock.jpg" alt="Session Control"
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

                                    {/* Active badge */}
                                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 15px rgba(34,197,94,0.6)' }}>
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                    </div>

                                    {/* Live badge */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1"
                                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-white text-[10px] font-semibold">ACTIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* Left: info */}
                    <div className="lg:col-span-2 space-y-5" data-aos="fade-right">
                        {/* Lecturer card */}
                        <div className="rounded-3xl p-5" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Profile</p>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                                    {lecturer.full_name?.[0] ?? '?'}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{lecturer.full_name}</p>
                                    <p className="text-xs text-gray-400 font-mono">{lecturer.lecturer_id}</p>
                                </div>
                            </div>
                            {lecturer.department && (
                                <p className="text-xs text-gray-300 rounded-xl px-3 py-2" style={{ background: 'rgba(193,18,31,0.1)', border: '1px solid rgba(193,18,31,0.2)' }}>
                                    {lecturer.department}
                                </p>
                            )}
                        </div>

                        <div className="rounded-3xl p-5" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">How It Works</p>
                            <div className="space-y-3">
                                {[
                                    ['1', 'Select your class and term'],
                                    ['2', 'Enter your course code and name'],
                                    ['3', 'Set the lecture end time'],
                                    ['4', 'Click Start — students can now scan their face'],
                                    ['5', 'Click Stop when done'],
                                ].map(([n, t]) => (
                                    <div key={n} className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>{n}</span>
                                        <p className="text-xs text-gray-300 leading-relaxed">{t}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl p-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">⚠ Important</p>
                            <div className="space-y-2 text-xs text-amber-200">
                                <p>• Only one session per class + term at a time.</p>
                                <p>• End time: Future times use today&apos;s date, past times use tomorrow&apos;s date.</p>
                                <p>• Session stays open until you manually click Stop (end time is for reference).</p>
                                <p>• Students outside your class/term cannot mark attendance.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: form / active session */}
                    <div className="lg:col-span-3" data-aos="fade-left" data-aos-delay="200">
                        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

                            {!activeSession ? (
                                <>
                                    <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                                            style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>🎓</div>
                                        <div>
                                            <p className="font-bold text-white">Start Attendance Session</p>
                                            <p className="text-xs text-gray-400">Fill in all fields to open attendance for your class</p>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4">

                                        {/* Class */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                Class <span className="text-red-500">*</span>
                                            </label>
                                            <select value={form.department}
                                                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                                className={inputCls('department')}>
                                                <option value="">— Select Class —</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            {errors.department && <p className="text-red-500 text-xs mt-1">⚠ {errors.department}</p>}
                                        </div>

                                        {/* Term */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                Term <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { value: 1, label: 'First Term' },
                                                    { value: 2, label: 'Second Term' },
                                                    { value: 3, label: 'Third Term' }
                                                ].map(t => (
                                                    <button key={t.value} type="button"
                                                        onClick={() => setForm(p => ({ ...p, semester: t.value }))}
                                                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                                            Number(form.semester) === t.value
                                                                ? 'text-white border-transparent shadow-md'
                                                                : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-[#C1121F] bg-gray-50'
                                                        }`}
                                                        style={Number(form.semester) === t.value ? { background: 'linear-gradient(135deg,#C1121F,#E63946)' } : {}}>
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.semester && <p className="text-red-500 text-xs mt-1">⚠ {errors.semester}</p>}
                                        </div>

                                        {/* Course Code + Name */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                    Course Code <span className="text-red-500">*</span>
                                                </label>
                                                <input type="text" placeholder="e.g. CSE201"
                                                    value={form.course_code}
                                                    onChange={e => setForm(p => ({ ...p, course_code: e.target.value }))}
                                                    className={inputCls('course_code')} />
                                                {errors.course_code && <p className="text-red-500 text-xs mt-1">⚠ {errors.course_code}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                    Course Name <span className="text-red-500">*</span>
                                                </label>
                                                <input type="text" placeholder="e.g. Data Structures"
                                                    value={form.course_name}
                                                    onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))}
                                                    className={inputCls('course_name')} />
                                                {errors.course_name && <p className="text-red-500 text-xs mt-1">⚠ {errors.course_name}</p>}
                                            </div>
                                        </div>

                                        {/* End Time */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                                Lecture End Time <span className="text-red-500">*</span>
                                            </label>
                                            <input type="time" value={form.end_time}
                                                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                                                className={inputCls('end_time')} />
                                            {errors.end_time
                                                ? <p className="text-red-500 text-xs mt-1">⚠ {errors.end_time}</p>
                                                : <p className="text-gray-400 text-xs mt-1">Set any future time. If you select a past time, it will be scheduled for tomorrow. Session stays open until you click Stop.</p>
                                            }
                                        </div>

                                        <button onClick={handleStart} disabled={loading}
                                            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)', boxShadow: '0 4px 20px rgba(193,18,31,0.35)' }}>
                                            {loading ? '⏳ Starting...' : '🎯 Start Attendance Session'}
                                        </button>

                                        <Link href={`/lecturer/${encodeURIComponent(lecturer.lecturer_id)}/report`}
                                            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-500 hover:border-[#C1121F] hover:text-[#C1121F] transition-all">
                                            📊 View My Report
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="px-6 py-5 flex items-center gap-3"
                                        style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                                        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-white font-bold">Session Active</p>
                                            <p className="text-red-100 text-xs">Class {activeSession.department} · {activeSession.semester === 1 ? 'First Term' : activeSession.semester === 2 ? 'Second Term' : activeSession.semester === 3 ? 'Third Term' : `${activeSession.semester}th Term`}</p>
                                        </div>
                                        <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">LIVE</span>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                ['Course',      activeSession.course_name],
                                                ['Code',        activeSession.course_code],
                                                ['Class',       activeSession.department],
                                                ['Term',        activeSession.semester === 1 ? 'First Term' : activeSession.semester === 2 ? 'Second Term' : activeSession.semester === 3 ? 'Third Term' : `${activeSession.semester}th Term`],
                                                ['Lecturer',    lecturer.full_name],
                                                ['ID',          lecturer.lecturer_id],
                                            ].map(([k, v]) => (
                                                <div key={k} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{k}</p>
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{v || '—'}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Time Remaining</p>
                                                <Countdown endsAt={activeSession.expected_end_time || toDatetimeString(form.end_time)} />
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Ends at {activeSession.expected_end_time
                                                        ? new Date(activeSession.expected_end_time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
                                                        : form.end_time}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Students Present</p>
                                                <span className="text-3xl font-extrabold text-emerald-600">{markedCount}</span>
                                                <p className="text-xs text-gray-400 mt-1">marked attendance</p>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                                            <span className="text-green-600">✓</span>
                                            <p className="text-green-700 text-xs font-semibold">
                                                Attendance is OPEN for {activeSession.department} ({activeSession.semester === 1 ? 'First Term' : activeSession.semester === 2 ? 'Second Term' : activeSession.semester === 3 ? 'Third Term' : `${activeSession.semester}th Term`})
                                            </p>
                                        </div>

                                        <button onClick={handleStop} disabled={loading}
                                            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                                            style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)' }}>
                                            {loading ? '⏳ Stopping...' : '🛑 Stop Session'}
                                        </button>

                                        <Link href={`/lecturer/${encodeURIComponent(lecturer.lecturer_id)}/report`}
                                            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-[#C1121F] text-[#C1121F] hover:bg-red-50 transition-all">
                                            📊 View My Report
                                        </Link>

                                        <p className="text-center text-xs text-gray-400">
                                            Updates every 30 seconds · Students outside this class cannot mark attendance
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white py-4 mt-4">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: '#C1121F' }}>FA</div>
                        <span className="font-medium text-gray-500">FaceAttend — Lecturer Panel</span>
                    </div>
                    <button onClick={onLogout} className="text-[#C1121F] font-medium hover:underline">Sign Out</button>
                </div>
            </footer>
        </div>
    );
}
