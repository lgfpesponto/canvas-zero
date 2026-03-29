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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      order_templates: {
        Row: {
          created_at: string
          form_data: Json
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_data?: Json
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_data?: Json
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          acessorios: string
          adicional_desc: string | null
          adicional_valor: number | null
          alteracoes: Json
          bordado_cano: string
          bordado_gaspea: string
          bordado_taloneira: string
          bordado_variado_desc_cano: string | null
          bordado_variado_desc_gaspea: string | null
          bordado_variado_desc_taloneira: string | null
          bridao_metal_qtd: number | null
          carimbo: string | null
          carimbo_desc: string | null
          cor_bordado_cano: string | null
          cor_bordado_gaspea: string | null
          cor_bordado_taloneira: string | null
          cor_borrachinha: string
          cor_couro_cano: string | null
          cor_couro_gaspea: string | null
          cor_couro_taloneira: string | null
          cor_glitter_cano: string | null
          cor_glitter_gaspea: string | null
          cor_glitter_taloneira: string | null
          cor_linha: string
          cor_metal: string | null
          cor_sola: string | null
          cor_vira: string
          cor_vivo: string | null
          costura_atras: string | null
          couro_cano: string
          couro_gaspea: string
          couro_taloneira: string
          created_at: string
          cruz_metal_qtd: number | null
          data_criacao: string
          desconto: number | null
          desconto_justificativa: string | null
          desenvolvimento: string
          dias_restantes: number
          estampa: string | null
          estampa_desc: string | null
          extra_detalhes: Json | null
          forma: string | null
          formato_bico: string
          fotos: Json
          genero: string | null
          historico: Json
          hora_criacao: string
          id: string
          laser_cano: string | null
          laser_gaspea: string | null
          laser_taloneira: string | null
          metais: string
          modelo: string
          nome_bordado_desc: string | null
          numero: string
          numero_pedido_bota: string | null
          observacao: string
          personalizacao_bordado: string
          personalizacao_nome: string
          pintura: string | null
          pintura_desc: string | null
          preco: number
          quantidade: number
          sob_medida: boolean
          sob_medida_desc: string | null
          solado: string
          status: string
          strass_qtd: number | null
          tamanho: string
          tem_laser: boolean
          tipo_extra: string | null
          tipo_metal: string | null
          tiras: string
          tiras_desc: string | null
          trice_desc: string | null
          trisce: string
          user_id: string
          vendedor: string
        }
        Insert: {
          acessorios?: string
          adicional_desc?: string | null
          adicional_valor?: number | null
          alteracoes?: Json
          bordado_cano?: string
          bordado_gaspea?: string
          bordado_taloneira?: string
          bordado_variado_desc_cano?: string | null
          bordado_variado_desc_gaspea?: string | null
          bordado_variado_desc_taloneira?: string | null
          bridao_metal_qtd?: number | null
          carimbo?: string | null
          carimbo_desc?: string | null
          cor_bordado_cano?: string | null
          cor_bordado_gaspea?: string | null
          cor_bordado_taloneira?: string | null
          cor_borrachinha?: string
          cor_couro_cano?: string | null
          cor_couro_gaspea?: string | null
          cor_couro_taloneira?: string | null
          cor_glitter_cano?: string | null
          cor_glitter_gaspea?: string | null
          cor_glitter_taloneira?: string | null
          cor_linha?: string
          cor_metal?: string | null
          cor_sola?: string | null
          cor_vira?: string
          cor_vivo?: string | null
          costura_atras?: string | null
          couro_cano?: string
          couro_gaspea?: string
          couro_taloneira?: string
          created_at?: string
          cruz_metal_qtd?: number | null
          data_criacao: string
          desconto?: number | null
          desconto_justificativa?: string | null
          desenvolvimento?: string
          dias_restantes?: number
          estampa?: string | null
          estampa_desc?: string | null
          extra_detalhes?: Json | null
          forma?: string | null
          formato_bico?: string
          fotos?: Json
          genero?: string | null
          historico?: Json
          hora_criacao: string
          id?: string
          laser_cano?: string | null
          laser_gaspea?: string | null
          laser_taloneira?: string | null
          metais?: string
          modelo?: string
          nome_bordado_desc?: string | null
          numero: string
          numero_pedido_bota?: string | null
          observacao?: string
          personalizacao_bordado?: string
          personalizacao_nome?: string
          pintura?: string | null
          pintura_desc?: string | null
          preco?: number
          quantidade?: number
          sob_medida?: boolean
          sob_medida_desc?: string | null
          solado?: string
          status?: string
          strass_qtd?: number | null
          tamanho?: string
          tem_laser?: boolean
          tipo_extra?: string | null
          tipo_metal?: string | null
          tiras?: string
          tiras_desc?: string | null
          trice_desc?: string | null
          trisce?: string
          user_id: string
          vendedor?: string
        }
        Update: {
          acessorios?: string
          adicional_desc?: string | null
          adicional_valor?: number | null
          alteracoes?: Json
          bordado_cano?: string
          bordado_gaspea?: string
          bordado_taloneira?: string
          bordado_variado_desc_cano?: string | null
          bordado_variado_desc_gaspea?: string | null
          bordado_variado_desc_taloneira?: string | null
          bridao_metal_qtd?: number | null
          carimbo?: string | null
          carimbo_desc?: string | null
          cor_bordado_cano?: string | null
          cor_bordado_gaspea?: string | null
          cor_bordado_taloneira?: string | null
          cor_borrachinha?: string
          cor_couro_cano?: string | null
          cor_couro_gaspea?: string | null
          cor_couro_taloneira?: string | null
          cor_glitter_cano?: string | null
          cor_glitter_gaspea?: string | null
          cor_glitter_taloneira?: string | null
          cor_linha?: string
          cor_metal?: string | null
          cor_sola?: string | null
          cor_vira?: string
          cor_vivo?: string | null
          costura_atras?: string | null
          couro_cano?: string
          couro_gaspea?: string
          couro_taloneira?: string
          created_at?: string
          cruz_metal_qtd?: number | null
          data_criacao?: string
          desconto?: number | null
          desconto_justificativa?: string | null
          desenvolvimento?: string
          dias_restantes?: number
          estampa?: string | null
          estampa_desc?: string | null
          extra_detalhes?: Json | null
          forma?: string | null
          formato_bico?: string
          fotos?: Json
          genero?: string | null
          historico?: Json
          hora_criacao?: string
          id?: string
          laser_cano?: string | null
          laser_gaspea?: string | null
          laser_taloneira?: string | null
          metais?: string
          modelo?: string
          nome_bordado_desc?: string | null
          numero?: string
          numero_pedido_bota?: string | null
          observacao?: string
          personalizacao_bordado?: string
          personalizacao_nome?: string
          pintura?: string | null
          pintura_desc?: string | null
          preco?: number
          quantidade?: number
          sob_medida?: boolean
          sob_medida_desc?: string | null
          solado?: string
          status?: string
          strass_qtd?: number | null
          tamanho?: string
          tem_laser?: boolean
          tipo_extra?: string | null
          tipo_metal?: string | null
          tiras?: string
          tiras_desc?: string | null
          trice_desc?: string | null
          trisce?: string
          user_id?: string
          vendedor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf_cnpj: string
          created_at: string
          email: string
          id: string
          nome_completo: string
          nome_usuario: string
          telefone: string
          verificado: boolean
        }
        Insert: {
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id: string
          nome_completo?: string
          nome_usuario: string
          telefone?: string
          verificado?: boolean
        }
        Update: {
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          nome_usuario?: string
          telefone?: string
          verificado?: boolean
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          destination: string
          expires_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          destination: string
          expires_at: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          destination?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
