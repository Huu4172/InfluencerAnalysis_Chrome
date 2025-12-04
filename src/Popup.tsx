import React, { useState } from 'react'
// `chrome` is injected by the browser in extension contexts. TypeScript may not
// know about the global, so declare it as any to avoid type errors in this file.
declare const chrome: any

export default function Popup(): React.ReactElement {
  const [website, setWebsite] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')

  return (
    <div className="flex flex-col items-center">
      <div className="join">
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
          <button
          className="btn btn-neutral join-item"
          disabled={isLoading || !website}
          onClick={() => {
            // Send the input to the background service worker for analysis
            setIsLoading(true)
            setStatus('Scraping profile...')
            
            chrome.runtime.sendMessage({ type: 'analyseURL', payload: { website } }, (resp: any) => {
              console.log('background response', resp)
              setIsLoading(false)
              
              if (resp?.ok) {
                setStatus(`✓ Success! Found ${resp.followers} followers and ${resp.posts?.length || 0} posts`)
              } else if (resp?.error) {
                setStatus(`✗ Error: ${resp.error}`)
              } else {
                setStatus('✓ Analysis complete')
              }
              
              // Clear status after 5 seconds
              setTimeout(() => setStatus(''), 5000)
            })
          }}
        >
          {isLoading ? 'Analyzing...' : 'Analyse'}
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-2">
          <span className="loading loading-ring loading-md"></span>
          <span className="text-sm">{status}</span>
        </div>
      )}
      
      {!isLoading && status && (
        <div className="mt-4 text-sm">
          {status}
        </div>
      )}
    </div>
  )
}