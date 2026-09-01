// lib/errorHandler.js - Centralized error handling utilities

/**
 * Enhanced error handler for API calls
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 * @returns {string} User-friendly error message
 */
export function handleApiError(error, context = 'API call') {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.error(`[${context}] Error:`, error);
    }

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Network error. Please check your internet connection and try again.';
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return 'Request timed out. Please try again.';
    }

    // Server errors
    if (error.message.includes('Server returned non-JSON')) {
        return 'Server error. Please check if the backend is running properly.';
    }

    // Camera/media errors
    if (error.name === 'NotAllowedError') {
        return 'Camera access denied. Please allow camera permissions and reload the page.';
    }
    
    if (error.name === 'NotFoundError') {
        return 'No camera found on this device.';
    }
    
    if (error.name === 'NotReadableError') {
        return 'Camera is being used by another application. Please close other apps and try again.';
    }

    // Default fallback
    return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Retry utility for failed operations
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} The result of the operation
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    
    throw lastError;
}

/**
 * Validate image data URL
 * @param {string} dataUrl - The image data URL to validate
 * @returns {boolean} Whether the data URL is valid
 */
export function validateImageDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
        return false;
    }
    
    // Check if it's a valid data URL format
    if (!dataUrl.startsWith('data:image/')) {
        return false;
    }
    
    // Check if it has actual image data (not just the header)
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data || base64Data.length < 100) {
        return false;
    }
    
    return true;
}

/**
 * Format error for user display
 * @param {Error|string} error - Error object or message
 * @param {string} fallback - Fallback message if error is not user-friendly
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(error, fallback = 'Something went wrong') {
    if (typeof error === 'string') {
        return error;
    }
    
    if (error && error.message) {
        // Don't show technical error messages to users
        const technicalErrors = [
            'fetch',
            'JSON',
            'undefined',
            'null',
            'TypeError',
            'ReferenceError'
        ];
        
        const isTechnical = technicalErrors.some(term => 
            error.message.toLowerCase().includes(term.toLowerCase())
        );
        
        return isTechnical ? fallback : error.message;
    }
    
    return fallback;
}