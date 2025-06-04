import { CONFIG } from './config.js';
import { stopMediaStream, generateRecordingFilename, downloadBlob } from './utils.js';

/**
 * Manages screen and camera recording
 */
export class Recorder {
    /**
     * @param {HTMLCanvasElement} canvas - The canvas element to record
     * @param {HTMLVideoElement} screenVideo - The screen video element
     * @param {HTMLVideoElement} cameraVideo - The camera video element
     */
    constructor(canvas, screenVideo, cameraVideo) {
        this.canvas = canvas;
        this.screenVideo = screenVideo;
        this.cameraVideo = cameraVideo;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.screenStream = null;
        this.cameraVideoStream = null;
        this.cameraAudioStream = null;
        this.isRecording = false;

        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.saveRecording = this.saveRecording.bind(this);
        this.handleDataAvailable = this.handleDataAvailable.bind(this);
    }

    /**
     * Starts the recording
     * @param {MediaStream} screenStream - The screen capture stream
     * @param {MediaStream} cameraVideoStream - The camera video stream
     * @param {MediaStream} cameraAudioStream - The camera audio stream
     * @param {Object} [audioSettings] - Audio settings
     * @param {boolean} [audioSettings.includeMic] - Whether to include microphone audio
     * @param {boolean} [audioSettings.includeSystemAudio] - Whether to include system audio
     * @returns {Promise<void>}
     */
    async startRecording(screenStream, cameraVideoStream, cameraAudioStream, audioSettings = { includeMic: true, includeSystemAudio: true }) {
        if (this.isRecording) return;

        try {
            this.screenStream = screenStream;
            this.cameraVideoStream = cameraVideoStream;
            this.cameraAudioStream = cameraAudioStream;

            // Create canvas stream
            const canvasStream = this.canvas.captureStream(30); // 30 FPS

            // Add audio tracks based on settings
            if (audioSettings.includeMic && this.cameraAudioStream) {
                const micTrack = this.cameraAudioStream.getAudioTracks()[0];
                if (micTrack) {
                    canvasStream.addTrack(micTrack);
                }
            }

            if (audioSettings.includeSystemAudio && this.screenStream) {
                const systemAudioTrack = this.screenStream.getAudioTracks()[0];
                if (systemAudioTrack) {
                    canvasStream.addTrack(systemAudioTrack);
                }
            }

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(canvasStream, {
                mimeType: CONFIG.MEDIA.RECORDING_MIME_TYPE,
                videoBitsPerSecond: CONFIG.MEDIA.RECORDING_BITS_PER_SECOND
            });

            // Set up event handlers
            this.mediaRecorder.ondataavailable = this.handleDataAvailable;
            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                this.cleanup();
            };

            // Start recording
            this.recordedChunks = [];
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;

            // Handle screen sharing end
            if (this.screenStream) {
                this.screenStream.getVideoTracks()[0].onended = () => {
                    if (this.isRecording) {
                        this.stopRecording();
                    }
                };
            }

        } catch (error) {
            this.cleanup();
            throw new Error(`Failed to start recording: ${error.message}`);
        }
    }

    /**
     * Stops the recording
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        try {
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        } catch (error) {
            this.cleanup();
            throw new Error(`Failed to stop recording: ${error.message}`);
        }
    }

    /**
     * Saves the recorded video
     */
    saveRecording() {
        if (this.recordedChunks.length === 0) {
            throw new Error('No recording data available');
        }

        try {
            const blob = new Blob(this.recordedChunks, {
                type: CONFIG.MEDIA.RECORDING_MIME_TYPE
            });
            const filename = generateRecordingFilename();
            downloadBlob(blob, filename);
        } catch (error) {
            throw new Error(`Failed to save recording: ${error.message}`);
        }
    }

    /**
     * Handles data available event from MediaRecorder
     * @param {BlobEvent} event - The data available event
     */
    handleDataAvailable(event) {
        if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
        }
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
            } catch (error) {
                console.error('Error stopping media recorder:', error);
            }
        }

        // Stop all tracks
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        if (this.cameraVideoStream) {
            this.cameraVideoStream.getTracks().forEach(track => track.stop());
            this.cameraVideoStream = null;
        }
        if (this.cameraAudioStream) {
            this.cameraAudioStream.getTracks().forEach(track => track.stop());
            this.cameraAudioStream = null;
        }

        this.mediaRecorder = null;
        this.isRecording = false;
    }

    /**
     * Gets the current recording state
     * @returns {boolean} Whether currently recording
     */
    get isCurrentlyRecording() {
        return this.isRecording;
    }

    /**
     * Gets the recorded chunks
     * @returns {Blob[]} Array of recorded chunks
     */
    get recordedData() {
        return [...this.recordedChunks];
    }
} 