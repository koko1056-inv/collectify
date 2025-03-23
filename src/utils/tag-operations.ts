
// This file is kept for backward compatibility.
// It re-exports all functions from the new modular structure.
export * from './tag/index';

// Define a simplified ItemTag interface to avoid circular references
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
