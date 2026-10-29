// Generated from the Supabase schema. Regenerate after migrations.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agreements: {
        Row: {
          body: string
          created_at: string
          id: string
          is_current: boolean
          kind: Database["public"]["Enums"]["agreement_kind"]
          title: string
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind: Database["public"]["Enums"]["agreement_kind"]
          title: string
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind?: Database["public"]["Enums"]["agreement_kind"]
          title?: string
          version?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          order_item_id: string
          rate_bps: number
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          id?: string
          order_item_id: string
          rate_bps: number
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          order_item_id?: string
          rate_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      download_logs: {
        Row: {
          created_at: string
          file_id: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "product_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          granted_at: string
          id: string
          license_type: Database["public"]["Enums"]["license_type"]
          order_item_id: string
          product_id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          license_type: Database["public"]["Enums"]["license_type"]
          order_item_id: string
          product_id: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          order_item_id?: string
          product_id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account: Database["public"]["Enums"]["ledger_account"]
          amount_minor: number
          created_at: string
          currency: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: number
          order_item_id: string | null
          payout_id: string | null
          refund_id: string | null
          seller_id: string | null
        }
        Insert: {
          account: Database["public"]["Enums"]["ledger_account"]
          amount_minor: number
          created_at?: string
          currency: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: never
          order_item_id?: string | null
          payout_id?: string | null
          refund_id?: string | null
          seller_id?: string | null
        }
        Update: {
          account?: Database["public"]["Enums"]["ledger_account"]
          amount_minor?: number
          created_at?: string
          currency?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: never
          order_item_id?: string | null
          payout_id?: string | null
          refund_id?: string | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      license_acceptances: {
        Row: {
          accepted_at: string
          agreement_id: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          agreement_id: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          agreement_id?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_acceptances_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_acceptances_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          commission_bps: number
          commission_minor: number
          currency: string
          id: string
          license_type: Database["public"]["Enums"]["license_type"]
          order_id: string
          ownership: Database["public"]["Enums"]["product_ownership"]
          product_id: string
          refunded_minor: number
          seller_id: string
          seller_share_minor: number
          unit_price_minor: number
          version_id: string | null
        }
        Insert: {
          commission_bps: number
          commission_minor: number
          currency: string
          id?: string
          license_type: Database["public"]["Enums"]["license_type"]
          order_id: string
          ownership: Database["public"]["Enums"]["product_ownership"]
          product_id: string
          refunded_minor?: number
          seller_id: string
          seller_share_minor: number
          unit_price_minor: number
          version_id?: string | null
        }
        Update: {
          commission_bps?: number
          commission_minor?: number
          currency?: string
          id?: string
          license_type?: Database["public"]["Enums"]["license_type"]
          order_id?: string
          ownership?: Database["public"]["Enums"]["product_ownership"]
          product_id?: string
          refunded_minor?: number
          seller_id?: string
          seller_share_minor?: number
          unit_price_minor?: number
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_session_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_minor: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency: string
          id?: string
          paid_at?: string | null
          provider: string
          provider_payment_id?: string | null
          provider_session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_minor: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_id: string
          event_type: string
          id: number
          order_id: string | null
          processed_at: string
          provider: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: never
          order_id?: string | null
          processed_at?: string
          provider: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: never
          order_id?: string | null
          processed_at?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          fee_minor: number
          id: string
          order_id: string
          provider: string
          provider_payment_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          fee_minor?: number
          id?: string
          order_id: string
          provider: string
          provider_payment_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          fee_minor?: number
          id?: string
          order_id?: string
          provider?: string
          provider_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_minor: number
          currency: string
          decided_by: string | null
          id: string
          method: Database["public"]["Enums"]["payout_method"]
          note: string | null
          paid_at: string | null
          provider_reference: string | null
          requested_at: string
          seller_id: string
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount_minor: number
          currency: string
          decided_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payout_method"]
          note?: string | null
          paid_at?: string | null
          provider_reference?: string | null
          requested_at?: string
          seller_id: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount_minor?: number
          currency?: string
          decided_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payout_method"]
          note?: string | null
          paid_at?: string | null
          provider_reference?: string | null
          requested_at?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          currency: string
          default_commission_bps: number
          id: number
          max_price_minor: number
          max_upload_bytes: number
          min_price_minor: number
          processing_fee_bearer: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          currency?: string
          default_commission_bps?: number
          id?: number
          max_price_minor?: number
          max_upload_bytes?: number
          min_price_minor?: number
          processing_fee_bearer?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          currency?: string
          default_commission_bps?: number
          id?: number
          max_price_minor?: number
          max_upload_bytes?: number
          min_price_minor?: number
          processing_fee_bearer?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_configurations: {
        Row: {
          created_at: string
          id: string
          product_id: string
          revision: number
          user_id: string
          values: Json
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          revision: number
          user_id: string
          values: Json
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          revision?: number
          user_id?: string
          values?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_configurations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_configurations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["file_kind"]
          mime: string
          sha256: string
          size_bytes: number
          storage_path: string
          version_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["file_kind"]
          mime: string
          sha256: string
          size_bytes: number
          storage_path: string
          version_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["file_kind"]
          mime?: string
          sha256?: string
          size_bytes?: number
          storage_path?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_files_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_manifests: {
        Row: {
          created_at: string
          id: string
          manifest: Json
          schema_version: number
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manifest: Json
          schema_version?: number
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manifest?: Json
          schema_version?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_manifests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: true
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          product_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details: string
          id?: string
          product_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          product_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["product_status"] | null
          id: number
          note: string | null
          product_id: string
          to_status: Database["public"]["Enums"]["product_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["product_status"] | null
          id?: never
          note?: string | null
          product_id: string
          to_status: Database["public"]["Enums"]["product_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["product_status"] | null
          id?: never
          note?: string | null
          product_id?: string
          to_status?: Database["public"]["Enums"]["product_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_status_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_versions: {
        Row: {
          changelog: string
          created_at: string
          id: string
          product_id: string
          scan_report: Json
          status: Database["public"]["Enums"]["version_status"]
          version: string
        }
        Insert: {
          changelog?: string
          created_at?: string
          id?: string
          product_id: string
          scan_report?: Json
          status?: Database["public"]["Enums"]["version_status"]
          version: string
        }
        Update: {
          changelog?: string
          created_at?: string
          id?: string
          product_id?: string
          scan_report?: Json
          status?: Database["public"]["Enums"]["version_status"]
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          admin_note: string
          company: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          product_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string
          company?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string
          current_version_id: string | null
          customization_mode: Database["public"]["Enums"]["customization_mode"]
          demo_video_url: string | null
          description: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          install_instructions: string
          integrations: string[]
          is_demo: boolean
          is_featured: boolean
          license_types: Database["public"]["Enums"]["license_type"][]
          name: string
          ownership: Database["public"]["Enums"]["product_ownership"]
          platforms: string[]
          prerequisites: string
          preview_paths: string[]
          price_minor: number
          published_at: string | null
          rating_avg: number | null
          rating_count: number
          rights_confirmed_at: string | null
          sales_count: number
          seller_id: string
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          support_policy: string
          tags: string[]
          thumbnail_path: string | null
          top_rank: number | null
          audience: string
          price_label: string | null
          quote_only: boolean
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string
          current_version_id?: string | null
          customization_mode?: Database["public"]["Enums"]["customization_mode"]
          demo_video_url?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          install_instructions?: string
          integrations?: string[]
          is_demo?: boolean
          is_featured?: boolean
          license_types?: Database["public"]["Enums"]["license_type"][]
          name: string
          ownership?: Database["public"]["Enums"]["product_ownership"]
          platforms?: string[]
          prerequisites?: string
          preview_paths?: string[]
          price_minor?: number
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          rights_confirmed_at?: string | null
          sales_count?: number
          seller_id: string
          short_description?: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          support_policy?: string
          tags?: string[]
          thumbnail_path?: string | null
          top_rank?: number | null
          audience?: string
          price_label?: string | null
          quote_only?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string
          current_version_id?: string | null
          customization_mode?: Database["public"]["Enums"]["customization_mode"]
          demo_video_url?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          install_instructions?: string
          integrations?: string[]
          is_demo?: boolean
          is_featured?: boolean
          license_types?: Database["public"]["Enums"]["license_type"][]
          name?: string
          ownership?: Database["public"]["Enums"]["product_ownership"]
          platforms?: string[]
          prerequisites?: string
          preview_paths?: string[]
          price_minor?: number
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          rights_confirmed_at?: string | null
          sales_count?: number
          seller_id?: string
          short_description?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          support_policy?: string
          tags?: string[]
          thumbnail_path?: string | null
          top_rank?: number | null
          audience?: string
          price_label?: string | null
          quote_only?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          decided_by: string | null
          id: string
          order_id: string
          order_item_id: string | null
          processed_at: string | null
          provider_refund_id: string | null
          reason: string
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"]
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          decided_by?: string | null
          id?: string
          order_id: string
          order_item_id?: string | null
          processed_at?: string | null
          provider_refund_id?: string | null
          reason?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          decided_by?: string | null
          id?: string
          order_id?: string
          order_item_id?: string | null
          processed_at?: string | null
          provider_refund_id?: string | null
          reason?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
        }
        Relationships: [
          {
            foreignKeyName: "refunds_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_agreement_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          agreement_id: string
          id: string
          seller_id: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          agreement_id: string
          id?: string
          seller_id: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          agreement_id?: string
          id?: string
          seller_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_agreement_acceptances_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_agreement_acceptances_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_agreement_acceptances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_applications: {
        Row: {
          admin_note: string | null
          categories: string[]
          contact_email: string
          country: string
          created_at: string
          display_name: string
          experience: string
          id: string
          portfolio_url: string | null
          profile: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          categories?: string[]
          contact_email: string
          country: string
          created_at?: string
          display_name: string
          experience: string
          id?: string
          portfolio_url?: string | null
          profile?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          categories?: string[]
          contact_email?: string
          country?: string
          created_at?: string
          display_name?: string
          experience?: string
          id?: string
          portfolio_url?: string | null
          profile?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          bio: string
          categories: string[]
          commission_bps_override: number | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          is_demo: boolean
          is_platform: boolean
          payout_method: Database["public"]["Enums"]["payout_method"]
          portfolio_url: string | null
          slug: string
          status: Database["public"]["Enums"]["seller_status"]
          stripe_account_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string
          categories?: string[]
          commission_bps_override?: number | null
          country?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_demo?: boolean
          is_platform?: boolean
          payout_method?: Database["public"]["Enums"]["payout_method"]
          portfolio_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["seller_status"]
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string
          categories?: string[]
          commission_bps_override?: number | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_demo?: boolean
          is_platform?: boolean
          payout_method?: Database["public"]["Enums"]["payout_method"]
          portfolio_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["seller_status"]
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          product_id: string
          seller_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          product_id: string
          seller_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      seller_balances: {
        Row: {
          balance_minor: number | null
          currency: string | null
          gross_share_minor: number | null
          paid_out_minor: number | null
          refunds_minor: number | null
          seller_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_seller_agreement: {
        Args: { p_agreement_id: string; p_user_agent?: string }
        Returns: undefined
      }
      apply_refund: {
        Args: { p_provider_refund_id: string; p_refund_id: string }
        Returns: string
      }
      approve_product_version: {
        Args: { p_approve: boolean; p_note?: string; p_version_id: string }
        Returns: undefined
      }
      audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      change_product_status: {
        Args: {
          p_note?: string
          p_product_id: string
          p_to: Database["public"]["Enums"]["product_status"]
        }
        Returns: undefined
      }
      claim_free_order: { Args: { p_order_id: string }; Returns: string }
      commission_bps_for: { Args: { p_seller_id: string }; Returns: number }
      create_order: {
        Args: {
          p_items: Json
          p_license_agreement_id: string
          p_provider: string
        }
        Returns: string
      }
      current_agreement: {
        Args: { p_kind: Database["public"]["Enums"]["agreement_kind"] }
        Returns: string
      }
      decide_refund: {
        Args: { p_approve: boolean; p_note?: string; p_refund_id: string }
        Returns: undefined
      }
      ensure_platform_seller: { Args: never; Returns: string }
      finalize_paid_order: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_event_id: string
          p_event_type: string
          p_fee_minor?: number
          p_order_id: string
          p_payment_id: string
          p_provider: string
        }
        Returns: string
      }
      has_role: {
        Args: { r: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_my_product: { Args: { p_product_id: string }; Returns: boolean }
      is_public_product: { Args: { p_product_id: string }; Returns: boolean }
      mark_order_failed: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_order_id: string
          p_provider: string
        }
        Returns: string
      }
      my_seller_id: { Args: never; Returns: string }
      owns_product: { Args: { p_product_id: string }; Returns: boolean }
      product_search_text: {
        Args: {
          p_integrations: string[]
          p_name: string
          p_short: string
          p_tags: string[]
        }
        Returns: unknown
      }
      request_payout: { Args: { p_amount_minor: number }; Returns: string }
      request_refund: {
        Args: { p_order_item_id: string; p_reason: string }
        Returns: string
      }
      review_seller_application: {
        Args: {
          p_application_id: string
          p_decision: Database["public"]["Enums"]["application_status"]
          p_note?: string
        }
        Returns: undefined
      }
      seller_has_current_agreement: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      set_default_commission: { Args: { p_bps: number }; Returns: undefined }
      set_payout_status: {
        Args: {
          p_note?: string
          p_payout_id: string
          p_reference?: string
          p_status: Database["public"]["Enums"]["payout_status"]
        }
        Returns: undefined
      }
      set_product_featured: {
        Args: { p_featured: boolean; p_product_id: string }
        Returns: undefined
      }
      set_seller_commission_override: {
        Args: { p_bps: number; p_note: string; p_seller_id: string }
        Returns: undefined
      }
      set_seller_status: {
        Args: {
          p_note: string
          p_seller_id: string
          p_status: Database["public"]["Enums"]["seller_status"]
        }
        Returns: undefined
      }
      split_price: {
        Args: { p_bps: number; p_price: number }
        Returns: Record<string, unknown>
      }
      submit_product_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      submit_quote_request: {
        Args: { p_company: string; p_email: string; p_message: string; p_name: string; p_phone: string; p_product_slug: string }
        Returns: string
      }
    }
    Enums: {
      agreement_kind:
        | "seller_agreement"
        | "buyer_license"
        | "terms"
        | "privacy"
        | "refund_policy"
      app_role: "buyer" | "seller" | "admin"
      application_status:
        | "submitted"
        | "approved"
        | "rejected"
        | "info_requested"
      customization_mode:
        | "ready_to_use"
        | "configurable"
        | "guided_setup"
        | "paid_service"
      difficulty: "beginner" | "intermediate" | "advanced"
      file_kind:
        | "workflow"
        | "readme"
        | "install_guide"
        | "example_config"
        | "changelog"
        | "screenshot"
        | "sample"
      ledger_account: "seller" | "platform"
      ledger_entry_type:
        | "sale"
        | "commission"
        | "processing_fee"
        | "refund"
        | "commission_reversal"
        | "payout"
      license_type:
        | "personal"
        | "single_business"
        | "commercial"
        | "extended_commercial"
      order_status:
        | "pending"
        | "paid"
        | "partially_refunded"
        | "refunded"
        | "failed"
        | "canceled"
      payout_method: "manual" | "stripe_connect"
      payout_status:
        | "requested"
        | "approved"
        | "processing"
        | "paid"
        | "failed"
        | "canceled"
      product_ownership: "platform" | "third_party"
      quote_status: "new" | "contacted" | "won" | "lost" | "spam"
      product_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "changes_requested"
        | "approved"
        | "published"
        | "rejected"
        | "suspended"
        | "archived"
      refund_status: "requested" | "approved" | "rejected" | "processed"
      report_reason:
        | "intellectual_property"
        | "malicious"
        | "quality"
        | "misleading"
        | "other"
      report_status: "open" | "investigating" | "resolved" | "dismissed"
      seller_status:
        | "pending"
        | "approved"
        | "rejected"
        | "info_requested"
        | "suspended"
      ticket_status: "open" | "answered" | "closed"
      version_status: "draft" | "submitted" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agreement_kind: [
        "seller_agreement",
        "buyer_license",
        "terms",
        "privacy",
        "refund_policy",
      ],
      app_role: ["buyer", "seller", "admin"],
      application_status: [
        "submitted",
        "approved",
        "rejected",
        "info_requested",
      ],
      customization_mode: [
        "ready_to_use",
        "configurable",
        "guided_setup",
        "paid_service",
      ],
      difficulty: ["beginner", "intermediate", "advanced"],
      file_kind: [
        "workflow",
        "readme",
        "install_guide",
        "example_config",
        "changelog",
        "screenshot",
        "sample",
      ],
      ledger_account: ["seller", "platform"],
      ledger_entry_type: [
        "sale",
        "commission",
        "processing_fee",
        "refund",
        "commission_reversal",
        "payout",
      ],
      license_type: [
        "personal",
        "single_business",
        "commercial",
        "extended_commercial",
      ],
      order_status: [
        "pending",
        "paid",
        "partially_refunded",
        "refunded",
        "failed",
        "canceled",
      ],
      payout_method: ["manual", "stripe_connect"],
      payout_status: [
        "requested",
        "approved",
        "processing",
        "paid",
        "failed",
        "canceled",
      ],
      product_ownership: ["platform", "third_party"],
      quote_status: ["new", "contacted", "won", "lost", "spam"],
      product_status: [
        "draft",
        "submitted",
        "under_review",
        "changes_requested",
        "approved",
        "published",
        "rejected",
        "suspended",
        "archived",
      ],
      refund_status: ["requested", "approved", "rejected", "processed"],
      report_reason: [
        "intellectual_property",
        "malicious",
        "quality",
        "misleading",
        "other",
      ],
      report_status: ["open", "investigating", "resolved", "dismissed"],
      seller_status: [
        "pending",
        "approved",
        "rejected",
        "info_requested",
        "suspended",
      ],
      ticket_status: ["open", "answered", "closed"],
      version_status: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const
