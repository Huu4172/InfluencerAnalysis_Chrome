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


    if (message.type === 'analyseURL' || message.action === 'scrape') {
        const urlToAnalyse = message.payload?.website || message.url;

    console.log('[background] Analyse URL from message payload:', urlToAnalyse)

    // Query for the active tab (granted by activeTab permission when user clicks extension)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        if (sendResponse) sendResponse({ 
          ok: false, 
          success: false,
          error: 'No active tab found. Please make sure you have a TikTok profile page open.' 
        });
        return;
      }

      const activeTab = tabs[0];
      const currentUrl = activeTab.url;

      console.log('[background] Active tab URL:', currentUrl);

      // Validate the active tab is a TikTok profile URL
      try {
        const urlObj = new URL(currentUrl);
        
        // Check protocol
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          if (sendResponse) sendResponse({ 
            ok: false, 
            success: false,
            error: 'Invalid URL: Must use http or https protocol' 
          });
          return;
        }
        
        // Check if it's a TikTok or Instagram profile URL
        const isTikTok = urlObj.hostname.includes('tiktok.com');
        const isInstagram = urlObj.hostname.includes('instagram.com');
        const hasTikTokUsername = urlObj.pathname.startsWith('/@') && urlObj.pathname.length > 2;
        const hasInstagramUsername = urlObj.pathname.split('/')[1] && urlObj.pathname.split('/')[1].length > 0 && !urlObj.pathname.includes('/p/') && !urlObj.pathname.includes('/reel/');
        
        if (isTikTok && !hasTikTokUsername) {
          if (sendResponse) sendResponse({ 
            ok: false, 
            success: false,
            error: 'Current tab is not a TikTok profile. Please navigate to a TikTok profile page (e.g., https://www.tiktok.com/@username) first.' 
          });
          return;
        }
        
        if (isInstagram && !hasInstagramUsername) {
          if (sendResponse) sendResponse({ 
            ok: false, 
            success: false,
            error: 'Current tab is not an Instagram profile. Please navigate to an Instagram profile page (e.g., https://www.instagram.com/username) first.' 
          });
          return;
        }
        
        if (!isTikTok && !isInstagram) {
          if (sendResponse) sendResponse({ 
            ok: false, 
            success: false,
            error: 'Current tab is not a TikTok or Instagram profile. Please navigate to a supported profile page first.' 
          });
          return;
        }
      } catch (e) {
        if (sendResponse) sendResponse({ 
          ok: false, 
          success: false,
          error: 'Invalid URL format' 
        });
        return;
      }

      // Execute scraping script on the active tab
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
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
            let profileImageUrl = null; // Store profile image URL outside checkForData
            let displayName = null; // Store display name outside checkForData
            
            const checkForData = async () => {
              attempts++;
              
              let followers = null;
              let platform = 'unknown';
              let posts = [];
              

            // Detect TikTok
            if (window.location.hostname.includes('tiktok.com')) {
              platform = 'tiktok';
                
                // Extract display name (user-subtitle)
                if (attempts === 1 && !displayName) {
                  const nameElement = document.querySelector('h2[data-e2e="user-subtitle"]') ||
                                     document.querySelector('h2[data-e2e="user-title"]') ||
                                     document.querySelector('[data-e2e="user-page"] h2');
                  if (nameElement) {
                    displayName = nameElement.textContent.trim();
                    console.log('[Scraper] Found display name:', displayName);
                  }
                }
                
                // Method 1: Look for follower count attribute
                const followerElement = document.querySelector('strong[data-e2e="followers-count"]');
                if (followerElement) {
                  followers = followerElement.textContent.trim();
                }

                // Extract profile image URL (only on first attempt)
                if (attempts === 1 && !profileImageUrl) {
                  const profileImg = document.querySelector('img[data-e2e="user-avatar"]') || 
                                     document.querySelector('span[data-e2e="user-avatar"] img') ||
                                     document.querySelector('div[data-e2e="user-avatar"] img');
                  if (profileImg && profileImg.src) {
                    profileImageUrl = profileImg.src;
                    console.log('[Scraper] Found profile image:', profileImageUrl);
                  }
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
              
              // Detect Instagram
              if (window.location.hostname.includes('instagram.com')) {
                platform = 'instagram';
                
                // Extract display name
                if (attempts === 1 && !displayName) {
                  // Instagram stores full name in header section
                  const nameElement = document.querySelector('header section h1') ||
                                     document.querySelector('section main header section h1') ||
                                     document.querySelector('h2._aacl._aacs._aact._aacx._aada');
                  if (nameElement) {
                    displayName = nameElement.textContent.trim();
                    console.log('[Scraper] Found Instagram display name:', displayName);
                  }
                }
                
                // Extract follower count - Instagram uses specific list structure
                if (!followers) {
                  // Method 1: Look for specific Instagram class names on section elements
                  const followerSections = document.querySelectorAll('section.x98rzlu.xeuugli, section.xeuugli.x98rzlu, section[class*="x98rzlu"][class*="xeuugli"]');
                  for (const section of followerSections) {
                    const text = section.textContent.trim();
                    // Check if it contains numbers and potential follower indicators
                    if (text && text.toLowerCase().includes('follower')) {
                      // Extract just the number part
                      const match = text.match(/([\d,.]+[KMB]?)\s*follower/i);
                      if (match) {
                        followers = match[1].trim();
                        console.log('[Scraper] Found Instagram followers (method 1 - section class):', followers);
                        break;
                      }
                    }
                  }
                  
                  // Method 2: Look for span elements with those class names inside sections
                  if (!followers) {
                    const followerElements = document.querySelectorAll('section span.x98rzlu.xeuugli, section span.xeuugli.x98rzlu, span[class*="x98rzlu"][class*="xeuugli"]');
                    for (const elem of followerElements) {
                      const text = elem.textContent.trim();
                      // Check if it contains numbers and potential follower indicators
                      if (text && /^[\d,.]+[KMB]?$/.test(text)) {
                        const parent = elem.closest('li') || elem.closest('section');
                        // Verify it's the followers element by checking if parent contains "follower" text
                        if (parent && parent.textContent.toLowerCase().includes('follower')) {
                          followers = text;
                          console.log('[Scraper] Found Instagram followers (method 2 - span class):', followers);
                          break;
                        }
                      }
                    }
                  }
                  
                  // Method 3: Look for the "followers" text and get adjacent span
                  if (!followers) {
                    const listItems = document.querySelectorAll('header section ul li');
                    for (const li of listItems) {
                      const text = li.textContent;
                      if (text.toLowerCase().includes('follower')) {
                        // Get the number before "followers" text
                        const match = text.match(/([\d,.KMB]+)\s*follower/i);
                        if (match) {
                          followers = match[1].trim();
                          console.log('[Scraper] Found Instagram followers (method 3 - text match):', followers);
                          break;
                        }
                      }
                    }
                  }
                  
                  // Method 4: Look for title attribute (shows exact count on hover)
                  if (!followers) {
                    const followerSpans = document.querySelectorAll('header section ul li a span[title], header section ul li button span[title]');
                    for (const span of followerSpans) {
                      const title = span.getAttribute('title');
                      if (title && /^\d/.test(title)) {
                        followers = title.replace(/[^0-9KMB,.]/g, '');
                        console.log('[Scraper] Found Instagram followers (method 4 - title):', followers);
                        break;
                      }
                    }
                  }
                  
                  // Method 5: Look for specific class patterns (fallback)
                  if (!followers) {
                    const metaItems = document.querySelectorAll('header section ul li span, header section ul li a span');
                    for (let i = 0; i < metaItems.length; i++) {
                      const item = metaItems[i];
                      const nextItem = metaItems[i + 1];
                      if (nextItem && nextItem.textContent.toLowerCase().includes('follower')) {
                        followers = item.textContent.trim();
                        console.log('[Scraper] Found Instagram followers (method 5 - adjacent):', followers);
                        break;
                      }
                    }
                  }
                }
                
                // Extract profile image URL (only on first attempt)
                if (attempts === 1 && !profileImageUrl) {
                  const profileImg = document.querySelector('header img') ||
                                     document.querySelector('header canvas + img');
                  if (profileImg && profileImg.src && !profileImg.src.includes('data:image')) {
                    profileImageUrl = profileImg.src;
                    console.log('[Scraper] Found Instagram profile image:', profileImageUrl);
                  }
                }
                
                // Extract up to 3 recent posts with tags
                try {
                  let postLinks = [];
                  
                  // Method 1: Find the correct hierarchy - xg7h5cd container > _ac7v row > _aagv posts
                  // Step 1: Find the main container that holds all posts
                  const mainContainer = document.querySelector('.xg7h5cd.x1n2onr6, [class*="xg7h5cd"][class*="x1n2onr6"]');
                  console.log('[Scraper] Found main container:', !!mainContainer);
                  if (mainContainer) {
                    console.log('[Scraper] Main container classes:', mainContainer.className);
                  }
                  
                  if (mainContainer) {
                    // Step 2: Find the first horizontal row inside the container
                    const firstRow = mainContainer.querySelector('._ac7v.x1ty9z65.xzboxd6, [class*="_ac7v"][class*="x1ty9z65"][class*="xzboxd6"]');
                    console.log('[Scraper] Found first row:', !!firstRow);
                    if (firstRow) {
                      console.log('[Scraper] First row classes:', firstRow.className);
                    }
                    
                    if (firstRow) {
                      // Step 3: Get all _aagv post divs from the first row (should be 3 posts)
                      const postDivs = Array.from(firstRow.querySelectorAll('._aagv, [class*="_aagv"]'));
                      console.log('[Scraper] Found', postDivs.length, 'post divs with _aagv class in first row');
                      
                      // Get the links from each post div
                      for (const postDiv of postDivs.slice(0, 3)) {
                        console.log('[Scraper] Post div classes:', postDiv.className);
                        
                        // The _aagv div contains the img, but the link is its parent or ancestor
                        // Try to find the link by going up the DOM tree
                        let link = postDiv.closest('a[href*="/p/"], a[href*="/reel/"]');
                        
                        // If not found as parent, try to find sibling
                        if (!link) {
                          const parent = postDiv.parentElement;
                          if (parent) {
                            link = parent.querySelector('a[href*="/p/"], a[href*="/reel/"]');
                          }
                        }
                        
                        console.log('[Scraper] Found link:', !!link, link ? link.href : 'no link');
                        
                        if (link) {
                          postLinks.push({ link, postDiv }); // Store both for tag extraction
                        }
                      }
                    }
                  }
                  
                  // Method 2: Fallback - directly find all _aagv posts
                  if (postLinks.length === 0) {
                    const postDivs = Array.from(document.querySelectorAll('._aagv, [class*="_aagv"]')).slice(0, 3);
                    console.log('[Scraper] Found', postDivs.length, 'post divs (fallback method)');
                    
                    for (const postDiv of postDivs) {
                      const link = postDiv.querySelector('a[href*="/p/"], a[href*="/reel/"]');
                      if (link) {
                        postLinks.push({ link, postDiv });
                      }
                    }
                  }
                  
                  // Method 3: Original fallback
                  if (postLinks.length === 0) {
                    const links = Array.from(document.querySelectorAll('article a[href*="/p/"], article a[href*="/reel/"]'))
                      .filter(link => {
                        const href = link.getAttribute('href');
                        return href && (href.match(/\//g) || []).length <= 3;
                      })
                      .slice(0, 3);
                    
                    for (const link of links) {
                      postLinks.push({ link, postDiv: link.closest('div') });
                    }
                    console.log('[Scraper] Found', postLinks.length, 'Instagram post links (original fallback)');
                  }
                  
                  console.log('[Scraper] Processing', postLinks.length, 'Instagram post links');
                  
                  for (const { link, postDiv } of postLinks) {
                    const postUrl = link.href;
                    
                    // Try to get caption/tags
                    let tags = [];
                    let captionPreview = '';
                    
                    // Method 1: Get from image alt text in the _aagv div
                    const img = postDiv.querySelector('img[alt]');
                    if (img) {
                      const alt = img.getAttribute('alt') || '';
                      if (alt && alt !== 'Instagram') {
                        captionPreview = alt.substring(0, 150).replace(/\n/g, ' ').trim();
                        
                        // Extract hashtags using regex
                        const hashtagMatches = alt.match(/#[A-Za-z0-9_]+/g);
                        if (hashtagMatches) {
                          tags = hashtagMatches.map(tag => tag.substring(1)).slice(0, 15);
                        }
                      }
                    }
                    
                    // If no tags found in alt, try to find them in the postDiv
                    if (tags.length === 0 && postDiv) {
                      const textContent = postDiv.textContent;
                      const hashtagMatches = textContent.match(/#[A-Za-z0-9_]+/g);
                      if (hashtagMatches) {
                        tags = hashtagMatches.map(tag => tag.substring(1)).slice(0, 15);
                      }
                    }
                    
                    console.log('[Scraper] Instagram Post', posts.length + 1, ':', tags.length, 'tags', captionPreview ? '(has caption)' : '(no caption)');
                    
                    posts.push({
                      postUrl: postUrl,
                      tags: tags,
                      captionPreview: captionPreview
                    });
                  }
                } catch (e) {
                  console.error('[Scraper] Error getting Instagram posts:', e);
                }
                
                // If we haven't scrolled yet and haven't found enough posts, trigger scroll
                if (!hasScrolled && attempts > 5 && posts.length < 3) {
                  console.log('[scraper] Not enough Instagram posts found, triggering scroll...');
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
                  displayName: displayName,
                  platform: platform,
                  found: !!followers,
                  url: window.location.href,
                  posts: posts,
                  profileImageUrl: profileImageUrl,
                  debugLogs: __logs,
                  failedScraping: !followers || !hasValidPosts
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
          if (sendResponse) sendResponse({ 
            ok: false, 
            success: false,
            error: chrome.runtime.lastError.message || String(chrome.runtime.lastError) 
          });
          return;
        }
        
        const result = results[0].result;
        console.log('[background] Retrieved page data for analysis.');
        console.log('[background] Platform:', result.platform);
        console.log('[background] Follower count:', result.followers);
        console.log('[background] Found:', result.found);
        console.log('[background] posts length:', result.posts.length);
        console.log('[background] Display Name:', result.displayName);
        console.log('[background] Profile Image URL:', result.profileImageUrl);

        // Extract all tags from posts
        const allTags = [];
        for (const post of result.posts) {
          if (post.tags && Array.isArray(post.tags)) {
            allTags.push(...post.tags);
          }
        }

        // Extract username based on platform
        let username = 'unknown';
        try {
          const urlObj = new URL(result.url);
          if (result.platform === 'tiktok') {
            // TikTok: https://www.tiktok.com/@username
            username = result.url.split('@')[1]?.split('/')[0] || 'unknown';
          } else if (result.platform === 'instagram') {
            // Instagram: https://www.instagram.com/username
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
            username = pathParts[0] || 'unknown';
          }
        } catch (e) {
          console.error('[background] Error extracting username:', e);
        }

        // Data to be uploaded - only tags
        const uploadData = {
          username: username,
          name: result.displayName || username,
          followers: result.followers,
          tags: allTags,
          profileImageUrl: result.profileImageUrl || null,
          platform: result.platform || 'unknown'
        };

        console.log('[background] Uploading data to S3 via Lambda...', uploadData);

        // Upload to S3 via Lambda
        fetch('https://hetprm3fz5.execute-api.ap-southeast-1.amazonaws.com/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData)
        })
        .then(res => res.json())
        .then(data => {
          console.log('[background] Uploaded to DynamoDB and S3:', data);
          sendResponse({ 
            ok: true,
            success: true,
            html: result.html,
            followers: result.followers,
            platform: result.platform,
            found: result.found,
            url: result.url,
            posts: result.posts || [],
            debugLogs: result.debugLogs || [],
            s3Key: data.key,
            data: {
              username: uploadData.username,
              followers: result.followers,
              tags: allTags
            }
          });
        })
        .catch(err => {
          console.error('[background] Upload failed:', err);
          sendResponse({ 
            ok: false,
            success: false,
            error: err.message,
            html: result.html,
            platform: result.platform,
            url: result.url,
            ...result
          });
        });
      });
    });


    // Keep the message channel open for async response
    return true 
} else if (message.type == "search" && message.payload.searchType == 'influencer'){
    const tier = message.payload.targetFollowerTier || 'medium'
    const categories = message.payload.categories || []
    
    // Build URL with proper category handling
    const categoriesParam = Array.isArray(categories) && categories.length > 0 
        ? `&categories=${encodeURIComponent(categories.join(','))}`
        : ''
    
    const url = `https://hetprm3fz5.execute-api.ap-southeast-1.amazonaws.com/query?tier=${tier}${categoriesParam}`
    
    console.log('[background] Searching with URL:', url);
    
    fetch(url)
    .then(res => res.json())
    .then(data => {
        console.log('[background] Search results:', data);
        sendResponse({
            ok: true,
            success: true,
            count: data.count || 0,
            results: data.results || [],
            tier: data.tier,
            categories: data.categories
        });
    })
    .catch(err => {
        console.error('[background] Search failed:', err);
        sendResponse({
            ok: false,
            success: false,
            error: err.message
        });
    });
    // Keep the message channel open for async response
    return true
};

  // Return true to indicate asynchronous sendResponse (not used here but safe)
  return true
});
