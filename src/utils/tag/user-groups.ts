
// このファイルは下位互換性のために保持され、新しいモジュラー構造から関数をエクスポートします
export {
  getUserGroups,
  createGroup
} from './group-core';

export {
  updateGroupColor
} from './group-updates';

export {
  addItemToGroup,
  removeItemFromGroup,
  getGroupItems,
  isItemInGroup,
  getGroupItemCount
} from './group-items';
