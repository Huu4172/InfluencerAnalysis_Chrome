import React from 'react'

export default function Results(): React.ReactElement {
  return (
    <div className="text-center py-8">
      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Matchmaking</h3>
      <h5 className="text-base font-semibold text-gray-700 mb-2">(For businesses)</h5>
      <p className="text-sm text-gray-500">
        Query the tiktok user based on your preferences.
      </p>
      <p className="text-xs text-gray-400 mt-4">
        Coming soon...
      </p>
    </div>
  )
}
