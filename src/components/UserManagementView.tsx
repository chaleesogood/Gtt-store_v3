import React, { useState, useMemo } from 'react';
import { UserRole, Employee } from '../types';
import { auth } from '../firebase';
import { 
  Users, 
  Shield, 
  ShieldAlert, 
  UserCheck, 
  Trash2, 
  Search, 
  Mail, 
  Crown,
  Lock,
  Clock,
  Sparkles,
  Pencil,
  UserPlus,
  Plus,
  X,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  Radio,
  Activity,
  Copy,
  Fingerprint,
  Hash,
  Download,
  RefreshCw
} from 'lucide-react';

interface UserManagementViewProps {
  userRoles: UserRole[];
  employees?: Employee[];
  currentUserEmail: string | null;
  onUpdateUserRole: (uid: string, role: 'admin' | 'editor' | 'user') => Promise<void>;
  onUpdateUser: (uid: string, updatedData: { email: string; displayName: string; role: 'admin' | 'editor' | 'user'; status?: 'active' | 'pending' | 'disabled' }) => Promise<void>;
  onAddUserRole: (userData: { email: string; displayName: string; role: 'admin' | 'editor' | 'user'; status?: 'active' | 'pending' | 'disabled'; uid?: string }) => Promise<void>;
  onDeleteUserRole: (uid: string) => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  triggerConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function UserManagementView({
  userRoles,
  employees = [],
  currentUserEmail,
  onUpdateUserRole,
  onUpdateUser,
  onAddUserRole,
  onDeleteUserRole,
  addToast,
  triggerConfirm
}: UserManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'google' | 'pending' | 'disabled' | 'active'>('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);

  // Form states for Add
  const [addUid, setAddUid] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'editor' | 'user'>('user');
  const [addStatus, setAddStatus] = useState<'active' | 'pending' | 'disabled'>('active');

  // Form states for Edit
  const [editEmail, setEditEmail] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'editor' | 'user'>('user');
  const [editStatus, setEditStatus] = useState<'active' | 'pending' | 'disabled'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to check if user is online
  const isUserOnline = (user: UserRole) => {
    if (currentUserEmail && user.email?.toLowerCase() === currentUserEmail.toLowerCase()) {
      return true;
    }
    if (user.isOnline === true) {
      return true;
    }
    if (user.lastSeen) {
      const lastSeenTime = new Date(user.lastSeen).getTime();
      if (!isNaN(lastSeenTime) && Date.now() - lastSeenTime < 5 * 60 * 1000) {
        return true;
      }
    }
    return false;
  };

  // Helper to format last active time
  const formatLastSeen = (user: UserRole) => {
    if (isUserOnline(user)) {
      return 'กำลังออนไลน์';
    }
    if (!user.lastSeen) {
      return 'ไม่ออนไลน์';
    }
    const date = new Date(user.lastSeen);
    if (isNaN(date.getTime())) return 'ไม่ออนไลน์';

    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'เมื่อสักครู่นี้';
    if (diffMins < 60) return `เมื่อ ${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `เมื่อ ${diffHours} ชม.ที่แล้ว`;
    if (diffDays < 7) return `เมื่อ ${diffDays} วันที่แล้ว`;

    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const onlineCount = useMemo(() => {
    return userRoles.filter(isUserOnline).length;
  }, [userRoles, currentUserEmail]);

  const offlineCount = useMemo(() => {
    return Math.max(0, userRoles.length - onlineCount);
  }, [userRoles, onlineCount]);

  const newMembersCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return userRoles.filter(u => u.createdAt && new Date(u.createdAt).getTime() >= sevenDaysAgo).length;
  }, [userRoles]);

  const googleUsersCount = useMemo(() => {
    return userRoles.filter(u => u.provider === 'google' || (u.email || '').toLowerCase().endsWith('@gmail.com')).length;
  }, [userRoles]);

  const pendingActivationCount = useMemo(() => {
    return userRoles.filter(u => u.status === 'pending').length;
  }, [userRoles]);

  const disabledCount = useMemo(() => {
    return userRoles.filter(u => u.status === 'disabled').length;
  }, [userRoles]);

  const duplicateEmailUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    userRoles.forEach(u => {
      const em = (u.email || '').trim().toLowerCase();
      if (em) counts[em] = (counts[em] || 0) + 1;
    });
    return userRoles.filter(u => {
      const em = (u.email || '').trim().toLowerCase();
      return em && counts[em] > 1;
    });
  }, [userRoles]);

  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'pending'>('users');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'user'>('all');

  // Filter users based on search, status filter, and role filter
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return userRoles.filter(user => {
      const emailMatch = (user.email || '').toLowerCase().includes(query);
      const nameMatch = (user.displayName || '').toLowerCase().includes(query);
      const roleMatch = (user.role || '').toLowerCase().includes(query);
      const providerMatch = (user.provider || '').toLowerCase().includes(query);
      const matchesSearch = emailMatch || nameMatch || roleMatch || providerMatch;

      if (!matchesSearch) return false;

      // Role Filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      const online = isUserOnline(user);

      if (statusFilter === 'online') return online;
      if (statusFilter === 'offline') return !online;
      if (statusFilter === 'google') return user.provider === 'google' || (user.email || '').toLowerCase().endsWith('@gmail.com');
      if (statusFilter === 'pending') return user.status === 'pending';
      if (statusFilter === 'disabled') return user.status === 'disabled';
      if (statusFilter === 'active') return user.status === 'active' || !user.status;

      return true;
    });
  }, [userRoles, searchQuery, statusFilter, roleFilter, currentUserEmail]);

  // Find employees with valid email who don't have a user role record yet
  const pendingEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => {
      if (!emp.email || !emp.email.trim()) return false;
      const empEmailNormalized = emp.email.trim().toLowerCase();
      const alreadyHasRole = userRoles.some(ur => (ur.email || '').toLowerCase() === empEmailNormalized);
      return !alreadyHasRole;
    });
  }, [employees, userRoles]);

  // Deep Scan simulation & action
  const handleDeepScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const onlineMsg = `ขณะนี้มีผู้ใช้งานกำลังออนไลน์อยู่ในระบบ ${onlineCount} ท่าน จากทั้งหมด ${userRoles.length} บัญชี`;
      if (pendingEmployees.length > 0) {
        addToast(
          'info',
          'สแกนระบบและตรวจสอบบัญชีสำเร็จ',
          `${onlineMsg} — ตรวจพบพนักงานใหม่ ${pendingEmployees.length} ท่านที่ยังไม่ได้เปิดสิทธิ์การใช้งาน`
        );
      } else {
        addToast(
          'success',
          'สแกนระบบและตรวจสอบบัญชีสำเร็จ',
          `${onlineMsg} — ไม่พบสมาชิกหรือพนักงานตกค้าง ทุกคนเปิดสิทธิ์ในระบบเรียบร้อยแล้ว!`
        );
      }
    }, 800);
  };

  // Handle Pull/Sync UID from Firebase Auth directly into the system
  const handlePullFirebaseUid = async () => {
    try {
      setIsScanning(true);
      const currentAuthUser = auth.currentUser;
      const activeUid = currentAuthUser?.uid || (window as any).currentUserUid;
      const activeEmail = currentAuthUser?.email || currentUserEmail || (window as any).currentUserEmail;
      
      if (!activeUid && !activeEmail) {
        addToast('warning', 'ไม่พบข้อมูล Firebase Authentication', 'โปรดตรวจสอบสถานะการล็อกอิน Firebase Authentication');
        return;
      }

      // Check if UID is already in system
      const existingUidRecord = userRoles.find(u => u.uid === activeUid);
      const existingEmailRecord = userRoles.find(u => (u.email || '').toLowerCase() === (activeEmail || '').toLowerCase());

      if (existingUidRecord) {
        addToast('info', 'เชื่อมโยง UID เรียบร้อยแล้ว', `บัญชี (${activeEmail}) มี UID: ${activeUid} บันทึกในระบบเรียบร้อยแล้ว`);
      } else if (existingEmailRecord) {
        // Upgrade pre-registered email doc to real Firebase Auth UID
        await onAddUserRole({
          uid: activeUid,
          email: activeEmail,
          displayName: currentAuthUser?.displayName || existingEmailRecord.displayName || activeEmail?.split('@')[0],
          role: existingEmailRecord.role,
          status: 'active'
        });
        addToast('success', 'ดึงและซิงค์ UID Firebase สำเร็จ!', `ดึงรหัส UID (${activeUid}) เข้าสู่ระบบ และอัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว`);
      } else {
        // Create new admin/user record with real Firebase Auth UID
        await onAddUserRole({
          uid: activeUid,
          email: activeEmail,
          displayName: currentAuthUser?.displayName || activeEmail?.split('@')[0] || 'User',
          role: 'admin',
          status: 'active'
        });
        addToast('success', 'ดึง UID Firebase ใหม่สำเร็จ!', `นำเข้ารหัส UID (${activeUid}) สำหรับ ${activeEmail} เข้าสู่ระบบเรียบร้อยแล้ว`);
      }
    } catch (err) {
      console.error("Error pulling Firebase UID:", err);
      addToast('error', 'ดึง UID ล้มเหลว', 'เกิดข้อผิดพลาดในการดึงข้อมูล UID จาก Firebase Authentication');
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-fill active Firebase Auth UID into Add User Modal
  const handlePullCurrentUidToAddModal = () => {
    const currentAuthUser = auth.currentUser;
    const activeUid = currentAuthUser?.uid || (window as any).currentUserUid;
    const activeEmail = currentAuthUser?.email || currentUserEmail || (window as any).currentUserEmail;
    
    if (activeUid) {
      setAddUid(activeUid);
      if (!addEmail && activeEmail) setAddEmail(activeEmail);
      if (!addDisplayName && (currentAuthUser?.displayName || activeEmail)) {
        setAddDisplayName(currentAuthUser?.displayName || activeEmail.split('@')[0]);
      }
      addToast('info', 'ดึง UID Firebase สำเร็จ', `นำใส่รหัส UID (${activeUid}) เรียบร้อยแล้ว`);
    } else {
      addToast('warning', 'ไม่พบ UID ในเซสชัน', 'ไม่พบข้อมูล Firebase UID ที่ล็อกอินในขณะนี้');
    }
  };

  // Handle Add User / Pre-register role
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'โปรดใส่อีเมลของผู้ใช้งาน');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addEmail.trim())) {
      addToast('warning', 'รูปแบบอีเมลไม่ถูกต้อง', 'โปรดตรวจสอบความถูกต้องของอีเมลอีกครั้ง');
      return;
    }

    // Check if email already exists
    const exists = userRoles.some(u => (u.email || '').toLowerCase() === addEmail.trim().toLowerCase());
    if (exists) {
      addToast('warning', 'อีเมลนี้มีในระบบแล้ว', 'บัญชีผู้ใช้หรืออีเมลนี้ได้รับการลงทะเบียนสิทธิ์เรียบร้อยแล้ว');
      return;
    }

    try {
      setIsSubmitting(true);
      const email = addEmail.trim();
      const displayName = addDisplayName.trim() || email.split('@')[0];
      
      await onAddUserRole({
        uid: addUid.trim() || undefined,
        email,
        displayName,
        role: addRole,
        status: addStatus
      });

      addToast('success', 'เพิ่มสิทธิ์ผู้ใช้สำเร็จ', `กำหนดสิทธิ์ล่วงหน้าให้ ${email} เป็นสิทธิ์ ${addRole === 'admin' ? 'Admin' : 'User'} เรียบร้อยแล้ว`);
      
      // Reset form & close
      setAddUid('');
      setAddEmail('');
      setAddDisplayName('');
      setAddRole('user');
      setIsAddModalOpen(false);
    } catch (err) {
      addToast('error', 'เพิ่มสิทธิ์ล้มเหลว', 'เกิดข้อผิดพลาดในการกำหนดสิทธิ์ผู้ใช้งาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Start Edit User
  const handleStartEdit = (user: UserRole) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditDisplayName(user.displayName || '');
    setEditRole(user.role);
    setEditStatus(user.status || 'active');
    setIsEditModalOpen(true);
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editEmail.trim()) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'โปรดระบุอีเมลผู้ใช้งาน');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      addToast('warning', 'รูปแบบอีเมลไม่ถูกต้อง', 'โปรดตรวจสอบความถูกต้องของอีเมลอีกครั้ง');
      return;
    }

    // Check if email already exists in OTHER users
    const exists = userRoles.some(u => u.uid !== editingUser.uid && (u.email || '').toLowerCase() === editEmail.trim().toLowerCase());
    if (exists) {
      addToast('warning', 'อีเมลนี้ถูกใช้งานแล้ว', 'มีอีเมลอื่นในระบบที่ใช้ที่อยู่อีเมลนี้อยู่แล้ว');
      return;
    }

    try {
      setIsSubmitting(true);
      const email = editEmail.trim();
      const displayName = editDisplayName.trim() || email.split('@')[0];
      
      await onUpdateUser(editingUser.uid, {
        email,
        displayName,
        role: editRole,
        status: editStatus
      });

      addToast('success', 'แก้ไขข้อมูลสำเร็จ', `อัปเดตข้อมูลบัญชีผู้ใช้งาน ${email} เรียบร้อยแล้ว`);
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      addToast('error', 'บันทึกล้มเหลว', 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้งาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Status Change (Activate / Disable)
  const handleStatusChange = async (user: UserRole, targetStatus: 'active' | 'pending' | 'disabled') => {
    const isSelf = user.email?.toLowerCase() === currentUserEmail?.toLowerCase();

    if (isSelf && targetStatus !== 'active') {
      addToast('warning', 'ไม่อนุญาต', 'ท่านไม่สามารถระงับสิทธิ์บัญชีของตนเองได้');
      return;
    }

    const statusLabel = 
      targetStatus === 'active' ? 'เปิดใช้งาน (Activated)' :
      targetStatus === 'disabled' ? 'ระงับใช้งาน (Disabled)' : 'รอการอนุมัติ (Pending)';

    try {
      setIsUpdating(user.uid);
      await onUpdateUser(user.uid, {
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: user.role,
        status: targetStatus
      });
      addToast('success', 'อัปเดตสถานะสำเร็จ', `เปลี่ยนสถานะบัญชีของ ${user.email} เป็น ${statusLabel} เรียบร้อยแล้ว`);
    } catch (err) {
      addToast('error', 'บันทึกล้มเหลว', 'เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้งาน');
    } finally {
      setIsUpdating(null);
    }
  };

  // Handle Role Toggle (Quick Action)
  const handleRoleToggle = async (user: UserRole) => {
    const isSelf = user.email?.toLowerCase() === currentUserEmail?.toLowerCase();

    const newRole: 'admin' | 'editor' | 'user' = 
      user.role === 'user' 
        ? 'editor' 
        : user.role === 'editor' 
          ? 'admin' 
          : 'user';

    const newRoleName = 
      newRole === 'admin' 
        ? 'ผู้ดูแลระบบ (Admin)' 
        : newRole === 'editor' 
          ? 'ผู้แก้ไขข้อมูล (Editor)' 
          : 'ผู้ใช้ทั่วไป (User)';

    let confirmMsg = `คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ของ "${user.email}" เป็น ${newRoleName}?`;
    if (isSelf) {
      confirmMsg = `คุณกำลังจะเปลี่ยนสิทธิ์ของตนเอง (${user.email}) เป็น ${newRoleName} แน่ใจหรือไม่?`;
    }
    
    const executeToggle = async () => {
      try {
        setIsUpdating(user.uid);
        await onUpdateUserRole(user.uid, newRole);
        addToast('success', 'อัปเดตสิทธิ์สำเร็จ', `เปลี่ยนสิทธิ์ของ ${user.email} เป็น ${newRoleName} เรียบร้อยแล้ว`);
      } catch (err) {
        addToast('error', 'อัปเดตล้มเหลว', 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์ผู้ใช้งาน');
      } finally {
        setIsUpdating(null);
      }
    };

    if (triggerConfirm) {
      triggerConfirm('ยืนยันการเปลี่ยนบทบาท', confirmMsg, executeToggle);
    } else if (confirm(confirmMsg)) {
      executeToggle();
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async (user: UserRole) => {
    const userEmailNormalized = (user.email || '').toLowerCase().trim();
    const sameEmailCount = userRoles.filter(u => (u.email || '').toLowerCase().trim() === userEmailNormalized && userEmailNormalized !== '').length;
    const isDuplicateEmail = sameEmailCount > 1;

    const isSelf = !!userEmailNormalized && !!currentUserEmail && userEmailNormalized === currentUserEmail.toLowerCase().trim();
    const isDev = userEmailNormalized === 'chaleesogood@gmail.com' || userEmailNormalized === 'chalee@gtt2013.com';

    if (isDev && isSelf && !isDuplicateEmail) {
      addToast('warning', 'ระงับการทำงาน', 'ไม่สามารถลบบัญชีผู้พัฒนาหลักระบบออกจากคลังได้');
      return;
    }

    if (isSelf && !isDuplicateEmail) {
      addToast('warning', 'ไม่อนุญาต', 'ท่านไม่สามารถลบบัญชีเดียวของตนเองได้');
      return;
    }

    const confirmMsg = isDuplicateEmail
      ? `ตรวจพบอีเมล "${user.email}" ซ้ำกันในระบบ (${sameEmailCount} บัญชี)\n\nคุณต้องการลบบัญชีซ้ำรายการนี้ (UID: ${user.uid}) ออกใช่หรือไม่?`
      : `คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิ์และบัญชีผู้ใช้งานของ "${user.email}" ออกจากคลัง?`;

    const executeDelete = async () => {
      try {
        setIsUpdating(user.uid);
        await onDeleteUserRole(user.uid);
        if (isDuplicateEmail) {
          addToast('success', 'ลบบัญชีอีเมลซ้ำสำเร็จ', `ลบรายการบัญชีที่ซ้ำของ ${user.email} (UID: ${user.uid}) เรียบร้อยแล้ว`);
        } else {
          addToast('success', 'ลบผู้ใช้งานสำเร็จ', `ลบข้อมูลบทบาทและสิทธิ์ของ ${user.email} เรียบร้อยแล้ว`);
        }
      } catch (err) {
        addToast('error', 'ลบล้มเหลว', 'เกิดข้อผิดพลาดในการลบข้อมูลบทบาทผู้ใช้งาน');
      } finally {
        setIsUpdating(null);
      }
    };

    if (triggerConfirm) {
      triggerConfirm(isDuplicateEmail ? 'ยืนยันการลบบัญชีอีเมลซ้ำ' : 'ยืนยันการลบสิทธิ์ผู้ใช้งาน', confirmMsg, executeDelete);
    } else if (confirm(confirmMsg)) {
      executeDelete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header section */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 border border-indigo-500/15 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-400/20">
                <Shield className="h-6 w-6 animate-pulse" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-sans tracking-wide">จัดการสิทธิ์ผู้ใช้งาน (User Roles)</h1>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm font-sans max-w-2xl leading-relaxed">
              ผู้ดูแลระบบสามารถกำหนดสิทธิ์และบทบาทของผู้ใช้งานแต่ละคนได้โดยตรง หรือสามารถกำหนดสิทธิ์ล่วงหน้าโดยใช้อีเมลเพื่อความสะดวกในการเข้าใช้งาน
              <br />
              <span className="text-indigo-300 font-semibold">★ สิทธิ์ Admin:</span> มีสิทธิ์จัดการทุกเมนู รวมถึงเพิ่ม แก้ไข สลับสิทธิ์ และลบข้อมูล
              <br />
              <span className="text-slate-400 font-semibold">★ สิทธิ์ User:</span> มีสิทธิ์เข้าใช้งาน ค้นหา และทำรายการเบิก/รับพัสดุได้ แต่ <span className="text-rose-400 font-bold">ไม่สามารถลบข้อมูลใดๆ</span> ออกจากฐานข้อมูลได้
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Crown className="h-4 w-4 shrink-0" />
              <span>บัญชีปัจจุบันของคุณ:</span>
            </div>
            <div className="text-slate-300">{currentUserEmail}</div>
            <div className="text-[10px] text-indigo-400 bg-indigo-50/10 py-1 px-2.5 rounded-lg border border-indigo-500/20 inline-block font-sans font-bold">
              สถานะ: ผู้ดูแลระบบสูงสุด (ADMIN)
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">บัญชีทั้งหมด</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {userRoles.length} <span className="text-xs font-normal text-slate-400">ราย</span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('google')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'google'
              ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              Google Account
            </span>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {googleUsersCount} <span className="text-xs font-normal text-blue-600/70 dark:text-blue-400/70">ราย</span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('online')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'online'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              ออนไลน์
            </span>
            <Wifi className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {onlineCount} <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-400/70">ราย</span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('offline')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'offline'
              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-400 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              ออฟไลน์
            </span>
            <WifiOff className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-300 mt-2">
            {offlineCount} <span className="text-xs font-normal text-slate-400">ราย</span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('new')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'new'
              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">สมาชิกใหม่</span>
            <UserPlus className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {newMembersCount} <span className="text-xs font-normal text-amber-600/70 dark:text-amber-400/70">ราย</span>
          </div>
        </button>
      </div>

      {/* Pending Employees Activation Area */}
      {pendingEmployees.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/5 rounded-3xl p-6 border border-amber-500/20 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg">
              <Sparkles className="h-5 w-5 animate-bounce" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base font-sans">
                ตรวจพบพนักงานใหม่ในระบบ ({pendingEmployees.length} ท่าน) ที่ยังไม่ได้กำหนดสิทธิ์เข้าใช้งาน
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                คุณสามารถกดมอบสิทธิ์แบบด่วน (Pre-register) ให้กับพนักงานเหล่านี้ได้ทันที เพื่อความสะดวกเมื่อพนักงานเข้าใช้งานระบบครั้งแรก
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingEmployees.map(emp => (
              <div 
                key={emp.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs sm:text-sm">
                    {emp.name} {emp.nickname ? `(${emp.nickname})` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                    {emp.email}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 py-0.5 px-2 rounded-md border border-indigo-100 dark:border-indigo-950 inline-block font-sans">
                    แผนก: {emp.department || 'ไม่ระบุ'}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      setIsUpdating(emp.id);
                      await onAddUserRole({
                        email: emp.email || '',
                        displayName: emp.name,
                        role: 'user'
                      });
                      addToast(
                        'success',
                        'กำหนดสิทธิ์พนักงานสำเร็จ',
                        `กำหนดสิทธิ์ล่วงหน้าให้พนักงาน "${emp.name}" (สิทธิ์ User) เรียบร้อยแล้ว`
                      );
                    } catch (err) {
                      addToast('error', 'ข้อผิดพลาด', 'ไม่สามารถกำหนดสิทธิ์ให้พนักงานท่านนี้ได้');
                    } finally {
                      setIsUpdating(null);
                    }
                  }}
                  disabled={isUpdating !== null}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isUpdating === emp.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  <span>เปิดสิทธิ์ User</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Email Alert Area */}
      {duplicateEmailUsers.length > 0 && (
        <div className="bg-rose-500/10 dark:bg-rose-500/5 rounded-3xl p-5 border border-rose-500/20 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <span className="p-1.5 bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base font-sans">
                ตรวจพบผู้ใช้งานที่ใช้อีเมลซ้ำกัน ({duplicateEmailUsers.length} รายการ)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                ระบบเปิดให้คุณสามารถกดปุ่มถังขยะ (Trash) เพื่อลบบัญชีซ้ำส่วนเกินออกได้ทันที
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main card panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4 text-indigo-500" />
              <span>รายชื่อผู้ใช้งาน & สิทธิ์ ({userRoles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>ตารางสิทธิ์การใช้งาน (Permissions Matrix)</span>
            </button>

            {pendingEmployees.length > 0 && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>พนักงานรอเปิดสิทธิ์ ({pendingEmployees.length})</span>
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-sans text-slate-400 px-3">
            <Lock className="h-3.5 w-3.5 text-indigo-500" />
            <span>ระบบความปลอดภัย Firestore Real-time Auto-Sync Enabled</span>
          </div>
        </div>

        {activeTab === 'users' && (
          <>
            {/* Toolbar & Search & Add Button */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อผู้ใช้ หรืออีเมล..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 font-sans font-bold flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>ผลการค้นหา: {filteredUsers.length} บัญชี</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={handlePullFirebaseUid}
                    disabled={isScanning}
                    className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200/80 dark:border-indigo-800 transition-all font-sans shadow-2xs"
                    title="ดึงข้อมูลรหัส UID จาก Firebase Authentication เข้าสู่ระบบ"
                  >
                    <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>ดึง UID จาก Firebase Auth</span>
                  </button>

                  <button
                    onClick={handleDeepScan}
                    disabled={isScanning}
                    className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-800 transition-all font-sans"
                    title="สแกนระบบและตรวจสอบบัญชีตกค้างทั้งหมด"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>กำลังสแกน...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span>ตรวจสอบระบบ (Scan System)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/15 transition-all font-sans"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>เพิ่มบัญชี / กำหนดสิทธิ์ล่วงหน้า</span>
                  </button>
                </div>
              </div>

              {/* Quick Filter Tabs & Role Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">สถานะ:</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      statusFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>ทั้งหมด ({userRoles.length})</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('online')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      statusFilter === 'online'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/30'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>ออนไลน์ ({onlineCount})</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('google')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      statusFilter === 'google'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/30'
                    }`}
                  >
                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    </svg>
                    <span>Google Sign-In ({googleUsersCount})</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      statusFilter === 'pending'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/30'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>รออนุมัติ ({pendingActivationCount})</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('disabled')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      statusFilter === 'disabled'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/30'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                    <span>ถูกระงับ ({disabledCount})</span>
                  </button>

                  <button
                    onClick={() => setStatusFilter('offline')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      statusFilter === 'offline'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                    <span>ออฟไลน์ ({offlineCount})</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">กรองบทบาท:</span>
                  <button
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      roleFilter === 'all'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    ทุกสิทธิ์
                  </button>
                  <button
                    onClick={() => setRoleFilter('admin')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roleFilter === 'admin'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                    }`}
                  >
                    <Crown className="h-3 w-3" />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => setRoleFilter('editor')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roleFilter === 'editor'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editor</span>
                  </button>
                  <button
                    onClick={() => setRoleFilter('user')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      roleFilter === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    <span>User</span>
                  </button>
                </div>
              </div>
            </div>

            {/* User Table / List */}
            <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-sans space-y-3">
              <UserCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-1 animate-bounce" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                ไม่พบข้อมูลรายชื่อผู้ใช้งาน{searchQuery ? ` ที่ตรงกับ "${searchQuery}"` : ''}
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery ? 'หากเป็นผู้ใช้งานใหม่ ท่านสามารถเพิ่มอีเมลเพื่อกำหนดสิทธิ์การใช้งานได้ทันที' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง'}
              </p>
              {searchQuery && searchQuery.trim().includes('@') && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAddEmail(searchQuery.trim());
                      setAddDisplayName(searchQuery.split('@')[0]);
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl cursor-pointer shadow-sm shadow-indigo-600/20 transition-all font-sans"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>เพิ่มอีเมล "{searchQuery.trim()}" เป็นผู้ใช้งานใหม่</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-sans text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800/80">
                  <th className="py-3 px-5">ผู้ใช้งาน (User)</th>
                  <th className="py-3 px-5">รหัส UID (UID Code)</th>
                  <th className="py-3 px-5">อีเมล (Email)</th>
                  <th className="py-3 px-5">บทบาท (Role)</th>
                  <th className="py-3 px-5">สถานะการยืนยัน (Activation)</th>
                  <th className="py-3 px-5">สถานะออนไลน์ (Online)</th>
                  <th className="py-3 px-5">ลงทะเบียนเมื่อ (Registered)</th>
                  <th className="py-3 px-5 text-right">ดำเนินการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredUsers.map((user) => {
                  const userEmail = (user.email || '').trim();
                  const sameEmailCount = userRoles.filter(u => (u.email || '').trim().toLowerCase() === userEmail.toLowerCase() && userEmail !== '').length;
                  const isDuplicateEmail = sameEmailCount > 1;
                  const isSelf = !!userEmail && !!currentUserEmail && userEmail.toLowerCase() === currentUserEmail.toLowerCase().trim();
                  const isDeveloper = userEmail.toLowerCase() === 'chaleesogood@gmail.com' || userEmail.toLowerCase() === 'chalee@gtt2013.com';
                  const isPreRegistered = (user.uid || '').startsWith('pre_');
                  const isGoogleUser = user.provider === 'google' || userEmail.toLowerCase().endsWith('@gmail.com');
                  const isNewUser = user.createdAt && !isNaN(new Date(user.createdAt).getTime()) && (Date.now() - new Date(user.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <tr 
                      key={user.uid} 
                      className={`hover:bg-slate-50/30 dark:hover:bg-slate-950/20 transition-colors ${
                        isSelf ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''
                      }`}
                    >
                      {/* Name / DisplayName */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName || userEmail} 
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-indigo-500/30"
                            />
                          ) : (
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              user.role === 'admin' 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50' 
                                : user.role === 'editor'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50'
                            }`}>
                              {user.displayName ? user.displayName.substring(0, 2) : (userEmail ? userEmail.substring(0, 2) : 'U')}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-1.5">
                              {user.displayName || 'ไม่มีชื่อแสดง'}
                              {isSelf && (
                                <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-indigo-500/20">
                                  ตัวคุณ
                                </span>
                              )}
                              {isDuplicateEmail && (
                                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-rose-500/20 flex items-center gap-1 shrink-0" title={`พบอีเมลนี้ซ้ำกัน ${sameEmailCount} รายการในระบบ สามารถกดลบรายการซ้ำได้`}>
                                  <ShieldAlert className="h-2.5 w-2.5 text-rose-500" />
                                  อีเมลซ้ำ (ลบได้)
                                </span>
                              )}
                              {isDeveloper && (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-amber-500/20 flex items-center gap-0.5">
                                  <Crown className="h-2.5 w-2.5" />
                                  DEVELOPER
                                </span>
                              )}
                              {isGoogleUser && (
                                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-blue-500/20 flex items-center gap-1">
                                  <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                  </svg>
                                  Google
                                </span>
                              )}
                              {isNewUser && !isDeveloper && (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-amber-500/20 flex items-center gap-0.5">
                                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                  NEW
                                </span>
                              )}
                              {isPreRegistered && (
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-emerald-500/20">
                                  กำหนดสิทธิ์ล่วงหน้า (Pre-registered)
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono mt-0.5">
                              UID: {user.uid}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* UID */}
                      <td className="py-4 px-5 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 font-bold font-mono text-[11px] select-all max-w-[140px] truncate" title={user.uid || 'ไม่มี UID'}>
                            {user.uid || 'N/A'}
                          </span>
                          {user.uid && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(user.uid);
                                addToast('info', 'คัดลอก UID แล้ว', `คัดลอกรหัส UID (${user.uid}) เรียบร้อยแล้ว`);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="คัดลอกรหัส UID"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{userEmail || 'ไม่มีข้อมูลอีเมล'}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-5">
                        {(user.role || 'user') === 'admin' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 py-1 px-2.5 rounded-full font-bold text-xs">
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                            <span>ผู้ดูแลระบบ (Admin)</span>
                          </span>
                        ) : (user.role || 'user') === 'editor' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 py-1 px-2.5 rounded-full font-bold text-xs">
                            <Pencil className="h-3.5 w-3.5 text-emerald-500" />
                            <span>ผู้แก้ไขข้อมูล (Editor)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-1 px-2.5 rounded-full font-bold text-xs">
                            <Lock className="h-3.5 w-3.5 text-slate-400" />
                            <span>ผู้ใช้ทั่วไป (User)</span>
                          </span>
                        )}
                      </td>

                      {/* Activation Status */}
                      <td className="py-4 px-5">
                        {user.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 py-1 px-2.5 rounded-full font-bold text-xs animate-pulse">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            <span>รออนุมัติสิทธิ์</span>
                          </span>
                        ) : user.status === 'disabled' ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 py-1 px-2.5 rounded-full font-bold text-xs">
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                            <span>ถูกระงับใช้งาน</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 py-1 px-2.5 rounded-full font-bold text-xs">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span>เปิดใช้งานแล้ว</span>
                          </span>
                        )}
                      </td>

                      {/* Online Status */}
                      <td className="py-4 px-5">
                        {isUserOnline(user) ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 py-1 px-2.5 rounded-full font-bold text-xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>ออนไลน์</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 py-1 px-2.5 rounded-full font-medium text-xs">
                            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                            <span>{formatLastSeen(user)}</span>
                          </span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ไม่พบวันที่'}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Quick Activation Toggle Button */}
                          {user.status === 'pending' ? (
                            <button
                              onClick={() => handleStatusChange(user, 'active')}
                              disabled={isUpdating === user.uid}
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                              title="อนุมัติการใช้งานบัญชีนี้"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>อนุมัติสิทธิ์</span>
                            </button>
                          ) : user.status === 'disabled' ? (
                            <button
                              onClick={() => handleStatusChange(user, 'active')}
                              disabled={isUpdating === user.uid}
                              className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="ปลดล็อกและอนุมัติใช้งานอีกครั้ง"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>ปลดระงับ</span>
                            </button>
                          ) : null}

                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleStartEdit(user)}
                            disabled={isUpdating === user.uid}
                            className="p-2 rounded-xl border transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 disabled:opacity-50"
                            title={isSelf ? 'แก้ไขโปรไฟล์และชื่อแสดงของท่าน' : 'แก้ไขข้อมูลและสิทธิ์'}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Quick Role Toggle Button */}
                          <button
                            onClick={() => handleRoleToggle(user)}
                            disabled={isUpdating === user.uid}
                            className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              user.role === 'admin'
                                ? 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                : user.role === 'editor'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                  : 'bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50'
                            }`}
                            title={isSelf ? 'สลับบทบาท (ล็อกสำหรับบัญชีของท่าน)' : 'สลับบทบาท (User -> Editor -> Admin)'}
                          >
                            {user.role === 'user' ? (
                              <>
                                <Pencil className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="hidden sm:inline">เปลี่ยนเป็น Editor</span>
                              </>
                            ) : user.role === 'editor' ? (
                              <>
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                <span className="hidden sm:inline">เปลี่ยนเป็น Admin</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="hidden sm:inline">ลดเป็น User</span>
                              </>
                            )}
                          </button>

                          {/* Delete Account/Role Button */}
                          <button
                            onClick={() => handleDeleteRole(user)}
                            disabled={isUpdating === user.uid || (isSelf && !isDuplicateEmail && isDeveloper)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
                              isDuplicateEmail
                                ? 'bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold shadow-2xs'
                                : isSelf && !isDuplicateEmail
                                  ? 'bg-rose-50/10 dark:bg-rose-950/5 text-rose-400/70 border-rose-200/40 hover:bg-rose-50/20'
                                  : 'bg-rose-50 dark:bg-rose-950/10 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30 hover:border-rose-300'
                            }`}
                            title={
                              isDuplicateEmail
                                ? `ลบบัญชีที่ใช้อีเมลซ้ำนี้ (${user.email}) ออกจากระบบ`
                                : isSelf
                                  ? 'ไม่สามารถลบบัญชีเดียวของตนเองได้'
                                  : 'ลบสิทธิ์ออกจากระบบ'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </>
        )}

        {/* ================= TAB 2: PERMISSIONS MATRIX ================= */}
        {activeTab === 'matrix' && (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-200/50 dark:border-indigo-900/30 flex items-start gap-3">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">โครงสร้างการควบคุมระดับสิทธิ์ (Role-based Access Control Matrix)</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  ระบบแบ่งสิทธิ์การใช้งานออกเป็น 3 ระดับหลัก เพื่อความปลอดภัยและความถูกต้องของข้อมูลพัสดุ สต็อก และใบงาน
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs sm:text-sm font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4 font-bold">มอดูล / ฟังก์ชันการใช้งาน (System Modules)</th>
                    <th className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 py-1 px-3 rounded-full border border-amber-500/20">
                        <Crown className="h-3.5 w-3.5" />
                        <span>Admin (ผู้ดูแลระบบ)</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-1 px-3 rounded-full border border-emerald-500/20">
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Editor (แก้ไขข้อมูล)</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 py-1 px-3 rounded-full border border-indigo-500/20">
                        <Lock className="h-3.5 w-3.5" />
                        <span>User (ผู้ใช้ทั่วไป)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                  {/* Module 1 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      📦 คลังสินค้า & สต็อกพัสดุ (Products & Stock)
                      <span className="block text-[11px] font-normal text-slate-400">ค้นหา, เพิ่มรายการพัสดุ, แก้ไขจำนวน, ปรับสต็อก, ลบสินค้า</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> เต็มรูปแบบ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> เพิ่ม/แก้ไข (ห้ามลบ)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> ดูข้อมูล & เบิก/คืน
                      </span>
                    </td>
                  </tr>

                  {/* Module 2 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      📋 ใบเบิก & สูตร BOM (BOM & Stock Movement)
                      <span className="block text-[11px] font-normal text-slate-400">สร้างสูตรประกอบ BOM, ทำรายการเบิกวัสดุ, สแกน QR Code</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> เต็มรูปแบบ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> สร้าง & แก้ไข
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> ทำรายการเบิก
                      </span>
                    </td>
                  </tr>

                  {/* Module 3 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      🛒 ใบขอซื้อ & ใบสั่งซื้อ (PR & PO Management)
                      <span className="block text-[11px] font-normal text-slate-400">ขอซื้อพัสดุ, ออกใบสั่งซื้อ, อนุมัติวงเงิน</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> สร้าง, อนุมัติ & ลบ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> สร้าง & ออก PO
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> ขอซื้อ (PR)
                      </span>
                    </td>
                  </tr>

                  {/* Module 4 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      🏗️ โครงการ & ใบงาน (Projects & Work Orders)
                      <span className="block text-[11px] font-normal text-slate-400">สร้างโครงการ, มอบหมายงาน, อัปเดตสถานะงาน</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> เต็มรูปแบบ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> สร้าง & อัปเดต
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> ดูข้อมูลใบงาน
                      </span>
                    </td>
                  </tr>

                  {/* Module 5 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      🛡️ จัดการสิทธิ์ผู้ใช้งาน (User Roles & Permissions)
                      <span className="block text-[11px] font-normal text-slate-400">เพิ่มสิทธิ์, สลับบทบาท, กำหนดสิทธิ์ล่วงหน้า, ลบบัญชีผู้ใช้</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <Check className="h-3.5 w-3.5" /> สิทธิ์เฉพาะ Admin
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <X className="h-3.5 w-3.5" /> ห้ามเข้าถึง
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 font-bold px-2.5 py-1 rounded-lg text-xs">
                        <X className="h-3.5 w-3.5" /> ห้ามเข้าถึง
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PENDING EMPLOYEES ================= */}
        {activeTab === 'pending' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base font-sans">
                  พนักงานในคลังที่ยังไม่ได้เปิดสิทธิ์เข้าใช้งานระบบ ({pendingEmployees.length} ราย)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                  กดปุ่มเปิดสิทธิ์เพื่อสร้าง Record กำหนดสิทธิ์ล่วงหน้า พนักงานจะสามารถ Sign-in เข้าใช้งานได้ทันที
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {pendingEmployees.map(emp => (
                <div 
                  key={emp.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs sm:text-sm">
                      {emp.name} {emp.nickname ? `(${emp.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                      {emp.email}
                    </div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 py-0.5 px-2 rounded-md border border-indigo-100 dark:border-indigo-950 inline-block font-sans">
                      แผนก: {emp.department || 'ไม่ระบุ'}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        setIsUpdating(emp.id);
                        await onAddUserRole({
                          email: emp.email || '',
                          displayName: emp.name,
                          role: 'user'
                        });
                        addToast(
                          'success',
                          'กำหนดสิทธิ์พนักงานสำเร็จ',
                          `กำหนดสิทธิ์ล่วงหน้าให้พนักงาน "${emp.name}" (สิทธิ์ User) เรียบร้อยแล้ว`
                        );
                      } catch (err) {
                        addToast('error', 'ข้อผิดพลาด', 'ไม่สามารถกำหนดสิทธิ์ให้พนักงานท่านนี้ได้');
                      } finally {
                        setIsUpdating(null);
                      }
                    }}
                    disabled={isUpdating !== null}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isUpdating === emp.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    <span>เปิดสิทธิ์ User</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD USER / PRE-REGISTER ROLE ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden relative">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <UserPlus className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm sm:text-base">เพิ่มบัญชี / กำหนดสิทธิ์ล่วงหน้า</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-4 font-sans text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>อีเมลผู้ใช้งาน (Email)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="เช่น user@example.com"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  เมื่ออีเมลนี้เข้ามาลงทะเบียนหรือล็อกอินในภายหลัง ระบบจะเปิดใช้งานสิทธิ์ที่กำหนดนี้ทันที
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ชื่อแสดง / ชื่อผู้ใช้ (Display Name)
                </label>
                <input
                  type="text"
                  value={addDisplayName}
                  onChange={(e) => setAddDisplayName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี (เว้นว่างไว้จะใช้ชื่อจากอีเมล)"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Fingerprint className="h-4 w-4 text-indigo-500" />
                    <span>รหัสระบุตัวตน (UID Code)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(เว้นว่างได้ เพื่อให้ระบบสุ่มให้อัตโนมัติ)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={addUid}
                    onChange={(e) => setAddUid(e.target.value)}
                    placeholder="เช่น pre_user123 หรือดึงจาก Firebase"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handlePullCurrentUidToAddModal}
                    className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all cursor-pointer shrink-0 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                    title="ดึง UID จากบัญชี Firebase Authentication ที่ล็อกอินอยู่"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>ดึง UID Firebase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddUid(`pre_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString().slice(-4)}`)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
                    title="สุ่มรหัส UID ล่วงหน้า"
                  >
                    สุ่ม
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ระดับสิทธิ์การเข้าใช้งาน (Role)
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setAddRole('user')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      addRole === 'user'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    <span className="truncate">User (ทั่วไป)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddRole('editor')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      addRole === 'editor'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Pencil className="h-4 w-4 shrink-0" />
                    <span className="truncate">Editor (แก้ไข)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddRole('admin')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      addRole === 'admin'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Crown className="h-4 w-4 shrink-0" />
                    <span className="truncate">Admin (ผู้ดูแล)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  สถานะการอนุมัติแรกเริ่ม (Initial Status)
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setAddStatus('active')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                      addStatus === 'active'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>อนุมัติเลย (Active)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddStatus('pending')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs ${
                      addStatus === 'pending'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>รออนุมัติ (Pending)</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>บันทึกสิทธิ์</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER DETAILS ================= */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden relative">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Pencil className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white font-sans text-sm sm:text-base">แก้ไขข้อมูลและสิทธิ์ผู้ใช้</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-4 font-sans text-xs sm:text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Fingerprint className="h-4 w-4 text-indigo-500" />
                    <span>รหัสระบุตัวตนประจำบัญชี (UID Code)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(รหัสประจำตัวสร้างจากระบบ)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={editingUser?.uid || ''}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-700 dark:text-slate-300 text-xs font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const activeUid = auth.currentUser?.uid || (window as any).currentUserUid;
                      if (activeUid) {
                        if (editingUser) {
                          setEditingUser({ ...editingUser, uid: activeUid });
                        }
                        addToast('info', 'ดึง UID Firebase แล้ว', `สลับรหัส UID เป็น ${activeUid}`);
                      } else {
                        addToast('warning', 'ไม่พบ UID', 'ไม่พบ UID ในเซสชัน Firebase ปัจจุบัน');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-800/60 shrink-0"
                    title="ดึง UID จาก Firebase Auth บัญชีที่ล็อกอินอยู่"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>ดึง UID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingUser?.uid) {
                        navigator.clipboard.writeText(editingUser.uid);
                        addToast('info', 'คัดลอก UID แล้ว', `คัดลอกรหัส UID (${editingUser.uid}) เรียบร้อยแล้ว`);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800/60 shrink-0"
                    title="คัดลอก UID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>คัดลอก</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>อีเมลผู้ใช้งาน (Email)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="เช่น user@example.com"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ชื่อแสดง / ชื่อผู้ใช้ (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="ชื่อที่แสดงในระบบ"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ระดับสิทธิ์การเข้าใช้งาน (Role)
                </label>
                {(() => {
                  const isEditingRoleLocked = editingUser.email === currentUserEmail || editingUser.email === 'chaleesogood@gmail.com' || editingUser.email === 'chalee@gtt2013.com';
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => !isEditingRoleLocked && setEditRole('user')}
                          disabled={isEditingRoleLocked}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                            editRole === 'user'
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold'
                              : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                          } ${isEditingRoleLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Lock className="h-4 w-4 shrink-0" />
                          <span className="truncate">User (ทั่วไป)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => !isEditingRoleLocked && setEditRole('editor')}
                          disabled={isEditingRoleLocked}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                            editRole === 'editor'
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                              : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                          } ${isEditingRoleLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Pencil className="h-4 w-4 shrink-0" />
                          <span className="truncate">Editor (แก้ไข)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => !isEditingRoleLocked && setEditRole('admin')}
                          disabled={isEditingRoleLocked}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                            editRole === 'admin'
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                              : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                          } ${isEditingRoleLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Crown className="h-4 w-4 shrink-0" />
                          <span className="truncate">Admin (ผู้ดูแล)</span>
                        </button>
                      </div>
                      {isEditingRoleLocked && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-sans leading-relaxed">
                          * ระดับสิทธิ์ของบัญชีผู้พัฒนาหลักหรือของตัวท่านเองถูกล็อกไว้ที่ Admin เพื่อป้องกันการสูญเสียสิทธิ์การบริหารจัดการระบบ
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  สถานะการอนุมัติใช้งาน (Activation Status)
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditStatus('active')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      editStatus === 'active'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <UserCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="truncate">อนุมัติ (Active)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('pending')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      editStatus === 'pending'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="truncate">รออนุมัติ (Pending)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('disabled')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      editStatus === 'disabled'
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500 text-rose-700 dark:text-rose-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="truncate">ระงับ (Disabled)</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังอัปเดต...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
