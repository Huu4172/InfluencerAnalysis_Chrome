import React, { useState } from 'react'
declare const chrome: any

export default function Searching() {
  const [selectedTier, setSelectedTier] = useState<string>('medium')
  const [categories, setCategories] = useState<string>('')
  const [selectedSearchType, setSelectedSearchType] = useState<string>('influencer')

  const followerTiers = [
    { value: 'micro', label: 'Micro (<1K followers)', range: '< 1K' },
    { value: 'small', label: 'Small (1K - 10K followers)', range: '1K - 10K' },
    { value: 'medium', label: 'Medium (10K - 100K followers)', range: '10K - 100K' },
    { value: 'large', label: 'Large (100K - 1M followers)', range: '100K - 1M' },
    { value: 'mega', label: 'Mega (1M+ followers)', range: '1M+' },
  ]

  const searchTypes = [
    { value: 'influencer', label: 'Influencer/s'},
    { value: 'business', label: 'Business/es'}
  ]

  return (
    <div className="p-4">
      <div className="mb-6">
        <label htmlFor="tier-select" className="block text-sm font-medium text-gray-700 mb-2">
          Search for
        </label>
        <select
          id="tier-select"
          value={selectedSearchType}
          onChange={(e) => setSelectedSearchType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {searchTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Selected: {followerTiers.find(t => t.value === selectedTier)?.range}
        </p>
      </div>
      
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

      <div className="mb-6">
        <label htmlFor="categories-input" className="block text-sm font-medium text-gray-700 mb-2">
          Categories <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="categories-input"
          type="text"
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          placeholder="e.g., fitness, health, sports"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Enter categories separated by commas
        </p>
      </div>

      <button
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
      >
        Search
      </button>
    </div>
  )
}
