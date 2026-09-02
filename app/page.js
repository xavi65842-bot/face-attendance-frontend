'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import CameraCapture from '../components/CameraCapture';
import DebugConsole from '../components/DebugConsole';
import AOSInit from '../components/AOSInit';
import { recognizeFace, getStats } from '../lib/api';
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
            <p className="text-4xl font-extrabold tracking-tight text-white tabular-nums" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                {time.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-red-200 text-xs mt-1 font-medium tracking-widest uppercase">
                {time.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
        </div>
    );
}

export default function HomePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [lastAttendance, setLastAttendance] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [todayCount, setTodayCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [debugInfo, setDebugInfo] = useState(null);
    const [showDebug, setShowDebug] = useState(false);
    const [showDebugConsole, setShowDebugConsole] = useState(false);
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
        setDebugInfo({ status: 'Sending image to Amazon Rekognition backend...', time: new Date().toLocaleTimeString() });
        try {
            console.log('handleCapture() triggered — sending image to Amazon Rekognition backend');
            const result = await recognizeFace(imageDataUrl);
            console.log('Amazon Rekognition backend result:', result);
            if (!isMounted.current) return;
            setDebugInfo({ status: 'Response received', result, time: new Date().toLocaleTimeString() });
            
            if (result.success && result.student) {
                const studentName = result.student.full_name || result.student.name || 'Student';
                const isAlreadyMarked = result.already_marked === true || result.attendance_marked === false;

                if (isAlreadyMarked) {
                    toast(`👋 Welcome back, ${studentName}! Attendance is already recorded for today.`, {
                        duration: 6000,
                        icon: '👋',
                        style: {
                            border: '2px solid #f59e0b',
                            background: '#fffbeb',
                            color: '#92400e',
                            fontWeight: 600,
                        },
                    });
                } else {
                    toast.success(result.message || `✅ Welcome, ${studentName}! Attendance marked.`, { 
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
                // Auto-clear result after 5s so next student can scan
                setTimeout(() => {
                    if (isMounted.current) { setLastAttendance(null); setCapturedImage(null); }
                }, 5000);
            } else {
                const msg = result.message || 'Face not recognized. Please try again.';
                toast.error(msg, { duration: 4000 });
                setLastAttendance({
                    error: true,
                    message: msg,
                    notRegistered: !result.success,
                });
                setTimeout(() => {
                    if (isMounted.current) { setLastAttendance(null); setCapturedImage(null); }
                }, 3000);
            }
        } catch (error) {
            if (isMounted.current) {
                setDebugInfo({ status: 'Error', error: error.message, time: new Date().toLocaleTimeString() });
                setLastAttendance({ error: true, message: 'Network error. Check if PHP backend is running.' });
                setTimeout(() => {
                    if (isMounted.current) { setLastAttendance(null); setCapturedImage(null); }
                }, 3000);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [fetchStats]);

    const percentage = totalStudents > 0 ? Math.round((todayCount / totalStudents) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
                @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 25px rgba(37,99,235,0.3); } 50% { box-shadow: 0 0 50px rgba(16,185,129,0.5), 0 0 80px rgba(37,99,235,0.3); } }
                select option { background-color: #0f172a !important; color: #fff !important; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* ── Top School Banner ── */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-emerald-900 text-white text-[11px] py-1.5 px-4 text-center font-semibold tracking-wide border-b border-white/10 flex items-center justify-center gap-2">
                <span>🏛️</span>
                <span>Salvation Heritage Schools • Biometric Attendance & Security Portal</span>
                <span className="hidden sm:inline opacity-60">•</span>
                <span className="hidden sm:inline text-emerald-300">Wisdom, Character & Excellence</span>
            </div>

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                    {/* School Brand */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500">
                            SH
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-white text-base sm:text-lg tracking-tight">Salvation Heritage</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:inline">
                                    Student Kiosk
                                </span>
                            </div>
                            <span className="hidden md:block text-slate-400 text-xs">Automated Facial Attendance Terminal</span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="hidden md:flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                        <Link href="/"
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-700/20 no-underline flex items-center gap-1.5">
                            <span>📸</span>
                            <span>Attendance Kiosk</span>
                        </Link>
                        <Link href="/register"
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline flex items-center gap-1.5">
                            <span>📝</span>
                            <span>Register Student</span>
                        </Link>
                        <div className="h-4 w-px bg-slate-700 mx-1"></div>
                        <Link href="/dashboard"
                            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/20 transition-all no-underline flex items-center gap-1.5">
                            <span>📊</span>
                            <span>Admin Portal 🔒</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/register"
                            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all no-underline">
                            <span>+</span>
                            <span>New Student</span>
                        </Link>
                        <button onClick={() => setShowDebugConsole(true)}
                            title="Open Diagnostic Console"
                            className="text-xs text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-900 border border-slate-800">
                            📊
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Blue-Emerald School Hero Section ── */}
            <div className="relative text-white overflow-hidden py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">

                {/* Animated soft orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 bg-blue-500 blur-3xl animate-float" />
                    <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full opacity-20 bg-emerald-400 blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                    <div className="absolute -bottom-16 right-10 w-96 h-96 rounded-full opacity-25 bg-teal-500 blur-3xl" style={{ animation: 'float 12s ease-in-out infinite 1s' }} />
                    
                    {/* Architectural grid overlay */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '48px 48px'
                    }} />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">

                        {/* Left — School Headline + Clock + Stats */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-2.5 mb-5 flex-wrap" data-aos="fade-up" data-aos-delay="100">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80"></div>
                                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Attendance Station</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                    Salvation Heritage
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-4xl sm:text-6xl lg:text-7xl text-white font-serif">Salvation</span>
                                <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Heritage</span>
                            </h1>

                            <p className="text-slate-200 text-base sm:text-lg max-w-xl leading-relaxed mb-7 font-medium" data-aos="fade-up" data-aos-delay="300">
                                Welcome, students and staff! Position your face in front of the camera kiosk to log your presence instantly.
                            </p>

                            {/* Live Clock Card */}
                            <div className="mb-6 rounded-2xl px-6 py-4 inline-block bg-slate-950/60 border border-white/15 backdrop-blur-md shadow-xl" data-aos="zoom-in" data-aos-delay="400">
                                <LiveClock />
                            </div>

                            {/* School Stats Row */}
                            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="500">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-emerald-500/30 backdrop-blur-md transition-all duration-300 hover:scale-105">
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{todayCount}</p>
                                        <p className="text-emerald-300 text-xs font-medium mt-0.5">Present Today</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-blue-500/30 backdrop-blur-md transition-all duration-300 hover:scale-105">
                                    <span className="text-2xl">📊</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{percentage}%</p>
                                        <p className="text-blue-300 text-xs font-medium mt-0.5">School Attendance</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-105">
                                    <span className="text-2xl">🎓</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{totalStudents}</p>
                                        <p className="text-slate-300 text-xs font-medium mt-0.5">Total Enrolled</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — Scanner Visual with School Crest Frame */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                {/* Outer blue/emerald glow */}
                                <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />

                                {/* Image card */}
                                <div className="relative rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900">
                                    <img src="/scanner.jpg" alt="Salvation Heritage Face Recognition"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '380px' }} />

                                    {/* Bottom gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                                    {/* Corner brackets */}
                                    {[
                                        'top-3 left-3 border-t-2 border-l-2 rounded-tl-lg',
                                        'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
                                        'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg',
                                        'bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg',
                                    ].map((cls, i) => (
                                        <div key={i} className={`absolute w-8 h-8 border-emerald-400/90 ${cls}`} />
                                    ))}

                                    {/* Verified badge */}
                                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-500 border border-white/60 shadow-lg shadow-emerald-500/40">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>

                                    {/* Live badge */}
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

                    {/* ── Camera panel (3/5) ── */}
                    <div className="lg:col-span-3" data-aos="fade-up">
                        <div className="rounded-3xl overflow-hidden bg-slate-900/90 border border-blue-500/20 shadow-2xl backdrop-blur-xl">
                            {/* Panel header */}
                            <div className="px-6 py-4.5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80" />
                                    <div>
                                        <span className="font-bold text-white text-sm">Biometric Face Terminal</span>
                                        <p className="text-[10px] text-slate-400">Salvation Heritage High-Precision Recognition</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                    Station Active
                                </span>
                            </div>
                            
                            <div className="p-6">
                                <CameraCapture
                                    onCapture={handleCapture}
                                    isLoading={isLoading}
                                    buttonText="Mark My Attendance"
                                />
                            </div>
                        </div>

                        {/* Debug panel */}
                        {showDebug && debugInfo && (
                            <div className="mt-4 rounded-2xl p-4 text-xs font-mono bg-slate-900 border border-blue-500/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-amber-400 font-bold">Debug Console</span>
                                    <span className="text-slate-500">{debugInfo.time}</span>
                                </div>
                                <p className="text-slate-300">Status: <span className="text-emerald-400">{debugInfo.status}</span></p>
                                {debugInfo.result && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-blue-400 hover:text-blue-300">View Response ▸</summary>
                                        <pre className="mt-2 text-emerald-400 overflow-auto max-h-48 text-[10px]">
                                            {JSON.stringify(debugInfo.result, null, 2)}
                                        </pre>
                                    </details>
                                )}
                                {debugInfo.error && <p className="text-rose-400 mt-1">Error: {debugInfo.error}</p>}
                            </div>
                        )}
                    </div>

                    {/* ── Right panel (2/5) ── */}
                    <div className="lg:col-span-2 flex flex-col gap-6" data-aos="fade-up" data-aos-delay="200">

                        {/* Instructions card */}
                        <div className="rounded-3xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black bg-gradient-to-r from-blue-600 to-emerald-600">
                                    SH
                                </span>
                                Student Attendance Steps
                            </h3>
                            <div className="space-y-3">
                                {[
                                    ['1', 'Stand in front of camera kiosk or select demo face'],
                                    ['2', 'Click "Mark My Attendance"'],
                                    ['3', 'Look directly at camera for 3-second snapshot'],
                                    ['4', 'Your attendance and term badge will update instantly'],
                                ].map(([n, text]) => (
                                    <div key={n} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 bg-gradient-to-r from-blue-600 to-emerald-600 shadow-sm">{n}</span>
                                        <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Verification result */}
                        {lastAttendance ? (
                            lastAttendance.error ? (
                                // Error card
                                <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
                                    <div className="px-5 py-4 flex items-center gap-3"
                                        style={{ background: lastAttendance.notRegistered ? 'linear-gradient(135deg,#1e3a5f,#2563eb)' : 'linear-gradient(135deg,#7f1d1d,#dc2626)' }}>
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                            {lastAttendance.notRegistered ? '🪪' : '❌'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">
                                                {lastAttendance.notRegistered ? 'Student Not Registered!' : 'Attendance Not Marked'}
                                            </p>
                                            <p className="text-white/70 text-xs">
                                                {lastAttendance.notRegistered ? 'Auto-clearing in 8 seconds...' : 'Auto-clearing in 4 seconds...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className={`border rounded-2xl px-4 py-4 text-center ${lastAttendance.notRegistered ? 'border-blue-500/30' : 'border-rose-500/30'}`}
                                            style={{ background: lastAttendance.notRegistered ? 'rgba(37,99,235,0.1)' : 'rgba(225,29,72,0.1)' }}>
                                            <p className={`text-sm font-semibold leading-relaxed ${lastAttendance.notRegistered ? 'text-blue-400' : 'text-rose-400'}`}>
                                                {lastAttendance.message}
                                            </p>
                                            {lastAttendance.notRegistered && (
                                                <div className="mt-4 space-y-2">
                                                    <div className="text-xs text-blue-300 font-medium">
                                                        Face detected but not enrolled in Salvation Heritage database.
                                                    </div>
                                                    <Link href="/register"
                                                        className="inline-block mt-3 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transform hover:scale-105 transition-all">
                                                        Register Student Now →
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Success card
                                <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
                                    <div className="px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-blue-700 via-emerald-600 to-teal-600">
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                            {lastAttendance.alreadyMarked ? '📅' : '✅'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">
                                                {lastAttendance.alreadyMarked ? '🎉 Attendance Already Logged!' : 'Attendance Confirmed'}
                                            </p>
                                            <p className="text-white/80 text-xs">
                                                {lastAttendance.alreadyMarked ? 'Recorded for today • Salvation Heritage' : lastAttendance.timestamp}
                                            </p>
                                        </div>
                                        {lastAttendance.confidence && (
                                            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
                                                {Math.round(lastAttendance.confidence * 100)}% Match
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                                            Salvation Heritage Verification
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div>
                                                <p className="text-xs text-slate-400 text-center mb-1.5 font-medium">Live Snapshot</p>
                                                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-blue-500/50 relative bg-slate-950">
                                                    {capturedImage
                                                        ? <img src={capturedImage} alt="Live" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No image</div>
                                                    }
                                                    <div className="absolute bottom-0 inset-x-0 text-white text-[10px] text-center py-1 font-semibold bg-blue-600/90">
                                                        LIVE
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 text-center mb-1.5 font-medium">School Record</p>
                                                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500/50 relative bg-slate-950">
                                                    <img
                                                        src={PHOTO_URL(lastAttendance.student.student_id)}
                                                        alt={lastAttendance.student.name || lastAttendance.student.full_name}
                                                        className="w-full h-full object-cover"
                                                        onError={e => { e.target.src = FALLBACK_SVG; }}
                                                    />
                                                    <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[10px] text-center py-1 font-semibold">ON FILE</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                                            <span className="text-emerald-400 text-sm">✓</span>
                                            <span className="text-emerald-300 text-xs font-semibold">
                                                Identity Verified Successfully
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                ['Student Name', lastAttendance.student.name || lastAttendance.student.full_name],
                                                ['Student ID', lastAttendance.student.student_id],
                                                ['Class', lastAttendance.student.department],
                                                ['Term', lastAttendance.student.semester === 1 ? 'First Term' : lastAttendance.student.semester === 2 ? 'Second Term' : lastAttendance.student.semester === 3 ? 'Third Term' : '—'],
                                            ].map(([k, v]) => (
                                                <div key={k} className="rounded-xl p-3 bg-slate-950/60 border border-slate-800">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{k}</p>
                                                    <p className="text-white text-xs font-semibold truncate">{v || '—'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            // Placeholder when no attendance yet
                            <div className="rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 bg-slate-900/90 border border-slate-800 shadow-xl"
                                style={{ minHeight: 200 }}>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    🎓
                                </div>
                                <p className="font-bold text-white text-sm">
                                    Salvation Heritage Attendance Feed
                                </p>
                                <p className="text-slate-400 text-xs leading-relaxed max-w-[200px]">
                                    Look into camera above to mark attendance and view instant confirmation.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Debug Console Modal */}
            {showDebugConsole && (
                <DebugConsole
                    isVisible={showDebugConsole}
                    onClose={() => setShowDebugConsole(false)}
                />
            )}

            {/* ── Footer ── */}
            <footer className="border-t border-slate-800/80 py-8 bg-slate-950 text-slate-400 text-xs">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black bg-gradient-to-tr from-blue-700 to-emerald-500">
                            SH
                        </div>
                        <div>
                            <span className="font-bold text-white">Salvation Heritage</span>
                            <span className="text-slate-500 mx-1.5">•</span>
                            <span>Smart Biometric Attendance</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span>{totalStudents} students registered</span>
                        <Link href="/dashboard" className="font-semibold text-emerald-400 hover:text-emerald-300 no-underline">
                            Staff & Admin Portal →
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
