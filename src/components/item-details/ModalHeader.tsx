
import React, { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ModalHeaderProps {
  onClose: (() => void) | ReactNode;
  children?: ReactNode;  // childrenプロパティを追加
}

export function ModalHeader({ onClose, children }: ModalHeaderProps) {
  const { t } = useLanguage();
  return (
    <div className="flex justify-between items-center p-2 border-b border-border">
      <div className="flex-1"></div>
      <div className="flex-1 flex justify-center">
        <h3 className="font-semibold text-sm">{t("itemDetails.header.title")}</h3>
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
