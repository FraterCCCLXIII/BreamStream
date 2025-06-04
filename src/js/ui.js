import { CONFIG } from './config.js';
import { formatErrorMessage } from './utils.js';

/**
 * Manages UI state and interactions
 */
export class UIManager {
    /**
     * @param {Object} elements - Object containing UI elements
     * @param {HTMLButtonElement} elements.startButton - Start recording button
     * @param {HTMLButtonElement} elements.stopButton - Stop recording button
     * @param {HTMLButtonElement} elements.saveButton - Save recording button
     * @param {HTMLButtonElement} elements.previewButton - Preview screen button
     * @param {HTMLInputElement} elements.micToggle - Microphone toggle checkbox
     * @param {HTMLInputElement} elements.systemAudioToggle - System audio toggle checkbox
     * @param {HTMLElement} elements.statusMessage - Status message element
     */
    constructor(elements) {
        this.elements = elements;
        this.isScreenPreviewing = false;
        this.isCameraPreviewing = false;

        // Bind methods
        this.updateStatus = this.updateStatus.bind(this);
        this.updateButtonStates = this.updateButtonStates.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Updates the status message
     * @param {string} message - The message to display
     * @param {string} type - The type of message (info, error, success)
     */
    updateStatus(message, type = CONFIG.UI.STATUS_TYPES.INFO) {
        const element = this.elements.statusMessage;
        element.textContent = message;

        // Remove all status classes
        Object.values(CONFIG.UI.STATUS_CLASSES).forEach(classes => {
            classes.forEach(className => element.classList.remove(className));
        });

        // Add new status classes
        const classes = CONFIG.UI.STATUS_CLASSES[type] || CONFIG.UI.STATUS_CLASSES.info;
        classes.forEach(className => element.classList.add(className));
    }

    /**
     * Updates button states based on current application state
     * @param {Object} state - Current application state
     * @param {boolean} state.isRecording - Whether currently recording
     * @param {boolean} state.hasRecording - Whether there is recorded data
     * @param {boolean} state.isScreenPreviewing - Whether screen is being previewed
     * @param {boolean} state.isCameraPreviewing - Whether camera is being previewed
     */
    updateButtonStates({ isRecording, hasRecording, isScreenPreviewing, isCameraPreviewing }) {
        const {
            startButton,
            stopButton,
            saveButton,
            previewButton,
            micToggle,
            systemAudioToggle
        } = this.elements;

        // Update recording state
        startButton.disabled = isRecording || !isScreenPreviewing;
        stopButton.disabled = !isRecording;
        saveButton.disabled = !hasRecording;

        // Update preview state
        previewButton.disabled = isRecording;
        micToggle.disabled = isRecording;
        systemAudioToggle.disabled = isRecording;

        // Update button styles
        [startButton, stopButton, saveButton, previewButton].forEach(button => {
            if (button.disabled) {
                button.classList.add('opacity-50', 'cursor-not-allowed');
                button.classList.remove('hover:shadow-xl', 'transform', 'hover:-translate-y-0.5');
            } else {
                button.classList.remove('opacity-50', 'cursor-not-allowed');
                button.classList.add('hover:shadow-xl', 'transform', 'hover:-translate-y-0.5');
            }
        });
    }

    /**
     * Handles errors by updating the UI
     * @param {Error} error - The error to handle
     */
    handleError(error) {
        const message = formatErrorMessage(error);
        this.updateStatus(message, CONFIG.UI.STATUS_TYPES.ERROR);
    }

    /**
     * Updates the preview state
     * @param {boolean} isScreenPreviewing - Whether screen is being previewed
     * @param {boolean} isCameraPreviewing - Whether camera is being previewed
     */
    updatePreviewState(isScreenPreviewing, isCameraPreviewing) {
        this.isScreenPreviewing = isScreenPreviewing;
        this.isCameraPreviewing = isCameraPreviewing;

        if (isScreenPreviewing && isCameraPreviewing) {
            this.updateStatus('Screen and camera preview enabled. Ready to record.', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } else if (isScreenPreviewing) {
            this.updateStatus('Screen preview enabled. Camera preview not available.', CONFIG.UI.STATUS_TYPES.INFO);
        } else if (isCameraPreviewing) {
            this.updateStatus('Camera preview enabled. Screen preview not available.', CONFIG.UI.STATUS_TYPES.INFO);
        } else {
            this.updateStatus('No preview active. Click "Preview Screen" to begin.', CONFIG.UI.STATUS_TYPES.INFO);
        }
    }

    /**
     * Gets the current audio settings
     * @returns {Object} Audio settings
     */
    get audioSettings() {
        return {
            includeMic: this.elements.micToggle.checked,
            includeSystemAudio: this.elements.systemAudioToggle.checked
        };
    }

    /**
     * Shows a loading state
     * @param {boolean} isLoading - Whether to show loading state
     */
    setLoading(isLoading) {
        const buttons = [
            this.elements.startButton,
            this.elements.stopButton,
            this.elements.saveButton,
            this.elements.previewButton
        ];

        buttons.forEach(button => {
            if (isLoading) {
                button.classList.add('opacity-50', 'cursor-wait');
                button.disabled = true;
            } else {
                button.classList.remove('opacity-50', 'cursor-wait');
                button.disabled = false;
            }
        });

        if (isLoading) {
            this.updateStatus('Processing...', CONFIG.UI.STATUS_TYPES.INFO);
        }
    }
} 