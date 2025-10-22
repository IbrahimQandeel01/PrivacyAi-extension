// Configuration for PrivacyAI Extension - EXAMPLE FILE
// Copy this file to config.js and add your actual API key

const CONFIG = {
    // Perplexity AI API Configuration
    // Note: Users will be prompted to enter their API key in the extension popup
    // Get your API key from: https://www.perplexity.ai/settings/api
    PERPLEXITY_API_KEY: '', // Leave empty - users will enter this via the UI
    
    // Perplexity API endpoint (don't change unless using a different endpoint)
    PERPLEXITY_API_URL: 'https://api.perplexity.ai/chat/completions',
    
    // Model to use - 'sonar' has online search capability
    PERPLEXITY_MODEL: 'sonar',
    
    // Cache settings
    CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    
    // Analysis settings
    MAX_RETRIES: 2, // Number of retry attempts for failed API calls
    RETRY_DELAY: 1000, // Delay between retries in milliseconds
};

// CONFIG is now available globally in the service worker
