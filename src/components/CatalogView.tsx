import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { Product, Category, JobProject, Bom, BomItem, Brand, SubSeries } from '../types';
import {
  Search,
  Printer,
  BookOpen,
  Tag,
  Filter,
  Layers,
  Eye,
  X,
  ExternalLink,
  ChevronRight,
  Grid,
  List,
  Check,
  Trash2,
  FileText,
  Edit3,
  Plus,
  Save,
  Image as ImageIcon,
  Package,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  CheckCircle2,
  Download,
  SlidersHorizontal,
  LayoutGrid,
  FolderEdit,
  ArrowUpDown,
  Box
} from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  categories: Category[];
  jobProjects?: JobProject[];
  addToast?: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  brands?: Brand[];
  boms?: Bom[];
  onEditCategory?: (id: string, updated: Partial<Category>) => void;
  onAddCategory?: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory?: (id: string) => void;
  onEditProduct?: (id: string, updated: Partial<Product>) => void;
}

const PRESET_COLORS = [
  { name: 'น้ำเงิน', value: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' },
  { name: 'ม่วง', value: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800' },
  { name: 'ส้มทอง', value: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' },
  { name: 'เขียว', value: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' },
  { name: 'แดงชมพู', value: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800' },
  { name: 'ฟ้าคราม', value: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800' },
  { name: 'เทาสุขุม', value: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700' },
  { name: 'แดงสด', value: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800' },
];

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  categories,
  jobProjects = [],
  addToast,
  brands = [],
  boms = [],
  onEditCategory,
  onAddCategory,
  onDeleteCategory,
  onEditProduct
}) => {
  // Navigation & Filtering States
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'outstock'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped' | 'list'>('grid');

  // Product Quick Detail Modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdForm, setEditProdForm] = useState<Partial<Product>>({});

  // Auto-reset selected brand filter if the selected brand is deleted
  useEffect(() => {
    if (selectedBrand !== 'all' && !brands.some(b => b.name === selectedBrand)) {
      setSelectedBrand('all');
    }
    if (editProdForm.brand && !brands.some(b => b.name === editProdForm.brand)) {
      setEditProdForm(prev => ({ ...prev, brand: '' }));
    }
  }, [brands, selectedBrand, editProdForm.brand]);

  // Add to Project / BOM Modal State
  const [bomTargetProduct, setBomTargetProduct] = useState<Product | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [bomQuantity, setBomQuantity] = useState<number>(1);
  const [bomNotes, setBomNotes] = useState<string>('');
  const [isSubmittingBom, setIsSubmittingBom] = useState<boolean>(false);

  // Category & Series ย่อย Manager Modal State
  const [catModal, setCatModal] = useState<Category | null>(null);
  const [catModalTab, setCatModalTab] = useState<'info' | 'series'>('info');
  const [catNameInput, setCatNameInput] = useState<string>('');
  const [catDescInput, setCatDescInput] = useState<string>('');
  const [catColorInput, setCatColorInput] = useState<string>(PRESET_COLORS[0].value);
  const [catImageInput, setCatImageInput] = useState<string>('');
  const [catSubSeriesList, setCatSubSeriesList] = useState<SubSeries[]>([]);

  // Editing SubSeries inside modal
  const [editingSubSeriesIndex, setEditingSubSeriesIndex] = useState<number | null>(null);
  const [subSeriesNameInput, setSubSeriesNameInput] = useState<string>('');
  const [subSeriesImageInput, setSubSeriesImageInput] = useState<string>('');
  const [subSeriesPdfInput, setSubSeriesPdfInput] = useState<string>('');

  // Add Category Modal
  const [isAddCatOpen, setIsAddCatOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>(PRESET_COLORS[0].value);
  const [newCatImage, setNewCatImage] = useState<string>('');

  // Get list of available Series ย่อย for currently selected category
  const availableSubSeriesForCat = useMemo(() => {
    if (selectedCategory === 'all') {
      const setOfSeries = new Set<string>();
      categories.forEach(c => {
        (c.subSeries || []).forEach(s => setOfSeries.add(s.name));
        (c.series || []).forEach(s => setOfSeries.add(s));
      });
      return Array.from(setOfSeries);
    }
    const cat = categories.find(c => c.id === selectedCategory);
    if (!cat) return [];
    if (cat.subSeries && cat.subSeries.length > 0) {
      return cat.subSeries.map(s => s.name);
    }
    return cat.series || [];
  }, [selectedCategory, categories]);

  // Filter products based on search, category, brand, series, and stock
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) {
        return false;
      }

      // Series ย่อย filter
      if (selectedSeries !== 'all' && (p.series || '') !== selectedSeries) {
        return false;
      }

      // Stock filter
      if (stockFilter === 'instock' && p.quantity <= 0) return false;
      if (stockFilter === 'outstock' && p.quantity > 0) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchSeries = (p.series || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBrand && !matchSeries && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, selectedBrand, selectedSeries, stockFilter, searchQuery]);

  // Group filtered products by Category and then Series ย่อย
  const groupedProducts = useMemo(() => {
    const result: {
      category: Category;
      seriesGroups: { seriesName: string; subSeriesObj?: SubSeries; products: Product[] }[];
    }[] = [];

    // Group categories
    const catMap = new Map<string, Product[]>();
    filteredProducts.forEach(p => {
      const catId = p.category || 'uncategorized';
      if (!catMap.has(catId)) catMap.set(catId, []);
      catMap.get(catId)!.push(p);
    });

    categories.forEach(cat => {
      const catProducts = catMap.get(cat.id);
      if (!catProducts || catProducts.length === 0) return;

      const subSeriesDefs = cat.subSeries || [];
      const seriesList = cat.series || [];

      const seriesMap = new Map<string, Product[]>();
      const remainingProducts: Product[] = [];

      catProducts.forEach(p => {
        if (p.series && p.series.trim()) {
          if (!seriesMap.has(p.series)) seriesMap.set(p.series, []);
          seriesMap.get(p.series)!.push(p);
        } else {
          remainingProducts.push(p);
        }
      });

      const seriesGroups: { seriesName: string; subSeriesObj?: SubSeries; products: Product[] }[] = [];

      // Add defined subseries in order
      const processedSeries = new Set<string>();

      if (subSeriesDefs.length > 0) {
        subSeriesDefs.forEach(s => {
          const prods = seriesMap.get(s.name) || [];
          if (prods.length > 0) {
            seriesGroups.push({ seriesName: s.name, subSeriesObj: s, products: prods });
            processedSeries.add(s.name);
          }
        });
      } else if (seriesList.length > 0) {
        seriesList.forEach(sName => {
          const prods = seriesMap.get(sName) || [];
          if (prods.length > 0) {
            seriesGroups.push({ seriesName: sName, products: prods });
            processedSeries.add(sName);
          }
        });
      }

      // Any other series names
      seriesMap.forEach((prods, sName) => {
        if (!processedSeries.has(sName)) {
          seriesGroups.push({ seriesName: sName, products: prods });
        }
      });

      // Remaining without series
      if (remainingProducts.length > 0) {
        seriesGroups.push({
          seriesName: 'สินค้าทั่วไป (ไม่มี Series ย่อย)',
          products: remainingProducts
        });
      }

      result.push({
        category: cat,
        seriesGroups
      });
    });

    return result;
  }, [filteredProducts, categories]);

  // Compute available Sub-series for the active category filter
  const subSeriesForActiveCategory = useMemo(() => {
    const targetProducts = selectedCategory === 'all'
      ? products
      : products.filter(p => p.category === selectedCategory);
    
    const seriesMap = new Map<string, number>();
    targetProducts.forEach(p => {
      if (p.series && p.series.trim()) {
        const sName = p.series.trim();
        seriesMap.set(sName, (seriesMap.get(sName) || 0) + 1);
      }
    });

    if (selectedCategory !== 'all') {
      const activeCatObj = categories.find(c => c.id === selectedCategory);
      if (activeCatObj) {
        const definedSub = activeCatObj.subSeries || [];
        definedSub.forEach(sub => {
          if (!seriesMap.has(sub.name)) {
            seriesMap.set(sub.name, 0);
          }
        });
        const definedList = activeCatObj.series || [];
        definedList.forEach(sName => {
          if (!seriesMap.has(sName)) {
            seriesMap.set(sName, 0);
          }
        });
      }
    }

    return Array.from(seriesMap.entries()).map(([name, count]) => ({ name, count }));
  }, [products, categories, selectedCategory]);

  // Open Category Edit/Manage Modal
  const handleOpenCatModal = (cat: Category, defaultTab: 'info' | 'series' = 'info') => {
    setCatModal(cat);
    setCatModalTab(defaultTab);
    setCatNameInput(cat.name);
    setCatDescInput(cat.description || '');
    setCatColorInput(cat.color || PRESET_COLORS[0].value);
    setCatImageInput(cat.imageUrl || '');

    const initialSubList: SubSeries[] = (cat.subSeries && cat.subSeries.length > 0)
      ? cat.subSeries.map(s => ({ ...s }))
      : (cat.series || []).map(sName => ({ name: sName }));
    setCatSubSeriesList(initialSubList);

    setEditingSubSeriesIndex(null);
    setSubSeriesNameInput('');
    setSubSeriesImageInput('');
    setSubSeriesPdfInput('');
  };

  // Save Category & Series Changes
  const handleSaveCatModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catModal || !catNameInput.trim() || !onEditCategory) return;

    const seriesNames = catSubSeriesList.map(s => s.name);

    onEditCategory(catModal.id, {
      name: catNameInput.trim(),
      description: catDescInput.trim(),
      color: catColorInput,
      imageUrl: catImageInput.trim(),
      subSeries: catSubSeriesList,
      series: seriesNames,
    });

    if (addToast) {
      addToast('success', 'บันทึกสำเร็จ', `อัปเดตข้อมูลหมวดหมู่ "${catNameInput}" เรียบร้อยแล้ว`);
    }
    setCatModal(null);
  };

  // SubSeries handlers in modal
  const handleAddOrUpdateSubSeries = () => {
    const trimmed = subSeriesNameInput.trim();
    if (!trimmed) {
      if (addToast) addToast('warning', 'กรุณาระบุชื่อ', 'โปรดใส่ชื่อ Series ย่อย');
      return;
    }

    if (editingSubSeriesIndex !== null) {
      const oldSub = catSubSeriesList[editingSubSeriesIndex];
      const updatedList = [...catSubSeriesList];
      updatedList[editingSubSeriesIndex] = {
        name: trimmed,
        imageUrl: subSeriesImageInput.trim(),
        pdfUrl: subSeriesPdfInput.trim(),
      };
      setCatSubSeriesList(updatedList);

      // Rename products if name changed
      if (oldSub.name !== trimmed && catModal && onEditProduct) {
        const prodsToRename = products.filter(p => p.category === catModal.id && p.series === oldSub.name);
        prodsToRename.forEach(p => onEditProduct(p.id, { series: trimmed }));
      }
      setEditingSubSeriesIndex(null);
      if (addToast) addToast('success', 'ปรับปรุงสำเร็จ', `อัปเดต Series ย่อย "${trimmed}" แล้ว`);
    } else {
      if (catSubSeriesList.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
        if (addToast) addToast('warning', 'ชื่อซ้ำ', `มี Series ย่อย "${trimmed}" อยู่แล้ว`);
        return;
      }
      setCatSubSeriesList(prev => [...prev, {
        name: trimmed,
        imageUrl: subSeriesImageInput.trim(),
        pdfUrl: subSeriesPdfInput.trim(),
      }]);
      if (addToast) addToast('success', 'เพิ่มสำเร็จ', `เพิ่ม Series ย่อย "${trimmed}" แล้ว`);
    }

    setSubSeriesNameInput('');
    setSubSeriesImageInput('');
    setSubSeriesPdfInput('');
  };

  const handleEditSubSeriesClick = (idx: number) => {
    const target = catSubSeriesList[idx];
    if (!target) return;
    setEditingSubSeriesIndex(idx);
    setSubSeriesNameInput(target.name);
    setSubSeriesImageInput(target.imageUrl || '');
    setSubSeriesPdfInput(target.pdfUrl || '');
  };

  const handleDeleteSubSeries = (idx: number) => {
    const target = catSubSeriesList[idx];
    if (!target) return;
    if (confirm(`คุณต้องการลบ Series ย่อย "${target.name}" หรือไม่?`)) {
      setCatSubSeriesList(prev => prev.filter((_, i) => i !== idx));
      if (editingSubSeriesIndex === idx) {
        setEditingSubSeriesIndex(null);
        setSubSeriesNameInput('');
        setSubSeriesImageInput('');
        setSubSeriesPdfInput('');
      }
    }
  };

  const handleMoveSubSeries = (idx: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === catSubSeriesList.length - 1)) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const newList = [...catSubSeriesList];
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;
    setCatSubSeriesList(newList);
  };

  // Create new Category
  const handleSaveNewCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !onAddCategory) return;
    onAddCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      color: newCatColor,
      imageUrl: newCatImage.trim(),
      series: [],
      subSeries: []
    });
    if (addToast) addToast('success', 'เพิ่มสำเร็จ', `สร้างหมวดหมู่ใหม่ "${newCatName}" เรียบร้อยแล้ว`);
    setIsAddCatOpen(false);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatImage('');
  };

  // Add Item to BOM or Job Project
  const handleSaveToBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomTargetProduct || !selectedProjectId) return;
    setIsSubmittingBom(true);

    try {
      const proj = jobProjects.find(p => p.id === selectedProjectId);
      const existingBom = boms.find(b => b.id === selectedProjectId || b.jobNo === proj?.jobNo);

      const newItem: BomItem = {
        productId: bomTargetProduct.id,
        productName: bomTargetProduct.name,
        quantity: bomQuantity,
        unit: bomTargetProduct.unit || 'ชิ้น',
        brand: bomTargetProduct.brand || '',
        priceUnit: bomTargetProduct.price || 0,
        remark: bomNotes.trim()
      };

      let updatedItems: BomItem[] = [];
      let bomId = existingBom?.id || `bom-${selectedProjectId}`;

      if (existingBom) {
        const itemIdx = existingBom.items.findIndex(i => i.productId === bomTargetProduct.id);
        if (itemIdx >= 0) {
          updatedItems = [...existingBom.items];
          updatedItems[itemIdx] = {
            ...updatedItems[itemIdx],
            quantity: updatedItems[itemIdx].quantity + bomQuantity,
            remark: bomNotes.trim() || updatedItems[itemIdx].remark
          };
        } else {
          updatedItems = [...existingBom.items, newItem];
        }
      } else {
        updatedItems = [newItem];
      }

      const updatedBom: Bom = {
        id: bomId,
        name: proj?.title || 'โครงการทั่วไป',
        description: `สำหรับโครงการ ${proj?.title || ''}`,
        jobNo: proj?.jobNo || '',
        items: updatedItems,
        status: existingBom?.status || 'pending',
        requiredQuantity: existingBom?.requiredQuantity || 1,
        stockDeducted: existingBom?.stockDeducted || false,
        createdAt: existingBom?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'boms', bomId), cleanUndefined(updatedBom));

      if (addToast) {
        addToast(
          'success',
          'เพิ่มสินค้าลง BOM สำเร็จ',
          `เพิ่ม "${bomTargetProduct.name}" (${bomQuantity} ${bomTargetProduct.unit || 'ชิ้น'}) เข้าโครงการ ${proj?.title || ''} เรียบร้อยแล้ว`
        );
      }
      setBomTargetProduct(null);
      setBomQuantity(1);
      setBomNotes('');
    } catch (err) {
      console.error('Error adding item to BOM:', err);
      if (addToast) addToast('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มสินค้าลงใน BOM ได้');
    } finally {
      setIsSubmittingBom(false);
    }
  };

  // Handle Edit Product form submit
  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !onEditProduct) return;
    onEditProduct(editingProduct.id, editProdForm);
    if (addToast) addToast('success', 'อัปเดตพัสดุสำเร็จ', `แก้ไขข้อมูลสินค้า "${editingProduct.name}" เรียบร้อยแล้ว`);
    setEditingProduct(null);
  };

  // Trigger print view
  const handlePrintCatalog = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-6 pb-4 border-b border-slate-300">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 font-sans">แคตตาล็อกพัสดุและอุปกรณ์ (Product Catalog)</h1>
            <p className="text-xs text-slate-600 mt-1">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800 font-sans">จำนวนสินค้าทั้งหมด: {filteredProducts.length} รายการ</p>
          </div>
        </div>
      </div>

      {/* TOP HEADER & ACTION BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 font-sans tracking-tight">
                  แคตตาล็อกพัสดุ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {filteredProducts.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                ค้นหา เรียกดู สเปกสินค้า คู่มือการใช้งาน และจัดทำชุด BOM สินค้าได้อย่างง่ายดาย
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddCatOpen(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มหมวดหมู่ใหม่</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCatalog}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              title="พิมพ์แคตตาล็อกหรือบันทึกเป็น PDF"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>พิมพ์แคตตาล็อก</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Search box */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า, SKU, Series, สเปก..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Brand Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              <option value="all">แบรนด์ทั้งหมด ({brands.length} แบรนด์)</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Series ย่อย Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              <option value="all">Series ย่อย ทั้งหมด</option>
              {availableSubSeriesForCat.map((s, idx) => (
                <option key={idx} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter & View Mode */}
          <div className="lg:col-span-2 flex items-center gap-1.5">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="flex-1 px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              <option value="all">สต็อกทั้งหมด</option>
              <option value="instock">มีในสต็อกเท่านั้น</option>
              <option value="outstock">สินค้าหมด</option>
            </select>

            {/* View switchers */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="มุมมองการ์ด (Grid View)"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="มุมมองจัดกลุ่ม Series ย่อย"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="มุมมองตาราง (Table List)"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORIES PILLS BAR */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSeries('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold font-sans transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>หมวดหมู่ทั้งหมด</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${
              selectedCategory === 'all' ? 'bg-indigo-500/80 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {products.length}
            </span>
          </button>

          {categories.map((cat) => {
            const catCount = products.filter((p) => p.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <div key={cat.id} className="relative group shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSeries('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-4 h-4 object-cover rounded-md border border-white/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Tag className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                  )}
                  <span>{cat.name}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-black ${
                    isSelected ? 'bg-indigo-500/80 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {catCount}
                  </span>
                </button>

                {/* Edit Category Icon button on hover or selected */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCatModal(cat, 'info');
                  }}
                  className="p-1 ml-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  title="แก้ไขหมวดหมู่ / Series ย่อย"
                >
                  <FolderEdit className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* SUB-CATEGORY / SERIES YOY PILLS BAR */}
        {subSeriesForActiveCategory.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1 pl-1">
              <Layers className="h-3 w-3 text-indigo-500" />
              <span>หมวดหมู่ย่อย / Series:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedSeries('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer shrink-0 border ${
                selectedSeries === 'all'
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด
            </button>

            {subSeriesForActiveCategory.map((sub) => {
              const isSubSelected = selectedSeries === sub.name;
              return (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setSelectedSeries(sub.name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 border ${
                    isSubSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-extrabold'
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className={`px-1.5 py-0.2 text-[9.5px] rounded-md font-black ${
                    isSubSelected ? 'bg-purple-500/90 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PRODUCTS DISPLAY SECTION */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 font-sans">
            ไม่พบพัสดุตามเงื่อนไขที่ค้นหา
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
            ลองปรับเปลี่ยนคำค้นหา เลือกหมวดหมู่อื่น หรือล้างตัวกรองเพื่อเรียกดูรายการพัสดุทั้งหมด
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedBrand('all');
              setSelectedSeries('all');
              setStockFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold font-sans hover:bg-indigo-700 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 mt-2"
          >
            <X className="h-3.5 w-3.5" />
            <span>ล้างตัวกรองทั้งหมด</span>
          </button>
        </div>
      ) : viewMode === 'grouped' ? (
        /* ================= GROUPED BY CATEGORY & SERIES YOY VIEW ================= */
        <div className="space-y-8">
          {groupedProducts.map(({ category, seriesGroups }) => (
            <div key={category.id} className="space-y-4">
              {/* Category Section Header */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-3">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Tag className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 dark:text-slate-100 font-sans">
                        {category.name}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${category.color || PRESET_COLORS[0].value}`}>
                        {seriesGroups.reduce((acc, sg) => acc + sg.products.length, 0)} รายการ
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCatModal(category, 'series')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FolderEdit className="h-3.5 w-3.5" />
                  <span>จัดการ Series ย่อย</span>
                </button>
              </div>

              {/* Series Groups */}
              <div className="space-y-6 pl-2 sm:pl-4">
                {seriesGroups.map(({ seriesName, subSeriesObj, products: seriesProds }) => (
                  <div key={seriesName} className="space-y-3">
                    {/* Series Header Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2.5">
                        {subSeriesObj?.imageUrl ? (
                          <img
                            src={subSeriesObj.imageUrl}
                            alt={seriesName}
                            className="w-7 h-7 object-cover rounded-lg border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 font-sans">
                          Series ย่อย: <span className="text-indigo-600 dark:text-indigo-400">{seriesName}</span>
                        </h3>
                        <span className="text-xs text-slate-400 font-semibold font-sans">
                          ({seriesProds.length} รายการ)
                        </span>
                      </div>

                      {/* PDF Manual Download Button */}
                      {subSeriesObj?.pdfUrl && (
                        <a
                          href={subSeriesObj.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>ดาวน์โหลดคู่มือ (PDF)</span>
                        </a>
                      )}
                    </div>

                    {/* Products Grid for this Series */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                      {seriesProds.map((prod) => (
                        <ProductCard
                          key={prod.id}
                          product={prod}
                          category={category}
                          onDetail={() => setDetailProduct(prod)}
                          onAddToBom={() => {
                            setBomTargetProduct(prod);
                            if (jobProjects.length > 0) {
                              setSelectedProjectId(jobProjects[0].id);
                            }
                          }}
                          onEdit={() => {
                            setEditingProduct(prod);
                            setEditProdForm({ ...prod });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= STANDARD GRID VIEW ================= */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
          {filteredProducts.map((prod) => {
            const catObj = categories.find((c) => c.id === prod.category);
            return (
              <ProductCard
                key={prod.id}
                product={prod}
                category={catObj}
                onDetail={() => setDetailProduct(prod)}
                onAddToBom={() => {
                  setBomTargetProduct(prod);
                  if (jobProjects.length > 0) {
                    setSelectedProjectId(jobProjects[0].id);
                  }
                }}
                onEdit={() => {
                  setEditingProduct(prod);
                  setEditProdForm({ ...prod });
                }}
              />
            );
          })}
        </div>
      ) : (
        /* ================= TABLE / LIST VIEW ================= */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="py-3 px-4">รูปภาพ</th>
                  <th className="py-3 px-4">SKU / ชื่อพัสดุ</th>
                  <th className="py-3 px-4">หมวดหมู่ / Series ย่อย</th>
                  <th className="py-3 px-4">แบรนด์</th>
                  <th className="py-3 px-4 text-center">คงเหลือ</th>
                  <th className="py-3 px-4 text-right">ราคา/หน่วย</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredProducts.map((prod) => {
                  const catObj = categories.find((c) => c.id === prod.category);
                  const isLowStock = prod.quantity <= prod.minAlert && prod.quantity > 0;
                  const isOutOfStock = prod.quantity <= 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                          {prod.name}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {prod.sku}
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catObj?.color || PRESET_COLORS[0].value}`}>
                            {catObj?.name || 'ไม่มีหมวดหมู่'}
                          </span>
                          {prod.series && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {prod.series}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 font-bold text-slate-600 dark:text-slate-300">
                        {prod.brand || '-'}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {prod.quantity} {prod.unit || 'ชิ้น'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right font-black font-sans text-slate-900 dark:text-slate-100">
                        ฿{(prod.price || 0).toLocaleString('th-TH')}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailProduct(prod)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="ดูรายละเอียดสเปก"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBomTargetProduct(prod);
                              if (jobProjects.length > 0) setSelectedProjectId(jobProjects[0].id);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg cursor-pointer"
                            title="ใส่ใน BOM โครงการ"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setEditProdForm({ ...prod });
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="แก้ไขพัสดุ"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: PRODUCT QUICK DETAIL MODAL ================= */}
      {detailProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-start gap-3">
                {detailProduct.image ? (
                  <img
                    src={detailProduct.image}
                    alt={detailProduct.name}
                    className="w-16 h-16 object-cover rounded-2xl border border-slate-200 shrink-0 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                    <Package className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 font-sans">
                    {detailProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      SKU: {detailProduct.sku}
                    </span>
                    {detailProduct.brand && (
                      <span className="text-xs font-bold text-slate-500 font-sans">
                        • แบรนด์: {detailProduct.brand}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-sans">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">คงเหลือในสต็อก</span>
                <span className={`font-black text-sm ${detailProduct.quantity <= 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                  {detailProduct.quantity} {detailProduct.unit || 'ชิ้น'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">ราคาจำหน่าย</span>
                <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                  ฿{(detailProduct.price || 0).toLocaleString('th-TH')}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">ราคาทุน</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ฿{(detailProduct.costPrice || 0).toLocaleString('th-TH')}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Series ย่อย</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailProduct.series || 'ทั่วไป'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">ตำแหน่งเก็บ</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailProduct.warehouse || '-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">จุดแจ้งเตือนขั้นต่ำ</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {detailProduct.minAlert} {detailProduct.unit || 'ชิ้น'}
                </span>
              </div>
            </div>

            {/* Description / Spec */}
            {detailProduct.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 font-sans">
                  รายละเอียดสเปกพัสดุ
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {detailProduct.description}
                </p>
              </div>
            )}

            {/* Source / Manual Link */}
            {detailProduct.sourceUrl && (
              <div className="pt-1">
                <a
                  href={detailProduct.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>ดูคู่มือ / ลิงก์อ้างอิงภายนอก</span>
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setBomTargetProduct(detailProduct);
                  setDetailProduct(null);
                  if (jobProjects.length > 0) setSelectedProjectId(jobProjects[0].id);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>เพิ่มใน BOM โครงการ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(detailProduct);
                  setEditProdForm({ ...detailProduct });
                  setDetailProduct(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>แก้ไขพัสดุ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD TO PROJECT BOM MODAL ================= */}
      {bomTargetProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-xl">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-sans">
                    เพิ่มสินค้าลงใน BOM โครงการ
                  </h3>
                  <p className="text-xs text-slate-400 font-sans truncate max-w-[220px]">
                    {bomTargetProduct.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBomTargetProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveToBom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  เลือกโครงการที่ต้องการ <span className="text-rose-500">*</span>
                </label>
                {jobProjects.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl font-sans">
                    ยังไม่มีโครงการในระบบ กรุณาสร้างโครงการก่อนทำรายการ
                  </div>
                ) : (
                  <select
                    required
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {jobProjects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.title} ({proj.customerName || 'ทั่วไป'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    จำนวนที่ต้องการใช้ ({bomTargetProduct.unit || 'ชิ้น'})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bomQuantity}
                    onChange={(e) => setBomQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans font-black text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    ราคาต่อหน่วย
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black font-sans text-indigo-600 dark:text-indigo-400">
                    ฿{(bomTargetProduct.price || 0).toLocaleString('th-TH')}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={bomNotes}
                  onChange={(e) => setBomNotes(e.target.value)}
                  placeholder="เช่น ติดตั้งชั้น 2, สเปกพิเศษ..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setBomTargetProduct(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBom || jobProjects.length === 0}
                  className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>บันทึกเข้า BOM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: MANAGE CATEGORY & SERIES YOY MODAL ================= */}
      {catModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-left max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <FolderEdit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-sans">
                    จัดการหมวดหมู่ &amp; Series ย่อย
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                    {catModal.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCatModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setCatModalTab('info')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  catModalTab === 'info'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>ข้อมูลหมวดหมู่</span>
              </button>
              <button
                type="button"
                onClick={() => setCatModalTab('series')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  catModalTab === 'series'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>จัดการ Series ย่อย ({catSubSeriesList.length})</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCatModal} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {catModalTab === 'info' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      ชื่อหมวดหมู่ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catNameInput}
                      onChange={(e) => setCatNameInput(e.target.value)}
                      placeholder="ระบุชื่อหมวดหมู่..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      คำอธิบายเพิ่มเติม
                    </label>
                    <textarea
                      rows={2}
                      value={catDescInput}
                      onChange={(e) => setCatDescInput(e.target.value)}
                      placeholder="รายละเอียดสั้นๆ..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      รูปภาพประกอบหมวดหมู่ (URL)
                    </label>
                    <input
                      type="text"
                      value={catImageInput}
                      onChange={(e) => setCatImageInput(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                      ธีมสีป้ายหมวดหมู่
                    </label>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {PRESET_COLORS.map((colorOpt) => (
                        <button
                          key={colorOpt.name}
                          type="button"
                          onClick={() => setCatColorInput(colorOpt.value)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-sans cursor-pointer text-center ${colorOpt.value} ${
                            catColorInput === colorOpt.value ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'
                          }`}
                        >
                          {colorOpt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Form for adding/editing series */}
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-150 dark:border-purple-900/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 dark:text-purple-200 font-sans flex items-center gap-1.5">
                        <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        {editingSubSeriesIndex !== null ? 'แก้ไข Series ย่อย' : 'เพิ่ม Series ย่อย ใหม่'}
                      </span>
                      {editingSubSeriesIndex !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubSeriesIndex(null);
                            setSubSeriesNameInput('');
                            setSubSeriesImageInput('');
                            setSubSeriesPdfInput('');
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          ยกเลิกแก้ไข
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                          ชื่อ Series ย่อย <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subSeriesNameInput}
                          onChange={(e) => setSubSeriesNameInput(e.target.value)}
                          placeholder="เช่น 1 Pole, 3 Pole, Series A..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                          URL รูปภาพประกอบ
                        </label>
                        <input
                          type="text"
                          value={subSeriesImageInput}
                          onChange={(e) => setSubSeriesImageInput(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                          URL คู่มือ PDF
                        </label>
                        <input
                          type="text"
                          value={subSeriesPdfInput}
                          onChange={(e) => setSubSeriesPdfInput(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
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
                        <span>{editingSubSeriesIndex !== null ? 'บันทึก Series ย่อย' : 'เพิ่ม Series ย่อย'}</span>
                      </button>
                    </div>
                  </div>

                  {/* List of existing subseries */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans block">
                      รายการ Series ย่อย ทั้งหมด ({catSubSeriesList.length})
                    </span>

                    {catSubSeriesList.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-sans">
                        ยังไม่มี Series ย่อยในหมวดหมู่นี้
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {catSubSeriesList.map((sub, idx) => {
                          const prodCount = products.filter(
                            p => p.category === catModal.id && p.series === sub.name
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
                                  {sub.pdfUrl && (
                                    <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                                      มีคู่มือ PDF
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveSubSeries(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg disabled:opacity-30 cursor-pointer"
                                  title="ย้ายขึ้น"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveSubSeries(idx, 'down')}
                                  disabled={idx === catSubSeriesList.length - 1}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg disabled:opacity-30 cursor-pointer"
                                  title="ย้ายลง"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditSubSeriesClick(idx)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                  title="แก้ไข Series ย่อย"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubSeries(idx)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="ลบ Series ย่อย"
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
                  onClick={() => setCatModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: ADD CATEGORY MODAL ================= */}
      {isAddCatOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-sans">
                    สร้างหมวดหมู่สินค้าใหม่
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    กำหนดชื่อและธีมสีสำหรับจัดกลุ่มพัสดุ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCatOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCat} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  ชื่อหมวดหมู่ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="เช่น อุปกรณ์ไฟฟ้า, วาล์ว..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  คำอธิบาย
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="รายละเอียดสั้นๆ..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  รูปภาพประกอบ (URL)
                </label>
                <input
                  type="text"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  ธีมสีป้ายหมวดหมู่
                </label>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {PRESET_COLORS.map((colorOpt) => (
                    <button
                      key={colorOpt.name}
                      type="button"
                      onClick={() => setNewCatColor(colorOpt.value)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold font-sans cursor-pointer text-center ${colorOpt.value} ${
                        newCatColor === colorOpt.value ? 'ring-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {colorOpt.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>สร้างหมวดหมู่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: EDIT PRODUCT MODAL ================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-sans">
                    แก้ไขข้อมูลพัสดุ
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    {editingProduct.sku}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  ชื่อพัสดุ / อุปกรณ์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editProdForm.name || ''}
                  onChange={(e) => setEditProdForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    SKU / รหัสสินค้า
                  </label>
                  <input
                    type="text"
                    value={editProdForm.sku || ''}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    แบรนด์ (Brand)
                  </label>
                  <select
                    value={editProdForm.brand || ''}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">-- ไม่ระบุแบรนด์สินค้า / ทั่วไป --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    Series ย่อย
                  </label>
                  <input
                    type="text"
                    value={editProdForm.series || ''}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, series: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    หมวดหมู่
                  </label>
                  <select
                    value={editProdForm.category || ''}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    ราคาขาย (บาท)
                  </label>
                  <input
                    type="number"
                    value={editProdForm.price || 0}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    จำนวนในสต็อก
                  </label>
                  <input
                    type="number"
                    value={editProdForm.quantity || 0}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                    หน่วยนับ
                  </label>
                  <input
                    type="text"
                    value={editProdForm.unit || 'ชิ้น'}
                    onChange={(e) => setEditProdForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  URL รูปภาพสินค้า
                </label>
                <input
                  type="text"
                  value={editProdForm.image || ''}
                  onChange={(e) => setEditProdForm(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  รายละเอียดสเปก
                </label>
                <textarea
                  rows={3}
                  value={editProdForm.description || ''}
                  onChange={(e) => setEditProdForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= REUSABLE PRODUCT CARD COMPONENT ================= */
interface ProductCardProps {
  product: Product;
  category?: Category;
  onDetail: () => void;
  onAddToBom: () => void;
  onEdit: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  onDetail,
  onAddToBom,
  onEdit
}) => {
  const isLowStock = product.quantity <= product.minAlert && product.quantity > 0;
  const isOutOfStock = product.quantity <= 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group text-left">
      {/* Card Image Container */}
      <div className="relative h-28 sm:h-32 bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-slate-800/80">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
            <Package className="h-8 w-8" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
          {category && (
            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black border shadow-2xs backdrop-blur-md truncate max-w-[80px] ${category.color || PRESET_COLORS[0].value}`}>
              {category.name}
            </span>
          )}

          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black shadow-2xs ml-auto ${
            isOutOfStock
              ? 'bg-rose-500 text-white'
              : isLowStock
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-500 text-white'
          }`}>
            {isOutOfStock ? 'หมด' : `คลัง ${product.quantity}`}
          </span>
        </div>

        {/* Quick detail button on hover */}
        <button
          type="button"
          onClick={onDetail}
          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-extrabold text-[11px] cursor-pointer backdrop-blur-3xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>ดูสเปก</span>
        </button>
      </div>

      {/* Card Body */}
      <div className="p-2 sm:p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
            <span className="truncate">SKU: {product.sku}</span>
            {product.brand && (
              <span className="text-[9px] text-slate-400 font-sans font-semibold shrink-0">
                {product.brand}
              </span>
            )}
          </div>

          <h3
            onClick={onDetail}
            className="text-[11.5px] font-bold text-slate-900 dark:text-slate-100 font-sans line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors leading-tight min-h-[2.1rem]"
            title={product.name}
          >
            {product.name}
          </h3>

          <div className="flex flex-wrap gap-1 items-center pt-0.5">
            {product.series && (
              <span className="inline-block px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold font-sans truncate max-w-[100px]">
                {product.series}
              </span>
            )}
            {product.supplier && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-150 dark:border-indigo-850 rounded text-[9px] font-bold font-sans">
                {product.supplierLogoUrl ? (
                  <img src={product.supplierLogoUrl} alt={product.supplier} className="h-3 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <span>🏬 {product.supplier}</span>
                )}
              </span>
            )}
            {(product.subStore || product.subStoreLogoUrl) && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-150 dark:border-rose-850 rounded text-[9px] font-bold font-sans">
                {product.subStoreLogoUrl ? (
                  <img src={product.subStoreLogoUrl} alt={product.subStore || ''} className="h-3 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <span>🛒</span>
                )}
                {product.subStore && <span className="truncate max-w-[70px]">{product.subStore}</span>}
                {product.subStoreLink && (
                  <a
                    href={product.subStoreLink.startsWith('http') ? product.subStoreLink : `https://${product.subStoreLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-0.5 bg-rose-600 text-white rounded hover:bg-rose-500 transition-colors inline-flex"
                    title="เปิดลิงก์ร้านค้าย่อย E-commerce"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-2 w-2" />
                  </a>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Price & Action Footer */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block leading-none">ราคา/หน่วย</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 font-sans">
              ฿{(product.price || 0).toLocaleString('th-TH')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onAddToBom}
              className="p-1 sm:p-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 rounded-lg transition-all cursor-pointer shadow-3xs"
              title="ใส่ใน BOM โครงการ"
            >
              <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="p-1 sm:p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
              title="แก้ไขข้อมูลพัสดุ"
            >
              <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
