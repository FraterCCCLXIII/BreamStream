/**
 * Application configuration and constants
 */
export const CONFIG = {
    // Canvas settings
    CANVAS: {
        DEFAULT_WIDTH: 1280,
        DEFAULT_HEIGHT: 720,
        BACKGROUND_COLOR: '#1e293b', // Tailwind slate-800
        CAMERA_OVERLAY: {
            SIZE_RATIO: 0.2, // 20% of the smallest dimension
            PADDING_RATIO: 0.03, // 3% padding from the edge
            POSITION: 'bottom-left' // Position of the camera overlay
        }
    },

    // Media settings
    MEDIA: {
        VIDEO_CONSTRAINTS: {
            video: {
                mediaSource: 'screen'
            }
        },
        CAMERA_CONSTRAINTS: {
            video: true,
            audio: true
        },
        RECORDING_MIME_TYPE: 'video/webm;codecs=vp9,opus',
        RECORDING_BITS_PER_SECOND: 2500000 // 2.5 Mbps
    },

    // UI settings
    UI: {
        STATUS_TYPES: {
            INFO: 'info',
            ERROR: 'error',
            SUCCESS: 'success'
        },
        STATUS_CLASSES: {
            info: ['bg-blue-100', 'text-blue-800', 'border-blue-200'],
            error: ['bg-red-100', 'text-red-800', 'border-red-200'],
            success: ['bg-green-100', 'text-green-800', 'border-green-200']
        }
    },

    // Error messages
    ERROR_MESSAGES: {
        CAMERA_PERMISSION: 'Camera access denied. Please allow camera access to use this feature.',
        SCREEN_PERMISSION: 'Screen sharing denied. Please allow screen sharing to use this feature.',
        RECORDING_START: 'Failed to start recording. Please try again.',
        RECORDING_STOP: 'Failed to stop recording. Please try again.',
        SAVE_RECORDING: 'Failed to save recording. Please try again.'
    }
}; 