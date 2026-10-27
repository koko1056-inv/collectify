
import React, { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ModalHeaderProps {
  onClose: (() => void) | ReactNode;
  children?: ReactNode;  // childrenプロパティを追加
  /** 左端に置くもの（カタログのグッズの「…」メニューなど） */
  start?: ReactNode;
}

export function ModalHeader({ onClose, children, start }: ModalHeaderProps) {
  const { t } = useLanguage();
  return (
    <div className="flex justify-between items-center p-2 border-b border-border">
      <div className="flex-1 flex justify-start">{start}</div>
      <div className="flex-1 flex justify-center">
        <h3 className="font-bold text-sm">{t("itemDetails.header.title")}</h3>
      </div>
      <div className="flex-1 flex justify-end">
        {typeof onClose === 'function' ? (
          <button onClick={onClose} className="text-muted-foreground">
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
