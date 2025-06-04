/**
 * Manages the countdown animation before recording starts
 */
export class Countdown {
    /**
     * @param {Object} options - Configuration options
     * @param {Function} options.onComplete - Callback when countdown completes
     */
    constructor({ onComplete }) {
        this.onComplete = onComplete;
        this.duration = 5; // 5 seconds countdown
        this.currentTime = this.duration;
        this.isActive = false;
        this.animationFrame = null;
        this.startTime = 0;
        
        this.createCountdown();
    }

    /**
     * Creates the countdown HTML and styles
     */
    createCountdown() {
        // Create container
        const container = document.createElement('div');
        container.id = 'countdownContainer';
        container.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none';
        
        // Create countdown circle
        const circle = document.createElement('div');
        circle.id = 'countdownCircle';
        circle.className = 'relative w-32 h-32';
        
        // Create SVG for the circular progress
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', 'transform -rotate-90 w-full h-full');
        
        // Create background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '50');
        bgCircle.setAttribute('cy', '50');
        bgCircle.setAttribute('r', '45');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
        bgCircle.setAttribute('stroke-width', '5');
        
        // Create progress circle
        const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        progressCircle.id = 'countdownProgress';
        progressCircle.setAttribute('cx', '50');
        progressCircle.setAttribute('cy', '50');
        progressCircle.setAttribute('r', '45');
        progressCircle.setAttribute('fill', 'none');
        progressCircle.setAttribute('stroke', '#3B82F6'); // Tailwind blue-500
        progressCircle.setAttribute('stroke-width', '5');
        progressCircle.setAttribute('stroke-linecap', 'round');
        progressCircle.style.strokeDasharray = '283'; // 2 * PI * 45
        progressCircle.style.strokeDashoffset = '0';
        
        // Create number display
        const number = document.createElement('div');
        number.id = 'countdownNumber';
        number.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-white';
        
        // Assemble the components
        svg.appendChild(bgCircle);
        svg.appendChild(progressCircle);
        circle.appendChild(svg);
        circle.appendChild(number);
        container.appendChild(circle);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #countdownContainer {
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            }
            #countdownContainer.active {
                opacity: 1;
            }
            #countdownCircle {
                filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            #countdownNumber {
                animation: pulse 1s infinite;
            }
        `;
        document.head.appendChild(style);
        
        // Add to document
        document.body.appendChild(container);
        
        // Store references
        this.container = container;
        this.progressCircle = progressCircle;
        this.number = number;
    }

    /**
     * Starts the countdown animation
     */
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.currentTime = this.duration;
        this.startTime = performance.now();
        this.container.classList.add('active');
        this.update();
        
        // Start animation loop
        this.animate();
    }

    /**
     * Stops the countdown animation
     */
    stop() {
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.container.classList.remove('active');
    }

    /**
     * Updates the countdown display
     */
    update() {
        const timeLeft = Math.ceil(this.currentTime);
        this.number.textContent = timeLeft;
        
        // Update progress circle
        const progress = (this.duration - this.currentTime) / this.duration;
        const circumference = 2 * Math.PI * 45;
        const offset = circumference * (1 - progress);
        this.progressCircle.style.strokeDashoffset = offset;
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive) return;
        
        const now = performance.now();
        const elapsed = (now - this.startTime) / 1000;
        this.currentTime = Math.max(0, this.duration - elapsed);
        
        this.update();
        
        if (this.currentTime > 0) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.stop();
            this.onComplete();
        }
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        this.stop();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 