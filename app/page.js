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

    // Active Logged-in Faculty state
    const [activeLecturer, setActiveLecturer] = useState(null);

    // Faculty Modal State on Home Page (for when NOT logged in)
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
        // Check if lecturer is already authenticated in localStorage
        try {
            const saved = localStorage.getItem('fa_lecturer');
            if (saved) {
                setActiveLecturer(JSON.parse(saved));
            }
        } catch { /* ignore */ }

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

    // Smart Faculty Portal Action:
    // If ALREADY logged in -> directly navigates to /lecturer without asking for credentials
    // If NOT logged in -> opens the login modal
    const handleFacultyAction = () => {
        try {
            const saved = localStorage.getItem('fa_lecturer');
            if (saved) {
                router.push('/lecturer');
                return;
            }
        } catch { /* ignore */ }
        setShowFacultyModal(true);
    };

    // Logout from Home Page
    const handleFacultySignOut = (e) => {
        if (e) e.stopPropagation();
        localStorage.removeItem('fa_lecturer');
        sessionStorage.removeItem('fa_session');
        setActiveLecturer(null);
        toast.success('Signed out from Faculty Terminal.', { icon: '👋', duration: 3000 });
    };

    // Handle Faculty Login submission
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
                setActiveLecturer(res.lecturer);
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col mobile-pb-safe md:pb-0" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
                @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 0.4; } 100% { transform: scale(0.95); opacity: 0.8; } }
                .animate-float { animation: float 8s ease-in-out infinite; }
                
                /* Mobile-specific optimizations */
                @media (max-width: 640px) {
                    .mobile-hero-title { font-size: 2.5rem; line-height: 1.1; }
                    .mobile-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
                    .mobile-stats-item { padding: 0.75rem; border-radius: 1rem; }
                    .mobile-kiosk-section { padding: 1rem; }
                    .mobile-camera-container { border-radius: 1.5rem; overflow: hidden; }
                }
                
                @media (max-width: 480px) {
                    .xs-hero-title { font-size: 2rem; line-height: 1.1; }
                    .xs-stats-grid { grid-template-columns: 1fr; gap: 0.5rem; }
                    .xs-mobile-padding { padding: 0.75rem; }
                }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* ── Top Announcement Banner with Faculty Access ── */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[10px] sm:text-[11px] py-2 mobile-px-safe sm:px-4 border-b border-white/10">
                <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span>🏛️</span>
                        <span className="font-bold text-[10px] sm:text-[11px] truncate">Salvation Heritage High School</span>
                        <span className="text-slate-400 hidden sm:inline">•</span>
                        <span className="text-emerald-300 font-semibold text-[9px] sm:text-[11px] truncate">Contactless Face Attendance Active</span>
                    </div>

                    {activeLecturer ? (
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button onClick={handleFacultyAction}
                                className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all">
                                <span>👨🏾‍🏫</span>
                                <span className="hidden xs:inline">{activeLecturer.full_name}</span>
                                <span className="xs:hidden">Portal</span>
                                <span className="hidden sm:inline">(Portal Active)</span>
                                <span>→</span>
                            </button>
                            <button onClick={handleFacultySignOut}
                                title="Sign Out of Faculty Portal"
                                className="text-[9px] sm:text-[10px] text-rose-300 hover:text-rose-200 px-1.5 sm:px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleFacultyAction}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black text-white bg-blue-600/60 hover:bg-blue-600 border border-blue-400/40 shadow-sm transition-all flex-shrink-0">
                            <span>👨🏾‍🏫</span>
                            <span className="hidden xs:inline">Faculty Portal</span>
                            <span className="xs:hidden">Faculty</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Navbar ── */}
            <nav className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
                <div className="max-w-7xl mx-auto mobile-px-safe sm:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-3">
                    
                    {/* Brand */}
                    <Link href="/" className="flex items-center gap-2 sm:gap-3 no-underline group flex-shrink-0 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-xs sm:text-sm md:text-base shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-all">
                            SH
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <span className="font-black text-sm sm:text-base md:text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors truncate">
                                    Salvation Heritage
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                                    Kiosk
                                </span>
                            </div>
                            <p className="text-[9px] sm:text-[11px] font-medium text-slate-400 tracking-wide hidden sm:block">
                                Smart Biometric Attendance System
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                        <Link href="/" className="px-3 md:px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-600/30 no-underline">
                            📸 Attendance Kiosk
                        </Link>
                        <Link href="/register" className="px-3 md:px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline">
                            📝 Register Student
                        </Link>
                        <Link href="/dashboard" className="px-3 md:px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline flex items-center gap-1.5">
                            <span>📊</span>
                            <span>Admin Portal</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">PIN</span>
                        </Link>
                    </div>

                    {/* Right: Faculty Button + Mobile Menu Toggle */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {activeLecturer ? (
                            <button onClick={handleFacultyAction}
                                className="hidden sm:inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 active:scale-95 transition-all">
                                <span>👨🏾‍🏫</span>
                                <span className="hidden md:inline">My Terminal ({activeLecturer.full_name.split(' ')[0]})</span>
                                <span className="md:hidden">Terminal</span>
                            </button>
                        ) : (
                            <button onClick={handleFacultyAction}
                                className="hidden sm:inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black text-white bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all">
                                <span>👨🏾‍🏫</span>
                                <span className="hidden md:inline">Faculty Sign In</span>
                                <span className="md:hidden">Faculty</span>
                            </button>
                        )}

                        <button onClick={() => setShowDebugConsole(true)}
                            title="Open Diagnostic Console"
                            className="text-xs text-slate-400 hover:text-white transition-colors p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-slate-900 border border-slate-800">
                            ⚙️
                        </button>

                        {/* Hamburger Button for Mobile */}
                        <button onClick={() => setMobileMenuOpen(v => !v)}
                            aria-label="Toggle navigation menu"
                            className="md:hidden w-8 h-8 sm:w-10 sm:h-10 touch-target flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800 transition-colors">
                            {mobileMenuOpen ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-800 bg-slate-950 mobile-px-safe py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                            <Link href="/"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mobile-nav-item bg-blue-600 text-white shadow-md shadow-blue-600/30">
                                <span className="text-lg">📸</span>
                                <span className="text-xs font-bold">Attendance Kiosk</span>
                            </Link>
                            <Link href="/register"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mobile-nav-item text-slate-200 hover:bg-slate-900">
                                <span className="text-lg">📝</span>
                                <span className="text-xs font-bold">Register New Student</span>
                            </Link>
                            <Link href="/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mobile-nav-item text-slate-200 hover:bg-slate-900">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📊</span>
                                    <span className="text-xs font-bold">Admin Dashboard</span>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">PIN</span>
                            </Link>
                            <Link href="/students"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mobile-nav-item text-slate-200 hover:bg-slate-900">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">👥</span>
                                    <span className="text-xs font-bold">Student Directory</span>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">PIN</span>
                            </Link>
                        </div>

                        {/* Mobile Faculty Section */}
                        <div className="pt-2 border-t border-slate-800">
                            {activeLecturer ? (
                                <div className="space-y-2">
                                    <button onClick={() => { setMobileMenuOpen(false); router.push('/lecturer'); }}
                                        className="w-full mobile-button text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md flex items-center justify-center gap-2">
                                        <span>👨🏾‍🏫</span>
                                        <span>Resume Portal ({activeLecturer.full_name})</span>
                                    </button>
                                    <button onClick={() => { setMobileMenuOpen(false); handleFacultySignOut(); }}
                                        className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30">
                                        Sign Out of Faculty Portal
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => { setMobileMenuOpen(false); handleFacultyAction(); }}
                                    className="w-full mobile-button text-white bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 shadow-md shadow-blue-600/30 flex items-center justify-center gap-2">
                                    <span>👨🏾‍🏫</span>
                                    <span>Faculty / Lecturer Login</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* ── Blue-Emerald School Hero Section ── */}
            <div className="relative text-white overflow-hidden py-6 sm:py-10 md:py-16 mobile-px-safe sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 bg-blue-500 blur-3xl animate-float" />
                    <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full opacity-20 bg-emerald-400 blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                    <div className="absolute -bottom-16 right-10 w-96 h-96 rounded-full opacity-25 bg-teal-500 blur-3xl" style={{ animation: 'float 12s ease-in-out infinite 1s' }} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8 md:gap-10">

                        {/* Left — Headline + Live Clock + Stats */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4 flex-wrap">
                                <div className="flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80"></div>
                                    <span className="text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Attendance Kiosk</span>
                                </div>
                                <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                    Salvation Heritage
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-3 sm:mb-4">
                                <span className="block xs-hero-title sm:mobile-hero-title md:text-6xl lg:text-7xl text-white font-serif">Salvation</span>
                                <span className="block xs-hero-title sm:mobile-hero-title md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Heritage</span>
                            </h1>

                            <p className="text-slate-200 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed mb-4 sm:mb-6 font-medium">
                                Welcome, students and teachers! Position your face in front of the camera kiosk to log your presence in seconds.
                            </p>

                            {/* Faculty Portal Callout Box on Hero */}
                            <div className="mb-4 sm:mb-6 p-3 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl bg-slate-950/70 border border-blue-400/30 backdrop-blur-md flex flex-col gap-3 shadow-xl">
                                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                                    <span className="text-xl sm:text-2xl flex-shrink-0">👨🏾‍🏫</span>
                                    <div className="min-w-0 flex-1">
                                        {activeLecturer ? (
                                            <>
                                                <p className="text-xs sm:text-sm font-bold text-emerald-400">
                                                    Welcome back, {activeLecturer.full_name}
                                                </p>
                                                <p className="text-[10px] sm:text-[11px] text-slate-300">
                                                    {activeLecturer.department} • Active Faculty Session
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs sm:text-sm font-bold text-white">Faculty & Lecturer Portal</p>
                                                <p className="text-[10px] sm:text-[11px] text-emerald-300">Open active class session & start roll call</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={handleFacultyAction}
                                        className="flex-1 mobile-button text-xs font-black text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all">
                                        {activeLecturer ? 'Enter Faculty Terminal →' : 'Open Faculty Terminal →'}
                                    </button>
                                    {activeLecturer && (
                                        <button onClick={handleFacultySignOut}
                                            title="Sign Out"
                                            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex-shrink-0">
                                            Sign Out
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Live Clock Card */}
                            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 inline-block bg-slate-950/60 border border-white/15 backdrop-blur-md shadow-xl">
                                <LiveClock />
                            </div>

                            {/* School Stats Row */}
                            <div className="mobile-stats-grid xs-stats-grid sm:flex sm:flex-wrap sm:gap-3">
                                <div className="mobile-stats-item sm:flex sm:items-center sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 bg-slate-950/60 border border-emerald-500/30 backdrop-blur-md">
                                    <span className="text-xl sm:text-2xl">✅</span>
                                    <div>
                                        <p className="text-white font-black text-lg sm:text-xl leading-none">{todayCount}</p>
                                        <p className="text-emerald-300 text-[10px] sm:text-xs font-medium mt-0.5">Present Today</p>
                                    </div>
                                </div>
                                <div className="mobile-stats-item sm:flex sm:items-center sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 bg-slate-950/60 border border-blue-500/30 backdrop-blur-md">
                                    <span className="text-xl sm:text-2xl">📊</span>
                                    <div>
                                        <p className="text-white font-black text-lg sm:text-xl leading-none">{percentage}%</p>
                                        <p className="text-blue-300 text-[10px] sm:text-xs font-medium mt-0.5">Attendance Rate</p>
                                    </div>
                                </div>
                                <div className="mobile-stats-item sm:flex sm:items-center sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md">
                                    <span className="text-xl sm:text-2xl">🎓</span>
                                    <div>
                                        <p className="text-white font-black text-lg sm:text-xl leading-none">{totalStudents}</p>
                                        <p className="text-slate-300 text-[10px] sm:text-xs font-medium mt-0.5">Enrolled</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — Scanner Visual with Frame */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end mt-4 lg:mt-0" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-64 sm:w-72 md:w-96 lg:w-[26rem] xl:w-[28rem]">
                                <div className="absolute -inset-2 sm:-inset-4 rounded-2xl sm:rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/30 sm:border-2 shadow-2xl bg-slate-900">
                                    <img src="/scanner.jpg" alt="Salvation Heritage Face Recognition"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '200px' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-500 border border-white/60 shadow-lg shadow-emerald-500/40">
                                        <span className="text-white text-sm sm:text-lg">✓</span>
                                    </div>
                                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-950/80 backdrop-blur border border-emerald-400/40">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-emerald-300 text-[9px] sm:text-[10px] font-black tracking-wider">KIOSK LIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Kiosk Section ── */}
            <div className="max-w-7xl mx-auto mobile-px-safe sm:px-6 py-6 sm:py-8 md:py-12 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">

                    {/* Camera Scanner (3/5) */}
                    <div className="lg:col-span-3" data-aos="fade-up">
                        <div className="mobile-camera-container sm:rounded-3xl overflow-hidden bg-slate-900/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl">
                            <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80" />
                                    <div>
                                        <span className="font-bold text-white text-xs sm:text-sm">Biometric Face Scanner</span>
                                        <p className="text-[9px] sm:text-[10px] text-slate-400">Salvation Heritage High-Precision AI</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Active
                                    </span>
                                </div>
                            </div>

                            <div className="mobile-kiosk-section sm:p-6">
                                <CameraCapture onCapture={handleCapture} isLoading={isLoading} />
                            </div>
                        </div>
                    </div>

                    {/* Result Verification Card (2/5) */}
                    <div className="lg:col-span-2 space-y-4 sm:space-y-5" data-aos="fade-up" data-aos-delay="100">
                        {lastAttendance && !lastAttendance.error ? (
                            <div className="responsive-card space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-300 border-emerald-500/40">
                                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                            {lastAttendance.alreadyMarked ? 'Already Present' : 'Attendance Verified'}
                                        </span>
                                    </div>
                                    <span className="text-[9px] sm:text-xs font-mono text-slate-400">{lastAttendance.timestamp}</span>
                                </div>

                                {/* Student Identity */}
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500/50 flex-shrink-0 shadow-lg">
                                        <img src={PHOTO_URL(lastAttendance.student.student_id)}
                                            alt={lastAttendance.student.full_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = FALLBACK_SVG; }} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-lg sm:text-xl text-white truncate">{lastAttendance.student.full_name}</h3>
                                        <p className="text-xs sm:text-sm text-emerald-400 font-mono font-black tracking-wider">{lastAttendance.student.student_id}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">{lastAttendance.student.department || 'Salvation Heritage'}</p>
                                    </div>
                                </div>

                                {/* Student Details Grid */}
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                                    <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800">
                                        <p className="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">Student ID</p>
                                        <p className="font-black text-emerald-400 font-mono text-xs sm:text-sm mt-0.5">{lastAttendance.student.student_id}</p>
                                    </div>
                                    <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800">
                                        <p className="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">Class</p>
                                        <p className="font-bold text-white text-xs sm:text-sm mt-0.5">{lastAttendance.student.department || '—'}</p>
                                    </div>
                                    <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800">
                                        <p className="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">Term</p>
                                        <p className="font-bold text-white text-xs sm:text-sm mt-0.5">
                                            {lastAttendance.student.semester === 1 ? '1st Term' : lastAttendance.student.semester === 2 ? '2nd Term' : lastAttendance.student.semester === 3 ? '3rd Term' : '—'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-800">
                                        <p className="text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">Year Intake</p>
                                        <p className="font-bold text-white text-xs sm:text-sm mt-0.5">{lastAttendance.student.year_intake || '—'}</p>
                                    </div>
                                </div>

                                {/* Status Banner */}
                                <div className={`rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-center text-[10px] sm:text-xs font-bold ${
                                    lastAttendance.alreadyMarked
                                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                }`}>
                                    {lastAttendance.alreadyMarked
                                        ? '👋 Welcome back! Your attendance was already recorded today.'
                                        : `✅ Attendance successfully marked for ${lastAttendance.student.full_name}`
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="responsive-card space-y-3 sm:space-y-4 border-blue-500/20">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white bg-blue-600/30 border border-blue-500/40 font-black text-xs sm:text-sm">
                                        SH
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-white">Salvation Heritage Kiosk</h3>
                                        <p className="text-[10px] sm:text-xs text-slate-400">Automatic Biometric Verification</p>
                                    </div>
                                </div>

                                <div className="space-y-2 sm:space-y-3 pt-2 text-[10px] sm:text-xs text-slate-300">
                                    <div className="flex items-start gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                                        <span className="text-emerald-400 font-bold flex-shrink-0">1.</span>
                                        <span>Look straight into the camera lens with good lighting.</span>
                                    </div>
                                    <div className="flex items-start gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                                        <span className="text-emerald-400 font-bold flex-shrink-0">2.</span>
                                        <span>Keep a neutral facial expression inside the emerald frame.</span>
                                    </div>
                                    <div className="flex items-start gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800">
                                        <span className="text-emerald-400 font-bold flex-shrink-0">3.</span>
                                        <span>Click <b>Capture & Mark Attendance</b> to register your record.</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Link href="/register"
                                        className="mobile-button text-center text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all no-underline">
                                        <span>Not yet enrolled? Register your face →</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Faculty / Lecturer Login Modal on Home Page (Only when signed out) */}
            {showFacultyModal && !activeLecturer && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center mobile-px-safe">
                    <div className="bg-slate-900 border border-blue-500/30 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-blue-900 via-slate-900 to-emerald-950 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white text-base sm:text-lg font-black shadow-md shadow-blue-600/30">
                                    👨🏾‍🏫
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-base md:text-lg font-black text-white">Faculty Portal Login</h2>
                                    <p className="text-[10px] sm:text-xs text-emerald-300">Salvation Heritage Instructors & Staff</p>
                                </div>
                            </div>
                            <button onClick={() => setShowFacultyModal(false)}
                                className="w-6 h-6 sm:w-8 sm:h-8 touch-target rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs sm:text-sm">
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            {facultyError && (
                                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] sm:text-xs flex items-center gap-2">
                                    <span>⚠</span>
                                    <span>{facultyError}</span>
                                </div>
                            )}

                            <form onSubmit={handleFacultyLogin} className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-300 mb-1 sm:mb-1.5 uppercase tracking-wider">
                                        Username or Lecturer ID
                                    </label>
                                    <input
                                        type="text"
                                        value={facultyUser}
                                        onChange={e => { setFacultyUser(e.target.value); setFacultyError(''); }}
                                        placeholder="e.g. babatunde.adeyemi or LEC001"
                                        className="mobile-input font-mono focus:border-emerald-500 bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-300 mb-1 sm:mb-1.5 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={facultyPass}
                                        onChange={e => { setFacultyPass(e.target.value); setFacultyError(''); }}
                                        placeholder="Enter your password"
                                        className="mobile-input focus:border-emerald-500 bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>

                                <button type="submit" disabled={facultyLoading}
                                    className="mobile-button w-full text-white font-black bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50">
                                    {facultyLoading ? '⏳ Authenticating...' : '🔐 Sign In to Session Control'}
                                </button>
                            </form>

                            {/* 13 Nigerian Faculty Members Quick Profile Selector */}
                            <div className="pt-2 sm:pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowFacultyPicker(v => !v)}
                                    className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold text-slate-300 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between transition-all">
                                    <span className="flex items-center gap-1.5 sm:gap-2">
                                        <span>⚡</span>
                                        <span>Select from 13 Nigerian Faculty Profiles (1-Click)</span>
                                    </span>
                                    <span>{showFacultyPicker ? '▲' : '▼'}</span>
                                </button>

                                {showFacultyPicker && (
                                    <div className="mt-2 sm:mt-3 max-h-48 sm:max-h-56 overflow-y-auto space-y-1 sm:space-y-1.5 pr-1 custom-scrollbar">
                                        {NIGERIAN_FACULTY.map(lec => (
                                            <button
                                                key={lec.lecturer_id}
                                                type="button"
                                                onClick={() => selectFacultyProfile(lec)}
                                                className="w-full p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-950/80 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 text-left transition-all flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                                    <span className="text-lg sm:text-xl">{lec.avatar}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] sm:text-xs font-bold text-white truncate">{lec.full_name}</p>
                                                        <p className="text-[9px] sm:text-[10px] text-emerald-400 truncate">{lec.department} • <span className="font-mono text-slate-400">{lec.username}</span></p>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 flex-shrink-0">
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
            <footer className="border-t border-slate-800 bg-slate-950 py-4 sm:py-6 text-xs text-slate-500">
                <div className="max-w-7xl mx-auto mobile-px-safe sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-white text-[9px] sm:text-[10px] font-black bg-gradient-to-tr from-blue-700 to-emerald-500">
                            SH
                        </div>
                        <span className="font-semibold text-slate-300 text-[10px] sm:text-xs">Salvation Heritage Biometric Attendance</span>
                    </div>
                    {activeLecturer ? (
                        <div className="flex items-center gap-2 sm:gap-3 text-center sm:text-left">
                            <span className="text-emerald-400 font-medium text-[10px] sm:text-xs">Logged in: {activeLecturer.full_name}</span>
                            <button onClick={handleFacultySignOut} className="text-rose-400 hover:underline text-[10px] sm:text-xs">
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleFacultyAction} className="text-blue-400 hover:underline text-[10px] sm:text-xs">
                            Faculty Login
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
}
