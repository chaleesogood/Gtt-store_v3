import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({
    title: 'ยืนยันการดำเนินการ',
    message: '',
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
    isDangerous: true,
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
      setConfig({
        title: opts.title || (opts.isDangerous !== false ? 'ยืนยันการลบข้อมูล' : 'ยืนยันการดำเนินการ'),
        message: opts.message,
        confirmText: opts.confirmText || (opts.isDangerous !== false ? 'ลบข้อมูล' : 'ยืนยัน'),
        cancelText: opts.cancelText || 'ยกเลิก',
        isDangerous: opts.isDangerous ?? true,
      });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef(result);
      setResolveRef(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${config.isDangerous !== false ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                {config.isDangerous !== false ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">{config.title}</h3>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-2 whitespace-pre-line leading-relaxed font-sans font-medium">
                  {config.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
              >
                {config.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-md cursor-pointer ${
                  config.isDangerous !== false
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
