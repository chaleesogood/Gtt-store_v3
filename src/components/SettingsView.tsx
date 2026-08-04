import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Job, Employee, JobProject, normalizeModules, Brand, Supplier, SubStore, UserRole, MediaFile, CompanyProfile } from '../types';
import { BusinessCardModal } from './BusinessCardModal';
import { compressImageFile } from '../imageUtils';
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
  Tag,
  Store,
  Globe,
  Building,
  Building2,
  Database,
  RotateCcw,
  Download,
  CloudUpload,
  Server,
  CheckCircle2,
  FolderOpen,
  FileText,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  ExternalLink,
  Eye,
  Copy,
  Paperclip,
  Filter,
  HardDrive,
  CheckCircle,
  GraduationCap,
  IdCard,
  QrCode,
  ShoppingBag
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
    case 'Intern':
    case 'Internship':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

export const getDisplayEmpCode = (emp: Employee, index?: number) => {
  if (emp.empCode && emp.empCode.trim()) return emp.empCode.trim();
  if (emp.orgLevel === 'owner' || emp.department === 'Owner') return `EXEC-${String((index ?? 0) + 1).padStart(3, '0')}`;
  if (emp.orgLevel === 'intern' || emp.department === 'Intern' || emp.department === 'Internship') return `INT-${String((index ?? 0) + 1).padStart(3, '0')}`;
  if (emp.orgLevel === 'head') return `HD-${String((index ?? 0) + 1).padStart(3, '0')}`;
  return `EMP-${String((index ?? 0) + 1).padStart(3, '0')}`;
};

// =========================================================================
// SUB-COMPONENT: ProjectModulesManager
// =========================================================================
function ProjectModulesManager({ 
  proj, 
  onEditJobProject,
  jobs,
  onEditJob,
  engineeringSchedules,
  onSaveEngineeringSchedule,
  onDeleteEngineeringSchedule
}: { 
  proj: JobProject; 
  onEditJobProject: (id: string, updatedFields: Partial<JobProject>) => Promise<void>; 
  jobs: Job[];
  onEditJob: (id: string, updatedFields: Partial<Job>) => Promise<void>;
  engineeringSchedules?: any[];
  onSaveEngineeringSchedule?: (schedule: any) => Promise<void>;
  onDeleteEngineeringSchedule?: (id: string) => Promise<void>;
}) {
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newImgUrl, setNewImgUrl] = useState('');
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  
  const handleFormPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setNewImgUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  const handleFormDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewImgUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  
  // For editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingImgUrl, setEditingImgUrl] = useState('');

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
      return (a?.code || '').localeCompare(b?.code || '', undefined, { numeric: true, sensitivity: 'base' });
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

    const updated = [...modules, { code: codeVal, name: nameVal, imageUrl: newImgUrl || '', subModules: [] }];
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
        return { 
          ...m, 
          code: codeVal, 
          name: nameVal, 
          imageUrl: editingImgUrl,
          subModules: m.subModules || []
        };
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

    // Sync updates to any engineeringSchedules (Phase Matrix)
    if (engineeringSchedules && onSaveEngineeringSchedule) {
      const relatedSchedules = engineeringSchedules.filter(
        s => s.jobNo === proj.jobNo && (s.moduleName === oldModule.name || s.moduleCode === oldModule.code)
      );
      for (const sched of relatedSchedules) {
        await onSaveEngineeringSchedule({
          ...sched,
          moduleCode: codeVal,
          moduleName: nameVal,
          imageUrl: editingImgUrl,
          updatedAt: new Date().toISOString()
        });
      }
    }

    setEditingIndex(null);
  };

  const handleDelete = async (moduleCode: string, moduleName: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโมดูล "${moduleCode} - ${moduleName}" ออกจากโครงการ?`)) {
      const updated = modules.filter(m => m.code !== moduleCode);
      await onEditJobProject(proj.id, { modules: updated });

      // Clean related engineeringSchedules (Phase Matrix)
      if (engineeringSchedules && onDeleteEngineeringSchedule) {
        const relatedSchedules = engineeringSchedules.filter(
          s => s.jobNo === proj.jobNo && (s.moduleCode === moduleCode || s.moduleName === moduleName)
        );
        for (const sched of relatedSchedules) {
          await onDeleteEngineeringSchedule(sched.id);
        }
      }
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

    // Sync image update to engineeringSchedules
    if (engineeringSchedules && onSaveEngineeringSchedule) {
      const relatedSchedules = engineeringSchedules.filter(
        s => s.jobNo === proj.jobNo && (s.moduleCode === moduleCode)
      );
      for (const sched of relatedSchedules) {
        await onSaveEngineeringSchedule({
          ...sched,
          imageUrl: base64Data,
          updatedAt: new Date().toISOString()
        });
      }
    }
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

      // Sync image removal to engineeringSchedules
      if (engineeringSchedules && onSaveEngineeringSchedule) {
        const relatedSchedules = engineeringSchedules.filter(
          s => s.jobNo === proj.jobNo && (s.moduleCode === moduleCode)
        );
        for (const sched of relatedSchedules) {
          await onSaveEngineeringSchedule({
            ...sched,
            imageUrl: '',
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
  };

  // Sub-module modal states
  const [isAddSubModuleModalOpen, setIsAddSubModuleModalOpen] = useState(false);
  const [activeModuleCodeForSub, setActiveModuleCodeForSub] = useState('');
  const [subModuleLevel, setSubModuleLevel] = useState<1 | 2>(1);
  const [parentSubModuleName, setParentSubModuleName] = useState('');
  const [editingSubModuleOriginalName, setEditingSubModuleOriginalName] = useState<string | null>(null);
  const [subModuleNameInput, setSubModuleNameInput] = useState('');
  const [subModuleQtyInput, setSubModuleQtyInput] = useState(1);
  const [subModuleQtyIn, setSubModuleQtyIn] = useState(1);
  const [subModuleQtyOut, setSubModuleQtyOut] = useState(1);
  const [subModuleImgInput, setSubModuleImgInput] = useState('');
  const [subModuleAddressInputs, setSubModuleAddressInputs] = useState<string[]>(['']);
  const [subModuleAddressOutputs, setSubModuleAddressOutputs] = useState<string[]>(['']);

  const handleQtyInChange = (val: number) => {
    const qty = Math.max(1, isNaN(val) ? 1 : val);
    setSubModuleQtyIn(qty);
    setSubModuleAddressInputs(prev => {
      const next = [...prev];
      while (next.length < qty) next.push('');
      return next.slice(0, qty);
    });
  };

  const handleQtyOutChange = (val: number) => {
    const qty = Math.max(1, isNaN(val) ? 1 : val);
    setSubModuleQtyOut(qty);
    setSubModuleAddressOutputs(prev => {
      const next = [...prev];
      while (next.length < qty) next.push('');
      return next.slice(0, qty);
    });
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setSubModuleImgInput(event.target.result as string);
            }
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
        }
      }
    }
  };

  const openAddSubModuleModal = (moduleCode: string) => {
    setActiveModuleCodeForSub(moduleCode);
    setSubModuleLevel(1);
    setParentSubModuleName('');
    setEditingSubModuleOriginalName(null);
    setSubModuleNameInput('');
    setSubModuleQtyInput(1);
    setSubModuleQtyIn(1);
    setSubModuleQtyOut(1);
    const targetMod = modules.find(m => m.code === moduleCode);
    setSubModuleImgInput(targetMod?.imageUrl || '');
    setSubModuleAddressInputs(['']);
    setSubModuleAddressOutputs(['']);
    setIsAddSubModuleModalOpen(true);
  };

  const openAddSubModuleLevel2Modal = (moduleCode: string, parentSubName: string) => {
    setActiveModuleCodeForSub(moduleCode);
    setSubModuleLevel(2);
    setParentSubModuleName(parentSubName);
    setEditingSubModuleOriginalName(null);
    setSubModuleNameInput('');
    setSubModuleQtyInput(1);
    setSubModuleQtyIn(1);
    setSubModuleQtyOut(1);
    const targetMod = modules.find(m => m.code === moduleCode);
    setSubModuleImgInput(targetMod?.imageUrl || '');
    setSubModuleAddressInputs(['']);
    setSubModuleAddressOutputs(['']);
    setIsAddSubModuleModalOpen(true);
  };

  const openEditSubModuleModal = (moduleCode: string, sub: any) => {
    setActiveModuleCodeForSub(moduleCode);
    setSubModuleLevel(1);
    setParentSubModuleName('');
    const sName = typeof sub === 'string' ? sub : (sub.name || '');
    setEditingSubModuleOriginalName(sName);
    setSubModuleNameInput(sName);
    const qty = typeof sub === 'object' && sub.quantity ? sub.quantity : 1;
    setSubModuleQtyInput(qty);
    const targetMod = modules.find(m => m.code === moduleCode);
    setSubModuleImgInput(typeof sub === 'object' && sub.imageUrl ? sub.imageUrl : (targetMod?.imageUrl || ''));
    
    let inArr: string[] = [''];
    if (typeof sub === 'object' && sub.addressInput) {
      inArr = sub.addressInput.includes(',') 
        ? sub.addressInput.split(',').map((s: string) => s.trim())
        : [sub.addressInput];
    }
    const qtyIn = typeof sub === 'object' && sub.qtyInput ? sub.qtyInput : Math.max(1, inArr.length);
    setSubModuleQtyIn(qtyIn);
    while (inArr.length < qtyIn) inArr.push('');
    setSubModuleAddressInputs(inArr.slice(0, qtyIn));

    let outArr: string[] = [''];
    if (typeof sub === 'object' && sub.addressOutput) {
      outArr = sub.addressOutput.includes(',') 
        ? sub.addressOutput.split(',').map((s: string) => s.trim())
        : [sub.addressOutput];
    }
    const qtyOut = typeof sub === 'object' && sub.qtyOutput ? sub.qtyOutput : Math.max(1, outArr.length);
    setSubModuleQtyOut(qtyOut);
    while (outArr.length < qtyOut) outArr.push('');
    setSubModuleAddressOutputs(outArr.slice(0, qtyOut));

    setIsAddSubModuleModalOpen(true);
  };

  const openEditSubModuleLevel2Modal = (moduleCode: string, parentSubName: string, subL2: any) => {
    setActiveModuleCodeForSub(moduleCode);
    setSubModuleLevel(2);
    setParentSubModuleName(parentSubName);
    const sName = typeof subL2 === 'string' ? subL2 : (subL2.name || '');
    setEditingSubModuleOriginalName(sName);
    setSubModuleNameInput(sName);
    const qty = typeof subL2 === 'object' && subL2.quantity ? subL2.quantity : 1;
    setSubModuleQtyInput(qty);
    const targetMod = modules.find(m => m.code === moduleCode);
    setSubModuleImgInput(typeof subL2 === 'object' && subL2.imageUrl ? subL2.imageUrl : (targetMod?.imageUrl || ''));
    
    let inArr: string[] = [''];
    if (typeof subL2 === 'object' && subL2.addressInput) {
      inArr = subL2.addressInput.includes(',') 
        ? subL2.addressInput.split(',').map((s: string) => s.trim())
        : [subL2.addressInput];
    }
    const qtyIn = typeof subL2 === 'object' && subL2.qtyInput ? subL2.qtyInput : Math.max(1, inArr.length);
    setSubModuleQtyIn(qtyIn);
    while (inArr.length < qtyIn) inArr.push('');
    setSubModuleAddressInputs(inArr.slice(0, qtyIn));

    let outArr: string[] = [''];
    if (typeof subL2 === 'object' && subL2.addressOutput) {
      outArr = subL2.addressOutput.includes(',') 
        ? subL2.addressOutput.split(',').map((s: string) => s.trim())
        : [subL2.addressOutput];
    }
    const qtyOut = typeof subL2 === 'object' && subL2.qtyOutput ? subL2.qtyOutput : Math.max(1, outArr.length);
    setSubModuleQtyOut(qtyOut);
    while (outArr.length < qtyOut) outArr.push('');
    setSubModuleAddressOutputs(outArr.slice(0, qtyOut));

    setIsAddSubModuleModalOpen(true);
  };

  const handleSaveSubModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleCodeForSub || !subModuleNameInput.trim()) return;

    const targetModule = modules.find(m => m.code === activeModuleCodeForSub);
    if (!targetModule) return;

    const subName = subModuleNameInput.trim();
    const addrIn = subModuleAddressInputs.filter(Boolean).join(', ');
    const addrOut = subModuleAddressOutputs.filter(Boolean).join(', ');

    if (subModuleLevel === 1) {
      let existingSubL2s: any[] = [];
      const existingSub = (targetModule.subModules || []).find(s => (typeof s === 'string' ? s : s.name) === (editingSubModuleOriginalName || subName));
      if (existingSub && typeof existingSub === 'object' && existingSub.subModules) {
        existingSubL2s = existingSub.subModules;
      }

      const subItem = {
        name: subName,
        imageUrl: subModuleImgInput.trim() || targetModule.imageUrl || '',
        quantity: Number(subModuleQtyInput) || 1,
        qtyInput: Number(subModuleQtyIn) || 0,
        qtyOutput: Number(subModuleQtyOut) || 0,
        addressInput: addrIn,
        addressOutput: addrOut,
        subModules: existingSubL2s
      };

      const updated = modules.map(m => {
        if (m.code === activeModuleCodeForSub) {
          let subs = m.subModules || [];
          if (editingSubModuleOriginalName && editingSubModuleOriginalName !== subItem.name) {
            subs = subs.filter(s => (typeof s === 'string' ? s : s.name) !== editingSubModuleOriginalName);
          }
          const existingIdx = subs.findIndex(s => (typeof s === 'string' ? s : s.name) === subItem.name);
          let newSubs = [...subs];
          if (existingIdx >= 0) {
            newSubs[existingIdx] = subItem;
          } else {
            newSubs.push(subItem);
          }
          return { ...m, subModules: newSubs };
        }
        return m;
      });

      await onEditJobProject(proj.id, { modules: updated });

      // Proactively save to Engineering Phase Schedules
      if (engineeringSchedules && onSaveEngineeringSchedule) {
        const combinedAddr = [
          subItem.addressInput ? `DI: ${subItem.addressInput}` : '',
          subItem.addressOutput ? `DO: ${subItem.addressOutput}` : ''
        ].filter(Boolean).join(' | ');

        const exists = engineeringSchedules.some(
          s => s.jobNo === proj.jobNo &&
               (s.moduleCode === activeModuleCodeForSub || s.moduleName === targetModule.name) &&
               (s.subModuleName || '').trim() === subItem.name
        );
        if (!exists) {
          await onSaveEngineeringSchedule({
            id: `eng_${proj.jobNo}_${activeModuleCodeForSub}_${subItem.name.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            jobNo: proj.jobNo,
            projectName: proj.projectName,
            moduleCode: activeModuleCodeForSub,
            moduleName: targetModule.name,
            subModuleName: subItem.name,
            isBypassed: false,
            addressIo: combinedAddr,
            imageUrl: subItem.imageUrl || targetModule.imageUrl || '',
            installStatus: 'pending',
            wiringStatus: 'pending',
            testIoStatus: 'pending',
            manualHmiStatus: 'pending',
            semiAutoStatus: 'pending',
            autoStatus: 'pending',
            assignee: '',
            remark: subItem.quantity > 1 ? `จำนวน: ${subItem.quantity}` : '',
            updatedAt: new Date().toISOString()
          });
        }
      }
    } else {
      // Level 2 Sub-module
      const subItemL2 = {
        name: subName,
        imageUrl: subModuleImgInput.trim() || targetModule.imageUrl || '',
        quantity: Number(subModuleQtyInput) || 1,
        qtyInput: Number(subModuleQtyIn) || 0,
        qtyOutput: Number(subModuleQtyOut) || 0,
        addressInput: addrIn,
        addressOutput: addrOut
      };

      const updated = modules.map(m => {
        if (m.code === activeModuleCodeForSub) {
          const updatedSubs = (m.subModules || []).map(s => {
            const sName = typeof s === 'string' ? s : s.name;
            if (sName === parentSubModuleName && typeof s === 'object') {
              let l2List = s.subModules || [];
              if (editingSubModuleOriginalName && editingSubModuleOriginalName !== subItemL2.name) {
                l2List = l2List.filter(l2 => (typeof l2 === 'string' ? l2 : l2.name) !== editingSubModuleOriginalName);
              }
              const existingIdx = l2List.findIndex(l2 => (typeof l2 === 'string' ? l2 : l2.name) === subItemL2.name);
              let newL2s = [...l2List];
              if (existingIdx >= 0) {
                newL2s[existingIdx] = subItemL2;
              } else {
                newL2s.push(subItemL2);
              }
              return { ...s, subModules: newL2s };
            }
            return s;
          });
          return { ...m, subModules: updatedSubs };
        }
        return m;
      });

      await onEditJobProject(proj.id, { modules: updated });

      if (engineeringSchedules && onSaveEngineeringSchedule) {
        const combinedAddr = [
          subItemL2.addressInput ? `DI: ${subItemL2.addressInput}` : '',
          subItemL2.addressOutput ? `DO: ${subItemL2.addressOutput}` : ''
        ].filter(Boolean).join(' | ');

        const fullName = `${parentSubModuleName} > ${subItemL2.name}`;
        const exists = engineeringSchedules.some(
          s => s.jobNo === proj.jobNo &&
               (s.moduleCode === activeModuleCodeForSub || s.moduleName === targetModule.name) &&
               (s.subModuleName || '').trim() === fullName
        );
        if (!exists) {
          await onSaveEngineeringSchedule({
            id: `eng_${proj.jobNo}_${activeModuleCodeForSub}_${subItemL2.name.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            jobNo: proj.jobNo,
            projectName: proj.projectName,
            moduleCode: activeModuleCodeForSub,
            moduleName: targetModule.name,
            subModuleName: fullName,
            isBypassed: false,
            addressIo: combinedAddr,
            imageUrl: subItemL2.imageUrl || targetModule.imageUrl || '',
            installStatus: 'pending',
            wiringStatus: 'pending',
            testIoStatus: 'pending',
            manualHmiStatus: 'pending',
            semiAutoStatus: 'pending',
            autoStatus: 'pending',
            assignee: '',
            remark: subItemL2.quantity > 1 ? `จำนวน: ${subItemL2.quantity}` : '',
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    setIsAddSubModuleModalOpen(false);
  };

  const handleDeleteSubModule = async (moduleCode: string, subName: string) => {
    (window as any).triggerConfirm(
      'ยืนยันการลบ Sub-module',
      `ยืนยันการลบ Sub-module "${subName}" หรือไม่? ข้อมูลตารางงานในระบบวิศวกรรม (Phase Matrix) จะถูกลบไปด้วย`,
      async () => {
        const matchModule = modules.find(m => m.code === moduleCode);

        const updated = modules.map(m => {
          if (m.code === moduleCode) {
            return { 
              ...m, 
              subModules: (m.subModules || []).filter(s => {
                const name = typeof s === 'string' ? s : s.name;
                return name !== subName;
              }) 
            };
          }
          return m;
        });
        
        await onEditJobProject(proj.id, { modules: updated });

        if (engineeringSchedules && onDeleteEngineeringSchedule) {
          const targetScheds = engineeringSchedules.filter(
            s => s.jobNo === proj.jobNo && 
                 (s.moduleCode === moduleCode || s.moduleName === (matchModule?.name || '')) &&
                 (s.subModuleName === subName || s.subModuleName?.startsWith(`${subName} >`))
          );
          for (const item of targetScheds) {
            await onDeleteEngineeringSchedule(item.id);
          }
        }
      }
    );
  };

  const handleDeleteSubModuleL2 = async (moduleCode: string, parentSubName: string, l2SubName: string) => {
    (window as any).triggerConfirm(
      'ยืนยันการลบ Sub-module ชั้น 2',
      `ยืนยันการลบ Sub-module ชั้น 2 "${l2SubName}" หรือไม่?`,
      async () => {
        const matchModule = modules.find(m => m.code === moduleCode);

        const updated = modules.map(m => {
          if (m.code === moduleCode) {
            const updatedSubs = (m.subModules || []).map(s => {
              const sName = typeof s === 'string' ? s : s.name;
              if (sName === parentSubName && typeof s === 'object') {
                return {
                  ...s,
                  subModules: (s.subModules || []).filter(l2 => (typeof l2 === 'string' ? l2 : l2.name) !== l2SubName)
                };
              }
              return s;
            });
            return { ...m, subModules: updatedSubs };
          }
          return m;
        });

        await onEditJobProject(proj.id, { modules: updated });

        if (engineeringSchedules && onDeleteEngineeringSchedule) {
          const fullName = `${parentSubName} > ${l2SubName}`;
          const targetScheds = engineeringSchedules.filter(
            s => s.jobNo === proj.jobNo && 
                 (s.moduleCode === moduleCode || s.moduleName === (matchModule?.name || '')) &&
                 s.subModuleName === fullName
          );
          for (const item of targetScheds) {
            await onDeleteEngineeringSchedule(item.id);
          }
        }
      }
    );
  };

  return (
    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-4 mt-2">
      {/* Header with trigger button for Add Module Popup */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-150">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
          <Layers className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
          <span>โมดูลและระบบย่อย ({sortedModules.length})</span>
          <span className="text-[10px] text-slate-400 font-normal ml-1">เรียงตามรหัสโมดูล</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModuleModalOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-xs h-[30px]"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
          <span>ลงทะเบียนโมดูลใหม่</span>
        </button>
      </div>

      {/* Modules List/Grid sorted by module code */}
      {sortedModules.length === 0 ? (
        <span className="text-[11px] text-slate-400 italic font-sans font-normal block pl-1">
          ยังไม่มีการลงทะเบียนโมดูลในระบบ คุณสามารถคลิกเพื่อลงทะเบียนโมดูลและจัดระบบย่อยได้
        </span>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedModules.map((m, idx) => (
            <div 
              key={m.code}
              className="p-3 hover:bg-white/80 border border-slate-100 rounded-xl bg-white/40 transition-colors group/mod relative space-y-2.5"
            >
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 flex-grow min-w-0">
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
                      <label 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer?.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              handleUploadImage(m.code, reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="flex flex-col items-center justify-center h-12 w-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer relative"
                      >
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
                      setEditingImgUrl(m.imageUrl || '');
                    }}
                    className="text-slate-400 hover:text-indigo-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="แก้ไขข้อมูลโมดูล"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(m.code, m.name)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="ลบโมดูล"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Collapsible/Flexible Sub-modules Row (Vertical List) */}
              <div className="pl-15 pr-3 py-2.5 border-t border-slate-100/65 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-extrabold select-none uppercase tracking-wider">ระบบย่อย / Sub-modules ({ (m.subModules || []).length }):</span>
                  <button
                    type="button"
                    onClick={() => openAddSubModuleModal(m.code)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-extrabold text-indigo-700 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3 stroke-[3]" />
                    <span>เพิ่ม Sub-module</span>
                  </button>
                </div>
                {(m.subModules || []).length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic pl-1">ยังไม่มีหัวข้อย่อย</span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(m.subModules || []).map((sub, sIdx) => {
                      const subName = typeof sub === 'string' ? sub : (sub.name || '');
                      const subQty = typeof sub === 'object' && sub.quantity && sub.quantity > 1 ? ` (x${sub.quantity})` : '';
                      const subImg = typeof sub === 'object' && sub.imageUrl ? sub.imageUrl : '';
                      
                      const qtyIn = typeof sub === 'object' ? (sub.qtyInput || (sub.addressInput ? sub.addressInput.split(',').filter(Boolean).length : 0)) : 0;
                      const qtyOut = typeof sub === 'object' ? (sub.qtyOutput || (sub.addressOutput ? sub.addressOutput.split(',').filter(Boolean).length : 0)) : 0;
                      
                      const subAddrIn = typeof sub === 'object' && sub.addressInput ? sub.addressInput : '';
                      const subAddrOut = typeof sub === 'object' && sub.addressOutput ? sub.addressOutput : '';
                      const subL2List = typeof sub === 'object' && Array.isArray(sub.subModules) ? sub.subModules : [];

                      return (
                        <div key={sIdx} className="flex flex-col gap-1 bg-slate-50/90 rounded-lg border border-slate-200/80 p-2">
                          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {subImg ? (
                                <img src={subImg} alt="" className="w-6 h-6 rounded object-cover shrink-0 border border-slate-200" />
                              ) : (
                                <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">Sub</div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-800 truncate text-xs">{subName}{subQty}</span>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {qtyIn > 0 && subAddrIn.trim() !== '' && (
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title={subAddrIn}>
                                      DI ({qtyIn}): {subAddrIn}
                                    </span>
                                  )}
                                  {qtyOut > 0 && subAddrOut.trim() !== '' && (
                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title={subAddrOut}>
                                      DO ({qtyOut}): {subAddrOut}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openAddSubModuleLevel2Modal(m.code, subName)}
                                className="inline-flex items-center gap-1 px-1.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[9px] font-bold text-indigo-700 rounded border border-indigo-200 transition-colors cursor-pointer"
                                title="เพิ่ม Sub-module ชั้น 2"
                              >
                                <Plus className="h-3 w-3" />
                                <span>+ Sub-module ชั้น 2</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditSubModuleModal(m.code, sub)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                                title="แก้ไข Sub-module"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubModule(m.code, subName)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="ลบ Sub-module"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Render Level 2 Sub-modules if any */}
                          {subL2List.length > 0 && (
                            <div className="ml-5 pl-2.5 border-l-2 border-indigo-200/80 flex flex-col gap-1 mt-1">
                              {subL2List.map((l2, l2Idx) => {
                                const l2Name = typeof l2 === 'string' ? l2 : (l2.name || '');
                                const l2Qty = typeof l2 === 'object' && l2.quantity && l2.quantity > 1 ? ` (x${l2.quantity})` : '';
                                const l2Img = typeof l2 === 'object' && l2.imageUrl ? l2.imageUrl : '';
                                const l2AddrIn = typeof l2 === 'object' && l2.addressInput ? l2.addressInput : '';
                                const l2AddrOut = typeof l2 === 'object' && l2.addressOutput ? l2.addressOutput : '';
                                const l2QtyIn = typeof l2 === 'object' ? (l2.qtyInput || (l2AddrIn ? l2AddrIn.split(',').filter(Boolean).length : 0)) : 0;
                                const l2QtyOut = typeof l2 === 'object' ? (l2.qtyOutput || (l2AddrOut ? l2AddrOut.split(',').filter(Boolean).length : 0)) : 0;
                                return (
                                  <div key={l2Idx} className="flex items-center justify-between gap-2 px-2.5 py-1 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-md border border-slate-200/60 shadow-2xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {l2Img ? (
                                        <img src={l2Img} alt="" className="w-5 h-5 rounded object-cover shrink-0 border border-slate-200" />
                                      ) : (
                                        <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-black shrink-0">L2</div>
                                      )}
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-800 truncate text-[11px]">{l2Name}{l2Qty}</span>
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {l2QtyIn > 0 && l2AddrIn.trim() !== '' && (
                                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title={l2AddrIn}>
                                              DI: {l2AddrIn}
                                            </span>
                                          )}
                                          {l2QtyOut > 0 && l2AddrOut.trim() !== '' && (
                                            <span className="text-[8px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200" title={l2AddrOut}>
                                              DO: {l2AddrOut}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openEditSubModuleLevel2Modal(m.code, subName, l2)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                        title="แก้ไข Sub-module ชั้น 2"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSubModuleL2(m.code, subName, l2Name)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="ลบ Sub-module ชั้น 2"
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
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Sub-Module Popup Modal */}
      {isAddSubModuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <form 
            onSubmit={handleSaveSubModule}
            className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  {subModuleLevel === 2
                    ? (editingSubModuleOriginalName ? `แก้ไข Sub-module ชั้น 2 (${parentSubModuleName})` : `เพิ่ม Sub-module ชั้น 2 (อยู่ภายใต้ ${parentSubModuleName})`)
                    : (editingSubModuleOriginalName ? 'แก้ไข Sub-module ชั้น 1 / รายการย่อย' : 'เพิ่ม Sub-module ชั้น 1 / รายการย่อย')}
                </h4>
                <p className="text-[10px] text-slate-400">กำหนดชื่อ รูปภาพ และพอร์ตอินพุต/เอาต์พุต (Address IO) ได้อย่างอิสระ</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSubModuleModalOpen(false)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* General details */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อ Sub-module / รายการย่อย *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ชุด Inverter / เซนเซอร์ตรวจจับ"
                    value={subModuleNameInput}
                    onChange={(e) => setSubModuleNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">จำนวนชุด (Quantity)</label>
                    <span className="text-[9px] text-slate-400 block mb-1">จำนวนชุดอุปกรณ์ทั้งหมดที่ใช้</span>
                    <input
                      type="number"
                      min="1"
                      value={subModuleQtyInput}
                      onChange={(e) => setSubModuleQtyInput(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">รูปภาพ (วางรูปภาพจากคลิปบอร์ดได้)</label>
                    <span className="text-[9px] text-slate-400 block mb-1">คัดลอกรูปแล้วกด Ctrl+V เพื่อวาง</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="วางรูปภาพ (Ctrl+V) หรือใส่ URL"
                        value={subModuleImgInput}
                        onChange={(e) => setSubModuleImgInput(e.target.value)}
                        onPaste={handleImagePaste}
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                      />
                      {subModuleImgInput && (
                        <div className="absolute right-2 top-1.5 w-6 h-6 rounded overflow-hidden border border-slate-200 bg-white shadow-xs">
                          <img src={subModuleImgInput} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* INPUT (DI) CONFIGURATION */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      พอร์ตอินพุต (INPUT / DI)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">จำนวนช่องอินพุต:</span>
                    <input
                      type="number"
                      min="0"
                      value={subModuleQtyIn}
                      onChange={(e) => handleQtyInChange(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-hidden focus:bg-white focus:border-emerald-500"
                    />
                  </div>
                </div>

                {subModuleQtyIn > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-emerald-50/20 rounded-xl border border-emerald-100/50">
                    {subModuleAddressInputs.map((addr, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute left-2.5 top-2 text-[8px] font-black text-emerald-600 font-mono">I{idx + 1}</span>
                        <input
                          type="text"
                          placeholder={`DI #${idx + 1}`}
                          value={addr}
                          onChange={(e) => {
                            const next = [...subModuleAddressInputs];
                            next[idx] = e.target.value;
                            setSubModuleAddressInputs(next);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic pl-1">ไม่มีพอร์ตอินพุต (DI)</p>
                )}
              </div>

              {/* OUTPUT (DO) CONFIGURATION */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      พอร์ตเอาต์พุต (OUTPUT / DO)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">จำนวนช่องเอาต์พุต:</span>
                    <input
                      type="number"
                      min="0"
                      value={subModuleQtyOut}
                      onChange={(e) => handleQtyOutChange(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-hidden focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                {subModuleQtyOut > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-blue-50/20 rounded-xl border border-blue-100/50">
                    {subModuleAddressOutputs.map((addr, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute left-2.5 top-2 text-[8px] font-black text-blue-600 font-mono">O{idx + 1}</span>
                        <input
                          type="text"
                          placeholder={`DO #${idx + 1}`}
                          value={addr}
                          onChange={(e) => {
                            const next = [...subModuleAddressOutputs];
                            next[idx] = e.target.value;
                            setSubModuleAddressOutputs(next);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic pl-1">ไม่มีพอร์ตเอาต์พุต (DO)</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddSubModuleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
              >
                บันทึก Sub-module
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Module Popup Modal */}
      {isAddModuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <form 
            onSubmit={(e) => {
              handleAdd(e);
              setIsAddModuleModalOpen(false);
            }} 
            className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800">ลงทะเบียนโมดูลใหม่</h4>
                <p className="text-[10px] text-slate-400">ระบุรหัสโมดูล ชื่อ และแนบรูปประกอบของโมดูล</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModuleModalOpen(false)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">รหัสโมดูล *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 01"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="sm:col-span-8 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">ชื่อโมดูล *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตู้คอนโทรลหลัก"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Drag and Drop / Paste Area for Image */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">รูปภาพโมดูล / ภาพประกอบ</label>
              <div 
                onPaste={handleFormPaste}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFormDrop}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-xl p-3.5 transition-all text-center space-y-2 cursor-pointer relative group"
              >
                <input
                  type="file"
                  id="newModuleImageInputModal"
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
                
                {newImgUrl ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="relative h-24 w-full max-w-[180px] rounded-lg border border-slate-200 overflow-hidden shadow-xs bg-white">
                      <img src={newImgUrl} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setNewImgUrl(''); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-colors cursor-pointer"
                        title="ลบรูปภาพ"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      แนบรูปภาพแล้ว (คลิก/ลากวาง/กด Ctrl+V เพื่อเปลี่ยน)
                    </span>
                  </div>
                ) : (
                  <div 
                    onClick={() => document.getElementById('newModuleImageInputModal')?.click()}
                    className="flex flex-col items-center justify-center py-2"
                  >
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full mb-1.5 group-hover:scale-110 transition-transform">
                      <Camera className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">คลิกเพื่ออัปโหลด หรือลากไฟล์รูปภาพมาวางที่นี่</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">หรือคลิกในนี้แล้วกด <kbd className="bg-slate-100 px-1 py-0.5 border border-slate-200 rounded text-slate-600">Ctrl + V</kbd> เพื่อวางรูปจาก Clipboard</p>
                  </div>
                )}

                {/* Preset sample buttons */}
                <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100/60 mt-2">
                  <span className="text-[9px] text-slate-400 font-sans">รูปตัวอย่างรวดเร็ว:</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setNewImgUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'); }}
                    className="text-[9px] bg-white hover:bg-slate-150 text-slate-600 px-2 py-0.5 rounded border border-slate-250 font-bold cursor-pointer transition-colors shadow-3xs"
                  >
                    +ตู้คอนโทรลไฟ
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setNewImgUrl('https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&w=600&q=80'); }}
                    className="text-[9px] bg-white hover:bg-slate-150 text-slate-600 px-2 py-0.5 rounded border border-slate-250 font-bold cursor-pointer transition-colors shadow-3xs"
                  >
                    +แผงวงจรไฟฟ้า
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddModuleModalOpen(false);
                  setNewCode('');
                  setNewName('');
                  setNewImgUrl('');
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                ลงทะเบียน
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Module Popup Modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800">แก้ไขข้อมูลโมดูล</h4>
                <p className="text-[10px] text-slate-400">แก้ไขรหัส ชื่อโมดูล และเปลี่ยนรูปภาพประกอบได้ที่นี่</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            {/* Drag and Drop / Paste Area for Editing Image */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500">รูปภาพโมดูล / ภาพประกอบ</label>
              <div 
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image') !== -1) {
                      const file = item.getAsFile();
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingImgUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                        e.preventDefault();
                      }
                    }
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = e.dataTransfer?.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditingImgUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-xl p-3.5 transition-all text-center space-y-2 cursor-pointer relative group"
              >
                <input
                  type="file"
                  id="editModuleImageInput"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setEditingImgUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                
                {editingImgUrl ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="relative h-24 w-full max-w-[180px] rounded-lg border border-slate-200 overflow-hidden shadow-xs bg-white">
                      <img src={editingImgUrl} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingImgUrl(''); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-colors cursor-pointer"
                        title="ลบรูปภาพ"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      แนบรูปภาพแล้ว (คลิก/ลากวาง/กด Ctrl+V เพื่อเปลี่ยน)
                    </span>
                  </div>
                ) : (
                  <div 
                    onClick={() => document.getElementById('editModuleImageInput')?.click()}
                    className="flex flex-col items-center justify-center py-2"
                  >
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full mb-1.5 group-hover:scale-110 transition-transform">
                      <Camera className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">คลิกเพื่ออัปโหลด หรือลากไฟล์รูปภาพมาวางที่นี่</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">หรือคลิกในนี้แล้วกด <kbd className="bg-slate-100 px-1 py-0.5 border border-slate-200 rounded text-slate-600">Ctrl + V</kbd> เพื่อวางรูปจาก Clipboard</p>
                  </div>
                )}

                {/* Preset sample buttons */}
                <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100/60 mt-2">
                  <span className="text-[9px] text-slate-400 font-sans">รูปตัวอย่างรวดเร็ว:</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingImgUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'); }}
                    className="text-[9px] bg-white hover:bg-slate-150 text-slate-600 px-2 py-0.5 rounded border border-slate-250 font-bold cursor-pointer transition-colors shadow-3xs"
                  >
                    +ตู้คอนโทรลไฟ
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingImgUrl('https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&w=600&q=80'); }}
                    className="text-[9px] bg-white hover:bg-slate-150 text-slate-600 px-2 py-0.5 rounded border border-slate-250 font-bold cursor-pointer transition-colors shadow-3xs"
                  >
                    +แผงวงจรไฟฟ้า
                  </button>
                </div>
              </div>
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

  suppliers?: Supplier[];
  onAddSupplier?: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  onEditSupplier?: (id: string, updatedFields: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier?: (id: string) => Promise<void>;

  onDownloadBackup?: () => void;
  onRestoreBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveAllToDatabase?: () => Promise<void>;
  isSavingAllToDb?: boolean;
  lastDbSyncTime?: string;
  activities?: any[];
  onRollbackDatabase?: (targetTimeStr: string) => Promise<void>;
  onRestoreCacheGroup?: (groupData: Record<string, any[]>) => Promise<void>;
  triggerConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  addToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  userRoles?: UserRole[];
  products?: any[];
  categories?: any[];
  boms?: any[];
  dailyReports?: any[];
  mediaFiles?: MediaFile[];
  onAddMediaFile?: (data: Omit<MediaFile, 'id' | 'createdAt'>) => Promise<MediaFile>;
  onEditMediaFile?: (id: string, updatedFields: Partial<MediaFile>) => Promise<void>;
  onDeleteMediaFile?: (id: string) => Promise<void>;

  companyProfile?: CompanyProfile;
  onUpdateCompanyProfile?: (profile: CompanyProfile) => Promise<void> | void;
  engineeringSchedules?: any[];
  onSaveEngineeringSchedule?: (schedule: any) => Promise<void>;
  onDeleteEngineeringSchedule?: (id: string) => Promise<void>;
}

type SubTab = 'company' | 'projects' | 'employees' | 'brands' | 'suppliers' | 'media' | 'database';

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
  onDeleteBrand,
  suppliers = [],
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onDownloadBackup,
  onRestoreBackup,
  onSaveAllToDatabase,
  isSavingAllToDb = false,
  lastDbSyncTime,
  activities = [],
  onRollbackDatabase,
  onRestoreCacheGroup,
  triggerConfirm,
  addToast,
  userRoles = [],
  products = [],
  categories = [],
  boms = [],
  dailyReports = [],
  mediaFiles = [],
  onAddMediaFile,
  onEditMediaFile,
  onDeleteMediaFile,
  companyProfile,
  onUpdateCompanyProfile,
  engineeringSchedules,
  onSaveEngineeringSchedule,
  onDeleteEngineeringSchedule
}: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('company');

  // Company Profile Form States
  const [companyThForm, setCompanyThForm] = useState(companyProfile?.companyTh || 'บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด');
  const [companyEnForm, setCompanyEnForm] = useState(companyProfile?.companyEn || 'GLOBAL TRANSYS TECHNOLOGY CO., LTD.');
  const [addressThForm, setAddressThForm] = useState(companyProfile?.addressTh || 'บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด(สำนักงานใหญ่)\n68/253 หมู่ที่ 5 ตำบลลาดสวาย อำเภอลำลูกกา\nจังหวัดปทุมธานี 12150');
  const [addressEnForm, setAddressEnForm] = useState(companyProfile?.addressEn || 'GLOBAL TRANSYS TECHNOLOGY CO., LTD.\n68/253 Moo 5 Ladsawai, Lamlukka, Pathumthani 12150\nTel. 02-153-8834  เลขประจำตัวผู้เสียภาษี 0-1355-56013-09-7');
  const [phoneForm, setPhoneForm] = useState(companyProfile?.phone || '080-430-6887');
  const [emailForm, setEmailForm] = useState(companyProfile?.email || 'globaltransystechnology@gmail.com\nchalee@gtt2013.com');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(companyProfile?.logoUrl || '');
  const [isSavingCompanyProfile, setIsSavingCompanyProfile] = useState(false);

  useEffect(() => {
    if (companyProfile) {
      setCompanyThForm(companyProfile.companyTh || 'บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด');
      setCompanyEnForm(companyProfile.companyEn || 'GLOBAL TRANSYS TECHNOLOGY CO., LTD.');
      setAddressThForm(companyProfile.addressTh || '');
      setAddressEnForm(companyProfile.addressEn || '');
      setPhoneForm(companyProfile.phone || '');
      setEmailForm(companyProfile.email || '');
      setCompanyLogoUrl(companyProfile.logoUrl || '');
    }
  }, [companyProfile]);

  const handleSaveCompanyProfileForm = async () => {
    if (!onUpdateCompanyProfile) return;
    setIsSavingCompanyProfile(true);
    try {
      await onUpdateCompanyProfile({
        companyTh: companyThForm.trim(),
        companyEn: companyEnForm.trim(),
        addressTh: addressThForm.trim(),
        addressEn: addressEnForm.trim(),
        phone: phoneForm.trim(),
        email: emailForm.trim(),
        logoUrl: companyLogoUrl
      });
      if (addToast) {
        addToast('success', 'บันทึกโลโก้และข้อมูลองค์กรสำเร็จ', 'ระบบอัปเดตโลโก้ไปยังทุกหน้าเว็บบอร์ดและนามบัตรพนักงานแล้ว');
      } else {
        alert('บันทึกข้อมูลองค์กรและโลโก้บริษัทสำเร็จ!');
      }
    } catch (err) {
      console.warn("Save company profile error:", err);
      if (addToast) {
        addToast('error', 'บันทึกข้อมูลไม่สำเร็จ', 'เกิดข้อผิดพลาดในการบันทึกลงฐานข้อมูล');
      }
    } finally {
      setIsSavingCompanyProfile(false);
    }
  };

  // Browser cache diagnostics and recovery states
  const [scannedGroups, setScannedGroups] = useState<Record<string, Record<string, any[]>>>({});
  const [hasScanned, setHasScanned] = useState(false);
  const [confirmingSuffix, setConfirmingSuffix] = useState<string | null>(null);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRestoreClick = async (suffix: string, collections: Record<string, any[]>) => {
    if (confirmingSuffix !== suffix) {
      setConfirmingSuffix(suffix);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmingSuffix(null);
      }, 5000);
      return;
    }

    setConfirmingSuffix(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    
    await onRestoreCacheGroup?.(collections);
    performCacheScan();
  };

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const performCacheScan = () => {
    try {
      const keys = Object.keys(window.localStorage);
      const groups: Record<string, Record<string, any[]>> = {};

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
        'stock_manager_daily_reports_list'
      ];

      keys.forEach(key => {
        const canonicalMatch = canonicalKeys.find(c => key.startsWith(c));
        if (!canonicalMatch) return;

        let suffix = 'global';
        if (key.length > canonicalMatch.length) {
          const remainder = key.substring(canonicalMatch.length);
          if (remainder.startsWith('_')) {
            suffix = remainder.substring(1);
          } else {
            suffix = remainder;
          }
        }

        // Canonicalize suffix to groupKey (if suffix is a UID that has an associated email, use email)
        let groupKey = suffix;
        if (suffix !== 'global' && suffix !== 'guest' && suffix !== 'demo-user') {
          const matchedUser = userRoles?.find(u => u.uid === suffix);
          if (matchedUser && matchedUser.email) {
            groupKey = matchedUser.email;
          }
        }

        if (!groups[groupKey]) {
          groups[groupKey] = {};
        }

        try {
          const val = window.localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (groups[groupKey][canonicalMatch]) {
                // If we already have items for this canonical collection in this email/group, merge them uniquely by id
                const existing = groups[groupKey][canonicalMatch];
                const mergedMap = new Map();
                existing.forEach((item: any) => {
                  if (item && item.id) {
                    mergedMap.set(item.id, item);
                  }
                });
                parsed.forEach((item: any) => {
                  if (item && item.id) {
                    mergedMap.set(item.id, { ...(mergedMap.get(item.id) || {}), ...item });
                  }
                });
                groups[groupKey][canonicalMatch] = Array.from(mergedMap.values());
              } else {
                groups[groupKey][canonicalMatch] = parsed;
              }
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      });

      setScannedGroups(groups);
      setHasScanned(true);
    } catch (err) {
      console.error("Local storage scanning failed:", err);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'database') {
      performCacheScan();
    }
  }, [activeSubTab, userRoles]);

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

  // Business Card Modal State
  const [isBusinessCardModalOpen, setIsBusinessCardModalOpen] = useState(false);
  const [selectedEmpForCard, setSelectedEmpForCard] = useState<Employee | null>(null);

  // Form Fields - Projects
  const [projJobNo, setProjJobNo] = useState('');
  const [projYear, setProjYear] = useState('');
  const [projCustomer, setProjCustomer] = useState('');
  const [projName, setProjName] = useState('');
  const [projImageUrl, setProjImageUrl] = useState('');

  // Form Fields - Employees
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empNickname, setEmpNickname] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empImageUrl, setEmpImageUrl] = useState('');
  const [empLineId, setEmpLineId] = useState('');
  const [empLineQrUrl, setEmpLineQrUrl] = useState('');
  const [empCompanyLogoUrl, setEmpCompanyLogoUrl] = useState('');
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
  const [brandAttachedDocs, setBrandAttachedDocs] = useState<string[]>([]);
  const [brandDocModalBrand, setBrandDocModalBrand] = useState<Brand | null>(null);

  // Form Fields & States - Suppliers / Stores
  const [supplierName, setSupplierName] = useState('');
  const [supplierLogo, setSupplierLogo] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierWebsite, setSupplierWebsite] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierSubStores, setSupplierSubStores] = useState<SubStore[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubPlatform, setNewSubPlatform] = useState<string>('Shopee');
  const [newSubLogoUrl, setNewSubLogoUrl] = useState('');
  const [newSubLink, setNewSubLink] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierAddModalOpen, setIsSupplierAddModalOpen] = useState(false);
  const [isSupplierEditModalOpen, setIsSupplierEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = supplierSearch.trim().toLowerCase();
      if (!q) return true;
      const matchSub = s.subStores?.some(sub => 
        sub.name.toLowerCase().includes(q) || 
        (sub.platform && sub.platform.toLowerCase().includes(q))
      );
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        matchSub
      );
    });
  }, [suppliers, supplierSearch]);

  const handleSupplierAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;
    if (onAddSupplier) {
      await onAddSupplier({
        name: supplierName.trim(),
        logoUrl: supplierLogo.trim() || undefined,
        contactName: supplierContact.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
        email: supplierEmail.trim() || undefined,
        website: supplierWebsite.trim() || undefined,
        address: supplierAddress.trim() || undefined,
        subStores: supplierSubStores.length > 0 ? supplierSubStores : undefined,
      });
    }
    setSupplierName('');
    setSupplierLogo('');
    setSupplierContact('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierWebsite('');
    setSupplierAddress('');
    setSupplierSubStores([]);
    setNewSubName('');
    setNewSubLogoUrl('');
    setNewSubLink('');
    setIsSupplierAddModalOpen(false);
  };

  const handleSupplierEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !supplierName.trim()) return;
    if (onEditSupplier) {
      await onEditSupplier(selectedSupplier.id, {
        name: supplierName.trim(),
        logoUrl: supplierLogo.trim() || undefined,
        contactName: supplierContact.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
        email: supplierEmail.trim() || undefined,
        website: supplierWebsite.trim() || undefined,
        address: supplierAddress.trim() || undefined,
        subStores: supplierSubStores,
      });
    }
    setIsSupplierEditModalOpen(false);
    setSelectedSupplier(null);
  };

  // Media Repository States
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<string>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'document'>('all');
  const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);
  const [isEditMediaModalOpen, setIsEditMediaModalOpen] = useState(false);
  const [selectedMediaFile, setSelectedMediaFile] = useState<MediaFile | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'brandLogo' | 'brandDoc' | null>(null);

  // New/Edit Media Form States
  const [mediaName, setMediaName] = useState('');
  const [mediaCategory, setMediaCategory] = useState<string>('แบรนด์');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileType, setMediaFileType] = useState('');
  const [mediaRefName, setMediaRefName] = useState('');
  const [mediaNotes, setMediaNotes] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'document'>('image');
  const [mediaSize, setMediaSize] = useState<number | undefined>(undefined);
  const [previewMediaFile, setPreviewMediaFile] = useState<MediaFile | null>(null);

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
          (p.jobNo || '').toLowerCase().includes(search) ||
          (p.customer || '').toLowerCase().includes(search) ||
          (p.projectName || '').toLowerCase().includes(search)
        );
      }
      return true;
    });

    // Sort by the first 5 digits of jobNo (ascending - smaller first)
    return [...filtered].sort((a, b) => {
      const aPrefix = (a?.jobNo || '').slice(0, 5).replace(/\D/g, '');
      const bPrefix = (b?.jobNo || '').slice(0, 5).replace(/\D/g, '');
      const aNum = parseInt(aPrefix, 10);
      const bNum = parseInt(bPrefix, 10);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
         return aNum - bNum;
      }
      return (a?.jobNo || '').localeCompare(b?.jobNo || '', undefined, { numeric: true, sensitivity: 'base' });
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
        (p.jobNo || '').toLowerCase().includes(search) ||
        (p.customer || '').toLowerCase().includes(search) ||
        (p.projectName || '').toLowerCase().includes(search) ||
        (p.year || '').includes(search)
      );
    });
  }, [jobProjects, projSearch, selectedYear]);

  // Filter employees & search
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const search = empSearch.toLowerCase().trim();
      return (
        (e.empCode || '').toLowerCase().includes(search) ||
        (e.name || '').toLowerCase().includes(search) ||
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
      return (b.name || '').toLowerCase().includes(search);
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

    let generatedCode = empCode.trim();
    if (!generatedCode) {
      if (empOrgLevel === 'owner' || empDepartment === 'Owner') {
        generatedCode = `EXEC-${String(employees.length + 1).padStart(3, '0')}`;
      } else if (empOrgLevel === 'intern' || empDepartment === 'Intern' || empDepartment === 'Internship') {
        generatedCode = `INT-${String(employees.length + 1).padStart(3, '0')}`;
      } else if (empOrgLevel === 'head') {
        generatedCode = `HD-${String(employees.length + 1).padStart(3, '0')}`;
      } else {
        generatedCode = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
      }
    }

    await onAddEmployee({
      empCode: generatedCode,
      name: empName.trim(),
      nickname: empNickname.trim(),
      email: empEmail.trim(),
      phone: empPhone.trim(),
      imageUrl: empImageUrl || '',
      lineId: empLineId.trim(),
      lineQrUrl: empLineQrUrl,
      companyLogoUrl: empCompanyLogoUrl,
      department: empDepartment,
      orgLevel: empOrgLevel,
      role: empRole.trim(),
      cardColor: empCardColor
    });

    setIsEmpAddModalOpen(false);
    setEmpCode('');
    setEmpName('');
    setEmpNickname('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpImageUrl('');
    setEmpLineId('');
    setEmpLineQrUrl('');
    setEmpCompanyLogoUrl('');
    setEmpDepartment('Electrical');
    setEmpOrgLevel('team');
    setEmpRole('');
    setEmpCardColor('border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100');
  };

  // Handle Employee Edit opens
  const openEmpEdit = (emp: Employee) => {
    setSelectedEmp(emp);
    setEmpCode(emp.empCode || getDisplayEmpCode(emp, employees.indexOf(emp)));
    setEmpName(emp.name);
    setEmpNickname(emp.nickname || '');
    setEmpEmail(emp.email || '');
    setEmpPhone(emp.phone || '');
    setEmpImageUrl(emp.imageUrl || '');
    setEmpLineId(emp.lineId || '');
    setEmpLineQrUrl(emp.lineQrUrl || '');
    setEmpCompanyLogoUrl(emp.companyLogoUrl || '');
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
      empCode: empCode.trim() || selectedEmp.empCode || getDisplayEmpCode(selectedEmp),
      name: empName.trim(),
      nickname: empNickname.trim(),
      email: empEmail.trim(),
      phone: empPhone.trim(),
      imageUrl: empImageUrl,
      lineId: empLineId.trim(),
      lineQrUrl: empLineQrUrl,
      companyLogoUrl: empCompanyLogoUrl,
      department: empDepartment,
      orgLevel: empOrgLevel,
      role: empRole.trim(),
      cardColor: empCardColor
    });

    setIsEmpEditModalOpen(false);
    setSelectedEmp(null);
  };

  // Dynamic category list from mediaFiles + standard categories
  const availableMediaCategories = useMemo(() => {
    const defaultCats = [
      'แบรนด์',
      'รูปสินค้า',
      'รูปหมวดหมู่',
      'รูปงาน / หน้างาน',
      'แคตตาล็อกสินค้า',
      'คู่มือ / เอกสารทางเทคนิค',
      'เอกสารโครงการ',
      'ทั่วไป',
    ];
    const customCats = mediaFiles.map((f) => f.category).filter(Boolean) as string[];
    return Array.from(new Set([...defaultCats, ...customCats]));
  }, [mediaFiles]);

  // Filter media files & search
  const filteredMediaFiles = useMemo(() => {
    return mediaFiles.filter((file) => {
      const matchSearch =
        !mediaSearch.trim() ||
        (file.name || '').toLowerCase().includes(mediaSearch.toLowerCase()) ||
        (file.notes || '').toLowerCase().includes(mediaSearch.toLowerCase()) ||
        (file.refName || '').toLowerCase().includes(mediaSearch.toLowerCase());

      const matchCategory =
        mediaCategoryFilter === 'all' || file.category === mediaCategoryFilter;

      const matchType =
        mediaTypeFilter === 'all' ||
        (mediaTypeFilter === 'image' && file.type === 'image') ||
        (mediaTypeFilter === 'document' && file.type !== 'image');

      return matchSearch && matchCategory && matchType;
    });
  }, [mediaFiles, mediaSearch, mediaCategoryFilter, mediaTypeFilter]);

  // Size calculations for media files
  const calculateTotalBytes = (files: MediaFile[]) => {
    return files.reduce((acc, f) => {
      if (f.size && f.size > 0) return acc + f.size;
      if (f.url && f.url.startsWith('data:')) {
        const base64Length = f.url.length - (f.url.indexOf(',') + 1);
        return acc + Math.round(base64Length * 0.75);
      }
      return acc;
    }, 0);
  };

  const totalMediaBytes = useMemo(() => calculateTotalBytes(mediaFiles), [mediaFiles]);
  const filteredMediaBytes = useMemo(() => calculateTotalBytes(filteredMediaFiles), [filteredMediaFiles]);

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Handle Brand Add Submit
  const handleBrandAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      alert('กรุณากรอกชื่อแบรนด์สินค้า');
      return;
    }

    if (brands.some(b => b.name.toLowerCase().trim() === brandName.toLowerCase().trim())) {
      alert(`มีแบรนด์สินค้าชื่อ "${brandName.trim()}" ในระบบแล้ว`);
      return;
    }

    const trimmedName = brandName.trim();
    const logo = brandLogo.trim();

    // If logo provided, automatically add/save it into mediaFiles repository to prevent loss!
    if (logo && onAddMediaFile) {
      const alreadyInRepo = mediaFiles.some(m => m.url === logo);
      if (!alreadyInRepo) {
        await onAddMediaFile({
          name: `โลโก้ ${trimmedName}`,
          type: 'image',
          url: logo,
          category: 'แบรนด์',
          refName: trimmedName,
          notes: `โลโก้ทางการแบรนด์ ${trimmedName}`
        });
      }
    }

    await onAddBrand({
      name: trimmedName,
      logoUrl: logo,
      documentIds: brandAttachedDocs
    });

    setIsBrandAddModalOpen(false);
    setBrandName('');
    setBrandLogo('');
    setBrandAttachedDocs([]);
  };

  // Handle Brand Edit Submit
  const handleBrandEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand || !brandName.trim()) return;

    const trimmedName = brandName.trim();
    const logo = brandLogo.trim();

    if (logo && onAddMediaFile) {
      const alreadyInRepo = mediaFiles.some(m => m.url === logo);
      if (!alreadyInRepo) {
        await onAddMediaFile({
          name: `โลโก้ ${trimmedName}`,
          type: 'image',
          url: logo,
          category: 'แบรนด์',
          refName: trimmedName,
          notes: `โลโก้ทางการแบรนด์ ${trimmedName}`
        });
      }
    }

    await onEditBrand(selectedBrand.id, {
      name: trimmedName,
      logoUrl: logo,
      documentIds: brandAttachedDocs
    });

    setIsBrandEditModalOpen(false);
    setSelectedBrand(null);
    setBrandName('');
    setBrandLogo('');
    setBrandAttachedDocs([]);
  };

  // Handle Media Add Submit
  const handleMediaAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaName.trim() || !mediaUrl.trim()) {
      alert('กรุณากรอกชื่อไฟล์และเลือกไฟล์ที่ต้องการอัปโหลด');
      return;
    }

    if (onAddMediaFile) {
      await onAddMediaFile({
        name: mediaName.trim(),
        type: mediaType,
        url: mediaUrl.trim(),
        category: mediaCategory,
        fileType: mediaFileType || (mediaType === 'image' ? 'PNG/JPG' : 'FILE'),
        size: mediaSize,
        refName: mediaRefName.trim() || undefined,
        notes: mediaNotes.trim() || undefined
      });
    }

    setIsAddMediaModalOpen(false);
    setMediaName('');
    setMediaUrl('');
    setMediaFileType('');
    setMediaSize(undefined);
    setMediaRefName('');
    setMediaNotes('');
  };

  // Handle Media Edit Submit
  const handleMediaEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMediaFile || !mediaName.trim()) return;

    if (onEditMediaFile) {
      await onEditMediaFile(selectedMediaFile.id, {
        name: mediaName.trim(),
        category: mediaCategory,
        refName: mediaRefName.trim() || undefined,
        notes: mediaNotes.trim() || undefined,
        url: mediaUrl || selectedMediaFile.url,
        type: mediaType || selectedMediaFile.type,
        fileType: mediaFileType || selectedMediaFile.fileType,
        size: mediaSize !== undefined ? mediaSize : selectedMediaFile.size,
      });
    }

    setIsEditMediaModalOpen(false);
    setSelectedMediaFile(null);
  };

  return (
    <div className="space-y-2 text-left">
      
      {/* Header Selector card */}
      <div className="flex flex-row items-center justify-between gap-3 bg-slate-900 text-slate-100 p-2 px-3.5 rounded-xl relative overflow-hidden">
        
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 text-left">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[8px] uppercase tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Unified Settings & Directory</span>
          </div>
          <h2 className="text-sm font-black text-white font-sans flex items-center gap-1.5 mt-0.5">
            <FolderGit2 className="h-4 w-4 text-indigo-400" />
            ตั้งค่าโปรเจ็ค พนักงาน และแบรนด์สินค้า
          </h2>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-800/80 p-0.5 rounded gap-1 shrink-0 z-10 flex-wrap">
          <button
            onClick={() => setActiveSubTab('company')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'company' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-company"
          >
            <Building2 className="h-3 w-3 text-indigo-300" />
            <span>องค์กร &amp; โลโก้บริษัท</span>
          </button>
          <button
            onClick={() => setActiveSubTab('projects')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'projects' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-projects"
          >
            <FolderGit2 className="h-3 w-3" />
            <span>โปรเจ็ค ({jobProjects.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'employees' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-employees"
          >
            <Users className="h-3 w-3" />
            <span>พนักงาน ({employees.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('brands')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'brands' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-brands"
          >
            <Tag className="h-3 w-3" />
            <span>แบรนด์ ({brands.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'suppliers' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-suppliers"
          >
            <Store className="h-3 w-3" />
            <span>ร้านค้า ({suppliers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('media')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'media' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-media"
          >
            <FolderOpen className="h-3 w-3" />
            <span>คลังรูปภาพ & ไฟล์เอกสาร ({mediaFiles.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('database')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all ${
              activeSubTab === 'database' 
                ? 'bg-indigo-600 text-white shadow-3xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="settings-tab-database"
          >
            <Database className="h-3 w-3" />
            <span>ฐานข้อมูลสำรอง & กู้คืน</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ==================== TAB 0: COMPANY PROFILE & LOGO ==================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'company' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-sans">
                    ข้อมูลองค์กร &amp; โลโก้บริษัท (Company Profile &amp; Logo)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    จัดการโลโก้ทางการและข้อมูลบริษัท ซึ่งจะแสดงผลบนแถบเว็บไซต์หลัก และนามบัตรพนักงานทุกใบในระบบ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCompanyProfileForm}
                disabled={isSavingCompanyProfile}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSavingCompanyProfile ? 'กำลังบันทึก...' : 'บันทึกตั้งค่าองค์กร'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Col: Logo Upload Box */}
              <div className="md:col-span-1 space-y-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-indigo-500" />
                  โลโก้บริษัททางการ (Official Logo)
                </h4>

                {/* Logo Preview Box */}
                <div className="relative h-36 w-36 rounded-2xl border-2 border-indigo-500/20 dark:border-indigo-500/30 overflow-hidden bg-white shadow-md flex items-center justify-center p-3 group">
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt="Company Logo" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                      <Building2 className="h-10 w-10 mb-1 text-slate-300" />
                      <span className="text-[10px] font-extrabold text-slate-400">โลโก้มาตรฐาน GTT</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed px-2">
                  ไฟล์ที่รองรับ: .png, .jpg, .svg, .webp (แนะนำรูปทรงสี่เหลี่ยม หรือพื้นหลังโปร่งใส)
                </p>

                <div className="flex flex-col w-full gap-2 pt-1">
                  <label className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload className="h-4 w-4" />
                    <span>{companyLogoUrl ? 'เปลี่ยนรูปโลโก้บริษัท' : 'อัปโหลดรูปโลโก้บริษัท'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCompanyLogoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  {companyLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setCompanyLogoUrl('')}
                      className="w-full py-1.5 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      คืนค่าเป็นโลโก้ GTT มาตรฐาน
                    </button>
                  )}
                </div>
              </div>

              {/* Right Col: Details Form */}
              <div className="md:col-span-2 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      ชื่อบริษัท / องค์กร (ภาษาไทย)
                    </label>
                    <input
                      type="text"
                      value={companyThForm}
                      onChange={(e) => setCompanyThForm(e.target.value)}
                      placeholder="เช่น บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      Company Name (English)
                    </label>
                    <input
                      type="text"
                      value={companyEnForm}
                      onChange={(e) => setCompanyEnForm(e.target.value)}
                      placeholder="e.g. GLOBAL TRANSYS TECHNOLOGY CO., LTD."
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      ที่อยู่บริษัท (ภาษาไทย) - สำหรับนามบัตรและเอกสาร
                    </label>
                    <textarea
                      rows={2}
                      value={addressThForm}
                      onChange={(e) => setAddressThForm(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      Address &amp; Tax ID (English)
                    </label>
                    <textarea
                      rows={2}
                      value={addressEnForm}
                      onChange={(e) => setAddressEnForm(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      เบอร์โทรศัพท์กลาง / สำนักงาน
                    </label>
                    <input
                      type="text"
                      value={phoneForm}
                      onChange={(e) => setPhoneForm(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      อีเมลติดต่อกลาง
                    </label>
                    <input
                      type="text"
                      value={emailForm}
                      onChange={(e) => setEmailForm(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveCompanyProfileForm}
                    disabled={isSavingCompanyProfile}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isSavingCompanyProfile ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

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
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const compressed = await compressImageFile(file);
                              onEditJobProject(activeProjObj.id, { projectImageUrl: compressed });
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
                                if (addToast) {
                                  addToast('warning', 'ไม่สามารถลบโครงการได้', `ไม่สามารถลบรหัสงาน ${activeProjObj.jobNo} ได้ เนื่องจากยังมีโมดูลย่อยและใบสั่งงานในระบบอ้างอิงอยู่จำนวน ${associatedTasks.length} รายการ`);
                                } else {
                                  alert(`ไม่สามารถลบรหัสงาน ${activeProjObj.jobNo} ได้ เนื่องจากยังมีโมดูลย่อยและใบสั่งงานในระบบอ้างอิงอยู่จำนวน ${associatedTasks.length} รายการ`);
                                }
                                return;
                              }
                              const confirmMsg = `ยืนยันการลบโครงการ ${activeProjObj.jobNo} หรือไม่?`;
                              if (triggerConfirm) {
                                triggerConfirm('ยืนยันการลบโครงการ', confirmMsg, () => onDeleteJobProject(activeProjObj.id));
                              } else if (confirm(confirmMsg)) {
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
                        engineeringSchedules={engineeringSchedules}
                        onSaveEngineeringSchedule={onSaveEngineeringSchedule}
                        onDeleteEngineeringSchedule={onDeleteEngineeringSchedule}
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
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const compressed = await compressImageFile(file);
                                onEditJobProject(proj.id, { projectImageUrl: compressed });
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
                                if (addToast) {
                                  addToast('warning', 'ไม่สามารถลบโครงการได้', `ไม่สามารถลบรหัสงาน ${proj.jobNo} ได้ เนื่องจากยังมีโมดูลย่อยและใบสั่งงานในระบบอ้างอิงอยู่จำนวน ${associatedTasks.length} รายการ`);
                                } else {
                                  alert(`ไม่สามารถลบรหัสงาน ${proj.jobNo} ได้ เนื่องจากยังมีโมดูลย่อยและใบสั่งงานในระบบอ้างอิงอยู่จำนวน ${associatedTasks.length} รายการ`);
                                }
                                return;
                              }
                              const confirmMsg = `ยืนยันการลบโครงการ ${proj.jobNo} หรือไม่?`;
                              if (triggerConfirm) {
                                triggerConfirm('ยืนยันการลบโครงการ', confirmMsg, () => onDeleteJobProject(proj.id));
                              } else if (confirm(confirmMsg)) {
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
                          engineeringSchedules={engineeringSchedules}
                          onSaveEngineeringSchedule={onSaveEngineeringSchedule}
                          onDeleteEngineeringSchedule={onDeleteEngineeringSchedule}
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

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmpForCard(employees.length > 0 ? employees[0] : null);
                    setIsBusinessCardModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer border border-blue-400/30"
                  id="btn-generate-business-card"
                >
                  <IdCard className="h-4 w-4 text-blue-100 animate-pulse" />
                  <span>สร้างนามบัตรพนักงาน</span>
                </button>

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
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 transition-all cursor-pointer"
                  id="btn-add-employee-settings"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>เพิ่มรายชื่อพนักงาน</span>
                </button>
              </div>
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
                    {employees.filter(e => e.orgLevel === 'owner' || e.department === 'Owner').map((emp, idx) => {
                      const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;
                      return (
                        <div
                          key={emp.id}
                          className={`w-full max-w-md rounded-2xl border p-4 shadow-sm flex flex-col gap-3 transition-all relative ${
                            emp.cardColor || 'border-purple-250 bg-purple-50/15'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative group/empimg h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
                              {emp.imageUrl ? (
                                <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center text-purple-700 dark:text-purple-300 text-lg font-black font-sans uppercase">
                                  {emp.name.slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-[10px] font-mono font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md">
                                  #{getDisplayEmpCode(emp, idx)}
                                </span>
                                <span className="px-1.5 py-0.5 bg-purple-100 text-[9px] font-black text-purple-700 border border-purple-200 rounded-md leading-none flex items-center gap-0.5">
                                  <Crown className="h-2.5 w-2.5" /> Owner
                                </span>
                              </div>
                              
                              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans truncate mt-1">
                                {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name}
                              </h4>
                              
                              <p className="text-[11px] text-purple-700 dark:text-purple-300 font-extrabold mt-0.5">{emp.role || 'ประธานกรรมการบริหาร (Owner)'}</p>
                              
                              <div className="mt-2 space-y-1 text-[10px] text-slate-500 font-sans">
                                {emp.email && (
                                  <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    <span className="truncate">{emp.email}</span>
                                  </p>
                                )}
                                {emp.phone && (
                                  <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                                    <Phone className="h-3 w-3 text-slate-400" />
                                    <a href={`tel:${emp.phone}`} className="hover:underline font-mono">{emp.phone}</a>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions panel */}
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedEmpForCard(emp);
                                  setIsBusinessCardModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-slate-150/60 cursor-pointer"
                                title="สร้างนามบัตรพนักงาน"
                              >
                                <IdCard className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button onClick={() => openEmpEdit(emp)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded border border-slate-150/60 cursor-pointer" title="แก้ไข">
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (assignedJobsCount > 0) {
                                    if (addToast) {
                                      addToast('warning', 'ไม่สามารถลบรายชื่อพนักงานได้', `ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานมอบหมายค้างอยู่ ${assignedJobsCount} รายการ`);
                                    } else {
                                      alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากมีงานที่มอบหมายค้างอยู่จำนวน ${assignedJobsCount} รายการ`);
                                    }
                                    return;
                                  }
                                  const confirmMsg = `ต้องการลบผู้บริหาร "${emp.name}" หรือไม่?`;
                                  if (triggerConfirm) {
                                    triggerConfirm('ยืนยันการลบผู้บริหาร', confirmMsg, () => onDeleteEmployee(emp.id));
                                  } else if (confirm(confirmMsg)) {
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
                  { id: 'Intern', nameTh: 'กลุ่มน้องฝึกงาน / นักศึกษาฝึกงาน', nameEn: 'Interns & Trainees', icon: GraduationCap, color: 'teal', borderClass: 'border-t-4 border-teal-500' },
                ].map((dept) => {
                  const deptEmps = employees.filter(e => {
                    if (dept.id === 'Intern') {
                      return (e.department === 'Intern' || e.department === 'Internship' || e.orgLevel === 'intern') && e.orgLevel !== 'owner';
                    }
                    return e.department === dept.id && e.orgLevel !== 'owner';
                  });
                  const heads = deptEmps.filter(e => e.orgLevel === 'head');
                  const teamMembers = deptEmps.filter(e => e.orgLevel === 'team' || e.orgLevel === 'intern' || !e.orgLevel);
                  
                  const DeptIcon = dept.icon;

                  return (
                    <div key={dept.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-full overflow-hidden ${dept.borderClass}`}>
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

                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-800 rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400">
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
                              {heads.map((emp, idx) => {
                                const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;
                                return (
                                  <div
                                    key={emp.id}
                                    className={`rounded-2xl border p-3.5 shadow-2xs flex flex-col gap-2 transition-all relative ${
                                      emp.cardColor || 'border-indigo-150 bg-indigo-50/10'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="relative group/empimg h-16 w-16 sm:h-18 sm:w-18 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-xs">
                                        {emp.imageUrl ? (
                                          <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="h-full w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-black font-sans uppercase flex items-center justify-center">
                                            {emp.name.slice(0, 2)}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/60 text-[9px] font-mono font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded">
                                            #{getDisplayEmpCode(emp, idx)}
                                          </span>
                                        </div>

                                        <h6 className="text-xs font-black text-slate-800 dark:text-slate-100 font-sans truncate mt-0.5">
                                          {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name}
                                        </h6>
                                        <p className="text-[10px] font-extrabold text-slate-500 leading-tight">{emp.role || 'หัวหน้าประจำแผนก'}</p>
                                        
                                        <div className="mt-1 space-y-0.5 text-[9px] text-slate-400 font-sans">
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
                                        <button
                                          onClick={() => {
                                            setSelectedEmpForCard(emp);
                                            setIsBusinessCardModalOpen(true);
                                          }}
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-slate-150/60 cursor-pointer"
                                          title="สร้างนามบัตรพนักงาน"
                                        >
                                          <IdCard className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        </button>
                                        <button onClick={() => openEmpEdit(emp)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded border border-slate-150/60 cursor-pointer" title="แก้ไข">
                                          <Edit3 className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (assignedJobsCount > 0) {
                                              if (addToast) {
                                                addToast('warning', 'ไม่สามารถลบรายชื่อพนักงานได้', `ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานมอบหมายค้างอยู่ ${assignedJobsCount} รายการ`);
                                              } else {
                                                alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากมีงานที่มอบหมายค้างอยู่จำนวน ${assignedJobsCount} รายการ`);
                                              }
                                              return;
                                            }
                                            const confirmMsg = `ต้องการลบรายชื่อ "${emp.name}" ออกจากแผนก?`;
                                            if (triggerConfirm) {
                                              triggerConfirm('ยืนยันการลบรายชื่อพนักงาน', confirmMsg, () => onDeleteEmployee(emp.id));
                                            } else if (confirm(confirmMsg)) {
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
                            <Users className="h-3 w-3 text-slate-400" /> ลูกทีม / ช่างปฏิบัติงาน / น้องฝึกงาน
                          </span>

                          {teamMembers.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic py-2 pl-1 bg-slate-50/50 dark:bg-slate-950/10 rounded-lg">ยังไม่มีข้อมูลช่างหรือน้องฝึกงานสังกัดแผนกนี้</p>
                          ) : (
                            <div className="space-y-2">
                              {teamMembers.map((emp, idx) => {
                                const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;
                                return (
                                  <div
                                    key={emp.id}
                                    className={`rounded-xl border p-3 shadow-3xs flex flex-col gap-1.5 transition-all relative ${
                                      emp.cardColor || 'border-slate-200 bg-white dark:bg-slate-900 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="relative group/empimg h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-xs">
                                        {emp.imageUrl ? (
                                          <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="h-full w-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-black font-sans uppercase flex items-center justify-center">
                                            {emp.name.slice(0, 2)}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-[8.5px] font-mono font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded">
                                            #{getDisplayEmpCode(emp, idx)}
                                          </span>
                                        </div>

                                        <h6 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 font-sans truncate mt-0.5">
                                          {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name}
                                        </h6>
                                        <p className="text-[9px] font-bold text-slate-500 leading-none mt-0.5">{emp.role || 'ช่างประจำแผนก'}</p>
                                        
                                        <div className="mt-1 space-y-0.5 text-[8.5px] text-slate-400 font-mono">
                                          {emp.email && <p className="truncate flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{emp.email}</p>}
                                          {emp.phone && <p className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{emp.phone}</p>}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => {
                                            setSelectedEmpForCard(emp);
                                            setIsBusinessCardModalOpen(true);
                                          }}
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded cursor-pointer"
                                          title="สร้างนามบัตรพนักงาน"
                                        >
                                          <IdCard className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        </button>
                                        <button onClick={() => openEmpEdit(emp)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded cursor-pointer" title="แก้ไข">
                                          <Edit3 className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (assignedJobsCount > 0) {
                                              if (addToast) {
                                                addToast('warning', 'ไม่สามารถลบพนักงานได้', `ไม่สามารถลบพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานค้าง ${assignedJobsCount} งาน`);
                                              } else {
                                                alert(`ไม่สามารถลบพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานค้าง ${assignedJobsCount} งาน`);
                                              }
                                              return;
                                            }
                                            const confirmMsg = `ต้องการลบรายชื่อ "${emp.name}" หรือไม่?`;
                                            if (triggerConfirm) {
                                              triggerConfirm('ยืนยันการลบรายชื่อพนักงาน', confirmMsg, () => onDeleteEmployee(emp.id));
                                            } else if (confirm(confirmMsg)) {
                                              onDeleteEmployee(emp.id);
                                            }
                                          }}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                          title="ลบ"
                                        >
                                          <Trash2 className="h-3 w-3" />
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
                  {filteredEmployees.map((emp, idx) => {
                    const assignedJobsCount = jobs.filter(j => j.assignee === emp.name && j.status !== 'completed' && j.status !== 'cancelled').length;

                    return (
                      <div
                        key={emp.id}
                        className={`rounded-2xl border p-4 shadow-xs flex flex-col gap-3 hover:border-slate-400 dark:hover:border-slate-700 transition-all ${
                          emp.cardColor || 'border-slate-200 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Employee Profile Image */}
                          <div className="relative group/empimg h-18 w-18 sm:h-22 sm:w-22 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-xs">
                            {emp.imageUrl ? (
                              <>
                                <img src={emp.imageUrl} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/empimg:opacity-100 flex items-center justify-center transition-opacity">
                                  <Camera className="h-4 w-4 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="h-full w-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-sm font-black font-sans uppercase">
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
                              {/* Code Badge */}
                              <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[9.5px] font-mono font-black text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md">
                                #{getDisplayEmpCode(emp, idx)}
                              </span>

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
                                   emp.department === 'Welding' ? 'เชื่อมเหล็ก (Welding)' :
                                   emp.department === 'Intern' ? 'ฝึกงาน (Intern)' : emp.department}
                                </span>
                              )}

                              {/* Level Badge */}
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-[8.5px] font-bold text-emerald-700 border border-emerald-150 rounded leading-none">
                                {emp.orgLevel === 'owner' ? 'เจ้าของบริษัท' : 
                                 emp.orgLevel === 'head' ? 'หัวหน้าแผนก' :
                                 emp.orgLevel === 'intern' ? 'น้องฝึกงาน' : 'ลูกทีม'}
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
                              onClick={() => {
                                setSelectedEmpForCard(emp);
                                setIsBusinessCardModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md border border-slate-150/60 cursor-pointer"
                              title="สร้างนามบัตรพนักงาน"
                            >
                              <IdCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </button>
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
                                  if (addToast) {
                                    addToast('warning', 'ไม่สามารถลบรายชื่อพนักงานได้', `ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากยังมีงานมอบหมายค้างอยู่ ${assignedJobsCount} รายการ`);
                                  } else {
                                    alert(`ไม่สามารถลบรายชื่อพนักงาน "${emp.name}" ได้ เนื่องจากมีงานที่มอบหมายค้างอยู่จำนวน ${assignedJobsCount} รายการ`);
                                  }
                                  return;
                                }
                                const confirmMsg = `คุณต้องการนำรายชื่อพนักงาน "${emp.name}" ออกจากระบบหรือไม่?`;
                                if (triggerConfirm) {
                                  triggerConfirm('ยืนยันการลบรายชื่อพนักงาน', confirmMsg, () => onDeleteEmployee(emp.id));
                                } else if (confirm(confirmMsg)) {
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
                
                {/* Employee Code Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                    <IdCard className="h-3 w-3 text-indigo-500" />
                    <span>รหัสพนักงาน (Employee ID Code)</span>
                  </label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="เช่น EMP-001 หรือ INT-001 (เว้นว่างไว้หากต้องการให้ระบบสร้างให้อัตโนมัติ)"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 focus:outline-hidden"
                  />
                </div>

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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'owner', label: 'Owner / เจ้าของ' },
                      { id: 'head', label: 'Head / หัวหน้า' },
                      { id: 'team', label: 'Team / ลูกทีม' },
                      { id: 'intern', label: 'Intern / ฝึกงาน' }
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setEmpOrgLevel(lvl.id);
                          if (lvl.id === 'owner') {
                            setEmpDepartment('Owner');
                          } else if (lvl.id === 'intern') {
                            setEmpDepartment('Intern');
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      'Design',
                      'Electrical',
                      'Welding',
                      'Machine Shop',
                      'Assembly',
                      'Accounting',
                      'Intern',
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

                {/* Line ID & Line QR Code Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block flex items-center gap-1">
                      <span className="bg-[#06C755] text-white px-1 rounded text-[8px] font-black">LINE</span>
                      <span>Line ID (ไอดีไลน์พนักงาน)</span>
                    </label>
                    <input
                      type="text"
                      value={empLineId}
                      onChange={(e) => setEmpLineId(e.target.value)}
                      placeholder="เช่น @gtt2013 หรือ chalee"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block flex items-center gap-1">
                      <QrCode className="h-3 w-3 text-emerald-600" />
                      <span>อัปโหลด Line QR Code</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1.5 bg-[#06C755] hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs">
                        <Upload className="h-3 w-3" />
                        <span>{empLineQrUrl ? 'เปลี่ยนรูป QR' : 'อัปโหลด QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEmpLineQrUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {empLineQrUrl && (
                        <button
                          type="button"
                          onClick={() => setEmpLineQrUrl('')}
                          className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:text-rose-600"
                        >
                          ลบรูป QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Photo URL, Upload, or Presets */}
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-500 block">รูปถ่ายประจำตัวพนักงาน (Profile Picture)</label>
                  
                  {/* Photo Option 1: File Upload */}
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                      {empImageUrl ? (
                        <img 
                          src={empImageUrl} 
                          alt="Employee Preview" 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Camera className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-3xs">
                        <Upload className="h-3.5 w-3.5 text-indigo-500" />
                        อัปโหลดไฟล์รูปถ่ายพนักงาน
                        <input
                          id="employee-add-photo-file"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEmpImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <p className="text-[8px] text-slate-400 mt-1">ไฟล์รูปภาพ PNG, JPG หรือ GIF</p>
                    </div>
                  </div>

                  {/* Photo Option 2: Image URL */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-sans block">หรือระบุเป็นลิงก์ URL รูปภาพ:</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={empImageUrl.startsWith('data:') ? '' : empImageUrl}
                        onChange={(e) => setEmpImageUrl(e.target.value)}
                        placeholder="วางลิงก์ URL รูปภาพ เช่น https://..."
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
                      />
                      {empImageUrl && (
                        <button
                          type="button"
                          onClick={() => setEmpImageUrl('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                        >
                          เคลียร์รูป
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Preset employee avatar shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[9px] text-slate-400 font-sans">ใช้รูปจำลอง:</span>
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
                
                {/* Employee Code Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block flex items-center gap-1">
                    <IdCard className="h-3 w-3 text-indigo-500" />
                    <span>รหัสพนักงาน (Employee ID Code)</span>
                  </label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="เช่น EMP-001 หรือ INT-001"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 focus:outline-hidden"
                  />
                </div>

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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'owner', label: 'Owner / เจ้าของ' },
                      { id: 'head', label: 'Head / หัวหน้า' },
                      { id: 'team', label: 'Team / ลูกทีม' },
                      { id: 'intern', label: 'Intern / ฝึกงาน' }
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setEmpOrgLevel(lvl.id);
                          if (lvl.id === 'owner') {
                            setEmpDepartment('Owner');
                          } else if (lvl.id === 'intern') {
                            setEmpDepartment('Intern');
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      'Design',
                      'Electrical',
                      'Welding',
                      'Machine Shop',
                      'Assembly',
                      'Accounting',
                      'Intern',
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

                {/* Line ID & Line QR Code Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block flex items-center gap-1">
                      <span className="bg-[#06C755] text-white px-1 rounded text-[8px] font-black">LINE</span>
                      <span>Line ID (ไอดีไลน์พนักงาน)</span>
                    </label>
                    <input
                      type="text"
                      value={empLineId}
                      onChange={(e) => setEmpLineId(e.target.value)}
                      placeholder="เช่น @gtt2013 หรือ chalee"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block flex items-center gap-1">
                      <QrCode className="h-3 w-3 text-emerald-600" />
                      <span>อัปโหลด Line QR Code</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1.5 bg-[#06C755] hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs">
                        <Upload className="h-3 w-3" />
                        <span>{empLineQrUrl ? 'เปลี่ยนรูป QR' : 'อัปโหลด QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEmpLineQrUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {empLineQrUrl && (
                        <button
                          type="button"
                          onClick={() => setEmpLineQrUrl('')}
                          className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:text-rose-600"
                        >
                          ลบรูป QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Photo URL, Upload, or Presets */}
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-500 block">รูปถ่ายประจำตัวพนักงาน (Profile Picture)</label>
                  
                  {/* Photo Option 1: File Upload */}
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                      {empImageUrl ? (
                        <img 
                          src={empImageUrl} 
                          alt="Employee Preview" 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Camera className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-3xs">
                        <Upload className="h-3.5 w-3.5 text-indigo-500" />
                        อัปโหลดไฟล์รูปถ่ายพนักงาน
                        <input
                          id="employee-edit-photo-file"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEmpImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <p className="text-[8px] text-slate-400 mt-1">ไฟล์รูปภาพ PNG, JPG หรือ GIF</p>
                    </div>
                  </div>

                  {/* Photo Option 2: Image URL */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-sans block">หรือระบุเป็นลิงก์ URL รูปภาพ:</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={empImageUrl.startsWith('data:') ? '' : empImageUrl}
                        onChange={(e) => setEmpImageUrl(e.target.value)}
                        placeholder="วางลิงก์ URL รูปภาพ เช่น https://..."
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden"
                      />
                      {empImageUrl && (
                        <button
                          type="button"
                          onClick={() => setEmpImageUrl('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                        >
                          เคลียร์รูป
                        </button>
                      )}
                    </div>
                  </div>
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
                      {(() => {
                        const count = mediaFiles.filter(m => (brand.documentIds?.includes(m.id)) || (m.refName && m.refName.toLowerCase() === brand.name.toLowerCase())).length;
                        return (
                          <button
                            type="button"
                            onClick={() => setBrandDocModalBrand(brand)}
                            className="mt-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 rounded-full text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer mx-auto"
                            title="ดูเอกสารและรูปภาพที่เกี่ยวข้องกับแบรนด์นี้"
                          >
                            <FileText className="h-2.5 w-2.5" />
                            <span>เอกสาร ({count})</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 w-full transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand(brand);
                        setBrandName(brand.name);
                        setBrandLogo(brand.logoUrl || '');
                        setIsBrandEditModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="แก้ไขข้อมูลแบรนด์"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (triggerConfirm) {
                          triggerConfirm(
                            'ยืนยันการลบแบรนด์สินค้า',
                            `คุณต้องการลบแบรนด์ "${brand.name}" หรือไม่? แบรนด์นี้จะถูกลบออกจากระบบ ตัวเลือกแบรนด์ และรายการสินค้าที่ระบุแบรนด์นี้`,
                            () => onDeleteBrand?.(brand.id)
                          );
                        } else if (confirm(`คุณต้องการลบแบรนด์ "${brand.name}" หรือไม่? แบรนด์นี้จะถูกลบออกจากระบบ ตัวเลือกแบรนด์ และรายการสินค้าที่ระบุแบรนด์นี้`)) {
                          onDeleteBrand?.(brand.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
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
      {/* ======================= TAB 4: SUPPLIERS DIRECTORY ==================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-1.5">
                <Store className="h-4 w-4 text-indigo-500" />
                ทำเนียบร้านค้า / ผู้จัดจำหน่าย (Suppliers &amp; Stores)
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                ลงทะเบียนร้านค้า ผู้จัดจำหน่าย และซัพพลายเออร์ เพื่อเชื่อมโยงโลโก้ร้านค้า ช่องทางจัดซื้อ และแผน BOM
              </p>
            </div>
            <button
              onClick={() => {
                setSupplierName('');
                setSupplierLogo('');
                setSupplierContact('');
                setSupplierPhone('');
                setSupplierEmail('');
                setSupplierWebsite('');
                setSupplierAddress('');
                setSupplierSubStores([]);
                setNewSubName('');
                setNewSubLogoUrl('');
                setNewSubLink('');
                setIsSupplierAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs self-start md:self-auto"
              id="btn-add-supplier-modal"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มร้านค้าใหม่</span>
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
                placeholder="ค้นหาชื่อร้านค้า ผู้ติดต่อ เบอร์โทรศัพท์ หรืออีเมล..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                id="supplier-search-input"
              />
            </div>
          </div>

          {/* Suppliers list */}
          {filteredSuppliers.length === 0 ? (
            <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
              <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
                <Store className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">ไม่พบข้อมูลร้านค้า/ผู้จัดจำหน่าย</p>
              <p className="text-[10px] text-slate-400 mt-1">คุณสามารถเพิ่มร้านค้าใหม่ได้โดยคลิกปุ่ม "เพิ่มร้านค้าใหม่"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-all hover:border-indigo-500/30 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Logo Box */}
                      <div className="h-14 w-14 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {supplier.logoUrl ? (
                          <img 
                            src={supplier.logoUrl} 
                            alt={supplier.name} 
                            className="max-h-full max-w-full object-contain p-1"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xl font-black text-indigo-500 font-sans uppercase">
                            {supplier.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate" title={supplier.name}>
                          {supplier.name}
                        </h4>
                        {supplier.contactName && (
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Users className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{supplier.contactName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/80 text-[11px]">
                      {supplier.phone && (
                        <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
                          <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                        </p>
                      )}
                      {supplier.email && (
                        <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                          <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                          <a href={`mailto:${supplier.email}`} className="hover:underline truncate">{supplier.email}</a>
                        </p>
                      )}
                      {supplier.website && (
                        <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                          <Globe className="h-3 w-3 text-sky-500 shrink-0" />
                          <a 
                            href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline text-indigo-600 dark:text-indigo-400 font-medium truncate flex items-center gap-0.5"
                          >
                            <span>{supplier.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        </p>
                      )}
                      {supplier.address && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1">
                          {supplier.address}
                        </p>
                      )}

                      {/* Sub-Stores & E-Commerce Channels Display */}
                      {supplier.subStores && supplier.subStores.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 mt-2">
                          <div className="flex items-center justify-between text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                            <span className="flex items-center gap-1">
                              <ShoppingBag className="h-3 w-3" />
                              <span>ร้านค้าย่อย E-Commerce ({supplier.subStores.length})</span>
                            </span>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                            {supplier.subStores.map((sub) => (
                              <div key={sub.id} className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-150 dark:border-slate-800/80 text-[10.5px]">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                                  {sub.logoUrl ? (
                                    <img src={sub.logoUrl} alt={sub.name} className="w-4 h-4 object-contain rounded shrink-0 bg-white" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="px-1 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-black text-[8px] shrink-0">
                                      {sub.platform || 'ECom'}
                                    </span>
                                  )}
                                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{sub.name}</span>
                                </div>
                                {sub.link && (
                                  <a
                                    href={sub.link.startsWith('http') ? sub.link : `https://${sub.link}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[8.5px] flex items-center gap-0.5 shrink-0 transition-colors"
                                    title={`ไปหน้าร้านค้าย่อย ${sub.name}`}
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    <span>ลิงก์</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setSupplierName(supplier.name);
                        setSupplierLogo(supplier.logoUrl || '');
                        setSupplierContact(supplier.contactName || '');
                        setSupplierPhone(supplier.phone || '');
                        setSupplierEmail(supplier.email || '');
                        setSupplierWebsite(supplier.website || '');
                        setSupplierAddress(supplier.address || '');
                        setSupplierSubStores(supplier.subStores || []);
                        setNewSubName('');
                        setNewSubLogoUrl('');
                        setNewSubLink('');
                        setIsSupplierEditModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="แก้ไขข้อมูลร้านค้า"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (triggerConfirm) {
                          triggerConfirm(
                            'ยืนยันการลบร้านค้า',
                            `คุณต้องการลบร้านค้า "${supplier.name}" หรือไม่?`,
                            () => onDeleteSupplier?.(supplier.id)
                          );
                        } else if (confirm(`คุณต้องการลบร้านค้า "${supplier.name}" หรือไม่?`)) {
                          onDeleteSupplier?.(supplier.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="ลบร้านค้า"
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
      {/* ======================== MODAL: ADD SUPPLIER ========================== */}
      {/* ======================================================================= */}
      {isSupplierAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">เพิ่มร้านค้า / ผู้จัดจำหน่ายใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSupplierAddSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3.5">
                {/* Store Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อร้านค้า / ผู้จัดจำหน่าย <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="กรอกชื่อร้านค้า (เช่น RS Components, Shopee, HomePro)..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Logo File upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Logo ร้านค้า</label>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {supplierLogo ? (
                        <img 
                          src={supplierLogo} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Store className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
                        <Upload className="h-3.5 w-3.5" />
                        อัปโหลดโลโก้ร้านค้า
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSupplierLogo(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={supplierLogo}
                        onChange={(e) => setSupplierLogo(e.target.value)}
                        placeholder="หรือวางลิงก์ URL รูปภาพโลโก้..."
                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-md text-[10px] text-slate-800 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    placeholder="ชื่อผู้ขาย / เซลส์ / ผู้ติดต่อ..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      placeholder="02-xxx-xxxx / 08x-xxx-xxxx"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">อีเมล</label>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="sales@supplier.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">เว็บไซต์ / ลิงก์ร้านค้าออนไลน์</label>
                  <input
                    type="text"
                    value={supplierWebsite}
                    onChange={(e) => setSupplierWebsite(e.target.value)}
                    placeholder="https://www.example-store.com..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ที่อยู่ / รายละเอียดเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="ที่อยู่ร้านค้า เลขที่ผู้เสียภาษี หมายเหตุ..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden resize-none"
                  />
                </div>

                {/* Sub-Stores / E-Commerce Channels Section */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-indigo-500" />
                      <span>กลุ่มร้านค้าย่อย / ช่องทาง E-commerce ({supplierSubStores.length})</span>
                    </label>
                  </div>

                  {/* Existing sub-stores list */}
                  {supplierSubStores.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      {supplierSubStores.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {sub.logoUrl ? (
                              <img src={sub.logoUrl} alt={sub.name} className="w-5 h-5 object-contain rounded shrink-0 bg-slate-50" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-[9px] flex items-center justify-center shrink-0">
                                {sub.platform?.slice(0, 3) || 'Sub'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{sub.name}</p>
                              {sub.link && (
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">{sub.link}</p>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold text-[9px] shrink-0">
                              {sub.platform || 'General'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSupplierSubStores(prev => prev.filter(s => s.id !== sub.id))}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors ml-1 cursor-pointer shrink-0"
                            title="ลบร้านค้าย่อยนี้"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add sub-store inline form */}
                  <div className="bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 block">แพลตฟอร์ม</label>
                        <select
                          value={newSubPlatform}
                          onChange={(e) => setNewSubPlatform(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        >
                          <option value="Shopee">Shopee</option>
                          <option value="Lazada">Lazada</option>
                          <option value="TikTok">TikTok Shop</option>
                          <option value="Line">LINE Shop</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Website">Website</option>
                          <option value="Other">อื่นๆ</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 block">ชื่อร้านค้าย่อย / สาขา</label>
                        <input
                          type="text"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          placeholder="เช่น Shopee Official Store..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 block">ลิงก์ URL หน้าร้านค้าย่อย E-commerce</label>
                      <input
                        type="text"
                        value={newSubLink}
                        onChange={(e) => setNewSubLink(e.target.value)}
                        placeholder="https://shopee.co.th/..."
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 block">รูป/โลโก้ร้านค้าย่อย (อัปโหลดหรือ URL)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newSubLogoUrl}
                            onChange={(e) => setNewSubLogoUrl(e.target.value)}
                            placeholder="URL รูปโลโก้..."
                            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                          />
                          <label className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer shrink-0">
                            <Upload className="h-3 w-3 inline mr-1" />
                            ไฟล์
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewSubLogoUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!newSubName.trim() && !newSubLink.trim()) return;
                          const subItem: SubStore = {
                            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                            name: newSubName.trim() || `${newSubPlatform} Store`,
                            platform: newSubPlatform,
                            logoUrl: newSubLogoUrl.trim() || undefined,
                            link: newSubLink.trim() || undefined
                          };
                          setSupplierSubStores(prev => [...prev, subItem]);
                          setNewSubName('');
                          setNewSubLogoUrl('');
                          setNewSubLink('');
                        }}
                        className="self-end px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>เพิ่ม</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  type="button"
                  onClick={() => setIsSupplierAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  บันทึกข้อมูลร้านค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= MODAL: EDIT SUPPLIER ========================== */}
      {/* ======================================================================= */}
      {isSupplierEditModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">แก้ไขข้อมูลร้านค้า</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSupplierEditSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3.5">
                {/* Store Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อร้านค้า / ผู้จัดจำหน่าย <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="กรอกชื่อร้านค้า..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Logo File upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Logo ร้านค้า</label>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {supplierLogo ? (
                        <img 
                          src={supplierLogo} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Store className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
                        <Upload className="h-3.5 w-3.5" />
                        เปลี่ยนโลโก้ร้านค้า
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSupplierLogo(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={supplierLogo}
                        onChange={(e) => setSupplierLogo(e.target.value)}
                        placeholder="หรือวางลิงก์ URL รูปภาพโลโก้..."
                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-md text-[10px] text-slate-800 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    placeholder="ชื่อผู้ขาย / เซลส์..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      placeholder="02-xxx-xxxx"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">อีเมล</label>
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="sales@supplier.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">เว็บไซต์ / ลิงก์ร้านค้าออนไลน์</label>
                  <input
                    type="text"
                    value={supplierWebsite}
                    onChange={(e) => setSupplierWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">ที่อยู่ / รายละเอียดเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="ที่อยู่ร้านค้า..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden resize-none"
                  />
                </div>

                {/* Sub-Stores / E-Commerce Channels Section */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5 text-indigo-500" />
                      <span>กลุ่มร้านค้าย่อย / ช่องทาง E-commerce ({supplierSubStores.length})</span>
                    </label>
                  </div>

                  {/* Existing sub-stores list */}
                  {supplierSubStores.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      {supplierSubStores.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-2xs text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {sub.logoUrl ? (
                              <img src={sub.logoUrl} alt={sub.name} className="w-5 h-5 object-contain rounded shrink-0 bg-slate-50" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-[9px] flex items-center justify-center shrink-0">
                                {sub.platform?.slice(0, 3) || 'Sub'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{sub.name}</p>
                              {sub.link && (
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">{sub.link}</p>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold text-[9px] shrink-0">
                              {sub.platform || 'General'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSupplierSubStores(prev => prev.filter(s => s.id !== sub.id))}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors ml-1 cursor-pointer shrink-0"
                            title="ลบร้านค้าย่อยนี้"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add sub-store inline form */}
                  <div className="bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 block">แพลตฟอร์ม</label>
                        <select
                          value={newSubPlatform}
                          onChange={(e) => setNewSubPlatform(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        >
                          <option value="Shopee">Shopee</option>
                          <option value="Lazada">Lazada</option>
                          <option value="TikTok">TikTok Shop</option>
                          <option value="Line">LINE Shop</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Website">Website</option>
                          <option value="Other">อื่นๆ</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 block">ชื่อร้านค้าย่อย / สาขา</label>
                        <input
                          type="text"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          placeholder="เช่น Shopee Official Store..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 block">ลิงก์ URL หน้าร้านค้าย่อย E-commerce</label>
                      <input
                        type="text"
                        value={newSubLink}
                        onChange={(e) => setNewSubLink(e.target.value)}
                        placeholder="https://shopee.co.th/..."
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 block">รูป/โลโก้ร้านค้าย่อย (อัปโหลดหรือ URL)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newSubLogoUrl}
                            onChange={(e) => setNewSubLogoUrl(e.target.value)}
                            placeholder="URL รูปโลโก้..."
                            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                          />
                          <label className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer shrink-0">
                            <Upload className="h-3 w-3 inline mr-1" />
                            ไฟล์
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewSubLogoUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!newSubName.trim() && !newSubLink.trim()) return;
                          const subItem: SubStore = {
                            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                            name: newSubName.trim() || `${newSubPlatform} Store`,
                            platform: newSubPlatform,
                            logoUrl: newSubLogoUrl.trim() || undefined,
                            link: newSubLink.trim() || undefined
                          };
                          setSupplierSubStores(prev => [...prev, subItem]);
                          setNewSubName('');
                          setNewSubLogoUrl('');
                          setNewSubLink('');
                        }}
                        className="self-end px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>เพิ่ม</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  type="button"
                  onClick={() => setIsSupplierEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
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
              onSubmit={handleBrandAddSubmit}
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
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
                          <Upload className="h-3.5 w-3.5" />
                          อัปโหลดไฟล์
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
                                setBrandLogo(base64);
                                if (onAddMediaFile && base64) {
                                  onAddMediaFile({
                                    name: brandName ? `โลโก้แบรนด์: ${brandName}` : `โลโก้แบรนด์ ${file.name}`,
                                    type: 'image',
                                    url: base64,
                                    category: 'แบรนด์',
                                    refName: brandName || undefined,
                                    size: file.size,
                                    fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMediaPickerOpen(true);
                            setPickerTarget('brandLogo');
                          }}
                          className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-indigo-200/50 dark:border-indigo-800/50 shrink-0"
                          title="เลือกรูปภาพโลโก้จากคลังสื่อ"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>เลือกจากคลัง</span>
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-400">ขนาดแนะนำ: อัตราส่วน 1:1, สี่เหลี่ยมจัตุรัส</p>
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
              onSubmit={handleBrandEditSubmit}
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
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
                          <Upload className="h-3.5 w-3.5" />
                          เปลี่ยนไฟล์รูปภาพ
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
                                setBrandLogo(base64);
                                if (onAddMediaFile && base64) {
                                  onAddMediaFile({
                                    name: brandName ? `โลโก้แบรนด์: ${brandName}` : `โลโก้แบรนด์ ${file.name}`,
                                    type: 'image',
                                    url: base64,
                                    category: 'แบรนด์',
                                    refName: brandName || undefined,
                                    size: file.size,
                                    fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMediaPickerOpen(true);
                            setPickerTarget('brandLogo');
                          }}
                          className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-indigo-200/50 dark:border-indigo-800/50 shrink-0"
                          title="เลือกรูปภาพโลโก้จากคลังสื่อ"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>เลือกจากคลัง</span>
                        </button>
                      </div>
                      <p className="text-[8px] text-slate-400">ขนาดแนะนำ: อัตราส่วน 1:1, สี่เหลี่ยมจัตุรัส</p>
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

      {/* ======================================================================= */}
      {/* ==================== TAB: MEDIA & DOCUMENT GALLERY ===================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'media' && (
        <div className="space-y-4 animate-in fade-in duration-200 text-left">
          {/* Header & Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-indigo-500" />
                คลังรูปภาพ & ไฟล์เอกสาร (Media & Document Repository)
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                ศูนย์กลางจัดเก็บรูปภาพโลโก้แบรนด์, รูปภาพสินค้า, คู่มือการใช้งาน, แคตตาล็อก PDF และไฟล์เอกสารสำคัญ ป้องกันไฟล์สูญหาย
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMediaName('');
                setMediaUrl('');
                setMediaCategory('แบรนด์');
                setMediaType('image');
                setMediaFileType('');
                setMediaRefName('');
                setMediaNotes('');
                setIsAddMediaModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs self-start md:self-auto"
              id="btn-add-media-modal"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มรูปภาพ / เอกสารใหม่</span>
            </button>
          </div>

          {/* Stat Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-lg shrink-0">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">ไฟล์รวมทั้งหมด</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{mediaFiles.length} รายการ</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-lg shrink-0">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">ขนาดไฟล์รวม</p>
                <p className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">{formatBytes(totalMediaBytes)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg shrink-0">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">รูปภาพ & โลโก้</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {mediaFiles.filter(m => m.type === 'image').length} ไฟล์
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">ไฟล์เอกสาร & PDF</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {mediaFiles.filter(m => m.type === 'document' || m.type === 'other').length} ไฟล์
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg shrink-0">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">หมวดหมู่ทั้งหมด</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {availableMediaCategories.length} หมวด
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาตามชื่อไฟล์, แบรนด์, หรือโน้ต..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    mediaTypeFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter('image')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    mediaTypeFilter === 'image' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  <ImageIcon className="h-3 w-3" />
                  รูปภาพ
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTypeFilter('document')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    mediaTypeFilter === 'document' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black' : 'text-slate-500'
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  เอกสาร
                </button>
              </div>

              <select
                value={mediaCategoryFilter}
                onChange={(e) => setMediaCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="all">ทุกหมวดหมู่ ({mediaFiles.length})</option>
                {availableMediaCategories.map((cat) => {
                  const count = mediaFiles.filter((f) => f.category === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      หมวด: {cat} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Category Pills Bar & Total Size Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar text-xs">
              <span className="text-slate-400 text-[10px] shrink-0 font-bold mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3 text-indigo-500" /> หมวดหมู่:
              </span>
              <button
                type="button"
                onClick={() => setMediaCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                  mediaCategoryFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                }`}
              >
                <span>ทั้งหมด</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  mediaCategoryFilter === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {mediaFiles.length}
                </span>
              </button>
              {availableMediaCategories.map((cat) => {
                const count = mediaFiles.filter((f) => f.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMediaCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                      mediaCategoryFilter === cat
                        ? 'bg-indigo-600 text-white shadow-2xs font-black'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                      mediaCategoryFilter === cat ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 shrink-0 self-end sm:self-auto bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              <HardDrive className="h-3 w-3 text-purple-500" />
              <span>ขนาดไฟล์รวมที่เลือก:</span>
              <span className="text-purple-600 dark:text-purple-400 font-extrabold font-mono">{formatBytes(filteredMediaBytes)}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-400 font-mono" title="ขนาดไฟล์รวมทั้งหมด">{formatBytes(totalMediaBytes)}</span>
            </div>
          </div>

          {/* Files Grid */}
          {filteredMediaFiles.length === 0 ? (
            <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
              <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
                <FolderOpen className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">ยังไม่มีไฟล์หรือรูปภาพในคลัง</p>
              <p className="text-[10px] text-slate-400 mt-1">คลิกปุ่ม "เพิ่มรูปภาพ / เอกสารใหม่" หรืออัปโหลดโลโก้แบรนด์เพื่อจัดเก็บไฟล์ลงในระบบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredMediaFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-xs transition-all hover:border-indigo-500/30 group relative overflow-hidden"
                >
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      {file.category || 'ทั่วไป'}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono">
                      {file.fileType || (file.type === 'image' ? 'IMG' : 'DOC')}
                    </span>
                  </div>

                  {/* Thumbnail / Icon Box */}
                  <div 
                    onClick={() => {
                      if (file.type === 'image') {
                        setPreviewMediaFile(file);
                      } else {
                        window.open(file.url, '_blank');
                      }
                    }}
                    className="h-28 w-full bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer group-hover:bg-slate-100 dark:group-hover:bg-slate-800/60 transition-all relative"
                  >
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-center space-y-1">
                        <FileText className="h-8 w-8 text-indigo-500" />
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 font-mono uppercase">
                          {file.fileType || 'DOCUMENT'}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-1.5 bg-white/90 dark:bg-slate-900/90 rounded-lg text-[9px] font-extrabold text-slate-800 dark:text-slate-100 shadow-xs flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {file.type === 'image' ? 'ขยายรูป' : 'เปิดไฟล์'}
                      </span>
                    </div>
                  </div>

                  {/* File Details */}
                  <div className="mt-2.5 space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate font-sans" title={file.name}>
                      {file.name}
                    </p>
                    {file.refName && (
                      <p className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" />
                        <span>{file.refName}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1 border-t border-slate-50 dark:border-slate-800/80">
                      <span>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A'}</span>
                      <span>{new Date(file.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(file.url);
                          addToast?.('success', 'คัดลอกสำเร็จ', 'คัดลอก Data/URL ของไฟล์เรียบร้อยแล้ว');
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        title="คัดลอกลิงก์/Data"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        title="ดาวน์โหลดไฟล์"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMediaFile(file);
                          setMediaName(file.name);
                          setMediaCategory(file.category || 'ทั่วไป');
                          setMediaRefName(file.refName || '');
                          setMediaNotes(file.notes || '');
                          setMediaUrl(file.url || '');
                          setMediaType(file.type || 'image');
                          setMediaFileType(file.fileType || '');
                          setMediaSize(file.size);
                          setIsEditMediaModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        title="แก้ไขข้อมูลไฟล์"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (triggerConfirm) {
                            triggerConfirm(
                              'ยืนยันการลบไฟล์',
                              `คุณต้องการลบไฟล์ "${file.name}" จากคลังหรือไม่?`,
                              () => onDeleteMediaFile?.(file.id)
                            );
                          } else if (confirm(`คุณต้องการลบไฟล์ "${file.name}" หรือไม่?`)) {
                            onDeleteMediaFile?.(file.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        title="ลบไฟล์"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= MODAL: ADD MEDIA FILE ========================= */}
      {/* ======================================================================= */}
      {isAddMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">เพิ่มรูปภาพ / อัปโหลดไฟล์เอกสาร</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMediaModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMediaAddSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4 text-left">
                {/* File Upload Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">เลือกไฟล์รูปภาพ หรือ เอกสาร (PDF, DOCX, XLSX, TXT) <span className="text-rose-500">*</span></label>
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 dark:hover:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl transition-all cursor-pointer text-center group">
                    <CloudUpload className="h-8 w-8 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">คลิกเพื่ออัปโหลดไฟล์ หรือ ลากไฟล์มาวางที่นี่</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">รองรับไฟล์รูปภาพ PNG, JPG, WEBP และเอกสาร PDF, DOCX, XLSX</span>
                    <input
                      type="file"
                      required={!mediaUrl}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setMediaName(file.name.replace(/\.[^/.]+$/, ""));
                        setMediaSize(file.size);
                        const ext = file.name.split('.').pop()?.toUpperCase() || '';
                        setMediaFileType(ext);

                        if (file.type.startsWith('image/')) {
                          setMediaType('image');
                        } else {
                          setMediaType('document');
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMediaUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {mediaUrl && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 truncate">✓ เลือกไฟล์แล้ว: {mediaName} ({mediaFileType})</span>
                      <button type="button" onClick={() => setMediaUrl('')} className="text-rose-500 font-bold hover:underline">เปลี่ยนไฟล์</button>
                    </div>
                  )}
                </div>

                {/* File Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อไฟล์ / ชื่อเอกสาร <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={mediaName}
                    onChange={(e) => setMediaName(e.target.value)}
                    placeholder="กรอกชื่อไฟล์ (เช่น โลโก้ Siemens 2026, แคตตาล็อกสินค้า)..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หมวดหมู่ไฟล์</label>
                  <select
                    value={mediaCategory}
                    onChange={(e) => setMediaCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                  >
                    {availableMediaCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">รายละเอียด / คำอธิบายเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={mediaNotes}
                    onChange={(e) => setMediaNotes(e.target.value)}
                    placeholder="บันทึกรายละเอียดเพิ่มเติมของไฟล์นี้..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAddMediaModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!mediaName.trim() || !mediaUrl.trim()}
                  className={`px-4 py-1.5 text-xs font-black text-white rounded-lg cursor-pointer shadow-xs transition-all ${
                    mediaName.trim() && mediaUrl.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  บันทึกไฟล์ลงคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================= MODAL: EDIT MEDIA FILE ======================== */}
      {/* ======================================================================= */}
      {isEditMediaModalOpen && selectedMediaFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">แก้ไขข้อมูลไฟล์ในคลัง</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditMediaModalOpen(false);
                  setSelectedMediaFile(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleMediaEditSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4 text-left">
                {/* File Upload / Replace Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">เปลี่ยนไฟล์รูปภาพ หรือ เอกสาร (ถ้าต้องการ)</label>
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 dark:hover:border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl transition-all cursor-pointer text-center group">
                    <CloudUpload className="h-6 w-6 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">คลิกเพื่ออัปโหลดไฟล์ใหม่แทนที่ไฟล์เดิม</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setMediaSize(file.size);
                        const ext = file.name.split('.').pop()?.toUpperCase() || '';
                        setMediaFileType(ext);

                        if (file.type.startsWith('image/')) {
                          setMediaType('image');
                        } else {
                          setMediaType('document');
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMediaUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {mediaUrl && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-3 text-[10px]">
                      {mediaType === 'image' && (
                        <img src={mediaUrl} alt="Preview" className="w-10 h-10 object-contain rounded bg-white border border-slate-200 dark:border-slate-700 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-700 dark:text-slate-200 truncate">ประเภทไฟล์: {mediaFileType || 'FILE'}</p>
                        <p className="text-[9px] text-slate-400">ขนาด: {mediaSize ? `${(mediaSize / 1024).toFixed(1)} KB` : 'ไม่ระบุ'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">ชื่อไฟล์ / ชื่อเอกสาร <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={mediaName}
                    onChange={(e) => setMediaName(e.target.value)}
                    placeholder="กรอกชื่อไฟล์..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">หมวดหมู่ไฟล์</label>
                  <select
                    value={mediaCategory}
                    onChange={(e) => setMediaCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                  >
                    {availableMediaCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">รายละเอียดเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={mediaNotes}
                    onChange={(e) => setMediaNotes(e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติม..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex justify-end gap-2 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMediaModalOpen(false);
                    setSelectedMediaFile(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!mediaName.trim()}
                  className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer shadow-xs transition-all"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ================== MODAL: FULL IMAGE / FILE PREVIEW =================== */}
      {/* ======================================================================= */}
      {previewMediaFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{previewMediaFile.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMediaFile(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-slate-950/90">
              <img
                src={previewMediaFile.url}
                alt={previewMediaFile.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="space-y-0.5 text-[10px]">
                {previewMediaFile.refName && <p>แบรนด์ที่เชื่อมโยง: <strong className="text-indigo-500">{previewMediaFile.refName}</strong></p>}
                {previewMediaFile.notes && <p className="text-slate-400">{previewMediaFile.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewMediaFile.url);
                    addToast?.('success', 'คัดลอกสำเร็จ', 'คัดลอก Data URL เรียบร้อยแล้ว');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  คัดลอก
                </button>
                <a
                  href={previewMediaFile.url}
                  download={previewMediaFile.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  ดาวน์โหลด
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ======================== MODAL: MEDIA PICKER ========================== */}
      {/* ======================================================================= */}
      {isMediaPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 text-left">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">เลือกรูปภาพจากคลังสื่อระบบ</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <input
                type="text"
                placeholder="ค้นหาชื่อรูปภาพหรือแบรนด์..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              />
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {filteredMediaFiles.filter(m => m.type === 'image').length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ยังไม่มีรูปภาพในคลังสื่อ คุณสามารถอัปโหลดรูปภาพใหม่ได้ที่แฮชแท็ก "คลังรูปภาพ & ไฟล์เอกสาร"
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filteredMediaFiles.filter(m => m.type === 'image').map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        if (pickerTarget === 'brandLogo') {
                          setBrandLogo(file.url);
                        }
                        setIsMediaPickerOpen(false);
                      }}
                      className="group bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col items-center justify-between cursor-pointer hover:border-indigo-500 transition-all relative overflow-hidden"
                    >
                      <div className="h-20 w-full flex items-center justify-center overflow-hidden">
                        <img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate w-full mt-1 text-center">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ================= MODAL: BRAND DOCUMENTS & CATALOGS =================== */}
      {/* ======================================================================= */}
      {brandDocModalBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 text-left">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {brandDocModalBrand.logoUrl ? (
                    <img src={brandDocModalBrand.logoUrl} alt={brandDocModalBrand.name} className="max-h-full max-w-full object-contain p-0.5" referrerPolicy="no-referrer" />
                  ) : (
                    <Tag className="h-4 w-4 text-indigo-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">เอกสาร & แคตตาล็อก: {brandDocModalBrand.name}</h3>
                  <p className="text-[9px] text-slate-400">รายการไฟล์เอกสารและรูปภาพที่เกี่ยวข้องกับแบรนด์นี้</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBrandDocModalBrand(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {(() => {
                const brandDocs = mediaFiles.filter(m => (brandDocModalBrand.documentIds?.includes(m.id)) || (m.refName && m.refName.toLowerCase() === brandDocModalBrand.name.toLowerCase()));
                if (brandDocs.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      ยังไม่มีเอกสารหรือรูปภาพเชื่อมโยงกับแบรนด์ "{brandDocModalBrand.name}"
                      <p className="text-[10px] text-slate-400 mt-1">คุณสามารถเพิ่มรูปภาพหรือเอกสารใหม่ในแฮชแท็ก "คลังรูปภาพ & ไฟล์เอกสาร" พร้อมระบุชื่อแบรนด์นี้ได้</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {brandDocs.map(docFile => (
                      <div key={docFile.id} className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          {docFile.type === 'image' ? (
                            <img src={docFile.url} alt={docFile.name} className="h-10 w-10 object-contain bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-[10px] font-mono">
                              {docFile.fileType || 'PDF'}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{docFile.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{docFile.category || 'แบรนด์'} • {docFile.size ? `${(docFile.size / 1024).toFixed(1)} KB` : 'Data'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={docFile.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>เปิดดู / ดาวน์โหลด</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ===================== TAB 4: DATABASE & RECOVERY ====================== */}
      {/* ======================================================================= */}
      {activeSubTab === 'database' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-left">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-500" />
              จัดการฐานข้อมูล คลังสำรอง และการกู้คืน (Database Backup & Recovery)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              จัดการกู้คืนชุดสินค้าและสูตรคำนวณเริ่มต้น หรือสำรองข้อมูลไฟล์เก็บไว้ในกรณีอุปกรณ์สูญหายหรือข้อมูลขาดหาย
            </p>
          </div>

          {/* Unified Central Database Status & Record Collections List */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-500/30 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30 shrink-0">
                  <Server className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-extrabold text-white font-sans">
                      รายการและสถานะข้อมูลที่บันทึกในระบบ Database หลัก
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                      ทุก ID ใช้งาน Database เดียวกัน
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                    ทุกบัญชีผู้ใช้งาน (Admin, Editor, User) ถูกเชื่อมโยงเข้ากับ <strong>ฐานข้อมูลหลักกลางชุดเดียวกันแบบ Real-time</strong> การอัปเดตข้อมูลจากบัญชีใดจะมีผลทันทีต่อทุกบัญชี
                  </p>
                </div>
              </div>

              {onSaveAllToDatabase && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onSaveAllToDatabase}
                    disabled={isSavingAllToDb}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    id="btn-settings-save-all-to-db"
                  >
                    <CloudUpload className={`h-4 w-4 ${isSavingAllToDb ? 'animate-spin' : ''}`} />
                    <span>{isSavingAllToDb ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทั้งหมดลง Database หลัก'}</span>
                  </button>
                  {lastDbSyncTime && (
                    <div className="text-[11px] font-medium text-emerald-200/90 flex items-center gap-1.5 mt-0.5 bg-slate-900/40 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      <span>อัปเดตข้อมูลล่าสุด: <strong className="text-white font-mono">{lastDbSyncTime}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grid of collections records count */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">📦 สินค้าในคลัง (Products)</div>
                <div className="text-xl font-black text-white">{products.length} <span className="text-[10px] font-normal text-indigo-300">รายการ</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">📁 หมวดหมู่ (Categories)</div>
                <div className="text-xl font-black text-white">{categories.length} <span className="text-[10px] font-normal text-indigo-300">หมวด</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">🛠️ สูตร BOM (BOMs)</div>
                <div className="text-xl font-black text-white">{boms.length} <span className="text-[10px] font-normal text-indigo-300">ชุด</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">🏗️ โครงการ (Projects)</div>
                <div className="text-xl font-black text-white">{jobProjects.length} <span className="text-[10px] font-normal text-indigo-300">โครงการ</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">📋 ใบสั่งงาน (Jobs)</div>
                <div className="text-xl font-black text-white">{jobs.length} <span className="text-[10px] font-normal text-indigo-300">ใบงาน</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">👥 พนักงาน (Employees)</div>
                <div className="text-xl font-black text-white">{employees.length} <span className="text-[10px] font-normal text-indigo-300">คน</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">🏷️ แบรนด์ (Brands)</div>
                <div className="text-xl font-black text-white">{brands.length} <span className="text-[10px] font-normal text-indigo-300">ยี่ห้อ</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">📝 รายงานวัน (Daily)</div>
                <div className="text-xl font-black text-white">{dailyReports.length} <span className="text-[10px] font-normal text-indigo-300">รายงาน</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">📜 ประวัติ (Activities)</div>
                <div className="text-xl font-black text-white">{activities.length} <span className="text-[10px] font-normal text-indigo-300">บันทึก</span></div>
              </div>
              <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/15">
                <div className="text-[10px] text-indigo-200 font-bold mb-1">🛡️ บัญชีผู้ใช้ (User Roles)</div>
                <div className="text-xl font-black text-white">{userRoles.length} <span className="text-[10px] font-normal text-indigo-300">บัญชี</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 2: Restore / Upload to Main Database */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-3xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 font-sans">
                    อัปโหลดเพื่อกู้คืนไฟล์ข้อมูล เข้า Database หลัก
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    คุณสามารถอัปโหลดไฟล์ข้อมูล (.json) เพื่อบันทึกและกู้คืนเข้าสู่ Database หลักกลางของระบบ ทุก ID อ่านเขียนข้อมูลบน Database เดียวกัน
                  </p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-2 justify-end font-sans">
                <button
                  type="button"
                  onClick={onDownloadBackup}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold text-[10px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  ดาวน์โหลดไฟล์สำรอง (.json)
                </button>

                <label
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                >
                  <Upload className="h-3.5 w-3.5" />
                  อัปโหลดเพื่อกู้คืนไฟล์ข้อมูล เข้า Database หลัก
                  <input
                    type="file"
                    accept=".json"
                    onChange={onRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>






            {/* Box 5: Online Only Notice (Offline mode disabled) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-3xs col-span-1 md:col-span-2 font-sans text-white">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      ระบบทำงานในรูปแบบออนไลน์ Real-time 100% (Online Only System)
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full">
                      ● เชื่อมต่อคลาวด์แล้ว
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    ปิดการใช้งานระบบแคชออฟไลน์ในเครื่อง (Offline Mode Disabled) ทุกการบันทึก ทำรายการ หรือแก้ไขข้อมูล จะถูกส่งตรงไปยังฐานข้อมูลกลางออนไลน์ (Real-time Cloud Database) ทันที ทุกบัญชีผู้ใช้งานจะมองเห็นและใช้ข้อมูลเดียวกันทั้งหมด
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Employee Business Card Generator Modal */}
      <BusinessCardModal
        isOpen={isBusinessCardModalOpen}
        onClose={() => setIsBusinessCardModalOpen(false)}
        employees={employees}
        selectedEmployee={selectedEmpForCard}
        onEditEmployee={onEditEmployee}
        companyProfile={companyProfile}
      />

    </div>
  );
}
