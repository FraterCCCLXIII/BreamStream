import { CONFIG } from './config.js';
import { CanvasManager } from './canvas.js';
import { Recorder } from './recorder.js';
import { UIManager } from './ui.js';
import { Navigation } from './components/Navigation.js';
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

        // Get DOM elements
        this.elements = {
            canvas: document.getElementById('mainCanvas'),
            screenVideo: document.getElementById('screenSource'),
            cameraVideo: document.getElementById('cameraSource'),
            startButton: document.getElementById('startButton'),
            stopButton: document.getElementById('stopButton'),
            saveButton: document.getElementById('saveButton'),
            previewButton: document.getElementById('previewScreenButton'),
            micToggle: document.getElementById('micAudioToggle'),
            systemAudioToggle: document.getElementById('systemAudioToggle'),
            statusMessage: document.getElementById('statusMessage')
        };

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

        this.uiManager = new UIManager(this.elements);

        // Initialize navigation with settings callback
        this.navigation = new Navigation({
            onSettingsChange: (settings) => {
                this.canvasManager.updateEffects(settings);
            }
        });

        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.saveRecording = this.saveRecording.bind(this);
        this.startScreenPreview = this.startScreenPreview.bind(this);
        this.startCameraPreview = this.startCameraPreview.bind(this);
        this.handleError = this.handleError.bind(this);

        // Set up event listeners
        this.setupEventListeners();

        // Start camera preview by default
        this.startCameraPreview();
    }

    /**
     * Sets up event listeners for UI elements
     */
    setupEventListeners() {
        this.elements.startButton.addEventListener('click', this.startRecording);
        this.elements.stopButton.addEventListener('click', this.stopRecording);
        this.elements.saveButton.addEventListener('click', this.saveRecording);
        this.elements.previewButton.addEventListener('click', this.startScreenPreview);
    }

    /**
     * Starts the recording process
     */
    async startRecording() {
        try {
            this.uiManager.setLoading(true);
            const { includeMic, includeSystemAudio } = this.uiManager.audioSettings;
            
            await this.recorder.startRecording(includeMic, includeSystemAudio);
            this.updateUIState();
            
            this.uiManager.updateStatus('Recording in progress...', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    /**
     * Stops the recording process
     */
    async stopRecording() {
        try {
            this.uiManager.setLoading(true);
            this.recorder.stopRecording();
            this.updateUIState();
            
            this.uiManager.updateStatus('Recording stopped. Click "Save Recording" to download.', CONFIG.UI.STATUS_TYPES.INFO);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    /**
     * Saves the recorded video
     */
    async saveRecording() {
        try {
            this.uiManager.setLoading(true);
            this.recorder.saveRecording();
            this.updateUIState();
            
            this.uiManager.updateStatus('Recording saved successfully!', CONFIG.UI.STATUS_TYPES.SUCCESS);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    /**
     * Starts the screen preview
     */
    async startScreenPreview() {
        try {
            this.uiManager.setLoading(true);
            const { includeSystemAudio } = this.uiManager.audioSettings;
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: CONFIG.MEDIA.VIDEO_CONSTRAINTS,
                audio: includeSystemAudio
            });

            this.elements.screenVideo.srcObject = stream;
            await this.elements.screenVideo.play();
            
            this.canvasManager.startDrawing();
            this.updateUIState();
            
            // Handle screen sharing end
            stream.getVideoTracks()[0].onended = () => {
                this.elements.screenVideo.srcObject = null;
                this.updateUIState();
            };
        } catch (error) {
            this.handleError(error);
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    /**
     * Starts the camera preview
     */
    async startCameraPreview() {
        try {
            this.uiManager.setLoading(true);
            const { includeMic } = this.uiManager.audioSettings;
            
            const stream = await navigator.mediaDevices.getUserMedia({
                ...CONFIG.MEDIA.CAMERA_CONSTRAINTS,
                audio: includeMic
            });

            this.elements.cameraVideo.srcObject = stream;
            await this.elements.cameraVideo.play();
            
            this.canvasManager.startDrawing();
            this.updateUIState();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.uiManager.setLoading(false);
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

        this.uiManager.updateButtonStates(state);
        this.uiManager.updatePreviewState(state.isScreenPreviewing, state.isCameraPreviewing);
    }

    /**
     * Handles errors by updating the UI
     * @param {Error} error - The error to handle
     */
    handleError(error) {
        this.uiManager.handleError(error);
        this.updateUIState();
    }

    /**
     * Cleans up resources when the application is destroyed
     */
    cleanup() {
        this.canvasManager.cleanup();
        this.recorder.cleanup();
        this.navigation.cleanup();
        
        // Remove event listeners
        this.elements.startButton.removeEventListener('click', this.startRecording);
        this.elements.stopButton.removeEventListener('click', this.stopRecording);
        this.elements.saveButton.removeEventListener('click', this.saveRecording);
        this.elements.previewButton.removeEventListener('click', this.startScreenPreview);
    }
} 