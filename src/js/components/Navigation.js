import { CONFIG } from '../config.js';

/**
 * Manages the top navigation bar and settings
 */
export class Navigation {
    /**
     * @param {Object} options - Configuration options
     * @param {Object} options.onSettingsChange - Callback for settings changes
     */
    constructor({ onSettingsChange }) {
        this.onSettingsChange = onSettingsChange;
        this.settings = {
            dropShadow: true,
            stroke: true,
            pulseEffect: false
        };
        
        // Add click outside handler reference
        this.clickOutsideHandler = null;
        
        this.createNavigation();
        this.setupEventListeners();
    }

    /**
     * Creates the navigation bar HTML
     */
    createNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-50';
        
        nav.innerHTML = `
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <!-- Logo -->
                    <div class="flex items-center">
                        <a href="#" class="flex items-center space-x-2">
                            <svg class="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="text-xl font-bold text-gray-900">BeamStream</span>
                        </a>
                    </div>

                    <!-- Settings Button -->
                    <div class="relative">
                        <button id="settingsButton" class="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </button>

                        <!-- Settings Popover -->
                        <div id="settingsPopover" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                            <div class="px-4 py-2 border-b border-gray-200">
                                <h3 class="text-sm font-semibold text-gray-900">Camera Effects</h3>
                            </div>
                            <div class="px-4 py-2 space-y-3">
                                <label class="flex items-center space-x-3">
                                    <input type="checkbox" id="dropShadowToggle" class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500" checked>
                                    <span class="text-sm text-gray-700">Drop Shadow</span>
                                </label>
                                <label class="flex items-center space-x-3">
                                    <input type="checkbox" id="strokeToggle" class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500" checked>
                                    <span class="text-sm text-gray-700">Stroke</span>
                                </label>
                                <label class="flex items-center space-x-3">
                                    <input type="checkbox" id="pulseEffectToggle" class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500">
                                    <span class="text-sm text-gray-700">Pulse Effect</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the pulse effect
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
            }
            .camera-pulse {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);

        // Insert navigation at the start of the body
        document.body.insertBefore(nav, document.body.firstChild);
        
        // Add margin to the main container to account for fixed nav
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.classList.add('mt-16');
        }
    }

    /**
     * Sets up event listeners for the navigation
     */
    setupEventListeners() {
        const settingsButton = document.getElementById('settingsButton');
        const settingsPopover = document.getElementById('settingsPopover');
        const dropShadowToggle = document.getElementById('dropShadowToggle');
        const strokeToggle = document.getElementById('strokeToggle');
        const pulseEffectToggle = document.getElementById('pulseEffectToggle');

        // Toggle settings popover with improved click outside handling
        settingsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = !settingsPopover.classList.contains('hidden');
            
            // Remove existing click outside handler if any
            if (this.clickOutsideHandler) {
                document.removeEventListener('click', this.clickOutsideHandler);
                this.clickOutsideHandler = null;
            }

            if (!isVisible) {
                // Show popover
                settingsPopover.classList.remove('hidden');
                
                // Create new click outside handler
                this.clickOutsideHandler = (event) => {
                    if (!settingsPopover.contains(event.target) && event.target !== settingsButton) {
                        settingsPopover.classList.add('hidden');
                        document.removeEventListener('click', this.clickOutsideHandler);
                        this.clickOutsideHandler = null;
                    }
                };
                
                // Add click outside handler after current event loop
                requestAnimationFrame(() => {
                    document.addEventListener('click', this.clickOutsideHandler);
                });
            } else {
                // Hide popover
                settingsPopover.classList.add('hidden');
            }
        });

        // Handle settings changes
        const handleSettingChange = (setting, value) => {
            this.settings[setting] = value;
            this.onSettingsChange(this.settings);
        };

        dropShadowToggle.addEventListener('change', (e) => {
            handleSettingChange('dropShadow', e.target.checked);
        });

        strokeToggle.addEventListener('change', (e) => {
            handleSettingChange('stroke', e.target.checked);
        });

        pulseEffectToggle.addEventListener('change', (e) => {
            handleSettingChange('pulseEffect', e.target.checked);
        });
    }

    /**
     * Gets the current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Cleans up event listeners
     */
    cleanup() {
        // Remove click outside handler if it exists
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }

        // Remove event listeners and elements
        const settingsButton = document.getElementById('settingsButton');
        const settingsPopover = document.getElementById('settingsPopover');
        
        if (settingsButton) {
            settingsButton.replaceWith(settingsButton.cloneNode(true));
        }
        if (settingsPopover) {
            settingsPopover.remove();
        }
    }
} 