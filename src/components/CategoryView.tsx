import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Plus, Trash2, Edit3, X, Layers, AlertCircle, Upload, Image as ImageIcon, ChevronDown, ChevronUp, Tag } from 'lucide-react';

interface CategoryViewProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onEditProduct?: (id: string, updated: Partial<Product>) => void;
}

const PRESET_COLORS = [
  { name: 'น้ำเงิน', value: 'bg-blue-100 text-blue-800 border-blue-150 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' },
  { name: 'ม่วง', value: 'bg-purple-100 text-purple-800 border-purple-150 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800' },
  { name: 'ส้มทอง', value: 'bg-amber-100 text-amber-800 border-amber-150 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' },
  { name: 'เขียว', value: 'bg-emerald-100 text-emerald-800 border-emerald-150 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' },
  { name: 'แดงชมพู', value: 'bg-rose-100 text-rose-800 border-rose-150 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800' },
  { name: 'ฟ้าคราม', value: 'bg-cyan-100 text-cyan-800 border-cyan-150 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800' },
  { name: 'เทาสุขุม', value: 'bg-slate-100 text-slate-800 border-slate-150 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700' },
  { name: 'แดงสด', value: 'bg-red-100 text-red-800 border-red-150 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800' },
];

export default function CategoryView({
  categories,
  products,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onEditProduct,
}: CategoryViewProps) {
  // Local state
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [imageUrl, setImageUrl] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Series (Sub-categories) State
  const [expandedSeriesCatId, setExpandedSeriesCatId] = useState<string | null>(null);
  const [seriesInput, setSeriesInput] = useState('');
  const [seriesImageInput, setSeriesImageInput] = useState('');

  // Editing Series States
  const [editingSeriesName, setEditingSeriesName] = useState<{ catId: string; oldName: string } | null>(null);
  const [editSeriesNameInput, setEditSeriesNameInput] = useState('');
  const [editSeriesImageInput, setEditSeriesImageInput] = useState('');

  const startEditSeries = (catId: string, seriesName: string, imgUrl: string) => {
    setEditingSeriesName({ catId, oldName: seriesName });
    setEditSeriesNameInput(seriesName);
    setEditSeriesImageInput(imgUrl);
  };

  const handleSaveEditSeries = (catId: string) => {
    if (!editingSeriesName) return;
    const { oldName } = editingSeriesName;
    const newName = editSeriesNameInput.trim();
    const newImage = editSeriesImageInput.trim();

    if (!newName) return;

    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    if (newName !== oldName) {
      const currentSeries = cat.series || [];
      const currentSubSeries = cat.subSeries || [];
      if (currentSeries.includes(newName) || currentSubSeries.some((s) => s.name.trim() === newName)) {
        alert('มี Series ย่อยชื่อนี้อยู่แล้วในหมวดหมู่นี้');
        return;
      }
    }

    const updatedSeries = (cat.series || []).map((s) => s === oldName ? newName : s);
    const updatedSubSeries = (cat.subSeries || []).map((s) => {
      if (s.name === oldName) {
        return { name: newName, imageUrl: newImage };
      }
      return s;
    });

    onEditCategory(catId, {
      series: updatedSeries,
      subSeries: updatedSubSeries
    });

    // Cascade update on products with old series name
    if (newName !== oldName && onEditProduct) {
      const productsToUpdate = products.filter((p) => p.category === catId && p.series === oldName);
      productsToUpdate.forEach((p) => {
        onEditProduct(p.id, { series: newName });
      });
    }

    setEditingSeriesName(null);
    setEditSeriesNameInput('');
    setEditSeriesImageInput('');
  };

  const handleAddSeries = (catId: string) => {
    if (!seriesInput.trim()) return;
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    const currentSeries = cat.series || [];
    const currentSubSeries = cat.subSeries || [];
    if (currentSeries.includes(seriesInput.trim()) || currentSubSeries.some((s) => s.name.trim() === seriesInput.trim())) {
      alert('มี Series ย่อยนี้อยู่แล้วในหมวดหมู่นี้');
      return;
    }

    const updatedSeries = [...currentSeries, seriesInput.trim()];
    const updatedSubSeries = [
      ...currentSubSeries,
      { name: seriesInput.trim(), imageUrl: seriesImageInput.trim() },
    ];
    onEditCategory(catId, { 
      series: updatedSeries,
      subSeries: updatedSubSeries
    });
    setSeriesInput('');
    setSeriesImageInput('');
  };

  const handleRemoveSeries = (catId: string, seriesName: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ Series ย่อย "${seriesName}"? สินค้าในคลังที่สังกัด Series นี้จะคงอยู่แต่จะถูกจัดอยู่ในกลุ่มทั่วไป`)) {
      const updatedSeries = (cat.series || []).filter((s) => s !== seriesName);
      const updatedSubSeries = (cat.subSeries || []).filter((s) => s.name !== seriesName);
      onEditCategory(catId, { 
        series: updatedSeries,
        subSeries: updatedSubSeries
      });
    }
  };

  const getProductCount = (catId: string) => {
    return products.filter((p) => p.category === catId).length;
  };

  const getStockCount = (catId: string) => {
    return products.filter((p) => p.category === catId).reduce((sum, p) => sum + p.quantity, 0);
  };

  const categoryToDelete = categories.find((c) => c.id === confirmDeleteId);
  const deleteProductCount = categoryToDelete ? getProductCount(categoryToDelete.id) : 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing) {
      onEditCategory(isEditing, { name, description, color, imageUrl });
      setIsEditing(null);
    } else {
      onAddCategory({ name, description, color, imageUrl });
    }

    // Reset Form
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0].value);
    setImageUrl('');
  };

  const handleEditClick = (cat: Category) => {
    setIsEditing(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setColor(cat.color);
    setImageUrl(cat.imageUrl || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0].value);
    setImageUrl('');
  };

  return (
    <div className="space-y-4 text-left">
      
      {/* Reorganized elegant category form card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-150 dark:border-slate-800">
          <Layers className="h-4.5 w-4.5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans">
              {isEditing ? 'แก้ไขหมวดหมู่สินค้า' : 'เพิ่มหมวดหมู่สินค้าใหม่'}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans mt-0.5">
              {isEditing ? 'ปรับปรุงรายละเอียดและลักษณะการแสดงผลของหมวดหมู่สินค้า' : 'สร้างหมวดหมู่ใหม่เพื่อจัดหมวดหมู่พัสดุและตั้งค่ากลุ่ม Series ย่อย'}
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3.5">
            {/* Name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 font-sans block">
                ชื่อกลุ่มสินค้า <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ระบุชื่อกลุ่มสินค้า (เช่น อุปกรณ์ไฟฟ้า, อะไหล่สำรอง, แคตตาล็อกสายไฟ...)"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-450"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="input-category-name"
              />
            </div>

            {/* Description input */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 font-sans block">
                รายละเอียดหมวดหมู่
              </label>
              <textarea
                placeholder="ระบุคำอธิบายย่อๆ เกี่ยวกับรายการสินค้าที่จัดอยู่ในหมวดนี้..."
                rows={2}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-455 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                id="input-category-desc"
              />
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Image input / selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 font-sans block">
                รูปภาพหมวดหมู่ (URL รูปภาพ หรืออัปโหลดรูปภาพ)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="URL รูปภาพกลุ่มพัสดุ..."
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-455"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    id="input-category-image"
                  />
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                {/* File Upload button & Base64 Converter */}
                <label className="cursor-pointer p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center justify-center shrink-0 transition-all h-[34px] w-[34px] border-dashed" title="อัปโหลดรูปภาพ">
                  <Upload className="h-4 w-4 text-slate-500" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImageUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {/* Image Preview */}
                {imageUrl && (
                  <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>

            {/* Color presets inline */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 font-sans block">
                ธีมสีการ์ดแสดงผล
              </label>
              <div className="grid grid-cols-4 gap-1">
                {PRESET_COLORS.map((col, idx) => {
                  const isSelected = color === col.value;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setColor(col.value)}
                      className={`py-1 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer text-center truncate ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                      id={`btn-preset-color-${idx}`}
                    >
                      {col.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="col-span-full flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-sans">
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                ยกเลิกการแก้ไข
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-md shadow-indigo-600/15"
              id="btn-submit-category-form"
            >
              <Plus className="h-3.5 w-3.5" />
              {isEditing ? 'บันทึกหมวดหมู่' : 'สร้างหมวดหมู่ใหม่'}
            </button>
          </div>
        </form>
      </div>

      {/* Categories Cards Grid - Intuitive & Clean UI/UX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...categories]
          .sort((a, b) => a.name.localeCompare(b.name, 'th', { numeric: true, sensitivity: 'base' }))
          .map((cat) => {
            const productCount = getProductCount(cat.id);
            const totalStock = getStockCount(cat.id);
            const isSeriesExpanded = expandedSeriesCatId === cat.id;

            return (
              <div 
                key={cat.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Main Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Category Banner/Header */}
                  <div className="flex items-start gap-3">
                    <img 
                      src={cat.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120'} 
                      alt={cat.name} 
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950 shadow-3xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-1">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-lg border leading-none ${cat.color}`}>
                        {cat.name}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans italic leading-relaxed line-clamp-2">
                        {cat.description || 'ไม่มีคำอธิบายสำหรับหมวดหมู่นี้'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                      <div className="text-[10px] font-bold text-slate-400 font-sans uppercase">จำนวนสินค้า</div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono mt-0.5">
                        {productCount} <span className="text-[10px] font-bold text-slate-400">รายการ</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                      <div className="text-[10px] font-bold text-slate-400 font-sans uppercase">สต็อกรวมในกลุ่ม</div>
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                        {totalStock} <span className="text-[10px] font-bold text-slate-400">ชิ้น</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-series Summary Preview Pill List */}
                  {((cat.subSeries && cat.subSeries.length > 0) || (cat.series && cat.series.length > 0)) && !isSeriesExpanded && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                        Series ย่อยที่มี ({cat.series?.length || 0}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set([
                          ...(cat.series || []),
                          ...(cat.subSeries || []).map((s) => s.name)
                        ])).map((serName, i) => {
                          const subSerObj = (cat.subSeries || []).find((s) => s.name === serName);
                          const imageUrlToUse = subSerObj?.imageUrl;
                          return (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-150/40 dark:border-indigo-800/40 rounded-md shadow-3xs"
                            >
                              {imageUrlToUse && (
                                <img 
                                  src={imageUrlToUse} 
                                  alt={serName} 
                                  className="w-3.5 h-3.5 object-cover rounded-sm bg-slate-100 dark:bg-slate-900 border border-slate-200/55 shrink-0" 
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span>{serName}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded Series Control Section */}
                  {isSeriesExpanded && (
                    <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-850">
                        <Tag className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-sans">
                          จัดการ Series ย่อยสำหรับ "{cat.name.split(' (')[0]}"
                        </span>
                      </div>

                      {/* Vertical Sub-series items */}
                      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {(!cat.series || cat.series.length === 0) ? (
                          <div className="text-center py-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                              ยังไม่มี Series ย่อยในกลุ่มนี้ (เช่น 1 Pole, 3 Pole)
                            </span>
                          </div>
                        ) : (
                          cat.series.map((ser, i) => {
                            const subSerObj = (cat.subSeries || []).find((s) => s.name === ser);
                            const imageUrlToUse = subSerObj?.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=120';
                            const isEditingThis = editingSeriesName && editingSeriesName.catId === cat.id && editingSeriesName.oldName === ser;

                            if (isEditingThis) {
                              return (
                                <div
                                  key={i}
                                  className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200 dark:border-indigo-900 space-y-2 text-left"
                                >
                                  <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                                    กำลังแก้ไข: "{ser}"
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 block">ชื่อ Series ใหม่</label>
                                      <input
                                        type="text"
                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-755 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans text-slate-800 dark:text-slate-100"
                                        value={editSeriesNameInput}
                                        onChange={(e) => setEditSeriesNameInput(e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 block">รูปภาพของ Series</label>
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="text"
                                          placeholder="URL รูปภาพ..."
                                          className="flex-grow px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-755 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans text-slate-800 dark:text-slate-100"
                                          value={editSeriesImageInput}
                                          onChange={(e) => setEditSeriesImageInput(e.target.value)}
                                        />
                                        <label className="cursor-pointer p-1.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-755 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 border-dashed" title="อัปโหลดรูปภาพ">
                                          <Upload className="h-3.5 w-3.5 text-slate-500" />
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                  setEditSeriesImageInput(reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingSeriesName(null)}
                                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditSeries(cat.id)}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all"
                                    >
                                      บันทึกการแก้ไข
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={i}
                                className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850/60 shadow-3xs hover:border-slate-300 dark:hover:border-slate-750 transition-all"
                              >
                                <img
                                  src={imageUrlToUse}
                                  alt={ser}
                                  className="w-10 h-10 object-cover rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-850"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0 flex-grow">
                                  <div className="text-xs font-black text-slate-850 dark:text-slate-100 truncate leading-tight font-sans" title={ser}>
                                    {ser}
                                  </div>
                                  <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold font-mono mt-0.5">
                                    Sub-series
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => startEditSeries(cat.id, ser, subSerObj?.imageUrl || '')}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-900"
                                    title="แก้ไข Series ย่อย"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSeries(cat.id, ser)}
                                    className="p-1.5 text-slate-500 hover:text-rose-650 dark:text-slate-400 dark:hover:text-rose-450 transition-colors cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-900"
                                    title="ลบ Series ย่อย"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add Sub-series compact inline section */}
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850/80 p-2.5 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">เพิ่ม Series ย่อยใหม่</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="ระบุชื่อ Series (เช่น 1 Pole, 3 Pole...)"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans text-slate-800 dark:text-slate-100"
                            value={seriesInput}
                            onChange={(e) => setSeriesInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSeries(cat.id);
                              }
                            }}
                            id={`input-add-series-name-${cat.id}`}
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="URL รูปภาพ (หรืออัปโหลด)..."
                              className="flex-grow px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans text-slate-800 dark:text-slate-100"
                              value={seriesImageInput}
                              onChange={(e) => setSeriesImageInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSeries(cat.id);
                                }
                              }}
                              id={`input-add-series-img-${cat.id}`}
                            />
                            <label className="cursor-pointer p-1.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 border-dashed" title="อัปโหลดรูปภาพ">
                              <Upload className="h-3.5 w-3.5 text-slate-500" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setSeriesImageInput(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleAddSeries(cat.id)}
                            className="px-3.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white font-black rounded-lg text-[10px] cursor-pointer transition-all active:scale-95 flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> เพิ่มเข้ากลุ่ม
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action footer */}
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between font-sans">
                  {/* Left toggle button */}
                  <button
                    onClick={() => {
                      setExpandedSeriesCatId(isSeriesExpanded ? null : cat.id);
                      setSeriesInput('');
                      setSeriesImageInput('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-3xs ${
                      isSeriesExpanded 
                        ? 'bg-indigo-650 text-white shadow-xs' 
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                    title="จัดการ Series ย่อย"
                    id={`btn-manage-series-${cat.id}`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Series ย่อย ({cat.series?.length || 0})</span>
                    {isSeriesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {/* Right CRUD buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditClick(cat)}
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-550 dark:text-slate-400 rounded-lg shadow-3xs transition-all cursor-pointer"
                      title="แก้ไขหมวดหมู่"
                      id={`btn-edit-category-${cat.id}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(cat.id)}
                      className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-rose-600 dark:hover:text-rose-450 text-slate-550 dark:text-slate-400 rounded-lg shadow-3xs transition-all cursor-pointer"
                      title="ลบหมวดหมู่"
                      id={`btn-delete-category-${cat.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Delete Rules Reminder (Flat Alert Bar) */}
      <div className="bg-amber-50/40 border border-amber-100 p-1.5 rounded flex items-center gap-1.5 text-[9.5px] text-amber-700 font-sans">
        <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
        <span>
          <strong>ระบบรักษาสินค้า:</strong> เมื่อลบกลุ่มสินค้า สินค้าที่เชื่อมโยงจะสลับไปเป็น <strong>"ไม่มีหมวดหมู่"</strong> โดยอัตโนมัติ เพื่อป้องกันสินค้าสูญหายออกจากคลังพัสดุหลัก
        </span>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDeleteId && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded max-w-sm w-full border border-slate-200 p-4 shadow-xl relative">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mb-2 border border-rose-100 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </div>

              <h3 className="text-xs font-black text-slate-800 font-sans">
                ยืนยันการลบกลุ่มสินค้า?
              </h3>
              
              <div className="mt-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700 font-mono">
                "{categoryToDelete.name}"
              </div>

              {deleteProductCount > 0 ? (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded text-left">
                  <div className="text-[10px] font-black text-amber-800 font-sans flex items-center gap-1 mb-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    ตรวจพบพัสดุผูกอยู่!
                  </div>
                  <p className="text-[9.5px] text-amber-700 font-sans leading-tight">
                    ตรวจพบสินค้าในคลัง <strong className="font-bold text-amber-900">{deleteProductCount} รายการ</strong> เชื่อมต่ออยู่ หากลบ หมวดหมู่จะเปลี่ยนเป็น <strong className="underline text-slate-900">"ไม่มีกลุ่มสินค้า"</strong> อัตโนมัติ (สินค้าไม่หาย)
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 font-sans mt-2 leading-relaxed">
                  คุณกำลังจะลบหมวดหมู่นี้ออกจากคลังอย่างถาวร ยืนยันดำเนินการลบ?
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="py-1 px-3 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setConfirmDeleteId(null);
                }}
                className="py-1 px-3 text-[10px] font-black text-white bg-rose-650 hover:bg-rose-700 rounded shadow-sm cursor-pointer text-center"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
