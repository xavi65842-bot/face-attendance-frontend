'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CameraCapture from '../components/CameraCapture';
import DebugConsole from '../components/DebugConsole';
import AOSInit from '../components/AOSInit';
import { recognizeFace, getStats, loginLecturer, NIGERIAN_FACULTY } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

const PHOTO_URL = (id) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/get-student-photo.php?student_id=${id}`;

const FALLBACK_SVG = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50" y="58" text-anchor="middle" fill="%23cbd5e1" font-size="38" font-family="sans-serif">?</text></svg>`;

function LiveClock() {
    const [time, setTime] = useState(null);
    useEffect(() => {
        setTime(new Date());
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    if (!time) return null;
    return (
        <div className="text-center">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                {time.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-emerald-300 text-[10px] sm:text-xs mt-1 font-bold tracking-widest uppercase">
                {time.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
        </div>
    );
}

export default function HomePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [lastAttendance, setLastAttendance] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [todayCount, setTodayCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [debugInfo, setDebugInfo] = useState(null);
    const [showDebug, setShowDebug] = useState(false);
    const [showDebugConsole, setShowDebugConsole] = useState(false);

    // Faculty Modal State on Home Page
    const [showFacultyModal, setShowFacultyModal] = useState(false);
    const [facultyUser, setFacultyUser] = useState('');
    const [facultyPass, setFacultyPass] = useState('');
    const [facultyLoading, setFacultyLoading] = useState(false);
    const [facultyError, setFacultyError] = useState('');
    const [showFacultyPicker, setShowFacultyPicker] = useState(false);

    // Mobile nav open state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const stats = await getStats();
            if (stats && isMounted.current) {
                const present = stats.today?.present ?? stats.present ?? 0;
                const total = stats.today?.total_students ?? stats.total_students ?? 0;
                setTodayCount(present);
                setTotalStudents(total);
            }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        fetchStats();
        const t = setInterval(fetchStats, 30000);
        return () => clearInterval(t);
    }, [fetchStats]);

    const handleCapture = useCallback(async (imageDataUrl) => {
        if (!isMounted.current) return;
        setCapturedImage(imageDataUrl);
        setIsLoading(true);
        setDebugInfo({ status: 'Sending image to biometric engine...', time: new Date().toLocaleTimeString() });
        try {
            const result = await recognizeFace(imageDataUrl);
            if (!isMounted.current) return;
            setDebugInfo({ status: 'Response received', result, time: new Date().toLocaleTimeString() });
            
            if (result.success && result.student) {
                const studentName = result.student.full_name || result.student.name || 'Student';
                const isAlreadyMarked = result.already_marked === true || result.attendance_marked === false;

                if (isAlreadyMarked) {
                    toast(`👋 Welcome back, ${studentName}! Attendance already recorded.`, {
                        duration: 5000,
                        icon: '👋',
                        style: { border: '2px solid #f59e0b', background: '#0f172a', color: '#fef3c7', fontWeight: 600 },
                    });
                } else {
                    toast.success(result.message || `✅ Attendance marked for ${studentName}!`, { 
                        duration: 4000,
                        icon: '🎉'
                    });
                }

                setLastAttendance({
                    student: result.student,
                    confidence: result.confidence,
                    timestamp: result.timestamp || new Date().toLocaleTimeString(),
                    alreadyMarked: isAlreadyMarked,
                    recognitionQuality: result.recognition_quality
                });
                fetchStats();
                setTimeout(() => {
                    if (isMounted.current) { setLastAttendance(null); setCapturedImage(null); }
                }, 5000);
            } else {
                const msg = result.message || 'Face not recognized. Please try again.';
                toast.error(msg, { duration: 4000 });
                setLastAttendance({
                    error: true,
                    message: msg,
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        } catch (error) {
            if (!isMounted.current) return;
            toast.error(error.message || 'Network error. Check backend connection.', { duration: 5000 });
            setLastAttendance({
                error: true,
                message: error.message || 'Network error.',
                timestamp: new Date().toLocaleTimeString()
            });
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [fetchStats]);

    // Handle Faculty Login from Home Page
    const handleFacultyLogin = async (e) => {
        if (e) e.preventDefault();
        setFacultyError('');
        if (!facultyUser.trim()) { setFacultyError('Please enter your Username or Lecturer ID'); return; }
        if (!facultyPass.trim()) { setFacultyError('Please enter your password'); return; }

        setFacultyLoading(true);
        try {
            const res = await loginLecturer(facultyUser.trim(), facultyPass.trim());
            if (res.success && res.lecturer) {
                localStorage.setItem('fa_lecturer', JSON.stringify(res.lecturer));
                toast.success(res.message || `Welcome, ${res.lecturer.full_name}!`, { icon: '👨🏾‍🏫', duration: 3000 });
                setShowFacultyModal(false);
                router.push('/lecturer');
            } else {
                setFacultyError(res.message || 'Invalid credentials.');
            }
        } catch (err) {
            setFacultyError(err.message || 'Login failed.');
        } finally {
            setFacultyLoading(false);
        }
    };

    // Quick Select Faculty Profile
    const selectFacultyProfile = (lec) => {
        setFacultyUser(lec.username);
        setFacultyPass(lec.password);
        setFacultyError('');
        setShowFacultyPicker(false);
    };

    const percentage = totalStudents > 0 ? Math.round((todayCount / totalStudents) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-0" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
                @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 0.4; } 100% { transform: scale(0.95); opacity: 0.8; } }
                .animate-float { animation: float 8s ease-in-out infinite; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* ── Top Announcement Banner with Faculty Access ── */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[11px] py-2 px-4 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span>🏛️</span>
                    <span className="font-bold hidden sm:inline">Salvation Heritage High School</span>
                    <span className="text-slate-400 hidden sm:inline">•</span>
                    <span className="text-emerald-300 font-semibold">Contactless Face Attendance Active</span>
                </div>
                <button onClick={() => setShowFacultyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black text-white bg-blue-600/60 hover:bg-blue-600 border border-blue-400/40 shadow-sm transition-all">
                    <span>👨🏾‍🏫</span>
                    <span>Faculty Portal Login</span>
                </button>
            </div>

            {/* ── Main Navbar ── */}
            <nav className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
                    
                    {/* Brand */}
                    <Link href="/" className="flex items-center gap-3 no-underline group flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-all">
                            SH
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-base sm:text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
                                    Salvation Heritage
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Kiosk
                                </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 tracking-wide hidden sm:block">
                                Smart Biometric Attendance System
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                        <Link href="/" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-600/30 no-underline">
                            📸 Attendance Kiosk
                        </Link>
                        <Link href="/register" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                            📝 Register Student
                        </Link>
                        <Link href="/dashboard" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline flex items-center gap-1.5">
                            <span>📊</span>
                            <span>Admin Portal</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">PIN</span>
                        </Link>
                    </div>

                    {/* Right: Faculty Button + Mobile Menu Toggle */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowFacultyModal(true)}
                            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all">
                            <span>👨🏾‍🏫</span>
                            <span>Faculty Sign In</span>
                        </button>

                        <button onClick={() => setShowDebugConsole(true)}
                            title="Open Diagnostic Console"
                            className="text-xs text-slate-400 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-slate-900 border border-slate-800">
                            ⚙️
                        </button>

                        {/* Hamburger Button for Mobile */}
                        <button onClick={() => setMobileMenuOpen(v => !v)}
                            aria-label="Toggle navigation menu"
                            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 transition-colors">
                            {mobileMenuOpen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                            <Link href="/"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30 no-underline">
                                <span>📸</span>
                                <span>Attendance Kiosk</span>
                            </Link>
                            <Link href="/register"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold text-slate-200 hover:bg-slate-900 no-underline">
                                <span>📝</span>
                                <span>Register New Student</span>
                            </Link>
                            <Link href="/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold text-slate-200 hover:bg-slate-900 no-underline">
                                <div className="flex items-center gap-3">
                                    <span>📊</span>
                                    <span>Admin Dashboard</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">PIN</span>
                            </Link>
                            <Link href="/students"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold text-slate-200 hover:bg-slate-900 no-underline">
                                <div className="flex items-center gap-3">
                                    <span>👥</span>
                                    <span>Student Directory</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">PIN</span>
                            </Link>
                        </div>

                        {/* Mobile Faculty Login Trigger */}
                        <div className="pt-2 border-t border-slate-800">
                            <button onClick={() => { setMobileMenuOpen(false); setShowFacultyModal(true); }}
                                className="w-full py-3.5 rounded-2xl font-black text-sm text-center text-white bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 shadow-md shadow-blue-600/30 flex items-center justify-center gap-2">
                                <span>👨🏾‍🏫</span>
                                <span>Faculty / Lecturer Login</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ── Blue-Emerald School Hero Section ── */}
            <div className="relative text-white overflow-hidden py-10 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 bg-blue-500 blur-3xl animate-float" />
                    <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full opacity-20 bg-emerald-400 blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                    <div className="absolute -bottom-16 right-10 w-96 h-96 rounded-full opacity-25 bg-teal-500 blur-3xl" style={{ animation: 'float 12s ease-in-out infinite 1s' }} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 sm:gap-10">

                        {/* Left — Headline + Live Clock + Stats */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80"></div>
                                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Attendance Kiosk</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                    Salvation Heritage
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4">
                                <span className="block text-4xl sm:text-6xl lg:text-7xl text-white font-serif">Salvation</span>
                                <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Heritage</span>
                            </h1>

                            <p className="text-slate-200 text-sm sm:text-base max-w-xl leading-relaxed mb-6 font-medium">
                                Welcome, students and teachers! Position your face in front of the camera kiosk to log your presence in seconds.
                            </p>

                            {/* Faculty Portal Callout Box on Hero */}
                            <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-blue-400/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">👨🏾‍🏫</span>
                                    <div>
                                        <p className="text-xs sm:text-sm font-bold text-white">Faculty & Lecturer Portal</p>
                                        <p className="text-[11px] text-emerald-300">Open active class session & start roll call</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowFacultyModal(true)}
                                    className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all flex-shrink-0">
                                    Open Faculty Terminal →
                                </button>
                            </div>

                            {/* Live Clock Card */}
                            <div className="mb-6 rounded-2xl px-5 sm:px-6 py-3.5 sm:py-4 inline-block bg-slate-950/60 border border-white/15 backdrop-blur-md shadow-xl">
                                <LiveClock />
                            </div>

                            {/* School Stats Row */}
                            <div className="flex flex-wrap gap-2.5 sm:gap-3">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-emerald-500/30 backdrop-blur-md">
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{todayCount}</p>
                                        <p className="text-emerald-300 text-xs font-medium mt-0.5">Present Today</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-blue-500/30 backdrop-blur-md">
                                    <span className="text-2xl">📊</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{percentage}%</p>
                                        <p className="text-blue-300 text-xs font-medium mt-0.5">Attendance Rate</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md">
                                    <span className="text-2xl">🎓</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{totalStudents}</p>
                                        <p className="text-slate-300 text-xs font-medium mt-0.5">Enrolled</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — Scanner Visual with Frame */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-72 sm:w-96 md:w-[26rem] lg:w-[28rem]">
                                <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                                <div className="relative rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900">
                                    <img src="/scanner.jpg" alt="Salvation Heritage Face Recognition"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '320px' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-4 right-4 w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-500 border border-white/60 shadow-lg shadow-emerald-500/40">
                                        <span className="text-white text-lg">✓</span>
                                    </div>
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 bg-slate-950/80 backdrop-blur border border-emerald-400/40">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-emerald-300 text-[10px] font-black tracking-wider">KIOSK LIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Kiosk Section ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

                    {/* Camera Scanner (3/5) */}
                    <div className="lg:col-span-3" data-aos="fade-up">
                        <div className="rounded-3xl overflow-hidden bg-slate-900/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl">
                            <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80" />
                                    <div>
                                        <span className="font-bold text-white text-sm">Biometric Face Scanner</span>
                                        <p className="text-[10px] text-slate-400">Salvation Heritage High-Precision AI</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Active
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <CameraCapture onCapture={handleCapture} isLoading={isLoading} />
                            </div>
                        </div>
                    </div>

                    {/* Result Verification Card (2/5) */}
                    <div className="lg:col-span-2 space-y-5" data-aos="fade-up" data-aos-delay="100">
                        {lastAttendance && !lastAttendance.error ? (
                            <div className="rounded-3xl p-6 bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                            {lastAttendance.alreadyMarked ? 'Already Present' : 'Attendance Verified'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">{lastAttendance.timestamp}</span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500/50 flex-shrink-0 shadow-lg">
                                        <img src={PHOTO_URL(lastAttendance.student.student_id)}
                                            alt={lastAttendance.student.full_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = FALLBACK_SVG; }} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-xl text-white truncate">{lastAttendance.student.full_name}</h3>
                                        <p className="text-xs text-emerald-400 font-mono font-bold">{lastAttendance.student.student_id}</p>
                                        <p className="text-xs text-slate-300 mt-1">{lastAttendance.student.department}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs">
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-bold">Class</p>
                                        <p className="font-bold text-white truncate">{lastAttendance.student.department || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase font-bold">Term</p>
                                        <p className="font-bold text-white">{lastAttendance.student.semester === 1 ? '1st Term' : lastAttendance.student.semester === 2 ? '2nd Term' : '3rd Term'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl p-6 bg-slate-900 border border-blue-500/20 shadow-xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-blue-600/30 border border-blue-500/40 font-black">
                                        SH
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">Salvation Heritage Kiosk</h3>
                                        <p className="text-xs text-slate-400">Automatic Biometric Verification</p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 text-xs text-slate-300">
                                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                                        <span className="text-emerald-400 font-bold">1.</span>
                                        <span>Look straight into the camera lens with good lighting.</span>
                                    </div>
                                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                                        <span className="text-emerald-400 font-bold">2.</span>
                                        <span>Keep a neutral facial expression inside the emerald frame.</span>
                                    </div>
                                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                                        <span className="text-emerald-400 font-bold">3.</span>
                                        <span>Click <b>Capture & Mark Attendance</b> to register your record.</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Link href="/register"
                                        className="w-full py-3.5 rounded-2xl text-xs font-bold text-center text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all no-underline">
                                        <span>Not yet enrolled? Register your face →</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Faculty / Lecturer Login Modal on Home Page ── */}
            {showFacultyModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-blue-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-slate-900 to-emerald-950 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white text-lg font-black shadow-md shadow-blue-600/30">
                                    👨🏾‍🏫
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-black text-white">Faculty Portal Login</h2>
                                    <p className="text-xs text-emerald-300">Salvation Heritage Instructors & Staff</p>
                                </div>
                            </div>
                            <button onClick={() => setShowFacultyModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm">
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {facultyError && (
                                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                                    <span>⚠</span>
                                    <span>{facultyError}</span>
                                </div>
                            )}

                            <form onSubmit={handleFacultyLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                        Username or Lecturer ID
                                    </label>
                                    <input
                                        type="text"
                                        value={facultyUser}
                                        onChange={e => { setFacultyUser(e.target.value); setFacultyError(''); }}
                                        placeholder="e.g. babatunde.adeyemi or LEC001"
                                        className="w-full px-4 py-3 rounded-2xl border text-sm font-mono focus:outline-none focus:border-emerald-500 bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={facultyPass}
                                        onChange={e => { setFacultyPass(e.target.value); setFacultyError(''); }}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:border-emerald-500 bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>

                                <button type="submit" disabled={facultyLoading}
                                    className="w-full py-4 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50">
                                    {facultyLoading ? '⏳ Authenticating...' : '🔐 Sign In to Session Control'}
                                </button>
                            </form>

                            {/* 13 Nigerian Faculty Members Quick Profile Selector */}
                            <div className="pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowFacultyPicker(v => !v)}
                                    className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-slate-300 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between transition-all">
                                    <span className="flex items-center gap-2">
                                        <span>⚡</span>
                                        <span>Select from 13 Nigerian Faculty Profiles (1-Click)</span>
                                    </span>
                                    <span>{showFacultyPicker ? '▲' : '▼'}</span>
                                </button>

                                {showFacultyPicker && (
                                    <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                        {NIGERIAN_FACULTY.map(lec => (
                                            <button
                                                key={lec.lecturer_id}
                                                type="button"
                                                onClick={() => selectFacultyProfile(lec)}
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
                        </div>
                    </div>
                </div>
            )}

            {/* Diagnostic console */}
            {showDebugConsole && (
                <DebugConsole onClose={() => setShowDebugConsole(false)} lastAttendance={lastAttendance} debugInfo={debugInfo} />
            )}

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-tr from-blue-700 to-emerald-500">
                            SH
                        </div>
                        <span className="font-semibold text-slate-300">Salvation Heritage Biometric Attendance</span>
                    </div>
                    <button onClick={() => setShowFacultyModal(true)} className="text-blue-400 hover:underline">
                        Faculty Login
                    </button>
                </div>
            </footer>
        </div>
    );
}
