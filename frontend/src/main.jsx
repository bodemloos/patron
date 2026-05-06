import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LanguageProvider } from './i18n/index.jsx';
import { bootstrapNative } from './lib/native.js';
import './index.css';

// Initialise native plugins (status bar, keyboard, splash) when running
// inside an iOS / Android Capacitor shell. No-op on the web.
bootstrapNative();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);
