// Simplified popup script for PrivacyAI extension
console.log('PrivacyAI popup starting...');

// DOM elements - Setup Screen
const setupScreen = document.getElementById('setupScreen');
const mainScreen = document.getElementById('mainScreen');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const toggleVisibilityBtn = document.getElementById('toggleApiKeyVisibility');
const setupError = document.getElementById('setupError');
const settingsBtn = document.getElementById('settingsBtn');

// DOM elements - Main Screen
const currentUrlElement = document.getElementById('currentUrl');
const statusText = document.getElementById('statusText');
const resultsContent = document.getElementById('resultsContent');

// Current tab URL
let currentTabUrl = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    
    // Check if API key is configured
    const hasApiKey = await checkApiKey();
    
    if (!hasApiKey) {
        showSetupScreen();
    } else {
        showMainScreen();
        await getCurrentTabUrl();
        await displayResults();
    }
    
    setupEventListeners();
});

// Get current tab URL
async function getCurrentTabUrl() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            currentTabUrl = tab.url;
            currentUrlElement.textContent = shortenUrl(currentTabUrl);
            console.log('Current URL:', currentTabUrl);
        } else {
            currentUrlElement.textContent = 'No URL found';
            console.log('No tab URL found');
        }
    } catch (error) {
        console.error('Error getting tab URL:', error);
        currentUrlElement.textContent = 'Error loading URL';
    }
}

// Normalize URL (same as background.js)
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
    } catch (error) {
        console.error('Error normalizing URL:', error);
        return url.toLowerCase();
    }
}

// Check if API key is configured
async function checkApiKey() {
    try {
        const result = await chrome.storage.local.get(['perplexity_api_key']);
        return !!(result.perplexity_api_key && result.perplexity_api_key.trim());
    } catch (error) {
        console.error('Error checking API key:', error);
        return false;
    }
}

// Show setup screen
function showSetupScreen() {
    setupScreen.style.display = 'flex';
    mainScreen.style.display = 'none';
    apiKeyInput.focus();
}

// Show main screen
function showMainScreen() {
    setupScreen.style.display = 'none';
    mainScreen.style.display = 'block';
}

// Validate API key format
function validateApiKey(key) {
    // Perplexity API keys start with 'pplx-' and are typically 48+ characters
    return key && key.startsWith('pplx-') && key.length >= 40;
}

// Save API key
async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    
    // Hide previous error
    setupError.style.display = 'none';
    
    // Validate API key
    if (!validateApiKey(apiKey)) {
        setupError.textContent = '❌ Invalid API key format. Keys should start with "pplx-"';
        setupError.style.display = 'block';
        return;
    }
    
    try {
        // Save to storage
        await chrome.storage.local.set({ perplexity_api_key: apiKey });
        
        // Show success and switch to main screen
        setupError.style.display = 'none';
        showMainScreen();
        
        // Load the current tab and results
        await getCurrentTabUrl();
        await displayResults();
        
    } catch (error) {
        console.error('Error saving API key:', error);
        setupError.textContent = '❌ Error saving API key. Please try again.';
        setupError.style.display = 'block';
    }
}

// Show settings (to change API key)
async function showSettings() {
    const result = await chrome.storage.local.get(['perplexity_api_key']);
    const currentKey = result.perplexity_api_key || '';
    
    // Pre-fill with masked current key
    apiKeyInput.value = currentKey;
    apiKeyInput.type = 'password';
    showSetupScreen();
}

// Setup event listeners
function setupEventListeners() {
    // Setup screen events
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
    }
    
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveApiKey();
            }
        });
    }
    
    if (toggleVisibilityBtn) {
        toggleVisibilityBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleVisibilityBtn.textContent = '🙈';
            } else {
                apiKeyInput.type = 'password';
                toggleVisibilityBtn.textContent = '👁️';
            }
        });
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }
}

// Display analysis results
async function displayResults() {
    console.log('Checking for results...');
    
    if (!currentTabUrl) {
        updateStatus('No website loaded');
        return;
    }

    // Skip non-web URLs
    if (!currentTabUrl.startsWith('http')) {
        updateStatus('Navigate to a website to see privacy analysis');
        showNoAnalysisMessage();
        return;
    }

    // Skip PrivacyAI website
    if (currentTabUrl.includes('privacy-ai.netlify.app')) {
        updateStatus('Welcome to PrivacyAI!');
        showWelcomeMessage();
        return;
    }

    // Check for cached analysis using normalized URL
    try {
        const normalizedUrl = normalizeUrl(currentTabUrl);
        const storageKey = `analysis_${normalizedUrl}`;
        const result = await chrome.storage.local.get([storageKey]);
        
        if (result[storageKey]) {
            console.log('Found analysis results');
            const cached = result[storageKey];
            updateStatus('✅ Analysis complete');
            showAnalysisResults(cached.data);
        } else {
            console.log('No analysis found, showing loading state');
            updateStatus('🔍 Analyzing with Perplexity AI...');
            showLoadingMessage();
            
            // Check again after 3 seconds
            setTimeout(async () => {
                const newResult = await chrome.storage.local.get([storageKey]);
                if (newResult[storageKey]) {
                    updateStatus('✅ Analysis complete');
                    showAnalysisResults(newResult[storageKey].data);
                } else {
                    updateStatus('⏳ Analysis in progress...');
                }
            }, 3000);
        }
    } catch (error) {
        console.error('Error checking storage:', error);
        updateStatus('❌ Error loading results');
        showErrorMessage();
    }
}

// Update status text
function updateStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
    console.log('Status:', message);
}

// Show welcome message for PrivacyAI website
function showWelcomeMessage() {
    resultsContent.innerHTML = `
        <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.8);">
            <h4 style="color: #00bfff; margin-bottom: 15px;">🏠 Welcome to PrivacyAI!</h4>
            <p>You're on the main PrivacyAI website.</p>
            <p style="margin-top: 10px; font-size: 0.9em;">Navigate to other websites to see automatic privacy analysis.</p>
        </div>
    `;
}

// Show loading message
function showLoadingMessage() {
    resultsContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="margin-bottom: 15px;">
                <div style="
                    width: 30px; 
                    height: 30px; 
                    border: 3px solid rgba(255,255,255,0.3); 
                    border-top: 3px solid #00bfff; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
            <p style="color: rgba(255, 255, 255, 0.8);">Privacy analysis powered by Perplexity AI happens automatically...</p>
            <p style="font-size: 0.8em; margin-top: 10px; color: rgba(255, 255, 255, 0.6);">This may take a few moments</p>
        </div>
        <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
}

// Show no analysis message
function showNoAnalysisMessage() {
    resultsContent.innerHTML = `
        <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
            <p>Navigate to a website to see privacy analysis</p>
        </div>
    `;
}

// Show error message
function showErrorMessage() {
    resultsContent.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #ff6b6b;">
            <p>Error loading analysis results</p>
        </div>
    `;
}

// Show analysis results
function showAnalysisResults(data) {
    console.log('Showing analysis results:', data);
    
    // Data should already be in the correct format from Perplexity
    const analysisData = data || {};
    
    let html = '';

    // Risk Level
    if (analysisData.riskLevel) {
        const riskClass = analysisData.riskLevel.toLowerCase();
        html += `
            <div style="margin-bottom: 15px;">
                <span style="
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    ${getRiskLevelStyle(riskClass)}
                ">
                    Risk Level: ${analysisData.riskLevel}
                </span>
            </div>
        `;
    }

    // Accessibility Status
    if (analysisData.accessible !== undefined) {
        const accessibleText = analysisData.accessible ? 'Accessible' : 'Not Accessible';
        const accessibleIcon = analysisData.accessible ? '✅' : '❌';
        html += `
            <div style="margin-bottom: 15px;">
                <span style="
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    ${analysisData.accessible ? 
                        'background: rgba(50, 205, 50, 0.2); color: #32CD32; border: 1px solid rgba(50, 205, 50, 0.4);' : 
                        'background: rgba(255, 107, 107, 0.2); color: #FF6B6B; border: 1px solid rgba(255, 107, 107, 0.4);'
                    }
                ">
                    ${accessibleIcon} Privacy Policy ${accessibleText}
                </span>
            </div>
        `;
    }

    // Summary
    if (analysisData.summary) {
        html += `
            <div style="margin-bottom: 15px;">
                <h4 style="color: #00bfff; font-size: 0.9rem; margin-bottom: 8px;">📋 Analysis Summary</h4>
                <div style="font-size: 0.85rem; line-height: 1.4; color: rgba(255, 255, 255, 0.9);">
                    ${analysisData.summary}
                </div>
            </div>
        `;
    }

    // Recommendations (truncated)
    if (analysisData.recommendations) {
        const truncatedRecommendations = analysisData.recommendations.length > 200 ? 
            analysisData.recommendations.substring(0, 200) + '...' : 
            analysisData.recommendations;
        
        html += `
            <div style="margin-bottom: 15px;">
                <h4 style="color: #00bfff; font-size: 0.9rem; margin-bottom: 8px;">💡 Key Recommendations</h4>
                <div style="font-size: 0.85rem; line-height: 1.4; color: rgba(255, 255, 255, 0.9);">
                    ${truncatedRecommendations}
                </div>
            </div>
        `;
    }

    // Error message if analysis failed
    if (analysisData.error) {
        html += `
            <div style="margin-top: 15px; padding: 10px; background: rgba(255, 107, 107, 0.1); border-left: 3px solid #FF6B6B; border-radius: 4px;">
                <p style="font-size: 0.85rem; color: #FF6B6B; margin: 0;">
                    ⚠️ Analysis encountered an issue. Please try again later.
                </p>
            </div>
        `;
    }

    resultsContent.innerHTML = html || '<p style="text-align: center; color: rgba(255, 255, 255, 0.6);">No analysis data available</p>';
}

// Get risk level styling
function getRiskLevelStyle(riskLevel) {
    switch (riskLevel) {
        case 'low':
            return 'background-color: #32CD32; color: #000;';
        case 'medium':
            return 'background-color: #FFD700; color: #000;';
        case 'high':
            return 'background-color: #FF6B6B; color: #fff;';
        default:
            return 'background-color: #00BFFF; color: #fff;';
    }
}

// Shorten URL for display
function shortenUrl(url) {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        return domain.length > 30 ? domain.substring(0, 27) + '...' : domain;
    } catch (error) {
        return url.length > 30 ? url.substring(0, 27) + '...' : url;
    }
}

// Background image cycling animation
function cycleBackgroundImages() {
    const images = document.querySelectorAll('.bg-image');
    if (images.length === 0) return;
    
    let currentIndex = 0;
    setInterval(() => {
        images.forEach((img, index) => {
            img.style.opacity = index === currentIndex ? '0.15' : '0.05';
        });
        currentIndex = (currentIndex + 1) % images.length;
    }, 5000);
}
