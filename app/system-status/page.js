'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { runSystemHealthCheck } from '@/lib/systemHealth';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SystemStatusPage() {
    const [healthCheck, setHealthCheck] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sysInfo, setSysInfo] = useState(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSysInfo({
                userAgent: navigator.userAgent || 'Unknown',
                screen: `${screen.width} × ${screen.height}`,
                viewport: `${window.innerWidth} × ${window.innerHeight}`,
                online: navigator.onLine ? 'Online' : 'Offline',
                effectiveType: navigator.connection?.effectiveType || null,
            });
        }

        const checkHealth = async () => {
            setLoading(true);
            try {
                const result = await runSystemHealthCheck();
                setHealthCheck(result);
            } catch (error) {
                console.error('Health check failed:', error);
                setHealthCheck({
                    overall: false,
                    checks: {
                        backend: { healthy: false, message: 'Health check failed' },
                        camera: { available: false, message: 'Health check failed' },
                        browser: { compatible: false, issues: ['Health check failed'] }
                    },
                    timestamp: new Date().toISOString()
                });
            } finally {
                setLoading(false);
            }
        };

        checkHealth();
    }, []);

    const StatusIcon = ({ status }) => {
        if (status === true) return <span className="text-green-500 text-xl">✅</span>;
        if (status === false) return <span className="text-red-500 text-xl">❌</span>;
        return <span className="text-yellow-500 text-xl">⚠️</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: 'linear-gradient(135deg,#C1121F,#E63946)' }}>FA</div>
                        <span className="font-bold text-lg" style={{ color: '#C1121F' }}>FaceAttend</span>
                        <span className="text-gray-400 text-sm">/ System Status</span>
                    </div>
                    <Link href="/" className="text-sm text-gray-400 hover:text-[#C1121F] transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">System Status</h1>
                    <p className="text-gray-600">Check the health of all system components</p>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl p-12">
                        <LoadingSpinner text="Running system health check..." />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Overall Status */}
                        <div className={`bg-white rounded-2xl p-6 border-l-4 ${
                            healthCheck?.overall ? 'border-green-500' : 'border-red-500'
                        }`}>
                            <div className="flex items-center gap-3 mb-4">
                                <StatusIcon status={healthCheck?.overall} />
                                <h2 className="text-xl font-bold text-gray-800">
                                    Overall System Status
                                </h2>
                            </div>
                            <p className={`text-lg font-semibold ${
                                healthCheck?.overall ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {healthCheck?.overall ? 'All systems operational' : 'Issues detected'}
                            </p>
                            {healthCheck?.timestamp && (
                                <p className="text-sm text-gray-400 mt-2">
                                    Last checked: {new Date(healthCheck.timestamp).toLocaleString()}
                                </p>
                            )}
                        </div>

                        {/* Individual Checks */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Backend */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <StatusIcon status={healthCheck?.checks?.backend?.healthy} />
                                    <h3 className="font-bold text-gray-800">Backend API</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                    {healthCheck?.checks?.backend?.message || 'No data'}
                                </p>
                                {healthCheck?.checks?.backend?.responseTime && (
                                    <p className="text-xs text-gray-400">
                                        Response time: {healthCheck.checks.backend.responseTime}ms
                                    </p>
                                )}
                            </div>

                            {/* Camera */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <StatusIcon status={healthCheck?.checks?.camera?.available} />
                                    <h3 className="font-bold text-gray-800">Camera Access</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {healthCheck?.checks?.camera?.message || 'No data'}
                                </p>
                            </div>

                            {/* Browser */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <StatusIcon status={healthCheck?.checks?.browser?.compatible} />
                                    <h3 className="font-bold text-gray-800">Browser Support</h3>
                                </div>
                                {healthCheck?.checks?.browser?.compatible ? (
                                    <p className="text-sm text-green-600">Fully compatible</p>
                                ) : (
                                    <div className="space-y-1">
                                        {healthCheck?.checks?.browser?.issues?.map((issue, index) => (
                                             <p key={index} className="text-sm text-red-600">• {issue}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* System Information */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4">System Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-600">User Agent:</span>
                                    <p className="text-gray-800 break-all">{sysInfo?.userAgent || 'Detecting...'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Screen Resolution:</span>
                                    <p className="text-gray-800">{sysInfo?.screen || '—'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Viewport:</span>
                                    <p className="text-gray-800">{sysInfo?.viewport || '—'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Connection:</span>
                                    <p className="text-gray-800">
                                        {sysInfo?.online || 'Online'}
                                        {sysInfo?.effectiveType && ` (${sysInfo.effectiveType})`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4">Actions</h3>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                >
                                    🔄 Refresh Check
                                </button>
                                <Link
                                    href="/test-api"
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                                >
                                    🧪 Test API
                                </Link>
                                <Link
                                    href="/"
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                                >
                                    🏠 Go Home
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}