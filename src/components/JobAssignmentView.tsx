import React, { useState, useEffect, useMemo } from 'react';
import { Job, Employee, JobProject, DailyReport, normalizeModules, Bom, MediaFile, EngineeringPhaseSchedule } from '../types';
import Logo from './Logo';
import { 
  Briefcase, 
  User, 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  FileEdit,
  FileSpreadsheet,
  ExternalLink,
  Globe,
  X, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Play, 
  Tag, 
  Activity, 
  Users,
  FolderGit2,
  Camera,
  Eye,
  ClipboardList,
  Check,
  SlidersHorizontal,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Save,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Layers,
  Cpu,
  Wrench,
  Zap,
  BarChart2,
  ListChecks,
  ChevronRight,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import DailyReportView from './DailyReportView';

interface JobAssignmentViewProps {
  jobs: Job[];
  onAddJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEditJob: (id: string, updatedFields: Partial<Job>) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => Promise<void>;
  onEditEmployee: (id: string, updatedFields: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;

  jobProjects: JobProject[];
  onAddJobProject: (proj: Omit<JobProject, 'id' | 'createdAt'>) => Promise<void>;
  onEditJobProject: (id: string, updatedFields: Partial<JobProject>) => Promise<void>;
  onDeleteJobProject: (id: string) => Promise<void>;

  // Combined daily report props
  dailyReports: DailyReport[];
  onAddDailyReport: (newReport: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditDailyReport: (id: string, updatedFields: Partial<DailyReport>) => void;
  onDeleteDailyReport: (id: string) => void;
  
  boms?: Bom[];
  engineeringSchedules?: EngineeringPhaseSchedule[];
  onSaveEngineeringSchedule?: (schedule: EngineeringPhaseSchedule) => Promise<void>;
  onDeleteEngineeringSchedule?: (id: string) => Promise<void>;
  onAddMediaFile?: (data: Omit<MediaFile, 'id' | 'createdAt'>) => Promise<MediaFile>;
}

type ActiveTab = 'tasks' | 'phase_matrix' | 'progress_update' | 'daily_reports';

export default function JobAssignmentView({
  jobs,
  onAddJob,
  onEditJob,
  onDeleteJob,
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  jobProjects,
  onAddJobProject,
  onEditJobProject,
  onDeleteJobProject,
  dailyReports,
  onAddDailyReport,
  onEditDailyReport,
  onDeleteDailyReport,
  boms,
  engineeringSchedules,
  onSaveEngineeringSchedule,
  onDeleteEngineeringSchedule,
  onAddMediaFile
}: JobAssignmentViewProps) {
  
  // Navigation tabs
  const [subTab, setSubTab] = useState<ActiveTab>('tasks');

  // -------------------- STATE FOR ENGINEERING PHASE SCHEDULES --------------------
  const [localSchedules, setLocalSchedules] = useState<EngineeringPhaseSchedule[]>(() => {
    if (engineeringSchedules && engineeringSchedules.length > 0) return engineeringSchedules;
    const saved = localStorage.getItem('stock_manager_engineering_schedules_list');
    return saved ? JSON.parse(saved) : [];
  });

  const schedules = engineeringSchedules || localSchedules;

  // Filter state for Phase Matrix Tab
  const [phaseMatrixSearch, setPhaseMatrixSearch] = useState('');
  const [phaseMatrixProjectFilter, setPhaseMatrixProjectFilter] = useState('all');
  const [phaseMatrixAssigneeFilter, setPhaseMatrixAssigneeFilter] = useState('all');

  // Filter state for Progress Update Tab
  const [progressSearch, setProgressSearch] = useState('');
  const [progressProjectFilter, setProgressProjectFilter] = useState('all');

  // Quick progress update modal state
  const [isQuickProgressModalOpen, setIsQuickProgressModalOpen] = useState(false);
  const [selectedProgressProject, setSelectedProgressProject] = useState<JobProject | null>(null);
  const [selectedProgressModule, setSelectedProgressModule] = useState<string>('');
  const [quickProgressNote, setQuickProgressNote] = useState('');
  const [quickProgressAssignee, setQuickProgressAssignee] = useState('');

  // Add custom phase schedule item modal & Sheet state
  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false);
  const [isPhaseSheetOpen, setIsPhaseSheetOpen] = useState(false);
  const [editingPhaseItem, setEditingPhaseItem] = useState<EngineeringPhaseSchedule | null>(null);

  // Google Sheet Modal state for projects
  const [googleSheetModalProj, setGoogleSheetModalProj] = useState<JobProject | null>(null);
  const [inputGoogleSheetUrl, setInputGoogleSheetUrl] = useState('');
  const [isViewIframeModalOpen, setIsViewIframeModalOpen] = useState(false);
  const [viewIframeUrl, setViewIframeUrl] = useState('');
  const [viewIframeTitle, setViewIframeTitle] = useState('');

  const [newPhaseJobNo, setNewPhaseJobNo] = useState('');
  const [newPhaseModuleCode, setNewPhaseModuleCode] = useState('');
  const [newPhaseModuleName, setNewPhaseModuleName] = useState('');
  const [newPhaseSubModuleName, setNewPhaseSubModuleName] = useState('');
  const [newPhaseAddressIo, setNewPhaseAddressIo] = useState('');
  const [newPhaseImageUrl, setNewPhaseImageUrl] = useState('');
  const [newPhaseAssignee, setNewPhaseAssignee] = useState('');
  const [newPhaseRemark, setNewPhaseRemark] = useState('');

  const saveScheduleItem = async (item: EngineeringPhaseSchedule) => {
    if (onSaveEngineeringSchedule) {
      await onSaveEngineeringSchedule(item);
    } else {
      const updated = localSchedules.some(s => s.id === item.id)
        ? localSchedules.map(s => s.id === item.id ? item : s)
        : [item, ...localSchedules];
      setLocalSchedules(updated);
      localStorage.setItem('stock_manager_engineering_schedules_list', JSON.stringify(updated));
    }
  };

  // Auto-sync project modules into Phase Matrix automatically
  useEffect(() => {
    if (!jobProjects || jobProjects.length === 0) return;

    let cancel = false;
    const syncMissing = async () => {
      const missing: EngineeringPhaseSchedule[] = [];
      jobProjects.forEach(proj => {
        const modules = normalizeModules(proj.modules);
        modules.forEach(mod => {
          const exists = schedules.some(
            s => s.jobNo === proj.jobNo && (s.moduleName === mod.name || (mod.code && s.moduleCode === mod.code))
          );
          if (!exists) {
            missing.push({
              id: `eng_${proj.jobNo}_${(mod.code || mod.name).replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              jobNo: proj.jobNo,
              projectName: proj.projectName,
              moduleCode: mod.code || '',
              moduleName: mod.name,
              subModuleName: '',
              isBypassed: false,
              addressIo: '',
              imageUrl: mod.imageUrl || '',
              installStatus: 'pending',
              wiringStatus: 'pending',
              testIoStatus: 'pending',
              manualHmiStatus: 'pending',
              semiAutoStatus: 'pending',
              autoStatus: 'pending',
              assignee: employees.length > 0 ? employees[0].name : '',
              remark: '',
              updatedAt: new Date().toISOString()
            });
          }
        });
      });

      if (!cancel && missing.length > 0) {
        for (const item of missing) {
          await saveScheduleItem(item);
        }
      }
    };

    syncMissing();
    return () => { cancel = true; };
  }, [jobProjects, schedules.length]);

  const deleteScheduleItem = async (id: string) => {
    if (onDeleteEngineeringSchedule) {
      await onDeleteEngineeringSchedule(id);
    } else {
      const updated = localSchedules.filter(s => s.id !== id);
      setLocalSchedules(updated);
      localStorage.setItem('stock_manager_engineering_schedules_list', JSON.stringify(updated));
    }
  };

  // Sync modules from all JobProjects into Phase Matrix
  const handleSyncProjectModulesToPhaseMatrix = async () => {
    let createdCount = 0;
    const newItems: EngineeringPhaseSchedule[] = [];

    jobProjects.forEach(proj => {
      const modules = normalizeModules(proj.modules);
      modules.forEach(mod => {
        const exists = schedules.some(
          s => s.jobNo === proj.jobNo && (s.moduleName === mod.name || (mod.code && s.moduleCode === mod.code))
        );
        if (!exists) {
          const item: EngineeringPhaseSchedule = {
            id: `eng_${proj.jobNo}_${(mod.code || mod.name).replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            jobNo: proj.jobNo,
            projectName: proj.projectName,
            moduleCode: mod.code || '',
            moduleName: mod.name,
            subModuleName: '',
            isBypassed: false,
            addressIo: '',
            imageUrl: mod.imageUrl || '',
            installStatus: 'pending',
            wiringStatus: 'pending',
            testIoStatus: 'pending',
            manualHmiStatus: 'pending',
            semiAutoStatus: 'pending',
            autoStatus: 'pending',
            assignee: employees.length > 0 ? employees[0].name : '',
            remark: '',
            updatedAt: new Date().toISOString()
          };
          newItems.push(item);
          createdCount++;
        }
      });
    });

    if (newItems.length > 0) {
      for (const item of newItems) {
        await saveScheduleItem(item);
      }
      alert(`ซิงค์โมดูลเข้าสู่ตารางงาน Phase วิศวกรรมสำเร็จ! เพิ่มรายการใหม่ ${createdCount} รายการ`);
    } else {
      alert('โมดูลจากทุกโปรเจกต์ซิงค์ลงในตารางงาน Phase ครบถ้วนแล้ว');
    }
  };

  const cyclePhaseStatus = (currentStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed' = 'pending'): 'pending' | 'in_progress' | 'completed' | 'bypassed' => {
    if (currentStatus === 'pending') return 'in_progress';
    if (currentStatus === 'in_progress') return 'completed';
    if (currentStatus === 'completed') return 'pending';
    return 'pending';
  };

  const calculateScheduleProgress = (schedule: EngineeringPhaseSchedule) => {
    if (schedule.isBypassed) return 100; // Bypassed modules count as complete / N/A
    const phases = [
      schedule.installStatus,
      schedule.wiringStatus,
      schedule.testIoStatus,
      schedule.manualHmiStatus,
      schedule.semiAutoStatus,
      schedule.autoStatus
    ];
    let totalValid = 0;
    let score = 0;
    phases.forEach(p => {
      if (p === 'bypassed') {
        // bypassed phase ignored
      } else {
        totalValid += 1;
        if (p === 'completed') score += 1;
        else if (p === 'in_progress') score += 0.5;
      }
    });
    if (totalValid === 0) return 100;
    return Math.round((score / totalValid) * 100);
  };

  // Helper renderer for interactive phase status buttons (Compact version)
  const renderPhaseStatusBadge = (
    currentStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed' = 'pending',
    label: string,
    onClick: () => void,
    isBypassedModule: boolean = false
  ) => {
    if (isBypassedModule || currentStatus === 'bypassed') {
      return (
        <button
          type="button"
          onClick={onClick}
          title={`${label}: ข้ามขั้นตอน/โมดูลนี้ (Bypassed) - คลิกเพื่อเปลี่ยน`}
          className="px-1.5 py-0.5 rounded-md text-[9px] border border-slate-200 bg-slate-100 text-slate-400 font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer font-sans shrink-0 opacity-80 hover:bg-slate-200 min-w-[46px]"
        >
          <span>⚡</span>
          <span>ข้าม</span>
        </button>
      );
    }

    let style = 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800';
    let icon = '🔴';
    let statusText = 'รอทำ';

    if (currentStatus === 'in_progress') {
      style = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-extrabold shadow-2xs';
      icon = '🟡';
      statusText = 'กำลังทำ';
    } else if (currentStatus === 'completed') {
      style = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-extrabold shadow-2xs';
      icon = '🟢';
      statusText = 'เสร็จ';
    }

    return (
      <button
        type="button"
        onClick={onClick}
        title={`${label}: คลิกเพื่อเปลี่ยนสถานะ (${currentStatus === 'completed' ? 'เสร็จแล้ว' : currentStatus === 'in_progress' ? 'กำลังดำเนินการ' : 'ยังไม่เริ่ม'})`}
        className={`px-1.5 py-0.5 rounded-md text-[9.5px] border flex items-center justify-center gap-1 transition-all cursor-pointer select-none font-sans shrink-0 min-w-[48px] ${style}`}
      >
        <span className="text-[8px]">{icon}</span>
        <span>{statusText}</span>
      </button>
    );
  };

  // -------------------- STATE FOR TASKS TAB --------------------
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const [isTaskAddModalOpen, setIsTaskAddModalOpen] = useState(false);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Job | null>(null);

  // Task form fields
  const [taskJobNo, setTaskJobNo] = useState('');
  const [taskModule, setTaskModule] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<Job['status']>('pending');
  const [taskPriority, setTaskPriority] = useState<Job['priority']>('medium');
  const [taskTargetDate, setTaskTargetDate] = useState('');
  const [taskImageUrl, setTaskImageUrl] = useState('');
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);

  // Helper: Find Project metadata based on JobNo
  const getProjectMeta = (jobNo: string) => {
    return jobProjects.find(p => p.jobNo === jobNo);
  };

  // Helper: Find Employee metadata based on Name
  const getEmployeeMeta = (name: string) => {
    return employees.find(e => e.name === name);
  };

  // -------------------- SUBMIT HANDLERS --------------------

  // Task form submissions
  const handleTaskAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskJobNo || !taskModule || !taskAssignee) return;

    await onAddJob({
      jobNo: taskJobNo,
      module: taskModule.trim(),
      assignee: taskAssignee,
      description: taskDescription.trim(),
      status: taskStatus,
      priority: taskPriority,
      targetDate: taskTargetDate || undefined,
      imageUrl: taskImageUrl || undefined
    });

    setIsTaskAddModalOpen(false);
    resetTaskForm();
  };

  const handleTaskEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !taskJobNo || !taskModule || !taskAssignee) return;

    await onEditJob(selectedTask.id, {
      jobNo: taskJobNo,
      module: taskModule.trim(),
      assignee: taskAssignee,
      description: taskDescription.trim(),
      status: taskStatus,
      priority: taskPriority,
      targetDate: taskTargetDate || undefined,
      imageUrl: taskImageUrl || undefined
    });

    setIsTaskEditModalOpen(false);
    setSelectedTask(null);
    resetTaskForm();
  };

  const resetTaskForm = () => {
    const lastAssignee = localStorage.getItem('last_selected_assignee');
    setTaskJobNo(jobProjects.length > 0 ? jobProjects[0].jobNo : '');
    setTaskModule('');
    setTaskAssignee(lastAssignee || (employees.length > 0 ? employees[0].name : ''));
    setTaskDescription('');
    setTaskStatus('pending');
    setTaskPriority('medium');
    setTaskImageUrl('');
    
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    setTaskTargetDate(oneWeekFromNow.toISOString().split('T')[0]);
  };

  // Open task modals with default selections prefilled
  const openTaskAdd = () => {
    const lastAssignee = localStorage.getItem('last_selected_assignee');
    setTaskJobNo(jobProjects.length > 0 ? jobProjects[0].jobNo : '');
    setTaskAssignee(lastAssignee || (employees.length > 0 ? employees[0].name : ''));
    setTaskModule('');
    setTaskDescription('');
    setTaskStatus('pending');
    setTaskPriority('medium');
    
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    setTaskTargetDate(oneWeekFromNow.toISOString().split('T')[0]);
    setIsTaskAddModalOpen(true);
  };

  const openTaskEdit = (task: Job) => {
    setSelectedTask(task);
    setTaskJobNo(task.jobNo);
    setTaskModule(task.module);
    setTaskAssignee(task.assignee);
    setTaskDescription(task.description);
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskTargetDate(task.targetDate || '');
    setTaskImageUrl(task.imageUrl || '');
    setIsTaskEditModalOpen(true);
  };

  // -------------------- FILTER LOGICS --------------------

  // Tasks Filter
  const filteredTasks = jobs.filter(task => {
    const matchesSearch = 
      (task.jobNo || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
      (task.module || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
      (task.assignee || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(taskSearch.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assignee === assigneeFilter;
    const matchesProject = projectFilter === 'all' || task.jobNo === projectFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesProject;
  });

  // Group tasks by same jobNo, module, and assignee to collapse vertical space
  const groupedTasks = useMemo(() => {
    const groups: {
      key: string;
      jobNo: string;
      module: string;
      assignee: string;
      tasks: typeof filteredTasks;
    }[] = [];

    filteredTasks.forEach(task => {
      const key = `${task.jobNo}::${task.module}::${task.assignee}`;
      let group = groups.find(g => g.key === key);
      if (!group) {
        group = {
          key,
          jobNo: task.jobNo,
          module: task.module,
          assignee: task.assignee,
          tasks: []
        };
        groups.push(group);
      }
      group.tasks.push(task);
    });

    return groups;
  }, [filteredTasks]);

  // Group the collapsed Job+Module groups by Assignee to separate assignee headers cleanly
  const groupedByAssignee = useMemo(() => {
    const map: Record<string, typeof groupedTasks> = {};
    groupedTasks.forEach(group => {
      if (!map[group.assignee]) {
        map[group.assignee] = [];
      }
      map[group.assignee].push(group);
    });
    return Object.entries(map).map(([assignee, groups]) => ({
      assignee,
      groups
    }));
  }, [groupedTasks]);

  // -------------------- STATS CALCULATORS --------------------
  const completedTasksCount = jobs.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-2 text-left">
      
      {/* Tab Header Selector */}
      <div className="flex flex-row items-center justify-between gap-3 bg-slate-900 text-slate-100 p-2 px-3.5 rounded-xl relative overflow-hidden">
        
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 text-left">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[8px] uppercase tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Operational Center</span>
          </div>
          <h2 className="text-sm font-black text-white font-sans flex items-center gap-1.5 mt-0.5">
            <Briefcase className="h-4 w-4 text-indigo-400" />
            ระบบจ่ายงาน & รายงานความคืบหน้าประจำวัน
          </h2>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl gap-1 shrink-0 z-10 flex-wrap">
          <button
            onClick={() => setSubTab('tasks')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              subTab === 'tasks' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Briefcase className="h-3 w-3" />
            <span>งานมอบหมาย ({jobs.length})</span>
          </button>

          <button
            onClick={() => setSubTab('phase_matrix')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              subTab === 'phase_matrix' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            id="tab-phase-matrix"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>ตารางงาน Phase ({schedules.length})</span>
          </button>

          <button
            onClick={() => setSubTab('progress_update')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              subTab === 'progress_update' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            id="tab-progress-update"
          >
            <TrendingUp className="h-3 w-3" />
            <span>อัปเดตความคืบหน้างาน</span>
          </button>

          <button
            onClick={() => setSubTab('daily_reports')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              subTab === 'daily_reports' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
            id="tab-daily-reports"
          >
            <ClipboardList className="h-3 w-3" />
            <span>รายงานประจำวัน ({dailyReports.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ======================= TAB 1: MODULAR TASKS ========================== */}
      {/* ======================================================================= */}
      {subTab === 'tasks' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Action Header & Statistics Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" />
                ตารางงาน (Assigned Tasks)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                งานระดับโมดูล/อุปกรณ์ที่มอบหมายให้ช่างเทคนิคและวิศวกร ดำเนินการ และรายงานความคืบหน้าแบบ Real-time
              </p>
            </div>

            <button
              onClick={openTaskAdd}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
              id="btn-add-task"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างใบงานใหม่</span>
            </button>
          </div>

          {/* Statistics Summary Bar */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-1.5 border-b border-slate-100/60">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">งานจ่ายทั้งหมด:</span>
                <span className="text-xs font-black font-mono text-slate-800">{jobs.length} งาน</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Play className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">กำลังทำ:</span>
                <span className="text-xs font-black font-mono text-amber-600">{jobs.filter(j => j.status === 'in_progress').length} งาน</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">จบงาน:</span>
                <span className="text-xs font-black font-mono text-emerald-600">{completedTasksCount} งาน</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">รอดำเนินการ:</span>
                <span className="text-xs font-black font-mono text-slate-700">{jobs.filter(j => j.status === 'pending').length} งาน</span>
              </div>
            </div>
          </div>

          {/* Filters and Search Panel */}
          <div className="bg-slate-50/40 p-2 py-1.5 rounded-xl border border-slate-100 shadow-3xs space-y-1.5">
            
            {/* Search row */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่องาน, โมดูล/อุปกรณ์, ผู้รับผิดชอบ หรือรายละเอียด..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Filter select elements */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/50">
              
              <div className="flex items-center gap-1 px-1 shrink-0">
                <Filter className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 font-sans">สถานะ:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-0 text-[10px] font-extrabold text-slate-700 focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">ทั้งหมด (All)</option>
                  <option value="pending">1. ยังไม่ได้รับงาน (Pending)</option>
                  <option value="in_progress">2. กำลังทำ (In Progress)</option>
                  <option value="completed">3. จบงาน (Completed)</option>
                  <option value="cancelled">ยกเลิก (Cancelled)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 px-1 shrink-0">
                <Tag className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 font-sans">สำคัญ:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent border-0 text-[10px] font-extrabold text-slate-700 focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">ทั้งหมด (All)</option>
                  <option value="high">ด่วน (High)</option>
                  <option value="medium">ปานกลาง (Medium)</option>
                  <option value="low">ต่ำ (Low)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 px-1 shrink-0">
                <User className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 font-sans">ผู้รับผิดชอบ:</span>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="bg-transparent border-0 text-[10px] font-extrabold text-slate-700 focus:ring-0 focus:outline-hidden cursor-pointer max-w-[150px]"
                >
                  <option value="all">พนักงานทุกคน</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 px-1 shrink-0">
                <FolderGit2 className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 font-sans">คัดกรองตามโปรเจกต์:</span>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="bg-transparent border-0 text-[10px] font-extrabold text-slate-700 focus:ring-0 focus:outline-hidden cursor-pointer max-w-[180px]"
                >
                  <option value="all">ทุก Job / โปรเจกต์</option>
                  {jobProjects.map(proj => (
                    <option key={proj.id} value={proj.jobNo}>{proj.jobNo} - {proj.customer}</option>
                  ))}
                </select>
              </div>

              {(taskSearch || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || projectFilter !== 'all') && (
                <button
                  onClick={() => {
                    setTaskSearch('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setAssigneeFilter('all');
                    setProjectFilter('all');
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer font-sans shrink-0 ml-auto"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}

            </div>
          </div>

          {/* Task Grid display */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-extrabold text-slate-700 font-sans">ไม่พบรายการงานมอบหมายตามเงื่อนไข</h4>
              <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
                ไม่พบงานมอบหมายโมดูล/อุปกรณ์ใดๆ ที่ตรงกับการค้นหาปัจจุบันของคุณ กรุณาปรับเปลี่ยนตัวกรอง หรือคลิกสร้างใบงานใหม่เพื่อเริ่มต้น
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedByAssignee.map(assigneeGroup => {
                const empMeta = getEmployeeMeta(assigneeGroup.assignee);
                const totalTasks = assigneeGroup.groups.reduce((acc, g) => acc + g.tasks.length, 0);

                return (
                  <div key={assigneeGroup.assignee} className="space-y-1.5">
                    
                    {/* Assignee Header - Shows employee profile photos */}
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 select-none">
                      {empMeta?.imageUrl ? (
                        <img 
                          src={empMeta.imageUrl} 
                          alt={assigneeGroup.assignee} 
                          className="h-5.5 w-5.5 rounded-full object-cover shrink-0 border border-slate-250 shadow-3xs" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-[8.5px] font-black font-mono text-white shrink-0 shadow-3xs">
                          {assigneeGroup.assignee.slice(0, 2)}
                        </div>
                      )}
                      
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase shrink-0">ผู้รับผิดชอบ:</span>
                      <span className="text-[10.5px] font-black text-slate-800 leading-none shrink-0">
                        {assigneeGroup.assignee}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400 shrink-0">
                        ({empMeta?.role || 'ช่างเทคนิค'})
                      </span>
                      <span className="text-slate-300 text-[9px]">|</span>
                      <span className="text-[8.5px] font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded leading-none">
                        รวม {totalTasks} รายการ
                      </span>
                    </div>

                    {/* Sub-groups for this specific Assignee */}
                    <div className="flex flex-col gap-2.5">
                      {assigneeGroup.groups.map(group => {
                        const projMeta = getProjectMeta(group.jobNo);
                        const hasHighPriority = group.tasks.some(t => t.priority === 'high');

                        return (
                          <div 
                            key={group.key}
                            className="bg-white rounded-xl border border-slate-200/60 p-2.5 shadow-2xs relative overflow-hidden"
                          >
                            {/* Group Header - Shows Project images next to badges */}
                            <div className="px-1.5 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between gap-2">
                              
                              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                                
                                {/* Logo & Project Image */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Logo size={14} className="h-3.5 w-3.5 shrink-0" />
                                  {projMeta?.projectImageUrl ? (
                                    <img 
                                      src={projMeta.projectImageUrl} 
                                      alt={group.jobNo} 
                                      className="h-6.5 w-6.5 rounded-lg object-cover border border-slate-250 shrink-0 shadow-2xs" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="h-6.5 w-6.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                      <FolderGit2 className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                  )}
                                </div>

                                {/* Job No */}
                                <span className="text-[11px] font-black text-indigo-700 font-mono tracking-wide px-2 py-0.5 bg-indigo-50 border border-indigo-150 rounded-md shrink-0">
                                  {group.jobNo}
                                </span>
                                
                                {projMeta ? (
                                  <span className="text-[9px] font-bold text-slate-500 truncate max-w-[120px] leading-none" title={`ลูกค้า: ${projMeta.customer} | โครงการ: ${projMeta.projectName}`}>
                                    ({projMeta.customer})
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-semibold text-amber-500 italic shrink-0 block leading-none">
                                    (ไม่มีในคลัง)
                                  </span>
                                )}

                                <span className="text-slate-300 text-[9px] select-none">|</span>

                                {/* Module */}
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-[9px] font-bold text-slate-400 font-sans uppercase shrink-0">โมดูล:</span>
                                  <span className="text-[10px] font-black text-slate-800 font-sans truncate">
                                    {group.module}
                                  </span>
                                </div>

                                {hasHighPriority && (
                                  <span className="text-[7.5px] font-extrabold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 shrink-0 leading-none">
                                    ด่วน
                                  </span>
                                )}
                              </div>

                              {/* Right Side: Total task count */}
                              <div className="shrink-0 flex items-center">
                                <span className="text-[8.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                  {group.tasks.length} รายการ
                                </span>
                              </div>

                            </div>

                            {/* Group Content / Task Items - Aligned Table-like Layout */}
                            <div className="divide-y divide-slate-100/60">
                              {/* Column Headers for Desktop - Aligns perfectly with the grid below */}
                              <div className="hidden lg:grid lg:grid-cols-[1fr_310px_110px_150px_55px] lg:gap-2 px-1.5 py-0.5 bg-slate-50/30 border-b border-slate-100/40 select-none">
                                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans">รายละเอียดงาน</span>
                                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans text-center">ขั้นตอน / สถานะ</span>
                                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans text-center">กำหนดส่ง</span>
                                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans text-center">รูปถ่ายงาน</span>
                                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans text-center">จัดการ</span>
                              </div>

                              {group.tasks.map((task, index) => {
                                const isOverdue = 
                                  task.status !== 'completed' && 
                                  task.status !== 'cancelled' && 
                                  task.targetDate && 
                                  new Date(task.targetDate) < new Date(new Date().setHours(0,0,0,0));

                                return (
                                  <div 
                                    key={task.id}
                                    className={`p-1 px-1.5 transition-all flex flex-col gap-1 sm:gap-1.5 lg:grid lg:grid-cols-[1fr_310px_110px_150px_55px] lg:gap-2 lg:items-center relative overflow-hidden group/item ${
                                      isOverdue ? 'bg-rose-50/10' : 'hover:bg-slate-50/20'
                                    }`}
                                  >
                                    {/* Left visual margin indicator for nested list (if overdue) */}
                                    {isOverdue && (
                                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
                                    )}

                                    {/* 1. Index & Description */}
                                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                      <span className="text-[8.5px] font-mono font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded shrink-0 leading-none mt-0.5">
                                        #{index + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-slate-600 font-sans break-words leading-tight" title={task.description}>
                                          {task.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* 2. Clickable 3-Step Flow Column */}
                                    <div className="shrink-0 w-full sm:w-[310px] flex items-center justify-start lg:justify-center self-center">
                                      <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-150 rounded-lg p-0.5 shadow-4xs select-none font-sans w-full sm:w-auto">
                                        
                                        {/* Step 1: มอบงาน */}
                                        <button 
                                          type="button"
                                          onClick={() => onEditJob(task.id, { status: 'pending' })}
                                          className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black border transition-all cursor-pointer flex-1 sm:flex-none ${
                                            task.status === 'pending'
                                              ? 'bg-indigo-100 text-indigo-700 border-indigo-300 shadow-4xs'
                                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          }`}
                                          title="เปลี่ยนสถานะเป็น 1.มอบงาน"
                                        >
                                          <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black shadow-4xs transition-colors ${
                                            task.status === 'pending' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                                          }`}>
                                            {task.status !== 'pending' ? (
                                              <Check className="h-1.5 w-1.5 stroke-[3.5]" />
                                            ) : (
                                              '1'
                                            )}
                                          </div>
                                          <span>1.มอบงาน</span>
                                        </button>

                                        <span className={`text-[8px] font-bold ${
                                          task.status === 'in_progress' || task.status === 'completed' ? 'text-amber-500' : 'text-slate-300'
                                        }`}>›</span>

                                        {/* Step 2: กำลังทำ */}
                                        <button 
                                          type="button"
                                          onClick={() => onEditJob(task.id, { status: 'in_progress' })}
                                          className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black border transition-all cursor-pointer flex-1 sm:flex-none ${
                                            task.status === 'in_progress'
                                              ? 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse shadow-sm shadow-amber-500/5'
                                              : task.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                                          }`}
                                          title="เปลี่ยนสถานะเป็น 2.กำลังทำ"
                                        >
                                          <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black transition-colors ${
                                            task.status === 'in_progress'
                                              ? 'bg-amber-500 text-white'
                                              : task.status === 'completed'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-200 text-slate-500'
                                          }`}>
                                            {task.status === 'completed' ? (
                                              <Check className="h-1.5 w-1.5 stroke-[3.5]" />
                                            ) : (
                                              '2'
                                            )}
                                          </div>
                                          <span>2.กำลังทำ</span>
                                        </button>

                                        <span className={`text-[8px] font-bold ${
                                          task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'
                                        }`}>›</span>

                                        {/* Step 3: สำเร็จ */}
                                        <button 
                                          type="button"
                                          onClick={() => onEditJob(task.id, { status: 'completed' })}
                                          className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black border transition-all cursor-pointer flex-1 sm:flex-none ${
                                            task.status === 'completed'
                                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-4xs shadow-emerald-600/10'
                                              : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                                          }`}
                                          title="เปลี่ยนสถานะเป็น 3.สำเร็จ"
                                        >
                                          <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-black transition-colors ${
                                            task.status === 'completed' ? 'bg-white text-emerald-600' : 'bg-slate-200 text-slate-500'
                                          }`}>
                                            {task.status === 'completed' ? (
                                              <Check className="h-1.5 w-1.5 stroke-[3.5]" />
                                            ) : (
                                              '3'
                                            )}
                                          </div>
                                          <span>3.สำเร็จ</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* 3. Target Date */}
                                    <div className="flex items-center gap-1 shrink-0 text-[10px] font-sans bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md lg:w-[110px] lg:justify-center self-start sm:self-center">
                                      <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="text-[8.5px] text-slate-400 font-bold uppercase leading-none lg:hidden">กำหนด:</span>
                                      <span className={`font-mono text-[9px] font-bold leading-none ${
                                        isOverdue ? 'text-rose-600 font-black' : 'text-slate-600'
                                      }`}>
                                        {task.targetDate ? new Date(task.targetDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'ไม่ระบุ'}
                                      </span>
                                    </div>

                                    {/* 4. Photo Proof Section */}
                                    <div className="flex items-center gap-1.5 shrink-0 lg:w-[150px] lg:justify-center self-start sm:self-center">
                                      {task.imageUrl ? (
                                        <div className="flex items-center gap-1">
                                          <div 
                                            className="relative group/img h-6 w-9 rounded-md overflow-hidden border border-slate-200/85 cursor-pointer bg-slate-50 flex items-center justify-center shadow-4xs" 
                                            onClick={() => setActiveImagePreview(task.imageUrl || null)}
                                            title="คลิกเพื่อดูรูปภาพขยายใหญ่"
                                          >
                                            <img src={task.imageUrl} alt="รูปงานเสร็จ" className="h-full w-full object-cover group-hover/img:scale-110 transition-all" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                              <Eye className="h-2.5 w-2.5 text-white" />
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              if (confirm('ต้องการลบรูปงานออกหรือไม่?')) {
                                                onEditJob(task.id, { imageUrl: '' });
                                              }
                                            }}
                                            className="text-[8px] text-rose-500 hover:text-rose-600 font-bold hover:underline"
                                          >
                                            ลบ
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <label className="flex items-center justify-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 border border-dashed border-slate-200 h-6 px-1.5 rounded-md text-[8px] text-slate-400 font-sans transition-all text-center">
                                            <Camera className="h-3 w-3 text-indigo-400 shrink-0" />
                                            <span>แนบรูป</span>
                                            <input 
                                              type="file" 
                                              accept="image/*" 
                                              className="hidden" 
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                  onEditJob(task.id, { imageUrl: reader.result as string });
                                                };
                                                reader.readAsDataURL(file);
                                              }} 
                                            />
                                          </label>
                                          
                                          <button 
                                            onClick={() => onEditJob(task.id, { imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' })}
                                            className="text-[7.5px] h-6 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-1 rounded border border-slate-200/50 leading-none"
                                            title="ใช้รูปจำลองตู้ไฟ"
                                          >
                                            +ตู้ไฟ
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* 5. Controls */}
                                    <div className="flex items-center gap-1 border-t sm:border-t-0 border-slate-150/60 pt-1.5 sm:pt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-2 lg:w-[55px] lg:justify-center self-stretch sm:self-center justify-end shrink-0">
                                      <button
                                        onClick={() => openTaskEdit(task)}
                                        className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                        title="แก้ไขรายละเอียดงาน"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(`ต้องการลบงาน "${task.module}" สำหรับ JOB ${task.jobNo} หรือไม่?`)) {
                                            onDeleteJob(task.id);
                                          }
                                        }}
                                        className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="ลบงานนี้ออก"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= TAB 2: PHASE MATRIX TABLE ====================== */}
      {/* ======================================================================= */}
      {subTab === 'phase_matrix' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Header Controls & Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                  ตารางงาน Phase วิศวกรรม & ติดตั้ง (Engineering & Installation Matrix)
                </h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                  ติดตามและคลิกเปลี่ยนสถานะ 6 ขั้นตอนหลัก: Install / Wiring / Test IO / Manual HMI / Semi-Auto / Auto
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncProjectModulesToPhaseMatrix}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="ดึงรายการโมดูลทั้งหมดจากคลังโปรเจกต์มาสร้างเป็นแถวในตารางอัตโนมัติ"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
                  <span>ซิงค์โมดูลจากโปรเจกต์</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewPhaseJobNo(jobProjects.length > 0 ? jobProjects[0].jobNo : '');
                    setNewPhaseModuleCode('');
                    setNewPhaseModuleName('');
                    setNewPhaseAssignee(employees.length > 0 ? employees[0].name : '');
                    setNewPhaseRemark('');
                    setIsAddPhaseModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>เพิ่มแถว Phase ใหม่</span>
                </button>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phaseMatrixSearch}
                  onChange={(e) => setPhaseMatrixSearch(e.target.value)}
                  placeholder="ค้นหาตามโมดูล, Sub-module, หรือหมายเหตุ..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <select
                  value={phaseMatrixProjectFilter}
                  onChange={(e) => setPhaseMatrixProjectFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs font-mono font-bold text-indigo-900 cursor-pointer focus:bg-white"
                >
                  <option value="all">-- ทุกโปรเจกต์ (JOB No.) --</option>
                  {jobProjects.map(p => (
                    <option key={p.id} value={p.jobNo}>
                      {p.jobNo} | {p.projectName} ({p.customer})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <select
                  value={phaseMatrixAssigneeFilter}
                  onChange={(e) => setPhaseMatrixAssigneeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                >
                  <option value="all">-- ผู้รับผิดชอบทั้งหมด --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.name}>
                      {e.name} ({e.nickname || e.role || 'ทั่วไป'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Selected Project Banner & Google Sheet Integration */}
            {phaseMatrixProjectFilter !== 'all' ? (() => {
              const proj = jobProjects.find(p => p.jobNo === phaseMatrixProjectFilter);
              return (
                <div className="mt-3 p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xs border border-indigo-900/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-indigo-500 text-white font-mono font-black rounded-lg text-xs tracking-wider">
                        JOB: {phaseMatrixProjectFilter}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold font-sans text-indigo-100">
                          {proj?.projectName || 'โครงการ'}
                        </h4>
                        <p className="text-[10px] text-slate-300 font-sans">
                          ลูกค้า: {proj?.customer || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] font-bold text-indigo-200">
                        โมดูลทั้งหมด: {schedules.filter(s => s.jobNo === phaseMatrixProjectFilter).length} รายการ
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhaseMatrixProjectFilter('all')}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        ดูทุกโปรเจกต์
                      </button>
                    </div>
                  </div>

                  {/* Google Sheet Link & Integration Bar */}
                  <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-extrabold text-emerald-300">
                            Google Sheet ประจำโปรเจกต์:
                          </span>
                          {proj?.googleSheetUrl ? (
                            <span className="text-[9.5px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded font-mono font-bold">
                              ✓ มีไฟล์ Google Sheet
                            </span>
                          ) : (
                            <span className="text-[9.5px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded font-mono">
                              ยังไม่ได้ใส่ลิงก์
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-300 font-mono truncate max-w-[380px]">
                          {proj?.googleSheetUrl || 'กดปุ่มด้านขวาเพื่อเพิ่มลิงก์ Google Sheet ประจำโครงการนี้'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {proj?.googleSheetUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => window.open(proj.googleSheetUrl, '_blank')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>เปิด Google Sheet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewIframeUrl(proj.googleSheetUrl!);
                              setViewIframeTitle(`JOB: ${proj.jobNo} - ${proj.projectName}`);
                              setIsViewIframeModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>ดู/แก้ไขในหน้าเว็บ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (proj) {
                                setGoogleSheetModalProj(proj);
                                setInputGoogleSheetUrl(proj.googleSheetUrl || '');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="แก้ไขลิงก์ Google Sheet"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (proj) {
                              setGoogleSheetModalProj(proj);
                              setInputGoogleSheetUrl('');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ ตั้งค่า Google Sheet</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })() : (
              /* All Projects Google Sheets Quick Access */
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-800 font-sans">
                      ไฟล์ Google Sheet ประจำโปรเจกต์ทั้งหมด (คลิกเพื่อแก้ไข/เปิดดู):
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobProjects.map(p => (
                    <div
                      key={p.id}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs hover:border-emerald-300 transition-all"
                    >
                      <span className="font-mono text-indigo-700 font-extrabold">{p.jobNo}</span>
                      <span className="text-slate-600 truncate max-w-[120px]">{p.projectName}</span>
                      {p.googleSheetUrl ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => window.open(p.googleSheetUrl, '_blank')}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            title="เปิด Google Sheet ในแท็บใหม่"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewIframeUrl(p.googleSheetUrl!);
                              setViewIframeTitle(`JOB: ${p.jobNo} - ${p.projectName}`);
                              setIsViewIframeModalOpen(true);
                            }}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                            title="ดูในเว็บ"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGoogleSheetModalProj(p);
                              setInputGoogleSheetUrl(p.googleSheetUrl || '');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="แก้ไข URL"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setGoogleSheetModalProj(p);
                            setInputGoogleSheetUrl('');
                          }}
                          className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                        >
                          + เพิ่ม Sheet
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Phase Matrix Main Table */}
          {schedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
              <SlidersHorizontal className="h-10 w-10 text-indigo-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-slate-800 font-sans">ยังไม่มีข้อมูลตารางงาน Phase วิศวกรรม</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-sans">
                กดปุ่ม <span className="font-bold text-indigo-600">"ซิงค์โมดูลจากโปรเจกต์"</span> ด้านบนเพื่อดึงโมดูลทั้งหมดจากคลังโปรเจกต์มาตารางนี้อัตโนมัติ
              </p>
              <button
                type="button"
                onClick={handleSyncProjectModulesToPhaseMatrix}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
              >
                🔄 ซิงค์โมดูลจากโปรเจกต์ทันที
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 text-[11px] font-mono font-extrabold uppercase tracking-wider">
                      <th className="p-3 pl-4 border-r border-slate-800 w-[190px]">โมดูล / ระบบงาน</th>
                      <th className="p-3 border-r border-slate-800 w-[160px]">Sub-module / รายการย่อย</th>
                      <th className="p-3 border-r border-slate-800 w-[120px]">Address IO</th>
                      <th className="p-3 border-r border-slate-800 text-center w-[70px]">รูปภาพ</th>
                      <th className="p-2 border-r border-slate-800 text-center w-[70px]">1. Install</th>
                      <th className="p-2 border-r border-slate-800 text-center w-[70px]">2. Wiring</th>
                      <th className="p-2 border-r border-slate-800 text-center w-[70px]">3. Test IO</th>
                      <th className="p-2 border-r border-slate-800 text-center w-[75px]">4. Manual HMI</th>
                      <th className="p-2 border-r border-slate-800 text-center w-[70px]">5. Semi-Auto</th>
                      <th className="p-2 border-r border-slate-800 text-center w-[70px]">6. Auto</th>
                      <th className="p-3 border-r border-slate-800 w-[120px]">ผู้รับผิดชอบ</th>
                      <th className="p-3 border-r border-slate-800 min-w-[140px]">Remark / หมายเหตุ</th>
                      <th className="p-3 text-center w-[85px]">ความคืบหน้า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-sans">
                    {schedules
                      .filter(item => {
                        const matchSearch = !phaseMatrixSearch || 
                          item.jobNo.toLowerCase().includes(phaseMatrixSearch.toLowerCase()) ||
                          item.moduleName.toLowerCase().includes(phaseMatrixSearch.toLowerCase()) ||
                          (item.subModuleName || '').toLowerCase().includes(phaseMatrixSearch.toLowerCase()) ||
                          (item.remark || '').toLowerCase().includes(phaseMatrixSearch.toLowerCase()) ||
                          (item.assignee || '').toLowerCase().includes(phaseMatrixSearch.toLowerCase());
                        const matchProject = phaseMatrixProjectFilter === 'all' || item.jobNo === phaseMatrixProjectFilter;
                        const matchAssignee = phaseMatrixAssigneeFilter === 'all' || item.assignee === phaseMatrixAssigneeFilter;
                        return matchSearch && matchProject && matchAssignee;
                      })
                      .map((item) => {
                        const progressPct = calculateScheduleProgress(item);
                        const relReports = dailyReports.filter(r => r.jobsDetail.includes(item.jobNo) && (
                          r.jobsDetail.includes(item.moduleName) || (item.subModuleName && r.jobsDetail.includes(item.subModuleName))
                        ));

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${item.isBypassed ? 'bg-slate-50/50' : ''}`}>
                            {/* Module Name + Bypass Toggle */}
                            <td className="p-3 pl-4 border-r border-slate-100 font-bold text-slate-800">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <Cpu className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                    <span className="block text-[11px] leading-snug font-extrabold">{item.moduleName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPhaseItem(item);
                                        setIsPhaseSheetOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                                      title="แก้ไข Sheet รายละเอียดโมดูล"
                                    >
                                      <FileEdit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`ต้องการลบแถว Phase ของโมดูล "${item.moduleName}" หรือไม่?`)) {
                                          deleteScheduleItem(item.id);
                                        }
                                      }}
                                      className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                      title="ลบแถวนี้ออก"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => saveScheduleItem({ ...item, isBypassed: !item.isBypassed, updatedAt: new Date().toISOString() })}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                                        item.isBypassed 
                                          ? 'bg-amber-100 text-amber-800 border-amber-300 font-black' 
                                          : 'bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 border-slate-200'
                                      }`}
                                      title={item.isBypassed ? "ยกเลิก Bypass" : "กดเพื่อ Bypass โมดูลนี้ (ไม่ต้องมีสถานะ)"}
                                    >
                                      <Zap className="h-2.5 w-2.5" />
                                      <span>{item.isBypassed ? 'Bypassed' : 'Bypass'}</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {item.moduleCode && (
                                    <span className="text-[9px] text-slate-400 font-mono block">[{item.moduleCode}]</span>
                                  )}
                                  {phaseMatrixProjectFilter === 'all' && (
                                    <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1 rounded">
                                      {item.jobNo}
                                    </span>
                                  )}
                                  {item.isBypassed && (
                                    <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                                      ⚡ Bypassed (ข้าม)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Sub-module / รายการย่อย */}
                            <td className="p-2 border-r border-slate-100">
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  defaultValue={item.subModuleName || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (item.subModuleName || '')) {
                                      saveScheduleItem({ ...item, subModuleName: e.target.value, updatedAt: new Date().toISOString() });
                                    }
                                  }}
                                  placeholder="พิมพ์ Sub-module..."
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                                />

                                {/* Sub module related progress update logs */}
                                {relReports.length > 0 && (
                                  <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                                    {relReports.slice(0, 2).map((r, i) => (
                                      <div key={i} className="text-[9.5px] bg-indigo-50/80 border border-indigo-100 rounded p-1 text-slate-700 leading-tight">
                                        <span className="font-bold text-indigo-700 font-mono">[{r.date}] {r.employeeName}:</span> {r.jobsDetail}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Address IO */}
                            <td className="p-2 border-r border-slate-100 font-mono">
                              <input
                                type="text"
                                defaultValue={item.addressIo || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (item.addressIo || '')) {
                                    saveScheduleItem({ ...item, addressIo: e.target.value, updatedAt: new Date().toISOString() });
                                  }
                                }}
                                placeholder="เช่น I:0.0 / O:1.2..."
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                              />
                            </td>

                            {/* Image */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {item.imageUrl ? (
                                <div className="relative group inline-block">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.moduleName}
                                    onClick={() => setActiveImagePreview(item.imageUrl!)}
                                    className="h-9 w-9 object-cover rounded-lg border border-slate-200 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                                  />
                                  <label
                                    className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full text-[9px] cursor-pointer hover:bg-indigo-600 shadow-2xs"
                                    title="เปลี่ยนรูปภาพโมดูล"
                                  >
                                    <Upload className="h-2.5 w-2.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            const base64 = reader.result as string;
                                            saveScheduleItem({ ...item, imageUrl: base64, updatedAt: new Date().toISOString() });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 border border-slate-200 border-dashed rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors">
                                  <ImageIcon className="h-3 w-3" />
                                  <span>+ รูป</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          const base64 = reader.result as string;
                                          saveScheduleItem({ ...item, imageUrl: base64, updatedAt: new Date().toISOString() });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </td>

                            {/* Phase 1: Install */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {renderPhaseStatusBadge(
                                item.installStatus,
                                'Install',
                                () => saveScheduleItem({ ...item, installStatus: cyclePhaseStatus(item.installStatus), updatedAt: new Date().toISOString() }),
                                item.isBypassed
                              )}
                            </td>

                            {/* Phase 2: Wiring */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {renderPhaseStatusBadge(
                                item.wiringStatus,
                                'Wiring',
                                () => saveScheduleItem({ ...item, wiringStatus: cyclePhaseStatus(item.wiringStatus), updatedAt: new Date().toISOString() }),
                                item.isBypassed
                              )}
                            </td>

                            {/* Phase 3: Test IO */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {renderPhaseStatusBadge(
                                item.testIoStatus,
                                'Test IO',
                                () => saveScheduleItem({ ...item, testIoStatus: cyclePhaseStatus(item.testIoStatus), updatedAt: new Date().toISOString() }),
                                item.isBypassed
                              )}
                            </td>

                            {/* Phase 4: Manual HMI */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {renderPhaseStatusBadge(
                                item.manualHmiStatus,
                                'Manual HMI',
                                () => saveScheduleItem({ ...item, manualHmiStatus: cyclePhaseStatus(item.manualHmiStatus), updatedAt: new Date().toISOString() }),
                                item.isBypassed
                              )}
                            </td>

                            {/* Phase 5: Semi-Auto */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {renderPhaseStatusBadge(
                                item.semiAutoStatus,
                                'Semi-Auto',
                                () => saveScheduleItem({ ...item, semiAutoStatus: cyclePhaseStatus(item.semiAutoStatus), updatedAt: new Date().toISOString() }),
                                item.isBypassed
                              )}
                            </td>

                            {/* Phase 6: Auto */}
                            <td className="p-2 border-r border-slate-100 text-center">
                              {renderPhaseStatusBadge(
                                item.autoStatus,
                                'Auto',
                                () => saveScheduleItem({ ...item, autoStatus: cyclePhaseStatus(item.autoStatus), updatedAt: new Date().toISOString() }),
                                item.isBypassed
                              )}
                            </td>

                            {/* Assignee Selection */}
                            <td className="p-2 border-r border-slate-100">
                              <select
                                value={item.assignee || ''}
                                onChange={(e) => saveScheduleItem({ ...item, assignee: e.target.value, updatedAt: new Date().toISOString() })}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                              >
                                <option value="">-- ระบุ --</option>
                                {employees.map(emp => (
                                  <option key={emp.id} value={emp.name}>
                                    {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Remark Input */}
                            <td className="p-2 border-r border-slate-100">
                              <input
                                type="text"
                                defaultValue={item.remark || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== item.remark) {
                                    saveScheduleItem({ ...item, remark: e.target.value, updatedAt: new Date().toISOString() });
                                  }
                                }}
                                placeholder="พิมพ์หมายเหตุ / ข้อสังเกต..."
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-hidden focus:bg-white focus:border-indigo-400"
                              />
                            </td>

                            {/* Progress % */}
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-[11px] font-mono font-black ${
                                  item.isBypassed ? 'text-slate-400' : progressPct === 100 ? 'text-emerald-600' : progressPct >= 50 ? 'text-amber-600' : 'text-slate-600'
                                }`}>
                                  {item.isBypassed ? 'ข้าม' : `${progressPct}%`}
                                </span>
                                <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      item.isBypassed ? 'bg-slate-300' : progressPct === 100 ? 'bg-emerald-500' : progressPct >= 50 ? 'bg-amber-500' : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= TAB 3: PROGRESS UPDATE CENTER ================== */}
      {/* ======================================================================= */}
      {subTab === 'progress_update' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Header & Search Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-800 font-sans flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  อัปเดตความคืบหน้างาน ข้อมูลจากโปรเจกต์ และโมดูล (Progress Update Center)
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  ภาพรวมความคืบหน้าวิศวกรรม 6 ขั้นตอนหลัก แยกรายโปรเจกต์และโมดูล เชื่อมโยงรายการ BOM และบันทึกประจำวัน
                </p>
              </div>

              {/* Top Summary Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                  <span className="text-[9px] text-indigo-500 font-bold uppercase block">โปรเจกต์รวม</span>
                  <span className="text-xs font-black text-indigo-700 font-mono">{jobProjects.length} โครงการ</span>
                </div>

                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <span className="text-[9px] text-emerald-500 font-bold uppercase block">ความคืบหน้าเฉลี่ย</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    {schedules.length === 0 ? '0%' : `${Math.round(schedules.reduce((acc, s) => acc + calculateScheduleProgress(s), 0) / schedules.length)}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={progressSearch}
                  onChange={(e) => setProgressSearch(e.target.value)}
                  placeholder="ค้นหาตาม JOB No., ชื่อโปรเจกต์, ลูกค้า, หรือชื่อโมดูล..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={progressProjectFilter}
                  onChange={(e) => setProgressProjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">-- ทุกโปรเจกต์ (Filter by Project) --</option>
                  {jobProjects.map(p => (
                    <option key={p.id} value={p.jobNo}>
                      {p.jobNo} | {p.projectName} ({p.customer})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Project Progress Cards Feed */}
          {jobProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-xs">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 font-sans">ไม่พบข้อมูลโปรเจกต์ในคลัง</h4>
              <p className="text-xs text-slate-400 font-sans">โปรดลงทะเบียน JOB No. และโปรเจกต์ใหม่ที่เมนูโครงการก่อนเพื่อเริ่มติดตามความคืบหน้า</p>
            </div>
          ) : (
            <div className="space-y-6">
              {jobProjects
                .filter(proj => {
                  const matchSearch = !progressSearch || 
                    proj.jobNo.toLowerCase().includes(progressSearch.toLowerCase()) ||
                    proj.projectName.toLowerCase().includes(progressSearch.toLowerCase()) ||
                    proj.customer.toLowerCase().includes(progressSearch.toLowerCase());
                  const matchProject = progressProjectFilter === 'all' || proj.jobNo === progressProjectFilter;
                  return matchSearch && matchProject;
                })
                .map((proj) => {
                  const modules = normalizeModules(proj.modules);
                  const projSchedules = schedules.filter(s => s.jobNo === proj.jobNo);
                  
                  // Calculate project completion percentage
                  const projAvgProgress = projSchedules.length > 0
                    ? Math.round(projSchedules.reduce((acc, s) => acc + calculateScheduleProgress(s), 0) / projSchedules.length)
                    : 0;

                  // Find related BOMs
                  const projBoms = boms ? boms.filter(b => b.jobNo === proj.jobNo) : [];
                  
                  // Find related Daily Reports
                  const projReports = dailyReports.filter(r => 
                    (r.jobsDetail || '').includes(proj.jobNo) || 
                    (r.reportTitle || '').includes(proj.jobNo) || 
                    (r.remark || '').includes(proj.jobNo)
                  );

                  return (
                    <div key={proj.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                      
                      {/* Project Header Banner */}
                      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          {proj.projectImageUrl ? (
                            <img
                              src={proj.projectImageUrl}
                              alt={proj.projectName}
                              className="h-12 w-12 rounded-xl object-cover border border-white/20 shrink-0 shadow-md"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                              <FolderGit2 className="h-6 w-6 text-indigo-300" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-black text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-0.5 rounded-lg">
                                {proj.jobNo}
                              </span>
                              <span className="text-xs text-slate-300 font-bold">
                                ลูกค้า: {proj.customer} ({proj.year || '2026'})
                              </span>
                            </div>
                            <h3 className="text-base font-black text-white font-sans mt-1">
                              {proj.projectName}
                            </h3>
                          </div>
                        </div>

                        {/* Project Overall Progress Gauge */}
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-300 font-bold uppercase block">ความคืบหน้าวิศวกรรม</span>
                            <span className="text-lg font-mono font-black text-emerald-400">{projAvgProgress}%</span>
                          </div>
                          <div className="w-20 bg-slate-700/80 h-2.5 rounded-full overflow-hidden border border-white/10">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${projAvgProgress}%` }}
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProgressProject(proj);
                              setSelectedProgressModule(modules.length > 0 ? modules[0].name : '');
                              setQuickProgressNote('');
                              setQuickProgressAssignee(employees.length > 0 ? employees[0].name : '');
                              setIsQuickProgressModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>บันทึกอัปเดตงาน</span>
                          </button>
                        </div>
                      </div>

                      {/* Project Modules Breakdown Grid */}
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                            <Cpu className="h-4 w-4 text-indigo-600" />
                            รายการโมดูล / ระบบย่อยในโครงการ ({modules.length} โมดูล)
                          </h4>

                          {projBoms.length > 0 && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                              มี BOM เชื่อมโยง ({projBoms.length} รายการ)
                            </span>
                          )}
                        </div>

                        {modules.length === 0 ? (
                          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-sans">
                            ไม่มีโมดูลระบุในโปรเจกต์นี้ (โปรดเพิ่มโมดูลย่อยที่เมนูโครงการ)
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                            {modules.map((mod, modIdx) => {
                              // Find schedule row for this module
                              const modSched = projSchedules.find(s => s.moduleName === mod.name || (mod.code && s.moduleCode === mod.code));
                              const modProgressPct = modSched ? calculateScheduleProgress(modSched) : 0;

                              return (
                                <div key={mod.code ? `mod_${mod.code}_${modIdx}` : `mod_${mod.name}_${modIdx}`} className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/70 space-y-3 transition-colors">
                                  
                                  {/* Module Title & Progress */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2">
                                      {(modSched?.imageUrl || mod.imageUrl) && (
                                        <img
                                          src={modSched?.imageUrl || mod.imageUrl}
                                          alt={mod.name}
                                          onClick={() => setActiveImagePreview(modSched?.imageUrl || mod.imageUrl!)}
                                          className="h-9 w-9 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                        />
                                      )}
                                      <div>
                                        <span className="text-[12px] font-black text-slate-800 font-sans block">
                                          {mod.name}
                                        </span>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                          {mod.code && (
                                            <span className="text-[10px] text-indigo-600 font-mono font-bold block">
                                              รหัส: [{mod.code}]
                                            </span>
                                          )}
                                          {modSched?.addressIo && (
                                            <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded-md">
                                              IO: {modSched.addressIo}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className={`text-xs font-mono font-black ${
                                        modProgressPct === 100 ? 'text-emerald-600' : modProgressPct >= 50 ? 'text-amber-600' : 'text-slate-600'
                                      }`}>
                                        {modProgressPct}%
                                      </span>
                                      <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                                        <div
                                          className={`h-full rounded-full ${
                                            modProgressPct === 100 ? 'bg-emerald-500' : modProgressPct >= 50 ? 'bg-amber-500' : 'bg-indigo-500'
                                          }`}
                                          style={{ width: `${modProgressPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* 6-Phase Pipeline Stepper Visualizer */}
                                  <div className="grid grid-cols-6 gap-1 pt-1">
                                    {[
                                      { key: 'installStatus', name: '1.Install', val: modSched?.installStatus },
                                      { key: 'wiringStatus', name: '2.Wiring', val: modSched?.wiringStatus },
                                      { key: 'testIoStatus', name: '3.Test IO', val: modSched?.testIoStatus },
                                      { key: 'manualHmiStatus', name: '4.Manual', val: modSched?.manualHmiStatus },
                                      { key: 'semiAutoStatus', name: '5.Semi', val: modSched?.semiAutoStatus },
                                      { key: 'autoStatus', name: '6.Auto', val: modSched?.autoStatus },
                                    ].map((phase) => {
                                      const isDone = phase.val === 'completed';
                                      const isDoing = phase.val === 'in_progress';

                                      return (
                                        <div
                                          key={phase.key}
                                          className={`p-1.5 rounded-lg text-center border text-[9.5px] font-sans font-bold flex flex-col items-center justify-center transition-all ${
                                            isDone
                                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                                              : isDoing
                                              ? 'bg-amber-400 text-slate-900 border-amber-500 font-black'
                                              : 'bg-white text-slate-400 border-slate-200'
                                          }`}
                                        >
                                          <span className="block leading-none truncate w-full">{phase.name}</span>
                                          <span className="text-[8px] mt-0.5 block leading-none">
                                            {isDone ? '✓' : isDoing ? '⏱️' : '—'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Assignee & Remark Footer */}
                                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600 font-sans">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                      <span className="font-bold text-slate-800 truncate">
                                        ผู้รับผิดชอบ: {modSched?.assignee || 'ยังไม่ระบุ'}
                                      </span>
                                    </div>

                                    {modSched?.remark && (
                                      <span className="text-[10px] text-slate-500 italic truncate max-w-[150px]" title={modSched.remark}>
                                        "{modSched.remark}"
                                      </span>
                                    )}
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Recent Progress Logs / Daily Reports Feed for this Project */}
                        {projReports.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                            <h5 className="text-[11px] font-extrabold text-slate-700 font-sans flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                              บันทึกอัปเดตหน้างานล่าสุด ({projReports.length} บันทึก)
                            </h5>

                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                              {projReports.slice(0, 3).map((rep) => (
                                <div key={rep.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-[11px] font-sans flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-indigo-700 font-mono">
                                      [{new Date(rep.date || rep.createdAt).toLocaleDateString('th-TH')}] {rep.employeeName}:
                                    </span>{' '}
                                    <span className="text-slate-800 font-medium">{rep.jobsDetail}</span>
                                    {rep.problems && rep.problems !== 'ไม่มี' && (
                                      <span className="text-rose-600 block text-[10px] font-semibold">
                                        ปัญหา/หมายเหตุ: {rep.problems}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {rep.status === 'reviewed' ? 'อนุมัติแล้ว' : 'รอตรวจ'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {subTab === 'daily_reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <DailyReportView
            dailyReports={dailyReports}
            onAddDailyReport={onAddDailyReport}
            onEditDailyReport={onEditDailyReport}
            onDeleteDailyReport={onDeleteDailyReport}
            employees={employees}
            jobs={jobs}
            jobProjects={jobProjects}
          />
        </div>
      )}


      {/* ======================================================================= */}
      {/* ======================= MODALS DIALOGS ================================ */}
      {/* ======================================================================= */}

      {/* -------------------- ADD TASK MODAL -------------------- */}
      {isTaskAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-indigo-600" />
                ใบงาน (Work Order)
              </h3>
              <button
                onClick={() => setIsTaskAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTaskAddSubmit}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Job No (from Master Project Dropdown) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 font-sans block">
                    หมายเลขใบสั่งงาน / Job No. <span className="text-rose-500">*</span>
                  </label>

                  {jobProjects.length === 0 ? (
                    <div className="p-2 bg-amber-50 text-amber-700 text-[10px] border border-amber-200 rounded-lg">
                      ไม่มีรหัส Job ในระบบ กรุณาลงทะเบียนรหัสโครงการก่อนเพื่ออ้างอิงลูกค้าและปีงบประมาณ
                    </div>
                  ) : (
                    <select
                      required
                      value={taskJobNo}
                      onChange={(e) => setTaskJobNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- กรุณาเลือก Job No. --</option>
                      {jobProjects.map(proj => (
                        <option key={proj.id} value={proj.jobNo}>
                          {proj.jobNo} | ลูกค้า: {proj.customer} ({proj.projectName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Module & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">โมดูล / อุปกรณ์ <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={taskModule}
                      onChange={(e) => setTaskModule(e.target.value)}
                      placeholder="เช่น ออกแบบ PLC logic, เชื่อมโครงฐานล่าง, ดึงสายไฟ MDB..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
                    />
                    
                    {/* Helper to select registered modules */}
                    {(() => {
                      const currentProj = jobProjects.find(p => p.jobNo === taskJobNo);
                      const currentProjModules = normalizeModules(currentProj?.modules || []);
                      
                      const sortedProjModules = [...currentProjModules].sort((a, b) => {
                        const cleanA = (a?.code || '').replace(/^\D+/g, '');
                        const cleanB = (b?.code || '').replace(/^\D+/g, '');
                        const numA = parseInt(cleanA, 10);
                        const numB = parseInt(cleanB, 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          if (numA !== numB) return numA - numB;
                        }
                        return (a?.code || '').localeCompare(b?.code || '', undefined, { numeric: true, sensitivity: 'base' });
                      });

                      const relatedBoms = boms ? boms.filter(bom => bom.jobNo === taskJobNo) : [];

                      if (sortedProjModules.length > 0 || relatedBoms.length > 0) {
                        return (
                          <div className="mt-1.5 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
                            {sortedProjModules.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] text-indigo-700 font-extrabold block">เลือกจากโมดูลที่ลงทะเบียนไว้:</span>
                                <div className="flex flex-wrap gap-1">
                                  {sortedProjModules.map((m, idx) => {
                                    const moduleStr = `${m.code} - ${m.name}`;
                                    const isSelected = taskModule === moduleStr || taskModule === m.name;
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setTaskModule(moduleStr)}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white border border-indigo-600' 
                                            : 'bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        {m.code} - {m.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {relatedBoms.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-indigo-100/50">
                                <span className="text-[9px] text-amber-700 font-extrabold block">หรือเลือกจากรายการ BOM:</span>
                                <div className="flex flex-wrap gap-1">
                                  {relatedBoms.map((bom) => {
                                    const isSelected = taskModule === bom.name;
                                    return (
                                      <button
                                        key={bom.id}
                                        type="button"
                                        onClick={() => {
                                          setTaskModule(bom.name);
                                          if (!taskDescription) {
                                            setTaskDescription(`ประกอบพัสดุตามสูตร BOM: ${bom.name}`);
                                          }
                                        }}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                          isSelected
                                            ? 'bg-amber-600 text-white border border-amber-600' 
                                            : 'bg-white hover:bg-amber-50 text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        📄 {bom.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">ความเร่งด่วน</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as Job['priority'])}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="low">ต่ำ (Low Priority)</option>
                      <option value="medium">ปกติ (Medium Priority)</option>
                      <option value="high">ด่วนมาก (High Priority)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">สถานะ</label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as Job['status'])}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="pending">1. ยังไม่ได้รับงาน (Pending)</option>
                      <option value="in_progress">2. กำลังทำ (In Progress)</option>
                      <option value="completed">3. จบงาน (Completed)</option>
                    </select>
                  </div>
                </div>

                {/* Assignee Selection (from Employees list) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">
                      ทีมช่างผู้รับผิดชอบ <span className="text-rose-500">*</span>
                    </label>

                    {employees.length === 0 ? (
                      <input
                        type="text"
                        required
                        value={taskAssignee}
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        placeholder="พิมพ์ชื่อพนักงาน/ช่างผู้รับผิดชอบ"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                      />
                    ) : (
                      <select
                        required
                        value={taskAssignee}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTaskAssignee(val);
                          if (val) localStorage.setItem('last_selected_assignee', val);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer font-bold"
                      >
                        <option value="">-- เลือกผู้รับผิดชอบ --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.name}>
                            {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || 'ทั่วไป'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">กำหนดเสร็จ (Target Date)</label>
                    <input
                      type="date"
                      value={taskTargetDate}
                      onChange={(e) => setTaskTargetDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 font-sans block">ข้อกำหนดเฉพาะ/รายละเอียดงาน</label>
                  <textarea
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="ใส่คำอธิบายเพิ่มเติม เช่น พิกัดตู้, อ้างอิงพาร์ทนัมเบอร์แบบวาด, ดึงสายไฟยี่ห้อเฉพาะ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                {/* Image Section in Add Modal */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-extrabold text-slate-500 font-sans block">แนบรูปภาพผลงาน / หลักฐานเสร็จงาน</span>
                  
                  <div className="flex gap-3 items-center mt-1">
                    {taskImageUrl ? (
                      <div className="relative h-14 w-20 rounded-lg overflow-hidden border border-slate-300 shadow-xs bg-white flex items-center justify-center group/addimg shrink-0">
                        <img src={taskImageUrl} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setTaskImageUrl('')}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/addimg:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold font-sans"
                        >
                          ลบออก
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 w-20 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer shrink-0 transition-colors">
                        <Camera className="h-4 w-4 text-indigo-500" />
                        <span className="text-[8px] text-slate-400 mt-1 font-sans">อัปโหลดรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result as string;
                              setTaskImageUrl(base64);
                              if (onAddMediaFile && base64) {
                                onAddMediaFile({
                                  name: taskModule ? `รูปงาน: ${taskModule}` : `รูปงาน ${file.name}`,
                                  type: 'image',
                                  url: base64,
                                  category: 'รูปงาน / หน้างาน',
                                  refName: taskJobNo || taskAssignee || undefined,
                                  size: file.size,
                                  fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}

                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={taskImageUrl}
                        onChange={(e) => setTaskImageUrl(e.target.value)}
                        placeholder="วาง URL รูปภาพผลงานตรงนี้..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-700 focus:outline-hidden"
                      />
                      <span className="text-[8px] text-slate-400 block font-sans">อัปโหลดภาพถ่ายจริง หรือ วางลิงก์รูปภาพสกรีนช็อต/งานประกอบ</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsTaskAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={jobProjects.length === 0}
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-slate-300 disabled:scale-100 disabled:cursor-not-allowed rounded-xl shadow-sm cursor-pointer"
                >
                  บันทึกงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- EDIT TASK MODAL -------------------- */}
      {isTaskEditModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
                แก้ไขข้อมูลงานมอบหมาย: {selectedTask.jobNo}
              </h3>
              <button
                onClick={() => setIsTaskEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTaskEditSubmit}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Job No Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 font-sans block">หมายเลขใบสั่งงาน / Job No.</label>
                  <select
                    required
                    value={taskJobNo}
                    onChange={(e) => setTaskJobNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    {jobProjects.map(proj => (
                      <option key={proj.id} value={proj.jobNo}>
                        {proj.jobNo} | ลูกค้า: {proj.customer} ({proj.projectName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 font-sans block">โมดูล / อุปกรณ์ <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={taskModule}
                    onChange={(e) => setTaskModule(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans text-slate-800 focus:outline-hidden"
                  />
                  
                  {/* Helper to select registered modules */}
                  {(() => {
                    const currentProj = jobProjects.find(p => p.jobNo === taskJobNo);
                    const currentProjModules = normalizeModules(currentProj?.modules || []);
                    
                    const sortedProjModules = [...currentProjModules].sort((a, b) => {
                      const cleanA = (a?.code || '').replace(/^\D+/g, '');
                      const cleanB = (b?.code || '').replace(/^\D+/g, '');
                      const numA = parseInt(cleanA, 10);
                      const numB = parseInt(cleanB, 10);
                      if (!isNaN(numA) && !isNaN(numB)) {
                        if (numA !== numB) return numA - numB;
                      }
                      return (a?.code || '').localeCompare(b?.code || '', undefined, { numeric: true, sensitivity: 'base' });
                    });

                    const relatedBoms = boms ? boms.filter(bom => bom.jobNo === taskJobNo) : [];

                    if (sortedProjModules.length > 0 || relatedBoms.length > 0) {
                      return (
                        <div className="mt-1.5 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
                          {sortedProjModules.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-indigo-700 font-extrabold block">เลือกจากโมดูลที่ลงทะเบียนไว้:</span>
                              <div className="flex flex-wrap gap-1">
                                {sortedProjModules.map((m, idx) => {
                                  const moduleStr = `${m.code} - ${m.name}`;
                                  const isSelected = taskModule === moduleStr || taskModule === m.name;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setTaskModule(moduleStr)}
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white border border-indigo-600' 
                                          : 'bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200'
                                      }`}
                                    >
                                      {m.code} - {m.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {relatedBoms.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-indigo-100/50">
                              <span className="text-[9px] text-amber-700 font-extrabold block">หรือเลือกจากรายการ BOM:</span>
                              <div className="flex flex-wrap gap-1">
                                {relatedBoms.map((bom) => {
                                  const isSelected = taskModule === bom.name;
                                  return (
                                    <button
                                      key={bom.id}
                                      type="button"
                                      onClick={() => {
                                        setTaskModule(bom.name);
                                        if (!taskDescription) {
                                          setTaskDescription(`ประกอบพัสดุตามสูตร BOM: ${bom.name}`);
                                        }
                                      }}
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-600 text-white border border-amber-600' 
                                          : 'bg-white hover:bg-amber-50 text-slate-600 border border-slate-200'
                                      }`}
                                    >
                                      📄 {bom.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">ความเร่งด่วน</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as Job['priority'])}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="low">ต่ำ (Low Priority)</option>
                      <option value="medium">ปกติ (Medium Priority)</option>
                      <option value="high">ด่วนมาก (High Priority)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">สถานะปัจจุบัน</label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as Job['status'])}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="pending">1. ยังไม่ได้รับงาน (Pending)</option>
                      <option value="in_progress">2. กำลังทำ (In Progress)</option>
                      <option value="completed">3. จบงาน (Completed)</option>
                      <option value="cancelled">ยกเลิก (Cancelled)</option>
                    </select>
                  </div>
                </div>

                {/* Assignee & Target Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">ผู้รับผิดชอบ</label>
                    <select
                      required
                      value={taskAssignee}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaskAssignee(val);
                        if (val) localStorage.setItem('last_selected_assignee', val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer font-bold"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || 'ช่าง'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">กำหนดเสร็จ (Target Date)</label>
                    <input
                      type="date"
                      value={taskTargetDate}
                      onChange={(e) => setTaskTargetDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 font-sans block">รายละเอียดงาน</label>
                  <textarea
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                {/* Image Section in Edit Modal */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-extrabold text-slate-500 font-sans block">แนบรูปภาพผลงาน / หลักฐานเสร็จงาน</span>
                  
                  <div className="flex gap-3 items-center mt-1">
                    {taskImageUrl ? (
                      <div className="relative h-14 w-20 rounded-lg overflow-hidden border border-slate-300 shadow-xs bg-white flex items-center justify-center group/editimg shrink-0">
                        <img src={taskImageUrl} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setTaskImageUrl('')}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/editimg:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold font-sans"
                        >
                          ลบออก
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 w-20 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer shrink-0 transition-colors">
                        <Camera className="h-4 w-4 text-indigo-500" />
                        <span className="text-[8px] text-slate-400 mt-1 font-sans">อัปโหลดรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result as string;
                              setTaskImageUrl(base64);
                              if (onAddMediaFile && base64) {
                                onAddMediaFile({
                                  name: taskModule ? `รูปงาน: ${taskModule}` : `รูปงาน ${file.name}`,
                                  type: 'image',
                                  url: base64,
                                  category: 'รูปงาน / หน้างาน',
                                  refName: taskJobNo || taskAssignee || undefined,
                                  size: file.size,
                                  fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}

                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={taskImageUrl}
                        onChange={(e) => setTaskImageUrl(e.target.value)}
                        placeholder="วาง URL รูปภาพผลงานตรงนี้..."
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-700 focus:outline-hidden"
                      />
                      <span className="text-[8px] text-slate-400 block font-sans">อัปโหลดภาพถ่ายจริง หรือ วางลิงก์รูปภาพสกรีนช็อต/งานประกอบ</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsTaskEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-sm cursor-pointer"
                >
                  บันทึกแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- PHASE MATRIX EDIT SHEET MODAL -------------------- */}
      {isPhaseSheetOpen && editingPhaseItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
                  <FileEdit className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-500 text-white font-mono font-black rounded text-[10px] tracking-wider">
                      {editingPhaseItem.jobNo}
                    </span>
                    <h3 className="text-base font-black font-sans text-white">
                      Sheet รายละเอียด Phase: {editingPhaseItem.moduleName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 font-sans mt-0.5">
                    {editingPhaseItem.projectName || 'โปรเจกต์งานวิศวกรรม'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhaseSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sheet Body */}
            <form
              className="flex-1 overflow-y-auto p-6 space-y-5 font-sans"
              onSubmit={async (e) => {
                e.preventDefault();
                await saveScheduleItem(editingPhaseItem);
                setIsPhaseSheetOpen(false);
                alert(`บันทึกข้อมูล Sheet โมดูล "${editingPhaseItem.moduleName}" เรียบร้อยแล้ว!`);
              }}
            >
              {/* Top Control Bar: Bypass Toggle & Progress */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingPhaseItem({ ...editingPhaseItem, isBypassed: !editingPhaseItem.isBypassed, updatedAt: new Date().toISOString() })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-2 transition-all cursor-pointer ${
                      editingPhaseItem.isBypassed
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-300 shadow-2xs'
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    <span>{editingPhaseItem.isBypassed ? '⚡ สถานะ: Bypassed (ข้ามระบบนี้)' : '⚡ กดปุ่มนี้เพื่อ Bypass (ไม่ต้องมีสถานะ)'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">ความคืบหน้ารวม:</span>
                  <span className="text-sm font-black font-mono text-indigo-700">
                    {editingPhaseItem.isBypassed ? 'ข้าม (100%)' : `${calculateScheduleProgress(editingPhaseItem)}%`}
                  </span>
                </div>
              </div>

              {/* Module & Sub-module info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ชื่อโมดูล / ระบบงาน *</label>
                  <input
                    type="text"
                    required
                    value={editingPhaseItem.moduleName}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, moduleName: e.target.value, updatedAt: new Date().toISOString() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Sub-module / รายการย่อย</label>
                  <input
                    type="text"
                    value={editingPhaseItem.subModuleName || ''}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, subModuleName: e.target.value, updatedAt: new Date().toISOString() })}
                    placeholder="ระบุรายการย่อย เช่น Sensor Conveyor 1, Pneumatic Cylinder..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Module Code & Address IO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">รหัสโมดูล (Module Code)</label>
                  <input
                    type="text"
                    value={editingPhaseItem.moduleCode || ''}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, moduleCode: e.target.value, updatedAt: new Date().toISOString() })}
                    placeholder="เช่น M01, MOD-PLC"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Address IO</label>
                  <input
                    type="text"
                    value={editingPhaseItem.addressIo || ''}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, addressIo: e.target.value, updatedAt: new Date().toISOString() })}
                    placeholder="เช่น I:0.0-0.7 / O:1.0-1.4"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">รูปภาพโมดูล / แบบแปลน</label>
                <div className="flex items-center gap-3">
                  {editingPhaseItem.imageUrl ? (
                    <img
                      src={editingPhaseItem.imageUrl}
                      alt={editingPhaseItem.moduleName}
                      className="h-12 w-12 object-cover rounded-xl border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-slate-100 rounded-xl border border-slate-200 border-dashed flex items-center justify-center text-slate-400">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}

                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Camera className="h-4 w-4 text-indigo-600" />
                    <span>เลือกรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingPhaseItem({ ...editingPhaseItem, imageUrl: reader.result as string, updatedAt: new Date().toISOString() });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    value={editingPhaseItem.imageUrl || ''}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, imageUrl: e.target.value, updatedAt: new Date().toISOString() })}
                    placeholder="หรือวาง URL รูปภาพ..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                  />
                </div>
              </div>

              {/* 6 Phase Status Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                  <span>สถานะความคืบหน้า 6 ขั้นตอน (Phase Status Matrix)</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  {/* Phase 1 */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">1. Install (ติดตั้ง)</span>
                    <div className="flex items-center gap-1">
                      {renderPhaseStatusBadge(
                        editingPhaseItem.installStatus,
                        'Install',
                        () => setEditingPhaseItem({ ...editingPhaseItem, installStatus: cyclePhaseStatus(editingPhaseItem.installStatus), updatedAt: new Date().toISOString() }),
                        editingPhaseItem.isBypassed
                      )}
                    </div>
                  </div>

                  {/* Phase 2 */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">2. Wiring (เดินสายไฟ)</span>
                    <div className="flex items-center gap-1">
                      {renderPhaseStatusBadge(
                        editingPhaseItem.wiringStatus,
                        'Wiring',
                        () => setEditingPhaseItem({ ...editingPhaseItem, wiringStatus: cyclePhaseStatus(editingPhaseItem.wiringStatus), updatedAt: new Date().toISOString() }),
                        editingPhaseItem.isBypassed
                      )}
                    </div>
                  </div>

                  {/* Phase 3 */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">3. Test IO (ทดสอบ IO)</span>
                    <div className="flex items-center gap-1">
                      {renderPhaseStatusBadge(
                        editingPhaseItem.testIoStatus,
                        'Test IO',
                        () => setEditingPhaseItem({ ...editingPhaseItem, testIoStatus: cyclePhaseStatus(editingPhaseItem.testIoStatus), updatedAt: new Date().toISOString() }),
                        editingPhaseItem.isBypassed
                      )}
                    </div>
                  </div>

                  {/* Phase 4 */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">4. Manual HMI</span>
                    <div className="flex items-center gap-1">
                      {renderPhaseStatusBadge(
                        editingPhaseItem.manualHmiStatus,
                        'Manual HMI',
                        () => setEditingPhaseItem({ ...editingPhaseItem, manualHmiStatus: cyclePhaseStatus(editingPhaseItem.manualHmiStatus), updatedAt: new Date().toISOString() }),
                        editingPhaseItem.isBypassed
                      )}
                    </div>
                  </div>

                  {/* Phase 5 */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">5. Semi-Auto</span>
                    <div className="flex items-center gap-1">
                      {renderPhaseStatusBadge(
                        editingPhaseItem.semiAutoStatus,
                        'Semi-Auto',
                        () => setEditingPhaseItem({ ...editingPhaseItem, semiAutoStatus: cyclePhaseStatus(editingPhaseItem.semiAutoStatus), updatedAt: new Date().toISOString() }),
                        editingPhaseItem.isBypassed
                      )}
                    </div>
                  </div>

                  {/* Phase 6 */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">6. Auto (อัตโนมัติ)</span>
                    <div className="flex items-center gap-1">
                      {renderPhaseStatusBadge(
                        editingPhaseItem.autoStatus,
                        'Auto',
                        () => setEditingPhaseItem({ ...editingPhaseItem, autoStatus: cyclePhaseStatus(editingPhaseItem.autoStatus), updatedAt: new Date().toISOString() }),
                        editingPhaseItem.isBypassed
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignee & Target Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ผู้รับผิดชอบหลัก</label>
                  <select
                    value={editingPhaseItem.assignee || ''}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, assignee: e.target.value, updatedAt: new Date().toISOString() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.name}>
                        {e.nickname ? `[${e.nickname}] ` : ''}{e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">กำหนดเสร็จ (Target Date)</label>
                  <input
                    type="date"
                    value={editingPhaseItem.targetCompletionDate || ''}
                    onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, targetCompletionDate: e.target.value, updatedAt: new Date().toISOString() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Remark */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">หมายเหตุ / หมายเหตุพิเศษ (Remark Sheet)</label>
                <textarea
                  rows={2}
                  value={editingPhaseItem.remark || ''}
                  onChange={(e) => setEditingPhaseItem({ ...editingPhaseItem, remark: e.target.value, updatedAt: new Date().toISOString() })}
                  placeholder="พิมพ์ข้อสังเกตเพิ่มเติมสำหรับ Sheet นี้..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Submit Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ Sheet โมดูล "${editingPhaseItem.moduleName}" นี้?`)) {
                      deleteScheduleItem(editingPhaseItem.id);
                      setIsPhaseSheetOpen(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>ลบ Sheet โมดูลนี้</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPhaseSheetOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer shadow-xs"
                  >
                    💾 บันทึกแก้ไข Sheet
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- ADD CUSTOM PHASE ROW MODAL -------------------- */}
      {isAddPhaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <SlidersHorizontal className="h-4.5 w-4.5 text-indigo-600" />
                เพิ่มแถว Phase งานใหม่ (Engineering Phase Row)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPhaseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newPhaseJobNo || !newPhaseModuleName) return;
                const proj = getProjectMeta(newPhaseJobNo);

                const item: EngineeringPhaseSchedule = {
                  id: `eng_${newPhaseJobNo}_${newPhaseModuleName.replace(/\s+/g, '_')}_${Date.now()}`,
                  jobNo: newPhaseJobNo,
                  projectName: proj?.projectName || '',
                  moduleCode: newPhaseModuleCode,
                  moduleName: newPhaseModuleName,
                  subModuleName: newPhaseSubModuleName,
                  isBypassed: false,
                  addressIo: newPhaseAddressIo,
                  imageUrl: newPhaseImageUrl,
                  installStatus: 'pending',
                  wiringStatus: 'pending',
                  testIoStatus: 'pending',
                  manualHmiStatus: 'pending',
                  semiAutoStatus: 'pending',
                  autoStatus: 'pending',
                  assignee: newPhaseAssignee || (employees.length > 0 ? employees[0].name : ''),
                  remark: newPhaseRemark,
                  updatedAt: new Date().toISOString()
                };

                await saveScheduleItem(item);
                setNewPhaseAddressIo('');
                setNewPhaseImageUrl('');
                setNewPhaseSubModuleName('');
                setIsAddPhaseModalOpen(false);
              }}
            >
              <div className="p-4 space-y-3 font-sans">
                
                {/* JOB No */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">JOB No. / โครงการ *</label>
                  <select
                    required
                    value={newPhaseJobNo}
                    onChange={(e) => setNewPhaseJobNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 cursor-pointer"
                  >
                    {jobProjects.map(p => (
                      <option key={p.id} value={p.jobNo}>
                        {p.jobNo} | {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module Code & Name */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block">รหัสโมดูล</label>
                    <input
                      type="text"
                      value={newPhaseModuleCode}
                      onChange={(e) => setNewPhaseModuleCode(e.target.value)}
                      placeholder="เช่น M01"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block">ชื่อโมดูล / ระบบงาน *</label>
                    <input
                      type="text"
                      required
                      value={newPhaseModuleName}
                      onChange={(e) => setNewPhaseModuleName(e.target.value)}
                      placeholder="เช่น ระบบลำเลียงสายพาน, ตู้ MDB..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Sub Module Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Sub-module / รายการย่อย</label>
                  <input
                    type="text"
                    value={newPhaseSubModuleName}
                    onChange={(e) => setNewPhaseSubModuleName(e.target.value)}
                    placeholder="เช่น Sensor Conveyor 1, Cylinder Push..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-900"
                  />
                </div>

                {/* Address IO */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Address IO (รายละเอียดตำแหน่ง IO)</label>
                  <input
                    type="text"
                    value={newPhaseAddressIo}
                    onChange={(e) => setNewPhaseAddressIo(e.target.value)}
                    placeholder="เช่น I:0.0 / O:1.2..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                </div>

                {/* Image Upload / URL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">รูปภาพโมดูล / ภาพประกอบ</label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0">
                      <Camera className="h-3.5 w-3.5 text-indigo-600" />
                      <span>แนบไฟล์รูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewPhaseImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={newPhaseImageUrl}
                      onChange={(e) => setNewPhaseImageUrl(e.target.value)}
                      placeholder="หรือวาง URL รูปภาพ..."
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* Assignee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ผู้รับผิดชอบ</label>
                  <select
                    value={newPhaseAssignee}
                    onChange={(e) => setNewPhaseAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.name}>
                        {e.nickname ? `[${e.nickname}] ` : ''}{e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remark */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">หมายเหตุเพิ่มเติม</label>
                  <input
                    type="text"
                    value={newPhaseRemark}
                    onChange={(e) => setNewPhaseRemark(e.target.value)}
                    placeholder="พิมพ์หมายเหตุ..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAddPhaseModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer shadow-xs"
                >
                  เพิ่มแถว Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- QUICK PROGRESS UPDATE LOG MODAL -------------------- */}
      {isQuickProgressModalOpen && selectedProgressProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-600" />
                บันทึกความคืบหน้างาน: {selectedProgressProject.jobNo}
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickProgressModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickProgressNote.trim()) return;

                onAddDailyReport({
                  employeeName: quickProgressAssignee || (employees.length > 0 ? employees[0].name : 'ผู้ดูแลงาน'),
                  date: new Date().toISOString().split('T')[0],
                  reportTitle: `รายงานความคืบหน้า JOB ${selectedProgressProject.jobNo}`,
                  jobsDetail: selectedProgressModule 
                    ? `[JOB: ${selectedProgressProject.jobNo}] [มอดูล: ${selectedProgressModule}] ${quickProgressNote.trim()}`
                    : `[JOB: ${selectedProgressProject.jobNo}] ${quickProgressNote.trim()}`,
                  problems: 'ไม่มี',
                  remark: `อัปเดตงานสำหรับ JOB ${selectedProgressProject.jobNo}`,
                  hoursWorked: 8,
                  status: 'pending_review'
                });

                setIsQuickProgressModalOpen(false);
                alert(`บันทึกความคืบหน้าสำหรับ JOB ${selectedProgressProject.jobNo} สำเร็จ!`);
              }}
            >
              <div className="p-4 space-y-3 font-sans text-xs">
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono block">{selectedProgressProject.jobNo}</span>
                  <span className="font-extrabold text-slate-800 block text-sm">{selectedProgressProject.projectName}</span>
                  <span className="text-[10px] text-slate-500 block">ลูกค้า: {selectedProgressProject.customer}</span>
                </div>

                {/* Module selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">โมดูลที่ดำเนินการ</label>
                  <select
                    value={selectedProgressModule}
                    onChange={(e) => setSelectedProgressModule(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- ภาพรวมทั้งโครงการ --</option>
                    {normalizeModules(selectedProgressProject.modules).map((m, idx) => (
                      <option key={m.code || m.name || idx} value={m.name}>
                        {m.code ? `[${m.code}] ` : ''}{m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reporter / Assignee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ผู้รายงาน / ผู้รับผิดชอบ</label>
                  <select
                    value={quickProgressAssignee}
                    onChange={(e) => setQuickProgressAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.name}>
                        {e.nickname ? `[${e.nickname}] ` : ''}{e.name} ({e.role || 'ช่าง'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Detail Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">รายละเอียดความคืบหน้า / สิ่งที่ทำเสร็จแล้ว *</label>
                  <textarea
                    required
                    rows={3}
                    value={quickProgressNote}
                    onChange={(e) => setQuickProgressNote(e.target.value)}
                    placeholder="ระบุสิ่งที่ทำเสร็จแล้ว ปัญหาที่พบ หรือสถานะล่าสุด..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsQuickProgressModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer shadow-xs"
                >
                  บันทึกอัปเดตงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- IMAGE LIGHTBOX MODAL -------------------- */}
      {activeImagePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md animate-in fade-in duration-250 cursor-zoom-out"
          onClick={() => setActiveImagePreview(null)}
        >
          <button 
            onClick={() => setActiveImagePreview(null)}
            className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer transition-colors"
            title="ปิดหน้าต่างรูปภาพ"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div 
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl bg-black border border-slate-700/50 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeImagePreview} 
              alt="งานประกอบเสร็จสิ้นขยายใหญ่" 
              className="max-w-full max-h-[80vh] object-contain block mx-auto"
              referrerPolicy="no-referrer"
            />
            <div className="bg-slate-900/90 border-t border-slate-800 text-center px-4 py-3">
              <p className="text-xs text-slate-300 font-sans font-semibold">ภาพถ่ายผลงานเสร็จสมบูรณ์ / หลักฐานตรวจสอบหน้าไซต์งาน</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
