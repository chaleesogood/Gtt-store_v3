import React, { useState, useEffect } from 'react';
import { Product, ProductOrder, Employee, JobProject } from '../types';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { 
  ShoppingCart, 
  User, 
  Clock, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  DollarSign, 
  X, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  PackageCheck,
  AlertCircle,
  Eye,
  Printer,
  Edit3,
  ArrowUpDown,
  CheckSquare,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

interface OrderingSystemViewProps {
  products: Product[];
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  onAdjustStock: (productId: string, change: number, reason: string, imageUrl?: string) => Promise<void>;
  preselectedProductId?: string;
  onClearPreselectedProductId?: () => void;
  employees: Employee[];
  jobProjects: JobProject[];
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export default function OrderingSystemView({ 
  products, 
  addToast, 
  onAdjustStock,
  preselectedProductId,
  onClearPreselectedProductId,
  employees = [],
  jobProjects = []
}: OrderingSystemViewProps) {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto open form and set product on preselect
  useEffect(() => {
    if (preselectedProductId) {
      setSelectedProductId(preselectedProductId);
      setIsFormOpen(true);
      if (onClearPreselectedProductId) {
        onClearPreselectedProductId();
      }
    }
  }, [preselectedProductId]);

  // Form states (Create)
  const [requesterName, setRequesterName] = useState(() => localStorage.getItem('last_selected_requester') || '');
  const [purchaserName, setPurchaserName] = useState(() => localStorage.getItem('last_selected_purchaser') || '');
  const [orderTitle, setOrderTitle] = useState('');
  const [jobNo, setJobNo] = useState('');
  const [jobName, setJobName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('ชิ้น');
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [prNo, setPrNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quotationNo, setQuotationNo] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Edit Modal States
  const [editingOrder, setEditingOrder] = useState<ProductOrder | null>(null);
  const [editRequesterName, setEditRequesterName] = useState('');
  const [editPurchaserName, setEditPurchaserName] = useState('');
  const [editOrderTitle, setEditOrderTitle] = useState('');
  const [editJobNo, setEditJobNo] = useState('');
  const [editJobName, setEditJobName] = useState('');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('ชิ้น');
  const [editPricePerUnit, setEditPricePerUnit] = useState<number>(0);
  const [editSelectedProductId, setEditSelectedProductId] = useState<string>('');
  const [editRemark, setEditRemark] = useState('');
  const [editStatus, setEditStatus] = useState<ProductOrder['status']>('pending');
  const [editPrNo, setEditPrNo] = useState('');
  const [editPoNo, setEditPoNo] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editQuotationNo, setEditQuotationNo] = useState('');
  const [editApproverName, setEditApproverName] = useState('');
  const [editPaymentRef, setEditPaymentRef] = useState('');

  // Step-by-step confirmation states
  const [confirmingStatusOrder, setConfirmingStatusOrder] = useState<ProductOrder | null>(null);
  const [confirmingTargetStatus, setConfirmingTargetStatus] = useState<ProductOrder['status'] | null>(null);
  const [stepQuotationNo, setStepQuotationNo] = useState('');
  const [stepSupplier, setStepSupplier] = useState('');
  const [stepPrNo, setStepPrNo] = useState('');
  const [stepPoNo, setStepPoNo] = useState('');
  const [stepApproverName, setStepApproverName] = useState('');
  const [stepPaymentRef, setStepPaymentRef] = useState('');

  // Purchase Order Document View State
  const [viewingPoOrder, setViewingPoOrder] = useState<ProductOrder | null>(null);

  // Search, Filter, Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeStatusTab, setActiveStatusTab] = useState<'active' | 'received' | 'all'>('active');
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalPrice' | 'quantity'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'job' | 'all'>('job');
  const [collapsedJobs, setCollapsedJobs] = useState<string[]>([]);

  // Intake Modal state
  const [intakeOrder, setIntakeOrder] = useState<ProductOrder | null>(null);
  const [intakeQty, setIntakeQty] = useState<number>(1);

  // Firestore error handler conforming to firebase-integration skill
  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errInfo: FirestoreErrorInfo = {
      error: errorMsg,
      authInfo: {
        userId: localStorage.getItem('admin_email'),
        email: localStorage.getItem('admin_email')
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    
    const isQuota = errorMsg.toLowerCase().includes('quota') || 
                    errorMsg.toLowerCase().includes('limit') || 
                    errorMsg.toLowerCase().includes('exceed') || 
                    errorMsg.toLowerCase().includes('resource_exhausted') || 
                    errorMsg.toLowerCase().includes('permission-denied');
    
    if (isQuota) {
      addToast('warning', 'ฐานข้อมูล Cloud เต็มโควต้า (Quota Exceeded)', 'ระบบสลับไปใช้ข้อมูลสำรองในเบราว์เซอร์ชั่วคราว ข้อมูลยังคงปลอดภัยดี');
    } else {
      addToast('warning', 'เกิดข้อผิดพลาดคลังข้อมูล (Firestore)', errorMsg);
      throw new Error(JSON.stringify(errInfo));
    }
  };

  // Sync orders from Firestore
  useEffect(() => {
    const path = 'orders';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ProductOrder[] = [];
      snapshot.forEach((document) => {
        list.push({ id: document.id, ...document.data() } as ProductOrder);
      });
      setOrders(list);
      localStorage.setItem('stock_manager_orders_list', JSON.stringify(list));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      const saved = localStorage.getItem('stock_manager_orders_list');
      if (saved) {
        setOrders(JSON.parse(saved));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Autofill create form if product selected
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        setOrderTitle(prod.name);
        setPricePerUnit(prod.costPrice || prod.price || 0);
        setUnit(prod.unit || 'ชิ้น');
      }
    }
  }, [selectedProductId, products]);

  // Autofill edit form if product selected during editing
  useEffect(() => {
    if (editSelectedProductId && editingOrder) {
      const prod = products.find(p => p.id === editSelectedProductId);
      if (prod) {
        setEditOrderTitle(prod.name);
        setEditPricePerUnit(prod.costPrice || prod.price || 0);
        setEditUnit(prod.unit || 'ชิ้น');
      }
    }
  }, [editSelectedProductId]);

  // Handle Create Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !orderTitle.trim() || quantity <= 0) {
      addToast('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้ขอสั่งซื้อ ชื่อสั่งซื้อ และจำนวนสินค้า');
      return;
    }

    const orderId = `order-${Math.random().toString(36).substring(2, 9)}`;
    const matchedProduct = products.find(p => p.id === selectedProductId);
    
    const newOrder: any = {
      id: orderId,
      requesterName: requesterName.trim(),
      orderTitle: orderTitle.trim(),
      status: 'pending',
      quantity,
      unit: unit.trim() || 'ชิ้น',
      createdAt: new Date().toISOString()
    };

    if (jobNo.trim()) {
      newOrder.jobNo = jobNo.trim();
    }
    if (jobName.trim()) {
      newOrder.jobName = jobName.trim();
    }
    if (purchaserName.trim()) {
      newOrder.purchaserName = purchaserName.trim();
    }
    if (pricePerUnit > 0) {
      newOrder.pricePerUnit = pricePerUnit;
      newOrder.totalPrice = pricePerUnit * quantity;
    }
    if (selectedProductId) {
      newOrder.productId = selectedProductId;
    }
    if (matchedProduct) {
      newOrder.productName = matchedProduct.name;
    }
    if (remark.trim()) {
      newOrder.remark = remark.trim();
    }
    if (prNo.trim()) {
      newOrder.prNo = prNo.trim();
    }
    if (poNo.trim()) {
      newOrder.poNo = poNo.trim();
    }
    if (supplierName.trim()) {
      newOrder.supplier = supplierName.trim();
    }
    if (quotationNo.trim()) {
      newOrder.quotationNo = quotationNo.trim();
    }

    const path = `orders/${orderId}`;
    
    // Optimistic Update
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem('stock_manager_orders_list', JSON.stringify(updatedOrders));

    try {
      await setDoc(doc(db, 'orders', orderId), cleanUndefined(newOrder));
      addToast('success', 'สร้างใบขอสั่งซื้อสำเร็จ', `บันทึกคำสั่งซื้อ "${orderTitle}" เรียบร้อยแล้ว`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setRequesterName('');
      setPurchaserName('');
      setOrderTitle('');
      setJobNo('');
      setJobName('');
      setQuantity(1);
      setUnit('ชิ้น');
      setPricePerUnit(0);
      setSelectedProductId('');
      setRemark('');
      setPrNo('');
      setPoNo('');
      setSupplierName('');
      setQuotationNo('');
      setIsFormOpen(false);
    }
  };

  // Open Edit Modal and load current values
  const handleOpenEdit = (order: ProductOrder) => {
    setEditingOrder(order);
    setEditRequesterName(order.requesterName);
    setEditPurchaserName(order.purchaserName || '');
    setEditOrderTitle(order.orderTitle);
    setEditJobNo(order.jobNo || '');
    setEditJobName(order.jobName || '');
    setEditQuantity(order.quantity);
    setEditUnit(order.unit || 'ชิ้น');
    setEditPricePerUnit(order.pricePerUnit || 0);
    setEditSelectedProductId(order.productId || '');
    setEditRemark(order.remark || '');
    setEditStatus(order.status);
    setEditPrNo(order.prNo || '');
    setEditPoNo(order.poNo || '');
    setEditSupplier(order.supplier || '');
    setEditQuotationNo(order.quotationNo || '');
    setEditApproverName(order.approverName || '');
    setEditPaymentRef(order.paymentRef || '');
  };

  // Save changes to Order (Edit)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editRequesterName.trim() || !editOrderTitle.trim() || editQuantity <= 0) {
      addToast('warning', 'ข้อมูลไม่ครบครัน', 'กรุณากรอกชื่อผู้สั่งซื้อ ชื่อพัสดุ และระบุจำนวนที่มีค่ามากกว่า 0');
      return;
    }

    const path = `orders/${editingOrder.id}`;
    const matchedProduct = products.find(p => p.id === editSelectedProductId);
    
    const updatedFields: any = {
      requesterName: editRequesterName.trim(),
      purchaserName: editPurchaserName.trim() || null,
      orderTitle: editOrderTitle.trim(),
      jobNo: editJobNo.trim() || null,
      jobName: editJobName.trim() || null,
      quantity: editQuantity,
      unit: editUnit.trim() || 'ชิ้น',
      status: editStatus,
      prNo: editPrNo.trim() || null,
      poNo: editPoNo.trim() || null,
      supplier: editSupplier.trim() || null,
      quotationNo: editQuotationNo.trim() || null,
      approverName: editApproverName.trim() || null,
      paymentRef: editPaymentRef.trim() || null
    };

    if (editPricePerUnit > 0) {
      updatedFields.pricePerUnit = editPricePerUnit;
      updatedFields.totalPrice = editPricePerUnit * editQuantity;
    } else {
      updatedFields.pricePerUnit = null;
      updatedFields.totalPrice = null;
    }

    if (editSelectedProductId) {
      updatedFields.productId = editSelectedProductId;
      updatedFields.productName = matchedProduct ? matchedProduct.name : '';
    } else {
      updatedFields.productId = null;
      updatedFields.productName = null;
    }

    if (editRemark.trim()) {
      updatedFields.remark = editRemark.trim();
    } else {
      updatedFields.remark = null;
    }

    const nowStr = new Date().toISOString();
    if (editStatus === 'pending') {
      updatedFields.quotationAt = null;
      updatedFields.orderedAt = null;
      updatedFields.approvedAt = null;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'quotation') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = null;
      updatedFields.approvedAt = null;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'ordered') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = null;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'approved') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = editingOrder.approvedAt || nowStr;
      updatedFields.paidAt = null;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'paid') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = editingOrder.approvedAt || nowStr;
      updatedFields.paidAt = editingOrder.paidAt || nowStr;
      updatedFields.receivedAt = null;
      updatedFields.receivedQty = null;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'received') {
      updatedFields.quotationAt = editingOrder.quotationAt || nowStr;
      updatedFields.orderedAt = editingOrder.orderedAt || nowStr;
      updatedFields.approvedAt = editingOrder.approvedAt || nowStr;
      updatedFields.paidAt = editingOrder.paidAt || nowStr;
      updatedFields.receivedAt = editingOrder.receivedAt || nowStr;
      updatedFields.receivedQty = editingOrder.receivedQty || editQuantity;
      updatedFields.cancelledAt = null;
    } else if (editStatus === 'cancelled') {
      updatedFields.cancelledAt = editingOrder.cancelledAt || nowStr;
    }

    // Optimistic Update
    const updatedOrder = { ...editingOrder, ...updatedFields };
    const updatedOrders = orders.map(o => o.id === editingOrder.id ? updatedOrder : o);
    setOrders(updatedOrders);
    localStorage.setItem('stock_manager_orders_list', JSON.stringify(updatedOrders));

    try {
      await updateDoc(doc(db, 'orders', editingOrder.id), updatedFields);
      addToast('success', 'ปรับปรุงใบสั่งซื้อสำเร็จ', `บันทึกการแก้ไขรายการ "${editOrderTitle}" เรียบร้อย`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setEditingOrder(null);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (id: string, title: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่ต้องการลบใบสั่งซื้อ "${title}" ออกจากระบบ?`)) {
      const path = `orders/${id}`;
      
      // Optimistic Update
      const updatedOrders = orders.filter(o => o.id !== id);
      setOrders(updatedOrders);
      localStorage.setItem('stock_manager_orders_list', JSON.stringify(updatedOrders));

      try {
        await deleteDoc(doc(db, 'orders', id));
        addToast('info', 'ลบใบสั่งซื้อสำเร็จ', `ลบรายการสั่งซื้อ "${title}" เรียบร้อย`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: ProductOrder['status'],
    additionalFields: Partial<ProductOrder> = {}
  ) => {
    const path = `orders/${orderId}`;
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const nowStr = new Date().toISOString();
    const updates: any = { status: newStatus, ...additionalFields };
    
    if (newStatus === 'pending') {
      updates.quotationAt = null;
      updates.orderedAt = null;
      updates.approvedAt = null;
      updates.paidAt = null;
      updates.receivedAt = null;
      updates.receivedQty = null;
      updates.cancelledAt = null;
    } else if (newStatus === 'quotation') {
      updates.quotationAt = currentOrder.quotationAt || nowStr;
      updates.orderedAt = null;
      updates.approvedAt = null;
      updates.paidAt = null;
      updates.receivedAt = null;
      updates.receivedQty = null;
      updates.cancelledAt = null;
    } else if (newStatus === 'ordered') {
      updates.quotationAt = currentOrder.quotationAt || nowStr;
      updates.orderedAt = currentOrder.orderedAt || nowStr;
      updates.approvedAt = null;
      updates.paidAt = null;
      updates.receivedAt = null;
      updates.receivedQty = null;
      updates.cancelledAt = null;
    } else if (newStatus === 'approved') {
      updates.quotationAt = currentOrder.quotationAt || nowStr;
      updates.orderedAt = currentOrder.orderedAt || nowStr;
      updates.approvedAt = currentOrder.approvedAt || nowStr;
      updates.paidAt = null;
      updates.receivedAt = null;
      updates.receivedQty = null;
      updates.cancelledAt = null;
    } else if (newStatus === 'paid') {
      updates.quotationAt = currentOrder.quotationAt || nowStr;
      updates.orderedAt = currentOrder.orderedAt || nowStr;
      updates.approvedAt = currentOrder.approvedAt || nowStr;
      updates.paidAt = currentOrder.paidAt || nowStr;
      updates.receivedAt = null;
      updates.receivedQty = null;
      updates.cancelledAt = null;
    } else if (newStatus === 'received') {
      updates.quotationAt = currentOrder.quotationAt || nowStr;
      updates.orderedAt = currentOrder.orderedAt || nowStr;
      updates.approvedAt = currentOrder.approvedAt || nowStr;
      updates.paidAt = currentOrder.paidAt || nowStr;
      updates.receivedAt = currentOrder.receivedAt || nowStr;
      updates.receivedQty = currentOrder.receivedQty || currentOrder.quantity;
      updates.cancelledAt = null;
    } else if (newStatus === 'cancelled') {
      updates.cancelledAt = currentOrder.cancelledAt || nowStr;
    }

    // Optimistic Update
    const updatedOrder = { ...currentOrder, ...updates };
    const updatedOrders = orders.map(o => o.id === orderId ? updatedOrder : o);
    setOrders(updatedOrders);
    localStorage.setItem('stock_manager_orders_list', JSON.stringify(updatedOrders));

    try {
      await updateDoc(doc(db, 'orders', orderId), updates);
      
      let statusThai = '';
      switch (newStatus) {
        case 'pending': statusThai = 'ขอซื้อ'; break;
        case 'quotation': statusThai = 'ขอใบเสนอราคา'; break;
        case 'ordered': statusThai = 'เปิด PR/PO'; break;
        case 'approved': statusThai = 'อนุมัติ PR/PO'; break;
        case 'paid': statusThai = 'โอนเงิน'; break;
        case 'received': statusThai = 'ส่งของ / สำเร็จ'; break;
        case 'cancelled': statusThai = 'ยกเลิกรายการ'; break;
      }
      
      addToast('success', 'อัปเดตสถานะสำเร็จ', `เปลี่ยนสถานะใบสั่งซื้อเป็น "${statusThai}"`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Initiate step transition with details check
  const initiateStatusTransition = (order: ProductOrder, targetStatus: ProductOrder['status']) => {
    if (targetStatus === 'received') {
      openIntakeModal(order);
      return;
    }
    if (targetStatus === 'pending' || targetStatus === 'cancelled') {
      handleUpdateStatus(order.id, targetStatus);
      return;
    }

    // Set default fields and open modal
    setConfirmingStatusOrder(order);
    setConfirmingTargetStatus(targetStatus);
    setStepQuotationNo(order.quotationNo || '');
    setStepSupplier(order.supplier || '');
    setStepPrNo(order.prNo || getRequisitionNumber(order));
    setStepPoNo(order.poNo || '');
    setStepApproverName(order.approverName || localStorage.getItem('admin_email')?.split('@')[0] || '');
    setStepPaymentRef(order.paymentRef || '');
  };

  // Handle confirmation save for step-by-step fields
  const handleConfirmStepSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingStatusOrder || !confirmingTargetStatus) return;

    const fields: any = {};
    if (confirmingTargetStatus === 'quotation') {
      fields.quotationNo = stepQuotationNo.trim() || null;
      fields.supplier = stepSupplier.trim() || null;
    } else if (confirmingTargetStatus === 'ordered') {
      fields.prNo = stepPrNo.trim() || null;
      fields.poNo = stepPoNo.trim() || null;
      if (stepSupplier.trim()) {
        fields.supplier = stepSupplier.trim();
      }
    } else if (confirmingTargetStatus === 'approved') {
      fields.approverName = stepApproverName.trim() || null;
    } else if (confirmingTargetStatus === 'paid') {
      fields.paymentRef = stepPaymentRef.trim() || null;
    }

    await handleUpdateStatus(confirmingStatusOrder.id, confirmingTargetStatus, fields);
    
    // reset states
    setConfirmingStatusOrder(null);
    setConfirmingTargetStatus(null);
  };

  // Open intake modal
  const openIntakeModal = (order: ProductOrder) => {
    setIntakeOrder(order);
    setIntakeQty(order.quantity);
  };

  // Execute intake to stock
  const handleExecuteIntake = async () => {
    if (!intakeOrder) return;

    const path = `orders/${intakeOrder.id}`;
    
    const nowStr = new Date().toISOString();
    const updates: any = {
      status: 'received',
      quotationAt: intakeOrder.quotationAt || nowStr,
      orderedAt: intakeOrder.orderedAt || nowStr,
      approvedAt: intakeOrder.approvedAt || nowStr,
      paidAt: intakeOrder.paidAt || nowStr,
      receivedAt: intakeOrder.receivedAt || nowStr,
      receivedQty: intakeQty
    };

    // Optimistic Update
    const updatedOrder = { ...intakeOrder, ...updates };
    const updatedOrders = orders.map(o => o.id === intakeOrder.id ? updatedOrder : o);
    setOrders(updatedOrders);
    localStorage.setItem('stock_manager_orders_list', JSON.stringify(updatedOrders));

    try {
      if (intakeOrder.productId) {
        const reason = `นำเข้าพัสดุจากใบสั่งซื้อโดย ${intakeOrder.requesterName} (รหัสใบสั่งซื้อ: ${intakeOrder.id})`;
        await onAdjustStock(intakeOrder.productId, intakeQty, reason);
      }

      await updateDoc(doc(db, 'orders', intakeOrder.id), updates);

      addToast(
        'success', 
        'รับของเข้าคลังเรียบร้อย', 
        `ปรับปรุงสถานะ และนำเข้า ${intakeQty} ${intakeOrder.unit || 'ชิ้น'} ของ "${intakeOrder.orderTitle}" เข้าสู่คลังสำเร็จ`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIntakeOrder(null);
    }
  };

  // Sort and Filters implementation
  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = 
        (o.orderTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.requesterName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.purchaserName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.prNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.poNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.quotationNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.jobNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.remark && o.remark.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesStatusTab = true;
      if (activeStatusTab === 'active') {
        matchesStatusTab = o.status !== 'received' && o.status !== 'cancelled';
      } else if (activeStatusTab === 'received') {
        matchesStatusTab = o.status === 'received';
      } else if (activeStatusTab === 'all') {
        matchesStatusTab = true;
      }

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatusTab && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        const valA = String(a.createdAt || '');
        const valB = String(b.createdAt || '');
        comparison = valA.localeCompare(valB);
      } else if (sortBy === 'totalPrice') {
        const valA = a.totalPrice || 0;
        const valB = b.totalPrice || 0;
        comparison = valA - valB;
      } else if (sortBy === 'quantity') {
        const valA = a.quantity || 0;
        const valB = b.quantity || 0;
        comparison = valA - valB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // KPI calculations
  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'ordered' || o.status === 'shipping' || o.status === 'quotation' || o.status === 'approved' || o.status === 'paid').length;
  const completedCount = orders.filter(o => o.status === 'received').length;
  
  const totalSpend = orders
    .filter(o => o.status !== 'cancelled' && o.totalPrice)
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  };

  // Helper to generate professional Requisition Numbers
  const getRequisitionNumber = (order: ProductOrder) => {
    if (!order.createdAt) return `PR-GEN-${order.id.slice(-4).toUpperCase()}`;
    const dateStr = order.createdAt.split('T')[0].replace(/-/g, '');
    return `PR-${dateStr}-${order.id.slice(-4).toUpperCase()}`;
  };

  // Group by Job No logic
  const groupedJobs = React.useMemo(() => {
    const groups: { [key: string]: { jobNo: string; jobName: string; orders: ProductOrder[] } } = {};
    
    filteredOrders.forEach(o => {
      const key = o.jobNo ? o.jobNo.trim() : 'UNASSIGNED';
      if (!groups[key]) {
        groups[key] = {
          jobNo: o.jobNo ? o.jobNo.trim() : '',
          jobName: o.jobName ? o.jobName.trim() : '',
          orders: []
        };
      }
      groups[key].orders.push(o);
    });

    return Object.values(groups).sort((a, b) => {
      if (!a.jobNo) return 1;
      if (!b.jobNo) return -1;
      return (a.jobNo || '').localeCompare(b.jobNo || '');
    });
  }, [filteredOrders]);

  const toggleJobCollapsed = (jobNo: string) => {
    const key = jobNo || 'UNASSIGNED';
    setCollapsedJobs(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getStatusBadge = (status: ProductOrder['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-amber-50 text-amber-700 border-amber-200">1. ขอซื้อ</span>;
      case 'quotation':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-purple-50 text-purple-700 border-purple-200">2. ใบเสนอราคา</span>;
      case 'ordered':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-blue-50 text-blue-700 border-blue-200">3. เปิด PR/PO</span>;
      case 'approved':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-teal-50 text-teal-700 border-teal-200">4. อนุมัติแล้ว</span>;
      case 'paid':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-indigo-50 text-indigo-700 border-indigo-200">5. โอนเงินแล้ว</span>;
      case 'received':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-emerald-50 text-emerald-700 border-emerald-200">6. รับของสำเร็จ</span>;
      case 'cancelled':
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-rose-50 text-rose-700 border-rose-200">ยกเลิกจัดซื้อ</span>;
      default:
        return <span className="px-1.5 py-0.2 text-[9px] font-black rounded border bg-slate-50 text-slate-700 border-slate-200">รอตรวจ</span>;
    }
  };

  const renderStatusTrackerInline = (order: ProductOrder) => {
    let statusStepIndex = 0;
    switch (order.status) {
      case 'pending': statusStepIndex = 1; break;
      case 'quotation': statusStepIndex = 2; break;
      case 'ordered': statusStepIndex = 3; break;
      case 'approved': statusStepIndex = 4; break;
      case 'paid': statusStepIndex = 5; break;
      case 'received': statusStepIndex = 6; break;
    }
    
    if (order.status === 'cancelled') {
      return <span className="text-[9px] text-rose-600 font-bold font-sans">ยกเลิกแล้ว</span>;
    }

    const steps = [
      { step: 1, key: 'pending', label: 'ขอซื้อ' },
      { step: 2, key: 'quotation', label: 'เสนอราคา' },
      { step: 3, key: 'ordered', label: 'PR/PO' },
      { step: 4, key: 'approved', label: 'อนุมัติ' },
      { step: 5, key: 'paid', label: 'โอนเงิน' },
      { step: 6, key: 'received', label: 'รับพัสดุ' }
    ];

    return (
      <div className="flex items-center gap-0.5" title="คลิกปุ่มเพื่อเปลี่ยนสถานะด่วน">
        {steps.map((st) => {
          const isActive = statusStepIndex >= st.step;
          const isCurrent = statusStepIndex === st.step;
          return (
            <button
              key={st.step}
              type="button"
              onClick={() => initiateStatusTransition(order, st.key as any)}
              className={`px-1 py-0.2 text-[8px] rounded transition-all font-sans cursor-pointer ${
                isCurrent 
                  ? 'bg-indigo-600 text-white font-black scale-102 border border-indigo-600'
                  : isActive
                    ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-bold border border-indigo-100'
                    : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'
              }`}
              title={`เปลี่ยนสถานะเป็น: ${st.label}`}
            >
              {st.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3.5 text-left">
      
      {/* Title & Toggle Form Bar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100/60">
        <div className="flex items-center gap-1.5">
          <ShoppingCart className="h-4.5 w-4.5 text-indigo-600" />
          <h2 className="text-xs font-black text-slate-800 font-sans uppercase tracking-wider">
            ระบบจัดซื้อและสั่งซื้อพัสดุ (Procurement)
          </h2>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>{isFormOpen ? 'ปิดหน้าต่างใบขอซื้อ' : 'เปิดใบขอเสนอจัดซื้อใหม่'}</span>
        </button>
      </div>

      {/* Stats Board (Flat & Dense) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <div 
          onClick={() => setActiveStatusTab('all')}
          className={`bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between cursor-pointer transition-colors ${
            activeStatusTab === 'all' ? 'bg-indigo-50/30 border-indigo-200' : 'hover:bg-slate-50/60'
          }`}
        >
          <span className="text-[10px] text-slate-500 font-sans">ใบขอซื้อสะสม:</span>
          <span className="text-xs font-black text-slate-800 font-mono">{totalOrdersCount} รายการ</span>
        </div>

        <div 
          onClick={() => setActiveStatusTab('active')}
          className={`bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between cursor-pointer transition-colors ${
            activeStatusTab === 'active' ? 'bg-amber-50/30 border-amber-200' : 'hover:bg-slate-50/60'
          }`}
        >
          <span className="text-[10px] text-slate-500 font-sans">กำลังดำเนินการ (1-5):</span>
          <span className="text-xs font-black text-amber-700 font-mono">{pendingCount + inProgressCount} รายการ</span>
        </div>

        <div 
          onClick={() => setActiveStatusTab('received')}
          className={`bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between cursor-pointer transition-colors ${
            activeStatusTab === 'received' ? 'bg-emerald-50/30 border-emerald-200' : 'hover:bg-slate-50/60'
          }`}
        >
          <span className="text-[10px] text-slate-500 font-sans">รับสต็อก/สำเร็จแล้ว:</span>
          <span className="text-xs font-black text-emerald-700 font-mono">{completedCount} รายการ</span>
        </div>

        <div className="bg-slate-50/40 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-sans">รวมงบประมาณจัดซื้อ:</span>
          <span className="text-xs font-black text-indigo-600 font-mono">฿{(totalSpend || 0).toLocaleString('th-TH')}</span>
        </div>
      </div>

      {/* Collapsible Create Form (Spreadsheet style, Flat & Borderless) */}
      {isFormOpen && (
        <form onSubmit={handleCreateOrder} className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[11px] font-sans space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
            <span className="font-black text-slate-700 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5 text-indigo-600" /> กรอกข้อมูลใบเสนอจัดซื้อพัสดุ
            </span>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            
            {/* Requester name */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">ผู้ขอซื้อ / แผนกงาน *</label>
              <select
                required
                className="w-full px-2 py-0.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                value={requesterName || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setRequesterName(val);
                  if (val) localStorage.setItem('last_selected_requester', val);
                }}
              >
                <option value="">-- เลือกผู้ขอซื้อ --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                  </option>
                ))}
              </select>
            </div>

            {/* Purchaser name */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">คนจัดซื้อ / ผู้ดำเนินการ</label>
              <select
                className="w-full px-2 py-0.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                value={purchaserName || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setPurchaserName(val);
                  if (val) localStorage.setItem('last_selected_purchaser', val);
                }}
              >
                <option value="">-- เลือกคนจัดซื้อ --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                  </option>
                ))}
              </select>
            </div>

            {/* Job Number */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">Job.No (หมายเลขงาน)</label>
              <select
                className="w-full px-2 py-0.5 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                value={jobNo || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setJobNo(val);
                  const matchedProj = jobProjects.find(p => p.jobNo === val);
                  if (matchedProj) {
                    setJobName(matchedProj.projectName);
                  } else {
                    setJobName('');
                  }
                }}
              >
                <option value="">-- เลือกหมายเลขงาน --</option>
                {jobProjects.map((p) => (
                  <option key={p.id} value={p.jobNo}>
                    {p.jobNo} {p.projectName ? `- ${p.projectName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Name */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">Job.Name (ชื่องาน)</label>
              <input
                type="text"
                disabled
                placeholder="จะเลือกตามหมายเลขงานอัตโนมัติ"
                className="w-full px-2 py-0.5 bg-slate-100 border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] text-slate-600 font-medium"
                value={jobName || ''}
                onChange={(e) => setJobName(e.target.value)}
              />
            </div>

            {/* Link to Inventory Product */}
            <div className="space-y-0.5 md:col-span-2">
              <label className="font-bold text-slate-500">เชื่อมโยงสินค้าที่มีอยู่ในคลังสต็อก</label>
              <select
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">-- เป็นสินค้าพัสดุภายนอก (ไม่ได้เก็บสต็อก) --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `[${p.sku}]` : ''} - คลัง: {p.quantity} {p.unit || 'ชิ้น'}
                  </option>
                ))}
              </select>
            </div>

            {/* Order item title */}
            <div className="space-y-0.5 md:col-span-2">
              <label className="font-bold text-slate-500">ชื่อรายการพัสดุที่ขอสั่งซื้อ *</label>
              <input
                type="text"
                required
                disabled={!!selectedProductId}
                placeholder="ระบุชื่อพัสดุ อุปกรณ์ หรืออะไหล่"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                value={orderTitle || ''}
                onChange={(e) => setOrderTitle(e.target.value)}
              />
            </div>

            {/* Qty */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">จำนวนสั่ง *</label>
              <input
                type="number"
                required
                min={1}
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            {/* Unit */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">หน่วยนับ</label>
              <input
                type="text"
                disabled={!!selectedProductId}
                placeholder="ชิ้น, ตัว, ม้วน"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                value={unit || ''}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            {/* Price Per Unit */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">ราคาทุนต่อหน่วย (บาท)</label>
              <input
                type="number"
                min={0}
                placeholder="เช่น 150"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold text-indigo-900"
                value={pricePerUnit || ''}
                onChange={(e) => setPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            {/* PR No. */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">เลขที่ PR (PR No.)</label>
              <input
                type="text"
                placeholder="เช่น PR-2026-001 (ว่างเพื่อเจนอัตโนมัติ)"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold"
                value={prNo || ''}
                onChange={(e) => setPrNo(e.target.value)}
              />
            </div>

            {/* PO No. */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">เลขที่ PO (PO No.)</label>
              <input
                type="text"
                placeholder="เช่น PO-2026-001"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold text-indigo-900"
                value={poNo || ''}
                onChange={(e) => setPoNo(e.target.value)}
              />
            </div>

            {/* Supplier / Store */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">ร้านค้า / ซัพพลายเออร์ (Supplier)</label>
              <input
                type="text"
                placeholder="ระบุชื่อบริษัท/ร้านค้า"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                value={supplierName || ''}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>

            {/* Quotation No */}
            <div className="space-y-0.5">
              <label className="font-bold text-slate-500">เลขใบเสนอราคา (QT No.)</label>
              <input
                type="text"
                placeholder="เช่น QT-2026-001"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono"
                value={quotationNo || ''}
                onChange={(e) => setQuotationNo(e.target.value)}
              />
            </div>

            {/* Remark / Link */}
            <div className="space-y-0.5 md:col-span-3">
              <label className="font-bold text-slate-500">หมายเหตุ / ลิงก์ร้านค้า</label>
              <input
                type="text"
                placeholder="ลิงก์สั่งซื้อ หรือรายละเอียดแนบ"
                className="w-full px-2 py-0.5 bg-white border border-slate-255 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                value={remark || ''}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>

          </div>

          <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-200">
            {pricePerUnit > 0 && (
              <span className="text-[10px] text-slate-500 font-bold mr-auto self-center">
                ประมาณราคารวม: <strong className="text-indigo-600 font-mono">฿{((pricePerUnit || 0) * (quantity || 0)).toLocaleString('th-TH')}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-3 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="h-2.5 w-2.5" /> บันทึกใบขอซื้อ
            </button>
          </div>
        </form>
      )}

      {/* Advanced Filter, Search, Mode Selection Bar */}
      <div className="bg-slate-50 p-1 rounded-lg flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-52">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-slate-400">
              <Search className="h-3 w-3" />
            </span>
            <input
              type="text"
              placeholder="สืบค้นพัสดุจัดซื้อ..."
              className="w-full pl-6 pr-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="order-search"
            />
          </div>

          {/* Grouping Mode */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('job')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border font-sans transition-all flex items-center gap-0.5 cursor-pointer ${
                viewMode === 'job'
                  ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                  : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Briefcase className="h-2.5 w-2.5" />
              <span>แยกตาม JOB No.</span>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border font-sans transition-all flex items-center gap-0.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                  : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <ShoppingCart className="h-2.5 w-2.5" />
              <span>แสดงทั้งหมด</span>
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveStatusTab('active')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border font-sans transition-all cursor-pointer ${
                activeStatusTab === 'active'
                  ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                  : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
            >
              กำลังดำเนินการ ({orders.filter(o => o.status !== 'received' && o.status !== 'cancelled').length})
            </button>
            <button
              onClick={() => setActiveStatusTab('received')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border font-sans transition-all cursor-pointer ${
                activeStatusTab === 'received'
                  ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                  : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
            >
              รับของแล้ว ({orders.filter(o => o.status === 'received').length})
            </button>
            <button
              onClick={() => setActiveStatusTab('all')}
              className={`px-2 py-0.5 rounded text-[9.5px] font-bold border font-sans transition-all cursor-pointer ${
                activeStatusTab === 'all'
                  ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                  : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
              }`}
            >
              ทั้งหมด ({orders.length})
            </button>
          </div>
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-1.5 text-[10px] w-full md:w-auto justify-end">
          <span className="text-slate-400 font-bold uppercase flex items-center gap-0.5">
            <ArrowUpDown className="h-3 w-3" /> เรียงตาม:
          </span>
          <select
            className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 focus:outline-none cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">วันที่ส่งเสนอ</option>
            <option value="totalPrice">ราคารวม</option>
            <option value="quantity">จำนวนจัดซื้อ</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-indigo-600 transition-colors flex items-center justify-center cursor-pointer"
            title={sortOrder === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
          >
            {sortOrder === 'asc' ? (
              <ChevronUp className="h-3.5 w-3.5 stroke-[3]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 stroke-[3]" />
            )}
          </button>
        </div>
      </div>

      {/* Orders High Efficiency Spreadsheet/Table Area */}
      <div className="bg-slate-50/20 rounded-lg overflow-x-auto">
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            กำลังโหลดรายการจัดซื้อพัสดุ...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            ไม่พบบันทึกการเสนอขอสั่งซื้อตามเงื่อนไขที่กรองไว้
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100/30 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                <th className="py-1 px-1.5 w-[130px]">เลขที่ PR / PO</th>
                <th className="py-1 px-1.5 min-w-[200px]">พัสดุที่จัดซื้อ / โครงการ</th>
                <th className="py-1 px-1.5 text-center w-[300px]">สถานะ / อัปเดตคืบหน้าด่วน</th>
                <th className="py-1 px-1.5 w-[120px]">ผู้ขอเสนอ / ดำเนินการ</th>
                <th className="py-1 px-1.5 text-center w-[90px]">จำนวนสั่ง</th>
                <th className="py-1 px-1.5 text-right w-[110px]">ราคารวม</th>
                <th className="py-1 px-1.5 text-right w-[120px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
              
              {/* Job Mode grouping or direct all orders */}
              {viewMode === 'job' ? (
                groupedJobs.map(group => {
                  const jobKey = group.jobNo || 'UNASSIGNED';
                  const isCollapsed = collapsedJobs.includes(jobKey);
                  const totalJobSpend = group.orders
                    .filter(o => o.status !== 'cancelled' && o.totalPrice)
                    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
                  
                  return (
                    <React.Fragment key={jobKey}>
                      {/* Job Header Row */}
                      <tr 
                        onClick={() => toggleJobCollapsed(group.jobNo)}
                        className="bg-slate-100/50 hover:bg-slate-100 border-y border-slate-150 cursor-pointer select-none font-bold text-slate-700 text-[10px]"
                      >
                        <td colSpan={7} className="py-0.5 px-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-indigo-700 font-black flex items-center gap-1">
                                {isCollapsed ? (
                                  <ChevronDown className="h-3 w-3 text-slate-400" />
                                ) : (
                                  <ChevronUp className="h-3 w-3 text-indigo-600" />
                                )}
                                {group.jobNo ? `⚙️ JOB: ${group.jobNo}` : '📂 ทั่วไป / ไม่ระบุ Job No.'}
                              </span>
                              {group.jobName && (
                                <span className="text-slate-500 font-medium font-sans">
                                  ({group.jobName})
                                </span>
                              )}
                              <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded-sm">
                                {group.orders.length} ใบงาน
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              {totalJobSpend > 0 && (
                                <span>งบประมาณงานรวม: <strong className="text-indigo-600 font-mono text-[11px]">฿{(totalJobSpend || 0).toLocaleString('th-TH')}</strong></span>
                              )}
                              <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold text-[9px] transition-colors hover:bg-indigo-100">
                                <span>{isCollapsed ? 'ขยายรายการ' : 'ซ่อนรายการ'}</span>
                                {isCollapsed ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronUp className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Job orders mapping */}
                      {!isCollapsed && group.orders.map(order => {
                        const prNumber = getRequisitionNumber(order);
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/40 transition-colors group">
                            
                            {/* PR & PO No */}
                            <td className="py-0.5 px-1.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80 inline-flex items-center gap-1" title="เลขที่ใบขอซื้อ (PR)">
                                  <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded-xs font-sans">PR</span>
                                  <span>{order.prNo || prNumber}</span>
                                </span>
                                {order.poNo ? (
                                  <span className="font-mono text-[9px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 inline-flex items-center gap-1" title="เลขที่ใบสั่งซื้อ (PO)">
                                    <span className="text-[8px] bg-indigo-200 text-indigo-800 px-1 rounded-xs font-sans">PO</span>
                                    <span>{order.poNo}</span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-[8.5px] text-slate-400 italic px-1">
                                    PO: -
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Title & Remarks */}
                            <td className="py-0.5 px-1.5">
                              <div className="space-y-0.2">
                                <div className="font-bold text-slate-800 line-clamp-1 flex items-center gap-1.5 flex-wrap">
                                  <span>{order.orderTitle}</span>
                                  {(() => {
                                    const p = products.find(prod => prod.id === order.productId);
                                    const sName = order.supplier || p?.supplier;
                                    const sLogo = order.supplierLogoUrl || p?.supplierLogoUrl;
                                    if (!sName) return null;
                                    return (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150" title={`ร้านค้า: ${sName}`}>
                                        {sLogo ? (
                                          <img src={sLogo} alt={sName} className="h-3.5 object-contain" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span>🏬 {sName}</span>
                                        )}
                                      </span>
                                    );
                                  })()}
                                  {(() => {
                                    const p = products.find(prod => prod.id === order.productId);
                                    const subName = order.subStore || p?.subStore;
                                    const subLogo = order.subStoreLogoUrl || p?.subStoreLogoUrl;
                                    const subLink = order.subStoreLink || p?.subStoreLink;
                                    if (!subName && !subLogo) return null;
                                    return (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-black text-rose-700 bg-rose-50 border border-rose-150" title={`ร้านค้าย่อย: ${subName || ''}`}>
                                        {subLogo ? (
                                          <img src={subLogo} alt={subName || 'ร้านค้าย่อย'} className="h-3.5 object-contain" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span>🛒 {subName || 'ร้านค้าย่อย'}</span>
                                        )}
                                        {subName && subLogo && <span>{subName}</span>}
                                        {subLink && (
                                          <a
                                            href={subLink.startsWith('http') ? subLink : `https://${subLink}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-0.5 p-0.2 bg-rose-600 text-white rounded hover:bg-rose-500 transition-colors inline-flex"
                                            title="เปิดลิงก์ร้านค้าย่อย E-commerce"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ExternalLink className="h-2 w-2" />
                                          </a>
                                        )}
                                      </span>
                                    );
                                  })()}
                                </div>
                                {order.remark && (
                                  <div className="text-[9.5px] text-slate-400 italic line-clamp-1" title={order.remark}>
                                    หมายเหตุ: {order.remark}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Status Steps Tracker Inline */}
                            <td className="py-0.5 px-1.5 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  {getStatusBadge(order.status)}
                                </div>
                                {renderStatusTrackerInline(order)}
                              </div>
                            </td>

                            {/* Requester & Purchaser */}
                            <td className="py-0.5 px-1.5 text-slate-500 text-[10px]">
                              <div>ขอ: <strong className="text-slate-600">{order.requesterName}</strong></div>
                              {order.purchaserName && (
                                <div className="text-indigo-600">ซื้อ: <strong>{order.purchaserName}</strong></div>
                              )}
                            </td>

                            {/* Qty & Unit */}
                            <td className="py-0.5 px-1.5 text-center font-bold text-slate-700">
                              {order.quantity} <span className="text-[9.5px] text-slate-400 font-medium">{order.unit || 'ชิ้น'}</span>
                            </td>

                            {/* Price */}
                            <td className="py-0.5 px-1.5 text-right font-bold text-slate-700 font-mono">
                              {order.totalPrice ? `฿${order.totalPrice.toLocaleString('th-TH')}` : '-'}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-0.5 px-1.5 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => setViewingPoOrder(order)}
                                  className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="พิมพ์ใบเสนอซื้อ (PDF)"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(order)}
                                  className="p-0.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="แก้ไขใบสั่ง"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(order.id, order.orderTitle)}
                                  className="p-0.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="ลบพัสดุจัดซื้อ"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                filteredOrders.map(order => {
                  const prNumber = getRequisitionNumber(order);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/40 transition-colors group">
                      
                      {/* PR & PO No */}
                      <td className="py-0.5 px-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80 inline-flex items-center gap-1" title="เลขที่ใบขอซื้อ (PR)">
                            <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded-xs font-sans">PR</span>
                            <span>{order.prNo || prNumber}</span>
                          </span>
                          {order.poNo ? (
                            <span className="font-mono text-[9px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 inline-flex items-center gap-1" title="เลขที่ใบสั่งซื้อ (PO)">
                              <span className="text-[8px] bg-indigo-200 text-indigo-800 px-1 rounded-xs font-sans">PO</span>
                              <span>{order.poNo}</span>
                            </span>
                          ) : (
                            <span className="font-mono text-[8.5px] text-slate-400 italic px-1">
                              PO: -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Title, Job & Remarks */}
                      <td className="py-0.5 px-1.5">
                        <div className="space-y-0.2">
                          <div className="font-bold text-slate-800 line-clamp-1 flex items-center gap-1.5 flex-wrap">
                            <span>{order.orderTitle}</span>
                            {(() => {
                              const p = products.find(prod => prod.id === order.productId);
                              const sName = order.supplier || p?.supplier;
                              const sLogo = order.supplierLogoUrl || p?.supplierLogoUrl;
                              if (!sName) return null;
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150" title={`ร้านค้า: ${sName}`}>
                                  {sLogo ? (
                                    <img src={sLogo} alt={sName} className="h-3.5 object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span>🏬 {sName}</span>
                                  )}
                                </span>
                              );
                            })()}
                            {(() => {
                              const p = products.find(prod => prod.id === order.productId);
                              const subName = order.subStore || p?.subStore;
                              const subLogo = order.subStoreLogoUrl || p?.subStoreLogoUrl;
                              const subLink = order.subStoreLink || p?.subStoreLink;
                              if (!subName && !subLogo) return null;
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-black text-rose-700 bg-rose-50 border border-rose-150" title={`ร้านค้าย่อย: ${subName || ''}`}>
                                  {subLogo ? (
                                    <img src={subLogo} alt={subName || 'ร้านค้าย่อย'} className="h-3.5 object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span>🛒 {subName || 'ร้านค้าย่อย'}</span>
                                  )}
                                  {subName && subLogo && <span>{subName}</span>}
                                  {subLink && (
                                    <a
                                      href={subLink.startsWith('http') ? subLink : `https://${subLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-0.5 p-0.2 bg-rose-600 text-white rounded hover:bg-rose-500 transition-colors inline-flex"
                                      title="เปิดลิงก์ร้านค้าย่อย E-commerce"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-2 w-2" />
                                    </a>
                                  )}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                            {order.jobNo && <span>JOB: <strong>{order.jobNo}</strong></span>}
                            {order.jobName && <span>งาน: {order.jobName}</span>}
                          </div>
                          {order.remark && (
                            <div className="text-[9.5px] text-slate-400 italic line-clamp-1">
                              หมายเหตุ: {order.remark}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Steps Tracker Inline */}
                      <td className="py-0.5 px-1.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(order.status)}
                          </div>
                          {renderStatusTrackerInline(order)}
                        </div>
                      </td>

                      {/* Requester & Purchaser */}
                      <td className="py-0.5 px-1.5 text-slate-500 text-[10px]">
                        <div>ขอ: <strong className="text-slate-600">{order.requesterName}</strong></div>
                        {order.purchaserName && (
                          <div className="text-indigo-600">ซื้อ: <strong>{order.purchaserName}</strong></div>
                        )}
                      </td>

                      {/* Qty & Unit */}
                      <td className="py-0.5 px-1.5 text-center font-bold text-slate-700">
                        {order.quantity} <span className="text-[9.5px] text-slate-400 font-medium">{order.unit || 'ชิ้น'}</span>
                      </td>

                      {/* Price */}
                      <td className="py-0.5 px-1.5 text-right font-bold text-slate-700 font-mono">
                        {order.totalPrice ? `฿${order.totalPrice.toLocaleString('th-TH')}` : '-'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-0.5 px-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => setViewingPoOrder(order)}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="พิมพ์ใบเสนอซื้อ (PDF)"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(order)}
                            className="p-0.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer"
                            title="แก้ไขใบสั่ง"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.orderTitle)}
                            className="p-0.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="ลบพัสดุจัดซื้อ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Professional Corporate Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-md w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1">
                <Edit3 className="h-4 w-4 text-indigo-600" />
                <span>แก้ไขข้อมูลเอกสารเสนอซื้อพัสดุ</span>
              </h3>
              <button 
                onClick={() => setEditingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-[11px] font-sans">
              <div className="grid grid-cols-2 gap-2">
                
                {/* Requester name */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">ชื่อผู้ขอเสนอซื้อ *</label>
                  <select
                    required
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                    value={editRequesterName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditRequesterName(val);
                      if (val) localStorage.setItem('last_selected_requester', val);
                    }}
                  >
                    <option value="">-- เลือกผู้ขอซื้อ --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchaser name */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">ชื่อคนจัดซื้อ</label>
                  <select
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                    value={editPurchaserName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditPurchaserName(val);
                      if (val) localStorage.setItem('last_selected_purchaser', val);
                    }}
                  >
                    <option value="">-- เลือกคนจัดซื้อ --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.nickname ? `[${emp.nickname}] ` : ''}{emp.name} ({emp.role || emp.department || 'พนักงาน'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status selector */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">สถานะจัดซื้อ *</label>
                  <select
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                    value={editStatus || 'pending'}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="pending">1. ขอซื้อ (Pending)</option>
                    <option value="quotation">2. ใบเสนอราคา (Quotation)</option>
                    <option value="ordered">3. เปิด PR/PO (Ordered)</option>
                    <option value="approved">4. อนุมัติ PR/PO (Approved)</option>
                    <option value="paid">5. โอนเงินแล้ว (Paid)</option>
                    <option value="received">6. รับของสำเร็จ (Received)</option>
                    <option value="cancelled">ยกเลิกรายการ (Cancelled)</option>
                  </select>
                </div>

                {/* Job No */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">Job.No (เลขงาน)</label>
                  <select
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                    value={editJobNo || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditJobNo(val);
                      const matchedProj = jobProjects.find(p => p.jobNo === val);
                      if (matchedProj) {
                        setEditJobName(matchedProj.projectName);
                      } else {
                        setEditJobName('');
                      }
                    }}
                  >
                    <option value="">-- เลือกหมายเลขงาน --</option>
                    {jobProjects.map((p) => (
                      <option key={p.id} value={p.jobNo}>
                        {p.jobNo} {p.projectName ? `- ${p.projectName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Name */}
                <div className="space-y-0.5 col-span-2">
                  <label className="font-bold text-slate-500">Job.Name (ชื่องาน)</label>
                  <input
                    type="text"
                    disabled
                    className="w-full px-2 py-0.5 bg-slate-100 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] text-slate-600 font-medium"
                    value={editJobName || ''}
                    onChange={(e) => setEditJobName(e.target.value)}
                    placeholder="จะเลือกตามหมายเลขงานอัตโนมัติ"
                  />
                </div>

                {/* Link product in inventory */}
                <div className="space-y-0.5 col-span-2">
                  <label className="font-bold text-slate-500">ผูกสินค้าคลัง</label>
                  <select
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] cursor-pointer"
                    value={editSelectedProductId || ''}
                    onChange={(e) => setEditSelectedProductId(e.target.value)}
                  >
                    <option value="">-- ไม่ระบุ (พัสดุภายนอก) --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - คลังคงเหลือ {p.quantity} {p.unit || 'ชิ้น'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order title */}
                <div className="space-y-0.5 col-span-2">
                  <label className="font-bold text-slate-500">ชื่อสินค้าที่เสนอสั่งซื้อ *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                    value={editOrderTitle || ''}
                    onChange={(e) => setEditOrderTitle(e.target.value)}
                    disabled={!!editSelectedProductId}
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">จำนวนที่ซื้อ *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                {/* Unit */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">หน่วย</label>
                  <input
                    type="text"
                    disabled={!!editSelectedProductId}
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                    value={editUnit || ''}
                    onChange={(e) => setEditUnit(e.target.value)}
                  />
                </div>

                {/* Price */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">ราคาต่อหน่วย (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold text-indigo-900"
                    value={editPricePerUnit || ''}
                    onChange={(e) => setEditPricePerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>

                {/* PR No */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">เลขที่ PR (PR No.)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold"
                    value={editPrNo || ''}
                    onChange={(e) => setEditPrNo(e.target.value)}
                    placeholder="เช่น PR-2026-001"
                  />
                </div>

                {/* PO No */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">เลขที่ PO (PO No.)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono font-bold text-indigo-900"
                    value={editPoNo || ''}
                    onChange={(e) => setEditPoNo(e.target.value)}
                    placeholder="เช่น PO-2026-001"
                  />
                </div>

                {/* Supplier */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">ร้านค้า / ซัพพลายเออร์ (Supplier)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                    value={editSupplier || ''}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    placeholder="ระบุชื่อบริษัท/ร้านค้า"
                  />
                </div>

                {/* Quotation No */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">เลขใบเสนอราคา (QT No.)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono"
                    value={editQuotationNo || ''}
                    onChange={(e) => setEditQuotationNo(e.target.value)}
                    placeholder="เช่น QT-2026-001"
                  />
                </div>

                {/* Approver Name */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">ผู้อนุมัติ (Approver)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                    value={editApproverName || ''}
                    onChange={(e) => setEditApproverName(e.target.value)}
                    placeholder="ระบุชื่อผู้อนุมัติ"
                  />
                </div>

                {/* Payment Ref */}
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-500">อ้างอิงชำระเงิน (Payment Ref)</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-mono"
                    value={editPaymentRef || ''}
                    onChange={(e) => setEditPaymentRef(e.target.value)}
                    placeholder="สลิป / อ้างอิงชำระเงิน"
                  />
                </div>

                {/* Remark */}
                <div className="space-y-0.5 col-span-2">
                  <label className="font-bold text-slate-500">หมายเหตุ / ลิงก์</label>
                  <input
                    type="text"
                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                    value={editRemark || ''}
                    onChange={(e) => setEditRemark(e.target.value)}
                  />
                </div>

              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Step Transition Details Modal */}
      {confirmingStatusOrder && confirmingTargetStatus && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1">
                <CheckSquare className="h-4 w-4 text-indigo-600" />
                <span>ยืนยันข้อมูลการเปลี่ยนขั้นตอนจัดซื้อ</span>
              </h3>
              <button 
                onClick={() => {
                  setConfirmingStatusOrder(null);
                  setConfirmingTargetStatus(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStepSave} className="space-y-3 text-[11px] font-sans">
              <div className="p-2 bg-slate-50 rounded border border-slate-200/60 space-y-0.5">
                <div className="font-bold text-slate-700">พัสดุ: <span className="text-slate-900 font-extrabold">{confirmingStatusOrder.orderTitle}</span></div>
                <div className="text-[10px] text-slate-500 font-bold">
                  สลับขั้นตอน: <span className="text-amber-700">{confirmingStatusOrder.status.toUpperCase()}</span> ➔ <span className="text-emerald-700">{confirmingTargetStatus.toUpperCase()}</span>
                </div>
              </div>

              {confirmingTargetStatus === 'quotation' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">เลขที่ใบเสนอราคา (Quotation No.)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-slate-800"
                      value={stepQuotationNo || ''}
                      onChange={(e) => setStepQuotationNo(e.target.value)}
                      placeholder="เช่น QT-2026-044"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">ผู้ขาย / ซัพพลายเออร์ (Supplier)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                      value={stepSupplier || ''}
                      onChange={(e) => setStepSupplier(e.target.value)}
                      placeholder="ระบุบริษัท/ร้านค้า"
                    />
                  </div>
                </div>
              )}

              {confirmingTargetStatus === 'ordered' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">เลขที่ใบขอซื้อ (PR No.)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-slate-800"
                      value={stepPrNo || ''}
                      onChange={(e) => setStepPrNo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">เลขที่ใบสั่งซื้อ (PO No.)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold text-slate-800"
                      value={stepPoNo || ''}
                      onChange={(e) => setStepPoNo(e.target.value)}
                      placeholder="เช่น PO-2026-0001"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">ซัพพลายเออร์ (Supplier)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                      value={stepSupplier || ''}
                      onChange={(e) => setStepSupplier(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {confirmingTargetStatus === 'approved' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">ชื่อผู้อนุมัติเปิด PO (Approver)</label>
                    <input
                      type="text"
                      required
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                      value={stepApproverName || ''}
                      onChange={(e) => setStepApproverName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {confirmingTargetStatus === 'paid' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <label className="font-bold text-slate-600">ข้อมูลอ้างอิงการชำระเงิน (Payment Ref)</label>
                    <input
                      type="text"
                      className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono text-slate-800"
                      value={stepPaymentRef || ''}
                      onChange={(e) => setStepPaymentRef(e.target.value)}
                      placeholder="เช่น ธนาคารกสิกรไทย / โอนแล้ว"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingStatusOrder(null);
                    setConfirmingTargetStatus(null);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded"
                >
                  ยืนยันอัปเดตขั้นตอน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Corporate Purchase Requisition Preview Modal */}
      {viewingPoOrder && (
        <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full flex flex-col max-h-[90vh] text-left">
            
            <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0">
              <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-600" />
                <span>ตัวอย่างเอกสารใบเสนอขออนุมัติสั่งพัสดุ (PR Document View)</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black font-sans flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>สั่งพิมพ์</span>
                </button>
                <button 
                  onClick={() => setViewingPoOrder(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 bg-slate-50 font-sans">
              <div className="bg-white p-6 border border-slate-300 rounded shadow-sm mx-auto max-w-[210mm] flex flex-col justify-between" id="print-requisition-area">
                <div className="space-y-4">
                  <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 leading-none">บจก. สต็อกแอนด์อินเวนทอรี สยาม</h2>
                      <p className="text-[9px] text-slate-500 mt-1">
                        123 อาคารสยามสแควร์ ชั้น 20 ถ.พระราม 1 เขตปทุมวัน กรุงเทพฯ 10330 | โทร: 02-123-4567
                      </p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-sm font-black text-indigo-900 uppercase">ใบขออนุมัติสั่งพัสดุ</h1>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Purchase Requisition</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="space-y-1">
                      <p><strong>ผู้เสนอขอสั่งซื้อ:</strong> {viewingPoOrder.requesterName}</p>
                      <p><strong>ผู้จัดซื้อ:</strong> {viewingPoOrder.purchaserName || '-'}</p>
                      <p><strong>แผนกงานหลัก:</strong> แผนกวิศวกรรมการผลิตและควบคุมคลังพัสดุ</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p><strong>เลขที่ PR:</strong> <span className="font-mono font-bold text-indigo-900">{getRequisitionNumber(viewingPoOrder)}</span></p>
                      <p><strong>วันที่ออก:</strong> {formatDate(viewingPoOrder.createdAt)}</p>
                      <p><strong>สถานะปัจจุบัน:</strong> <span className="font-bold text-indigo-600">{viewingPoOrder.status.toUpperCase()}</span></p>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">รายละเอียดพัสดุ:</p>
                    <table className="w-full border-collapse text-[10.5px] text-slate-700 border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold">
                          <th className="py-1 px-2 text-center w-10 border-r border-slate-200">No.</th>
                          <th className="py-1 px-2 border-r border-slate-200">รายการรายละเอียดพัสดุ</th>
                          <th className="py-1 px-2 text-center w-20 border-r border-slate-200">จำนวน</th>
                          <th className="py-1 px-2 text-right w-24 border-r border-slate-200">ราคา/หน่วย</th>
                          <th className="py-1 px-2 text-right w-28">ยอดเงินรวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-3 px-2 text-center font-mono border-r border-slate-200">01</td>
                          <td className="py-3 px-2 border-r border-slate-200">
                            <p className="font-bold text-slate-900">{viewingPoOrder.orderTitle}</p>
                            {viewingPoOrder.productId && <p className="text-[8.5px] text-slate-400 mt-0.5">ID สินค้าสต็อกร่วม: {viewingPoOrder.productId}</p>}
                            {viewingPoOrder.remark && <p className="text-[9.5px] text-slate-500 italic mt-1">หมายเหตุ: {viewingPoOrder.remark}</p>}
                          </td>
                          <td className="py-3 px-2 text-center border-r border-slate-200 font-bold text-slate-800">
                            {viewingPoOrder.quantity} {viewingPoOrder.unit || 'ชิ้น'}
                          </td>
                          <td className="py-3 px-2 text-right border-r border-slate-200 font-mono text-slate-700">
                            {viewingPoOrder.pricePerUnit ? `฿${viewingPoOrder.pricePerUnit.toLocaleString('th-TH')}` : '-'}
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-indigo-950">
                            {viewingPoOrder.totalPrice ? `฿${viewingPoOrder.totalPrice.toLocaleString('th-TH')}` : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {viewingPoOrder.totalPrice && (
                    <div className="flex justify-end pt-2">
                      <div className="w-52 space-y-1 text-[10px] text-slate-600 border-t border-slate-100 pt-1.5">
                        <div className="flex justify-between">
                          <span>ยอดเงิน (Subtotal):</span>
                          <span className="font-mono">฿{(viewingPoOrder.totalPrice * 0.93).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ภาษี VAT 7%:</span>
                          <span className="font-mono">฿{(viewingPoOrder.totalPrice * 0.07).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold text-indigo-900 text-[10.5px] border-t border-dashed border-slate-200 pt-1">
                          <span>รวมยอดสุทธิ:</span>
                          <span className="font-mono">฿{viewingPoOrder.totalPrice.toLocaleString('th-TH')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-10">
                  <div className="grid grid-cols-3 gap-2 text-[9.5px] text-slate-500 text-center">
                    <div className="space-y-3">
                      <div className="border-b border-slate-300 pb-1 font-mono italic text-slate-400">{viewingPoOrder.requesterName}</div>
                      <div>ผู้ขอเสนอซื้อ</div>
                    </div>
                    <div className="space-y-3">
                      <div className="border-b border-slate-300 pb-1 h-3">
                        {viewingPoOrder.status === 'received' && <span className="text-emerald-600 font-bold text-[8px] border border-emerald-300 px-1 py-0.2 bg-emerald-50 rounded-sm">VERIFIED</span>}
                      </div>
                      <div>ผู้เช็คตรวจรับพัสดุ</div>
                    </div>
                    <div className="space-y-3">
                      <div className="border-b border-slate-300 pb-1 h-3">
                        {viewingPoOrder.status !== 'pending' && viewingPoOrder.status !== 'cancelled' && <span className="text-indigo-600 font-bold text-[8px] border border-indigo-300 px-1 py-0.2 bg-indigo-50 rounded-sm">APPROVED</span>}
                      </div>
                      <div>ผู้อนุมัติฝ่ายจัดซื้อ</div>
                    </div>
                  </div>
                  <div className="text-center text-[8.5px] text-slate-400 pt-6 border-t border-slate-100 mt-6">
                    <p>ใบคำขอนี้ถือเป็นเอกสารภายในของฝ่ายควบคุมพัสดุและฝ่ายจัดซื้อ การดัดแปลงข้อมูลโดยไม่ได้รับอนุญาตถือว่ามีความผิดทางวินัย</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intake Confirm Modal */}
      {intakeOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xl max-w-sm w-full text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-black text-slate-800 font-sans flex items-center gap-1">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                <span>ยืนยันตรวจรับสินค้าเข้าคลังจริง</span>
              </h3>
              <button onClick={() => setIntakeOrder(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-[11px] font-sans text-slate-700">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-150 space-y-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase">รายการสั่งซื้อพัสดุ:</span>
                <h4 className="text-xs font-extrabold text-slate-800 font-sans">{intakeOrder.orderTitle}</h4>
                <div className="flex gap-4 text-slate-500 text-[10px] pt-0.5">
                  <span>ผู้ซื้อ: <strong>{intakeOrder.requesterName}</strong></span>
                  <span>จำนวนใบงาน: <strong>{intakeOrder.quantity} {intakeOrder.unit || 'ชิ้น'}</strong></span>
                </div>
              </div>

              {intakeOrder.productId ? (
                <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-emerald-800">
                  <p className="font-bold flex items-center gap-1 text-[10.5px]">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> เชื่อมสต็อกอัตโนมัติ
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    ระบบจะทำการปรับสต็อกของพัสดุในฐานข้อมูลให้โดยอัตโนมัติ และลงบันทึก Activity Logs ในทันที
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 p-2 rounded text-amber-800">
                  <p className="font-bold flex items-center gap-1 text-[10.5px]">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> พัสดุภายนอก (ไม่ได้เก็บสต็อก)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    ใบสั่งซื้อนี้ไม่ได้ผูกพัสดุในคลังกลาง ระบบจะบันทึกว่าได้รับพัสดุแล้วเป็นประวัติ แต่ไม่มีการเปลี่ยนแปลงสต็อก
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-800">จำนวนที่ได้รับตรวจนับจริง *</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-2 py-0.5 border border-slate-200 rounded text-xs font-mono font-bold"
                    value={intakeQty}
                    onChange={(e) => setIntakeQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <span className="text-slate-500 font-bold">{intakeOrder.unit || 'ชิ้น'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIntakeOrder(null)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteIntake}
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded"
                >
                  ยืนยันตรวจรับสต็อก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
