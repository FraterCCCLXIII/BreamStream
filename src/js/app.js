import { CONFIG } from './config.js';
import { CanvasManager } from './canvas.js';
import { Recorder } from './recorder.js';
import { UIManager } from './ui.js';
import { Countdown } from './components/Countdown.js';
import { checkBrowserSupport } from './utils.js';

/**
 * Main application class that coordinates all components
 */
export class ScreenRecorderApp {
    /**
     * Initializes the application
     */
    constructor() {
        // Check browser support
        if (!checkBrowserSupport()) {
            throw new Error('Your browser does not support the required features for screen recording.');
        }

        // Initialize elements
        this.elements = {
            canvas: document.getElementById('mainCanvas'),
            screenVideo: document.getElementById('screenSource'),
            cameraVideo: document.getElementById('cameraSource'),
            recordButton: document.getElementById('recordButton'),
            saveButton: document.getElementById('saveButton'),
            previewButton: document.getElementById('previewScreenButton'),
            micToggle: document.getElementById('micAudioToggle'),
            systemAudioToggle: document.getElementById('systemAudioToggle'),
            settingsButton: document.getElementById('settingsButton')
        };

        // Initialize video elements
        this.elements.screenVideo.muted = true;
        this.elements.cameraVideo.muted = true;
        this.elements.screenVideo.style.display = 'block';
        this.elements.cameraVideo.style.display = 'block';

        // Initialize components
        this.canvasManager = new CanvasManager(
            this.elements.canvas,
            this.elements.screenVideo,
            this.elements.cameraVideo
        );
        this.recorder = new Recorder(
            this.elements.canvas,
            this.elements.screenVideo,
            this.elements.cameraVideo
        );
        this.ui = new UIManager(this.elements);
        this.countdown = new Countdown({
            onComplete: () => {
                // Start recording when countdown completes
                document.dispatchEvent(new CustomEvent('recordingStateChanged', {
                    detail: { isRecording: true }
                }));
            }
        });

        // Initialize settings
        this.settings = {
            dropShadow: true,
            stroke: true,
            strokeWidth: 2,
            strokeColor: '#FFFFFF',
            pulseEffect: false
        };

        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.startScreenPreview = this.startScreenPreview.bind(this);
        this.startCameraPreview = this.startCameraPreview.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleSettingsChange = this.handleSettingsChange.bind(this);
        this.handleRecordingStateChange = this.handleRecordingStateChange.bind(this);
        this.handleCameraStateChange = this.handleCameraStateChange.bind(this);

        // Set up event listeners
        this.elements.previewButton.addEventListener('click', this.startScreenPreview);
        this.elements.settingsButton.addEventListener('click', this.handleSettingsClick);
        document.addEventListener('recordingStateChanged', this.handleRecordingStateChange);
        document.addEventListener('settingsChange', this.handleSettingsChange);
        document.addEventListener('cameraStateChanged', this.handleCameraStateChange);
        document.addEventListener('startCountdown', () => {
            this.countdown.start();
        });

        // Initialize settings UI
        this.initializeSettingsUI();

        // Start camera preview by default
        this.startCameraPreview();
    }

    /**
     * Initializes the settings UI with current values
     */
    initializeSettingsUI() {
        const dropShadowToggle = document.getElementById('dropShadowToggle');
        const strokeToggle = document.getElementById('strokeToggle');
        const strokeWidth = document.getElementById('strokeWidth');
        const strokeColor = document.getElementById('strokeColor');
        const pulseEffectToggle = document.getElementById('pulseEffectToggle');

        // Set initial values
        dropShadowToggle.checked = this.settings.dropShadow;
        strokeToggle.checked = this.settings.stroke;
        strokeWidth.value = this.settings.strokeWidth;
        strokeColor.value = this.settings.strokeColor;
        pulseEffectToggle.checked = this.settings.pulseEffect;

        // Update stroke options visibility
        const updateStrokeOptions = () => {
            const isEnabled = strokeToggle.checked;
            document.getElementById('strokeWidthContainer').style.display = isEnabled ? 'block' : 'none';
            document.getElementById('strokeColorContainer').style.display = isEnabled ? 'block' : 'none';
        };
        updateStrokeOptions();
    }

    /**
     * Handles settings button click
     * @param {Event} e - The click event
     */
    handleSettingsClick(e) {
        e.stopPropagation();
        const settingsPopover = document.getElementById('settingsPopover');
        settingsPopover.classList.toggle('hidden');
    }

    /**
     * Handles settings changes
     * @param {CustomEvent} event - The settings change event
     */
    handleSettingsChange(event) {
        const { setting, value } = event.detail;
        this.settings[setting] = value;
        this.canvasManager.updateEffects(this.settings);
    }

    /**
     * Handles recording state changes
     * @param {CustomEvent} event - The recording state change event
     */
    async handleRecordingStateChange(event) {
        console.log('Recording state change event received:', event.detail);
        try {
            if (event.detail.isRecording) {
                console.log('Starting recording...');
                await this.startRecording();
            } else {
                console.log('Stopping recording...');
                await this.stopRecording();
            }
        } catch (error) {
            console.error('Error in handleRecordingStateChange:', error);
            this.handleError(error);
        }
    }

    /**
     * Starts recording
     */
    async startRecording() {
        console.log('startRecording called');
        try {
            this.ui.setLoading(true);
            const { includeMic, includeSystemAudio } = this.ui.audioSettings;
            console.log('Audio settings:', { includeMic, includeSystemAudio });
            
            if (!this.screenStream) {
                throw new Error('No screen stream available');
            }
            console.log('Screen stream available:', !!this.screenStream);
            console.log('Camera stream available:', !!this.cameraStream);
            
            await this.recorder.startRecording({
                screenStream: this.screenStream,
                cameraStream: this.cameraStream,
                includeMic,
                includeSystemAudio
            });

            console.log('Recording started successfully');
            this.ui.updateStatus('Recording started', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } catch (error) {
            console.error('Error in startRecording:', error);
            this.handleError(error);
        } finally {
            this.ui.setLoading(false);
        }
    }

    /**
     * Stops recording
     */
    async stopRecording() {
        try {
            this.ui.setLoading(true);
            await this.recorder.stopRecording();
            this.ui.updateStatus('Recording stopped', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.ui.setLoading(false);
        }
    }

    /**
     * Starts the screen preview
     */
    async startScreenPreview() {
        console.log('startScreenPreview called');
        try {
            this.ui.setLoading(true);
            const { includeSystemAudio } = this.ui.audioSettings;
            console.log('System audio enabled:', includeSystemAudio);
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: CONFIG.MEDIA.VIDEO_CONSTRAINTS,
                audio: includeSystemAudio
            });
            console.log('Screen stream obtained:', !!stream);

            this.screenStream = stream;
            this.elements.screenVideo.srcObject = stream;
            await this.elements.screenVideo.play();
            console.log('Screen video playing:', this.elements.screenVideo.readyState);
            
            this.elements.screenVideo.style.display = 'block';
            this.canvasManager.updateCanvasDimensions();
            this.canvasManager.startDrawing();
            this.updateUIState();
            
            stream.getVideoTracks()[0].onended = () => {
                console.log('Screen sharing ended');
                this.screenStream = null;
                this.elements.screenVideo.srcObject = null;
                this.updateUIState();
            };
        } catch (error) {
            console.error('Error in startScreenPreview:', error);
            this.handleError(error);
        } finally {
            this.ui.setLoading(false);
        }
    }

    /**
     * Starts the camera preview
     */
    async startCameraPreview() {
        console.log('startCameraPreview called');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            console.log('Camera stream obtained:', !!stream);

            this.cameraStream = stream;
            this.elements.cameraVideo.srcObject = stream;
            await this.elements.cameraVideo.play();
            console.log('Camera video playing:', this.elements.cameraVideo.readyState);
            
            this.elements.cameraVideo.style.display = 'block';
            this.canvasManager.updateCanvasDimensions();
            this.canvasManager.startDrawing();
            this.updateUIState();
        } catch (error) {
            console.error('Error in startCameraPreview:', error);
            this.handleError(error);
            document.dispatchEvent(new CustomEvent('cameraStateChanged', {
                detail: { enabled: false }
            }));
        } finally {
            this.ui.setLoading(false);
        }
    }

    /**
     * Updates the UI state based on current application state
     */
    updateUIState() {
        const state = {
            isRecording: this.recorder.isCurrentlyRecording,
            hasRecording: this.recorder.recordedData.length > 0,
            isScreenPreviewing: !!this.elements.screenVideo.srcObject,
            isCameraPreviewing: !!this.elements.cameraVideo.srcObject
        };

        this.ui.updateButtonStates(state);
        this.ui.updatePreviewState(state.isScreenPreviewing, state.isCameraPreviewing);
    }

    /**
     * Handles errors by updating the UI
     * @param {Error} error - The error to handle
     */
    handleError(error) {
        console.error('Application error:', error);
        this.ui.handleError(error);
        this.updateUIState();
    }

    /**
     * Cleans up resources when the application is destroyed
     */
    cleanup() {
        this.canvasManager.cleanup();
        this.recorder.cleanup();
        this.ui.cleanup();
        this.countdown.cleanup();
        
        // Stop all tracks
        if (this.elements.screenVideo.srcObject) {
            this.elements.screenVideo.srcObject.getTracks().forEach(track => track.stop());
        }
        if (this.elements.cameraVideo.srcObject) {
            this.elements.cameraVideo.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Remove event listeners
        this.elements.previewButton.removeEventListener('click', this.startScreenPreview);
        this.elements.settingsButton.removeEventListener('click', this.handleSettingsClick);
        document.removeEventListener('recordingStateChanged', this.handleRecordingStateChange);
        document.removeEventListener('settingsChange', this.handleSettingsChange);
        document.removeEventListener('cameraStateChanged', this.handleCameraStateChange);
    }

    /**
     * Handles camera state changes
     * @param {CustomEvent} event - The camera state change event
     */
    async handleCameraStateChange(event) {
        try {
            if (event.detail.enabled) {
                await this.startCameraPreview();
            } else {
                if (this.cameraStream) {
                    this.cameraStream.getTracks().forEach(track => track.stop());
                    this.cameraStream = null;
                    this.elements.cameraVideo.srcObject = null;
                    this.updateUIState();
                }
            }
        } catch (error) {
            this.handleError(error);
            // Reset camera toggle state if there was an error
            document.dispatchEvent(new CustomEvent('cameraStateChanged', {
                detail: { enabled: false }
            }));
        }
    }

    /**
     * Saves the recorded video
     * @returns {Promise<void>}
     */
    async saveRecording() {
        try {
            this.ui.setLoading(true);
            if (!this.recorder.recordedData || this.recorder.recordedData.length === 0) {
                throw new Error('No recording data available to save');
            }

            const blob = new Blob(this.recorder.recordedData, { type: CONFIG.MEDIA.RECORDING_MIME_TYPE });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${new Date().toISOString()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.ui.updateStatus('Recording saved successfully', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } catch (error) {
            console.error('Error saving recording:', error);
            this.handleError(error);
        } finally {
            this.ui.setLoading(false);
        }
    }
} 