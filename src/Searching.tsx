import React, { useState } from 'react'

export default function Searching() {
  const [selectedTier, setSelectedTier] = useState<string>('medium')

  const followerTiers = [
    { value: 'micro', label: 'Micro (<1K followers)', range: '< 1K' },
    { value: 'small', label: 'Small (1K - 10K followers)', range: '1K - 10K' },
    { value: 'medium', label: 'Medium (10K - 100K followers)', range: '10K - 100K' },
    { value: 'large', label: 'Large (100K - 1M followers)', range: '100K - 1M' },
    { value: 'mega', label: 'Mega (1M+ followers)', range: '1M+' },
  ]

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Search Influencers</h2>
      
      <div className="mb-6">
        <label htmlFor="tier-select" className="block text-sm font-medium text-gray-700 mb-2">
          Follower Tier
        </label>
        <select
          id="tier-select"
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {followerTiers.map((tier) => (
            <option key={tier.value} value={tier.value}>
              {tier.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Selected: {followerTiers.find(t => t.value === selectedTier)?.range}
        </p>
      </div>

        <button
        className={'btn btn-neutral'}
        >
        Search
      </button>
    </div>
  )
}
