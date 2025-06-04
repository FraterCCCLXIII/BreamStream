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
        this.cameraStream = null;
        this.isRecording = false;

        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.saveRecording = this.saveRecording.bind(this);
        this.handleDataAvailable = this.handleDataAvailable.bind(this);
    }

    /**
     * Starts the recording
     * @param {boolean} includeMic - Whether to include microphone audio
     * @param {boolean} includeSystemAudio - Whether to include system audio
     * @returns {Promise<void>}
     */
    async startRecording(includeMic, includeSystemAudio) {
        if (this.isRecording) return;

        try {
            // Get screen stream
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: CONFIG.MEDIA.VIDEO_CONSTRAINTS,
                audio: includeSystemAudio
            });

            // Get camera stream if needed
            if (this.cameraVideo.srcObject) {
                this.cameraStream = this.cameraVideo.srcObject;
            }

            // Create canvas stream
            const canvasStream = this.canvas.captureStream(30); // 30 FPS

            // Combine audio tracks if needed
            const audioTracks = [];
            if (includeMic && this.cameraStream) {
                const micTrack = this.cameraStream.getAudioTracks()[0];
                if (micTrack) audioTracks.push(micTrack);
            }
            if (includeSystemAudio && this.screenStream) {
                const systemTrack = this.screenStream.getAudioTracks()[0];
                if (systemTrack) audioTracks.push(systemTrack);
            }

            // Add audio tracks to canvas stream
            audioTracks.forEach(track => {
                canvasStream.addTrack(track);
            });

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(canvasStream, {
                mimeType: CONFIG.MEDIA.RECORDING_MIME_TYPE,
                videoBitsPerSecond: CONFIG.MEDIA.RECORDING_BITS_PER_SECOND
            });

            // Set up event handlers
            this.mediaRecorder.ondataavailable = this.handleDataAvailable;
            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
            };

            // Start recording
            this.recordedChunks = [];
            this.mediaRecorder.start();
            this.isRecording = true;

            // Handle screen sharing end
            this.screenStream.getVideoTracks()[0].onended = () => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            };

        } catch (error) {
            throw new Error(`Failed to start recording: ${error.message}`);
        }
    }

    /**
     * Stops the recording
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        try {
            this.mediaRecorder.stop();
            this.cleanup();
        } catch (error) {
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
            this.mediaRecorder.stop();
        }

        stopMediaStream(this.screenStream);
        this.screenStream = null;
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