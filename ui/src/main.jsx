import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './utils/ThemeProvider.jsx'
import FrameworkProvider from './core/provider/FrameworkProvider.jsx'
import mysqlOrmProvider from './core/provider/mysqlOrmProvider.js'
import mysqlOrmAuthProvider from './core/provider/mysqlOrmAuthProvider.js'
import SocketProvider from './core/realtime/SocketProvider.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

import { App as AntdApp } from "antd";

import "antd/dist/antd.css";
import "antd-distinct-system-css/index.css";
import './index.css';

const BASE_URL = import.meta.env.VITE_API_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ThemeProvider>
          <AntdApp>
            <FrameworkProvider
              dataProvider={mysqlOrmProvider(BASE_URL)}
              authProvider={mysqlOrmAuthProvider()}
              resources={resources}
            >
              <SocketProvider>
                <App />
              </SocketProvider>
            </FrameworkProvider>
          </AntdApp>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
