import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Package, 
  FolderTree, 
  Wrench, 
  Briefcase, 
  ClipboardList, 
  Users, 
  Tag, 
  FileText, 
  History, 
  Shield, 
  LogIn, 
  CheckSquare,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Search,
  Cpu,
  PlusCircle,
  X
} from 'lucide-react';
import { EngineeringPhaseSchedule } from '../types';
import { 
  authenticateGoogleSheets, 
  exportToGoogleSheets, 
  importFromGoogleSheets, 
  exportProjectAndModuleStatusToGoogleSheet,
  getGoogleSheetsAccessToken, 
  AllAppData 
} from '../services/googleSheetsService';

interface GoogleSheetsViewProps {
  appData: AllAppData;
  onUpdateAllData: (newData: AllAppData) => Promise<void>;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onSaveEngineeringSchedule?: (schedule: EngineeringPhaseSchedule) => Promise<void>;
  onDeleteEngineeringSchedule?: (id: string) => Promise<void>;
}

interface AddressIoFieldsGroupProps {
  items: EngineeringPhaseSchedule[];
  jobNo: string;
  projectName: string;
  moduleName: string;
  subModuleName: string;
  onSave: (schedule: EngineeringPhaseSchedule) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AddressIoFieldsGroup: React.FC<AddressIoFieldsGroupProps> = React.memo(({
  items,
  jobNo,
  projectName,
  moduleName,
  subModuleName,
  onSave,
  onDelete
}) => {
  const [localItems, setLocalItems] = useState<EngineeringPhaseSchedule[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleAddAddressIo = async () => {
    const newItem: EngineeringPhaseSchedule = {
      id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      jobNo,
      projectName,
      moduleName,
      subModuleName,
      addressIo: '',
      installStatus: 'pending',
      wiringStatus: 'pending',
      testIoStatus: 'pending',
      manualHmiStatus: 'pending',
      semiAutoStatus: 'pending',
      autoStatus: 'pending',
      assignee: '',
      remark: '',
      updatedAt: new Date().toISOString()
    };
    setLocalItems(prev => [...prev, newItem]);
    await onSave(newItem);
  };

  const handleDeleteIo = async (id: string) => {
    setLocalItems(prev => prev.filter(item => item.id !== id));
    await onDelete(id);
  };

  return (
    <div className="space-y-1.5 w-full">
      {localItems.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-400 w-4 text-right shrink-0">{index + 1}.</span>
          <input
            type="text"
            value={item.addressIo || ''}
            onChange={(e) => {
              const val = e.target.value;
              setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, addressIo: val } : i));
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (val !== (item.addressIo || '')) {
                onSave({ ...item, addressIo: val, updatedAt: new Date().toISOString() });
              }
            }}
            placeholder="เช่น I:0.0 / O:1.2 / X0..."
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 transition-all shadow-2xs"
          />
          <button
            type="button"
            onClick={() => handleDeleteIo(item.id)}
            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer shrink-0"
            title="ลบ Address IO นี้"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        id="btn-add-address-io"
        onClick={handleAddAddressIo}
        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
        title="เพิ่มช่องกรอก Address IO ใหม่ใต้ช่องเดิม"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Address IO</span>
      </button>
    </div>
  );
});

const ALL_TAB_IDS = [
  'Products',
  'Categories',
  'BOMs',
  'Projects',
  'Jobs',
  'Employees',
  'Brands',
  'DailyReports',
  'Activities',
  'UserRoles',
  'EngineeringSchedules'
];

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  appData,
  onUpdateAllData,
  addToast,
  onSaveEngineeringSchedule,
  onDeleteEngineeringSchedule
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('google_sheets_spreadsheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    const id = localStorage.getItem('google_sheets_spreadsheet_id');
    return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : '';
  });
  const [lastSync, setLastSync] = useState<string>(() => {
    return localStorage.getItem('google_sheets_last_sync') || '';
  });

  const [schedulesList, setSchedulesList] = useState<EngineeringPhaseSchedule[]>(() => {
    if (appData.engineeringSchedules && appData.engineeringSchedules.length > 0) {
      return appData.engineeringSchedules;
    }
    try {
      const cached = localStorage.getItem('stock_manager_engineering_schedules_list');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (appData.engineeringSchedules && appData.engineeringSchedules.length > 0) {
      setSchedulesList(appData.engineeringSchedules);
    }
  }, [appData.engineeringSchedules]);

  const handleSaveScheduleItem = async (schedule: EngineeringPhaseSchedule) => {
    setSchedulesList(prev => {
      const idx = prev.findIndex(s => s.id === schedule.id);
      let next: EngineeringPhaseSchedule[];
      if (idx >= 0) {
        next = prev.map(s => s.id === schedule.id ? schedule : s);
      } else {
        next = [schedule, ...prev];
      }
      localStorage.setItem('stock_manager_engineering_schedules_list', JSON.stringify(next));
      return next;
    });

    if (onSaveEngineeringSchedule) {
      await onSaveEngineeringSchedule(schedule);
    }
  };

  const handleDeleteScheduleItem = async (id: string) => {
    setSchedulesList(prev => {
      const next = prev.filter(s => s.id !== id);
      localStorage.setItem('stock_manager_engineering_schedules_list', JSON.stringify(next));
      return next;
    });

    if (onDeleteEngineeringSchedule) {
      await onDeleteEngineeringSchedule(id);
    }
  };

  const [addressIoSearch, setAddressIoSearch] = useState('');
  const [selectedJobNo, setSelectedJobNo] = useState<string>('all');
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModJobNo, setNewModJobNo] = useState('');
  const [newModName, setNewModName] = useState('');
  const [newSubModName, setNewSubModName] = useState('');
  const [newInitialIo, setNewInitialIo] = useState('');

  const moduleGroups = useMemo(() => {
    const groups: Record<string, {
      key: string;
      jobNo: string;
      projectName: string;
      moduleName: string;
      subModuleName: string;
      items: EngineeringPhaseSchedule[];
    }> = {};

    schedulesList.forEach(item => {
      const jNo = item.jobNo || 'N/A';
      const mName = item.moduleName || 'General';
      const smName = item.subModuleName || 'General';
      const key = `${jNo}::${mName}::${smName}`;

      if (!groups[key]) {
        groups[key] = {
          key,
          jobNo: jNo,
          projectName: item.projectName || '',
          moduleName: mName,
          subModuleName: smName,
          items: []
        };
      }
      groups[key].items.push(item);
    });

    return Object.values(groups);
  }, [schedulesList]);

  const filteredModuleGroups = useMemo(() => {
    return moduleGroups.filter(g => {
      if (selectedJobNo !== 'all' && g.jobNo !== selectedJobNo) return false;
      if (!addressIoSearch.trim()) return true;
      const q = addressIoSearch.toLowerCase();
      const matchJob = g.jobNo.toLowerCase().includes(q);
      const matchProj = g.projectName.toLowerCase().includes(q);
      const matchMod = g.moduleName.toLowerCase().includes(q);
      const matchSubMod = g.subModuleName.toLowerCase().includes(q);
      const matchIo = g.items.some(i => (i.addressIo || '').toLowerCase().includes(q));
      return matchJob || matchProj || matchMod || matchSubMod || matchIo;
    });
  }, [moduleGroups, selectedJobNo, addressIoSearch]);

  const [autoSyncStatusEnabled, setAutoSyncStatusEnabled] = useState<boolean>(() => {
    return localStorage.getItem('google_sheets_auto_sync_status') !== 'false';
  });
  const [lastStatusSync, setLastStatusSync] = useState<string>(() => {
    return localStorage.getItem('google_sheets_last_status_sync') || '';
  });
  const [isSyncingStatus, setIsSyncingStatus] = useState<boolean>(false);

  const toggleAutoSyncStatus = (enabled: boolean) => {
    setAutoSyncStatusEnabled(enabled);
    localStorage.setItem('google_sheets_auto_sync_status', enabled ? 'true' : 'false');
    if (enabled) {
      addToast('info', 'เปิด Auto Sync สถานะ', 'เมื่อมีการอัปเดตสถานะงานในตาราง ระบบจะส่งข้อมูลไปที่ Google Sheet อัตโนมัติ');
    }
  };

  const syncProjectAndModuleStatusToSheet = async (overrideSheetId?: string) => {
    const targetSheetId = overrideSheetId || spreadsheetId;
    if (!targetSheetId) {
      addToast('warning', 'ยังไม่ได้ระบุ Spreadsheet ID', 'กรุณาระบุ Google Spreadsheet ID เพื่อดำเนินการซิงค์สถานะ');
      return;
    }

    setIsSyncingStatus(true);
    try {
      let token = getGoogleSheetsAccessToken();
      if (!token) {
        token = await authenticateGoogleSheets();
        setIsConnected(true);
      }

      let schedulesList: any[] = [];
      try {
        const localSchedStr = localStorage.getItem('stock_manager_engineering_schedules_list');
        if (localSchedStr) {
          schedulesList = JSON.parse(localSchedStr);
        }
      } catch (e) {
        console.warn('Error reading schedules:', e);
      }

      const res = await exportProjectAndModuleStatusToGoogleSheet(
        token,
        targetSheetId,
        appData.projects || [],
        appData.jobs || [],
        schedulesList
      );

      const nowStr = new Date().toLocaleString('th-TH');
      setLastStatusSync(nowStr);
      localStorage.setItem('google_sheets_last_status_sync', nowStr);

      addToast(
        'success',
        'ซิงค์สถานะโปรเจ็คและโมดูลสำเร็จ',
        `อัปเดตสถานะจำนวน ${res.rowsCount} รายการ ลงแท็บ "Project_Module_Status" ใน Google Sheet เรียบร้อยแล้ว`
      );
    } catch (err: any) {
      console.error('Status sync error:', err);
      addToast('error', 'ซิงค์สถานะล้มเหลว', err.message || 'ไม่สามารถอัปเดตสถานะลง Google Sheet ได้');
    } finally {
      setIsSyncingStatus(false);
    }
  };


  const [selectedTabs, setSelectedTabs] = useState<string[]>(ALL_TAB_IDS);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(!!getGoogleSheetsAccessToken());

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (getGoogleSheetsAccessToken()) {
      setIsConnected(true);
    }
  }, []);

  const toggleTabSelection = (tabId: string) => {
    if (selectedTabs.includes(tabId)) {
      setSelectedTabs(selectedTabs.filter(id => id !== tabId));
    } else {
      setSelectedTabs([...selectedTabs, tabId]);
    }
  };

  const handleSelectAll = () => setSelectedTabs(ALL_TAB_IDS);
  const handleDeselectAll = () => setSelectedTabs([]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const token = await authenticateGoogleSheets();
      if (token) {
        setIsConnected(true);
        addToast('success', 'เชื่อมต่อ Google สำเร็จ', 'เปิดสิทธิ์ Google Sheets & Drive เรียบร้อยแล้ว');
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      addToast('error', 'เชื่อมต่อล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ Google');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExport = async (overrideTabs?: string[]) => {
    const tabsToExport = overrideTabs || selectedTabs;
    if (tabsToExport.length === 0) {
      addToast('warning', 'ยังไม่ได้เลือกรายการ', 'กรุณาเลือกอย่างน้อย 1 รายการ/แท็บ เพื่อส่งออกไปยัง Google Sheets');
      return;
    }

    setIsExporting(true);
    try {
      let token = getGoogleSheetsAccessToken();
      if (!token) {
        token = await authenticateGoogleSheets();
        setIsConnected(true);
      }

      const result = await exportToGoogleSheets(token, appData, spreadsheetId, tabsToExport);
      
      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.url);
      localStorage.setItem('google_sheets_spreadsheet_id', result.spreadsheetId);

      const nowStr = new Date().toLocaleString('th-TH');
      setLastSync(nowStr);
      localStorage.setItem('google_sheets_last_sync', nowStr);

      addToast('success', 'ส่งออกข้อมูลสำเร็จ', `อัปเดตข้อมูลจำนวน ${tabsToExport.length} แท็บลง Google Sheets เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Export error:', err);
      addToast('error', 'ส่งออกข้อมูลล้มเหลว', err.message || 'ไม่สามารถส่งออกข้อมูลไปยัง Google Sheets ได้');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (!spreadsheetId) {
      addToast('warning', 'ยังไม่มีไฟล์ Google Sheets', 'โปรดทำการส่งออกข้อมูลเพื่อสร้างไฟล์หลักก่อน หรือระบุ Spreadsheet ID');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmImport = async () => {
    setShowConfirmModal(false);
    setIsImporting(true);
    addToast('info', 'กำลังดึงและบันทึกข้อมูล...', 'กำลังอ่านข้อมูลจาก Google Sheets และบันทึกลงฐานข้อมูล Database หลักโดยอัตโนมัติ');
    
    try {
      let token = getGoogleSheetsAccessToken();
      if (!token) {
        token = await authenticateGoogleSheets();
        setIsConnected(true);
      }

      const importedData = await importFromGoogleSheets(token, spreadsheetId, appData);
      
      // Auto-save & persist to Firestore + local state
      await onUpdateAllData(importedData);

      const nowStr = new Date().toLocaleString('th-TH');
      setLastSync(nowStr);
      localStorage.setItem('google_sheets_last_sync', nowStr);

      addToast('success', 'ซิงค์และบันทึกลง Database สำเร็จ', 'ดึงข้อมูลที่แก้ไขจาก Google Sheets และบันทึกลงใน Database หลักเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error('Import error:', err);
      addToast('error', 'ดึงข้อมูลล้มเหลว', err.message || 'ไม่สามารถอ่านข้อมูลจาก Google Sheets ได้');
    } finally {
      setIsImporting(false);
    }
  };

  const getEngineeringSchedulesCount = () => {
    if (appData.engineeringSchedules && appData.engineeringSchedules.length > 0) {
      return appData.engineeringSchedules.length;
    }
    try {
      const cached = localStorage.getItem('stock_manager_engineering_schedules_list');
      if (cached) return JSON.parse(cached).length;
    } catch (e) {}
    return 0;
  };

  const collectionStats = [
    { id: 'Products', icon: Package, title: '📦 สินค้าในคลัง (Products)', count: appData.products.length, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
    { id: 'Categories', icon: FolderTree, title: '📁 หมวดหมู่ (Categories)', count: appData.categories.length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
    { id: 'BOMs', icon: Wrench, title: '🛠️ สูตร BOM (BOMs)', count: appData.boms.length, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
    { id: 'Projects', icon: Briefcase, title: '🏗️ โครงการ (Projects)', count: appData.projects.length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
    { id: 'Jobs', icon: ClipboardList, title: '📋 ใบสั่งงาน (Jobs)', count: appData.jobs.length, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200' },
    { id: 'Employees', icon: Users, title: '👥 พนักงาน (Employees)', count: appData.employees.length, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200' },
    { id: 'Brands', icon: Tag, title: '🏷️ แบรนด์ (Brands)', count: appData.brands.length, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
    { id: 'DailyReports', icon: FileText, title: '📝 รายงานวัน (Daily Reports)', count: appData.dailyReports.length, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200' },
    { id: 'Activities', icon: History, title: '📜 ประวัติสต็อก (Activities)', count: appData.activities.length, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
    { id: 'UserRoles', icon: Shield, title: '🛡️ บัญชีผู้ใช้ (User Roles)', count: appData.userRoles.length, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
    { id: 'EngineeringSchedules', icon: Wrench, title: '⚙️ ตารางงาน Phase Matrix (โมดูล/Sub-module/IO)', count: getEngineeringSchedulesCount(), color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <FileSpreadsheet className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase mb-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Google Sheets Master Integration</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight mb-2">
            เชื่อมต่อ & แก้ไขข้อมูลผ่าน Google Sheets
          </h2>
          <p className="text-emerald-100 text-sm leading-relaxed mb-6 font-sans">
            เลือกส่งออกเฉพาะรายการที่ต้องการ หรือทั้ง 10 ตารางเข้าระบบ Google Sheets เพื่อเปิดดู แก้ไขข้อมูล และซิงค์กลับเข้าฐานข้อมูล Database หลักโดยอัตโนมัติ
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!isConnected ? (
              <button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
                id="btn-sheets-connect"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-emerald-700" />}
                <span>{isConnecting ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ Google เพื่อเชื่อมสเปรดชีต'}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-900/60 border border-emerald-400/40 rounded-2xl text-xs font-bold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>เชื่อมต่อ Google OAuth เรียบร้อยแล้ว</span>
              </div>
            )}

            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-white text-xs font-bold rounded-2xl border border-emerald-300/40 transition-all cursor-pointer"
                id="btn-sheets-open-external"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดแก้ไขใน Google Sheets</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Control Actions Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              จัดการการซิงค์ข้อมูล (Export / Import Auto Database)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lastSync ? `อัปเดตล่าสุดเมื่อ: ${lastSync}` : 'ยังไม่มีประวัติการส่งออกไฟล์ Google Sheets'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => handleExport()}
              disabled={isExporting || selectedTabs.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              id="btn-sheets-export"
            >
              <Upload className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
              <span>
                {isExporting 
                  ? 'กำลังส่งออกข้อมูล...' 
                  : `ส่งออกข้อมูลที่เลือก (${selectedTabs.length}/${ALL_TAB_IDS.length})`}
              </span>
            </button>

            <button
              onClick={handleImportClick}
              disabled={isImporting || !spreadsheetId}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
              id="btn-sheets-import"
            >
              <Download className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
              <span>{isImporting ? 'กำลังดึงและบันทึกลง DB...' : 'ดึงข้อมูลจาก Sheet กลับลง Database อัตโนมัติ'}</span>
            </button>
          </div>
        </div>

        {/* Spreadsheet Details */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300">Spreadsheet ID:</span>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => {
                setSpreadsheetId(e.target.value);
                localStorage.setItem('google_sheets_spreadsheet_id', e.target.value);
                setSpreadsheetUrl(e.target.value ? `https://docs.google.com/spreadsheets/d/${e.target.value}/edit` : '');
              }}
              placeholder="กรอก Google Spreadsheet ID เพื่อระบุไฟล์เดิม"
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs w-full sm:w-80 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>เปิดลิงก์สเปรดชีตเต็ม</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Dedicated Project & Module Status Auto-Sync Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Real-Time Status Auto Sync</span>
            </div>
            <h3 className="text-lg font-black font-sans text-white flex items-center gap-2">
              <span>⚡ ซิงค์สถานะโปรเจ็คและโมดูลลง Google Sheet อัตโนมัติ</span>
            </h3>
            <p className="text-xs text-indigo-200/80 font-sans leading-relaxed">
              ดึงข้อมูลความคืบหน้าสถานะการทำงาน (INSTALL, WIRING, TEST IO, MANUAL HMI, SEMI-AUTO, AUTO) จากโปรเจ็คและตารางงาน ส่งออกไปที่แท็บ <code className="bg-indigo-900/80 px-2 py-0.5 rounded text-amber-300 font-mono">Project_Module_Status</code> ใน Google Sheet ที่ระบุไว้โดยอัตโนมัติ
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-indigo-300">
              <div className="flex items-center gap-1.5 font-bold">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>โครงงาน: {appData.projects.length} รายการ</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <ClipboardList className="w-4 h-4 text-violet-400" />
                <span>ใบสั่งงาน: {appData.jobs.length} รายการ</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {lastStatusSync ? `ซิงค์สถานะล่าสุด: ${lastStatusSync}` : 'ยังไม่มีการซิงค์สถานะ'}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-3 w-full md:w-auto shrink-0">
            {/* Toggle Switch */}
            <label className="inline-flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl cursor-pointer hover:bg-slate-800 transition-all">
              <span className="text-xs font-bold text-slate-200 font-sans">
                Auto Sync เมื่อแก้ไขตารางงาน
              </span>
              <input
                type="checkbox"
                checked={autoSyncStatusEnabled}
                onChange={(e) => toggleAutoSyncStatus(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </label>

            {/* Sync Now Button */}
            <button
              onClick={() => syncProjectAndModuleStatusToSheet()}
              disabled={isSyncingStatus || !spreadsheetId}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-98 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              id="btn-sync-project-status-sheet"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingStatus ? 'animate-spin text-amber-300' : ''}`} />
              <span>{isSyncingStatus ? 'กำลังซิงค์สถานะ...' : 'ดึงสถานะซิงค์ลง Google Sheet ทันที'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Address IO & Module Manager Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>ตารางจัดการ Address IO & โมดูลงาน (Phase Matrix IO Manager)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              จัดการและเพิ่ม Address IO ในแต่ละโมดูลงาน กดปุ่ม <strong className="text-emerald-600 dark:text-emerald-400 font-mono">'Add Address IO'</strong> เพื่อเพิ่มช่องกรอก Address IO ใหม่ใต้ช่องเดิมได้แบบไดนามิกโดยไม่ต้องโหลดทั้งแถวใหม่
            </p>
          </div>

          <button
            onClick={() => {
              if (appData.projects && appData.projects.length > 0) {
                setNewModJobNo(appData.projects[0].jobNo);
              }
              setShowAddModuleModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มโมดูล/Sub-module ใหม่</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={addressIoSearch}
              onChange={(e) => setAddressIoSearch(e.target.value)}
              placeholder="ค้นหา Job No, โมดูล, Sub-module หรือ Address IO..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedJobNo}
            onChange={(e) => setSelectedJobNo(e.target.value)}
            className="w-full sm:w-60 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">-- ทุกโครงการ (All Projects) --</option>
            {appData.projects.map(p => (
              <option key={p.id} value={p.jobNo}>
                {p.jobNo} - {p.projectName}
              </option>
            ))}
          </select>
        </div>

        {/* Table or Empty State */}
        {filteredModuleGroups.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">ยังไม่มีรายการโมดูล / Address IO ที่ตรงตามเงื่อนไขค้นหา</p>
            <p className="text-[11px] text-slate-400 mt-1">กดปุ่ม "เพิ่มโมดูล/Sub-module ใหม่" หรือเลือกโครงการด้านบนเพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 w-32">Job No</th>
                  <th className="p-3 min-w-[140px]">โมดูล (Module)</th>
                  <th className="p-3 min-w-[140px]">Sub-Module</th>
                  <th className="p-3 min-w-[280px]">Address IO (Dynamic Input List)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredModuleGroups.map((group) => (
                  <tr key={group.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 align-top font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      <div>{group.jobNo}</div>
                      {group.projectName && (
                        <div className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-[110px]">
                          {group.projectName}
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top font-bold text-slate-800 dark:text-slate-200">
                      {group.moduleName}
                    </td>
                    <td className="p-3 align-top text-slate-700 dark:text-slate-300">
                      {group.subModuleName}
                    </td>
                    <td className="p-3 align-top">
                      <AddressIoFieldsGroup
                        items={group.items}
                        jobNo={group.jobNo}
                        projectName={group.projectName}
                        moduleName={group.moduleName}
                        subModuleName={group.subModuleName}
                        onSave={handleSaveScheduleItem}
                        onDelete={handleDeleteScheduleItem}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Adding New Module/Sub-module */}
      {showAddModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <span>เพิ่มโมดูล / Address IO ใหม่</span>
              </h4>
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">เลือกโครงการ / Job No</label>
                <select
                  value={newModJobNo}
                  onChange={(e) => setNewModJobNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-sans text-slate-800 dark:text-slate-100"
                >
                  {appData.projects.map(p => (
                    <option key={p.id} value={p.jobNo}>
                      {p.jobNo} - {p.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อโมดูล (Module Name)</label>
                <input
                  type="text"
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  placeholder="เช่น Power Distribution, PLC Cabinet, Robot Station"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sub-Module</label>
                <input
                  type="text"
                  value={newSubModName}
                  onChange={(e) => setNewSubModName(e.target.value)}
                  placeholder="เช่น Main Circuit, Input Card #1, Sensor Station"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Address IO (เริ่มต้น)</label>
                <input
                  type="text"
                  value={newInitialIo}
                  onChange={(e) => setNewInitialIo(e.target.value)}
                  placeholder="เช่น I:0.0 / O:1.2"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModuleModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  if (!newModJobNo || !newModName.trim()) {
                    addToast('warning', 'กรุณากรอกข้อมูล', 'โปรดเลือก Job No และระบุชื่อโมดูล');
                    return;
                  }
                  const proj = appData.projects.find(p => p.jobNo === newModJobNo);
                  const newItem: EngineeringPhaseSchedule = {
                    id: `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    jobNo: newModJobNo,
                    projectName: proj ? proj.projectName : '',
                    moduleName: newModName.trim(),
                    subModuleName: newSubModName.trim() || 'General',
                    addressIo: newInitialIo.trim(),
                    installStatus: 'pending',
                    wiringStatus: 'pending',
                    testIoStatus: 'pending',
                    manualHmiStatus: 'pending',
                    semiAutoStatus: 'pending',
                    autoStatus: 'pending',
                    assignee: '',
                    remark: '',
                    updatedAt: new Date().toISOString()
                  };
                  await handleSaveScheduleItem(newItem);
                  setShowAddModuleModal(false);
                  setNewModName('');
                  setNewSubModName('');
                  setNewInitialIo('');
                  addToast('success', 'สร้างโมดูลสำเร็จ', 'เพิ่มโมดูลและ Address IO ใหม่เข้าในตารางเรียบร้อยแล้ว');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm cursor-pointer"
              >
                บันทึกโมดูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selectable Collections Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans flex items-center gap-2">
            <span>📊 เลือกรายการ/แท็บที่จะทำการส่งออก (Selectable Tab Export)</span>
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono rounded-lg">
              เลือกอยู่ {selectedTabs.length}/{ALL_TAB_IDS.length} แท็บ
            </span>
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-all cursor-pointer"
            >
              เลือกทั้งหมด
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg font-bold transition-all cursor-pointer"
            >
              ปลดทั้งหมด
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {collectionStats.map((item) => {
            const IconComp = item.icon;
            const isSelected = selectedTabs.includes(item.id);

            return (
              <div 
                key={item.id}
                onClick={() => toggleTabSelection(item.id)}
                className={`border rounded-2xl p-4 transition-all cursor-pointer select-none relative group ${
                  isSelected 
                    ? 'bg-white dark:bg-slate-900 border-emerald-500/80 shadow-md ring-2 ring-emerald-500/20' 
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTabSelection(item.id);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-transform"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                      )}
                    </button>

                    <div className={`p-2 rounded-xl border ${item.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                  </div>

                  <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">
                    {item.count.toLocaleString()}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans mt-2">
                  {item.title}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                  <span className="text-slate-400 font-mono">แท็บ: {item.id}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport([item.id]);
                    }}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 font-bold rounded-md transition-all cursor-pointer"
                    title={`ส่งออกเฉพาะ ${item.id} ไปยัง Google Sheets`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>ส่งออกแท็บนี้</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Import Operation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">ยืนยันดึงข้อมูลซิงค์ลง Database?</h4>
                <p className="text-xs text-slate-500 font-sans">บันทึกอัตโนมัติลงใน Cloud Firestore & Storage</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed mb-6 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              ระบบจะอ่านข้อมูลจากตาราง <strong>Google Sheets</strong> (ทั้ง 10 แท็บ) และทำการ<strong>บันทึกลงใน Database หลัก (Cloud Firestore) โดยอัตโนมัติ</strong> เพื่อให้ทุกเครื่องและทุกบัญชีซิงค์ตรงกันทันที
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>ยืนยันดึงและบันทึกลง Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
