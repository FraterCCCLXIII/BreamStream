export class CameraOverlay {
  constructor() {
    this.cameraSource = document.getElementById('cameraSource');
    this.canvasContainer = document.querySelector('.canvas-container');
    this.isDragging = false;
    this.isResizing = false;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.startLeft = 0;
    this.startTop = 0;
    this.resizeHandle = null;
    this.aspectRatio = 16/9;

    this.init();
  }

  init() {
    if (!this.cameraSource || !this.canvasContainer) return;

    // Create resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'camera-resize-handle';
    this.cameraSource.appendChild(this.resizeHandle);

    // Add event listeners
    this.cameraSource.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Save initial position and size
    this.saveState();
  }

  handleMouseDown(e) {
    const rect = this.cameraSource.getBoundingClientRect();
    const isResizeHandle = e.target === this.resizeHandle;
    
    if (isResizeHandle) {
      this.isResizing = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.startWidth = rect.width;
      this.startHeight = rect.height;
    } else {
      this.isDragging = true;
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
      this.startLeft = rect.left;
      this.startTop = rect.top;
    }

    e.preventDefault();
  }

  handleMouseMove(e) {
    if (!this.isDragging && !this.isResizing) return;

    const containerRect = this.canvasContainer.getBoundingClientRect();
    
    if (this.isResizing) {
      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth = this.startWidth + deltaX;
      let newHeight = newWidth / this.aspectRatio;
      
      // Constrain to container bounds
      newWidth = Math.min(newWidth, containerRect.width - this.cameraSource.offsetLeft - 16);
      newHeight = Math.min(newHeight, containerRect.height - this.cameraSource.offsetTop - 16);
      
      // Enforce minimum size
      newWidth = Math.max(newWidth, 160);
      newHeight = Math.max(newHeight, 90);
      
      this.cameraSource.style.width = `${newWidth}px`;
      this.cameraSource.style.height = `${newHeight}px`;
    } else if (this.isDragging) {
      const newLeft = e.clientX - this.startX;
      const newTop = e.clientY - this.startY;
      
      // Constrain to container bounds
      const maxLeft = containerRect.width - this.cameraSource.offsetWidth - 16;
      const maxTop = containerRect.height - this.cameraSource.offsetHeight - 16;
      
      this.cameraSource.style.left = `${Math.max(16, Math.min(newLeft, maxLeft))}px`;
      this.cameraSource.style.top = `${Math.max(16, Math.min(newTop, maxTop))}px`;
    }

    this.saveState();
  }

  handleMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
  }

  saveState() {
    // Save position and size to localStorage
    const state = {
      width: this.cameraSource.offsetWidth,
      height: this.cameraSource.offsetHeight,
      left: this.cameraSource.offsetLeft,
      top: this.cameraSource.offsetTop
    };
    localStorage.setItem('cameraOverlayState', JSON.stringify(state));
  }

  restoreState() {
    const savedState = localStorage.getItem('cameraOverlayState');
    if (savedState) {
      const state = JSON.parse(savedState);
      Object.assign(this.cameraSource.style, {
        width: `${state.width}px`,
        height: `${state.height}px`,
        left: `${state.left}px`,
        top: `${state.top}px`
      });
    }
  }
} 