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
            'systemAudioToggle',
            'cameraToggle',
            'audioToggle',
            'settingsPanel',
            'settingsOverlay'
        ];

        for (const elementId of requiredElements) {
            if (!elements[elementId]) {
                throw new Error(`Required element '${elementId}' not found`);
            }
        }

        this.elements = elements;
        this.isScreenPreviewing = false;
        this.isCameraVideoEnabled = false;
        this.isCameraAudioEnabled = false;
        this.isMicEnabled = true;
        this.isSystemAudioEnabled = true;
        this.isRecording = false;

        // Initialize save button state
        this.elements.saveButton.disabled = true;
        this.elements.saveButton.classList.add('opacity-50', 'cursor-not-allowed');
        this.elements.saveButton.title = 'No recording available';

        // Initialize audio settings as a private property
        this._audioSettings = {
            includeMic: false,
            includeSystemAudio: false
        };

        // Initialize notification system
        this.initializeNotificationSystem();

        // Bind methods
        this.updateStatus = this.updateStatus.bind(this);
        this.updateButtonStates = this.updateButtonStates.bind(this);
        this.handleError = this.handleError.bind(this);
        this.toggleMic = this.toggleMic.bind(this);
        this.toggleSystemAudio = this.toggleSystemAudio.bind(this);
        this.toggleRecording = this.toggleRecording.bind(this);
        this.handleCameraStateChange = this.handleCameraStateChange.bind(this);
        this.updatePreviewState = this.updatePreviewState.bind(this);
        this.handleCameraToggle = this.handleCameraToggle.bind(this);
        this.handleAudioToggle = this.handleAudioToggle.bind(this);
        this.handleSettingsChange = this.handleSettingsChange.bind(this);

        // Set up event listeners
        if (this.elements.micToggle) {
            this.elements.micToggle.addEventListener('click', this.toggleMic);
        }
        if (this.elements.systemAudioToggle) {
            this.elements.systemAudioToggle.addEventListener('click', this.toggleSystemAudio);
        }
        if (this.elements.recordButton) {
            this.elements.recordButton.addEventListener('click', this.toggleRecording);
        }
        document.addEventListener('cameraStateChanged', this.handleCameraStateChange);
        this.setupEventListeners();

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
     * Sets up event listeners for UI interactions
     */
    setupEventListeners() {
        // Camera toggle
        if (this.elements.cameraToggle) {
            this.elements.cameraToggle.addEventListener('click', this.handleCameraToggle);
        }
        
        // Audio toggle
        if (this.elements.audioToggle) {
            this.elements.audioToggle.addEventListener('click', this.handleAudioToggle);
        }
        
        // Settings panel
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.addEventListener('change', this.handleSettingsChange);
        }
        
        // Settings button
        if (this.elements.settingsButton) {
            this.elements.settingsButton.addEventListener('click', this.handleSettingsClick);
        }
        
        // Close settings on overlay click
        if (this.elements.settingsOverlay) {
            this.elements.settingsOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsOverlay) {
                    this.closeSettings();
                }
            });
        }
    }

    /**
     * Initializes the notification system
     */
    initializeNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }

        // Add showNotification to window
        window.showNotification = (message, type = 'info') => {
            const container = document.getElementById('notificationContainer');
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            // Create notification content
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">
                        ${this.getNotificationIcon(type)}
                    </div>
                    <div class="notification-message">${message}</div>
                    <button class="notification-close" aria-label="Close notification">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            `;

            // Add to container
            container.appendChild(notification);

            // Add show class after a small delay for animation
            requestAnimationFrame(() => notification.classList.add('show'));

            // Add close button handler
            const closeButton = notification.querySelector('.notification-close');
            closeButton.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            });

            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        };
    }

    /**
     * Gets the appropriate icon for notification type
     * @param {string} type - Notification type (info, error, success)
     * @returns {string} SVG icon markup
     */
    getNotificationIcon(type) {
        const icons = {
            info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>`,
            error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>`,
            success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                     </svg>`
        };
        return icons[type] || icons.info;
    }

    /**
     * Updates the status message
     * @param {string} message - The message to display
     * @param {string} type - The type of message (info, error, success)
     */
    updateStatus(message, type = CONFIG.UI.STATUS_TYPES.INFO) {
        // Log to console as fallback
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Try to use notification system if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback to console for errors
            if (type === CONFIG.UI.STATUS_TYPES.ERROR) {
                console.error(message);
            }
        }
    }

    /**
     * Toggles the microphone state
     */
    async toggleMic() {
        if (this.isRecording) {
            this.updateStatus('Cannot toggle microphone while recording', CONFIG.UI.STATUS_TYPES.ERROR);
            return;
        }
        
        try {
            // Get the app instance to access the toggleCameraAudio method
            const app = document.querySelector('script[type="module"]').__app;
            if (!app) {
                throw new Error('Application instance not found');
            }

            await app.toggleCameraAudio();
            this.isCameraAudioEnabled = !this.isCameraAudioEnabled;
            
            // Update microphone button state if elements exist
            if (this.elements.micToggle) {
                const micIcon = this.elements.micToggle.querySelector('.mic-icon');
                const micOffIcon = this.elements.micToggle.querySelector('.mic-off-icon');
                
                if (micIcon && micOffIcon) {
                    if (this.isCameraAudioEnabled) {
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
            }
        } catch (error) {
            console.error('Error toggling microphone:', error);
            this.handleError(error);
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

        if (!this.isScreenPreviewing) {
            this.updateStatus('System audio is only available during screen sharing', CONFIG.UI.STATUS_TYPES.ERROR);
            return;
        }

        this.isSystemAudioEnabled = !this.isSystemAudioEnabled;
        
        // Update system audio button state if elements exist
        if (this.elements.systemAudioToggle) {
            const audioIcon = this.elements.systemAudioToggle.querySelector('.audio-icon');
            const audioOffIcon = this.elements.systemAudioToggle.querySelector('.audio-off-icon');
            
            if (audioIcon && audioOffIcon) {
                if (this.isSystemAudioEnabled) {
                    audioIcon.classList.remove('hidden');
                    audioOffIcon.classList.add('hidden');
                    this.elements.systemAudioToggle.classList.remove('toggle-inactive');
                    this.elements.systemAudioToggle.classList.add('toggle-active');
                    this.updateStatus('System audio enabled', CONFIG.UI.STATUS_TYPES.SUCCESS);
                } else {
                    audioIcon.classList.add('hidden');
                    audioOffIcon.classList.remove('hidden');
                    this.elements.systemAudioToggle.classList.remove('toggle-active');
                    this.elements.systemAudioToggle.classList.add('toggle-inactive');
                    this.updateStatus('System audio disabled', CONFIG.UI.STATUS_TYPES.INFO);
                }
            }
        }

        // Dispatch event for app to handle
        document.dispatchEvent(new CustomEvent('systemAudioStateChanged', {
            detail: { enabled: this.isSystemAudioEnabled }
        }));
    }

    /**
     * Toggles recording state
     */
    toggleRecording() {
        console.log('toggleRecording called');
        console.log('Current state:', {
            isScreenPreviewing: this.isScreenPreviewing,
            isCameraPreviewing: this.isCameraVideoEnabled,
            isRecording: this.isRecording
        });

        if (!this.isScreenPreviewing && !this.isCameraVideoEnabled) {
            console.log('No screen or camera preview active, cannot start recording');
            this.updateStatus('Please start screen preview or camera first', CONFIG.UI.STATUS_TYPES.ERROR);
            return;
        }

        if (!this.isRecording) {
            console.log('Starting countdown for recording');
            // Update button state immediately to prevent double-clicks
            this.isRecording = true;
            this.updateRecordingButtonState(true);
            document.dispatchEvent(new CustomEvent('startCountdown'));
            return;
        }

        console.log('Stopping recording');
        this.isRecording = false;
        this.updateRecordingButtonState(false);
        this.updateStatus('Recording stopped', CONFIG.UI.STATUS_TYPES.SUCCESS);

        // Get the current recording state from the app
        const app = document.querySelector('script[type="module"]').__app;
        const hasRecording = Boolean(app?.recorder?.recordedData?.length);

        this.updateButtonStates({
            isRecording: this.isRecording,
            hasRecording,
            isScreenPreviewing: this.isScreenPreviewing,
            isCameraPreviewing: this.isCameraVideoEnabled
        });

        console.log('Dispatching recordingStateChanged event');
        document.dispatchEvent(new CustomEvent('recordingStateChanged', {
            detail: { isRecording: this.isRecording }
        }));
    }

    /**
     * Updates the recording button state
     * @param {boolean} isRecording - Whether currently recording
     */
    updateRecordingButtonState(isRecording) {
        const recordButton = this.elements.recordButton;
        const recordIcon = recordButton.querySelector('.record-icon');
        const stopIcon = recordButton.querySelector('.stop-icon');

        if (isRecording) {
            recordButton.classList.add('active');
            recordButton.title = 'Stop Recording';
            recordIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
        } else {
            recordButton.classList.remove('active');
            recordButton.title = 'Start Recording';
            recordIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
        }
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
        recordButton.disabled = (!isScreenPreviewing && !isCameraPreviewing) || (isRecording && !this.isRecording);
        saveButton.disabled = !hasRecording;
        previewButton.disabled = isRecording;

        // Update save button title and style
        if (hasRecording) {
            saveButton.title = 'Save Recording';
            saveButton.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            saveButton.title = 'No recording available';
            saveButton.classList.add('opacity-50', 'cursor-not-allowed');
        }

        // Update audio toggle buttons
        micToggle.disabled = isRecording;
        systemAudioToggle.disabled = isRecording || !isScreenPreviewing; // Only enable system audio when screen sharing

        // Update recording button state
        this.updateRecordingButtonState(isRecording);

        // Update button styles for other buttons
        [recordButton, previewButton, micToggle, systemAudioToggle].forEach(button => {
            if (button.disabled) {
                button.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                button.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
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
     * Handles camera state changes
     * @param {CustomEvent} event - The camera state change event
     */
    handleCameraStateChange(event) {
        console.log('Camera state changed:', event.detail);
        
        const { videoEnabled, audioEnabled } = event.detail;
        
        // Only update if state actually changed
        if (this.isCameraVideoEnabled === videoEnabled && this.isCameraAudioEnabled === audioEnabled) {
            return;
        }

        // Track which states changed
        const videoChanged = this.isCameraVideoEnabled !== videoEnabled;
        const audioChanged = this.isCameraAudioEnabled !== audioEnabled;
        
        // Update camera states
        this.isCameraVideoEnabled = videoEnabled ?? false;
        this.isCameraAudioEnabled = audioEnabled ?? false;
        
        // Update UI state
        const state = {
            isRecording: this.isRecording,
            hasRecording: false, // This will be updated by the app when needed
            isScreenPreviewing: this.isScreenPreviewing,
            isCameraPreviewing: this.isCameraVideoEnabled
        };
        
        // Batch UI updates
        this.updateButtonStates(state);
        this.updatePreviewState(state.isScreenPreviewing, state.isCameraPreviewing);
        
        // Only show status messages for actual changes
        if (videoChanged) {
            const message = videoEnabled ? 'Camera preview enabled' : 'Camera preview disabled';
            const type = videoEnabled ? CONFIG.UI.STATUS_TYPES.SUCCESS : CONFIG.UI.STATUS_TYPES.INFO;
            this.updateStatus(message, type);
        }

        // Update microphone button state if elements exist and audio state changed
        if (audioChanged && this.elements.micToggle) {
            const micIcon = this.elements.micToggle.querySelector('.mic-icon');
            const micOffIcon = this.elements.micToggle.querySelector('.mic-off-icon');
            
            if (micIcon && micOffIcon) {
                if (this.isCameraAudioEnabled) {
                    micIcon.classList.remove('hidden');
                    micOffIcon.classList.add('hidden');
                    this.elements.micToggle.classList.remove('toggle-inactive');
                    this.elements.micToggle.classList.add('toggle-active');
                } else {
                    micIcon.classList.add('hidden');
                    micOffIcon.classList.remove('hidden');
                    this.elements.micToggle.classList.remove('toggle-active');
                    this.elements.micToggle.classList.add('toggle-inactive');
                }
            }
        }
    }

    /**
     * Updates the preview state
     * @param {boolean} isScreenPreviewing - Whether screen is being previewed
     * @param {boolean} isCameraPreviewing - Whether camera is being previewed
     */
    updatePreviewState(isScreenPreviewing, isCameraPreviewing) {
        // Only update if state actually changed
        if (this.isScreenPreviewing === isScreenPreviewing && 
            this.isCameraVideoEnabled === isCameraPreviewing) {
            return;
        }

        console.log('Updating preview state:', {
            isScreenPreviewing,
            isCameraPreviewing
        });

        this.isScreenPreviewing = isScreenPreviewing;
        this.isCameraVideoEnabled = isCameraPreviewing;

        // Update status message based on preview state
        // Only show message if both states are false (no preview active)
        // or if both states are true (both active)
        // Individual state changes are handled in their respective handlers
        if (!isScreenPreviewing && !isCameraPreviewing) {
            this.updateStatus('No preview active. Click "Preview Screen" to begin screen sharing or enable camera.', CONFIG.UI.STATUS_TYPES.INFO);
        } else if (isScreenPreviewing && isCameraPreviewing) {
            this.updateStatus('Screen and camera preview enabled. Ready to record.', CONFIG.UI.STATUS_TYPES.SUCCESS);
        }

        // Update button states
        const { previewButton, micToggle, systemAudioToggle } = this.elements;

        // Update preview button state
        if (isScreenPreviewing) {
            previewButton.classList.remove('toggle-inactive');
            previewButton.classList.add('toggle-active');
        } else {
            previewButton.classList.remove('toggle-active');
            previewButton.classList.add('toggle-inactive');
        }

        // Update audio toggle states
        micToggle.disabled = !isCameraPreviewing;
        systemAudioToggle.disabled = !isScreenPreviewing;

        // Update button styles
        [micToggle, systemAudioToggle].forEach(button => {
            if (button.disabled) {
                button.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                button.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    /**
     * Gets the current audio settings
     * @returns {Object} Audio settings
     */
    get audioSettings() {
        return { ...this._audioSettings };
    }

    /**
     * Updates audio settings
     * @param {Object} settings - New audio settings
     */
    updateAudioSettings(settings) {
        this._audioSettings = { ...this._audioSettings, ...settings };
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

    /**
     * Handles camera toggle button click
     */
    handleCameraToggle() {
        const isCurrentlyActive = this.elements.cameraToggle.classList.contains('toggle-active');
        document.dispatchEvent(new CustomEvent('cameraStateChanged', {
            detail: {
                videoEnabled: !isCurrentlyActive,
                audioEnabled: this.audioSettings.includeMic
            }
        }));
    }

    /**
     * Handles audio toggle button click
     */
    handleAudioToggle() {
        const isCurrentlyActive = this.elements.audioToggle.classList.contains('toggle-active');
        this.updateAudioSettings({ includeMic: !isCurrentlyActive });
        
        document.dispatchEvent(new CustomEvent('cameraStateChanged', {
            detail: {
                videoEnabled: this.elements.cameraToggle.classList.contains('toggle-active'),
                audioEnabled: !isCurrentlyActive
            }
        }));

        // Update UI
        this.elements.audioToggle.classList.toggle('toggle-active', !isCurrentlyActive);
        this.elements.audioToggle.classList.toggle('toggle-inactive', isCurrentlyActive);
    }

    /**
     * Handles settings panel changes
     * @param {Event} event - The change event
     */
    handleSettingsChange(event) {
        const target = event.target;
        
        if (target.name === 'systemAudio') {
            this.updateAudioSettings({ includeSystemAudio: target.checked });
        } else if (target.name === 'micAudio') {
            this.updateAudioSettings({ includeMic: target.checked });
            // Update audio toggle button state
            this.elements.audioToggle.classList.toggle('toggle-active', target.checked);
            this.elements.audioToggle.classList.toggle('toggle-inactive', !target.checked);
        }

        // Dispatch settings change event
        document.dispatchEvent(new CustomEvent('settingsChange', {
            detail: { ...this._audioSettings }
        }));
    }

    /**
     * Shows the settings panel
     */
    showSettings() {
        if (this.elements.settingsPanel && this.elements.settingsOverlay) {
            this.elements.settingsPanel.classList.remove('hidden');
            this.elements.settingsOverlay.classList.remove('hidden');
        }
    }

    /**
     * Closes the settings panel
     */
    closeSettings() {
        if (this.elements.settingsPanel && this.elements.settingsOverlay) {
            this.elements.settingsPanel.classList.add('hidden');
            this.elements.settingsOverlay.classList.add('hidden');
        }
    }

    /**
     * Handles settings button click
     */
    handleSettingsClick = () => {
        if (this.elements.settingsPanel?.classList.contains('hidden')) {
            this.showSettings();
        } else {
            this.closeSettings();
        }
    }

    /**
     * Cleans up resources when the UI manager is destroyed
     */
    cleanup() {
        // Remove event listeners
        if (this.elements.cameraToggle) {
            this.elements.cameraToggle.removeEventListener('click', this.handleCameraToggle);
        }
        if (this.elements.audioToggle) {
            this.elements.audioToggle.removeEventListener('click', this.handleAudioToggle);
        }
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.removeEventListener('change', this.handleSettingsChange);
        }
        if (this.elements.settingsButton) {
            this.elements.settingsButton.removeEventListener('click', this.handleSettingsClick);
        }
        if (this.elements.settingsOverlay) {
            this.elements.settingsOverlay.removeEventListener('click', this.closeSettings);
            this.elements.settingsOverlay.remove(); // Remove the overlay element from the DOM
        }
    }
} 