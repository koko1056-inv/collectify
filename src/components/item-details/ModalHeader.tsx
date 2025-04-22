
import React, { ReactNode } from "react";

interface ModalHeaderProps {
  onClose: (() => void) | ReactNode;
  children?: ReactNode;  // childrenプロパティを追加
}

export function ModalHeader({ onClose, children }: ModalHeaderProps) {
  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-100">
      <div className="flex-1"></div>
      <div className="flex-1 flex justify-center">
        <h3 className="font-semibold text-sm">アイテム詳細</h3>
      </div>
      <div className="flex-1 flex justify-end">
        {typeof onClose === 'function' ? (
          <button onClick={onClose} className="text-gray-400">
            &times;
          </button>
        ) : (
          onClose
        )}
      </div>
      {children}
    </div>
  );
}
