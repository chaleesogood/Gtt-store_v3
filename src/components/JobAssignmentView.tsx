import React, { useState, useMemo } from 'react';
import { Job, Employee, JobProject, DailyReport, normalizeModules } from '../types';
import { 
  Briefcase, 
  User, 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
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
  Check
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
}

type ActiveTab = 'tasks' | 'daily_reports';

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
  onDeleteDailyReport
}: JobAssignmentViewProps) {
  
  // Navigation tabs
  const [subTab, setSubTab] = useState<ActiveTab>('tasks');

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
    setTaskJobNo(jobProjects.length > 0 ? jobProjects[0].jobNo : '');
    setTaskModule('');
    setTaskAssignee(employees.length > 0 ? employees[0].name : '');
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
    setTaskJobNo(jobProjects.length > 0 ? jobProjects[0].jobNo : '');
    setTaskAssignee(employees.length > 0 ? employees[0].name : '');
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
      task.jobNo.toLowerCase().includes(taskSearch.toLowerCase()) ||
      task.module.toLowerCase().includes(taskSearch.toLowerCase()) ||
      task.assignee.toLowerCase().includes(taskSearch.toLowerCase()) ||
      task.description.toLowerCase().includes(taskSearch.toLowerCase());
    
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
    <div className="space-y-6">
      
      {/* Tab Header Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-lg relative overflow-hidden">
        
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest font-mono">
            <Activity className="h-4 w-4 text-indigo-400" />
            <span>Operational Center</span>
          </div>
          <h2 className="text-xl font-black text-white font-sans flex items-center gap-2 mt-1.5">
            <Briefcase className="h-6 w-6 text-indigo-400" />
            ระบบจ่ายงาน & รายงานความคืบหน้าประจำวัน
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-xl">
            มอบหมายและติดตามความคืบหน้างานย่อยรายมอดูล และพนักงานเขียนรายงานการปฏิบัติงานประจำวันพร้อมภาพถ่ายแนบเข้าระบบอย่างเป็นระเบียบ
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shrink-0 self-start xl:self-center z-10">
          <button
            onClick={() => setSubTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'tasks' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>งานมอบหมาย ({jobs.length})</span>
          </button>
          <button
            onClick={() => setSubTab('daily_reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'daily_reports' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            id="tab-daily-reports"
          >
            <ClipboardList className="h-4 w-4" />
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
                งานระดับมอดูลที่มอบหมายให้ช่างเทคนิคและวิศวกร ดำเนินการ และรายงานความคืบหน้าแบบ Real-time
              </p>
            </div>

            <button
              onClick={openTaskAdd}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
              id="btn-add-task"
            >
              <Plus className="h-4 w-4" />
              <span>สั่งงานใหม่ / มอบหมายงาน</span>
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
                placeholder="ค้นหาชื่องาน, มอดูล, ผู้รับผิดชอบ หรือรายละเอียด..."
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
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
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
                ไม่พบงานมอบหมายมอดูลใดๆ ที่ตรงกับการค้นหาปัจจุบันของคุณ กรุณาปรับเปลี่ยนตัวกรอง หรือคลิกมอบหมายงานใหม่เพื่อเริ่มต้น
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
                                
                                {/* Project Thumbnail Image */}
                                {projMeta?.projectImageUrl ? (
                                  <img 
                                    src={projMeta.projectImageUrl} 
                                    alt={group.jobNo} 
                                    className="h-5 w-5 rounded-md object-cover border border-slate-250/70 shrink-0 shadow-4xs" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="h-5 w-5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                    <FolderGit2 className="h-3 w-3 text-slate-400" />
                                  </div>
                                )}

                                {/* Job No */}
                                <span className="text-[9.5px] font-black text-indigo-700 font-mono tracking-wide px-1.5 py-0.5 bg-indigo-50 border border-indigo-100/60 rounded-md shrink-0">
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

      {subTab === 'daily_reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <DailyReportView
            dailyReports={dailyReports}
            onAddDailyReport={onAddDailyReport}
            onEditDailyReport={onEditDailyReport}
            onDeleteDailyReport={onDeleteDailyReport}
            employees={employees}
            jobs={jobs}
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
                สั่งงานใหม่ / มอบหมายงานระดับมอดูล
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
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">มอดูล / ระบบงานย่อยที่มอบหมาย <span className="text-rose-500">*</span></label>
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
                        const cleanA = a.code.replace(/^\D+/g, '');
                        const cleanB = b.code.replace(/^\D+/g, '');
                        const numA = parseInt(cleanA, 10);
                        const numB = parseInt(cleanB, 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          if (numA !== numB) return numA - numB;
                        }
                        return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
                      });

                      if (sortedProjModules.length > 0) {
                        return (
                          <div className="mt-1.5 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
                            <span className="text-[9px] text-indigo-700 font-extrabold block">เลือกจากโมดูลที่ลงทะเบียนไว้:</span>
                            <div className="flex flex-wrap gap-1">
                              {sortedProjModules.map((m, idx) => {
                                const moduleStr = `${m.code} - ${m.name}`;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTaskModule(moduleStr)}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                      taskModule === moduleStr || taskModule === m.name
                                        ? 'bg-indigo-600 text-white border border-indigo-600' 
                                        : 'bg-slate-100 hover:bg-slate-200/85 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {m.code} - {m.name}
                                  </button>
                                );
                              })}
                            </div>
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
                        onChange={(e) => setTaskAssignee(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                      >
                        <option value="">-- เลือกผู้รับผิดชอบ --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} ({emp.role || 'ทั่วไป'})
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
                              setTaskImageUrl(reader.result as string);
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
                  <label className="text-[10px] font-bold text-slate-500 font-sans block">มอดูล / ระบบงานย่อยที่มอบหมาย <span className="text-rose-500">*</span></label>
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
                      const cleanA = a.code.replace(/^\D+/g, '');
                      const cleanB = b.code.replace(/^\D+/g, '');
                      const numA = parseInt(cleanA, 10);
                      const numB = parseInt(cleanB, 10);
                      if (!isNaN(numA) && !isNaN(numB)) {
                        if (numA !== numB) return numA - numB;
                      }
                      return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
                    });

                    if (sortedProjModules.length > 0) {
                      return (
                        <div className="mt-1.5 p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
                          <span className="text-[9px] text-indigo-700 font-extrabold block">เลือกจากโมดูลที่ลงทะเบียนไว้:</span>
                          <div className="flex flex-wrap gap-1">
                            {sortedProjModules.map((m, idx) => {
                              const moduleStr = `${m.code} - ${m.name}`;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setTaskModule(moduleStr)}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                    taskModule === moduleStr || taskModule === m.name
                                      ? 'bg-indigo-600 text-white border border-indigo-600' 
                                      : 'bg-slate-100 hover:bg-slate-200/85 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {m.code} - {m.name}
                                </button>
                              );
                            })}
                          </div>
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
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} ({emp.role || 'ช่าง'})
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
                              setTaskImageUrl(reader.result as string);
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
