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

    // Create a background tab (incognito) to scrape data in the URL
    // Incognito is used as no chrome extension can be activated in the mode
    // This creates a seamless experience for users
    chrome.tabs.create({
        url: urlToAnalyse, 
        active: false, 
        incognito: true
    }, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id},
        //callback after having access to the page
        func: () => {
          return document.documentElement.outerHTML;
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
        const pageHTML = results[0].result;
        console.log('[background] Retrieved page HTML for analysis.');
        
        // Send the HTML back to the sender
        if (sendResponse) sendResponse({ ok: true, html: pageHTML });
        
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
