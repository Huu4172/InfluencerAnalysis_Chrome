import React from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import Popup from './Popup'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  )
}