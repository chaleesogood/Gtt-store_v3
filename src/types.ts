export interface CompanyProfile {
  companyTh: string;
  companyEn: string;
  addressTh: string;
  addressEn: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string; // Used as PART NUMBER & MODEL
  category: string;
  series?: string; // Sub-series e.g. "1 Pole", "3 Pole"
  price: number; // Retail Price
  costPrice: number; // Cost price/Unit
  quantity: number;
  minAlert: number;
  image: string; // Base64 string or image URL
  description: string;
  brand?: string; // BRAND NAME e.g., SCHNEIDER
  unit?: string; // UNIT e.g., PCS
  supplier?: string; // SUPPLIER
  supplierLogoUrl?: string; // SUPPLIER LOGO (Base64 or URL)
  subStore?: string; // SUB STORE NAME (e.g. Shopee Official Store)
  subStoreLogoUrl?: string; // SUB STORE LOGO
  subStoreLink?: string; // SUB STORE E-COMMERCE LINK
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
  warehouse?: string; // WAREHOUSE LOCATION
  color?: string; // Selected color name for this product
  sortOrder?: number; // Custom sorting order for display
  modelNumber?: number | string; // ตัวเลข (รุ่น)
  modelUnit?: 'Kg' | 'mm' | 'A' | 'W' | 'V' | 'Hp' | 'Pin' | 'Ch' | 'Rpm' | 'M.' | string; // หน่วยเลือกได้
  compatibleWith?: string; // ใช้ร่วมกับ รายการอื่น / Compatible with other items
}

export interface SubSeries {
  name: string;
  imageUrl?: string;
  pdfUrl?: string;
}

export interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'document' | 'other';
  fileType?: string;
  url: string;
  size?: number;
  category?: string;
  refId?: string;
  refName?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string; // Base64 or image URL
  documentIds?: string[]; // IDs of attached documents in Media Library
  createdAt: string;
}

export interface SubStore {
  id: string;
  name: string; // ชื่อร้านค้าย่อย / สาขา E-commerce (e.g. Shopee Official, Lazada Mall, TikTok Shop, Direct Web)
  platform?: 'Shopee' | 'Lazada' | 'TikTok' | 'Line' | 'Facebook' | 'Website' | 'Other' | string;
  logoUrl?: string; // รูปภาพ/โลโก้ร้านค้าย่อย
  link?: string; // ลิงก์ URL ร้านค้าย่อย E-commerce
}

export interface Supplier {
  id: string;
  name: string; // ชื่อร้านค้าหลัก / Supplier Name
  logoUrl?: string; // Logo ร้านค้าหลัก (Base64 or image URL)
  contactName?: string; // ชื่อผู้ติดต่อ
  phone?: string; // เบอร์โทรศัพท์
  email?: string; // อีเมล
  website?: string; // เว็บไซต์ / ลิงก์ร้านค้าหลัก
  address?: string; // ที่อยู่
  subStores?: SubStore[]; // กลุ่มร้านค้าย่อย E-commerce / สาขาออนไลน์
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string; // Hex or tailwind class name
  imageUrl?: string; // Main image URL
  series?: string[]; // List of sub-series under this category
  subSeries?: SubSeries[]; // Rich list of sub-series with name and image
}

export interface StockActivity {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjust'; // stock in, stock out (sell), manual adjust
  quantityChange: number;
  oldQuantity: number;
  newQuantity: number;
  reason: string;
  timestamp: string;
  userId?: string; // UID/ID ผู้ใช้งานที่เข้าสู่ระบบ
  userName?: string; // ชื่อผู้ทำรายการ/ผู้แก้ไข
  userEmail?: string; // อีเมลผู้แก้ไข
  creatorEmail?: string; // อีเมลผู้สร้างรายการ
  userPhotoUrl?: string; // รูปโปรไฟล์ผู้แก้ไข
  imageUrl?: string; // รูปแนบหลักฐานการทำรายการ/สลิป
  productImage?: string; // รูปสินค้าขณะทำรายการ
}

export interface BomItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string; // e.g. PCS
  remark?: string; // e.g. ขอราคาแล้ว
  brand?: string; // e.g. SCHNEIDER
  supplier?: string; // e.g. RS Components, Shopee
  supplierLogoUrl?: string; // Logo URL/Base64 of store
  subStore?: string; // Sub-store name
  subStoreLogoUrl?: string; // Sub-store logo
  subStoreLink?: string; // Sub-store e-commerce link
  prNo?: string; // e.g. P.R-GTT2605-0794
  poNo?: string;
  priceUnit?: number; // Custom override or reference price
  group?: string; // e.g. ระบบโครงสร้าง, ระบบไฟฟ้า
}

export interface Bom {
  id: string;
  name: string;
  description: string;
  items: BomItem[];
  jobNo?: string; // หมายเลขใบสั่งงาน / Job Number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; // สถานะดำเนินการ
  requiredQuantity: number; // จำนวนชุดเครื่องจักรที่ผลิต/ประกอบ
  stockDeducted: boolean; // มีการตัดสต็อกวัตถุดิบประกอบแล้วหรือยัง
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  jobNo?: string; // หมายเลขใบสั่งงาน / Job Number
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  bomId: string;
  requiredQuantity: number; // multiplier of how many BOM sets we are building
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  stockDeducted?: boolean;
}

export interface ProductOrder {
  id: string;
  requesterName: string; // ชื่อผู้ขอสั่งซื้อ
  purchaserName?: string; // ชื่อผู้จัดซื้อ/ผู้ดำเนินการ
  orderTitle: string; // ชื่อสั่งซื้อ
  jobNo?: string; // เลขที่ Job / Job.No
  jobName?: string; // ชื่อ Job / Job.Name
  status: 'pending' | 'quotation' | 'ordered' | 'approved' | 'paid' | 'received' | 'cancelled'; // สถานะติดตามของ
  quantity: number; // จำนวนสั่งซื้อ
  unit?: string; // หน่วยนับ e.g. PCS, ม้วน, เมตร
  pricePerUnit?: number; // ราคาต่อหน่วย
  totalPrice?: number; // ราคารวม
  productId?: string; // สินค้าผูกมัดในคลัง (สำหรับรับเข้าคลังโดยอัตโนมัติ)
  productName?: string; // ชื่อสินค้าที่ผูกในคลัง
  prNo?: string; // เลขที่ใบขอซื้อ (PR No.)
  poNo?: string; // เลขที่ใบสั่งซื้อ (PO No.)
  supplier?: string; // ผู้จัดจำหน่าย/ซัพพลายเออร์ (Supplier)
  supplierLogoUrl?: string; // Logo ผู้จัดจำหน่าย/ซัพพลายเออร์
  subStore?: string; // ร้านค้าย่อย E-commerce
  subStoreLogoUrl?: string; // Logo ร้านค้าย่อย E-commerce
  subStoreLink?: string; // ลิงก์ร้านค้าย่อย E-commerce
  quotationNo?: string; // เลขที่ใบเสนอราคา (Quotation No.)
  approverName?: string; // ชื่อผู้อนุมัติ (Approver)
  paymentRef?: string; // ข้อมูลอ้างอิงการโอนเงิน/ชำระเงิน (Payment Ref)
  remark?: string; // หมายเหตุ
  createdAt: string; // เวลาเสนอสั่งซื้อ (Step 1: Pending / ขอซื้อ)
  quotationAt?: string; // Step 2: ขอใบเสนอราคา
  orderedAt?: string; // Step 3: เปิด PR/PO
  approvedAt?: string; // Step 4: อนุมัติ PR/PO
  paidAt?: string; // Step 5: โอนเงิน / ชำระเงิน
  shippingAt?: string; // สำหรับรองรับข้อมูลเก่า (ย้ายเป็นขั้นตอนโอนเงิน/ส่งของ)
  receivedAt?: string; // Step 6: ส่งของ / รับเข้าคลัง
  receivedQty?: number; // จำนวนที่รับของเข้า
  cancelledAt?: string; // เวลาที่ยกเลิกรายการ
  updatedAt?: string; // เวลาอัปเดตล่าสุด
}

export interface Job {
  id: string;
  jobNo: string; // JOB No.
  module: string; // Module / ระบบงาน
  assignee: string; // ผู้รับผิดชอบ (Responsible person)
  description: string; // รายละเอียดงาน
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; // สถานะงาน
  priority: 'low' | 'medium' | 'high'; // ระดับความสำคัญ
  targetDate?: string; // กำหนดเสร็จ (YYYY-MM-DD)
  imageUrl?: string; // รูปงานเสร็จสิ้น/ความคืบหน้า
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  empCode?: string;  // รหัสพนักงาน (e.g. EMP-001, INT-001)
  name: string;
  nickname?: string; // ชื่อเล่น พนักงาน
  email?: string;    // Email พนักงาน
  department?: 'Accounting' | 'Electrical' | 'Assembly' | 'Machine Shop' | 'Design' | 'Welding' | 'Owner' | 'Intern' | string; // แผนกงาน
  orgLevel?: 'owner' | 'head' | 'team' | 'intern' | string; // ลำดับขั้น: เจ้าของบริษัท / หัวหน้าแผนก / ลูกทีม / น้องฝึกงาน
  role?: string;     // ตำแหน่งงาน
  phone?: string;
  createdAt: string;
  imageUrl?: string; // รูปถ่ายพนักงาน
  cardColor?: string; // สีพื้นหลังการ์ดสำหรับจัดรูปแบบ
  lineId?: string; // Line ID พนักงาน
  lineQrUrl?: string; // รูปภาพ Line QR Code
  companyLogoUrl?: string; // รูปโลโก้บริษัท
}

export interface SubModuleItem {
  name: string;
  imageUrl?: string;
  quantity?: number; // General quantity (sets of sub-modules)
  qtyInput?: number; // Quantity of Inputs (DI)
  qtyOutput?: number; // Quantity of Outputs (DO)
  addressInput?: string;
  addressOutput?: string;
  subModules?: (string | SubModuleItem)[]; // Sub-module ชั้น 2
}

export interface ProjectModule {
  code: string;       // เลขโมดูล (e.g. "01")
  name: string;       // ชื่อโมดูล (e.g. "ตู้คอนโทรล")
  imageUrl?: string;  // รูปภาพโมดูล
  subModules?: (string | SubModuleItem)[]; // รายการ Sub-module ย่อย (ชั้น 1)
}

export interface EngineeringPhaseSchedule {
  id: string;
  jobNo: string;            // JOB No.
  projectName?: string;     // ชื่อโปรเจกต์
  moduleCode?: string;      // รหัสโมดูล
  moduleName: string;       // ชื่อโมดูล / ระบบงาน
  subModuleName?: string;   // Sub Module / หัวข้อย่อย
  isBypassed?: boolean;     // สถานะ Bypass (ไม่ต้องมีสถานะ / ข้ามโมดูลนี้)
  addressIo?: string;       // Address IO (e.g. "I:0.0 / O:1.2" หรือรายละเอียด IO)
  imageUrl?: string;        // รูปภาพโมดูล / ภาพประกอบ
  installStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed';  // Install (ติดตั้ง)
  wiringStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed';   // Wiring (เดินสายไฟ)
  testIoStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed';   // Test IO (ทดสอบ IO)
  manualHmiStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed';// Manual HMI (ทดสอบ Manual)
  semiAutoStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed'; // Semi-Auto (ทดสอบ Semi-Auto)
  autoStatus: 'pending' | 'in_progress' | 'completed' | 'bypassed';     // Auto (ทดสอบ Auto สมบูรณ์)
  assignee: string;         // ผู้รับผิดชอบ (Responsible person)
  remark: string;           // Remark / หมายเหตุ
  targetDate?: string;      // กำหนดเสร็จ
  updatedAt: string;
}

export interface JobProject {
  id: string;
  jobNo: string; // JOB No.
  year: string;  // ปี (e.g. 2026)
  customer: string; // ลูกค้า (Customer)
  projectName: string; // ชื่อโครงการ
  createdAt: string;
  modules?: ProjectModule[]; // โมดูลงานประจำโปรเจกต์
  projectImageUrl?: string; // รูปภาพโครงการ
  googleSheetUrl?: string; // ไฟล์ Google Sheet ประจำโครงการสำหรับแก้ไขรายละเอียด
}

export function normalizeSubModulesList(subs: any[] | undefined): SubModuleItem[] {
  if (!subs) return [];
  return subs.map((sub: any) => {
    if (typeof sub === 'string') {
      return { name: sub, quantity: 1, subModules: [] };
    }
    return {
      name: sub.name || '',
      imageUrl: sub.imageUrl || '',
      quantity: sub.quantity || 1,
      qtyInput: sub.qtyInput,
      qtyOutput: sub.qtyOutput,
      addressInput: sub.addressInput || '',
      addressOutput: sub.addressOutput || '',
      subModules: normalizeSubModulesList(sub.subModules)
    };
  });
}

export function normalizeModules(modules: any[] | undefined): ProjectModule[] {
  if (!modules) return [];
  return modules.map((m, index) => {
    if (typeof m === 'string') {
      const match = m.match(/^(\d+)\s*[-:]?\s*(.*)$/);
      if (match) {
        return {
          code: match[1],
          name: match[2].trim() || m,
          imageUrl: '',
          subModules: []
        };
      }
      return {
        code: String(index + 1).padStart(2, '0'),
        name: m,
        imageUrl: '',
        subModules: []
      };
    }
    return {
      code: m.code || '',
      name: m.name || '',
      imageUrl: m.imageUrl || '',
      subModules: normalizeSubModulesList(m.subModules)
    };
  });
}

export interface DailyReport {
  id: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  reportTitle: string; // หัวข้อรายงานประจำวัน
  jobsDetail: string; // รายละเอียดความคืบหน้างาน/ชิ้นงานที่ปฏิบัติ
  problems?: string; // ปัญหา / อุปสรรคที่พบ
  remark?: string; // หมายเหตุ/คำร้องขอเพิ่มเติม
  hoursWorked?: number; // จำนวนชั่วโมงปฏิบัติงาน
  status: 'pending_review' | 'reviewed'; // สถานะตรวจทานการรีวิว
  reviewedBy?: string; // ผู้อนุมัติ/ผู้ตรวจสอบรีวิว
  reviewComment?: string; // ความคิดเห็นเพิ่มเติมหลังตรวจสอบ
  createdAt: string;
  updatedAt: string;
}

export function sortProducts(list: Product[]): Product[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
    } else if (a.sortOrder !== undefined) {
      return -1;
    } else if (b.sortOrder !== undefined) {
      return 1;
    }
    return (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });
  });
}

export interface UserRole {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  provider?: string; // e.g. 'google', 'password', 'pre-registered'
  role: 'admin' | 'editor' | 'user'; // admin = Full Control; editor = Add, Edit, View; user = View, Add, Edit but CANNOT delete
  status?: 'active' | 'pending' | 'disabled'; // active = approved to use app; pending = waiting for admin activation; disabled = account suspended
  createdAt: string;
  lastSeen?: string;
  isOnline?: boolean;
}



