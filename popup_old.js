// DOM elements
const currentUrlElement = document.getElementById('currentUrl');
const statusText = document.getElementById('statusText');
const resultsContainer = document.getElementById('resultsContainer');
const resultsContent = document.getElementById('resultsContent');
const detailsSection = document.getElementById('detailsSection');
const moreDetailsBtn = document.getElementById('moreDetailsBtn');

// API configuration - same as main website
// const API_BASE_URL = 'https://privacy-ai-back-end-dabvfvhqc8cwf8et.uaenorth-01.azurewebsites.net/api/';
const API_BASE_URL = 'http://localhost:9090/api/';
const ANALYZE_ENDPOINT = 'analyzePrivacy';

// Current tab URL and state
let currentTabUrl = '';
let lastAnalyzedUrl = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentTabUrl();
    setupEventListeners();
    cycleBackgroundImages();
    await checkAndAnalyze();
});

// Get current tab URL
async function loadCurrentTabUrl() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
            currentTabUrl = tab.url;
            const displayUrl = shortenUrl(currentTabUrl);
            currentUrlElement.textContent = displayUrl;
        } else {
            currentUrlElement.textContent = 'Unable to get current URL';
        }
    } catch (error) {
        console.error('Error getting current tab:', error);
        currentUrlElement.textContent = 'Error loading URL';
    }
}

// Setup event listeners
function setupEventListeners() {
    moreDetailsBtn.addEventListener('click', openFullAnalysis);
}

// Check if we need to analyze current URL automatically
async function checkAndAnalyze() {
    if (!currentTabUrl) {
        updateStatus('Please navigate to a website to analyze its privacy policy');
        return;
    }

    // Skip analysis for chrome:// URLs and other non-http(s) URLs
    if (!currentTabUrl.startsWith('http://') && !currentTabUrl.startsWith('https://')) {
        updateStatus('Navigate to a website to automatically analyze its privacy policy');
        return;
    }

    // Skip analysis for the PrivacyAI website itself
    if (currentTabUrl.includes('privacy-ai.netlify.app')) {
        updateStatus('✨ You are on the PrivacyAI website - no analysis needed here!');
        resultsContent.innerHTML = `
            <div class="analysis-section">
                <div class="section-content" style="text-align: center; color: rgba(255, 255, 255, 0.8);">
                    <h4 style="color: #00bfff; margin-bottom: 10px;">🏠 Welcome to PrivacyAI!</h4>
                    <p>You're currently on the main PrivacyAI website. Navigate to other websites to automatically analyze their privacy policies.</p>
                </div>
            </div>
        `;
        detailsSection.style.display = 'none';
        return;
    }

    try {
        // Check if analysis is already available
        const cachedResult = await chrome.storage.local.get([`analysis_${currentTabUrl}`]);
        
        if (cachedResult[`analysis_${currentTabUrl}`]) {
            // Analysis is ready, show results
            updateStatus('✅ Privacy policy analyzed automatically');
            showResults(cachedResult[`analysis_${currentTabUrl}`]);
        } else {
            // Analysis might be in progress or needed
            updateStatus('🔍 Privacy policy analysis in progress...');
            showLoading();
            
            // Wait a moment and check again (in case analysis just started)
            setTimeout(async () => {
                const result = await chrome.storage.local.get([`analysis_${currentTabUrl}`]);
                if (result[`analysis_${currentTabUrl}`]) {
                    updateStatus('✅ Privacy policy analyzed automatically');
                    showResults(result[`analysis_${currentTabUrl}`]);
                } else {
                    // If still no results after waiting, trigger analysis
                    updateStatus('🔍 Starting privacy policy analysis...');
                    await handleAutomaticAnalysis();
                }
            }, 2000);
        }
    } catch (error) {
        console.error('Error checking analysis status:', error);
        updateStatus('🔍 Starting privacy policy analysis...');
        await handleAutomaticAnalysis();
    }
}

// Update status message
function updateStatus(message) {
    statusText.textContent = message;
}

// Shorten URL for display
function shortenUrl(url) {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        if (domain.length > 30) {
            return domain.substring(0, 27) + '...';
        }
        return domain;
    } catch (error) {
        return url.length > 30 ? url.substring(0, 27) + '...' : url;
    }
}

// Automatic analysis function
async function handleAutomaticAnalysis() {
    showLoading();
    
    try {
        // Send request to backend - same API as main website
        const response = await fetch(`${API_BASE_URL}${ANALYZE_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: currentTabUrl })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache the result
        await chrome.storage.local.set({
            [`analysis_${currentTabUrl}`]: data,
            lastAnalyzedUrl: currentTabUrl,
            lastAnalysisTime: Date.now()
        });
        
        // Display results (only risk level and summary for extension)
        updateStatus('✅ Privacy policy analyzed');
        showResults(data);

    } catch (error) {
        console.error('Analysis error:', error);
        updateStatus('❌ Failed to analyze privacy policy');
        showError('Failed to analyze the website. Please check if the URL is accessible.');
    }
}

// Show loading state
function showLoading() {
    updateStatus('🔍 Analyzing privacy policy...');
    
    resultsContent.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>AI is analyzing the privacy policy...</span>
        </div>
    `;
    
    detailsSection.style.display = 'none';
}

// Show results (simplified for extension)
function showResults(data) {
    // Check if data is a JSON object or string
    let analysisData;
    if (typeof data === 'string') {
        try {
            analysisData = JSON.parse(data);
        } catch (e) {
            analysisData = { summary: data };
        }
    } else {
        analysisData = data.analysisResult || data.result || data;
    }

    // If analysisData is still a string, try to parse it again
    if (typeof analysisData === 'string') {
        try {
            analysisData = JSON.parse(analysisData);
        } catch (e) {
            analysisData = { summary: analysisData };
        }
    }
    
    const formattedHTML = formatPrivacyAnalysisForExtension(analysisData);
    resultsContent.innerHTML = formattedHTML;
    
    // Show the "More Details" button
    detailsSection.style.display = 'block';
}

// Show error
function showError(message) {
    resultsContent.innerHTML = `
        <div class="error">
            <strong>Error:</strong> ${message}
        </div>
    `;
    
    detailsSection.style.display = 'none';
}

// Format analysis for extension (simplified - only risk level and summary)
function formatPrivacyAnalysisForExtension(data) {
    if (!data || typeof data !== 'object') {
        return `<div class="analysis-section">
            <div class="section-content">${data || 'No analysis data available'}</div>
        </div>`;
    }

    let html = '';

    // Risk Level Header (if available)
    if (data.riskLevel) {
        const riskClass = data.riskLevel.toLowerCase();
        html += `
            <div class="risk-header">
                <span class="risk-badge ${riskClass}">
                    Risk Level: ${data.riskLevel}
                </span>
            </div>
        `;
    }

    // Accessibility Status
    if (data.accessible !== undefined) {
        const accessibleText = data.accessible ? 'Accessible' : 'Not Accessible';
        const accessibleIcon = data.accessible ? '✅' : '❌';
        html += `
            <div class="accessibility-status">
                <span class="status-badge ${data.accessible ? 'accessible' : 'not-accessible'}">
                    ${accessibleIcon} Privacy Policy ${accessibleText}
                </span>
            </div>
        `;
    }

    // Summary Section (main content for extension)
    if (data.summary) {
        html += `
            <div class="analysis-section">
                <h4 class="section-title">📋 Analysis Summary</h4>
                <div class="section-content">${data.summary}</div>
            </div>
        `;
    }

    // Brief recommendations if available
    if (data.recommendations) {
        html += `
            <div class="analysis-section">
                <h4 class="section-title">💡 Key Recommendations</h4>
                <div class="section-content">${truncateText(data.recommendations, 200)}</div>
            </div>
        `;
    }

    return `<div class="formatted-analysis">${html}</div>`;
}

// Truncate text for extension display
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Open full analysis on main website
function openFullAnalysis() {
    const websiteUrl = 'https://privacy-ai.netlify.app/';
    const urlWithParams = `${websiteUrl}?url=${encodeURIComponent(currentTabUrl)}`;
    
    chrome.tabs.create({ url: urlWithParams });
    window.close(); // Close the extension popup
}

// Background image cycling animation
function cycleBackgroundImages() {
    const images = document.querySelectorAll('.bg-image');
    let currentIndex = 0;

    setInterval(() => {
        images.forEach((img, index) => {
            if (index === currentIndex) {
                img.style.opacity = '0.15';
            } else {
                img.style.opacity = '0.05';
            }
        });
        currentIndex = (currentIndex + 1) % images.length;
    }, 5000);
}
