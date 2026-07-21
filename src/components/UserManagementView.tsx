import React, { useState, useMemo } from 'react';
import { UserRole } from '../types';
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
  Loader2
} from 'lucide-react';

interface UserManagementViewProps {
  userRoles: UserRole[];
  currentUserEmail: string | null;
  onUpdateUserRole: (uid: string, role: 'admin' | 'editor' | 'user') => Promise<void>;
  onUpdateUser: (uid: string, updatedData: { email: string; displayName: string; role: 'admin' | 'editor' | 'user' }) => Promise<void>;
  onAddUserRole: (userData: { email: string; displayName: string; role: 'admin' | 'editor' | 'user'; uid?: string }) => Promise<void>;
  onDeleteUserRole: (uid: string) => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  triggerConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function UserManagementView({
  userRoles,
  currentUserEmail,
  onUpdateUserRole,
  onUpdateUser,
  onAddUserRole,
  onDeleteUserRole,
  addToast,
  triggerConfirm
}: UserManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);

  // Form states for Add
  const [addEmail, setAddEmail] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'editor' | 'user'>('user');

  // Form states for Edit
  const [editEmail, setEditEmail] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'editor' | 'user'>('user');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return userRoles.filter(user => {
      const emailMatch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const nameMatch = user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return emailMatch || nameMatch;
    });
  }, [userRoles, searchQuery]);

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
    const exists = userRoles.some(u => u.email.toLowerCase() === addEmail.trim().toLowerCase());
    if (exists) {
      addToast('warning', 'อีเมลนี้มีในระบบแล้ว', 'บัญชีผู้ใช้หรืออีเมลนี้ได้รับการลงทะเบียนสิทธิ์เรียบร้อยแล้ว');
      return;
    }

    try {
      setIsSubmitting(true);
      const email = addEmail.trim();
      const displayName = addDisplayName.trim() || email.split('@')[0];
      
      await onAddUserRole({
        email,
        displayName,
        role: addRole
      });

      addToast('success', 'เพิ่มสิทธิ์ผู้ใช้สำเร็จ', `กำหนดสิทธิ์ล่วงหน้าให้ ${email} เป็นสิทธิ์ ${addRole === 'admin' ? 'Admin' : 'User'} เรียบร้อยแล้ว`);
      
      // Reset form & close
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
    if (user.email === currentUserEmail) {
      addToast('warning', 'ระงับการทำงาน', 'คุณไม่สามารถแก้ไขสิทธิ์และข้อมูลบัญชีของตนเองได้ เพื่อความปลอดภัย');
      return;
    }

    if (user.email === 'chaleesogood@gmail.com' || user.email === 'chalee@gtt2013.com') {
      addToast('warning', 'ระงับการทำงาน', `บัญชีผู้พัฒนาหลัก (${user.email}) ไม่สามารถถูกแก้ไขได้`);
      return;
    }

    setEditingUser(user);
    setEditEmail(user.email);
    setEditDisplayName(user.displayName || '');
    setEditRole(user.role);
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
    const exists = userRoles.some(u => u.uid !== editingUser.uid && u.email.toLowerCase() === editEmail.trim().toLowerCase());
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
        role: editRole
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

  // Handle Role Toggle (Quick Action)
  const handleRoleToggle = async (user: UserRole) => {
    if (user.email === currentUserEmail) {
      addToast('warning', 'ระงับการทำงาน', 'คุณไม่สามารถเปลี่ยนสิทธิ์ของตนเองได้ เพื่อป้องกันการล็อคตัวเองออกจากระบบ');
      return;
    }

    if (user.email === 'chaleesogood@gmail.com' || user.email === 'chalee@gtt2013.com') {
      addToast('warning', 'ระงับการทำงาน', `บัญชีผู้พัฒนาหลัก (${user.email}) ไม่สามารถถูกเปลี่ยนสิทธิ์ได้`);
      return;
    }

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

    const confirmMsg = `คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ของ "${user.email}" เป็น ${newRoleName}?`;
    
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
    if (user.email === currentUserEmail) {
      addToast('warning', 'ระงับการทำงาน', 'คุณไม่สามารถลบบัญชีหรือสิทธิ์ของตนเองได้');
      return;
    }

    if (user.email === 'chaleesogood@gmail.com' || user.email === 'chalee@gtt2013.com') {
      addToast('warning', 'ระงับการทำงาน', 'บัญชีผู้พัฒนาหลักไม่สามารถถูกลบออกจากสิทธิ์ระบบได้');
      return;
    }

    const confirmMsg = `คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิ์และบัญชีผู้ใช้งานของ "${user.email}" ออกจากคลัง?`;

    const executeDelete = async () => {
      try {
        setIsUpdating(user.uid);
        await onDeleteUserRole(user.uid);
        addToast('success', 'ลบผู้ใช้งานสำเร็จ', `ลบข้อมูลบทบาทและสิทธิ์ของ ${user.email} เรียบร้อยแล้ว`);
      } catch (err) {
        addToast('error', 'ลบล้มเหลว', 'เกิดข้อผิดพลาดในการลบข้อมูลบทบาทผู้ใช้งาน');
      } finally {
        setIsUpdating(null);
      }
    };

    if (triggerConfirm) {
      triggerConfirm('ยืนยันการลบสิทธิ์ผู้ใช้งาน', confirmMsg, executeDelete);
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

      {/* Main card panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Toolbar & Search & Add Button */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <span>ทั้งหมด: {filteredUsers.length} บัญชี</span>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/15 transition-all font-sans"
          >
            <UserPlus className="h-4 w-4" />
            <span>เพิ่มบัญชี / กำหนดสิทธิ์ล่วงหน้า</span>
          </button>
        </div>

        {/* User Table / List */}
        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-sans">
              <UserCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-bounce" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลรายชื่อผู้ใช้งาน</p>
              <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-sans text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800/80">
                  <th className="py-3 px-5">ผู้ใช้งาน (User)</th>
                  <th className="py-3 px-5">อีเมล (Email)</th>
                  <th className="py-3 px-5">บทบาท (Role)</th>
                  <th className="py-3 px-5">ลงทะเบียนเมื่อ (Created / Registered)</th>
                  <th className="py-3 px-5 text-right">ดำเนินการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredUsers.map((user) => {
                  const isSelf = user.email === currentUserEmail;
                  const isDeveloper = user.email === 'chaleesogood@gmail.com' || user.email === 'chalee@gtt2013.com';
                  const isPreRegistered = user.uid.startsWith('pre_');
                  
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
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            user.role === 'admin' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50' 
                              : user.role === 'editor'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50'
                          }`}>
                            {user.displayName ? user.displayName.substring(0, 2) : user.email.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-1.5">
                              {user.displayName || 'ไม่มีชื่อแสดง'}
                              {isSelf && (
                                <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-indigo-500/20">
                                  ตัวคุณ
                                </span>
                              )}
                              {isDeveloper && (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black py-0.5 px-2 rounded-lg border border-amber-500/20 flex items-center gap-0.5">
                                  <Crown className="h-2.5 w-2.5" />
                                  DEVELOPER
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

                      {/* Email */}
                      <td className="py-4 px-5 font-mono text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-5">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 py-1 px-2.5 rounded-full font-bold text-xs">
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                            <span>ผู้ดูแลระบบ (Admin)</span>
                          </span>
                        ) : user.role === 'editor' ? (
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
                          {/* Edit Details Button */}
                          <button
                            onClick={() => handleStartEdit(user)}
                            disabled={isSelf || isDeveloper || isUpdating === user.uid}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isSelf || isDeveloper
                                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                                : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                            title={isSelf ? 'ไม่สามารถแก้ไขตนเองได้' : 'แก้ไขข้อมูลและสิทธิ์'}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Quick Role Toggle Button */}
                          <button
                            onClick={() => handleRoleToggle(user)}
                            disabled={isSelf || isDeveloper || isUpdating === user.uid}
                            className={`px-3 py-2 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelf || isDeveloper
                                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                                : user.role === 'admin'
                                  ? 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  : user.role === 'editor'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                                    : 'bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50'
                            }`}
                            title={isSelf ? 'ไม่สามารถแก้ไขสิทธิ์ของตนเองได้' : 'สลับบทบาท (User -> Editor -> Admin)'}
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
                            disabled={isSelf || isDeveloper || isUpdating === user.uid}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isSelf || isDeveloper
                                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                                : 'bg-rose-50 dark:bg-rose-950/10 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30 hover:border-rose-300'
                            }`}
                            title={isSelf ? 'ไม่สามารถลบสิทธิ์ของตนเองได้' : 'ลบสิทธิ์ออกจากระบบ'}
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
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditRole('user')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      editRole === 'user'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    <span className="truncate">User (ทั่วไป)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('editor')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      editRole === 'editor'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Pencil className="h-4 w-4 shrink-0" />
                    <span className="truncate">Editor (แก้ไข)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs ${
                      editRole === 'admin'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    <Crown className="h-4 w-4 shrink-0" />
                    <span className="truncate">Admin (ผู้ดูแล)</span>
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
