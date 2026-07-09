import React, { useState } from 'react';
import { Job, Employee, JobProject } from '../types';
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
  AlertTriangle,
  Users,
  FolderGit2,
  Building2,
  Phone,
  Hash,
  FileSpreadsheet,
  ChevronRight,
  UserCheck,
  UserPlus,
  Compass
} from 'lucide-react';

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
}

type ActiveTab = 'tasks' | 'projects' | 'employees';

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
  onDeleteJobProject
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

  // -------------------- STATE FOR EMPLOYEES TAB --------------------
  const [empSearch, setEmpSearch] = useState('');
  const [isEmpAddModalOpen, setIsEmpAddModalOpen] = useState(false);
  const [isEmpEditModalOpen, setIsEmpEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Employee form fields
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empPhone, setEmpPhone] = useState('');

  // -------------------- STATE FOR PROJECTS TAB --------------------
  const [projSearch, setProjSearch] = useState('');
  const [isProjAddModalOpen, setIsProjAddModalOpen] = useState(false);
  const [isProjEditModalOpen, setIsProjEditModalOpen] = useState(false);
  const [selectedProj, setSelectedProj] = useState<JobProject | null>(null);

  // Project form fields
  const [projJobNo, setProjJobNo] = useState('');
  const [projYear, setProjYear] = useState(new Date().getFullYear().toString());
  const [projCustomer, setProjCustomer] = useState('');
  const [projName, setProjName] = useState('');


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
      targetDate: taskTargetDate || undefined
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
      targetDate: taskTargetDate || undefined
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
    
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    setTaskTargetDate(oneWeekFromNow.toISOString().split('T')[0]);
  };

  // Employee form submissions
  const handleEmpAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    await onAddEmployee({
      name: empName.trim(),
      role: empRole.trim() || undefined,
      phone: empPhone.trim() || undefined
    });

    setIsEmpAddModalOpen(false);
    setEmpName('');
    setEmpRole('');
    setEmpPhone('');
  };

  const handleEmpEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !empName.trim()) return;

    await onEditEmployee(selectedEmp.id, {
      name: empName.trim(),
      role: empRole.trim() || undefined,
      phone: empPhone.trim() || undefined
    });

    setIsEmpEditModalOpen(false);
    setSelectedEmp(null);
    setEmpName('');
    setEmpRole('');
    setEmpPhone('');
  };

  // Project form submissions
  const handleProjAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projJobNo.trim() || !projCustomer.trim() || !projName.trim()) return;

    // Check duplicate
    const isDuplicate = jobProjects.some(p => p.jobNo.toLowerCase() === projJobNo.trim().toLowerCase());
    if (isDuplicate) {
      alert(`มีรหัสงาน ${projJobNo} นี้ในระบบแล้ว กรุณาใช้รหัสอื่น`);
      return;
    }

    await onAddJobProject({
      jobNo: projJobNo.trim().toUpperCase(),
      year: projYear.trim() || new Date().getFullYear().toString(),
      customer: projCustomer.trim(),
      projectName: projName.trim()
    });

    setIsProjAddModalOpen(false);
    setProjJobNo('');
    setProjCustomer('');
    setProjName('');
  };

  const handleProjEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj || !projJobNo.trim() || !projCustomer.trim() || !projName.trim()) return;

    await onEditJobProject(selectedProj.id, {
      jobNo: projJobNo.trim().toUpperCase(),
      year: projYear.trim(),
      customer: projCustomer.trim(),
      projectName: projName.trim()
    });

    setIsProjEditModalOpen(false);
    setSelectedProj(null);
    setProjJobNo('');
    setProjCustomer('');
    setProjName('');
  };

  // Open task modals with default selections prefilled
  const openTaskAdd = () => {
    // Select first job project and first employee as default, or empty if none
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
    setIsTaskEditModalOpen(true);
  };

  const openEmpEdit = (emp: Employee) => {
    setSelectedEmp(emp);
    setEmpName(emp.name);
    setEmpRole(emp.role || '');
    setEmpPhone(emp.phone || '');
    setIsEmpEditModalOpen(true);
  };

  const openProjEdit = (proj: JobProject) => {
    setSelectedProj(proj);
    setProjJobNo(proj.jobNo);
    setProjYear(proj.year);
    setProjCustomer(proj.customer);
    setProjName(proj.projectName);
    setIsProjEditModalOpen(true);
  };

  // Quick generate Job No helper in projects tab
  const autoGenerateNewProjJobNo = () => {
    const yy = projYear ? projYear.slice(-2) : new Date().getFullYear().toString().slice(-2);
    const prefix = `JOB-${yy}07-`; // July by default or generic
    const matching = jobProjects.filter(p => p.jobNo.startsWith(prefix));
    
    let nextNum = 1;
    if (matching.length > 0) {
      const serials = matching.map(p => {
        const parts = p.jobNo.split('-');
        const serialStr = parts[parts.length - 1];
        return parseInt(serialStr, 10) || 0;
      });
      nextNum = Math.max(...serials) + 1;
    }
    setProjJobNo(`${prefix}${String(nextNum).padStart(3, '0')}`);
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

  // Employees Filter
  const filteredEmployees = employees.filter(emp => {
    return (
      emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      (emp.role || '').toLowerCase().includes(empSearch.toLowerCase()) ||
      (emp.phone || '').toLowerCase().includes(empSearch.toLowerCase())
    );
  });

  // Projects Filter
  const filteredProjects = jobProjects.filter(proj => {
    return (
      proj.jobNo.toLowerCase().includes(projSearch.toLowerCase()) ||
      proj.customer.toLowerCase().includes(projSearch.toLowerCase()) ||
      proj.projectName.toLowerCase().includes(projSearch.toLowerCase()) ||
      proj.year.includes(projSearch)
    );
  });

  // -------------------- STATS CALCULATORS --------------------
  const completedTasksCount = jobs.filter(t => t.status === 'completed').length;
  const activeTasksCount = jobs.filter(t => t.status === 'in_progress' || t.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Tab Header Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-lg relative overflow-hidden">
        
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest font-mono">
            <Compass className="h-4 w-4 animate-spin-slow text-indigo-400" />
            <span>Operational Center</span>
          </div>
          <h2 className="text-xl font-black text-white font-sans flex items-center gap-2 mt-1.5">
            <Briefcase className="h-6 w-6 text-indigo-400" />
            ระบบจ่ายงาน & จัดการโครงการ
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-xl">
            บันทึกรหัสงานปีพนักงาน มอบหมายและติดตามความคืบหน้าระบบงานมอดูลอย่างมีประสิทธิภาพในที่เดียว
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shrink-0 self-start xl:self-center z-10">
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
            onClick={() => setSubTab('projects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'projects' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            id="tab-manage-projects"
          >
            <FolderGit2 className="h-4 w-4" />
            <span>จัดการโปรเจกต์ & ลูกค้า ({jobProjects.length})</span>
          </button>
          <button
            onClick={() => setSubTab('employees')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTab === 'employees' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            id="tab-manage-employees"
          >
            <Users className="h-4 w-4" />
            <span>จัดการรายชื่อพนักงาน ({employees.length})</span>
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
                ตารางงานมอบหมายรายมอดูล (Assigned Tasks)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                งานระดับมอดูลที่มอบหมายให้ช่างเทคนิคและวิศวกร ดำเนินการ และลงความคืบหน้าแบบ Real-time
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

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block font-sans">งานจ่ายทั้งหมด</span>
                <span className="text-lg font-black text-slate-800 font-mono block leading-none mt-1">{jobs.length} <span className="text-[10px] text-slate-400 font-sans">งาน</span></span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Play className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block font-sans">กำลังทำอยู่</span>
                <span className="text-lg font-black text-amber-600 font-mono block leading-none mt-1">{jobs.filter(j => j.status === 'in_progress').length} <span className="text-[10px] text-slate-400 font-sans">งาน</span></span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block font-sans">เสร็จสิ้นสมบูรณ์</span>
                <span className="text-lg font-black text-emerald-600 font-mono block leading-none mt-1">{completedTasksCount} <span className="text-[10px] text-slate-400 font-sans">งาน</span></span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block font-sans">รอดำเนินการ</span>
                <span className="text-lg font-black text-slate-700 font-mono block leading-none mt-1">{jobs.filter(j => j.status === 'pending').length} <span className="text-[10px] text-slate-400 font-sans">งาน</span></span>
              </div>
            </div>
          </div>

          {/* Filters and Search Panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            
            {/* Search row */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่องาน, มอดูล, ผู้รับผิดชอบ หรือรายละเอียด..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Filter select elements */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/60">
              
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 font-sans">สถานะ:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-0 text-[10px] font-extrabold text-slate-700 focus:ring-0 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">ทั้งหมด (All)</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
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

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <User className="h-3.5 w-3.5 text-slate-400" />
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

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <FolderGit2 className="h-3.5 w-3.5 text-slate-400" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map(task => {
                const isOverdue = 
                  task.status !== 'completed' && 
                  task.status !== 'cancelled' && 
                  task.targetDate && 
                  new Date(task.targetDate) < new Date(new Date().setHours(0,0,0,0));

                const projMeta = getProjectMeta(task.jobNo);
                const empMeta = getEmployeeMeta(task.assignee);

                return (
                  <div 
                    key={task.id}
                    className={`bg-white rounded-2xl border shadow-xs p-5 transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isOverdue ? 'border-rose-300 bg-rose-50/5' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {/* Urgency side indicator */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                      task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-indigo-400' : 'bg-slate-300'
                    }`} />

                    <div>
                      {/* Job Header */}
                      <div className="flex items-start justify-between gap-3 mb-3 pl-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-black text-indigo-700 font-mono tracking-wide px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                              {task.jobNo}
                            </span>
                            
                            {/* Smart Display of Customer & Year looked up from Master List */}
                            {projMeta ? (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60 max-w-[160px] truncate" title={`ลูกค้า: ${projMeta.customer} | โครงการ: ${projMeta.projectName}`}>
                                {projMeta.customer} ({projMeta.year})
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 italic">
                                ไม่มีในฐานข้อมูล
                              </span>
                            )}

                            {/* Priority */}
                            {task.priority === 'high' ? (
                              <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-0.5 font-sans">
                                <AlertTriangle className="h-3 w-3 inline" /> ด่วน (High)
                              </span>
                            ) : task.priority === 'medium' ? (
                              <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 font-sans">
                                กลาง (Med)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 font-sans">
                                ต่ำ (Low)
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-black text-slate-800 font-sans group-hover:text-indigo-600 transition-colors mt-2">
                            {task.module}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {task.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <Clock className="h-3 w-3" /> รอดำเนินการ
                            </span>
                          )}
                          {task.status === 'in_progress' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Play className="h-3 w-3 animate-pulse text-amber-500" /> กำลังทำ
                            </span>
                          )}
                          {task.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> เสร็จสิ้น
                            </span>
                          )}
                          {task.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              <X className="h-3 w-3 text-rose-500" /> ยกเลิก
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 font-sans line-clamp-3 leading-relaxed mb-4 pl-2">
                        {task.description || 'ไม่มีคำอธิบายงานเฉพาะเจาะจง'}
                      </p>

                      <div className="border-t border-slate-100 pt-3.5 pl-2 space-y-2 text-[11px]">
                        
                        {/* Assignee details */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400 font-sans">
                            <User className="h-3.5 w-3.5" />
                            <span>ผู้รับผิดชอบ:</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-700 font-sans bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 block">
                              {task.assignee}
                            </span>
                            {empMeta?.role && (
                              <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                {empMeta.role}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Target Date */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400 font-sans">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>กำหนดเสร็จ:</span>
                          </div>
                          <span className={`font-bold font-mono px-2 py-0.5 rounded-md ${
                            isOverdue 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 font-black animate-pulse' 
                              : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                            {task.targetDate ? new Date(task.targetDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'ไม่ระบุ'}
                            {isOverdue && ' (เลยกำหนดแล้ว!)'}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Quick controls inside cards */}
                    <div className="border-t border-slate-100/80 pt-4 mt-4 pl-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => onEditJob(task.id, { status: 'in_progress' })}
                            className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer transition-all"
                          >
                            เริ่มทำงานนี้
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => onEditJob(task.id, { status: 'completed' })}
                            className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            ปิดงาน (Complete)
                          </button>
                        )}
                        {(task.status === 'completed' || task.status === 'cancelled') && (
                          <button
                            onClick={() => onEditJob(task.id, { status: 'in_progress' })}
                            className="px-2 py-0.5 text-[9px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-md cursor-pointer transition-all"
                          >
                            ทำซ้ำ / เปิดงานใหม่ (Re-open)
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openTaskEdit(task)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขรายละเอียดงาน"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ต้องการลบงาน "${task.module}" สำหรับ JOB ${task.jobNo} หรือไม่?`)) {
                              onDeleteJob(task.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบงานนี้ออก"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= TAB 2: JOB MASTER / PROJECTS ================== */}
      {/* ======================================================================= */}
      {subTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                <FolderGit2 className="h-4 w-4 text-indigo-500" />
                ทะเบียนคุมหมายเลขงานโปรเจกต์ & ลูกค้า (Job Master)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                หมวดคุมรหัสประจำตัวโครงการ ปีงบประมาณ และชื่อลูกค้าเพื่อใช้อ้างอิงจัดระเบียบงานและประวัติทั้งหมด
              </p>
            </div>

            <button
              onClick={() => {
                setProjJobNo('');
                setProjYear(new Date().getFullYear().toString());
                setProjCustomer('');
                setProjName('');
                setIsProjAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
              id="btn-add-project"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างรหัสโครงการใหม่</span>
            </button>
          </div>

          {/* Search Master Project */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาด้วย Job No., ปี, ลูกค้า, หรือชื่อโปรเจกต์..."
                value={projSearch}
                onChange={(e) => setProjSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
            
            {projSearch && (
              <button
                onClick={() => setProjSearch('')}
                className="px-3 py-2 text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 rounded-xl cursor-pointer"
              >
                ล้างคำค้น
              </button>
            )}
          </div>

          {/* Project List / Grid */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <FolderGit2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-extrabold text-slate-700 font-sans">ไม่พบรหัสงานโครงการ</h4>
              <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
                ยังไม่มีข้อมูลโปรเจกต์ในระบบที่ตรงกับการค้นหา คุณสามารถกดปุ่ม "สร้างรหัสโครงการใหม่" ด้านบน เพื่อระบุเลข Job No., ปีงบประมาณ และชื่อลูกค้าสำหรับโปรเจกต์
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(proj => {
                // Find how many tasks are tied to this master Job No
                const associatedTasks = jobs.filter(j => j.jobNo === proj.jobNo);
                const completedAssociated = associatedTasks.filter(j => j.status === 'completed').length;

                return (
                  <div 
                    key={proj.id}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-indigo-700 font-mono tracking-wide px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-xl">
                          {proj.jobNo}
                        </span>
                        
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60 font-mono">
                          ปี {proj.year}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase font-sans tracking-wider flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        ลูกค้า: <span className="text-slate-700 font-black">{proj.customer}</span>
                      </h4>

                      <p className="text-xs font-extrabold text-slate-800 font-sans mt-2 line-clamp-2 min-h-[2rem]">
                        {proj.projectName}
                      </p>

                      {/* Micro Task Stats */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>จำนวนมอดูลย่อย:</span>
                        <span className="font-extrabold text-slate-700 font-mono">
                          {associatedTasks.length > 0 ? (
                            <span>{completedAssociated}/{associatedTasks.length} สำเร็จ ({Math.round((completedAssociated / associatedTasks.length) * 100)}%)</span>
                          ) : (
                            <span className="text-slate-400 italic font-sans font-normal">ไม่มีมอดูลย่อย</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Edit/Delete control panel */}
                    <div className="mt-4 pt-3 border-t border-slate-100/60 flex justify-end gap-1">
                      <button
                        onClick={() => openProjEdit(proj)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขรายละเอียดโปรเจกต์"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          if (associatedTasks.length > 0) {
                            alert(`ไม่สามารถลบรหัสงาน ${proj.jobNo} นี้ได้ เนื่องจากยังมีงานมอดูลย่อยมอบหมายอยู่จำนวน ${associatedTasks.length} รายการ`);
                            return;
                          }
                          if (confirm(`ยืนยันการลบรหัสงาน "${proj.jobNo}" ของลูกค้า "${proj.customer}" ออกจากระบบหรือไม่?`)) {
                            onDeleteJobProject(proj.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบโปรเจกต์นี้"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= TAB 3: EMPLOYEES DIRECTORY ==================== */}
      {/* ======================================================================= */}
      {subTab === 'employees' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-500" />
                สารบบข้อมูลและพนักงาน (Employee Directory)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                เพิ่ม ลบ และบันทึกข้อมูลทีมช่างและวิศวกรผู้รับผิดชอบงานเพื่อใช้ในเมนูดร็อปดาวน์สั่งงานได้อย่างสะดวกสบาย
              </p>
            </div>

            <button
              onClick={() => {
                setEmpName('');
                setEmpRole('');
                setEmpPhone('');
                setIsEmpAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
              id="btn-add-employee"
            >
              <UserPlus className="h-4 w-4" />
              <span>เพิ่มรายชื่อพนักงาน</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารายชื่อพนักงาน, ตำแหน่ง หรือเบอร์โทรศัพท์..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
            
            {empSearch && (
              <button
                onClick={() => setEmpSearch('')}
                className="px-3 py-2 text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 rounded-xl cursor-pointer"
              >
                ล้างคำค้น
              </button>
            )}
          </div>

          {/* Employees List */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-extrabold text-slate-700 font-sans">ไม่พบข้อมูลรายชื่อพนักงาน</h4>
              <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
                ยังไม่มีข้อมูลพนักงานหรือทีมช่างในระบบที่ตรงกับตัวกรอง คุณสามารถกดปุ่ม "เพิ่มรายชื่อพนักงาน" ด้านบนเพื่อเพิ่มข้อมูลเบื้องต้น
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredEmployees.map(emp => {
                // Find jobs currently assigned to this employee
                const assignedCount = jobs.filter(j => j.assignee === emp.name && (j.status === 'in_progress' || j.status === 'pending')).length;

                return (
                  <div 
                    key={emp.id}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Avatar design */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-black font-mono">
                          {emp.name.slice(3, 5).trim() || emp.name.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 font-sans">
                            {emp.name}
                          </h4>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md font-bold mt-0.5 inline-block">
                            {emp.role || 'ช่างเทคนิคทั่วไป'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] pt-3 border-t border-slate-100">
                        {emp.phone && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <a href={`tel:${emp.phone}`} className="hover:underline hover:text-indigo-600 font-mono font-bold">
                              {emp.phone}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-slate-400" />
                            <span>งานค้างที่รับผิดชอบ:</span>
                          </span>
                          <span className={`font-black font-mono ${assignedCount > 0 ? 'text-amber-600 bg-amber-50 px-1.5 rounded-md border border-amber-100' : 'text-slate-400'}`}>
                            {assignedCount} งาน
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="mt-4 pt-3 border-t border-slate-100/60 flex justify-end gap-1">
                      <button
                        onClick={() => openEmpEdit(emp)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลพนักงาน"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (assignedCount > 0) {
                            alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานมอบหมายที่ค้างส่งอยู่จำนวน ${assignedCount} งาน`);
                            return;
                          }
                          if (confirm(`ยืนยันการนำพนักงาน "${emp.name}" ออกจากระบบทะเบียนหรือไม่?`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบพนักงานออกจากระบบ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 font-sans block">
                      หมายเลขใบสั่งงาน / Job No. <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTaskAddModalOpen(false);
                        setSubTab('projects');
                        setTimeout(() => setIsProjAddModalOpen(true), 150);
                      }}
                      className="text-[9px] text-indigo-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      + เพิ่มรหัส Job ใหม่
                    </button>
                  </div>

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
                      <option value="pending">รอดำเนินการ (Pending)</option>
                      <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
                      <option value="completed">เสร็จสิ้น (Completed)</option>
                    </select>
                  </div>
                </div>

                {/* Assignee Selection (from Employees list) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 font-sans block">
                        ทีมช่างผู้รับผิดชอบ <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsTaskAddModalOpen(false);
                          setSubTab('employees');
                          setTimeout(() => setIsEmpAddModalOpen(true), 150);
                        }}
                        className="text-[9px] text-indigo-600 hover:underline font-bold cursor-pointer"
                      >
                        + เพิ่มรายชื่อช่าง
                      </button>
                    </div>

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
                      <option value="pending">รอดำเนินการ (Pending)</option>
                      <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
                      <option value="completed">เสร็จสิ้น (Completed)</option>
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


      {/* -------------------- ADD EMPLOYEE MODAL -------------------- */}
      {isEmpAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <UserPlus className="h-4.5 w-4.5 text-indigo-600" />
                เพิ่มข้อมูลพนักงานลงทะเบียน
              </h3>
              <button
                onClick={() => setIsEmpAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEmpAddSubmit}>
              <div className="p-5 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อ-นามสกุล / ชื่อเล่นพนักงาน <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="เช่น ช่างเก่ง (Keng), วิศวกรชานนท์"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ตำแหน่งหน้าที่ / แผนกความถนัด</label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    placeholder="เช่น ช่างประกอบตู้คอนโทรล, ช่างกลโรงงาน, เชื่อมโครงประกอบ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="เช่น 08x-xxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsEmpAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- EDIT EMPLOYEE MODAL -------------------- */}
      {isEmpEditModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
                แก้ไขประวัติพนักงาน: {selectedEmp.name}
              </h3>
              <button
                onClick={() => setIsEmpEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEmpEditSubmit}>
              <div className="p-5 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อ-นามสกุล / ชื่อเล่นพนักงาน <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ตำแหน่งหน้าที่ / แผนกความถนัด</label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsEmpEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* -------------------- ADD PROJECT MODAL -------------------- */}
      {isProjAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <FolderGit2 className="h-4.5 w-4.5 text-indigo-600" />
                เพิ่มรหัสใบสั่งงานโครงการหลัก (Job Master)
              </h3>
              <button
                onClick={() => setIsProjAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProjAddSubmit}>
              <div className="p-5 space-y-4">
                
                {/* Job No with Auto generator button */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หมายเลข Job No. <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={projJobNo}
                      onChange={(e) => setProjJobNo(e.target.value)}
                      placeholder="เช่น JOB-2607-005"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={autoGenerateNewProjJobNo}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[10px] font-black rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      สร้างเลขรหัส
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ปีงบประมาณ / ปี พ.ศ. ค.ศ. <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={projYear}
                      onChange={(e) => setProjYear(e.target.value)}
                      placeholder="เช่น 2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  {/* Customer */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ลูกค้า (Customer) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={projCustomer}
                      onChange={(e) => setProjCustomer(e.target.value)}
                      placeholder="เช่น Gtt-store, Siam Automation"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Project Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อโครงการ / รายละเอียดโครงการ <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="เช่น งานติดตั้งตู้ควบคุมแผงกระจายกำลังหลักและโปรแกรมมิ่ง"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsProjAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-sm cursor-pointer"
                >
                  สร้างรหัสโครงการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- EDIT PROJECT MODAL -------------------- */}
      {isProjEditModalOpen && selectedProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
                แก้ไขข้อมูลโปรเจกต์: {selectedProj.jobNo}
              </h3>
              <button
                onClick={() => setIsProjEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProjEditSubmit}>
              <div className="p-5 space-y-4">
                
                {/* Job No */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หมายเลข Job No. <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={projJobNo}
                    onChange={(e) => setProjJobNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ปีงบประมาณ / ปี พ.ศ. ค.ศ. <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={projYear}
                      onChange={(e) => setProjYear(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  {/* Customer */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ลูกค้า (Customer) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={projCustomer}
                      onChange={(e) => setProjCustomer(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Project Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อโครงการ / รายละเอียดโครงการ <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsProjEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl shadow-sm cursor-pointer"
                >
                  บันทึกแก้ไขโครงการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
