'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { testConnection, getStudents, recognizeFace, getStats } from '@/lib/api';
import CameraCapture from '@/components/CameraCapture';
import toast, { Toaster } from 'react-hot-toast';

export default function TestAPIPage() {
    const isMounted = useRef(true);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    const [lastAttendance, setLastAttendance] = useState(null);
    const [stats, setStats] = useState(null);
    const [showCamera, setShowCamera] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const fetchStats = useCallback(async () => {
        const data = await getStats();
        if (isMounted.current) setStats(data);
    }, []);

    // ── Simple API tests ──────────────────────────────────────────────

    const testPHP = async () => {
        setLoading(true);
        try {
            const data = await testConnection();
            setResult(data);
        } catch (error) {
            setResult({ error: error.message });
        }
        setLoading(false);
    };

    const testGetStudents = async () => {
        setLoading(true);
        try {
            const data = await getStudents();
            setResult(data);
        } catch (error) {
            setResult({ error: error.message });
        }
        setLoading(false);
    };

    const testSendImage = async () => {
        setLoading(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#000';
            ctx.font = '16px Arial';
            ctx.fillText('Test', 80, 100);
            const imageData = canvas.toDataURL();
            const data = await recognizeFace(imageData);
            setResult(data);
        } catch (error) {
            setResult({ error: error.message });
        }
        setLoading(false);
    };

    // ── Live face recognition capture ─────────────────────────────────

    const handleCapture = useCallback(async (imageData) => {
        if (!isMounted.current) return;
        setIsLoading(true);
        setDebugInfo({ status: 'Sending to PHP...', time: new Date().toLocaleTimeString() });
        try {
            console.log('Sending image to PHP...');
            const result = await recognizeFace(imageData);
            console.log('PHP Response:', result);
            if (!isMounted.current) return;
            setDebugInfo({
                status: 'Response received',
                result: result,
                time: new Date().toLocaleTimeString()
            });
            if (result.success && result.student) {
                if (result.already_marked) {
                    toast.success(
                        `👋 Welcome back ${result.student.name}! You already marked attendance today at ${result.timestamp || 'earlier'}.`,
                        { duration: 5000, icon: '📅' }
                    );
                } else {
                    toast.success(
                        `🎉 Welcome ${result.student.name}! Attendance marked successfully!`,
                        { duration: 5000, icon: '✅' }
                    );
                }
                setLastAttendance({
                    student: result.student,
                    confidence: result.confidence,
                    timestamp: result.timestamp || new Date().toLocaleTimeString(),
                    alreadyMarked: result.already_marked
                });
                fetchStats();
            } else {
                toast.error(`❌ ${result.message || 'Face not recognized. Please try again.'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            if (isMounted.current) {
                setDebugInfo({
                    status: 'Error',
                    error: error.message,
                    time: new Date().toLocaleTimeString()
                });
                toast.error('Network error. Check if PHP backend is running.');
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [fetchStats]);

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <Toaster position="top-center" />
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold">PHP Backend Test</h1>

                {/* Simple API Tests */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h2 className="font-semibold text-lg mb-4">Simple API Tests</h2>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <button onClick={testPHP} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Test Connection
                        </button>
                        <button onClick={testGetStudents} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                            Get Students
                        </button>
                        <button onClick={testSendImage} className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
                            Test Face Recognition (dummy)
                        </button>
                    </div>
                    {loading && <p className="text-gray-500 text-sm">Loading...</p>}
                    {result && (
                        <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    )}
                </div>

                {/* Live Camera Test */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h2 className="font-semibold text-lg mb-4">Live Face Recognition Test</h2>
                    <button
                        onClick={() => setShowCamera(v => !v)}
                        className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        {showCamera ? 'Hide Camera' : 'Open Camera'}
                    </button>

                    {showCamera && (
                        <CameraCapture
                            onCapture={handleCapture}
                            isLoading={isLoading}
                            buttonText="Recognize Face"
                        />
                    )}

                    {/* Debug Info */}
                    {debugInfo && (
                        <div className="mt-4">
                            <h3 className="font-medium mb-2 text-sm text-gray-600">Debug Info</h3>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Last Attendance */}
                    {lastAttendance && (
                        <div className={`mt-4 p-4 rounded-lg border ${lastAttendance.alreadyMarked ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                            <p className="font-semibold">{lastAttendance.student.name}</p>
                            <p className="text-sm text-gray-600">ID: {lastAttendance.student.student_id}</p>
                            <p className="text-sm text-gray-600">Confidence: {lastAttendance.confidence}</p>
                            <p className="text-sm text-gray-600">Time: {lastAttendance.timestamp}</p>
                            {lastAttendance.alreadyMarked && (
                                <p className="text-sm text-yellow-600 font-medium mt-1">📅 Already marked today</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats */}
                {stats && (
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="font-semibold text-lg mb-2">Stats</h2>
                        <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
                            {JSON.stringify(stats, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
