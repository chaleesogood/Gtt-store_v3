import React, { useState, useRef, useEffect } from 'react';
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
  Palette, 
  Edit3,
  Check,
  RefreshCw,
  Camera,
  Save,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  QrCode
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { Employee, CompanyProfile } from '../types';

interface BusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployee?: Employee | null;
  onEditEmployee?: (id: string, updatedFields: Partial<Employee>) => Promise<void>;
  companyProfile?: CompanyProfile;
}

// Ultra-realistic SVG representation of the official GTT Logo
export const GTTLogo: React.FC<{ className?: string }> = ({ className = "h-24 w-auto" }) => {
  return (
    <svg viewBox="0 0 280 260" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Outer Arc Path for curved text: GLOBAL TRANSYS TECHNOLOGY CO.,LTD */}
        <path id="gtt-logo-text-arc-path" d="M 200,105 A 86,86 0 1,1 112,208" />
      </defs>

      {/* Mechanical Lever Arm (Angled at Top Right) */}
      <g transform="translate(18, 0)">
        {/* Lever Arm Bar */}
        <path
          d="M 126 96 L 216 45 C 224 40 234 42 239 50 C 244 58 242 68 234 73 L 144 124 Z"
          fill="#2e48d3"
        />
        {/* Round Lever Head Circle */}
        <circle cx="222" cy="58" r="24" fill="#2e48d3" />
        {/* Inner White Ring on Lever Head */}
        <circle cx="222" cy="58" r="14" stroke="#ffffff" strokeWidth="5.5" fill="none" />
        {/* Pivot White Pin Dot */}
        <circle cx="138" cy="110" r="5" fill="#ffffff" />
      </g>

      {/* Main Blue Circular Body */}
      <path
        d="M 120 40 
           C 168 40, 204 76, 204 124 
           C 204 172, 168 208, 120 208 
           C 72 208, 36 172, 36 124 
           C 36 76, 72 40, 120 40 Z"
        fill="#2e48d3"
      />

      {/* White Bold GTT Monogram Logo Letters (Scaled & Centered strictly inside circle) */}
      <g transform="translate(48, 85) scale(0.85)">
        {/* 'G' Letter */}
        <path
          d="M 46 12 
             C 24 12, 11 26, 11 48 
             C 11 70, 24 84, 46 84 
             C 65 84, 76 72, 78 56 
             L 46 56 L 46 42 L 92 42 
             L 92 48 
             C 92 80, 72 96, 46 96 
             C 15 96, 0 74, 0 48 
             C 0 22, 17 0, 46 0 
             C 66 0, 80 9, 88 22 
             L 73 32 
             C 67 21, 57 12, 46 12 Z"
          fill="#ffffff"
        />
        {/* First 'T' Letter */}
        <path
          d="M 78 14 L 118 14 L 118 26 L 103 26 L 103 82 L 91 82 L 91 26 L 78 26 Z"
          fill="#ffffff"
        />
        {/* Second 'T' Letter */}
        <path
          d="M 108 14 L 146 14 L 146 26 L 132 26 L 132 82 L 120 82 L 120 26 L 108 26 Z"
          fill="#ffffff"
        />
      </g>

      {/* Curved Text Arc: GLOBAL TRANSYS TECHNOLOGY CO.,LTD */}
      <text fontSize="11" fontWeight="900" fill="#2e48d3" letterSpacing="0.4" fontFamily="Arial, sans-serif">
        <textPath href="#gtt-logo-text-arc-path" xlinkHref="#gtt-logo-text-arc-path" startOffset="0%">
          GLOBAL TRANSYS TECHNOLOGY CO.,LTD
        </textPath>
      </text>
    </svg>
  );
};

export const BusinessCardModal: React.FC<BusinessCardModalProps> = ({
  isOpen,
  onClose,
  employees,
  selectedEmployee,
  onEditEmployee,
  companyProfile
}) => {
  // Selected Employee State
  const [currentEmpId, setCurrentEmpId] = useState<string>(
    selectedEmployee?.id || (employees.length > 0 ? employees[0].id : '')
  );

  const activeEmp = employees.find(e => e.id === currentEmpId) || selectedEmployee || employees[0];

  // Form override state for customization
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [empImageUrl, setEmpImageUrl] = useState('');
  const [lineId, setLineId] = useState('');
  const [lineQrUrl, setLineQrUrl] = useState('');
  const [showPhoto, setShowPhoto] = useState(true);

  // Company details
  const [companyTh, setCompanyTh] = useState('บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด');
  const [companyEn, setCompanyEn] = useState('GLOBAL TRANSYS TECHNOLOGY CO., LTD.');
  const [addressTh, setAddressTh] = useState(
    'บริษัท โกลบอล ทรานซิส เทคโนโลยี จำกัด(สำนักงานใหญ่)\n68/253 หมู่ที่ 5 ตำบลลาดสวาย อำอลำลูกกา\nจังหวัดปทุมธานี 12150'
  );
  const [addressEn, setAddressEn] = useState(
    'GLOBAL TRANSYS TECHNOLOGY CO., LTD.\n68/253 Moo 5 Ladsawal, Lamlukka, Pathumthani 12150\nTel. 02-153-8834  เลขประจำตัวผู้เสียภาษี 0-1355-56013-09-7'
  );
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [theme, setTheme] = useState<'navy' | 'blue' | 'slate' | 'emerald'>('navy');

  const displayLogoUrl = companyProfile?.logoUrl || customLogoUrl || activeEmp?.companyLogoUrl || '';
  const displayCompanyTh = companyProfile?.companyTh || companyTh;
  const displayCompanyEn = companyProfile?.companyEn || companyEn;
  
  // UI States
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Ref for card node and hidden file inputs
  const cardRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const lineQrInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever selected employee changes or modal opens
  useEffect(() => {
    if (selectedEmployee) {
      setCurrentEmpId(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (activeEmp) {
      setNameTh(activeEmp.name || '');
      setNameEn(activeEmp.nickname ? activeEmp.nickname : '');
      setRole(activeEmp.role || 'ช่างประจำแผนก');
      setPhone(activeEmp.phone || '080-430-6887');
      setEmail(activeEmp.email || 'globaltransystechnology@gmail.com\nchalee@gtt2013.com');
      setEmpImageUrl(activeEmp.imageUrl || '');
      setLineId(activeEmp.lineId || '');
      setLineQrUrl(activeEmp.lineQrUrl || '');
      setCustomLogoUrl(activeEmp.companyLogoUrl || '');
    }
  }, [currentEmpId, activeEmp?.id, activeEmp?.name, activeEmp?.nickname, activeEmp?.role, activeEmp?.phone, activeEmp?.email, activeEmp?.imageUrl, activeEmp?.lineId, activeEmp?.lineQrUrl, activeEmp?.companyLogoUrl]);

  if (!isOpen) return null;

  // Handle Employee Dropdown selection
  const handleSelectEmployee = (empId: string) => {
    setCurrentEmpId(empId);
    setSaveSuccess(false);
  };

  // Handle Employee Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmpImageUrl(reader.result as string);
        setShowPhoto(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Custom Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Line QR Code Upload
  const handleLineQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLineQrUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save changes to system database
  const handleSaveToEmployee = async () => {
    if (!activeEmp || !onEditEmployee) return;
    try {
      setIsSaving(true);
      await onEditEmployee(activeEmp.id, {
        name: nameTh,
        nickname: nameEn,
        role: role,
        phone: phone,
        email: email,
        imageUrl: empImageUrl,
        lineId: lineId,
        lineQrUrl: lineQrUrl,
        companyLogoUrl: customLogoUrl
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save employee changes:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลพนักงาน');
    } finally {
      setIsSaving(false);
    }
  };

  // Download Handler using html2canvas
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Crisp 3x DPI for high-res print/download
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `BusinessCard_${nameTh.replace(/\s+/g, '_') || 'Employee'}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to download business card', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ภาพนามบัตร กรุณาลองใหม่อีกครั้ง');
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
      
      {/* Hidden File Inputs for Photo, Logo, and Line QR Code */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={lineQrInputRef}
        onChange={handleLineQrUpload}
        accept="image/*"
        className="hidden"
      />

      <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full transition-all duration-300 ${
        isZoomed ? 'max-w-6xl' : 'max-w-4xl'
      } flex flex-col overflow-hidden max-h-[92vh]`}>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-600 dark:text-blue-400">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-sans flex items-center gap-2">
                <span>สร้างนามบัตรพนักงาน (Employee Business Card)</span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold rounded-full">GTT Official</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ออกแบบ ถอดแบบตามมาตรฐานบริษัท เพิ่มรูปพนักงาน ปรับแต่ง และบันทึกลงระบบได้ทันที</p>
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
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} {emp.empCode ? `(${emp.empCode})` : ''} ({emp.role || 'พนักงาน'})
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
                      theme === t.id ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
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
                  แก้ไขข้อมูลนามบัตร
                </button>
              </div>
            </div>
          </div>

          {/* EDIT FORM TAB */}
          {activeTab === 'edit' && (
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-blue-500" />
                  แก้ไขข้อมูลบนนามบัตร และรูปภาพพนักงาน
                </h4>

                {/* Save Button in Form Header */}
                {onEditEmployee && (
                  <button
                    onClick={handleSaveToEmployee}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200 animate-bounce" />
                        <span>บันทึกสำเร็จ!</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกลงระบบ (Save Employee)'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Employee Photo Upload Field */}
                <div className="sm:col-span-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center shadow-xs">
                    {empImageUrl ? (
                      <img src={empImageUrl} alt="Employee Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">รูปถ่ายพนักงาน (Employee Photo)</label>
                    <p className="text-[11px] text-slate-500">แสดงรูปถ่ายพนักงานใต้ชื่อด้านขวาของนามบัตร</p>
                    
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>อัปโหลดรูปภาพใหม่</span>
                      </button>

                      {empImageUrl && (
                        <button
                          type="button"
                          onClick={() => setEmpImageUrl('')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          ลบรูปถ่าย
                        </button>
                      )}

                      <label className="flex items-center gap-1.5 ml-auto text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPhoto}
                          onChange={(e) => setShowPhoto(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span>แสดงรูปบนนามบัตร</span>
                      </label>
                    </div>
                  </div>
                </div>

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
                  <label className="text-[10px] font-bold text-slate-500">ชื่อ-นามสกุล / ชื่อเล่น (ภาษาอังกฤษ)</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Chalee Rodjanan"
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">อีเมลติดต่อ (แบ่งบรรทัดได้)</label>
                  <textarea
                    rows={2}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Line ID Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <span className="inline-block px-1 bg-[#06C755] text-white rounded text-[8px] font-black">LINE</span>
                    <span>Line ID (ชื่อไลน์ไอดีพนักงาน)</span>
                  </label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="เช่น @gtt2013 หรือ chalee"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Line QR Code Upload Box */}
                <div className="space-y-1 sm:col-span-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl flex items-center gap-4">
                  <div className="relative h-14 w-14 rounded-xl border border-emerald-300 dark:border-emerald-700 overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-xs">
                    {lineQrUrl ? (
                      <img src={lineQrUrl} alt="Line QR Code" className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <QrCode className="h-7 w-7 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 block flex items-center gap-1">
                      <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                      <span>อัปโหลดรูปภาพ Line QR Code (สำหรับโชว์บนนามบัตร)</span>
                    </label>
                    <p className="text-[10.5px] text-slate-500">สแกนจากนามบัตรเพื่อเพิ่มเพื่อนไลน์ได้ทันที</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => lineQrInputRef.current?.click()}
                        className="px-3 py-1 bg-[#06C755] hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{lineQrUrl ? 'เปลี่ยนรูป QR Code' : 'อัปโหลด QR Code'}</span>
                      </button>
                      {lineQrUrl && (
                        <button
                          type="button"
                          onClick={() => setLineQrUrl('')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          ลบรูป QR Code
                        </button>
                      )}
                    </div>
                  </div>
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

                {/* Company Logo Upload Box */}
                <div className="space-y-1 sm:col-span-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl flex items-center gap-4">
                  <div className="relative h-14 w-14 rounded-xl border border-indigo-300 dark:border-indigo-700 overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-xs p-1">
                    {displayLogoUrl ? (
                      <img src={displayLogoUrl} alt="Company Logo" className="h-full w-full object-contain" />
                    ) : (
                      <GTTLogo className="h-10 w-auto object-contain" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 block flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span>โลโก้บริษัท (ดึงมาจากระบบหลัก)</span>
                    </label>
                    <p className="text-[10.5px] text-slate-500 leading-relaxed">
                      โลโก้นี้เชื่อมโยงกับตั้งค่าองค์กรหลัก หากต้องการอัปโหลด/เปลี่ยนโลโก้บริษัท กรุณาไปที่เมนู <strong>"ตั้งค่า &gt; องค์กร &amp; โลโก้บริษัท"</strong> ด้านนอก
                    </p>
                  </div>
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
          <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950/10 dark:bg-slate-950/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden min-h-[400px]">
            
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* Scale Container */}
            <div className="w-full max-w-[720px] shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.01]">
              
              {/* THE ACTUAL BUSINESS CARD (Exact replica of GTT official layout) */}
              <div
                ref={cardRef}
                id="gtt-business-card"
                className="w-full aspect-[1.75/1] bg-white flex relative select-none font-sans overflow-hidden text-slate-800"
                style={{
                  minHeight: '390px',
                  boxSizing: 'border-box'
                }}
              >
                {/* LEFT SECTION - LIGHT WHITE BRANDING */}
                <div className="w-[38%] bg-white p-5 sm:p-7 flex flex-col items-center justify-between z-10 relative border-r border-slate-100">
                  
                  <div className="my-auto flex flex-col items-center text-center space-y-3">
                    {/* GTT Official / Custom Logo */}
                    {displayLogoUrl ? (
                      <img src={displayLogoUrl} alt="Company Logo" className="h-24 sm:h-28 w-auto object-contain max-w-[180px]" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <GTTLogo className="h-28 sm:h-32 w-auto object-contain drop-shadow-xs" />
                      </div>
                    )}

                    {/* Company Name below logo */}
                    <div className="pt-1 text-center">
                      <p className="text-[11px] sm:text-[12.5px] font-black text-slate-800 leading-tight">
                        {displayCompanyTh}
                      </p>
                      <p className="text-[8.5px] sm:text-[9.5px] font-extrabold text-slate-500 tracking-wider uppercase mt-1">
                        {displayCompanyEn}
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
                  <div className="z-10 space-y-2">
                    <div className="bg-white/95 text-slate-900 rounded-2xl px-5 py-2.5 shadow-lg border border-white/40 backdrop-blur-sm w-full text-center">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        {nameTh || 'ชาลี โรจนันท์'}
                      </h2>
                      {nameEn && (
                        <p className="text-[11px] sm:text-[12px] font-bold text-slate-600 tracking-wide font-sans">
                          {nameEn}
                        </p>
                      )}
                    </div>

                    {/* ROLE & EMPLOYEE PHOTO CONTAINER (Photo on the Right under Name) */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      
                      {/* Left: Role title */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-blue-100 tracking-wide font-sans drop-shadow-xs truncate">
                          {role || 'Software Engineer 2'}
                        </p>
                        {activeEmp?.empCode && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-white/10 text-white text-[9px] font-mono font-bold rounded-md border border-white/15">
                            #{activeEmp.empCode}
                          </span>
                        )}
                      </div>

                      {/* Right: Employee Photo Avatar (ใต้ชื่อ ด้านขวา) */}
                      {showPhoto && (
                        <div className="shrink-0 relative group">
                          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 border-white/90 shadow-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            {empImageUrl ? (
                              <img src={empImageUrl} alt={nameTh} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-full w-full bg-blue-900/60 flex items-center justify-center text-white text-xs font-black uppercase">
                                {nameTh ? nameTh.slice(0, 2) : 'GTT'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* BOTTOM SECTION: CONTACT & ADDRESS INFO WITH CIRCULAR ICON BADGES */}
                  <div className="space-y-2 text-[10px] sm:text-[10.5px] z-10 pt-1 font-sans">
                    
                    {/* 1. Phone Row */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white text-blue-800 flex items-center justify-center shrink-0 shadow-md">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-blue-800 text-blue-800" />
                      </div>
                      <span className="font-extrabold font-mono text-xs text-white tracking-wider drop-shadow-xs">
                        {phone || '080-430-6887'}
                      </span>
                    </div>

                    {/* 2. Email Row */}
                    <div className="flex items-start gap-2.5">
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white text-blue-800 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                        <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-800" />
                      </div>
                      <div className="flex flex-col text-[9px] sm:text-[10px] font-semibold text-blue-50 leading-tight space-y-0.5 font-mono">
                        {(email || 'globaltransystechnology@gmail.com\nchalee@gtt2013.com').split('\n').map((line, idx) => (
                          <span key={idx}>{line}</span>
                        ))}
                      </div>
                    </div>

                    {/* Line ID Row */}
                    {(lineId || lineQrUrl) && (
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[#06C755] text-white flex items-center justify-center shrink-0 shadow-md font-black text-[8.5px] sm:text-[9px] tracking-tight">
                          LINE
                        </div>
                        <span className="font-extrabold font-mono text-[10.5px] sm:text-xs text-emerald-300 tracking-wider drop-shadow-xs">
                          {lineId ? `LINE: ${lineId}` : 'Scan LINE QR Code'}
                        </span>
                      </div>
                    )}

                    {/* 3. Address Row */}
                    <div className="flex items-start gap-2.5 pt-0.5">
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white text-blue-800 flex items-center justify-center shrink-0 shadow-md mt-0.5">
                        <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-800" />
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-100 font-normal leading-snug space-y-0.5 max-w-[200px] sm:max-w-[240px]">
                        {addressTh.split('\n').map((line, idx) => (
                          <p key={`th_${idx}`} className="font-semibold text-white">{line}</p>
                        ))}
                        <div className="pt-0.5 opacity-90 border-t border-white/10 mt-0.5">
                          {addressEn.split('\n').map((line, idx) => (
                            <p key={`en_${idx}`} className="text-[7.5px] sm:text-[8.5px] font-mono text-blue-100">{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* LINE QR Code Badge Overlay on Card */}
                  {(lineQrUrl || lineId) && (
                    <div className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 flex flex-col items-center bg-white p-1 sm:p-1.5 rounded-xl shadow-2xl border border-emerald-400/40">
                      <div className="relative h-11 w-11 sm:h-13 sm:w-13 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                        {lineQrUrl ? (
                          <img src={lineQrUrl} alt="LINE QR Code" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-full w-full bg-emerald-50/70 flex flex-col items-center justify-center text-center p-0.5">
                            <QrCode className="h-5 w-5 text-emerald-600" />
                            <span className="text-[6px] font-black text-slate-700 uppercase leading-none mt-0.5 truncate max-w-full">{lineId || 'LINE'}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-0.5 bg-[#06C755] px-1 py-0.2 rounded text-[6.5px] sm:text-[7px] font-black text-white uppercase tracking-wider">
                        <span>LINE QR</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* Helper Caption */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 text-center font-medium">
              * อัตราส่วนและขนาดถอดแบบจากนามบัตรจริงของบริษัท GTT (3.5" x 2" Standard Print Spec)
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeEmp) {
                  setNameTh(activeEmp.name || '');
                  setNameEn(activeEmp.nickname || '');
                  setRole(activeEmp.role || 'ช่างประจำแผนก');
                  setPhone(activeEmp.phone || '080-430-6887');
                  setEmail(activeEmp.email || 'globaltransystechnology@gmail.com');
                  setEmpImageUrl(activeEmp.imageUrl || '');
                  setLineId(activeEmp.lineId || '');
                  setLineQrUrl(activeEmp.lineQrUrl || '');
                  setCustomLogoUrl(activeEmp.companyLogoUrl || '');
                } else {
                  setNameTh('ชาลี โรจนันท์');
                  setNameEn('Chalee Rodjanan');
                  setRole('Software Engineer 2');
                  setPhone('080-430-6887');
                  setEmail('globaltransystechnology@gmail.com\nchalee@gtt2013.com');
                  setLineId('');
                  setLineQrUrl('');
                  setCustomLogoUrl('');
                }
              }}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>รีเซ็ตเป็นข้อมูลเดิม</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Button in Footer */}
            {onEditEmployee && (
              <button
                onClick={handleSaveToEmployee}
                disabled={isSaving}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200 animate-bounce" />
                    <span>บันทึกสำเร็จ!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพนักงาน'}</span>
                  </>
                )}
              </button>
            )}

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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? 'กำลังสร้างไฟล์ภาพ...' : 'ดาวน์โหลดไฟล์ภาพ PNG'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
