// Configuration for PrivacyAI Extension
const CONFIG = {
    // Perplexity AI API Configuration
    PERPLEXITY_API_KEY: '', // Will be set by user on first run
    PERPLEXITY_API_URL: 'https://api.perplexity.ai/chat/completions',
    PERPLEXITY_MODEL: 'sonar', // Model with online search capability
    
    // Cache settings
    CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    
    // Analysis settings
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000, // milliseconds
};

// CONFIG is now available globally in the service worker
