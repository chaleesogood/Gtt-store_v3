import React, { useState, useMemo, useEffect } from 'react';
import { Job, Employee, JobProject, normalizeModules, Brand } from '../types';
import { 
  FolderGit2, 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Phone, 
  UserPlus, 
  Camera, 
  Upload, 
  Check, 
  Layers, 
  Compass,
  ArrowRight,
  Crown,
  Award,
  Mail,
  Smile,
  Network,
  Palette,
  Wrench,
  Sparkles,
  ClipboardList,
  Tag
} from 'lucide-react';

const getDeptBadgeStyle = (dept: string) => {
  switch (dept) {
    case 'Owner':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50';
    case 'Accounting':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
    case 'Electrical':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50';
    case 'Assembly':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
    case 'Machine Shop':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
    case 'Design':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50';
    case 'Welding':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

// =========================================================================
// SUB-COMPONENT: ProjectModulesManager
// =========================================================================
function ProjectModulesManager({ 
  proj, 
  onEditJobProject,
  jobs,
  onEditJob
}: { 
  proj: JobProject; 
  onEditJobProject: (id: string, updatedFields: Partial<JobProject>) => Promise<void>; 
  jobs: Job[];
  onEditJob: (id: string, updatedFields: Partial<Job>) => Promise<void>;
}) {
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newImgUrl, setNewImgUrl] = useState('');
  
  // For editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingName, setEditingName] = useState('');

  // Normalize existing modules
  const rawModules = proj.modules || [];
  const modules = normalizeModules(rawModules);

  // Sort modules by module code number (least on top, greatest on bottom)
  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      const cleanA = a.code.replace(/^\D+/g, '');
      const cleanB = b.code.replace(/^\D+/g, '');
      const numA = parseInt(cleanA, 10);
      const numB = parseInt(cleanB, 10);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      }
      return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [modules]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeVal = newCode.trim();
    const nameVal = newName.trim();
    if (!codeVal || !nameVal) return;
    
    // Check if code is already registered
    if (modules.some(m => m.code === codeVal)) {
      alert('มีรหัสโมดูลนี้ในโครงการอยู่แล้ว');
      return;
    }

    const updated = [...modules, { code: codeVal, name: nameVal, imageUrl: newImgUrl || '' }];
    await onEditJobProject(proj.id, { modules: updated });
    
    setNewCode('');
    setNewName('');
    setNewImgUrl('');
  };

  const handleSaveEdit = async (idx: number) => {
    const codeVal = editingCode.trim();
    const nameVal = editingName.trim();
    if (!codeVal || !nameVal) return;

    const oldModule = sortedModules[idx];
    
    // Check duplicates except itself
    if (modules.some(m => m.code === codeVal && m.code !== oldModule.code)) {
      alert('มีรหัสโมดูลนี้ในโครงการอยู่แล้ว');
      return;
    }

    const updated = modules.map(m => {
      if (m.code === oldModule.code) {
        return { ...m, code: codeVal, name: nameVal };
      }
      return m;
    });
    
    await onEditJobProject(proj.id, { modules: updated });

    // Also update all tasks that are bound to this old name/code & jobNo
    const oldStringFormat = `${oldModule.code} - ${oldModule.name}`;
    const oldPlainName = oldModule.name;
    const newStringFormat = `${codeVal} - ${nameVal}`;

    const relatedJobs = jobs.filter(
      j => j.jobNo === proj.jobNo && (j.module === oldStringFormat || j.module === oldPlainName || j.module === oldModule.code)
    );
    if (relatedJobs.length > 0) {
      if (confirm(`พบใบสั่งงานในระบบ ${relatedJobs.length} รายการที่อ้างอิงโมดูลเดิม\nต้องการเปลี่ยนชื่อโมดูลสำหรับใบสั่งงานเหล่านี้เป็น "${newStringFormat}" ด้วยหรือไม่?`)) {
        for (const rJob of relatedJobs) {
          await onEditJob(rJob.id, { module: newStringFormat });
        }
      }
    }

    setEditingIndex(null);
  };

  const handleDelete = async (moduleCode: string, moduleName: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโมดูล "${moduleCode} - ${moduleName}" ออกจากโครงการ?`)) {
      const updated = modules.filter(m => m.code !== moduleCode);
      await onEditJobProject(proj.id, { modules: updated });
    }
  };

  const handleUploadImage = async (moduleCode: string, base64Data: string) => {
    const updated = modules.map(m => {
      if (m.code === moduleCode) {
        return { ...m, imageUrl: base64Data };
      }
      return m;
    });
    await onEditJobProject(proj.id, { modules: updated });
  };

  const handleDeleteImage = async (moduleCode: string) => {
    if (confirm('ต้องการลบรูปภาพโมดูลนี้ใช่หรือไม่?')) {
      const updated = modules.map(m => {
        if (m.code === moduleCode) {
          return { ...m, imageUrl: '' };
        }
        return m;
      });
      await onEditJobProject(proj.id, { modules: updated });
    }
  };

  return (
    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-4 mt-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-150">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
          <Layers className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
          <span>โมดูลและระบบย่อย ({sortedModules.length})</span>
          <span className="text-[10px] text-slate-400 font-normal ml-1">เรียงตามรหัสโมดูลจากน้อยไปมาก</span>
        </div>
      </div>

      {/* Multi-field Add Form */}
      <form onSubmit={handleAdd} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-2xs space-y-3">
        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">ลงทะเบียนโมดูลใหม่</div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          {/* Code field */}
          <div className="sm:col-span-3">
            <input
              type="text"
              required
              placeholder="รหัสโมดูล (เช่น 01)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
          {/* Name field */}
          <div className="sm:col-span-6">
            <input
              type="text"
              required
              placeholder="ชื่อโมดูล (เช่น ตู้คอนโทรลหลัก)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
          {/* Action button */}
          <div className="sm:col-span-3 flex gap-2">
            <button
              type="submit"
              className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-xs h-[32px]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>ลงทะเบียน</span>
            </button>
          </div>
        </div>

        {/* Optional Base64 Image Preview / Selector inside Form */}
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
          <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors">
            <Camera className="h-3.5 w-3.5 text-slate-400" />
            <span>{newImgUrl ? 'เปลี่ยนรูปแนบโมดูล' : 'แนบรูปภาพโมดูล'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  setNewImgUrl(reader.result as string);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>

          {newImgUrl && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              <img src={newImgUrl} alt="Preview" className="h-5 w-5 rounded object-cover" />
              <button
                type="button"
                onClick={() => setNewImgUrl('')}
                className="text-[9px] text-rose-500 hover:text-rose-600 cursor-pointer font-bold"
              >
                ลบรูป
              </button>
            </div>
          )}

          {/* Prompt Unsplash presets */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] text-slate-400 font-sans">รูปตัวอย่าง:</span>
            <button
              type="button"
              onClick={() => setNewImgUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80')}
              className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
            >
              +ตู้ไฟ
            </button>
            <button
              type="button"
              onClick={() => setNewImgUrl('https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&w=600&q=80')}
              className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
            >
              +แผงวงจร
            </button>
          </div>
        </div>
      </form>

      {/* Modules List/Grid sorted by module code */}
      {sortedModules.length === 0 ? (
        <span className="text-[11px] text-slate-400 italic font-sans font-normal block pl-1">
          ยังไม่มีการลงทะเบียนโมดูลในระบบ คุณสามารถเพิ่มโมดูลเพื่อใช้อ้างอิงมอบหมายงานได้
        </span>
      ) : (
        <div className="flex flex-col gap-1">
          {sortedModules.map((m, idx) => (
            <div 
              key={m.code}
              className="flex items-center justify-between p-1 py-1 px-1.5 hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors group/mod relative"
            >
              <div className="flex items-center gap-3 w-full">
                {/* Module Image section */}
                <div className="relative shrink-0 group/img">
                  {m.imageUrl ? (
                    <div className="relative h-12 w-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs">
                      <img 
                        src={m.imageUrl} 
                        alt={m.name} 
                        className="h-full w-full object-cover"
                      />
                      {/* Remove Image overlay */}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(m.code)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-white cursor-pointer"
                        title="ลบรูปภาพโมดูล"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-200 hover:text-rose-400 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-12 w-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer relative">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-[8px] text-slate-400 font-bold mt-0.5">เพิ่มรูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleUploadImage(m.code, reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Text details */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-[10px] font-black text-indigo-700 font-mono rounded">
                      {m.code}
                    </span>
                    <h5 className="text-xs font-black text-slate-800 truncate">
                      {m.name}
                    </h5>
                  </div>
                </div>

                {/* Actions column */}
                <div className="flex items-center gap-1">
                  {/* Add/Replace Image via Preset (if no image) */}
                  {!m.imageUrl && (
                    <div className="hidden sm:flex items-center gap-1 mr-1">
                      <button
                        type="button"
                        onClick={() => handleUploadImage(m.code, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80')}
                        className="text-[8px] bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-1 py-0.5 rounded cursor-pointer"
                        title="จำลองรูปภาพตู้ไฟ"
                      >
                        +ตู้ไฟ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUploadImage(m.code, 'https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&w=600&q=80')}
                        className="text-[8px] bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-1 py-0.5 rounded cursor-pointer"
                        title="จำลองรูปภาพแผงวงจร"
                      >
                        +บอร์ด
                      </button>
                    </div>
                  )}

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIndex(idx);
                      setEditingCode(m.code);
                      setEditingName(m.name);
                    }}
                    className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer"
                    title="แก้ไขข้อมูลโมดูล"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(m.code, m.name)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                    title="ลบโมดูล"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Module Popup Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div>
              <h4 className="text-sm font-black text-slate-800">แก้ไขข้อมูลโมดูล</h4>
              <p className="text-[10px] text-slate-400">โมดูลลำดับที่ {editingIndex + 1}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500">รหัสโมดูล <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={editingCode}
                onChange={(e) => setEditingCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                placeholder="ระบุรหัสโมดูล"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500">ชื่อโมดูล <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                placeholder="ระบุชื่อโมดูล"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200/80 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(editingIndex)}
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// MAIN EXPORT COMPONENT: SettingsView
// =========================================================================
interface SettingsViewProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => Promise<void>;
  onEditEmployee: (id: string, updatedFields: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;

  jobProjects: JobProject[];
  onAddJobProject: (proj: Omit<JobProject, 'id' | 'createdAt'>) => Promise<void>;
  onEditJobProject: (id: string, updatedFields: Partial<JobProject>) => Promise<void>;
  onDeleteJobProject: (id: string) => Promise<void>;

  jobs: Job[];
  onEditJob: (id: string, updatedFields: Partial<Job>) => Promise<void>;

  brands?: Brand[];
  onAddBrand?: (brand: Omit<Brand, 'id' | 'createdAt'>) => Promise<void>;
  onEditBrand?: (id: string, updatedFields: Partial<Brand>) => Promise<void>;
  onDeleteBrand?: (id: string) => Promise<void>;
}

type SubTab = 'projects' | 'employees' | 'brands';

export default function SettingsView({
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  jobProjects,
  onAddJobProject,
  onEditJobProject,
  onDeleteJobProject,
  jobs,
  onEditJob,
  brands = [],
  onAddBrand,
  onEditBrand,
  onDeleteBrand
}: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('projects');

  // Search States
  const [projSearch, setProjSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  // Modals visibility
  const [isProjAddModalOpen, setIsProjAddModalOpen] = useState(false);
  const [isProjEditModalOpen, setIsProjEditModalOpen] = useState(false);
  const [selectedProj, setSelectedProj] = useState<JobProject | null>(null);

  const [isEmpAddModalOpen, setIsEmpAddModalOpen] = useState(false);
  const [isEmpEditModalOpen, setIsEmpEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Form Fields - Projects
  const [projJobNo, setProjJobNo] = useState('');
  const [projYear, setProjYear] = useState('');
  const [projCustomer, setProjCustomer] = useState('');
  const [projName, setProjName] = useState('');
  const [projImageUrl, setProjImageUrl] = useState('');

  // Form Fields - Employees
  const [empName, setEmpName] = useState('');
  const [empNickname, setEmpNickname] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empImageUrl, setEmpImageUrl] = useState('');
  const [empDepartment, setEmpDepartment] = useState<string>('Electrical');
  const [empOrgLevel, setEmpOrgLevel] = useState<string>('team');
  const [empRole, setEmpRole] = useState('');
  const [empCardColor, setEmpCardColor] = useState('border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100');

  // Form Fields & States - Brands
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [isBrandAddModalOpen, setIsBrandAddModalOpen] = useState(false);
  const [isBrandEditModalOpen, setIsBrandEditModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [employeeSubTab, setEmployeeSubTab] = useState<'chart' | 'list'>('chart');

  // Year and Job No filters for Job Directory
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedJobNo, setSelectedJobNo] = useState<string | null>(null);

  const didInitYear = React.useRef(false);

  // Extract unique years from jobProjects
  const uniqueYears = useMemo(() => {
    const years = jobProjects.map(p => p.year).filter(Boolean);
    return Array.from(new Set(years)).sort().reverse();
  }, [jobProjects]);

  // Set selectedYear to the latest year by default when entering/mounting
  useEffect(() => {
    if (uniqueYears.length > 0 && !didInitYear.current) {
      setSelectedYear(uniqueYears[0]);
      didInitYear.current = true;
    }
  }, [uniqueYears]);

  // Sort and filter projects specifically for the selected year
  const sortedProjectsForSelectedYear = useMemo(() => {
    const filtered = jobProjects.filter(p => {
      if (selectedYear !== 'all' && p.year !== selectedYear) return false;
      if (projSearch) {
        const search = projSearch.toLowerCase();
        return (
          p.jobNo.toLowerCase().includes(search) ||
          p.customer.toLowerCase().includes(search) ||
          p.projectName.toLowerCase().includes(search)
        );
      }
      return true;
    });

    // Sort by the first 5 digits of jobNo (ascending - smaller first)
    return [...filtered].sort((a, b) => {
      const aPrefix = a.jobNo.slice(0, 5).replace(/\D/g, '');
      const bPrefix = b.jobNo.slice(0, 5).replace(/\D/g, '');
      const aNum = parseInt(aPrefix, 10);
      const bNum = parseInt(bPrefix, 10);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
         return aNum - bNum;
      }
      return a.jobNo.localeCompare(b.jobNo, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [jobProjects, selectedYear, projSearch]);

  // Automatically select the first Job No when the selected year changes
  useEffect(() => {
    if (selectedYear !== 'all' && sortedProjectsForSelectedYear.length > 0) {
      if (!sortedProjectsForSelectedYear.some(p => p.jobNo === selectedJobNo)) {
        setSelectedJobNo(sortedProjectsForSelectedYear[0].jobNo);
      }
    } else if (selectedYear === 'all') {
      setSelectedJobNo(null);
    }
  }, [selectedYear, sortedProjectsForSelectedYear]);

  // Filter project names & search (original list)
  const filteredProjects = useMemo(() => {
    return jobProjects.filter(p => {
      if (selectedYear !== 'all' && p.year !== selectedYear) return false;
      const search = projSearch.toLowerCase();
      return (
        p.jobNo.toLowerCase().includes(search) ||
        p.customer.toLowerCase().includes(search) ||
        p.projectName.toLowerCase().includes(search) ||
        (p.year || '').includes(search)
      );
    });
  }, [jobProjects, projSearch, selectedYear]);

  // Filter employees & search
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const search = empSearch.toLowerCase().trim();
      return (
        e.name.toLowerCase().includes(search) ||
        (e.nickname || '').toLowerCase().includes(search) ||
        (e.email || '').toLowerCase().includes(search) ||
        (e.role || '').toLowerCase().includes(search) ||
        (e.department || '').toLowerCase().includes(search) ||
        (e.phone || '').toLowerCase().includes(search)
      );
    });
  }, [employees, empSearch]);

  // Filter brands & search
  const filteredBrands = useMemo(() => {
    return brands.filter(b => {
      const search = brandSearch.toLowerCase().trim();
      return b.name.toLowerCase().includes(search);
    });
  }, [brands, brandSearch]);

  // Auto generator for Job No.
  const autoGenerateNewProjJobNo = () => {
    const currentYearShort = new Date().getFullYear().toString().slice(2);
    const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Calculate maximum index from existing projects
    let maxIdx = 0;
    jobProjects.forEach((p) => {
      const parts = p.jobNo.split('-');
      if (parts.length === 3 && parts[0] === 'JOB') {
        const idxVal = parseInt(parts[2], 10);
        if (!isNaN(idxVal) && idxVal > maxIdx) {
          maxIdx = idxVal;
        }
      }
    });
    
    const nextIdx = String(maxIdx + 1).padStart(3, '0');
    setProjJobNo(`JOB-${currentYearShort}${currentMonthNum}-${nextIdx}`);
  };

  // Handle Project Add
  const handleProjAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const jobNoUpper = projJobNo.trim().toUpperCase();
    if (!jobNoUpper || !projCustomer.trim() || !projName.trim()) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (jobProjects.some(p => p.jobNo === jobNoUpper)) {
      alert(`มีรหัส Job No. "${jobNoUpper}" ลงทะเบียนไว้แล้วในฐานข้อมูล`);
      return;
    }

    await onAddJobProject({
      jobNo: jobNoUpper,
      year: projYear.trim() || new Date().getFullYear().toString(),
      customer: projCustomer.trim(),
      projectName: projName.trim(),
      projectImageUrl: projImageUrl || '',
      modules: []
    });

    setIsProjAddModalOpen(false);
    setProjJobNo('');
    setProjCustomer('');
    setProjName('');
    setProjImageUrl('');
  };

  // Handle Project Edit opens
  const openProjEdit = (proj: JobProject) => {
    setSelectedProj(proj);
    setProjJobNo(proj.jobNo);
    setProjYear(proj.year);
    setProjCustomer(proj.customer);
    setProjName(proj.projectName);
    setProjImageUrl(proj.projectImageUrl || '');
    setIsProjEditModalOpen(true);
  };

  const handleProjEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj) return;

    await onEditJobProject(selectedProj.id, {
      jobNo: projJobNo.trim().toUpperCase(),
      year: projYear.trim(),
      customer: projCustomer.trim(),
      projectName: projName.trim(),
      projectImageUrl: projImageUrl
    });

    setIsProjEditModalOpen(false);
    setSelectedProj(null);
  };

  // Handle Employee Add
  const handleEmpAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      alert('กรุณากรอกชื่อพนักงาน');
      return;
    }

    await onAddEmployee({
      name: empName.trim(),
      nickname: empNickname.trim(),
      email: empEmail.trim(),
      phone: empPhone.trim(),
      imageUrl: empImageUrl || '',
      department: empDepartment,
      orgLevel: empOrgLevel,
      role: empRole.trim(),
      cardColor: empCardColor
    });

    setIsEmpAddModalOpen(false);
    setEmpName('');
    setEmpNickname('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpImageUrl('');
    setEmpDepartment('Electrical');
    setEmpOrgLevel('team');
    setEmpRole('');
    setEmpCardColor('border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100');
  };

  // Handle Employee Edit opens
  const openEmpEdit = (emp: Employee) => {
    setSelectedEmp(emp);
    setEmpName(emp.name);
    setEmpNickname(emp.nickname || '');
    setEmpEmail(emp.email || '');
    setEmpPhone(emp.phone || '');
    setEmpImageUrl(emp.imageUrl || '');
    setEmpDepartment(emp.department || 'Electrical');
    setEmpOrgLevel(emp.orgLevel || 'team');
    setEmpRole(emp.role || '');
    setEmpCardColor(emp.cardColor || 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100');
    setIsEmpEditModalOpen(true);
  };

  const handleEmpEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    await onEditEmployee(selectedEmp.id, {
      name: empName.trim(),
      nickname: empNickname.trim(),
      email: empEmail.trim(),
      phone: empPhone.trim(),
      imageUrl: empImageUrl,
      department: empDepartment,
      orgLevel: empOrgLevel,
      role: empRole.trim(),
      cardColor: empCardColor
    });

    setIsEmpEditModalOpen(false);
    setSelectedEmp(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Selector card */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-lg relative overflow-hidden">
        
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest font-mono">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span>Unified Settings & Directory</span>
          </div>
          <h2 className="text-xl font-black text-white font-sans flex items-center gap-2 mt-1.5">
            <FolderGit2 className="h-6 w-6 text-indigo-400" />
            ตั้งค่าโปรเจ็ค พนักงาน
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-xl">
            บริหารจัดการฐานข้อมูลพนักงาน ช่างประกอบโครงการ ตลอดจนลงทะเบียนเลขโครงการ Job No. เพื่อความสม่ำเสมอของชุดข้อมูลเดียวกัน
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shrink-0 self-start xl:self-center z-10">
          <button
            onClick={() => setActiveSubTab('projects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'projects' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            id="settings-tab-projects"
          >
            <FolderGit2 className="h-4 w-4" />
            <span>ตั้งค่า โปรเจ็ค ({jobProjects.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'employees' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            id="settings-tab-employees"
          >
            <Users className="h-4 w-4" />
            <span>จัดการรายชื่อพนักงาน ({employees.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('brands')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'brands' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            id="settings-tab-brands"
          >
            <Tag className="h-4 w-4" />
            <span>จัดการแบรนด์สินค้า ({brands.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ======================= TAB 1: MASTER PROJECTS ======================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'projects' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                <FolderGit2 className="h-4 w-4 text-indigo-500" />
                ตั้งค่า รหัสโปรเจ็ค (Job Directory)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                กำหนดรหัส Job No., ลูกค้า, และชื่อโครงการย่อยเพื่อใช้อ้างอิงทั้งระบบ
              </p>
            </div>

            <button
              onClick={() => {
                setProjJobNo('');
                setProjYear(new Date().getFullYear().toString());
                setProjCustomer('');
                setProjName('');
                setProjImageUrl('');
                setIsProjAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
              id="btn-add-project-settings"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างรหัสโครงการใหม่</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-xs">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาตาม Job No., ชื่อโครงการ, หรือข้อมูลลูกค้า..."
              value={projSearch}
              onChange={(e) => setProjSearch(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-transparent focus:outline-hidden"
            />
            {projSearch && (
              <button
                onClick={() => setProjSearch('')}
                className="text-[10px] text-rose-500 font-bold hover:underline"
              >
                ล้างคำค้น
              </button>
            )}
          </div>

          {/* Year Filter Buttons / ซ่อน แสดง ตามปี */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-black text-slate-500 font-sans uppercase tracking-wider">แสดงตามปีโครงการ:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all border cursor-pointer ${
                  selectedYear === 'all'
                    ? 'bg-white text-black border-2 border-slate-400 shadow-sm'
                    : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
                }`}
              >
                ทั้งหมด (Show All)
              </button>
              {uniqueYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all border cursor-pointer ${
                    selectedYear === year
                      ? 'bg-white text-black border-2 border-slate-400 shadow-sm'
                      : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
                  }`}
                >
                  ปี {year}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Table & List */}
          {selectedYear !== 'all' ? (
            <div className="space-y-4">
              {/* Horizontal Job selection list (No horizontal scrollbar!) */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-3xs">
                <div className="text-[10px] font-black text-slate-400 font-sans uppercase tracking-wider">
                  เลือก Job No.
                </div>
                {sortedProjectsForSelectedYear.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">ไม่พบรหัสโครงการที่ตรงตามตัวเลือก</p>
                ) : (
                  <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2.5 space-y-2">
                    {sortedProjectsForSelectedYear.map((proj) => {
                      const isActive = selectedJobNo === proj.jobNo;
                      return (
                        <div key={proj.id} className="break-inside-avoid">
                          <button
                            onClick={() => setSelectedJobNo(proj.jobNo)}
                            className={`w-full px-2.5 py-1.5 text-[11px] font-mono font-black rounded-lg transition-all border cursor-pointer flex items-center justify-between gap-1.5 ${
                              isActive
                                ? 'bg-white text-black border-2 border-slate-400 shadow-md scale-102'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                            }`}
                          >
                            <span className="truncate">{proj.jobNo}</span>
                            {proj.projectImageUrl ? (
                              <img 
                                src={proj.projectImageUrl} 
                                alt={proj.jobNo} 
                                className="w-5 h-5 object-cover rounded border border-slate-250/50 shrink-0 bg-white" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded border border-dashed border-slate-300 shrink-0 flex items-center justify-center bg-slate-50">
                                <FolderGit2 className="h-2.5 w-2.5 text-slate-400" />
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Display selected project card & its modules below */}
              {(() => {
                const activeProjObj = sortedProjectsForSelectedYear.find(p => p.jobNo === selectedJobNo) || sortedProjectsForSelectedYear[0];
                if (!activeProjObj) return null;

                const associatedTasks = jobs.filter(j => j.jobNo === activeProjObj.jobNo);
                const completedTasks = associatedTasks.filter(j => j.status === 'completed').length;

                return (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3.5 border-b border-slate-100">
                      
                      {/* Left: Image & Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative group/proj rounded-lg overflow-hidden border border-slate-200 w-12 h-12 bg-slate-50 flex items-center justify-center shrink-0">
                          {activeProjObj.projectImageUrl ? (
                            <>
                              <img src={activeProjObj.projectImageUrl} alt={activeProjObj.projectName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/proj:opacity-100 flex items-center justify-center transition-all">
                                <Camera className="h-4 w-4 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-[8px] text-slate-400 font-bold flex flex-col items-center">
                              <Camera className="h-4 w-4 text-slate-300" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                onEditJobProject(activeProjObj.id, { projectImageUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const sibling = e.currentTarget.previousSibling as HTMLInputElement;
                              sibling?.click();
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>

                        <div className="min-w-0 flex-1 leading-normal">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-[11px] font-mono font-black text-indigo-700 rounded">
                              {activeProjObj.jobNo}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              ปี {activeProjObj.year}
                            </span>
                          </div>
                          
                          <h4 className="text-[11.5px] font-black text-slate-800 font-sans mt-0.5 truncate leading-tight">
                            ลูกค้า: <span className="text-slate-500">{activeProjObj.customer}</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 font-sans truncate leading-tight mt-0.2">
                            โครงการ: <span className="font-bold text-slate-600">{activeProjObj.projectName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Micro stats & controls */}
                      <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <span className="text-[8px] text-slate-400 font-black uppercase font-sans">ความคืบหน้า</span>
                          <p className="text-[10px] font-black text-slate-700 font-mono">
                            {associatedTasks.length > 0 ? (
                              <span>สำเร็จ {completedTasks}/{associatedTasks.length} ({Math.round((completedTasks/associatedTasks.length)*100)}%)</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic text-[9px]">ไม่มีงานมอบหมาย</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openProjEdit(activeProjObj)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
                            title="แก้ไขข้อมูลรหัสโปรเจกต์"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (associatedTasks.length > 0) {
                                alert(`ไม่สามารถลบรหัสงาน ${activeProjObj.jobNo} ได้ เนื่องจากยังมีโมดูลย่อยและใบสั่งงานในระบบอ้างอิงอยู่จำนวน ${associatedTasks.length} รายการ`);
                                return;
                              }
                              if (confirm(`ยืนยันการลบโครงการ ${activeProjObj.jobNo} หรือไม่?`)) {
                                onDeleteJobProject(activeProjObj.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-md cursor-pointer"
                            title="ลบโครงการ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Modules list section */}
                    <div className="space-y-2">
                      <div className="text-[11.5px] font-black text-slate-600 dark:text-slate-400 font-sans flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-500" />
                        <span>จัดการโมดูล (Modules Manager) ของ {activeProjObj.jobNo}:</span>
                      </div>
                      <ProjectModulesManager 
                        proj={activeProjObj}
                        onEditJobProject={onEditJobProject}
                        jobs={jobs}
                        onEditJob={onEditJob}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Show original grid list when 'all' is selected */
            filteredProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-10 text-center">
                <FolderGit2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">ไม่พบคลังข้อมูลโปรเจกต์</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  ยังไม่มีการบันทึกโปรเจกต์ที่ตรงกับการค้นหาของคุณ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredProjects.map(proj => {
                  const associatedTasks = jobs.filter(j => j.jobNo === proj.jobNo);
                  const completedTasks = associatedTasks.filter(j => j.status === 'completed').length;

                  return (
                    <div key={proj.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-3xs hover:border-slate-300 transition-all">
                      <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                        
                        {/* Left Block: Image & Basic Info */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Project main picture with upload option */}
                          <div className="relative group/proj rounded-lg overflow-hidden border border-slate-200 w-10 h-10 bg-slate-50 flex items-center justify-center shrink-0">
                            {proj.projectImageUrl ? (
                              <>
                                <img src={proj.projectImageUrl} alt={proj.projectName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/proj:opacity-100 flex items-center justify-center transition-all">
                                  <Camera className="h-3.5 w-3.5 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="text-center text-[8px] text-slate-400 font-bold flex flex-col items-center">
                                <Camera className="h-3.5 w-3.5 text-slate-300" />
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  onEditJobProject(proj.id, { projectImageUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                const sibling = e.currentTarget.previousSibling as HTMLInputElement;
                                sibling?.click();
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </div>

                          {/* Title details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-indigo-50 border border-indigo-150 text-[9.5px] font-mono font-black text-indigo-700 rounded">
                                {proj.jobNo}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400 font-bold">
                                ปี {proj.year}
                              </span>
                            </div>
                            
                            <h4 className="text-[10.5px] font-black text-slate-800 font-sans mt-0.5 truncate leading-tight">
                              ลูกค้า: <span className="text-slate-500">{proj.customer}</span>
                            </h4>
                            <p className="text-[9.5px] text-slate-400 font-sans truncate leading-tight mt-0.2">
                              โครงการ: <span className="font-bold text-slate-600">{proj.projectName}</span>
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Micro stats and controls */}
                      <div className="flex items-center justify-between gap-2.5 pt-2 border-slate-100">
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 font-black uppercase font-sans">ความคืบหน้า</span>
                          <p className="text-[10px] font-black text-slate-700 font-mono">
                            {associatedTasks.length > 0 ? (
                              <span>สำเร็จ {completedTasks}/{associatedTasks.length} ({Math.round((completedTasks/associatedTasks.length)*100)}%)</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic text-[9px]">ไม่มีงานมอบหมาย</span>
                            )}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openProjEdit(proj)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
                            title="แก้ไขข้อมูลรหัสโปรเจกต์"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (associatedTasks.length > 0) {
                                alert(`ไม่สามารถลบรหัสงาน ${proj.jobNo} ได้ เนื่องจากยังมีโมดูลย่อยและใบสั่งงานในระบบอ้างอิงอยู่จำนวน ${associatedTasks.length} รายการ`);
                                return;
                              }
                              if (confirm(`ยืนยันการลบโครงการ ${proj.jobNo} หรือไม่?`)) {
                                onDeleteJobProject(proj.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-md cursor-pointer"
                            title="ลบโครงการ"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Module Manager Inside Each Project Card */}
                      <div className="border-t border-slate-100 mt-2 pt-2">
                        <ProjectModulesManager 
                          proj={proj}
                          onEditJobProject={onEditJobProject}
                          jobs={jobs}
                          onEditJob={onEditJob}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= TAB 2: EMPLOYEE DIRECTORY ===================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'employees' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 shadow-3xs">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                โครงสร้างทีมและสารบบพนักงาน (Employee Registry & Organization Chart)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดการแผนผังองค์กรตามแผนกต่างๆ กำหนดตำแหน่งพนักงาน (เจ้าของบริษัท, หัวหน้าแผนก, ลูกทีม) และจัดรูปแบบสีสันได้อิสระ
              </p>
            </div>

            <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
              {/* Sub-view switcher */}
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEmployeeSubTab('chart')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    employeeSubTab === 'chart'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  <span>แผนผังองค์กร</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeSubTab('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    employeeSubTab === 'list'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>รายชื่อทั้งหมด ({employees.length})</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setEmpName('');
                  setEmpNickname('');
                  setEmpEmail('');
                  setEmpPhone('');
                  setEmpImageUrl('');
                  setEmpDepartment('Electrical');
                  setEmpOrgLevel('team');
                  setEmpRole('');
                  setEmpCardColor('border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100');
                  setIsEmpAddModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition-all cursor-pointer shrink-0"
                id="btn-add-employee-settings"
              >
                <UserPlus className="h-4 w-4" />
                <span>เพิ่มรายชื่อพนักงาน</span>
              </button>
            </div>
          </div>

          {employeeSubTab === 'chart' ? (
            <div className="space-y-6">
              
              {/* 1. TOP EXECUTIVE SECTION (OWNER) */}
              <div className="flex flex-col items-center justify-center py-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1 bg-purple-100 rounded-lg text-purple-700">
                    <Crown className="h-4 w-4 animate-bounce" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 font-sans tracking-wide uppercase">
                    เจ้าของบริษัท / คณะผู้บริหาร (Owner & Executives)
                  </h4>
                </div>

                {employees.filter(e => e.orgLevel === 'owner' || e.department === 'Owner').length === 0 ? (
                  <button
                    onClick={() => {
                      setEmpName('');
                      setEmpNickname('');
                      setEmpEmail('');
                      setEmpPhone('');
                      setEmpImageUrl('');
                      setEmpRole('');
                      setEmpDepartment('Owner');
                      setEmpOrgLevel('owner');
                      setEmpCardColor('border-purple-200 bg-purple-50/10');
                      setIsEmpAddModalOpen(true);
                    }}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-400 bg-white dark:bg-slate-950 p-4 rounded-2xl flex flex-col items-center justify-center max-w-xs w-full text-center group cursor-pointer transition-all"
                  >
                    <Plus className="h-5 w-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                    <span className="text-[11px] font-black text-slate-500 group-hover:text-purple-600 mt-1">แต่งตั้งผู้บริหาร / เจ้าของร่วม</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">คลิกเพื่อเพิ่มประธานบริษัท</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap justify-center gap-4 w-full">
                    {employees.filter(e => e.orgLevel === 'owner' || e.department === 'Owner').map(emp => {
                      const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;
                      return (
                        <div
                          key={emp.id}
                          className={`w-full max-w-sm rounded-2xl border p-4 shadow-3xs flex flex-col gap-3 transition-all relative ${
                            emp.cardColor || 'border-purple-250 bg-purple-50/15'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative group/empimg h-12 w-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs">
                              {emp.imageUrl ? (
                                <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full bg-purple-50 flex items-center justify-center text-purple-700 text-xs font-black font-sans uppercase">
                                  {emp.name.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 font-sans truncate flex items-center gap-1">
                                  {emp.name}
                                  {emp.nickname && <span className="text-indigo-600 dark:text-indigo-400">({emp.nickname})</span>}
                                </h4>
                                <span className="px-1.5 py-0.2 bg-purple-100 text-[8px] font-black text-purple-700 border border-purple-200 rounded leading-none flex items-center gap-0.5">
                                  <Crown className="h-2 w-2" /> Owner
                                </span>
                              </div>
                              <p className="text-[10px] text-purple-700 font-extrabold mt-0.5">{emp.role || 'ประธานกรรมการบริหาร (Owner)'}</p>
                              
                              <div className="mt-2 space-y-1 text-[9.5px] text-slate-500 font-sans">
                                {emp.email && (
                                  <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                    <Mail className="h-2.5 w-2.5 text-slate-400" />
                                    <span className="truncate">{emp.email}</span>
                                  </p>
                                )}
                                {emp.phone && (
                                  <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                                    <a href={`tel:${emp.phone}`} className="hover:underline font-mono">{emp.phone}</a>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions panel */}
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button onClick={() => openEmpEdit(emp)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded border border-slate-150/60 cursor-pointer" title="แก้ไข">
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (assignedJobsCount > 0) {
                                    alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากมีงานที่มอบหมายค้างอยู่จำนวน ${assignedJobsCount} รายการ`);
                                    return;
                                  }
                                  if (confirm(`ต้องการลบผู้บริหาร "${emp.name}" หรือไม่?`)) {
                                    onDeleteEmployee(emp.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-150/60 cursor-pointer"
                                title="ลบ"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Quick formatting buttons */}
                          <div className="border-t border-slate-150/60 pt-2 flex items-center justify-between">
                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><Palette className="h-2.5 w-2.5" /> จัดรูปแบบการ์ด:</span>
                            <div className="flex items-center gap-1">
                              {[
                                { name: 'Slate', value: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100' },
                                { name: 'Indigo', value: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200' },
                                { name: 'Emerald', value: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200' },
                                { name: 'Amber', value: 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200' },
                                { name: 'Rose', value: 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200' },
                                { name: 'Sky', value: 'border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 text-sky-950 dark:text-sky-200' },
                                { name: 'Purple', value: 'border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200' }
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => onEditEmployee(emp.id, { cardColor: preset.value })}
                                  className={`h-3 w-3 rounded-full border border-slate-300 cursor-pointer transition-transform hover:scale-125 ${
                                    preset.value.split(' ')[2] === (emp.cardColor || '').split(' ')[2] ? 'ring-1 ring-offset-1 ring-indigo-500 scale-110' : ''
                                  }`}
                                  style={{ backgroundColor: preset.value.includes('indigo') ? '#6366f1' : preset.value.includes('emerald') ? '#10b981' : preset.value.includes('amber') ? '#f59e0b' : preset.value.includes('rose') ? '#f43f5e' : preset.value.includes('sky') ? '#0ea5e9' : preset.value.includes('purple') ? '#a855f7' : '#94a3b8' }}
                                  title={preset.name}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. DEPARTMENTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'Design', nameTh: 'แผนกออกแบบและเขียนแบบ', nameEn: 'Design', icon: Compass, color: 'violet', borderClass: 'border-t-4 border-violet-500' },
                  { id: 'Electrical', nameTh: 'แผนกไฟฟ้าและคอนโทรล', nameEn: 'Electrical', icon: Sparkles, color: 'indigo', borderClass: 'border-t-4 border-indigo-500' },
                  { id: 'Welding', nameTh: 'แผนกเชื่อมประกอบโครงงาน', nameEn: 'Welding', icon: Wrench, color: 'rose', borderClass: 'border-t-4 border-rose-500' },
                  { id: 'Machine Shop', nameTh: 'แผนกกลึงและแปรรูปเหล็ก', nameEn: 'Machine Shop', icon: Layers, color: 'blue', borderClass: 'border-t-4 border-blue-500' },
                  { id: 'Assembly', nameTh: 'แผนกประกอบเครื่องกล', nameEn: 'Assembly', icon: Users, color: 'amber', borderClass: 'border-t-4 border-amber-500' },
                  { id: 'Accounting', nameTh: 'แผนกบัญชีและการเงิน', nameEn: 'Accounting', icon: ClipboardList, color: 'emerald', borderClass: 'border-t-4 border-emerald-500' },
                ].map((dept) => {
                  const deptEmps = employees.filter(e => e.department === dept.id && e.orgLevel !== 'owner');
                  const heads = deptEmps.filter(e => e.orgLevel === 'head');
                  const teamMembers = deptEmps.filter(e => e.orgLevel === 'team' || !e.orgLevel);
                  
                  const DeptIcon = dept.icon;

                  return (
                    <div key={dept.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col h-full overflow-hidden ${dept.borderClass}`}>
                      {/* Department Header */}
                      <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}>
                            <DeptIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h5 className="text-[11.5px] font-black text-slate-800 dark:text-slate-100 font-sans leading-tight">{dept.nameTh}</h5>
                            <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider uppercase leading-none">{dept.nameEn}</span>
                          </div>
                        </div>

                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[9px] font-black text-slate-500">
                          {deptEmps.length} คน
                        </span>
                      </div>

                      {/* Department Body */}
                      <div className="p-3.5 flex-1 space-y-4">
                        
                        {/* A. DEPARTMENT HEAD SECTION */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                            <Award className="h-3 w-3 text-amber-500" /> หัวหน้าแผนก (Head of Dept)
                          </span>

                          {heads.length === 0 ? (
                            <button
                              onClick={() => {
                                setEmpName('');
                                setEmpNickname('');
                                setEmpEmail('');
                                setEmpPhone('');
                                setEmpImageUrl('');
                                setEmpRole('');
                                setEmpDepartment(dept.id);
                                setEmpOrgLevel('head');
                                setEmpCardColor('border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200');
                                setIsEmpAddModalOpen(true);
                              }}
                              className="border border-dashed border-slate-250 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/20 w-full p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer text-[10.5px] font-bold"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>ตั้งหัวหน้าแผนก</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {heads.map(emp => {
                                const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;
                                return (
                                  <div
                                    key={emp.id}
                                    className={`rounded-xl border p-3 shadow-3xs flex flex-col gap-2 transition-all relative ${
                                      emp.cardColor || 'border-indigo-150 bg-indigo-50/10'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="relative group/empimg h-10 w-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-3xs">
                                        {emp.imageUrl ? (
                                          <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="h-full w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black font-sans uppercase flex items-center justify-center">
                                            {emp.name.slice(0, 2)}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <h6 className="text-[11px] font-black text-slate-800 dark:text-slate-100 font-sans truncate flex items-center gap-1">
                                          {emp.name}
                                          {emp.nickname && <span className="text-indigo-600 dark:text-indigo-400">({emp.nickname})</span>}
                                        </h6>
                                        <p className="text-[9.5px] font-extrabold text-slate-500 leading-tight">{emp.role || 'หัวหน้าช่างประจำแผนก'}</p>
                                        
                                        <div className="mt-1.5 space-y-0.5 text-[9px] text-slate-400 font-sans">
                                          {emp.email && (
                                            <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 truncate">
                                              <Mail className="h-2.5 w-2.5 text-slate-400" />
                                              <span>{emp.email}</span>
                                            </p>
                                          )}
                                          {emp.phone && (
                                            <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                              <Phone className="h-2.5 w-2.5 text-slate-400" />
                                              <a href={`tel:${emp.phone}`} className="hover:underline font-mono">{emp.phone}</a>
                                            </p>
                                          )}
                                          <p className="font-extrabold text-indigo-600 bg-indigo-50/40 border border-indigo-100/50 px-1 py-0.2 rounded w-fit text-[8.5px] mt-1 inline-block">
                                            งานมอบหมาย: {assignedJobsCount} งาน
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex flex-col gap-1 shrink-0">
                                        <button onClick={() => openEmpEdit(emp)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded border border-slate-150/60 cursor-pointer" title="แก้ไข">
                                          <Edit3 className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (assignedJobsCount > 0) {
                                              alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากมีงานที่มอบหมายค้างอยู่จำนวน ${assignedJobsCount} รายการ`);
                                              return;
                                            }
                                            if (confirm(`ต้องการลบรายชื่อ "${emp.name}" ออกจากแผนก?`)) {
                                              onDeleteEmployee(emp.id);
                                            }
                                          }}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-150/60 cursor-pointer"
                                          title="ลบ"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Color formatting line */}
                                    <div className="border-t border-slate-150/50 pt-1.5 flex items-center justify-between">
                                      <span className="text-[8px] text-slate-400 font-bold flex items-center gap-1"><Palette className="h-2 w-2" /> รูปแบบสี:</span>
                                      <div className="flex items-center gap-0.5">
                                        {[
                                          { name: 'Slate', value: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100' },
                                          { name: 'Indigo', value: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200' },
                                          { name: 'Emerald', value: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200' },
                                          { name: 'Amber', value: 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200' },
                                          { name: 'Rose', value: 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200' },
                                          { name: 'Sky', value: 'border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 text-sky-950 dark:text-sky-200' },
                                          { name: 'Purple', value: 'border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200' }
                                        ].map((preset) => (
                                          <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => onEditEmployee(emp.id, { cardColor: preset.value })}
                                            className={`h-2.5 w-2.5 rounded-full border border-slate-300 cursor-pointer transition-transform hover:scale-125 ${
                                              preset.value.split(' ')[2] === (emp.cardColor || '').split(' ')[2] ? 'ring-1 ring-offset-1 ring-indigo-500 scale-110' : ''
                                            }`}
                                            style={{ backgroundColor: preset.value.includes('indigo') ? '#6366f1' : preset.value.includes('emerald') ? '#10b981' : preset.value.includes('amber') ? '#f59e0b' : preset.value.includes('rose') ? '#f43f5e' : preset.value.includes('sky') ? '#0ea5e9' : preset.value.includes('purple') ? '#a855f7' : '#94a3b8' }}
                                            title={preset.name}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* B. TEAM MEMBERS SECTION */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-400" /> ลูกทีม / ช่างปฏิบัติงาน (Team Members)
                          </span>

                          {teamMembers.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic py-2 pl-1 bg-slate-50/50 dark:bg-slate-950/10 rounded-lg">ยังไม่มีข้อมูลช่างสังกัดแผนกนี้</p>
                          ) : (
                            <div className="space-y-2">
                              {teamMembers.map(emp => {
                                const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;
                                return (
                                  <div
                                    key={emp.id}
                                    className={`rounded-xl border p-2.5 shadow-3xs flex flex-col gap-1.5 transition-all relative ${
                                      emp.cardColor || 'border-slate-200 bg-white dark:bg-slate-900 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="relative group/empimg h-8 w-8 rounded border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-3xs">
                                        {emp.imageUrl ? (
                                          <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="h-full w-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black font-sans uppercase flex items-center justify-center">
                                            {emp.name.slice(0, 2)}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <h6 className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-100 font-sans truncate">
                                          {emp.name}
                                          {emp.nickname && <span className="text-slate-500 dark:text-slate-400 font-bold ml-1">({emp.nickname})</span>}
                                        </h6>
                                        <p className="text-[8.5px] font-bold text-slate-500 leading-none">{emp.role || 'ช่างประจำแผนก'}</p>
                                        
                                        <div className="mt-1 space-y-0.5 text-[8px] text-slate-400 font-mono">
                                          {emp.email && <p className="truncate flex items-center gap-0.5"><Mail className="h-2 w-2" />{emp.email}</p>}
                                          {emp.phone && <p className="flex items-center gap-0.5"><Phone className="h-2 w-2" />{emp.phone}</p>}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => openEmpEdit(emp)} className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded" title="แก้ไข">
                                          <Edit3 className="h-2.5 w-2.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (assignedJobsCount > 0) {
                                              alert(`ไม่สามารถลบพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานค้าง ${assignedJobsCount} งาน`);
                                              return;
                                            }
                                            if (confirm(`ต้องการลบรายชื่อ "${emp.name}" หรือไม่?`)) {
                                              onDeleteEmployee(emp.id);
                                            }
                                          }}
                                          className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                          title="ลบ"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Color formatting line */}
                                    <div className="border-t border-slate-150/40 pt-1 flex items-center justify-between">
                                      <span className="text-[7.5px] text-slate-400 font-bold flex items-center gap-0.5"><Palette className="h-2 w-2" /> สีการ์ด:</span>
                                      <div className="flex items-center gap-0.5">
                                        {[
                                          { name: 'Slate', value: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100' },
                                          { name: 'Indigo', value: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200' },
                                          { name: 'Emerald', value: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200' },
                                          { name: 'Amber', value: 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200' },
                                          { name: 'Rose', value: 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200' },
                                          { name: 'Sky', value: 'border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 text-sky-950 dark:text-sky-200' },
                                          { name: 'Purple', value: 'border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200' }
                                        ].map((preset) => (
                                          <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => onEditEmployee(emp.id, { cardColor: preset.value })}
                                            className={`h-2 w-2 rounded-full border border-slate-300 cursor-pointer transition-transform hover:scale-125 ${
                                              preset.value.split(' ')[2] === (emp.cardColor || '').split(' ')[2] ? 'ring-1 ring-offset-1 ring-indigo-500 scale-110' : ''
                                            }`}
                                            style={{ backgroundColor: preset.value.includes('indigo') ? '#6366f1' : preset.value.includes('emerald') ? '#10b981' : preset.value.includes('amber') ? '#f59e0b' : preset.value.includes('rose') ? '#f43f5e' : preset.value.includes('sky') ? '#0ea5e9' : preset.value.includes('purple') ? '#a855f7' : '#94a3b8' }}
                                            title={preset.name}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Add button footer */}
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex gap-2">
                        <button
                          onClick={() => {
                            setEmpName('');
                            setEmpNickname('');
                            setEmpEmail('');
                            setEmpPhone('');
                            setEmpImageUrl('');
                            setEmpRole('');
                            setEmpDepartment(dept.id);
                            setEmpOrgLevel('team');
                            setEmpCardColor('border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100');
                            setIsEmpAddModalOpen(true);
                          }}
                          className="flex-1 py-1 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-250 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9.5px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>เพิ่มลูกทีมแผนกนี้</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            
            // LIST VIEW (EMPLOYEE DIRECTORY SEARCH)
            <div className="space-y-4">
              
              {/* Search bar */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="ค้นหาพนักงานด้วย ชื่อ-นามสกุล, ชื่อเล่น, แผนก, ตําแหน่งงาน หรือเบอร์โทรศัพท์..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent focus:outline-hidden"
                />
                {empSearch && (
                  <button
                    onClick={() => setEmpSearch('')}
                    className="text-[10px] text-rose-500 font-bold hover:underline"
                  >
                    ล้างคำค้น
                  </button>
                )}
              </div>

              {/* Employees List */}
              {filteredEmployees.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-150 p-10 text-center">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">ไม่พบคลังรายชื่อพนักงาน</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    ยังไม่มีข้อมูลรายชื่อในระบบที่ตรงกับการค้นหา
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEmployees.map(emp => {
                    const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;

                    return (
                      <div
                        key={emp.id}
                        className={`rounded-2xl border p-4 shadow-3xs flex flex-col gap-3 hover:border-slate-400 dark:hover:border-slate-700 transition-all ${
                          emp.cardColor || 'border-slate-200 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Employee Profile Image */}
                          <div className="relative group/empimg h-12 w-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs">
                            {emp.imageUrl ? (
                              <>
                                <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/empimg:opacity-100 flex items-center justify-center transition-opacity">
                                  <Camera className="h-3.5 w-3.5 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="h-full w-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-700 text-xs font-black font-sans uppercase">
                                {emp.name.slice(0, 2)}
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  onEditEmployee(emp.id, { imageUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                const sibling = e.currentTarget.previousSibling as HTMLInputElement;
                                sibling?.click();
                              }}
                              className="absolute inset-0 cursor-pointer opacity-0 w-full h-full"
                            />
                          </div>

                          {/* Employee Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 font-sans truncate">
                                {emp.name}
                                {emp.nickname && <span className="text-indigo-600 dark:text-indigo-400 font-black ml-1">({emp.nickname})</span>}
                              </h4>
                              
                              {/* Department Badge */}
                              {emp.department && (
                                <span className={`px-1.5 py-0.2 text-[8.5px] font-extrabold border rounded leading-none ${getDeptBadgeStyle(emp.department)}`}>
                                  {emp.department === 'Owner' ? 'Owner / Executive' : 
                                   emp.department === 'Accounting' ? 'บัญชี (Accounting)' :
                                   emp.department === 'Electrical' ? 'ไฟฟ้า (Electrical)' :
                                   emp.department === 'Assembly' ? 'ประกอบ (Assembly)' :
                                   emp.department === 'Machine Shop' ? 'กลึง (Machine Shop)' :
                                   emp.department === 'Design' ? 'เขียนแบบ (Design)' :
                                   emp.department === 'Welding' ? 'เชื่อมเหล็ก (Welding)' : emp.department}
                                </span>
                              )}

                              {/* Level Badge */}
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-[8.5px] font-bold text-emerald-700 border border-emerald-150 rounded leading-none">
                                {emp.orgLevel === 'owner' ? 'เจ้าของบริษัท' : 
                                 emp.orgLevel === 'head' ? 'หัวหน้าแผนก' : 'ลูกทีม'}
                              </span>
                            </div>

                            {/* Role Name */}
                            <p className="text-[10px] text-slate-500 font-bold mt-1">ตำแหน่งจริง: {emp.role || 'ช่างประจำแผนก'}</p>

                            {/* Contact & Jobs Info */}
                            <div className="mt-2 space-y-1 text-[10px] text-slate-500 font-sans">
                              {emp.email && (
                                <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{emp.email}</span>
                                </p>
                              )}
                              {emp.phone ? (
                                <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                  <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                  <a href={`tel:${emp.phone}`} className="hover:underline font-mono">{emp.phone}</a>
                                </p>
                              ) : (
                                <p className="italic text-slate-400">ยังไม่บันทึกเบอร์ติดต่อ</p>
                              )}
                              <p className="font-extrabold text-indigo-600 bg-indigo-50/40 border border-indigo-100/50 px-1.5 py-0.5 rounded w-fit text-[9.5px]">
                                งานค้างในมือ: {assignedJobsCount} งานมอบหมาย
                              </p>
                            </div>
                          </div>

                          {/* Actions Panel */}
                          <div className="flex flex-col gap-1.5 justify-start">
                            <button
                              onClick={() => openEmpEdit(emp)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md border border-slate-150/60 cursor-pointer"
                              title="แก้ไขข้อมูลส่วนตัวพนักงาน"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (assignedJobsCount > 0) {
                                  alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากมีงานที่มอบหมายค้างอยู่จำนวน ${assignedJobsCount} รายการ`);
                                  return;
                                }
                                if (confirm(`คุณต้องการนำรายชื่อพนักงาน "${emp.name}" ออกจากระบบหรือไม่?`)) {
                                  onDeleteEmployee(emp.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-slate-150/60 cursor-pointer"
                              title="ลบรายชื่อ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Format Bar inside List View */}
                        <div className="border-t border-slate-150/60 pt-2 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><Palette className="h-2.5 w-2.5" /> ปรับโทนสีการ์ด:</span>
                          <div className="flex items-center gap-1">
                            {[
                              { name: 'Slate', value: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100' },
                              { name: 'Indigo', value: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200' },
                              { name: 'Emerald', value: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200' },
                              { name: 'Amber', value: 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200' },
                              { name: 'Rose', value: 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200' },
                              { name: 'Sky', value: 'border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 text-sky-950 dark:text-sky-200' },
                              { name: 'Purple', value: 'border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200' }
                            ].map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => onEditEmployee(emp.id, { cardColor: preset.value })}
                                className={`h-3 w-3 rounded-full border border-slate-300 cursor-pointer transition-transform hover:scale-125 ${
                                  preset.value.split(' ')[2] === (emp.cardColor || '').split(' ')[2] ? 'ring-1 ring-offset-1 ring-indigo-500 scale-110' : ''
                                }`}
                                style={{ backgroundColor: preset.value.includes('indigo') ? '#6366f1' : preset.value.includes('emerald') ? '#10b981' : preset.value.includes('amber') ? '#f59e0b' : preset.value.includes('rose') ? '#f43f5e' : preset.value.includes('sky') ? '#0ea5e9' : preset.value.includes('purple') ? '#a855f7' : '#94a3b8' }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= PROJECT ADD DIALOG ============================ */}
      {/* ======================================================================= */}
      {isProjAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-indigo-600" />
                ลงทะเบียนโครงการใหม่
              </h3>
              <button onClick={() => setIsProjAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProjAddSubmit}>
              <div className="p-5 space-y-4">
                
                {/* Job No */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หมายเลข Job No. <span className="text-rose-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={projJobNo}
                      onChange={(e) => setProjJobNo(e.target.value)}
                      placeholder="เช่น JOB-2607-005"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={autoGenerateNewProjJobNo}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[10px] font-black rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      สร้างเลขรหัส
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ปีงบประมาณ <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={projYear}
                      onChange={(e) => setProjYear(e.target.value)}
                      placeholder="เช่น 2026"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
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
                      placeholder="เช่น Gtt-store, Siam Auto"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Project Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อโครงการ / รายละเอียดงาน <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={2}
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="เช่น งานติดตั้งตู้ควบคุมแผงกระจายกำลังหลัก..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                {/* Optional Image */}
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <label className="text-[10px] font-bold text-slate-500 block">ลิงก์รูปภาพหลักโครงการ (หรืออัปโหลดโดยตรงในรายการ)</label>
                  <input
                    type="text"
                    value={projImageUrl}
                    onChange={(e) => setProjImageUrl(e.target.value)}
                    placeholder="ป้อน URL หรือ เว้นว่างเพื่อแนบรูปทีหลัง..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10.5px] font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsProjAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer shadow-xs"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= PROJECT EDIT DIALOG =========================== */}
      {/* ======================================================================= */}
      {isProjEditModalOpen && selectedProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl relative">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 font-sans flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
                แก้ไขข้อมูลโปรเจกต์: {selectedProj.jobNo}
              </h3>
              <button onClick={() => setIsProjEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProjEditSubmit}>
              <div className="p-5 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หมายเลข Job No.</label>
                  <input
                    type="text"
                    required
                    value={projJobNo}
                    onChange={(e) => setProjJobNo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ปีงบประมาณ</label>
                    <input
                      type="text"
                      required
                      value={projYear}
                      onChange={(e) => setProjYear(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ลูกค้า (Customer)</label>
                    <input
                      type="text"
                      required
                      value={projCustomer}
                      onChange={(e) => setProjCustomer(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อโครงการ / รายละเอียดงาน</label>
                  <textarea
                    required
                    rows={2}
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsProjEditModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= EMPLOYEE ADD DIALOG =========================== */}
      {/* ======================================================================= */}
      {isEmpAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
                <UserPlus className="h-4.5 w-4.5 text-indigo-600" />
                เพิ่มข้อมูลพนักงานใหม่
              </h3>
              <button onClick={() => setIsEmpAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEmpAddSubmit}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Name & Nickname Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ชื่อ-นามสกุล <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="เช่น สมศักดิ์ รักดี"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ชื่อเล่น (Nickname)</label>
                    <input
                      type="text"
                      value={empNickname}
                      onChange={(e) => setEmpNickname(e.target.value)}
                      placeholder="เช่น แดง"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">อีเมลพนักงาน (Email)</label>
                    <input
                      type="email"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="employee@domain.com"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      placeholder="089-xxx-xxxx"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Org Level Toggles */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ระดับระดับองค์กร (Organization Level) <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'owner', label: 'Owner / เจ้าของ' },
                      { id: 'head', label: 'Head / หัวหน้า' },
                      { id: 'team', label: 'Team / ลูกทีม' }
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setEmpOrgLevel(lvl.id);
                          if (lvl.id === 'owner') {
                            setEmpDepartment('Owner');
                          }
                        }}
                        className={`px-2 py-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer text-center ${
                          empOrgLevel === lvl.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department Select Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">แผนกงาน (Department Selection) <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      'Accounting',
                      'Electrical',
                      'Assembly',
                      'Machine Shop',
                      'Design',
                      'Welding',
                      'Owner'
                    ].map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        disabled={empOrgLevel === 'owner' && dept !== 'Owner'}
                        onClick={() => setEmpDepartment(dept)}
                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer truncate ${
                          empDepartment === dept
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : (empOrgLevel === 'owner' && dept !== 'Owner')
                              ? 'opacity-30 bg-slate-100 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ตำแหน่งหน้าที่ระบุเฉพาะเจาะจง (เช่น ช่างประกอบตู้คอนโทรล)</label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    placeholder="เช่น ช่างเชื่อมโครงชิ้นงาน, วิศวกรไฟฟ้า"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Photo URL or Presets */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-500 block">แนบรูปถ่ายพนักงาน (ลิงก์ หรือคลิกเลือกตัวแทน)</label>
                  <input
                    type="text"
                    value={empImageUrl}
                    onChange={(e) => setEmpImageUrl(e.target.value)}
                    placeholder="วางลิงก์ URL รูปภาพ หรือคลิกเลือกรูปจำลอง..."
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
                  />
                  
                  {/* Preset employee avatar shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] text-slate-400 font-sans">รูปจำลอง:</span>
                    <button
                      type="button"
                      onClick={() => setEmpImageUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80')}
                      className="text-[9px] bg-slate-200/60 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      ผู้จัดการหญิง
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpImageUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80')}
                      className="text-[9px] bg-slate-200/60 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      วิศวกรชาย
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmpImageUrl('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80')}
                      className="text-[9px] bg-slate-200/60 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      ช่างเขียนแบบ
                    </button>
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsEmpAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer shadow-xs"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= EMPLOYEE EDIT DIALOG ========================== */}
      {/* ======================================================================= */}
      {isEmpEditModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
                แก้ไขข้อมูลส่วนตัว: {selectedEmp.name}
              </h3>
              <button onClick={() => setIsEmpEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEmpEditSubmit}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Name & Nickname Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ชื่อ-นามสกุล <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ชื่อเล่น (Nickname)</label>
                    <input
                      type="text"
                      value={empNickname}
                      onChange={(e) => setEmpNickname(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">อีเมลพนักงาน (Email)</label>
                    <input
                      type="email"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      placeholder="employee@domain.com"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Org Level Toggles */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ระดับระดับองค์กร (Organization Level) <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'owner', label: 'Owner / เจ้าของ' },
                      { id: 'head', label: 'Head / หัวหน้า' },
                      { id: 'team', label: 'Team / ลูกทีม' }
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setEmpOrgLevel(lvl.id);
                          if (lvl.id === 'owner') {
                            setEmpDepartment('Owner');
                          }
                        }}
                        className={`px-2 py-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer text-center ${
                          empOrgLevel === lvl.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department Select Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">แผนกงาน (Department Selection) <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      'Accounting',
                      'Electrical',
                      'Assembly',
                      'Machine Shop',
                      'Design',
                      'Welding',
                      'Owner'
                    ].map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        disabled={empOrgLevel === 'owner' && dept !== 'Owner'}
                        onClick={() => setEmpDepartment(dept)}
                        className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer truncate ${
                          empDepartment === dept
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : (empOrgLevel === 'owner' && dept !== 'Owner')
                              ? 'opacity-30 bg-slate-100 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ตำแหน่งหน้าที่ระบุเฉพาะเจาะจง</label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Photo URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ลิงก์รูปภาพประจำตัว (Profile Image URL)</label>
                  <input
                    type="text"
                    value={empImageUrl}
                    onChange={(e) => setEmpImageUrl(e.target.value)}
                    placeholder="วาง URL รูปภาพประจำตัวพนักงาน..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsEmpEditModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer shadow-xs"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= TAB 3: BRAND DIRECTORY ======================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'brands' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-indigo-500" />
                ทำเนียบแบรนด์สินค้า (Brand Directory)
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                ลงทะเบียนแบรนด์สินค้าที่ใช้ในโครงการและในคลังพัสดุ เพื่อเชื่อมโยงโลโก้แบรนด์สินค้าและเอกสารแคตตาล็อก
              </p>
            </div>
            <button
              onClick={() => {
                setBrandName('');
                setBrandLogo('');
                setIsBrandAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs self-start md:self-auto"
              id="btn-add-brand-modal"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างแบรนด์สินค้าใหม่</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาชื่อแบรนด์สินค้า..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                id="brand-search-input"
              />
            </div>
          </div>

          {/* Brands list */}
          {filteredBrands.length === 0 ? (
            <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
              <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
                <Tag className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">ไม่พบข้อมูลแบรนด์สินค้า</p>
              <p className="text-[10px] text-slate-400 mt-1">คุณสามารถสร้างแบรนด์สินค้าใหม่ได้โดยคลิกปุ่ม "สร้างแบรนด์สินค้าใหม่"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBrands.map((brand) => (
                <div 
                  key={brand.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between text-center shadow-xs transition-all hover:border-indigo-500/20 group"
                >
                  <div className="flex flex-col items-center space-y-3 w-full">
                    {/* Logo Box */}
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {brand.logoUrl ? (
                        <img 
                          src={brand.logoUrl} 
                          alt={brand.name} 
                          className="max-h-full max-w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xl font-black text-indigo-500 font-sans uppercase">
                          {brand.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    {/* Brand Name */}
                    <div className="space-y-0.5 w-full">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-sans truncate px-1" title={brand.name}>
                        {brand.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 font-sans">
                        ID: {brand.id.replace('brand-', '')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 w-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand(brand);
                        setBrandName(brand.name);
                        setBrandLogo(brand.logoUrl || '');
                        setIsBrandEditModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="แก้ไขข้อมูลแบรนด์"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`คุณต้องการลบแบรนด์ "${brand.name}" หรือไม่? หากมีสินค้าใช้งานแบรนด์นี้ ข้อมูลแบรนด์อาจจะไม่แสดงผล`)) {
                          onDeleteBrand?.(brand.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="ลบแบรนด์สินค้า"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================== MODAL: ADD BRAND ============================= */}
      {/* ======================================================================= */}
      {isBrandAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">สร้างแบรนด์สินค้าใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!brandName.trim()) return;
                await onAddBrand?.({
                  name: brandName.trim(),
                  logoUrl: brandLogo.trim()
                });
                setIsBrandAddModalOpen(false);
              }}
              className="flex-1 overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อแบรนด์สินค้า <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="กรอกชื่อแบรนด์สินค้า (เช่น Siemens, Schneider, Mitsubishi)..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Brand Logo Option 1: File upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">อัปโหลดไฟล์ Logo แบรนด์</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {brandLogo ? (
                        <img 
                          src={brandLogo} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Tag className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
                        <Upload className="h-3.5 w-3.5" />
                        เลือกไฟล์รูปภาพ Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setBrandLogo(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <p className="text-[8px] text-slate-400 mt-1">ขนาดแนะนำ: อัตราส่วน 1:1, สี่เหลี่ยมจัตุรัส</p>
                    </div>
                  </div>
                </div>

                {/* Brand Logo Option 2: Image URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หรือใส่ลิงก์รูปภาพโลโก้ (Logo Image URL)</label>
                  <input
                    type="text"
                    value={brandLogo.startsWith('data:') ? '' : brandLogo}
                    onChange={(e) => setBrandLogo(e.target.value)}
                    placeholder="วางลิงก์ URL รูปภาพโลโก้แบรนด์สินค้า..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                  {brandLogo && brandLogo.startsWith('data:') && (
                    <div className="flex items-center justify-between text-[8px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/10 dark:text-emerald-400 px-2 py-1 rounded-md">
                      <span>ไฟล์รูปภาพที่อัปโหลดจะถูกใช้เป็น Base64 Data</span>
                      <button 
                        type="button" 
                        onClick={() => setBrandLogo('')}
                        className="text-rose-500 font-bold hover:underline"
                      >
                        ล้างรูปภาพ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsBrandAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!brandName.trim()}
                  className={`px-4 py-1.5 text-xs font-black text-white rounded-lg cursor-pointer shadow-xs transition-all ${
                    brandName.trim() 
                      ? 'bg-indigo-600 hover:bg-indigo-500' 
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  เพิ่มแบรนด์สินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================== MODAL: EDIT BRAND ============================ */}
      {/* ======================================================================= */}
      {isBrandEditModalOpen && selectedBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">แก้ไขข้อมูลแบรนด์สินค้า</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBrandEditModalOpen(false);
                  setSelectedBrand(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!brandName.trim() || !selectedBrand) return;
                await onEditBrand?.(selectedBrand.id, {
                  name: brandName.trim(),
                  logoUrl: brandLogo.trim()
                });
                setIsBrandEditModalOpen(false);
                setSelectedBrand(null);
              }}
              className="flex-1 overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {/* Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อแบรนด์สินค้า <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="กรอกชื่อแบรนด์สินค้า..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Brand Logo Option 1: File upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">อัปโหลดไฟล์ Logo แบรนด์</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {brandLogo ? (
                        <img 
                          src={brandLogo} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Tag className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
                        <Upload className="h-3.5 w-3.5" />
                        เปลี่ยนไฟล์รูปภาพ Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setBrandLogo(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <p className="text-[8px] text-slate-400 mt-1">ขนาดแนะนำ: อัตราส่วน 1:1, สี่เหลี่ยมจัตุรัส</p>
                    </div>
                  </div>
                </div>

                {/* Brand Logo Option 2: Image URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หรือใส่ลิงก์รูปภาพโลโก้ (Logo Image URL)</label>
                  <input
                    type="text"
                    value={brandLogo.startsWith('data:') ? '' : brandLogo}
                    onChange={(e) => setBrandLogo(e.target.value)}
                    placeholder="วางลิงก์ URL รูปภาพโลโก้แบรนด์สินค้า..."
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                  {brandLogo && brandLogo.startsWith('data:') && (
                    <div className="flex items-center justify-between text-[8px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/10 dark:text-emerald-400 px-2 py-1 rounded-md">
                      <span>ไฟล์รูปภาพที่อัปโหลดจะถูกใช้เป็น Base64 Data</span>
                      <button 
                        type="button" 
                        onClick={() => setBrandLogo('')}
                        className="text-rose-500 font-bold hover:underline"
                      >
                        ล้างรูปภาพ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsBrandEditModalOpen(false);
                    setSelectedBrand(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!brandName.trim()}
                  className={`px-4 py-1.5 text-xs font-black text-white rounded-lg cursor-pointer shadow-xs transition-all ${
                    brandName.trim() 
                      ? 'bg-indigo-600 hover:bg-indigo-500' 
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
