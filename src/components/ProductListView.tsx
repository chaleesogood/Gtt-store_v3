import React, { useState, useRef } from 'react';
import { Product, Category } from '../types';
import { Search, Filter, Plus, Edit3, Trash2, PlusCircle, MinusCircle, Upload, Eye, EyeOff, X, Image as ImageIcon, ExternalLink, Layers, List, ChevronDown, ChevronUp, ChevronRight, Package, ShoppingCart } from 'lucide-react';
import CategoryView from './CategoryView';
import OrderingSystemView from './OrderingSystemView';
import { INITIAL_CATEGORIES } from '../initialData';

interface ProductListViewProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditProduct: (id: string, updated: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (id: string, change: number, reason: string) => any;
  statusFilter: string;
  onSetStatusFilter: (filter: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  addToast: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
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

export default function ProductListView({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  statusFilter,
  onSetStatusFilter,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  addToast,
}: ProductListViewProps) {
  // Filters & Search
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'ordering'>('products');
  const [preselectedProductId, setPreselectedProductId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formQuantity, setFormQuantity] = useState(0);
  const [formMinAlert, setFormMinAlert] = useState(5);
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('คลังสินค้าหลัก A');
  const [formExpiryDate, setFormExpiryDate] = useState('');

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

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
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
    // Find all unique product category IDs
    const productCategoryIds = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    
    productCategoryIds.forEach((catId) => {
      if (!list.some((c) => c.id === catId)) {
        const defaultCat = INITIAL_CATEGORIES.find((c) => c.id === catId);
        list.push({
          id: catId,
          name: defaultCat?.name || (catId === 'cat-9uc8blz' ? 'กลุ่มจัดซื้อเฉพาะกิจ' : `กลุ่มสินค้า ${catId}`),
          description: defaultCat?.description || 'หมวดหมู่สินค้าอ้างอิงจากข้อมูลผลิตภัณฑ์ในระบบ',
          color: defaultCat?.color || 'bg-slate-100 text-slate-800 border-slate-200',
        });
      }
    });
    // Sort alphabetically and numerically ascending (natural sorting)
    list.sort((a, b) => a.name.localeCompare(b.name, 'th', { numeric: true, sensitivity: 'base' }));
    return list;
  }, [categories, products]);

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
    setFormExpiryDate('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormCategory(product.category);
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
    setFormExpiryDate(product.expiryDate || '');
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
      price: Number(formCostPrice),
      costPrice: Number(formCostPrice),
      quantity: Number(formQuantity),
      minAlert: Number(formMinAlert),
      image: formImage || imagePreview,
      description: formDescription,
      sourceUrl: formSourceUrl,
      warehouse: formWarehouse,
      expiryDate: formExpiryDate,
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
      </div>

      {activeSubTab === 'categories' ? (
        <CategoryView
          categories={categories}
          products={products}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ) : activeSubTab === 'ordering' ? (
        <OrderingSystemView
          products={products}
          addToast={addToast}
          onAdjustStock={onAdjustStock}
          preselectedProductId={preselectedProductId}
          onClearPreselectedProductId={() => setPreselectedProductId('')}
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
                  placeholder="ค้นหาชื่อสินค้า หรือ รหัส SKU..."
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
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all cursor-pointer flex-shrink-0 active:scale-95"
              id="btn-add-product"
            >
              <Plus className="h-3 w-3" /> เพิ่มสินค้า
            </button>
          </div>

          {/* Category Filter Buttons (Flat & Scrollable) */}
          <div className="bg-slate-50/40 p-1.5 rounded-lg flex items-center gap-1.5 text-left overflow-x-auto scrollbar-none">
            <span className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-wider flex items-center gap-0.5 flex-shrink-0 mr-1">
              <Filter className="h-2.5 w-2.5 text-slate-400" /> หมวดหมู่:
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                  categoryFilter === 'all'
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-3xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                id="btn-cat-filter-all"
              >
                ทั้งหมด ({products.length})
              </button>
              {mergedCategories.map((cat) => {
                const count = products.filter((p) => p.category === cat.id).length;
                const isSelected = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? `${cat.color} border-current font-bold ring-1 ring-current`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    id={`btn-cat-filter-${cat.id}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-current' : 'bg-slate-400'}`}></span>
                    {cat.name.split(' (')[0]} ({count})
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
                    ? 'bg-indigo-50 border-indigo-150 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                id="btn-filter-status-all"
              >
                ทั้งหมด ({products.length})
              </button>
              <button
                onClick={() => onSetStatusFilter('low')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  statusFilter === 'low'
                    ? 'bg-amber-50 border-amber-150 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                id="btn-filter-status-low"
              >
                ใกล้หมด ({products.filter((p) => p.quantity > 0 && p.quantity <= p.minAlert).length})
              </button>
              <button
                onClick={() => onSetStatusFilter('out')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                  statusFilter === 'out'
                    ? 'bg-rose-50 border-rose-150 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                id="btn-filter-status-out"
              >
                หมดคลัง ({products.filter((p) => p.quantity === 0).length})
              </button>
            </div>

            {/* View Layout Toggle */}
            <div className="flex items-center bg-slate-100/60 p-0.5 rounded border border-slate-200/20">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grouped'
                    ? 'bg-white text-indigo-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-viewmode-grouped"
                type="button"
              >
                <Layers className="h-3 w-3" />
                แยกกลุ่ม
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                id="btn-viewmode-list"
                type="button"
              >
                <List className="h-3 w-3" />
                ทั้งหมด
              </button>
            </div>
          </div>

      {/* Product Grid / Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto text-slate-400 mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700 font-sans">ไม่พบรายการสินค้าที่ค้นหา</h3>
          <p className="text-xs text-slate-400 font-sans mt-1 max-w-sm mx-auto">
            ลองปรับเปลี่ยนรหัส SKU ชื่อสินค้า หรือเลือกหมวดหมู่ใหม่อีกครั้ง
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
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/50 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                id="btn-collapse-all"
                type="button"
              >
                <ChevronUp className="h-3.5 w-3.5" /> ยุบทั้งหมด
              </button>
              <button
                onClick={() => {
                  setCollapsedCategories({});
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/50 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
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
                    className="bg-slate-100/50 py-1 px-2 flex flex-row items-center justify-between gap-1.5 cursor-pointer select-none hover:bg-slate-100/75 transition-colors"
                    onClick={() => toggleCategoryCollapse(group.category.id)}
                    id={`group-header-${group.category.id}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      )}
                      <span className={`inline-block px-1.5 py-0.2 text-[9px] font-black rounded border ${group.category.color}`}>
                        {group.category.name.split(' (')[0]}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 font-sans">
                        ({group.products.length} รายการ)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 font-sans" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 bg-white px-1.5 py-0.2 rounded border border-slate-100 shadow-3xs">
                        <span className="text-slate-400 font-medium">สต็อกรวม:</span>
                        <span className="font-black text-slate-700">{totalQty} ชิ้น</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-1.5 py-0.2 rounded border border-slate-100 shadow-3xs">
                        <span className="text-slate-400 font-medium">ทุนคลัง:</span>
                        <span className="font-black text-indigo-600">{formatCurrency(totalCostVal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table for this Category */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/20 border-b border-slate-100/60 text-[9px] font-bold text-slate-400 font-sans uppercase tracking-wider">
                            <th className="py-1 px-2 min-w-[200px]">สินค้า (Product)</th>
                            <th className="py-1 px-2 min-w-[110px]">รหัส SKU</th>
                            <th className="py-1 px-2 text-right min-w-[90px]">ต้นทุน (฿)</th>
                            <th className="py-1 px-2 text-center min-w-[130px]">คงเหลือ / เกณฑ์</th>
                            <th className="py-1 px-2 text-right min-w-[120px]">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {group.products.map((p) => {
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
                              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                                {/* Name & Photo */}
                                <td className="py-0.5 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <img
                                      src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                                      alt={p.name}
                                      className="w-6 h-6 object-cover rounded bg-slate-50 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-700 font-sans leading-none line-clamp-1 text-[11px]" title={p.name}>{p.name}</h4>
                                      <div className="flex flex-wrap gap-1 items-center mt-0.5 leading-none">
                                        <span className="inline-block px-1 py-0.2 text-[7.5px] font-black text-indigo-700 bg-indigo-50/50 rounded leading-none">
                                          📍 {p.warehouse || 'A'}
                                        </span>
                                        {p.expiryDate && (
                                          <span className="inline-block px-1 py-0.2 text-[7.5px] font-black text-rose-700 bg-rose-50/50 rounded leading-none">
                                            📅 EXP: {new Date(p.expiryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* SKU */}
                                <td className="py-0.5 px-1.5">
                                  <div className="text-[10px] font-mono font-bold text-slate-500 tracking-tight leading-none">{p.sku}</div>
                                </td>

                                {/* Cost */}
                                <td className="py-0.5 px-1.5 text-right">
                                  <div className="font-bold text-slate-700 font-sans text-[11px] leading-none">{formatCurrency(p.costPrice)}</div>
                                </td>

                                {/* Real-time quantity counter / adjusting buttons */}
                                <td className="py-0.5 px-1.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="flex items-center gap-1.5 bg-slate-50 rounded p-0.5 border border-slate-100">
                                      <button
                                        onClick={() => handleQuickMinus(p)}
                                        disabled={p.quantity <= 0}
                                        className="text-slate-400 hover:text-rose-600 disabled:opacity-40 transition-colors p-0.5 rounded hover:bg-white cursor-pointer"
                                        title="ลดสต็อก 1 ชิ้น"
                                        id={`btn-quick-minus-item-grp-${p.id}`}
                                      >
                                        <MinusCircle className="h-3 w-3" />
                                      </button>
                                      <span className="font-black text-[10px] text-slate-700 w-5 text-center font-mono leading-none">
                                        {p.quantity}
                                      </span>
                                      <button
                                        onClick={() => handleQuickAdd(p)}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded hover:bg-white cursor-pointer"
                                        title="เพิ่มสต็อก 1 ชิ้น"
                                        id={`btn-quick-plus-item-grp-${p.id}`}
                                      >
                                        <PlusCircle className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <div className={`text-[8.5px] font-bold px-1 rounded ${stockColor} shrink-0 leading-none`}>
                                      {stockLabel} ({p.minAlert})
                                    </div>
                                  </div>
                                </td>

                                {/* CRUD Actions */}
                                <td className="py-0.5 px-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        setPreselectedProductId(p.id);
                                        setActiveSubTab('ordering');
                                      }}
                                      className="px-1 py-0.2 text-[9px] font-black text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded cursor-pointer flex items-center gap-0.5"
                                      title="สร้างใบขอสั่งซื้อพัสดุ"
                                      id={`btn-purchase-item-grp-${p.id}`}
                                    >
                                      <ShoppingCart className="h-2.5 w-2.5" /> สั่งซื้อ
                                    </button>
                                    <button
                                      onClick={() => handleOpenAdjustDialog(p)}
                                      className="px-1 py-0.2 text-[9px] font-black text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded cursor-pointer"
                                      id={`btn-adjust-details-item-grp-${p.id}`}
                                    >
                                      รับ/จ่าย
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditModal(p)}
                                      className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded cursor-pointer"
                                      title="แก้ไข"
                                      id={`btn-edit-item-grp-${p.id}`}
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteProduct(p.id)}
                                      className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                      title="ลบ"
                                      id={`btn-delete-item-grp-${p.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
                <tr className="bg-slate-100/20 border-b border-slate-100/60 text-[9px] font-bold text-slate-400 font-sans uppercase tracking-wider">
                  <th className="py-1 px-2 min-w-[200px]">สินค้า (Product)</th>
                  <th className="py-1 px-2 min-w-[120px]">หมวดหมู่ / รหัส SKU</th>
                  <th className="py-1 px-2 text-right min-w-[90px]">ต้นทุน (฿)</th>
                  <th className="py-1 px-2 text-center min-w-[130px]">คงเหลือ / เกณฑ์</th>
                  <th className="py-1 px-2 text-right min-w-[120px]">การจัดการ</th>
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
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                      {/* Name & Photo */}
                      <td className="py-0.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'}
                            alt={p.name}
                            className="w-6 h-6 object-cover rounded bg-slate-50 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-700 font-sans leading-none line-clamp-1 text-[11px]" title={p.name}>{p.name}</h4>
                            {p.expiryDate && (
                              <p className="text-[8.5px] text-rose-700 font-sans mt-0.5 leading-none">
                                📅 EXP: {new Date(p.expiryDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & SKU */}
                      <td className="py-0.5 px-1.5">
                        <span className={`inline-block px-1 py-0.2 text-[8px] font-black rounded mb-0.5 border leading-none ${getCategoryBadgeClass(p.category)}`}>
                          {getCategoryName(p.category).split(' (')[0]}
                        </span>
                        <div className="text-[10px] font-mono font-bold text-slate-500 tracking-tight leading-none">{p.sku}</div>
                      </td>

                      {/* Cost */}
                      <td className="py-0.5 px-1.5 text-right">
                        <div className="font-bold text-slate-700 font-sans text-[11px] leading-none">{formatCurrency(p.costPrice)}</div>
                      </td>

                      {/* Real-time quantity counter / adjusting buttons */}
                      <td className="py-0.5 px-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="flex items-center gap-1.5 bg-slate-50 rounded p-0.5 border border-slate-100">
                            <button
                              onClick={() => handleQuickMinus(p)}
                              disabled={p.quantity <= 0}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-40 transition-colors p-0.5 rounded hover:bg-white cursor-pointer"
                              title="ลดสต็อก 1 ชิ้น"
                              id={`btn-quick-minus-item-${p.id}`}
                            >
                              <MinusCircle className="h-3 w-3" />
                            </button>
                            <span className="font-black text-[10px] text-slate-700 w-5 text-center font-mono leading-none">
                              {p.quantity}
                            </span>
                            <button
                              onClick={() => handleQuickAdd(p)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded hover:bg-white cursor-pointer"
                              title="เพิ่มสต็อก 1 ชิ้น"
                              id={`btn-quick-plus-item-${p.id}`}
                            >
                              <PlusCircle className="h-3 w-3" />
                            </button>
                          </div>
                          <div className={`text-[8.5px] font-bold px-1 rounded ${stockColor} shrink-0 leading-none`}>
                            {stockLabel} ({p.minAlert})
                          </div>
                        </div>
                      </td>

                      {/* CRUD Actions */}
                      <td className="py-0.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
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
            <form onSubmit={handleFormSubmit} className="space-y-5 py-4 flex-grow">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">ชื่อสินค้า <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมาร์ทโฟน X1 Neo"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* SKU Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">รหัสสินค้า / SKU <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น EL-SP-001"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans font-mono uppercase transition-all"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">หมวดหมู่กลุ่มสินค้า <span className="text-rose-500">*</span></label>
                  <select
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {mergedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Minimum Alert level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">จำนวนแจ้งเตือนขั้นต่ำ (Min Alarm) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="เช่น 5"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">ราคาทุนสินค้า (฿) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                {/* Initial Stock level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">
                    {editingProduct ? 'จำนวนคงเหลือปัจจุบัน' : 'จำนวนสต็อกเริ่มต้น'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Warehouse Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">สถานที่จัดเก็บ / คลังสินค้า <span className="text-rose-500">*</span></label>
                  <select
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all cursor-pointer"
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                  >
                    <option value="คลังสินค้าหลัก A">คลังสินค้าหลัก A</option>
                    <option value="คลังสำรอง B">คลังสำรอง B</option>
                    <option value="คลังสินค้าหน้าร้าน C">คลังสินค้าหน้าร้าน C</option>
                  </select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-sans">วันหมดอายุของสินค้า (Expiry Date)</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 font-sans">คำอธิบาย/รายละเอียดสินค้า</label>
                <textarea
                  placeholder="เช่น สเปคสินค้า รายละเอียดบรรจุภัณฑ์ การรับประกัน..."
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all resize-none"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  id="input-product-desc"
                />
              </div>

              {/* Source/Reference URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 font-sans flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> ลิงก์ที่มา/แหล่งอ้างอิงสินค้า (URL)
                </label>
                <input
                  type="url"
                  placeholder="เช่น https://shopee.co.th/... หรือเว็บซัพพลายเออร์"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                  value={formSourceUrl}
                  onChange={(e) => setFormSourceUrl(e.target.value)}
                  id="input-product-source-url"
                />
              </div>

              {/* Advanced Image upload / drag and drop */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 font-sans">รูปภาพประกอบสินค้า</label>
                  <button
                    type="button"
                    onClick={() => setShowGallery(!showGallery)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> {showGallery ? 'ปิดคลังรูปภาพสำเร็จ' : 'เลือกจากคลังภาพสำเร็จรูป'}
                  </button>
                </div>

                {showGallery && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[11px] text-slate-400 font-sans mb-3">คลิกเลือกภาพคุณภาพสูงสำหรับหมวดสินค้าประเภทต่างๆ:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {PRESET_IMAGES.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectPresetImage(img.url)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 h-16 text-left focus:outline-none cursor-pointer"
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                            <span className="text-[9px] font-bold text-white line-clamp-1">{img.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drag / Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 ${
                    isDragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  {/* File input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Image Preview or Icon */}
                  <div className="relative flex-shrink-0">
                    {imagePreview ? (
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormImage('');
                            setImagePreview('');
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full shadow-sm hover:bg-rose-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Upload Info */}
                  <div className="text-left flex-grow">
                    <h5 className="text-xs font-bold text-slate-700 font-sans">ลากไฟล์รูปภาพมาวางที่นี่ หรือ</h5>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline mt-1 cursor-pointer"
                    >
                      คลิกเพื่อเลือกไฟล์จากอุปกรณ์คอมพิวเตอร์ของคุณ
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 font-sans">รองรับ JPG, PNG และ WebP (แนะนำไฟล์ขนาดเล็กลงคลังได้เร็วขึ้น)</p>
                  </div>
                </div>
              </div>

              {/* Form Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                  id="btn-submit-product-form"
                >
                  {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้าเข้าสต็อก'}
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
        </>
      )}
    </div>
  );
}
