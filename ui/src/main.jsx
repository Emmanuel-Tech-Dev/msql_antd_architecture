import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import "./assets/custom.css"

import App from './App.jsx'
import 'pace-js'
import 'pace-js/themes/green/pace-theme-flash.css'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './utils/ThemeProvider.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>

  </StrictMode>,
)
