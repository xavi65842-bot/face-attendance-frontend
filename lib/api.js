// lib/api.js — Face Attendance API client

import { handleApiError, retryOperation } from './errorHandler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/face-attendance-api/api';

// ── helpers ──────────────────────────────────────────────────────────────

async function safeFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
        const res = await fetch(url, { 
            ...options, 
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const text = await res.text();
        if (!text || !text.trim().startsWith('{')) {
            throw new Error(`Server returned non-JSON: ${text.slice(0, 100)}`);
        }
        return JSON.parse(text);
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function safeGet(path) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const text = await res.text();
        if (!text || !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
            throw new Error(`Server returned non-JSON: ${text.slice(0, 100)}`);
        }
        return JSON.parse(text);
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ── Registration ─────────────────────────────────────────────────────────

/**
 * PRE-CHECK: Call this BEFORE register.php to detect duplicate faces.
 * POST /check-face.php
 * @param {string} imageDataUrl  Full data URL (data:image/jpeg;base64,...)
 * Returns:
 *   { success: true,  exists: false }                          → safe to register
 *   { success: true,  exists: true, student, confidence }      → DUPLICATE — block
 *   { success: false, message }                                 → no face / error — block
 */
export async function checkFace(imageDataUrl) {
    try {
        return await safeFetch(`${API_BASE_URL}/check-face.php`, {
            method: 'POST',
            body: JSON.stringify({ image: imageDataUrl }),
        });
    } catch (err) {
        return { success: false, message: err.message || 'Face check failed.' };
    }
}

/**
 * Register a new student.
 * POST /register.php
 * @param {{ student_id, full_name, department, year_intake, semester, image }} data
 */
export async function registerStudent(data) {
    try {
        return await safeFetch(`${API_BASE_URL}/register.php`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (err) {
        return { success: false, message: err.message || 'Registration failed.' };
    }
}

/**
 * Check if a student ID is already registered.
 * GET /check-student.php?student_id=...
 */
export async function checkStudentId(student_id) {
    try {
        return await safeGet(`/check-student.php?student_id=${encodeURIComponent(student_id)}`);
    } catch {
        return { exists: false };
    }
}

// ── Face Recognition / Attendance ────────────────────────────────────────

/**
 * Recognize a face and mark attendance using your working Amazon Rekognition backend.
 * POST http://localhost/face-attendance-api/api/recognize.php
 * @param {string} imageDataUrl  Full data URL from canvas (data:image/jpeg;base64,...)
 */
export async function recognizeFace(imageDataUrl) {
    try {
        return await retryOperation(async () => {
            return await safeFetch(`${API_BASE_URL}/recognize.php`, {
                method: 'POST',
                body: JSON.stringify({ image: imageDataUrl }),
            });
        }, 2, 1000); // Retry up to 2 times with 1 second delay
    } catch (err) {
        const errorMessage = handleApiError(err, 'Face recognition');
        return { success: false, message: errorMessage };
    }
}

// Enhanced face recognition function removed - no longer needed

/**
 * Get registered faces for local comparison.
 * GET /registered-faces.php?include_descriptors=true
 */
export async function getRegisteredFaces(options = {}) {
    try {
        const params = new URLSearchParams();
        if (options.include_descriptors) params.append('include_descriptors', 'true');
        
        const data = await safeGet(`/registered-faces.php?${params}`);
        if (data.success) return data.data || [];
        return [];
    } catch (err) {
        console.error('Failed to get registered faces:', err);
        return [];
    }
}

/**
 * Get recognition analytics and performance metrics.
 * GET /recognition-analytics.php?timeframe=24h
 */
export async function getRecognitionAnalytics(timeframe = '24h') {
    try {
        return await safeGet(`/recognition-analytics.php?timeframe=${timeframe}`);
    } catch (err) {
        return { success: false, message: err.message };
    }
}

// ── Session Management (Lecturer) ────────────────────────────────────────

/**
 * Start an attendance session.
 * POST /session-start.php
 * @param {{ lecturer_id, lecturer_name, department, semester, course_code, course_name, ends_at }} data
 */
export async function startSession(data) {
    try {
        return await safeFetch(`${API_BASE_URL}/session-start.php`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (err) {
        return { success: false, message: err.message || 'Failed to start session.' };
    }
}

/**
 * Stop an active attendance session.
 * POST /session-stop.php
 * @param {{ session_id, lecturer_id }} data
 */
export async function stopSession(data) {
    try {
        return await safeFetch(`${API_BASE_URL}/session-stop.php`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (err) {
        return { success: false, message: err.message || 'Failed to stop session.' };
    }
}

/**
 * Get current session status for a department/semester.
 * GET /session-status.php?department=...&semester=...
 */
export async function getSessionStatus(department, semester) {
    try {
        const params = new URLSearchParams();
        if (department) params.append('department', department);
        if (semester)   params.append('semester', semester);
        return await safeGet(`/session-status.php?${params}`);
    } catch (err) {
        return { active: false, error: err.message };
    }
}

// ── Students ─────────────────────────────────────────────────────────────

/**
 * Get all registered students (no face tokens).
 * GET /students.php
 */
export async function getStudents() {
    try {
        const data = await safeGet('/students.php');
        if (data.success) return data.data || [];
        return [];
    } catch {
        return [];
    }
}

/**
 * Delete a student and their face data.
 * POST /delete-student.php
 * @param {string} student_id
 */
export async function deleteStudent(student_id) {
    try {
        return await safeFetch(`${API_BASE_URL}/delete-student.php`, {
            method: 'POST',
            body: JSON.stringify({ student_id }),
        });
    } catch (err) {
        return { success: false, message: err.message || 'Failed to delete student.' };
    }
}

// ── Dashboard ────────────────────────────────────────────────────────────

/**
 * Get dashboard data with optional filters.
 * GET /dashboard-data.php?department=...&semester=...&year_intake=...
 * Returns { students, statistics, filters }
 * NOTE: use attendance_percentage directly — do not recalculate.
 */
export async function getDashboardData({ department, semester, year_intake } = {}) {
    try {
        const params = new URLSearchParams();
        if (department  && department  !== 'all') params.append('department',  department);
        if (semester    && semester    !== 'all') params.append('semester',    semester);
        if (year_intake && year_intake !== 'all') params.append('year_intake', year_intake);
        const data = await safeGet(`/dashboard-data.php?${params}`);
        if (data.success) return data.data;
        return null;
    } catch {
        return null;
    }
}

// ── Attendance Records ───────────────────────────────────────────────────

/**
 * Get attendance records for a given date.
 * GET /attendance.php?date=YYYY-MM-DD
 */
export async function getAttendance(date) {
    try {
        const url = date ? `/attendance.php?date=${date}` : '/attendance.php';
        return await safeGet(url);
    } catch (err) {
        return { success: false, message: err.message };
    }
}

// ── Stats ────────────────────────────────────────────────────────────────

/**
 * Get today's stats: present count, total students, 7-day trend.
 * GET /stats.php
 */
export async function getStats() {
    try {
        const data = await safeGet('/stats.php');
        if (data.success) return data.data;
        return null;
    } catch {
        return null;
    }
}

// ── Lecturer Auth ────────────────────────────────────────────────────────

/**
 * Validate a lecturer ID against the backend.
 * GET /lecturers.php?action=validate&lecturer_id=LEC001
 * Returns { success, message, lecturer? }
 */
export async function validateLecturer(lecturer_id) {
    try {
        return await safeGet(`/lecturers.php?action=validate&lecturer_id=${encodeURIComponent(lecturer_id)}`);
    } catch (err) {
        return { success: false, message: err.message || 'Network error. Check if PHP backend is running.' };
    }
}

// ── Test connection ──────────────────────────────────────────────────────

export async function testConnection() {
    return await safeGet('/test.php');
}
