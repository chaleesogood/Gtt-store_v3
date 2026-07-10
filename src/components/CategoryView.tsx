import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Plus, Trash2, Edit3, X, Layers, AlertCircle } from 'lucide-react';

interface CategoryViewProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (id: string, updated: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
  { name: 'น้ำเงิน', value: 'bg-blue-100 text-blue-800 border-blue-150' },
  { name: 'ม่วง', value: 'bg-purple-100 text-purple-800 border-purple-150' },
  { name: 'ส้มทอง', value: 'bg-amber-100 text-amber-800 border-amber-150' },
  { name: 'เขียว', value: 'bg-emerald-100 text-emerald-800 border-emerald-150' },
  { name: 'แดงชมพู', value: 'bg-rose-100 text-rose-800 border-rose-150' },
  { name: 'ฟ้าคราม', value: 'bg-cyan-100 text-cyan-800 border-cyan-150' },
  { name: 'เทาสุขุม', value: 'bg-slate-100 text-slate-800 border-slate-150' },
  { name: 'แดงสด', value: 'bg-red-100 text-red-800 border-red-150' },
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
    setDescription(cat.description || '');
    setColor(cat.color);
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0].value);
  };

  return (
    <div className="space-y-2 text-left">
      
      {/* Compact Horizontal Form (Flat & Borderless) */}
      <form onSubmit={handleFormSubmit} className="bg-slate-50 p-1.5 rounded-lg flex flex-col md:flex-row items-center gap-2">
        <div className="flex items-center gap-1 flex-shrink-0">
          <Layers className="h-3.5 w-3.5 text-indigo-600" />
          <span className="text-[10px] font-black text-slate-700 font-sans whitespace-nowrap">
            {isEditing ? 'แก้ไขหมวด:' : 'เพิ่มหมวดใหม่:'}
          </span>
        </div>

        {/* Name input */}
        <div className="flex-1 min-w-[120px] w-full">
          <input
            type="text"
            required
            placeholder="ชื่อกลุ่มสินค้า (เช่น อุปกรณ์ไฟฟ้า, อะไหล่...)"
            className="w-full px-2 py-0.5 bg-white border border-slate-250 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
            value={name}
            onChange={(e) => setName(e.target.value)}
            id="input-category-name"
          />
        </div>

        {/* Description input */}
        <div className="flex-1 min-w-[150px] w-full">
          <input
            type="text"
            placeholder="รายละเอียดเพิ่มเติม (ระบุคำอธิบายย่อๆ)..."
            className="w-full px-2 py-0.5 bg-white border border-slate-250 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans transition-all"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            id="input-category-desc"
          />
        </div>

        {/* Color presets inline */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] font-bold text-slate-400 font-sans">ธีมสี:</span>
          <div className="flex gap-0.5 overflow-x-auto">
            {PRESET_COLORS.map((col, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setColor(col.value)}
                className={`px-1 py-0.2 text-[8.5px] font-bold rounded border transition-all cursor-pointer ${
                  color === col.value
                    ? 'ring-1 ring-indigo-500 border-indigo-400 font-black'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
                id={`btn-preset-color-${idx}`}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 ml-auto flex-shrink-0">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            className="px-2.5 py-0.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
            id="btn-submit-category-form"
          >
            <Plus className="h-2.5 w-2.5" />
            {isEditing ? 'บันทึก' : 'เพิ่มกลุ่ม'}
          </button>
        </div>
      </form>

      {/* Categories Horizontal/Dense Table */}
      <div className="bg-slate-50/20 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/20 border-b border-slate-100/60 text-[9px] font-bold text-slate-400 font-sans uppercase tracking-wider">
              <th className="py-1 px-2 min-w-[120px]">หมวดหมู่สินค้า</th>
              <th className="py-1 px-2">คำอธิบาย</th>
              <th className="py-1 px-2 text-center w-[120px]">มีพัสดุผูกอยู่</th>
              <th className="py-1 px-2 text-center w-[120px]">สต็อกรวมในกลุ่ม</th>
              <th className="py-1 px-2 text-right w-[100px]">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {[...categories]
              .sort((a, b) => a.name.localeCompare(b.name, 'th', { numeric: true, sensitivity: 'base' }))
              .map((cat) => {
                const productCount = getProductCount(cat.id);
                const totalStock = getStockCount(cat.id);
                
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/40 transition-colors group">
                    {/* Badge */}
                    <td className="py-0.5 px-2">
                      <span className={`inline-block px-1.5 py-0.2 text-[9px] font-black rounded border ${cat.color} leading-none`}>
                        {cat.name}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-0.5 px-2 text-slate-500 font-sans text-[10px] italic leading-none line-clamp-1">
                      {cat.description || 'ไม่มีคำอธิบาย'}
                    </td>

                    {/* Connected Count */}
                    <td className="py-0.5 px-2 text-center font-bold text-slate-600 leading-none">
                      {productCount} รายการ
                    </td>

                    {/* Stock Sum */}
                    <td className="py-0.5 px-2 text-center font-bold text-indigo-600 leading-none">
                      {totalStock} ชิ้น
                    </td>

                    {/* Action buttons */}
                    <td className="py-0.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(cat)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                          title="แก้ไขประเภท"
                          id={`btn-edit-category-${cat.id}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(cat.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="ลบประเภทสินค้า"
                          id={`btn-delete-category-${cat.id}`}
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
