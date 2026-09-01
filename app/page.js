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
        <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
                @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(193,18,31,0.4); } 50% { box-shadow: 0 0 40px rgba(193,18,31,0.8), 0 0 60px rgba(193,18,31,0.3); } }
                select option { background-color: #1a0a0a !important; color: #fff !important; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#1a0a0a', color: '#fff', border: '1px solid rgba(193,18,31,0.3)' },
                success: { iconTheme: { primary: '#C1121F', secondary: '#fff' } },
            }} />

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 w-full" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    {/* NAV BAR ITEM CLOSE TO ICON */}
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
                            <span className="hidden md:block text-gray-500 text-xs">Real-time Face Recognition</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        {[['/', 'Home', true], ['/dashboard', 'Dashboard'], ['/register', 'Register'], ['/students', 'Students'], ['/lecturer', 'Lecturer']].map(([href, label, active]) => (
                            <Link key={href} href={href}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={active
                                    ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' }
                                    : { color: '#9ca3af' }}>
                                {label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowDebugConsole(true)}
                            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                            📊
                        </button>
                        <button onClick={() => setShowDebug(v => !v)}
                            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                            {showDebug ? '🐛' : '🔧'}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── RED Hero Section with BIG Image ── */}
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

                        {/* Left — text + clock */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-3 mb-5 flex-wrap" data-aos="fade-up" data-aos-delay="100">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px #4ade80' }}></div>
                                    <span className="text-white text-xs font-semibold uppercase tracking-widest">Live Recognition</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                                    by BENX
                                </span>
                            </div>

                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-5xl sm:text-6xl lg:text-7xl text-white">Face</span>
                                <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{ color: 'rgba(255,200,200,0.9)' }}>Attendance</span>
                            </h1>

                            <p className="text-red-100 text-base sm:text-lg max-w-xl leading-relaxed mb-8" data-aos="fade-up" data-aos-delay="300">
                                Mark your attendance instantly with Amazon Rekognition facial recognition. Fast, secure, and contactless.
                            </p>

                            {/* Live Clock */}
                            <div className="mb-6 rounded-2xl px-6 py-4 inline-block" data-aos="zoom-in" data-aos-delay="400"
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                <LiveClock />
                            </div>

                            {/* Stats row */}
                            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="500">
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{todayCount}</p>
                                        <p className="text-red-200 text-xs">Present Today</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">📊</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{percentage}%</p>
                                        <p className="text-red-200 text-xs">Attendance Rate</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                    <span className="text-2xl">👥</span>
                                    <div>
                                        <p className="text-white font-black text-xl leading-none">{totalStudents}</p>
                                        <p className="text-red-200 text-xs">Total Students</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — face.jpg with premium frame - BIG & RESPONSIVE */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                {/* Outer glow */}
                                <div className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
                                    style={{ background: 'radial-gradient(circle, rgba(193,18,31,0.6), transparent)', animation: 'glow-pulse 3s ease-in-out infinite' }} />

                                {/* Image card */}
                                <div className="relative rounded-3xl overflow-hidden"
                                    style={{ border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                    <img src="/scanner.jpg" alt="Face Recognition"
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

            {/* ── Main content ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

                    {/* ── Camera panel (3/5) ── */}
                    <div className="lg:col-span-3" data-aos="fade-up">
                        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                            {/* Panel header */}
                            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 8px #4ade80' }} />
                                    <span className="font-bold text-white text-sm">Live Camera Feed</span>
                                </div>
                                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.3)' }}>
                                    Active
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
                            <div className="mt-4 rounded-2xl p-4 text-xs font-mono" style={{ background: '#1a0a0a', border: '1px solid rgba(193,18,31,0.3)' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-yellow-400 font-bold">Debug Console</span>
                                    <span className="text-gray-500">{debugInfo.time}</span>
                                </div>
                                <p className="text-gray-300">Status: <span className="text-green-400">{debugInfo.status}</span></p>
                                {debugInfo.result && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-blue-400 hover:text-blue-300">View Response ▸</summary>
                                        <pre className="mt-2 text-green-400 overflow-auto max-h-48 text-[10px]">
                                            {JSON.stringify(debugInfo.result, null, 2)}
                                        </pre>
                                    </details>
                                )}
                                {debugInfo.error && <p className="text-red-400 mt-1">Error: {debugInfo.error}</p>}
                            </div>
                        )}
                    </div>

                    {/* ── Right panel (2/5) ── */}
                    <div className="lg:col-span-2 flex flex-col gap-6" data-aos="fade-up" data-aos-delay="200">

                        {/* Instructions card */}
                        <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)' }}>?</span>
                                How It Works
                            </h3>
                            <div className="space-y-3">
                                {[
                                    ['1', 'Position your face in the camera frame'],
                                    ['2', 'Click "Mark My Attendance"'],
                                    ['3', 'Wait for the 3-second countdown'],
                                    ['4', 'Your attendance is recorded instantly'],
                                ].map(([n, text]) => (
                                    <div key={n} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                                            style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>{n}</span>
                                        <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Verification result */}
                        {lastAttendance ? (
                            lastAttendance.error ? (
                                // Error card
                                <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                    <div className="px-5 py-4 flex items-center gap-3"
                                        style={{ background: lastAttendance.notRegistered ? 'linear-gradient(135deg,#1e3a5f,#2563eb)' : 'linear-gradient(135deg,#7f1d1d,#dc2626)' }}>
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                            {lastAttendance.notRegistered ? '🪪' : '❌'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">
                                                {lastAttendance.notRegistered ? 'Not Registered!' : 'Attendance Not Marked'}
                                            </p>
                                            <p className="text-white/70 text-xs">
                                                {lastAttendance.notRegistered ? 'Auto-clearing in 8 seconds...' : 'Auto-clearing in 4 seconds...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className={`border rounded-2xl px-4 py-4 text-center ${lastAttendance.notRegistered ? 'border-blue-500/30' : 'border-red-500/30'}`}
                                            style={{ background: lastAttendance.notRegistered ? 'rgba(37,99,235,0.1)' : 'rgba(220,38,38,0.1)' }}>
                                            <p className={`text-sm font-semibold leading-relaxed ${lastAttendance.notRegistered ? 'text-blue-400' : 'text-red-400'}`}>
                                                {lastAttendance.message}
                                            </p>
                                            {lastAttendance.notRegistered && (
                                                <div className="mt-4 space-y-2">
                                                    <div className="text-xs text-blue-300 font-medium">
                                                        Face detected but you&apos;re not in our database.
                                                    </div>
                                                    <Link href="/register"
                                                        className="inline-block mt-3 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg transform hover:scale-105 transition-all"
                                                        style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                                                        Register Now - It&apos;s Important! →
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Success card
                                <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                                    <div className="px-5 py-4 flex items-center gap-3"
                                        style={{ background: lastAttendance.alreadyMarked ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                                            {lastAttendance.alreadyMarked ? '📅' : '✅'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">
                                                {lastAttendance.alreadyMarked ? '🎉 Already Here — Keep It Up!' : 'Attendance Confirmed'}
                                            </p>
                                            <p className="text-white/70 text-xs">
                                                {lastAttendance.alreadyMarked ? 'Your attendance for today is already recorded' : lastAttendance.timestamp}
                                            </p>
                                        </div>
                                        {lastAttendance.confidence && (
                                            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
                                                {Math.round(lastAttendance.confidence * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-3">
                                            Identity Verification
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div>
                                                <p className="text-xs text-gray-400 text-center mb-1.5 font-medium">Live Capture</p>
                                                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-blue-500/50 relative" style={{ background: '#1a0a0a' }}>
                                                    {capturedImage
                                                        ? <img src={capturedImage} alt="Live" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image</div>
                                                    }
                                                    <div className={`absolute bottom-0 inset-x-0 text-white text-[10px] text-center py-1 font-semibold bg-blue-500/90`}>
                                                        LIVE
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 text-center mb-1.5 font-medium">Registered</p>
                                                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-green-500/50 relative" style={{ background: '#1a0a0a' }}>
                                                    <img
                                                        src={PHOTO_URL(lastAttendance.student.student_id)}
                                                        alt={lastAttendance.student.name || lastAttendance.student.full_name}
                                                        className="w-full h-full object-cover"
                                                        onError={e => { e.target.src = FALLBACK_SVG; }}
                                                    />
                                                    <div className="absolute bottom-0 inset-x-0 bg-green-500/90 text-white text-[10px] text-center py-1 font-semibold">ON FILE</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl border border-green-500/30`}
                                            style={{ background: 'rgba(34,197,94,0.1)' }}>
                                            <span className="text-green-400 text-sm">✓</span>
                                            <span className="text-green-300 text-xs font-semibold">
                                                Identity Verified Successfully
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                ['Name', lastAttendance.student.name || lastAttendance.student.full_name],
                                                ['ID', lastAttendance.student.student_id],
                                                ['Class', lastAttendance.student.department],
                                                ['Term', lastAttendance.student.semester === 1 ? 'First Term' : lastAttendance.student.semester === 2 ? 'Second Term' : lastAttendance.student.semester === 3 ? 'Third Term' : '—'],
                                            ].map(([k, v]) => (
                                                <div key={k} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">{k}</p>
                                                    <p className="text-white text-xs font-semibold truncate">{v || '—'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            // Placeholder when no attendance yet
                            <div className="rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3"
                                style={{ background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minHeight: 200 }}>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                                    style={{ background: 'rgba(193,18,31,0.15)' }}>
                                    🪪
                                </div>
                                <p className="font-semibold text-white text-sm">
                                    No attendance yet
                                </p>
                                <p className="text-gray-400 text-xs leading-relaxed max-w-[180px]">
                                    Capture your face to mark attendance and see your verification result here.
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
            <footer className="border-t py-6 mt-8" style={{ borderColor: 'rgba(193,18,31,0.2)', background: '#0a0a0a' }}>
                <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)' }}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
                            </svg>
                        </div>
                        <span className="font-medium text-gray-300">Face Attendance</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                    </div>
                    <span className="text-gray-500">Auto-refreshes every 30s · {totalStudents} students enrolled</span>
                    <Link href="/dashboard" className="font-medium hover:underline transition-colors" style={{ color: '#ff6b6b' }}>View Dashboard →</Link>
                </div>
            </footer>
        </div>
    );
}
