'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const STUDENT_NAV = [
    { path: '/',         label: 'Attendance Kiosk', shortLabel: 'Kiosk', icon: '📸' },
    { path: '/register', label: 'Student Registration', shortLabel: 'Register', icon: '📝' },
];

const ADMIN_NAV = [
    { path: '/dashboard', label: 'Admin Dashboard', shortLabel: 'Dashboard', icon: '📊', admin: true },
    { path: '/students',  label: 'Student Directory', shortLabel: 'Students', icon: '👥', admin: true },
];

export default function Navbar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">

                    {/* School Logo & Name */}
                    <Link href="/" className="flex items-center gap-3 no-underline group flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-all">
                            <span className="tracking-tighter">SH</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-base sm:text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                    Salvation Heritage
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
                                    Official
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide hidden sm:block">
                                Smart Biometric Attendance System
                            </p>
                        </div>
                    </Link>

                    {/* Desktop links */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                            {STUDENT_NAV.map(({ path, label, icon }) => {
                                const active = pathname === path;
                                return (
                                    <Link key={path} href={path}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all no-underline flex items-center gap-1.5 ${
                                            active
                                                ? 'text-white bg-gradient-to-r from-blue-700 to-blue-600 shadow-md shadow-blue-700/25'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                                        }`}>
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

                        <div className="flex items-center gap-1">
                            {ADMIN_NAV.map(({ path, label, icon }) => {
                                const active = pathname === path;
                                return (
                                    <Link key={path} href={path}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all no-underline flex items-center gap-1.5 ${
                                            active
                                                ? 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/25'
                                                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                                        }`}>
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">PIN</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Quick Action & Mobile Toggle */}
                    <div className="flex items-center gap-2">
                        <Link href="/register"
                            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-md shadow-emerald-600/20 active:scale-95 transition-all no-underline">
                            <span>+</span>
                            <span>Register Student</span>
                        </Link>

                        {/* Mobile Hamburger Button */}
                        <button onClick={() => setOpen(v => !v)}
                            aria-label="Toggle mobile menu"
                            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            {open ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {open && (
                    <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-3">Student Portals</p>
                            <div className="space-y-1">
                                {STUDENT_NAV.map(({ path, label, icon }) => {
                                    const active = pathname === path;
                                    return (
                                        <Link key={path} href={path}
                                            onClick={() => setOpen(false)}
                                            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-bold transition-all no-underline ${
                                                active
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                                            }`}>
                                            <span className="text-lg">{icon}</span>
                                            <span>{label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-3">Administration</p>
                            <div className="space-y-1">
                                {ADMIN_NAV.map(({ path, label, icon }) => {
                                    const active = pathname === path;
                                    return (
                                        <Link key={path} href={path}
                                            onClick={() => setOpen(false)}
                                            className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all no-underline ${
                                                active
                                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{icon}</span>
                                                <span>{label}</span>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                                Protected
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Register on Mobile */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Link href="/register"
                                onClick={() => setOpen(false)}
                                className="w-full py-3 rounded-2xl font-black text-sm text-center text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 no-underline">
                                <span>+</span>
                                <span>Enroll New Student</span>
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Mobile Bottom Quick Switch Bar (Visible only on mobile screens) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-3 flex items-center justify-around shadow-2xl shadow-black">
                <Link href="/"
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all no-underline ${
                        pathname === '/' ? 'text-blue-400 font-black' : 'text-slate-400 hover:text-white'
                    }`}>
                    <span className="text-xl">📸</span>
                    <span className="text-[10px] font-bold">Kiosk</span>
                </Link>

                <Link href="/register"
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all no-underline ${
                        pathname === '/register' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-white'
                    }`}>
                    <span className="text-xl">📝</span>
                    <span className="text-[10px] font-bold">Register</span>
                </Link>

                <Link href="/dashboard"
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all no-underline ${
                        pathname === '/dashboard' ? 'text-emerald-400 font-black' : 'text-slate-400 hover:text-white'
                    }`}>
                    <span className="text-xl">📊</span>
                    <span className="text-[10px] font-bold">Admin</span>
                </Link>

                <Link href="/students"
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all no-underline ${
                        pathname === '/students' ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-white'
                    }`}>
                    <span className="text-xl">👥</span>
                    <span className="text-[10px] font-bold">Students</span>
                </Link>
            </div>
        </>
    );
}
