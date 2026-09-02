'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export default function CameraCapture({
    onCapture,
    onClose,
    isLoading = false,
    buttonText = 'Capture & Submit'
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [error, setError] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [uploadedPreview, setUploadedPreview] = useState(null);
    const [isInsecureOrigin, setIsInsecureOrigin] = useState(false);

    // Check device environment (insecure context on mobile LAN, multiple cameras)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const isSecure = window.isSecureContext || window.location.protocol === 'https:' || isLocal;
            if (!isSecure) {
                setIsInsecureOrigin(true);
            }
        }

        const checkDevices = async () => {
            try {
                if (navigator?.mediaDevices?.enumerateDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoInputs = devices.filter(d => d.kind === 'videoinput');
                    if (videoInputs.length > 1) {
                        setHasMultipleCameras(true);
                    }
                }
            } catch {
                // Ignore enumeration errors
            }
        };
        checkDevices();
    }, []);

    // Start camera stream with constraint fallback
    const initCamera = useCallback(async (targetFacingMode = facingMode) => {
        // Stop any existing stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
        setError(null);

        if (!navigator?.mediaDevices?.getUserMedia) {
            let msg = 'Camera API is not available in this browser environment.';
            if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                msg = 'Mobile browsers block webcam over non-HTTPS local IP. Use "Upload Photo" or "Simulate Test Face" below, or test via localhost / HTTPS.';
            }
            setError(msg);
            return;
        }

        try {
            let mediaStream = null;
            // Primary attempt with desired facingMode and ideal resolution
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: targetFacingMode },
                        width: { ideal: 1280, min: 480 },
                        height: { ideal: 720, min: 360 },
                    },
                    audio: false,
                });
            } catch (constraintErr) {
                // Fallback attempt with minimal constraints (compatible with older mobile phones / webcams)
                console.warn('Ideal constraints failed, falling back to basic video constraint:', constraintErr);
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
            }

            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                try {
                    await videoRef.current.play();
                } catch (playErr) {
                    console.warn('Video play catch:', playErr);
                }
            }
            setIsCameraReady(true);
            setError(null);
        } catch (err) {
            console.error('Camera access error:', err);
            let errorMessage = 'Unable to access camera. ';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Camera permission denied. Please allow camera permissions in your browser bar and reload.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found on this device. You can use "Upload Photo" or "Simulate Test Face" below, or open this page on your phone.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = 'Camera is currently in use by another application. Please close other camera apps and retry.';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage = 'Camera does not satisfy required settings. Retrying basic mode...';
            } else {
                errorMessage += err.message || 'Please check device permissions.';
            }
            setError(errorMessage);
            setIsCameraReady(false);
        }
    }, [facingMode]);

    // Start camera on mount or facingMode change
    useEffect(() => {
        let mounted = true;
        if (mounted) {
            initCamera(facingMode);
        }
        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setIsCameraReady(false);
        };
    }, [facingMode, initCamera]);

    // Switch between front and back camera (for mobile phones)
    const toggleCamera = () => {
        setUploadedPreview(null);
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
    };

    // Capture image from video stream and send to onCapture
    const capture = useCallback(async () => {
        if (uploadedPreview) {
            onCapture(uploadedPreview);
            return;
        }

        if (!videoRef.current || !canvasRef.current || !isCameraReady || isLoading) return;

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            const width = video.videoWidth || 640;
            const height = video.videoHeight || 480;

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Unable to get canvas context');
            }

            // Mirror image if using front camera
            if (facingMode === 'user') {
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
            }

            ctx.drawImage(video, 0, 0, width, height);

            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
            if (!imageDataUrl || imageDataUrl === 'data:,') {
                throw new Error('Failed to capture valid image');
            }

            onCapture(imageDataUrl);
        } catch (captureErr) {
            console.error('Image capture error:', captureErr);
            setError(`Capture failed: ${captureErr.message}`);
        }
    }, [isCameraReady, isLoading, onCapture, uploadedPreview, facingMode]);

    // Countdown effect
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            capture();
            setCountdown(null);
            return;
        }
        const timer = setTimeout(() => setCountdown(prev => (prev ? prev - 1 : null)), 1000);
        return () => clearTimeout(timer);
    }, [countdown, capture]);

    const startCountdown = useCallback(() => {
        if (uploadedPreview) {
            capture();
            return;
        }
        if (isCameraReady && !isLoading) {
            setCountdown(3);
        }
    }, [isCameraReady, isLoading, uploadedPreview, capture]);

    // Simulate test face for PC testing without camera
    const handleSimulateFace = () => {
        try {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 480;
            testCanvas.height = 480;
            const ctx = testCanvas.getContext('2d');
            if (!ctx) return;

            // Gradient background
            const grad = ctx.createLinearGradient(0, 0, 480, 480);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#064e3b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 480, 480);

            // Head silhouette
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(240, 200, 90, 0, Math.PI * 2);
            ctx.fill();

            // Shoulders silhouette (school uniform blue)
            ctx.fillStyle = '#1d4ed8';
            ctx.beginPath();
            ctx.arc(240, 420, 150, Math.PI, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(205, 185, 12, 0, Math.PI * 2);
            ctx.arc(275, 185, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(205, 185, 6, 0, Math.PI * 2);
            ctx.arc(275, 185, 6, 0, Math.PI * 2);
            ctx.fill();

            // Smile
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(240, 220, 35, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();

            // Watermark text
            ctx.fillStyle = '#a7f3d0';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Salvation Heritage Demo Face', 240, 460);

            const testDataUrl = testCanvas.toDataURL('image/jpeg', 0.9);
            setUploadedPreview(testDataUrl);
        } catch (e) {
            console.error('Failed to generate simulate test face:', e);
        }
    };

    return (
        <div className="relative w-full max-w-md mx-auto">
            <canvas ref={canvasRef} className="hidden" />

            {/* Insecure Origin notice for Mobile LAN testing */}
            {isInsecureOrigin && (
                <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                        <span>📱</span> Mobile Network Note
                    </p>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                        Mobile browsers require HTTPS for camera hardware. You can use <strong>Upload Photo</strong> or <strong>Demo Face</strong> below, or test via localhost.
                    </p>
                </div>
            )}

            {/* Camera / Preview container */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-blue-500/20">
                {uploadedPreview ? (
                    <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center">
                        <img
                            src={uploadedPreview}
                            alt="Selected preview"
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute top-3 left-3 bg-blue-900/80 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-400/30">
                            🖼️ PHOTO READY
                        </div>
                        <button
                            onClick={() => setUploadedPreview(null)}
                            className="absolute top-3 right-3 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl transition-all"
                        >
                            ✕ Clear
                        </button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full aspect-video object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                        onLoadedMetadata={() => {
                            if (videoRef.current) {
                                videoRef.current.play().catch(() => {});
                            }
                        }}
                    />
                )}

                {/* Face positioning guide overlay */}
                {isCameraReady && !isLoading && countdown === null && !uploadedPreview && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl border-2 border-dashed border-emerald-400/80 animate-pulse flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <span className="bg-slate-900/80 backdrop-blur text-emerald-300 text-[11px] px-3.5 py-1 rounded-full border border-emerald-500/30 font-semibold">
                                Align Face in Box
                            </span>
                        </div>
                    </div>
                )}

                {/* Flip camera button */}
                {!uploadedPreview && (hasMultipleCameras || isCameraReady) && (
                    <button
                        onClick={toggleCamera}
                        type="button"
                        title="Flip Camera (Front / Rear)"
                        className="absolute top-3 right-3 bg-slate-900/70 backdrop-blur hover:bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    >
                        <span>🔄</span>
                        <span className="text-[10px] font-semibold">{facingMode === 'user' ? 'Front' : 'Back'}</span>
                    </button>
                )}

                {/* Processing overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center backdrop-blur-sm z-20">
                        <div className="text-center px-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-3" />
                            <p className="text-white text-sm font-semibold">
                                Verifying Attendance Biometrics...
                            </p>
                            <p className="text-emerald-400 text-xs mt-1">Salvation Heritage System</p>
                        </div>
                    </div>
                )}

                {/* Countdown overlay */}
                {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-20">
                        <div className="text-8xl font-black text-white animate-ping drop-shadow-2xl">{countdown}</div>
                    </div>
                )}

                {/* Camera starting overlay */}
                {!isCameraReady && !error && !uploadedPreview && (
                    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2" />
                            <p className="text-white text-xs font-medium">Starting camera...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error or No Camera Fallback box */}
            {error && !uploadedPreview && (
                <div className="mt-3 p-4 bg-slate-900/90 border border-blue-500/30 rounded-2xl text-center">
                    <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                        ℹ️ {error}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        <button
                            type="button"
                            onClick={() => initCamera(facingMode)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-900/40 text-blue-200 hover:bg-blue-800/60 transition-all border border-blue-500/30"
                        >
                            🔄 Retry Camera
                        </button>
                        <button
                            type="button"
                            onClick={handleSimulateFace}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-900/40 text-emerald-200 hover:bg-emerald-800/60 transition-all border border-emerald-500/30"
                        >
                            ⚡ Simulate Test Face (No Camera)
                        </button>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2.5 justify-center">
                {/* Main Capture / Submit button */}
                <button
                    onClick={startCountdown}
                    disabled={(!isCameraReady && !uploadedPreview) || isLoading}
                    className={`
                        px-6 py-3 rounded-2xl font-bold text-white transition-all duration-200
                        flex items-center gap-2 shadow-lg text-xs sm:text-sm
                        ${(!isCameraReady && !uploadedPreview) || isLoading
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-blue-700 via-blue-600 to-emerald-600 hover:from-blue-600 hover:to-emerald-500 active:scale-95 shadow-blue-600/25'
                        }
                    `}
                >
                    <span className="text-base">{uploadedPreview ? '🚀' : '📸'}</span>
                    <span>{isLoading ? 'Verifying...' : (uploadedPreview ? 'Submit Selected Photo' : buttonText)}</span>
                </button>

                {/* File Upload Fallback Option */}
                <label className={`
                    px-4 py-3 rounded-2xl font-semibold text-white cursor-pointer transition-all duration-200
                    flex items-center gap-2 shadow-lg text-xs sm:text-sm border border-slate-700 bg-slate-900 hover:bg-slate-800 active:scale-95
                    ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                `}>
                    <span className="text-base">📁</span>
                    <span>Upload Photo</span>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const dataUrl = event.target?.result;
                                if (dataUrl) {
                                    setUploadedPreview(dataUrl);
                                    setError(null);
                                }
                            };
                            reader.readAsDataURL(file);
                        }}
                    />
                </label>

                {/* Simulate Face Button */}
                <button
                    type="button"
                    onClick={handleSimulateFace}
                    disabled={isLoading}
                    title="Simulate a test student face without a camera"
                    className="px-3.5 py-3 rounded-2xl font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 transition-all text-xs border border-slate-700 flex items-center gap-1.5"
                >
                    <span>⚡</span>
                    <span>Demo Face</span>
                </button>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-3.5 py-3 rounded-2xl font-semibold bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs border border-slate-700"
                    >
                        ✕ Cancel
                    </button>
                )}
            </div>

            {/* Status footer */}
            <div className="mt-3 text-center">
                <p className="text-[11px] text-slate-400">
                    🎓 Salvation Heritage Attendance Kiosk • Instant Biometric Verification
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                    {uploadedPreview
                        ? '🖼️ Photo ready — click Submit above'
                        : isCameraReady
                        ? `✅ Camera Active (${facingMode === 'user' ? 'Front' : 'Back'})`
                        : '⏳ Ready for face scan, upload, or demo'}
                </p>
            </div>
        </div>
    );
}

