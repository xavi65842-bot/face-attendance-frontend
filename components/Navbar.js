'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
    { path: '/',          label: 'Home'      },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/register',  label: 'Register'  },
    { path: '/students',  label: 'Students'  },
    { path: '/lecturer',  label: 'Lecturer'  },
];

export default function Navbar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <nav style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            position: 'sticky', top: 0, zIndex: 50,
            fontFamily: "'Inter','Segoe UI',sans-serif",
        }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 no-underline">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg"
                        style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                        </svg>
                    </div>
                    <div className="hidden sm:block">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg" style={{ color: '#C1121F' }}>Face Attendance System</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white">by BENX</span>
                        </div>
                    </div>
                </Link>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-1">
                    {NAV.map(({ path, label }) => {
                        const active = pathname === path;
                        return (
                            <Link key={path} href={path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                                    active
                                        ? 'text-[#C1121F] bg-red-50'
                                        : 'text-gray-500 hover:text-[#C1121F] hover:bg-red-50'
                                }`}>
                                {label}
                                {active && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[#C1121F] inline-block align-middle" />}
                            </Link>
                        );
                    })}
                </div>

                {/* Right: CTA + hamburger */}
                <div className="flex items-center gap-3">
                    <Link href="/register"
                        className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white no-underline transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                        + Register Student
                    </Link>
                    <button onClick={() => setOpen(v => !v)}
                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-red-200 hover:text-[#C1121F] transition-colors">
                        {open
                            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        }
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
                    {NAV.map(({ path, label }) => {
                        const active = pathname === path;
                        return (
                            <Link key={path} href={path}
                                onClick={() => setOpen(false)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
                                    active ? 'bg-red-50 text-[#C1121F]' : 'text-gray-600 hover:bg-gray-50'
                                }`}>
                                <span>{label}</span>
                                {active && <span className="w-2 h-2 rounded-full bg-[#C1121F]" />}
                            </Link>
                        );
                    })}
                    <Link href="/register" onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-2 mt-2 px-4 py-3 rounded-xl text-sm font-bold text-white no-underline"
                        style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>
                        + Register Student
                    </Link>
                </div>
            )}
        </nav>
    );
}
