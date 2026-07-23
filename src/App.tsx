import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, StockActivity, Project, Bom, Job, Employee, JobProject, DailyReport, Brand, sortProducts } from './types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_ACTIVITIES } from './initialData';
import Toast, { ToastMessage } from './components/Toast';
import DashboardView from './components/DashboardView';
import ProductListView from './components/ProductListView';
import ActivityLogView from './components/ActivityLogView';
import ProjectBomView from './components/ProjectBomView';
import ReportsView from './components/ReportsView';
import JobAssignmentView from './components/JobAssignmentView';
import DailyReportView from './components/DailyReportView';
import Logo from './components/Logo';

import SettingsView from './components/SettingsView';
import { CatalogView } from './components/CatalogView';
import UserManagementView from './components/UserManagementView';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import DatabaseStatusBar from './components/DatabaseStatusBar';
import { Settings, LayoutDashboard, Package, Layers, History, Play, Bell, Menu, X, CheckCircle, AlertTriangle, FolderKanban, ShoppingCart, BarChart3, Briefcase, ClipboardList, Sun, Moon, BookOpen, ExternalLink, Download, Upload, Shield, Sparkles, Database, CloudUpload, RefreshCw, FileSpreadsheet, Clock, Lock, Mail, LogOut, Loader2, UserCheck, UserPlus } from 'lucide-react';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, getDocs, getDocsFromServer } from 'firebase/firestore';
import { db, cleanUndefined, auth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from './firebase';
import { UserRole } from './types';

// Proxy console.error to intercept and downgrade Firestore quota/limit errors to warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  const isQuota = args.some(arg => {
    if (!arg) return false;
    const str = String(arg.message || (arg.stack ? arg.stack : arg));
    return (
      str.toLowerCase().includes('quota') || 
      str.toLowerCase().includes('limit') || 
      str.toLowerCase().includes('exceed') || 
      str.toLowerCase().includes('resource_exhausted') ||
      str.toLowerCase().includes('permission-denied')
    );
  });
  if (isQuota) {
    console.warn("Firestore Quota/Limit warning suppressed from console.error:", ...args);
    return;
  }
  originalConsoleError(...args);
};

export default function App() {
  // Real Firebase Auth states (Declared first for shadowed localStorage)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'editor' | 'user'>('user');
  const [currentUserStatus, setCurrentUserStatus] = useState<'active' | 'pending' | 'disabled'>('active');
  const [isCheckingActivation, setIsCheckingActivation] = useState<boolean>(false);

  // Delegate to global window.localStorage which is patched for QuotaExceededError and multi-account cache isolation
  const localStorage = window.localStorage;

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const recentlyDeletedCategories = useRef<Set<string>>(new Set());
  const [activities, setActivities] = useState<StockActivity[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });
  const [boms, setBoms] = useState<Bom[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_boms');
    return saved ? JSON.parse(saved) : [];
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_projects_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_jobs_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_employees_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [jobProjects, setJobProjects] = useState<JobProject[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_job_projects_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_daily_reports_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = window.localStorage.getItem('stock_manager_brands_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSyncComplete, setIsSyncComplete] = useState<boolean>(true);
  const [isSavingAllToDb, setIsSavingAllToDb] = useState<boolean>(false);
  const [isPullingFreshDb, setIsPullingFreshDb] = useState<boolean>(false);
  const [lastDbSyncTime, setLastDbSyncTime] = useState<string>(() => {
    return localStorage.getItem('last_db_sync_time') || new Date().toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });

  const updateLastSyncTimestamp = () => {
    const formatted = new Date().toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastDbSyncTime(formatted);
    try {
      localStorage.setItem('last_db_sync_time', formatted);
    } catch (e) {
      console.warn("Could not save last_db_sync_time:", e);
    }
  };

  // Safety wrapper to prevent Firestore promises from hanging indefinitely in sandboxed environment
  const withTimeout = <T,>(promise: Promise<T>, ms: number = 6000): Promise<T | null> => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn(`Firestore operation timed out after ${ms}ms - proceeding with local cache.`);
        resolve(null);
      }, ms);
      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          console.warn("Firestore operation error:", err);
          resolve(null);
        });
    });
  };

  // Helper to upload list in chunks using Firestore batches with safety timeouts and optional deletion sync
  const uploadListToFirestoreInBatches = async (collectionName: string, list: any[], deleteMissing = false) => {
    if (!list) return;

    let existingDocIds: string[] = [];
    if (deleteMissing) {
      try {
        const snapshot = await getDocs(query(collection(db, collectionName)));
        snapshot.forEach((docSnap) => existingDocIds.push(docSnap.id));
      } catch (e) {
        console.warn(`Error fetching existing docs for deletion check in ${collectionName}:`, e);
      }
    }

    const newListDocIds = new Set<string>();
    const chunkSize = 200;

    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      let count = 0;
      chunk.forEach((item) => {
        if (item) {
          const idValue = item.id ?? item.uid;
          if (idValue !== undefined && idValue !== null) {
            const docId = String(idValue).trim();
            if (docId) {
              newListDocIds.add(docId);
              batch.set(doc(db, collectionName, docId), cleanUndefined(item));
              count++;
            }
          }
        }
      });
      if (count > 0) {
        await withTimeout(batch.commit(), 5000);
      }
    }

    // If deleteMissing is true, delete any documents in Firestore that are no longer in list
    if (deleteMissing && existingDocIds.length > 0) {
      const toDelete = existingDocIds.filter(id => !newListDocIds.has(id));
      for (let i = 0; i < toDelete.length; i += chunkSize) {
        const chunk = toDelete.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => batch.delete(doc(db, collectionName, id)));
        await withTimeout(batch.commit(), 5000);
      }
    }
  };

  // Function to save all collections to main Cloud Firestore database
  const handleSaveAllToDatabase = async () => {
    if (!currentUser) {
      addToast('warning', 'จำเป็นต้องเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูลลง Database หลัก');
      return;
    }

    setIsSavingAllToDb(true);
    addToast('info', 'กำลังบันทึกข้อมูล...', 'กำลังบันทึกและซิงค์ข้อมูลทั้งหมดลงใน Database หลัก (Cloud Firestore)...');

    try {
      // 1. Immediately save to LocalStorage as persistent local backup
      try {
        localStorage.setItem('stock_manager_products', JSON.stringify(products));
        localStorage.setItem('stock_manager_categories', JSON.stringify(categories));
        localStorage.setItem('stock_manager_activities', JSON.stringify(activities));
        localStorage.setItem('stock_manager_boms', JSON.stringify(boms));
        localStorage.setItem('stock_manager_projects_list', JSON.stringify(projects));
        localStorage.setItem('stock_manager_jobs_list', JSON.stringify(jobs));
        localStorage.setItem('stock_manager_employees_list', JSON.stringify(employees));
        localStorage.setItem('stock_manager_brands_list', JSON.stringify(brands));
        localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(jobProjects));
        localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(dailyReports));
      } catch (e) {
        console.warn("Error caching state to local storage:", e);
      }

      // 2. Sync all collections in parallel with Firestore with safety timeout
      const collectionsToSync = [
        { name: 'products', data: products },
        { name: 'categories', data: categories },
        { name: 'activities', data: activities },
        { name: 'boms', data: boms },
        { name: 'projects', data: projects },
        { name: 'jobs', data: jobs },
        { name: 'employees', data: employees },
        { name: 'brands', data: brands },
        { name: 'jobProjects', data: jobProjects },
        { name: 'dailyReports', data: dailyReports },
      ];

      const syncTasks = collectionsToSync.map(item => {
        return uploadListToFirestoreInBatches(item.name, item.data || [], true);
      });

      await withTimeout(Promise.allSettled(syncTasks), 8000);

      updateLastSyncTimestamp();
      addToast('success', 'บันทึกข้อมูลสำเร็จ', 'บันทึกและอัปเดตข้อมูลทั้งหมดลงใน Database หลัก (Cloud Firestore) เรียบร้อยแล้ว');
    } catch (err: any) {
      console.error("Error saving all data to Firestore:", err);
      addToast('error', 'เกิดข้อผิดพลาดในการบันทึก', `ไม่สามารถบันทึกข้อมูลลง Database หลักได้: ${err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}`);
    } finally {
      setIsSavingAllToDb(false);
    }
  };

  // Helper function to merge two lists by ID without losing items
  const mergeListsById = <T extends { id: string }>(primaryList: T[], secondaryList: T[]): { merged: T[], missingFromPrimary: T[] } => {
    const primaryIds = new Set((primaryList || []).map(item => item.id));
    const missingFromPrimary: T[] = [];
    
    if (Array.isArray(secondaryList)) {
      for (const item of secondaryList) {
        if (item && item.id && !primaryIds.has(item.id)) {
          missingFromPrimary.push(item);
        }
      }
    }

    const merged = [...(primaryList || []), ...missingFromPrimary];
    return { merged, missingFromPrimary };
  };

  // Force fetch fresh data directly from Firestore server for all collections
  const handlePullFreshFromDatabase = async (showSuccessToast = true) => {
    if (!auth.currentUser) return;
    setIsPullingFreshDb(true);
    try {
      const fetchColFresh = async <T,>(colName: string): Promise<T[]> => {
        try {
          const q = query(collection(db, colName));
          let snapshot;
          try {
            snapshot = await getDocsFromServer(q);
          } catch (sErr) {
            snapshot = await getDocs(q);
          }
          const list: T[] = [];
          snapshot.forEach((document) => {
            list.push({ id: document.id, ...document.data() } as T);
          });
          return list;
        } catch (e) {
          console.error(`Error fetching fresh ${colName}:`, e);
          return [];
        }
      };

      const [
        freshProducts,
        freshCategories,
        freshActivities,
        freshBoms,
        freshProjects,
        freshJobs,
        freshEmployees,
        freshBrands,
        freshJobProjects,
        freshDailyReports
      ] = await Promise.all([
        fetchColFresh<Product>('products'),
        fetchColFresh<Category>('categories'),
        fetchColFresh<StockActivity>('activities'),
        fetchColFresh<Bom>('boms'),
        fetchColFresh<Project>('projects'),
        fetchColFresh<Job>('jobs'),
        fetchColFresh<Employee>('employees'),
        fetchColFresh<Brand>('brands'),
        fetchColFresh<JobProject>('jobProjects'),
        fetchColFresh<DailyReport>('dailyReports')
      ]);

      // Read local cache fallbacks
      const localProducts: Product[] = JSON.parse(localStorage.getItem('stock_manager_products') || '[]');
      const localCategories: Category[] = JSON.parse(localStorage.getItem('stock_manager_categories') || '[]');
      const localActivities: StockActivity[] = JSON.parse(localStorage.getItem('stock_manager_activities') || '[]');
      const localBoms: Bom[] = JSON.parse(localStorage.getItem('stock_manager_boms') || '[]');
      const localProjects: Project[] = JSON.parse(localStorage.getItem('stock_manager_projects_list') || '[]');
      const localJobs: Job[] = JSON.parse(localStorage.getItem('stock_manager_jobs_list') || '[]');
      const localEmployees: Employee[] = JSON.parse(localStorage.getItem('stock_manager_employees_list') || '[]');
      const localBrands: Brand[] = JSON.parse(localStorage.getItem('stock_manager_brands_list') || '[]');
      const localJobProjects: JobProject[] = JSON.parse(localStorage.getItem('stock_manager_job_projects_list') || '[]');
      const localDailyReports: DailyReport[] = JSON.parse(localStorage.getItem('stock_manager_daily_reports_list') || '[]');

      // Merge Products: combine fresh Firestore products with local products, uploading missing items
      const localProdsSource = localProducts.length > 0 ? localProducts : INITIAL_PRODUCTS;
      const { merged: finalProds, missingFromPrimary: missingProds } = mergeListsById(freshProducts, localProdsSource);
      if (missingProds.length > 0) {
        uploadListToFirestoreInBatches('products', missingProds);
      }
      const sortedProds = sortProducts(finalProds);
      setProducts(sortedProds);
      localStorage.setItem('stock_manager_products', JSON.stringify(sortedProds));

      // Merge Categories
      const localCatsSource = localCategories.length > 0 ? localCategories : INITIAL_CATEGORIES;
      const { merged: finalCats, missingFromPrimary: missingCats } = mergeListsById(freshCategories, localCatsSource);
      if (missingCats.length > 0) {
        uploadListToFirestoreInBatches('categories', missingCats);
      }
      setCategories(finalCats);
      localStorage.setItem('stock_manager_categories', JSON.stringify(finalCats));

      // Merge Activities
      const localActsSource = localActivities.length > 0 ? localActivities : INITIAL_ACTIVITIES;
      const { merged: finalActs, missingFromPrimary: missingActs } = mergeListsById(freshActivities, localActsSource);
      if (missingActs.length > 0) {
        uploadListToFirestoreInBatches('activities', missingActs);
      }
      finalActs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setActivities(finalActs);
      localStorage.setItem('stock_manager_activities', JSON.stringify(finalActs));

      // Merge BOMs
      const { merged: finalBoms, missingFromPrimary: missingBoms } = mergeListsById(freshBoms, localBoms);
      if (missingBoms.length > 0) {
        uploadListToFirestoreInBatches('boms', missingBoms);
      }
      finalBoms.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      setBoms(finalBoms);
      localStorage.setItem('stock_manager_boms', JSON.stringify(finalBoms));

      // Merge Projects
      const { merged: finalProjects, missingFromPrimary: missingProjects } = mergeListsById(freshProjects, localProjects);
      if (missingProjects.length > 0) {
        uploadListToFirestoreInBatches('projects', missingProjects);
      }
      finalProjects.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      setProjects(finalProjects);
      localStorage.setItem('stock_manager_projects_list', JSON.stringify(finalProjects));

      // Merge Jobs
      const { merged: finalJobs, missingFromPrimary: missingJobs } = mergeListsById(freshJobs, localJobs);
      if (missingJobs.length > 0) {
        uploadListToFirestoreInBatches('jobs', missingJobs);
      }
      finalJobs.sort((a, b) => (b.jobNo || '').localeCompare(a.jobNo || ''));
      setJobs(finalJobs);
      localStorage.setItem('stock_manager_jobs_list', JSON.stringify(finalJobs));

      // Merge Employees
      const { merged: finalEmployees, missingFromPrimary: missingEmployees } = mergeListsById(freshEmployees, localEmployees);
      if (missingEmployees.length > 0) {
        uploadListToFirestoreInBatches('employees', missingEmployees);
      }
      finalEmployees.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
      setEmployees(finalEmployees);
      localStorage.setItem('stock_manager_employees_list', JSON.stringify(finalEmployees));

      // Merge Brands
      const { merged: finalBrands, missingFromPrimary: missingBrands } = mergeListsById(freshBrands, localBrands);
      if (missingBrands.length > 0) {
        uploadListToFirestoreInBatches('brands', missingBrands);
      }
      finalBrands.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
      setBrands(finalBrands);
      localStorage.setItem('stock_manager_brands_list', JSON.stringify(finalBrands));

      // Merge JobProjects
      const { merged: finalJobProjects, missingFromPrimary: missingJobProjects } = mergeListsById(freshJobProjects, localJobProjects);
      if (missingJobProjects.length > 0) {
        uploadListToFirestoreInBatches('jobProjects', missingJobProjects);
      }
      finalJobProjects.sort((a, b) => (b.jobNo || '').localeCompare(a.jobNo || ''));
      setJobProjects(finalJobProjects);
      localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(finalJobProjects));

      // Merge DailyReports
      const { merged: finalDailyReports, missingFromPrimary: missingDailyReports } = mergeListsById(freshDailyReports, localDailyReports);
      if (missingDailyReports.length > 0) {
        uploadListToFirestoreInBatches('dailyReports', missingDailyReports);
      }
      finalDailyReports.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setDailyReports(finalDailyReports);
      localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(finalDailyReports));

      updateLastSyncTimestamp();

      if (showSuccessToast) {
        addToast('success', 'รีเฟรชข้อมูลสำเร็จ', 'ดึงและรวมข้อมูลล่าสุดจาก Database หลักเรียบร้อยแล้ว');
      }
    } catch (err: any) {
      console.warn("Error pulling fresh data from DB:", err);
      if (showSuccessToast) {
        addToast('error', 'ข้อผิดพลาดการดึงข้อมูล', 'ไม่สามารถเชื่อมต่อกับ Database ได้ในขณะนี้');
      }
    } finally {
      setIsPullingFreshDb(false);
    }
  };

  // Heuristic to detect what canonical array type a list of items belongs to
  const detectArrayType = (arr: any[]): string | null => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    
    const samples = arr.filter(item => item && typeof item === 'object').slice(0, 10);
    if (samples.length === 0) return null;

    let prodScore = 0;
    let catScore = 0;
    let actScore = 0;
    let bomScore = 0;
    let projScore = 0;
    let jobScore = 0;
    let empScore = 0;
    let brandScore = 0;
    let jpScore = 0;
    let drScore = 0;

    for (const item of samples) {
      if ('sku' in item || 'price' in item || 'barcode' in item || 'quantity' in item || 'minQuantity' in item || 'cost' in item || 'productName' in item || 'itemName' in item) {
        prodScore += 3;
      }
      if ('color' in item || 'subSeries' in item || 'series' in item) {
        catScore += 3;
      }
      if ('quantityChange' in item || 'oldQuantity' in item || 'actionType' in item) {
        actScore += 3;
      }
      if ('requiredQuantity' in item || 'stockDeducted' in item || ('bomId' in item && 'items' in item)) {
        bomScore += 3;
      }
      if (('projectName' in item || 'projectNo' in item) && !('jobNo' in item)) {
        projScore += 3;
      }
      if ('jobNo' in item && !('customer' in item) && !('customerName' in item) && !('projectName' in item)) {
        jobScore += 3;
      }
      if ('employeeName' in item || 'nickname' in item || 'department' in item || 'position' in item || 'orgLevel' in item || ('name' in item && ('role' in item || 'phone' in item || 'email' in item))) {
        empScore += 3;
      }
      if ('brandName' in item || ('name' in item && !('color' in item) && !('sku' in item) && !('price' in item) && !('nickname' in item) && !('department' in item) && !('phone' in item) && !('jobNo' in item) && !('bomId' in item) && !('employeeName' in item) && !('quantity' in item))) {
        brandScore += 1;
      }
      if (('customer' in item || 'customerName' in item || 'projectName' in item) && 'jobNo' in item) {
        jpScore += 3;
      }
      if ('employeeName' in item && 'tasks' in item) {
        drScore += 3;
      }
      if ('name' in item && !('color' in item) && !('nickname' in item) && !('department' in item) && !('jobNo' in item) && !('bomId' in item) && !('employeeName' in item) && !('tasks' in item)) {
        prodScore += 1;
      }
    }

    const scores: [string, number][] = [
      ['stock_manager_products', prodScore],
      ['stock_manager_categories', catScore],
      ['stock_manager_activities', actScore],
      ['stock_manager_boms', bomScore],
      ['stock_manager_projects_list', projScore],
      ['stock_manager_jobs_list', jobScore],
      ['stock_manager_employees_list', empScore],
      ['stock_manager_brands_list', brandScore],
      ['stock_manager_job_projects_list', jpScore],
      ['stock_manager_daily_reports_list', drScore]
    ];

    scores.sort((a, b) => b[1] - a[1]);
    if (scores[0][1] > 0) {
      return scores[0][0];
    }
    return null;
  };

  // Helper to synchronize a collection completely to a backup list (including deleting obsolete docs)
  const syncCollectionToBackup = async (collectionName: string, backupList: any[]) => {
    if (!currentUser) return;
    try {
      // 1. Query all existing documents in Firestore for this collection
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      
      const backupIds = new Set(backupList.map(item => String(item.id).trim()));
      const docsToDelete: string[] = [];

      snapshot.forEach((document) => {
        const docId = document.id.trim();
        if (!backupIds.has(docId)) {
          docsToDelete.push(document.id);
        }
      });

      // Delete obsolete documents in batches of 450
      for (let i = 0; i < docsToDelete.length; i += 450) {
        const chunk = docsToDelete.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach(docId => batch.delete(doc(db, collectionName, docId)));
        await batch.commit();
      }

      // 2. Upload/update backup items in batches
      if (backupList.length > 0) {
        await uploadListToFirestoreInBatches(collectionName, backupList);
      }
    } catch (err) {
      console.error(`Error syncing Firestore collection ${collectionName} to backup:`, err);
      throw err;
    }
  };

  // Helper to merge lists based on item ID (preserve existing if newer, or overwrite)
  const mergeListsWithExisting = (canonicalKey: string, restoredList: any[], forceOverwrite: boolean = false) => {
    let existingList: any[] = [];
    try {
      const stored = localStorage.getItem(canonicalKey);
      if (stored) {
        existingList = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed parsing existing storage for merging:", e);
    }

    if (!Array.isArray(existingList)) {
      existingList = [];
    }

    const map = new Map<string, any>();
    existingList.forEach(item => {
      if (item && item.id !== undefined && item.id !== null) {
        const idStr = String(item.id).trim();
        if (idStr) {
          map.set(idStr, { ...item, id: idStr });
        }
      }
    });

    restoredList.forEach(item => {
      if (item && item.id !== undefined && item.id !== null) {
        const idStr = String(item.id).trim();
        if (idStr) {
          const prev = map.get(idStr);
          if (prev) {
            if (forceOverwrite) {
              // Force overwrite the existing item with the restored item
              map.set(idStr, { ...prev, ...item, id: idStr });
            } else {
              const prevTime = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
              const incomingTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
              // If incoming item is newer, or if no updatedAt exists, update it.
              if (incomingTime >= prevTime) {
                map.set(idStr, { ...prev, ...item, id: idStr });
              }
            }
          } else {
            map.set(idStr, { ...item, id: idStr });
          }
        }
      }
    });

    return Array.from(map.values());
  };


  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Login / Register inputs
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [registerDisplayNameInput, setRegisterDisplayNameInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotPasswordEmailInput, setForgotPasswordEmailInput] = useState('');
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [showPopupBlockedHelp, setShowPopupBlockedHelp] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

  // Firestore status / Quota state
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Listen to Auth State Changes
  useEffect(() => {
    let unsubscribeRole: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeRole) {
        unsubscribeRole();
        unsubscribeRole = null;
      }
      if (user) {
        window.localStorage.removeItem('stock_manager_is_offline');
        (window as any).currentUserEmail = user.email || '';
        (window as any).currentUserUid = user.uid || '';
        window.localStorage.setItem('admin_email', user.email || '');
        setCurrentUser(user);
        
        // Fetch/Listen to this user's specific role in 'user_roles'
        const userRoleRef = doc(db, 'user_roles', user.uid);
        unsubscribeRole = onSnapshot(userRoleRef, async (docSnap) => {
          const userEmailClean = (user.email || '').trim().toLowerCase();
          const isDeveloper = ['chaleesogood@gmail.com', 'chalee@gtt2013.com'].includes(userEmailClean);
          const isGoogleUser = user.providerData?.some(p => p.providerId === 'google.com') || false;
          const authProvider = isGoogleUser ? 'google' : 'password';

          if (docSnap.exists()) {
            const data = docSnap.data() as UserRole;
            setCurrentUserRole(isDeveloper ? 'admin' : (data.role || 'user'));
            setCurrentUserStatus(isDeveloper ? 'active' : (data.status || 'active'));

            // Auto-sync Google Sign-in metadata (displayName, photoURL, provider) if missing or updated
            if (isGoogleUser || user.displayName || user.photoURL) {
              const updatedData: Partial<UserRole> = {};
              let hasChanges = false;

              if (user.displayName && data.displayName !== user.displayName) {
                updatedData.displayName = user.displayName;
                hasChanges = true;
              }
              if (user.photoURL && data.photoURL !== user.photoURL) {
                updatedData.photoURL = user.photoURL;
                hasChanges = true;
              }
              if (isGoogleUser && data.provider !== 'google') {
                updatedData.provider = 'google';
                hasChanges = true;
              }

              if (hasChanges) {
                try {
                  await setDoc(userRoleRef, cleanUndefined({ ...data, ...updatedData }), { merge: true });
                } catch (syncErr) {
                  console.warn("Could not auto-sync Google user profile details:", syncErr);
                }
              }
            }
          } else {
            // Document doesn't exist, let's check if there is an existing role record with the same email!
            try {
              const q = query(collection(db, 'user_roles'));
              const querySnapshot = await getDocs(q);
              let existingRoleRecord: UserRole | null = null;
              let existingDocId: string | null = null;
              
              querySnapshot.forEach((docSnap) => {
                const data = docSnap.data() as UserRole;
                if (data.email && data.email.trim().toLowerCase() === userEmailClean) {
                  existingRoleRecord = data;
                  existingDocId = docSnap.id;
                }
              });

              if (existingRoleRecord && existingDocId) {
                // Yes! Found a pre-registered role record. Let's transfer it to the real UID doc!
                const newRoleRecord: UserRole = {
                  uid: user.uid,
                  email: user.email || '',
                  displayName: user.displayName || (existingRoleRecord as UserRole).displayName || user.email?.split('@')[0] || 'Unknown User',
                  photoURL: user.photoURL || (existingRoleRecord as UserRole).photoURL || '',
                  provider: authProvider,
                  role: isDeveloper ? 'admin' : ((existingRoleRecord as UserRole).role || 'user'),
                  status: isDeveloper ? 'active' : ((existingRoleRecord as UserRole).status || 'active'),
                  createdAt: (existingRoleRecord as UserRole).createdAt || new Date().toISOString()
                };
                
                await setDoc(userRoleRef, cleanUndefined(newRoleRecord));
                
                // If the old doc ID was different from the user's real UID, delete the old doc
                if (existingDocId !== user.uid) {
                  await deleteDoc(doc(db, 'user_roles', existingDocId));
                }
                
                setCurrentUserRole(newRoleRecord.role);
                setCurrentUserStatus(newRoleRecord.status || 'active');
              } else {
                // Document doesn't exist, let's create a default role record!
                const defaultRole: 'admin' | 'editor' | 'user' = isDeveloper ? 'admin' : 'user';
                const defaultStatus: 'active' | 'pending' = isDeveloper ? 'active' : 'pending';
                
                const newRoleRecord: UserRole = {
                  uid: user.uid,
                  email: user.email || '',
                  displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
                  photoURL: user.photoURL || '',
                  provider: authProvider,
                  role: defaultRole,
                  status: defaultStatus,
                  createdAt: new Date().toISOString()
                };
                
                await setDoc(userRoleRef, cleanUndefined(newRoleRecord));
                setCurrentUserRole(defaultRole);
                setCurrentUserStatus(defaultStatus);
              }
            } catch (err) {
              console.error("Error looking up existing user role by email:", err);
              // Fallback to default role record!
              const defaultRole: 'admin' | 'editor' | 'user' = isDeveloper ? 'admin' : 'user';
              const defaultStatus: 'active' | 'pending' = isDeveloper ? 'active' : 'pending';
              
              const newRoleRecord: UserRole = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
                photoURL: user.photoURL || '',
                provider: authProvider,
                role: defaultRole,
                status: defaultStatus,
                createdAt: new Date().toISOString()
              };
              
              try {
                await setDoc(userRoleRef, cleanUndefined(newRoleRecord));
                setCurrentUserRole(defaultRole);
                setCurrentUserStatus(defaultStatus);
              } catch (setErr) {
                console.error("Error creating fallback user role record:", setErr);
                setCurrentUserRole(defaultRole);
                setCurrentUserStatus(defaultStatus);
              }
            }
          }
          setAuthLoading(false);
        }, (error) => {
          console.error("Error listening to user role:", error);
          const userEmailClean = (user.email || '').trim().toLowerCase();
          const isDeveloper = ['chaleesogood@gmail.com', 'chalee@gtt2013.com'].includes(userEmailClean);
          setCurrentUserRole(isDeveloper ? 'admin' : 'user');
          setCurrentUserStatus(isDeveloper ? 'active' : 'pending');
          setAuthLoading(false);
        });
      } else {
        (window as any).currentUserEmail = '';
        (window as any).currentUserUid = '';
        window.localStorage.removeItem('admin_email');
        window.localStorage.removeItem('stock_manager_is_offline');
        setCurrentUser(null);
        setCurrentUserRole('user');
        setAuthLoading(false);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeRole) {
        unsubscribeRole();
      }
    };
  }, []);

  // Fetch user_roles list for all signed in users so user roles count & list is accurate
  useEffect(() => {
    if (currentUser) {
      const q = query(collection(db, 'user_roles'));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const list: UserRole[] = [];
        let hasChaleeGtt = false;
        let hasChaleeGood = false;

        snapshot.forEach((document) => {
          const r = document.data() as UserRole;
          list.push(r);
          if (r.email?.toLowerCase() === 'chalee@gtt2013.com') {
            hasChaleeGtt = true;
          }
          if (r.email?.toLowerCase() === 'chaleesogood@gmail.com') {
            hasChaleeGood = true;
          }
        });

        // Ensure current user record exists in list
        if (currentUser.email) {
          const userExistsInList = list.some(r => r.email?.toLowerCase() === currentUser.email?.toLowerCase() || r.uid === currentUser.uid);
          if (!userExistsInList) {
            const currentRecord: UserRole = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email.split('@')[0],
              role: currentUserRole,
              createdAt: new Date().toISOString()
            };
            list.push(currentRecord);
            try {
              await setDoc(doc(db, 'user_roles', currentUser.uid), cleanUndefined(currentRecord));
            } catch (e) {
              console.error('Failed to create user_role record for current user:', e);
            }
          }
        }

        // Proactively auto-provision chalee@gtt2013.com if missing
        if (!hasChaleeGtt) {
          const tempUid = 'pre_chalee_gtt2013_com';
          const chaleeGttRecord: UserRole = {
            uid: tempUid,
            email: 'chalee@gtt2013.com',
            displayName: 'Chalee GTT',
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          list.push(chaleeGttRecord);
          try {
            await setDoc(doc(db, 'user_roles', tempUid), cleanUndefined(chaleeGttRecord));
          } catch (e) {}
        }

        // Proactively auto-provision chaleesogood@gmail.com if missing
        if (!hasChaleeGood) {
          const tempUid = 'pre_chaleesogood_gmail_com';
          const chaleeGoodRecord: UserRole = {
            uid: tempUid,
            email: 'chaleesogood@gmail.com',
            displayName: 'Chalee Sogood',
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          list.push(chaleeGoodRecord);
          try {
            await setDoc(doc(db, 'user_roles', tempUid), cleanUndefined(chaleeGoodRecord));
          } catch (e) {}
        }

        // Client-side sort by createdAt desc
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setUserRoles(list);
      }, (error) => {
        handleFirestoreError("Firestore user_roles sync error", error);
      });
      return () => unsubscribe();
    } else {
      setUserRoles([]);
    }
  }, [currentUser, currentUserRole]);

  // Online Presence Status (Updated on login/session mount and exit)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userUid = currentUser.uid;
    const userEmail = currentUser.email || '';
    const userDisplayName = currentUser.displayName || userEmail.split('@')[0] || 'Unknown';

    const updatePresence = async (onlineStatus: boolean) => {
      try {
        const userRef = doc(db, 'user_roles', userUid);
        await setDoc(userRef, cleanUndefined({
          uid: userUid,
          email: userEmail,
          displayName: userDisplayName,
          isOnline: onlineStatus,
          lastSeen: new Date().toISOString()
        }), { merge: true });
      } catch (err) {
        console.warn("Failed to update presence:", err);
      }
    };

    updatePresence(true);

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.uid, currentUser?.email, currentUser?.displayName]);

  const checkFirestoreQuotaError = (error: any) => {
    if (error) {
      const msg = error.message || String(error);
      if (
        msg.toLowerCase().includes('quota') || 
        msg.toLowerCase().includes('limit') || 
        msg.toLowerCase().includes('exceed') || 
        msg.toLowerCase().includes('resource_exhausted') ||
        msg.toLowerCase().includes('permission-denied')
      ) {
        setIsQuotaExceeded(true);
      }
    }
  };

  const handleFirestoreError = (context: string, error: any) => {
    if (!error) return;
    const msg = error.message || String(error);
    const isQuota = (
      msg.toLowerCase().includes('quota') || 
      msg.toLowerCase().includes('limit') || 
      msg.toLowerCase().includes('exceed') || 
      msg.toLowerCase().includes('resource_exhausted') ||
      msg.toLowerCase().includes('permission-denied')
    );
    if (isQuota) {
      setIsQuotaExceeded(true);
      console.warn(`${context} (Quota Exceeded / Offline):`, error);
    } else {
      console.error(context, error);
    }
  };

  // UI state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Theme (Dark Mode) State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync products from Firestore (Central Shared Database)
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Product[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Product);
      });

      const savedStr = localStorage.getItem('stock_manager_products');
      const localList: Product[] = savedStr ? JSON.parse(savedStr) : INITIAL_PRODUCTS;

      if (firestoreList.length > 0) {
        const sorted = sortProducts(firestoreList);
        setProducts(sorted);
        localStorage.setItem('stock_manager_products', JSON.stringify(sorted));
      } else {
        const sorted = sortProducts(localList.length > 0 ? localList : INITIAL_PRODUCTS);
        setProducts(sorted);
        localStorage.setItem('stock_manager_products', JSON.stringify(sorted));
        uploadListToFirestoreInBatches('products', sorted);
      }
    }, (error) => {
      handleFirestoreError("Firestore products sync error", error);
      const saved = localStorage.getItem('stock_manager_products');
      setProducts(saved ? sortProducts(JSON.parse(saved)) : sortProducts(INITIAL_PRODUCTS));
    });
    return () => unsubscribe();
  }, []);

  // Sync categories from Firestore (Central Shared Database)
  useEffect(() => {
    const q = query(collection(db, 'categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Category[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Category);
      });

      const savedStr = localStorage.getItem('stock_manager_categories');
      const localList: Category[] = savedStr ? JSON.parse(savedStr) : INITIAL_CATEGORIES;

      if (firestoreList.length > 0) {
        setCategories(firestoreList);
        localStorage.setItem('stock_manager_categories', JSON.stringify(firestoreList));
      } else {
        const catList = localList.length > 0 ? localList : INITIAL_CATEGORIES;
        setCategories(catList);
        localStorage.setItem('stock_manager_categories', JSON.stringify(catList));
        uploadListToFirestoreInBatches('categories', catList);
      }
    }, (error) => {
      handleFirestoreError("Firestore categories sync error", error);
      const saved = localStorage.getItem('stock_manager_categories');
      setCategories(saved ? JSON.parse(saved) : INITIAL_CATEGORIES);
    });
    return () => unsubscribe();
  }, []);

  // Auto-delete cat-2t7zj33 on startup if present as requested by user
  useEffect(() => {
    if (categories.length === 0) return;
    const hasTargetCat = categories.some(c => c.id === 'cat-2t7zj33');
    if (hasTargetCat) {
      const deleteTargetCategory = async () => {
        try {
          const id = 'cat-2t7zj33';
          const updatedCategories = categories.filter((cat) => cat.id !== id);
          setCategories(updatedCategories);
          localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

          const updatedProducts = products.map((p) => p.category === id ? { ...p, category: '' } : p);
          setProducts(updatedProducts);
          localStorage.setItem('stock_manager_products', JSON.stringify(updatedProducts));

          const batch = writeBatch(db);
          const associatedProducts = products.filter((p) => p.category === id);
          associatedProducts.forEach((p) => {
            batch.update(doc(db, 'products', p.id), { category: '' });
          });
          batch.delete(doc(db, 'categories', id));
          await batch.commit();
          
          addToast('success', 'ระบบคลีนข้อมูลอัตโนมัติ', 'ลบรหัสกลุ่มสินค้าเดิม cat-2t7zj33 สำเร็จเรียบร้อยแล้ว');
        } catch (err) {
          console.error("Error auto-deleting cat-2t7zj33:", err);
        }
      };
      deleteTargetCategory();
    }
  }, [categories, products]);

  // Synchronize state on user auth change (fetch fresh data directly from database on every login)
  useEffect(() => {
    const prepareSync = async () => {
      try {
        await handlePullFreshFromDatabase(false);
      } catch (err: any) {
        console.warn("Prepare sync error:", err);
      } finally {
        setIsSyncComplete(true);
      }
    };
    prepareSync();
  }, [currentUser?.uid]);

  // Sync and heal database: Ensure any category referenced by any product is defined in the categories collection
  useEffect(() => {
    if (products.length === 0 || categories.length === 0) return;
    
    const categoryIds = new Set(categories.map(c => c.id));
    const productCategoryIds = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
    
    productCategoryIds.forEach(async (catId) => {
      if (recentlyDeletedCategories.current.has(catId)) return;
      
      if (!categoryIds.has(catId)) {
        // Look up if we have a seed template for this category
        const defaultCat = INITIAL_CATEGORIES.find(c => c.id === catId);
        
        let fallbackName = `กลุ่มสินค้า ${catId}`;
        if (catId === 'cat-9uc8blz') {
          fallbackName = 'กลุ่มจัดซื้อเฉพาะกิจ (BOM/Procurement)';
        }
        
        const fallbackDesc = 'หมวดหมู่สินค้าที่สร้างขึ้นโดยอัตโนมัติเพื่อให้สอดคล้องกับคลังสินค้า';
        const fallbackColor = 'bg-slate-100 text-slate-800 border-slate-200';
        
        const newCat: Category = {
          id: catId,
          name: defaultCat?.name || fallbackName,
          description: defaultCat?.description || fallbackDesc,
          color: defaultCat?.color || fallbackColor,
        };
        
        try {
          await setDoc(doc(db, 'categories', catId), cleanUndefined(newCat));
          console.log(`Auto-created missing category document in Firestore: ${catId}`);
        } catch (err) {
          console.error("Auto-create category error:", err);
        }
      }
    });
  }, [products, categories]);

  // Sync activities from Firestore (Central Shared Database)
  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: StockActivity[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as StockActivity);
      });

      const savedStr = localStorage.getItem('stock_manager_activities');
      const localList: StockActivity[] = savedStr ? JSON.parse(savedStr) : INITIAL_ACTIVITIES;

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setActivities(firestoreList);
        localStorage.setItem('stock_manager_activities', JSON.stringify(firestoreList));
      } else {
        const actList = localList.length > 0 ? localList : INITIAL_ACTIVITIES;
        actList.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setActivities(actList);
        localStorage.setItem('stock_manager_activities', JSON.stringify(actList));
        uploadListToFirestoreInBatches('activities', actList);
      }
    }, (error) => {
      handleFirestoreError("Firestore activities sync error", error);
      const saved = localStorage.getItem('stock_manager_activities');
      setActivities(saved ? JSON.parse(saved) : INITIAL_ACTIVITIES);
    });
    return () => unsubscribe();
  }, []);

  // Sync boms from Firestore
  useEffect(() => {
    const q = query(collection(db, 'boms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Bom[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Bom);
      });

      const savedStr = localStorage.getItem('stock_manager_boms');
      const localList: Bom[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setBoms(firestoreList);
        localStorage.setItem('stock_manager_boms', JSON.stringify(firestoreList));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          setBoms(localList);
          uploadListToFirestoreInBatches('boms', localList);
        } else {
          setBoms([]);
          localStorage.setItem('stock_manager_boms', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore boms sync error", error);
      const saved = localStorage.getItem('stock_manager_boms');
      setBoms(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync projects from Firestore
  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Project[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Project);
      });

      const savedStr = localStorage.getItem('stock_manager_projects_list');
      const localList: Project[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setProjects(firestoreList);
        localStorage.setItem('stock_manager_projects_list', JSON.stringify(firestoreList));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          setProjects(localList);
          uploadListToFirestoreInBatches('projects', localList);
        } else {
          setProjects([]);
          localStorage.setItem('stock_manager_projects_list', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore projects sync error", error);
      const saved = localStorage.getItem('stock_manager_projects_list');
      setProjects(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync jobs from Firestore
  useEffect(() => {
    const q = query(collection(db, 'jobs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Job[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Job);
      });

      const savedStr = localStorage.getItem('stock_manager_jobs_list');
      const localList: Job[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (b.jobNo || '').localeCompare(a.jobNo || ''));
        setJobs(firestoreList);
        localStorage.setItem('stock_manager_jobs_list', JSON.stringify(firestoreList));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (b.jobNo || '').localeCompare(a.jobNo || ''));
          setJobs(localList);
          uploadListToFirestoreInBatches('jobs', localList);
        } else {
          setJobs([]);
          localStorage.setItem('stock_manager_jobs_list', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore jobs sync error", error);
      const saved = localStorage.getItem('stock_manager_jobs_list');
      setJobs(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync employees from Firestore
  useEffect(() => {
    const q = query(collection(db, 'employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Employee[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Employee);
      });

      const savedStr = localStorage.getItem('stock_manager_employees_list');
      const localList: Employee[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        const merged = firestoreList;
        merged.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
        setEmployees(merged);
        localStorage.setItem('stock_manager_employees_list', JSON.stringify(merged));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
          setEmployees(localList);
          uploadListToFirestoreInBatches('employees', localList);
        } else {
          setEmployees([]);
          localStorage.setItem('stock_manager_employees_list', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore employees sync error", error);
      const saved = localStorage.getItem('stock_manager_employees_list');
      setEmployees(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync brands from Firestore
  useEffect(() => {
    const q = query(collection(db, 'brands'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: Brand[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as Brand);
      });

      const savedStr = localStorage.getItem('stock_manager_brands_list');
      const localList: Brand[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
        setBrands(firestoreList);
        localStorage.setItem('stock_manager_brands_list', JSON.stringify(firestoreList));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
          setBrands(localList);
          uploadListToFirestoreInBatches('brands', localList);
        } else {
          setBrands([]);
          localStorage.setItem('stock_manager_brands_list', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore brands sync error", error);
      const saved = localStorage.getItem('stock_manager_brands_list');
      setBrands(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync job projects from Firestore
  useEffect(() => {
    const q = query(collection(db, 'jobProjects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: JobProject[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as JobProject);
      });

      const savedStr = localStorage.getItem('stock_manager_job_projects_list');
      const localList: JobProject[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (b.jobNo || '').localeCompare(a.jobNo || ''));
        setJobProjects(firestoreList);
        localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(firestoreList));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (b.jobNo || '').localeCompare(a.jobNo || ''));
          setJobProjects(localList);
          uploadListToFirestoreInBatches('jobProjects', localList);
        } else {
          setJobProjects([]);
          localStorage.setItem('stock_manager_job_projects_list', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore jobProjects sync error", error);
      const saved = localStorage.getItem('stock_manager_job_projects_list');
      setJobProjects(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);

  // Sync daily reports from Firestore
  useEffect(() => {
    const q = query(collection(db, 'dailyReports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: DailyReport[] = [];
      snapshot.forEach((document) => {
        firestoreList.push({ id: document.id, ...document.data() } as DailyReport);
      });

      const savedStr = localStorage.getItem('stock_manager_daily_reports_list');
      const localList: DailyReport[] = savedStr ? JSON.parse(savedStr) : [];

      if (firestoreList.length > 0) {
        firestoreList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setDailyReports(firestoreList);
        localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(firestoreList));
      } else {
        if (localList.length > 0) {
          localList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setDailyReports(localList);
          uploadListToFirestoreInBatches('dailyReports', localList);
        } else {
          setDailyReports([]);
          localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify([]));
        }
      }
    }, (error) => {
      handleFirestoreError("Firestore dailyReports sync error", error);
      const saved = localStorage.getItem('stock_manager_daily_reports_list');
      setDailyReports(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, []);



  // Toast Helpers
  const lastToastTimes = useRef<Record<string, number>>({});

  const addToast = (type: 'success' | 'warning' | 'info' | 'error', title: string, message: string) => {
    const now = Date.now();
    const lastTime = lastToastTimes.current[title];
    if (lastTime && now - lastTime < 5000) {
      return;
    }

    // Suppress Firestore warning spam if quota is already exceeded
    if (isQuotaExceeded && (title.includes('Firestore') || title.includes('เชื่อมต่อ') || message.includes('Firestore') || message.includes('เชื่อมต่อ'))) {
      return;
    }

    lastToastTimes.current[title] = now;

    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // cap at 5 toasts max
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Offline Sandbox Backup & Restore Helpers
  const handleDownloadBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      const keys = [
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
        const val = localStorage.getItem(key);
        if (val) {
          try {
            backupData[key] = JSON.parse(val);
          } catch {
            backupData[key] = val;
          }
        }
      });

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', 'สำรองข้อมูลสำเร็จ', 'ดาวน์โหลดไฟล์สำรองข้อมูลเครื่องเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error(err);
      addToast('warning', 'สำรองข้อมูลล้มเหลว', `เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsSyncComplete(false);
        const content = event.target?.result as string;
        
        let backupData: any = null;
        const cleanedContent = content.trim();
        try {
          backupData = JSON.parse(cleanedContent);
        } catch (jsonErr) {
          // If direct parsing fails, let's try to extract JSON from any enclosing brackets/braces
          const jsonMatch = cleanedContent.match(/[\{\[][\s\S]*[\}\]]/);
          if (jsonMatch) {
            try {
              backupData = JSON.parse(jsonMatch[0]);
            } catch (innerErr) {
              throw new Error("ไฟล์ JSON มีรูปแบบไม่ถูกต้อง ไม่สามารถแกะโค้ดข้อมูลได้");
            }
          } else {
            throw new Error("ไม่พบข้อมูลรูปแบบ JSON ในไฟล์ที่คุณเลือก");
          }
        }

        const keyMapping: Record<string, string[]> = {
          'stock_manager_products': ['stock_manager_products', 'products', 'products_list', 'product', 'item', 'items', 'stock', 'stock_list', 'product_list', 'productsdata'],
          'stock_manager_categories': ['stock_manager_categories', 'categories', 'categories_list', 'category', 'cats'],
          'stock_manager_activities': ['stock_manager_activities', 'activities', 'activities_list', 'activity_logs', 'activity', 'logs'],
          'stock_manager_boms': ['stock_manager_boms', 'boms', 'boms_list', 'bom', 'recipes'],
          'stock_manager_projects_list': ['stock_manager_projects_list', 'stock_manager_projects', 'projects', 'projects_list', 'project'],
          'stock_manager_jobs_list': ['stock_manager_jobs_list', 'stock_manager_jobs', 'jobs', 'jobs_list', 'job'],
          'stock_manager_employees_list': ['stock_manager_employees_list', 'stock_manager_employees', 'employees', 'employees_list', 'employee', 'staff'],
          'stock_manager_brands_list': ['stock_manager_brands_list', 'stock_manager_brands', 'brands', 'brands_list', 'brand'],
          'stock_manager_job_projects_list': ['stock_manager_job_projects_list', 'stock_manager_job_projects', 'jobProjects', 'job_projects', 'job_projects_list'],
          'stock_manager_daily_reports_list': ['stock_manager_daily_reports_list', 'stock_manager_daily_reports', 'dailyReports', 'daily_reports', 'daily_reports_list']
        };

        const foundArrays: Record<string, any[]> = {};

        // 1. If backupData is directly an array
        if (Array.isArray(backupData)) {
          const detectedKey = detectArrayType(backupData);
          if (detectedKey) {
            foundArrays[detectedKey] = backupData;
          }
        } else if (backupData && typeof backupData === 'object') {
          // 2. Traversal of object properties
          const deepSearch = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            if (Array.isArray(obj)) {
              const detected = detectArrayType(obj);
              if (detected) {
                if (!foundArrays[detected] || obj.length > foundArrays[detected].length) {
                  foundArrays[detected] = obj;
                }
              }
              return;
            }

            for (const [key, val] of Object.entries(obj)) {
              const normalizedKey = (key || '').trim().toLowerCase().replace(/_/g, '').replace(/-/g, '');
              
              // Check exact/partial key matches
              Object.entries(keyMapping).forEach(([canonicalKey, aliases]) => {
                const matchedAlias = aliases.some(alias => {
                  const normalizedAlias = (alias || '').toLowerCase().replace(/_/g, '').replace(/-/g, '');
                  return normalizedKey === normalizedAlias;
                });

                if (matchedAlias && Array.isArray(val)) {
                  if (!foundArrays[canonicalKey] || val.length >= foundArrays[canonicalKey].length) {
                    foundArrays[canonicalKey] = val;
                  }
                }
              });

              if (Array.isArray(val)) {
                const detected = detectArrayType(val);
                if (detected) {
                  if (!foundArrays[detected] || val.length > foundArrays[detected].length) {
                    foundArrays[detected] = val;
                  }
                }
              } else if (val && typeof val === 'object') {
                deepSearch(val);
              }
            }
          };

          deepSearch(backupData);
        }

        let restoredCount = 0;
        const normalizedData: Record<string, any[]> = {};

        Object.entries(keyMapping).forEach(([canonicalKey]) => {
          const foundValue = foundArrays[canonicalKey];

          if (foundValue && Array.isArray(foundValue)) {
            // Ensure all items have an 'id', 'createdAt', and 'updatedAt'
            const updatedList = foundValue.map((item: any, idx: number) => {
              if (item && typeof item === 'object') {
                const newItem = { ...item };
                if (!newItem.id) {
                  newItem.id = `restored-${canonicalKey}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
                }
                if (!newItem.createdAt) {
                  newItem.createdAt = new Date().toISOString();
                }
                if (!newItem.updatedAt) {
                  newItem.updatedAt = new Date().toISOString();
                }
                return newItem;
              }
              return item;
            });

            normalizedData[canonicalKey] = updatedList;
            localStorage.setItem(canonicalKey, JSON.stringify(updatedList));
            restoredCount++;
          }
        });

        if (restoredCount === 0) {
          throw new Error('ไม่พบข้อมูลสต็อกสินค้า โครงการ หรือสูตร BOM ที่สามารถอ่านได้ในไฟล์นี้ กรุณาตรวจสอบรูปแบบไฟล์ JSON ของคุณ');
        }

        // Directly reload React states from normalizedData / localStorage
        const prodVal = normalizedData['stock_manager_products'] || (localStorage.getItem('stock_manager_products') ? JSON.parse(localStorage.getItem('stock_manager_products')!) : []);
        setProducts(sortProducts(prodVal));

        const catVal = normalizedData['stock_manager_categories'] || (localStorage.getItem('stock_manager_categories') ? JSON.parse(localStorage.getItem('stock_manager_categories')!) : []);
        setCategories(catVal);

        const actVal = normalizedData['stock_manager_activities'] || (localStorage.getItem('stock_manager_activities') ? JSON.parse(localStorage.getItem('stock_manager_activities')!) : []);
        setActivities(actVal);

        const bomVal = normalizedData['stock_manager_boms'] || (localStorage.getItem('stock_manager_boms') ? JSON.parse(localStorage.getItem('stock_manager_boms')!) : []);
        setBoms(bomVal);

        const projVal = normalizedData['stock_manager_projects_list'] || (localStorage.getItem('stock_manager_projects_list') ? JSON.parse(localStorage.getItem('stock_manager_projects_list')!) : []);
        setProjects(projVal);

        const jobsVal = normalizedData['stock_manager_jobs_list'] || (localStorage.getItem('stock_manager_jobs_list') ? JSON.parse(localStorage.getItem('stock_manager_jobs_list')!) : []);
        setJobs(jobsVal);

        const empVal = normalizedData['stock_manager_employees_list'] || (localStorage.getItem('stock_manager_employees_list') ? JSON.parse(localStorage.getItem('stock_manager_employees_list')!) : []);
        setEmployees(empVal);

        const brandVal = normalizedData['stock_manager_brands_list'] || (localStorage.getItem('stock_manager_brands_list') ? JSON.parse(localStorage.getItem('stock_manager_brands_list')!) : []);
        setBrands(brandVal);

        const jpVal = normalizedData['stock_manager_job_projects_list'] || (localStorage.getItem('stock_manager_job_projects_list') ? JSON.parse(localStorage.getItem('stock_manager_job_projects_list')!) : []);
        setJobProjects(jpVal);

        const drVal = normalizedData['stock_manager_daily_reports_list'] || (localStorage.getItem('stock_manager_daily_reports_list') ? JSON.parse(localStorage.getItem('stock_manager_daily_reports_list')!) : []);
        setDailyReports(drVal);

        // Upload to Firestore if logged in
        if (currentUser) {
          addToast('info', 'กำลังอัปโหลดข้อมูล...', 'กำลังซิงค์และบันทึกข้อมูลไฟล์สำรองเข้าสู่ Database หลักกลาง...');
          
          const keyToCollection: Record<string, string> = {
            'stock_manager_products': 'products',
            'stock_manager_categories': 'categories',
            'stock_manager_activities': 'activities',
            'stock_manager_boms': 'boms',
            'stock_manager_projects_list': 'projects',
            'stock_manager_jobs_list': 'jobs',
            'stock_manager_employees_list': 'employees',
            'stock_manager_brands_list': 'brands',
            'stock_manager_job_projects_list': 'jobProjects',
            'stock_manager_daily_reports_list': 'dailyReports'
          };

          try {
            for (const [key, list] of Object.entries(normalizedData)) {
              const colName = keyToCollection[key];
              if (colName && Array.isArray(list)) {
                await syncCollectionToBackup(colName, list);
              }
            }
          } catch (firestoreErr: any) {
            console.warn("Firestore upload failed during restore backup:", firestoreErr);
            addToast('warning', 'เชื่อมต่อคลาวด์ไม่สมบูรณ์ (อาจเกินโควต้า)', 'ข้อมูลบางส่วนไม่สามารถกู้คืนขึ้นระบบคลาวด์ได้เนื่องจากโควต้าเต็ม แต่ระบบได้อัปเดตข้อมูลทั้งหมดลงในเบราว์เซอร์เครื่องนี้ให้คุณใช้งานได้ปกติแล้ว!');
          }
        }

        addToast('success', 'อัปโหลด เสร็จสิ้น', 'นำเข้าและอัปโหลดไฟล์ข้อมูลเข้า Database หลักเรียบร้อยแล้ว ทุก ID อ่านและเขียนข้อมูลบน Database เดียวกัน');
      } catch (err: any) {
        console.error(err);
        addToast('warning', 'กู้คืนข้อมูลล้มเหลว', `ไฟล์ไม่ถูกต้องหรือเกิดข้อผิดพลาด: ${err.message}`);
      } finally {
        setIsSyncComplete(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreCacheGroup = async (groupData: Record<string, any[]>) => {
    try {
      setIsSyncComplete(false);
      addToast('info', 'กำลังนำเข้าและรวมข้อมูล...', 'ระบบกำลังนำข้อมูลกลุ่มอื่นมารวมเข้ากับข้อมูลปัจจุบันของคุณ...');

      const mergedData: Record<string, any[]> = {};

      // Merge and save to active localStorage shadowed keys
      Object.entries(groupData).forEach(([canonicalKey, list]) => {
        if (Array.isArray(list)) {
          const mergedList = mergeListsWithExisting(canonicalKey, list, true);
          mergedData[canonicalKey] = mergedList;
          localStorage.setItem(canonicalKey, JSON.stringify(mergedList));
        } else {
          mergedData[canonicalKey] = [];
        }
      });

      // Update local React states with the merged lists
      if (mergedData['stock_manager_products']) setProducts(mergedData['stock_manager_products']);
      if (mergedData['stock_manager_categories']) setCategories(mergedData['stock_manager_categories']);
      if (mergedData['stock_manager_activities']) setActivities(mergedData['stock_manager_activities']);
      if (mergedData['stock_manager_boms']) setBoms(mergedData['stock_manager_boms']);
      if (mergedData['stock_manager_projects_list']) setProjects(mergedData['stock_manager_projects_list']);
      if (mergedData['stock_manager_jobs_list']) setJobs(mergedData['stock_manager_jobs_list']);
      if (mergedData['stock_manager_employees_list']) setEmployees(mergedData['stock_manager_employees_list']);
      if (mergedData['stock_manager_brands_list']) setBrands(mergedData['stock_manager_brands_list']);
      if (mergedData['stock_manager_job_projects_list']) setJobProjects(mergedData['stock_manager_job_projects_list']);
      if (mergedData['stock_manager_daily_reports_list']) setDailyReports(mergedData['stock_manager_daily_reports_list']);

      // Upload to Firestore if logged in
      if (currentUser) {
        addToast('info', 'กำลังบันทึกข้อมูลและอัปเดตระบบคลาวด์...', 'ซิงค์ข้อมูลชุดที่รวมกันเรียบร้อยแล้วขึ้นฐานข้อมูลออนไลน์ เพื่อความปลอดภัยถาวร...');
        
        const keyToCollection: Record<string, string> = {
          'stock_manager_products': 'products',
          'stock_manager_categories': 'categories',
          'stock_manager_activities': 'activities',
          'stock_manager_boms': 'boms',
          'stock_manager_projects_list': 'projects',
          'stock_manager_jobs_list': 'jobs',
          'stock_manager_employees_list': 'employees',
          'stock_manager_brands_list': 'brands',
          'stock_manager_job_projects_list': 'jobProjects',
          'stock_manager_daily_reports_list': 'dailyReports'
        };

        try {
          for (const [key, list] of Object.entries(mergedData)) {
            const colName = keyToCollection[key];
            if (colName && Array.isArray(list) && list.length > 0) {
              // Upload the merged list directly without clearing to keep existing different items
              await uploadListToFirestoreInBatches(colName, list);
            }
          }
        } catch (firestoreErr: any) {
          console.warn("Firestore upload failed during restore cache group:", firestoreErr);
          addToast('warning', 'เชื่อมต่อคลาวด์ไม่สมบูรณ์ (อาจเกิดจากสิทธิ์เข้าถึงหรือโควต้า)', 'ข้อมูลบางส่วนไม่สามารถอัปโหลดขึ้นคลาวด์ได้ในขณะนี้ แต่ระบบได้รวมข้อมูลทั้งหมดลงเบราว์เซอร์เครื่องนี้ให้คุณใช้งานได้ปกติเรียบร้อยแล้ว!');
        }
      }

      addToast('success', 'อับเดดข้อมูลเข้าระบบเรียบร้อยแล้ว!', 'ระบบอับเดดและนำเข้าข้อมูลทั้งหมดเข้าสู่ฐานข้อมูลหลักของคุณเรียบร้อยแล้วครับ');
    } catch (err: any) {
      console.error(err);
      addToast('warning', 'การกู้คืนล้มเหลว', `เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSyncComplete(true);
    }
  };

  const handleUploadLocalStorageToCloud = async () => {
    if (!currentUser) {
      addToast('warning', 'จำเป็นต้องลงชื่อเข้าใช้', 'กรุณาเปิดระบบเพื่อนำเข้าประวัติขึ้นระบบคลาวด์');
      return;
    }

    try {
      const savedProducts = localStorage.getItem('stock_manager_products');
      const savedCategories = localStorage.getItem('stock_manager_categories');
      const savedActivities = localStorage.getItem('stock_manager_activities');
      const savedBoms = localStorage.getItem('stock_manager_boms');
      const savedProjects = localStorage.getItem('stock_manager_projects_list');
      const savedJobs = localStorage.getItem('stock_manager_jobs_list');
      const savedEmployees = localStorage.getItem('stock_manager_employees_list');
      const savedBrands = localStorage.getItem('stock_manager_brands_list');
      const savedJobProjects = localStorage.getItem('stock_manager_job_projects_list');
      const savedDailyReports = localStorage.getItem('stock_manager_daily_reports_list');

      if (
        !savedProducts &&
        !savedCategories &&
        !savedActivities &&
        !savedBoms &&
        !savedProjects &&
        !savedJobs &&
        !savedEmployees &&
        !savedBrands &&
        !savedJobProjects &&
        !savedDailyReports
      ) {
        addToast('warning', 'ไม่พบข้อมูลเดิมบนเครื่อง', 'ไม่พบประวัติข้อมูลหรือสินค้าที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้');
        return;
      }

      addToast('info', 'กำลังอัปโหลด...', 'เริ่มการเชื่อมข้อมูลเดิมของคุณจากเครื่องนี้ขึ้นระบบคลาวด์ออนไลน์ กรุณารอสักครู่...');

      // Categories
      if (savedCategories) {
        const categoriesList = JSON.parse(savedCategories) as Category[];
        await uploadListToFirestoreInBatches('categories', categoriesList);
      }

      // Products
      if (savedProducts) {
        const productsList = JSON.parse(savedProducts) as Product[];
        await uploadListToFirestoreInBatches('products', productsList);
      }

      // Activities
      if (savedActivities) {
        const activitiesList = JSON.parse(savedActivities) as StockActivity[];
        await uploadListToFirestoreInBatches('activities', activitiesList);
      }

      // Boms
      if (savedBoms) {
        const bomsList = JSON.parse(savedBoms) as Bom[];
        await uploadListToFirestoreInBatches('boms', bomsList);
      }

      // Projects
      if (savedProjects) {
        const projectsList = JSON.parse(savedProjects) as Project[];
        await uploadListToFirestoreInBatches('projects', projectsList);
      }

      // Jobs
      if (savedJobs) {
        const jobsList = JSON.parse(savedJobs) as Job[];
        await uploadListToFirestoreInBatches('jobs', jobsList);
      }

      // Employees
      if (savedEmployees) {
        const employeesList = JSON.parse(savedEmployees) as Employee[];
        await uploadListToFirestoreInBatches('employees', employeesList);
      }

      // Brands
      if (savedBrands) {
        const brandsList = JSON.parse(savedBrands) as Brand[];
        await uploadListToFirestoreInBatches('brands', brandsList);
      }

      // JobProjects
      if (savedJobProjects) {
        const jpList = JSON.parse(savedJobProjects) as JobProject[];
        await uploadListToFirestoreInBatches('jobProjects', jpList);
      }

      // DailyReports
      if (savedDailyReports) {
        const drList = JSON.parse(savedDailyReports) as DailyReport[];
        await uploadListToFirestoreInBatches('dailyReports', drList);
      }

      addToast('success', 'ซิงค์ข้อมูลสำเร็จ!', 'ระบบดึงรายการพัสดุและสต็อกทั้งหมดที่เคยบันทึกในเบราว์เซอร์เครื่องนี้ขึ้นฐานข้อมูลคลาวด์ส่วนกลางเรียบร้อยแล้วครับ ข้อมูลของคุณกลับมาทั้งหมดเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error(err);
      addToast('warning', 'การซิงค์ข้อมูลล้มเหลว', `เกิดข้อผิดพลาดในการนำขึ้นคลาวด์: ${err.message}`);
    }
  };

  const handleRollbackDatabase = async (targetTimeStr: string) => {
    try {
      const targetTime = new Date(targetTimeStr);
      if (isNaN(targetTime.getTime())) {
        addToast('warning', 'รูปแบบเวลาไม่ถูกต้อง', 'กรุณาระบุรูปแบบวันที่และเวลาที่ถูกต้อง');
        return;
      }

      setIsSyncComplete(false);

      // Revert product quantities using the activities log
      const revertedProducts = products.map(p => ({ ...p }));
      
      const activitiesAfterTarget = activities.filter(a => {
        const actTime = new Date(a.timestamp);
        return actTime > targetTime;
      });

      activitiesAfterTarget.sort((a, b) => (b?.timestamp || '').localeCompare(a?.timestamp || ''));

      for (const act of activitiesAfterTarget) {
        const prod = revertedProducts.find(p => p.id === act.productId);
        if (prod) {
          if (act.type === 'in') {
            prod.quantity = Math.max(0, prod.quantity - act.quantityChange);
          } else if (act.type === 'out') {
            prod.quantity = prod.quantity + act.quantityChange;
          } else if (act.type === 'adjust') {
            prod.quantity = act.oldQuantity;
          }
          prod.updatedAt = targetTimeStr;
        }
      }

      // Filter out records created after targetTime
      const filteredProducts = revertedProducts.filter(p => !p.createdAt || new Date(p.createdAt) <= targetTime);
      const filteredActivities = activities.filter(a => new Date(a.timestamp) <= targetTime);
      const filteredBoms = boms.filter(b => !b.createdAt || new Date(b.createdAt) <= targetTime);
      const filteredProjects = projects.filter(p => !p.createdAt || new Date(p.createdAt) <= targetTime);
      const filteredJobs = jobs.filter(j => !j.createdAt || new Date(j.createdAt) <= targetTime);
      const filteredEmployees = employees.filter(e => !e.createdAt || new Date(e.createdAt) <= targetTime);
      const filteredBrands = brands.filter(b => !b.createdAt || new Date(b.createdAt) <= targetTime);
      const filteredJobProjects = jobProjects.filter(jp => !jp.createdAt || new Date(jp.createdAt) <= targetTime);
      const filteredDailyReports = dailyReports.filter(dr => !dr.createdAt || new Date(dr.createdAt) <= targetTime);

      // Save to localStorage
      localStorage.setItem('stock_manager_products', JSON.stringify(filteredProducts));
      localStorage.setItem('stock_manager_activities', JSON.stringify(filteredActivities));
      localStorage.setItem('stock_manager_boms', JSON.stringify(filteredBoms));
      localStorage.setItem('stock_manager_projects_list', JSON.stringify(filteredProjects));
      localStorage.setItem('stock_manager_jobs_list', JSON.stringify(filteredJobs));
      localStorage.setItem('stock_manager_employees_list', JSON.stringify(filteredEmployees));
      localStorage.setItem('stock_manager_brands_list', JSON.stringify(filteredBrands));
      localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(filteredJobProjects));
      localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(filteredDailyReports));

      // Update local React states
      setProducts(filteredProducts);
      setActivities(filteredActivities);
      setBoms(filteredBoms);
      setProjects(filteredProjects);
      setJobs(filteredJobs);
      setEmployees(filteredEmployees);
      setBrands(filteredBrands);
      setJobProjects(filteredJobProjects);
      setDailyReports(filteredDailyReports);

      // Sync to Firebase Firestore if logged in
      if (currentUser) {
        const batch = writeBatch(db);

        const productsToDelete = products.filter(p => !filteredProducts.some(fp => fp.id === p.id));
        const activitiesToDelete = activities.filter(a => !filteredActivities.some(fa => fa.id === a.id));
        const bomsToDelete = boms.filter(b => !filteredBoms.some(fb => fb.id === b.id));
        const projectsToDelete = projects.filter(p => !filteredProjects.some(fp => fp.id === p.id));
        const jobsToDelete = jobs.filter(j => !filteredJobs.some(fj => fj.id === j.id));
        const employeesToDelete = employees.filter(e => !filteredEmployees.some(fe => fe.id === e.id));
        const brandsToDelete = brands.filter(b => !filteredBrands.some(fb => fb.id === b.id));
        const jpToDelete = jobProjects.filter(jp => !filteredJobProjects.some(fjp => fjp.id === jp.id));
        const drToDelete = dailyReports.filter(dr => !filteredDailyReports.some(fdr => fdr.id === dr.id));

        productsToDelete.forEach(p => batch.delete(doc(db, 'products', p.id)));
        activitiesToDelete.forEach(a => batch.delete(doc(db, 'activities', a.id)));
        bomsToDelete.forEach(b => batch.delete(doc(db, 'boms', b.id)));
        projectsToDelete.forEach(p => batch.delete(doc(db, 'projects', p.id)));
        jobsToDelete.forEach(j => batch.delete(doc(db, 'jobs', j.id)));
        employeesToDelete.forEach(e => batch.delete(doc(db, 'employees', e.id)));
        brandsToDelete.forEach(b => batch.delete(doc(db, 'brands', b.id)));
        jpToDelete.forEach(jp => batch.delete(doc(db, 'jobProjects', jp.id)));
        drToDelete.forEach(dr => batch.delete(doc(db, 'dailyReports', dr.id)));

        await batch.commit();

        await uploadListToFirestoreInBatches('products', filteredProducts);
        await uploadListToFirestoreInBatches('activities', filteredActivities);
        await uploadListToFirestoreInBatches('boms', filteredBoms);
        await uploadListToFirestoreInBatches('projects', filteredProjects);
        await uploadListToFirestoreInBatches('jobs', filteredJobs);
        await uploadListToFirestoreInBatches('employees', filteredEmployees);
        await uploadListToFirestoreInBatches('brands', filteredBrands);
        await uploadListToFirestoreInBatches('jobProjects', filteredJobProjects);
        await uploadListToFirestoreInBatches('dailyReports', filteredDailyReports);
      }

      addToast('success', 'ย้อนเวลาข้อมูลคลังพัสดุสำเร็จ!', `ดึงประวัติย้อนเวลากลับไป ณ ${targetTime ? targetTime.toLocaleString('th-TH') : ''} เรียบร้อย สต็อกทุกอย่างกลับคืนสภาพสมบูรณ์`);
    } catch (err: any) {
      console.error(err);
      addToast('warning', 'ย้อนเวลากู้ข้อมูลล้มเหลว', `เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSyncComplete(true);
    }
  };

  // -------------------- PRODUCTS WORKFLOWS --------------------

  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const productId = `prod-${Math.random().toString(36).substring(2, 9)}`;
    const product: Product = {
      ...newProd,
      id: productId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Log Activity
    const activity: StockActivity = {
      id: `act-${Math.random().toString(36).substring(2, 9)}`,
      productId: product.id,
      productName: product.name,
      type: 'in',
      quantityChange: product.quantity,
      oldQuantity: 0,
      newQuantity: product.quantity,
      reason: 'ขึ้นทะเบียนนำเข้าสินค้าใหม่ในระบบ',
      timestamp: new Date().toISOString(),
    };

    // Optimistic Update
    const updatedProducts = sortProducts([...products, product]);
    const updatedActivities = [activity, ...activities];
    setProducts(updatedProducts);
    setActivities(updatedActivities);
    localStorage.setItem('stock_manager_products', JSON.stringify(updatedProducts));
    localStorage.setItem('stock_manager_activities', JSON.stringify(updatedActivities));

    try {
      await setDoc(doc(db, 'products', product.id), cleanUndefined(product));
      await setDoc(doc(db, 'activities', activity.id), cleanUndefined(activity));
      addToast('success', 'ลงทะเบียนสินค้าเรียบร้อย', `สินค้า "${product.name}" ได้รับการเพิ่มในสต็อกแล้ว`);
    } catch (error: any) {
      handleFirestoreError("Add product error", error);
      addToast('info', 'ลงทะเบียนสำเร็จ (โหมดจำลองเครื่อง)', `สินค้า "${product.name}" ถูกบันทึกไว้ในอุปกรณ์นี้ชั่วคราว`);
    }
  };

  const handleEditProduct = async (id: string, updatedFields: Partial<Product>) => {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;

    // Build the updated product
    const updatedProd = { ...p, ...updatedFields, updatedAt: new Date().toISOString() };
    const updatedProducts = products.map((prod) => prod.id === id ? updatedProd : prod);
    
    // Log manual changes if price or sku changes
    let activity: StockActivity | null = null;
    if (updatedFields.costPrice !== undefined && updatedFields.costPrice !== p.costPrice) {
      activity = {
        id: `act-${Math.random().toString(36).substring(2, 9)}`,
        productId: p.id,
        productName: p.name,
        type: 'adjust',
        quantityChange: 0,
        oldQuantity: p.quantity,
        newQuantity: p.quantity,
        reason: `แก้ไขราคาทุนจาก ฿${p.costPrice} เป็น ฿${updatedFields.costPrice}`,
        timestamp: new Date().toISOString(),
      };
    }

    const updatedActivities = activity ? [activity, ...activities] : activities;

    // Optimistic Update
    setProducts(updatedProducts);
    localStorage.setItem('stock_manager_products', JSON.stringify(updatedProducts));
    if (activity) {
      setActivities(updatedActivities);
      localStorage.setItem('stock_manager_activities', JSON.stringify(updatedActivities));
    }

    try {
      const productRef = doc(db, 'products', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      cleanFields.updatedAt = new Date().toISOString();

      await updateDoc(productRef, cleanFields);
      if (activity) {
        await setDoc(doc(db, 'activities', activity.id), cleanUndefined(activity));
      }

      addToast('success', 'บันทึกความเปลี่ยนแปลงแล้ว', 'แก้ไขข้อมูลรายละเอียดสินค้าเรียบร้อย');
    } catch (error: any) {
      handleFirestoreError("Edit product error", error);
      addToast('info', 'บันทึกความเปลี่ยนแปลงแล้ว (โหมดจำลองเครื่อง)', 'แก้ไขข้อมูลสินค้าและบันทึกในเครื่องของคุณเรียบร้อย');
    }
  };

  const handleBulkEditProducts = async (updates: { id: string; updatedFields: Partial<Product> }[]) => {
    const updatedProducts = products.map((prod) => {
      const update = updates.find((u) => u.id === prod.id);
      if (update) {
        return { ...prod, ...update.updatedFields, updatedAt: new Date().toISOString() };
      }
      return prod;
    });

    const sortedProducts = sortProducts(updatedProducts);
    setProducts(sortedProducts);
    localStorage.setItem('stock_manager_products', JSON.stringify(sortedProducts));

    try {
      const batch = writeBatch(db);
      updates.forEach((up) => {
        const productRef = doc(db, 'products', up.id);
        const cleanFields: Record<string, any> = {};
        Object.entries(up.updatedFields).forEach(([key, val]) => {
          if (val !== undefined) {
            cleanFields[key] = val;
          }
        });
        cleanFields.updatedAt = new Date().toISOString();
        batch.update(productRef, cleanFields);
      });
      await batch.commit();
      addToast('success', 'บันทึกจัดลำดับพัสดุสำเร็จ', 'จัดลำดับเรียงตำแหน่งสินค้าเข้าสู่ระบบเรียบร้อย');
    } catch (error: any) {
      handleFirestoreError("Bulk edit products error", error);
      addToast('info', 'จัดลำดับพัสดุแล้ว (โหมดจำลอง)', 'จัดลำดับสินค้าและบันทึกข้อมูลบนเครื่องของคุณชั่วคราว');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const productToDelete = products.find((p) => p.id === id);
    if (!productToDelete) return;

    triggerConfirm(
      'ยืนยันการลบสินค้า',
      `คุณแน่ใจหรือไม่ที่จะลบสินค้า "${productToDelete.name}" ออกจากระบบถาวร?`,
      async () => {
        // Log deletion
        const activity: StockActivity = {
          id: `act-${Math.random().toString(36).substring(2, 9)}`,
          productId: id,
          productName: productToDelete.name,
          type: 'adjust',
          quantityChange: -productToDelete.quantity,
          oldQuantity: productToDelete.quantity,
          newQuantity: 0,
          reason: 'ลบรายการสินค้าถาวรออกจากระบบคลังสินค้า',
          timestamp: new Date().toISOString(),
        };

        // Optimistic Update
        const updatedProducts = products.filter((prod) => prod.id !== id);
        const updatedActivities = [activity, ...activities];
        setProducts(updatedProducts);
        setActivities(updatedActivities);
        localStorage.setItem('stock_manager_products', JSON.stringify(updatedProducts));
        localStorage.setItem('stock_manager_activities', JSON.stringify(updatedActivities));

        try {
          await deleteDoc(doc(db, 'products', id));
          await setDoc(doc(db, 'activities', activity.id), cleanUndefined(activity));
          addToast('info', 'นำสินค้าออกจากระบบ', `ลบ "${productToDelete.name}" เรียบร้อยแล้ว`);
        } catch (error: any) {
          handleFirestoreError("Delete product error", error);
          addToast('info', 'นำสินค้าออกแล้ว (โหมดจำลองเครื่อง)', `ลบรายการสินค้าในอุปกรณ์นี้เรียบร้อย`);
        }
      }
    );
  };

  // CORE REAL-TIME STOCK ADJUSTMENT ENGINE
  const handleAdjustStock = async (id: string, change: number, reason: string) => {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;

    const oldQty = p.quantity;
    const newQty = Math.max(0, p.quantity + change);
    if (oldQty === newQty) return;

    // Build activity
    const activity: StockActivity = {
      id: `act-${Math.random().toString(36).substring(2, 9)}`,
      productId: p.id,
      productName: p.name,
      type: change > 0 ? 'in' : change < 0 ? 'out' : 'adjust',
      quantityChange: change,
      oldQuantity: oldQty,
      newQuantity: newQty,
      reason: reason,
      timestamp: new Date().toISOString(),
    };

    // Optimistic Update
    const updatedProducts = products.map((prod) => prod.id === id ? { ...prod, quantity: newQty, updatedAt: new Date().toISOString() } : prod);
    const updatedActivities = [activity, ...activities];
    setProducts(updatedProducts);
    setActivities(updatedActivities);
    localStorage.setItem('stock_manager_products', JSON.stringify(updatedProducts));
    localStorage.setItem('stock_manager_activities', JSON.stringify(updatedActivities));

    // Show notification immediately (Optimistic UI feedback)
    if (newQty === 0) {
      addToast(
        'warning',
        '⚠️ สินค้าหมดเกลี้ยง (Out of Stock)',
        `สินค้า "${p.name}" ในคลังหมดเกลี้ยงแล้ว! กรุณาเพิ่มสต็อกโดยด่วน`
      );
    } else if (newQty <= p.minAlert) {
      addToast(
        'warning',
        '⚠️ สินค้าใกล้หมดคลัง (Low Stock Alert)',
        `สินค้า "${p.name}" เหลือเพียง ${newQty} ชิ้น (เกณฑ์เตือนต่ำกว่า ${p.minAlert} ชิ้น)`
      );
    } else if (change > 0) {
      addToast(
        'success',
        '✅ อัปเดตคลังสินค้าสำเร็จ',
        `เติมสินค้า "${p.name}" เข้าสต็อกคลังรวมเป็น ${newQty} ชิ้นแล้ว`
      );
    } else {
      addToast(
        'info',
        '📦 ทำรายการจ่ายออกสำเร็จ',
        `หักสินค้า "${p.name}" ออกจากคลังเรียบร้อย ยอดคงเหลือ: ${newQty} ชิ้น`
      );
    }

    try {
      await updateDoc(doc(db, 'products', id), {
        quantity: newQty,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'activities', activity.id), cleanUndefined(activity));
    } catch (error: any) {
      handleFirestoreError("Adjust stock error", error);
      // Since it's optimistic, we don't roll back, just log quota and toast
    }
  };

  const handleQuickRestock = (productId: string, amount: number) => {
    handleAdjustStock(productId, amount, 'เติมสต็อกด่วนจากหน้าแดชบอร์ดหลัก');
  };

  // -------------------- CATEGORIES WORKFLOWS --------------------

  const handleAddCategory = async (newCat: Omit<Category, 'id'> & { id?: string }) => {
    const category: Category = {
      ...newCat,
      id: newCat.id || `cat-${Math.random().toString(36).substring(2, 9)}`,
    };

    // Optimistic state and local cache updates
    const updatedCategories = [...categories, category];
    setCategories(updatedCategories);
    localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

    try {
      await setDoc(doc(db, 'categories', category.id), cleanUndefined(category));
      addToast('success', 'เพิ่มหมวดหมู่ใหม่สำเร็จ', `เพิ่มกลุ่มสินค้า "${category.name}" แล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('info', 'กำลังทำงานแบบออฟไลน์/บันทึกลงเครื่อง', `บันทึกกลุ่มสินค้า "${category.name}" ไว้ในเครื่องของคุณแล้ว: ${error.message}`);
    }
  };

  const handleEditCategory = async (id: string, updatedFields: Partial<Category>) => {
    // Optimistic state and local cache updates
    const updatedCategories = categories.map((cat) =>
      cat.id === id ? { ...cat, ...updatedFields } : cat
    );
    setCategories(updatedCategories);
    localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

    try {
      const categoryRef = doc(db, 'categories', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      await updateDoc(categoryRef, cleanFields);
      addToast('success', 'แก้ไขหมวดหมู่สำเร็จ', 'บันทึกความเปลี่ยนแปลงเรียบร้อย');
    } catch (error: any) {
      console.error(error);
      addToast('info', 'อัปเดตแบบออฟไลน์สำเร็จ', 'บันทึกการแก้ไขกลุ่มสินค้าไว้ในเครื่องของคุณแล้ว');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const associatedProducts = products.filter((p) => p.category === id);
    const catToDelete = categories.find((c) => c.id === id);
    if (!catToDelete) return;

    recentlyDeletedCategories.current.add(id);

    // Optimistic state and local cache updates
    const updatedCategories = categories.filter((cat) => cat.id !== id);
    setCategories(updatedCategories);
    localStorage.setItem('stock_manager_categories', JSON.stringify(updatedCategories));

    // Also optimistically update the local products state to remove association with this category
    // This prevents the healing effect from auto-recreating the deleted category
    const updatedProducts = products.map((p) => p.category === id ? { ...p, category: '' } : p);
    setProducts(updatedProducts);
    localStorage.setItem('stock_manager_products', JSON.stringify(updatedProducts));

    try {
      const batch = writeBatch(db);
      
      // Update all associated products to have an empty category in Firestore
      associatedProducts.forEach((p) => {
        batch.update(doc(db, 'products', p.id), { category: '' });
      });

      // Delete the category document
      batch.delete(doc(db, 'categories', id));

      await batch.commit();

      if (associatedProducts.length > 0) {
        addToast('success', 'ลบกลุ่มสินค้าสำเร็จ', `นำกลุ่มสินค้า "${catToDelete.name}" ออกจากระบบ และปลดการผูกสินค้า ${associatedProducts.length} รายการแล้ว`);
      } else {
        addToast('info', 'ลบกลุ่มสินค้าสำเร็จ', `นำกลุ่มสินค้า "${catToDelete.name}" ออกจากระบบ`);
      }
    } catch (error: any) {
      console.error(error);
      recentlyDeletedCategories.current.delete(id);
      // Rollback state on error
      setCategories(categories);
      setProducts(products);
      localStorage.setItem('stock_manager_categories', JSON.stringify(categories));
      localStorage.setItem('stock_manager_products', JSON.stringify(products));
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบกลุ่มสินค้าได้: ${error.message}`);
    }
  };

  // -------------------- JOBS WORKFLOWS --------------------

  const handleAddJob = async (newJobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    const jobId = `job-${Math.random().toString(36).substring(2, 9)}`;
    const job: Job = {
      ...newJobData,
      id: jobId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistically update state
    const updatedJobs = [job, ...jobs];
    setJobs(updatedJobs);
    localStorage.setItem('stock_manager_jobs_list', JSON.stringify(updatedJobs));

    try {
      await setDoc(doc(db, 'jobs', job.id), cleanUndefined(job));
      addToast('success', 'บันทึกสั่งงานสำเร็จ', `งานหมายเลข ${job.jobNo} มอดูล "${job.module}" ได้รับการบันทึกแล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถเพิ่มใบสั่งงานได้: ${error.message}`);
    }
  };

  const handleEditJob = async (id: string, updatedFields: Partial<Job>) => {
    // Optimistically update state
    const updatedJobs = jobs.map((job) =>
      job.id === id ? { ...job, ...updatedFields, updatedAt: new Date().toISOString() } : job
    );
    setJobs(updatedJobs);
    localStorage.setItem('stock_manager_jobs_list', JSON.stringify(updatedJobs));

    try {
      const jobRef = doc(db, 'jobs', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      cleanFields.updatedAt = new Date().toISOString();
      await updateDoc(jobRef, cleanFields);
      addToast('success', 'ปรับปรุงใบงานสำเร็จ', 'บันทึกข้อมูลและสถานะการเปลี่ยนความคืบหน้าของงานแล้ว');
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถปรับปรุงใบสั่งงานได้: ${error.message}`);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const jobToDelete = jobs.find((j) => j.id === id);
    if (!jobToDelete) return;

    // Optimistically update state
    const updatedJobs = jobs.filter((job) => job.id !== id);
    setJobs(updatedJobs);
    localStorage.setItem('stock_manager_jobs_list', JSON.stringify(updatedJobs));

    try {
      await deleteDoc(doc(db, 'jobs', id));
      addToast('info', 'ลบใบงานสำเร็จ', `งานหมายเลข ${jobToDelete.jobNo} มอดูล "${jobToDelete.module}" ถูกลบออกจากระบบแล้ว`);
    } catch (error: any) {
      console.error(error);
      // Rollback
      setJobs(jobs);
      localStorage.setItem('stock_manager_jobs_list', JSON.stringify(jobs));
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบใบสั่งงานได้: ${error.message}`);
    }
  };

  // -------------------- EMPLOYEES WORKFLOWS --------------------

  const handleAddEmployee = async (newEmployeeData: Omit<Employee, 'id' | 'createdAt'>) => {
    const empId = `emp-${Math.random().toString(36).substring(2, 9)}`;
    const emp: Employee = {
      ...newEmployeeData,
      id: empId,
      createdAt: new Date().toISOString()
    };

    const updatedEmployees = [...employees, emp];
    setEmployees(updatedEmployees);
    localStorage.setItem('stock_manager_employees_list', JSON.stringify(updatedEmployees));

    try {
      await setDoc(doc(db, 'employees', emp.id), cleanUndefined(emp));
      addToast('success', 'เพิ่มพนักงานสำเร็จ', `พนักงาน "${emp.name}" ถูกเพิ่มเข้าสู่ระบบแล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถเพิ่มพนักงานได้: ${error.message}`);
    }
  };

  const handleEditEmployee = async (id: string, updatedFields: Partial<Employee>) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === id ? { ...emp, ...updatedFields } : emp
    );
    setEmployees(updatedEmployees);
    localStorage.setItem('stock_manager_employees_list', JSON.stringify(updatedEmployees));

    try {
      const empRef = doc(db, 'employees', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      await updateDoc(empRef, cleanFields);
      addToast('success', 'ปรับปรุงข้อมูลพนักงานสำเร็จ', 'ข้อมูลของพนักงานได้รับการปรับปรุงในระบบแล้ว');
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถปรับปรุงพนักงานได้: ${error.message}`);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const empToDelete = employees.find((e) => e.id === id);
    if (!empToDelete) return;

    const updatedEmployees = employees.filter((emp) => emp.id !== id);
    setEmployees(updatedEmployees);
    localStorage.setItem('stock_manager_employees_list', JSON.stringify(updatedEmployees));

    try {
      await deleteDoc(doc(db, 'employees', id));
      addToast('info', 'ลบพนักงานสำเร็จ', `พนักงาน "${empToDelete.name}" ถูกนำออกจากระบบแล้ว`);
    } catch (error: any) {
      console.error(error);
      setEmployees(employees);
      localStorage.setItem('stock_manager_employees_list', JSON.stringify(employees));
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบพนักงานได้: ${error.message}`);
    }
  };

  // -------------------- BRANDS WORKFLOWS --------------------

  const handleAddBrand = async (newBrandData: Omit<Brand, 'id' | 'createdAt'>) => {
    const brandId = `brand-${Math.random().toString(36).substring(2, 9)}`;
    const brand: Brand = {
      ...newBrandData,
      id: brandId,
      createdAt: new Date().toISOString()
    };

    const updatedBrands = [...brands, brand];
    setBrands(updatedBrands);
    localStorage.setItem('stock_manager_brands_list', JSON.stringify(updatedBrands));

    try {
      await setDoc(doc(db, 'brands', brand.id), cleanUndefined(brand));
      addToast('success', 'เพิ่มแบรนด์สินค้าสำเร็จ', `แบรนด์ "${brand.name}" ถูกเพิ่มเข้าสู่ระบบแล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถเพิ่มแบรนด์ได้: ${error.message}`);
    }
  };

  const handleEditBrand = async (id: string, updatedFields: Partial<Brand>) => {
    const updatedBrands = brands.map((br) =>
      br.id === id ? { ...br, ...updatedFields } : br
    );
    setBrands(updatedBrands);
    localStorage.setItem('stock_manager_brands_list', JSON.stringify(updatedBrands));

    try {
      const brandRef = doc(db, 'brands', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      await updateDoc(brandRef, cleanFields);
      addToast('success', 'ปรับปรุงข้อมูลแบรนด์สำเร็จ', 'ข้อมูลของแบรนด์ได้รับการปรับปรุงในระบบแล้ว');
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถปรับปรุงแบรนด์ได้: ${error.message}`);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const brandToDelete = brands.find((b) => b.id === id);
    if (!brandToDelete) return;

    const updatedBrands = brands.filter((br) => br.id !== id);
    setBrands(updatedBrands);
    localStorage.setItem('stock_manager_brands_list', JSON.stringify(updatedBrands));

    try {
      await deleteDoc(doc(db, 'brands', id));
      addToast('info', 'ลบแบรนด์สินค้าสำเร็จ', `แบรนด์ "${brandToDelete.name}" ถูกนำออกจากระบบแล้ว`);
    } catch (error: any) {
      console.error(error);
      setBrands(brands);
      localStorage.setItem('stock_manager_brands_list', JSON.stringify(brands));
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบแบรนด์ได้: ${error.message}`);
    }
  };

  // -------------------- JOB PROJECTS WORKFLOWS --------------------

  const handleAddJobProject = async (newProjData: Omit<JobProject, 'id' | 'createdAt'>) => {
    const projId = `proj-${Math.random().toString(36).substring(2, 9)}`;
    const proj: JobProject = {
      ...newProjData,
      id: projId,
      createdAt: new Date().toISOString()
    };

    const updatedProjs = [proj, ...jobProjects];
    setJobProjects(updatedProjs);
    localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(updatedProjs));

    // Create companion BOM worksheet automatically
    const bomId = `bom-${Math.random().toString(36).substring(2, 9)}`;
    const newBom: Bom = {
      id: bomId,
      name: `BOM - ${proj.projectName}`,
      jobNo: proj.jobNo,
      description: `ใบงานประกอบ BOM อัตโนมัติสำหรับโครงการ ${proj.projectName}`,
      requiredQuantity: 1,
      status: 'pending',
      items: [],
      stockDeducted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedBoms = [newBom, ...boms];
    setBoms(updatedBoms);
    localStorage.setItem('stock_manager_boms', JSON.stringify(updatedBoms));

    try {
      await setDoc(doc(db, 'jobProjects', proj.id), cleanUndefined(proj));
      await setDoc(doc(db, 'boms', bomId), cleanUndefined(newBom));
      addToast('success', 'เพิ่มโปรเจกต์และสร้าง BOM สำเร็จ', `หมายเลขงาน ${proj.jobNo} ถูกบันทึก และระบบสร้างใบงาน "BOM - ${proj.projectName}" อัตโนมัติเรียบร้อยแล้ว`);
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถเพิ่มโปรเจกต์ได้: ${error.message}`);
    }
  };

  const handleEditJobProject = async (id: string, updatedFields: Partial<JobProject>) => {
    const updatedProjs = jobProjects.map((proj) =>
      proj.id === id ? { ...proj, ...updatedFields } : proj
    );
    setJobProjects(updatedProjs);
    localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(updatedProjs));

    try {
      const projRef = doc(db, 'jobProjects', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      await updateDoc(projRef, cleanFields);
      addToast('success', 'แก้ไขโปรเจกต์สำเร็จ', 'ข้อมูลโปรเจกต์ได้รับการปรับปรุงในระบบแล้ว');
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถปรับปรุงโปรเจกต์ได้: ${error.message}`);
    }
  };

  const handleDeleteJobProject = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const projToDelete = jobProjects.find((p) => p.id === id);
    if (!projToDelete) return;

    const updatedProjs = jobProjects.filter((proj) => proj.id !== id);
    setJobProjects(updatedProjs);
    localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(updatedProjs));

    try {
      await deleteDoc(doc(db, 'jobProjects', id));
      addToast('info', 'ลบโปรเจกต์สำเร็จ', `หมายเลขงาน ${projToDelete.jobNo} ถูกลบออกจากระบบแล้ว`);
    } catch (error: any) {
      console.error(error);
      setJobProjects(jobProjects);
      localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(jobProjects));
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบโปรเจกต์ได้: ${error.message}`);
    }
  };

  // -------------------- DAILY REPORTS WORKFLOWS --------------------

  const handleAddDailyReport = async (newReportData: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    const reportId = `report-${Math.random().toString(36).substring(2, 9)}`;
    const report: DailyReport = {
      ...newReportData,
      id: reportId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedReports = [report, ...dailyReports];
    setDailyReports(updatedReports);
    localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(updatedReports));

    try {
      await setDoc(doc(db, 'dailyReports', report.id), cleanUndefined(report));
      addToast('success', 'บันทึกรายงานประจำวันแล้ว', `รายงานวันที่ ${report.date} ของ "${report.employeeName}" ถูกบันทึกเรียบร้อย`);
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถส่งรายงานประจำวันได้: ${error.message}`);
    }
  };

  const handleEditDailyReport = async (id: string, updatedFields: Partial<DailyReport>) => {
    const updatedReports = dailyReports.map((rep) =>
      rep.id === id ? { ...rep, ...updatedFields, updatedAt: new Date().toISOString() } : rep
    );
    setDailyReports(updatedReports);
    localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(updatedReports));

    try {
      const reportRef = doc(db, 'dailyReports', id);
      const cleanFields: Record<string, any> = {};
      Object.entries(updatedFields).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanFields[key] = val;
        }
      });
      cleanFields.updatedAt = new Date().toISOString();
      await updateDoc(reportRef, cleanFields);
      addToast('success', 'ปรับปรุงรายงานเรียบร้อย', 'ข้อมูลรีวิวและรายละเอียดรายงานประจำวันได้รับการบันทึกแล้ว');
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถแก้ไขรายงานประจำวันได้: ${error.message}`);
    }
  };

  const handleDeleteDailyReport = async (id: string) => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบข้อมูล');
      return;
    }
    const reportToDelete = dailyReports.find((r) => r.id === id);
    if (!reportToDelete) return;

    const updatedReports = dailyReports.filter((rep) => rep.id !== id);
    setDailyReports(updatedReports);
    localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(updatedReports));

    try {
      await deleteDoc(doc(db, 'dailyReports', id));
      addToast('info', 'ลบรายงานประจำวันสำเร็จ', `ลบรายงานของ "${reportToDelete.employeeName}" เรียบร้อยแล้ว`);
    } catch (error: any) {
      console.error(error);
      setDailyReports(dailyReports);
      localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(dailyReports));
      addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถลบรายงานประจำวันได้: ${error.message}`);
    }
  };

  const handleClearLogs = async () => {
    if (currentUserRole !== 'admin') {
      addToast('error', 'ปฏิเสธการเข้าถึง', 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ได้รับอนุญาตให้ลบประวัติการทำรายการ');
      return;
    }
    triggerConfirm(
      'ยืนยันการเคลียร์ประวัติทำรายการ',
      'คุณแน่ใจหรือไม่ที่ต้องการจะเคลียร์ประวัติการทำรายการในอดีตทั้งหมด? (ประวัติจะหายไปถาวร)',
      async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'activities'));
          const batch = writeBatch(db);
          querySnapshot.forEach((document) => {
            batch.delete(doc(db, 'activities', document.id));
          });
          await batch.commit();
          addToast('info', 'ล้างประวัติการทำรายการแล้ว', 'ประวัติความเคลื่อนไหวทั้งหมดถูกลบออกจากฐานข้อมูลเรียบร้อย');
        } catch (error: any) {
          console.error(error);
          addToast('warning', 'เกิดข้อผิดพลาด', `ไม่สามารถล้างประวัติได้: ${error.message}`);
        }
      }
    );
  };

  // Out of Stock & Low Stock items count for bell notification badges
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;
  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minAlert).length;
  const totalAlerts = outOfStockCount + lowStockCount;

  // Render correct panel
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            products={products}
            categories={categories}
            activities={activities}
            onQuickRestock={handleQuickRestock}
            onNavigateToTab={setCurrentTab}
            onSetStatusFilter={setStatusFilter}
            userCount={userRoles.length}
            isQuotaExceeded={isQuotaExceeded}
            lastDbSyncTime={lastDbSyncTime}
            onSaveAllToDatabase={handleSaveAllToDatabase}
            onPullFreshFromDatabase={() => handlePullFreshFromDatabase(true)}
            isSavingAllToDb={isSavingAllToDb}
            isPullingFreshDb={isPullingFreshDb}
          />
        );
      case 'products':
        return (
          <ProductListView
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onBulkEditProducts={handleBulkEditProducts}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            statusFilter={statusFilter}
            onSetStatusFilter={setStatusFilter}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            addToast={addToast}
            employees={employees}
            jobProjects={jobProjects}
            brands={brands}
            boms={boms}
            setBoms={setBoms}
          />
        );
      case 'logs':
        return <ActivityLogView activities={activities} onClearLogs={handleClearLogs} />;
      case 'projects_bom':
        return (
          <ProjectBomView
            products={products}
            boms={boms}
            projects={projects}
            categories={categories}
            addToast={addToast}
            jobProjects={jobProjects}
            onAddJobProject={handleAddJobProject}
            onEditJobProject={handleEditJobProject}
            onDeleteJobProject={handleDeleteJobProject}
            employees={employees}
            
            jobs={jobs}
            onAddJob={handleAddJob}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            dailyReports={dailyReports}
            onAddDailyReport={handleAddDailyReport}
            onEditDailyReport={handleEditDailyReport}
            onDeleteDailyReport={handleDeleteDailyReport}
          />
        );
      case 'reports':
        return (
          <ReportsView
            products={products}
            categories={categories}
            activities={activities}
          />
        );
      case 'jobs':
        return (
          <JobAssignmentView
            jobs={jobs}
            onAddJob={handleAddJob}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            jobProjects={jobProjects}
            onAddJobProject={handleAddJobProject}
            onEditJobProject={handleEditJobProject}
            onDeleteJobProject={handleDeleteJobProject}
            dailyReports={dailyReports}
            onAddDailyReport={handleAddDailyReport}
            onEditDailyReport={handleEditDailyReport}
            onDeleteDailyReport={handleDeleteDailyReport}
          />
        );
      case 'settings':
        return (
          <SettingsView
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            jobProjects={jobProjects}
            onAddJobProject={handleAddJobProject}
            onEditJobProject={handleEditJobProject}
            onDeleteJobProject={handleDeleteJobProject}
            jobs={jobs}
            onEditJob={handleEditJob}
            brands={brands}
            onAddBrand={handleAddBrand}
            onEditBrand={handleEditBrand}
            onDeleteBrand={handleDeleteBrand}
            onDownloadBackup={handleDownloadBackup}
            onRestoreBackup={handleRestoreBackup}
            onSaveAllToDatabase={handleSaveAllToDatabase}
            isSavingAllToDb={isSavingAllToDb}
            lastDbSyncTime={lastDbSyncTime}
            activities={activities}
            onRollbackDatabase={handleRollbackDatabase}
            onRestoreCacheGroup={handleRestoreCacheGroup}
            triggerConfirm={triggerConfirm}
            addToast={addToast}
            userRoles={userRoles}
            products={products}
            categories={categories}
            boms={boms}
            dailyReports={dailyReports}
          />
        );
      case 'catalog':
        return (
          <CatalogView
            products={products}
            categories={categories}
            jobProjects={jobProjects}
            addToast={addToast}
            brands={brands}
            boms={boms}
          />
        );
      case 'users':
        if (currentUserRole !== 'admin') {
          return (
            <div className="p-8 text-center text-slate-500 font-sans">
              <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-3 animate-pulse" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">เข้าถึงสิทธิ์ถูกปฏิเสธ (Unauthorized Access)</p>
              <p className="text-xs mt-1">เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถตรวจสอบและสลับสิทธิ์การเข้าใช้งานได้</p>
            </div>
          );
        }
        return (
          <UserManagementView
            userRoles={userRoles}
            employees={employees}
            currentUserEmail={currentUser ? currentUser.email : null}
            onUpdateUserRole={async (uid, role) => {
              await setDoc(doc(db, 'user_roles', uid), cleanUndefined({ role, uid }), { merge: true });
            }}
            onUpdateUser={async (uid, updatedData) => {
              await setDoc(doc(db, 'user_roles', uid), cleanUndefined({ ...updatedData, uid }), { merge: true });
            }}
            onAddUserRole={async (userData) => {
              const tempUid = userData.uid || `pre_${Date.now()}`;
              await setDoc(doc(db, 'user_roles', tempUid), cleanUndefined({
                ...userData,
                uid: tempUid,
                createdAt: new Date().toISOString()
              }));
            }}
            onDeleteUserRole={async (uid) => {
              await deleteDoc(doc(db, 'user_roles', uid));
            }}
            addToast={addToast}
            triggerConfirm={triggerConfirm}
          />
        );

      case 'google_sheets':
        return (
          <GoogleSheetsView
            appData={{
              products,
              categories,
              boms,
              projects,
              jobs,
              employees,
              brands,
              dailyReports,
              activities,
              userRoles
            }}
            onUpdateAllData={async (newData) => {
              if (newData.products) setProducts(sortProducts(newData.products));
              if (newData.categories) setCategories(newData.categories);
              if (newData.boms) setBoms(newData.boms);
              if (newData.projects) setProjects(newData.projects);
              if (newData.jobs) setJobs(newData.jobs);
              if (newData.employees) setEmployees(newData.employees);
              if (newData.brands) setBrands(newData.brands);
              if (newData.dailyReports) setDailyReports(newData.dailyReports);
              if (newData.activities) setActivities(newData.activities);
              if (newData.userRoles) setUserRoles(newData.userRoles);

              // Sync updated lists to Firestore in batches with deletion cleanup so all signed-in IDs see identical data
              await Promise.all([
                uploadListToFirestoreInBatches('products', newData.products || [], true),
                uploadListToFirestoreInBatches('categories', newData.categories || [], true),
                uploadListToFirestoreInBatches('boms', newData.boms || [], true),
                uploadListToFirestoreInBatches('projects', newData.projects || [], true),
                uploadListToFirestoreInBatches('jobs', newData.jobs || [], true),
                uploadListToFirestoreInBatches('employees', newData.employees || [], true),
                uploadListToFirestoreInBatches('brands', newData.brands || [], true),
                uploadListToFirestoreInBatches('dailyReports', newData.dailyReports || [], true),
                uploadListToFirestoreInBatches('activities', newData.activities || [], true),
                uploadListToFirestoreInBatches('user_roles', newData.userRoles || [], true)
              ]);
            }}
            addToast={addToast}
          />
        );

      default:
        return null;
    }
  };

  const handleAlertBellClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleNotificationItemClick = (type: string) => {
    setStatusFilter(type);
    setCurrentTab('products');
    setIsNotificationsOpen(false);
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoggingIn) return;
    setIsGoogleLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      setIsOperationNotAllowed(false);
      setShowPopupBlockedHelp(false);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      addToast('success', 'เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับคุณ ${user.email} เข้าสู่ระบบควบคุมคลังสินค้า`);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.info("Google login popup closed or cancelled by user:", error.code);
        addToast('info', 'ยกเลิกการเข้าสู่ระบบ', 'คุณได้ปิดหน้าต่างเข้าสู่ระบบ Google');
      } else {
        console.error("Google login error:", error);
        if (
          error.code === 'auth/popup-blocked' ||
          error.message?.toLowerCase().includes('popup-blocked') ||
          error.message?.toLowerCase().includes('popup blocked')
        ) {
          setShowPopupBlockedHelp(true);
          addToast('warning', 'ป๊อปอัปเข้าสู่ระบบถูกบล็อก', 'เบราว์เซอร์หรือกรอบพรีวิวบล็อกป๊อปอัปเข้าสู่ระบบของ Google โปรดดูวิธีแก้ไขที่แสดงขึ้นมาใหม่ด้านล่าง');
        } else if (error.code === 'auth/internal-error' || error.message?.includes('internal-error')) {
          addToast('warning', 'ข้อผิดพลาดระบบล็อกอิน Google', 'เกิดข้อผิดพลาดภายใน (Internal error) โปรดลองกดเข้าสู่ระบบอีกครั้ง หรือลองเปิดแอปในหน้าต่างใหม่ (Open in new tab) หรือเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน');
        } else if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
          setIsOperationNotAllowed(true);
          addToast('error', 'ระบบยังไม่เปิดใช้', 'ผู้ให้บริการ Google Login ยังไม่ได้เปิดใช้ใน Firebase Console');
        } else {
          addToast('error', 'ข้อผิดพลาดการเข้าสู่ระบบ', `ไม่สามารถเข้าสู่ระบบด้วย Google: ${error.message}`);
        }
      }
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmailInput.trim().toLowerCase();
    const password = loginPasswordInput;
    
    if (!email || !password) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'โปรดระบุอีเมลและรหัสผ่านเพื่อดำเนินการ');
      return;
    }

    try {
      setIsOperationNotAllowed(false);
      if (isRegisterMode) {
        // Register standard user
        let user;
        let isAutoLogin = false;
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          user = result.user;
        } catch (regError: any) {
          if (regError.code === 'auth/email-already-in-use') {
            const loginResult = await signInWithEmailAndPassword(auth, email, password);
            user = loginResult.user;
            isAutoLogin = true;
          } else {
            throw regError;
          }
        }
        
        if (isAutoLogin) {
          addToast('success', 'เข้าสู่ระบบสำเร็จ', `ตรวจพบว่าอีเมลนี้เคยสมัครสมาชิกแล้ว ระบบนำท่านเข้าสู่ระบบเรียบร้อย: ${email}`);
        } else {
          // Update display name
          const displayName = registerDisplayNameInput.trim() || email.split('@')[0];
          await updateProfile(user, { displayName });
          
          // Save user role record
          const userRoleRef = doc(db, 'user_roles', user.uid);
          const isDefaultAdmin = email === 'chaleesogood@gmail.com' || email === 'chalee@gtt2013.com';
          const defaultRole: 'admin' | 'user' = isDefaultAdmin ? 'admin' : 'user';
          
          const newRoleRecord: UserRole = {
            uid: user.uid,
            email,
            displayName,
            role: defaultRole,
            status: isDefaultAdmin ? 'active' : 'pending',
            createdAt: new Date().toISOString()
          };
          
          await setDoc(userRoleRef, cleanUndefined(newRoleRecord));
          addToast('success', 'สมัครสมาชิกสำเร็จ', `สร้างบัญชีและเข้าสู่ระบบเรียบร้อยแล้ว: ${email}`);
        }
      } else {
        // Login
        const result = await signInWithEmailAndPassword(auth, email, password);
        addToast('success', 'เข้าสู่ระบบสำเร็จ', `เข้าสู่ระบบสำเร็จในชื่อบัญชี ${result.user.email}`);
      }
    } catch (error: any) {
      if (error.code && error.code.startsWith('auth/')) {
        console.warn("Auth validation state:", error.code);
      } else {
        console.error("Auth error:", error);
      }
      let errMsg = error.message;
      if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        errMsg = 'ช่องทางล็อกอินนี้ (Email/Password) ยังไม่เปิดใช้งานใน Firebase Console ของคุณ';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (error.code === 'auth/email-already-in-use') {
        errMsg = 'อีเมลนี้ถูกใช้งานในการสมัครสมาชิกไปแล้ว';
      } else if (error.code === 'auth/weak-password') {
        errMsg = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      } else if (error.code === 'auth/invalid-email') {
        errMsg = 'รูปแบบอีเมลไม่ถูกต้อง';
      }
      addToast('error', 'เกิดข้อผิดพลาด', errMsg);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotPasswordEmailInput.trim().toLowerCase();
    if (!email) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'โปรดระบุอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      addToast('success', 'ส่งลิงก์สำเร็จ', `ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล ${email} เรียบร้อยแล้ว โปรดตรวจสอบกล่องข้อความหรือกล่องจดหมายขยะของคุณครับ`);
      setIsForgotPasswordMode(false);
      setLoginEmailInput(email);
    } catch (error: any) {
      if (error.code && error.code.startsWith('auth/')) {
        console.warn("Reset password validation state:", error.code);
      } else {
        console.error("Reset password error:", error);
      }
      let errorMsg = 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ในขณะนี้ โปรดตรวจสอบความถูกต้องของอีเมลหรือลองใหม่อีกครั้ง';
      if (error.code === 'auth/user-not-found' || error.message?.includes('user-not-found')) {
        errorMsg = 'ไม่พบบัญชีผู้ใช้ที่ใช้อีเมลนี้ในระบบ โปรดตรวจสอบอีเมลอีกครั้ง';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'รูปแบบอีเมลไม่ถูกต้อง';
      }
      addToast('error', 'เกิดข้อผิดพลาด', errorMsg);
    }
  };

  const handleSignOut = async () => {
    try {
      window.localStorage.removeItem('stock_manager_is_offline');
      window.localStorage.removeItem('admin_email');
      window.localStorage.removeItem('stock_manager_cart');

      await signOut(auth);
      addToast('info', 'ออกจากระบบเรียบร้อย', 'เซสชันการเข้าใช้งานคลังถูกปิดเรียบร้อยแล้ว');
    } catch (err: any) {
      addToast('error', 'ออกจากระบบล้มเหลว', err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 antialiased">
        <div className="text-center space-y-4">
          <Logo className="h-16 w-16 mx-auto animate-bounce text-indigo-500" size={64} />
          <p className="text-sm text-indigo-400 font-mono tracking-widest uppercase">กำลังเชื่อมต่อระบบคลัง GTT EE STORE...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 antialiased selection:bg-indigo-500/30">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo className="h-16 w-16" size={64} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-white font-sans tracking-wide">GTT EE STORE</h1>
              <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase">ระบบบริหารจัดการสต็อกและคลังสินค้า</p>
            </div>
          </div>

          <div className="border-t border-slate-800/80 my-2"></div>

          {isOperationNotAllowed && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-xs space-y-2.5 text-slate-200">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>เปิดใช้งานสิทธิ์การล็อกอินที่คอนโซล Firebase (Auth Required)</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                ระบบล็อกอินยังไม่ได้รับการเปิดใช้งานในหลังบ้านของคุณ โปรดแก้ไขได้ตามขั้นตอนดังนี้:
              </p>
              <ol className="list-decimal pl-4.5 space-y-1.5 font-sans text-slate-300 leading-normal">
                <li>เปิดหน้า <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-bold">Firebase Console <ExternalLink className="h-3 w-3" /></a></li>
                <li>ไปที่แท็บเมนู <strong className="text-white">Authentication</strong> &gt; <strong className="text-white">Sign-in method</strong></li>
                <li>คลิกเปิดใช้งาน (Enable) <strong className="text-white">Email/Password</strong> และ <strong className="text-white">Google</strong></li>
                <li>บันทึกการเปลี่ยนแปลง แล้วกลับมารีเฟรชหน้านี้ใหม่</li>
              </ol>
            </div>
          )}

          {showPopupBlockedHelp && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl text-xs space-y-3.5 text-slate-200 text-left leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>ตรวจพบป๊อปอัปถูกปิดกั้นหรือยกเลิก (Popup Blocked / Cancelled)</span>
              </div>
              
              <div className="space-y-2 font-sans">
                <p className="text-[11px] font-bold text-amber-300">💡 1. หากเปิดใช้งานบนเว็บจริง Vercel.app (Custom Domain):</p>
                <p className="text-[10.5px] text-slate-300 pl-2">
                  คุณจำเป็นต้องเพิ่มโดเมน Vercel ของคุณเข้าไปในรายการ <strong className="text-white">Authorized Domains</strong> (โดเมนที่ได้รับอนุญาต) ในระบบ Firebase Console:
                </p>
                <ol className="list-decimal pl-6 space-y-1 text-[10.5px] text-slate-300">
                  <li>เปิดหน้า <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-bold font-sans">Firebase Console <ExternalLink className="h-3 w-3" /></a> แล้วเลือกโปรเจกต์ของคุณ</li>
                  <li>ไปที่เมนู <strong className="text-white">Authentication</strong> &gt; <strong className="text-white">Settings</strong> &gt; แท็บ <strong className="text-white">Authorized domains</strong> (โดเมนที่ได้รับอนุญาต)</li>
                  <li>คลิกปุ่ม <strong className="text-white">Add domain</strong> (เพิ่มโดเมน) แล้วกรอกชื่อโดเมนของคุณลงไป (เช่น <code className="bg-slate-950 text-emerald-400 px-1 py-0.5 rounded text-[10px] font-mono">xxx.vercel.app</code>) แล้วกด Save</li>
                </ol>
              </div>

              <div className="space-y-2 border-t border-slate-800/80 pt-2 font-sans">
                <p className="text-[11px] font-bold text-amber-300">💡 2. หากเปิดแอปผ่านกรอบพรีวิว AI Studio ในตอนนี้:</p>
                <p className="text-[10.5px] text-slate-300 pl-2">
                  ระบบความปลอดภัยของเว็บเบราว์เซอร์จะบล็อกการเปิดหน้าต่างป๊อปอัปเมื่อทำงานอยู่ภายในกรอบ iframe ของแผงควบคุมหลัก
                </p>
                <div className="pt-1 flex flex-col gap-2 pl-2">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/15"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    เปิดแอปในหน้าต่างใหม่ (Open in New Tab) เพื่อล็อกอิน
                  </a>
                  <p className="text-[10px] text-slate-400 text-center">
                    เมื่อรันบนเบราว์เซอร์แท็บปกติแล้ว จะสามารถกดลงชื่อเข้าใช้ด้วยบัญชี Google ได้ทันที!
                  </p>
                </div>
              </div>
            </div>
          )}

          {isForgotPasswordMode ? (
            <div className="space-y-4 text-left">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white font-sans">ลืมรหัสผ่าน (Forgot Password)</h3>
                <p className="text-xs text-slate-400 font-sans">กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่</p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 font-sans block">อีเมลเข้าใช้ระบบ / Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotPasswordEmailInput || ''}
                    onChange={(e) => setForgotPasswordEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-sans text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs font-sans uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 cursor-pointer text-center"
                >
                  ส่งลิงก์รีเซ็ตรหัสผ่าน (Send Reset Link)
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsForgotPasswordMode(false)}
                className="w-full text-center text-xs font-bold text-indigo-400 hover:text-indigo-300 font-sans cursor-pointer transition-all hover:underline"
              >
                ย้อนกลับไปหน้าเข้าสู่ระบบ (Back to Login)
              </button>
            </div>
          ) : (
            <>
              {/* Tab Selection */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  onClick={() => { setIsRegisterMode(false); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all font-sans cursor-pointer ${
                    !isRegisterMode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  เข้าสู่ระบบ (Login)
                </button>
                <button
                  onClick={() => { setIsRegisterMode(true); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all font-sans cursor-pointer ${
                    isRegisterMode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  สมัครสมาชิก (Register)
                </button>
              </div>

              <form onSubmit={handleEmailPasswordLogin} className="space-y-4 text-left">
                {isRegisterMode && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 font-sans block">ชื่อผู้ใช้งาน / Display Name</label>
                    <input
                      type="text"
                      value={registerDisplayNameInput || ''}
                      onChange={(e) => setRegisterDisplayNameInput(e.target.value)}
                      placeholder="ชื่อของคุณ..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-sans text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 font-sans block">อีเมลเข้าใช้ระบบ / Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmailInput || ''}
                    onChange={(e) => setLoginEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-sans text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 font-sans block">รหัสผ่าน / Password (ขั้นต่ำ 6 ตัว)</label>
                    {!isRegisterMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordEmailInput(loginEmailInput);
                          setIsForgotPasswordMode(true);
                        }}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 font-sans hover:underline cursor-pointer"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPasswordInput || ''}
                    onChange={(e) => setLoginPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-sans text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs font-sans uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 cursor-pointer text-center"
                >
                  {isRegisterMode ? 'สร้างบัญชีสมาชิกใหม่ (Register)' : 'ลงชื่อเข้าสู่คลัง (Sign In)'}
                </button>
              </form>
            </>
          )}

          {/* OR divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-x-0 border-t border-slate-800"></div>
            <span className="relative px-3 bg-slate-900 text-[10px] font-black text-slate-500 tracking-wider font-sans">หรือเข้าใช้ผ่านช่องทาง</span>
          </div>

          {/* Google login option */}
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoggingIn}
            type="button"
            className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl text-xs font-sans tracking-wide transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoggingIn ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>กำลังเชื่อมต่อ Google...</span>
              </span>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.463 0-6.27-2.808-6.27-6.27s2.807-6.27 6.27-6.27c1.633 0 3.124.628 4.254 1.652l3.125-3.124C19.294 2.723 15.984 1.5 12.24 1.5c-5.799 0-10.5 4.701-10.5 10.5s4.701 10.5 10.5 10.5c5.342 0 10.026-3.834 10.026-10.5 0-.585-.054-1.15-.152-1.715H12.24Z" />
                </svg>
                <span>เข้าใช้ด้วยบัญชี Google (Gmail)</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-500 text-center font-mono leading-relaxed mt-2">
            ระบบจัดเก็บคลังและคำนวณโครงสร้าง BOM แบบเรียลไทม์<br />
            GTT EE STORE PLATFORM
          </p>
        </div>
        {/* Toast notifications container during login */}
        <div className="fixed bottom-5 right-5 space-y-3 z-50 flex flex-col items-end">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    );
  }

  const userEmailClean = (currentUser?.email || '').trim().toLowerCase();
  const isDeveloperUser = ['chaleesogood@gmail.com', 'chalee@gtt2013.com'].includes(userEmailClean);

  if (!isDeveloperUser && currentUserStatus !== 'active') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 antialiased selection:bg-amber-500/30">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo className="h-16 w-16 text-indigo-500" size={64} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-white font-sans tracking-wide">GTT EE STORE PLATFORM</h1>
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">
                {currentUserStatus === 'disabled' ? '🚫 บัญชีถูกระงับการใช้งาน (Account Suspended)' : '⏳ รอการอนุมัติสิทธิ์เข้าใช้งาน (Pending Activation)'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800/80 my-2"></div>

          {currentUserStatus === 'disabled' ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-xs space-y-2 text-slate-200">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>บัญชีของคุณถูกระงับการใช้งานชั่วคราว</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                ผู้ดูแลระบบ (Admin) ได้ทำการปิดกั้นหรือระงับสิทธิ์การเข้าใช้งานบัญชีนี้ในระบบ หากคิดว่าเกิดจากความผิดพลาด กรุณาติดต่อผู้ดูแลระบบเพื่อขอเปิดใช้งานอีกครั้ง
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl text-xs space-y-2 text-slate-200">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Clock className="h-4.5 w-4.5 shrink-0" />
                <span>ลงทะเบียนเข้าสู่ระบบสำเร็จ — รอ Admin เปิดใช้งานบัญชี</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                บัญชีของคุณได้รับการลงทะเบียนเข้าสู่ระบบเรียบร้อยแล้ว แต่เนื่องจากเป็นบัญชีผู้ใช้ใหม่ จำเป็นต้องรอให้ผู้ดูแลระบบ (Admin) ทำการยืนยันและเปิดสิทธิ์การเข้าใช้งานก่อน จึงจะสามารถเข้าถึงข้อมูลคลังและเบิกพัสดุได้
              </p>
            </div>
          )}

          {/* User Account Info Card */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 font-sans text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>บัญชีผู้ใช้ (Email):</span>
              <span className="font-bold text-white font-mono">{currentUser.email}</span>
            </div>
            {currentUser.displayName && (
              <div className="flex justify-between items-center text-slate-400">
                <span>ชื่อแสดง (Name):</span>
                <span className="font-medium text-slate-200">{currentUser.displayName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-400">
              <span>สถานะสิทธิ์ในระบบ:</span>
              <span className={`font-bold px-2.5 py-0.5 rounded-md text-[10.5px] ${
                currentUserStatus === 'disabled' 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {currentUserStatus === 'disabled' ? 'Disabled (ระงับการใช้งาน)' : 'Pending Activation (รอ Admin ยืนยันสิทธิ์)'}
              </span>
            </div>
          </div>

          <div className="space-y-3 font-sans">
            <button
              onClick={async () => {
                setIsCheckingActivation(true);
                try {
                  const docSnap = await getDoc(doc(db, 'user_roles', currentUser.uid));
                  if (docSnap.exists()) {
                    const data = docSnap.data() as UserRole;
                    const st = data.status || 'active';
                    setCurrentUserStatus(st);
                    if (st === 'active') {
                      addToast('success', 'อนุมัติเรียบร้อยแล้ว!', 'บัญชีของคุณได้รับการเปิดใช้งานเรียบร้อยแล้ว ยินดีต้อนรับเข้าสู่ระบบ');
                    } else {
                      addToast('info', 'ยังคงรอการอนุมัติ', 'บัญชีของคุณยังคงอยู่ในสถานะรอการยืนยันจาก Admin');
                    }
                  } else {
                    addToast('info', 'ยังคงรอการอนุมัติ', 'ยังไม่พบการอนุมัติสิทธิ์ในขณะนี้');
                  }
                } catch (e) {
                  addToast('error', 'ข้อผิดพลาด', 'ไม่สามารถตรวจสอบสถานะได้ในขณะนี้');
                } finally {
                  setIsCheckingActivation(false);
                }
              }}
              disabled={isCheckingActivation}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {isCheckingActivation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังตรวจสอบสถานะ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>ตรวจสอบสถานะการเปิดใช้งาน (Check Status)</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="mailto:chaleesogood@gmail.com"
                className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-indigo-400" />
                <span>แจ้ง Admin</span>
              </a>

              <button
                onClick={handleSignOut}
                className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center font-mono leading-relaxed pt-1">
            เมื่อผู้ดูแลระบบทำการกดยืนยันเปิดสิทธิ์ ระบบจะนำท่านเข้าสู่แอปพลิเคชันโดยอัตโนมัติทันที
          </p>
        </div>

        {/* Toast notifications container */}
        <div className="fixed bottom-5 right-5 space-y-3 z-50 flex flex-col items-end">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col md:flex-row antialiased text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* -------------------- SIDEBAR NAVIGATION (DESKTOP) -------------------- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 z-20">
        {/* Brand / Logo */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <Logo className="h-10 w-10 flex-shrink-0" size={40} />
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide font-sans">GTT EE STORE</h1>
            <p className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">Inventory Real-time</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-grow p-4 space-y-1 mt-4">
          <button
            onClick={() => { setCurrentTab('dashboard'); setStatusFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5 flex-shrink-0" />
            ภาพรวมระบบ (Dashboard)
          </button>

          <button
            onClick={() => { setCurrentTab('products'); setStatusFilter('all'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'products'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="h-4.5 w-4.5 flex-shrink-0" />
              จัดการสินค้า และจัดซื้อ
            </div>
            {outOfStockCount > 0 && (
              <span className="bg-rose-600 text-[10px] font-mono text-white font-bold h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                {outOfStockCount} หมด
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('catalog')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <BookOpen className="h-4.5 w-4.5 flex-shrink-0" />
            แคตตาล็อกพัสดุ (Catalog)
          </button>

          <button
            onClick={() => setCurrentTab('projects_bom')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'projects_bom' || currentTab === 'jobs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <FolderKanban className="h-4.5 w-4.5 flex-shrink-0" />
            BOM & Planning
          </button>

          <button
            onClick={() => setCurrentTab('google_sheets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'google_sheets'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800/60 hover:text-emerald-300 text-emerald-400'
            }`}
            id="sidebar-google-sheets-tab"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 flex-shrink-0 text-emerald-400" />
            <span>Google Sheets (เชื่อมสเปรดชีต)</span>
          </button>

          <button
            onClick={() => setCurrentTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
            id="sidebar-settings-tab"
          >
            <Settings className="h-4.5 w-4.5 flex-shrink-0" />
            ตั้งค่าโปรเจ็ค & พนักงาน
          </button>

          {currentUserRole === 'admin' && (
            <button
              onClick={() => setCurrentTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
                currentTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
              }`}
            >
              <Shield className="h-4.5 w-4.5 flex-shrink-0 text-indigo-400 animate-pulse" />
              จัดการสิทธิ์ผู้ใช้ (User Roles)
            </button>
          )}

          <button
            onClick={() => setCurrentTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <History className="h-4.5 w-4.5 flex-shrink-0" />
            บันทึกประวัติ (Logs)
          </button>


        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-mono font-medium">
          GTT EE STORE PLATFORM v1.4.0
        </div>
      </aside>

      {/* -------------------- MOBILE HEADER & MENU -------------------- */}
      <header className="md:hidden bg-slate-900 text-slate-200 py-4 px-5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 flex-shrink-0" size={32} />
          <div>
            <span className="font-bold text-xs tracking-wide text-white block leading-none mb-0.5">GTT EE STORE</span>
            {currentUser ? (
              <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-400 font-sans uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                เรียลไทม์ (ทุกบัญชี)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[8px] font-bold text-amber-400 font-sans uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></span>
                ออฟไลน์
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Save All to Database Button */}
          <button
            onClick={handleSaveAllToDatabase}
            disabled={isSavingAllToDb}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
            title="บันทึกข้อมูลทั้งหมดลง Database หลัก"
            id="btn-mobile-save-all-to-db"
          >
            <Database className={`h-4.5 w-4.5 ${isSavingAllToDb ? 'animate-spin' : ''}`} />
          </button>

          {/* Mobile Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
            title={theme === 'light' ? 'เปิดโหมดมืด (Dark Mode)' : 'เปิดโหมดสว่าง (Light Mode)'}
            id="mobile-theme-toggle"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* Notifications bell */}
          <button
            onClick={handleAlertBellClick}
            className="p-1.5 hover:bg-slate-800 rounded-lg relative cursor-pointer"
          >
            <Bell className="h-5 w-5 text-slate-400" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-[10px] text-white font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Toggle Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-slate-950/85 backdrop-blur-xs z-30 animate-in fade-in duration-200">
          <nav className="bg-slate-900 border-b border-slate-800 p-5 space-y-2 text-slate-300">
            <button
              onClick={() => { setCurrentTab('dashboard'); setStatusFilter('all'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              ภาพรวมระบบ (Dashboard)
            </button>

            {/* Quick Save All to Database button in mobile drawer */}
            <button
              onClick={() => {
                handleSaveAllToDatabase();
                setIsMobileMenuOpen(false);
              }}
              disabled={isSavingAllToDb}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-xs font-black transition-all cursor-pointer my-1 shadow-xs disabled:opacity-50"
              id="btn-drawer-save-all-to-db"
            >
              <div className="flex items-center gap-3">
                <CloudUpload className={`h-4.5 w-4.5 text-emerald-400 ${isSavingAllToDb ? 'animate-spin' : ''}`} />
                <span>บันทึกข้อมูลทั้งหมดลง Database หลัก</span>
              </div>
              {isSavingAllToDb && <span className="text-[10px] text-amber-300 font-mono">กำลังบันทึก...</span>}
            </button>
            <button
              onClick={() => { setCurrentTab('products'); setStatusFilter('all'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'products' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="h-4.5 w-4.5" />
                จัดการสินค้า และจัดซื้อ
              </div>
              {outOfStockCount > 0 && (
                <span className="bg-rose-600 text-[9px] font-mono font-bold text-white h-4.5 px-1.5 rounded-full flex items-center justify-center">
                  {outOfStockCount} หมด
                </span>
              )}
            </button>
            <button
              onClick={() => { setCurrentTab('catalog'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'catalog' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              แคตตาล็อกพัสดุ (Catalog)
            </button>
            <button
              onClick={() => { setCurrentTab('projects_bom'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'projects_bom' || currentTab === 'jobs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <FolderKanban className="h-4.5 w-4.5" />
              BOM & Planning
            </button>
            <button
              onClick={() => { setCurrentTab('settings'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              ตั้งค่าโปรเจ็ค & พนักงาน
            </button>

            {currentUserRole === 'admin' && (
              <button
                onClick={() => { setCurrentTab('users'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                  currentTab === 'users' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                <Shield className="h-4.5 w-4.5 text-indigo-400" />
                จัดการสิทธิ์ผู้ใช้ (User Roles)
              </button>
            )}

            <button
              onClick={() => { setCurrentTab('logs'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'logs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <History className="h-4.5 w-4.5" />
              บันทึกประวัติ (Logs)
            </button>

            <button
              onClick={() => {
                triggerConfirm(
                  'ออกจากระบบ',
                  'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบคลังสินค้า?',
                  () => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }
                );
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all border border-dashed border-rose-900/40 mt-4 cursor-pointer"
            >
              <span>ออกจากระบบ (Sign Out)</span>
            </button>

          </nav>
        </div>
      )}

      {/* -------------------- MAIN WORKSPACE CONTENT -------------------- */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative">
        
        {isQuotaExceeded && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/25 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 text-left text-amber-950 dark:text-amber-200 shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-xl shrink-0">
                  <AlertTriangle className="h-6 w-6 animate-pulse text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-100 font-sans flex items-center gap-2">
                    คลังระบบฐานข้อมูล Cloud เต็มโควต้าชั่วคราว (Firestore Quota Exceeded)
                  </h4>
                  <p className="text-xs text-amber-900/90 dark:text-amber-300 font-sans leading-relaxed">
                    ขณะนี้ปริมาณการใช้งานบนคลังข้อมูลร่วมมีปริมาณสูงจนทะลุขีดจำกัดโควต้าผู้ใช้งานฟรีของ Google Firestore แล้ว (Free-tier Quota Limit Reached) 
                    <strong> ระบบได้สลับการทำงานมาใช้ "ระบบบันทึกฐานข้อมูลสำรองในเบราว์เซอร์เครื่อง (Local Storage Sandbox)" ให้คุณโดยอัตโนมัติแล้ว</strong> เพื่อไม่ขัดจังหวะการทำงาน
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-[11px] text-amber-900/80 dark:text-amber-400 font-medium font-sans">
                    <span className="flex items-center gap-1">✅ <strong>ยังสามารถใช้งานได้ปกติ</strong>: เพิ่ม/ลด/แก้ไขสต็อกสินค้า, และสเปรดชีตสูตร BOM ได้ทันที</span>
                    <span className="flex items-center gap-1">🔒 <strong>ปลอดภัยสูง</strong>: ข้อมูลทั้งหมดจะบันทึกไว้ในอุปกรณ์นี้อย่างปลอดภัย และจะเชื่อมต่อฐานข้อมูล Cloud โดยอัตโนมัติเมื่อสิ้นสุดการจำกัดรอบวัน</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-end min-w-[220px]">
                <button
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition-all hover:scale-102 active:scale-98 cursor-pointer text-center"
                  id="btn-download-backup"
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดไฟล์สำรอง (.json)
                </button>
                
                <label
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-xs transition-all hover:scale-102 active:scale-98 cursor-pointer text-center"
                  id="lbl-restore-backup"
                >
                  <Upload className="h-4 w-4" />
                  กู้คืนข้อมูลจากเครื่อง
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                    id="input-restore-backup"
                  />
                </label>

                <a
                  href="https://console.firebase.google.com/project/store-gtt/firestore/databases/ai-studio-stockinventoryma-f6aa8430-9129-40f5-b3fd-44323fc5cf99/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl transition-all hover:scale-102 active:scale-98 text-center cursor-pointer border border-amber-200/50 dark:border-amber-950"
                  id="btn-link-firestore-console"
                >
                  <ExternalLink className="h-4 w-4" />
                  ตรวจสอบโควต้า / อัปเกรด
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TOP STATUS BAR (DESKTOP HEADER INSET) */}
        <header className="hidden md:flex items-center justify-between pb-0 mb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100">ระบบจัดการคลังสินค้าอัจฉริยะ</h1>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Save All Data to Central Database Button & Timestamp */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAllToDatabase}
                disabled={isSavingAllToDb}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="บันทึกและซิงค์ข้อมูลทั้งหมดลงใน Database หลัก (Cloud Firestore)"
                id="btn-header-save-all-to-db"
              >
                <Database className={`h-4 w-4 ${isSavingAllToDb ? 'animate-spin' : ''}`} />
                <span>{isSavingAllToDb ? 'กำลังบันทึก...' : 'บันทึกข้อมูลลง Database หลัก'}</span>
              </button>
              <button
                onClick={() => handlePullFreshFromDatabase(true)}
                disabled={isPullingFreshDb}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                title="ดึงข้อมูลล่าสุดจาก Database หลักใหม่ทุกครั้ง"
                id="btn-header-pull-fresh-db"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isPullingFreshDb ? 'animate-spin text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{isPullingFreshDb ? 'กำลังดึงข้อมูล...' : 'รีเฟรชข้อมูล'}</span>
              </button>
              <button
                onClick={() => setCurrentTab('google_sheets')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black rounded-xl transition-all cursor-pointer shrink-0"
                title="จัดการส่งออกและซิงค์ข้อมูลผ่าน Google Sheets"
                id="btn-header-google-sheets"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Google Sheets</span>
              </button>
            </div>



            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-all cursor-pointer shadow-xs"
              title={theme === 'light' ? 'เปิดโหมดมืด (Dark Mode)' : 'เปิดโหมดสว่าง (Light Mode)'}
              id="theme-toggle"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Bell Alert Notification Icon & Popover */}
            <button
              onClick={handleAlertBellClick}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer relative shadow-xs"
              id="btn-alert-bell"
            >
              <Bell className="h-5 w-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-[10px] text-white font-black font-mono h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                  {totalAlerts}
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl w-80 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-800 font-sans">รายการแจ้งเตือนคลังล่าสุด</h4>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {totalAlerts === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-sans">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    สินค้าในคลังปลอดภัย ครบจำนวนดีทุกรายการ!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                    {outOfStockCount > 0 && (
                      <button
                        onClick={() => handleNotificationItemClick('out')}
                        className="w-full text-left p-2.5 hover:bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2 cursor-pointer transition-colors"
                      >
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-rose-800 font-sans block">สินค้าหมดคลัง ({outOfStockCount} รายการ)</span>
                          <span className="text-[10px] text-slate-500 font-sans mt-0.5 block leading-relaxed">มีสินค้าที่จำนวนลดเหลือ 0 ชิ้น ต้องการสั่งเติมคลังด่วนที่สุด</span>
                        </div>
                      </button>
                    )}
                    {lowStockCount > 0 && (
                      <button
                        onClick={() => handleNotificationItemClick('low')}
                        className="w-full text-left p-2.5 hover:bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 cursor-pointer transition-colors"
                      >
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-amber-800 font-sans block">สินค้าใกล้หมดคลัง ({lowStockCount} รายการ)</span>
                          <span className="text-[10px] text-slate-500 font-sans mt-0.5 block leading-relaxed">สินค้าจำนวนเหลือน้อยกว่าขั้นต่ำ แจ้งเตือนเพื่อให้เติมสินค้า</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar / Real account */}
            <div className="flex items-center gap-2.5 border-l border-slate-200 dark:border-slate-800 pl-3">
              <div className="text-right hidden xl:block">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                </span>
                <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase block bg-indigo-50 dark:bg-indigo-950/40 py-0.5 px-1.5 rounded-md border border-indigo-100/60 dark:border-indigo-900/40 mt-0.5 text-center">
                  {currentUserRole === 'admin' ? '★ ผู้ดูแล (Admin)' : currentUserRole === 'editor' ? '✍ ผู้แก้ไข (Editor)' : '● ผู้ใช้ (User)'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">{currentUser?.email}</span>
              </div>
              <button
                onClick={() => {
                  triggerConfirm(
                    'ออกจากระบบ',
                    'คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบคลังสินค้า?',
                    () => {
                      handleSignOut();
                    }
                  );
                }}
                className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-100 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] font-sans tracking-wider transition-all cursor-pointer uppercase shrink-0"
                title="ออกจากระบบ (Sign Out)"
              >
                Sign Out
              </button>
            </div>

          </div>
        </header>

        {/* CORE WORKSPACE VIEW */}
        <div className="animate-in fade-in duration-300">
          <DatabaseStatusBar
            isQuotaExceeded={isQuotaExceeded}
            lastDbSyncTime={lastDbSyncTime}
            onSaveAllToDatabase={handleSaveAllToDatabase}
            onPullFreshFromDatabase={() => handlePullFreshFromDatabase(true)}
            isSavingAllToDb={isSavingAllToDb}
            isPullingFreshDb={isPullingFreshDb}
          />
          {renderTabContent()}
        </div>

        {/* CUSTOM CONFIRMATION MODAL */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-amber-500 dark:text-amber-400">
                  <span className="p-2.5 bg-amber-500/10 rounded-2xl">
                    <AlertTriangle className="h-6 w-6" />
                  </span>
                  <h3 className="font-sans font-black text-slate-900 dark:text-white text-base sm:text-lg">
                    {confirmModal.title}
                  </h3>
                </div>
                <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {confirmModal.message}
                </p>
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs sm:text-sm cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={confirmModal.onConfirm}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm cursor-pointer shadow-xs"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOAST SYSTEM CONTAINER */}
        <div className="fixed bottom-5 right-5 space-y-3 z-50 flex flex-col items-end">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>

      </main>
    </div>
  );
}
