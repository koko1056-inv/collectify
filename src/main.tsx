
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

// Configure RevenueCat once at startup on native platforms.
const rcKey = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
if (Capacitor.isNativePlatform() && rcKey) {
  Purchases.configure({ apiKey: rcKey }).catch((err) => {
    console.error('[RevenueCat] configure failed', err);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
