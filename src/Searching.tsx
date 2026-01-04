import React, { useState } from 'react'
declare const chrome: any

interface SearchResult {
  username: string
  name: string
  followcount: string
  followerCountNumeric: number
  followerTier: string
  profileImageUrl: string
  categories: string[]
  lastUpdate: string
}

export default function Searching() {
  const [selectedTier, setSelectedTier] = useState<string>('medium')
  const [categories, setCategories] = useState<string>('')
  const [selectedSearchType, setSelectedSearchType] = useState<string>('influencer')
  const [showResults, setShowResults] = useState<boolean>(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const followerTiers = [
    { value: 'micro', label: 'Micro (<1K followers)', range: '< 1K' },
    { value: 'small', label: 'Small (1K - 10K followers)', range: '1K - 10K' },
    { value: 'medium', label: 'Medium (10K - 100K followers)', range: '10K - 100K' },
    { value: 'large', label: 'Large (100K - 1M followers)', range: '100K - 1M' },
    { value: 'mega', label: 'Mega (1M+ followers)', range: '1M+' },
  ]

  const searchTypes = [
    { value: 'influencer', label: 'Influencer/s'}
  ]

  const handleSearch = () => {
    setIsLoading(true)
    setError(null)
    
    chrome.runtime.sendMessage({ 
      type: 'search',
      payload: {
        searchType: selectedSearchType,
        targetFollowerTier: selectedTier,
        categories: categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0)
      }
    }, (resp: any) => {
      setIsLoading(false)
      if (resp && resp.ok) {
        setSearchResults(resp.results || [])
        setShowResults(true)
      } else {
        setError(resp?.error || 'Search failed')
      }
    })
  }

  const handleBackToSearch = () => {
    setShowResults(false)
    setSearchResults([])
    setError(null)
  }

  return (
    <div className="p-4 h-full">
      {!showResults ? (
        // Search Form Div
        <div className="h-full flex flex-col">
          <h2 className="text-2xl font-bold mb-6">Search Influencers</h2>
          
          <div className="mb-6">
            <label htmlFor="search-type-select" className="block text-sm font-medium text-gray-700 mb-2">
              Search for
            </label>
            <select
              id="search-type-select"
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      ) : (
        // Results Div
        <div className="h-full flex flex-col">
          <button
            onClick={handleBackToSearch}
            className="text-blue-500 hover:text-blue-700 font-medium mb-4 self-end"
          >
            ← Back to Search
          </button>
          
          <h2 className="text-2xl font-bold mb-6 text-center">Search Results</h2>

          <div className="text-sm text-gray-600 mb-4">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for tier: <span className="font-semibold">{selectedTier}</span>
            {categories && <span> with categories: <span className="font-semibold">{categories}</span></span>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No influencers found matching your criteria
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <a 
                    key={result.username}
                    href={`https://www.tiktok.com/@${result.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{result.name}</h3>
                        <p className="text-gray-600">@{result.username}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {result.followcount} followers • {result.followerTier} tier
                        </p>
                        {result.categories && result.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.categories.map((cat, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
