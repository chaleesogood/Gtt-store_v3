import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Safe LocalStorage patch to handle QuotaExceededError and disabled iframe local storage
(function() {
  let isLocalStorageAvailable = false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  } catch (e) {
    console.warn('[Storage Patch] Native localStorage is not fully functional or blocked:', e);
  }

  if (isLocalStorageAvailable) {
    // Wrap setItem to catch QuotaExceededError gracefully
    try {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = function (key: string, value: string) {
        try {
          originalSetItem.call(window.localStorage, key, value);
        } catch (error) {
          console.warn(`[Storage Patch] Quota exceeded for key "${key}". Value not saved to local storage but app remains stable.`, error);
        }
      };
    } catch (e) {
      console.error('[Storage Patch] Failed to override setItem:', e);
    }
  } else {
    // Mock localStorage in-memory fallback
    try {
      const memoryStorage: Record<string, string> = {};
      const mockStorage = {
        getItem: (key: string) => (key in memoryStorage ? memoryStorage[key] : null),
        setItem: (key: string, value: string) => {
          memoryStorage[key] = String(value);
        },
        removeItem: (key: string) => {
          delete memoryStorage[key];
        },
        clear: () => {
          for (const key in memoryStorage) {
            delete memoryStorage[key];
          }
        },
        key: (index: number) => Object.keys(memoryStorage)[index] || null,
        get length() {
          return Object.keys(memoryStorage).length;
        }
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true,
        writable: true
      });
      console.log('[Storage Patch] Mock localStorage in-memory storage successfully installed.');
    } catch (e) {
      console.error('[Storage Patch] Failed to define mock localStorage:', e);
    }
  }
})();

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

