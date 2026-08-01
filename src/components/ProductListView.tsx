import React, { useState, useRef, useEffect } from 'react';
import { Product, Category, Employee, JobProject, Brand, sortProducts, Bom, SubSeries, MediaFile } from '../types';
import { Search, Filter, Plus, Edit3, Trash2, PlusCircle, MinusCircle, Upload, Eye, EyeOff, X, Image as ImageIcon, ExternalLink, Layers, List, ChevronDown, ChevronUp, ChevronRight, Package, ShoppingCart, Tag, Copy, ArrowUpDown, FileText } from 'lucide-react';
import CategoryView from './CategoryView';
import OrderingSystemView from './OrderingSystemView';
import ShoppingCartView from './ShoppingCartView';
import { INITIAL_CATEGORIES } from '../initialData';
import { auth, GoogleAuthProvider, signInWithPopup } from '../firebase';

interface ProductListViewProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditProduct: (id: string, updated: Partial<Product>) => void;
  onBulkEditProducts?: (updates: { id: string; updatedFields: Partial<Product> }[]) => Promise<void>;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (id: string, change: number, reason: string) => any;
  statusFilter: string;
  onSetStatusFilter: (filter: string) => void;
  onAddCategory: (category: Omit<Category, 'id'> & { id?: string }) => void;
  onEditCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  employees: Employee[];
  jobProjects: JobProject[];
  brands?: Brand[];
  boms?: Bom[];
  setBoms?: React.Dispatch<React.SetStateAction<Bom[]>>;
  onAddMediaFile?: (data: Omit<MediaFile, 'id' | 'createdAt'>) => Promise<MediaFile>;
}

// Curated stock photos for quick selection
const PRESET_IMAGES = [
  { name: 'สมาร์ทโฟน/มือถือ', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=60' },
  { name: 'โน้ตบุ๊ก/คอมพิวเตอร์', url: 'https://images.unsplash.com/photo-1496181130204-755241544e3f?w=300&auto=format&fit=crop&q=60' },
  { name: 'หูฟังไร้สาย', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=60' },
  { name: 'เสื้อยืดแฟชั่น', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=60' },
  { name: 'กระเป๋าเป้สะพายหลัง', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=60' },
  { name: 'แก้วน้ำเก็บอุณหภูมิ', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=60' },
  { name: 'อาหารเสริม/ขวดแก้ว', url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&auto=format&fit=crop&q=60' },
  { name: 'รองเท้าผ้าใบ', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=60' },
];

export const PRODUCT_COLORS = [
  { name: 'ดำ', hex: '#000000', bgClass: 'bg-black', textClass: 'text-white border-slate-700' },
  { name: 'ขาว', hex: '#FFFFFF', bgClass: 'bg-white', textClass: 'text-slate-800 border-slate-300' },
  { name: 'แดง', hex: '#EF4444', bgClass: 'bg-red-500', textClass: 'text-white border-red-600' },
  { name: 'เหลือง', hex: '#FBBF24', bgClass: 'bg-amber-400', textClass: 'text-slate-900 border-amber-500' },
  { name: 'น้ำเงิน', hex: '#3B82F6', bgClass: 'bg-blue-600', textClass: 'text-white border-blue-700' },
  { name: 'เขียว', hex: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-white border-emerald-600' },
  { name: 'เทา', hex: '#6B7280', bgClass: 'bg-gray-500', textClass: 'text-white border-gray-600' },
  { name: 'น้ำตาล', hex: '#78350F', bgClass: 'bg-amber-900', textClass: 'text-white border-amber-950' },
  { name: 'ส้ม', hex: '#F97316', bgClass: 'bg-orange-500', textClass: 'text-white border-orange-600' },
  { name: 'ฟ้า', hex: '#06B6D4', bgClass: 'bg-cyan-500', textClass: 'text-white border-cyan-600' },
  { name: 'ม่วง', hex: '#8B5CF6', bgClass: 'bg-violet-500', textClass: 'text-white border-violet-600' },
  { name: 'ชมพู', hex: '#EC4899', bgClass: 'bg-pink-500', textClass: 'text-white border-pink-600' },
  { name: 'เขียว-เหลือง', hex: 'linear-gradient(135deg, #22C55E 50%, #EAB308 50%)', bgClass: 'bg-gradient-to-br from-green-500 via-green-500 via-50% to-yellow-400 to-50%', textClass: 'text-slate-900 border-slate-300' },
];

export const getColorDotAndBadge = (colorName?: string) => {
  if (!colorName) return null;
  const match = PRODUCT_COLORS.find(c => c.name === colorName);
  if (!match) return null;
  
  return (
    <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 text-[8.5px] font-bold rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 shadow-3xs leading-none">
      <span 
        className={`w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 ${match.bgClass}`} 
        style={colorName === 'เขียว-เหลือง (งานไฟฟ้า)' ? { background: match.hex } : undefined}
      />
      <span>{colorName}</span>
    </span>
  );
};

export default function ProductListView({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onBulkEditProducts,
  onDeleteProduct,
  onAdjustStock,
  statusFilter,
  onSetStatusFilter,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  addToast,
  employees,
  jobProjects,
  brands = [],
  boms = [],
  setBoms,
  onAddMediaFile
}: ProductListViewProps) {
  // Filters & Search
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'ordering' | 'cart'>('products');
  const [preselectedProductId, setPreselectedProductId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Edit Category & SubSeries Modal States
  const [editingCatModal, setEditingCatModal] = useState<Category | null>(null);
  const [editCatTab, setEditCatTab] = useState<'general' | 'subseries'>('general');
  const [catFormName, setCatFormName] = useState('');
  const [catFormDescription, setCatFormDescription] = useState('');
  const [catFormColor, setCatFormColor] = useState('bg-blue-100 text-blue-800 border-blue-150');
  const [catFormImageUrl, setCatFormImageUrl] = useState('');

  // SubSeries state inside Modal
  const [catSubSeriesList, setCatSubSeriesList] = useState<SubSeries[]>([]);
  const [editingSubSeriesIndex, setEditingSubSeriesIndex] = useState<number | null>(null);
  const [subSeriesInputName, setSubSeriesInputName] = useState('');
  const [subSeriesInputImageUrl, setSubSeriesInputImageUrl] = useState('');
  const [subSeriesInputPdfUrl, setSubSeriesInputPdfUrl] = useState('');

  const handleStartEditCategory = (cat: Category, defaultTab: 'general' | 'subseries' = 'general') => {
    setEditingCatModal(cat);
    setCatFormName(cat.name);
    setCatFormDescription(cat.description || '');
    setCatFormColor(cat.color || 'bg-blue-100 text-blue-800 border-blue-150');
    setCatFormImageUrl(cat.imageUrl || '');

    const initialSubList: SubSeries[] = (cat.subSeries && cat.subSeries.length > 0)
      ? cat.subSeries.map(s => ({ ...s }))
      : (cat.series || []).map(sName => ({ name: sName }));
    setCatSubSeriesList(initialSubList);

    setEditCatTab(defaultTab);
    setEditingSubSeriesIndex(null);
    setSubSeriesInputName('');
    setSubSeriesInputImageUrl('');
    setSubSeriesInputPdfUrl('');
  };

  const handleAddOrUpdateSubSeries = () => {
    const trimmedName = subSeriesInputName.trim();
    if (!trimmedName) {
      addToast('warning', 'กรอกข้อมูลไม่ครบ', 'โปรดระบุชื่อ Sub Series');
      return;
    }

    if (editingSubSeriesIndex !== null) {
      // Edit existing subseries
      const oldSubSeries = catSubSeriesList[editingSubSeriesIndex];
      const oldName = oldSubSeries.name;

      const updatedList = [...catSubSeriesList];
      updatedList[editingSubSeriesIndex] = {
        name: trimmedName,
        imageUrl: subSeriesInputImageUrl.trim(),
        pdfUrl: subSeriesInputPdfUrl.trim(),
      };
      setCatSubSeriesList(updatedList);

      // Update products that use oldName if name changed
      if (oldName !== trimmedName && editingCatModal) {
        const productsToRename = products.filter(
          p => p.category === editingCatModal.id && p.series === oldName
        );
        productsToRename.forEach(p => {
          onEditProduct(p.id, { series: trimmedName });
        });
        if (productsToRename.length > 0) {
          addToast('info', 'อัปเดตสินค้า', `เปลี่ยนชื่อ Series ของสินค้าจำนวน ${productsToRename.length} รายการเป็น "${trimmedName}"`);
        }
      }

      addToast('success', 'ปรับปรุงสำเร็จ', `อัปเดต Sub Series "${trimmedName}" เรียบร้อยแล้ว`);
      setEditingSubSeriesIndex(null);
    } else {
      // Add new subseries
      if (catSubSeriesList.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
        addToast('warning', 'ชื่อซ้ำ', `มี Sub Series ชื่อ "${trimmedName}" อยู่แล้ว`);
        return;
      }

      setCatSubSeriesList(prev => [
        ...prev,
        {
          name: trimmedName,
          imageUrl: subSeriesInputImageUrl.trim(),
          pdfUrl: subSeriesInputPdfUrl.trim(),
        }
      ]);
      addToast('success', 'เพิ่มสำเร็จ', `เพิ่ม Sub Series "${trimmedName}" เรียบร้อยแล้ว`);
    }

    setSubSeriesInputName('');
    setSubSeriesInputImageUrl('');
    setSubSeriesInputPdfUrl('');
  };

  const handleEditSubSeriesClick = (index: number) => {
    const target = catSubSeriesList[index];
    if (!target) return;
    setEditingSubSeriesIndex(index);
    setSubSeriesInputName(target.name);
    setSubSeriesInputImageUrl(target.imageUrl || '');
    setSubSeriesInputPdfUrl(target.pdfUrl || '');
  };

  const handleDeleteSubSeries = (index: number) => {
    const target = catSubSeriesList[index];
    if (!target) return;

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ Sub Series "${target.name}"?`)) {
      setCatSubSeriesList(prev => prev.filter((_, i) => i !== index));
      if (editingSubSeriesIndex === index) {
        setEditingSubSeriesIndex(null);
        setSubSeriesInputName('');
        setSubSeriesInputImageUrl('');
        setSubSeriesInputPdfUrl('');
      }
      addToast('info', 'ลบสำเร็จ', `นำ Sub Series "${target.name}" ออกแล้ว`);
    }
  };

  const handleMoveSubSeriesInModal = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === catSubSeriesList.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newList = [...catSubSeriesList];
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;
    setCatSubSeriesList(newList);
  };

  const handleSaveCategoryModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatModal || !catFormName.trim()) return;

    const seriesNames = catSubSeriesList.map(s => s.name);

    onEditCategory(editingCatModal.id, {
      name: catFormName.trim(),
      description: catFormDescription.trim(),
      color: catFormColor,
      imageUrl: catFormImageUrl.trim(),
      subSeries: catSubSeriesList,
      series: seriesNames,
    });

    addToast('success', 'แก้ไขหมวดหมู่สำเร็จ', `ปรับปรุงข้อมูลหมวดหมู่ "${catFormName}" และ Sub Series เรียบร้อยแล้ว`);
    setEditingCatModal(null);
  };



  // Shopping Cart state
  const [cartItems, setCartItems] = useState<any[]>(() => {
    const saved = localStorage.getItem('stock_manager_cart');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('stock_manager_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const handleOpenPdf = (pdfUrl?: string) => {
    if (!pdfUrl) return;
    try {
      if (pdfUrl.startsWith('data:application/pdf;base64,')) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(
            `<iframe src="${pdfUrl}" style="width:100%; height:100%; border:none;"></iframe>`
          );
          newWindow.document.title = "คู่มือสินค้า PDF";
        } else {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = 'manual.pdf';
          link.click();
        }
      } else {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error(e);
      addToast('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถเปิดไฟล์ PDF ได้ แนะนำให้ตรวจสอบความถูกต้องของ URL');
    }
  };

  const handleAddToCart = (product: Product) => {
    const exists = cartItems.find((item) => item.product.id === product.id);
    if (exists) {
      setCartItems(
        cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          product,
          quantity: 1,
          pricePerUnit: product.costPrice || product.price || 0,
          unit: product.unit || 'ชิ้น',
          jobNo: '',
          jobName: '',
          remark: '',
        },
      ]);
    }
    addToast('success', 'เพิ่มลงตะกร้าพัสดุสำเร็จ', `เพิ่ม "${product.name}" ในตะกร้าขอจัดซื้อเรียบร้อยแล้ว`);
  };

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLegacyProducts, setShowLegacyProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSeries, setFormSeries] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formQuantity, setFormQuantity] = useState(0);
  const [formMinAlert, setFormMinAlert] = useState(5);
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('คลังสินค้าหลัก A');
  const [formColor, setFormColor] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModelNumber, setFormModelNumber] = useState<string | number>('');
  const [formModelUnit, setFormModelUnit] = useState<string>('Kg');

  // Auto-reset formBrand if selected brand is deleted or no longer exists
  useEffect(() => {
    if (formBrand && !brands.some(b => b.name.trim().toLowerCase() === formBrand.trim().toLowerCase())) {
      setFormBrand('');
    }
  }, [brands, formBrand]);

  // Image Upload States
  const [imagePreview, setImagePreview] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Quick Adjustment Modal/Popover State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(1);
  const [adjustReason, setAdjustReason] = useState('รับของเข้า / ปรับปรุงสต็อก');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');

  // Reorder and Auto-format actions
  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    const currentList = [...filteredProducts];
    const index = currentList.findIndex(p => p.id === productId);
    if (index === -1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= currentList.length) return;

    const itemA = currentList[index];
    const itemB = currentList[swapIndex];

    const updatedAllProducts = [...products];
    const globalIndexA = updatedAllProducts.findIndex(p => p.id === itemA.id);
    const globalIndexB = updatedAllProducts.findIndex(p => p.id === itemB.id);

    if (globalIndexA !== -1 && globalIndexB !== -1) {
      // Initialize sortOrder for all products to preserve layout order
      updatedAllProducts.forEach((p, idx) => {
        if (p.sortOrder === undefined) {
          p.sortOrder = idx * 10;
        }
      });

      // Swap sortOrders
      const tempOrder = updatedAllProducts[globalIndexA].sortOrder;
      updatedAllProducts[globalIndexA].sortOrder = updatedAllProducts[globalIndexB].sortOrder;
      updatedAllProducts[globalIndexB].sortOrder = tempOrder;

      // Clean up and normalize indices
      const sortedTemp = [...updatedAllProducts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const finalUpdates = sortedTemp.map((p, idx) => ({
        id: p.id,
        updatedFields: { sortOrder: idx * 10 }
      }));

      if (onBulkEditProducts) {
        await onBulkEditProducts(finalUpdates);
        addToast('success', 'ปรับอันดับพัสดุสำเร็จ', `ย้ายตำแหน่งสินค้า "${itemA.name}" ${direction === 'up' ? 'ขึ้น' : 'ลง'} เรียบร้อย`);
      }
    }
  };

  const handleAutoFormatOrder = async () => {
    // Natural alphanumeric sorting of products
    const sortedByName = [...products].sort((a, b) => 
      (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' })
    );

    const finalUpdates = sortedByName.map((p, idx) => ({
      id: p.id,
      updatedFields: { sortOrder: idx * 10 }
    }));

    if (onBulkEditProducts) {
      await onBulkEditProducts(finalUpdates);
      addToast('success', 'จัดรูปแบบอัตโนมัติสำเร็จ', 'เรียงลำดับสินค้าตัวเลขน้อยอยู่บนเรียบร้อยและบันทึกลงระบบแล้ว');
    }
  };

  const handleMoveSubSeries = async (categoryId: string, seriesName: string, direction: 'up' | 'down') => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    const seriesList = [...(cat.series || [])];
    const idx = seriesList.indexOf(seriesName);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= seriesList.length) return;

    // Swap in series list
    const temp = seriesList[idx];
    seriesList[idx] = seriesList[swapIdx];
    seriesList[swapIdx] = temp;

    // Swap in subSeries list (rich objects) if present
    let newSubSeries = cat.subSeries ? [...cat.subSeries] : [];
    if (newSubSeries.length > 0) {
      const sIdx = newSubSeries.findIndex(s => s.name === seriesName);
      const swapSerName = seriesList[idx]; // the name that is now at idx after swap
      const otherIdx = newSubSeries.findIndex(s => s.name === swapSerName);
      if (sIdx !== -1 && otherIdx !== -1) {
        const tempObj = newSubSeries[sIdx];
        newSubSeries[sIdx] = newSubSeries[otherIdx];
        newSubSeries[otherIdx] = tempObj;
      }
    }

    // Update category
    onEditCategory(categoryId, {
      series: seriesList,
      subSeries: newSubSeries
    });
    addToast('success', 'สลับลำดับกลุ่มย่อยสำเร็จ', `ย้ายกลุ่มย่อย "${seriesName}" ${direction === 'up' ? 'ขึ้น' : 'ลง'} เรียบร้อยแล้ว`);
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'low') {
      matchesStatus = p.quantity > 0 && p.quantity <= p.minAlert;
    } else if (statusFilter === 'out') {
      matchesStatus = p.quantity === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Build a merged list of categories to handle any missing category definitions in the DB gracefully
  const mergedCategories = React.useMemo(() => {
    const list = [...categories];
    // Sort alphabetically and numerically ascending (natural sorting)
    list.sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'th', { numeric: true, sensitivity: 'base' }));
    return list;
  }, [categories]);

  const getCategoryName = (catId: string) => {
    const cat = mergedCategories.find((c) => c.id === catId);
    return cat ? cat.name : 'ทั่วไป';
  };

  const getCategoryBadgeClass = (catId: string) => {
    const cat = mergedCategories.find((c) => c.id === catId);
    return cat ? cat.color : 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Open Modal for Create
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormCategory(mergedCategories[0]?.id || '');
    setFormSeries('');
    setFormPrice(0);
    setFormCostPrice(0);
    setFormQuantity(0);
    setFormMinAlert(5);
    setFormImage('');
    setFormDescription('');
    setFormSourceUrl('');
    setImagePreview('');
    setShowGallery(false);
    setFormWarehouse('คลังสินค้าหลัก A');
    setFormColor('');
    setFormBrand('');
    setFormModelNumber('');
    setFormModelUnit('Kg');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category);
    setFormSeries(product.series || '');
    setFormPrice(product.price);
    setFormCostPrice(product.costPrice);
    setFormQuantity(product.quantity);
    setFormMinAlert(product.minAlert);
    setFormImage(product.image);
    setImagePreview(product.image);
    setFormDescription(product.description);
    setFormSourceUrl(product.sourceUrl || '');
    setShowGallery(false);
    setFormWarehouse(product.warehouse || 'คลังสินค้าหลัก A');
    setFormColor(product.color || '');
    setFormBrand(product.brand || '');
    setFormModelNumber(product.modelNumber ?? '');
    setFormModelUnit(product.modelUnit ?? 'Kg');
    setIsModalOpen(true);
  };

  // Open Modal for Clone
  const handleOpenCloneModal = (product: Product) => {
    setEditingProduct(null);
    setFormName(`${product.name} (คัดลอก)`);
    setFormSku(`${product.sku}-COPY`);
    setFormCategory(product.category);
    setFormSeries(product.series || '');
    setFormPrice(product.price);
    setFormCostPrice(product.costPrice);
    setFormQuantity(product.quantity);
    setFormMinAlert(product.minAlert);
    setFormImage(product.image);
    setImagePreview(product.image);
    setFormDescription(product.description || '');
    setFormSourceUrl(product.sourceUrl || '');
    setShowGallery(false);
    setFormWarehouse(product.warehouse || 'คลังสินค้าหลัก A');
    setFormColor(product.color || '');
    setFormBrand(product.brand || '');
    setFormModelNumber(product.modelNumber ?? '');
    setFormModelUnit(product.modelUnit ?? 'Kg');
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) return;

    const productData = {
      name: formName,
      sku: formSku,
      category: formCategory,
      series: formSeries,
      price: Number(formCostPrice),
      costPrice: Number(formCostPrice),
      quantity: Number(formQuantity),
      minAlert: Number(formMinAlert),
      image: formImage || imagePreview,
      description: formDescription,
      sourceUrl: formSourceUrl,
      warehouse: formWarehouse,
      color: formColor,
      brand: formBrand,
      modelNumber: formModelNumber !== '' ? formModelNumber : undefined,
      modelUnit: formModelNumber !== '' ? formModelUnit : undefined,
    };

    if (editingProduct) {
      onEditProduct(editingProduct.id, productData);
    } else {
      onAddProduct(productData);
    }
    setIsModalOpen(false);
  };

  // Base64 file reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormImage(base64String);
        setImagePreview(base64String);

        if (onAddMediaFile && base64String) {
          onAddMediaFile({
            name: formName ? `รูปสินค้า: ${formName}` : `รูปสินค้า ${file.name}`,
            type: 'image',
            url: base64String,
            category: 'รูปสินค้า',
            refName: formBrand || formCategory || formSku || undefined,
            size: file.size,
            fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag-and-Drop Image handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormImage(base64String);
        setImagePreview(base64String);

        if (onAddMediaFile && base64String) {
          onAddMediaFile({
            name: formName ? `รูปสินค้า: ${formName}` : `รูปสินค้า ${file.name}`,
            type: 'image',
            url: base64String,
            category: 'รูปสินค้า',
            refName: formBrand || formCategory || formSku || undefined,
            size: file.size,
            fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPresetImage = (url: string) => {
    setFormImage(url);
    setImagePreview(url);
    setShowGallery(false);
  };

  // Quick quantity quick buttons on row (direct interaction)
  const handleQuickAdd = (p: Product) => {
    onAdjustStock(p.id, 1, 'ปุ่มลัด: เพิ่มสินค้าเข้าคลัง 1 ชิ้น');
  };

  const handleQuickMinus = (p: Product) => {
    if (p.quantity > 0) {
      onAdjustStock(p.id, -1, 'ปุ่มลัด: ลดจำนวน/จ่ายออก 1 ชิ้น');
    }
  };

  // Open Detailed Stock adjustment panel
  const handleOpenAdjustDialog = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustAmount(1);
    setAdjustType('in');
    setAdjustReason(p.quantity === 0 ? 'นำสินค้าเข้าสต็อกล็อตใหม่' : 'ปรับเปลี่ยนคลังสินค้าประจำวัน');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const finalAmount = adjustType === 'in' ? adjustAmount : -adjustAmount;
    
    // Safety check for negative stock
    if (adjustType === 'out' && adjustingProduct.quantity < adjustAmount) {
      alert('ไม่สามารถหักสินค้าเกินจำนวนที่มีอยู่ในคลังปัจจุบันได้!');
      return;
    }

    onAdjustStock(adjustingProduct.id, finalAmount, adjustReason);
    setAdjustingProduct(null);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(num);
  };

  // Group products by category
  const productsByCategory = mergedCategories.reduce((acc, cat) => {
    const catProducts = filteredProducts.filter((p) => p.category === cat.id);
    if (catProducts.length > 0) {
      acc.push({
        category: cat,
        products: catProducts,
      });
    }
    return acc;
  }, [] as { category: Category; products: Product[] }[]);

  // Any products that don't match any category
  const uncategorizedProducts = filteredProducts.filter(
    (p) => !mergedCategories.some((cat) => cat.id === p.category)
  );
  if (uncategorizedProducts.length > 0) {
    productsByCategory.push({
      category: {
        id: 'uncategorized',
        name: 'สินค้าทั่วไป / ไม่มีหมวดหมู่',
        description: 'สินค้าที่ไม่ได้ถูกระบุหมวดหมู่',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
      },
      products: uncategorizedProducts,
    });
  }

  return (
    <div className="space-y-2 text-left">
      {/* Title Header Workspace (Unified Dark Banner - Compact) */}
      <div className="flex flex-row items-center justify-between gap-3 bg-slate-900 text-slate-100 p-2 px-3.5 rounded-xl relative overflow-hidden">
        {/* Background Accent Gradients */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="z-10 text-left">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[8px] uppercase tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>EE STORE Inventory Center</span>
          </div>
          <h2 className="text-sm font-black text-white font-sans flex items-center gap-1.5 mt-0.5">
            <Package className="h-4 w-4 text-indigo-400" />
            ระบบคลังสินค้าพัสดุและพัสดุประกอบแผง (EE STORE)
          </h2>
        </div>
      </div>

      {/* Sub-tab switcher (Compact layout) */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`pb-1.5 px-3 text-[11px] font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'products'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          รายการพัสดุ (Products)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`pb-1.5 px-3 text-[11px] font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'categories'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          กลุ่มสินค้า/หมวดหมู่ (Categories)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ordering')}
          className={`pb-1.5 px-3 text-[11px] font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'ordering'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
          id="btn-subtab-ordering"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          ระบบจัดซื้อและสั่งซื้อ (Purchasing)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('cart')}
          className={`pb-1.5 px-3 text-[11px] font-black tracking-wide font-sans transition-all border-b-2 relative -mb-[2px] cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'cart'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
          }`}
          id="btn-subtab-cart"
        >
          <ShoppingCart className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
          ตะกร้าขอจัดซื้อ (Shopping Cart)
          {cartItems.length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'categories' ? (
        <CategoryView
          categories={categories}
          products={products}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onEditProduct={onEditProduct}
        />
      ) : activeSubTab === 'ordering' ? (
        <OrderingSystemView
          products={products}
          addToast={addToast}
          onAdjustStock={onAdjustStock}
          preselectedProductId={preselectedProductId}
          onClearPreselectedProductId={() => setPreselectedProductId('')}
          employees={employees}
          jobProjects={jobProjects}
        />
      ) : activeSubTab === 'cart' ? (
        <ShoppingCartView
          cartItems={cartItems}
          setCartItems={setCartItems}
          employees={employees}
          jobProjects={jobProjects}
          addToast={addToast}
          setActiveSubTab={setActiveSubTab}
          boms={boms}
          setBoms={setBoms}
        />
      ) : (
        <>
          {/* Search & Action Bar (Horizontal & Flat) */}
          <div className="flex flex-row gap-2 items-center justify-between bg-slate-50 p-1.5 rounded-lg">
            {/* Left: Searches and category selection */}
            <div className="flex flex-row gap-1.5 flex-grow max-w-4xl text-left">
              {/* Search text */}
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสินค้า หรือ Code..."
                  className="w-full pl-8 pr-4 py-1 bg-white border border-slate-200/80 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="input-product-search"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Category drop */}
              <div className="relative min-w-[140px] flex items-center bg-white border border-slate-200/80 rounded px-2 py-1">
                <Filter className="h-3 w-3 text-slate-400 mr-1 flex-shrink-0" />
                <select
                  className="bg-transparent border-none text-[11px] text-slate-700 focus:outline-none w-full font-sans cursor-pointer appearance-none"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  id="select-category-filter"
                >
                  <option value="all">ทุกหมวดหมู่ ({mergedCategories.length})</option>
                  {mergedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.split(' (')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Trigger add product */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all cursor-pointer flex-shrink-0 active:scale-95"
                id="btn-add-product"
              >
                <Plus className="h-3 w-3" /> เพิ่มสินค้า
              </button>
            </div>
          </div>

          {/* Category Filter Cards Row (Flat & Wrapping - No horizontal scrollbar!) */}
          <div className="bg-slate-50/40 p-2 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 text-left border border-slate-100">
            <div className="flex items-center gap-1 shrink-0 mr-1">
              <Filter className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[10px] font-black text-slate-500 font-sans uppercase tracking-wider">หมวดหมู่:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setCategoryFilter('all');
                }}
                className={`p-1 pr-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  categoryFilter === 'all'
                    ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                    : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-800 font-medium'
                }`}
                id="btn-cat-filter-all"
              >
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200/50 flex items-center justify-center text-slate-500 shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[10px] font-black">ทั้งหมด</div>
                  <div className="text-[8.5px] text-slate-500 font-sans font-bold">{products.length} รายการ</div>
                </div>
              </button>

              {mergedCategories.map((cat) => {
                const count = products.filter((p) => p.category === cat.id).length;
                const isSelected = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategoryFilter(cat.id);
                      setViewMode('grouped');
                      setTimeout(() => {
                        const element = document.getElementById(`category-group-${cat.id}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 120);
                    }}
                    className={`p-1 pr-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                        : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-800 font-medium'
                    }`}
                    id={`btn-cat-filter-${cat.id}`}
                  >
                    <img
                      src={cat.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                      alt={cat.name}
                      className="w-8 h-8 object-cover rounded-md border border-slate-200/50 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-left leading-tight">
                      <div className="text-[10px] font-black">{cat.name.split(' (')[0]}</div>
                      <div className="text-[8.5px] text-slate-500 font-sans font-bold">{count} รายการพัสดุ</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-status Filters & View Mode Selector (Flat & Compact) */}
          <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSetStatusFilter('all')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                }`}
                id="btn-filter-status-all"
              >
                ทั้งหมด ({products.length})
              </button>
              <button
                onClick={() => onSetStatusFilter('low')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  statusFilter === 'low'
                    ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                }`}
                id="btn-filter-status-low"
              >
                ใกล้หมด ({products.filter((p) => p.quantity > 0 && p.quantity <= p.minAlert).length})
              </button>
              <button
                onClick={() => onSetStatusFilter('out')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  statusFilter === 'out'
                    ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                }`}
                id="btn-filter-status-out"
              >
                หมดคลัง ({products.filter((p) => p.quantity === 0).length})
              </button>
            </div>

            {/* View Layout Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded gap-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grouped'
                    ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                }`}
                id="btn-viewmode-grouped"
                type="button"
              >
                <Layers className="h-3 w-3" />
                แยกกลุ่ม
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white border-2 border-slate-400 text-black font-extrabold shadow-sm'
                    : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                }`}
                id="btn-viewmode-list"
                type="button"
              >
                <List className="h-3 w-3" />
                ทั้งหมด
              </button>
            </div>
          </div>


      {/* Reorder Mode Control Panel */}
      {isReorderMode && (
        <div className="bg-indigo-50/90 dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 rounded-2xl p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-slate-800 rounded-xl text-indigo-700 dark:text-indigo-400 shrink-0">
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-sans leading-tight">
                โหมดจัดระเบียบลำดับพัสดุสินค้า (Reorder Mode)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5 leading-relaxed">
                กดลูกศร <span className="font-bold text-indigo-600 dark:text-indigo-400">ขึ้น ⬆️</span> หรือ <span className="font-bold text-indigo-600 dark:text-indigo-400">ลง ⬇️</span> ในช่องจัดลำดับ เพื่อปรับเปลี่ยนสลับตำแหน่งแถวพัสดุด้วยตนเอง หรือกดปุ่มจัดรูปแบบอัตโนมัติเพื่อเรียงตามชื่อสินค้า (ตัวเลขน้อยอยู่บน) และบันทึกลงฐานข้อมูลทันที
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleAutoFormatOrder}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 transition-all shadow-sm flex items-center gap-1 cursor-pointer hover:scale-102 active:scale-98"
              id="btn-reorder-auto-format"
              type="button"
            >
              ✨ จัดรูปแบบอัตโนมัติ
            </button>
            <button
              onClick={() => setIsReorderMode(false)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer hover:scale-102 active:scale-98"
              id="btn-reorder-exit"
              type="button"
            >
              ❌ ปิดโหมดจัดลำดับ
            </button>
          </div>
        </div>
      )}

      {/* Product Grid / Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-400 mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700 font-sans">ไม่พบรายการสินค้าที่ค้นหา</h3>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
            ลองปรับเปลี่ยน Code ชื่อสินค้า หรือเลือกหมวดหมู่ใหม่อีกครั้ง
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-6">
          {/* Collapse/Expand Controls */}
          <div className="flex justify-between items-center bg-slate-50/50 border border-slate-150 rounded-xl px-4 py-2.5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 font-sans flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" /> จัดการแสดงผลกลุ่มสินค้า:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const updated: Record<string, boolean> = {};
                  productsByCategory.forEach((g) => {
                    updated[g.category.id] = true;
                  });
                  setCollapsedCategories(updated);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/80 bg-slate-100 border border-slate-200/80 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                id="btn-collapse-all"
                type="button"
              >
                <ChevronUp className="h-3.5 w-3.5" /> ยุบทั้งหมด
              </button>
              <button
                onClick={() => {
                  setCollapsedCategories({});
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/80 bg-slate-100 border border-slate-200/80 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                id="btn-expand-all"
                type="button"
              >
                <ChevronDown className="h-3.5 w-3.5" /> ขยายทั้งหมด
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {productsByCategory.map((group) => {
              const totalQty = group.products.reduce((sum, p) => sum + p.quantity, 0);
              const totalCostVal = group.products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);
              const totalSalesVal = group.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
              const isCollapsed = !!collapsedCategories[group.category.id];

              return (
                <div key={group.category.id} className="bg-slate-50/20 rounded-lg overflow-hidden" id={`category-group-${group.category.id}`}>
                  {/* Category Header with Stats */}
                  <div
                    className="bg-slate-100/50 py-2 px-3 flex flex-row items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-slate-100/75 transition-colors"
                    onClick={() => toggleCategoryCollapse(group.category.id)}
                    id={`group-header-${group.category.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <img
                        src={group.category.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                        alt={group.category.name}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-3xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className={`inline-block px-2.5 py-0.5 text-xs sm:text-sm font-black rounded-lg border shadow-3xs ${group.category.color}`}>
                          {group.category.name.split(' (')[0]}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-400 font-sans">
                          ({group.products.length} รายการ)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 font-sans" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-3xs">
                        <span className="text-slate-400 font-medium">สต็อกรวม:</span>
                        <span className="font-black text-slate-700 dark:text-slate-200">{totalQty} ชิ้น</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-3xs">
                        <span className="text-slate-400 font-medium">ทุนคลัง:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(totalCostVal)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(group.category, 'general')}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs shrink-0"
                        title="แก้ไขหมวดหมู่และจัดการ Series ย่อย"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>แก้ไขหมวดหมู่ / Series ย่อย</span>
                        <span className="ml-0.5 px-1.5 py-0.2 text-[10px] bg-indigo-200/60 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 rounded-md font-extrabold">
                          {group.category.subSeries?.length || group.category.series?.length || 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Table for this Category */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-150/70 dark:bg-slate-800/80 border-b-2 border-slate-250 dark:border-slate-700 text-[11.5px] font-black text-slate-600 dark:text-slate-350 font-sans uppercase tracking-wider">
                            <th className="py-3 px-3 min-w-[220px]">สินค้า (Product Name)</th>
                            {isReorderMode && (
                              <th className="py-3 px-2 text-center min-w-[90px] text-indigo-700 dark:text-indigo-400 font-extrabold">จัดลำดับ</th>
                            )}
                            <th className="py-3 px-3 min-w-[125px]">รุ่น (Specification)</th>
                            <th className="py-3 px-3 min-w-[125px]">รหัส (Code/SKU)</th>
                            <th className="py-3 px-3 text-right min-w-[105px]">ราคา (Price)</th>
                            <th className="py-3 px-3 text-center min-w-[150px]">สต็อกคงคลัง (Quantity)</th>
                            <th className="py-3 px-3 text-right min-w-[140px]">การจัดการ (Actions)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {(() => {
                            const seriesList = group.category.series || [];
                            const productsBySeries: { seriesName: string; products: Product[] }[] = [];

                            // 1. Group the ones belonging to defined series
                            seriesList.forEach((s) => {
                              const seriesProducts = group.products.filter((p) => p.series === s);
                              if (seriesProducts.length > 0) {
                                productsBySeries.push({
                                  seriesName: s,
                                  products: seriesProducts,
                                });
                              }
                            });

                            // 2. Put remaining products (with no series or non-matching series) in a default group
                            const categorizedProductIds = new Set(
                              productsBySeries.flatMap((ps) => ps.products.map((p) => p.id))
                            );
                            const remainingProducts = group.products.filter(
                              (p) => !categorizedProductIds.has(p.id)
                            );
                            if (remainingProducts.length > 0) {
                              productsBySeries.push({
                                seriesName: 'ทั่วไป / ไม่มี Series ย่อย',
                                products: remainingProducts,
                              });
                            }

                            const getSubSeriesColors = (name: string) => {
                              if (name === 'ทั่วไป / ไม่มี Series ย่อย') {
                                return {
                                  bg: 'bg-slate-50/70 dark:bg-slate-900/30',
                                  text: 'text-slate-600 dark:text-slate-400',
                                  border: 'border-l-[5px] border-l-slate-400 dark:border-l-slate-500',
                                  badgeBg: 'bg-slate-100 dark:bg-slate-800'
                                };
                              }
                              let hash = 0;
                              for (let i = 0; i < name.length; i++) {
                                hash = name.charCodeAt(i) + ((hash << 5) - hash);
                              }
                              const themes = [
                                { bg: 'bg-indigo-50/70 dark:bg-indigo-950/20', text: 'text-indigo-800 dark:text-indigo-300', border: 'border-l-[5px] border-l-indigo-600 dark:border-l-indigo-500', badgeBg: 'bg-indigo-100/50 dark:bg-indigo-950/40' },
                                { bg: 'bg-teal-50/70 dark:bg-teal-950/20', text: 'text-teal-800 dark:text-teal-300', border: 'border-l-[5px] border-l-teal-600 dark:border-l-teal-500', badgeBg: 'bg-teal-100/50 dark:bg-teal-950/40' },
                                { bg: 'bg-amber-50/70 dark:bg-amber-950/20', text: 'text-amber-800 dark:text-amber-300', border: 'border-l-[5px] border-l-amber-500 dark:border-l-amber-500', badgeBg: 'bg-amber-100/50 dark:bg-amber-950/40' },
                                { bg: 'bg-pink-50/70 dark:bg-pink-950/20', text: 'text-pink-800 dark:text-pink-300', border: 'border-l-[5px] border-l-pink-500 dark:border-l-pink-500', badgeBg: 'bg-pink-100/50 dark:bg-pink-950/40' },
                                { bg: 'bg-emerald-50/70 dark:bg-emerald-950/20', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-l-[5px] border-l-emerald-600 dark:border-l-emerald-500', badgeBg: 'bg-emerald-100/50 dark:bg-emerald-950/40' },
                                { bg: 'bg-sky-50/70 dark:bg-sky-950/20', text: 'text-sky-800 dark:text-sky-300', border: 'border-l-[5px] border-l-sky-500 dark:border-l-sky-500', badgeBg: 'bg-sky-100/50 dark:bg-sky-950/40' },
                                { bg: 'bg-violet-50/70 dark:bg-violet-950/20', text: 'text-violet-800 dark:text-violet-300', border: 'border-l-[5px] border-l-violet-600 dark:border-l-violet-500', badgeBg: 'bg-violet-100/50 dark:bg-violet-950/40' }
                              ];
                              return themes[Math.abs(hash) % themes.length];
                            };

                            return productsBySeries.map((ps) => {
                              const colors = getSubSeriesColors(ps.seriesName);
                              return (
                                <React.Fragment key={ps.seriesName}>
                                  {/* Series Divider Header Row */}
                                  {ps.seriesName !== 'ทั่วไป / ไม่มี Series ย่อย' && (
                                    <tr className={`${colors.bg} ${colors.text} ${colors.border} text-[10px] font-black font-sans border-y border-slate-100/50 transition-all shadow-3xs`}>
                                      <td colSpan={isReorderMode ? 7 : 6} className="h-[72px] py-0 px-6">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            {(() => {
                                              const matchingSubSer = (group.category.subSeries || []).find((s) => s.name === ps.seriesName);
                                              const subSerImg = matchingSubSer?.imageUrl;
                                              return subSerImg ? (
                                                <img
                                                  src={subSerImg}
                                                  alt={ps.seriesName}
                                                  className="h-[70px] w-[70px] rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0 shadow-3xs hover:scale-105 transition-transform duration-200"
                                                  referrerPolicy="no-referrer"
                                                />
                                              ) : (
                                                <span className={`p-2 rounded-xl ${colors.badgeBg} flex items-center justify-center h-[70px] w-[70px] shrink-0 border border-slate-200/50`}>
                                                  <Tag className="h-8 w-8 text-indigo-500 shrink-0" />
                                                </span>
                                              );
                                            })()}
                                            <div>
                                              <span className="uppercase tracking-wide font-extrabold text-[12px] block sm:inline">Series ย่อย: {ps.seriesName}</span>
                                              <span className="ml-1.5 text-[9px] font-normal text-slate-400 dark:text-slate-500 font-sans">
                                                ({ps.products.length} รายการ)
                                              </span>
                                              {(() => {
                                                const matchingSubSer = (group.category.subSeries || []).find((s) => s.name === ps.seriesName);
                                                return matchingSubSer?.pdfUrl && (
                                                  <button
                                                    onClick={() => handleOpenPdf(matchingSubSer.pdfUrl)}
                                                    className="ml-3 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded text-[9px] font-black flex items-center gap-1 cursor-pointer transition-all inline-flex"
                                                    title="เปิดเอกสาร/คู่มือ"
                                                  >
                                                    <FileText className="h-3 w-3" />
                                                    เปิดเอกสาร
                                                  </button>
                                                );
                                              })()}
                                            </div>
                                          </div>

                                          {/* Organize/Reorder buttons for Sub Series */}
                                          {isReorderMode ? (
                                            <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200/80 shadow-xs shrink-0">
                                              <span className="text-[10.5px] text-slate-500 font-extrabold px-1.5 font-sans">จัดลำดับกลุ่มย่อย:</span>
                                              <button
                                                onClick={() => handleMoveSubSeries(group.category.id, ps.seriesName, 'up')}
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-850 rounded-lg border border-indigo-200 hover:scale-103 active:scale-97 cursor-pointer transition-all flex items-center gap-0.5 font-black text-[10.5px]"
                                                title="เลื่อนกลุ่มย่อยขึ้น"
                                                type="button"
                                              >
                                                <ChevronUp className="h-3 w-3" />
                                                <span>เลื่อนขึ้น</span>
                                              </button>
                                              <button
                                                onClick={() => handleMoveSubSeries(group.category.id, ps.seriesName, 'down')}
                                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-850 rounded-lg border border-indigo-200 hover:scale-103 active:scale-97 cursor-pointer transition-all flex items-center gap-0.5 font-black text-[10.5px]"
                                                title="เลื่อนกลุ่มย่อยลง"
                                                type="button"
                                              >
                                                <ChevronDown className="h-3 w-3" />
                                                <span>เลื่อนลง</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => setIsReorderMode(true)}
                                              className="px-3 py-1.5 text-[10.5px] font-black rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-102 active:scale-98 shrink-0"
                                              type="button"
                                            >
                                              <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600" />
                                              จัดระเบียบแก้ไข
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}

                                  {ps.products.map((p) => {
                                    const isOutOfStock = p.quantity === 0;
                                    const isLowStock = p.quantity > 0 && p.quantity <= p.minAlert;

                                    let stockColor = 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900';
                                    let stockLabel = 'ปลอดภัย';
                                    if (isOutOfStock) {
                                      stockColor = 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900';
                                      stockLabel = 'หมดคลัง';
                                    } else if (isLowStock) {
                                      stockColor = 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900';
                                      stockLabel = 'เหลือน้อย';
                                    }

                                    return (
                                      <tr key={p.id} className="hover:bg-indigo-50/15 dark:hover:bg-slate-900/30 transition-all group border-b border-slate-200/60 dark:border-slate-800/60">
                                        {/* Name & Photo */}
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-3.5">
                                            <img
                                              src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=200'}
                                              alt={p.name}
                                              className="w-12 h-12 object-cover rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs transition-transform duration-200 group-hover:scale-105"
                                              referrerPolicy="no-referrer"
                                            />
                                            <div className="min-w-0">
                                              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-snug text-[13px] sm:text-[14px] flex items-center gap-1.5 flex-wrap" title={p.name}>
                                                <span>{p.name}</span>
                                                {getColorDotAndBadge(p.color)}
                                              </h4>
                                              <div className="flex flex-wrap gap-1.5 items-center mt-1 text-[11px] leading-[11px]">
                                                <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded border border-indigo-100 dark:border-indigo-900 shadow-3xs leading-none">
                                                  📍 คลัง: {p.warehouse || 'A'}
                                                </span>
                                                {(() => {
                                                   const bMatch = brands.find(b => b.name === p.brand);
                                                   if (bMatch) {
                                                     return (
                                                       <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-black text-slate-700 bg-slate-100 dark:bg-slate-850 dark:text-slate-300 rounded-md leading-none shrink-0 border border-slate-200 dark:border-slate-750">
                                                         {bMatch.logoUrl ? (
                                                           <img src={bMatch.logoUrl} alt={p.brand} className="h-4.5 object-contain" referrerPolicy="no-referrer" />
                                                         ) : (
                                                           <span>🏷️ {p.brand}</span>
                                                         )}
                                                       </span>
                                                     );
                                                   }
                                                   return null;
                                                 })()}
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Custom Reordering Buttons Column cell */}
                                        {isReorderMode && (
                                          <td className="py-3 px-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <button
                                                onClick={() => handleMoveProduct(p.id, 'up')}
                                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900 transition-colors shadow-3xs cursor-pointer"
                                                title="เลื่อนขึ้น"
                                                type="button"
                                              >
                                                <ChevronUp className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleMoveProduct(p.id, 'down')}
                                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900 text-indigo-650 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900 transition-colors shadow-3xs cursor-pointer"
                                                title="เลื่อนลง"
                                                type="button"
                                              >
                                                <ChevronDown className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        )}

                                        {/* Model Number */}
                                        <td className="py-3 px-3 font-mono">
                                          {p.modelNumber !== undefined && p.modelNumber !== null && String(p.modelNumber).trim() !== '' ? (
                                            <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-md border border-rose-200/70 dark:border-rose-900/45 text-[11.5px] font-black inline-block shadow-3xs">
                                              รุ่น {p.modelNumber} {p.modelUnit || 'Kg'}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 dark:text-slate-600 text-[10px] italic">ไม่มีข้อมูลรุ่น</span>
                                          )}
                                        </td>

                                        {/* Sku/Code */}
                                        <td className="py-3 px-3 font-mono">
                                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-bold shadow-3xs">
                                            {p.sku}
                                          </span>
                                        </td>

                                        {/* Price */}
                                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-[13px] sm:text-[14px]">
                                          {formatCurrency(p.price)}
                                        </td>

                                        {/* Real-time quantity counter / adjusting buttons */}
                                        <td className="py-3 px-3">
                                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-3xs">
                                              <button
                                                onClick={() => handleQuickMinus(p)}
                                                disabled={p.quantity <= 0}
                                                className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                                title="ลดสต็อก 1 ชิ้น"
                                                id={`btn-quick-minus-item-grouped-${p.id}`}
                                                type="button"
                                              >
                                                <MinusCircle className="h-4 w-4" />
                                              </button>
                                              <span className="font-extrabold text-[12px] text-slate-800 dark:text-slate-200 w-6 text-center font-mono leading-none">
                                                {p.quantity}
                                              </span>
                                              <button
                                                onClick={() => handleQuickAdd(p)}
                                                className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                                title="เพิ่มสต็อก 1 ชิ้น"
                                                id={`btn-quick-plus-item-grouped-${p.id}`}
                                                type="button"
                                              >
                                                <PlusCircle className="h-4 w-4" />
                                              </button>
                                            </div>
                                            <div className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-3xs ${stockColor}`}>
                                              {stockLabel} ({p.minAlert})
                                            </div>
                                          </div>
                                        </td>

                                        {/* CRUD Actions */}
                                        <td className="py-3 px-3 text-right">
                                          <div className="flex items-center justify-end gap-1 flex-wrap">
                                            {p.sourceUrl && (
                                              <a
                                                href={p.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-1.5 py-0.5 text-[9px] font-black text-blue-700 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer inline-flex items-center gap-0.5 active:scale-95 transition-all"
                                                title="ลิงก์สั่งซื้อพัสดุจากตัวแทนจำหน่ายภายนอก"
                                              >
                                                <ExternalLink className="h-2.5 w-2.5" /> ลิงก์สั่งซื้อ
                                              </a>
                                            )}
                                            {(() => {
                                              const matchingSubSer = (group.category.subSeries || []).find((s) => s.name === ps.seriesName);
                                              return matchingSubSer?.pdfUrl && (
                                                <button
                                                  onClick={() => handleOpenPdf(matchingSubSer.pdfUrl)}
                                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded text-[9px] font-black flex items-center gap-1 cursor-pointer transition-all inline-flex active:scale-95"
                                                  title="เปิดเอกสารรายละเอียดผลิตภัณฑ์"
                                                  type="button"
                                                >
                                                  <FileText className="h-2.5 w-2.5" /> เปิดเอกสาร
                                                </button>
                                              );
                                            })()}
                                            <button
                                              onClick={() => handleAddToCart(p)}
                                              className="px-1.5 py-0.2 text-[9px] font-black text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded cursor-pointer flex items-center gap-0.5 active:scale-95 transition-all"
                                              title="หยิบพัสดุลงในตะกร้าจัดซื้อ"
                                              id={`btn-add-to-cart-item-grouped-${p.id}`}
                                              type="button"
                                            >
                                              <ShoppingCart className="h-2.5 w-2.5 text-indigo-500" /> หยิบลงตะกร้า
                                            </button>
                                            <button
                                              onClick={() => {
                                                setPreselectedProductId(p.id);
                                                setActiveSubTab('ordering');
                                              }}
                                              className="px-1 py-0.2 text-[9px] font-black text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded cursor-pointer flex items-center gap-0.5"
                                              title="สร้างใบขอสั่งซื้อพัสดุ"
                                              id={`btn-purchase-item-grouped-${p.id}`}
                                              type="button"
                                            >
                                              <ShoppingCart className="h-2.5 w-2.5" /> สั่งซื้อ
                                            </button>
                                            <button
                                              onClick={() => handleOpenAdjustDialog(p)}
                                              className="px-1 py-0.2 text-[9px] font-black text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded cursor-pointer"
                                              id={`btn-adjust-details-item-grouped-${p.id}`}
                                              type="button"
                                            >
                                              รับ/จ่าย
                                            </button>
                                            <button
                                              onClick={() => handleOpenEditModal(p)}
                                              className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded cursor-pointer"
                                              title="แก้ไข"
                                              id={`btn-edit-item-grouped-${p.id}`}
                                              type="button"
                                            >
                                              <Edit3 className="h-3 w-3" />
                                            </button>
                                            <button
                                              onClick={() => handleOpenCloneModal(p)}
                                              className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                                              title="คัดลอกพัสดุ (Clone)"
                                              id={`btn-clone-item-grouped-${p.id}`}
                                              type="button"
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() => onDeleteProduct(p.id)}
                                              className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                              title="ลบ"
                                              id={`btn-delete-item-grouped-${p.id}`}
                                              type="button"
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
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-slate-55 border border-slate-150 rounded-xl px-4 py-2 text-center text-[10px] text-slate-400 font-sans shadow-3xs">
            แสดงข้อมูลสต็อกคงคลังแบบแยกกลุ่มประเภทเสร็จสมบูรณ์ ({filteredProducts.length} รายการพัสดุ)
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="table-products">
              <thead>
                <tr className="bg-slate-150/70 dark:bg-slate-800/80 border-b-2 border-slate-250 dark:border-slate-700 text-[11.5px] font-black text-slate-600 dark:text-slate-350 font-sans uppercase tracking-wider">
                  <th className="py-3 px-3 min-w-[220px]">สินค้า (Product Name)</th>
                  {isReorderMode && (
                    <th className="py-3 px-2 text-center min-w-[90px] text-indigo-700 dark:text-indigo-400 font-extrabold">จัดลำดับ</th>
                  )}
                  <th className="py-3 px-3 min-w-[125px]">รุ่น (Specification)</th>
                  <th className="py-3 px-3 min-w-[160px]">หมวดหมู่ / รหัส (Category / Code)</th>
                  <th className="py-3 px-3 text-right min-w-[105px]">ราคา (Price)</th>
                  <th className="py-3 px-3 text-center min-w-[150px]">สต็อกคงคลัง (Quantity)</th>
                  <th className="py-3 px-3 text-right min-w-[140px]">การจัดการ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.quantity === 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.minAlert;
                  
                  let stockColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  let stockLabel = 'ปลอดภัย';
                  if (isOutOfStock) {
                    stockColor = 'bg-rose-50 text-rose-800 border-rose-100 animate-pulse';
                    stockLabel = 'หมดคลัง';
                  } else if (isLowStock) {
                    stockColor = 'bg-amber-50 text-amber-800 border-amber-100';
                    stockLabel = 'เหลือน้อย';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/15 dark:hover:bg-slate-900/30 transition-all group border-b border-slate-200/60 dark:border-slate-800/60">
                      {/* Name & Photo */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=200'}
                            alt={p.name}
                            className="w-12 h-12 object-cover rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs transition-transform duration-200 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            {p.series && (
                              <span className="block text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 font-sans uppercase tracking-wide leading-none mb-0.5">
                                🏷️ {p.series}
                              </span>
                            )}
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 font-sans leading-snug text-[13px] sm:text-[14px] flex items-center gap-1.5 flex-wrap" title={p.name}>
                              <span>{p.name}</span>
                              {getColorDotAndBadge(p.color)}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 items-center mt-1 leading-none">
                              {(() => {
                                const bMatch = brands.find(b => b.name === p.brand);
                                if (bMatch) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-black text-slate-700 bg-slate-100 dark:bg-slate-850 dark:text-slate-300 rounded-md leading-none shrink-0 border border-slate-200 dark:border-slate-750">
                                      {bMatch.logoUrl ? (
                                        <img src={bMatch.logoUrl} alt={p.brand} className="h-4.5 object-contain" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span>🏷️ {p.brand}</span>
                                      )}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Custom Reordering Buttons Column cell */}
                      {isReorderMode && (
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-fit mx-auto shadow-3xs">
                            <button
                              onClick={() => handleMoveProduct(p.id, 'up')}
                              className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                              title="เลื่อนขึ้น"
                              id={`btn-reorder-up-list-${p.id}`}
                              type="button"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMoveProduct(p.id, 'down')}
                              className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                              title="เลื่อนลง"
                              id={`btn-reorder-down-list-${p.id}`}
                              type="button"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* รุ่น (Model) */}
                      <td className="py-3 px-3 font-mono">
                        {p.modelNumber !== undefined && p.modelNumber !== null && String(p.modelNumber).trim() !== '' ? (
                          <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-md border border-rose-200/70 dark:border-rose-900/45 text-[11.5px] font-black inline-block shadow-3xs">
                            รุ่น {p.modelNumber} {p.modelUnit || 'Kg'}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-[10px] italic">ไม่มีข้อมูลรุ่น</span>
                        )}
                      </td>

                      {/* Category & SKU */}
                      <td className="py-3 px-3">
                        <div 
                          className="flex flex-wrap items-center gap-1.5 mb-1 cursor-pointer group/cat hover:opacity-80" 
                          title="กดเพื่อกรองกลุ่มนี้และเลื่อนลง" 
                          onClick={() => {
                            setCategoryFilter(p.category);
                            setViewMode('grouped');
                            setTimeout(() => {
                              const element = document.getElementById(`category-group-${p.category}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }, 120);
                          }}
                        >
                          <img 
                            src={mergedCategories.find(c => c.id === p.category)?.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'} 
                            alt={getCategoryName(p.category)} 
                            className="w-5.5 h-5.5 object-cover rounded border border-slate-200 group-hover/cat:ring-1 group-hover/cat:ring-indigo-500"
                            referrerPolicy="no-referrer"
                          />
                          <span className={`inline-block px-1.5 py-0.5 text-[8.5px] font-black rounded border leading-none ${getCategoryBadgeClass(p.category)}`}>
                            {getCategoryName(p.category).split(' (')[0]}
                          </span>
                          {p.series && (
                            <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-black rounded border bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-150 dark:border-indigo-850 leading-none">
                              🏷️ {p.series}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 tracking-tight leading-none bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 w-fit">{p.sku}</div>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[12px] sm:text-[13px] leading-none">{formatCurrency(p.costPrice)}</div>
                      </td>

                      {/* Real-time quantity counter / adjusting buttons */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-3xs">
                            <button
                              onClick={() => handleQuickMinus(p)}
                              disabled={p.quantity <= 0}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="ลดสต็อก 1 ชิ้น"
                              id={`btn-quick-minus-item-${p.id}`}
                              type="button"
                            >
                              <MinusCircle className="h-4 w-4" />
                            </button>
                            <span className="font-extrabold text-[12px] text-slate-800 dark:text-slate-200 w-6 text-center font-mono leading-none">
                              {p.quantity}
                            </span>
                            <button
                              onClick={() => handleQuickAdd(p)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                              title="เพิ่มสต็อก 1 ชิ้น"
                              id={`btn-quick-plus-item-${p.id}`}
                              type="button"
                            >
                              <PlusCircle className="h-4 w-4" />
                            </button>
                          </div>
                          <div className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-3xs ${stockColor}`}>
                            {stockLabel} ({p.minAlert})
                          </div>
                        </div>
                      </td>

                      {/* CRUD Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {p.sourceUrl && (
                            <a
                              href={p.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 text-[9px] font-black text-blue-700 hover:bg-blue-50 border border-blue-200 rounded cursor-pointer inline-flex items-center gap-0.5 active:scale-95 transition-all"
                              title="ลิงก์สั่งซื้อพัสดุจากตัวแทนจำหน่ายภายนอก"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> ลิงก์สั่งซื้อ
                            </a>
                          )}
                          {(() => {
                            const parentCat = mergedCategories.find(c => c.id === p.category);
                            const matchingSubSer = parentCat?.subSeries?.find(s => s.name === p.series);
                            return matchingSubSer?.pdfUrl && (
                              <button
                                onClick={() => handleOpenPdf(matchingSubSer.pdfUrl)}
                                className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded text-[9px] font-black flex items-center gap-1 cursor-pointer transition-all inline-flex active:scale-95"
                                title="เปิดเอกสารรายละเอียดผลิตภัณฑ์"
                                type="button"
                              >
                                <FileText className="h-2.5 w-2.5" /> เปิดเอกสาร
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => handleAddToCart(p)}
                            className="px-1.5 py-0.2 text-[9px] font-black text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded cursor-pointer flex items-center gap-0.5 active:scale-95 transition-all"
                            title="หยิบพัสดุลงในตะกร้าจัดซื้อ"
                            id={`btn-add-to-cart-item-${p.id}`}
                            type="button"
                          >
                            <ShoppingCart className="h-2.5 w-2.5 text-indigo-500" /> หยิบลงตะกร้า
                          </button>
                          <button
                            onClick={() => {
                              setPreselectedProductId(p.id);
                              setActiveSubTab('ordering');
                            }}
                            className="px-1 py-0.2 text-[9px] font-black text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded cursor-pointer flex items-center gap-0.5"
                            title="สร้างใบขอสั่งซื้อพัสดุ"
                            id={`btn-purchase-item-${p.id}`}
                          >
                            <ShoppingCart className="h-2.5 w-2.5" /> สั่งซื้อ
                          </button>
                          <button
                            onClick={() => handleOpenAdjustDialog(p)}
                            className="px-1 py-0.2 text-[9px] font-black text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded cursor-pointer"
                            id={`btn-adjust-details-item-${p.id}`}
                          >
                            รับ/จ่าย
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded cursor-pointer"
                            title="แก้ไข"
                            id={`btn-edit-item-${p.id}`}
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleOpenCloneModal(p)}
                            className="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                            title="คัดลอกพัสดุ (Clone)"
                            id={`btn-clone-item-${p.id}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="ลบ"
                            id={`btn-delete-item-${p.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-55 px-4 py-2 border-t border-slate-150 text-[10px] text-slate-400 font-sans text-center">
            แสดงข้อมูลพัสดุ {filteredProducts.length} รายการ จากทั้งหมด {products.length} รายการในสต็อกระบบ
          </div>
        </div>
      )}

      {/* -------------------- ADD / EDIT MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col p-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800 font-sans">
                {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าเข้าคลังใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="space-y-3 py-2 flex-grow text-[11px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1 (Left): General Info */}
                <div className="space-y-3">
                  {/* Product Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 font-sans">ชื่อสินค้า <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมาร์ทโฟน X1 Neo"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>

                  {/* Model Number / Unit and SKU */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-600 font-sans">รุ่น (ตัวเลข)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="ระบุรุ่น"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                          value={formModelNumber}
                          onChange={(e) => setFormModelNumber(e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-xs font-bold text-slate-600 font-sans">หน่วย</label>
                        <select
                          className="w-full px-1 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans cursor-pointer"
                          value={formModelUnit}
                          onChange={(e) => setFormModelUnit(e.target.value)}
                        >
                          <option value="Kg">Kg</option>
                          <option value="mm">mm</option>
                          <option value="A">A</option>
                          <option value="W">W</option>
                          <option value="V">V</option>
                          <option value="Hp">Hp</option>
                          <option value="Pin">Pin</option>
                          <option value="Ch">Ch</option>
                          <option value="Rpm">Rpm</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 font-sans">Code <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น EL-SP-001"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans font-mono uppercase transition-all"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* Category and Series */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">หมวดหมู่กลุ่ม <span className="text-rose-500">*</span></label>
                      <select
                        required
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                        value={formCategory}
                        onChange={(e) => {
                          setFormCategory(e.target.value);
                          setFormSeries('');
                        }}
                      >
                        {mergedCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">Series ย่อย (Sub Series)</label>
                      {(() => {
                        const selectedCat = mergedCategories.find((c) => c.id === formCategory);
                        const listFromSeries = selectedCat?.series || [];
                        const listFromSubSeries = (selectedCat?.subSeries || []).map((s) => s.name);
                        const availableSeries = Array.from(new Set([...listFromSeries, ...listFromSubSeries])).filter(Boolean);
                        
                        if (availableSeries.length > 0) {
                          return (
                            <select
                              className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                              value={formSeries}
                              onChange={(e) => setFormSeries(e.target.value)}
                            >
                              <option value="">-- ไม่มี Series ย่อย --</option>
                              {availableSeries.map((s, idx) => (
                                <option key={idx} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          );
                        } else {
                          return (
                            <input
                              type="text"
                              placeholder="ระบุชื่อ Series ย่อยเอง"
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all text-slate-800 dark:text-slate-100"
                              value={formSeries}
                              onChange={(e) => setFormSeries(e.target.value)}
                            />
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Brand Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans flex items-center gap-1">
                      <Tag className="h-3 w-3 text-indigo-500" />
                      <span>แบรนด์สินค้า (Brand)</span>
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                    >
                      <option value="">-- ไม่ระบุแบรนด์สินค้า / ทั่วไป --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">สีหลักของสินค้า</label>
                    <div className="flex flex-wrap gap-1 items-center">
                      {PRODUCT_COLORS.map((colorObj) => {
                        const isSelected = formColor === colorObj.name;
                        return (
                          <button
                            key={colorObj.name}
                            type="button"
                            onClick={() => setFormColor(isSelected ? '' : colorObj.name)}
                            className={"group relative w-6 h-6 rounded-full border transition-all flex items-center justify-center cursor-pointer " + (
                              isSelected 
                                ? "ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-1 scale-110 shadow-sm" 
                                : "hover:scale-105 border-slate-200 dark:border-slate-700"
                            )}
                            style={{
                              background: colorObj.hex,
                              borderColor: isSelected ? undefined : (colorObj.name === "ขาว" ? "#CBD5E1" : "transparent")
                            }}
                            title={colorObj.name}
                          >
                            {isSelected && (
                              <span className={"text-[9px] font-black leading-none " + (
                                ["ขาว", "เหลือง", "เขียว-เหลือง"].includes(colorObj.name) ? "text-slate-900" : "text-white"
                              )}>
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Column 2 (Right): Inventory, Specs & Images */}
                <div className="space-y-3">
                  
                  {/* Prices & Alarm Level */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">ราคาทุนสินค้า (฿) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all text-slate-800 dark:text-slate-100"
                        value={formCostPrice}
                        onChange={(e) => setFormCostPrice(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">แจ้งเตือนขั้นต่ำ (Min Alarm) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="เช่น 5"
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all text-slate-800 dark:text-slate-100"
                        value={formMinAlert}
                        onChange={(e) => setFormMinAlert(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                  </div>

                  {/* Stock & Warehouse */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">
                        {editingProduct ? "จำนวนคงเหลือปัจจุบัน" : "จำนวนสต็อกเริ่มต้น"} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all text-slate-800 dark:text-slate-100"
                        value={formQuantity}
                        onChange={(e) => setFormQuantity(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">สถานที่จัดเก็บ/คลังสินค้า <span className="text-rose-500">*</span></label>
                      <select
                        required
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                        value={formWarehouse}
                        onChange={(e) => setFormWarehouse(e.target.value)}
                      >
                        <option value="คลังสินค้าหลัก A">คลังสินค้าหลัก A</option>
                        <option value="คลังสำรอง B">คลังสำรอง B</option>
                        <option value="คลังสินค้าหน้าร้าน C">คลังสินค้าหน้าร้าน C</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 font-sans">คำอธิบาย/รายละเอียดสินค้า</label>
                    <textarea
                      placeholder="ระบุสเปคสินค้า รายละเอียดบรรจุภัณฑ์ การรับประกัน..."
                      rows={1.5}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      id="input-product-desc"
                    />
                  </div>

                  {/* Reference URL */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 font-sans flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 text-slate-400" /> ลิงก์สั่งซื้อ/แหล่งอ้างอิงสินค้า (URL)
                    </label>
                    <input
                      type="url"
                      placeholder="เช่น https://shopee.co.th/... หรือลิงก์สั่งซื้ออื่นๆ"
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                      value={formSourceUrl}
                      onChange={(e) => setFormSourceUrl(e.target.value)}
                      id="input-product-source-url"
                    />
                  </div>

                  {/* Image Drag & Drop Compact */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 font-sans">รูปภาพสินค้า</label>
                      <button
                        type="button"
                        onClick={() => setShowGallery(!showGallery)}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="h-3 w-3" /> {showGallery ? 'ปิดคลังภาพ' : 'เลือกจากคลังภาพสำเร็จรูป'}
                      </button>
                    </div>

                    {showGallery && (
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 max-h-[100px] overflow-y-auto">
                        <div className="grid grid-cols-4 gap-1.5">
                          {PRESET_IMAGES.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectPresetImage(img.url)}
                              className="group relative rounded-lg overflow-hidden border border-slate-200 h-10 text-left focus:outline-none cursor-pointer"
                            >
                              <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/30 flex items-end p-0.5">
                                <span className="text-[8px] font-bold text-white line-clamp-1">{img.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Compact Drag & Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={"border border-dashed rounded-xl p-1.5 text-center transition-all flex items-center gap-3 " + (
                        isDragOver ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                      )}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      {/* Preview Thumb */}
                      <div className="relative flex-shrink-0">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormImage('');
                                setImagePreview('');
                              }}
                              className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full shadow-sm hover:bg-rose-600 cursor-pointer"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div className="text-left">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          อัปโหลดรูปภาพสินค้า
                        </button>
                        <p className="text-[8px] text-slate-400 font-sans">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Form Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3 mt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                  id="btn-submit-product-form"
                >
                  {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้าใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- DETAILED TRANSACTION DIALOG -------------------- */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 font-sans">ทำรายการสินค้า: {adjustingProduct.name}</h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('in')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustType === 'in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  นำสินค้าเข้าสต็อก (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('out')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    adjustType === 'out' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  จ่ายสินค้าออก/ขาย (-)
                </button>
              </div>

              {/* Current Quantity display */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-sans">จำนวนสินค้าในคลังปัจจุบัน:</span>
                <span className="font-bold text-slate-800 font-mono">{adjustingProduct.quantity} ชิ้น</span>
              </div>

              {/* Adjustment amount input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 font-sans">จำนวนที่ต้องการเปลี่ยนแปลง <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                />
              </div>

              {/* Reason description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 font-sans">หมายเหตุ/รายละเอียดของรายการ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตรวจนับคลังสินค้าประจำสัปดาห์"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer ${
                    adjustType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                  id="btn-submit-quick-adjust"
                >
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY & SUB-SERIES MODAL */}
      {editingCatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-left max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-sans">
                    จัดการหมวดหมู่ &amp; Sub Series
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                    {editingCatModal.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCatModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setEditCatTab('general')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  editCatTab === 'general'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>ข้อมูลหมวดหมู่</span>
              </button>
              <button
                type="button"
                onClick={() => setEditCatTab('subseries')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  editCatTab === 'subseries'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>จัดการ Sub Series ({catSubSeriesList.length})</span>
              </button>
            </div>

            {/* Tab 1: General Category Info */}
            <form onSubmit={handleSaveCategoryModal} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {editCatTab === 'general' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      ชื่อหมวดหมู่ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catFormName}
                      onChange={(e) => setCatFormName(e.target.value)}
                      placeholder="ระบุชื่อหมวดหมู่สินค้า..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      คำอธิบายเพิ่มเติม
                    </label>
                    <textarea
                      rows={2}
                      value={catFormDescription}
                      onChange={(e) => setCatFormDescription(e.target.value)}
                      placeholder="รายละเอียดสั้นๆ ของหมวดหมู่นี้..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      รูปภาพประกอบหมวดหมู่ (URL)
                    </label>
                    <input
                      type="text"
                      value={catFormImageUrl}
                      onChange={(e) => setCatFormImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      ธีมสีป้ายหมวดหมู่
                    </label>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[
                        { name: 'น้ำเงิน', value: 'bg-blue-100 text-blue-800 border-blue-150 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' },
                        { name: 'ม่วง', value: 'bg-purple-100 text-purple-800 border-purple-150 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800' },
                        { name: 'ส้มทอง', value: 'bg-amber-100 text-amber-800 border-amber-150 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' },
                        { name: 'เขียว', value: 'bg-emerald-100 text-emerald-800 border-emerald-150 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' },
                        { name: 'แดงชมพู', value: 'bg-rose-100 text-rose-800 border-rose-150 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800' },
                        { name: 'ฟ้าคราม', value: 'bg-cyan-100 text-cyan-800 border-cyan-150 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800' },
                        { name: 'เทาสุขุม', value: 'bg-slate-100 text-slate-800 border-slate-150 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700' },
                        { name: 'แดงสด', value: 'bg-red-100 text-red-800 border-red-150 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800' },
                      ].map((colorOpt) => (
                        <button
                          key={colorOpt.name}
                          type="button"
                          onClick={() => setCatFormColor(colorOpt.value)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-sans transition-all cursor-pointer text-center ${colorOpt.value} ${
                            catFormColor === colorOpt.value ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'
                          }`}
                        >
                          {colorOpt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Sub-Series Management */}
              {editCatTab === 'subseries' && (
                <div className="space-y-5">
                  {/* Form for Adding / Editing Sub Series */}
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-150 dark:border-purple-900/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 dark:text-purple-200 font-sans flex items-center gap-1.5">
                        <PlusCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        {editingSubSeriesIndex !== null ? 'แก้ไข Sub Series' : 'เพิ่ม Sub Series ใหม่'}
                      </span>
                      {editingSubSeriesIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubSeriesIndex(null);
                            setSubSeriesInputName('');
                            setSubSeriesInputImageUrl('');
                            setSubSeriesInputPdfUrl('');
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                        >
                          ยกเลิกการแก้ไข
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                          ชื่อ Sub Series / รุ่นย่อย <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subSeriesInputName}
                          onChange={(e) => setSubSeriesInputName(e.target.value)}
                          placeholder="เช่น 1 Pole, 3 Pole, Series A..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans flex items-center justify-between">
                          <span>รูปภาพ Sub Series</span>
                          <label className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer">
                            + อัปโหลดรูป
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === 'string') {
                                    setSubSeriesInputImageUrl(reader.result);
                                    if (onAddMediaFile) {
                                      onAddMediaFile({
                                        name: `รูปซีรีส์ย่อย: ${subSeriesInputName || file.name}`,
                                        type: 'image',
                                        url: reader.result,
                                        category: 'รูปหมวดหมู่',
                                        refName: editingCatModal?.name || undefined,
                                        size: file.size,
                                        fileType: file.name.split('.').pop()?.toUpperCase() || 'PNG'
                                      });
                                    }
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </label>
                        <input
                          type="text"
                          value={subSeriesInputImageUrl}
                          onChange={(e) => setSubSeriesInputImageUrl(e.target.value)}
                          placeholder="URL รูปภาพ..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans flex items-center justify-between">
                          <span>คู่มือสินค้า (PDF)</span>
                          <label className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer">
                            + อัปโหลด PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === 'string') {
                                    setSubSeriesInputPdfUrl(reader.result);
                                    if (onAddMediaFile) {
                                      onAddMediaFile({
                                        name: `คู่มือ/แคตตาล็อก: ${subSeriesInputName || file.name}`,
                                        type: 'document',
                                        url: reader.result,
                                        category: 'คู่มือ / เอกสารทางเทคนิค',
                                        refName: editingCatModal?.name || undefined,
                                        size: file.size,
                                        fileType: 'PDF'
                                      });
                                    }
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </label>
                        <input
                          type="text"
                          value={subSeriesInputPdfUrl}
                          onChange={(e) => setSubSeriesInputPdfUrl(e.target.value)}
                          placeholder="URL ไฟล์ PDF..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddOrUpdateSubSeries}
                        className="px-4 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {editingSubSeriesIndex !== null ? <Edit3 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        <span>{editingSubSeriesIndex !== null ? 'บันทึก Sub Series' : 'เพิ่ม Sub Series'}</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Existing Sub Series */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans">
                        รายการ Sub Series ทั้งหมด ({catSubSeriesList.length})
                      </span>
                    </div>

                    {catSubSeriesList.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-sans">
                        ยังไม่มี Sub Series ในหมวดหมู่นี้
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {catSubSeriesList.map((sub, idx) => {
                          const prodCount = products.filter(
                            p => p.category === editingCatModal.id && p.series === sub.name
                          ).length;

                          return (
                            <div
                              key={sub.name + idx}
                              className={`p-3 bg-white dark:bg-slate-950 border rounded-2xl flex items-center justify-between gap-3 transition-all ${
                                editingSubSeriesIndex === idx
                                  ? 'border-purple-500 ring-2 ring-purple-500/20'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {sub.imageUrl ? (
                                  <img
                                    src={sub.imageUrl}
                                    alt={sub.name}
                                    className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                    <Tag className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-sans truncate">
                                      {sub.name}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shrink-0">
                                      {prodCount} สินค้า
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    {sub.pdfUrl && (
                                      <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5">
                                        <FileText className="h-3 w-3" /> มีคู่มือ PDF
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveSubSeriesInModal(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                  title="ย้ายขึ้น"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveSubSeriesInModal(idx, 'down')}
                                  disabled={idx === catSubSeriesList.length - 1}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                  title="ย้ายลง"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditSubSeriesClick(idx)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer"
                                  title="แก้ไข Sub Series"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubSeries(idx)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer"
                                  title="ลบ Sub Series"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingCatModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>บันทึกการเปลี่ยนแปลงทั้งหมด</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


        </>
      )}
    </div>
  );
}
