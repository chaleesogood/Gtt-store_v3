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
  Sparkles
} from 'lucide-react';

interface UserManagementViewProps {
  userRoles: UserRole[];
  currentUserEmail: string | null;
  onUpdateUserRole: (uid: string, role: 'admin' | 'user') => Promise<void>;
  onDeleteUserRole: (uid: string) => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export default function UserManagementView({
  userRoles,
  currentUserEmail,
  onUpdateUserRole,
  onDeleteUserRole,
  addToast
}: UserManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return userRoles.filter(user => {
      const emailMatch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const nameMatch = user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return emailMatch || nameMatch;
    });
  }, [userRoles, searchQuery]);

  const handleRoleToggle = async (user: UserRole) => {
    if (user.email === currentUserEmail) {
      addToast('warning', 'ระงับการทำงาน', 'คุณไม่สามารถเปลี่ยนสิทธิ์ของตนเองได้ เพื่อป้องกันการล็อคตัวเองออกจากระบบ');
      return;
    }

    if (user.email === 'chaleesogood@gmail.com') {
      addToast('warning', 'ระงับการทำงาน', 'บัญชีผู้พัฒนาหลัก (chaleesogood@gmail.com) ไม่สามารถถูกเปลี่ยนสิทธิ์ได้');
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ของ "${user.email}" เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้ใช้งานทั่วไป (User)'}?`;
    
    if (confirm(confirmMsg)) {
      try {
        setIsUpdating(user.uid);
        await onUpdateUserRole(user.uid, newRole);
        addToast('success', 'อัปเดตสิทธิ์สำเร็จ', `เปลี่ยนสิทธิ์ของ ${user.email} เป็น ${newRole === 'admin' ? 'Admin' : 'User'} เรียบร้อยแล้ว`);
      } catch (err) {
        addToast('error', 'อัปเดตล้มเหลว', 'เกิดข้อผิดพลาดในการบันทึกสิทธิ์ผู้ใช้งาน');
      } finally {
        setIsUpdating(null);
      }
    }
  };

  const handleDeleteRole = async (user: UserRole) => {
    if (user.email === currentUserEmail) {
      addToast('warning', 'ระงับการทำงาน', 'คุณไม่สามารถลบบัญชีของตนเองได้');
      return;
    }

    if (user.email === 'chaleesogood@gmail.com') {
      addToast('warning', 'ระงับการทำงาน', 'บัญชีผู้พัฒนาหลักไม่สามารถถูกลบออกจากสิทธิ์ระบบได้');
      return;
    }

    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิ์ของ "${user.email}" ออกจากระบบ? (ผู้ใช้จะถูกลดระดับเป็นสิทธิ์เริ่มต้น)`)) {
      try {
        setIsUpdating(user.uid);
        await onDeleteUserRole(user.uid);
        addToast('success', 'ลบสิทธิ์สำเร็จ', `ลบข้อมูลบทบาทของ ${user.email} เรียบร้อยแล้ว`);
      } catch (err) {
        addToast('error', 'ลบล้มเหลว', 'เกิดข้อผิดพลาดในการลบข้อมูลบทบาทผู้ใช้งาน');
      } finally {
        setIsUpdating(null);
      }
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
              ผู้ดูแลระบบสามารถกำหนดบทบาทของสมาชิกแต่ละคนได้ 
              <br />
              <span className="text-indigo-300 font-semibold">★ สิทธิ์ Admin:</span> มีสิทธิ์จัดการทุกอย่าง รวมทั้งเพิ่ม แก้ไข และลบข้อมูล
              <br />
              <span className="text-slate-400 font-semibold">★ สิทธิ์ User:</span> มีสิทธิ์เข้าใช้งาน ค้นหา และเพิ่มรายการในระบบได้ แต่ <span className="text-rose-400 font-bold">ไม่สามารถลบข้อมูลใดๆ</span> ออกจากฐานข้อมูลได้
            </p>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Crown className="h-4 w-4 shrink-0" />
              <span>บัญชีของคุณ:</span>
            </div>
            <div className="text-slate-300">{currentUserEmail}</div>
            <div className="text-[10px] text-indigo-400 bg-indigo-500/10 py-1 px-2.5 rounded-lg border border-indigo-500/20 inline-block font-sans font-bold">
              บทบาทปัจจุบัน: ผู้ดูแลระบบ (ADMIN)
            </div>
          </div>
        </div>
      </div>

      {/* Main card panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Toolbar & Search */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้ หรืออีเมล..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-sans"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans font-bold flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 self-end sm:self-auto">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>พบบัญชีในระบบ: {filteredUsers.length} บัญชี</span>
          </div>
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
                  <th className="py-3 px-5">วันที่ลงทะเบียน (Registered)</th>
                  <th className="py-3 px-5 text-right">ดำเนินการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredUsers.map((user) => {
                  const isSelf = user.email === currentUserEmail;
                  const isDeveloper = user.email === 'chaleesogood@gmail.com';
                  
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
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50'
                          }`}>
                            {user.displayName ? user.displayName.substring(0, 2) : user.email.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
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
                          <button
                            onClick={() => handleRoleToggle(user)}
                            disabled={isSelf || isDeveloper || isUpdating === user.uid}
                            className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                              isSelf || isDeveloper
                                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                                : user.role === 'admin'
                                  ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  : 'bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50'
                            }`}
                            title={isSelf ? 'ไม่สามารถแก้ไขสิทธิ์ของตนเองได้' : `สลับบทบาทเป็น ${user.role === 'admin' ? 'User' : 'Admin'}`}
                          >
                            {user.role === 'admin' ? (
                              <>
                                <Lock className="h-3.5 w-3.5" />
                                <span>ลดเป็น User</span>
                              </>
                            ) : (
                              <>
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                <span>เลื่อนเป็น Admin</span>
                              </>
                            )}
                          </button>

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
    </div>
  );
}
