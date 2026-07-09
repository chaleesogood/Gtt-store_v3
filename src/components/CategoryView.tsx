import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Plus, Trash2, Edit3, X, FolderOpen, Layers } from 'lucide-react';

interface CategoryViewProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
  { name: 'สีน้ำเงิน', value: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'สีม่วง', value: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: 'สีส้มทอง', value: 'bg-amber-100 text-amber-800 border-amber-200' },
  { name: 'สีเขียว', value: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { name: 'สีแดงชมพู', value: 'bg-rose-100 text-rose-800 border-rose-200' },
  { name: 'สีฟ้าคราม', value: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { name: 'สีเทาสุขุม', value: 'bg-slate-100 text-slate-800 border-slate-200' },
  { name: 'สีแดงสด', value: 'bg-red-100 text-red-800 border-red-200' },
];

export default function CategoryView({
  categories,
  products,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryViewProps) {
  // Local state
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      onEditCategory(isEditing, { name, description, color });
      setIsEditing(null);
    } else {
      onAddCategory({ name, description, color });
    }

    // Reset Form
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0].value);
  };

  const handleEditClick = (cat: Category) => {
    setIsEditing(cat.id);
    setName(cat.name);
    setDescription(cat.description);
    setColor(cat.color);
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0].value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Column 1: Add / Edit Form & Delete Category Topic Guide */}
      <div className="space-y-4 h-fit">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 font-sans">
              {isEditing ? 'แก้ไขกลุ่มสินค้า' : 'เพิ่มกลุ่มสินค้าใหม่'}
            </h3>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Category name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 font-sans">ชื่อกลุ่มสินค้า <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                placeholder="เช่น ของเล่นเด็ก หรือ กีฬาและฟิตเนส"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
                id="input-category-name"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 font-sans">รายละเอียด / นิยามกลุ่มสินค้า</label>
              <textarea
                placeholder="เช่น สินค้าประเภทตุ๊กตา บล็อกตัวต่อ..."
                rows={3}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                id="input-category-desc"
              />
            </div>

            {/* Color Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 font-sans block">สีประจำกลุ่มสินค้า (Badge Theme)</label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((col, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setColor(col.value)}
                    className={`py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      color === col.value
                        ? 'ring-2 ring-indigo-500 border-indigo-300 scale-105 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    style={{ minHeight: '34px' }}
                  >
                    <span className={`px-1.5 py-0.5 rounded ${col.value.split(' ')[0]} ${col.value.split(' ')[1]}`}>
                      {col.name.slice(0, 3)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="px-4.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
                id="btn-submit-category-form"
              >
                <Plus className="h-3.5 w-3.5" />
                {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มกลุ่มสินค้า'}
              </button>
            </div>
          </form>
        </div>

        {/* Delete Category Guidelines / Info card */}
        <div className="bg-rose-50/60 border border-rose-100/80 p-5 rounded-2xl shadow-3xs">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-rose-100/50">
            <Trash2 className="h-4 w-4 text-rose-500" />
            <h4 className="font-extrabold text-slate-800 text-xs font-sans uppercase tracking-wider">หัวข้อ: ลบหมวดหมู่กลุ่มสินค้า</h4>
          </div>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            คุณสามารถกดลบกลุ่มสินค้าใด ๆ ได้จากคลังกลุ่มทั้งหมดทางด้านขวา โดยมีเงื่อนไขและขั้นตอนความปลอดภัยที่ท่านควรรู้ดังนี้:
          </p>
          <ul className="text-[11px] text-slate-600 font-sans list-disc list-inside mt-2.5 space-y-2 leading-relaxed">
            <li>
              <strong className="text-rose-700">หน้าต่างกดยืนยัน (Confirmation):</strong> มีกล่องข้อความยืนยันแสดงคำเตือนและชื่อกลุ่มสินค้าที่จะลบก่อนทำการลบจริงเสมอ ป้องกันอุบัติเหตุการเผลอกด
            </li>
            <li>
              <strong className="text-amber-700 font-extrabold">ระบบรักษาสินค้าอัติโนมัติ:</strong> หากกลุ่มที่ลบมีสินค้าเชื่อมโยงอยู่ ระบบจะปลดกลุ่มของสินค้าทั้งหมดและเปลี่ยนสถานะเป็น <span className="underline">"ไม่มีหมวดหมู่"</span> ทันที โดยสินค้าเหล่านั้นจะไม่สูญหายหรือถูกลบออกไป
            </li>
            <li>
              <strong className="text-indigo-700 font-bold">บันทึกลงฐานข้อมูลแบบทันที:</strong> คำสั่งลบจะถูกซิงค์ตรงเข้า Cloud Firestore ทันทีเมื่อผู้ใช้ยืนยันการลบ
            </li>
          </ul>
        </div>
      </div>

      {/* Column 2 & 3: Category Grid */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-sans">หมวดหมู่และคลังกลุ่มทั้งหมด</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">แบ่งกลุ่มสินค้าและเช็คสต็อกสรุปรายประเภท</p>
          </div>
          <span className="text-xs text-slate-400 font-sans bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
            มีทั้งหมด {categories.length} กลุ่มสินค้า
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const productCount = getProductCount(cat.id);
            const totalStock = getStockCount(cat.id);
            
            return (
              <div
                key={cat.id}
                className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${cat.color}`}>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(cat)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="แก้ไขประเภท"
                        id={`btn-edit-category-${cat.id}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(cat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title={productCount > 0 ? `ลบกลุ่มสินค้า (มีสินค้าผูกอยู่ ${productCount} รายการ)` : 'ลบกลุ่มสินค้า'}
                        id={`btn-delete-category-${cat.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-500 font-sans mt-3 italic line-clamp-2">
                    {cat.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับกลุ่มสินค้านี้'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 font-sans block">มีสินค้าเชื่อมโยง</span>
                    <span className="font-bold text-slate-800 text-sm">{productCount} รายการ</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-400 font-sans block">จำนวนสินค้าในคลัง</span>
                    <span className="font-bold text-indigo-700 text-sm">{totalStock} ชิ้น</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDeleteId && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 border border-rose-100 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>

              <h3 className="text-base font-extrabold text-slate-800 font-sans">
                ยืนยันการลบกลุ่มสินค้า?
              </h3>
              
              <div className="mt-2.5 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 font-mono">
                "{categoryToDelete.name}"
              </div>

              {deleteProductCount > 0 ? (
                <div className="mt-4 p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-left">
                  <div className="text-xs font-bold text-amber-800 font-sans flex items-center gap-1.5 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    มีสินค้าที่ยังผูกอยู่กับกลุ่มนี้!
                  </div>
                  <p className="text-[11px] text-amber-700/95 font-sans leading-relaxed">
                    ตรวจพบสินค้าในสต็อกจำนวน <strong className="font-black text-amber-900">{deleteProductCount} รายการ</strong> ที่เชื่อมโยงกับหมวดหมู่นี้อยู่
                    หากกดยืนยัน ระบบจะลบกลุ่มสินค้าและสลับสินค้าเหล่านั้นไปที่สถานะ <strong className="font-extrabold text-slate-900 underline">"ไม่มีกลุ่มสินค้า"</strong> โดยอัตโนมัติ (สินค้าจะไม่ถูกลบออกจากคลัง)
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-sans mt-3 px-2 leading-relaxed">
                  คุณกำลังจะลบกลุ่มสินค้าออกจากระบบอย่างถาวร ยืนยันที่จะดำเนินการหรือไม่?
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer text-center"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setConfirmDeleteId(null);
                }}
                className="py-2.5 px-4 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer text-center"
              >
                ยืนยันการลบจริง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
