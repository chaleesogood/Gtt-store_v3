import React, { useState, useMemo } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../firebase';
import { Product, Category, JobProject, Bom, BomItem, Brand } from '../types';
import { 
  Search, 
  Printer, 
  BookOpen, 
  Tag, 
  Filter, 
  Layers, 
  Eye, 
  X, 
  Boxes, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Barcode,
  Grid,
  ClipboardList,
  ShoppingCart,
  Check,
  Trash2,
  ArrowRight,
  Loader2,
  Play,
  FileText
} from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  categories: Category[];
  jobProjects?: JobProject[];
  addToast?: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
  brands?: Brand[];
  boms?: Bom[];
}

export const CatalogView: React.FC<CatalogViewProps> = ({ products, categories, jobProjects = [], addToast, brands = [], boms = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // State for BOM Selection Workspace
  const [cart, setCart] = useState<{ product: Product; quantity: number; checked: boolean; remark: string; group: string }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedJobNo, setSelectedJobNo] = useState<string>('');
  const [bomName, setBomName] = useState<string>('');
  const [bomDescription, setBomDescription] = useState<string>('');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const hasExistingBom = useMemo(() => {
    if (!selectedJobNo) return false;
    return boms.some(b => b.jobNo === selectedJobNo && b.status !== 'completed' && b.status !== 'cancelled');
  }, [boms, selectedJobNo]);

  const handleOpenPdf = (pdfUrl?: string) => {
    if (!pdfUrl) return;
    try {
      if (pdfUrl.startsWith('data:application/pdf;base64,')) {
        // For base64, open in a new window with iframe, or download
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(
            `<iframe src="${pdfUrl}" style="width:100%; height:100%; border:none;"></iframe>`
          );
          newWindow.document.title = "คู่มือสินค้า PDF";
        } else {
          // Fallback to direct download
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = 'manual.pdf';
          link.click();
        }
      } else {
        // Direct web link
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error(e);
      alert('ไม่สามารถเปิดไฟล์ PDF ได้โดยตรงจากเบราว์เซอร์นี้ แนะนำให้ตรวจสอบความถูกต้องของ URL');
    }
  };

  const handleJobChange = (jobNo: string) => {
    setSelectedJobNo(jobNo);
    const proj = jobProjects?.find(p => p.jobNo === jobNo);
    if (proj) {
      setBomName(`BOM สำหรับ ${proj.jobNo} - ${proj.projectName}`);
    } else {
      setBomName('');
    }
  };

  const addToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, checked: true, remark: '', group: 'ทั่วไป' }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: string, quantity: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const toggleCartItemChecked = (productId: string) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, checked: !item.checked } : item
    ));
  };

  const updateCartItemField = (productId: string, field: 'remark' | 'group', value: string) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, [field]: value } : item
    ));
  };

  const removeCartItem = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCreateBomSubmit = async () => {
    const checkedItems = cart.filter(item => item.checked);
    if (checkedItems.length === 0) {
      if (addToast) {
        addToast('warning', 'เกิดข้อผิดพลาด', 'กรุณาเลือก/เช็คลิสต์สินค้าที่ต้องการอย่างน้อย 1 รายการเพื่อสร้าง BOM');
      } else {
        alert('กรุณาเลือก/เช็คลิสต์สินค้าที่ต้องการอย่างน้อย 1 รายการเพื่อสร้าง BOM');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Look for an existing BOM with the same jobNo that is not completed or cancelled
      // Prefer pending status if multiple exist
      const existingBom = selectedJobNo
        ? (boms.find(b => b.jobNo === selectedJobNo && b.status === 'pending') || boms.find(b => b.jobNo === selectedJobNo && b.status !== 'completed' && b.status !== 'cancelled'))
        : null;

      if (existingBom) {
        const mergedItems = [...existingBom.items];
        checkedItems.forEach(item => {
          const existingItemIndex = mergedItems.findIndex(existingItem => existingItem.productId === item.product.id);
          
          if (existingItemIndex > -1) {
            // Already exists, sum up the quantity
            mergedItems[existingItemIndex] = {
              ...mergedItems[existingItemIndex],
              quantity: mergedItems[existingItemIndex].quantity + item.quantity,
              remark: [mergedItems[existingItemIndex].remark, item.remark].filter(Boolean).join('; ')
            };
          } else {
            // New item, append
            mergedItems.push({
              productId: item.product.id,
              productName: item.product.name,
              quantity: item.quantity,
              unit: item.product.unit || 'ชิ้น',
              brand: item.product.brand || '',
              priceUnit: item.product.price || 0,
              remark: item.remark || '',
              group: item.group || 'ทั่วไป'
            });
          }
        });

        const updatedBom: Bom = {
          ...existingBom,
          items: mergedItems,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'boms', existingBom.id), cleanUndefined(updatedBom));

        if (addToast) {
          addToast('success', 'รวมข้อมูล BOM สำเร็จ', `ได้รวบรวมและเพิ่มพัสดุเข้ากับ BOM เดิมของ Job No: ${selectedJobNo} เรียบร้อยแล้ว (ไม่สร้างใบงานใหม่)`);
        }
      } else {
        const bomId = `bom-${Math.random().toString(36).substring(2, 9)}`;
        const newBom: Bom = {
          id: bomId,
          name: bomName || `BOM-${selectedJobNo || 'GENERIC'}`,
          description: bomDescription || 'สร้างใบงาน BOM จากระบบแคตตาล็อกสินค้า',
          items: checkedItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unit: item.product.unit || 'ชิ้น',
            brand: item.product.brand || '',
            priceUnit: item.product.price || 0,
            remark: item.remark || '',
            group: item.group || 'ทั่วไป'
          })),
          jobNo: selectedJobNo || '',
          status: 'pending',
          requiredQuantity: requiredQuantity,
          stockDeducted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'boms', bomId), cleanUndefined(newBom));

        if (addToast) {
          addToast('success', 'สร้าง BOM สำเร็จ', `ได้สร้าง BOM สำหรับ Job No: ${selectedJobNo || 'พัสดุทั่วไป'} และส่งไปยัง BOM & Assembly Workspace แล้ว`);
        }
      }

      setCart([]);
      setIsCartOpen(false);
      setBomName('');
      setBomDescription('');
      setSelectedJobNo('');
      setRequiredQuantity(1);
    } catch (err) {
      console.error("Error creating/updating BOM: ", err);
      if (addToast) {
        addToast('warning', 'เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูล BOM ได้ กรุณาลองใหม่อีกครั้ง');
      } else {
        alert('ไม่สามารถบันทึกข้อมูล BOM ได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract all unique brands
  const uniqueBrandNames = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.brand) set.add(p.brand.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;
      const matchesStock = !inStockOnly || p.quantity > 0;
      
      const normalizedSearch = searchQuery.toLowerCase().trim();
      const matchesSearch = !normalizedSearch || 
        (p.name || '').toLowerCase().includes(normalizedSearch) ||
        (p.sku && p.sku.toLowerCase().includes(normalizedSearch)) ||
        (p.brand && p.brand.toLowerCase().includes(normalizedSearch)) ||
        (p.description && p.description.toLowerCase().includes(normalizedSearch)) ||
        (p.series && p.series.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesBrand && matchesStock && matchesSearch;
    });
  }, [products, selectedCategory, selectedBrand, inStockOnly, searchQuery]);

  // Group filtered products by sub-series/series for tidy browsing within category
  const groupedProductsBySeries = useMemo(() => {
    const groups: { [seriesName: string]: Product[] } = {};
    filteredProducts.forEach(p => {
      const sName = p.series && p.series.trim() ? p.series : 'ทั่วไป / ไม่มี Series ย่อย';
      if (!groups[sName]) {
        groups[sName] = [];
      }
      groups[sName].push(p);
    });
    return groups;
  }, [filteredProducts]);

  // Find Category Object for Banner Details
  const activeCategoryObj = useMemo(() => {
    return categories.find(c => c.id === selectedCategory);
  }, [categories, selectedCategory]);

  const handlePrintCatalog = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left pb-16 print:p-0">
      
      {/* -------------------- HEADER CARD (Hidden on Print) -------------------- */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-950 dark:to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold font-sans">
            <BookOpen className="h-3.5 w-3.5" />
            แคตตาล็อกพัสดุ (Digital Catalog)
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
            แคตตาล็อกสินค้า และพัสดุไฟฟ้าออนไลน์
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-sans font-medium">
            สืบค้นข้อมูลผลิตภัณฑ์อย่างเป็นระเบียบ แบ่งกลุ่มตาม Series ย่อย พร้อมรูปภาพประกอบ คุณสมบัติทางเทคนิค และยอดคงเหลือในคลัง เหมาะสำหรับเปิดใช้นำเสนอหน้างานหรือดาวน์โหลดพิมพ์เป็นเอกสาร
          </p>
        </div>
        <button
          onClick={handlePrintCatalog}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-900 border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-black tracking-wide font-sans shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Printer className="h-4 w-4 text-slate-700" />
          พิมพ์เป็น PDF แคตตาล็อก
        </button>
      </div>

      {/* -------------------- MAIN CONTROLS & BROWSER (Hidden on Print) -------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print:hidden">
        
        {/* SIDEBAR FILTERS */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <Filter className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-sans">
                ตัวกรองหมวดหมู่
              </span>
            </div>

            {/* In Stock toggle switch */}
            <label className="flex items-center gap-2.5 py-1 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-all select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
              />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 font-sans">
                แสดงเฉพาะสินค้าพร้อมส่ง (มีสต็อก)
              </span>
            </label>

            {/* Category selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans block">
                เลือกกลุ่มสินค้าหลัก
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer flex items-center justify-between font-sans ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold border-l-4 border-indigo-600 pl-2'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">ทั้งหมด (All Products)</span>
                  <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500">
                    {products.length}
                  </span>
                </button>
                {categories.map((cat) => {
                  const catProductsCount = products.filter(p => p.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer flex items-center justify-between font-sans ${
                        selectedCategory === cat.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold border-l-4 border-indigo-600 pl-2'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{cat.name.split(' (')[0]}</span>
                      <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500">
                        {catProductsCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand/Manufacturer Filter */}
            {uniqueBrandNames.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans block">
                  กรองตามผู้ผลิต (แบรนด์)
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden"
                >
                  <option value="all">แบรนด์ทั้งหมด (All Brands)</option>
                  {uniqueBrandNames.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* SEARCH & PRODUCT GRID */}
        <div className="space-y-4 lg:col-span-3">
          
          {/* Real-time Search Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="ค้นหาตามชื่อสินค้า, Code, แบรนด์, รายละเอียดผลิตภัณฑ์..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
              <div className="text-[10px] text-slate-400 font-sans font-bold whitespace-nowrap shrink-0 sm:border-l sm:border-slate-200 sm:pl-3 dark:border-slate-800">
                พบพัสดุไฟฟ้าทั้งหมด <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-xs">{filteredProducts.length}</span> รายการ
              </div>
              
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  cart.length > 0 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/15 animate-pulse'
                    : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-150 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                <span>ชุดประกอบ BOM ({cart.length})</span>
              </button>
            </div>
          </div>

          {/* ACTIVE CATEGORY DETAILS CARD */}
          {activeCategoryObj && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-3xs flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in duration-150">
              {activeCategoryObj.imageUrl && (
                <img
                  src={activeCategoryObj.imageUrl}
                  alt={activeCategoryObj.name}
                  className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-200 dark:border-slate-800 bg-white"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="space-y-1 text-left min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans">
                    {activeCategoryObj.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${activeCategoryObj.color || 'bg-slate-100 text-slate-600'}`}>
                    หมวดหมู่หลัก
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                  {activeCategoryObj.description || 'ไม่มีคำอธิบายหมวดหมู่'}
                </p>
              </div>
            </div>
          )}

          {/* BROWSE GRID INDEXED BY SUB-SERIES */}
          <div className="space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-3xs">
                <Boxes className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans">ไม่พบรายการพัสดุในแคตตาล็อก</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-sans max-w-sm mx-auto mt-1">
                  กรุณาลองปรับเปลี่ยนตัวเลือก หมวดหมู่สินค้า คำค้นหา หรือแบรนด์พัสดุในแถบเครื่องมือ
                </p>
              </div>
            ) : (
              Object.keys(groupedProductsBySeries).map((seriesName) => {
                const isGenericSeries = seriesName === 'ทั่วไป / ไม่มี Series ย่อย';
                const sSeriesObj = activeCategoryObj?.subSeries?.find(s => s.name === seriesName);
                const subSeriesImage = sSeriesObj?.imageUrl;

                return (
                  <div key={seriesName} className="space-y-3">
                    
                    {/* SERIES SUBHEADER TITLE */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        {subSeriesImage ? (
                          <img 
                            src={subSeriesImage} 
                            alt={seriesName} 
                            className="w-7 h-7 object-cover rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Tag className="h-4 w-4 text-indigo-500" />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wide font-sans">
                            {!isGenericSeries ? `Series: ${seriesName}` : 'พัสดุทั่วไป (ทั่วไป / ไม่มี Series ย่อย)'}
                          </h4>
                          {sSeriesObj?.pdfUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPdf(sSeriesObj.pdfUrl);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-md shadow-3xs transition-all cursor-pointer"
                              title="อ่าน PDF Manual ของ Series นี้ออนไลน์"
                            >
                              <FileText className="h-3 w-3" />
                              <span>อ่านคู่มือ PDF</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-400">
                        {groupedProductsBySeries[seriesName].length} รายการ
                      </span>
                    </div>

                    {/* PRODUCT LIST AS COMPACT ROW LIST - FULL WIDTH HORIZONTAL BARS */}
                    <div className="flex flex-col gap-2">
                      {/* Column Header Row (Visible on Desktop / Large Screens) */}
                      <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">
                        <span className="flex-1">รายการพัสดุ / แบรนด์</span>
                        <span className="w-36">Code</span>
                        <span className="w-28 text-right">ราคาต่อหน่วย</span>
                        <span className="w-28 text-center">คลังคงเหลือ</span>
                        <span className="w-32 text-right">จัดการชุด BOM</span>
                      </div>

                      {groupedProductsBySeries[seriesName].map((prod) => {
                        const inStock = prod.quantity > 0;
                        const isLowStock = !inStock || prod.quantity <= (prod.minAlert || 5);
                        const cartItem = cart.find(item => item.product.id === prod.id);
                        
                        return (
                          <div
                            key={prod.id}
                            onClick={() => setSelectedProduct(prod)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 rounded-xl shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between cursor-pointer hover:shadow-xs hover:translate-y-[-0.5px] transition-all group relative animate-in fade-in duration-155 overflow-hidden p-3 gap-3"
                          >
                            {/* Col 1: Product preview, Name, Brand */}
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden shadow-4xs">
                                {prod.image ? (
                                  <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Boxes className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 text-left space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h5 className="text-[12.5px] font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-sans flex items-center gap-1">
                                    {prod.modelNumber !== undefined && prod.modelNumber !== null && String(prod.modelNumber).trim() !== '' && (
                                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded mr-1 leading-none shrink-0">
                                        รุ่น: {prod.modelNumber} {prod.modelUnit || 'Kg'}
                                      </span>
                                    )}
                                    <span>{prod.name}</span>
                                  </h5>
                                  {prod.series && (
                                    <span className="text-[8.5px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.2 rounded-md border border-indigo-100/30">
                                      {prod.series}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-md border border-indigo-100/20">{prod.brand}</span>
                                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                                  <span className="hidden sm:inline truncate max-w-[240px]" title={prod.description}>{prod.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Divider on Mobile only */}
                            <div className="h-px w-full bg-slate-100 dark:bg-slate-800/80 lg:hidden" />

                            {/* Column Group for desktop alignment / stacked on mobile */}
                            <div className="flex flex-row items-center justify-between lg:justify-end gap-4 flex-wrap lg:flex-nowrap">
                              {/* Col 2: SKU */}
                              <div className="w-36 shrink-0 text-left font-mono text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider font-sans">Code:</span>
                                {prod.sku || <span className="text-slate-300 dark:text-slate-700">-</span>}
                              </div>

                              {/* Col 3: Price */}
                              <div className="w-28 shrink-0 text-left lg:text-right font-sans">
                                <span className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider font-sans">ราคาต่อหน่วย:</span>
                                <span className="text-[12.5px] font-black text-slate-800 dark:text-slate-150">
                                  ฿{(prod.price ?? 0).toLocaleString()}
                                </span>
                              </div>

                              {/* Col 4: Stock level */}
                              <div className="w-28 shrink-0 text-left lg:text-center font-sans">
                                <span className="lg:hidden text-[9px] font-black text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider font-sans">คลังคงเหลือ:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black font-sans inline-flex items-center gap-1 border ${
                                  !inStock
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/40'
                                    : isLowStock
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-450 border-amber-100 dark:border-amber-900/40'
                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${!inStock ? 'bg-rose-500 animate-pulse' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                  {!inStock ? 'สินค้าหมด' : `${prod.quantity} ${prod.unit || 'ชิ้น'}`}
                                </span>
                              </div>

                              {/* Col 5: Actions */}
                              <div className="w-32 shrink-0 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                {cartItem ? (
                                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <button
                                      onClick={(e) => updateCartQty(prod.id, cartItem.quantity - 1, e)}
                                      className="w-5.5 h-5.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-xs active:scale-90 transition-all cursor-pointer shadow-3xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 min-w-[18px] text-center">
                                      {cartItem.quantity}
                                    </span>
                                    <button
                                      onClick={(e) => updateCartQty(prod.id, cartItem.quantity + 1, e)}
                                      className="w-5.5 h-5.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-xs active:scale-90 transition-all cursor-pointer shadow-3xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => addToCart(prod, e)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-[10px] rounded-xl shadow-3xs hover:shadow-md hover:shadow-indigo-600/10 transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-500"
                                  >
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    <span>จัดชุด BOM</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* -------------------- FULL SCREEN MODAL: PRODUCT DETAILS SHEET -------------------- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-300 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans uppercase tracking-wider">
                  แผ่นข้อมูลผลิตภัณฑ์ (Product Sheet)
                </h4>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Image & Title Card */}
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 shrink-0 flex items-center justify-center">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Boxes className="h-10 w-10 text-slate-400 dark:text-slate-700" />
                  )}
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  {(() => {
                    const bMatch = brands.find(b => b.name === selectedProduct.brand);
                    if (bMatch) {
                      return (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-[9.5px] font-black text-slate-700 dark:text-slate-300 shadow-3xs leading-none">
                          {bMatch.logoUrl ? (
                            <img src={bMatch.logoUrl} alt={selectedProduct.brand} className="h-5 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <span>🏷️ {selectedProduct.brand}</span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-extrabold uppercase tracking-widest inline-block font-sans">
                        {selectedProduct.brand || 'GENERIC BRAND'}
                      </span>
                    );
                  })()}
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight leading-tight">
                    {selectedProduct.name}
                  </h3>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <Barcode className="h-3 w-3 text-slate-400" /> Code: <span className="text-slate-600 dark:text-slate-300 font-extrabold">{selectedProduct.sku || 'N/A'}</span>
                    </div>
                    {selectedProduct.modelNumber !== undefined && selectedProduct.modelNumber !== null && String(selectedProduct.modelNumber).trim() !== '' && (
                      <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <span>รุ่นสินค้า: </span>
                        <span className="text-rose-700 dark:text-rose-300 font-extrabold">{selectedProduct.modelNumber} {selectedProduct.modelUnit || 'Kg'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Technical Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-150 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">หมวดหมู่สินค้า</span>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 font-sans">
                    {categories.find(c => c.id === selectedProduct.category)?.name || 'ไม่มีหมวดหมู่'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">Series ย่อย (Sub-series)</span>
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 font-sans">
                    {selectedProduct.series || 'ไม่มี Series ย่อย'}
                  </span>
                </div>
                <div className="space-y-0.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">หน่วยนับพัสดุ</span>
                  <span className="text-[11px] font-extrabold text-slate-755 dark:text-slate-300 font-sans">
                    {selectedProduct.unit || 'ชิ้น (PCS)'}
                  </span>
                </div>
                <div className="space-y-0.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 mt-1">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">แหล่งจัดซื้อ (Supplier)</span>
                  <span className="text-[11px] font-extrabold text-slate-755 dark:text-slate-300 font-sans truncate">
                    {selectedProduct.supplier || 'ซื้อจากร้านค้าทั่วไป'}
                  </span>
                </div>
                <div className="space-y-0.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 mt-1 col-span-full">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">จุดติดตั้งในโรงเรือน / โกดัง</span>
                  <span className="text-[11px] font-extrabold text-slate-755 dark:text-slate-300 font-sans">
                    {selectedProduct.warehouse || 'คลังโรงงานใหญ่ (Main Warehouse)'}
                  </span>
                </div>
              </div>

              {/* Description Detail Block */}
              <div className="space-y-1">
                <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">รายละเอียด / คุณสมบัติผลิตภัณฑ์</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-800 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {selectedProduct.description || 'ไม่มีคำอธิบายคุณสมบัติพัสดุชิ้นนี้'}
                </p>
              </div>

              {/* Price & Availability details */}
              <div className="flex items-center justify-between p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl mt-2">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 block font-sans">ราคาขายอ้างอิง</span>
                  <span className="text-base font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                    ฿{(selectedProduct.price ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block font-sans">สถานะความพร้อม</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-sans inline-block mt-0.5 ${
                    selectedProduct.quantity > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}>
                    {selectedProduct.quantity > 0 ? `พร้อมส่ง (${selectedProduct.quantity} ชิ้น)` : 'สินค้าหมด'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950 gap-2">
              {selectedProduct.sourceUrl && (
                <a
                  href={selectedProduct.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200/80 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 font-sans"
                >
                  <ExternalLink className="h-3 w-3" /> ลิงก์คุณลักษณะเสริม
                </a>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wide font-sans cursor-pointer active:scale-95 transition-all shadow-md shadow-indigo-600/15"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SLIDE-OVER DRAWER: BOM BUILDER WORKSPACE -------------------- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans print:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250">
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      ชุดเตรียมส่งออกประกอบ BOM & Assembly
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-none mt-0.5">
                      เลือกรายการพัสดุ ป้อนจำนวน และผูกกับ Job No ของโครงการ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
                
                {/* PROJECT ASSIGNMENT & CONFIG CARD */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <div className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                      ข้อมูลเป้าหมายโครงการ (Project Setup)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Job No Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        เลือกหมายเลข Job No <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedJobNo}
                        onChange={(e) => handleJobChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">-- กรุณาเลือกโครงการ (Job No) --</option>
                        {jobProjects.map(proj => (
                          <option key={proj.id} value={proj.jobNo}>
                            [{proj.jobNo}] {proj.projectName}
                          </option>
                        ))}
                      </select>
                      {hasExistingBom && (
                        <div className="mt-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-[9.5px] text-amber-700 dark:text-amber-450 font-bold leading-relaxed">
                          ⚠️ ตรวจพบใบงาน BOM สำหรับ Job No: {selectedJobNo} ในระบบแล้ว ระบบจะเพิ่มรายการที่เลือกเข้าไปในใบงานเดิมโดยอัตโนมัติ (ไม่สร้างใบงานใหม่ซ้ำ)
                        </div>
                      )}
                    </div>

                    {/* Assembly Multiplier Qty */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        จำนวนชุดผลิตเครื่องจักร (ชุด)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={requiredQuantity}
                        onChange={(e) => setRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* BOM Formula Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      ชื่อใบชุดงาน BOM / ใบสั่งประกอบ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ระบุชื่อเรียกชุดประกอบ BOM เช่น ชุดตู้คุมหลักบ่อบำบัดน้ำเสีย"
                      value={bomName}
                      onChange={(e) => setBomName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Description / Extra Note */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      รายละเอียดคำสั่ง / บันทึกเพิ่มเติม (Description)
                    </label>
                    <textarea
                      placeholder="เช่น ระบุตำแหน่งการติดตั้ง หรือคำแนะนำทางเทคนิคสำหรับการประกอบพัสดุชุดนี้..."
                      value={bomDescription}
                      onChange={(e) => setBomDescription(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {/* SELECTED PRODUCTS CHECKLIST TABLE */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">
                      รายการพัสดุและเช็คลิสต์ตรวจความถูกต้อง ({cart.length} รายการ)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                      * ติ๊กเพื่ออนุมัติส่งต่อ
                    </span>
                  </div>

                  {cart.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-950/20 p-8 text-center rounded-2xl border border-slate-150 border-dashed dark:border-slate-800">
                      <Boxes className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-sans font-bold">ยังไม่ได้เลือกสินค้าใดๆ จากแคตตาล็อก</p>
                      <p className="text-[10px] text-slate-400 font-sans mt-0.5">กรุณากดปุ่ม "+ เลือกจัดชุด BOM" ในรายการสินค้าด้านข้าง</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item, index) => {
                        const subtotal = item.product.price * item.quantity;
                        return (
                          <div 
                            key={item.product.id} 
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                              item.checked 
                                ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-3xs' 
                                : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-150 dark:border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <input 
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => toggleCartItemChecked(item.product.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer mt-1"
                              />

                              {/* Info details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                    {item.product.name}
                                  </h4>
                                  <button
                                    onClick={(e) => removeCartItem(item.product.id, e)}
                                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono font-bold text-slate-400">
                                    Code: {item.product.sku || 'N/A'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                                    แบรนด์: {item.product.brand || 'No Brand'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Quantity Adjuster, Group Tag Selector & Remarks */}
                            {item.checked && (
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-0.5">
                                
                                {/* Stepper Column */}
                                <div className="sm:col-span-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-150 dark:border-slate-800">
                                  <span className="text-[10px] font-sans font-bold text-slate-500">จำนวน:</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => updateCartQty(item.product.id, item.quantity - 1, e)}
                                      className="w-5 h-5 rounded-md bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-center font-bold text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono text-xs font-black text-slate-800 dark:text-white">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={(e) => updateCartQty(item.product.id, item.quantity + 1, e)}
                                      className="w-5 h-5 rounded-md bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-center font-bold text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Group Selector Column */}
                                <div className="sm:col-span-4">
                                  <select
                                    value={item.group || 'ทั่วไป'}
                                    onChange={(e) => updateCartItemField(item.product.id, 'group', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-sans font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden"
                                  >
                                    <option value="ทั่วไป">กลุ่มทั่วไป (Default)</option>
                                    <option value="Electrical">ระบบไฟฟ้า (Electrical)</option>
                                    <option value="Mechanical">ระบบกลึง/กลไก (Machine)</option>
                                    <option value="Structure">โครงสร้าง/เชื่อม (Welding)</option>
                                    <option value="Assembly">ระบบประกอบ (Assembly)</option>
                                    <option value="Pneumatic">ระบบลม (Pneumatic)</option>
                                  </select>
                                </div>

                                {/* Pricing summary / Subtotal Column */}
                                <div className="sm:col-span-4 flex items-center justify-end text-right text-[11px] font-sans">
                                  <span className="text-slate-400 mr-1 font-bold">รวม:</span>
                                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                                    ฿{(subtotal ?? 0).toLocaleString()}
                                  </span>
                                </div>

                                {/* Remark input span-full */}
                                <div className="sm:col-span-full pt-1">
                                  <input 
                                    type="text"
                                    placeholder="ใส่หมายเหตุ (เช่น ระบุตำแหน่งประกอบพิเศษ, สี, หรือขนาดกระแสไฟ)"
                                    value={item.remark || ''}
                                    onChange={(e) => updateCartItemField(item.product.id, 'remark', e.target.value)}
                                    className="w-full px-2.5 py-1 bg-slate-50/50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-[10px] text-slate-600 dark:text-slate-400 placeholder:text-slate-400 font-sans focus:outline-hidden"
                                  />
                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col gap-3">
                
                {/* CART SUMMARIES */}
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 font-sans font-bold">
                  <span>จำนวนวัตถุดิบทั้งหมดที่เปิดสั่ง:</span>
                  <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    {cart.filter(item => item.checked).reduce((acc, curr) => acc + curr.quantity, 0)} รายการ
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm font-sans font-black">
                  <span className="text-slate-800 dark:text-slate-100">มูลค่ารวมคาดการณ์ (Total Value):</span>
                  <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                    ฿{cart.filter(item => item.checked).reduce((acc, curr) => acc + ((curr.product?.price || 0) * curr.quantity), 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2.5 pt-1.5">
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 border border-slate-250 dark:border-slate-800 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black tracking-wide font-sans cursor-pointer text-center"
                  >
                    เลือกพัสดุเพิ่ม
                  </button>

                  <button
                    onClick={handleCreateBomSubmit}
                    disabled={isSubmitting || !selectedJobNo || cart.filter(item => item.checked).length === 0}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-2xl text-xs font-black tracking-wide font-sans shadow-lg shadow-emerald-600/15 cursor-pointer disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>กำลังประมวลผล...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{hasExistingBom ? 'บันทึกรวมเข้ากับ BOM เดิม' : 'ยืนยันและส่งไป BOM Workspace'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* -------------------- 🖨️ SPECIAL FULL-PAGE PRINT-ONLY LAYOUT -------------------- */}
      <div className="hidden print:block text-slate-900 bg-white min-h-screen text-left">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black font-sans uppercase tracking-tight">GTT EE STORE</h1>
            <p className="text-xs text-slate-500 font-sans uppercase tracking-widest font-bold">Official Product Catalog & Inventory Sheet</p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono font-bold">
            <div>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</div>
            <div>หน้า: 1 / 1</div>
          </div>
        </div>

        <div className="space-y-8">
          {categories.map((cat) => {
            const catProducts = products.filter(p => p.category === cat.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-4 break-inside-avoid">
                <div className="bg-slate-100 p-2.5 rounded border border-slate-300 flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase font-sans tracking-wide">
                    {cat.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    ทั้งหมด {catProducts.length} รายการ
                  </span>
                </div>

                <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-300">
                      <th className="py-2 px-3 border-r border-slate-300 w-1/4">ชื่อผลิตภัณฑ์ / MODEL</th>
                      <th className="py-2 px-3 border-r border-slate-300 w-1/6">Code</th>
                      <th className="py-2 px-3 border-r border-slate-300 w-1/6">แบรนด์</th>
                      <th className="py-2 px-3 border-r border-slate-300 w-1/6">Series ย่อย</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-1/12">ราคาขาย</th>
                      <th className="py-2 px-3 text-right w-1/12">คงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catProducts.map((p) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">{p.name}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold">{p.sku || 'N/A'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold uppercase">{p.brand || 'No Brand'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-indigo-700 font-bold">{p.series || '-'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold">฿{(p.price ?? 0).toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right font-mono font-extrabold ${p.quantity === 0 ? 'text-rose-600 font-black' : ''}`}>
                          {p.quantity === 0 ? 'หมด' : `${p.quantity} ${p.unit || 'ชิ้น'}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-4 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400 font-sans font-bold">
          -- จบรายการแคตตาล็อกอย่างเป็นทางการ GTT EE STORE --
        </div>
      </div>

    </div>
  );
};
