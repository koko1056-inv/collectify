export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          action_type: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          required_action_count: number | null
          required_points: number | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          required_action_count?: number | null
          required_points?: number | null
        }
        Update: {
          action_type?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          required_action_count?: number | null
          required_points?: number | null
        }
        Relationships: []
      }
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
      avatar_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_current: boolean | null
          item_ids: string[] | null
          prompt: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_current?: boolean | null
          item_ids?: string[] | null
          prompt?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_current?: boolean | null
          item_ids?: string[] | null
          prompt?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatar_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      background_presets: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_public: boolean
          name: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url: string
          is_public?: boolean
          name: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_public?: boolean
          name?: string
          user_id?: string
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
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
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
      display_gallery: {
        Row: {
          background_preset_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_public: boolean | null
          item_ids: string[] | null
          title: string | null
          user_id: string
        }
        Insert: {
          background_preset_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_public?: boolean | null
          item_ids?: string[] | null
          title?: string | null
          user_id: string
        }
        Update: {
          background_preset_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_public?: boolean | null
          item_ids?: string[] | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_gallery_background_preset_id_fkey"
            columns: ["background_preset_id"]
            isOneToOne: false
            referencedRelation: "background_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      goods_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          updated_at: string
          user_id: string
          user_item_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          updated_at?: string
          user_id: string
          user_item_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          updated_at?: string
          user_id?: string
          user_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_posts_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
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
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      official_items: {
        Row: {
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
      point_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          official_item_id: string | null
          poll_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          official_item_id?: string | null
          poll_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          official_item_id?: string | null
          poll_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          poll_option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          poll_option_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          poll_option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_option_id_fkey"
            columns: ["poll_option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "goods_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_items: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "goods_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_items_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "goods_posts"
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
          privacy_level: Database["public"]["Enums"]["profile_privacy"]
          themes: string[] | null
          username: string
          x_username: string | null
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
          privacy_level?: Database["public"]["Enums"]["profile_privacy"]
          themes?: string[] | null
          username: string
          x_username?: string | null
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
          privacy_level?: Database["public"]["Enums"]["profile_privacy"]
          themes?: string[] | null
          username?: string
          x_username?: string | null
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
          category: string | null
          content_id: string | null
          created_at: string
          id: string
          is_category: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          is_category?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          is_category?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_names"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_requests: {
        Row: {
          created_at: string
          id: string
          is_open: boolean | null
          message: string | null
          offered_item_id: string
          receiver_id: string
          requested_item_id: string
          sender_id: string
          shipping_status: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_open?: boolean | null
          message?: string | null
          offered_item_id: string
          receiver_id: string
          requested_item_id: string
          sender_id: string
          shipping_status?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_open?: boolean | null
          message?: string | null
          offered_item_id?: string
          receiver_id?: string
          requested_item_id?: string
          sender_id?: string
          shipping_status?: string | null
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
      user_achievements: {
        Row: {
          achieved_at: string
          achievement_id: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achievement_id: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          achievement_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_achievements_achievement_id"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
          content_name: string | null
          created_at: string
          id: string
          image: string
          images: string[] | null
          note: string | null
          official_item_id: string | null
          official_link: string | null
          original_item_id: string | null
          prize: string
          purchase_date: string | null
          purchase_price: string | null
          quantity: number
          release_date: string
          theme: string | null
          title: string
          user_id: string
        }
        Insert: {
          content_name?: string | null
          created_at?: string
          id?: string
          image: string
          images?: string[] | null
          note?: string | null
          official_item_id?: string | null
          official_link?: string | null
          original_item_id?: string | null
          prize: string
          purchase_date?: string | null
          purchase_price?: string | null
          quantity?: number
          release_date: string
          theme?: string | null
          title: string
          user_id: string
        }
        Update: {
          content_name?: string | null
          created_at?: string
          id?: string
          image?: string
          images?: string[] | null
          note?: string | null
          official_item_id?: string | null
          official_link?: string | null
          original_item_id?: string | null
          prize?: string
          purchase_date?: string | null
          purchase_price?: string | null
          quantity?: number
          release_date?: string
          theme?: string | null
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
      user_points: {
        Row: {
          created_at: string
          id: string
          last_login_bonus_date: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login_bonus_date?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login_bonus_date?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_follower: { Args: { target_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      approval_status: "pending" | "approved" | "rejected"
      profile_privacy: "public" | "followers" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      approval_status: ["pending", "approved", "rejected"],
      profile_privacy: ["public", "followers", "private"],
    },
  },
} as const
