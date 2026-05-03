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
      ai_generated_rooms: {
        Row: {
          created_at: string
          custom_prompt: string | null
          id: string
          image_url: string
          is_public: boolean
          like_count: number
          parent_room_id: string | null
          source_item_ids: string[] | null
          source_item_images: string[] | null
          style_preset: string | null
          style_prompt: string | null
          title: string | null
          user_id: string
          visual_style: string | null
        }
        Insert: {
          created_at?: string
          custom_prompt?: string | null
          id?: string
          image_url: string
          is_public?: boolean
          like_count?: number
          parent_room_id?: string | null
          source_item_ids?: string[] | null
          source_item_images?: string[] | null
          style_preset?: string | null
          style_prompt?: string | null
          title?: string | null
          user_id: string
          visual_style?: string | null
        }
        Update: {
          created_at?: string
          custom_prompt?: string | null
          id?: string
          image_url?: string
          is_public?: boolean
          like_count?: number
          parent_room_id?: string | null
          source_item_ids?: string[] | null
          source_item_images?: string[] | null
          style_preset?: string | null
          style_prompt?: string | null
          title?: string | null
          user_id?: string
          visual_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_rooms_parent_room_id_fkey"
            columns: ["parent_room_id"]
            isOneToOne: false
            referencedRelation: "ai_generated_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_work_bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          work_id: string
          work_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          work_id: string
          work_type: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          work_id?: string
          work_type?: string
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
          name: string | null
          prompt: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_current?: boolean | null
          item_ids?: string[] | null
          name?: string | null
          prompt?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_current?: boolean | null
          item_ids?: string[] | null
          name?: string | null
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
      binder_decorations: {
        Row: {
          binder_page_id: string
          content: string | null
          created_at: string
          decoration_type: string
          height: number | null
          id: string
          position_x: number
          position_y: number
          rotation: number
          style_config: Json | null
          width: number | null
          z_index: number
        }
        Insert: {
          binder_page_id: string
          content?: string | null
          created_at?: string
          decoration_type: string
          height?: number | null
          id?: string
          position_x?: number
          position_y?: number
          rotation?: number
          style_config?: Json | null
          width?: number | null
          z_index?: number
        }
        Update: {
          binder_page_id?: string
          content?: string | null
          created_at?: string
          decoration_type?: string
          height?: number | null
          id?: string
          position_x?: number
          position_y?: number
          rotation?: number
          style_config?: Json | null
          width?: number | null
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "binder_decorations_binder_page_id_fkey"
            columns: ["binder_page_id"]
            isOneToOne: false
            referencedRelation: "binder_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      binder_items: {
        Row: {
          binder_page_id: string
          created_at: string
          custom_image_url: string | null
          display_converted_at: string | null
          display_style: string | null
          height: number
          id: string
          item_rotation: number | null
          model_3d_task_id: string | null
          model_3d_url: string | null
          official_item_id: string | null
          placement: string | null
          position_x: number
          position_y: number
          rotation: number
          user_item_id: string | null
          width: number
          z_index: number
        }
        Insert: {
          binder_page_id: string
          created_at?: string
          custom_image_url?: string | null
          display_converted_at?: string | null
          display_style?: string | null
          height?: number
          id?: string
          item_rotation?: number | null
          model_3d_task_id?: string | null
          model_3d_url?: string | null
          official_item_id?: string | null
          placement?: string | null
          position_x?: number
          position_y?: number
          rotation?: number
          user_item_id?: string | null
          width?: number
          z_index?: number
        }
        Update: {
          binder_page_id?: string
          created_at?: string
          custom_image_url?: string | null
          display_converted_at?: string | null
          display_style?: string | null
          height?: number
          id?: string
          item_rotation?: number | null
          model_3d_task_id?: string | null
          model_3d_url?: string | null
          official_item_id?: string | null
          placement?: string | null
          position_x?: number
          position_y?: number
          rotation?: number
          user_item_id?: string | null
          width?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "binder_items_binder_page_id_fkey"
            columns: ["binder_page_id"]
            isOneToOne: false
            referencedRelation: "binder_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binder_items_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binder_items_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      binder_pages: {
        Row: {
          background_color: string | null
          background_image: string | null
          bgm_preset: string | null
          bgm_url: string | null
          bgm_volume: number | null
          binder_id: string | null
          binder_type: string
          created_at: string
          id: string
          is_main_room: boolean | null
          is_public: boolean | null
          layout_config: Json | null
          page_order: number
          scene_avatar_url: string | null
          title: string
          updated_at: string
          user_id: string
          visit_count: number | null
        }
        Insert: {
          background_color?: string | null
          background_image?: string | null
          bgm_preset?: string | null
          bgm_url?: string | null
          bgm_volume?: number | null
          binder_id?: string | null
          binder_type?: string
          created_at?: string
          id?: string
          is_main_room?: boolean | null
          is_public?: boolean | null
          layout_config?: Json | null
          page_order?: number
          scene_avatar_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
          visit_count?: number | null
        }
        Update: {
          background_color?: string | null
          background_image?: string | null
          bgm_preset?: string | null
          bgm_url?: string | null
          bgm_volume?: number | null
          binder_id?: string | null
          binder_type?: string
          created_at?: string
          id?: string
          is_main_room?: boolean | null
          is_public?: boolean | null
          layout_config?: Json | null
          page_order?: number
          scene_avatar_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "binder_pages_binder_id_fkey"
            columns: ["binder_id"]
            isOneToOne: false
            referencedRelation: "binders"
            referencedColumns: ["id"]
          },
        ]
      }
      binders: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_entries: {
        Row: {
          caption: string | null
          challenge_id: string
          created_at: string
          id: string
          image_url: string
          user_id: string
          user_item_id: string | null
        }
        Insert: {
          caption?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          image_url: string
          user_id: string
          user_item_id?: string | null
        }
        Update: {
          caption?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          image_url?: string
          user_id?: string
          user_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          first_place_points: number
          id: string
          image_url: string | null
          official_item_id: string | null
          second_place_points: number
          starts_at: string
          status: string
          third_place_points: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          first_place_points?: number
          id?: string
          image_url?: string | null
          official_item_id?: string | null
          second_place_points?: number
          starts_at?: string
          status?: string
          third_place_points?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          first_place_points?: number
          id?: string
          image_url?: string | null
          official_item_id?: string | null
          second_place_points?: number
          starts_at?: string
          status?: string
          third_place_points?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          image_url: string | null
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
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
      frame_presets: {
        Row: {
          border_style: string
          category: string
          corner_radius: number | null
          created_at: string
          created_by: string | null
          id: string
          is_public: boolean
          name: string
          padding: number | null
          shadow_style: string | null
        }
        Insert: {
          border_style: string
          category: string
          corner_radius?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean
          name: string
          padding?: number | null
          shadow_style?: string | null
        }
        Update: {
          border_style?: string
          category?: string
          corner_radius?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean
          name?: string
          padding?: number | null
          shadow_style?: string | null
        }
        Relationships: []
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
      greeting_stamps: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          receiver_id: string
          replied_at: string | null
          sender_id: string
          stamp_type: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          receiver_id: string
          replied_at?: string | null
          sender_id: string
          stamp_type: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          receiver_id?: string
          replied_at?: string | null
          sender_id?: string
          stamp_type?: string
        }
        Relationships: []
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
      iap_transactions: {
        Row: {
          amount_jpy: number | null
          apple_transaction_id: string
          created_at: string
          id: string
          points_granted: number
          product_id: string
          raw_event: Json | null
          revenuecat_event_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_jpy?: number | null
          apple_transaction_id: string
          created_at?: string
          id?: string
          points_granted: number
          product_id: string
          raw_event?: Json | null
          revenuecat_event_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_jpy?: number | null
          apple_transaction_id?: string
          created_at?: string
          id?: string
          points_granted?: number
          product_id?: string
          raw_event?: Json | null
          revenuecat_event_id?: string | null
          status?: string
          user_id?: string
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
      invite_codes: {
        Row: {
          code: string
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          reaction: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "item_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      item_comments: {
        Row: {
          content: string
          created_at: string
          helpful_count: number
          id: string
          official_item_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          helpful_count?: number
          id?: string
          official_item_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          helpful_count?: number
          id?: string
          official_item_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_comments"
            referencedColumns: ["id"]
          },
        ]
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
      item_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "item_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_post_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          post_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          post_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "item_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      item_post_likes: {
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
            foreignKeyName: "item_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "item_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_posts: {
        Row: {
          caption: string | null
          comment_count: number
          created_at: string
          id: string
          like_count: number
          official_item_id: string | null
          updated_at: string
          user_id: string
          user_item_id: string | null
        }
        Insert: {
          caption?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          official_item_id?: string | null
          updated_at?: string
          user_id: string
          user_item_id?: string | null
        }
        Update: {
          caption?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          official_item_id?: string | null
          updated_at?: string
          user_id?: string
          user_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_posts_official_item_id_fkey"
            columns: ["official_item_id"]
            isOneToOne: false
            referencedRelation: "official_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_posts_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "item_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      item_rooms: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          member_count: number
          message_count: number
          official_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_active_at?: string
          member_count?: number
          message_count?: number
          official_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          member_count?: number
          message_count?: number
          official_item_id?: string
        }
        Relationships: []
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
      match_actions: {
        Row: {
          action: string
          candidate_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          candidate_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          candidate_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      match_scores: {
        Row: {
          candidate_id: string
          computed_at: string
          score: number
          shared_interests: number
          shared_items: number
          tradeable_items: number
          user_id: string
        }
        Insert: {
          candidate_id: string
          computed_at?: string
          score?: number
          shared_interests?: number
          shared_items?: number
          tradeable_items?: number
          user_id: string
        }
        Update: {
          candidate_id?: string
          computed_at?: string
          score?: number
          shared_interests?: number
          shared_items?: number
          tradeable_items?: number
          user_id?: string
        }
        Relationships: []
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
      onboarding_rewards: {
        Row: {
          created_at: string
          id: string
          points_awarded: number
          step_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_awarded?: number
          step_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_awarded?: number
          step_id?: string
          user_id?: string
        }
        Relationships: []
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
      point_packages: {
        Row: {
          apple_product_id: string | null
          bonus_points: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          points: number
          price: number
          revenuecat_package_id: string | null
          sort_order: number
        }
        Insert: {
          apple_product_id?: string | null
          bonus_points?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          points: number
          price: number
          revenuecat_package_id?: string | null
          sort_order?: number
        }
        Update: {
          apple_product_id?: string | null
          bonus_points?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          points?: number
          price?: number
          revenuecat_package_id?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      point_shop_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          item_type: string
          name: string
          points_cost: number
          sort_order: number
          value: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          item_type: string
          name: string
          points_cost: number
          sort_order?: number
          value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          name?: string
          points_cost?: number
          sort_order?: number
          value?: number
        }
        Relationships: []
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
          cover_image_url: string | null
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
          onboarded_at: string | null
          privacy_level: Database["public"]["Enums"]["profile_privacy"]
          referred_by: string | null
          themes: string[] | null
          username: string
          x_username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
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
          onboarded_at?: string | null
          privacy_level?: Database["public"]["Enums"]["profile_privacy"]
          referred_by?: string | null
          themes?: string[] | null
          username: string
          x_username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
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
          onboarded_at?: string | null
          privacy_level?: Database["public"]["Enums"]["profile_privacy"]
          referred_by?: string | null
          themes?: string[] | null
          username?: string
          x_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      room_furniture: {
        Row: {
          created_at: string
          furniture_id: string
          id: string
          placement: string
          position_x: number
          position_y: number
          room_id: string
          rotation_y: number
          scale: number
          updated_at: string
          z_index: number
        }
        Insert: {
          created_at?: string
          furniture_id: string
          id?: string
          placement?: string
          position_x?: number
          position_y?: number
          room_id: string
          rotation_y?: number
          scale?: number
          updated_at?: string
          z_index?: number
        }
        Update: {
          created_at?: string
          furniture_id?: string
          id?: string
          placement?: string
          position_x?: number
          position_y?: number
          room_id?: string
          rotation_y?: number
          scale?: number
          updated_at?: string
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_furniture_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "binder_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      room_likes: {
        Row: {
          created_at: string | null
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_likes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "binder_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_reactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "binder_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_visits: {
        Row: {
          id: string
          room_id: string
          visit_date: string | null
          visited_at: string | null
          visitor_id: string
        }
        Insert: {
          id?: string
          room_id: string
          visit_date?: string | null
          visited_at?: string | null
          visitor_id: string
        }
        Update: {
          id?: string
          room_id?: string
          visit_date?: string | null
          visited_at?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_visits_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "binder_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_images: {
        Row: {
          created_at: string
          id: string
          source_url: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_url: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          source_url?: string
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      sticker_presets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_public: boolean
          name: string
          svg_data: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name: string
          svg_data?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name?: string
          svg_data?: string | null
        }
        Relationships: []
      }
      tag_aliases: {
        Row: {
          alias_name: string
          canonical_tag_id: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          alias_name: string
          canonical_tag_id: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          alias_name?: string
          canonical_tag_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_aliases_canonical_tag_id_fkey"
            columns: ["canonical_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_candidates: {
        Row: {
          category: string
          content_id: string | null
          created_at: string
          id: string
          merged_to_tag_id: string | null
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_by: string
          suggestion_count: number
          updated_at: string
        }
        Insert: {
          category: string
          content_id?: string | null
          created_at?: string
          id?: string
          merged_to_tag_id?: string | null
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by: string
          suggestion_count?: number
          updated_at?: string
        }
        Update: {
          category?: string
          content_id?: string | null
          created_at?: string
          id?: string
          merged_to_tag_id?: string | null
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_by?: string
          suggestion_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_candidates_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_candidates_merged_to_tag_id_fkey"
            columns: ["merged_to_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: string | null
          content_id: string | null
          created_at: string
          display_context: string | null
          id: string
          is_category: boolean | null
          name: string
          status: string
          usage_count: number
        }
        Insert: {
          category?: string | null
          content_id?: string | null
          created_at?: string
          display_context?: string | null
          id?: string
          is_category?: boolean | null
          name: string
          status?: string
          usage_count?: number
        }
        Update: {
          category?: string | null
          content_id?: string | null
          created_at?: string
          display_context?: string | null
          id?: string
          is_category?: boolean | null
          name?: string
          status?: string
          usage_count?: number
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
      trade_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          trade_request_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          trade_request_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          trade_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_reviews_trade_request_id_fkey"
            columns: ["trade_request_id"]
            isOneToOne: false
            referencedRelation: "trade_requests"
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
          model_3d_task_id: string | null
          model_3d_url: string | null
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
          model_3d_task_id?: string | null
          model_3d_url?: string | null
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
          model_3d_task_id?: string | null
          model_3d_url?: string | null
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
      user_limits: {
        Row: {
          ai_image_last_reset: string | null
          ai_image_uses_today: number
          collection_slots: number
          created_at: string
          custom_tag_slots: number
          group_create_count: number
          id: string
          room_slots: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_image_last_reset?: string | null
          ai_image_uses_today?: number
          collection_slots?: number
          created_at?: string
          custom_tag_slots?: number
          group_create_count?: number
          id?: string
          room_slots?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_image_last_reset?: string | null
          ai_image_uses_today?: number
          collection_slots?: number
          created_at?: string
          custom_tag_slots?: number
          group_create_count?: number
          id?: string
          room_slots?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_monthly_usage: {
        Row: {
          count: number
          id: string
          period_start: string
          usage_type: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          period_start: string
          usage_type: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          period_start?: string
          usage_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_monthly_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_personal_tags: {
        Row: {
          created_at: string
          id: string
          tag_name: string
          user_id: string
          user_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_name: string
          user_id: string
          user_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_name?: string
          user_id?: string
          user_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_personal_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_personal_tags_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_point_purchases: {
        Row: {
          id: string
          points_spent: number
          purchased_at: string
          shop_item_id: string
          user_id: string
        }
        Insert: {
          id?: string
          points_spent: number
          purchased_at?: string
          shop_item_id: string
          user_id: string
        }
        Update: {
          id?: string
          points_spent?: number
          purchased_at?: string
          shop_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_point_purchases_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "point_shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          last_login_bonus_date: string | null
          last_login_date: string | null
          login_streak: number | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_login_bonus_date?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_login_bonus_date?: string | null
          last_login_date?: string | null
          login_streak?: number | null
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
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          platform: string | null
          started_at: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          platform?: string | null
          started_at?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          platform?: string | null
          started_at?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trust_scores: {
        Row: {
          collector_count: number
          collector_score: number
          communication_count: number
          communication_score: number
          created_at: string
          reports_count: number
          trade_count: number
          trade_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collector_count?: number
          collector_score?: number
          communication_count?: number
          communication_score?: number
          created_at?: string
          reports_count?: number
          trade_count?: number
          trade_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collector_count?: number
          collector_score?: number
          communication_count?: number
          communication_score?: number
          created_at?: string
          reports_count?: number
          trade_count?: number
          trade_score?: number
          updated_at?: string
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
      add_user_points: {
        Args: {
          _description?: string
          _points: number
          _reference_id?: string
          _transaction_type: string
          _user_id: string
        }
        Returns: undefined
      }
      award_challenge_prize: {
        Args: {
          _challenge_id: string
          _description: string
          _points: number
          _winner_user_id: string
        }
        Returns: undefined
      }
      can_access_item_room: {
        Args: { _official_item_id: string; _user: string }
        Returns: boolean
      }
      can_review_trade: {
        Args: { _reviewee: string; _reviewer: string; _trade_id: string }
        Returns: boolean
      }
      can_send_stamp: {
        Args: { _receiver: string; _sender: string }
        Returns: boolean
      }
      claim_login_bonus: { Args: { _user_id: string }; Returns: boolean }
      claim_onboarding_reward: {
        Args: { _points: number; _step_id: string }
        Returns: boolean
      }
      deduct_points_for_challenge: {
        Args: { _description: string; _total_prize: number }
        Returns: undefined
      }
      ensure_user_limits_row: { Args: never; Returns: undefined }
      expand_collection_slots: {
        Args: { _cost?: number; _slots_added?: number }
        Returns: Json
      }
      find_user_matches: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          candidate_id: string
          score: number
          shared_interests: number
          shared_items: number
          tradeable_items: number
        }[]
      }
      get_collection_diff: {
        Args: { _me: string; _other: string }
        Returns: {
          diff_type: string
          official_item_id: string
        }[]
      }
      get_or_create_item_room: {
        Args: { _official_item_id: string }
        Returns: string
      }
      grant_achievement_if_eligible: {
        Args: { _achievement_id: string }
        Returns: boolean
      }
      grant_points_from_iap: {
        Args: {
          _apple_tx_id: string
          _event: Json
          _event_id: string
          _product_id: string
          _user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_usage_type: string; p_user_id: string }
        Returns: number
      }
      increment_visit_count: { Args: { page_id: string }; Returns: number }
      is_follower: { Args: { target_user_id: string }; Returns: boolean }
      purchase_shop_item: { Args: { _shop_item_id: string }; Returns: Json }
      retroactive_content_points: { Args: never; Returns: Json }
      set_current_avatar: {
        Args: { _avatar_id: string }
        Returns: {
          id: string
          image_url: string
        }[]
      }
      update_trust_score: {
        Args: { _category: string; _delta: number; _user_id: string }
        Returns: undefined
      }
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
