import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { consumeOAuthRedirect } from './lib/sync/oauthRedirect'
import './index.css'

// Back from Google sign-in: take the token out of the URL before HashRouter reads the hash
consumeOAuthRedirect()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
