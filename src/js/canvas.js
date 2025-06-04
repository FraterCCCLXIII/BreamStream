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

        // Add view mode tracking
        this.viewMode = {
            screenOnly: false,
            cameraOnly: false,
            both: false
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
            
            // Calculate padding based on current canvas dimensions
            const minDimension = Math.min(this.canvas.width, this.canvas.height);
            const padding = minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
            
            // Keep within canvas bounds with padding
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
            const padding = minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
            const maxX = this.canvas.width - newSize / 2 - padding;
            const maxY = this.canvas.height - newSize / 2 - padding;
            const minX = newSize / 2 + padding;
            const minY = newSize / 2 + padding;

            // Update position to stay within bounds
            this.cameraPreview.x = Math.min(Math.max(this.cameraPreview.x, minX), maxX);
            this.cameraPreview.y = Math.min(Math.max(this.cameraPreview.y, minY), maxY);
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
        if (this.isDrawing) {
            this.drawFrame();
        }
    }

    /**
     * Draws the camera preview with effects
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    drawCameraPreview(x, y, width, height) {
        console.log('[DEBUG] drawCameraPreview called with:', {
            x, y, width, height,
            hasVideo: !!this.cameraVideo,
            hasSrcObject: !!this.cameraVideo?.srcObject,
            videoWidth: this.cameraVideo?.videoWidth,
            videoHeight: this.cameraVideo?.videoHeight,
            viewMode: this.viewMode
        });

        if (!this.cameraVideo || !this.cameraVideo.srcObject) {
            console.log('[DEBUG] drawCameraPreview: No video or srcObject available');
            return;
        }

        // Save context state
        this.ctx.save();

        // Create circular clipping path first
        this.ctx.beginPath();
        this.ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
        this.ctx.clip();

        // Clear the area before drawing to ensure transparency
        this.ctx.clearRect(x, y, width, height);

        // Calculate aspect ratio preserving dimensions
        const videoAspect = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight;
        let drawWidth, drawHeight, drawX, drawY;

        // For circle mode, use the smaller dimension to maintain aspect ratio
        if (videoAspect > 1) {
            // Video is wider than tall
            drawHeight = height;
            drawWidth = drawHeight * videoAspect;
            drawX = x - (drawWidth - width) / 2;
            drawY = y;
        } else {
            // Video is taller than wide
            drawWidth = width;
            drawHeight = drawWidth / videoAspect;
            drawX = x;
            drawY = y - (drawHeight - height) / 2;
        }

        console.log('[DEBUG] Camera preview drawing dimensions:', {
            videoAspect,
            drawWidth,
            drawHeight,
            drawX,
            drawY,
            effects: this.effects
        });

        // Apply drop shadow if enabled
        if (this.effects.dropShadow) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 4;
            this.ctx.shadowOffsetY = 4;
        }

        // Draw the video maintaining aspect ratio
        this.ctx.drawImage(this.cameraVideo, drawX, drawY, drawWidth, drawHeight);

        // Reset shadow for stroke
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Apply stroke if enabled
        if (this.effects.stroke) {
            this.ctx.strokeStyle = this.effects.strokeColor;
            this.ctx.lineWidth = this.effects.strokeWidth;
            this.ctx.beginPath();
            this.ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Apply pulse effect if enabled
        if (this.effects.pulseEffect) {
            const pulseIntensity = Math.sin(this.pulsePhase) * 0.5 + 0.5;
            this.ctx.strokeStyle = this.effects.strokeColor;
            this.ctx.lineWidth = this.effects.strokeWidth * (1 + pulseIntensity * 0.5);
            this.ctx.beginPath();
            this.ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
            this.ctx.stroke();
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
     * Updates the view mode based on available streams
     * @param {boolean} hasScreenStream - Whether screen stream is active
     * @param {boolean} hasCameraStream - Whether camera stream is active
     */
    updateViewMode(hasScreenStream, hasCameraStream) {
        // Only update view mode if at least one stream is active
        if (!hasScreenStream && !hasCameraStream) {
            this.viewMode = {
                screenOnly: false,
                cameraOnly: false,
                both: false
            };
        } else {
            this.viewMode = {
                screenOnly: hasScreenStream && !hasCameraStream,
                cameraOnly: !hasScreenStream && hasCameraStream,
                both: hasScreenStream && hasCameraStream
            };

            // If entering both mode, initialize camera preview position
            if (this.viewMode.both && this.screenVideo?.srcObject) {
                const minDimension = Math.min(this.canvas.width, this.canvas.height);
                this.cameraPreview.size = Math.min(
                    minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.SIZE_RATIO,
                    this.cameraPreview.maxSize
                );
                
                // Position in lower right corner with padding
                const padding = minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;
                this.cameraPreview.x = this.canvas.width - padding - this.cameraPreview.size / 2;
                this.cameraPreview.y = this.canvas.height - padding - this.cameraPreview.size / 2;

                // Ensure the preview stays within bounds
                const maxX = this.canvas.width - this.cameraPreview.size / 2 - padding;
                const maxY = this.canvas.height - this.cameraPreview.size / 2 - padding;
                const minX = this.cameraPreview.size / 2 + padding;
                const minY = this.cameraPreview.size / 2 + padding;

                this.cameraPreview.x = Math.min(Math.max(this.cameraPreview.x, minX), maxX);
                this.cameraPreview.y = Math.min(Math.max(this.cameraPreview.y, minY), maxY);
            }
        }
        this.updateCanvasDimensions();
    }

    /**
     * Draws the current frame based on view mode
     */
    drawFrame() {
        console.log('[DEBUG] drawFrame called:', {
            viewMode: this.viewMode,
            hasScreenVideo: !!this.screenVideo?.srcObject,
            hasCameraVideo: !!this.cameraVideo?.srcObject,
            isDrawing: this.isDrawing,
            cameraPreview: this.cameraPreview
        });

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background if no streams are active
        if (!this.screenVideo?.srcObject && !this.cameraVideo?.srcObject) {
            console.log('[DEBUG] No streams active, drawing background');
            this.ctx.fillStyle = CONFIG.CANVAS.BACKGROUND_COLOR;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.viewMode.screenOnly) {
            console.log('[DEBUG] Drawing screen only');
            this.drawScreen();
        } else if (this.viewMode.cameraOnly && this.cameraVideo && this.cameraVideo.srcObject) {
            console.log('[DEBUG] Drawing camera only');
            const videoAspect = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight;
            const canvasAspect = this.canvas.width / this.canvas.height;
            
            let drawWidth, drawHeight, x, y;
            
            if (videoAspect > canvasAspect) {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / videoAspect;
                x = 0;
                y = (this.canvas.height - drawHeight) / 2;
            } else {
                drawHeight = this.canvas.height;
                drawWidth = drawHeight * videoAspect;
                x = (this.canvas.width - drawWidth) / 2;
                y = 0;
            }
            
            this.ctx.drawImage(this.cameraVideo, x, y, drawWidth, drawHeight);
        } else if (this.viewMode.both) {
            console.log('[DEBUG] Drawing both streams');
            if (this.screenVideo && this.screenVideo.srcObject) {
                this.drawScreen();
                if (this.cameraVideo && this.cameraVideo.srcObject) {
                    const { x, y, size } = this.cameraPreview;
                    console.log('[DEBUG] Drawing camera preview in both mode:', { x, y, size });
                    this.drawCameraPreview(x - size/2, y - size/2, size, size);
                }
            }
        }

        if (this.isDrawing) {
            this.animationFrameId = requestAnimationFrame(this.drawFrame);
        }
    }

    /**
     * Updates canvas dimensions based on active streams
     */
    updateCanvasDimensions() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        if (this.viewMode.cameraOnly && this.cameraVideo?.srcObject) {
            // Use camera dimensions for camera-only mode
            const videoWidth = this.cameraVideo.videoWidth || 640;
            const videoHeight = this.cameraVideo.videoHeight || 480;
            
            // Calculate scale to fit container while maintaining aspect ratio
            const scaleX = containerRect.width / videoWidth;
            const scaleY = containerRect.height / videoHeight;
            const scale = Math.min(scaleX, scaleY);
            
            // Set canvas dimensions to match video aspect ratio
            this.canvas.width = videoWidth;
            this.canvas.height = videoHeight;
            
            // Scale canvas to fit container while maintaining aspect ratio
            this.canvas.style.width = `${videoWidth * scale}px`;
            this.canvas.style.height = `${videoHeight * scale}px`;
            
            // Center canvas in container
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = 'translate(-50%, -50%)';

            // Center camera preview
            this.cameraPreview.x = this.canvas.width / 2;
            this.cameraPreview.y = this.canvas.height / 2;
            this.cameraPreview.size = Math.min(
                Math.min(this.canvas.width, this.canvas.height) * CONFIG.CANVAS.CAMERA_OVERLAY.SIZE_RATIO,
                this.cameraPreview.maxSize
            );

            // Start drawing if not already drawing
            if (!this.isDrawing) {
                this.isDrawing = true;
                this.drawFrame();
            }
        } else if (this.viewMode.both && this.screenVideo?.srcObject) {
            // Use screen dimensions for both streams
            const scaleX = containerRect.width / this.screenVideo.videoWidth;
            const scaleY = containerRect.height / this.screenVideo.videoHeight;
            const scale = Math.min(scaleX, scaleY);
            
            this.canvas.width = this.screenVideo.videoWidth;
            this.canvas.height = this.screenVideo.videoHeight;
            
            this.canvas.style.width = `${this.screenVideo.videoWidth * scale}px`;
            this.canvas.style.height = `${this.screenVideo.videoHeight * scale}px`;
            
            // Center canvas in container
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = 'translate(-50%, -50%)';

            // Update camera preview size based on screen dimensions
            const minDimension = Math.min(this.canvas.width, this.canvas.height);
            const newSize = Math.min(
                minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.SIZE_RATIO,
                this.cameraPreview.maxSize
            );

            // Only update size if it's significantly different to avoid jitter
            if (Math.abs(this.cameraPreview.size - newSize) > 1) {
                this.cameraPreview.size = newSize;
            }

            // Calculate padding
            const padding = minDimension * CONFIG.CANVAS.CAMERA_OVERLAY.PADDING_RATIO;

            // If camera preview position hasn't been initialized or needs reset
            if (this.cameraPreview.x === 0 || this.cameraPreview.y === 0) {
                // Position in lower left corner
                this.cameraPreview.x = padding + this.cameraPreview.size / 2;
                this.cameraPreview.y = this.canvas.height - padding - this.cameraPreview.size / 2;
            } else {
                // Ensure camera preview stays within bounds with padding
                const maxX = this.canvas.width - this.cameraPreview.size / 2 - padding;
                const maxY = this.canvas.height - this.cameraPreview.size / 2 - padding;
                const minX = this.cameraPreview.size / 2 + padding;
                const minY = this.cameraPreview.size / 2 + padding;

                this.cameraPreview.x = Math.min(Math.max(this.cameraPreview.x, minX), maxX);
                this.cameraPreview.y = Math.min(Math.max(this.cameraPreview.y, minY), maxY);
            }

            // Start drawing if not already drawing
            if (!this.isDrawing) {
                this.isDrawing = true;
                this.drawFrame();
            }
        } else if (this.viewMode.screenOnly && this.screenVideo?.srcObject) {
            // Use screen dimensions for screen-only mode
            const scaleX = containerRect.width / this.screenVideo.videoWidth;
            const scaleY = containerRect.height / this.screenVideo.videoHeight;
            const scale = Math.min(scaleX, scaleY);
            
            this.canvas.width = this.screenVideo.videoWidth;
            this.canvas.height = this.screenVideo.videoHeight;
            
            this.canvas.style.width = `${this.screenVideo.videoWidth * scale}px`;
            this.canvas.style.height = `${this.screenVideo.videoHeight * scale}px`;
            
            // Center canvas in container
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = 'translate(-50%, -50%)';

            // Start drawing if not already drawing
            if (!this.isDrawing) {
                this.isDrawing = true;
                this.drawFrame();
            }
        } else {
            // Default dimensions when no streams are active
            this.canvas.width = CONFIG.CANVAS.DEFAULT_WIDTH;
            this.canvas.height = CONFIG.CANVAS.DEFAULT_HEIGHT;
            
            const scaleX = containerRect.width / this.canvas.width;
            const scaleY = containerRect.height / this.canvas.height;
            const scale = Math.min(scaleX, scaleY);
            
            this.canvas.style.width = `${this.canvas.width * scale}px`;
            this.canvas.style.height = `${this.canvas.height * scale}px`;
            
            // Center canvas in container
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '50%';
            this.canvas.style.top = '50%';
            this.canvas.style.transform = 'translate(-50%, -50%)';

            // Stop drawing if no streams are active
            if (this.isDrawing) {
                this.isDrawing = false;
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
            }
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