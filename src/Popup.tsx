import React, { useState } from 'react'
// `chrome` is injected by the browser in extension contexts. TypeScript may not
// know about the global, so declare it as any to avoid type errors in this file.
declare const chrome: any

export default function Popup(): React.ReactElement {
  // const [website, setWebsite] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [lastScrapedData, setLastScrapedData] = useState<any>(null)

  const handleDownloadHTML = () => {
    if (!lastScrapedData?.html) {
      alert('No HTML data available')
      return
    }

    const username = lastScrapedData.data?.username || 'page'
    const blob = new Blob([lastScrapedData.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${username}_${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col items-center">
      {/* Commented out input field - scraping from current page */}
      {/* <div className="join">
        <div>
          <label className="input validator join-item">
            <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth={2.5}
                fill="none"
                stroke="currentColor"
              >
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </g>
            </svg>
            <input
              type="url"
              placeholder="https://example.com"
              required
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          <div className="validator-hint hidden">Enter a valid URL</div>
        </div>
      </div> */}
      
      <button
        className={`btn ${isLoading ? 'btn-disabled opacity-50' : 'btn-neutral'}`}
        disabled={isLoading}
        onClick={() => {
          // Send message to scrape the current active tab
          setIsLoading(true)
          setStatus('Scraping current page...')
          
          chrome.runtime.sendMessage({ type: 'analyseURL' }, (resp: any) => {
            console.log('background response', resp)
            setIsLoading(false)
            
            // Store response if it has HTML from TikTok/Instagram
            if (resp?.html && (resp?.platform === 'tiktok' || resp?.platform === 'instagram')) {
              setLastScrapedData(resp)
            }
            
            if (resp?.ok || resp?.success) {
              const platformName = resp.platform === 'tiktok' ? 'TikTok' : resp.platform === 'instagram' ? 'Instagram' : 'social media'
              const postsCount = resp.posts?.length || 0
              const followerInfo = resp.followers || 'N/A'
              const username = resp.data?.username || 'Unknown'
              
              // Check if scraping was incomplete
              const hasIncompleteData = resp.failedScraping || !resp.followers || postsCount === 0
              
              // Build organized message
              let message = hasIncompleteData ? `⚠ Partially Scraped!\n\n` : `✓ Successfully Scraped!\n\n`
              message += `Platform: ${platformName}\n`
              message += `Username: @${username}\n`
              message += `Followers: ${followerInfo}`
              
              // Add warning if no followers found
              if (!resp.followers) {
                message += ` (⚠ Missing)`
              }
              message += `\n`
              
              if (postsCount > 0 && resp.posts) {
                message += `\nRecent Posts (${postsCount}):\n`
                resp.posts.forEach((post: any, idx: number) => {
                  const tags = post.tags && post.tags.length > 0 ? post.tags.join(', ') : 'no tags'
                  message += `  ${idx + 1}. ${tags}\n`
                })
              } else {
                message += `Posts: None collected (⚠ Missing)\n`
              }
              
              if (hasIncompleteData) {
                message += `\n⚠ Some information was missed during scraping`
                message += `\n(Raw HTML available for manual inspection)`
              } else {
                message += `\n✓ Data saved to database`
              }
              
              setStatus(message)
            } else if (resp?.error) {
              const platform = resp?.platform || ''
              let errorMsg = `✗ Error: ${resp.error}`
              if ((platform === 'tiktok' || platform === 'instagram') && resp?.html) {
                errorMsg += '\n\n(Raw HTML available for download)'
              }
              setStatus(errorMsg)
            } else {
              setStatus('✓ Analysis complete')
            }
            
            // Clear status after 5 seconds
            setTimeout(() => setStatus(''), 5000)
          })
        }}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Current Page'}
      </button>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2">
          <span className="loading loading-ring loading-md"></span>
          <span className="text-sm">{status}</span>
        </div>
      )}
      
      {!isLoading && status && (
        <div className="mt-4 text-sm whitespace-pre-line text-left max-w-full">
          {status}
        </div>
      )}
      
      {!isLoading && lastScrapedData?.html && (
        <button
          onClick={handleDownloadHTML}
          className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download HTML
        </button>
      )}
    </div>
  )
}