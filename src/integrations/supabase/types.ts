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
      custom_options: {
        Row: {
          categoria: string
          created_at: string
          id: string
          label: string
          preco: number
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          label: string
          preco?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          label?: string
          preco?: number
        }
        Relationships: []
      }
      deleted_orders: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          dismissed: boolean
          id: string
          order_data: Json
          order_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          dismissed?: boolean
          id?: string
          order_data?: Json
          order_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          dismissed?: boolean
          id?: string
          order_data?: Json
          order_id?: string
        }
        Relationships: []
      }
      ficha_campos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          desc_condicional: boolean | null
          ficha_tipo_id: string
          id: string
          nome: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          relacionamento: Json | null
          slug: string
          tipo: string
          vinculo: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          desc_condicional?: boolean | null
          ficha_tipo_id: string
          id?: string
          nome: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          relacionamento?: Json | null
          slug: string
          tipo: string
          vinculo?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          desc_condicional?: boolean | null
          ficha_tipo_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          relacionamento?: Json | null
          slug?: string
          tipo?: string
          vinculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_campos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "ficha_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_campos_ficha_tipo_id_fkey"
            columns: ["ficha_tipo_id"]
            isOneToOne: false
            referencedRelation: "ficha_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_categorias: {
        Row: {
          ativo: boolean | null
          ficha_tipo_id: string
          id: string
          nome: string
          ordem: number | null
          slug: string
        }
        Insert: {
          ativo?: boolean | null
          ficha_tipo_id: string
          id?: string
          nome: string
          ordem?: number | null
          slug: string
        }
        Update: {
          ativo?: boolean | null
          ficha_tipo_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_categorias_ficha_tipo_id_fkey"
            columns: ["ficha_tipo_id"]
            isOneToOne: false
            referencedRelation: "ficha_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_tipos: {
        Row: {
          ativo: boolean | null
          campos_nativos: boolean | null
          created_at: string | null
          id: string
          nome: string
          slug: string
          tipo_ficha: string | null
        }
        Insert: {
          ativo?: boolean | null
          campos_nativos?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          slug: string
          tipo_ficha?: string | null
        }
        Update: {
          ativo?: boolean | null
          campos_nativos?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          slug?: string
          tipo_ficha?: string | null
        }
        Relationships: []
      }
      ficha_variacoes: {
        Row: {
          ativo: boolean | null
          campo_id: string | null
          categoria_id: string
          id: string
          nome: string
          ordem: number | null
          preco_adicional: number | null
          relacionamento: Json | null
        }
        Insert: {
          ativo?: boolean | null
          campo_id?: string | null
          categoria_id: string
          id?: string
          nome: string
          ordem?: number | null
          preco_adicional?: number | null
          relacionamento?: Json | null
        }
        Update: {
          ativo?: boolean | null
          campo_id?: string | null
          categoria_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          preco_adicional?: number | null
          relacionamento?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_variacoes_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "ficha_campos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_variacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "ficha_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_workflow: {
        Row: {
          ativo: boolean | null
          etapa_id: string
          ficha_tipo_id: string
        }
        Insert: {
          ativo?: boolean | null
          etapa_id: string
          ficha_tipo_id: string
        }
        Update: {
          ativo?: boolean | null
          etapa_id?: string
          ficha_tipo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_workflow_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "status_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_workflow_ficha_tipo_id_fkey"
            columns: ["ficha_tipo_id"]
            isOneToOne: false
            referencedRelation: "ficha_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_a_pagar: {
        Row: {
          comprovante_hash: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          fornecedor: string
          id: string
          nota_url: string | null
          numero_nota: string
          status: string
          valor: number
        }
        Insert: {
          comprovante_hash?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          fornecedor: string
          id?: string
          nota_url?: string | null
          numero_nota: string
          status?: string
          valor?: number
        }
        Update: {
          comprovante_hash?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          fornecedor?: string
          id?: string
          nota_url?: string | null
          numero_nota?: string
          status?: string
          valor?: number
        }
        Relationships: []
      }
      financeiro_a_receber: {
        Row: {
          comprovante_hash: string | null
          comprovante_url: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string
          descricao: string | null
          destinatario: string
          id: string
          tipo: string
          valor: number
          vendedor: string
        }
        Insert: {
          comprovante_hash?: string | null
          comprovante_url?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento: string
          descricao?: string | null
          destinatario: string
          id?: string
          tipo: string
          valor?: number
          vendedor: string
        }
        Update: {
          comprovante_hash?: string | null
          comprovante_url?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          descricao?: string | null
          destinatario?: string
          id?: string
          tipo?: string
          valor?: number
          vendedor?: string
        }
        Relationships: []
      }
      gravata_stock: {
        Row: {
          cor_brilho: string | null
          cor_tira: string
          id: string
          quantidade: number
          tipo_metal: string
        }
        Insert: {
          cor_brilho?: string | null
          cor_tira: string
          id?: string
          quantidade?: number
          tipo_metal: string
        }
        Update: {
          cor_brilho?: string | null
          cor_tira?: string
          id?: string
          quantidade?: number
          tipo_metal?: string
        }
        Relationships: []
      }
      order_notificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          lida: boolean
          lida_em: string | null
          numero: string
          order_id: string
          status_no_momento: string
          vendedor: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          numero: string
          order_id: string
          status_no_momento: string
          vendedor: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          numero?: string
          order_id?: string
          status_no_momento?: string
          vendedor?: string
        }
        Relationships: []
      }
      order_templates: {
        Row: {
          created_at: string
          form_data: Json
          id: string
          nome: string
          seen: boolean
          sent_by: string | null
          sent_by_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          form_data?: Json
          id?: string
          nome: string
          seen?: boolean
          sent_by?: string | null
          sent_by_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          form_data?: Json
          id?: string
          nome?: string
          seen?: boolean
          sent_by?: string | null
          sent_by_name?: string | null
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
          cliente: string
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
          cor_recorte_cano: string | null
          cor_recorte_gaspea: string | null
          cor_recorte_taloneira: string | null
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
          impressoes: Json
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
          recorte_cano: string | null
          recorte_gaspea: string | null
          recorte_taloneira: string | null
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
          cliente?: string
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
          cor_recorte_cano?: string | null
          cor_recorte_gaspea?: string | null
          cor_recorte_taloneira?: string | null
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
          impressoes?: Json
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
          recorte_cano?: string | null
          recorte_gaspea?: string | null
          recorte_taloneira?: string | null
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
          cliente?: string
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
          cor_recorte_cano?: string | null
          cor_recorte_gaspea?: string | null
          cor_recorte_taloneira?: string | null
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
          impressoes?: Json
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
          recorte_cano?: string | null
          recorte_gaspea?: string | null
          recorte_taloneira?: string | null
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
      revendedor_baixas_pedido: {
        Row: {
          created_at: string
          id: string
          movimento_id: string | null
          order_id: string
          valor_pedido: number
          vendedor: string
        }
        Insert: {
          created_at?: string
          id?: string
          movimento_id?: string | null
          order_id: string
          valor_pedido: number
          vendedor: string
        }
        Update: {
          created_at?: string
          id?: string
          movimento_id?: string | null
          order_id?: string
          valor_pedido?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "revendedor_baixas_pedido_movimento_id_fkey"
            columns: ["movimento_id"]
            isOneToOne: false
            referencedRelation: "revendedor_saldo_movimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      revendedor_comprovantes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          comprovante_hash: string | null
          comprovante_url: string
          created_at: string
          data_pagamento: string
          enviado_por: string
          id: string
          motivo_reprovacao: string | null
          observacao: string | null
          pagador_documento: string | null
          pagador_nome: string | null
          status: string
          tipo_detectado: string | null
          valor: number
          vendedor: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          comprovante_hash?: string | null
          comprovante_url: string
          created_at?: string
          data_pagamento: string
          enviado_por: string
          id?: string
          motivo_reprovacao?: string | null
          observacao?: string | null
          pagador_documento?: string | null
          pagador_nome?: string | null
          status?: string
          tipo_detectado?: string | null
          valor: number
          vendedor: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          comprovante_hash?: string | null
          comprovante_url?: string
          created_at?: string
          data_pagamento?: string
          enviado_por?: string
          id?: string
          motivo_reprovacao?: string | null
          observacao?: string | null
          pagador_documento?: string | null
          pagador_nome?: string | null
          status?: string
          tipo_detectado?: string | null
          valor?: number
          vendedor?: string
        }
        Relationships: []
      }
      revendedor_saldo_movimentos: {
        Row: {
          comprovante_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          order_id: string | null
          saldo_anterior: number
          saldo_posterior: number
          tipo: string
          valor: number
          vendedor: string
        }
        Insert: {
          comprovante_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          order_id?: string | null
          saldo_anterior?: number
          saldo_posterior?: number
          tipo: string
          valor: number
          vendedor: string
        }
        Update: {
          comprovante_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          order_id?: string | null
          saldo_anterior?: number
          saldo_posterior?: number
          tipo?: string
          valor?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "revendedor_saldo_movimentos_comprovante_id_fkey"
            columns: ["comprovante_id"]
            isOneToOne: false
            referencedRelation: "revendedor_comprovantes"
            referencedColumns: ["id"]
          },
        ]
      }
      revendedor_saldo_visibilidade: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          vendedor: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          vendedor: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          vendedor?: string
        }
        Relationships: []
      }
      status_etapas: {
        Row: {
          id: string
          nome: string
          ordem: number | null
          slug: string
        }
        Insert: {
          id?: string
          nome: string
          ordem?: number | null
          slug: string
        }
        Update: {
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
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
      vw_revendedor_saldo: {
        Row: {
          saldo_disponivel: number | null
          total_ajustes: number | null
          total_estornos: number | null
          total_recebido: number | null
          total_utilizado: number | null
          vendedor: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ajustar_saldo_revendedor: {
        Args: { _delta: number; _descricao: string; _vendedor: string }
        Returns: Json
      }
      aprovar_comprovante_revendedor: {
        Args: { _comprovante_id: string }
        Returns: Json
      }
      current_user_nome_completo: { Args: never; Returns: string }
      decrement_stock: { Args: { stock_id: string }; Returns: undefined }
      descartar_comprovantes_historico: {
        Args: { _ids: string[]; _motivo: string }
        Returns: Json
      }
      estornar_baixa_revendedor: {
        Args: { _baixa_id: string; _motivo: string }
        Returns: undefined
      }
      find_order_by_id_suffix: {
        Args: { suffix: string }
        Returns: {
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
          cliente: string
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
          cor_recorte_cano: string | null
          cor_recorte_gaspea: string | null
          cor_recorte_taloneira: string | null
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
          impressoes: Json
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
          recorte_cano: string | null
          recorte_gaspea: string | null
          recorte_taloneira: string | null
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
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pending_value: { Args: { vendor?: string }; Returns: number }
      get_production_counts: {
        Args: { product_types?: string[]; vendors?: string[] }
        Returns: {
          in_production: number
          total: number
        }[]
      }
      get_sales_chart: {
        Args: {
          period: string
          product_filter?: string
          vendor_filter?: string
        }
        Returns: {
          label: string
          vendas: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      marcar_notificacao_lida: { Args: { _id: string }; Returns: undefined }
      marcar_todas_notificacoes_lidas: { Args: never; Returns: number }
      quitar_pedidos_historico: {
        Args: { _motivo: string; _order_ids: string[] }
        Returns: Json
      }
      registrar_alteracoes_pos_entrega: {
        Args: { _descricoes: string[]; _order_id: string }
        Returns: number
      }
      reprovar_comprovante_revendedor: {
        Args: { _comprovante_id: string; _motivo: string }
        Returns: undefined
      }
      saldo_atual_revendedor: { Args: { _vendedor: string }; Returns: number }
      tentar_baixa_automatica: {
        Args: { _admin_id?: string; _vendedor: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "admin_master"
        | "admin_producao"
        | "vendedor"
        | "vendedor_comissao"
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
      app_role: [
        "admin",
        "user",
        "admin_master",
        "admin_producao",
        "vendedor",
        "vendedor_comissao",
      ],
    },
  },
} as const
