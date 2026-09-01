'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function SimpleCameraPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState('');
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [facingMode, setFacingMode] = useState('user');

    const startCamera = useCallback(async (mode = facingMode) => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraOn(false);
        setError('');

        if (!navigator?.mediaDevices?.getUserMedia) {
            setError('Camera API is not supported in this browser environment or requires HTTPS on mobile.');
            return;
        }

        try {
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: mode } }
                });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch {}
            }
            setIsCameraOn(true);
            setError('');
        } catch (err) {
            let msg = 'Failed to access camera.';
            if (err.name === 'NotFoundError') msg = 'No camera found on this device. You can test using the Upload Photo option below.';
            else if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera permissions in your browser.';
            setError(msg);
            setIsCameraOn(false);
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera(facingMode);
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, [facingMode, startCamera]);

    const toggleFacingMode = () => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 sm:p-8" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">Camera Diagnostic Test</h1>
                    <Link href="/" className="text-xs text-red-400 hover:text-red-300 font-semibold">
                        ← Back to Home
                    </Link>
                </div>

                {/* Status */}
                <div className="mb-4 text-center">
                    {isCameraOn ? (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                            <span>✅</span> Camera is ON ({facingMode === 'user' ? 'Front Camera' : 'Rear Camera'})
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm font-medium">
                            <p>❌ {error}</p>
                            <button
                                onClick={() => startCamera(facingMode)}
                                className="mt-2 px-3 py-1 bg-red-900/40 border border-red-500/30 rounded-lg text-xs text-white hover:bg-red-800/60 transition-all"
                            >
                                🔄 Retry Camera
                            </button>
                        </div>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-sm font-medium">
                            ⏳ Starting camera...
                        </div>
                    )}
                </div>

                {/* Video container */}
                <div className="relative bg-gray-900 rounded-2xl overflow-hidden mb-4 border border-white/10 shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full aspect-video object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    {isCameraOn && (
                        <button
                            onClick={toggleFacingMode}
                            type="button"
                            className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-xl border border-white/20 hover:bg-black/80 transition-all"
                        >
                            🔄 Switch ({facingMode === 'user' ? 'Front' : 'Back'})
                        </button>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={capturePhoto}
                        disabled={!isCameraOn}
                        className={`py-3.5 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                            isCameraOn
                                ? 'bg-gradient-to-r from-[#C1121F] to-[#E63946] hover:opacity-95 active:scale-95'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                    >
                        <span>📸</span>
                        <span>Capture Photo</span>
                    </button>

                    <label className="py-3.5 rounded-xl font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer text-sm active:scale-95">
                        <span>📁</span>
                        <span>Upload Test Photo</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                    if (evt.target?.result) {
                                        setCapturedImage(evt.target.result);
                                    }
                                };
                                reader.readAsDataURL(file);
                            }}
                        />
                    </label>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Captured Image Result */}
                {capturedImage && (
                    <div className="p-5 rounded-2xl bg-gray-900 border border-white/10">
                        <h2 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Captured Photo Result:</h2>
                        <div className="rounded-xl overflow-hidden max-w-sm mx-auto border border-white/20">
                            <img src={capturedImage} alt="Captured" className="w-full object-cover" />
                        </div>
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => setCapturedImage(null)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all border border-white/10"
                            >
                                🔄 Retake
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

