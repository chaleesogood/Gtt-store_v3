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
import { Settings, LayoutDashboard, Package, Layers, History, Play, Bell, Menu, X, CheckCircle, AlertTriangle, FolderKanban, ShoppingCart, BarChart3, Briefcase, ClipboardList, Sun, Moon, BookOpen, ExternalLink, Download, Upload, Shield, Sparkles } from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { db, cleanUndefined, auth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from './firebase';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const recentlyDeletedCategories = useRef<Set<string>>(new Set());
  const [activities, setActivities] = useState<StockActivity[]>([]);
  const [boms, setBoms] = useState<Bom[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobProjects, setJobProjects] = useState<JobProject[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);


  // Real Firebase Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user'>('user');
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  // Login / Register inputs
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [registerDisplayNameInput, setRegisterDisplayNameInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isDemoBypass, setIsDemoBypass] = useState(false);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [showPopupBlockedHelp, setShowPopupBlockedHelp] = useState(false);

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
        setCurrentUser(user);
        
        // Fetch/Listen to this user's specific role in 'user_roles'
        const userRoleRef = doc(db, 'user_roles', user.uid);
        unsubscribeRole = onSnapshot(userRoleRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserRole;
            setCurrentUserRole(data.role);
          } else {
            // Document doesn't exist, let's create a default role record!
            const isDefaultAdmin = user.email === 'chaleesogood@gmail.com';
            const defaultRole: 'admin' | 'user' = isDefaultAdmin ? 'admin' : 'user';
            
            const newRoleRecord: UserRole = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
              role: defaultRole,
              createdAt: new Date().toISOString()
            };
            
            try {
              await setDoc(userRoleRef, cleanUndefined(newRoleRecord));
              setCurrentUserRole(defaultRole);
            } catch (err) {
              console.error("Error creating user role record:", err);
              setCurrentUserRole(defaultRole);
            }
          }
          setAuthLoading(false);
        }, (error) => {
          console.error("Error listening to user role:", error);
          setCurrentUserRole(user.email === 'chaleesogood@gmail.com' ? 'admin' : 'user');
          setAuthLoading(false);
        });
      } else {
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

  // Fetch user_roles list for Admin screen
  useEffect(() => {
    if (currentUser && currentUserRole === 'admin') {
      const q = query(collection(db, 'user_roles'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: UserRole[] = [];
        snapshot.forEach((document) => {
          list.push(document.data() as UserRole);
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

  // Sync products from Firestore (no seeding)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Product);
      });
      if (list.length === 0) {
        setProducts([]);
        localStorage.setItem('stock_manager_products', JSON.stringify([]));
      } else {
        const sorted = sortProducts(list);
        setProducts(sorted);
        localStorage.setItem('stock_manager_products', JSON.stringify(sorted));
      }
    }, (error) => {
      handleFirestoreError("Firestore products sync error", error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อคลังสินค้า (Firestore)', `สลับไปใช้คลังสำรองในเบราว์เซอร์: ${error.message}`);
      const saved = localStorage.getItem('stock_manager_products');
      setProducts(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync categories from Firestore (no seeding)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Category);
      });
      if (list.length === 0) {
        setCategories([]);
        localStorage.setItem('stock_manager_categories', JSON.stringify([]));
      } else {
        setCategories(list);
        localStorage.setItem('stock_manager_categories', JSON.stringify(list));
      }
    }, (error) => {
      handleFirestoreError("Firestore categories sync error", error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อคลังกลุ่มสินค้า (Firestore)', `สลับไปใช้คลังกลุ่มสำรองในเบราว์เซอร์: ${error.message}`);
      const saved = localStorage.getItem('stock_manager_categories');
      setCategories(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Auto-seed database if empty on login/boot
  useEffect(() => {
    if (!currentUser) return;
    const checkAndSeed = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        if (querySnapshot.empty) {
          console.log("No products found in Firestore. Auto-seeding initial data...");
          // Seed categories
          for (const cat of INITIAL_CATEGORIES) {
            await setDoc(doc(db, 'categories', cat.id), cleanUndefined(cat));
          }
          // Seed products
          for (const prod of INITIAL_PRODUCTS) {
            await setDoc(doc(db, 'products', prod.id), cleanUndefined(prod));
          }
          // Seed activities
          for (const act of INITIAL_ACTIVITIES) {
            await setDoc(doc(db, 'activities', act.id), cleanUndefined(act));
          }
        }
      } catch (err: any) {
        console.warn("Auto-seeding skipped or failed (perhaps offline or quota exceeded):", err);
        // If Firestore fails (e.g. quota exceeded) and local storage is empty, initialize with default values
        const localProducts = localStorage.getItem('stock_manager_products');
        if (!localProducts || JSON.parse(localProducts).length === 0) {
          setProducts(INITIAL_PRODUCTS);
          setCategories(INITIAL_CATEGORIES);
          setActivities(INITIAL_ACTIVITIES);
          localStorage.setItem('stock_manager_products', JSON.stringify(INITIAL_PRODUCTS));
          localStorage.setItem('stock_manager_categories', JSON.stringify(INITIAL_CATEGORIES));
          localStorage.setItem('stock_manager_activities', JSON.stringify(INITIAL_ACTIVITIES));
        }
      }
    };
    checkAndSeed();
  }, [currentUser]);

  // Manual database seeding function to restore saved/initial demo items
  const handleSeedDatabase = async () => {
    try {
      console.log("Seeding default database items...");
      // Seed categories
      for (const cat of INITIAL_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), cleanUndefined(cat));
      }
      // Seed products
      for (const prod of INITIAL_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), cleanUndefined(prod));
      }
      // Seed activities
      for (const act of INITIAL_ACTIVITIES) {
        await setDoc(doc(db, 'activities', act.id), cleanUndefined(act));
      }
      addToast('success', 'กู้คืนข้อมูลเริ่มต้นสำเร็จ', 'นำรายการสินค้า หมวดหมู่ และประวัติการทำรายการตัวอย่างเริ่มต้นกลับมาเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error("Error seeding database:", err);
      // Fallback to local storage if Firestore has error/quota limits
      setProducts(INITIAL_PRODUCTS);
      setCategories(INITIAL_CATEGORIES);
      setActivities(INITIAL_ACTIVITIES);
      localStorage.setItem('stock_manager_products', JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem('stock_manager_categories', JSON.stringify(INITIAL_CATEGORIES));
      localStorage.setItem('stock_manager_activities', JSON.stringify(INITIAL_ACTIVITIES));
      addToast('warning', 'กู้คืนข้อมูลเริ่มต้นลงในเครื่องสำเร็จ', 'เนื่องจากระบบคลาวด์ขัดข้อง ระบบได้บันทึกข้อมูลตัวอย่างให้ใช้งานในเครื่องเรียบร้อยแล้ว');
    }
  };

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

  // Sync activities from Firestore (no seeding)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StockActivity[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as StockActivity);
      });
      if (list.length === 0) {
        setActivities([]);
        localStorage.setItem('stock_manager_activities', JSON.stringify([]));
      } else {
        setActivities(list);
        localStorage.setItem('stock_manager_activities', JSON.stringify(list));
      }
    }, (error) => {
      handleFirestoreError("Firestore activities sync error", error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อประวัติการทำงาน (Firestore)', `สลับไปใช้ประวัติสำรองในเบราว์เซอร์: ${error.message}`);
      const saved = localStorage.getItem('stock_manager_activities');
      setActivities(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync boms from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'boms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Bom[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Bom);
      });
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setBoms(list);
      localStorage.setItem('stock_manager_boms', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore boms sync error", error);
      const saved = localStorage.getItem('stock_manager_boms');
      setBoms(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync projects from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Project[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Project);
      });
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setProjects(list);
      localStorage.setItem('stock_manager_projects_list', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore projects sync error", error);
      const saved = localStorage.getItem('stock_manager_projects_list');
      setProjects(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync jobs from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'jobs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Job[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Job);
      });
      list.sort((a, b) => b.jobNo.localeCompare(a.jobNo));
      setJobs(list);
      localStorage.setItem('stock_manager_jobs_list', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore jobs sync error", error);
      const saved = localStorage.getItem('stock_manager_jobs_list');
      setJobs(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync employees from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Employee[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Employee);
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
      setEmployees(list);
      localStorage.setItem('stock_manager_employees_list', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore employees sync error", error);
      const saved = localStorage.getItem('stock_manager_employees_list');
      setEmployees(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync brands from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'brands'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Brand[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as Brand);
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'th'));
      setBrands(list);
      localStorage.setItem('stock_manager_brands_list', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore brands sync error", error);
      const saved = localStorage.getItem('stock_manager_brands_list');
      setBrands(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync job projects from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'jobProjects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: JobProject[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as JobProject);
      });
      list.sort((a, b) => b.jobNo.localeCompare(a.jobNo));
      setJobProjects(list);
      localStorage.setItem('stock_manager_job_projects_list', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore jobProjects sync error", error);
      const saved = localStorage.getItem('stock_manager_job_projects_list');
      setJobProjects(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync daily reports from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'dailyReports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DailyReport[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as DailyReport);
      });
      list.sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending
      setDailyReports(list);
      localStorage.setItem('stock_manager_daily_reports_list', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError("Firestore dailyReports sync error", error);
      const saved = localStorage.getItem('stock_manager_daily_reports_list');
      setDailyReports(saved ? JSON.parse(saved) : []);
    });
    return () => unsubscribe();
  }, [currentUser]);



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
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);
        
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

        let restoredCount = 0;
        keys.forEach(key => {
          if (backupData[key]) {
            localStorage.setItem(key, JSON.stringify(backupData[key]));
            restoredCount++;
          }
        });

        if (restoredCount === 0) {
          throw new Error('ไม่พบข้อมูลสำรองที่ถูกต้องในไฟล์นี้');
        }

        // Reload data to local states
        const prodVal = localStorage.getItem('stock_manager_products');
        if (prodVal) setProducts(JSON.parse(prodVal));

        const catVal = localStorage.getItem('stock_manager_categories');
        if (catVal) setCategories(JSON.parse(catVal));

        const actVal = localStorage.getItem('stock_manager_activities');
        if (actVal) setActivities(JSON.parse(actVal));

        const bomVal = localStorage.getItem('stock_manager_boms');
        if (bomVal) setBoms(JSON.parse(bomVal));

        const projVal = localStorage.getItem('stock_manager_projects_list');
        if (projVal) setProjects(JSON.parse(projVal));

        const jobsVal = localStorage.getItem('stock_manager_jobs_list');
        if (jobsVal) setJobs(JSON.parse(jobsVal));

        const empVal = localStorage.getItem('stock_manager_employees_list');
        if (empVal) setEmployees(JSON.parse(empVal));

        const brandVal = localStorage.getItem('stock_manager_brands_list');
        if (brandVal) setBrands(JSON.parse(brandVal));

        const jpVal = localStorage.getItem('stock_manager_job_projects_list');
        if (jpVal) setJobProjects(JSON.parse(jpVal));

        const drVal = localStorage.getItem('stock_manager_daily_reports_list');
        if (drVal) setDailyReports(JSON.parse(drVal));

        addToast('success', 'กู้คืนข้อมูลสำเร็จ', 'กู้คืนข้อมูลพัสดุและสต็อกทั้งหมดเข้าสู่เครื่องเรียบร้อยแล้ว');
      } catch (err: any) {
        console.error(err);
        addToast('warning', 'กู้คืนข้อมูลล้มเหลว', `ไฟล์ไม่ถูกต้องหรือเกิดข้อผิดพลาด: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${productToDelete.name}" ออกจากระบบถาวร?`)) {
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

  const handleAddCategory = async (newCat: Omit<Category, 'id'>) => {
    const category: Category = {
      ...newCat,
      id: `cat-${Math.random().toString(36).substring(2, 9)}`,
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

    try {
      await setDoc(doc(db, 'jobProjects', proj.id), cleanUndefined(proj));
      addToast('success', 'เพิ่มโปรเจกต์สำเร็จ', `หมายเลขงาน ${proj.jobNo} ของลูกค้า "${proj.customer}" ถูกบันทึกแล้ว`);
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
    if (confirm('คุณแน่ใจหรือไม่ที่ต้องการจะเคลียร์ประวัติการทำรายการในอดีตทั้งหมด? (ประวัติจะหายไปถาวร)')) {
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
            onSeedDatabase={handleSeedDatabase}
            onDownloadBackup={handleDownloadBackup}
            onRestoreBackup={handleRestoreBackup}
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
            currentUserEmail={currentUser ? currentUser.email : null}
            onUpdateUserRole={async (uid, role) => {
              await updateDoc(doc(db, 'user_roles', uid), { role });
            }}
            onDeleteUserRole={async (uid) => {
              await deleteDoc(doc(db, 'user_roles', uid));
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
    const provider = new GoogleAuthProvider();
    try {
      setIsOperationNotAllowed(false);
      setShowPopupBlockedHelp(false);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      addToast('success', 'เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับคุณ ${user.email} เข้าสู่ระบบควบคุมคลังสินค้า`);
    } catch (error: any) {
      console.error("Google login error:", error);
      const isPopupBlocked = error.code === 'auth/popup-blocked' || 
                             error.message?.toLowerCase().includes('popup-blocked') || 
                             error.message?.toLowerCase().includes('popup blocked') || 
                             error.message?.toLowerCase().includes('cancelled-popup-request');
      
      if (isPopupBlocked) {
        setShowPopupBlockedHelp(true);
        addToast('warning', 'ป๊อปอัปเข้าสู่ระบบถูกบล็อก', 'เบราว์เซอร์หรือกรอบพรีวิวบล็อกป๊อปอัปเข้าสู่ระบบของ Google โปรดดูวิธีแก้ไขที่แสดงขึ้นมาใหม่ด้านล่าง');
      } else if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        addToast('error', 'ระบบยังไม่เปิดใช้', 'ผู้ให้บริการ Google Login ยังไม่ได้เปิดใช้ใน Firebase Console');
      } else if (error.code === 'auth/popup-closed-by-user') {
        addToast('warning', 'ยกเลิกการล็อกอิน', 'คุณได้ยกเลิกหรือปิดหน้าต่างป๊อปอัปเข้าสู่ระบบ Google');
      } else {
        addToast('error', 'ข้อผิดพลาดการเข้าสู่ระบบ', `ไม่สามารถเข้าสู่ระบบด้วย Google: ${error.message}`);
      }
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
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Update display name
        const displayName = registerDisplayNameInput.trim() || email.split('@')[0];
        await updateProfile(user, { displayName });
        
        // Save user role record
        const userRoleRef = doc(db, 'user_roles', user.uid);
        const isDefaultAdmin = email === 'chaleesogood@gmail.com';
        const defaultRole: 'admin' | 'user' = isDefaultAdmin ? 'admin' : 'user';
        
        const newRoleRecord: UserRole = {
          uid: user.uid,
          email,
          displayName,
          role: defaultRole,
          createdAt: new Date().toISOString()
        };
        
        await setDoc(userRoleRef, cleanUndefined(newRoleRecord));
        addToast('success', 'สมัครสมาชิกสำเร็จ', `สร้างบัญชีและเข้าสู่ระบบเรียบร้อยแล้ว: ${email}`);
      } else {
        // Login
        const result = await signInWithEmailAndPassword(auth, email, password);
        addToast('success', 'เข้าสู่ระบบสำเร็จ', `เข้าสู่ระบบสำเร็จในชื่อบัญชี ${result.user.email}`);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
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

  const handleSignOut = async () => {
    try {
      setIsDemoBypass(false);
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
                  value={registerDisplayNameInput}
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
                value={loginEmailInput}
                onChange={(e) => setLoginEmailInput(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-sans text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 font-sans block">รหัสผ่าน / Password (ขั้นต่ำ 6 ตัว)</label>
              <input
                type="password"
                required
                value={loginPasswordInput}
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

          {/* OR divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-x-0 border-t border-slate-800"></div>
            <span className="relative px-3 bg-slate-900 text-[10px] font-black text-slate-500 tracking-wider font-sans">หรือเข้าใช้ผ่านช่องทาง</span>
          </div>

          {/* Google login option */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold rounded-xl text-xs font-sans tracking-wide transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.463 0-6.27-2.808-6.27-6.27s2.807-6.27 6.27-6.27c1.633 0 3.124.628 4.254 1.652l3.125-3.124C19.294 2.723 15.984 1.5 12.24 1.5c-5.799 0-10.5 4.701-10.5 10.5s4.701 10.5 10.5 10.5c5.342 0 10.026-3.834 10.026-10.5 0-.585-.054-1.15-.152-1.715H12.24Z" />
            </svg>
            <span>เข้าใช้ด้วยบัญชี Google (Gmail)</span>
          </button>

          {/* Demo Bypass Option */}
          <div className="border-t border-slate-800/80 my-2"></div>
          <button
            onClick={() => {
              setIsDemoBypass(true);
              setCurrentUser({
                uid: 'demo-admin-uid',
                email: 'chaleesogood@gmail.com',
                displayName: 'ผู้ใช้ทดลอง (Demo Admin)',
                isDemo: true
              });
              setCurrentUserRole('admin');
              addToast('success', 'เข้าสู่ระบบโหมดทดสอบแล้ว', 'เข้าใช้งานระบบด้วยสิทธิ์ผู้ดูแลระบบ (Demo Bypass Mode) เรียบร้อยแล้ว');
            }}
            type="button"
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700/80 hover:border-slate-600 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs font-sans tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <span>เข้าใช้ด้วยโหมดทดสอบระบบ (Demo Bypass Mode)</span>
          </button>

          <p className="text-[10px] text-slate-500 text-center font-mono leading-relaxed">
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
              currentTab === 'projects_bom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <FolderKanban className="h-4.5 w-4.5 flex-shrink-0" />
            แผนประกอบวัตถุดิบ (BOM)
          </button>

          <button
            onClick={() => setCurrentTab('jobs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
              currentTab === 'jobs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400'
            }`}
          >
            <Briefcase className="h-4.5 w-4.5 flex-shrink-0" />
            จ่ายงาน & รายงานประจำวัน
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
          <span className="font-bold text-sm tracking-wide text-white">GTT EE STORE</span>
        </div>

        <div className="flex items-center gap-3">
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
                currentTab === 'projects_bom' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <FolderKanban className="h-4.5 w-4.5" />
              แผนประกอบวัตถุดิบ (BOM)
            </button>
            <button
              onClick={() => { setCurrentTab('jobs'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                currentTab === 'jobs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <Briefcase className="h-4.5 w-4.5" />
              จ่ายงาน & รายงานประจำวัน
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
                if (confirm('คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบคลังสินค้า?')) {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }
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
        <header className="hidden md:flex items-center justify-between pb-6 mb-4 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100">ระบบจัดการคลังสินค้าอัจฉริยะ</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">คลังข้อมูลระบบบริหารสต็อกสินค้าแบบเรียลไทม์</p>
          </div>

          <div className="flex items-center gap-3 relative">
            
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
                  {currentUserRole === 'admin' ? '★ ผู้ดูแล (Admin)' : '● ผู้ใช้ (User)'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">{currentUser?.email}</span>
              </div>
              <button
                onClick={() => {
                  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบคลังสินค้า?')) {
                    handleSignOut();
                  }
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
          {renderTabContent()}
        </div>

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
