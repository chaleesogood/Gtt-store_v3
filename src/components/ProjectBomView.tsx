import React, { useState, useEffect, useMemo } from 'react';
import { Product, Bom, BomItem, Category, JobProject, ProductOrder, normalizeModules, Employee, Job, DailyReport, MediaFile } from '../types';
import Logo from './Logo';
import JobAssignmentView from './JobAssignmentView';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Search, 
  ChevronDown, 
  FolderPlus, 
  Boxes, 
  Loader2, 
  Check, 
  Filter,
  Copy,
  Play,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FolderGit2,
  Layers,
  Settings,
  Upload,
  ArrowUpDown,
  Briefcase
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, cleanUndefined, auth } from '../firebase';

interface ProjectBomViewProps {
  products: Product[];
  boms: Bom[];
  setBoms?: React.Dispatch<React.SetStateAction<Bom[]>>;
  projects: Project[]; // Backward compatible
  categories: Category[];
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  jobProjects?: JobProject[];
  onAddJobProject?: (proj: Omit<JobProject, 'id' | 'createdAt'>) => Promise<void>;
  onEditJobProject?: (id: string, updatedFields: Partial<JobProject>) => Promise<void>;
  onDeleteJobProject?: (id: string) => Promise<void>;
  employees?: Employee[];

  // Job assignment & daily reports props
  jobs?: Job[];
  onAddJob?: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEditJob?: (id: string, updatedFields: Partial<Job>) => Promise<void>;
  onDeleteJob?: (id: string) => Promise<void>;

  onAddEmployee?: (emp: Omit<Employee, 'id' | 'createdAt'>) => Promise<void>;
  onEditEmployee?: (id: string, updatedFields: Partial<Employee>) => Promise<void>;
  onDeleteEmployee?: (id: string) => Promise<void>;

  dailyReports?: DailyReport[];
  onAddDailyReport?: (newReport: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditDailyReport?: (id: string, updatedFields: Partial<DailyReport>) => void;
  onDeleteDailyReport?: (id: string) => void;
  onAddMediaFile?: (data: Omit<MediaFile, 'id' | 'createdAt'>) => Promise<MediaFile>;
}

// Typings for backward compatibility
interface Project {
  id: string;
  name: string;
  customer: string;
  jobNo: string;
}

interface InlineInputProps {
  value: string | number;
  type?: 'text' | 'number';
  className?: string;
  onSave: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function InlineInput({ value, type = 'text', className = '', onSave, placeholder = '', disabled = false }: InlineInputProps) {
  const [localVal, setLocalVal] = useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    if (localVal !== value && !disabled) {
      onSave(localVal.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type={type}
      value={localVal}
      placeholder={placeholder}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`w-full bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded px-1.5 py-0.5 text-[11px] font-sans text-slate-800 outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:text-slate-700 disabled:cursor-not-allowed ${className}`}
    />
  );
}

interface GroupedProductSelectProps {
  products: Product[];
  categories: Category[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function GroupedProductSelect({ products, categories, selectedValue, onChange, placeholder = '-- ค้นหา/เลือกสินค้าวัตถุดิบ --' }: GroupedProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  const selectedProduct = products.find(p => p.id === selectedValue);
  const uniqueCategories = Array.from(new Set(products.map(p => p.category || 'ทั่วไป')));

  const toggleCategoryVisibility = (cat: string) => {
    setHiddenCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredProducts = products.filter(p => {
    const cat = p.category || 'ทั่วไป';
    if (hiddenCategories.includes(cat)) return false;
    
    const term = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term))
    );
  });

  return (
    <div className="relative font-sans text-[11px]" id="grouped-product-select-container">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-1 px-2 bg-white border border-slate-200 rounded text-left text-slate-700 font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <span className="truncate">
          {selectedProduct ? (
            `${selectedProduct.name} [คงเหลือ: ${selectedProduct.quantity} ${selectedProduct.unit || 'ชิ้น'}]`
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 p-2 space-y-2 max-h-[300px] overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์เพื่อค้นหารายการพัสดุในคลัง..."
                className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                autoFocus
              />
            </div>

            <div className="space-y-1 bg-slate-50 p-1.5 rounded border border-slate-100">
              <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Filter className="h-2.5 w-2.5" />
                <span>ตัวกรองประเภทพัสดุ:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {uniqueCategories.map(cat => {
                  const isHidden = hiddenCategories.includes(cat);
                  const catObj = categories.find(c => c.id === cat);
                  const displayName = catObj ? catObj.name : (cat === 'ทั่วไป' ? 'ทั่วไป' : cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoryVisibility(cat)}
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition-all cursor-pointer flex items-center border ${
                        isHidden 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}
                    >
                      <span>{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-0.5 divide-y divide-slate-100 max-h-[140px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-2 text-center text-slate-400 italic">ไม่พบคลังวัตถุดิบ</div>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-1.5 py-1 hover:bg-indigo-50 flex flex-col cursor-pointer text-[10.5px] font-sans"
                  >
                    <div className="font-bold text-slate-800 truncate flex items-center justify-between gap-1">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded font-normal shrink-0">
                        {categories.find(c => c.id === p.category)?.name || 'ทั่วไป'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Code: {p.sku || '-'} | แบรนด์: {p.brand || 'ทั่วไป'}</span>
                      <span className="text-indigo-600 font-extrabold">คลัง: {p.quantity} {p.unit || 'ชิ้น'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const getOrderBadgeStyle = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'quotation': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'ordered': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'approved': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'paid': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'received': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getOrderThaiLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'ขอซื้อ (PR)';
    case 'quotation': return 'ใบเสนอราคา';
    case 'ordered': return 'สั่งซื้อ (PO)';
    case 'approved': return 'อนุมัติแล้ว';
    case 'paid': return 'จ่ายเงินแล้ว';
    case 'received': return 'รับของแล้ว';
    case 'cancelled': return 'ยกเลิก';
    default: return status;
  }
};

// -------------------- PROJECT MODULES MANAGER SUBCOMPONENT (FLAT & DENSE) --------------------
interface ProjectModulesManagerProps {
  proj: JobProject;
  onEditJobProject: (id: string, updatedFields: Partial<JobProject>) => Promise<void>;
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  onAddMediaFile?: (data: any) => Promise<any>;
}

function ProjectModulesManager({ proj, onEditJobProject, addToast, onAddMediaFile }: ProjectModulesManagerProps) {
  const modules = normalizeModules(proj.modules);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      return (a?.code || '').localeCompare(b?.code || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [modules]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      addToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาระบุเลขโมดูลและชื่อโมดูล');
      return;
    }
    const cleanCode = newCode.trim().toUpperCase();
    if (modules.some(m => m.code === cleanCode)) {
      addToast('warning', 'เลขโมดูลซ้ำ', 'มีรหัสโมดูลนี้ในโครงการแล้ว');
      return;
    }

    const updated = [...modules, { code: cleanCode, name: newName.trim() }];
    try {
      await onEditJobProject(proj.id, { modules: updated });
      addToast('success', 'เพิ่มโมดูลสำเร็จ', `เพิ่มโมดูล ${cleanCode} เรียบร้อย`);
      setNewCode('');
      setNewName('');
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleUpdateModule = async (oldCode: string) => {
    if (!editingName.trim()) {
      addToast('warning', 'ข้อมูลไม่ครบ', 'ชื่อโมดูลต้องไม่ว่างเปล่า');
      return;
    }
    const updated = modules.map(m => {
      if (m.code === oldCode) {
        return { ...m, name: editingName.trim() };
      }
      return m;
    });
    try {
      await onEditJobProject(proj.id, { modules: updated });
      addToast('success', 'แก้ไขสำเร็จ', `อัปเดตโมดูล ${oldCode} เรียบร้อย`);
      setEditingCode(null);
      setEditingName('');
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleDeleteModule = async (code: string) => {
    if (!confirm(`คุณต้องการลบโมดูล ${code} หรือไม่?`)) return;
    const updated = modules.filter(m => m.code !== code);
    try {
      await onEditJobProject(proj.id, { modules: updated });
      addToast('info', 'ลบโมดูลสำเร็จ', `นำโมดูล ${code} ออกเรียบร้อย`);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleUploadImage = async (code: string, base64Data: string) => {
    const updated = modules.map(m => {
      if (m.code === code) {
        return { ...m, imageUrl: base64Data };
      }
      return m;
    });
    try {
      await onEditJobProject(proj.id, { modules: updated });
      addToast('success', 'อัปโหลดรูปสำเร็จ', `บันทึกรูปภาพสำหรับโมดูล ${code} แล้ว`);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleDeleteImage = async (code: string) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบรูปภาพโมดูลนี้ใช่หรือไม่?')) return;
    const updated = modules.map(m => {
      if (m.code === code) {
        return { ...m, imageUrl: '' };
      }
      return m;
    });
    try {
      await onEditJobProject(proj.id, { modules: updated });
      addToast('info', 'ลบรูปภาพสำเร็จ', `ลบรูปภาพสำหรับโมดูล ${code} แล้ว`);
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  return (
    <div className="space-y-3 text-[11px] font-sans">
      {/* Create Module Form (Compact Flat) */}
      <form onSubmit={handleAddModule} className="bg-slate-50 p-2 rounded border border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
        <span className="font-black text-slate-700 shrink-0">🛠️ เพิ่มระบบโมดูลย่อย:</span>
        <input
          type="text"
          required
          placeholder="รหัสโมดูล เช่น M01"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold font-mono uppercase focus:outline-none w-28"
        />
        <input
          type="text"
          required
          placeholder="ชื่อระบบการทำงานย่อย"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] focus:outline-none flex-1 min-w-[120px]"
        />
        <button
          type="submit"
          className="px-3 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded text-[10px] cursor-pointer"
        >
          เพิ่มโมดูล
        </button>
      </form>

      {/* Modules List Horizontal Grid */}
      <div className="space-y-1.5 text-left">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">โมดูลย่อยที่กำหนดไว้:</span>
        {sortedModules.length === 0 ? (
          <div className="py-2 text-center text-slate-400 text-[10px]">ยังไม่มีการระบุโมดูลย่อยในโครงการนี้</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sortedModules.map((m) => {
              const isEditing = editingCode === m.code;
              return (
                <div key={m.code} className="bg-white border border-slate-100 rounded p-1.5 flex items-center justify-between gap-2 hover:bg-slate-50/50">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Tiny Thumbnail */}
                    <label className="relative shrink-0 w-8 h-8 rounded border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-slate-400 font-bold leading-none">แนบรูป</span>
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
                            const base64 = reader.result as string;
                            handleUploadImage(m.code, base64);
                            if (onAddMediaFile && base64) {
                              onAddMediaFile({
                                name: `รูปมอดูลโครงการ: ${m.name || m.code}`,
                                type: 'image',
                                url: base64,
                                category: 'เอกสารโครงการ',
                                refName: proj.projectName || proj.jobNo || m.code,
                                size: file.size,
                                fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>

                    <div className="min-w-0 flex-1 text-left">
                      <span className="font-mono text-[9px] font-bold px-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded">
                        {m.code}
                      </span>
                      <div className="text-[11px] font-bold text-slate-800 truncate leading-none mt-0.5">{m.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCode(m.code);
                        setEditingName(m.name);
                      }}
                      className="p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(m.code)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Module Popup Modal */}
      {editingCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div>
              <h4 className="text-sm font-black text-slate-800">แก้ไขชื่อโมดูล</h4>
              <p className="text-[10px] text-slate-400">โมดูลรหัส {editingCode}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500">ชื่อโมดูลใหม่ <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                placeholder="ระบุชื่อโมดูล"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingCode(null);
                  setEditingName('');
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200/80 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleUpdateModule(editingCode)}
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

export default function ProjectBomView({ 
  products, 
  boms, 
  setBoms,
  categories, 
  addToast,
  jobProjects = [],
  onAddJobProject,
  onEditJobProject,
  onDeleteJobProject,
  employees = [],
  currentUserRole,
  userRoles = [],

  // Job assignment & daily reports props
  jobs = [],
  onAddJob,
  onEditJob,
  onDeleteJob,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  dailyReports = [],
  onAddDailyReport,
  onEditDailyReport,
  onDeleteDailyReport,
  onAddMediaFile
}: ProjectBomViewProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'bom' | 'planning'>('bom');

  // Master Project setup states
  const [projSearch, setProjSearch] = useState('');
  const [isProjAddModalOpen, setIsProjAddModalOpen] = useState(false);
  const [isProjEditModalOpen, setIsProjEditModalOpen] = useState(false);
  const [selectedProj, setSelectedProj] = useState<JobProject | null>(null);

  const [projJobNo, setProjJobNo] = useState('');
  const [projYear, setProjYear] = useState(new Date().getFullYear().toString());
  const [projCustomer, setProjCustomer] = useState('');
  const [projName, setProjName] = useState('');

  // BOM workspace states
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectorViewMode, setSelectorViewMode] = useState<'vertical_grid' | 'horizontal'>('vertical_grid');
  const [isDeducting, setIsDeducting] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isModulesManagerOpen, setIsModulesManagerOpen] = useState(false);

  // New BOM creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBomName, setNewBomName] = useState('');
  const [newBomJobNo, setNewBomJobNo] = useState('');
  const [newBomDescription, setNewBomDescription] = useState('');
  const [newBomRequiredQuantity, setNewBomRequiredQuantity] = useState<number>(1);

  // Edit BOM states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBomName, setEditBomName] = useState('');
  const [editBomJobNo, setEditBomJobNo] = useState('');
  const [editBomDescription, setEditBomDescription] = useState('');
  const [editBomRequiredQuantity, setEditBomRequiredQuantity] = useState<number>(1);
  const [editBomStatus, setEditBomStatus] = useState<Bom['status']>('pending');

  // Copy BOM states
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [bomToCopy, setBomToCopy] = useState<Bom | null>(null);
  const [copyBomName, setCopyBomName] = useState('');
  const [copyBomJobNo, setCopyBomJobNo] = useState('');
  const [copyBomDescription, setCopyBomDescription] = useState('');
  const [copyBomRequiredQuantity, setCopyBomRequiredQuantity] = useState<number>(1);

  // Job Assignment modal states
  const [isAssignJobModalOpen, setIsAssignJobModalOpen] = useState(false);
  const [assignJobNo, setAssignJobNo] = useState('');
  const [assignModuleName, setAssignModuleName] = useState('');
  const [assignAssignee, setAssignAssignee] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignPriority, setAssignPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignTargetDate, setAssignTargetDate] = useState('');

  // Worksheet element states
  const [worksheetSelectedProductId, setWorksheetSelectedProductId] = useState('');
  const [worksheetAddQty, setWorksheetAddQty] = useState<number>(1);
  const [worksheetAddUnit, setWorksheetAddUnit] = useState('ชิ้น');
  const [worksheetAddRemark, setWorksheetAddRemark] = useState('');
  const [worksheetAddGroup, setWorksheetAddGroup] = useState('โมดูลทั่วไป');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');

  // Orders lists synced
  const [orders, setOrders] = useState<ProductOrder[]>([]);

  const updateLocalBoms = (updater: (prev: Bom[]) => Bom[]) => {
    if (setBoms) {
      setBoms(prev => {
        const next = updater(prev);
        localStorage.setItem('stock_manager_boms', JSON.stringify(next));
        return next;
      });
    }
  };

  // Sync orders from Firestore
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ProductOrder[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as ProductOrder);
      });
      setOrders(list);
    }, (error) => {
      console.error('Error syncing orders:', error);
      const saved = localStorage.getItem('stock_manager_orders_list');
      setOrders(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Quick PR Modal states
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [reqItemIndex, setReqItemIndex] = useState<number | null>(null);
  const [reqQty, setReqQty] = useState<number>(1);
  const [reqPriceUnit, setReqPriceUnit] = useState<number>(0);
  const [reqRequester, setReqRequester] = useState<string>('');
  const [reqPrNo, setReqPrNo] = useState<string>('');
  const [reqRemark, setReqRemark] = useState<string>('');
  const [reqPurchaserName, setReqPurchaserName] = useState<string>('');
  const [reqJobNo, setReqJobNo] = useState<string>('');
  const [reqJobName, setReqJobName] = useState<string>('');
  const [reqSelectedProductId, setReqSelectedProductId] = useState<string>('');
  const [reqOrderTitle, setReqOrderTitle] = useState<string>('');
  const [reqUnit, setReqUnit] = useState<string>('ชิ้น');

  // Autofill quick requisition form if product selected
  useEffect(() => {
    if (reqSelectedProductId) {
      const prod = products.find(p => p.id === reqSelectedProductId);
      if (prod) {
        setReqOrderTitle(prod.name);
        setReqPriceUnit(prod.costPrice || prod.price || 0);
        setReqUnit(prod.unit || 'ชิ้น');
      }
    }
  }, [reqSelectedProductId, products]);

  // Viewing Order states
  const [viewingOrder, setViewingOrder] = useState<ProductOrder | null>(null);

  // Active BOM resolved
  const activeBom = selectedBom ? boms.find(b => b.id === selectedBom.id) || selectedBom : null;

  const getProjectMeta = (jobNo?: string) => {
    if (!jobNo) return undefined;
    return jobProjects.find(p => p.jobNo === jobNo);
  };

  const activeProject = activeBom ? getProjectMeta(activeBom.jobNo) : undefined;
  const projectModules = useMemo(() => {
    if (!activeProject) return [];
    return normalizeModules(activeProject.modules);
  }, [activeProject]);

  const getBomFinancials = (bom: Bom) => {
    let totalCost = 0;
    let totalRetail = 0;
    bom.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const itemCost = item.priceUnit || (p ? p.costPrice : 0);
      const itemRetail = p ? p.price : 0;
      totalCost += itemCost * item.quantity;
      totalRetail += itemRetail * item.quantity;
    });
    return { totalCost, totalRetail };
  };

  const getBomGroups = (bom: Bom) => {
    const list = new Set<string>();
    bom.items.forEach(item => {
      const rawG = (item.group || '').trim();
      if (!rawG) return;
      const g = (rawG === 'ทั่วไป' || rawG === 'โมดูลทั่วไป' || rawG === 'General') ? 'โมดูลทั่วไป' : rawG;
      if (g !== 'โมดูลทั่วไป') {
        list.add(g);
      }
    });
    return Array.from(list);
  };

  const filteredProjects = useMemo(() => {
    return jobProjects.filter(p => {
      const q = projSearch.toLowerCase();
      return (
        (p.jobNo || '').toLowerCase().includes(q) ||
        (p.projectName || '').toLowerCase().includes(q) ||
        (p.customer || '').toLowerCase().includes(q)
      );
    });
  }, [jobProjects, projSearch]);

  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projJobNo.trim() || !projCustomer.trim() || !projName.trim()) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลโครงการให้ครบถ้วน');
      return;
    }
    if (jobProjects.some(p => (p.jobNo || '').toLowerCase() === projJobNo.trim().toLowerCase())) {
      addToast('warning', 'รหัส Job ซ้ำ', 'หมายเลข Job นี้ได้รับการจดทะเบียนแล้ว');
      return;
    }

    try {
      if (onAddJobProject) {
        await onAddJobProject({
          jobNo: projJobNo.trim(),
          year: projYear.trim(),
          customer: projCustomer.trim(),
          projectName: projName.trim(),
          modules: []
        });
        addToast('success', 'เพิ่มตั้งค่าโปรเจ็คสำเร็จ', `สร้างรหัสโครงการ ${projJobNo} เรียบร้อยแล้ว`);
        setIsProjAddModalOpen(false);
      }
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj) return;

    try {
      if (onEditJobProject) {
        await onEditJobProject(selectedProj.id, {
          jobNo: projJobNo.trim(),
          year: projYear.trim(),
          customer: projCustomer.trim(),
          projectName: projName.trim()
        });
        addToast('success', 'ปรับปรุงโครงการสำเร็จ', `อัปเดตข้อมูลตั้งค่าโปรเจ็คเรียบร้อย`);
        setIsProjEditModalOpen(false);
      }
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleDeleteProject = async (id: string, jobNo: string) => {
    if (!confirm(`คุณต้องการลบโครงการ ${jobNo} ออกจากระบบหลักหรือไม่? ข้อมูลโมดูลย่อยจะถูกลบทั้งหมด`)) return;
    try {
      if (onDeleteJobProject) {
        await onDeleteJobProject(id);
        addToast('info', 'ลบโครงการสำเร็จ', `นำข้อมูลโครงการออกจากฐานข้อมูลเรียบร้อย`);
        if (selectedProj?.id === id) {
          setSelectedProj(null);
        }
      }
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleAddNewGroupNameInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddNewGroup(newGroupNameInput);
      setNewGroupNameInput('');
    }
  };

  const handleAddNewGroup = (gName: string) => {
    if (!gName.trim()) return;
    setWorksheetAddGroup(gName.trim());
    setIsAddingGroup(false);
    addToast('success', 'เพิ่มโมดูลชั่วคราวสำเร็จ', `ตั้งโมดูลใหม่เป็น "${gName.trim()}"`);
  };

  const handleSelectWorksheetProduct = (pId: string) => {
    setWorksheetSelectedProductId(pId);
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setWorksheetAddUnit(prod.unit || 'ชิ้น');
    }
  };

  // Add Item to BOM
  const handleAddItemToBom = async () => {
    if (!activeBom) return;
    if (!worksheetSelectedProductId) {
      addToast('warning', 'เลือกสินค้า', 'กรุณาระบุวัตถุดิบที่ต้องการบรรจุประกอบ');
      return;
    }

    const matchedProd = products.find(p => p.id === worksheetSelectedProductId);
    if (!matchedProd) return;

    const newItem: BomItem = {
      productId: worksheetSelectedProductId,
      productName: matchedProd.name,
      quantity: worksheetAddQty,
      unit: worksheetAddUnit.trim() || matchedProd.unit || 'ชิ้น',
      priceUnit: matchedProd.costPrice || matchedProd.price || 0,
      group: worksheetAddGroup
    };

    const updatedItems = [...activeBom.items, newItem];
    updateLocalBoms(prev => prev.map(b => b.id === activeBom.id ? { ...b, items: updatedItems, updatedAt: new Date().toISOString() } : b));

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('success', 'เพิ่มพัสดุลง BOM สำเร็จ', `บรรจุ "${matchedProd.name}" เข้าโมดูล "${worksheetAddGroup}" แล้ว`);
      
      // reset forms
      setWorksheetSelectedProductId('');
      setWorksheetAddQty(1);
      setWorksheetAddRemark('');
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาด', err.message);
    }
  };

  // Inline update inside table
  const handleUpdateItemField = async (itemIndex: number, field: keyof BomItem, val: any) => {
    if (!activeBom) return;
    const updatedItems = [...activeBom.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: val
    };

    updateLocalBoms(prev => prev.map(b => b.id === activeBom.id ? { ...b, items: updatedItems, updatedAt: new Date().toISOString() } : b));

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (indexToDelete: number) => {
    if (!activeBom) return;
    const item = activeBom.items[indexToDelete];
    if (!confirm(`ต้องการนำ "${item.productName}" ออกจากใบงาน BOM นี้หรือไม่?`)) return;

    const updatedItems = activeBom.items.filter((_, idx) => idx !== indexToDelete);
    updateLocalBoms(prev => prev.map(b => b.id === activeBom.id ? { ...b, items: updatedItems, updatedAt: new Date().toISOString() } : b));

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('info', 'นำรายการออกแล้ว', `ถอดวัตถุดิบประกอบสำเร็จ`);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', err.message);
    }
  };

  // Create New BOM Sheet
  const handleCreateBomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomName.trim()) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อใบเสนอสเปรตชีต BOM');
      return;
    }

    const bomId = `bom-${Math.random().toString(36).substring(2, 9)}`;
    const newBom: Bom = {
      id: bomId,
      name: newBomName.trim(),
      jobNo: newBomJobNo.trim(),
      description: newBomDescription.trim(),
      requiredQuantity: newBomRequiredQuantity,
      status: 'pending',
      items: [],
      stockDeducted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateLocalBoms(prev => [newBom, ...prev]);

    try {
      await setDoc(doc(db, 'boms', bomId), cleanUndefined(newBom));
      addToast('success', 'สร้างใบงาน BOM สำเร็จ', `เริ่มต้นใบงานประกอบ "${newBomName}" เรียบร้อยแล้ว`);
      setSelectedBom(newBom);
      setIsCreateModalOpen(false);
      setNewBomName('');
      setNewBomJobNo('');
      setNewBomDescription('');
      setNewBomRequiredQuantity(1);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', err.message);
    }
  };

  // Open Copy Modal with fields prefilled
  const handleCopyBom = (targetBom: Bom) => {
    setBomToCopy(targetBom);
    setCopyBomName(`${targetBom.name} (คัดลอกใหม่)`);
    setCopyBomJobNo(targetBom.jobNo || '');
    setCopyBomDescription(targetBom.description || '');
    setCopyBomRequiredQuantity(targetBom.requiredQuantity || 1);
    setIsCopyModalOpen(true);
  };

  // Confirm copy action and save new BOM
  const handleConfirmCopyBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomToCopy) return;

    const bomId = `bom-${Math.random().toString(36).substring(2, 9)}`;
    const newBom: Bom = {
      ...bomToCopy,
      id: bomId,
      name: copyBomName.trim(),
      jobNo: copyBomJobNo.trim(),
      description: copyBomDescription.trim(),
      requiredQuantity: Math.max(1, copyBomRequiredQuantity),
      stockDeducted: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateLocalBoms(prev => [newBom, ...prev]);

    try {
      await setDoc(doc(db, 'boms', bomId), cleanUndefined(newBom));
      addToast('success', 'ทำสำเนา BOM สำเร็จ', `คัดลอกรายการวัตถุดิบและโมดูลประกอบไปยังใบงานใหม่ "${copyBomName}" แล้ว`);
      setSelectedBom(newBom);
      setIsCopyModalOpen(false);
      setBomToCopy(null);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', err.message);
    }
  };

  // Open Job Assignment modal prefilled with target BOM info
  const handleOpenAssignJob = (targetBom: Bom) => {
    setAssignJobNo(targetBom.jobNo || '');
    setAssignModuleName(targetBom.name);
    setAssignAssignee('');
    setAssignDescription(`ประกอบพัสดุตามสูตร BOM: ${targetBom.name}`);
    setAssignPriority('medium');
    
    // Default targetDate to 7 days from now
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setAssignTargetDate(`${yyyy}-${mm}-${dd}`);
    
    setIsAssignJobModalOpen(true);
  };

  // Open Job Assignment modal empty for manual creation from BOM screen
  const handleOpenNewAssignJob = () => {
    const defaultJobNo = jobProjects && jobProjects.length > 0 ? jobProjects[0].jobNo : '';
    setAssignJobNo(defaultJobNo);
    setAssignModuleName('');
    setAssignAssignee('');
    setAssignDescription('');
    setAssignPriority('medium');
    
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setAssignTargetDate(`${yyyy}-${mm}-${dd}`);
    
    setIsAssignJobModalOpen(true);
  };

  // Open Job Assignment modal prefilled with item name as device/module
  const handleOpenAssignJobFromItem = (itemName: string) => {
    setAssignJobNo(activeBom?.jobNo || '');
    setAssignModuleName(itemName);
    setAssignAssignee('');
    setAssignDescription(`ประกอบพัสดุ: ${itemName}`);
    setAssignPriority('medium');
    
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setAssignTargetDate(`${yyyy}-${mm}-${dd}`);
    
    setIsAssignJobModalOpen(true);
  };

  // Confirm and submit the job assignment
  const handleConfirmAssignJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddJob) {
      addToast('warning', 'ผิดพลาด', 'ระบบจ่ายงานไม่พร้อมใช้งาน');
      return;
    }
    if (!assignAssignee) {
      addToast('warning', 'เลือกผู้รับผิดชอบ', 'กรุณาเลือกผู้รับผิดชอบงานนี้');
      return;
    }

    try {
      await onAddJob({
        jobNo: assignJobNo.trim(),
        module: assignModuleName.trim(),
        assignee: assignAssignee,
        description: assignDescription.trim(),
        status: 'pending',
        priority: assignPriority,
        targetDate: assignTargetDate
      });
      setIsAssignJobModalOpen(false);
      addToast('success', 'จ่ายงานเรียบร้อยแล้ว', `จ่ายงาน "${assignModuleName}" ให้คุณ ${assignAssignee} สำเร็จ`);
    } catch (err: any) {
      console.error(err);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถสั่งจ่ายงานได้: ${err.message}`);
    }
  };

  // Open Edit Modal for BOM Info
  const handleOpenEditModal = () => {
    if (!activeBom) return;
    setEditBomName(activeBom.name);
    setEditBomJobNo(activeBom.jobNo || '');
    setEditBomDescription(activeBom.description || '');
    setEditBomRequiredQuantity(activeBom.requiredQuantity || 1);
    setEditBomStatus(activeBom.status || 'pending');
    setIsEditModalOpen(true);
  };

  const handleEditBomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBom) return;

    const fields = {
      name: editBomName.trim(),
      jobNo: editBomJobNo.trim(),
      description: editBomDescription.trim(),
      requiredQuantity: editBomRequiredQuantity,
      status: editBomStatus,
      updatedAt: new Date().toISOString()
    };

    updateLocalBoms(prev => prev.map(b => b.id === activeBom.id ? { ...b, ...fields } : b));

    try {
      await updateDoc(doc(db, 'boms', activeBom.id), fields);
      addToast('success', 'ปรับปรุงสำเร็จ', 'อัปเดตข้อมูล BOM เรียบร้อยแล้ว');
      setIsEditModalOpen(false);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', err.message);
    }
  };

  const handleDeleteBom = async (targetBom: Bom) => {
    const isAdmin = !currentUserRole || currentUserRole === 'admin';
    const rolePrefix = isAdmin ? '🛡️ [สิทธิ์ ADMIN]' : '';
    if (!confirm(`${rolePrefix} คุณแน่ใจว่าต้องการลบสูตรใบงาน BOM "${targetBom.name}" (Job No: ${targetBom.jobNo || 'ไม่ระบุ'}) ออกจากระบบถาวรหรือไม่?\n\nข้อมูลพัสดุประกอบ ชิ้นส่วน และสถิติทั้งหมดใน BOM นี้จะถูกลบออกเรียบร้อย`)) return;

    updateLocalBoms(prev => prev.filter(b => b.id !== targetBom.id));

    try {
      await deleteDoc(doc(db, 'boms', targetBom.id));
      addToast('info', 'ลบสูตร BOM สำเร็จ', `นำข้อมูล BOM ${targetBom.name} (Job: ${targetBom.jobNo || '-'}) ออกจากระบบเรียบร้อยแล้ว`);
      if (selectedBom?.id === targetBom.id) {
        setSelectedBom(null);
      }
    } catch (err: any) {
      addToast('warning', 'เกิดข้อผิดพลาดในการลบ BOM', err.message);
    }
  };

  // Quick Purchase Requisition Modal Trigger
  const handleOpenQuickRequisition = (originalIndex: number) => {
    if (!activeBom) return;
    const item = activeBom.items[originalIndex];
    const p = products.find(prod => prod.id === item.productId);
    const currentQtyInStock = p ? p.quantity : 0;
    const requiredTotal = item.quantity * (activeBom.requiredQuantity || 1);
    const shortage = requiredTotal - currentQtyInStock;
    const initialQty = shortage > 0 ? shortage : requiredTotal;
    const initialCost = item.priceUnit !== undefined ? item.priceUnit : (p?.costPrice || 0);

    setReqItemIndex(originalIndex);
    setReqQty(initialQty);
    setReqPriceUnit(initialCost);
    setReqRequester(localStorage.getItem('admin_email') || '');
    setReqPurchaserName('');
    setReqJobNo(activeBom.jobNo || '');
    setReqJobName(activeBom.name || '');
    setReqSelectedProductId(item.productId || '');
    setReqOrderTitle(item.productName || '');
    setReqUnit(item.unit || 'ชิ้น');
    setReqPrNo(`PR-${activeBom.jobNo || 'BOM'}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReqRemark(`ขอจัดซื้อสำหรับประกอบใบงาน BOM: ${activeBom.name} (Job: ${activeBom.jobNo || 'ไม่ระบุ'})`);
    
    setIsRequisitionModalOpen(true);
  };

  // Save Quick PR
  const handleSubmitQuickRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBom || reqItemIndex === null) return;

    const item = activeBom.items[reqItemIndex];
    const orderId = `order-${Math.random().toString(36).substring(2, 9)}`;

    const newOrder: any = {
      id: orderId,
      requesterName: reqRequester.trim() || 'ฝ่ายวิศวกรรม/ประกอบ',
      orderTitle: reqOrderTitle.trim(),
      status: 'pending',
      quantity: reqQty,
      unit: reqUnit.trim() || 'ชิ้น',
      createdAt: new Date().toISOString()
    };

    if (reqJobNo.trim()) {
      newOrder.jobNo = reqJobNo.trim();
    }
    if (reqJobName.trim()) {
      newOrder.jobName = reqJobName.trim();
    }
    if (reqPurchaserName.trim()) {
      newOrder.purchaserName = reqPurchaserName.trim();
    }
    if (reqPriceUnit > 0) {
      newOrder.pricePerUnit = reqPriceUnit;
      newOrder.totalPrice = reqPriceUnit * reqQty;
    }
    if (reqSelectedProductId) {
      newOrder.productId = reqSelectedProductId;
    }
    if (item) {
      newOrder.productName = item.productName;
    }
    if (reqPrNo.trim()) {
      newOrder.prNo = reqPrNo.trim();
    }
    if (reqRemark.trim()) {
      newOrder.remark = reqRemark.trim();
    }

    const updatedItems = [...activeBom.items];
    updatedItems[reqItemIndex] = {
      ...updatedItems[reqItemIndex],
      prNo: reqPrNo.trim()
    };

    // Sync Optimistically
    updateLocalBoms(prev => prev.map(b => b.id === activeBom.id ? { ...b, items: updatedItems, updatedAt: new Date().toISOString() } : b));

    try {
      await setDoc(doc(db, 'orders', orderId), cleanUndefined(newOrder));
      await updateDoc(doc(db, 'boms', activeBom.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      addToast('success', 'ส่งคำขอจัดซื้อสำเร็จ', `สร้างใบเสนอสั่งซื้อ "${item.productName}" และผูกกับ BOM เรียบร้อยแล้ว`);
      setIsRequisitionModalOpen(false);
    } catch (err: any) {
      console.error(err);
      addToast('success', 'จำลองจัดซื้อสำเร็จ (Offline)', `บันทึกคำสั่งจัดซื้อชั่วคราวเรียบร้อย`);
      setIsRequisitionModalOpen(false);
    }
  };

  // Deduct/Issue BOM Assembly Stock
  const handleDeductBomStock = async (bom: Bom) => {
    const shortfalls: { productName: string; needed: number; available: number }[] = [];
    bom.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      const needed = item.quantity * bom.requiredQuantity;
      const available = p ? p.quantity : 0;
      if (available < needed) {
        shortfalls.push({
          productName: item.productName || p?.name || 'สินค้า',
          needed,
          available
        });
      }
    });

    const executeDeduction = async () => {
      setIsDeducting(true);
      try {
        const batch = writeBatch(db);
        for (const item of bom.items) {
          const prodRef = doc(db, 'products', item.productId);
          const currentProd = products.find(p => p.id === item.productId);
          
          const deductQty = item.quantity * bom.requiredQuantity;
          const oldQty = currentProd ? currentProd.quantity : 0;
          const newQty = oldQty - deductQty;

          batch.update(prodRef, {
            quantity: newQty,
            updatedAt: new Date().toISOString()
          });

          const actId = `act-${Math.random().toString(36).substring(2, 9)}`;
          const actRef = doc(db, 'activities', actId);
          const activeUser = auth.currentUser;
          const userMail = activeUser?.email || localStorage.getItem('admin_email') || 'system';
          const uid = activeUser?.uid || (window as any).currentUserUid || '';
          batch.set(actRef, {
            id: actId,
            productId: item.productId,
            productName: item.productName || currentProd?.name || 'สินค้า',
            type: 'out',
            quantityChange: -deductQty,
            oldQuantity: oldQty,
            newQuantity: newQty,
            reason: `เบิกตัดยอดประกอบในใบงาน BOM: ${bom.name} (Job: ${bom.jobNo || 'ไม่ระบุ'})`,
            timestamp: new Date().toISOString(),
            userId: uid,
            userName: activeUser?.displayName || (userMail.includes('@') ? userMail.split('@')[0] : userMail),
            userEmail: userMail,
            creatorEmail: userMail,
            productImage: currentProd?.image || ''
          });
        }

        const bomRef = doc(db, 'boms', bom.id);
        batch.update(bomRef, {
          stockDeducted: true,
          status: 'in_progress',
          updatedAt: new Date().toISOString()
        });

        await batch.commit();
        addToast('success', 'เบิกสต็อกสินค้าประกอบสำเร็จ', `หักสต็อกวัตถุดิบประกอบ ${bom.items.length} รายการแล้ว`);
      } catch (err: any) {
        addToast('warning', 'เกิดข้อผิดพลาดตัดสต็อก', err.message);
      } finally {
        setIsDeducting(false);
      }
    };

    if (shortfalls.length > 0) {
      const msg = shortfalls.map(s => `- ${s.productName}: ต้องการ ${s.needed} (มีในสต็อก ${s.available})`).join('\n');
      if (confirm(`⚠️ คำเตือน: สต็อกสินค้าไม่เพียงพอประกอบรายการดังนี้:\n${msg}\n\nคุณยังคงต้องการดำเนินการและยินยอมให้ยอดสต็อกติดลบหรือไม่?`)) {
        await executeDeduction();
      }
    } else {
      if (confirm(`ยืนยันการทำรายการ "หักยอดสต็อกพัสดุจริง" จำนวน ${bom.requiredQuantity} ชุดสำหรับใบงาน BOM "${bom.name}" หรือไม่?`)) {
        await executeDeduction();
      }
    }
  };

  const getStatusBadgeClass = (status?: Bom['status']) => {
    switch (status) {
      case 'in_progress': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'pending':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusThaiLabel = (status?: Bom['status']) => {
    switch (status) {
      case 'in_progress': return 'กำลังประกอบ (In Progress)';
      case 'completed': return 'ผลิตสำเร็จ (Completed)';
      case 'cancelled': return 'ยกเลิก (Cancelled)';
      case 'pending':
      default:
        return 'รอดำเนินการ (Pending)';
    }
  };

  // Filter BOMs
  const filteredBoms = boms.filter(b => {
    const matchesSearch = (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.jobNo && b.jobNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesProject = projectFilter === 'all' || b.jobNo === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className="space-y-2 text-left font-sans">
      
      {/* Title Header Workspace (Unified Dark Banner - Compact) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-3.5 px-5 rounded-2xl relative overflow-hidden border border-slate-800 shadow-lg">
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10 text-left space-y-0.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-[9px] uppercase tracking-widest font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>BOM & ASSEMBLY CENTER</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white font-sans flex items-center gap-2 tracking-tight">
            <Boxes className="h-5 w-5 text-indigo-400 shrink-0" />
            <span>สูตรชิ้นส่วนประกอบพัสดุ & วางแผนผลิต (BOM & Planning)</span>
          </h2>
        </div>

        <div className="z-10 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-300 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
          <Layers className="h-3.5 w-3.5 text-indigo-400" />
          <span>สูตรประกอบในระบบ: <strong className="text-white font-black text-xs">{boms.length}</strong> ชุด</span>
        </div>
      </div>

      {/* Tabs Switcher for BOM & Planning */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-1 shrink-0 z-10 text-xs font-sans font-bold text-slate-500 border border-slate-200 dark:border-slate-800 shadow-inner">
        <button
          onClick={() => setActiveTab('bom')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-sans ${
            activeTab === 'bom'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black'
              : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>แผนประกอบวัตถุดิบ (BOM Workspace)</span>
        </button>
        <button
          onClick={() => setActiveTab('planning')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-sans ${
            activeTab === 'planning'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black'
              : 'hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>จ่ายงาน & รายงานประจำวัน (Job Assignment & Planning)</span>
        </button>
      </div>

      {activeTab === 'bom' ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Bento Scoreboard Bar (Elevated Cards with Icons) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สูตรสะสมทั้งหมด</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">{boms.length} <span className="text-[10px] font-bold text-slate-400">รายการ</span></span>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                <Boxes className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">กำลังประกอบ</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{boms.filter(b => b.status === 'in_progress').length} <span className="text-[10px] font-bold text-slate-400">รายการ</span></span>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
                <Play className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ประกอบเสร็จสิ้น</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{boms.filter(b => b.status === 'completed').length} <span className="text-[10px] font-bold text-slate-400">รายการ</span></span>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เบิกสต็อกพัสดุแล้ว</span>
                <span className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">{boms.filter(b => b.stockDeducted).length} <span className="text-[10px] font-bold text-slate-400">รายการ</span></span>
              </div>
              <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 rounded-xl">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* BOM List Controls Bar (Inline horizontal filters & Search) */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-sans">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่องาน หรือรหัส Job No..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Project Filter Dropdown */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="all">📁 ทุกโปรเจกต์ ({jobProjects.length})</option>
                {jobProjects.map(p => (
                  <option key={p.id} value={p.jobNo}>
                    {p.jobNo} - {p.projectName}
                  </option>
                ))}
              </select>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="all">กรองทุกสถานะ</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="in_progress">กำลังประกอบ</option>
                <option value="completed">ผลิตสำเร็จ</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>

            {/* View Mode & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  onClick={() => setSelectorViewMode('vertical_grid')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    selectorViewMode === 'vertical_grid'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="มองเห็นทุกโปรเจ็คแบบแนวตั้ง"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>แนวตั้ง (ทุกโปรเจกต์)</span>
                </button>
                <button
                  onClick={() => setSelectorViewMode('horizontal')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    selectorViewMode === 'horizontal'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="แสดงแถวสไลด์แนวนอน"
                >
                  <Boxes className="h-3.5 w-3.5" />
                  <span>แนวนอน</span>
                </button>
              </div>

              <button
                onClick={handleOpenNewAssignJob}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>สร้างใบงาน</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-600/15"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>สร้าง BOM ใหม่</span>
              </button>
            </div>
          </div>

          {/* BOM & Projects Selector Container */}
          {selectorViewMode === 'vertical_grid' ? (
            /* VERTICAL ALL-PROJECTS GRID VIEW */
            <div className="bg-slate-50/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 max-h-[460px] overflow-y-auto scrollbar-thin text-left font-sans">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>มองเห็นทุกโปรเจกต์ & BOM แบบแนวตั้ง ({jobProjects.length} โครงการ)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  แสดงสูตรประกอบที่พบ: <strong className="text-indigo-600">{filteredBoms.length}</strong> รายการ
                </span>
              </div>

              {jobProjects.length === 0 && filteredBoms.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60">
                  ไม่พบข้อมูลโปรเจกต์หรือสูตร BOM
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Group BOMs under Job Projects */}
                  {jobProjects
                    .filter(proj => projectFilter === 'all' || proj.jobNo === projectFilter)
                    .map(proj => {
                      const projBoms = filteredBoms.filter(b => b.jobNo === proj.jobNo);
                      return (
                        <div 
                          key={proj.id}
                          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-3xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between space-y-2.5"
                        >
                          {/* Project Card Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {proj.projectImageUrl ? (
                                <img 
                                  src={proj.projectImageUrl} 
                                  alt={proj.jobNo} 
                                  className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0">
                                  <FolderGit2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                              )}
                              <div className="min-w-0 text-left">
                                <span className="font-mono text-[9.5px] font-black px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-900 inline-block">
                                  {proj.jobNo}
                                </span>
                                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mt-0.5">
                                  {proj.projectName}
                                </h4>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  ลูกค้า: {proj.customer || 'ไม่ระบุ'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9.5px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shrink-0">
                              {projBoms.length} BOM
                            </span>
                          </div>

                          {/* BOM Sheets linked under this project */}
                          <div className="space-y-1.5 flex-1 min-h-[40px]">
                            {projBoms.length === 0 ? (
                              <div className="py-2 text-center text-[10.5px] text-slate-400 italic bg-slate-50 dark:bg-slate-950 rounded-lg">
                                ยังไม่มีสูตร BOM สำหรับโปรเจกต์นี้
                              </div>
                            ) : (
                              projBoms.map(bom => {
                                const isActive = activeBom?.id === bom.id;
                                const financials = getBomFinancials(bom);
                                return (
                                  <div
                                    key={bom.id}
                                    onClick={() => setSelectedBom(bom)}
                                    className={`p-2 rounded-lg border text-xs font-sans transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                      isActive
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black'
                                        : 'bg-slate-50/80 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <div className="min-w-0 text-left flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate font-extrabold text-[11px]">{bom.name}</span>
                                        <span className={`text-[8px] font-bold px-1 rounded ${
                                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}>
                                          {getStatusThaiLabel(bom.status).split(' ')[0]}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] font-mono font-bold block mt-0.5 ${isActive ? 'text-indigo-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        ฿{(financials?.totalCost || 0).toLocaleString('th-TH')}
                                      </span>
                                    </div>

                                    {/* Action ADMIN Delete on BOM card */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteBom(bom);
                                        }}
                                        className={`p-1 rounded transition-colors cursor-pointer ${
                                          isActive
                                            ? 'text-white/80 hover:text-white hover:bg-rose-500/80'
                                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950'
                                        }`}
                                        title="ลบรายการ BOM ใบนี้ (สิทธิ์ ADMIN)"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Add BOM shortcut for this job */}
                          <button
                            type="button"
                            onClick={() => {
                              setNewBomJobNo(proj.jobNo);
                              setIsCreateModalOpen(true);
                            }}
                            className="w-full py-1 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950 dark:hover:bg-indigo-950 text-slate-600 hover:text-indigo-700 dark:text-slate-400 dark:hover:text-indigo-300 rounded-lg text-[10px] font-bold border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>เพิ่ม BOM สำหรับ {proj.jobNo}</span>
                          </button>
                        </div>
                      );
                    })}

                  {/* Render Unassigned BOMs if any */}
                  {(() => {
                    const unassignedBoms = filteredBoms.filter(b => !jobProjects.some(p => p.jobNo === b.jobNo));
                    if (unassignedBoms.length === 0) return null;
                    return (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3 shadow-3xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                            BOM อิสระ (ไม่ระบุ Job No)
                          </span>
                          <span className="text-[9.5px] font-black px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full">
                            {unassignedBoms.length} BOM
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {unassignedBoms.map(bom => {
                            const isActive = activeBom?.id === bom.id;
                            const financials = getBomFinancials(bom);
                            return (
                              <div
                                key={bom.id}
                                onClick={() => setSelectedBom(bom)}
                                className={`p-2 rounded-lg border text-xs font-sans transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  isActive
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <div className="min-w-0 text-left flex-1">
                                  <span className="truncate font-bold text-[11px] block">{bom.name}</span>
                                  <span className={`text-[10px] font-mono font-bold block ${isActive ? 'text-indigo-100' : 'text-emerald-600'}`}>
                                    ฿{(financials?.totalCost || 0).toLocaleString('th-TH')}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBom(bom);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="ลบ BOM ใบนี้ (สิทธิ์ ADMIN)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* HORIZONTAL SCROLLABLE ROW */
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin font-sans">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 px-2 flex items-center gap-1">
                <Boxes className="h-3.5 w-3.5 text-indigo-500" />
                <span>เลือกใบงาน BOM:</span>
              </span>
              {filteredBoms.length === 0 ? (
                <span className="text-xs text-slate-400 italic px-2">ไม่พบรายการ BOM</span>
              ) : (
                filteredBoms.map(bom => {
                  const isActive = activeBom?.id === bom.id;
                  const financials = getBomFinancials(bom);
                  const matchingProject = jobProjects?.find(p => p.jobNo === bom.jobNo);
                  return (
                    <div
                      key={bom.id}
                      onClick={() => setSelectedBom(bom)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
                        isActive 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 font-black' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {/* Brand Logo & Job Image */}
                      <div className="flex items-center gap-1 shrink-0">
                        {matchingProject?.projectImageUrl ? (
                          <img 
                            src={matchingProject.projectImageUrl} 
                            alt={bom.jobNo} 
                            className="w-5 h-5 object-cover rounded-md border border-white/20 shrink-0 bg-white" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <FolderGit2 className={`h-3 w-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          </div>
                        )}
                      </div>
                      
                      <span className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {bom.jobNo || 'NO JOB'}
                      </span>
                      <span className="truncate max-w-[130px]">{bom.name}</span>
                      <span className={`text-[10px] font-mono font-black ${isActive ? 'text-indigo-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ฿{(financials?.totalCost || 0).toLocaleString('th-TH')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBom(bom);
                        }}
                        className={`p-1 rounded hover:bg-rose-500/20 transition-colors ml-1 ${isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-rose-600'}`}
                        title="ลบ BOM ใบนี้ (สิทธิ์ ADMIN)"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Core spreadsheet workspace when BOM selected */}
          {activeBom ? (
            <div className="space-y-3.5 animate-in fade-in duration-150 font-sans">
              
              {/* Selected BOM Meta Panel (Flat & Dense) */}
              <div className="bg-slate-50/40 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-black px-1.5 bg-slate-200 text-slate-700 rounded">{activeBom.jobNo || 'NO JOB'}</span>
                    <h3 className="font-black text-slate-800 text-[11.5px]">{activeBom.name}</h3>
                    <span className={`text-[8.5px] font-black px-1.5 border rounded-sm ${getStatusBadgeClass(activeBom.status)}`}>
                      {getStatusThaiLabel(activeBom.status)}
                    </span>
                    {activeBom.stockDeducted && (
                      <span className="text-[8.5px] font-black px-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">เบิกคลังแล้ว</span>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {activeProject && (
                      <button
                        onClick={() => setIsModulesManagerOpen(!isModulesManagerOpen)}
                        className={`px-1.5 py-0.5 border rounded font-bold text-[9.5px] flex items-center gap-1 transition-all ${
                          isModulesManagerOpen
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        <FolderGit2 className="h-3 w-3" />
                        <span>โมดูลโครงการ ({projectModules.length})</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenEditModal}
                      className="p-0.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/80 rounded border border-slate-200/60 bg-slate-100"
                      title="แก้ไขรายละเอียด BOM"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyBom(activeBom)}
                      className="px-1.5 py-0.5 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded font-bold text-[9.5px] bg-slate-100 flex items-center gap-0.5"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      <span>คัดลอก BOM</span>
                    </button>
                    <button
                      onClick={() => handleOpenAssignJob(activeBom)}
                      className="px-1.5 py-0.5 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded font-bold text-[9.5px] bg-slate-100 flex items-center gap-0.5"
                    >
                      <Briefcase className="h-2.5 w-2.5" />
                      <span>สร้างใบงาน</span>
                    </button>
                    {!activeBom.stockDeducted ? (
                      <button
                        onClick={() => handleDeductBomStock(activeBom)}
                        disabled={isDeducting}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9.5px] font-black cursor-pointer flex items-center gap-0.5"
                      >
                        {isDeducting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
                        <span>เบิกพัสดุประกอบ</span>
                      </button>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded border border-emerald-100">ประกอบสต็อกแล้ว</span>
                    )}
                    <button
                      onClick={() => handleDeleteBom(activeBom)}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:border-rose-900 rounded font-black text-[9.5px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105"
                      title="ลบสูตร BOM ใบนี้ (สิทธิ์ ADMIN)"
                    >
                      <Trash2 className="h-3 w-3 text-rose-600" />
                      <span>ลบ BOM (ADMIN)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  <div className="md:col-span-3">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">รายละเอียดใบงาน:</span>
                    <p className="text-slate-600 mt-0.5 text-[10.5px]">{activeBom.description || 'ไม่มีคำอธิบายเกี่ยวกับใบงานนี้'}</p>
                  </div>

                  {/* Multiply Qty sets */}
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">จำนวนชุดประกอบ:</span>
                    <input
                      type="number"
                      min={1}
                      value={activeBom.requiredQuantity || 1}
                      onChange={async (e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        await updateDoc(doc(db, 'boms', activeBom.id), { requiredQuantity: val });
                      }}
                      className="w-12 text-center font-bold text-xs text-indigo-700 bg-white border border-slate-200 rounded py-0.2"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">ชุด</span>
                  </div>
                </div>

                {/* Sub Financial scoreboard */}
                {(() => {
                  const fin = getBomFinancials(activeBom);
                  const multiplier = activeBom.requiredQuantity || 1;
                  return (
                    <div className="flex flex-wrap items-center gap-4 pt-1.5 border-t border-slate-100 text-[10px]">
                      <div>วัสดุในสูตร: <strong className="text-slate-700">{activeBom.items.length} ชิ้นส่วน</strong></div>
                      <div>ต้นทุนประกอบต่อชุด: <strong className="text-indigo-600">฿{(fin?.totalCost || 0).toLocaleString('th-TH')}</strong></div>
                      <div>ต้นทุนสุทธิรวม ({multiplier} ชุด): <strong className="text-indigo-950 text-xs">฿{((fin?.totalCost || 0) * multiplier).toLocaleString('th-TH')}</strong></div>
                    </div>
                  );
                })()}

                {/* Shortages Alert & PR suggestion list */}
                {(() => {
                  const shortages = activeBom.items.filter(item => {
                    const p = products.find(prod => prod.id === item.productId);
                    const currentQtyInStock = p ? p.quantity : 0;
                    const requiredTotal = item.quantity * (activeBom.requiredQuantity || 1);
                    return currentQtyInStock < requiredTotal;
                  });

                  if (shortages.length === 0) {
                    return (
                      <div className="p-1 px-2 bg-emerald-50/50 border border-emerald-100 rounded text-emerald-800 text-[10px]">
                        ✓ คลังสต็อกสินค้าพร้อมประกอบครบถ้วน (พัสดุในระบบเพียงพอประกอบครบ {activeBom.requiredQuantity || 1} ชุด)
                      </div>
                    );
                  }

                  return (
                    <div className="p-1 px-2 bg-amber-50/50 border border-amber-100 rounded text-[10px] text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>
                        มีพัสดุสต็อกสะสม <strong>ขาดแคลนไม่พอประกอบ {shortages.length} รายการ</strong> โปรดดำเนินการกดปุ่ม <strong>"เปิดใบติดตาม"</strong> ที่บรรทัดพัสดุข้างล่างเพื่อเสนอจัดซื้อด่วน
                      </span>
                    </div>
                  );
                })()}

                {/* Collapsible Project Modules Manager */}
                {isModulesManagerOpen && activeProject && (
                  <div className="mt-2 p-3 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
                        <FolderGit2 className="h-4 w-4 text-indigo-600" />
                        <span>จัดการระบบโมดูลประจำโครงการ: <strong className="font-mono text-indigo-700">{activeProject.jobNo}</strong> ({activeProject.projectName})</span>
                      </div>
                      <button 
                        onClick={() => setIsModulesManagerOpen(false)} 
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ProjectModulesManager
                      proj={activeProject}
                      onEditJobProject={onEditJobProject!}
                      addToast={addToast}
                      onAddMediaFile={onAddMediaFile}
                    />
                  </div>
                )}
              </div>

              {/* Inline Expandable Form (Flat & Compact) */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[11px] font-sans space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-black text-slate-700 flex items-center gap-1">📋 บรรจุพัสดุอุปกรณ์ลงรายการ BOM:</span>
                  
                  {isAddingGroup ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newGroupNameInput}
                        onChange={(e) => setNewGroupNameInput(e.target.value)}
                        placeholder="โมดูลย่อย เช่น PLC, หน้าจอ"
                        className="px-1.5 py-0.2 border border-indigo-300 rounded text-[10.5px] w-36"
                        onKeyDown={handleAddNewGroupNameInput}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          handleAddNewGroup(newGroupNameInput);
                          setNewGroupNameInput('');
                        }}
                        className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9.5px] font-bold"
                      >
                        เพิ่ม
                      </button>
                      <button onClick={() => setIsAddingGroup(false)} className="text-slate-400"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingGroup(true)}
                      className="px-1.5 py-0.2 text-indigo-700 hover:bg-indigo-50 border border-indigo-150 rounded text-[9.5px] font-bold"
                    >
                      + เพิ่มโมดูลใหม่ใน BOM
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5">
                  {/* Select Product */}
                  <div className="md:col-span-5">
                    <GroupedProductSelect
                      products={products}
                      categories={categories}
                      selectedValue={worksheetSelectedProductId}
                      onChange={handleSelectWorksheetProduct}
                      placeholder="-- ค้นหาวัตถุดิบหลักที่จะดึงมาประกอบ --"
                    />
                  </div>

                  {/* Group Select */}
                  <div className="md:col-span-3">
                    <select
                      value={worksheetAddGroup}
                      onChange={(e) => setWorksheetAddGroup(e.target.value)}
                      className="w-full py-0.8 px-2 bg-white border border-slate-200 rounded text-[11px] focus:outline-none font-bold"
                    >
                      <option value="โมดูลทั่วไป">โมดูลทั่วไป (General)</option>
                      {projectModules.map(pm => {
                        const val = `${pm.code} - ${pm.name}`;
                        return (
                          <option key={pm.code} value={val}>
                            📦 {val}
                          </option>
                        );
                      })}
                      {getBomGroups(activeBom)
                        .filter(g => !projectModules.some(pm => `${pm.code} - ${pm.name}` === g))
                        .map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1.5 flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={worksheetAddQty}
                      onChange={(e) => setWorksheetAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="จำนวน"
                      className="w-full py-0.8 px-1.5 bg-white border border-slate-200 rounded text-[11px] font-bold text-center"
                    />
                    <input
                      type="text"
                      value={worksheetAddUnit}
                      onChange={(e) => setWorksheetAddUnit(e.target.value)}
                      placeholder="หน่วย"
                      className="w-12 py-0.8 px-1 bg-white border border-slate-200 rounded text-[11px] text-center"
                    />
                  </div>

                  {/* Add button */}
                  <div className="md:col-span-2.5">
                    <button
                      type="button"
                      onClick={handleAddItemToBom}
                      className="w-full py-0.8 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-black cursor-pointer flex items-center justify-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> บรรจุสินค้าลง BOM
                    </button>
                  </div>
                </div>
              </div>

              {/* Spreadsheet Table (Flat & Dense, Low Padding) */}
              <div className="overflow-x-auto">
                {activeBom.items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    ยังไม่มีรายการพัสดุในใบงาน BOM นี้ เลือกพัสดุและจัดโมดูลเพื่อบันทึกรายการ
                  </div>
                ) : (
                  (() => {
                    const itemsByGroup: { [grp: string]: { originalIndex: number; item: BomItem }[] } = {};
                    activeBom.items.forEach((item, originalIndex) => {
                      const rawGrpName = item.group || 'โมดูลทั่วไป';
                      const grpName = rawGrpName === 'ทั่วไป' ? 'โมดูลทั่วไป' : rawGrpName;
                      if (!itemsByGroup[grpName]) {
                        itemsByGroup[grpName] = [];
                      }
                      itemsByGroup[grpName].push({ originalIndex, item });
                    });

                    const groups = Object.keys(itemsByGroup).sort((a, b) => {
                      if (a === 'โมดูลทั่วไป') return 1;
                      if (b === 'โมดูลทั่วไป') return -1;
                      return (a || '').localeCompare(b || '');
                    });

                    return (
                      <div className="divide-y divide-slate-100">
                        {groups.map(grp => {
                          const list = itemsByGroup[grp];
                          return (
                            <div key={grp} className="py-1 px-0.5 text-left space-y-1">
                              <div className="flex items-center gap-1 font-black text-slate-700 text-[12px] uppercase border-b border-slate-100 pb-1">
                                <span>📦 โมดูล: {grp}</span>
                                <span className="text-slate-400">({list.length} รายการพัสดุ)</span>
                              </div>

                              <table className="w-full text-left border-collapse text-[13px] font-sans min-w-[850px]">
                                <thead>
                                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-1 px-1.5 min-w-[200px]">รายละเอียดชิ้นส่วน / Code</th>
                                    <th className="py-1 px-1.5 w-[290px] text-center">ลำดับติดตามสถานะจัดซื้อ</th>
                                    <th className="py-1 px-1.5 text-center w-[100px]">จำนวนใช้ต่อชุด</th>
                                    <th className="py-1 px-1.5 text-center w-[80px]">หน่วย</th>
                                    <th className="py-1 px-1.5 text-right w-[110px]">ราคาทุนรวม</th>
                                    <th className="py-1 px-1.5 text-center w-[135px]">ย้ายโมดูล</th>
                                    <th className="py-1 px-1.5 text-right w-[45px]">ลบ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {list.map(({ originalIndex, item }) => {
                                    const p = products.find(prod => prod.id === item.productId);
                                    const currentQtyInStock = p ? p.quantity : 0;
                                    const requiredTotal = item.quantity * (activeBom.requiredQuantity || 1);
                                    const itemCost = item.priceUnit !== undefined ? item.priceUnit : (p?.costPrice || 0);
                                    const costTotal = itemCost * item.quantity * (activeBom.requiredQuantity || 1);

                                    const matchedOrders = orders.filter(o => 
                                      (item.prNo && o.prNo === item.prNo) || 
                                      (item.poNo && o.poNo === item.poNo) ||
                                      (o.productId === item.productId && activeBom.jobNo && o.jobNo === activeBom.jobNo)
                                    );

                                    return (
                                      <tr key={originalIndex} className="hover:bg-slate-50/40 transition-colors h-[50px]">
                                        
                                        {/* Product info (Now First Column) */}
                                        <td className="py-0.5 px-1.5 font-bold text-slate-800">
                                          <div className="flex items-center gap-2">
                                            {p?.image && (
                                              <img src={p.image} alt="" className="w-[36px] h-[36px] rounded object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                                            )}
                                            <div>
                                              <div className="line-clamp-1 text-[13px]">{item.productName}</div>
                                              <div className="text-[11px] text-slate-400 font-normal">
                                                Code: {p?.sku || '-'} | <span className={currentQtyInStock < requiredTotal ? 'text-rose-600 font-extrabold' : 'text-emerald-700 font-extrabold'}>คงเหลือสต็อก: {currentQtyInStock} {item.unit || 'ชิ้น'}</span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenAssignJobFromItem(item.productName)}
                                                className="mt-0.5 inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-300 rounded font-black text-[9px] cursor-pointer transition-all shadow-3xs"
                                              >
                                                <Briefcase className="h-2 w-2" />
                                                <span>ใบงานจาก อุปกรณ์นี้</span>
                                              </button>
                                            </div>
                                          </div>
                                        </td>

                                        {/* PO Tracking Button (Now Second Column, Right after Part Details) */}
                                        <td className="py-1.5 px-1.5">
                                          {matchedOrders.length > 0 ? (() => {
                                            const firstOrder = matchedOrders[0];
                                            let statusStepIndex = 0;
                                            switch (firstOrder.status) {
                                              case 'pending': statusStepIndex = 1; break;
                                              case 'quotation': statusStepIndex = 2; break;
                                              case 'ordered': statusStepIndex = 3; break;
                                              case 'approved': statusStepIndex = 4; break;
                                              case 'paid': statusStepIndex = 5; break;
                                              case 'received': statusStepIndex = 6; break;
                                              case 'cancelled': statusStepIndex = -1; break;
                                            }

                                            if (statusStepIndex === -1) {
                                              return (
                                                <button
                                                  type="button"
                                                  onClick={() => setViewingOrder(firstOrder)}
                                                  className="text-[10.5px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded cursor-pointer w-full text-center hover:bg-rose-100 transition-colors"
                                                >
                                                  ยกเลิกจัดซื้อ
                                                </button>
                                              );
                                            }

                                            const steps = [
                                              { step: 1, label: 'ขอซื้อ' },
                                              { step: 2, label: 'เสนอราคา' },
                                              { step: 3, label: 'PR/PO' },
                                              { step: 4, label: 'อนุมัติ' },
                                              { step: 5, label: 'โอนเงิน' },
                                              { step: 6, label: 'รับพัสดุ' }
                                            ];

                                            return (
                                              <div 
                                                className="flex items-center justify-center gap-0.5 bg-slate-50 border border-slate-100 p-0.5 rounded-md cursor-pointer hover:bg-slate-100 transition-all select-none"
                                                onClick={() => setViewingOrder(firstOrder)}
                                                title={`คลิกเพื่อดูรายละเอียด: ${firstOrder.orderTitle}`}
                                              >
                                                {steps.map((st, idx) => {
                                                  const isCompleted = statusStepIndex >= st.step;
                                                  const isCurrent = statusStepIndex === st.step;
                                                  return (
                                                    <React.Fragment key={st.step}>
                                                      <span 
                                                        className={`px-1 py-0.2 text-[9.5px] leading-none rounded-2xs font-sans font-black transition-all ${
                                                          isCurrent 
                                                            ? 'bg-indigo-600 text-white font-black border border-indigo-600 shadow-3xs'
                                                            : isCompleted
                                                              ? 'bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-100'
                                                              : 'bg-white text-slate-400 border border-slate-200 font-normal'
                                                        }`}
                                                        title={st.label}
                                                      >
                                                        {st.label}
                                                      </span>
                                                      {idx < steps.length - 1 && (
                                                        <span className="text-[8.5px] text-slate-300 font-normal select-none">→</span>
                                                      )}
                                                    </React.Fragment>
                                                  );
                                                })}
                                              </div>
                                            );
                                          })() : (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenQuickRequisition(originalIndex)}
                                              className={`w-full py-1 text-[10.5px] font-black rounded-md cursor-pointer shadow-3xs border transition-all hover:scale-102 flex items-center justify-center gap-0.5 ${
                                                currentQtyInStock < requiredTotal
                                                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 font-extrabold'
                                                  : 'bg-white hover:bg-indigo-50/50 text-indigo-700 border-indigo-200'
                                              }`}
                                            >
                                              <Plus className="h-2.5 w-2.5" /> เปิดใบติดตาม
                                            </button>
                                          )}
                                        </td>

                                        {/* Quantity */}
                                        <td className="py-1 px-1.5 text-center">
                                          <InlineInput
                                            type="number"
                                            value={item.quantity}
                                            className="text-center font-bold text-slate-800 bg-slate-50 w-12 mx-auto py-0 text-[13px]"
                                            onSave={(val) => handleUpdateItemField(originalIndex, 'quantity', Math.max(1, parseInt(val) || 1))}
                                          />
                                        </td>

                                        {/* Unit */}
                                        <td className="py-1 px-1.5 text-center">
                                          <InlineInput
                                            value={item.unit || 'ชิ้น'}
                                            className="text-center bg-slate-50 py-0 text-[13px]"
                                            onSave={(val) => handleUpdateItemField(originalIndex, 'unit', val.trim() || 'ชิ้น')}
                                          />
                                        </td>

                                        {/* Cost */}
                                        <td className="py-1 px-1.5 text-right font-bold text-slate-700 font-mono text-[13px]">
                                          ฿{(costTotal || 0).toLocaleString('th-TH')}
                                        </td>

                                        {/* Group selector */}
                                        <td className="py-1 px-1.5 text-center">
                                          <select
                                            value={item.group === 'ทั่วไป' ? 'โมดูลทั่วไป' : (item.group || 'โมดูลทั่วไป')}
                                            onChange={(e) => handleUpdateItemField(originalIndex, 'group', e.target.value)}
                                            className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold focus:outline-none cursor-pointer"
                                          >
                                            <option value="โมดูลทั่วไป">โมดูลทั่วไป (General)</option>
                                            {projectModules.map(pm => {
                                              const val = `${pm.code} - ${pm.name}`;
                                              return (
                                                <option key={pm.code} value={val}>
                                                  📦 {val}
                                                </option>
                                              );
                                            })}
                                            {getBomGroups(activeBom)
                                              .filter(g => !projectModules.some(pm => `${pm.code} - ${pm.name}` === g || pm.name === g || pm.code === g))
                                              .map(g => (
                                                <option key={g} value={g}>{g}</option>
                                              ))
                                            }
                                          </select>
                                        </td>

                                        {/* Delete */}
                                        <td className="py-1 px-1.5 text-right">
                                          <button
                                            onClick={() => handleDeleteItem(originalIndex)}
                                            className="p-1 text-slate-300 hover:text-rose-600 rounded"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </td>

                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
              กรุณาเลือกใบงาน BOM จากแทบดึงข้อมูลข้างต้นเพื่อเริ่มทำงานประกอบ
            </div>
          )}

        </div>
      ) : (
        <div className="animate-in fade-in duration-150">
          <JobAssignmentView
            jobs={jobs}
            onAddJob={onAddJob!}
            onEditJob={onEditJob!}
            onDeleteJob={onDeleteJob!}
            employees={employees}
            onAddEmployee={onAddEmployee!}
            onEditEmployee={onEditEmployee!}
            onDeleteEmployee={onDeleteEmployee!}
            jobProjects={jobProjects}
            onAddJobProject={onAddJobProject!}
            onEditJobProject={onEditJobProject!}
            onDeleteJobProject={onDeleteJobProject!}
            dailyReports={dailyReports}
            onAddDailyReport={onAddDailyReport!}
            onEditDailyReport={onEditDailyReport!}
            onDeleteDailyReport={onDeleteDailyReport!}
          />
        </div>
      )}

      {/* Modal: Create BOM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1">➕ สร้างแผ่นงาน BOM ใบใหม่</span>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreateBomSubmit} className="space-y-3 text-[11px] font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ชื่อใบงานประกอบสินค้า *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตู้ควบคุมคอนโทรลหลัก MDB"
                  value={newBomName}
                  onChange={(e) => setNewBomName(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">หมายเลข Job (Job No.)</label>
                  <input
                    type="text"
                    placeholder="เช่น Job-2026-001"
                    value={newBomJobNo}
                    onChange={(e) => setNewBomJobNo(e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">จำนวนชุดตั้งต้น *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBomRequiredQuantity}
                    onChange={(e) => setNewBomRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">คำอธิบายเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="วัตถุประสงค์ หรือหมายเหตุแนบท้าย..."
                  value={newBomDescription}
                  onChange={(e) => setNewBomDescription(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded">ยกเลิก</button>
                <button type="submit" className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded">บันทึกสร้าง BOM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit BOM */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800">📝 แก้ไขข้อมูลใบงาน BOM</span>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEditBomSubmit} className="space-y-3 text-[11px] font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ชื่อใบงานประกอบพัสดุ *</label>
                <input
                  type="text"
                  required
                  value={editBomName}
                  onChange={(e) => setEditBomName(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">รหัส Job No.</label>
                  <input
                    type="text"
                    value={editBomJobNo}
                    onChange={(e) => setEditBomJobNo(e.target.value)}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">สถานะผลิตประกอบ *</label>
                  <select
                    value={editBomStatus}
                    onChange={(e) => setEditBomStatus(e.target.value as any)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                  >
                    <option value="pending">รอดำเนินการ (Pending)</option>
                    <option value="in_progress">กำลังประกอบ (In Progress)</option>
                    <option value="completed">ผลิตสำเร็จ (Completed)</option>
                    <option value="cancelled">ยกเลิก (Cancelled)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">จำนวนชุดประกอบ</label>
                <input
                  type="number"
                  min={1}
                  value={editBomRequiredQuantity}
                  onChange={(e) => setEditBomRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">คำอธิบายสูตรพัสดุ</label>
                <textarea
                  rows={2}
                  value={editBomDescription}
                  onChange={(e) => setEditBomDescription(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded">ยกเลิก</button>
                <button type="submit" className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Copy BOM */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800">📋 คัดลอกและสร้างใบงาน BOM ใหม่</span>
              <button onClick={() => { setIsCopyModalOpen(false); setBomToCopy(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmCopyBom} className="space-y-3 text-[11px] font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ชื่อใบงานประกอบพัสดุใหม่ *</label>
                <input
                  type="text"
                  required
                  value={copyBomName}
                  onChange={(e) => setCopyBomName(e.target.value)}
                  placeholder="ชื่อใบงานสำหรับ BOM ที่คัดลอก"
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">รหัส Job No.</label>
                  <input
                    type="text"
                    value={copyBomJobNo}
                    onChange={(e) => setCopyBomJobNo(e.target.value)}
                    placeholder="เช่น JOB-2026-xxx"
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">จำนวนชุดประกอบ *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={copyBomRequiredQuantity}
                    onChange={(e) => setCopyBomRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">คำอธิบายสูตรพัสดุ</label>
                <textarea
                  rows={2}
                  value={copyBomDescription}
                  onChange={(e) => setCopyBomDescription(e.target.value)}
                  placeholder="รายละเอียดประกอบเพิ่มเติม..."
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCopyModalOpen(false); setBomToCopy(null); }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded"
                >
                  ยืนยันสร้าง BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Purchase Requisition Form */}
      {isRequisitionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xl max-w-2xl w-full text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-3">
              <span className="text-xs font-black text-slate-850 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-indigo-600" /> กรอกข้อมูลใบเสนอจัดซื้อพัสดุ (เชื่อมโยง BOM)
              </span>
              <button onClick={() => setIsRequisitionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitQuickRequisition} className="space-y-3 text-[11px] font-sans">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Requester name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">ผู้ขอซื้อ / แผนกงาน *</label>
                  <select
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
                    value={reqRequester}
                    onChange={(e) => setReqRequester(e.target.value)}
                  >
                    <option value="">-- เลือกผู้ขอซื้อ --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchaser name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">คนจัดซื้อ / ผู้ดำเนินการ</label>
                  <select
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
                    value={reqPurchaserName}
                    onChange={(e) => setReqPurchaserName(e.target.value)}
                  >
                    <option value="">-- เลือกคนจัดซื้อ --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Job.No (หมายเลขงาน)</label>
                  <select
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer font-mono font-bold"
                    value={reqJobNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReqJobNo(val);
                      const matchedProj = jobProjects.find(p => p.jobNo === val);
                      if (matchedProj) {
                        setReqJobName(matchedProj.projectName);
                      } else {
                        setReqJobName('');
                      }
                      if (val) {
                        setReqPrNo(`PR-${val}-${Math.floor(1000 + Math.random() * 9000)}`);
                      } else {
                        setReqPrNo('');
                      }
                    }}
                  >
                    <option value="">-- เลือกหมายเลขงาน --</option>
                    {jobProjects.map((p) => (
                      <option key={p.id} value={p.jobNo}>
                        {p.jobNo} {p.projectName ? `- ${p.projectName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Job.Name (ชื่องาน)</label>
                  <input
                    type="text"
                    disabled
                    placeholder="จะเลือกตามหมายเลขงานอัตโนมัติ"
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-600 font-medium"
                    value={reqJobName || ''}
                  />
                </div>

                {/* Link to Inventory Product */}
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-600">เชื่อมโยงสินค้าที่มีอยู่ในคลังสต็อก</label>
                  <select
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs cursor-pointer"
                    value={reqSelectedProductId || ''}
                    onChange={(e) => setReqSelectedProductId(e.target.value)}
                  >
                    <option value="">-- เป็นสินค้าพัสดุภายนอก (ไม่ได้เก็บสต็อก) --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `[${p.sku}]` : ''} - คลัง: {p.quantity} {p.unit || 'ชิ้น'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order item title */}
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-600">ชื่อรายการพัสดุที่ขอสั่งซื้อ *</label>
                  <input
                    type="text"
                    required
                    disabled={!!reqSelectedProductId}
                    placeholder="ระบุชื่อพัสดุ อุปกรณ์ หรืออะไหล่"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={reqOrderTitle || ''}
                    onChange={(e) => setReqOrderTitle(e.target.value)}
                  />
                </div>

                {/* Qty */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">จำนวนสั่ง *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold"
                    value={reqQty}
                    onChange={(e) => setReqQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                {/* Unit */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">หน่วยนับ</label>
                  <input
                    type="text"
                    disabled={!!reqSelectedProductId}
                    placeholder="ชิ้น, ตัว, ม้วน"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={reqUnit || ''}
                    onChange={(e) => setReqUnit(e.target.value)}
                  />
                </div>

                {/* Price Per Unit */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">ราคาประเมินต่อหน่วย (฿)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="เช่น 150"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-indigo-700"
                    value={reqPriceUnit || ''}
                    onChange={(e) => setReqPriceUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                {/* PR No. */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">เลขที่ใบเสนอซื้อ (PR No.) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุเลขที่ใบเสนอซื้อ PR"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold"
                    value={reqPrNo || ''}
                    onChange={(e) => setReqPrNo(e.target.value)}
                  />
                </div>

                {/* Remark / Link */}
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-600">หมายเหตุ / รายละเอียดจัดซื้อเพิ่มเติม</label>
                  <input
                    type="text"
                    placeholder="ระบุรายละเอียดแนบเพิ่มเติม หรือลิงก์เสนอซื้อ"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={reqRemark || ''}
                    onChange={(e) => setReqRemark(e.target.value)}
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                {reqPriceUnit > 0 && (
                  <span className="text-xs text-slate-500 font-bold mr-auto self-center font-sans">
                    ประมาณราคารวม: <strong className="text-indigo-600 font-mono">฿{((reqPriceUnit || 0) * (reqQty || 0)).toLocaleString('th-TH')}</strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsRequisitionModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-250 rounded text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-black cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Plus className="h-3 w-3" /> สร้างคำเสนอซื้อ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Order Details */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800">📦 รายละเอียดการจัดซื้อและจัดส่งของ</span>
              <button onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 text-[11px] font-sans text-slate-700">
              <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                <div className="font-bold text-slate-900 text-xs">{viewingOrder.orderTitle}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                  PR No: <span className="font-mono text-indigo-700 font-extrabold">{viewingOrder.prNo || '-'}</span> | PO No: <span className="font-mono text-purple-700 font-extrabold">{viewingOrder.poNo || '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div>ผู้ขอซื้อ: <strong className="text-slate-800">{viewingOrder.requesterName}</strong></div>
                <div>สถานะจัดซื้อ: <strong className="text-indigo-600">{getOrderThaiLabel(viewingOrder.status)}</strong></div>
                <div>จำนวน: <strong className="text-slate-800">{viewingOrder.quantity} {viewingOrder.unit || 'ชิ้น'}</strong></div>
                <div>ราคาประเมิน: <strong className="text-slate-800">฿{viewingOrder.totalPrice?.toLocaleString('th-TH') || '-'}</strong></div>
              </div>
              {viewingOrder.remark && (
                <div className="text-[10px] text-slate-500 italic mt-1">
                  หมายเหตุจัดซื้อ: {viewingOrder.remark}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Job Assignment (ใบงาน) */}
      {isAssignJobModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1">💼 ใบงาน (Work Order)</span>
              <button onClick={() => setIsAssignJobModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleConfirmAssignJob} className="space-y-3 text-[11px] font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">หมายเลข Job (Job No.)</label>
                {jobProjects && jobProjects.length > 0 ? (
                  <select
                    value={assignJobNo || ''}
                    onChange={(e) => setAssignJobNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {jobProjects.map(proj => (
                      <option key={proj.id} value={proj.jobNo}>
                        {proj.jobNo} | {proj.projectName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={assignJobNo || ''}
                    onChange={(e) => setAssignJobNo(e.target.value)}
                    placeholder="ระบุหมายเลข Job No..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-700"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">โมดูล / อุปกรณ์ *</label>
                <input
                  type="text"
                  required
                  value={assignModuleName || ''}
                  onChange={(e) => setAssignModuleName(e.target.value)}
                  placeholder="เช่น ออกแบบ PLC logic, เชื่อมโครงฐานล่าง..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                {/* Helper for selecting registered modules or BOM sheets */}
                {(() => {
                  const currentProj = jobProjects?.find(p => p.jobNo === assignJobNo);
                  const currentProjModules = normalizeModules(currentProj?.modules || []);
                  
                  const sortedProjModules = [...currentProjModules].sort((a, b) => {
                    const cleanA = a.code.replace(/^\D+/g, '');
                    const cleanB = b.code.replace(/^\D+/g, '');
                    const numA = parseInt(cleanA, 10);
                    const numB = parseInt(cleanB, 10);
                    if (!isNaN(numA) && !isNaN(numB)) {
                      if (numA !== numB) return numA - numB;
                    }
                    return (a?.code || '').localeCompare(b?.code || '', undefined, { numeric: true, sensitivity: 'base' });
                  });

                  const relatedBoms = boms ? boms.filter(bom => bom.jobNo === assignJobNo) : [];

                  if (sortedProjModules.length > 0 || relatedBoms.length > 0) {
                    return (
                      <div className="mt-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded space-y-1.5 max-h-[140px] overflow-y-auto">
                        {sortedProjModules.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] text-indigo-700 font-extrabold block">เลือกจากโมดูลที่ลงทะเบียนไว้:</span>
                            <div className="flex flex-wrap gap-1">
                              {sortedProjModules.map((m, idx) => {
                                const moduleStr = `${m.code} - ${m.name}`;
                                const isSelected = assignModuleName === moduleStr || assignModuleName === m.name;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setAssignModuleName(moduleStr)}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
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
                          <div className="space-y-1 pt-1 border-t border-slate-200/50">
                            <span className="text-[9px] text-amber-700 font-extrabold block">หรือเลือกจากรายการ BOM:</span>
                            <div className="flex flex-wrap gap-1">
                              {relatedBoms.map((bom) => {
                                const isSelected = assignModuleName === bom.name;
                                return (
                                  <button
                                    key={bom.id}
                                    type="button"
                                    onClick={() => {
                                      setAssignModuleName(bom.name);
                                      if (!assignDescription) {
                                        setAssignDescription(`ประกอบพัสดุตามสูตร BOM: ${bom.name}`);
                                      }
                                    }}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer ${
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

              <div className="space-y-1">
                <label className="font-bold text-slate-600">ผู้รับผิดชอบประกอบสินค้า *</label>
                <select
                  required
                  value={assignAssignee || ''}
                  onChange={(e) => setAssignAssignee(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- กรุณาเลือกผู้รับผิดชอบ --</option>
                  {(employees || []).map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role || 'ช่าง'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">รายละเอียดคำสั่งงาน</label>
                <textarea
                  rows={2}
                  value={assignDescription || ''}
                  onChange={(e) => setAssignDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="รายละเอียด หรือคำสั่งงานเพิ่มเติมสำหรับการประกอบชิ้นงาน"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">ความสำคัญ</label>
                  <select
                    value={assignPriority || 'medium'}
                    onChange={(e) => setAssignPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="low">ต่ำ (Low)</option>
                    <option value="medium">ปกติ (Medium)</option>
                    <option value="high">ด่วนมาก (High)</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">กำหนดเสร็จงาน</label>
                  <input
                    type="date"
                    value={assignTargetDate || ''}
                    onChange={(e) => setAssignTargetDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignJobModalOpen(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-black cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Briefcase className="h-3 w-3" /> ยืนยันบันทึกใบงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
