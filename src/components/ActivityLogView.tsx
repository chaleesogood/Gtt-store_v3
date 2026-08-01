import React, { useState } from 'react';
import { StockActivity, Product } from '../types';
import { 
  Search, 
  History, 
  Calendar, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  SlidersHorizontal, 
  Image as ImageIcon, 
  User, 
  X, 
  ExternalLink, 
  Eye, 
  FileText,
  CheckCircle2,
  Download
} from 'lucide-react';

interface ActivityLogViewProps {
  activities: StockActivity[];
  products?: Product[];
  currentUser?: any;
  onClearLogs: () => void;
}

export default function ActivityLogView({ 
  activities, 
  products = [], 
  currentUser, 
  onClearLogs 
}: ActivityLogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    isProof?: boolean;
    date?: string;
  } | null>(null);

  // Helper to resolve product or proof image for an activity
  const getActivityImageInfo = (act: StockActivity) => {
    const linkedProduct = products.find((p) => p.id === act.productId);
    const proofUrl = act.imageUrl?.trim() || '';
    const productUrl = act.productImage?.trim() || linkedProduct?.image?.trim() || linkedProduct?.sourceUrl?.trim() || '';

    if (proofUrl) {
      return { url: proofUrl, isProof: true, label: 'รูปหลักฐาน/สลิป' };
    } else if (productUrl) {
      return { url: productUrl, isProof: false, label: 'รูปสินค้า' };
    }
    return null;
  };

  // Resolve editor name, email, and user ID for a specific stock activity log
  const getEditorInfo = (act: StockActivity) => {
    const uid = act.userId || '';
    const email = (act.userEmail || act.creatorEmail || '').trim();
    let name = (act.userName || '').trim();

    if (!name || name === 'system' || name === 'Unknown') {
      if (email.toLowerCase() === 'chaleesogood@gmail.com') {
        name = 'Chalee So Good';
      } else if (email) {
        name = email.split('@')[0];
      } else {
        name = 'ระบบคลังสินค้า (System)';
      }
    }

    let photo = act.userPhotoUrl || '';
    if (!photo && email && currentUser?.email?.toLowerCase() === email.toLowerCase()) {
      photo = currentUser.photoURL || '';
    }

    return { name, email, uid, photo };
  };

  // Filter logs
  const filteredActivities = activities.filter((act) => {
    const editor = getEditorInfo(act);
    const imgInfo = getActivityImageInfo(act);

    const matchesSearch =
      (act.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (act.reason && act.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      editor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      editor.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'all') return true;
    if (typeFilter === 'with_image') return Boolean(imgInfo);
    return act.type === typeFilter;
  });

  // Calculate statistics
  const totalIn = activities.filter((a) => a.type === 'in').reduce((sum, a) => sum + Math.abs(a.quantityChange), 0);
  const totalOut = activities.filter((a) => a.type === 'out').reduce((sum, a) => sum + Math.abs(a.quantityChange), 0);
  const totalWithImages = activities.filter((a) => Boolean(getActivityImageInfo(a))).length;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  };

  return (
    <div className="space-y-3 text-left">
      {/* Title Header Workspace (Unified Dark Banner - Compact) */}
      <div className="flex flex-row items-center justify-between gap-3 bg-slate-900 text-slate-100 p-2.5 px-4 rounded-xl relative overflow-hidden">
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 text-left">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[8px] uppercase tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Security Audit & Activity History</span>
          </div>
          <h2 className="text-sm font-black text-white font-sans flex items-center gap-1.5 mt-0.5">
            <History className="h-4 w-4 text-indigo-400" />
            ประวัติการทำรายการคลังสินค้า (Stock Activity Logs)
          </h2>
        </div>

        <div className="z-10 text-[10px] text-slate-400 font-mono hidden sm:block">
          บันทึกทั้งหมด: {activities.length} รายการ (มีรูปภาพ {totalWithImages} รายการ)
        </div>
      </div>

      {/* KPI Cards / Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Stock In */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-sans font-medium">รวมนำเข้าทั้งหมด</p>
            <h4 className="text-lg font-bold text-slate-800 font-mono mt-0.5">
              +{totalIn} <span className="text-xs font-sans text-slate-400">ชิ้น</span>
            </h4>
          </div>
        </div>

        {/* Total Stock Out */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-sans font-medium">รวมจ่ายออกทั้งหมด</p>
            <h4 className="text-lg font-bold text-slate-800 font-mono mt-0.5">
              -{totalOut} <span className="text-xs font-sans text-slate-400">ชิ้น</span>
            </h4>
          </div>
        </div>

        {/* Total Logs with Photos */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-sans font-medium">รายการที่มีรูปภาพประกอบ</p>
            <h4 className="text-lg font-bold text-slate-800 font-mono mt-0.5">
              {totalWithImages} <span className="text-xs font-sans text-slate-400">รายการ</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, เหตุผล, หรือ ชื่อผู้แก้ไข..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="input-log-search"
          />
        </div>

        {/* Type selector and clear button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
            <select
              className="bg-transparent border-none text-xs text-slate-700 focus:outline-none font-sans cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              id="select-log-type-filter"
            >
              <option value="all">ทุกรายการทั้งหมด ({activities.length})</option>
              <option value="with_image">🖼️ มีรูปภาพประกอบ ({totalWithImages})</option>
              <option value="in">🟢 รับสินค้าเข้า (+)</option>
              <option value="out">🔴 จ่ายสินค้าออก (-)</option>
              <option value="adjust">🟡 ปรับปรุงสต็อก</option>
            </select>
          </div>

          <button
            onClick={onClearLogs}
            disabled={activities.length === 0}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 disabled:opacity-40 rounded-xl transition-all cursor-pointer shrink-0"
            id="btn-clear-logs"
          >
            ล้างประวัติ
          </button>
        </div>
      </div>

      {/* Log List / Table */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-400 mb-4">
            <History className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700 font-sans">ไม่พบประวัติการทำรายการ</h3>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
            ไม่มีรายการประวัติสินค้าที่เข้าเงื่อนไขการค้นหาของคุณในขณะนี้
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-logs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 font-sans uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[150px]">วัน-เวลา (Timestamp)</th>
                  <th className="py-3 px-3 text-center w-[70px]">รูปภาพ</th>
                  <th className="py-3 px-4 min-w-[170px]">รายการสินค้า (Product)</th>
                  <th className="py-3 px-3 min-w-[120px]">ประเภทรายการ</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">สต็อกเดิม</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">เปลี่ยนแปลง</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">สต็อกใหม่</th>
                  <th className="py-3 px-4 min-w-[160px]">ผู้แก้ไข / บันทึก</th>
                  <th className="py-3 px-4 min-w-[180px]">หมายเหตุ / รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {[...filteredActivities]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((act) => {
                    const isPlus = act.type === 'in' || (act.type === 'adjust' && act.quantityChange > 0);
                    const isMinus = act.type === 'out' || (act.type === 'adjust' && act.quantityChange < 0);
                    
                    let badgeClass = 'text-slate-600 bg-slate-50 border-slate-200';
                    let label = 'ปรับสต็อกคลัง';
                    if (act.type === 'in') {
                      badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                      label = 'รับสินค้าเข้า';
                    } else if (act.type === 'out') {
                      badgeClass = 'text-rose-700 bg-rose-50 border-rose-200';
                      label = 'จ่ายสินค้าออก';
                    }

                    const imgInfo = getActivityImageInfo(act);
                    const editor = getEditorInfo(act);

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(act.timestamp)}</span>
                          </div>
                        </td>

                        {/* Image Thumbnail */}
                        <td className="py-2.5 px-3 text-center">
                          {imgInfo ? (
                            <button
                              onClick={() =>
                                setSelectedImage({
                                  url: imgInfo.url,
                                  title: act.productName,
                                  subtitle: act.reason,
                                  isProof: imgInfo.isProof,
                                  date: formatDate(act.timestamp),
                                })
                              }
                              className="relative group inline-block focus:outline-none cursor-pointer"
                              title="คลิกเพื่อขยายดูรูปภาพเต็ม"
                            >
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group-hover:ring-2 group-hover:ring-indigo-500 group-hover:scale-105 transition-all flex items-center justify-center">
                                <img
                                  src={imgInfo.url}
                                  alt={act.productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback image error handling
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              {imgInfo.isProof && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-xs">
                                  <FileText className="w-2 h-2" />
                                </span>
                              )}
                              <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl border border-slate-200/60 bg-slate-50 flex items-center justify-center text-slate-300 mx-auto" title="ไม่มีรูปภาพ">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 font-sans line-clamp-1" title={act.productName}>
                            {act.productName}
                          </div>
                        </td>

                        {/* Event type */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${badgeClass}`}>
                            {label}
                          </span>
                        </td>

                        {/* Old Stock */}
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                          {act.oldQuantity}
                        </td>

                        {/* Quantity change */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-xs">
                          <span className={isPlus ? 'text-emerald-600' : isMinus ? 'text-rose-600' : 'text-slate-600'}>
                            {isPlus ? '+' : ''}{act.quantityChange}
                          </span>
                        </td>

                        {/* New Stock */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-xs text-slate-800">
                          {act.newQuantity}
                        </td>

                        {/* Editor Name / Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {editor.photo ? (
                              <img src={editor.photo} alt={editor.email || editor.name} className="w-6.5 h-6.5 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs" />
                            ) : editor.email ? (
                              <div className="w-6.5 h-6.5 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs">
                                {editor.email.charAt(0) || 'U'}
                              </div>
                            ) : (
                              <div className="w-6.5 h-6.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                ⚙️
                              </div>
                            )}
                            <div className="min-w-0">
                              {editor.email ? (
                                <>
                                  <span className="font-mono font-bold text-indigo-700 text-[11px] block truncate" title={editor.email}>
                                    {editor.email}
                                  </span>
                                  {editor.name && (
                                    <span className="text-[10px] text-slate-500 font-sans block truncate" title={editor.name}>
                                      {editor.name}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-800 text-[11px] font-sans block truncate" title={editor.name}>
                                    {editor.name || 'ระบบคลังสินค้า'}
                                  </span>
                                  <span className="text-[9.5px] text-slate-400 font-mono block truncate">
                                    System Log
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Reason / comments */}
                        <td className="py-3 px-4">
                          <div className="text-slate-600 font-sans max-w-xs line-clamp-2 italic" title={act.reason}>
                            "{act.reason || 'ไม่ได้ระบุรายละเอียด'}"
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 text-[10.5px] text-slate-400 font-sans text-center">
            ระบบบันทึกประวัติการปรับเปลี่ยนสต็อกพร้อมชื่อผู้ทำรายการอัตโนมัติ (Audit Log Trail)
          </div>
        </div>
      )}

      {/* Lightbox / Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                {selectedImage.isProof ? (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-md border border-indigo-200">
                    📄 รูปหลักฐานแนบกิจกรรม
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md border border-slate-200">
                    📦 รูปสินค้าในคลัง
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">{selectedImage.date}</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image display */}
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[60vh] min-h-[220px]">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Footer / Caption */}
            <div className="p-4 bg-white space-y-2">
              <h3 className="font-bold text-slate-800 text-sm font-sans">{selectedImage.title}</h3>
              {selectedImage.subtitle && (
                <p className="text-xs text-slate-500 font-sans italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  "{selectedImage.subtitle}"
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิดในแท็บใหม่
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
