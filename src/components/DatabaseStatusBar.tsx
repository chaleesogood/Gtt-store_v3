import React from 'react';
import { Database, HardDrive, CheckCircle2, RefreshCw, Cloud, Laptop, CloudUpload, Download, ArrowDownCircle, ArrowUpCircle, BookOpen } from 'lucide-react';

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

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const port = typeof window !== 'undefined' ? window.location.port : '3000';
  const isLocalhostHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isDevContainer = hostname.includes('ais-dev') || isLocalhostHost;

  const isOfflineMode = typeof window !== 'undefined' && window.localStorage.getItem('stock_manager_is_offline') === 'true';
  const isDatabaseConnected = isOnline && !isQuotaExceeded && !isOfflineMode;

  return (
    <div className="mb-5 space-y-2.5">
      {/* 3-Part Status Ribbon Header: Localhost / Dev Database / Production Database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-sans">
        {/* 1. Localhost / Runtime Host Status */}
        <div className={`p-2.5 px-3 rounded-xl border flex items-center justify-between transition-all ${
          isLocalhostHost 
            ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-950 dark:text-blue-100'
            : isDevContainer
            ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100'
            : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              isLocalhostHost ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
              <Laptop className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[11px] uppercase tracking-wider">Localhost / Runtime</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              </div>
              <p className="text-[10.5px] opacity-80 font-mono truncate">
                {isLocalhostHost ? `localhost:${port || 3000}` : isDevContainer ? `ais-dev (${hostname.slice(0, 15)}...)` : `Production Host (${hostname.slice(0, 15)}...)`}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/60 border border-current shrink-0">
            {isLocalhostHost ? 'LOCAL' : isDevContainer ? 'DEV CONTAINER' : 'PROD HOST'}
          </span>
        </div>

        {/* 2. Dev Database Status */}
        <div className={`p-2.5 px-3 rounded-xl border flex items-center justify-between transition-all ${
          isOfflineMode || isQuotaExceeded
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100 ring-1 ring-amber-400/50'
            : 'bg-slate-100/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              isOfflineMode || isQuotaExceeded ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'
            }`}>
              <HardDrive className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[11px] uppercase tracking-wider">Dev Database</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${isOfflineMode || isQuotaExceeded ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
              </div>
              <p className="text-[10.5px] opacity-80 truncate">
                {isOfflineMode ? 'Local Cache Active (Offline Mode)' : isQuotaExceeded ? 'Fallback Sandbox (Quota Standby)' : 'IndexedDB / Local Storage Backup'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
            isOfflineMode || isQuotaExceeded
              ? 'bg-amber-200/80 text-amber-900 border-amber-400'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
          }`}>
            {isOfflineMode || isQuotaExceeded ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        {/* 3. Production Database Status */}
        <div className={`p-2.5 px-3 rounded-xl border flex items-center justify-between transition-all ${
          isDatabaseConnected
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-400/50'
            : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              isDatabaseConnected ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              <Database className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[11px] uppercase tracking-wider">Production Database</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${isDatabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              </div>
              <p className="text-[10.5px] opacity-90 font-mono font-bold text-emerald-800 dark:text-emerald-300 truncate">
                Cloud Firestore (store-gtt)
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
            isDatabaseConnected
              ? 'bg-emerald-200/90 text-emerald-900 border-emerald-400'
              : 'bg-rose-200/90 text-rose-900 border-rose-400'
          }`}>
            {isDatabaseConnected ? 'LIVE SYNC' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Connection Bar & Dedicated Read / Write Action Buttons for Production Database */}
      <div className={`p-3 px-4 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 transition-all ${
        isDatabaseConnected 
          ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100 shadow-2xs' 
          : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-800/80 text-amber-950 dark:text-amber-100 shadow-2xs'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isDatabaseConnected 
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-200 dark:ring-emerald-900 shadow-xs' 
              : 'bg-amber-600 text-white ring-2 ring-amber-200 dark:ring-amber-900 shadow-xs'
          }`}>
            {isDatabaseConnected ? (
              <Database className="h-5 w-5" />
            ) : (
              <HardDrive className="h-5 w-5" />
            )}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${
                isDatabaseConnected 
                  ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700' 
                  : 'bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isDatabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isDatabaseConnected ? 'Production Database (store-gtt) พร้อมอ่าน-เขียน' : 'Dev Database Local Fallback Mode'}
              </span>
              {isDatabaseConnected && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Cloud Firestore Live
                </span>
              )}
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium mt-1 truncate">
              {isDatabaseConnected ? (
                <>เชื่อมต่อ Production Database Cloud Firestore (<span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">store-gtt</span>) แล้ว {lastDbSyncTime ? `• ซิงค์ล่าสุด: ${lastDbSyncTime}` : '• พร้อมซิงค์เรียลไทม์'}</>
              ) : (
                <>ขณะนี้ระบบทำงานและบันทึกข้อมูลไว้ในเครื่อง (Dev LocalStorage) ปลอดภัย ซิงค์กลับ Production DB ได้ตลอดเวลา</>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons for Read & Write on Production Database Cloud Firestore (store-gtt) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/80 dark:border-slate-800">
          {/* Read Button */}
          {onPullFreshFromDatabase && (
            <button
              type="button"
              onClick={onPullFreshFromDatabase}
              disabled={isPullingFreshDb}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/80 hover:bg-indigo-50/80 dark:hover:bg-slate-700/90 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              title="อ่านและดึงข้อมูลล่าสุดจาก Production Database Cloud Firestore (store-gtt)"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 ${isPullingFreshDb ? 'animate-spin' : ''}`} />
              <span>{isPullingFreshDb ? 'กำลังอ่านข้อมูล...' : 'อ่าน/ดึงข้อมูล Production DB (store-gtt)'}</span>
            </button>
          )}

          {/* Write / Save Button */}
          {onSaveAllToDatabase && (
            <button
              type="button"
              onClick={onSaveAllToDatabase}
              disabled={isSavingAllToDb}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 cursor-pointer ${
                isDatabaseConnected 
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/20' 
                  : 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-500/20'
              }`}
              title="บันทึกข้อมูลทั้งหมดลงใน Production Database Cloud Firestore (store-gtt)"
            >
              <CloudUpload className={`h-3.5 w-3.5 ${isSavingAllToDb ? 'animate-spin' : ''}`} />
              <span>{isSavingAllToDb ? 'กำลังบันทึก...' : 'บันทึกข้อมูล Production DB (store-gtt)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


