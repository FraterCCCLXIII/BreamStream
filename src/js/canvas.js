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
            strokeWidth: 2,
            strokeColor: '#FFFFFF',
            pulseEffect: false
        };
        this.pulseAnimation = null;
        this.pulsePhase = 0;

        // Camera preview position and size
        this.cameraPreview = {
            x: 0, // Will be set in updateCanvasDimensions
            y: 0, // Will be set in updateCanvasDimensions
            size: 200, // Default size
            minSize: 100,
            maxSize: 400,
            isDragging: false,
            isResizing: false,
            dragStartX: 0,
            dragStartY: 0,
            resizeStartX: 0,
            resizeStartY: 0,
            resizeStartSize: 0,
            aspectRatio: 1 // Maintain 1:1 aspect ratio
        };

        // Bind methods
        this.drawFrame = this.drawFrame.bind(this);
        this.startDrawing = this.startDrawing.bind(this);
        this.stopDrawing = this.stopDrawing.bind(this);
        this.updateEffects = this.updateEffects.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        // Set up mouse event listeners
        this.setupMouseEvents();
    }

    /**
     * Sets up mouse event listeners for drag and resize
     */
    setupMouseEvents() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    /**
     * Handles mouse down events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Check if click is within camera preview circle
        const dx = x - this.cameraPreview.x;
        const dy = y - this.cameraPreview.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = this.cameraPreview.size / 2;

        // Check if click is near the edge (for resizing)
        const edgeThreshold = 10;
        if (Math.abs(distance - radius) < edgeThreshold) {
            this.cameraPreview.isResizing = true;
            this.cameraPreview.resizeStartX = x;
            this.cameraPreview.resizeStartY = y;
            this.cameraPreview.resizeStartSize = this.cameraPreview.size;
            this.canvas.style.cursor = 'nwse-resize';
        }
        // Check if click is inside the circle (for dragging)
        else if (distance < radius) {
            this.cameraPreview.isDragging = true;
            this.cameraPreview.dragStartX = x - this.cameraPreview.x;
            this.cameraPreview.dragStartY = y - this.cameraPreview.y;
            this.canvas.style.cursor = 'move';
        }
    }

    /**
     * Handles mouse move events
     * @param {MouseEvent} e - The mouse event
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Update cursor style based on position
        if (!this.cameraPreview.isDragging && !this.cameraPreview.isResizing) {
            const dx = x - this.cameraPreview.x;
            const dy = y - this.cameraPreview.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = this.cameraPreview.size / 2;
            
            if (Math.abs(distance - radius) < 10) {
                this.canvas.style.cursor = 'nwse-resize';
            } else if (distance < radius) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }

        // Handle dragging
        if (this.cameraPreview.isDragging) {
            const newX = x - this.cameraPreview.dragStartX;
            const newY = y - this.cameraPreview.dragStartY;
            
            // Keep within canvas bounds with padding
            const padding = Math.min(this.canvas.width, this.canvas.height) * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
            this.cameraPreview.x = Math.max(this.cameraPreview.size / 2 + padding, 
                Math.min(newX, this.canvas.width - this.cameraPreview.size / 2 - padding));
            this.cameraPreview.y = Math.max(this.cameraPreview.size / 2 + padding, 
                Math.min(newY, this.canvas.height - this.cameraPreview.size / 2 - padding));
        }

        // Handle resizing
        if (this.cameraPreview.isResizing) {
            const dx = x - this.cameraPreview.resizeStartX;
            const dy = y - this.cameraPreview.resizeStartY;
            const delta = Math.max(dx, dy);
            
            // Calculate new size based on screen dimensions
            const minDimension = Math.min(this.canvas.width, this.canvas.height);
            const maxSize = Math.min(
                minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.SIZE_RATIO,
                this.cameraPreview.maxSize
            );
            
            const newSize = Math.max(this.cameraPreview.minSize,
                Math.min(maxSize,
                    this.cameraPreview.resizeStartSize + delta * 2));

            // Update size while maintaining aspect ratio
            this.cameraPreview.size = newSize;

            // Ensure the preview stays within canvas bounds with padding
            const padding = Math.min(this.canvas.width, this.canvas.height) * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
            const maxX = this.canvas.width - newSize / 2 - padding;
            const maxY = this.canvas.height - newSize / 2 - padding;
            this.cameraPreview.x = Math.min(this.cameraPreview.x, maxX);
            this.cameraPreview.y = Math.min(this.cameraPreview.y, maxY);
        }
    }

    /**
     * Handles mouse up events
     */
    handleMouseUp() {
        this.cameraPreview.isDragging = false;
        this.cameraPreview.isResizing = false;
        this.canvas.style.cursor = 'default';
    }

    /**
     * Updates the effects settings
     * @param {Object} effects - The effects settings
     */
    updateEffects(effects) {
        this.effects = { ...this.effects, ...effects };
        this.draw(); // Redraw with new settings
    }

    /**
     * Draws the camera preview with effects
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    drawCameraPreview(x, y, width, height) {
        if (!this.cameraVideo || !this.cameraVideo.srcObject) return;

        // Save context state
        this.ctx.save();

        // Apply drop shadow if enabled
        if (this.effects.dropShadow) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 4;
            this.ctx.shadowOffsetY = 4;
        }

        // Draw the video
        this.ctx.drawImage(this.cameraVideo, x, y, width, height);

        // Apply stroke if enabled
        if (this.effects.stroke) {
            this.ctx.strokeStyle = this.effects.strokeColor;
            this.ctx.lineWidth = this.effects.strokeWidth;
            this.ctx.strokeRect(x, y, width, height);
        }

        // Apply pulse effect if enabled
        if (this.effects.pulseEffect) {
            const pulseIntensity = Math.sin(this.pulsePhase) * 0.5 + 0.5;
            this.ctx.strokeStyle = this.effects.strokeColor;
            this.ctx.lineWidth = this.effects.strokeWidth * (1 + pulseIntensity * 0.5);
            this.ctx.strokeRect(x, y, width, height);
        }

        // Restore context state
        this.ctx.restore();
    }

    /**
     * Starts the drawing loop
     */
    startDrawing() {
        if (this.isDrawing) return;
        this.isDrawing = true;

        const draw = () => {
            if (!this.isDrawing) return;

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw screen content
            this.drawScreen();

            // Draw camera preview if available
            if (this.cameraVideo && this.cameraVideo.srcObject) {
                const { x, y, width, height } = this.cameraPreview;
                this.drawCameraPreview(x, y, width, height);
            }

            // Update pulse phase if effect is enabled
            if (this.effects.pulseEffect) {
                this.pulsePhase += 0.05;
            }

            // Request next frame
            requestAnimationFrame(draw);
        };

        draw();
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
            // Set canvas size to match screen video dimensions exactly
            const container = this.canvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            // Calculate scale to fit container while maintaining aspect ratio
            const scaleX = containerRect.width / this.screenVideo.videoWidth;
            const scaleY = containerRect.height / this.screenVideo.videoHeight;
            const scale = Math.min(scaleX, scaleY);
            
            // Set canvas size to match screen video dimensions
            this.canvas.width = this.screenVideo.videoWidth;
            this.canvas.height = this.screenVideo.videoHeight;
            
            // Scale canvas display size to fit container
            this.canvas.style.width = `${this.screenVideo.videoWidth * scale}px`;
            this.canvas.style.height = `${this.screenVideo.videoHeight * scale}px`;
            
            // Update camera preview size based on screen dimensions
            const minDimension = Math.min(this.canvas.width, this.canvas.height);
            this.cameraPreview.size = Math.min(
                minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.SIZE_RATIO,
                this.cameraPreview.maxSize
            );
        } else {
            // Default dimensions when no screen video
            this.canvas.width = CONFIG.CANVAS.DEFAULT_WIDTH;
            this.canvas.height = CONFIG.CANVAS.DEFAULT_HEIGHT;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
        }

        // Set initial camera preview position to bottom left corner if not set
        if (!this.cameraPreview.x || !this.cameraPreview.y) {
            const padding = Math.min(this.canvas.width, this.canvas.height) * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
            this.cameraPreview.x = this.cameraPreview.size / 2 + padding;
            this.cameraPreview.y = this.canvas.height - this.cameraPreview.size / 2 - padding;
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
            // Draw screen at 100% size
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
        
        // Remove mouse event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
} 