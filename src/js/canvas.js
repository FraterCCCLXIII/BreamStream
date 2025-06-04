import { CONFIG } from './config.js';

/**
 * Manages canvas operations and drawing
 */
export class CanvasManager {
    /**
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {HTMLVideoElement} screenVideo - The screen video element
     * @param {HTMLVideoElement} cameraVideo - The camera video element
     */
    constructor(canvas, screenVideo, cameraVideo) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.screenVideo = screenVideo;
        this.cameraVideo = cameraVideo;
        this.animationFrameId = null;
        this.isDrawing = false;
        this.effects = {
            dropShadow: true,
            stroke: true,
            pulseEffect: false
        };

        // Bind methods
        this.drawFrame = this.drawFrame.bind(this);
        this.startDrawing = this.startDrawing.bind(this);
        this.stopDrawing = this.stopDrawing.bind(this);
        this.updateEffects = this.updateEffects.bind(this);
    }

    /**
     * Updates the camera effects
     * @param {Object} effects - The effects to apply
     * @param {boolean} effects.dropShadow - Whether to show drop shadow
     * @param {boolean} effects.stroke - Whether to show stroke
     * @param {boolean} effects.pulseEffect - Whether to show pulse effect
     */
    updateEffects(effects) {
        this.effects = { ...effects };
    }

    /**
     * Starts the drawing loop
     */
    startDrawing() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        this.drawFrame();
    }

    /**
     * Stops the drawing loop
     */
    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Updates canvas dimensions based on screen video
     */
    updateCanvasDimensions() {
        if (this.screenVideo.srcObject && 
            this.screenVideo.videoWidth && 
            this.screenVideo.videoHeight) {
            this.canvas.width = this.screenVideo.videoWidth;
            this.canvas.height = this.screenVideo.videoHeight;
        } else {
            this.canvas.width = CONFIG.CANVAS.DEFAULT_WIDTH;
            this.canvas.height = CONFIG.CANVAS.DEFAULT_HEIGHT;
        }
    }

    /**
     * Draws the screen content
     */
    drawScreen() {
        if (!this.screenVideo.srcObject) {
            this.ctx.fillStyle = CONFIG.CANVAS.BACKGROUND_COLOR;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        if (this.screenVideo.readyState >= HTMLMediaElement.HAVE_METADATA && 
            !this.screenVideo.paused) {
            this.ctx.drawImage(
                this.screenVideo, 
                0, 0, 
                this.canvas.width, 
                this.canvas.height
            );
        } else {
            this.drawDebugMessage('Screen not available');
        }
    }

    /**
     * Draws the camera overlay
     */
    drawCameraOverlay() {
        if (!this.cameraVideo.srcObject || 
            this.cameraVideo.readyState < HTMLMediaElement.HAVE_METADATA || 
            this.cameraVideo.paused) {
            return;
        }

        const minDim = Math.min(this.canvas.width, this.canvas.height);
        const overlaySize = minDim * CONFIG.CANVAS.CAMERA_OVERLAY.SIZE_RATIO;
        const padding = minDim * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
        
        // Position in bottom-left corner
        const x = padding;
        const y = this.canvas.height - overlaySize - padding;

        // Calculate source dimensions for square crop
        const videoW = this.cameraVideo.videoWidth;
        const videoH = this.cameraVideo.videoHeight;
        const side = Math.min(videoW, videoH);
        const sx = (videoW - side) / 2;
        const sy = (videoH - side) / 2;

        // Draw circular camera overlay with effects
        this.ctx.save();

        // Apply drop shadow if enabled
        if (this.effects.dropShadow) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
        }

        // Create the circular path
        this.ctx.beginPath();
        this.ctx.arc(
            x + overlaySize / 2,
            y + overlaySize / 2,
            overlaySize / 2,
            0,
            Math.PI * 2,
            false
        );
        this.ctx.closePath();

        // Apply stroke if enabled
        if (this.effects.stroke) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Apply pulse effect if enabled
        if (this.effects.pulseEffect) {
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // Clip and draw the camera feed
        this.ctx.clip();
        this.ctx.drawImage(
            this.cameraVideo,
            sx, sy, side, side,
            x, y, overlaySize, overlaySize
        );
        
        this.ctx.restore();
    }

    /**
     * Draws a debug message on the canvas
     * @param {string} message - The message to display
     */
    drawDebugMessage(message) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            message,
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }

    /**
     * Main drawing loop
     */
    drawFrame() {
        this.updateCanvasDimensions();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawScreen();
        this.drawCameraOverlay();

        if (this.isDrawing) {
            this.animationFrameId = requestAnimationFrame(this.drawFrame);
        }
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        this.stopDrawing();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
} 