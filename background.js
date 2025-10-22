// Background script for PrivacyAI Extension - Perplexity AI Integration
// Import configuration (note: in service workers, we need to use importScripts)
importScripts('config.js');

console.log('PrivacyAI Extension initialized with Perplexity AI');

// Get API key from storage
async function getApiKey() {
    const result = await chrome.storage.local.get(['perplexity_api_key']);
    return result.perplexity_api_key || CONFIG.PERPLEXITY_API_KEY;
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('PrivacyAI Extension installed - Using Perplexity AI');
});

// Listen for tab updates to automatically trigger analysis
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only react to completed page loads with valid URLs
    if (changeInfo.status === 'complete' && 
        tab.url && 
        (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        
        // Skip certain URLs
        if (shouldSkipUrl(tab.url)) {
            console.log('Skipping analysis for URL:', tab.url);
            return;
        }
        
        console.log('Page loaded, checking analysis for:', tab.url);
        
        try {
            // Check if this URL is already analyzed and cached
            const cachedAnalysis = await getFromCache(tab.url);
            
            if (cachedAnalysis) {
                console.log('Using cached analysis for:', tab.url);
                setRiskLevelBadge(cachedAnalysis.riskLevel);
            } else {
                console.log('Starting new analysis for:', tab.url);
                await analyzeWebsite(tab.url);
            }
        } catch (error) {
            console.error('Error in tab update handler:', error);
        }
    }
});

// Also listen for tab activation (when switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        
        if (tab.url && 
            (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
            !shouldSkipUrl(tab.url)) {
            
            const cachedAnalysis = await getFromCache(tab.url);
            
            if (cachedAnalysis) {
                console.log('Using cached analysis for activated tab:', tab.url);
                setRiskLevelBadge(cachedAnalysis.riskLevel);
            } else {
                console.log('Starting analysis for activated tab:', tab.url);
                await analyzeWebsite(tab.url);
            }
        } else {
            // Clear badge for non-analyzable pages
            chrome.action.setBadgeText({ text: "" });
        }
    } catch (error) {
        console.error('Error in tab activation handler:', error);
        chrome.action.setBadgeText({ text: "" });
    }
});

// Function to check if URL should be skipped
function shouldSkipUrl(url) {
    const skipPatterns = [
        'chrome://',
        'chrome-extension://',
        'edge://',
        'about:',
        'privacy-ai.netlify.app'
    ];
    
    return skipPatterns.some(pattern => url.includes(pattern));
}

// Function to normalize URL format for backend
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Use hostname and pathname, ignore query parameters and fragments
        return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
    } catch (error) {
        console.error('Error normalizing URL:', error);
        return url.toLowerCase();
    }
}

// Function to get analysis from cache
async function getFromCache(url) {
    try {
        const normalizedUrl = normalizeUrl(url);
        const storageKey = `analysis_${normalizedUrl}`;
        const result = await chrome.storage.local.get([storageKey]);
        
        if (result[storageKey]) {
            const cached = result[storageKey];
            // Check if cache is still valid
            const cacheAge = Date.now() - (cached.timestamp || 0);
            
            if (cacheAge < CONFIG.CACHE_DURATION) {
                return cached.data;
            } else {
                console.log('Cache expired for:', normalizedUrl);
                // Remove expired cache
                await chrome.storage.local.remove([storageKey]);
                return null;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting from cache:', error);
        return null;
    }
}

// Function to save analysis to cache
async function saveToCache(url, analysisData) {
    try {
        const normalizedUrl = normalizeUrl(url);
        const storageKey = `analysis_${normalizedUrl}`;
        
        await chrome.storage.local.set({
            [storageKey]: {
                data: analysisData,
                timestamp: Date.now(),
                url: url
            }
        });
        
        console.log('Analysis cached for:', normalizedUrl);
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}

// Function to set risk level badge
function setRiskLevelBadge(riskLevel) {
    if (!riskLevel) {
        chrome.action.setBadgeText({ text: "" });
        return;
    }
    
    const risk = riskLevel.toLowerCase();
    
    switch (risk) {
        case 'low':
            chrome.action.setBadgeText({ text: "L" });
            chrome.action.setBadgeBackgroundColor({ color: "#32CD32" }); // Green
            break;
        case 'medium':
            chrome.action.setBadgeText({ text: "M" });
            chrome.action.setBadgeBackgroundColor({ color: "#FFD700" }); // Gold/Yellow
            break;
        case 'high':
            chrome.action.setBadgeText({ text: "H" });
            chrome.action.setBadgeBackgroundColor({ color: "#FF6B6B" }); // Red
            break;
        default:
            chrome.action.setBadgeText({ text: "?" });
            chrome.action.setBadgeBackgroundColor({ color: "#8a2be2" }); // Purple
            break;
    }
    
    console.log(`Risk level badge set: ${riskLevel}`);
}

// Function to call Perplexity AI API
async function callPerplexityAPI(url, retryCount = 0) {
    try {
        // Get API key from storage
        const apiKey = await getApiKey();
        if (!apiKey) {
            throw new Error('API key not configured. Please set your Perplexity API key in the extension popup.');
        }
        
        const prompt = `Analyze the privacy policy of the website: ${url}

Please search for and analyze the privacy policy of this website. Provide your analysis in the following JSON format ONLY, with no additional text or explanation:

{
    "accessible": true or false (whether a privacy policy exists and is accessible),
    "riskLevel": "Low" or "Medium" or "High",
    "summary": "A brief 2-3 sentence summary of the key privacy concerns",
    "recommendations": "Specific user recommendations based on the privacy policy (2-3 sentences)"
}

Risk Level Guidelines:
- Low: Clear privacy policy, minimal data collection, transparent practices, strong user controls
- Medium: Some data collection concerns, third-party sharing, or unclear sections
- High: Extensive data collection, broad sharing rights, vague terms, or no accessible privacy policy

Respond ONLY with the JSON object, nothing else.`;

        console.log('Calling Perplexity AI for:', url);
        
        const response = await fetch(CONFIG.PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.PERPLEXITY_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a privacy policy analysis expert. You always respond with valid JSON only, no additional text.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.2,
                top_p: 0.9,
                return_citations: false,
                search_domain_filter: [new URL(url).hostname],
                search_recency_filter: "month"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Perplexity AI response:', data);
        
        // Extract the content from the response
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            throw new Error('No content in Perplexity response');
        }
        
        // Parse the JSON response
        let analysisData;
        try {
            // Try to extract JSON from the content (in case there's extra text)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0]);
            } else {
                analysisData = JSON.parse(content);
            }
        } catch (parseError) {
            console.error('Error parsing JSON from Perplexity:', parseError);
            // Fallback analysis if JSON parsing fails
            analysisData = {
                accessible: false,
                riskLevel: "Medium",
                summary: "Unable to parse privacy policy analysis. Please try again.",
                recommendations: "Visit the website's privacy policy page manually for more information."
            };
        }
        
        // Validate the response structure
        if (!analysisData.riskLevel || !analysisData.summary) {
            throw new Error('Invalid analysis data structure');
        }
        
        return analysisData;
        
    } catch (error) {
        console.error('Error calling Perplexity API:', error);
        
        // Retry logic
        if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`Retrying... Attempt ${retryCount + 1} of ${CONFIG.MAX_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return callPerplexityAPI(url, retryCount + 1);
        }
        
        throw error;
    }
}

// Function to automatically analyze website
async function analyzeWebsite(url) {
    try {
        // Set badge to show analysis is in progress
        chrome.action.setBadgeText({ text: "..." });
        chrome.action.setBadgeBackgroundColor({ color: "#8a2be2" });
        
        console.log('Starting Perplexity AI analysis for:', url);
        
        // Call Perplexity AI
        const analysisData = await callPerplexityAPI(url);
        
        // Save to cache
        await saveToCache(url, analysisData);
        
        // Set risk level badge
        setRiskLevelBadge(analysisData.riskLevel);
        
        console.log('Privacy policy analyzed successfully:', url, 'Risk Level:', analysisData.riskLevel);
        
    } catch (error) {
        console.error('Error analyzing website:', error);
        
        // Set badge to show error
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#ff6b6b" });
        
        // Save error state to cache to avoid repeated failed requests
        await saveToCache(url, {
            accessible: false,
            riskLevel: "Unknown",
            summary: "Failed to analyze privacy policy. The analysis service may be temporarily unavailable.",
            recommendations: "Please try again later or visit the website's privacy policy page manually.",
            error: true
        });
        
        // Clear error badge after 5 seconds
        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
        }, 5000);
    }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentUrl') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                sendResponse({ url: tabs[0].url });
            } else {
                sendResponse({ url: null });
            }
        });
        return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'analyzeNow') {
        // Force a new analysis
        analyzeWebsite(request.url).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'clearCache') {
        // Clear cached analysis for a specific URL
        const normalizedUrl = normalizeUrl(request.url);
        const storageKey = `analysis_${normalizedUrl}`;
        chrome.storage.local.remove([storageKey]).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});
