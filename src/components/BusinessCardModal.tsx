import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  IdCard, 
  Sparkles, 
  Palette, 
  Edit3,
  Check,
  RefreshCw,
  Share2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Employee } from '../types';

interface BusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployee?: Employee | null;
}

export const BusinessCardModal: React.FC<BusinessCardModalProps> = ({
  isOpen,
  onClose,
  employees,
  selectedEmployee
}) => {
  if (!isOpen) return null;

  // Selected Employee State
  const [currentEmpId, setCurrentEmpId] = useState<string>(
    selectedEmployee?.id || (employees.length > 0 ? employees[0].id : '')
  );

  const activeEmp = employees.find(e => e.id === currentEmpId) || selectedEmployee;

  // Form override state for customization
  const [nameTh, setNameTh] = useState(activeEmp?.name || 'ชาลี โรจนันท์');
  const [nameEn, setNameEn] = useState(
    activeEmp?.nickname ? `Chalee Rodjanan` : 'Chalee Rodjanan'
  );
  const [role, setRole] = useState(activeEmp?.role || 'Software Engineer 2');
  const [phone, setPhone] = useState(activeEmp?.phone || '080-430-6887');
  const [email, setEmail] = useState(
    activeEmp?.email || 'globaltransystechnology@gmail.com\nchalee@gtt2013.com'
  );
  const [companyTh, setCompanyTh] = useState('บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด');
  const [companyEn, setCompanyEn] = useState('GLOBAL TRANSYS TECHNOLOGY CO., LTD.');
  const [addressTh, setAddressTh] = useState(
    'บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด(สำนักงานใหญ่)\n68/253 หมู่ที่ 5 ตำบลลาดสวาย อำเภอลำลูกกา\nจังหวัดปทุมธานี 12150'
  );
  const [addressEn, setAddressEn] = useState(
    'GLOBAL TRANSYS TECHNOLOGY CO., LTD.\n68/253 Moo 5 Ladsawal, Lamlukka, Pathumthani 12150\nTel. 02-153-8834  เลขประจำตัวผู้เสียภาษี 0-1355-56013-09-7'
  );
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [theme, setTheme] = useState<'navy' | 'blue' | 'slate' | 'emerald'>('navy');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Ref for card node
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync state when selecting employee from dropdown
  const handleSelectEmployee = (empId: string) => {
    setCurrentEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setNameTh(emp.name);
      setNameEn(emp.name);
      setRole(emp.role || 'ช่างประจำแผนก');
      setPhone(emp.phone || '080-430-6887');
      setEmail(emp.email || 'globaltransystechnology@gmail.com');
    }
  };

  // Download Handler using html2canvas
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High DPI print resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `BusinessCard_${nameTh.replace(/\s+/g, '_')}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to download business card', err);
      alert('เกิดข้อผิดพลาดในการสร้างภาพนามบัตร กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Theme gradient styles
  const getThemeGradient = () => {
    switch (theme) {
      case 'navy':
        return 'bg-gradient-to-br from-[#121c2e] via-[#162744] to-[#1d3d6e] text-white';
      case 'blue':
        return 'bg-gradient-to-br from-[#0f2b5c] via-[#1d4ed8] to-[#2563eb] text-white';
      case 'slate':
        return 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white';
      case 'emerald':
        return 'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] text-white';
      default:
        return 'bg-gradient-to-br from-[#121c2e] via-[#162744] to-[#1d3d6e] text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full transition-all duration-300 ${
        isZoomed ? 'max-w-6xl' : 'max-w-4xl'
      } flex flex-col overflow-hidden max-h-[92vh]`}>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-sans flex items-center gap-2">
                <span>สร้างนามบัตรพนักงาน (Employee Business Card)</span>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold rounded-full">GTT Style</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ออกแบบ ถอดแบบตามมาตรฐานบริษัท ขยายดูขนาดจริง และดาวน์โหลดไฟล์ภาพความละเอียดสูง</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={isZoomed ? "ย่อขนาดหน้าต่าง" : "ขยายเต็มจอ"}
            >
              {isZoomed ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100/80 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Employee Select */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <User className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">เลือกพนักงาน:</label>
              <select
                value={currentEmpId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.empCode ? `[${emp.empCode}] ` : ''}{emp.name} ({emp.role || 'พนักงาน'})
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Selectors & Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <Palette className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
                <span className="text-[11px] font-bold text-slate-500 mr-1">ธีม:</span>
                {[
                  { id: 'navy', color: 'bg-[#121c2e]', label: 'กรมท่า GTT' },
                  { id: 'blue', color: 'bg-[#1d4ed8]', label: 'น้ำเงิน' },
                  { id: 'slate', color: 'bg-[#0f172a]', label: 'สเลท' },
                  { id: 'emerald', color: 'bg-[#064e3b]', label: 'เขียวมรกต' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`h-6 w-6 rounded-lg ${t.color} border transition-all cursor-pointer flex items-center justify-center ${
                      theme === t.id ? 'border-white ring-2 ring-indigo-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    title={t.label}
                  >
                    {theme === t.id && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  พรีวิว (Preview)
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    activeTab === 'edit'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  ปรับแต่งข้อความ
                </button>
              </div>
            </div>
          </div>

          {/* EDIT FORM TAB */}
          {activeTab === 'edit' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                แก้ไขข้อมูลบนนามบัตร (Business Card Data Fields)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">ชื่อ-นามสกุล (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={nameTh}
                    onChange={(e) => setNameTh(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">ชื่อ-นามสกุล (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">ตำแหน่งงาน (Position / Role)</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">เบอร์โทรศัพท์ส่วนตัว / มือถือ</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">อีเมลติดต่อ (แบ่งบรรทัดได้)</label>
                  <textarea
                    rows={2}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">ชื่อบริษัท (ภาษาไทย)</label>
                  <input
                    type="text"
                    value={companyTh}
                    onChange={(e) => setCompanyTh(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">ชื่อบริษัท (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    value={companyEn}
                    onChange={(e) => setCompanyEn(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">ที่อยู่บริษัท (ภาษาไทย)</label>
                  <textarea
                    rows={2}
                    value={addressTh}
                    onChange={(e) => setAddressTh(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">ที่อยู่ภาษาอังกฤษ + เลขผู้เสียภาษี + เบอร์สำนักงาน</label>
                  <textarea
                    rows={3}
                    value={addressEn}
                    onChange={(e) => setAddressEn(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CARD CANVAS PREVIEW AREA */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950/10 dark:bg-slate-950/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden min-h-[380px]">
            
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* Scale Container */}
            <div className="w-full max-w-[720px] shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.01]">
              
              {/* THE ACTUAL BUSINESS CARD (Exact replica of photo layout) */}
              <div
                ref={cardRef}
                id="gtt-business-card"
                className="w-full aspect-[1.75/1] bg-white flex relative select-none font-sans overflow-hidden text-slate-800"
                style={{
                  minHeight: '380px',
                  boxSizing: 'border-box'
                }}
              >
                {/* LEFT SECTION - LIGHT WHITE BRANDING */}
                <div className="w-[38%] bg-white p-5 sm:p-7 flex flex-col items-center justify-between z-10 relative border-r border-slate-100">
                  
                  <div className="my-auto flex flex-col items-center text-center space-y-3">
                    {/* GTT / Company Logo */}
                    {logoUrl ? (
                      <img src={logoUrl} alt="Company Logo" className="h-20 w-auto object-contain" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center">
                          {/* Outer Gear Ring SVG */}
                          <svg viewBox="0 0 200 200" className="w-full h-full text-[#1e3a8a]">
                            <circle cx="100" cy="100" r="75" fill="#1d4ed8" />
                            <circle cx="100" cy="100" r="50" fill="#ffffff" />
                            <text x="100" y="112" textAnchor="middle" fontSize="36" fontWeight="900" fill="#1d4ed8" fontFamily="Arial, sans-serif">
                              GTT
                            </text>
                            {/* Mechanical Arm Symbol */}
                            <path
                              d="M 140 45 L 180 20 A 15 15 0 0 1 195 35 L 170 75 Z"
                              fill="#1e3a8a"
                            />
                            <circle cx="170" cy="35" r="10" fill="#ffffff" stroke="#1e3a8a" strokeWidth="4" />
                            {/* Text curved */}
                            <path id="curve" d="M 40,100 A 60,60 0 0,1 160,100" fill="transparent" />
                            <text fontSize="10" fontWeight="bold" fill="#ffffff">
                              <textPath href="#curve" startOffset="50%" textAnchor="middle">
                                GLOBAL TRANSYS TECHNOLOGY CO., LTD.
                              </textPath>
                            </text>
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Company Name below logo */}
                    <div className="pt-2 text-center">
                      <p className="text-[11px] sm:text-[13px] font-black text-slate-800 leading-tight">
                        {companyTh}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 tracking-wider uppercase mt-1">
                        {companyEn}
                      </p>
                    </div>
                  </div>

                  {/* Decorative Subtle Accent Bar */}
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-60" />
                </div>

                {/* RIGHT SECTION - NAVY GRADIENT INFO AREA */}
                <div className={`w-[62%] ${getThemeGradient()} p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden`}>
                  
                  {/* Subtle Background Accent Curves */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-12 w-40 h-40 bg-blue-400/10 rounded-full blur-xl pointer-events-none" />

                  {/* TOP HEADER: NAME BADGE (WHITE PILL CONTAINER) */}
                  <div className="z-10">
                    <div className="bg-white/95 text-slate-900 rounded-2xl px-5 py-2.5 shadow-lg border border-white/40 backdrop-blur-sm inline-block w-full text-center">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        {nameTh}
                      </h2>
                      <p className="text-[11px] sm:text-[12px] font-bold text-slate-600 tracking-wide font-sans">
                        {nameEn}
                      </p>
                    </div>

                    {/* ROLE / POSITION TITLE */}
                    <div className="mt-2.5 text-center">
                      <p className="text-xs sm:text-sm font-extrabold text-blue-100 tracking-wide font-sans drop-shadow-xs">
                        {role}
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM SECTION: CONTACT & ADDRESS INFO WITH CIRCULAR ICON BADGES */}
                  <div className="space-y-2.5 text-[10px] sm:text-[11px] z-10 pt-2 font-sans">
                    
                    {/* 1. Phone Row */}
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-white text-blue-800 flex items-center justify-center shrink-0 shadow-md">
                        <Phone className="h-3.5 w-3.5 fill-blue-800 text-blue-800" />
                      </div>
                      <span className="font-extrabold font-mono text-xs text-white tracking-wider drop-shadow-xs">
                        {phone}
                      </span>
                    </div>

                    {/* 2. Email Row */}
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-white text-blue-800 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                        <Mail className="h-3.5 w-3.5 text-blue-800" />
                      </div>
                      <div className="flex flex-col text-[9.5px] sm:text-[10.5px] font-semibold text-blue-50 leading-tight space-y-0.5 font-mono">
                        {email.split('\n').map((line, idx) => (
                          <span key={idx}>{line}</span>
                        ))}
                      </div>
                    </div>

                    {/* 3. Address Row */}
                    <div className="flex items-start gap-3 pt-0.5">
                      <div className="h-7 w-7 rounded-full bg-white text-blue-800 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-800" />
                      </div>
                      <div className="text-[8.5px] sm:text-[9.5px] text-slate-100 font-normal leading-snug space-y-0.5">
                        {addressTh.split('\n').map((line, idx) => (
                          <p key={`th_${idx}`} className="font-semibold text-white">{line}</p>
                        ))}
                        <div className="pt-1 opacity-90 border-t border-white/10 mt-1">
                          {addressEn.split('\n').map((line, idx) => (
                            <p key={`en_${idx}`} className="text-[8px] sm:text-[9px] font-mono text-blue-100">{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* Helper Caption */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 text-center font-medium">
              * ขนาดและดีไซน์นามบัตรถูกปรับให้อัตราส่วน 3.5" x 2" (Standard Business Card Spec) เพื่อความคมชัดสูงเมื่อดาวน์โหลดหรือสั่งพิมพ์
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNameTh('ชาลี โรจนันท์');
                setNameEn('Chalee Rodjanan');
                setRole('Software Engineer 2');
                setPhone('080-430-6887');
                setEmail('globaltransystechnology@gmail.com\nchalee@gtt2013.com');
              }}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>รีเซ็ตเป็นข้อมูลต้นฉบับ GTT</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์นามบัตร (Print)</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? 'กำลังสร้างไฟล์ภาพ...' : 'ดาวน์โหลดไฟล์ภาพ PNG (Download)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
