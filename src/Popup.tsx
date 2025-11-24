import React, { useState } from 'react'
// `chrome` is injected by the browser in extension contexts. TypeScript may not
// know about the global, so declare it as any to avoid type errors in this file.
declare const chrome: any

export default function Popup(): React.ReactElement {
  const [website, setWebsite] = useState('')

  return (
    // Use a fixed width for the popup so Chrome sizes the popup consistently.
    // Tailwind `w-80` = 20rem = 320px. Adjust to taste (w-72, w-80, w-96 etc.).
    <div className="w-80 p-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h3>Extension popup</h3>
      <p>Hello from React + TypeScript!</p>

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
          onClick={() => {
            // Send the input to the background service worker for logging/storage
            chrome.runtime.sendMessage({ type: 'logInput', payload: { website } }, (resp: any) => {
              console.log('background response', resp)
            })
          }}
        >
          Join
        </button>
      </div>
    </div>
        )
}