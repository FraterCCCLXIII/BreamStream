import { CONFIG } from './config.js';
import { CanvasManager } from './canvas.js';
import { Recorder } from './recorder.js';
import { UIManager } from './ui.js';
import { Countdown } from './components/Countdown.js';
import { checkBrowserSupport } from './utils.js';
import { Navigation } from './components/Navigation.js';
import { CameraOverlay } from './components/CameraOverlay.js';

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
            settingsButton: document.getElementById('settingsButton'),
            cameraToggle: document.getElementById('cameraToggle'),
            audioToggle: document.getElementById('systemAudioToggle'), // Using systemAudioToggle as audioToggle
            settingsPanel: document.getElementById('settingsPopover'),
            settingsOverlay: document.createElement('div') // Create a settings overlay element
        };

        // Initialize settings overlay
        this.elements.settingsOverlay.id = 'settingsOverlay';
        this.elements.settingsOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden';
        document.body.appendChild(this.elements.settingsOverlay);

        // Initialize video elements
        this.elements.screenVideo.muted = true;
        this.elements.cameraVideo.muted = true;
        
        // Ensure video elements start in inactive state
        this.elements.screenVideo.classList.remove('active');
        this.elements.cameraVideo.classList.remove('active');
        this.elements.screenVideo.style.display = 'none';
        this.elements.cameraVideo.style.display = 'none';

        // Set initial state of screen share button to inactive
        this.elements.previewButton.classList.add('toggle-inactive');
        this.elements.previewButton.classList.remove('toggle-active');

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
        this.navigation = new Navigation();
        this.cameraOverlay = new CameraOverlay(this.canvasManager);

        // Initialize settings
        this.settings = {
            dropShadow: true,
            stroke: true,
            strokeWidth: 2,
            strokeColor: '#FFFFFF',
            pulseEffect: false
        };

        // Initialize state with explicit defaults
        this.state = {
            screenStream: null,
            cameraVideoStream: null,
            cameraAudioStream: null,
            isScreenPreviewing: false,
            isCameraVideoEnabled: false,
            isCameraAudioEnabled: false,
            isRecording: false,
            hasRecording: false
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
        this.saveRecording = this.saveRecording.bind(this);
        this.updateState = this.updateState.bind(this);
        this.cleanupStreams = this.cleanupStreams.bind(this);

        // Set up event listeners
        this.setupEventListeners();

        // Initialize settings UI
        this.initializeSettingsUI();

        // Initialize UI state with no active previews
        this.updateUIState();
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
        if (!settingsPopover) {
            console.error('Settings popover element not found');
            return;
        }
        
        // Toggle popover visibility - click outside handling is now managed by Navigation class
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
            
            // Check if we have either screen or camera stream
            if (!this.state.screenStream && !this.state.cameraVideoStream) {
                throw new Error('No screen or camera stream available');
            }
            console.log('Screen stream available:', !!this.state.screenStream);
            console.log('Camera video stream available:', !!this.state.cameraVideoStream);
            console.log('Camera audio stream available:', !!this.state.cameraAudioStream);
            
            // Pass streams and audio settings
            await this.recorder.startRecording(
                this.state.screenStream,
                this.state.cameraVideoStream,
                this.state.cameraAudioStream,
                { includeMic, includeSystemAudio }
            );

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
     * Updates application state and propagates changes
     * @param {Partial<AppState>} newState - Partial state update
     */
    updateState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };

        // Determine if we need to update streams
        const streamsChanged = 
            oldState.screenStream !== this.state.screenStream ||
            oldState.cameraVideoStream !== this.state.cameraVideoStream ||
            oldState.cameraAudioStream !== this.state.cameraAudioStream;

        // Update canvas view mode if streams changed
        if (streamsChanged) {
            this.canvasManager.updateViewMode(
                !!this.state.screenStream,
                !!this.state.cameraVideoStream
            );
        }

        // Update UI state
        this.ui.updateButtonStates({
            isRecording: this.state.isRecording,
            hasRecording: this.state.hasRecording,
            isScreenPreviewing: !!this.state.screenStream,
            isCameraPreviewing: this.state.isCameraVideoEnabled
        });

        this.ui.updatePreviewState(
            !!this.state.screenStream,
            this.state.isCameraVideoEnabled
        );
    }

    /**
     * Cleans up all media streams
     * @param {string[]} streamsToClean - Array of stream types to clean ('screen', 'cameraVideo', 'cameraAudio')
     */
    async cleanupStreams(streamsToClean = ['screen', 'cameraVideo', 'cameraAudio']) {
        const cleanup = {
            screen: () => {
                if (this.state.screenStream) {
                    this.state.screenStream.getTracks().forEach(track => track.stop());
                    this.elements.screenVideo.srcObject = null;
                    this.elements.screenVideo.classList.remove('active');
                    this.state.screenStream = null;
                }
            },
            cameraVideo: () => {
                if (this.state.cameraVideoStream) {
                    this.state.cameraVideoStream.getTracks().forEach(track => track.stop());
                    this.elements.cameraVideo.srcObject = null;
                    this.elements.cameraVideo.classList.remove('active');
                    this.state.cameraVideoStream = null;
                    this.state.isCameraVideoEnabled = false;
                }
            },
            cameraAudio: () => {
                if (this.state.cameraAudioStream) {
                    this.state.cameraAudioStream.getTracks().forEach(track => track.stop());
                    this.state.cameraAudioStream = null;
                    this.state.isCameraAudioEnabled = false;
                }
            }
        };

        streamsToClean.forEach(streamType => cleanup[streamType]?.());
        this.updateState({});
    }

    /**
     * Sets up event listeners with proper cleanup
     */
    setupEventListeners() {
        // Remove any existing listeners
        this.cleanup();

        // Add new listeners
        this.elements.previewButton.addEventListener('click', this.startScreenPreview);
        this.elements.settingsButton.addEventListener('click', this.handleSettingsClick);
        this.elements.saveButton.addEventListener('click', this.saveRecording);
        
        document.addEventListener('recordingStateChanged', this.handleRecordingStateChange);
        document.addEventListener('settingsChange', this.handleSettingsChange);
        document.addEventListener('cameraStateChanged', this.handleCameraStateChange);
        document.addEventListener('startCountdown', () => this.countdown.start());

        // Handle window unload
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    /**
     * Starts the screen preview
     */
    async startScreenPreview() {
        console.log('startScreenPreview called');
        try {
            this.ui.setLoading(true);

            // If screen is already active, stop it
            if (this.state.screenStream) {
                await this.cleanupStreams(['screen']);
                this.updateState({ isScreenPreviewing: false });
                return;
            }

            // Request new screen stream
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: CONFIG.MEDIA.VIDEO_CONSTRAINTS,
                audio: this.ui.audioSettings.includeSystemAudio
            });

            // Set up stream
            this.elements.screenVideo.srcObject = stream;
            await this.elements.screenVideo.play();
            this.elements.screenVideo.classList.add('active');

            // Update state
            this.updateState({
                screenStream: stream,
                isScreenPreviewing: true
            });

            // Handle stream end
            stream.getVideoTracks()[0].onended = () => {
                this.cleanupStreams(['screen']);
                this.updateState({ isScreenPreviewing: false });
            };

        } catch (error) {
            console.error('Error in startScreenPreview:', error);
            this.handleError(error);
            await this.cleanupStreams(['screen']);
            this.updateState({ isScreenPreviewing: false });
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
            this.ui.setLoading(true);

            // If camera is already active, stop it
            if (this.state.cameraVideoStream) {
                await this.cleanupStreams(['cameraVideo']);
                this.updateState({ isCameraVideoEnabled: false });
                return;
            }

            // Request new camera stream with better error handling
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    },
                    audio: false
                });

                // Set up stream
                this.elements.cameraVideo.srcObject = stream;
                await this.elements.cameraVideo.play();
                
                // Only add active class if we have a valid stream
                if (stream.getVideoTracks().length > 0) {
                    this.elements.cameraVideo.classList.add('active');
                    this.elements.cameraVideo.style.display = 'block';
                }

                // Update state and view mode
                this.updateState({
                    cameraVideoStream: stream,
                    isCameraVideoEnabled: true
                });

                // Ensure canvas manager updates view mode
                this.canvasManager.updateViewMode(
                    !!this.state.screenStream,
                    true
                );

                // Show success notification
                this.ui.updateStatus('Camera enabled', CONFIG.UI.STATUS_TYPES.SUCCESS);

            } catch (error) {
                // Handle specific permission errors
                if (error.name === 'NotAllowedError') {
                    throw new Error(CONFIG.ERROR_MESSAGES.CAMERA_PERMISSION);
                } else if (error.name === 'NotFoundError') {
                    throw new Error('No camera device found. Please connect a camera and try again.');
                } else if (error.name === 'NotReadableError') {
                    throw new Error('Camera is in use by another application. Please close other applications using the camera and try again.');
                } else {
                    throw new Error(`Failed to access camera: ${error.message}`);
                }
            }

        } catch (error) {
            console.error('Error in startCameraPreview:', error);
            this.handleError(error);
            await this.cleanupStreams(['cameraVideo']);
            this.updateState({ isCameraVideoEnabled: false });
            
            // Reset camera toggle button state
            const cameraToggle = this.elements.cameraToggle;
            const cameraIcon = cameraToggle.querySelector('.camera-icon');
            const cameraOffIcon = cameraToggle.querySelector('.camera-off-icon');
            
            cameraIcon.classList.add('hidden');
            cameraOffIcon.classList.remove('hidden');
            cameraToggle.classList.remove('toggle-active');
            cameraToggle.classList.add('toggle-inactive');
        } finally {
            this.ui.setLoading(false);
        }
    }

    /**
     * Handles camera state changes
     */
    async handleCameraStateChange(event) {
        console.log('App handling camera state change:', event.detail);
        try {
            const { videoEnabled, audioEnabled } = event.detail;
            
            // Track if any changes were made
            let stateChanged = false;
            const newState = {};

            // Handle video state
            if (videoEnabled && !this.state.cameraVideoStream) {
                await this.startCameraPreview();
                stateChanged = true;
                newState.isCameraVideoEnabled = true;
            } else if (!videoEnabled && this.state.cameraVideoStream) {
                await this.cleanupStreams(['cameraVideo']);
                stateChanged = true;
                newState.isCameraVideoEnabled = false;
            }

            // Handle audio state
            if (audioEnabled && !this.state.cameraAudioStream) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });
                stateChanged = true;
                newState.cameraAudioStream = stream;
                newState.isCameraAudioEnabled = true;
            } else if (!audioEnabled && this.state.cameraAudioStream) {
                await this.cleanupStreams(['cameraAudio']);
                stateChanged = true;
                newState.cameraAudioStream = null;
                newState.isCameraAudioEnabled = false;
            }

            // Only update state if changes were made
            if (stateChanged) {
                this.updateState(newState);
            }

        } catch (error) {
            console.error('Error handling camera state change:', error);
            this.handleError(error);
            await this.cleanupStreams(['cameraVideo', 'cameraAudio']);
            this.updateState({
                cameraVideoStream: null,
                cameraAudioStream: null,
                isCameraVideoEnabled: false,
                isCameraAudioEnabled: false
            });
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
            isCameraPreviewing: this.state.isCameraVideoEnabled
        };

        // Update canvas view mode
        this.canvasManager.updateViewMode(state.isScreenPreviewing, state.isCameraPreviewing);

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
        if (this.state.screenStream) {
            this.state.screenStream.getTracks().forEach(track => track.stop());
        }
        if (this.state.cameraVideoStream) {
            this.state.cameraVideoStream.getTracks().forEach(track => track.stop());
        }
        if (this.state.cameraAudioStream) {
            this.state.cameraAudioStream.getTracks().forEach(track => track.stop());
        }
        
        // Remove event listeners
        this.elements.previewButton.removeEventListener('click', this.startScreenPreview);
        this.elements.settingsButton.removeEventListener('click', this.handleSettingsClick);
        this.elements.saveButton.removeEventListener('click', this.saveRecording);
        document.removeEventListener('recordingStateChanged', this.handleRecordingStateChange);
        document.removeEventListener('settingsChange', this.handleSettingsChange);
        document.removeEventListener('cameraStateChanged', this.handleCameraStateChange);
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