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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bracelet_items: {
        Row: {
          bracelet_id: string
          created_at: string
          id: string
          material_id: string
          qty: number
        }
        Insert: {
          bracelet_id: string
          created_at?: string
          id?: string
          material_id: string
          qty?: number
        }
        Update: {
          bracelet_id?: string
          created_at?: string
          id?: string
          material_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "bracelet_items_bracelet_id_fkey"
            columns: ["bracelet_id"]
            isOneToOne: false
            referencedRelation: "bracelets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracelet_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      bracelets: {
        Row: {
          composition: string
          cost: number
          created_at: string
          id: string
          pattern: string
          price: number
          profit: number
        }
        Insert: {
          composition?: string
          cost?: number
          created_at?: string
          id?: string
          pattern?: string
          price?: number
          profit?: number
        }
        Update: {
          composition?: string
          cost?: number
          created_at?: string
          id?: string
          pattern?: string
          price?: number
          profit?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          material_id: string
          qty: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          material_id: string
          qty?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          material_id?: string
          qty?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          invoice_date: string | null
          invoice_number: string
          supplier: string
          supplier_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number: string
          supplier?: string
          supplier_id?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          supplier?: string
          supplier_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_lots: {
        Row: {
          created_at: string
          id: string
          invoice_id: string | null
          lot_date: string
          material_id: string
          qty_original: number
          qty_remaining: number
          supplier_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id?: string | null
          lot_date?: string
          material_id: string
          qty_original?: number
          qty_remaining?: number
          supplier_id?: string | null
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string | null
          lot_date?: string
          material_id?: string
          qty_original?: number
          qty_remaining?: number
          supplier_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_lots_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          stock: number
          unit: string
          unit_cost: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          stock?: number
          unit?: string
          unit_cost?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          stock?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_invoice: {
        Args: {
          p_invoice_date: string
          p_invoice_number: string
          p_items: Json
          p_supplier: string
        }
        Returns: string
      }
      apply_invoice_fifo: {
        Args: {
          p_invoice_date: string
          p_invoice_number: string
          p_items: Json
          p_supplier_id: string
        }
        Returns: string
      }
      infer_category: { Args: { p_name: string }; Returns: string }
      save_bracelet: {
        Args: {
          p_composition: string
          p_cost: number
          p_items: Json
          p_pattern: string
          p_price: number
        }
        Returns: string
      }
      save_bracelet_fifo: {
        Args: {
          p_composition: string
          p_extra_cost: number
          p_items: Json
          p_multiplier: number
          p_pattern: string
        }
        Returns: string
      }
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
