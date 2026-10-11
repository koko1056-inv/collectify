import { useEffect, useState } from "react";

/**
 * シート・ダイアログ（Radix / vaul）が開いているか。
 * 開いているものは role="dialog"（または alertdialog）と data-state="open" を持つ。
 * スポットライトガイド自身も role="dialog" だが data-state を持たないので数えない。
 */
const OPEN_MODAL = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

export function isModalOpen(): boolean {
  return typeof document !== "undefined" && document.querySelector(OPEN_MODAL) !== null;
}

export function useModalOpen(): boolean {
  const [open, setOpen] = useState(isModalOpen);
  useEffect(() => {
    const sync = () => setOpen(isModalOpen());
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
    sync();
    return () => mo.disconnect();
  }, []);
  return open;
}
