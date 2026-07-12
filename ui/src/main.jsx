import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './utils/ThemeProvider.jsx'
import FrameworkProvider from './core/provider/FrameworkProvider.jsx'
import mysqlOrmProvider from './core/provider/mysqlOrmProvider.js'
import mysqlOrmAuthProvider from './core/provider/mysqlOrmAuthProvider.js'

const BASE_URL = import.meta.env.VITE_API_URL;

const resources = [
  {
    name: 'admin',
    label: 'Users',
    permissions: {
      list: 'read:admin',
      create: 'create:admin',
      edit: 'update:admin',
      delete: 'delete:admin',
    },
    meta: {
      mysql: {
        tableConfig: {
          searchable: ['name', 'email'],
        },
      },
    },
  },
  {
    name: 'admin_roles',
    label: 'Roles',
    permissions: {
      list: 'read:admin_roles',
      create: 'create:admin_roles',
      edit: 'update:admin_roles',
      delete: 'delete:admin_roles',
    },
    meta: {},
  },
];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <FrameworkProvider
          dataProvider={mysqlOrmProvider(BASE_URL)}
          authProvider={mysqlOrmAuthProvider()}
          resources={resources}
        >
          <App />
        </FrameworkProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
