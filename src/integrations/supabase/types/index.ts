import { Json } from './json';
import { CollectionLike, UserItem, UserItemLike, UserItemTag } from './collection';
import { OfficialItem, ItemTag, ItemMemory } from './items';
import { Message } from './messages';
import { Profile } from './profiles';
import { Image, ScrapedImage } from './images';
import { Tag } from './tags';
import { Wishlist } from './wishlists';

export type Database = {
  public: {
    Tables: {
      collection_likes: {
        Row: CollectionLike;
        Insert: Omit<CollectionLike, 'id' | 'created_at'>;
        Update: Partial<CollectionLike>;
        Relationships: [];
      };
      images: {
        Row: Image;
        Insert: Omit<Image, 'id' | 'created_at'>;
        Update: Partial<Image>;
        Relationships: [];
      };
      item_memories: {
        Row: ItemMemory;
        Insert: Omit<ItemMemory, 'id' | 'created_at'>;
        Update: Partial<ItemMemory>;
        Relationships: [
          {
            foreignKeyName: "item_memories_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          }
        ];
      };
      item_tags: {
        Row: ItemTag;
        Insert: Omit<ItemTag, 'id' | 'created_at'>;
        Update: Partial<ItemTag>;
        Relationships: [
          {
            foreignKeyName: "item_tags_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Message>;
        Relationships: [
          {
            foreignKeyName: "messages_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          }
        ];
      };
      official_items: {
        Row: OfficialItem;
        Insert: Omit<OfficialItem, 'id' | 'created_at'>;
        Update: Partial<OfficialItem>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      scraped_images: {
        Row: ScrapedImage;
        Insert: Omit<ScrapedImage, 'id' | 'created_at'>;
        Update: Partial<ScrapedImage>;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id' | 'created_at'>;
        Update: Partial<Tag>;
        Relationships: [];
      };
      user_item_likes: {
        Row: UserItemLike;
        Insert: Omit<UserItemLike, 'id' | 'created_at'>;
        Update: Partial<UserItemLike>;
        Relationships: [
          {
            foreignKeyName: "user_item_likes_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          }
        ];
      };
      user_item_tags: {
        Row: UserItemTag;
        Insert: Omit<UserItemTag, 'id' | 'created_at'>;
        Update: Partial<UserItemTag>;
        Relationships: [
          {
            foreignKeyName: "user_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_item_tags_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          }
        ];
      };
      user_items: {
        Row: UserItem;
        Insert: Omit<UserItem, 'id' | 'created_at'>;
        Update: Partial<UserItem>;
        Relationships: [
          {
            foreignKeyName: "user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ];
      };
      wishlists: {
        Row: Wishlist;
        Insert: Omit<Wishlist, 'id' | 'created_at'>;
        Update: Partial<Wishlist>;
        Relationships: [
          {
            foreignKeyName: "wishlists_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type * from './auth';
export type * from './collection';
export type * from './items';
export type * from './messages';
export type * from './profiles';
export type * from './images';
export type * from './tags';
export type * from './wishlists';