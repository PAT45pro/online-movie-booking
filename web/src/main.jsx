import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker để cache ảnh disk persistent
// Chỉ chạy ở production để dev không cache (debug dễ hơn)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('✓ Service Worker registered:', reg.scope))
      .catch(err => console.warn('⚠ Service Worker failed:', err));
  });
}
