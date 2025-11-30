// Simple MV3 service worker (background script)
// Listens for messages from popup/content scripts and logs/stores payloads.

self.addEventListener('install', () => {
  // Activate immediately
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  // Claim clients so messages can be received immediately
  self.clients && self.clients.claim && self.clients.claim()
})

chrome.action.onClicked.addListener((tab) => {
  // Open popup.html in a small popup window when the extension icon is clicked
    chrome.windows.create({
      url: chrome.runtime.getURL('dist/popup.html'),
      type: 'popup',
      width: 400,
      height: 600,
      focused: true,
      state: 'normal'
    }, (window) => {
      // Exit fullscreen if the window was created in fullscreen mode
      if (window && window.state === 'fullscreen') {
        chrome.windows.update(window.id, { state: 'minimized' })
      }
    })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return

  if (message.type === 'logInput') {
    console.log('[background] Received input payload:', message.payload)

    // Save to storage (requires "storage" permission in manifest)
    try {
      // Use the async callback to determine success/failure and reply to the sender there.
      chrome.storage.local.set({ lastInput: message.payload }, () => {
        if (chrome.runtime.lastError) {
          // Storage API reported an error (permissions/quota/etc.)
          console.warn('[background] Failed to save to chrome.storage.local', chrome.runtime.lastError)
          if (sendResponse) sendResponse({ ok: false, error: chrome.runtime.lastError.message || String(chrome.runtime.lastError) })
        } else {
          console.log('[background] Saved payload to chrome.storage.local')
          if (sendResponse) sendResponse({ ok: true })
        }
      })
    } catch (e) {
      // chrome.storage may not be available in some environments
      console.warn('[background] chrome.storage not available', e)
      if (sendResponse) sendResponse({ ok: false, error: e && e.message ? e.message : String(e) })
    }

    // Keep the message channel open so we can call sendResponse asynchronously inside the storage callback
    return true
  }

    if (message.type === 'analyseURL') {
        const urlToAnalyse = message.payload.website;

    console.log('[background] Analyse URL from message payload:', urlToAnalyse)

    // Create a background tab to scrape data in the URL
    // The tab opens in the background (not focused) for minimal disruption
    chrome.tabs.create({
        url: urlToAnalyse, 
        active: true,
    }, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id},
        //callback after having access to the page
        func: () => {
          // Wait for page to load and extract follower count
          return new Promise((resolve) => {
            // Initialize debug logs array
            const __logs = [];
            
            // Scroll function to trigger lazy loading
            const scrollToLoadContent = async () => {
              console.log('[scraper] Starting scroll to trigger lazy loading...');
              const scrollStep = 300; // pixels to scroll each step
              const scrollDelay = 200; // milliseconds between scrolls
              const maxScrolls = 10; // maximum number of scroll steps
              
              for (let i = 0; i < maxScrolls; i++) {
                window.scrollBy(0, scrollStep);
                console.log(`[scraper] Scrolled ${scrollStep * (i + 1)}px`);
                await new Promise(resolve => setTimeout(resolve, scrollDelay));
              }
              
              // Scroll back to top to see all loaded content
              window.scrollTo(0, 0);
              console.log('[scraper] Scrolled back to top');
              
              // Wait a bit for content to stabilize
              await new Promise(resolve => setTimeout(resolve, 1000));
            };
            
            const maxAttempts = 20;
            let attempts = 0;
            let hasScrolled = false;
            
            const checkForData = async () => {
              attempts++;
              
              let followers = null;
              let platform = 'unknown';
              let posts = [];
              let postEmpty = true;
              

              // Detect TikTok
              if (window.location.hostname.includes('tiktok.com')) {
                platform = 'tiktok';
                // Method 1: Look for follower count attribute
                const followerElement = document.querySelector('strong[data-e2e="followers-count"]');
                if (followerElement) {
                  followers = followerElement.textContent.trim();
                }

      // Extract up to 3 recent posts with tags
      try {
        const postList = document.querySelector('div[data-e2e="user-post-item-list"]');
        if (postList) {
          const postItems = Array.from(postList.querySelectorAll('div[id^="grid-item-container-"]')).slice(0, 3);
          
          console.log('[Scraper] Found', postItems.length, 'post items');

          posts = postItems.map((item, idx) => {
            // Get post URL
            let postUrl = null;
            const anchor = item.querySelector('a[href]');
            if (anchor) {
              const href = anchor.getAttribute('href');
              if (href && href.startsWith('/')) {
                postUrl = 'https://www.tiktok.com' + href;
              } else if (href) {
                postUrl = href;
              }
            }

                    // Get tags from image alt text (TikTok stores caption/tags in alt attribute)
                    let tags = [];
                    let captionPreview = '';
                    const img = item.querySelector('img[alt]');
                    if (img) {
                    const alt = img.getAttribute('alt') || '';
                    captionPreview = alt.substring(0, 150).replace(/\n/g, ' ').trim();

                    // Extract hashtags using regex
                    const hashtagMatches = alt.match(/#(\w+)/g);
                    if (hashtagMatches) {
                        tags = hashtagMatches.map(tag => tag.substring(1)).slice(0, 15); // Remove # and limit to 15 tags
                    }
                    }

                    console.log('[Scraper] Post', idx + 1, ':', tags.length, 'tags');

                    return {
                    postUrl: postUrl,
                    tags: tags,
                    captionPreview: captionPreview
                    };
                }).filter(post => post.postUrl); // Only include posts with valid URLs
                }
            } catch (e) {
                console.error('[Scraper] Error getting posts:', e);
            }
                
                // If we haven't scrolled yet and haven't found enough posts, trigger scroll
                if (!hasScrolled && attempts > 5 && posts.length < 3) {
                  console.log('[scraper] Not enough posts found, triggering scroll...');
                  hasScrolled = true;
                  await scrollToLoadContent();
                  // After scrolling, give it another chance to find data
                  setTimeout(checkForData, 500);
                  return;
                }
              }
              
              // Check if we have valid post data (not just empty containers)
              const hasValidPosts = posts.length > 0 && posts.some(post => post.postUrl && post.tags);
              
              // If we found data or reached max attempts, resolve
              if ((followers && hasValidPosts) || attempts >= maxAttempts) {
                console.log(`[scraper] Resolving with ${posts.length} posts after ${attempts} attempts`);
                resolve({
                  html: document.documentElement.outerHTML,
                  followers: followers,
                  platform: platform,
                  found: !!followers,
                  url: window.location.href,
                  posts: posts,
                  debugLogs: __logs
                });
              } else {
                // Wait and try again
                setTimeout(checkForData, 500);
              }
            };
            
            checkForData();
          });
        }
      }, 
      (results) => {
		//Check for error from previous execution
        if (chrome.runtime.lastError) {
          console.error('[background] Script execution failed: ', chrome.runtime.lastError);
          if (sendResponse) sendResponse({ ok: false, error: chrome.runtime.lastError.message || String(chrome.runtime.lastError) });
          chrome.tabs.remove(tab.id);
          return;
        }
        
        const result = results[0].result;
        console.log('[background] Retrieved page data for analysis.');
        console.log('[background] Platform:', result.platform);
        console.log('[background] Follower count:', result.followers);
        console.log('[background] Found:', result.found);
        console.log('[background] posts length:', result.posts.length);
        
        
        // Send the data back to the sender
        if (sendResponse) sendResponse({ 
          ok: true, 
          html: result.html,
          followers: result.followers,
          platform: result.platform,
          found: result.found,
          url: result.url,
          posts: result.posts || [],
          debugLogs: result.debugLogs || []
        });
        
        // Close the tab after scraping
        chrome.tabs.remove(tab.id);
      });
    });


    // Keep the message channel open for async response
    return true 
};

  // Return true to indicate asynchronous sendResponse (not used here but safe)
  return true
});
