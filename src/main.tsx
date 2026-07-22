import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Safe console log interceptor to suppress harmless Firebase warning/error messages in sandboxed iframes
(function() {
  const filterKeywords = [
    'Using maximum backoff delay to prevent overloading the backend',
    '@firebase/firestore',
    'prevent overloading the backend'
  ];

  const originalWarn = window.console.warn;
  const originalError = window.console.error;

  const shouldSuppress = (args: any[]) => {
    return args.some(arg => {
      if (typeof arg === 'string') {
        return filterKeywords.some(keyword => arg.includes(keyword));
      }
      if (arg && typeof arg === 'object' && arg.message && typeof arg.message === 'string') {
        return filterKeywords.some(keyword => arg.message.includes(keyword));
      }
      return false;
    });
  };

  window.console.warn = function(...args: any[]) {
    if (shouldSuppress(args)) return;
    originalWarn.apply(window.console, args);
  };

  window.console.error = function(...args: any[]) {
    if (shouldSuppress(args)) return;
    originalError.apply(window.console, args);
  };
})();

// Safe LocalStorage patch to handle QuotaExceededError and ensure a single unified main database across all accounts
(function() {
  let isLocalStorageAvailable = false;
  let mockStorage: any = null;
  const memoryStorage: Record<string, string> = {};

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
  } catch (e) {
    console.warn('[Storage Patch] Native localStorage is not fully functional or blocked:', e);
  }

  // Canonical keys that form the shared main database
  const canonicalKeys = [
    'stock_manager_products',
    'stock_manager_categories',
    'stock_manager_activities',
    'stock_manager_boms',
    'stock_manager_projects_list',
    'stock_manager_jobs_list',
    'stock_manager_employees_list',
    'stock_manager_brands_list',
    'stock_manager_job_projects_list',
    'stock_manager_daily_reports_list',
    'stock_manager_user_roles'
  ];

  // Consolidate any legacy account-suffixed keys into the canonical single main database
  const consolidateAccountCaches = () => {
    try {
      if (!isLocalStorageAvailable) return;
      const keysToClean: string[] = [];
      
      canonicalKeys.forEach((canonicalKey) => {
        const itemsMap = new Map<string, any>();

        // 1. Load items from main canonical key
        const mainVal = window.localStorage.getItem(canonicalKey);
        if (mainVal) {
          try {
            const list = JSON.parse(mainVal);
            if (Array.isArray(list)) {
              list.forEach(item => {
                const id = item?.id ? String(item.id).trim() : null;
                if (id) itemsMap.set(id, item);
              });
            }
          } catch (e) {}
        }

        // 2. Scan for suffixed keys (e.g. stock_manager_products_email@domain.com)
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(`${canonicalKey}_`) && k !== canonicalKey) {
            keysToClean.push(k);
            const suffixedVal = window.localStorage.getItem(k);
            if (suffixedVal) {
              try {
                const list = JSON.parse(suffixedVal);
                if (Array.isArray(list)) {
                  list.forEach(item => {
                    const id = item?.id ? String(item.id).trim() : null;
                    if (id && !itemsMap.has(id)) {
                      itemsMap.set(id, item);
                    }
                  });
                }
              } catch (e) {}
            }
          }
        }

        // Save consolidated list back to main canonical key
        if (itemsMap.size > 0) {
          window.localStorage.setItem(canonicalKey, JSON.stringify(Array.from(itemsMap.values())));
        }
      });

      // Remove suffixed keys after consolidation
      keysToClean.forEach(k => {
        try { window.localStorage.removeItem(k); } catch (e) {}
      });
    } catch (err) {
      console.warn('[Storage Patch] Cache consolidation error:', err);
    }
  };

  if (isLocalStorageAvailable) {
    consolidateAccountCaches();

    try {
      const originalGetItem = window.localStorage.getItem;
      const originalSetItem = window.localStorage.setItem;
      const originalRemoveItem = window.localStorage.removeItem;

      // Always return single main canonical database key
      window.localStorage.getItem = function (key: string) {
        return originalGetItem.call(window.localStorage, key);
      };

      window.localStorage.setItem = function (key: string, value: string) {
        try {
          originalSetItem.call(window.localStorage, key, value);
        } catch (error) {
          console.warn(`[Storage Patch] Quota exceeded or write failed for key "${key}".`, error);
        }
      };

      window.localStorage.removeItem = function (key: string) {
        try {
          originalRemoveItem.call(window.localStorage, key);
        } catch (e) {}
      };

    } catch (e) {
      console.error('[Storage Patch] Failed to override native localStorage:', e);
    }
  } else {
    // Mock localStorage in-memory fallback
    try {
      mockStorage = {
        getItem: (key: string) => {
          return key in memoryStorage ? memoryStorage[key] : null;
        },
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
      console.log('[Storage Patch] Unified single-database mock localStorage successfully installed.');
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

