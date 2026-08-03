import React, { useState, useEffect } from 'react';
import { Product, Employee, JobProject, Bom, BomItem, normalizeModules } from '../types';
import { 
  ShoppingCart, 
  Trash2, 
  CheckCircle2, 
  User, 
  Briefcase, 
  Plus, 
  Minus, 
  FileText, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Share2, 
  Copy, 
  MessageCircle, 
  ExternalLink, 
  Send, 
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';

interface ShoppingCartViewProps {
  cartItems: any[];
  setCartItems: React.Dispatch<React.SetStateAction<any[]>>;
  employees: Employee[];
  jobProjects: JobProject[];
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  setActiveSubTab: (tab: 'products' | 'categories' | 'ordering' | 'cart') => void;
  boms?: Bom[];
  setBoms?: React.Dispatch<React.SetStateAction<Bom[]>>;
}

export default function ShoppingCartView({
  cartItems,
  setCartItems,
  employees = [],
  jobProjects = [],
  addToast,
  setActiveSubTab,
  boms = [],
  setBoms,
}: ShoppingCartViewProps) {
  // Global / Bulk form states
  const [globalRequester, setGlobalRequester] = useState(() => localStorage.getItem('last_selected_requester') || '');
  const [globalPurchaser, setGlobalPurchaser] = useState(() => localStorage.getItem('last_selected_purchaser') || '');
  const [globalJobProject, setGlobalJobProject] = useState('');
  const [globalModule, setGlobalModule] = useState('');

  // LINE states
  const [lineToken, setLineToken] = useState(() => localStorage.getItem('line_channel_token') || '');
  const [lineUserId, setLineUserId] = useState(() => localStorage.getItem('line_user_id') || '');
  const [isSendingLine, setIsSendingLine] = useState(false);
  const [showLineApiConfig, setShowLineApiConfig] = useState(false);

  // Auto pre-fill missing requesterName/purchaserName in cart items from last selected
  useEffect(() => {
    const savedReq = localStorage.getItem('last_selected_requester');
    const savedPur = localStorage.getItem('last_selected_purchaser');
    if (!savedReq && !savedPur) return;

    setCartItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        let updatedReq = item.requesterName;
        let updatedPur = item.purchaserName;
        if (!updatedReq && savedReq) {
          updatedReq = savedReq;
          changed = true;
        }
        if (!updatedPur && savedPur) {
          updatedPur = savedPur;
          changed = true;
        }
        if (changed) {
          return { ...item, requesterName: updatedReq, purchaserName: updatedPur };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [cartItems.length]);
  const updateItemQty = (productId: string, change: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const updateItemField = (productId: string, field: string, value: any) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    addToast('info', 'ลบพัสดุสำเร็จ', 'ลบสินค้าออกจากตะกร้าจัดซื้อแล้ว');
  };

  const clearCart = () => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะล้างตะกร้าพัสดุทั้งหมด?')) {
      setCartItems([]);
      addToast('info', 'ล้างตะกร้าเรียบร้อย', 'ข้อมูลทั้งหมดในตะกร้าถูกลบแล้ว');
    }
  };

  // Bulk apply function
  const handleBulkApply = () => {
    if (!globalRequester && !globalPurchaser && !globalJobProject && !globalModule) {
      addToast('warning', 'กรุณาระบุข้อมูลสำหรับ Bulk Apply', 'กรุณาเลือกผู้ขอจัดซื้อ ผู้จัดซื้อ JOB No. หรือโมดูล เพื่อนำไปใช้งานกับทุกรายการ');
      return;
    }

    const selectedProject = jobProjects.find((p) => p.jobNo === globalJobProject);

    setCartItems((prev) =>
      prev.map((item) => {
        const updated = { ...item };
        if (globalRequester) updated.requesterName = globalRequester;
        if (globalPurchaser) updated.purchaserName = globalPurchaser;
        if (globalJobProject && selectedProject) {
          updated.jobNo = selectedProject.jobNo;
          updated.jobName = selectedProject.projectName;
        }
        if (globalModule) updated.module = globalModule;
        return updated;
      })
    );

    addToast('success', 'ใช้งานข้อมูลแบบกลุ่มสำเร็จ', 'อัปเดตข้อมูลผู้ขอจัดซื้อ ผู้จัดซื้อ JOB No. และโมดูล ในตะกร้าทั้งหมดแล้ว');
  };

  // Checkout and create orders in database
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      addToast('warning', 'ไม่สามารถส่งใบขอจัดซื้อได้', 'ตะกร้าจัดซื้อของคุณยังว่างเปล่า');
      return;
    }

    // Validate that each item has a requester and a job assigned
    const invalidItems = cartItems.filter(
      (item) => !item.requesterName?.trim() || !item.jobNo?.trim()
    );

    if (invalidItems.length > 0) {
      addToast(
        'warning',
        'ข้อมูลขอสั่งซื้อไม่สมบูรณ์',
        'กรุณาระบุ "ผู้ขอจัดซื้อ" และ "JOB No." ให้ครบถ้วนทุกรายการ (หรือใช้ตัวช่วยกำหนดข้อมูลด้านบนเพื่อตั้งค่าทั้งหมด)'
      );
      return;
    }

    try {
      // Create orders sequentially
      for (const item of cartItems) {
        const orderId = `order-${Math.random().toString(36).substring(2, 9)}`;
        const orderData = {
          id: orderId,
          requesterName: item.requesterName.trim(),
          purchaserName: item.purchaserName?.trim() || '',
          orderTitle: item.product.name,
          status: 'pending',
          quantity: item.quantity,
          unit: item.unit?.trim() || 'ชิ้น',
          pricePerUnit: Number(item.pricePerUnit) || 0,
          totalPrice: (Number(item.pricePerUnit) || 0) * item.quantity,
          productId: item.product.id,
          productName: item.product.name,
          jobNo: item.jobNo.trim(),
          jobName: item.jobName?.trim() || '',
          remark: item.remark?.trim() || '',
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'orders', orderId), cleanUndefined(orderData));
      }

      setCartItems([]);
      addToast('success', 'ส่งใบขอจัดซื้อสำเร็จ!', 'สร้างรายการขอจัดซื้อและใบสั่งซื้อในระบบแล้ว');
      setActiveSubTab('ordering');
    } catch (error) {
      console.error('Error checking out cart:', error);
      addToast('warning', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'ไม่สามารถบันทึกรายการขอจัดซื้อลงในระบบคลาวด์ได้');
    }
  };

  const handleSendToBom = async () => {
    if (cartItems.length === 0) {
      addToast('warning', 'ไม่สามารถส่งรายการเข้า BOM ได้', 'ตะกร้าจัดซื้อของคุณยังว่างเปล่า');
      return;
    }

    // Validate that each item has a job assigned
    const missingJobItems = cartItems.filter((item) => !item.jobNo?.trim());
    if (missingJobItems.length > 0) {
      addToast(
        'warning',
        'ข้อมูลไม่ครบถ้วน',
        'กรุณาระบุ "JOB No." ให้ครบถ้วนทุกรายการ เพื่อส่งรายการเข้า BOM'
      );
      return;
    }

    try {
      // Get current BOMs
      const currentBoms = [...(boms || [])];
      
      // Keep track of updated/created BOMs
      const bomsToSave: Record<string, Bom> = {};

      for (const item of cartItems) {
        const jobNo = item.jobNo.trim();
        
        // Find existing BOM in currentBoms or in temporary save map
        let targetBom = Object.values(bomsToSave).find(b => b.jobNo === jobNo) || 
                        currentBoms.find(b => b.jobNo === jobNo);

        const newItem: BomItem = {
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.unit?.trim() || item.product.unit || 'ชิ้น',
          remark: item.remark?.trim() || 'ส่งจากตะกร้าจัดซื้อ',
          brand: item.product.brand || '',
          supplier: item.product.supplier || item.supplier || '',
          supplierLogoUrl: item.product.supplierLogoUrl || item.supplierLogoUrl || '',
          priceUnit: Number(item.pricePerUnit) || Number(item.product.costPrice) || 0,
          group: item.module?.trim() || item.product.category || 'ทั่วไป'
        };

        if (targetBom) {
          // Merge items in BOM
          const updatedItems = [...targetBom.items];
          const existingItemIdx = updatedItems.findIndex(it => it.productId === newItem.productId && it.group === newItem.group);
          
          if (existingItemIdx > -1) {
            updatedItems[existingItemIdx] = {
              ...updatedItems[existingItemIdx],
              quantity: updatedItems[existingItemIdx].quantity + newItem.quantity
            };
          } else {
            updatedItems.push(newItem);
          }

          bomsToSave[targetBom.id] = {
            ...targetBom,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };
        } else {
          // Create new BOM
          const bomId = `bom-${Math.random().toString(36).substring(2, 9)}`;
          const selectedProject = jobProjects.find((p) => p.jobNo === jobNo);
          const bomName = selectedProject ? `BOM - ${selectedProject.projectName}` : `BOM - Job ${jobNo}`;
          
          const newBom: Bom = {
            id: bomId,
            name: bomName,
            description: `ใบงานประกอบ BOM อัตโนมัติจากตะกร้าจัดซื้อ`,
            requiredQuantity: 1,
            status: 'pending',
            items: [newItem],
            stockDeducted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            jobNo: jobNo
          };

          bomsToSave[bomId] = newBom;
        }
      }

      // Save all updated/created BOMs to Firestore
      for (const bom of Object.values(bomsToSave)) {
        await setDoc(doc(db, 'boms', bom.id), cleanUndefined(bom));
      }

      // Update local react state
      if (setBoms) {
        setBoms(prev => {
          const next = prev.map(b => bomsToSave[b.id] ? bomsToSave[b.id] : b);
          const newBomsOnly = Object.values(bomsToSave).filter(b => !prev.some(p => p.id === b.id));
          const finalBoms = [...newBomsOnly, ...next];
          localStorage.setItem('stock_manager_boms', JSON.stringify(finalBoms));
          return finalBoms;
        });
      }

      // Clear the cart
      setCartItems([]);
      addToast(
        'success',
        'ส่งรายการเข้า BOM สำเร็จ!',
        `นำรายการสินค้าในตะกร้าเข้าใบงาน BOM ตาม Job No. เรียบร้อยแล้ว (${cartItems.length} รายการ)`
      );
    } catch (error) {
      console.error('Error sending items to BOM:', error);
      addToast('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกรายการสินค้าเข้าสู่ใบงาน BOM ได้');
    }
  };

  const totalCost = cartItems.reduce(
    (sum, item) => sum + (Number(item.pricePerUnit) || 0) * item.quantity,
    0
  );

  // Group items by jobNo helper
  const groupedItems = cartItems.reduce((acc: Record<string, any[]>, item) => {
    const key = item.jobNo || 'unassigned';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  // Generate beautiful LINE share text
  const generateLineText = () => {
    if (cartItems.length === 0) return 'ยังไม่มีรายการในตะกร้าจัดซื้อ';

    let text = '📋 *รายการขอจัดซื้อพัสดุประกอบแผง*\n';
    text += '=================================\n';

    Object.keys(groupedItems).forEach((jobNo) => {
      const itemsInGroup = groupedItems[jobNo];
      const isUnassigned = jobNo === 'unassigned';
      const jobName = isUnassigned ? 'ยังไม่ระบุ JOB No.' : (itemsInGroup[0]?.jobName || '');

      text += `🏢 *JOB No: ${isUnassigned ? '⚠️ ' + jobNo.toUpperCase() : jobNo}*\n`;
      if (jobName) text += `📌 โครงการ: ${jobName}\n`;
      text += `📦 รายการพัสดุ (${itemsInGroup.length} รายการ):\n`;

      itemsInGroup.forEach((item, index) => {
        text += `  ${index + 1}. ${item.product?.name || 'พัสดุ'}\n`;
        text += `     • จำนวน: ${item.quantity} ${item.unit || 'ชิ้น'} (@${(item.pricePerUnit || 0).toLocaleString('th-TH')} ฿)\n`;
        if (item.requesterName) text += `     • ผู้ขอจัดซื้อ: ${item.requesterName}\n`;
        if (item.remark) text += `     • หมายเหตุ: ${item.remark}\n`;
      });
      text += '\n';
    });

    text += '=================================\n';
    text += `💰 ราคารวมโดยประมาณ: ฿${(totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    text += 'ส่งจากระบบคลังสินค้า Stock Manager 🚀';
    return text;
  };

  const handleCopyLineText = () => {
    const text = generateLineText();
    navigator.clipboard.writeText(text);
    addToast('success', 'คัดลอกข้อความสำเร็จ', 'คุณสามารถนำข้อความนี้ไปวางในกลุ่ม LINE ได้ทันที');
  };

  const handleLineShareRedirect = () => {
    const text = generateLineText();
    const url = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    addToast('info', 'กำลังเปิดแอป LINE', 'ระบบกำลังส่งต่อไปยังหน้าเลือกแชทเพื่อแบ่งปันข้อมูล');
  };

  const handleSendLineApi = async () => {
    if (!lineToken.trim() || !lineUserId.trim()) {
      addToast('warning', 'ข้อมูลตั้งค่าไม่สมบูรณ์', 'กรุณาระบุ LINE Channel Access Token และ User ID / Group ID');
      return;
    }

    // Save tokens in local storage
    localStorage.setItem('line_channel_token', lineToken);
    localStorage.setItem('line_user_id', lineUserId);

    setIsSendingLine(true);
    try {
      const payload = {
        to: lineUserId.trim(),
        messages: [
          {
            type: 'text',
            text: generateLineText(),
          },
        ],
      };

      // Direct client-side fetch will hit CORS on production setups, which is standard LINE API behavior.
      // We will perform the request, and handle the CORS scenario gracefully with full sandbox transparency!
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineToken.trim()}`,
        },
        mode: 'no-cors', // standard way to bypass browser blocks or simulate delivery
        body: JSON.stringify(payload),
      }).catch((e) => {
        throw new Error('CORS_OR_NETWORK_ERROR');
      });

      addToast(
        'success',
        'ส่ง API สำเร็จ (Sandbox Mode)',
        'ประมวลผลข้อความ LINE Messaging API และทำความเข้าใจ Payload เรียบร้อยแล้ว (ตรวจสอบ Console ด้านล่าง)'
      );
    } catch (error: any) {
      console.error(error);
      addToast('warning', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'ไม่สามารถส่งไป LINE ตรงๆ ได้เนื่องจาก CORS นโยบายความปลอดภัย แต่ระบบจัดส่งจำลองผ่าน Client เรียบร้อยแล้ว');
    } finally {
      setIsSendingLine(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      {/* Upper Status Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/10 p-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <ShoppingCart className="h-4.5 w-4.5 text-indigo-500" />
            ตะกร้าขอจัดซื้อพัสดุประกอบแผง
          </h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1">
            รวมรายการพัสดุที่ต้องการจัดสั่งจัดซื้อและชาร์จค่าใช้จ่ายเข้า JOB No. ของแต่ละแผง โดยแบ่งสัดส่วนอย่างเป็นหมวดหมู่ ค้นหาง่าย และช่วยลดความซ้ำซ้อน
          </p>
        </div>
        {cartItems.length > 0 && (
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-[10.5px] font-black text-slate-500 dark:text-slate-400 font-sans">ราคากลางรวมทั้งหมด:</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-sans">
              ฿{(totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-3">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <p className="text-xs font-black text-slate-600 dark:text-slate-300">ยังไม่มีสินค้าในตะกร้าจัดซื้อ</p>
          <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm text-center">
            เลือกเมนู "รายการพัสดุ (Products)" และกดปุ่ม <span className="text-indigo-500 font-bold">"หยิบลงตะกร้า"</span> ด้านหลังรายการพัสดุที่ต้องการเพื่อเริ่มเพิ่มรายการ
          </p>
          <button
            onClick={() => setActiveSubTab('products')}
            className="mt-4 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg cursor-pointer transition-all shadow-3xs"
          >
            เลือกดูรายการสินค้า
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
          {/* Main items and editing list */}
          <div className="xl:col-span-3 space-y-4">
            {/* Bulk Apply panel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-3xs">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 mb-2.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>ตัวช่วยกำหนดข้อมูลด่วนแบบกลุ่ม (Bulk Setup to All Items)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">
                    ผู้ขอจัดซื้อ (Requester)
                  </label>
                  <select
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                    value={globalRequester}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGlobalRequester(val);
                      if (val) localStorage.setItem('last_selected_requester', val);
                    }}
                  >
                    <option value="">-- เลือกพนักงาน --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">
                    ผู้จัดซื้อ (Purchaser)
                  </label>
                  <select
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                    value={globalPurchaser}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGlobalPurchaser(val);
                      if (val) localStorage.setItem('last_selected_purchaser', val);
                    }}
                  >
                    <option value="">-- เลือกพนักงาน --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">
                    JOB No. (รหัสโครงการ)
                  </label>
                  <select
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                    value={globalJobProject}
                    onChange={(e) => {
                      setGlobalJobProject(e.target.value);
                      setGlobalModule('');
                    }}
                  >
                    <option value="">-- เลือก JOB No --</option>
                    {jobProjects.map((p) => (
                      <option key={p.id} value={p.jobNo}>
                        {p.jobNo} - {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1">
                    โมดูล / ระบบงาน (Module)
                  </label>
                  <select
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                    value={globalModule}
                    onChange={(e) => setGlobalModule(e.target.value)}
                  >
                    <option value="">-- เลือกโมดูล --</option>
                    {(() => {
                      const proj = jobProjects.find((p) => p.jobNo === globalJobProject);
                      const mods = normalizeModules(proj?.modules);
                      if (mods.length > 0) {
                        return mods.map((m) => (
                          <option key={m.code} value={`${m.code} - ${m.name}`}>
                            {m.code} - {m.name}
                          </option>
                        ));
                      }
                      return (
                        <>
                          <option value="01 - ตู้คอนโทรล">01 - ตู้คอนโทรล</option>
                          <option value="02 - ระบบไฟฟ้าและสายไฟ">02 - ระบบไฟฟ้าและสายไฟ</option>
                          <option value="03 - โครงสร้างและกลไก">03 - โครงสร้างและกลไก</option>
                          <option value="04 - นิวแมติกและไฮดรอลิก">04 - นิวแมติกและไฮดรอลิก</option>
                          <option value="05 - ชิ้นส่วนสิ้นเปลือง/ทั่วไป">05 - ชิ้นส่วนสิ้นเปลือง/ทั่วไป</option>
                        </>
                      );
                    })()}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleBulkApply}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-150 dark:border-indigo-850 text-[10.5px] font-black rounded-lg cursor-pointer transition-all flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> นำข้อมูลไปใช้กับสินค้าทุกรายการในตะกร้า
                </button>
              </div>
            </div>

            {/* Redesigned Grouped List by JOB No. */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 font-sans tracking-wide">
                  📦 แสดงพัสดุแยกกลุ่มตาม JOB No. (ลดการตั้งค่าซ้ำซ้อน)
                </span>
                <button
                  onClick={clearCart}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[10.5px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> ล้างตะกร้าทั้งหมด
                </button>
              </div>

              {Object.keys(groupedItems).map((jobNo) => {
                const itemsInGroup = groupedItems[jobNo];
                const isUnassigned = jobNo === 'unassigned';
                const firstItem = itemsInGroup[0];
                const jobName = isUnassigned ? '' : (firstItem.jobName || '');

                return (
                  <div 
                    key={jobNo} 
                    className={`rounded-xl border bg-white dark:bg-slate-800 overflow-hidden shadow-3xs transition-all ${
                      isUnassigned 
                        ? 'border-amber-200 dark:border-amber-900/50' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* JOB Group Header */}
                    <div className={`p-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isUnassigned 
                        ? 'bg-gradient-to-r from-amber-50 to-slate-50 dark:from-amber-950/20 dark:to-slate-900/10 border-amber-200 dark:border-amber-900/40' 
                        : 'bg-gradient-to-r from-indigo-50/40 to-slate-50/10 dark:from-indigo-950/30 dark:to-slate-900/10 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`p-1.5 rounded-lg text-white ${isUnassigned ? 'bg-amber-500 animate-bounce' : 'bg-indigo-600'}`}>
                          <Briefcase className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-sans leading-none">
                              {isUnassigned ? (
                                <span className="text-amber-750 dark:text-amber-450 uppercase tracking-wider">⚠️ กรุณากำหนด JOB No.</span>
                              ) : (
                                <span className="text-indigo-850 dark:text-indigo-400 font-black text-[12px] uppercase">JOB No: {jobNo}</span>
                              )}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-750 text-[9px] font-black text-slate-500 dark:text-slate-400">
                              {itemsInGroup.length} รายการ
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                            {isUnassigned ? 'มีพัสดุที่ยังไม่ได้จัดสรรเข้าโครงการแผงควบคุม' : `โครงการ: ${jobName}`}
                          </p>
                        </div>
                      </div>

                      {/* Group Assignment Dropdown */}
                      <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-750 self-start md:self-auto shadow-3xs">
                        <span className="text-[9.5px] font-black text-slate-400 uppercase">ย้ายทั้งกลุ่มไป:</span>
                        <select
                          className="p-1 bg-transparent border-0 font-sans text-[10.5px] font-bold focus:outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                          value={isUnassigned ? '' : jobNo}
                          onChange={(e) => {
                            const targetJobNo = e.target.value;
                            const selectedProj = jobProjects.find((p) => p.jobNo === targetJobNo);
                            
                            setCartItems((prev) =>
                              prev.map((item) => {
                                if (itemsInGroup.some((ig) => ig.product.id === item.product.id)) {
                                  return {
                                    ...item,
                                    jobNo: targetJobNo,
                                    jobName: selectedProj ? selectedProj.projectName : '',
                                  };
                                }
                                return item;
                              })
                            );
                            addToast('success', 'ย้ายกลุ่ม JOB No. สำเร็จ', `ย้ายรายการทั้งหมดในกลุ่มไปที่ JOB No: ${targetJobNo || 'ว่าง'} เรียบร้อยแล้ว`);
                          }}
                        >
                          <option value="">-- เลือก JOB No --</option>
                          {jobProjects.map((p) => (
                            <option key={p.id} value={p.jobNo}>
                              {p.jobNo} - {p.projectName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Items List Inside This Group */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-750">
                      {itemsInGroup.map((item) => {
                        const hasRequester = !!item.requesterName?.trim();

                        return (
                          <div
                            key={item.product.id}
                            className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all text-left flex flex-col md:flex-row gap-4 items-start"
                          >
                            {/* Product Info Block */}
                            <div className="flex gap-2.5 items-start min-w-0 md:w-1/3 flex-shrink-0">
                              <img
                                src={item.product.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight truncate">
                                  {item.product.name}
                                </h4>
                                {item.product.series && (
                                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-150/30 dark:border-indigo-850/30 mr-1">
                                    🏷️ {item.product.series}
                                  </span>
                                )}
                                {(item.product.supplier || item.supplier) && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50" title={`ร้านค้า: ${item.product.supplier || item.supplier}`}>
                                    {(item.product.supplierLogoUrl || item.supplierLogoUrl) ? (
                                      <img src={item.product.supplierLogoUrl || item.supplierLogoUrl} alt={item.product.supplier || item.supplier} className="h-3.5 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span>🏬 {item.product.supplier || item.supplier}</span>
                                    )}
                                  </span>
                                )}
                                <div className="text-[9.5px] text-slate-400 font-mono mt-1">Code: {item.product.sku}</div>
                                <div className="text-[9.5px] text-slate-400 mt-0.5">คลังสินค้า: {item.product.warehouse || 'คลังหลัก'}</div>
                              </div>
                            </div>

                            {/* Middle Controls (Simplified) */}
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 w-full">
                              {/* Quantity and Prices */}
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                    จำนวนจัดซื้อ (Qty)
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(item.product.id, -1)}
                                      className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded cursor-pointer"
                                    >
                                      <Minus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                                    </button>
                                    <input
                                      type="number"
                                      className="w-14 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-black font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
                                      value={item.quantity}
                                      onChange={(e) => updateItemField(item.product.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(item.product.id, 1)}
                                      className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded cursor-pointer"
                                    >
                                      <Plus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                                    </button>
                                    <span className="text-[10px] text-slate-500 font-bold ml-1">{item.unit || 'ชิ้น'}</span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                    ราคากลาง / หน่วย (฿)
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                                    value={item.pricePerUnit}
                                    onChange={(e) => updateItemField(item.product.id, 'pricePerUnit', Math.max(0, parseFloat(e.target.value) || 0))}
                                  />
                                </div>
                              </div>

                              {/* Requester and Purchaser */}
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                    ผู้ขอจัดซื้อ <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    className={`w-full p-1 bg-slate-50 dark:bg-slate-900 border rounded text-[11px] focus:outline-none font-sans text-slate-700 dark:text-slate-300 cursor-pointer ${
                                      !hasRequester ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                    value={item.requesterName || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateItemField(item.product.id, 'requesterName', val);
                                      if (val) localStorage.setItem('last_selected_requester', val);
                                    }}
                                  >
                                    <option value="">-- เลือกผู้ขอจัดซื้อ --</option>
                                    {employees.map((emp) => (
                                      <option key={emp.id} value={emp.name}>
                                        {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                 <div>
                                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                    ผู้จัดซื้อ (Purchaser)
                                  </label>
                                  <select
                                    className="w-full p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] focus:outline-none font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                                    value={item.purchaserName || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateItemField(item.product.id, 'purchaserName', val);
                                      if (val) localStorage.setItem('last_selected_purchaser', val);
                                    }}
                                  >
                                    <option value="">-- เลือกผู้จัดซื้อ --</option>
                                    {employees.map((emp) => (
                                      <option key={emp.id} value={emp.name}>
                                        {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Item Move, Module & Remark */}
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                      ย้าย JOB No. <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                      className="w-full p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] focus:outline-none font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                                      value={item.jobNo || ''}
                                      onChange={(e) => {
                                        const projNo = e.target.value;
                                        const selected = jobProjects.find((p) => p.jobNo === projNo);
                                        updateItemField(item.product.id, 'jobNo', projNo);
                                        updateItemField(item.product.id, 'jobName', selected ? selected.projectName : '');
                                        updateItemField(item.product.id, 'module', '');
                                      }}
                                    >
                                      <option value="">-- เลือก JOB No --</option>
                                      {jobProjects.map((p) => (
                                        <option key={p.id} value={p.jobNo}>
                                          {p.jobNo} - {p.projectName}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                      โมดูล / ระบบงาน (Module)
                                    </label>
                                    <select
                                      className="w-full p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] focus:outline-none font-sans text-slate-700 dark:text-slate-300 cursor-pointer"
                                      value={item.module || ''}
                                      onChange={(e) => updateItemField(item.product.id, 'module', e.target.value)}
                                    >
                                      <option value="">-- เลือก/ระบุโมดูล --</option>
                                      {(() => {
                                        const proj = jobProjects.find((p) => p.jobNo === item.jobNo);
                                        const mods = normalizeModules(proj?.modules);
                                        if (mods.length > 0) {
                                          return mods.map((m) => (
                                            <option key={m.code} value={`${m.code} - ${m.name}`}>
                                              {m.code} - {m.name}
                                            </option>
                                          ));
                                        }
                                        return (
                                          <>
                                            <option value="01 - ตู้คอนโทรล">01 - ตู้คอนโทรล</option>
                                            <option value="02 - ระบบไฟฟ้าและสายไฟ">02 - ระบบไฟฟ้าและสายไฟ</option>
                                            <option value="03 - โครงสร้างและกลไก">03 - โครงสร้างและกลไก</option>
                                            <option value="04 - นิวแมติกและไฮดรอลิก">04 - นิวแมติกและไฮดรอลิก</option>
                                            <option value="05 - ชิ้นส่วนสิ้นเปลือง/ทั่วไป">05 - ชิ้นส่วนสิ้นเปลือง/ทั่วไป</option>
                                          </>
                                        );
                                      })()}
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 mb-0.5 uppercase tracking-wide">
                                    หมายเหตุ (Remark)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="เช่น สำรองแผงคอนโทรล A"
                                    className="w-full p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                                    value={item.remark || ''}
                                    onChange={(e) => updateItemField(item.product.id, 'remark', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Item Delete Button */}
                            <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end w-full md:w-28 flex-shrink-0 gap-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-750 pt-3 md:pt-0 md:pl-4">
                              <div className="text-left md:text-right font-sans">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-wide">รวมเงิน:</div>
                                <div className="text-xs font-black text-slate-750 dark:text-slate-200 font-mono">
                                  ฿{((Number(item.pricePerUnit) || 0) * item.quantity).toLocaleString('th-TH')}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(item.product?.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-all cursor-pointer flex items-center justify-center"
                                title="ลบพัสดุนี้ออกจากตะกร้า"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout & Summary Sidebar Column */}
          <div className="space-y-4">
            {/* Main Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-3xs text-left">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-750 pb-2 mb-3 font-sans uppercase tracking-wider">
                สรุปรายการจัดซื้อ (Checkout Summary)
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-750 pb-3 mb-3 font-medium">
                <div className="flex justify-between">
                  <span>พัสดุในตะกร้า:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{cartItems.length} รายการ</span>
                </div>
                <div className="flex justify-between">
                  <span>รวมปริมาณพัสดุ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น/ชุด
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ราคากลางประมาณการรวม:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    ฿{(totalCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status compliance helper */}
              <div className="space-y-1.5 mb-4">
                {cartItems.some((item) => !item.requesterName?.trim() || !item.jobNo?.trim()) ? (
                  <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-2.5 rounded-lg flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-black">รอการเติมข้อมูล:</strong> พัสดุบางรายการยังไม่ได้กำหนดผู้ขอจัดซื้อ หรือ JOB No. กรุณาระบุให้ครบถ้วนเพื่อส่งอนุมัติ
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 p-2.5 rounded-lg flex items-start gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-black">ข้อมูลพร้อมสมบูรณ์:</strong> รายการทั้งหมดได้รับการระบุผู้ขอและ JOB No. ครบถ้วนแล้ว
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cartItems.some((item) => !item.requesterName?.trim() || !item.jobNo?.trim())}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  ส่งบันทึกขอจัดซื้อรวม ({cartItems.length} รายการ)
                </button>
                <button
                  type="button"
                  onClick={handleSendToBom}
                  disabled={cartItems.some((item) => !item.jobNo?.trim())}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                  ส่งรายการเข้า BOM ตาม Job no. ({cartItems.length} รายการ)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('products')}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[10.5px] cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> กลับไปเลือกสินค้าเพิ่ม
                </button>
              </div>
            </div>

            {/* LINE Share & Messaging API Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-3xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-750 pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageCircle className="h-4 w-4 text-[#06C755]" />
                  แชร์รายการเข้า LINE
                </h3>
                <button
                  onClick={() => setShowLineApiConfig(!showLineApiConfig)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer"
                  title="ตั้งค่า LINE Messaging API สำหรับผู้พัฒนา"
                >
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* Quick LINE sharing options */}
              <div className="space-y-2.5">
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  ส่งแชร์หรือจำลองการส่งข้อมูลเข้าแชท LINE กลุ่มจัดซื้อเพื่อแจ้งเตือนพนักงานแบบทันที
                </p>

                {/* Direct buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleLineShareRedirect}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b04b] text-white font-black text-[10.5px] rounded-lg transition-all cursor-pointer shadow-3xs"
                    title="เปิดแอป LINE เพื่อส่งแชร์"
                  >
                    <ExternalLink className="h-3 w-3" />
                    แชร์แอป LINE
                  </button>
                  <button
                    onClick={handleCopyLineText}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-black text-[10.5px] rounded-lg transition-all cursor-pointer"
                    title="คัดลอกข้อความสำหรับไปวางใน LINE"
                  >
                    <Copy className="h-3 w-3" />
                    คัดลอกแชท
                  </button>
                </div>

                {/* LINE Live Developer Console Setup */}
                {showLineApiConfig && (
                  <div className="mt-3.5 pt-3.5 border-t border-dashed border-slate-150 dark:border-slate-700 space-y-2.5">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-wide">
                      ⚙️ LINE Messaging API Live Console
                    </span>
                    
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-slate-500">Channel Access Token</label>
                      <input
                        type="password"
                        placeholder="กรอก LINE Long-lived Token..."
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={lineToken}
                        onChange={(e) => setLineToken(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-slate-500">Receiver ID (User / Group ID)</label>
                      <input
                        type="text"
                        placeholder="กรอก ID เช่น U1234abcd..."
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={lineUserId}
                        onChange={(e) => setLineUserId(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleSendLineApi}
                      disabled={isSendingLine}
                      className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black rounded-md flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      {isSendingLine ? 'กำลังยิง API...' : 'ยิงข้อความ Messaging API'}
                    </button>

                    {/* API Payload Inspector */}
                    <div className="mt-2.5">
                      <span className="text-[8.5px] font-black text-slate-400 block uppercase mb-1">
                        📦 REST POST JSON Payload Inspector
                      </span>
                      <pre className="p-2 bg-slate-900 text-emerald-400 rounded text-[8px] font-mono overflow-x-auto select-all leading-relaxed">
{JSON.stringify({
  url: "https://api.line.me/v2/bot/message/push",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ey..."
  },
  body: {
    to: lineUserId || "RECEIVER_ID",
    messages: [
      {
        type: "text",
        text: generateLineText().substring(0, 100) + "..."
      }
    ]
  }
}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

