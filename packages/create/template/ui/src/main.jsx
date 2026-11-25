import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route } from 'react-router-dom'
import { FrameworkApp } from '@msql-antd/framework-ui'
import '@msql-antd/framework-ui/styles.css'

const Home = lazy(() => import('./pages/Home.jsx'))

const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  mapProvider: import.meta.env.VITE_MAP_PROVIDER,
  mapboxAccessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  googleMapId: import.meta.env.VITE_GOOGLE_MAP_ID,
}

// Your resources (Users and Roles are built in) and your pages inside /admin.
const resources = []
const routes = (
  <>
    <Route index element={<Home />} />
    <Route path="home" element={<Home />} />
  </>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FrameworkApp config={config} resources={resources} routes={routes} />
  </StrictMode>,
)
