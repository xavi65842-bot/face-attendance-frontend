'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import AOSInit from '../../components/AOSInit';
import CameraCapture from '../../components/CameraCapture';
import { registerStudent, checkStudentId, checkFace } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

const DEPARTMENTS = [
    'JSS1',
    'JSS2',
    'JSS3',
    'SS1',
    'SS2',
    'SS3',
];

// Generate a unique SAL-XXXX student ID
function generateStudentId() {
    const num = Math.floor(1000 + Math.random() * 9000); // 4-digit: 1000-9999
    return `SAL-${num}`;
}

const RULES = {
    student_id: {
        validate: v => /^SAL-\d{4}$/i.test(v.trim()),
        message: 'Student ID must be in SAL-XXXX format.',
        hint: 'Auto-generated unique Salvation Heritage ID',
    },
    full_name: {
        validate: v => /^[a-zA-Z\s''-]{3,}$/.test(v.trim()),
        message: 'Full name must be at least 3 letters.',
        hint: 'Enter your full name.',
    },
    department: { validate: v => v !== '', message: 'Please select a class.', hint: '' },
    year_intake: { validate: v => v !== '', message: 'Intake year is required.', hint: '' },
    semester:    { validate: v => Number(v) >= 1 && Number(v) <= 3, message: 'Please select a valid term.', hint: '' },
};

// ── Duplicate Face Alert Modal ────────────────────────────────────────────
function DuplicateFaceAlert({ duplicateInfo, onClose }) {
    if (!duplicateInfo) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl overflow-hidden bg-slate-900 border border-blue-500/40 shadow-2xl">
                <div className="px-6 py-6 text-center bg-gradient-to-r from-blue-900/30 to-emerald-900/30 border-b border-blue-500/20">
                    <div className="text-5xl mb-3">🛡️</div>
                    <h3 className="text-xl font-black text-white mb-1">Duplicate Face Detected!</h3>
                    <p className="text-emerald-400 text-xs font-semibold">Salvation Heritage Biometric Protection</p>
                </div>
                <div className="p-6">
                    <p className="text-slate-400 text-sm mb-4 text-center">This face is already registered to:</p>
                    <div className="rounded-2xl p-4 mb-4 text-center bg-slate-950/80 border border-blue-500/30">
                        <p className="font-black text-white text-lg">{duplicateInfo.existing_student}</p>
                        <p className="text-xs text-slate-400 font-mono mt-1">Student ID: {duplicateInfo.existing_id}</p>
                        <p className="text-xs font-bold mt-2 text-emerald-400">
                            Biometric Match: {duplicateInfo.similarity}%
                        </p>
                    </div>
                    <div className="rounded-2xl p-3.5 mb-4 bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-300 text-center leading-relaxed">
                            Each student may only be registered once in the Salvation Heritage system.
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-lg shadow-blue-600/30 active:scale-95 transition-all">
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );
}

function FieldError({ msg }) {
    if (!msg) return null;
    return (
        <div className="flex items-start gap-1.5 mt-1.5">
            <span className="text-rose-400 text-xs mt-0.5">⚠</span>
            <p className="text-rose-400 text-xs font-medium">{msg}</p>
        </div>
    );
}

function FieldHint({ text }) {
    if (!text) return null;
    return <p className="text-slate-500 text-xs mt-1">{text}</p>;
}

function StepIndicator({ current }) {
    const steps = [{ n: 1, label: 'Details' }, { n: 2, label: 'Face' }, { n: 3, label: 'Done' }];
    return (
        <div className="flex items-center justify-center">
            {steps.map((s, i) => {
                const done = current > s.n;
                const active = current === s.n;
                return (
                    <div key={s.n} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 ${
                                done
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                                    : active
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                                {done ? '✓' : s.n}
                            </div>
                            <span className={`text-[10px] font-bold whitespace-nowrap ${
                                active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-slate-500'
                            }`}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 mb-4 transition-all duration-500 ${
                                done ? 'bg-emerald-500' : 'bg-slate-800'
                            }`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function InputField({ label, required, error, hint, children }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                {label} {required && <span style={{ color: '#ff6b6b' }}>*</span>}
            </label>
            {children}
            <FieldError msg={error} />
            <FieldHint text={!error ? hint : ''} />
        </div>
    );
}

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ student_id: generateStudentId(), full_name: '', department: '', intake_year: new Date().getFullYear().toString(), intake_month: 'January', semester: '' });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [registered, setRegistered] = useState(null);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [idStatus, setIdStatus] = useState('idle');
    const [idOwner, setIdOwner] = useState(null);
    const debounceRef = useRef(null);

    // Auto-check if auto-generated ID is available; regenerate if taken
    useEffect(() => {
        const id = formData.student_id.trim().toUpperCase();
        if (!id || id.length < 3) { setIdStatus('idle'); setIdOwner(null); return; }
        setIdStatus('checking');
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await checkStudentId(id);
                if (res.exists) {
                    // Auto-regenerate a new unique ID if the generated one is taken
                    const newId = generateStudentId();
                    setFormData(p => ({ ...p, student_id: newId }));
                    setIdStatus('idle'); setIdOwner(null);
                } else {
                    setIdStatus('available'); setIdOwner(null);
                    setErrors(p => ({ ...p, student_id: '' }));
                }
            } catch { setIdStatus('idle'); setIdOwner(null); }
        }, 500);
        return () => clearTimeout(debounceRef.current);
    }, [formData.student_id]);

    const inputCls = (field) => [
        'w-full px-4 py-2.5 rounded-xl text-sm text-white transition-all duration-200 focus:outline-none',
        errors[field] && touched[field]
            ? 'border border-red-500/50 focus:border-red-500'
            : 'border border-white/10 hover:border-white/20 focus:border-red-500/60',
    ].join(' ');

    const handleChange = (e) => {
        const { name, value } = e.target;
        const v = name === 'student_id' ? value.toUpperCase() : value;
        setFormData(p => ({ ...p, [name]: v }));
        setTouched(p => ({ ...p, [name]: true }));
        if (RULES[name]) setErrors(p => ({ ...p, [name]: RULES[name].validate(v) ? '' : RULES[name].message }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(p => ({ ...p, [name]: true }));
        if (RULES[name]) setErrors(p => ({ ...p, [name]: RULES[name].validate(value) ? '' : RULES[name].message }));
    };

    const validateAll = () => {
        const yearIntake = formData.intake_year && formData.intake_month ? `${formData.intake_year} ${formData.intake_month}` : '';
        const checks = { student_id: formData.student_id, full_name: formData.full_name, department: formData.department, year_intake: yearIntake, semester: formData.semester };
        const newErrors = {}, newTouched = {};
        let valid = true;
        Object.entries(checks).forEach(([k, v]) => {
            newTouched[k] = true;
            if (RULES[k] && !RULES[k].validate(v)) { newErrors[k] = RULES[k].message; valid = false; }
        });
        setErrors(newErrors); setTouched(newTouched);
        return valid;
    };

    const handleNext = () => {
        if (idStatus === 'taken') { toast.error(`ID already taken${idOwner?.full_name ? ` — ${idOwner.full_name}` : ''}.`, { icon: '🚫', duration: 6000 }); return; }
        if (idStatus === 'checking') { toast.error('Verifying Student ID...', { icon: '⏳' }); return; }
        if (!validateAll()) { toast.error('Please fix the errors before continuing.', { icon: '⚠️' }); return; }
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCapture = useCallback(async (imageDataUrl) => {
        setIsLoading(true);
        const yearIntake = `${formData.intake_year} ${formData.intake_month}`;
        try {
            toast.loading('🔍 Checking face uniqueness...', { id: 'reg' });
            const faceCheck = await checkFace(imageDataUrl);
            if (!faceCheck.success) {
                toast.dismiss('reg');
                toast.error(faceCheck.message || '❌ No face detected. Ensure your face is clearly visible.', { duration: 8000 });
                return;
            }
            if (faceCheck.exists === true) {
                toast.dismiss('reg');
                setDuplicateInfo({ existing_student: faceCheck.student?.full_name || 'Unknown', existing_id: faceCheck.student?.student_id || '—', similarity: faceCheck.confidence ?? '—' });
                setShowDuplicateAlert(true);
                toast.error(`🚫 Duplicate face! Already registered as ${faceCheck.student?.full_name || 'another student'}.`, { duration: 10000 });
                return;
            }
            toast.loading('⚙️ Registering student...', { id: 'reg' });
            const result = await registerStudent({ student_id: formData.student_id.trim(), full_name: formData.full_name.trim(), department: formData.department, year_intake: yearIntake, semester: Number(formData.semester), image: imageDataUrl });
            toast.dismiss('reg');
            if (result.duplicate_face === true) {
                const ex = result.existing_student || {};
                setDuplicateInfo({ existing_student: ex.full_name || 'Unknown', existing_id: ex.student_id || '—', similarity: ex.similarity ?? '—' });
                setShowDuplicateAlert(true);
                toast.error(result.message || '🚫 Duplicate face blocked.', { duration: 10000 });
                return;
            }
            if (!result.success) { toast.error(result.message || 'Registration failed.', { icon: '❌', duration: 6000 }); return; }
            setRegistered({ ...formData, year_intake: yearIntake });
            setStep(3);
            const conf = result.data?.confidence ? ` (${result.data.confidence}% confidence)` : '';
            toast.success(`✅ Registered successfully${conf}`, { duration: 5000 });
        } catch {
            toast.dismiss('reg');
            toast.error('Network error. Check if the PHP backend is running.', { duration: 6000 });
        } finally { setIsLoading(false); }
    }, [formData]);

    const handleReset = () => {
        setFormData({ student_id: generateStudentId(), full_name: '', department: '', intake_year: new Date().getFullYear().toString(), intake_month: 'January', semester: '' });
        setErrors({}); setTouched({}); setRegistered(null); setStep(1);
    };

    const cardStyle = { background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(59, 130, 246, 0.25)', boxShadow: '0 10px 35px rgba(0,0,0,0.5)' };
    const inputBg = { background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(59, 130, 246, 0.3)' };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
                @keyframes glow-pulse { 0%,100%{box-shadow:0 0 25px rgba(37,99,235,0.3)} 50%{box-shadow:0 0 50px rgba(16,185,129,0.5),0 0 70px rgba(37,99,235,0.3)} }
                select option { background-color: #0f172a !important; color: #fff !important; }
                select { color-scheme: dark; }
                input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #0f172a inset !important; -webkit-text-fill-color: #fff !important; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 14, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#fff', border: '1px solid rgba(59,130,246,0.3)' }
            }} />

            {/* ── Top School Banner ── */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-emerald-900 text-white text-[11px] py-1.5 px-4 text-center font-semibold tracking-wide border-b border-white/10 flex items-center justify-center gap-2">
                <span>🏛️</span>
                <span>Salvation Heritage Schools • Biometric Student Enrollment</span>
            </div>

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500">
                            SH
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-white text-base sm:text-lg truncate">Salvation Heritage</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Registration
                                </span>
                            </div>
                            <span className="hidden md:block text-slate-400 text-xs">Official Biometric Student Enrollment</span>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-1 flex-shrink-0 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                        <Link href="/" className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all no-underline flex items-center gap-1.5">
                            <span>📸</span>
                            <span>Attendance Kiosk</span>
                        </Link>
                        <Link href="/register" className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/25 no-underline flex items-center gap-1.5">
                            <span>📝</span>
                            <span>Register</span>
                        </Link>
                        <div className="h-4 w-px bg-slate-700 mx-1"></div>
                        <Link href="/dashboard" className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all no-underline flex items-center gap-1.5">
                            <span>📊</span>
                            <span>Admin Portal 🔒</span>
                        </Link>
                    </div>
                    <Link href="/" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                        <span>← Kiosk</span>
                    </Link>
                </div>
            </nav>

            {/* ── Blue-Emerald School Hero Section ── */}
            <div className="relative text-white overflow-hidden py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-[#042f2e] border-b border-blue-500/20">
                {/* Animated orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 bg-blue-500 blur-3xl animate-float" />
                    <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full opacity-20 bg-emerald-400 blur-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                    <div className="absolute -bottom-16 right-10 w-96 h-96 rounded-full opacity-25 bg-teal-500 blur-3xl" style={{ animation: 'float 12s ease-in-out infinite 1s' }} />
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '48px 48px'
                    }} />
                </div>

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        {/* Left */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-2.5 mb-4 flex-wrap" data-aos="fade-up" data-aos-delay="100">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-slate-950/60 border border-emerald-400/30 backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80" />
                                    <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Student Onboarding</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20">
                                    Salvation Heritage
                                </span>
                            </div>
                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-4xl sm:text-6xl lg:text-7xl text-white font-serif">Student</span>
                                <span className="block text-4xl sm:text-6xl lg:text-7xl bg-gradient-to-r from-blue-300 via-emerald-200 to-white bg-clip-text text-transparent">Enrollment</span>
                            </h1>
                            <p className="text-slate-200 text-base sm:text-lg max-w-xl leading-relaxed mb-6 font-medium" data-aos="fade-up" data-aos-delay="300">
                                Register your profile and biometric face token with Salvation Heritage security. Fast, contactless, and verified.
                            </p>
                            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="400">
                                {[{ icon: '🔐', t: 'Bank-Grade', d: 'Biometric AI' }, { icon: '⚡', t: 'Instant', d: '3 Simple Steps' }, { icon: '🛡️', t: 'Verified', d: 'Duplicate Guard' }].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-slate-950/60 border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-default">
                                        <span className="text-xl">{item.icon}</span>
                                        <div>
                                            <p className="text-white font-bold text-sm leading-none">{item.t}</p>
                                            <p className="text-emerald-300 text-xs font-medium mt-0.5">{item.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Visual */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[26rem]">
                                <div className="absolute -inset-4 rounded-3xl opacity-50 blur-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-400" />
                                <div className="relative rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-slate-900">
                                    <img src="/gily.jpg" alt="Salvation Heritage Student"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.05) contrast(1.05)', minHeight: '340px' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                    {['top-3 left-3 border-t-2 border-l-2 rounded-tl-lg','top-3 right-3 border-t-2 border-r-2 rounded-tr-lg','bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg','bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg'].map((cls, i) => (
                                        <div key={i} className={`absolute w-8 h-8 border-emerald-400/90 ${cls}`} />
                                    ))}
                                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-500 border border-white/60 shadow-lg shadow-emerald-500/40">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left Sidebar ── */}
                    <div className="lg:col-span-1 space-y-4" data-aos="fade-right">
                        {/* Step indicator */}
                        <div className="rounded-3xl p-6" style={cardStyle}>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Enrollment Progress</p>
                            <StepIndicator current={step} />
                        </div>

                        {/* Guidelines */}
                        <div className="rounded-3xl p-6" style={cardStyle}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white bg-gradient-to-r from-blue-600 to-emerald-600">
                                    SH
                                </div>
                                <p className="text-sm font-bold text-white">Guidelines</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ['Student ID', 'Auto-generated SAL-XXXX, unique per student.'],
                                    ['Full Name', 'Full legal student name.'],
                                    ['Class', 'Select current grade: JSS1 to SS3.'],
                                    ['Term', 'First, Second, or Third Term.'],
                                    ['One Face Policy', 'Each student can only register once.'],
                                ].map(([t, d]) => (
                                    <div key={t} className="flex gap-2.5 group">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-emerald-400 group-hover:scale-125 transition-transform shadow-sm shadow-emerald-400/80" />
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">{t}</p>
                                            <p className="text-xs text-slate-400 leading-relaxed">{d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Face tips — step 2 only */}
                        {step === 2 && (
                            <div className="rounded-3xl p-6 bg-emerald-950/30 border border-emerald-500/30">
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">📸 Biometric Tips</p>
                                <div className="space-y-2">
                                    {['Good lighting on face','Look directly at camera','Neutral expression','Remove heavy glasses or hat','Stay still during snapshot'].map(tip => (
                                        <div key={tip} className="flex gap-2">
                                            <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0">✓</span>
                                            <p className="text-xs text-emerald-200">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Form / Camera / Success ── */}
                    <div className="lg:col-span-2" data-aos="fade-left" data-aos-delay="200">
                        <div className="rounded-3xl overflow-hidden" style={cardStyle}>

                            {/* STEP 1 — Form */}
                            {step === 1 && (
                                <>
                                    <div className="px-6 sm:px-8 py-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
                                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 shadow-md shadow-blue-600/30">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Student Academic Information</p>
                                            <p className="text-xs text-slate-400">Salvation Heritage Student Roster</p>
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8 space-y-5">
                                        {/* Student ID — Auto-generated SAL-XXXX */}
                                        <InputField label="Student ID (Auto-Generated)" required error={touched.student_id && errors.student_id} hint={!errors.student_id ? RULES.student_id.hint : ''}>
                                            <div className="relative flex gap-2">
                                                <div className="flex-1 relative">
                                                    <input type="text" name="student_id" value={formData.student_id}
                                                        readOnly
                                                        className={`${inputCls('student_id')} pr-10 font-mono text-base tracking-widest cursor-default`}
                                                        style={{ ...inputBg, background: 'rgba(2, 6, 23, 0.5)' }} />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                                                        {idStatus === 'checking'  && <span className="text-slate-400 animate-spin inline-block">⟳</span>}
                                                        {idStatus === 'available' && <span className="text-emerald-400 font-bold">✓</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newId = generateStudentId();
                                                        setFormData(p => ({ ...p, student_id: newId }));
                                                        setIdStatus('idle');
                                                        toast.success(`New ID generated: ${newId}`, { icon: '🔄', duration: 2000 });
                                                    }}
                                                    className="px-3 py-2.5 rounded-xl text-xs font-bold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all flex-shrink-0 active:scale-95"
                                                    title="Generate new unique ID">
                                                    🔄 New
                                                </button>
                                            </div>
                                            {idStatus === 'available' && formData.student_id.length >= 3 && (
                                                <div className="mt-2 flex items-center gap-2 rounded-2xl px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30">
                                                    <span className="text-emerald-400 font-bold">✓</span>
                                                    <p className="text-xs font-semibold text-emerald-400">Student ID <span className="font-mono">{formData.student_id}</span> is unique and available</p>
                                                </div>
                                            )}
                                        </InputField>

                                        {/* Full Name */}
                                        <InputField label="Student Full Name" required error={touched.full_name && errors.full_name} hint={RULES.full_name.hint}>
                                            <input type="text" name="full_name" value={formData.full_name}
                                                onChange={handleChange} onBlur={handleBlur}
                                                placeholder="e.g. Samuel Adebayo"
                                                className={inputCls('full_name')} style={inputBg} />
                                        </InputField>

                                        {/* Class */}
                                        <InputField label="Class / Grade" required error={touched.department && errors.department}>
                                            <select name="department" value={formData.department}
                                                onChange={handleChange} onBlur={handleBlur}
                                                className={inputCls('department')} style={inputBg}>
                                                <option value="">— Select Class (JSS1 to SS3) —</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </InputField>

                                        {/* Term */}
                                        <InputField label="Academic Term" required error={touched.semester && errors.semester}>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {[
                                                    { value: 1, label: 'First Term' },
                                                    { value: 2, label: 'Second Term' },
                                                    { value: 3, label: 'Third Term' }
                                                ].map(t => (
                                                    <button key={t.value} type="button"
                                                        onClick={() => { setFormData(p => ({ ...p, semester: t.value })); setTouched(p => ({ ...p, semester: true })); setErrors(p => ({ ...p, semester: '' })); }}
                                                        className={`py-3 rounded-2xl text-xs font-black transition-all duration-150 hover:scale-105 active:scale-95 ${
                                                            Number(formData.semester) === t.value
                                                                ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-500/30'
                                                                : 'bg-slate-950/80 text-slate-400 border border-slate-700 hover:bg-slate-800'
                                                        }`}>
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {formData.semester && <p className="text-xs text-emerald-400 mt-1.5 font-medium">Selected: {formData.semester === 1 ? 'First Term' : formData.semester === 2 ? 'Second Term' : 'Third Term'}</p>}
                                        </InputField>

                                        {/* Preview */}
                                        {formData.student_id && formData.full_name && (
                                            <div className="rounded-2xl p-4 bg-blue-500/10 border border-blue-500/25">
                                                <p className="text-xs font-bold uppercase tracking-widest mb-2 text-blue-300">Enrollment Preview</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {[
                                                        ['Student ID', formData.student_id],
                                                        ['Full Name', formData.full_name],
                                                        ['Class', formData.department || '—'],
                                                        ['Term', formData.semester ? (formData.semester === 1 ? 'First Term' : formData.semester === 2 ? 'Second Term' : 'Third Term') : '—']
                                                    ].map(([k, v]) => (
                                                        <div key={k}>
                                                            <span className="text-slate-400">{k}: </span>
                                                            <span className="font-semibold text-white truncate">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button onClick={handleNext}
                                            className="w-full py-4 rounded-2xl text-white font-black text-sm bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all">
                                            Continue to Face Capture →
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* STEP 2 — Camera */}
                            {step === 2 && (
                                <>
                                    <div className="px-6 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/30">
                                                2
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">Biometric Face Enrollment</p>
                                                <p className="text-xs text-slate-400">Student: <span className="text-emerald-300 font-semibold">{formData.full_name}</span></p>
                                            </div>
                                        </div>
                                        <button onClick={() => setStep(1)}
                                            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
                                            ← Edit Details
                                        </button>
                                    </div>

                                    <div className="px-6 sm:px-8 mt-5 space-y-4">
                                        {/* Face reference */}
                                        <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center group bg-slate-950/80 border border-blue-500/20">
                                            <div className="w-full sm:w-24 flex-shrink-0 rounded-xl overflow-hidden border border-white/20">
                                                <img src="/face.jpg" alt="Reference Face"
                                                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                                                    style={{ filter: 'brightness(1.05) contrast(1.05)' }} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-widest mb-1 text-emerald-400">📸 Reference Standard</p>
                                                <p className="text-sm text-white font-bold mb-1">Center your face in good light</p>
                                                <p className="text-xs text-slate-400">Salvation Heritage AI scans facial landmarks for accurate attendance.</p>
                                            </div>
                                        </div>

                                        {/* Student summary */}
                                        <div className="rounded-2xl p-4 grid grid-cols-3 gap-3 text-xs bg-slate-950/60 border border-slate-800">
                                            {[
                                                ['Student ID', formData.student_id],
                                                ['Class', formData.department],
                                                ['Term', formData.semester === 1 ? 'First Term' : formData.semester === 2 ? 'Second Term' : 'Third Term']
                                            ].map(([k, v]) => (
                                                <div key={k}>
                                                    <p className="text-slate-400 font-medium">{k}</p>
                                                    <p className="font-bold text-white truncate">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8">
                                        <CameraCapture onCapture={handleCapture} isLoading={isLoading} onClose={() => setStep(1)} buttonText="Save Student & Face Biometrics" />
                                    </div>
                                </>
                            )}

                            {/* STEP 3 — Success */}
                            {step === 3 && registered && (
                                <div className="p-8 sm:p-12 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5 bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-2xl shadow-emerald-500/40 text-white font-black">
                                        ✓
                                    </div>
                                    <h2 className="text-2xl font-black text-white mb-1">Registration Complete!</h2>
                                    <p className="text-slate-400 text-sm mb-6">Student enrolled in Salvation Heritage attendance database.</p>

                                    <div className="w-full rounded-2xl p-5 mb-6 text-left bg-slate-950/80 border border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Enrolled Student Card</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                ['Full Name', registered.full_name],
                                                ['Student ID', registered.student_id],
                                                ['Class', registered.department],
                                                ['Term', registered.semester === 1 ? 'First Term' : registered.semester === 2 ? 'Second Term' : 'Third Term']
                                            ].map(([k, v]) => (
                                                <div key={k} className="rounded-xl p-3 bg-slate-900 border border-slate-800">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{k}</p>
                                                    <p className="text-sm font-bold text-white truncate">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                                        <button onClick={handleReset}
                                            className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition-all">
                                            + Register Another
                                        </button>
                                        <Link href="/"
                                            className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white text-center bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-lg shadow-blue-600/30 transition-all no-underline">
                                            Go to Attendance Kiosk →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <footer className="mt-12 py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-tr from-blue-700 to-emerald-500">
                            SH
                        </div>
                        <span className="font-semibold text-slate-300">Salvation Heritage Biometrics</span>
                    </div>
                    <span>All fields marked <span className="text-rose-400 font-bold">*</span> are required</span>
                    <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors no-underline">← Back to Kiosk</Link>
                </div>
            </footer>

            {/* ── Duplicate Alert Modal ── */}
            {showDuplicateAlert && duplicateInfo && (
                <DuplicateFaceAlert duplicateInfo={duplicateInfo} onClose={() => { setShowDuplicateAlert(false); setDuplicateInfo(null); }} />
            )}

            {/* Mobile Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 py-2 px-3 flex items-center justify-around shadow-2xl shadow-black">
                <Link href="/" className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-white no-underline">
                    <span className="text-xl">📸</span>
                    <span className="text-[10px] font-bold">Kiosk</span>
                </Link>
                <Link href="/register" className="flex flex-col items-center gap-1 py-1 px-3 text-emerald-400 font-black no-underline">
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
