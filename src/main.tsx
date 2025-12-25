import React, { useState } from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import Popup from './Popup'
import Matchmaking from './Matchmaking'
import Searching from './Searching'

function App() {
  const [currentPage, setCurrentPage] = useState<'influencer' | 'business' | 'searching'>('influencer')

  return (
    <div className="w-full" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem' }}>
      {/* Navbar */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md">
        <div className="flex w-full">
          <button 
            className={`flex-1 py-3 font-medium border-b-2 transition-all ${
              currentPage === 'influencer' 
                ? 'border-white' 
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            onClick={() => setCurrentPage('influencer')}
          >
            Influencer
          </button>
          <button 
            className={`flex-1 py-3 font-medium border-b-2 transition-all ${
              currentPage === 'business' 
                ? 'border-white' 
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            onClick={() => setCurrentPage('business')}
          >
            Business
          </button>
          <button 
            className={`flex-1 py-3 font-medium border-b-2 transition-all ${
              currentPage === 'searching' 
                ? 'border-white' 
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            onClick={() => setCurrentPage('searching')}
          >
            Searching
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ padding: '1rem' }}>
        {currentPage === 'influencer' ? <Popup /> : currentPage === 'business' ? <Matchmaking /> : <Searching />}
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}