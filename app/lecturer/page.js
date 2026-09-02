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
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const id = identifier.trim();
        const pass = password.trim();
        if (!id) { setError('Please enter your Username or Lecturer ID.'); return; }
        if (!pass) { setError('Please enter your password.'); return; }

        setLoading(true);
        setError('');
        const res = await loginLecturer(id, pass);
        setLoading(false);
        if (res.success && res.lecturer) {
            localStorage.setItem('fa_lecturer', JSON.stringify(res.lecturer));
            toast.success(res.message || `Welcome, ${res.lecturer.full_name}!`, { icon: '👨🏾‍🏫' });
            onLogin(res.lecturer);
        } else {
            setError(res.message || 'Invalid username or password.');
        }
    };

    const selectFaculty = (lec) => {
        setIdentifier(lec.username);
        setPassword(lec.password);
        setError('');
        setShowPicker(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-0" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
                @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 25px rgba(37,99,235,0.3); } 50% { box-shadow: 0 0 50px rgba(16,185,129,0.5); } }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* Top School Banner */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[11px] py-1.5 px-4 text-center font-semibold tracking-wide border-b border-white/10 flex items-center justify-center gap-2">
                <span>🏛️</span>
                <span>Salvation Heritage Schools • Faculty & Instructor Portal</span>
            </div>

            {/* Navbar */}
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
                                    Faculty
                                </span>
                            </div>
                            <span className="hidden md:block text-slate-400 text-xs">Instructor Session Terminal</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link href="/" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-all no-underline">
                            ← Return to Kiosk
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Blue-Emerald Hero Section */}
            <div className="relative text-white overflow-hidden py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 bg-blue-500 blur-3xl animate-float" />
                    <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full opacity-20 bg-emerald-400 blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80"></div>
                                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Faculty Portal</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                    Salvation Heritage
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4">
                                <span className="block text-4xl sm:text-6xl lg:text-7xl text-white font-serif">Faculty</span>
                                <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Sign In</span>
                            </h1>

                            <p className="text-slate-200 text-base sm:text-lg max-w-xl leading-relaxed mb-6 font-medium">
                                Sign in with your username and password to open classroom attendance sessions for students.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md">
                                    <span className="text-2xl">👨🏾‍🏫</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">13 Faculty Members</p>
                                        <p className="text-emerald-300 text-xs mt-0.5">Nigerian Faculty Directory</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md">
                                    <span className="text-2xl">⏱️</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Live Kiosk Sync</p>
                                        <p className="text-emerald-300 text-xs mt-0.5">Biometric Face Tracking</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[26rem]">
                                <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                                <div className="relative rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900">
                                    <img src="/main.jpg" alt="Salvation Heritage Faculty"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '320px' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Card */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1">
                <div className="max-w-lg mx-auto" data-aos="zoom-in" data-aos-delay="300">
                    <div className="rounded-3xl overflow-hidden bg-slate-900 border border-blue-500/30 shadow-2xl">
                        <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/50">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg bg-gradient-to-r from-blue-600 to-emerald-600">
                                🎓
                            </div>
                            <div>
                                <p className="font-bold text-white">Faculty Authentication</p>
                                <p className="text-xs text-slate-400">Salvation Heritage Instructor Portal</p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Username or Lecturer ID <span className="text-emerald-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={e => { setIdentifier(e.target.value); setError(''); }}
                                    placeholder="e.g. babatunde.adeyemi or LEC001"
                                    autoFocus
                                    className="w-full px-4 py-3 rounded-2xl border text-sm font-mono focus:outline-none focus:border-emerald-500 bg-slate-950 border-slate-700 text-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Password <span className="text-emerald-400">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 bg-slate-950 border-slate-700 text-white transition-all"
                                />
                            </div>

                            {error && (
                                <div className="mt-2 flex items-start gap-2 rounded-2xl px-3 py-2.5 bg-rose-500/10 border border-rose-500/30">
                                    <span className="text-rose-400 flex-shrink-0 text-sm">⚠</span>
                                    <p className="text-rose-400 text-xs font-medium">{error}</p>
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full py-4 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50">
                                {loading ? '⏳ Verifying...' : '🔐 Sign In to Session Control'}
                            </button>

                            {/* 13 Nigerian Faculty Members Quick Profile Selector */}
                            <div className="pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(v => !v)}
                                    className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-300 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between transition-all">
                                    <span className="flex items-center gap-2">
                                        <span>⚡</span>
                                        <span>Select from 13 Nigerian Faculty Profiles (1-Click)</span>
                                    </span>
                                    <span>{showPicker ? '▲' : '▼'}</span>
                                </button>

                                {showPicker && (
                                    <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                        {NIGERIAN_FACULTY.map(lec => (
                                            <button
                                                key={lec.lecturer_id}
                                                type="button"
                                                onClick={() => selectFaculty(lec)}
                                                className="w-full p-2.5 rounded-2xl bg-slate-950/80 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 text-left transition-all flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="text-xl">{lec.avatar}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{lec.full_name}</p>
                                                        <p className="text-[10px] text-emerald-400 truncate">{lec.department} • <span className="font-mono text-slate-400">{lec.username}</span></p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 flex-shrink-0">
                                                    Select
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

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
                <Link href="/students" className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white no-underline">
                    <span className="text-xl">👥</span>
                    <span className="text-[10px] font-bold">Students</span>
                </Link>
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
        `w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
            errors[field]
                ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                : 'border-slate-700 focus:border-emerald-500 bg-slate-950 text-white'
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
                toast.success('Session started! Students can now scan attendance.', { duration: 5000 });
            } else {
                toast.error(data.message || 'Failed to start session.', {
                    duration: 8000, icon: '🚫',
                    style: { border: '1px solid #fca5a5', background: '#0f172a', color: '#fff', maxWidth: 420 },
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
        <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
                @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 25px rgba(37,99,235,0.3); } 50% { box-shadow: 0 0 50px rgba(16,185,129,0.5); } }
                select option { background-color: #0f172a !important; color: #fff !important; }
                select { color-scheme: dark; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* Top School Banner */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[11px] py-1.5 px-4 text-center font-semibold tracking-wide border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>🏛️</span>
                    <span>Salvation Heritage Schools • Faculty Terminal</span>
                </div>
                <div className="text-emerald-400 font-bold text-[10px]">
                    Logged in as {lecturer.full_name}
                </div>
            </div>

            {/* Navbar for Logged In Lecturer */}
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
                                    Faculty Active
                                </span>
                            </div>
                            <span className="hidden md:block text-slate-400 text-xs">Instructor Session Terminal</span>
                        </div>
                    </Link>

                    {/* Dedicated Faculty Navigation (No admin links) */}
                    <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                        <span className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600 shadow-md shadow-blue-600/30">
                            👨🏾‍🏫 Class Session Portal
                        </span>
                        <Link href="/" className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                            📸 View Kiosk
                        </Link>
                    </div>

                    {/* Lecturer identity + logout */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="hidden sm:block text-right">
                            <p className="text-xs font-bold text-white">{lecturer.full_name}</p>
                            <p className="text-[10px] text-emerald-400 font-mono">{lecturer.department} • {lecturer.lecturer_id}</p>
                        </div>
                        <button onClick={onLogout}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                            <span>🚪</span>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Blue-Emerald Hero Section */}
            <div className="relative text-white overflow-hidden py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80"></div>
                                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Class Session Control</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                    Salvation Heritage
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4">
                                <span className="block text-4xl sm:text-6xl lg:text-7xl text-white font-serif">Session</span>
                                <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Management</span>
                            </h1>

                            <p className="text-slate-200 text-base sm:text-lg max-w-xl leading-relaxed mb-6 font-medium">
                                Instructor: <span className="font-bold text-white">{lecturer.full_name}</span>
                                <span className="text-emerald-300 font-mono ml-2 text-xs">({lecturer.lecturer_id})</span>
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md">
                                    <span className="text-2xl">🎓</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Instant Kiosk Sync</p>
                                        <p className="text-emerald-300 text-xs mt-0.5">Automated Biometrics</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md">
                                    <span className="text-2xl">⏱️</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">Real-Time Poll</p>
                                        <p className="text-emerald-300 text-xs mt-0.5">Live Attendance Count</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[26rem]">
                                <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                                <div className="relative rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900">
                                    <img src="/clock.jpg" alt="Session Control"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '320px' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* Left: info */}
                    <div className="lg:col-span-2 space-y-5" data-aos="fade-right">
                        {/* Lecturer card */}
                        <div className="rounded-3xl p-6 bg-slate-900 border border-blue-500/25 shadow-xl">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Instructor Credentials</p>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 bg-gradient-to-tr from-blue-600 to-emerald-500">
                                    {lecturer.full_name?.[0] ?? 'L'}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{lecturer.full_name}</p>
                                    <p className="text-xs text-emerald-400 font-mono">{lecturer.lecturer_id}</p>
                                </div>
                            </div>
                            {lecturer.department && (
                                <p className="text-xs text-slate-300 rounded-2xl px-3.5 py-2 bg-blue-500/10 border border-blue-500/20">
                                    Assigned: {lecturer.department}
                                </p>
                            )}
                        </div>

                        <div className="rounded-3xl p-6 bg-slate-900 border border-blue-500/25 shadow-xl">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Instructions</p>
                            <div className="space-y-3">
                                {[
                                    ['1', 'Select target class and term'],
                                    ['2', 'Input course subject details'],
                                    ['3', 'Set lecture closing window'],
                                    ['4', 'Click Start Session — Kiosk unlocks immediately'],
                                    ['5', 'Click Stop Session when class concludes'],
                                ].map(([n, t]) => (
                                    <div key={n} className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 bg-gradient-to-r from-blue-600 to-emerald-600">{n}</span>
                                        <p className="text-xs text-slate-300 leading-relaxed">{t}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: form / active session */}
                    <div className="lg:col-span-3" data-aos="fade-left" data-aos-delay="200">
                        <div className="rounded-3xl overflow-hidden bg-slate-900 border border-blue-500/25 shadow-xl">

                            {!activeSession ? (
                                <>
                                    <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
                                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-emerald-600">
                                            🎓
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">Start Attendance Session</p>
                                            <p className="text-xs text-slate-400">Open biometric attendance for your students</p>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {/* Class */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                                Class <span className="text-emerald-400">*</span>
                                            </label>
                                            <select value={form.department}
                                                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                                className={inputCls('department')}>
                                                <option value="">— Select Class (JSS1 to SS3) —</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            {errors.department && <p className="text-rose-400 text-xs mt-1">⚠ {errors.department}</p>}
                                        </div>

                                        {/* Term */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                                Academic Term <span className="text-emerald-400">*</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {[
                                                    { value: 1, label: 'First Term' },
                                                    { value: 2, label: 'Second Term' },
                                                    { value: 3, label: 'Third Term' }
                                                ].map(t => (
                                                    <button key={t.value} type="button"
                                                        onClick={() => setForm(p => ({ ...p, semester: t.value }))}
                                                        className={`py-3 rounded-2xl text-xs font-bold transition-all ${
                                                            Number(form.semester) === t.value
                                                                ? 'text-white bg-gradient-to-r from-blue-600 to-emerald-600 shadow-md shadow-blue-500/30'
                                                                : 'bg-slate-950 border border-slate-700 text-slate-400 hover:bg-slate-800'
                                                        }`}>
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.semester && <p className="text-rose-400 text-xs mt-1">⚠ {errors.semester}</p>}
                                        </div>

                                        {/* Course Code + Name */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                                    Subject Code <span className="text-emerald-400">*</span>
                                                </label>
                                                <input type="text" placeholder="e.g. MTH101"
                                                    value={form.course_code}
                                                    onChange={e => setForm(p => ({ ...p, course_code: e.target.value }))}
                                                    className={inputCls('course_code')} />
                                                {errors.course_code && <p className="text-rose-400 text-xs mt-1">⚠ {errors.course_code}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                                    Subject Name <span className="text-emerald-400">*</span>
                                                </label>
                                                <input type="text" placeholder="e.g. General Mathematics"
                                                    value={form.course_name}
                                                    onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))}
                                                    className={inputCls('course_name')} />
                                                {errors.course_name && <p className="text-rose-400 text-xs mt-1">⚠ {errors.course_name}</p>}
                                            </div>
                                        </div>

                                        {/* End Time */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                                Class End Time <span className="text-emerald-400">*</span>
                                            </label>
                                            <input type="time" value={form.end_time}
                                                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                                                className={inputCls('end_time')} />
                                            {errors.end_time
                                                ? <p className="text-rose-400 text-xs mt-1">⚠ {errors.end_time}</p>
                                                : <p className="text-slate-400 text-xs mt-1">Attendance stays open until manually closed.</p>
                                            }
                                        </div>

                                        <button onClick={handleStart} disabled={loading}
                                            className="w-full py-4 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50">
                                            {loading ? '⏳ Starting...' : '🎯 Open Attendance Session'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="px-6 py-5 flex items-center gap-3 bg-gradient-to-r from-blue-900 to-emerald-900 border-b border-emerald-500/30">
                                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-white font-black">Session Active</p>
                                            <p className="text-emerald-200 text-xs">Class {activeSession.department} • {activeSession.semester === 1 ? 'First Term' : activeSession.semester === 2 ? 'Second Term' : 'Third Term'}</p>
                                        </div>
                                        <span className="bg-emerald-500/30 text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-400/40">LIVE</span>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                ['Subject',      activeSession.course_name],
                                                ['Code',         activeSession.course_code],
                                                ['Class',        activeSession.department],
                                                ['Term',         activeSession.semester === 1 ? 'First Term' : activeSession.semester === 2 ? 'Second Term' : 'Third Term'],
                                                ['Instructor',   lecturer.full_name],
                                                ['ID',           lecturer.lecturer_id],
                                            ].map(([k, v]) => (
                                                <div key={k} className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{k}</p>
                                                    <p className="text-sm font-bold text-white truncate">{v || '—'}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time Remaining</p>
                                                <Countdown endsAt={activeSession.expected_end_time || toDatetimeString(form.end_time)} />
                                            </div>
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Students Marked</p>
                                                <span className="text-3xl font-black text-emerald-400">{markedCount}</span>
                                            </div>
                                        </div>

                                        <button onClick={handleStop} disabled={loading}
                                            className="w-full py-4 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-xl shadow-rose-600/30 active:scale-95 transition-all disabled:opacity-50">
                                            {loading ? '⏳ Stopping...' : '🛑 Stop Session'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12 text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-tr from-blue-700 to-emerald-500">
                            SH
                        </div>
                        <span className="font-semibold text-slate-300">Salvation Heritage Faculty Terminal</span>
                    </div>
                    <button onClick={onLogout} className="text-rose-400 hover:underline">Sign Out</button>
                </div>
            </footer>

            {/* Mobile Faculty Bottom Bar */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 py-2.5 px-4 flex items-center justify-between shadow-2xl shadow-black">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white truncate max-w-[170px]">{lecturer.full_name}</span>
                </div>
                <button onClick={onLogout}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30">
                    🚪 Sign Out
                </button>
            </div>
        </div>
    );
}
