
import { Tag } from "@/types/tag";

// Helper function to create a tag object from a string or existing tag
export function createTag(input: string | Tag): Tag {
  if (typeof input === 'string') {
    return {
      id: '', // Will be assigned by the database
      name: input.trim(),
      count: 0
    };
  }
  return input;
}

// Check if two tags are the same (by id if available, otherwise by name)
export function tagsAreEqual(a: Tag, b: Tag): boolean {
  if (a.id && b.id) {
    return a.id === b.id;
  }
  return a.name.toLowerCase() === b.name.toLowerCase();
}

// Filter out duplicate tags from an array
export function filterDuplicateTags(tags: Tag[]): Tag[] {
  return tags.reduce((acc: Tag[], current: Tag) => {
    const isDuplicate = acc.some(tag => tagsAreEqual(tag, current));
    if (!isDuplicate) {
      acc.push(current);
    }
    return acc;
  }, []);
}

// Generate a clean array of tags from various input types
export function processTagInput(input: (string | Tag)[]): Tag[] {
  // Convert all inputs to Tag objects
  const tags = input.map(item => createTag(item));
  // Filter out duplicates
  return filterDuplicateTags(tags);
}
