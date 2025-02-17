export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      collection_likes: {
        Row: {
          collection_owner_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          collection_owner_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          collection_owner_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_names: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      content_reactions: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          reaction_type: string
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          reaction_type: string
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "recommended_content"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          group_id: string | null
          id: string
          image_url: string | null
          location: string | null
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          start_date: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          file_path: string
          id: string
          is_selected: boolean | null
          source_url: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          is_selected?: boolean | null
          source_url?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          is_selected?: boolean | null
          source_url?: string | null
          url?: string
        }
        Relationships: []
      }
      item_memories: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          image_url: string | null
          user_item_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          user_item_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          user_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_memories_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submissions: {
        Row: {
          content_name: string | null
          created_at: string
          description: string | null
          id: string
          image: string
          price: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          submitted_by: string
          title: string
        }
        Insert: {
          content_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image: string
          price: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          submitted_by: string
          title: string
        }
        Update: {
          content_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string
          price?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          submitted_by?: string
          title?: string
        }
        Relationships: []
      }
      item_tags: {
        Row: {
          created_at: string
          id: string
          official_item_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          official_item_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          official_item_id?: string
          tag_id?: string
        }
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
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          related_item_id: string | null
          sender_id: string
          trade_request_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          related_item_id?: string | null
          sender_id: string
          trade_request_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          related_item_id?: string | null
          sender_id?: string
          trade_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey_profiles"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_item_id_fkey"
            columns: ["related_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey_profiles"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_trade_request_id_fkey"
            columns: ["trade_request_id"]
            isOneToOne: false
            referencedRelation: "trade_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      official_items: {
        Row: {
          anime: string | null
          artist: string | null
          content: string | null
          content_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image: string
          item_type: string
          price: string
          quantity: number
          release_date: string
          title: string
        }
        Insert: {
          anime?: string | null
          artist?: string | null
          content?: string | null
          content_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image: string
          item_type?: string
          price: string
          quantity?: number
          release_date: string
          title: string
        }
        Update: {
          anime?: string | null
          artist?: string | null
          content?: string | null
          content_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image?: string
          item_type?: string
          price?: string
          quantity?: number
          release_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_items_content_name_fkey"
            columns: ["content_name"]
            isOneToOne: false
            referencedRelation: "content_names"
            referencedColumns: ["name"]
          },
        ]
      }
      original_item_tags: {
        Row: {
          created_at: string
          id: string
          original_item_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_item_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "original_item_tags_original_item_id_fkey"
            columns: ["original_item_id"]
            isOneToOne: false
            referencedRelation: "original_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "original_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      original_items: {
        Row: {
          anime: string | null
          artist: string | null
          content_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image: string
          price: string
          quantity: number
          release_date: string
          title: string
        }
        Insert: {
          anime?: string | null
          artist?: string | null
          content_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image: string
          price: string
          quantity?: number
          release_date: string
          title: string
        }
        Update: {
          anime?: string | null
          artist?: string | null
          content_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image?: string
          price?: string
          quantity?: number
          release_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "original_items_content_name_fkey"
            columns: ["content_name"]
            isOneToOne: false
            referencedRelation: "content_names"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "original_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          favorite_contents: string[] | null
          favorite_item_ids: string[] | null
          favorite_tags: string[] | null
          followers_count: number | null
          following_count: number | null
          id: string
          interests: string[] | null
          is_admin: boolean | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_contents?: string[] | null
          favorite_item_ids?: string[] | null
          favorite_tags?: string[] | null
          followers_count?: number | null
          following_count?: number | null
          id: string
          interests?: string[] | null
          is_admin?: boolean | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_contents?: string[] | null
          favorite_item_ids?: string[] | null
          favorite_tags?: string[] | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          interests?: string[] | null
          is_admin?: boolean | null
          username?: string
        }
        Relationships: []
      }
      recommended_content: {
        Row: {
          category: string
          channel_title: string | null
          content_url: string
          created_at: string
          id: string
          image_url: string
          is_trending: boolean | null
          published_at: string | null
          source_type: string
          source_url: string | null
          summary: string
          theme: string | null
          title: string
          updated_at: string | null
          video_id: string | null
        }
        Insert: {
          category: string
          channel_title?: string | null
          content_url: string
          created_at?: string
          id?: string
          image_url: string
          is_trending?: boolean | null
          published_at?: string | null
          source_type?: string
          source_url?: string | null
          summary: string
          theme?: string | null
          title: string
          updated_at?: string | null
          video_id?: string | null
        }
        Update: {
          category?: string
          channel_title?: string | null
          content_url?: string
          created_at?: string
          id?: string
          image_url?: string
          is_trending?: boolean | null
          published_at?: string | null
          source_type?: string
          source_url?: string | null
          summary?: string
          theme?: string | null
          title?: string
          updated_at?: string | null
          video_id?: string | null
        }
        Relationships: []
      }
      scraped_images: {
        Row: {
          created_at: string
          id: string
          source_url: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_url: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          source_url?: string
          url?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          is_category: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_category?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_category?: boolean | null
          name?: string
        }
        Relationships: []
      }
      trade_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          offered_item_id: string
          receiver_id: string
          requested_item_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          offered_item_id: string
          receiver_id: string
          requested_item_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          offered_item_id?: string
          receiver_id?: string
          requested_item_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_requests_offered_item_id_fkey"
            columns: ["offered_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_requests_requested_item_id_fkey"
            columns: ["requested_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_item_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          user_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          user_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          user_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_item_likes_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_item_likes_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_item_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          user_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          user_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          user_item_id?: string
        }
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
          },
        ]
      }
      user_items: {
        Row: {
          anime: string | null
          artist: string | null
          created_at: string
          id: string
          image: string
          images: string[] | null
          official_item_id: string | null
          official_link: string | null
          original_item_id: string | null
          prize: string
          purchase_date: string | null
          purchase_price: string | null
          quantity: number
          release_date: string
          title: string
          user_id: string
        }
        Insert: {
          anime?: string | null
          artist?: string | null
          created_at?: string
          id?: string
          image: string
          images?: string[] | null
          official_item_id?: string | null
          official_link?: string | null
          original_item_id?: string | null
          prize: string
          purchase_date?: string | null
          purchase_price?: string | null
          quantity?: number
          release_date: string
          title: string
          user_id: string
        }
        Update: {
          anime?: string | null
          artist?: string | null
          created_at?: string
          id?: string
          image?: string
          images?: string[] | null
          official_item_id?: string | null
          official_link?: string | null
          original_item_id?: string | null
          prize?: string
          purchase_date?: string | null
          purchase_price?: string | null
          quantity?: number
          release_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_original_item_id_fkey"
            columns: ["original_item_id"]
            isOneToOne: false
            referencedRelation: "original_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          note: string | null
          official_item_id: string | null
          original_item_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          official_item_id?: string | null
          original_item_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          official_item_id?: string | null
          original_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_original_item_id_fkey"
            columns: ["original_item_id"]
            isOneToOne: false
            referencedRelation: "original_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
