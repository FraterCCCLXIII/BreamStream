/**
 * Utility functions for the application
 */

/**
 * Creates a timestamp string for file naming
 * @returns {string} Formatted timestamp string
 */
export function createTimestamp() {
    const now = new Date();
    return now.toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '-')
        .replace('Z', '');
}

/**
 * Generates a filename for the recording
 * @returns {string} Formatted filename
 */
export function generateRecordingFilename() {
    return `recording_${createTimestamp()}.webm`;
}

/**
 * Downloads a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The name of the file
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Safely stops all tracks in a MediaStream
 * @param {MediaStream} stream - The stream to stop
 */
export function stopMediaStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => {
        track.stop();
    });
}

/**
 * Checks if the browser supports the required APIs
 * @returns {boolean} True if all required APIs are supported
 */
export function checkBrowserSupport() {
    return !!(navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        navigator.mediaDevices.getDisplayMedia &&
        window.MediaRecorder);
}

/**
 * Formats an error message for display
 * @param {Error} error - The error object
 * @returns {string} Formatted error message
 */
export function formatErrorMessage(error) {
    return `${error.name}: ${error.message}`;
}

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttles a function call
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
} 