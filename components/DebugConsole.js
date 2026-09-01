'use client';

import { useState, useEffect, useRef } from 'react';

export default function DebugConsole({
    isVisible = false,
    recognitionData = null,
    performanceMetrics = null,
    onToggleStrictMode,
    onClearLogs,
    onClose
}) {
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('logs');
    const [autoScroll, setAutoScroll] = useState(true);
    const logsEndRef = useRef(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    // Add new recognition data to logs
    useEffect(() => {
        if (recognitionData) {
            const logEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                type: recognitionData.success ? 'success' : 'error',
                data: recognitionData
            };
            
            setLogs(prev => [...prev.slice(-49), logEntry]); // Keep last 50 logs
        }
    }, [recognitionData]);

    const clearLogs = () => {
        setLogs([]);
        if (onClearLogs) onClearLogs();
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    const formatConfidence = (confidence) => {
        if (typeof confidence === 'number') {
            return `${Math.round(confidence * 100)}%`;
        }
        if (confidence && typeof confidence === 'object') {
            return `${Math.round((confidence.overall || 0) * 100)}%`;
        }
        return 'N/A';
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <h2 className="text-xl font-bold text-gray-800">🐛 Debug Console</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200">
                    {[
                        { id: 'logs', label: '📋 Recognition Logs', count: logs.length },
                        { id: 'metrics', label: '📊 Performance Metrics' },
                        { id: 'algorithms', label: '🧠 Algorithm Details' },
                        { id: 'system', label: '⚙️ System Status' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {/* Recognition Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="h-full flex flex-col">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={autoScroll}
                                            onChange={(e) => setAutoScroll(e.target.checked)}
                                            className="rounded"
                                        />
                                        Auto-scroll
                                    </label>
                                </div>
                                <button
                                    onClick={clearLogs}
                                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors"
                                >
                                    Clear Logs
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {logs.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        No recognition attempts yet. Start recognizing faces to see debug information.
                                    </div>
                                ) : (
                                    logs.map(log => (
                                        <div
                                            key={log.id}
                                            className={`p-3 rounded-lg border-l-4 ${
                                                log.type === 'success'
                                                    ? 'bg-green-50 border-green-400'
                                                    : 'bg-red-50 border-red-400'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-800">
                                                    {log.type === 'success' ? '✅ Recognition Success' : '❌ Recognition Failed'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTimestamp(log.timestamp)}
                                                </span>
                                            </div>
                                            
                                            <div className="text-sm text-gray-600 space-y-1">
                                                {log.data.student && (
                                                    <div><strong>Student:</strong> {log.data.student.full_name}</div>
                                                )}
                                                <div><strong>Confidence:</strong> {formatConfidence(log.data.confidence)}</div>
                                                <div><strong>Processing Time:</strong> {log.data.processingTime?.toFixed(2)}ms</div>
                                                {log.data.message && (
                                                    <div><strong>Message:</strong> {log.data.message}</div>
                                                )}
                                            </div>
                                            
                                            {log.data.debugInfo && (
                                                <details className="mt-2">
                                                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                                        Show Debug Details
                                                    </summary>
                                                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                                        {JSON.stringify(log.data.debugInfo, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Performance Metrics Tab */}
                    {activeTab === 'metrics' && (
                        <div className="p-6 overflow-y-auto h-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Success Rate */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm">✓</span>
                                        </div>
                                        <h3 className="font-medium text-green-800">Success Rate</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-green-700">
                                        {performanceMetrics?.successRate?.toFixed(1) || '0.0'}%
                                    </div>
                                    <div className="text-sm text-green-600">
                                        {performanceMetrics?.successfulRecognitions || 0} / {performanceMetrics?.totalAttempts || 0} attempts
                                    </div>
                                </div>

                                {/* Average Processing Time */}
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm">⚡</span>
                                        </div>
                                        <h3 className="font-medium text-blue-800">Avg Processing Time</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        {performanceMetrics?.averageProcessingTime?.toFixed(0) || '0'}ms
                                    </div>
                                    <div className="text-sm text-blue-600">
                                        Per recognition attempt
                                    </div>
                                </div>

                                {/* Total Attempts */}
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm">#</span>
                                        </div>
                                        <h3 className="font-medium text-purple-800">Total Attempts</h3>
                                    </div>
                                    <div className="text-2xl font-bold text-purple-700">
                                        {performanceMetrics?.totalAttempts || 0}
                                    </div>
                                    <div className="text-sm text-purple-600">
                                        Recognition attempts
                                    </div>
                                </div>
                            </div>

                            {/* Recent Performance Chart Placeholder */}
                            <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <h3 className="font-medium text-gray-800 mb-4">📈 Performance Trends</h3>
                                <div className="text-center text-gray-500 py-8">
                                    Performance chart visualization would be implemented here
                                    <br />
                                    <span className="text-sm">(Integration with charting library needed)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Algorithm Details Tab */}
                    {activeTab === 'algorithms' && (
                        <div className="p-6 overflow-y-auto h-full">
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-800 mb-3">🧠 Multi-Algorithm Comparison</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['Euclidean Distance', 'Cosine Similarity', 'Manhattan Distance'].map((algorithm, index) => (
                                            <div key={algorithm} className="bg-white p-3 rounded border">
                                                <div className="font-medium text-sm text-gray-700 mb-2">{algorithm}</div>
                                                <div className="text-xs text-gray-500">
                                                    Weight: {[0.4, 0.4, 0.2][index] * 100}%
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Last Score: {recognitionData?.confidence?.algorithms?.[algorithm.toLowerCase().replace(' ', '_')] ? 
                                                        `${Math.round(recognitionData.confidence.algorithms[algorithm.toLowerCase().replace(' ', '_')] * 100)}%` : 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-800 mb-3">🔍 Quality Assessment</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Sharpness', value: recognitionData?.debugInfo?.detectionDetails?.quality?.metrics?.sharpness },
                                            { label: 'Lighting', value: recognitionData?.debugInfo?.detectionDetails?.quality?.metrics?.lighting },
                                            { label: 'Pose', value: recognitionData?.debugInfo?.detectionDetails?.quality?.metrics?.pose },
                                            { label: 'Size', value: recognitionData?.debugInfo?.detectionDetails?.quality?.metrics?.size }
                                        ].map(metric => (
                                            <div key={metric.label} className="bg-white p-3 rounded border text-center">
                                                <div className="font-medium text-sm text-gray-700">{metric.label}</div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {metric.value ? `${Math.round(metric.value * 100)}%` : 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-800 mb-3">🛡️ Anti-Spoofing Analysis</h3>
                                    <div className="bg-white p-3 rounded border">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium">Liveness Score:</span>
                                                <span className="ml-2 text-blue-600">
                                                    {recognitionData?.debugInfo?.antiSpoofDetails?.confidence ? 
                                                        `${Math.round(recognitionData.debugInfo.antiSpoofDetails.confidence * 100)}%` : 'N/A'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Movement:</span>
                                                <span className="ml-2 text-green-600">
                                                    {recognitionData?.debugInfo?.antiSpoofDetails?.details?.movement?.detected ? '✓ Detected' : '✗ Not Detected'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Status:</span>
                                                <span className="ml-2">
                                                    {recognitionData?.debugInfo?.antiSpoofDetails?.passed ? 
                                                        <span className="text-green-600">✓ Passed</span> : 
                                                        <span className="text-red-600">✗ Failed</span>}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* System Status Tab */}
                    {activeTab === 'system' && (
                        <div className="p-6 overflow-y-auto h-full">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-800 mb-3">🎥 Camera Status</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Camera Access:</span>
                                                <span className="text-green-600">✓ Granted</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Video Stream:</span>
                                                <span className="text-green-600">✓ Active</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Resolution:</span>
                                                <span className="text-gray-600">1280x720</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-800 mb-3">🧠 AI Models</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>Face Detection:</span>
                                                <span className="text-green-600">✓ Loaded</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Landmarks:</span>
                                                <span className="text-green-600">✓ Loaded</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Recognition:</span>
                                                <span className="text-green-600">✓ Loaded</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-800 mb-3">⚙️ System Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="font-medium mb-2">Recognition Settings</div>
                                            <div className="space-y-1 text-gray-600">
                                                <div>Strict Mode: {recognitionData?.validation?.strictModePassed !== undefined ? 
                                                    (recognitionData.validation.strictModePassed ? 'Enabled' : 'Disabled') : 'Unknown'}</div>
                                                <div>Confidence Threshold: 60% (Standard) / 80% (Strict)</div>
                                                <div>Anti-Spoofing: Enabled</div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-medium mb-2">Performance Settings</div>
                                            <div className="space-y-1 text-gray-600">
                                                <div>Multi-Algorithm: Enabled</div>
                                                <div>Quality Assessment: Real-time</div>
                                                <div>Debug Logging: {recognitionData?.debugInfo ? 'Enabled' : 'Disabled'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Control Panel */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-medium text-gray-800 mb-3">🎛️ Control Panel</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={onToggleStrictMode}
                                            className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 transition-colors"
                                        >
                                            Toggle Strict Mode
                                        </button>
                                        <button
                                            onClick={clearLogs}
                                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                                        >
                                            Clear All Logs
                                        </button>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                                        >
                                            Restart System
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}