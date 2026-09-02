'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AOSInit from '../../components/AOSInit';
import toast, { Toaster } from 'react-hot-toast';
import { validateLecturer, startSession, stopSession, getSessionStatus, getLecturerHistory, loginLecturer, NIGERIAN_FACULTY } from '../../lib/api';

const DEPARTMENTS = [
    'JSS1',
    'JSS2',
    'JSS3',
    'SS1',
    'SS2',
    'SS3',
];

const PHOTO_URL = (id) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/get-student-photo.php?student_id=${id}`;

const FALLBACK_SVG = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230f172a"/><text x="50" y="58" text-anchor="middle" fill="%2338bdf8" font-size="34" font-family="sans-serif">👤</text></svg>`;

function toDatetimeString(timeStr) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const selectedDateTime = new Date(`${today} ${timeStr}:00`);
    if (selectedDateTime <= now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().slice(0, 10);
        return `${tomorrowDate} ${timeStr}:00`;
    }
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
                <p className="text-xs text-amber-400 mt-1 font-medium">Please stop the session manually</p>
            </div>
        );
    }
    return <span className="font-mono font-extrabold text-2xl text-emerald-400">{display}</span>;
}

// ── Student Detail Modal ──────────────────────────────────────────────────
function StudentModal({ student, onClose }) {
    if (!student) return null;
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-blue-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-emerald-900 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🎓</span>
                        <h3 className="font-bold text-white text-sm">Student Attendance Profile</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center text-sm">✕</button>
                </div>
                <div className="p-6 space-y-5 text-center">
                    <div className="w-28 h-28 mx-auto rounded-3xl overflow-hidden border-2 border-emerald-400/60 shadow-xl bg-slate-950">
                        <img src={PHOTO_URL(student.student_id)} alt={student.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = FALLBACK_SVG; }} />
                    </div>
                    <div>
                        <h4 className="font-black text-xl text-white">{student.full_name}</h4>
                        <p className="text-emerald-400 font-mono font-bold text-sm tracking-wider mt-0.5">{student.student_id}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 text-left text-xs">
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                            <p className="text-slate-400 text-[10px] uppercase font-bold">Class</p>
                            <p className="font-bold text-white mt-0.5">{student.department || '—'}</p>
                        </div>
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                            <p className="text-slate-400 text-[10px] uppercase font-bold">Academic Term</p>
                            <p className="font-bold text-white mt-0.5">{student.semester === 1 ? '1st Term' : student.semester === 2 ? '2nd Term' : '3rd Term'}</p>
                        </div>
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                            <p className="text-slate-400 text-[10px] uppercase font-bold">Time Verified</p>
                            <p className="font-bold text-emerald-400 mt-0.5 font-mono">{student.time || '—'}</p>
                        </div>
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                            <p className="text-slate-400 text-[10px] uppercase font-bold">Biometric Match</p>
                            <p className="font-bold text-emerald-300 mt-0.5">{student.confidence ? `${student.confidence}% Match` : 'Verified'}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all">
                        Close Profile
                    </button>
                </div>
            </div>
        </div>
    );
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* Top School Banner */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white text-[11px] py-1.5 px-4 text-center font-semibold tracking-wide border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>🏛️</span>
                    <span>Salvation Heritage Schools • Faculty Authentication Portal</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                    13 Active Nigerian Instructors
                </div>
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
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    Faculty Portal
                                </span>
                            </div>
                            <span className="hidden md:block text-slate-400 text-xs">Instructor Session Terminal</span>
                        </div>
                    </Link>
                    <Link href="/" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all no-underline">
                        ← Back to Kiosk
                    </Link>
                </div>
            </nav>

            {/* Login Card */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md bg-slate-900 border border-blue-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden" data-aos="zoom-in">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-lg shadow-blue-600/30">
                            👨🏾‍🏫
                        </div>
                        <h2 className="text-2xl font-black text-white">Faculty Sign In</h2>
                        <p className="text-xs text-slate-400 mt-1">Salvation Heritage Instructor Portal</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                Username or Lecturer ID
                            </label>
                            <input type="text"
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}
                                placeholder="e.g. babatunde.adeyemi or LEC001"
                                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                                Password
                            </label>
                            <input type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-all" />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3.5 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50">
                            {loading ? 'Verifying Credentials...' : 'Sign In to Session Terminal →'}
                        </button>
                    </form>

                    {/* Quick Faculty Picker */}
                    <div className="mt-6 pt-5 border-t border-slate-800">
                        <button onClick={() => setShowPicker(!showPicker)}
                            className="w-full py-2.5 rounded-xl text-xs font-bold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all flex items-center justify-center gap-1.5">
                            <span>📋</span>
                            <span>{showPicker ? 'Hide Faculty List' : 'Select From 13 Nigerian Faculty Members'}</span>
                        </button>

                        {showPicker && (
                            <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1 text-left">
                                {NIGERIAN_FACULTY.map(lec => (
                                    <button key={lec.lecturer_id} onClick={() => selectFaculty(lec)}
                                        className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-left transition-all flex items-center justify-between group">
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-blue-300">{lec.full_name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{lec.department} • {lec.username}</p>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">{lec.lecturer_id}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
                Salvation Heritage Schools • Biometric Attendance Control
            </footer>
        </div>
    );
}

// ── Main Lecturer App ─────────────────────────────────────────────────────
export default function LecturerPage() {
    const [lecturer, setLecturer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('fa_lecturer');
        if (saved) {
            try {
                setLecturer(JSON.parse(saved));
            } catch {
                localStorage.removeItem('fa_lecturer');
            }
        }
        setLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('fa_lecturer');
        sessionStorage.removeItem('fa_session');
        setLecturer(null);
        toast.success('Signed out of Faculty Portal.');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!lecturer) {
        return <LoginScreen onLogin={setLecturer} />;
    }

    return <SessionPanel lecturer={lecturer} onLogout={handleLogout} />;
}

// ── Session Panel (Rich Real-Time Attendee Roster + 24-Hour History) ──────
function SessionPanel({ lecturer, onLogout }) {
    const [form, setForm] = useState({
        department: lecturer.department || '',
        semester: 1,
        course_code: '',
        course_name: '',
        end_time: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const [markedCount, setMarkedCount] = useState(0);
    const [attendees, setAttendees] = useState([]);
    const [historySessions, setHistorySessions] = useState([]);
    const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'
    const [historyLoading, setHistoryLoading] = useState(false);
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const pollRef = useRef(null);

    const inputCls = (field) =>
        `w-full px-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none ${
            errors[field]
                ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                : 'border-slate-700 focus:border-emerald-500 bg-slate-950 text-white'
        }`;

    // Fetch history
    const loadHistory = useCallback(async () => {
        if (!lecturer?.lecturer_id) return;
        setHistoryLoading(true);
        try {
            const data = await getLecturerHistory(lecturer.lecturer_id);
            setHistorySessions(data || []);
        } catch {
            setHistorySessions([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [lecturer]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Restore active session on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('fa_session');
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            getSessionStatus(parsed.department, parsed.semester, parsed.id)
                .then(data => {
                    if (data.active && data.session) {
                        setActiveSession({ ...parsed, ...data.session });
                        setMarkedCount(data.session.marked_students ?? (data.attendees?.length || 0));
                        setAttendees(data.attendees || []);
                    } else {
                        sessionStorage.removeItem('fa_session');
                    }
                })
                .catch(() => sessionStorage.removeItem('fa_session'));
        } catch {
            sessionStorage.removeItem('fa_session');
        }
    }, []);

    // Poll while session active (every 5 seconds for real-time responsiveness)
    const pollStatus = useCallback(async (session) => {
        if (!session) return;
        try {
            const data = await getSessionStatus(session.department, session.semester, session.id);
            if (data.active && data.session) {
                setMarkedCount(data.session.marked_students ?? (data.attendees?.length || 0));
                setAttendees(data.attendees || []);
            } else {
                setActiveSession(null);
                sessionStorage.removeItem('fa_session');
                loadHistory();
            }
        } catch { /* ignore */ }
    }, [loadHistory]);

    useEffect(() => {
        if (activeSession) {
            pollRef.current = setInterval(() => pollStatus(activeSession), 5000);
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
                setAttendees([]);
                sessionStorage.setItem('fa_session', JSON.stringify(sessionData));
                toast.success('Session started! Students can now scan attendance.', { duration: 5000 });
                loadHistory();
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
                toast.success('Session stopped. Attendance recorded.', { duration: 5000 });
                loadHistory();
            } else {
                toast.error(data.message || 'Failed to stop session.');
            }
        } catch { toast.error('Network error. Check if PHP backend is running.'); }
        finally { setLoading(false); }
    };

    // Filter attendees by search query
    const filteredAttendees = attendees.filter(a =>
        a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
                select option { background-color: #0f172a !important; color: #fff !important; }
                select { color-scheme: dark; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            }} />

            {/* Student Detail Modal */}
            <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />

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
                                    Faculty Active
                                </span>
                            </div>
                            <span className="hidden md:block text-slate-400 text-xs">Instructor Session Terminal</span>
                        </div>
                    </Link>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                        <button onClick={() => setActiveTab('live')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'live'
                                    ? 'text-white bg-gradient-to-r from-blue-600 to-emerald-600 shadow-md shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}>
                            <span>🎯</span>
                            <span>{activeSession ? 'Live Active Session' : 'Session Portal'}</span>
                        </button>
                        <button onClick={() => { setActiveTab('history'); loadHistory(); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'history'
                                    ? 'text-white bg-gradient-to-r from-blue-600 to-emerald-600 shadow-md shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}>
                            <span>🕒</span>
                            <span>24h & Past Classes ({historySessions.length})</span>
                        </button>
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
            <div className="relative text-white overflow-hidden py-10 sm:py-14 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md">
                                Instructor Terminal
                            </span>
                            <span className="text-xs font-mono text-emerald-300 font-bold">{lecturer.lecturer_id}</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-white">{lecturer.full_name}</h1>
                        <p className="text-slate-300 text-sm mt-1">Department: <b className="text-white">{lecturer.department || 'General'}</b> • Salvation Heritage Schools</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-slate-950/70 border border-white/10 rounded-2xl px-4 py-3 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Status</p>
                            <p className="text-sm font-black text-emerald-400 mt-0.5">{activeSession ? '🟢 Class Open' : '⚪ Idle'}</p>
                        </div>
                        <div className="bg-slate-950/70 border border-white/10 rounded-2xl px-4 py-3 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Past Sessions</p>
                            <p className="text-sm font-black text-white mt-0.5">{historySessions.length} Classes</p>
                        </div>
                        <Link href="/"
                            className="px-4 py-3 rounded-2xl text-xs font-bold text-white bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 transition-all flex items-center gap-1.5 no-underline">
                            <span>📸</span>
                            <span>Open Kiosk Scanner</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* ── TAB 1: LIVE SESSION / NEW SESSION ── */}
                {activeTab === 'live' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            {/* Left: Instructor Credentials & Instructions */}
                            <div className="lg:col-span-2 space-y-5" data-aos="fade-right">
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
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Class Management Rules</p>
                                    <div className="space-y-3">
                                        {[
                                            ['1', 'Select target class and term'],
                                            ['2', 'Input course subject details'],
                                            ['3', 'Click Start Session — Kiosk unlocks immediately'],
                                            ['4', 'Real-time photos and attendance stream below live'],
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

                            {/* Right: Form / Active Session Card */}
                            <div className="lg:col-span-3" data-aos="fade-left">
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

                        {/* ── REAL-TIME ATTENDEES ROSTER FOR ACTIVE SESSION ── */}
                        {activeSession && (
                            <div className="rounded-3xl p-6 sm:p-8 bg-slate-900 border border-emerald-500/30 shadow-2xl space-y-6" data-aos="fade-up">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                                            👥
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white">Live Class Attendance Roster</h3>
                                            <p className="text-xs text-slate-400">Students scanned in this active lecture ({attendees.length} present)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="text"
                                            placeholder="Search student or ID..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 w-48 sm:w-60" />
                                    </div>
                                </div>

                                {filteredAttendees.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-sm">
                                        <span className="text-4xl block mb-2">📸</span>
                                        <p className="font-bold text-white">No students scanned yet</p>
                                        <p className="text-xs mt-1">Students can scan their faces at the kiosk. Their photo and details will appear here instantly.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredAttendees.map((stu) => (
                                            <div key={stu.student_id} onClick={() => setSelectedStudent(stu)}
                                                className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-emerald-500/40 flex-shrink-0">
                                                    <img src={PHOTO_URL(stu.student_id)} alt={stu.full_name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        onError={(e) => { e.target.src = FALLBACK_SVG; }} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-white text-sm truncate group-hover:text-emerald-300">{stu.full_name}</p>
                                                    <p className="text-xs text-emerald-400 font-mono font-bold">{stu.student_id}</p>
                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                                        <span>🕒 {stu.time}</span>
                                                        {stu.confidence > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px]">{stu.confidence}%</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: 24-HOUR & PREVIOUS CLASS SESSIONS HISTORY ── */}
                {activeTab === 'history' && (
                    <div className="space-y-6" data-aos="fade-up">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                            <div>
                                <h2 className="text-2xl font-black text-white">Class Session History</h2>
                                <p className="text-xs text-slate-400 mt-1">Review student attendance rosters from recent & past classes</p>
                            </div>
                            <button onClick={loadHistory}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto">
                                <span>🔄</span>
                                <span>Refresh History</span>
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className="text-center py-16 text-slate-400 text-sm">
                                <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                                Loading class sessions...
                            </div>
                        ) : historySessions.length === 0 ? (
                            <div className="text-center py-16 rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
                                <span className="text-4xl block mb-2">📚</span>
                                <p className="font-bold text-white text-base">No previous classes found</p>
                                <p className="text-xs mt-1">Once you open and conclude a class session, the attendance records and student photos will be archived here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {historySessions.map(session => {
                                    const isExpanded = expandedSessionId === session.id;
                                    return (
                                        <div key={session.id} className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl transition-all">
                                            {/* Session Header Card */}
                                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                            {session.course_code}
                                                        </span>
                                                        <span className="text-xs font-bold text-emerald-400">
                                                            Class {session.department} • {session.semester === 1 ? '1st Term' : session.semester === 2 ? '2nd Term' : '3rd Term'}
                                                        </span>
                                                        {session.is_24h && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                🕒 Last 24 Hours
                                                            </span>
                                                        )}
                                                        {session.is_active && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                                                                🟢 Active Now
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg font-black text-white">{session.course_name}</h3>
                                                    <p className="text-xs text-slate-400">
                                                        📅 {session.date} at {session.time} • Marked Attendees: <b className="text-emerald-400">{session.marked_count} students</b>
                                                    </p>
                                                </div>

                                                <button onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-md transition-all flex items-center gap-2 self-start md:self-auto">
                                                    <span>👥</span>
                                                    <span>{isExpanded ? 'Hide Attendees' : `View Attended Students (${session.marked_count})`}</span>
                                                    <span>{isExpanded ? '▲' : '▼'}</span>
                                                </button>
                                            </div>

                                            {/* Expanded Attendees Grid */}
                                            {isExpanded && (
                                                <div className="p-6 bg-slate-950/80 border-t border-slate-800 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                                            Attendance Roster for {session.course_code} ({session.marked_count} Present)
                                                        </p>
                                                    </div>

                                                    {session.attendees?.length === 0 ? (
                                                        <p className="text-xs text-slate-500 italic">No attendance records for this session.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {session.attendees.map(stu => (
                                                                <div key={stu.student_id} onClick={() => setSelectedStudent(stu)}
                                                                    className="rounded-2xl p-3.5 bg-slate-900 border border-slate-800 hover:border-blue-500/40 cursor-pointer flex items-center gap-3 transition-all group">
                                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex-shrink-0">
                                                                        <img src={PHOTO_URL(stu.student_id)} alt={stu.full_name}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                            onError={(e) => { e.target.src = FALLBACK_SVG; }} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="font-bold text-white text-xs truncate group-hover:text-blue-300">{stu.full_name}</p>
                                                                        <p className="text-[11px] text-emerald-400 font-mono">{stu.student_id}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                                            <span>🕒 {stu.time}</span>
                                                                            {stu.confidence > 0 && <span className="font-mono text-emerald-300">{stu.confidence}%</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500">
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
        </div>
    );
}
