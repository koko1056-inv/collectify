import { toast } from "sonner";

export function useBinderEditorHandlers(
  pageId: string,
  selectedItems: any[],
  allItems: any[],
  updateItem: any,
  deleteItem: any,
  updateDecoration: any,
  deleteDecoration: any,
  addItem: any,
  addDecoration: any,
  setSelectedItemIds: (ids: string[]) => void,
  clipboard: any,
  setClipboard: (data: any) => void
) {
  const handleDelete = () => {
    selectedItems.forEach(item => {
      if (item.type === 'item') {
        deleteItem.mutate({ id: item.id, pageId });
      } else {
        deleteDecoration.mutate({ id: item.id, pageId });
      }
    });
    setSelectedItemIds([]);
  };

  const handleCopy = () => {
    const items = selectedItems.filter(i => i.type === 'item');
    const decorations = selectedItems.filter(i => i.type === 'decoration');
    setClipboard({ items, decorations });
    toast.success('コピーしました');
  };

  const handlePaste = () => {
    if (!clipboard) return;
    
    clipboard.items.forEach((item: any) => {
      addItem.mutate({
        binder_page_id: pageId,
        user_item_id: item.user_item_id,
        official_item_id: item.official_item_id,
        custom_image_url: item.custom_image_url,
        position_x: item.position_x + 20,
        position_y: item.position_y + 20,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        z_index: item.z_index
      });
    });

    clipboard.decorations.forEach((dec: any) => {
      addDecoration.mutate({
        binder_page_id: pageId,
        decoration_type: dec.decoration_type,
        content: dec.content,
        position_x: dec.position_x + 20,
        position_y: dec.position_y + 20,
        width: dec.width,
        height: dec.height,
        rotation: dec.rotation,
        z_index: dec.z_index,
        style_config: dec.style_config
      });
    });

    toast.success('ペーストしました');
  };

  const handleDuplicate = () => {
    handleCopy();
    handlePaste();
  };

  const handleMove = (dx: number, dy: number) => {
    selectedItems.forEach(item => {
      if (item.type === 'item') {
        updateItem.mutate({
          id: item.id,
          updates: {
            position_x: item.position_x + dx,
            position_y: item.position_y + dy
          }
        });
      } else {
        updateDecoration.mutate({
          id: item.id,
          updates: {
            position_x: item.position_x + dx,
            position_y: item.position_y + dy
          }
        });
      }
    });
  };

  const handleBringToFront = () => {
    const maxZ = Math.max(...allItems.map(i => i.z_index), 0);
    selectedItems.forEach(item => {
      if (item.type === 'item') {
        updateItem.mutate({ id: item.id, updates: { z_index: maxZ + 1 } });
      } else {
        updateDecoration.mutate({ id: item.id, updates: { z_index: maxZ + 1 } });
      }
    });
  };

  const handleSendToBack = () => {
    const minZ = Math.min(...allItems.map(i => i.z_index), 0);
    selectedItems.forEach(item => {
      if (item.type === 'item') {
        updateItem.mutate({ id: item.id, updates: { z_index: minZ - 1 } });
      } else {
        updateDecoration.mutate({ id: item.id, updates: { z_index: minZ - 1 } });
      }
    });
  };

  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedItems.length === 0) return;

    const bounds = {
      left: Math.min(...selectedItems.map(i => i.position_x)),
      right: Math.max(...selectedItems.map(i => i.position_x + (i.width || 100))),
      top: Math.min(...selectedItems.map(i => i.position_y)),
      bottom: Math.max(...selectedItems.map(i => i.position_y + (i.height || 100)))
    };

    selectedItems.forEach(item => {
      let newX = item.position_x;
      let newY = item.position_y;

      switch (type) {
        case 'left':
          newX = bounds.left;
          break;
        case 'center':
          newX = (bounds.left + bounds.right) / 2 - (item.width || 100) / 2;
          break;
        case 'right':
          newX = bounds.right - (item.width || 100);
          break;
        case 'top':
          newY = bounds.top;
          break;
        case 'middle':
          newY = (bounds.top + bounds.bottom) / 2 - (item.height || 100) / 2;
          break;
        case 'bottom':
          newY = bounds.bottom - (item.height || 100);
          break;
      }

      if (item.type === 'item') {
        updateItem.mutate({ id: item.id, updates: { position_x: newX, position_y: newY } });
      } else {
        updateDecoration.mutate({ id: item.id, updates: { position_x: newX, position_y: newY } });
      }
    });
  };

  return {
    handleDelete,
    handleCopy,
    handlePaste,
    handleDuplicate,
    handleMove,
    handleBringToFront,
    handleSendToBack,
    handleAlign
  };
}
