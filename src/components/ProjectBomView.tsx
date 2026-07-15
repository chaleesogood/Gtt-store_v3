import React, { useState, useEffect, useMemo } from 'react';
import { Product, Bom, BomItem, Category, JobProject, ProductOrder, normalizeModules } from '../types';
import Logo from './Logo';
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
  ArrowUpDown
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';

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
      p.name.toLowerCase().includes(term) ||
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
                      <span>SKU: {p.sku || '-'} | แบรนด์: {p.brand || 'ทั่วไป'}</span>
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
}

function ProjectModulesManager({ proj, onEditJobProject, addToast }: ProjectModulesManagerProps) {
  const modules = normalizeModules(proj.modules);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
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
                            handleUploadImage(m.code, reader.result as string);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-in fade-in duration-200">
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
  onDeleteJobProject
}: ProjectBomViewProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'bom' | 'projects'>('bom');

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
  const [isDeducting, setIsDeducting] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

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

  // Worksheet element states
  const [worksheetSelectedProductId, setWorksheetSelectedProductId] = useState('');
  const [worksheetAddQty, setWorksheetAddQty] = useState<number>(1);
  const [worksheetAddUnit, setWorksheetAddUnit] = useState('ชิ้น');
  const [worksheetAddRemark, setWorksheetAddRemark] = useState('');
  const [worksheetAddGroup, setWorksheetAddGroup] = useState('ทั่วไป');
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
      if (item.group) list.add(item.group);
    });
    return Array.from(list).filter(g => g !== 'ทั่วไป');
  };

  const filteredProjects = useMemo(() => {
    return jobProjects.filter(p => {
      const q = projSearch.toLowerCase();
      return (
        p.jobNo.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q)
      );
    });
  }, [jobProjects, projSearch]);

  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projJobNo.trim() || !projCustomer.trim() || !projName.trim()) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลโครงการให้ครบถ้วน');
      return;
    }
    if (jobProjects.some(p => p.jobNo.toLowerCase() === projJobNo.trim().toLowerCase())) {
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
        addToast('success', 'เพิ่มโครงการหลักสำเร็จ', `สร้างรหัสโครงการ ${projJobNo} เรียบร้อยแล้ว`);
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
        addToast('success', 'ปรับปรุงโครงการสำเร็จ', `อัปเดตข้อมูลโครงการหลักเรียบร้อย`);
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
    addToast('success', 'เพิ่มกลุ่มชั่วคราวสำเร็จ', `ตั้งกลุ่มใหม่เป็น "${gName.trim()}"`);
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
      addToast('success', 'เพิ่มพัสดุลง BOM สำเร็จ', `บรรจุ "${matchedProd.name}" เข้ากลุ่ม "${worksheetAddGroup}" แล้ว`);
      
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
    if (!confirm(`ต้องการนำ "${item.productName}" ออกจากสูตรประกอบนี้หรือไม่?`)) return;

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
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อใบเสนอสูตรพัสดุ BOM');
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
      addToast('success', 'สร้างสูตรประกอบ BOM สำเร็จ', `เริ่มต้นใบงานประกอบ "${newBomName}" เรียบร้อยแล้ว`);
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

  // Copy Existing BOM Sheet
  const handleCopyBom = async (targetBom: Bom) => {
    const cName = `${targetBom.name} (คัดลอกใหม่)`;
    const bomId = `bom-${Math.random().toString(36).substring(2, 9)}`;
    const newBom: Bom = {
      ...targetBom,
      id: bomId,
      name: cName,
      stockDeducted: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateLocalBoms(prev => [newBom, ...prev]);

    try {
      await setDoc(doc(db, 'boms', bomId), cleanUndefined(newBom));
      addToast('success', 'ทำสำเนา BOM สำเร็จ', `คัดลอกรายการวัตถุดิบและกลุ่มประกอบไปยังใบงานใหม่แล้ว`);
      setSelectedBom(newBom);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', err.message);
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
    if (!confirm(`คุณแน่ใจว่าต้องการลบใบงานประกอบสูตร BOM "${targetBom.name}" หรือไม่? ข้อมูลทั้งหมดจะถูกลบ`)) return;

    updateLocalBoms(prev => prev.filter(b => b.id !== targetBom.id));

    try {
      await deleteDoc(doc(db, 'boms', targetBom.id));
      addToast('info', 'ลบใบงานสำเร็จ', `นำข้อมูล BOM ${targetBom.name} ออกจากระบบเรียบร้อย`);
      setSelectedBom(null);
    } catch (err: any) {
      addToast('warning', 'ผิดพลาด', err.message);
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
    setReqRequester(localStorage.getItem('admin_email') || 'ฝ่ายวิศวกรรม/ประกอบ');
    setReqPrNo(`PR-${activeBom.jobNo || 'BOM'}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReqRemark(`ขอจัดซื้อสำหรับประกอบสูตร BOM: ${activeBom.name} (Job: ${activeBom.jobNo || 'ไม่ระบุ'})`);
    
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
      orderTitle: item.productName,
      status: 'pending',
      quantity: reqQty,
      unit: item.unit || 'ชิ้น',
      pricePerUnit: reqPriceUnit,
      totalPrice: reqPriceUnit * reqQty,
      productId: item.productId,
      productName: item.productName,
      jobNo: activeBom.jobNo || '',
      jobName: activeBom.name || '',
      prNo: reqPrNo.trim(),
      remark: reqRemark.trim(),
      createdAt: new Date().toISOString()
    };

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
          batch.set(actRef, {
            id: actId,
            productId: item.productId,
            productName: item.productName || currentProd?.name || 'สินค้า',
            type: 'out',
            quantityChange: -deductQty,
            oldQuantity: oldQty,
            newQuantity: newQty,
            reason: `เบิกตัดยอดประกอบในใบงาน BOM: ${bom.name} (Job: ${bom.jobNo || 'ไม่ระบุ'})`,
            createdAt: new Date().toISOString(),
            creatorEmail: localStorage.getItem('admin_email') || 'system'
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
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.jobNo && b.jobNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3.5 text-left font-sans">
      
      {/* Title Header Workspace (Flat & Compact) */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Boxes className="h-4.5 w-4.5 text-indigo-600" />
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            สูตรชิ้นส่วนประกอบพัสดุ (BOM & Assembly Workspace)
          </h2>
        </div>

        {/* Dense Tabs Navigation */}
        <div className="flex bg-slate-100 p-0.5 rounded gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('bom')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 ${
              activeTab === 'bom' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-3 w-3" />
            <span>สูตรประกอบ BOM ({boms.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 ${
              activeTab === 'projects' ? 'bg-white text-indigo-700 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-3 w-3" />
            <span>โครงการหลัก ({jobProjects.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'bom' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Bento Scoreboard Bar (Flat & Compact Metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            <div className="bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">สูตรทั้งหมดสะสม:</span>
              <span className="text-xs font-black text-slate-800 font-mono">{boms.length} รายการ</span>
            </div>
            <div className="bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">กำลังประกอบ (In Progress):</span>
              <span className="text-xs font-black text-amber-700 font-mono">{boms.filter(b => b.status === 'in_progress').length} รายการ</span>
            </div>
            <div className="bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">ประกอบผลิตเสร็จสิ้น:</span>
              <span className="text-xs font-black text-emerald-700 font-mono">{boms.filter(b => b.status === 'completed').length} รายการ</span>
            </div>
            <div className="bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">ทำรายการเบิกคลังประกอบแล้ว:</span>
              <span className="text-xs font-black text-indigo-700 font-mono">{boms.filter(b => b.stockDeducted).length} รายการ</span>
            </div>
          </div>

          {/* BOM List Controls Bar (Inline horizontal filters & Search) */}
          <div className="bg-slate-50 p-1 rounded-lg flex flex-col md:flex-row items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-col sm:flex-row items-center gap-1.5 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่องาน หรือรหัส Job No..."
                  className="w-full pl-6 pr-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] focus:outline-none"
                />
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="all">กรองทุกสถานะ</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="in_progress">กำลังประกอบ</option>
                <option value="completed">ผลิตสำเร็จ</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>

            {/* Create New Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black cursor-pointer flex items-center gap-0.5 ml-auto shrink-0"
            >
              <Plus className="h-3 w-3" />
              <span>สร้างสูตร BOM ใหม่</span>
            </button>
          </div>

          {/* Horizontal scrollable BOM Selector row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1">เลือกใบงาน BOM:</span>
            {filteredBoms.length === 0 ? (
              <span className="text-[10px] text-slate-400 italic">ไม่พบสูตร BOM</span>
            ) : (
              filteredBoms.map(bom => {
                const isActive = activeBom?.id === bom.id;
                const financials = getBomFinancials(bom);
                const matchingProject = jobProjects?.find(p => p.jobNo === bom.jobNo);
                return (
                  <button
                    key={bom.id}
                    onClick={() => setSelectedBom(bom)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-sans font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                      isActive 
                        ? 'bg-white border-2 border-slate-500 text-black font-extrabold shadow-md scale-102' 
                        : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    {/* Brand Logo & Job Image */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Logo size={15} className="h-4 w-4 shrink-0" />
                      {matchingProject?.projectImageUrl ? (
                        <img 
                          src={matchingProject.projectImageUrl} 
                          alt={bom.jobNo} 
                          className="w-6 h-6 object-cover rounded-md border border-slate-300 shrink-0 bg-white" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <FolderGit2 className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Increased Job No size */}
                    <span className="font-mono text-[11px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded text-indigo-700 dark:text-indigo-400 shrink-0">
                      {bom.jobNo || 'NO JOB'}
                    </span>
                    <span className="truncate max-w-[120px]">{bom.name}</span>
                    <span className="text-[9.5px] font-mono font-black text-indigo-600">฿{financials.totalCost.toLocaleString('th-TH')}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Core spreadsheet workspace when BOM selected */}
          {activeBom ? (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              
              {/* Selected BOM Meta Panel (Flat & Dense) */}
              <div className="bg-slate-50/40 p-2.5 rounded-lg border border-slate-100 text-[11px] font-sans space-y-2">
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
                    <button
                      onClick={handleOpenEditModal}
                      className="p-0.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/80 rounded border border-slate-200/60 bg-slate-100"
                      title="แก้ไขสูตรประกอบ"
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
                      className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200/80 rounded border border-slate-200/60 bg-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
                      <div>ต้นทุนประกอบต่อชุด: <strong className="text-indigo-600">฿{fin.totalCost.toLocaleString('th-TH')}</strong></div>
                      <div>ต้นทุนสุทธิรวม ({multiplier} ชุด): <strong className="text-indigo-950 text-xs">฿{(fin.totalCost * multiplier).toLocaleString('th-TH')}</strong></div>
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
              </div>

              {/* Inline Expandable Form (Flat & Compact) */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[11px] font-sans space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-black text-slate-700 flex items-center gap-1">📋 บรรจุพัสดุอุปกรณ์ลงสูตรประกอบ:</span>
                  
                  {isAddingGroup ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newGroupNameInput}
                        onChange={(e) => setNewGroupNameInput(e.target.value)}
                        placeholder="กลุ่มย่อย เช่น PLC, หน้าจอ"
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
                      + เพิ่มกลุ่มพัสดุใหม่ใน BOM
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
                      className="w-full py-0.8 px-2 bg-white border border-slate-200 rounded text-[11px] focus:outline-none"
                    >
                      <option value="ทั่วไป">ทั่วไป (General)</option>
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
                    ยังไม่มีรายการพัสดุในใบเสนอสูตร BOM นี้ เลือกพัสดุและจัดกลุ่มเพื่อบันทึกรายการ
                  </div>
                ) : (
                  (() => {
                    const itemsByGroup: { [grp: string]: { originalIndex: number; item: BomItem }[] } = {};
                    activeBom.items.forEach((item, originalIndex) => {
                      const grpName = item.group || 'ทั่วไป';
                      if (!itemsByGroup[grpName]) {
                        itemsByGroup[grpName] = [];
                      }
                      itemsByGroup[grpName].push({ originalIndex, item });
                    });

                    const groups = Object.keys(itemsByGroup).sort((a, b) => {
                      if (a === 'ทั่วไป') return 1;
                      if (b === 'ทั่วไป') return -1;
                      return a.localeCompare(b);
                    });

                    return (
                      <div className="divide-y divide-slate-100">
                        {groups.map(grp => {
                          const list = itemsByGroup[grp];
                          return (
                            <div key={grp} className="py-1 px-0.5 text-left space-y-1">
                              <div className="flex items-center gap-1 font-black text-slate-700 text-[10px] uppercase border-b border-slate-100 pb-1">
                                <span>📦 กลุ่ม: {grp}</span>
                                <span className="text-slate-400">({list.length} รายการพัสดุ)</span>
                              </div>

                              <table className="w-full text-left border-collapse text-[11px] font-sans min-w-[700px]">
                                <thead>
                                  <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-0.5 px-1 w-[120px] text-center">ติดตามเสนอซื้อ</th>
                                    <th className="py-0.5 px-1 min-w-[200px]">รายละเอียดชิ้นส่วน / SKU</th>
                                    <th className="py-0.5 px-1 text-center w-[90px]">จำนวนใช้ต่อชุด</th>
                                    <th className="py-0.5 px-1 text-center w-[70px]">หน่วย</th>
                                    <th className="py-0.5 px-1 text-right w-[100px]">ราคาทุนรวม</th>
                                    <th className="py-0.5 px-1 text-center w-[120px]">ย้ายกลุ่ม</th>
                                    <th className="py-0.5 px-1 text-right w-[40px]">ลบ</th>
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
                                      <tr key={originalIndex} className="hover:bg-slate-50/40 transition-colors">
                                        
                                        {/* PO Tracking Button */}
                                        <td className="py-0.5 px-1 text-center">
                                          {matchedOrders.length > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() => setViewingOrder(matchedOrders[0])}
                                              className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded border cursor-pointer ${getOrderBadgeStyle(matchedOrders[0].status)}`}
                                            >
                                              {getOrderThaiLabel(matchedOrders[0].status)}
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenQuickRequisition(originalIndex)}
                                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[8.5px] font-black rounded-sm cursor-pointer shadow-3xs border ${
                                                currentQtyInStock < requiredTotal
                                                  ? 'bg-amber-500 text-white border-amber-500'
                                                  : 'bg-white text-indigo-700 border-indigo-200'
                                              }`}
                                            >
                                              <Plus className="h-2 w-2" /> เปิดใบติดตาม
                                            </button>
                                          )}
                                        </td>

                                        {/* Product info */}
                                        <td className="py-0.5 px-1 font-bold text-slate-800">
                                          <div className="flex items-center gap-1.5">
                                            {p?.image && (
                                              <img src={p.image} alt="" className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                                            )}
                                            <div>
                                              <div className="line-clamp-1">{item.productName}</div>
                                              <div className="text-[9px] text-slate-400 font-normal">
                                                SKU: {p?.sku || '-'} | <span className={currentQtyInStock < requiredTotal ? 'text-rose-600 font-extrabold' : 'text-emerald-700 font-extrabold'}>คงเหลือสต็อก: {currentQtyInStock} {item.unit || 'ชิ้น'}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Quantity */}
                                        <td className="py-0.5 px-1 text-center">
                                          <InlineInput
                                            type="number"
                                            value={item.quantity}
                                            className="text-center font-bold text-slate-800 bg-slate-50 w-12 mx-auto py-0"
                                            onSave={(val) => handleUpdateItemField(originalIndex, 'quantity', Math.max(1, parseInt(val) || 1))}
                                          />
                                        </td>

                                        {/* Unit */}
                                        <td className="py-0.5 px-1 text-center">
                                          <InlineInput
                                            value={item.unit || 'ชิ้น'}
                                            className="text-center bg-slate-50 py-0"
                                            onSave={(val) => handleUpdateItemField(originalIndex, 'unit', val.trim() || 'ชิ้น')}
                                          />
                                        </td>

                                        {/* Cost */}
                                        <td className="py-0.5 px-1 text-right font-bold text-slate-700 font-mono">
                                          ฿{costTotal.toLocaleString('th-TH')}
                                        </td>

                                        {/* Group selector */}
                                        <td className="py-0.5 px-1 text-center">
                                          <select
                                            value={item.group || 'ทั่วไป'}
                                            onChange={(e) => handleUpdateItemField(originalIndex, 'group', e.target.value)}
                                            className="px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9.5px] font-bold focus:outline-none cursor-pointer"
                                          >
                                            <option value="ทั่วไป">ทั่วไป</option>
                                            {getBomGroups(activeBom).map(g => (
                                              <option key={g} value={g}>{g}</option>
                                            ))}
                                          </select>
                                        </td>

                                        {/* Delete */}
                                        <td className="py-0.5 px-1 text-right">
                                          <button
                                            onClick={() => handleDeleteItem(originalIndex)}
                                            className="p-0.5 text-slate-300 hover:text-rose-600 rounded"
                                          >
                                            <Trash2 className="h-3 w-3" />
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
      )}

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 animate-in fade-in duration-150 text-[11px] font-sans">
          {/* Projects sidebar */}
          <div className="lg:col-span-5 bg-slate-50/20 p-2.5 rounded-lg border border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="font-black text-slate-800">📂 ทะเบียนโครงการหลัก:</span>
              <button
                onClick={() => {
                  setProjJobNo('');
                  setProjCustomer('');
                  setProjName('');
                  setProjYear(new Date().getFullYear().toString());
                  setIsProjAddModalOpen(true);
                }}
                className="px-2 py-0.5 bg-indigo-600 text-white text-[9.5px] rounded font-black cursor-pointer"
              >
                + เพิ่มโครงการ
              </button>
            </div>

            {/* Filter Search */}
            <input
              type="text"
              value={projSearch}
              onChange={(e) => setProjSearch(e.target.value)}
              placeholder="สืบค้น Job No หรือหน่วยงานโครงการ..."
              className="w-full px-2.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] focus:outline-none"
            />

            {/* Project rows */}
            <div className="space-y-1 max-h-[380px] overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">ไม่พบทะเบียนโครงการ</div>
              ) : (
                filteredProjects.map(p => {
                  const isSelected = selectedProj?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProj(p)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 shadow-xs' 
                          : 'bg-slate-100 border-slate-150 hover:bg-slate-200/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {p.projectImageUrl ? (
                            <img 
                              src={p.projectImageUrl} 
                              alt={p.jobNo} 
                              className="w-6 h-6 object-cover rounded border border-slate-300 shrink-0 bg-white" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                              <FolderGit2 className="h-3 w-3 text-slate-400" />
                            </div>
                          )}
                          <span className="font-mono text-[11px] font-black px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md shrink-0">
                            {p.jobNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProj(p);
                              setProjJobNo(p.jobNo);
                              setProjCustomer(p.customer);
                              setProjName(p.projectName);
                              setProjYear(p.year || new Date().getFullYear().toString());
                              setIsProjEditModalOpen(true);
                            }}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(p.id, p.jobNo);
                            }}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-800 line-clamp-1">{p.projectName}</div>
                      <div className="text-[10px] text-slate-400 font-bold truncate">หน่วยงาน: {p.customer} | ปี: {p.year || '-'}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Project modules content details */}
          <div className="lg:col-span-7 bg-slate-50/20 p-2.5 rounded-xl border border-slate-100 text-left">
            {selectedProj ? (
              <div className="space-y-3.5 text-left">
                <div className="border-b border-slate-150 pb-2.5 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100">
                  {/* Brand Logo & Job Image */}
                  <div className="relative shrink-0">
                    {selectedProj.projectImageUrl ? (
                      <img 
                        src={selectedProj.projectImageUrl} 
                        alt={selectedProj.projectName} 
                        className="w-11 h-11 object-cover rounded-lg border border-slate-200 bg-white" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center bg-slate-50">
                        <FolderGit2 className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border shadow-3xs">
                      <Logo size={14} className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-md">
                        {selectedProj.jobNo}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-bold">ปี {selectedProj.year || '-'}</span>
                    </div>
                    <h3 className="font-black text-slate-800 text-[11.5px] mt-1 leading-snug truncate">{selectedProj.projectName}</h3>
                    <p className="text-[9.5px] text-slate-400 font-semibold truncate leading-none mt-0.5">ลูกค้า/หน่วยงาน: {selectedProj.customer}</p>
                  </div>

                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <label className="cursor-pointer px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 transition-colors flex items-center gap-1">
                      <Upload className="h-2.5 w-2.5 text-slate-400" />
                      <span>อัปโหลดรูปภาพ</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            if (onEditJobProject) {
                              await onEditJobProject(selectedProj.id, { projectImageUrl: reader.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
                <ProjectModulesManager
                  proj={selectedProj}
                  onEditJobProject={onEditJobProject || (async () => {})}
                  addToast={addToast}
                />
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                กรุณาคลิกเลือกทะเบียนโครงการหลักด้านซ้าย เพื่อจัดการโมดูลชิ้นส่วนประกอบร่วม
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create BOM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1">➕ สร้างสูตรประกอบ BOM แผ่นงานใหม่</span>
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
              <span className="text-xs font-black text-slate-800">📝 แก้ไขข้อมูลสูตร BOM</span>
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

      {/* Modal: Quick Purchase Requisition Form */}
      {isRequisitionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800">📋 เปิดใบงานเสนอขอจัดซื้อสำหรับชิ้นส่วน BOM</span>
              <button onClick={() => setIsRequisitionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmitQuickRequisition} className="space-y-3 text-[11px] font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ชื่อพัสดุที่จะสั่ง:</label>
                <div className="text-slate-900 font-extrabold text-xs">
                  {reqItemIndex !== null && activeBom?.items[reqItemIndex]?.productName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">จำนวนที่สั่งจัดซื้อ *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={reqQty}
                    onChange={(e) => setReqQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">ราคาประเมินต่อหน่วย (฿)</label>
                  <input
                    type="number"
                    min={0}
                    value={reqPriceUnit}
                    onChange={(e) => setReqPriceUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold text-indigo-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">เลขที่ใบเสนอซื้อ (PR No.) *</label>
                <input
                  type="text"
                  required
                  value={reqPrNo}
                  onChange={(e) => setReqPrNo(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ผู้เสนอขอซื้อ *</label>
                <input
                  type="text"
                  required
                  value={reqRequester}
                  onChange={(e) => setReqRequester(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-bold text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">รายละเอียดแนบเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={reqRemark}
                  onChange={(e) => setReqRemark(e.target.value)}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsRequisitionModalOpen(false)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded">ยกเลิก</button>
                <button type="submit" className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded">สร้างคำเสนอซื้อ</button>
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

      {/* Modal: Add Project Form */}
      {isProjAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800">➕ ทะเบียนโครงการหลักตัวใหม่</span>
              <button onClick={() => setIsProjAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddProjectSubmit} className="space-y-3 text-[11px] font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">รหัส Job No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น JOB-2026-001"
                    value={projJobNo}
                    onChange={(e) => setProjJobNo(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">ปีที่ผลิต</label>
                  <input
                    type="text"
                    value={projYear}
                    onChange={(e) => setProjYear(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">หน่วยงาน / ชื่อลูกค้า *</label>
                <input
                  type="text"
                  required
                  placeholder="ชื่อลูกค้า หรือส่วนงานที่จ้างผลิต"
                  value={projCustomer}
                  onChange={(e) => setProjCustomer(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ชื่องานควบคุม / โครงการหลัก *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตู้ควบคุมระบบระบายอากาศตึก C"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsProjAddModalOpen(false)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded">ยกเลิก</button>
                <button type="submit" className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded">บันทึกโครงการ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Project Form */}
      {isProjEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-black text-slate-800">📝 แก้ไขข้อมูลโครงการหลัก</span>
              <button onClick={() => setIsProjEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEditProjectSubmit} className="space-y-3 text-[11px] font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">รหัส Job No. *</label>
                  <input
                    type="text"
                    required
                    value={projJobNo}
                    onChange={(e) => setProjJobNo(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">ปีที่ผลิต</label>
                  <input
                    type="text"
                    value={projYear}
                    onChange={(e) => setProjYear(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">หน่วยงาน / ลูกค้า *</label>
                <input
                  type="text"
                  required
                  value={projCustomer}
                  onChange={(e) => setProjCustomer(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">ชื่องานควบคุม / โครงการหลัก *</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsProjEditModalOpen(false)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded">ยกเลิก</button>
                <button type="submit" className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded">บันทึกปรับปรุง</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
