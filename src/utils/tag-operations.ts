
// This file is kept for backward compatibility.
// It re-exports all functions from the new modular structure.
export * from './tag/index';

// Export the ItemTag interface directly to prevent circular references
// This is needed to fix the type instantiation error
export interface ItemTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    category?: string;
    created_at?: string;
  } | null;
}
