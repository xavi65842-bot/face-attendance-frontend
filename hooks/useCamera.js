'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export function useCamera({ onCapture, autoCapture = false } = {}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null); // use ref, not state — avoids re-render loop
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [error, setError] = useState(null);
    const [countdown, setCountdown] = useState(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
    }, []); // no deps — stable reference

    const startCamera = useCallback(async (facingMode = 'user') => {
        // Stop any existing stream first
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
        setError(null);

        if (!navigator?.mediaDevices?.getUserMedia) {
            setError('Camera API is not supported in this browser or requires HTTPS.');
            return;
        }

        try {
            let mediaStream = null;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: facingMode }, width: { ideal: 1280, min: 480 }, height: { ideal: 720, min: 360 } },
                    audio: false,
                });
            } catch {
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
                } catch {}
            }
            setIsCameraReady(true);
            setError(null);
        } catch (err) {
            let msg = 'Unable to access camera.';
            if (err.name === 'NotFoundError') msg = 'No camera found on this device.';
            else if (err.name === 'NotAllowedError') msg = 'Camera permission denied.';
            setError(msg);
            console.error('Camera error:', err);
        }
    }, []);

    const capture = useCallback(() => {
        if (videoRef.current && canvasRef.current && isCameraReady) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                if (onCapture) onCapture(imageData);
                return imageData;
            }
        }
        return null;
    }, [isCameraReady, onCapture]);

    const startCountdown = useCallback(() => {
        setCountdown(3);
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    capture();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, [capture]);

    // Auto capture once camera is ready
    useEffect(() => {
        if (autoCapture && isCameraReady) {
            startCountdown();
        }
    }, [autoCapture, isCameraReady, startCountdown]);

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []); // empty deps — runs once on unmount

    return {
        videoRef,
        canvasRef,
        isCameraReady,
        error,
        countdown,
        startCamera,
        stopCamera,
        capture,
        startCountdown,
    };
}
