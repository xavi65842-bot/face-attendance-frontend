'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const STUDENT_NAV = [
    { path: '/',         label: 'Attendance Kiosk', icon: '📸' },
    { path: '/register', label: 'Register Student', icon: '📝' },
];

const ADMIN_NAV = [
    { path: '/dashboard', label: 'Admin Dashboard', icon: '📊', admin: true },
    { path: '/students',  label: 'Student Directory', icon: '👥', admin: true },
    { path: '/lecturer',  label: 'Faculty Portal',    icon: '👨‍🏫', admin: true },
];

export default function Navbar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">

                {/* School Logo & Name */}
                <Link href="/" className="flex items-center gap-3 no-underline group flex-shrink-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-all">
                        <span className="tracking-tighter">SH</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                                Salvation Heritage
                            </span>
                            <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/50">
                                Official Portal
                            </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 tracking-wide hidden sm:block">
                            Smart Biometric Attendance System
                        </p>
                    </div>
                </Link>

                {/* Desktop links */}
                <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
                    <div className="flex items-center gap-1">
                        {STUDENT_NAV.map(({ path, label, icon }) => {
                            const active = pathname === path;
                            return (
                                <Link key={path} href={path}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all no-underline flex items-center gap-1.5 ${
                                        active
                                            ? 'text-white bg-gradient-to-r from-blue-700 to-blue-600 shadow-md shadow-blue-700/20'
                                            : 'text-slate-600 hover:text-blue-700 hover:bg-white'
                                    }`}>
                                    <span>{icon}</span>
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="h-4 w-px bg-slate-300 mx-1"></div>

                    <div className="flex items-center gap-1">
                        {ADMIN_NAV.map(({ path, label, icon }) => {
                            const active = pathname === path;
                            return (
                                <Link key={path} href={path}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all no-underline flex items-center gap-1.5 ${
                                        active
                                            ? 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/20'
                                            : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                                    }`}>
                                    <span>{icon}</span>
                                    <span>{label}</span>
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/70 text-slate-600">Admin</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Quick Action + Mobile Menu Toggle */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link href="/register"
                        className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition-all no-underline">
                        <span>+</span>
                        <span>Register Student</span>
                    </Link>

                    <button onClick={() => setOpen(v => !v)}
                        aria-label="Toggle menu"
                        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                        {open
                            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        }
                    </button>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            {open && (
                <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-xl">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3">Student Zone</p>
                        <div className="space-y-1">
                            {STUDENT_NAV.map(({ path, label, icon }) => {
                                const active = pathname === path;
                                return (
                                    <Link key={path} href={path}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                                            active ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                        }`}>
                                        <span>{icon}</span>
                                        <span>{label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-3">Staff & Admin Zone</p>
                        <div className="space-y-1">
                            {ADMIN_NAV.map(({ path, label, icon }) => {
                                const active = pathname === path;
                                return (
                                    <Link key={path} href={path}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                                            active ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                        }`}>
                                        <div className="flex items-center gap-2.5">
                                            <span>{icon}</span>
                                            <span>{label}</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">Protected</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
