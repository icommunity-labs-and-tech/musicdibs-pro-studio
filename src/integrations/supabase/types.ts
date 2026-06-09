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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_generation_configs: {
        Row: {
          campaign_id: string
          created_at: string
          email_body: string | null
          email_subject: string | null
          estimated_credits: number
          generation_mode: string
          id: string
          include_first_name: boolean
          language: string | null
          lyrics_goal: string | null
          lyrics_prompt: string | null
          mood: string | null
          music_style: string | null
          provider_audience_id: string | null
          provider_connection_id: string | null
          updated_at: string
          voice_type: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email_body?: string | null
          email_subject?: string | null
          estimated_credits?: number
          generation_mode: string
          id?: string
          include_first_name?: boolean
          language?: string | null
          lyrics_goal?: string | null
          lyrics_prompt?: string | null
          mood?: string | null
          music_style?: string | null
          provider_audience_id?: string | null
          provider_connection_id?: string | null
          updated_at?: string
          voice_type?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email_body?: string | null
          email_subject?: string | null
          estimated_credits?: number
          generation_mode?: string
          id?: string
          include_first_name?: boolean
          language?: string | null
          lyrics_goal?: string | null
          lyrics_prompt?: string | null
          mood?: string | null
          music_style?: string | null
          provider_audience_id?: string | null
          provider_connection_id?: string | null
          updated_at?: string
          voice_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_generation_configs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_generation_configs_provider_audience_id_fkey"
            columns: ["provider_audience_id"]
            isOneToOne: false
            referencedRelation: "provider_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_generation_configs_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats: {
        Row: {
          campaign_id: string
          cost_actual: number
          emails_clicked: number
          emails_opened: number
          emails_sent: number
          id: string
          tenant_id: string
          unsubscribes: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          cost_actual?: number
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          id?: string
          tenant_id: string
          unsubscribes?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          cost_actual?: number
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          id?: string
          tenant_id?: string
          unsubscribes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaign_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaign_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaign_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ai_prompt: string | null
          ai_provider: string
          approved_asset_id: string | null
          audio_url: string | null
          campaign_type: string
          click_rate: number | null
          completion_rate: number | null
          contact_list_id: string | null
          cost_estimate: number | null
          created_at: string
          created_by: string | null
          crm_source: string | null
          delivery_channel: string
          duration_seconds: number
          generated_count: number
          goal: string | null
          id: string
          language: string
          launched_at: string | null
          mailerlite_campaign_id: string | null
          music_style: string | null
          name: string
          open_rate: number | null
          play_rate: number | null
          sent_at: string | null
          status: string
          subject: string | null
          tenant_id: string
          tone: string | null
          total_contacts: number
          trigger_time: string | null
          trigger_type: string | null
          type: string
          updated_at: string
          vertical: string
        }
        Insert: {
          ai_prompt?: string | null
          ai_provider?: string
          approved_asset_id?: string | null
          audio_url?: string | null
          campaign_type?: string
          click_rate?: number | null
          completion_rate?: number | null
          contact_list_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          created_by?: string | null
          crm_source?: string | null
          delivery_channel?: string
          duration_seconds?: number
          generated_count?: number
          goal?: string | null
          id?: string
          language?: string
          launched_at?: string | null
          mailerlite_campaign_id?: string | null
          music_style?: string | null
          name: string
          open_rate?: number | null
          play_rate?: number | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          tone?: string | null
          total_contacts?: number
          trigger_time?: string | null
          trigger_type?: string | null
          type: string
          updated_at?: string
          vertical: string
        }
        Update: {
          ai_prompt?: string | null
          ai_provider?: string
          approved_asset_id?: string | null
          audio_url?: string | null
          campaign_type?: string
          click_rate?: number | null
          completion_rate?: number | null
          contact_list_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          created_by?: string | null
          crm_source?: string | null
          delivery_channel?: string
          duration_seconds?: number
          generated_count?: number
          goal?: string | null
          id?: string
          language?: string
          launched_at?: string | null
          mailerlite_campaign_id?: string | null
          music_style?: string | null
          name?: string
          open_rate?: number | null
          play_rate?: number | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          tone?: string | null
          total_contacts?: number
          trigger_time?: string | null
          trigger_type?: string | null
          type?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_approved_asset_id_fkey"
            columns: ["approved_asset_id"]
            isOneToOne: false
            referencedRelation: "generation_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          color: string | null
          contact_count: number
          created_at: string
          description: string | null
          id: string
          mailerlite_group_id: string | null
          name: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          contact_count?: number
          created_at?: string
          description?: string | null
          id?: string
          mailerlite_group_id?: string | null
          name: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          contact_count?: number
          created_at?: string
          description?: string | null
          id?: string
          mailerlite_group_id?: string | null
          name?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contact_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          custom_fields: Json
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          list_id: string | null
          mailerlite_subscriber_id: string | null
          phone: string | null
          status: string
          subscribed_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          list_id?: string | null
          mailerlite_subscriber_id?: string | null
          phone?: string | null
          status?: string
          subscribed_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          custom_fields?: Json
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          list_id?: string | null
          mailerlite_subscriber_id?: string | null
          phone?: string | null
          status?: string
          subscribed_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_pages: {
        Row: {
          audio_asset_id: string | null
          branding: Json
          campaign_id: string
          completion_count: number
          cover_asset_id: string | null
          created_at: string
          cta_title: string | null
          cta_url: string | null
          download_count: number
          experience_token: string
          generation_job_id: string | null
          id: string
          lyrics_asset_id: string | null
          message_content: string | null
          play_count: number
          status: string
          tenant_id: string
          title: string
          unique_visitors: number
          updated_at: string
        }
        Insert: {
          audio_asset_id?: string | null
          branding?: Json
          campaign_id: string
          completion_count?: number
          cover_asset_id?: string | null
          created_at?: string
          cta_title?: string | null
          cta_url?: string | null
          download_count?: number
          experience_token: string
          generation_job_id?: string | null
          id?: string
          lyrics_asset_id?: string | null
          message_content?: string | null
          play_count?: number
          status?: string
          tenant_id: string
          title?: string
          unique_visitors?: number
          updated_at?: string
        }
        Update: {
          audio_asset_id?: string | null
          branding?: Json
          campaign_id?: string
          completion_count?: number
          cover_asset_id?: string | null
          created_at?: string
          cta_title?: string | null
          cta_url?: string | null
          download_count?: number
          experience_token?: string
          generation_job_id?: string | null
          id?: string
          lyrics_asset_id?: string | null
          message_content?: string | null
          play_count?: number
          status?: string
          tenant_id?: string
          title?: string
          unique_visitors?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_pages_audio_asset_id_fkey"
            columns: ["audio_asset_id"]
            isOneToOne: false
            referencedRelation: "generation_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_pages_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "generation_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_pages_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_pages_lyrics_asset_id_fkey"
            columns: ["lyrics_asset_id"]
            isOneToOne: false
            referencedRelation: "generation_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_assets: {
        Row: {
          asset_type: string
          campaign_id: string
          created_at: string
          duration_seconds: number | null
          external_asset_id: string | null
          generation_job_id: string
          generation_round: number
          id: string
          lyrics_content: string | null
          metadata: Json | null
          provider_metadata: Json | null
          public_url: string | null
          status: string
          storage_path: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          campaign_id: string
          created_at?: string
          duration_seconds?: number | null
          external_asset_id?: string | null
          generation_job_id: string
          generation_round?: number
          id?: string
          lyrics_content?: string | null
          metadata?: Json | null
          provider_metadata?: Json | null
          public_url?: string | null
          status?: string
          storage_path?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          campaign_id?: string
          created_at?: string
          duration_seconds?: number | null
          external_asset_id?: string | null
          generation_job_id?: string
          generation_round?: number
          id?: string
          lyrics_content?: string | null
          metadata?: Json | null
          provider_metadata?: Json | null
          public_url?: string | null
          status?: string
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_assets_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_batches: {
        Row: {
          campaign_id: string
          completed_at: string | null
          completed_jobs: number
          created_at: string
          credits_consumed: number
          credits_reserved: number
          failed_jobs: number
          generation_mode: string
          generation_round: number
          id: string
          started_at: string | null
          status: string
          tenant_id: string
          total_jobs: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          completed_jobs?: number
          created_at?: string
          credits_consumed?: number
          credits_reserved?: number
          failed_jobs?: number
          generation_mode: string
          generation_round?: number
          id?: string
          started_at?: string | null
          status?: string
          tenant_id: string
          total_jobs?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          completed_jobs?: number
          created_at?: string
          credits_consumed?: number
          credits_reserved?: number
          failed_jobs?: number
          generation_mode?: string
          generation_round?: number
          id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_jobs?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          attempts: number
          campaign_id: string
          completed_at: string | null
          contact_email: string | null
          contact_metadata: Json
          contact_name: string
          created_at: string
          duration_seconds: number
          error_message: string | null
          external_contact_id: string | null
          external_lyrics_task_id: string | null
          external_music_task_id: string | null
          generation_batch_id: string | null
          generation_round: number
          id: string
          lyrics_status: string
          lyrics_title: string | null
          music_status: string
          output_metadata: Json | null
          output_url: string | null
          prompt: string | null
          provider: string
          queued_at: string
          selected_variant: number
          started_at: string | null
          status: string
          style: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          campaign_id: string
          completed_at?: string | null
          contact_email?: string | null
          contact_metadata?: Json
          contact_name?: string
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          external_contact_id?: string | null
          external_lyrics_task_id?: string | null
          external_music_task_id?: string | null
          generation_batch_id?: string | null
          generation_round?: number
          id?: string
          lyrics_status?: string
          lyrics_title?: string | null
          music_status?: string
          output_metadata?: Json | null
          output_url?: string | null
          prompt?: string | null
          provider?: string
          queued_at?: string
          selected_variant?: number
          started_at?: string | null
          status?: string
          style?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          campaign_id?: string
          completed_at?: string | null
          contact_email?: string | null
          contact_metadata?: Json
          contact_name?: string
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          external_contact_id?: string | null
          external_lyrics_task_id?: string | null
          external_music_task_id?: string | null
          generation_batch_id?: string | null
          generation_round?: number
          id?: string
          lyrics_status?: string
          lyrics_title?: string | null
          music_status?: string
          output_metadata?: Json | null
          output_url?: string | null
          prompt?: string | null
          provider?: string
          queued_at?: string
          selected_variant?: number
          started_at?: string | null
          status?: string
          style?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_generation_batch_id_fkey"
            columns: ["generation_batch_id"]
            isOneToOne: false
            referencedRelation: "generation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "generation_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "generation_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "generation_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personalized_deliveries: {
        Row: {
          campaign_id: string
          created_at: string
          email_sent_at: string | null
          error_message: string | null
          experience_page_id: string | null
          experience_token: string | null
          external_contact_id: string
          first_name: string | null
          generation_batch_id: string | null
          generation_job_id: string | null
          id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email_sent_at?: string | null
          error_message?: string | null
          experience_page_id?: string | null
          experience_token?: string | null
          external_contact_id: string
          first_name?: string | null
          generation_batch_id?: string | null
          generation_job_id?: string | null
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email_sent_at?: string | null
          error_message?: string | null
          experience_page_id?: string | null
          experience_token?: string | null
          external_contact_id?: string
          first_name?: string | null
          generation_batch_id?: string | null
          generation_job_id?: string | null
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalized_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalized_deliveries_experience_page_id_fkey"
            columns: ["experience_page_id"]
            isOneToOne: false
            referencedRelation: "experience_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalized_deliveries_generation_batch_id_fkey"
            columns: ["generation_batch_id"]
            isOneToOne: false
            referencedRelation: "generation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalized_deliveries_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalized_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "personalized_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "personalized_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "personalized_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_superadmin: boolean
          role: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_superadmin?: boolean
          role?: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_superadmin?: boolean
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_audiences: {
        Row: {
          audience_type: string
          contacts_count: number
          created_at: string
          external_id: string
          id: string
          last_sync_at: string | null
          name: string
          provider_connection_id: string
          tenant_id: string
        }
        Insert: {
          audience_type: string
          contacts_count?: number
          created_at?: string
          external_id: string
          id?: string
          last_sync_at?: string | null
          name: string
          provider_connection_id: string
          tenant_id: string
        }
        Update: {
          audience_type?: string
          contacts_count?: number
          created_at?: string
          external_id?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          provider_connection_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_audiences_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_campaigns: {
        Row: {
          created_at: string
          experience_page_id: string
          id: string
          provider_campaign_id: string
          provider_campaign_name: string
          provider_campaign_status: string
          provider_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          experience_page_id: string
          id?: string
          provider_campaign_id: string
          provider_campaign_name: string
          provider_campaign_status?: string
          provider_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          experience_page_id?: string
          id?: string
          provider_campaign_id?: string
          provider_campaign_name?: string
          provider_campaign_status?: string
          provider_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_campaigns_experience_page_id_fkey"
            columns: ["experience_page_id"]
            isOneToOne: false
            referencedRelation: "experience_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "provider_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "provider_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "provider_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_connections: {
        Row: {
          created_at: string
          encrypted_credentials: Json | null
          id: string
          last_sync_at: string | null
          provider_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_credentials?: Json | null
          id?: string
          last_sync_at?: string | null
          provider_type: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_credentials?: Json | null
          id?: string
          last_sync_at?: string | null
          provider_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resend_webhook_events: {
        Row: {
          broadcast_id: string | null
          email_id: string | null
          event_type: string
          id: string
          processed_at: string | null
          svix_id: string
          tenant_id: string | null
        }
        Insert: {
          broadcast_id?: string | null
          email_id?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          svix_id: string
          tenant_id?: string | null
        }
        Update: {
          broadcast_id?: string | null
          email_id?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          svix_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resend_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "resend_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "resend_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "resend_webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_notes: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          pinned: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          api_keys: Json
          created_at: string
          id: string
          integrations: Json
          reply_to_email: string | null
          sender_email: string | null
          sender_name: string | null
          support_email: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          api_keys?: Json
          created_at?: string
          id?: string
          integrations?: Json
          reply_to_email?: string | null
          sender_email?: string | null
          sender_name?: string | null
          support_email?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          api_keys?: Json
          created_at?: string
          id?: string
          integrations?: Json
          reply_to_email?: string | null
          sender_email?: string | null
          sender_name?: string | null
          support_email?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_webhooks: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          name: string
          secret: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          name?: string
          secret: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          name?: string
          secret?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenant_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string
          setup_complete: boolean
          slug: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          updated_at: string
          vertical: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          setup_complete?: boolean
          slug: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          setup_complete?: boolean
          slug?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          delivered_at: string
          duration_ms: number | null
          event: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          success: boolean
          tenant_id: string
          webhook_id: string
        }
        Insert: {
          attempt?: number
          delivered_at?: string
          duration_ms?: number | null
          event: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          tenant_id: string
          webhook_id: string
        }
        Update: {
          attempt?: number
          delivered_at?: string
          duration_ms?: number | null
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean
          tenant_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "tenant_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      audit_log: {
        Row: {
          action: string | null
          actor_email: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          actor_email?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          actor_email?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_churn_signals"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_monthly_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_suno_usage"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_churn_signals: {
        Row: {
          billing_issue: boolean | null
          campaigns_last_30d: number | null
          campaigns_prev_30d: number | null
          churn_risk: string | null
          failed_jobs_7d: number | null
          last_campaign_at: string | null
          plan: string | null
          stripe_status: string | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: []
      }
      tenant_monthly_usage: {
        Row: {
          campaigns_in_progress: number | null
          campaigns_ready: number | null
          campaigns_sent: number | null
          campaigns_this_month: number | null
          contacts_this_month: number | null
          created_at: string | null
          emails_opened_this_month: number | null
          emails_sent_this_month: number | null
          failed_jobs_this_month: number | null
          plan: string | null
          setup_complete: boolean | null
          slug: string | null
          stripe_status: string | null
          tenant_id: string | null
          tenant_name: string | null
          user_count: number | null
        }
        Relationships: []
      }
      tenant_suno_usage: {
        Row: {
          lyrics_ops_month: number | null
          lyrics_ops_total: number | null
          music_ops_month: number | null
          music_ops_total: number | null
          plan: string | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_tenant_id: { Args: never; Returns: string }
      create_tenant_and_profile: {
        Args: { p_plan?: string; p_slug: string; p_tenant_name: string }
        Returns: Json
      }
      get_experience: { Args: { p_token: string }; Returns: Json }
      increment_batch_completed_jobs: {
        Args: { p_batch_id: string }
        Returns: {
          completed_jobs: number
          total_jobs: number
        }[]
      }
      increment_campaign_stat:
        | {
            Args: { p_campaign_id: string; p_column: string }
            Returns: undefined
          }
        | {
            Args: {
              p_campaign_id: string
              p_field: string
              p_tenant_id: string
            }
            Returns: undefined
          }
      increment_experience_stat: {
        Args: { p_field: string; p_token: string }
        Returns: undefined
      }
      is_superadmin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_actor_email: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_resource_id: string
          p_resource_name: string
          p_resource_type: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      reset_stuck_generation_jobs: {
        Args: never
        Returns: {
          failed_count: number
          reset_count: number
        }[]
      }
      run_job_maintenance: { Args: never; Returns: undefined }
      set_campaign_sent: {
        Args: {
          p_campaign_id: string
          p_emails_sent: number
          p_tenant_id: string
        }
        Returns: undefined
      }
      sync_campaign_stats_cron: { Args: never; Returns: undefined }
      trigger_queued_jobs: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
