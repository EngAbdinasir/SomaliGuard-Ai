import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './auth.css';
import './styles/design-system.css';
import App from './App.jsx';

const savedTheme = localStorage.getItem('somaliGuardTheme') || 'light';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.body.classList.toggle('dark', savedTheme === 'dark' || (savedTheme === 'system' && prefersDark));

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
