import React, { useState } from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import Popup from './Popup'
import Matchmaking from './Matchmaking'

function App() {
  const [currentPage, setCurrentPage] = useState<'analyze' | 'matchmaking'>('analyze')

  return (
    <div className="w-full" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem' }}>
      {/* Navbar */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md">
        <div className="flex w-full">
          <button 
            className={`flex-1 py-3 font-medium border-b-2 transition-all ${
              currentPage === 'analyze' 
                ? 'border-white' 
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            onClick={() => setCurrentPage('analyze')}
          >
            Analyze
          </button>
          <button 
            className={`flex-1 py-3 font-medium border-b-2 transition-all ${
              currentPage === 'matchmaking' 
                ? 'border-white' 
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            onClick={() => setCurrentPage('matchmaking')}
          >
            Matchmaking
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ padding: '1rem' }}>
        {currentPage === 'analyze' ? <Popup /> : <Matchmaking />}
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