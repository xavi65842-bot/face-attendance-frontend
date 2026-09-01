// lib/systemHealth.js - System health monitoring utilities

/**
 * Check if the backend API is accessible
 * @returns {Promise<{healthy: boolean, message: string, responseTime?: number}>}
 */
export async function checkBackendHealth() {
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api'}/test.php`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        const responseTime = Date.now() - startTime;
        
        if (!response.ok) {
            return {
                healthy: false,
                message: `Backend returned HTTP ${response.status}`,
                responseTime
            };
        }
        
        const data = await response.json();
        
        return {
            healthy: data.success === true,
            message: data.success ? 'Backend is healthy' : 'Backend test failed',
            responseTime
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        return {
            healthy: false,
            message: `Backend unreachable: ${error.message}`,
            responseTime
        };
    }
}

/**
 * Check camera availability
 * @returns {Promise<{available: boolean, message: string}>}
 */
export async function checkCameraAvailability() {
    try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return {
                available: false,
                message: 'Camera API not supported in this browser'
            };
        }
        
        // Try to enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
            return {
                available: false,
                message: 'No camera devices found'
            };
        }
        
        // Try to access camera (will prompt for permission if needed)
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        
        // Clean up the stream
        stream.getTracks().forEach(track => track.stop());
        
        return {
            available: true,
            message: `Camera available (${videoDevices.length} device${videoDevices.length > 1 ? 's' : ''} found)`
        };
    } catch (error) {
        let message = 'Camera access failed';
        
        if (error.name === 'NotAllowedError') {
            message = 'Camera permission denied';
        } else if (error.name === 'NotFoundError') {
            message = 'No camera found';
        } else if (error.name === 'NotReadableError') {
            message = 'Camera in use by another application';
        }
        
        return {
            available: false,
            message
        };
    }
}

/**
 * Check browser compatibility
 * @returns {{compatible: boolean, issues: string[]}}
 */
export function checkBrowserCompatibility() {
    const issues = [];
    
    // Check for required APIs
    if (!window.fetch) {
        issues.push('Fetch API not supported');
    }
    
    if (!navigator.mediaDevices) {
        issues.push('MediaDevices API not supported');
    }
    
    if (!window.HTMLCanvasElement) {
        issues.push('Canvas API not supported');
    }
    
    if (!window.localStorage) {
        issues.push('LocalStorage not supported');
    }
    
    // Check for HTTPS on non-localhost
    if (location.protocol !== 'https:' && !location.hostname.includes('localhost') && location.hostname !== '127.0.0.1') {
        issues.push('HTTPS required for camera access on this domain');
    }
    
    // Check user agent for known problematic browsers
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('internet explorer')) {
        issues.push('Internet Explorer is not supported');
    }
    
    return {
        compatible: issues.length === 0,
        issues
    };
}

/**
 * Run comprehensive system health check
 * @returns {Promise<{overall: boolean, checks: object}>}
 */
export async function runSystemHealthCheck() {
    const [backendHealth, cameraCheck, browserCheck] = await Promise.all([
        checkBackendHealth(),
        checkCameraAvailability(),
        Promise.resolve(checkBrowserCompatibility())
    ]);
    
    const overall = backendHealth.healthy && cameraCheck.available && browserCheck.compatible;
    
    return {
        overall,
        checks: {
            backend: backendHealth,
            camera: cameraCheck,
            browser: browserCheck
        },
        timestamp: new Date().toISOString()
    };
}