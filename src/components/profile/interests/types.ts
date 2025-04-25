
export interface ContentNameType {
  id: string;
  name: string;
  type: string;
  created_at?: string;
}

export interface InterestItemProps {
  interest: string;
  onRemove: (interest: string) => void;
}

export interface InterestsListProps {
  interests: string[];
  onRemove: (interest: string) => void;
}

export interface ContentSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInterests: string[];
  onToggleContent: (contentName: string) => void;
  onSave: () => void;
  contentNames: ContentNameType[];
  onAddNew: () => void;
}

export interface AddContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contentName: string) => void;
}
