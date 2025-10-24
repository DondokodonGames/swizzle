import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'  // ←この行を追加
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)