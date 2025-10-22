// Content script for PrivacyAI extension
// This script runs on every page to collect information

(function() {
    'use strict';

    // Function to extract privacy policy links from the current page
    function findPrivacyPolicyLinks() {
        const possibleSelectors = [
            'a[href*="privacy"]',
            'a[href*="Privacy"]',
            'a[href*="PRIVACY"]',
            'a[href*="terms"]',
            'a[href*="Terms"]'
        ];

        const links = [];
        
        // First, get all links with href containing privacy/terms
        possibleSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const text = el.textContent.toLowerCase();
                    const href = el.href;
                    
                    if (text.includes('privacy') && href) {
                        links.push({
                            text: el.textContent.trim(),
                            url: href,
                            element: el
                        });
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });

        // Also search for links by text content (since :contains is not valid CSS)
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(el => {
            const text = el.textContent.toLowerCase();
            const href = el.href;
            
            if ((text.includes('privacy policy') || 
                 text.includes('privacy') || 
                 text === 'privacy') && 
                 href && 
                 !links.some(link => link.url === href)) {
                links.push({
                    text: el.textContent.trim(),
                    url: href,
                    element: el
                });
            }
        });

        return links;
    }

    // Function to extract meta information about the site
    function extractSiteInfo() {
        const info = {
            url: window.location.href,
            domain: window.location.hostname,
            title: document.title,
            hasPrivacyLinks: false,
            privacyLinks: [],
            metaDescription: '',
            hasGDPRNotice: false,
            hasCookieBanner: false
        };

        // Find privacy policy links
        const privacyLinks = findPrivacyPolicyLinks();
        info.privacyLinks = privacyLinks.map(link => ({
            text: link.text,
            url: link.url
        }));
        info.hasPrivacyLinks = privacyLinks.length > 0;

        // Get meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            info.metaDescription = metaDesc.content;
        }

        // Check for GDPR notices (common text patterns)
        const gdprKeywords = ['gdpr', 'cookie', 'consent', 'tracking', 'privacy policy'];
        const bodyText = document.body ? document.body.textContent.toLowerCase() : '';
        info.hasGDPRNotice = gdprKeywords.some(keyword => bodyText.includes(keyword));

        // Check for cookie banners (common class names and IDs)
        const cookieBannerSelectors = [
            '.cookie-banner',
            '.cookie-notice',
            '.cookie-consent',
            '#cookie-banner',
            '#cookie-notice',
            '#cookieConsent',
            '[class*="cookie"]',
            '[id*="cookie"]',
            '.gdpr-banner',
            '.consent-banner'
        ];

        info.hasCookieBanner = cookieBannerSelectors.some(selector => {
            try {
                return document.querySelector(selector) !== null;
            } catch (e) {
                return false;
            }
        });

        return info;
    }

    // Send site information to background script when requested
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getSiteInfo') {
            const siteInfo = extractSiteInfo();
            sendResponse(siteInfo);
        }
    });

    // Optional: Highlight privacy-related links on the page
    function highlightPrivacyLinks() {
        const privacyLinks = findPrivacyPolicyLinks();
        privacyLinks.forEach(link => {
            if (link.element) {
                link.element.style.outline = '2px solid #8a2be2';
                link.element.style.outlineOffset = '2px';
                link.element.title = 'Privacy Policy Link - Analyze with PrivacyAI';
            }
        });
    }

    // Initialize content script
    function init() {
        // Only run on HTTP/HTTPS pages
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            // Extract and store site info for potential use
            const siteInfo = extractSiteInfo();
            
            // Store in session storage for quick access
            try {
                sessionStorage.setItem('privacyai_site_info', JSON.stringify(siteInfo));
            } catch (e) {
                // Ignore storage errors
            }

            // Optional: Uncomment to highlight privacy links on all pages
            // highlightPrivacyLinks();
        }
    }

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
