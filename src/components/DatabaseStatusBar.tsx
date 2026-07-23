import React from 'react';
import { Database, HardDrive, CheckCircle2, RefreshCw, Cloud } from 'lucide-react';

interface DatabaseStatusBarProps {
  isQuotaExceeded?: boolean;
  lastDbSyncTime?: string;
  onSaveAllToDatabase?: () => void;
  onPullFreshFromDatabase?: () => void;
  isSavingAllToDb?: boolean;
  isPullingFreshDb?: boolean;
}

export default function DatabaseStatusBar({
  isQuotaExceeded = false,
  lastDbSyncTime,
  onSaveAllToDatabase,
  onPullFreshFromDatabase,
  isSavingAllToDb = false,
  isPullingFreshDb = false,
}: DatabaseStatusBarProps) {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOfflineMode = typeof window !== 'undefined' && window.localStorage.getItem('stock_manager_is_offline') === 'true';
  const isDatabaseConnected = isOnline && !isQuotaExceeded && !isOfflineMode;

  return (
    <div className={`mb-4 p-2.5 px-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-all ${
      isDatabaseConnected 
        ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200/90 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100' 
        : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200/90 dark:border-amber-800/60 text-amber-950 dark:text-amber-100'
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-2 rounded-lg shrink-0 ${
          isDatabaseConnected 
            ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-900 shadow-xs' 
            : 'bg-amber-600 text-white ring-2 ring-amber-200 dark:ring-amber-900 shadow-xs'
        }`}>
          {isDatabaseConnected ? (
            <Database className="h-4 w-4" />
          ) : (
            <HardDrive className="h-4 w-4" />
          )}
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${
              isDatabaseConnected 
                ? 'bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-700/60' 
                : 'bg-amber-100/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isDatabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isDatabaseConnected ? 'Database เชื่อมต่อสมบูรณ์' : 'ทำงานแบบ Local'}
            </span>
            {isDatabaseConnected && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Cloud Firestore Live Sync Active
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 truncate">
            {isDatabaseConnected ? (
              <>ระบบเชื่อมต่อกับคลาวด์ฐานข้อมูลกลางเรียบร้อย {lastDbSyncTime ? `• ซิงค์ล่าสุด: ${lastDbSyncTime}` : '• พร้อมซิงค์เรียลไทม์'}</>
            ) : (
              <>ขณะนี้ระบบทำงานและบันทึกข้อมูลไว้ในเครื่อง (LocalStorage) ปลอดภัย ซิงค์กลับ Cloud ได้ตลอดเวลา</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
        {onPullFreshFromDatabase && (
          <button
            type="button"
            onClick={onPullFreshFromDatabase}
            disabled={isPullingFreshDb}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            title="ดึงข้อมูลล่าสุดจาก Cloud Firestore"
          >
            <RefreshCw className={`h-3 w-3 text-indigo-600 dark:text-indigo-400 ${isPullingFreshDb ? 'animate-spin' : ''}`} />
            <span>{isPullingFreshDb ? 'กำลังดึง...' : 'ดึงข้อมูลคลาวด์'}</span>
          </button>
        )}

        {onSaveAllToDatabase && (
          <button
            type="button"
            onClick={onSaveAllToDatabase}
            disabled={isSavingAllToDb}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer ${
              isDatabaseConnected 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
            title="บันทึกข้อมูลทั้งหมดลงใน Database หลัก"
          >
            <Cloud className={`h-3 w-3 ${isSavingAllToDb ? 'animate-spin' : ''}`} />
            <span>{isSavingAllToDb ? 'กำลังซิงค์...' : 'บันทึกลง Database'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
