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
     * @param {HTMLButtonElement} elements.micToggle - Microphone toggle button
     * @param {HTMLButtonElement} elements.systemAudioToggle - System audio toggle button
     * @param {HTMLButtonElement} elements.recordButton - Record button
     * @param {HTMLElement} elements.statusMessage - Status message element
     */
    constructor(elements) {
        // Validate required elements
        const requiredElements = [
            'recordButton',
            'saveButton',
            'previewButton',
            'micToggle',
            'systemAudioToggle'
        ];

        for (const elementId of requiredElements) {
            if (!elements[elementId]) {
                throw new Error(`Required element '${elementId}' not found`);
            }
        }

        this.elements = elements;
        this.isScreenPreviewing = false;
        this.isCameraPreviewing = false;
        this.isMicEnabled = true;
        this.isSystemAudioEnabled = true;
        this.isRecording = false;

        // Bind methods
        this.updateStatus = this.updateStatus.bind(this);
        this.updateButtonStates = this.updateButtonStates.bind(this);
        this.handleError = this.handleError.bind(this);
        this.toggleMic = this.toggleMic.bind(this);
        this.toggleSystemAudio = this.toggleSystemAudio.bind(this);
        this.toggleRecording = this.toggleRecording.bind(this);

        // Set up event listeners only if elements exist
        if (this.elements.micToggle) {
            this.elements.micToggle.addEventListener('click', this.toggleMic);
        }
        if (this.elements.systemAudioToggle) {
            this.elements.systemAudioToggle.addEventListener('click', this.toggleSystemAudio);
        }
        if (this.elements.recordButton) {
            this.elements.recordButton.addEventListener('click', this.toggleRecording);
        }

        // Initialize toggle states
        this.initializeToggleStates();
    }

    /**
     * Initializes the toggle button states
     */
    initializeToggleStates() {
        if (this.elements.micToggle) {
            const micIcon = this.elements.micToggle.querySelector('.mic-icon');
            const micOffIcon = this.elements.micToggle.querySelector('.mic-off-icon');
            if (micIcon && micOffIcon) {
                micIcon.classList.remove('hidden');
                micOffIcon.classList.add('hidden');
                this.elements.micToggle.classList.add('toggle-active');
                this.elements.micToggle.classList.remove('toggle-inactive');
            }
        }

        if (this.elements.systemAudioToggle) {
            const speakerIcon = this.elements.systemAudioToggle.querySelector('.speaker-icon');
            const speakerOffIcon = this.elements.systemAudioToggle.querySelector('.speaker-off-icon');
            if (speakerIcon && speakerOffIcon) {
                speakerIcon.classList.remove('hidden');
                speakerOffIcon.classList.add('hidden');
                this.elements.systemAudioToggle.classList.add('toggle-active');
                this.elements.systemAudioToggle.classList.remove('toggle-inactive');
            }
        }
    }

    /**
     * Updates the status message
     * @param {string} message - The message to display
     * @param {string} type - The type of message (info, error, success)
     */
    updateStatus(message, type = CONFIG.UI.STATUS_TYPES.INFO) {
        window.showNotification(message, type);
    }

    /**
     * Toggles the microphone state
     */
    toggleMic() {
        if (this.isRecording) {
            this.updateStatus('Cannot toggle microphone while recording', CONFIG.UI.STATUS_TYPES.ERROR);
            return;
        }
        
        this.isMicEnabled = !this.isMicEnabled;
        const micIcon = this.elements.micToggle.querySelector('.mic-icon');
        const micOffIcon = this.elements.micToggle.querySelector('.mic-off-icon');
        
        if (this.isMicEnabled) {
            micIcon.classList.remove('hidden');
            micOffIcon.classList.add('hidden');
            this.elements.micToggle.classList.remove('toggle-inactive');
            this.elements.micToggle.classList.add('toggle-active');
            this.updateStatus('Microphone enabled', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } else {
            micIcon.classList.add('hidden');
            micOffIcon.classList.remove('hidden');
            this.elements.micToggle.classList.remove('toggle-active');
            this.elements.micToggle.classList.add('toggle-inactive');
            this.updateStatus('Microphone disabled', CONFIG.UI.STATUS_TYPES.INFO);
        }
    }

    /**
     * Toggles the system audio state
     */
    toggleSystemAudio() {
        if (this.isRecording) {
            this.updateStatus('Cannot toggle system audio while recording', CONFIG.UI.STATUS_TYPES.ERROR);
            return;
        }
        
        this.isSystemAudioEnabled = !this.isSystemAudioEnabled;
        const speakerIcon = this.elements.systemAudioToggle.querySelector('.speaker-icon');
        const speakerOffIcon = this.elements.systemAudioToggle.querySelector('.speaker-off-icon');
        
        if (this.isSystemAudioEnabled) {
            speakerIcon.classList.remove('hidden');
            speakerOffIcon.classList.add('hidden');
            this.elements.systemAudioToggle.classList.remove('toggle-inactive');
            this.elements.systemAudioToggle.classList.add('toggle-active');
            this.updateStatus('System audio enabled', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } else {
            speakerIcon.classList.add('hidden');
            speakerOffIcon.classList.remove('hidden');
            this.elements.systemAudioToggle.classList.remove('toggle-active');
            this.elements.systemAudioToggle.classList.add('toggle-inactive');
            this.updateStatus('System audio disabled', CONFIG.UI.STATUS_TYPES.INFO);
        }
    }

    /**
     * Toggles recording state
     */
    toggleRecording() {
        console.log('toggleRecording called');
        console.log('Current state:', {
            isScreenPreviewing: this.isScreenPreviewing,
            isRecording: this.isRecording
        });

        if (!this.isScreenPreviewing) {
            console.log('Screen preview not active, cannot start recording');
            this.updateStatus('Please start screen preview first', CONFIG.UI.STATUS_TYPES.ERROR);
            return;
        }

        if (!this.isRecording) {
            console.log('Starting countdown for recording');
            document.dispatchEvent(new CustomEvent('startCountdown'));
            return;
        }

        console.log('Stopping recording');
        this.isRecording = false;
        const recordButton = this.elements.recordButton;
        recordButton.classList.remove('active');
        recordButton.title = 'Start Recording';
        this.updateStatus('Recording stopped', CONFIG.UI.STATUS_TYPES.SUCCESS);

        this.updateButtonStates({
            isRecording: this.isRecording,
            hasRecording: this.isRecording,
            isScreenPreviewing: this.isScreenPreviewing,
            isCameraPreviewing: this.isCameraPreviewing
        });

        console.log('Dispatching recordingStateChanged event');
        document.dispatchEvent(new CustomEvent('recordingStateChanged', {
            detail: { isRecording: this.isRecording }
        }));
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
        console.log('Updating button states:', {
            isRecording,
            hasRecording,
            isScreenPreviewing,
            isCameraPreviewing
        });

        const {
            recordButton,
            saveButton,
            previewButton,
            micToggle,
            systemAudioToggle
        } = this.elements;

        // Update recording control buttons
        recordButton.disabled = !isScreenPreviewing;
        saveButton.disabled = !hasRecording;
        previewButton.disabled = isRecording;

        // Update audio toggle buttons
        micToggle.disabled = isRecording;
        systemAudioToggle.disabled = isRecording;

        console.log('Button states updated:', {
            recordButtonDisabled: recordButton.disabled,
            saveButtonDisabled: saveButton.disabled,
            previewButtonDisabled: previewButton.disabled,
            micToggleDisabled: micToggle.disabled,
            systemAudioToggleDisabled: systemAudioToggle.disabled
        });

        // Update button styles
        [recordButton, saveButton, previewButton, micToggle, systemAudioToggle].forEach(button => {
            if (button.disabled) {
                button.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                button.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });

        // Update recording button state
        if (isRecording) {
            recordButton.classList.add('active');
            recordButton.title = 'Stop Recording';
        } else {
            recordButton.classList.remove('active');
            recordButton.title = 'Start Recording';
        }
    }

    /**
     * Handles errors by updating the UI
     * @param {Error} error - The error to handle
     */
    handleError(error) {
        console.error('UI Error:', error);
        const message = formatErrorMessage(error);
        this.updateStatus(message, CONFIG.UI.STATUS_TYPES.ERROR);
    }

    /**
     * Updates the preview state
     * @param {boolean} isScreenPreviewing - Whether screen is being previewed
     * @param {boolean} isCameraPreviewing - Whether camera is being previewed
     */
    updatePreviewState(isScreenPreviewing, isCameraPreviewing) {
        console.log('Updating preview state:', {
            isScreenPreviewing,
            isCameraPreviewing
        });

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
            includeMic: this.isMicEnabled,
            includeSystemAudio: this.isSystemAudioEnabled
        };
    }

    /**
     * Shows a loading state
     * @param {boolean} isLoading - Whether to show loading state
     */
    setLoading(isLoading) {
        const buttons = [
            this.elements.recordButton,
            this.elements.saveButton,
            this.elements.previewButton,
            this.elements.micToggle,
            this.elements.systemAudioToggle
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