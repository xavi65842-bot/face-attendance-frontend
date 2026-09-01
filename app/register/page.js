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

const RULES = {
    student_id: {
        validate: v => v.trim().length >= 3 && /^[A-Z0-9-]+$/i.test(v.trim()),
        message: 'Student ID must be at least 3 characters (letters, numbers, dashes).',
        hint: 'e.g. STU-1001',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #1a0a0a, #0f0f0f)', border: '1px solid rgba(193,18,31,0.5)', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(193,18,31,0.2)' }}>
                <div className="px-6 py-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(193,18,31,0.2), rgba(193,18,31,0.05))', borderBottom: '1px solid rgba(193,18,31,0.2)' }}>
                    <div className="text-5xl mb-3">🚫</div>
                    <h3 className="text-xl font-black text-white mb-1">Duplicate Face Detected!</h3>
                    <p className="text-red-400 text-sm">Security system blocked duplicate registration</p>
                </div>
                <div className="p-6">
                    <p className="text-gray-400 text-sm mb-4 text-center">This face is already registered to:</p>
                    <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'rgba(193,18,31,0.1)', border: '1px solid rgba(193,18,31,0.3)' }}>
                        <p className="font-black text-white text-lg">{duplicateInfo.existing_student}</p>
                        <p className="text-sm text-gray-400 font-mono mt-1">ID: {duplicateInfo.existing_id}</p>
                        <p className="text-sm font-bold mt-2" style={{ color: '#ff6b6b' }}>
                            Similarity: {duplicateInfo.similarity}%
                        </p>
                    </div>
                    <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <p className="text-xs text-amber-300 text-center">
                            Each person can only register once. Amazon Rekognition detected this face matches an existing registration.
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="w-full py-3 rounded-xl font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 20px rgba(193,18,31,0.4)' }}>
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
            <span className="text-red-400 text-xs mt-0.5">⚠</span>
            <p className="text-red-400 text-xs font-medium">{msg}</p>
        </div>
    );
}

function FieldHint({ text }) {
    if (!text) return null;
    return <p className="text-gray-500 text-xs mt-1">{text}</p>;
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
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300"
                                style={done
                                    ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', boxShadow: '0 0 12px rgba(34,197,94,0.5)' }
                                    : active
                                    ? { background: 'linear-gradient(135deg, #C1121F, #e63946)', color: '#fff', boxShadow: '0 0 16px rgba(193,18,31,0.6)' }
                                    : { background: 'rgba(255,255,255,0.08)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {done ? '✓' : s.n}
                            </div>
                            <span className="text-[10px] font-semibold whitespace-nowrap"
                                style={{ color: active ? '#ff6b6b' : done ? '#22c55e' : '#6b7280' }}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className="w-12 h-px mx-2 mb-5 transition-all duration-500"
                                style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
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
    const [formData, setFormData] = useState({ student_id: '', full_name: '', department: '', intake_year: new Date().getFullYear().toString(), intake_month: 'January', semester: '' });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [registered, setRegistered] = useState(null);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [idStatus, setIdStatus] = useState('idle');
    const [idOwner, setIdOwner] = useState(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        const id = formData.student_id.trim().toUpperCase();
        if (id.length < 3) { setIdStatus('idle'); setIdOwner(null); return; }
        setIdStatus('checking');
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await checkStudentId(id);
                if (res.exists) {
                    setIdStatus('taken'); setIdOwner(res.student || null);
                    setErrors(p => ({ ...p, student_id: res.message || 'This Student ID is already registered.' }));
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
        setFormData({ student_id: '', full_name: '', department: '', intake_year: new Date().getFullYear().toString(), intake_month: 'January', semester: '' });
        setErrors({}); setTouched({}); setRegistered(null); setStep(1);
    };

    const cardStyle = { background: 'linear-gradient(145deg, #111111, #0f0f0f)', border: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' };
    const inputBg = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0a', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <AOSInit />
            <style>{`
                @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
                @keyframes glow-pulse { 0%,100%{box-shadow:0 0 20px rgba(193,18,31,0.4)} 50%{box-shadow:0 0 40px rgba(193,18,31,0.8),0 0 60px rgba(193,18,31,0.3)} }
                @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
                select option { background-color: #1a0a0a !important; color: #fff !important; }
                select { color-scheme: dark; }
                input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #111 inset !important; -webkit-text-fill-color: #fff !important; }
            `}</style>

            <Toaster position="top-center" toastOptions={{
                style: { borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#1a0a0a', color: '#fff', border: '1px solid rgba(193,18,31,0.3)' }
            }} />

            {/* ── Navbar ── */}
            <nav className="sticky top-0 z-50 w-full" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(193,18,31,0.2)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
                <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 16px rgba(193,18,31,0.5)' }}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm sm:text-base truncate">Face Attendance</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }}>by BENX</span>
                            </div>
                            <span className="hidden md:block text-gray-500 text-xs">Student Registration Portal</span>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                        {[['/', 'Home'], ['/dashboard', 'Dashboard'], ['/register', 'Register', true], ['/students', 'Students'], ['/lecturer', 'Lecturer']].map(([href, label, active]) => (
                            <Link key={href} href={href}
                                className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
                                style={active ? { background: 'rgba(193,18,31,0.2)', color: '#ff6b6b', border: '1px solid rgba(193,18,31,0.4)' } : { color: '#9ca3af' }}>
                                {label}
                            </Link>
                        ))}
                    </div>
                    <Link href="/" className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg flex-shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </div>
            </nav>

            {/* ── RED Hero Section ── */}
            <div className="relative text-white overflow-hidden py-14 sm:py-20 px-4 sm:px-6"
                style={{ background: 'linear-gradient(135deg, #6b0000 0%, #9b0d18 25%, #C1121F 55%, #e63946 80%, #ff6b6b 100%)' }}>
                {/* Animated circles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #ff0000, transparent)', animation: 'float 8s ease-in-out infinite' }} />
                    <div className="absolute top-10 right-1/3 w-64 h-64 rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, #ff4444, transparent)', animation: 'float 10s ease-in-out infinite 2s' }} />
                    <div className="absolute -bottom-10 right-10 w-96 h-96 rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, #c0392b, transparent)', animation: 'float 12s ease-in-out infinite 1s' }} />
                    <div className="absolute inset-0 opacity-5" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        {/* Left */}
                        <div className="flex-1 min-w-0" data-aos="fade-right">
                            <div className="flex items-center gap-3 mb-5 flex-wrap" data-aos="fade-up" data-aos-delay="100">
                                <div className="flex items-center gap-2 rounded-full px-4 py-1.5"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 6px #4ade80' }} />
                                    <span className="text-white text-xs font-semibold uppercase tracking-widest">Registration Portal</span>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                                    by BENX
                                </span>
                            </div>
                            <h1 className="font-black tracking-tight leading-none mb-4" data-aos="fade-up" data-aos-delay="200">
                                <span className="block text-5xl sm:text-6xl lg:text-7xl text-white">Student</span>
                                <span className="block text-5xl sm:text-6xl lg:text-7xl" style={{ color: 'rgba(255,200,200,0.9)' }}>Registration</span>
                            </h1>
                            <p className="text-red-100 text-base sm:text-lg max-w-xl leading-relaxed mb-8" data-aos="fade-up" data-aos-delay="300">
                                Complete your enrollment with advanced facial recognition. Secure, fast, and reliable — powered by Amazon Rekognition.
                            </p>
                            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="400">
                                {[{ icon: '🔐', t: 'Secure', d: 'Amazon Rekognition' }, { icon: '⚡', t: 'Fast', d: '3 Simple Steps' }, { icon: '✅', t: 'Verified', d: 'Duplicate Prevention' }].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-105 cursor-default"
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                                        <span className="text-xl">{item.icon}</span>
                                        <div>
                                            <p className="text-white font-bold text-sm leading-none">{item.t}</p>
                                            <p className="text-red-200 text-xs">{item.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — face.jpg - BIGGER & RESPONSIVE */}
                        <div className="flex-shrink-0 flex items-center justify-center lg:justify-end" data-aos="fade-left" data-aos-delay="200">
                            <div className="relative group w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
                                <div className="absolute -inset-4 rounded-3xl opacity-60 blur-2xl"
                                    style={{ background: 'radial-gradient(circle, rgba(193,18,31,0.6), transparent)', animation: 'glow-pulse 3s ease-in-out infinite' }} />
                                <div className="relative rounded-3xl overflow-hidden"
                                    style={{ border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                                    <img src="/gily.jpg" alt="Face Recognition"
                                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                                        style={{ filter: 'brightness(1.1) contrast(1.05) saturate(1.1)', minHeight: '400px' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    {['top-3 left-3 border-t-2 border-l-2 rounded-tl-lg','top-3 right-3 border-t-2 border-r-2 rounded-tr-lg','bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg','bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg'].map((cls, i) => (
                                        <div key={i} className={`absolute w-8 h-8 border-white/70 ${cls}`} />
                                    ))}
                                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 15px rgba(34,197,94,0.6)' }}>
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left Sidebar ── */}
                    <div className="lg:col-span-1 space-y-4" data-aos="fade-right">
                        {/* Step indicator */}
                        <div className="rounded-2xl p-5" style={cardStyle}>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Progress</p>
                            <StepIndicator current={step} />
                        </div>

                        {/* Guidelines */}
                        <div className="rounded-2xl p-5" style={cardStyle}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                                    style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)' }}>📋</div>
                                <p className="text-sm font-bold text-white">Guidelines</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ['Student ID', 'Official Student ID, minimum 3 characters.'],
                                    ['Full Name', 'Student\'s full name.'],
                                    ['Class', 'School class from JSS1 to SS3.'],
                                    ['Term', 'Active school term (First, Second, or Third Term).'],
                                    ['One Face Policy', 'Each face can only register once. Duplicates are blocked automatically.'],
                                ].map(([t, d]) => (
                                    <div key={t} className="flex gap-2.5 group">
                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 group-hover:scale-125 transition-transform"
                                            style={{ background: '#C1121F', boxShadow: '0 0 4px rgba(193,18,31,0.6)' }} />
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">{t}</p>
                                            <p className="text-xs text-gray-500 leading-relaxed">{d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Face tips — step 2 only */}
                        {step === 2 && (
                            <div className="rounded-2xl p-5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">📸 Capture Tips</p>
                                <div className="space-y-2">
                                    {['Good lighting on your face','Look directly at the camera','Keep a neutral expression','Remove hats or glasses','Stay still during countdown'].map(tip => (
                                        <div key={tip} className="flex gap-2">
                                            <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">✓</span>
                                            <p className="text-xs text-amber-200">{tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Form / Camera / Success ── */}
                    <div className="lg:col-span-2" data-aos="fade-left" data-aos-delay="200">
                        <div className="rounded-2xl overflow-hidden" style={cardStyle}>

                            {/* STEP 1 — Form */}
                            {step === 1 && (
                                <>
                                    <div className="px-5 sm:px-7 py-4 flex items-center gap-3"
                                        style={{ borderBottom: '1px solid rgba(193,18,31,0.15)', background: 'rgba(193,18,31,0.05)' }}>
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 12px rgba(193,18,31,0.5)' }}>1</div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Student Details</p>
                                            <p className="text-xs text-gray-500">Fill in all required fields accurately</p>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-7 space-y-5">
                                        {/* Student ID */}
                                        <InputField label="Student ID" required error={touched.student_id && errors.student_id} hint={!errors.student_id ? RULES.student_id.hint : ''}>
                                            <div className="relative">
                                                <input type="text" name="student_id" value={formData.student_id}
                                                    onChange={handleChange} onBlur={handleBlur}
                                                    placeholder="e.g. STU-1001"
                                                    className={`${inputCls('student_id')} pr-10`}
                                                    style={inputBg} />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                                                    {idStatus === 'checking'  && <span className="text-gray-400 animate-spin inline-block">⟳</span>}
                                                    {idStatus === 'available' && <span style={{ color: '#22c55e' }}>✓</span>}
                                                    {idStatus === 'taken'     && <span style={{ color: '#ff6b6b' }}>✕</span>}
                                                </div>
                                            </div>
                                            {idStatus === 'taken' && (
                                                <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5"
                                                    style={{ background: 'rgba(193,18,31,0.1)', border: '1px solid rgba(193,18,31,0.3)' }}>
                                                    <span className="text-red-400 flex-shrink-0">🚫</span>
                                                    <div>
                                                        <p className="text-red-400 text-xs font-bold">Student ID Already Registered</p>
                                                        {idOwner?.full_name && <p className="text-red-500 text-xs mt-0.5">Belongs to <span className="font-semibold">{idOwner.full_name}</span>{idOwner.department && ` (${idOwner.department})`}.</p>}
                                                    </div>
                                                </div>
                                            )}
                                            {idStatus === 'available' && formData.student_id.length >= 3 && (
                                                <div className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
                                                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                                                    <span style={{ color: '#22c55e' }}>✓</span>
                                                    <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>Student ID is available</p>
                                                </div>
                                            )}
                                        </InputField>

                                        {/* Full Name */}
                                        <InputField label="Full Name" required error={touched.full_name && errors.full_name} hint={RULES.full_name.hint}>
                                            <input type="text" name="full_name" value={formData.full_name}
                                                onChange={handleChange} onBlur={handleBlur}
                                                placeholder="e.g. John Doe"
                                                className={inputCls('full_name')} style={inputBg} />
                                        </InputField>

                                        {/* Class (Department in DB) */}
                                        <InputField label="Class" required error={touched.department && errors.department}>
                                            <select name="department" value={formData.department}
                                                onChange={handleChange} onBlur={handleBlur}
                                                className={inputCls('department')} style={inputBg}>
                                                <option value="">— Select Class —</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </InputField>

                                        {/* Term (Semester in DB) */}
                                        <InputField label="Current Term" required error={touched.semester && errors.semester}>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { value: 1, label: 'First Term' },
                                                    { value: 2, label: 'Second Term' },
                                                    { value: 3, label: 'Third Term' }
                                                ].map(t => (
                                                    <button key={t.value} type="button"
                                                        onClick={() => { setFormData(p => ({ ...p, semester: t.value })); setTouched(p => ({ ...p, semester: true })); setErrors(p => ({ ...p, semester: '' })); }}
                                                        className="py-2.5 rounded-xl text-xs font-black transition-all duration-150 hover:scale-105 active:scale-95"
                                                        style={Number(formData.semester) === t.value
                                                            ? { background: 'linear-gradient(135deg, #C1121F, #e63946)', color: '#fff', boxShadow: '0 0 12px rgba(193,18,31,0.5)' }
                                                            : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {formData.semester && <p className="text-xs text-gray-500 mt-1.5">Selected: {formData.semester === 1 ? 'First Term' : formData.semester === 2 ? 'Second Term' : 'Third Term'}</p>}
                                        </InputField>

                                        {/* Preview */}
                                        {formData.student_id && formData.full_name && (
                                            <div className="rounded-xl p-4" style={{ background: 'rgba(193,18,31,0.08)', border: '1px solid rgba(193,18,31,0.2)' }}>
                                                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#ff6b6b' }}>Preview</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {[
                                                        ['ID', formData.student_id],
                                                        ['Name', formData.full_name],
                                                        ['Class', formData.department || '—'],
                                                        ['Term', formData.semester ? (formData.semester === 1 ? 'First Term' : formData.semester === 2 ? 'Second Term' : 'Third Term') : '—']
                                                    ].map(([k, v]) => (
                                                        <div key={k}>
                                                            <span className="text-gray-500">{k}: </span>
                                                            <span className="font-semibold text-white truncate">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button onClick={handleNext}
                                            className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 20px rgba(193,18,31,0.4)' }}>
                                            Continue to Face Capture →
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* STEP 2 — Camera */}
                            {step === 2 && (
                                <>
                                    <div className="px-5 sm:px-7 py-4 flex items-center justify-between"
                                        style={{ borderBottom: '1px solid rgba(193,18,31,0.15)', background: 'rgba(193,18,31,0.05)' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 12px rgba(193,18,31,0.5)' }}>2</div>
                                            <div>
                                                <p className="font-bold text-white text-sm">Face Capture</p>
                                                <p className="text-xs text-gray-500">Registering: <span className="text-gray-300 font-semibold">{formData.full_name}</span></p>
                                            </div>
                                        </div>
                                        <button onClick={() => setStep(1)}
                                            className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
                                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                            ← Edit
                                        </button>
                                    </div>

                                    <div className="px-5 sm:px-7 mt-5 space-y-4">
                                        {/* Face reference */}
                                        <div className="rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center group"
                                            style={{ background: 'rgba(193,18,31,0.08)', border: '1px solid rgba(193,18,31,0.2)' }}>
                                            <div className="w-full sm:w-24 flex-shrink-0 rounded-lg overflow-hidden"
                                                style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                                                <img src="/face.jpg" alt="Reference"
                                                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                                                    style={{ filter: 'brightness(1.1) contrast(1.1)' }} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ff6b6b' }}>📸 Face Reference</p>
                                                <p className="text-sm text-white font-semibold mb-1">Match your face to this reference</p>
                                                <p className="text-xs text-gray-500">Good lighting, face centered, neutral expression.</p>
                                            </div>
                                        </div>

                                        {/* Student summary */}
                                        <div className="rounded-xl p-4 grid grid-cols-3 gap-3 text-xs"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            {[
                                                ['Student ID', formData.student_id],
                                                ['Class', formData.department],
                                                ['Term', formData.semester === 1 ? 'First Term' : formData.semester === 2 ? 'Second Term' : 'Third Term']
                                            ].map(([k, v]) => (
                                                <div key={k}>
                                                    <p className="text-gray-500 font-medium">{k}</p>
                                                    <p className="font-bold text-white truncate">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-7">
                                        <CameraCapture onCapture={handleCapture} isLoading={isLoading} onClose={() => setStep(1)} buttonText="Register Student" />
                                    </div>
                                </>
                            )}

                            {/* STEP 3 — Success */}
                            {step === 3 && registered && (
                                <div className="p-8 sm:p-10 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5"
                                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 30px rgba(34,197,94,0.5)' }}>✓</div>
                                    <h2 className="text-2xl font-black text-white mb-1">Registration Successful!</h2>
                                    <p className="text-gray-500 text-sm mb-6">Student enrolled in the attendance system.</p>

                                    <div className="w-full rounded-xl p-5 mb-6 text-left"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Registered Details</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                ['Full Name', registered.full_name],
                                                ['Student ID', registered.student_id],
                                                ['Class', registered.department],
                                                ['Term', registered.semester === 1 ? 'First Term' : registered.semester === 2 ? 'Second Term' : 'Third Term']
                                            ].map(([k, v]) => (
                                                <div key={k} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{k}</p>
                                                    <p className="text-sm font-semibold text-white truncate">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                                        <button onClick={handleReset}
                                            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                                            style={{ border: '1px solid rgba(193,18,31,0.4)', color: '#ff6b6b', background: 'rgba(193,18,31,0.1)' }}>
                                            Register Another
                                        </button>
                                        <Link href="/dashboard"
                                            className="flex-1 py-3 rounded-xl font-bold text-sm text-white text-center transition-all hover:scale-[1.02]"
                                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)', boxShadow: '0 0 16px rgba(193,18,31,0.4)' }}>
                                            View Dashboard
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <footer className="mt-8 py-4" style={{ borderTop: '1px solid rgba(193,18,31,0.15)', background: 'rgba(0,0,0,0.5)' }}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ background: 'linear-gradient(135deg, #C1121F, #e63946)' }}>FA</div>
                        <span className="font-medium text-gray-500">FaceAttend by BENX</span>
                    </div>
                    <span>All fields marked <span style={{ color: '#ff6b6b' }} className="font-bold">*</span> are required</span>
                    <Link href="/" className="hover:text-red-400 transition-colors">← Back to Home</Link>
                </div>
            </footer>

            {/* ── Duplicate Alert Modal ── */}
            {showDuplicateAlert && duplicateInfo && (
                <DuplicateFaceAlert duplicateInfo={duplicateInfo} onClose={() => { setShowDuplicateAlert(false); setDuplicateInfo(null); }} />
            )}
        </div>
    );
}
