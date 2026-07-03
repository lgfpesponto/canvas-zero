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
      admin_assistant_planos: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          tags: string[]
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[]
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_chat_conversations: {
        Row: {
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      atacado_progress_log: {
        Row: {
          enviado_em: string
          erro: string | null
          etapa: string
          http_status: number | null
          id: string
          numero: string
          order_id: string
          response_body: string | null
        }
        Insert: {
          enviado_em?: string
          erro?: string | null
          etapa: string
          http_status?: number | null
          id?: string
          numero: string
          order_id: string
          response_body?: string | null
        }
        Update: {
          enviado_em?: string
          erro?: string | null
          etapa?: string
          http_status?: number | null
          id?: string
          numero?: string
          order_id?: string
          response_body?: string | null
        }
        Relationships: []
      }
      atacado_variacao_sync_log: {
        Row: {
          action: string
          created_at: string
          erro: string | null
          finished_at: string | null
          http_status: number | null
          id: string
          payload: Json
          response_body: string | null
          source_id: string
          source_kind: string
          status: string
          tentativas: number
        }
        Insert: {
          action: string
          created_at?: string
          erro?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          payload?: Json
          response_body?: string | null
          source_id: string
          source_kind: string
          status?: string
          tentativas?: number
        }
        Update: {
          action?: string
          created_at?: string
          erro?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          payload?: Json
          response_body?: string | null
          source_id?: string
          source_kind?: string
          status?: string
          tentativas?: number
        }
        Relationships: []
      }
      bagy_pedido_itens: {
        Row: {
          cor: string | null
          created_at: string
          estoque_produto_id: string | null
          foto_url: string | null
          id: string
          ncm: string | null
          nome_produto: string | null
          order_id_portal: string | null
          payload: Json
          pedido_id: string
          preco_unit: number | null
          quantidade: number
          sku: string | null
          status: string
          tamanho: string | null
          template_id: string | null
          updated_at: string
          variacao_nome: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string
          estoque_produto_id?: string | null
          foto_url?: string | null
          id?: string
          ncm?: string | null
          nome_produto?: string | null
          order_id_portal?: string | null
          payload?: Json
          pedido_id: string
          preco_unit?: number | null
          quantidade?: number
          sku?: string | null
          status?: string
          tamanho?: string | null
          template_id?: string | null
          updated_at?: string
          variacao_nome?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string
          estoque_produto_id?: string | null
          foto_url?: string | null
          id?: string
          ncm?: string | null
          nome_produto?: string | null
          order_id_portal?: string | null
          payload?: Json
          pedido_id?: string
          preco_unit?: number | null
          quantidade?: number
          sku?: string | null
          status?: string
          tamanho?: string | null
          template_id?: string | null
          updated_at?: string
          variacao_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bagy_pedido_itens_order_id_portal_fkey"
            columns: ["order_id_portal"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bagy_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "bagy_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      bagy_pedidos: {
        Row: {
          bagy_created_at: string | null
          bagy_order_id: string
          cliente_doc: string | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_whats: string | null
          created_at: string
          desconto: number | null
          endereco: Json | null
          erro: string | null
          flag: string | null
          frete: number | null
          id: string
          metodo_envio: string | null
          numero_bagy: string
          order_id_portal: string | null
          pagamento: string | null
          payload: Json
          processado_em: string | null
          status_bagy: string
          status_bagy_anterior: string | null
          total: number | null
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          bagy_created_at?: string | null
          bagy_order_id: string
          cliente_doc?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_whats?: string | null
          created_at?: string
          desconto?: number | null
          endereco?: Json | null
          erro?: string | null
          flag?: string | null
          frete?: number | null
          id?: string
          metodo_envio?: string | null
          numero_bagy: string
          order_id_portal?: string | null
          pagamento?: string | null
          payload?: Json
          processado_em?: string | null
          status_bagy: string
          status_bagy_anterior?: string | null
          total?: number | null
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          bagy_created_at?: string | null
          bagy_order_id?: string
          cliente_doc?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_whats?: string | null
          created_at?: string
          desconto?: number | null
          endereco?: Json | null
          erro?: string | null
          flag?: string | null
          frete?: number | null
          id?: string
          metodo_envio?: string | null
          numero_bagy?: string
          order_id_portal?: string | null
          pagamento?: string | null
          payload?: Json
          processado_em?: string | null
          status_bagy?: string
          status_bagy_anterior?: string | null
          total?: number | null
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bagy_pedidos_order_id_portal_fkey"
            columns: ["order_id_portal"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bagy_status_sync_queue: {
        Row: {
          bagy_order_id: string
          created_at: string
          id: string
          nf_numero: string | null
          processado_em: string | null
          target_status: string
          tentativas: number
          tracking_code: string | null
          tracking_url: string | null
          ultimo_erro: string | null
        }
        Insert: {
          bagy_order_id: string
          created_at?: string
          id?: string
          nf_numero?: string | null
          processado_em?: string | null
          target_status: string
          tentativas?: number
          tracking_code?: string | null
          tracking_url?: string | null
          ultimo_erro?: string | null
        }
        Update: {
          bagy_order_id?: string
          created_at?: string
          id?: string
          nf_numero?: string | null
          processado_em?: string | null
          target_status?: string
          tentativas?: number
          tracking_code?: string | null
          tracking_url?: string | null
          ultimo_erro?: string | null
        }
        Relationships: []
      }
      bagy_stock_sync_queue: {
        Row: {
          criado_em: string
          estoque_produto_id: string
          id: string
          novo_saldo: number
          processado_em: string | null
          sku: string
          tentativas: number
          ultimo_erro: string | null
        }
        Insert: {
          criado_em?: string
          estoque_produto_id: string
          id?: string
          novo_saldo: number
          processado_em?: string | null
          sku: string
          tentativas?: number
          ultimo_erro?: string | null
        }
        Update: {
          criado_em?: string
          estoque_produto_id?: string
          id?: string
          novo_saldo?: number
          processado_em?: string | null
          sku?: string
          tentativas?: number
          ultimo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bagy_stock_sync_queue_estoque_produto_id_fkey"
            columns: ["estoque_produto_id"]
            isOneToOne: false
            referencedRelation: "estoque_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      bagy_webhook_log: {
        Row: {
          bagy_order_id: string | null
          erro: string | null
          event: string | null
          id: string
          payload: Json
          payload_hash: string | null
          processed_em: string | null
          received_at: string
          signature: string | null
        }
        Insert: {
          bagy_order_id?: string | null
          erro?: string | null
          event?: string | null
          id?: string
          payload: Json
          payload_hash?: string | null
          processed_em?: string | null
          received_at?: string
          signature?: string | null
        }
        Update: {
          bagy_order_id?: string | null
          erro?: string | null
          event?: string | null
          id?: string
          payload?: Json
          payload_hash?: string | null
          processed_em?: string | null
          received_at?: string
          signature?: string | null
        }
        Relationships: []
      }
      comprovante_notificacoes: {
        Row: {
          comprovante_id: string
          created_at: string
          data_pagamento: string | null
          descricao: string
          id: string
          lida: boolean
          lida_em: string | null
          motivo: string | null
          tipo: string
          valor: number | null
          vendedor: string
        }
        Insert: {
          comprovante_id: string
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          motivo?: string | null
          tipo: string
          valor?: number | null
          vendedor: string
        }
        Update: {
          comprovante_id?: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          motivo?: string | null
          tipo?: string
          valor?: number | null
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "comprovante_notificacoes_comprovante_id_fkey"
            columns: ["comprovante_id"]
            isOneToOne: false
            referencedRelation: "revendedor_comprovantes"
            referencedColumns: ["id"]
          },
        ]
      }
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
      estoque_produtos: {
        Row: {
          ativo: boolean
          bagy_sync_at: string | null
          bagy_sync_erro: string | null
          bagy_sync_status: string | null
          bagy_variation_id: string | null
          created_at: string
          criado_por: string | null
          ficha_snapshot: Json
          foto_url: string | null
          id: string
          nome: string
          preco: number
          quantidade: number
          sku_base: string
          tamanho: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bagy_sync_at?: string | null
          bagy_sync_erro?: string | null
          bagy_sync_status?: string | null
          bagy_variation_id?: string | null
          created_at?: string
          criado_por?: string | null
          ficha_snapshot?: Json
          foto_url?: string | null
          id?: string
          nome: string
          preco?: number
          quantidade?: number
          sku_base: string
          tamanho: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bagy_sync_at?: string | null
          bagy_sync_erro?: string | null
          bagy_sync_status?: string | null
          bagy_variation_id?: string | null
          created_at?: string
          criado_por?: string | null
          ficha_snapshot?: Json
          foto_url?: string | null
          id?: string
          nome?: string
          preco?: number
          quantidade?: number
          sku_base?: string
          tamanho?: string
          updated_at?: string
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
      internal_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      nfe_config: {
        Row: {
          ambiente: number
          bairro: string
          cep: string
          certificado_nome: string | null
          certificado_path: string | null
          certificado_validade: string | null
          cnae: string | null
          cnpj: string
          cod_municipio: string
          complemento: string | null
          created_at: string
          crt: number
          csc: string | null
          csc_id: string | null
          id: string
          inscricao_estadual: string
          inscricao_municipal: string | null
          logradouro: string
          municipio: string
          nome_fantasia: string | null
          numero: string
          proximo_numero: number
          razao_social: string
          regime_tributario: number
          serie: number
          telefone: string | null
          uf: string
          updated_at: string
        }
        Insert: {
          ambiente?: number
          bairro: string
          cep: string
          certificado_nome?: string | null
          certificado_path?: string | null
          certificado_validade?: string | null
          cnae?: string | null
          cnpj: string
          cod_municipio: string
          complemento?: string | null
          created_at?: string
          crt?: number
          csc?: string | null
          csc_id?: string | null
          id?: string
          inscricao_estadual: string
          inscricao_municipal?: string | null
          logradouro: string
          municipio: string
          nome_fantasia?: string | null
          numero: string
          proximo_numero?: number
          razao_social: string
          regime_tributario?: number
          serie?: number
          telefone?: string | null
          uf: string
          updated_at?: string
        }
        Update: {
          ambiente?: number
          bairro?: string
          cep?: string
          certificado_nome?: string | null
          certificado_path?: string | null
          certificado_validade?: string | null
          cnae?: string | null
          cnpj?: string
          cod_municipio?: string
          complemento?: string | null
          created_at?: string
          crt?: number
          csc?: string | null
          csc_id?: string | null
          id?: string
          inscricao_estadual?: string
          inscricao_municipal?: string | null
          logradouro?: string
          municipio?: string
          nome_fantasia?: string | null
          numero?: string
          proximo_numero?: number
          razao_social?: string
          regime_tributario?: number
          serie?: number
          telefone?: string | null
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      nfe_eventos: {
        Row: {
          created_at: string
          id: string
          justificativa: string | null
          nota_id: string
          payload: Json
          protocolo: string | null
          status: string | null
          tipo: string
          xml: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          justificativa?: string | null
          nota_id: string
          payload?: Json
          protocolo?: string | null
          status?: string | null
          tipo: string
          xml?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          justificativa?: string | null
          nota_id?: string
          payload?: Json
          protocolo?: string | null
          status?: string | null
          tipo?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_eventos_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nfe_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_itens: {
        Row: {
          aliq_cofins: number | null
          aliq_icms: number | null
          aliq_pis: number | null
          cest: string | null
          cfop: string | null
          codigo: string | null
          created_at: string
          cst_cofins: string | null
          cst_icms: string | null
          cst_pis: string | null
          descricao: string
          id: string
          ncm: string | null
          nota_id: string
          ordem: number
          origem_mercadoria: number | null
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_pis?: number | null
          cest?: string | null
          cfop?: string | null
          codigo?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_pis?: string | null
          descricao: string
          id?: string
          ncm?: string | null
          nota_id: string
          ordem?: number
          origem_mercadoria?: number | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_pis?: number | null
          cest?: string | null
          cfop?: string | null
          codigo?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_pis?: string | null
          descricao?: string
          id?: string
          ncm?: string | null
          nota_id?: string
          ordem?: number
          origem_mercadoria?: number | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_itens_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "nfe_notas"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_notas: {
        Row: {
          ambiente: number
          chave_acesso: string | null
          created_at: string
          danfe_pdf_url: string | null
          data_autorizacao: string | null
          data_emissao: string
          destinatario_snapshot: Json
          id: string
          modelo: number
          motivo_rejeicao: string | null
          natureza_operacao: string
          numero: number
          observacoes: string | null
          pedido_id: string | null
          protocolo: string | null
          serie: number
          status: string
          updated_at: string
          valor_produtos: number
          valor_total: number
          xml_assinado: string | null
          xml_autorizado: string | null
        }
        Insert: {
          ambiente: number
          chave_acesso?: string | null
          created_at?: string
          danfe_pdf_url?: string | null
          data_autorizacao?: string | null
          data_emissao?: string
          destinatario_snapshot?: Json
          id?: string
          modelo?: number
          motivo_rejeicao?: string | null
          natureza_operacao?: string
          numero: number
          observacoes?: string | null
          pedido_id?: string | null
          protocolo?: string | null
          serie: number
          status?: string
          updated_at?: string
          valor_produtos?: number
          valor_total?: number
          xml_assinado?: string | null
          xml_autorizado?: string | null
        }
        Update: {
          ambiente?: number
          chave_acesso?: string | null
          created_at?: string
          danfe_pdf_url?: string | null
          data_autorizacao?: string | null
          data_emissao?: string
          destinatario_snapshot?: Json
          id?: string
          modelo?: number
          motivo_rejeicao?: string | null
          natureza_operacao?: string
          numero?: number
          observacoes?: string | null
          pedido_id?: string | null
          protocolo?: string | null
          serie?: number
          status?: string
          updated_at?: string
          valor_produtos?: number
          valor_total?: number
          xml_assinado?: string | null
          xml_autorizado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_notas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_tributacao_referencias: {
        Row: {
          aliq_cofins: number | null
          aliq_icms: number | null
          aliq_pis: number | null
          cest: string | null
          cfop_padrao: string | null
          created_at: string
          cst_cofins: string | null
          cst_icms: string | null
          cst_pis: string | null
          descricao: string | null
          id: string
          ncm: string | null
          origem_mercadoria: number | null
          referencia: string
          unidade_comercial: string | null
          updated_at: string
        }
        Insert: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_pis?: number | null
          cest?: string | null
          cfop_padrao?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_pis?: string | null
          descricao?: string | null
          id?: string
          ncm?: string | null
          origem_mercadoria?: number | null
          referencia: string
          unidade_comercial?: string | null
          updated_at?: string
        }
        Update: {
          aliq_cofins?: number | null
          aliq_icms?: number | null
          aliq_pis?: number | null
          cest?: string | null
          cfop_padrao?: string | null
          created_at?: string
          cst_cofins?: string | null
          cst_icms?: string | null
          cst_pis?: string | null
          descricao?: string | null
          id?: string
          ncm?: string | null
          origem_mercadoria?: number | null
          referencia?: string
          unidade_comercial?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_ajuste_solicitacoes: {
        Row: {
          created_at: string
          created_by: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          motivo: string
          numero: string
          order_id: string
          resposta_admin: string | null
          status: string
          valor_atual: number
          valor_solicitado: number
          vendedor: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo: string
          numero: string
          order_id: string
          resposta_admin?: string | null
          status?: string
          valor_atual?: number
          valor_solicitado: number
          vendedor: string
        }
        Update: {
          created_at?: string
          created_by?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo?: string
          numero?: string
          order_id?: string
          resposta_admin?: string | null
          status?: string
          valor_atual?: number
          valor_solicitado?: number
          vendedor?: string
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
      order_status_changes: {
        Row: {
          changed_hora: string | null
          changed_on: string
          id: string
          order_id: string
          status: string
          usuario: string | null
        }
        Insert: {
          changed_hora?: string | null
          changed_on: string
          id?: string
          order_id: string
          status: string
          usuario?: string | null
        }
        Update: {
          changed_hora?: string | null
          changed_on?: string
          id?: string
          order_id?: string
          status?: string
          usuario?: string | null
        }
        Relationships: []
      }
      order_templates: {
        Row: {
          created_at: string
          form_data: Json
          foto_url: string | null
          genero: string | null
          id: string
          nome: string
          seen: boolean
          sent_by: string | null
          sent_by_name: string | null
          sku: string | null
          tamanhos_skus: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          form_data?: Json
          foto_url?: string | null
          genero?: string | null
          id?: string
          nome: string
          seen?: boolean
          sent_by?: string | null
          sent_by_name?: string | null
          sku?: string | null
          tamanhos_skus?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          form_data?: Json
          foto_url?: string | null
          genero?: string | null
          id?: string
          nome?: string
          seen?: boolean
          sent_by?: string | null
          sent_by_name?: string | null
          sku?: string | null
          tamanhos_skus?: Json
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
          bagy_last_sync_at: string | null
          bagy_last_sync_error: string | null
          bagy_last_sync_status: string | null
          bagy_order_id: string | null
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
          cliente_cpf_cnpj: string | null
          cliente_whatsapp: string | null
          conferido: boolean
          conferido_em: string | null
          conferido_por: string | null
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
          estoque_baixado: boolean
          estoque_produto_id: string | null
          extra_detalhes: Json | null
          ficha_snapshot: Json | null
          forma: string | null
          forma_pagamento: string | null
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
          nome_produto_estoque: string | null
          numero: string
          numero_pedido_bota: string | null
          observacao: string
          personalizacao_bordado: string
          personalizacao_nome: string
          pintura: string | null
          pintura_desc: string | null
          preco: number
          preco_anterior: number | null
          preco_congelado: boolean
          preco_migrado_v2: boolean
          preco_regra_versao: number | null
          quantidade: number
          quantidade_anterior: number | null
          recorte_cano: string | null
          recorte_gaspea: string | null
          recorte_taloneira: string | null
          sku_estoque: string | null
          sob_medida: boolean
          sob_medida_desc: string | null
          solado: string
          status: string
          strass_qtd: number | null
          tamanho: string
          tem_laser: boolean
          template_nome: string | null
          template_sku: string | null
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
          bagy_last_sync_at?: string | null
          bagy_last_sync_error?: string | null
          bagy_last_sync_status?: string | null
          bagy_order_id?: string | null
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
          cliente_cpf_cnpj?: string | null
          cliente_whatsapp?: string | null
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
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
          estoque_baixado?: boolean
          estoque_produto_id?: string | null
          extra_detalhes?: Json | null
          ficha_snapshot?: Json | null
          forma?: string | null
          forma_pagamento?: string | null
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
          nome_produto_estoque?: string | null
          numero: string
          numero_pedido_bota?: string | null
          observacao?: string
          personalizacao_bordado?: string
          personalizacao_nome?: string
          pintura?: string | null
          pintura_desc?: string | null
          preco?: number
          preco_anterior?: number | null
          preco_congelado?: boolean
          preco_migrado_v2?: boolean
          preco_regra_versao?: number | null
          quantidade?: number
          quantidade_anterior?: number | null
          recorte_cano?: string | null
          recorte_gaspea?: string | null
          recorte_taloneira?: string | null
          sku_estoque?: string | null
          sob_medida?: boolean
          sob_medida_desc?: string | null
          solado?: string
          status?: string
          strass_qtd?: number | null
          tamanho?: string
          tem_laser?: boolean
          template_nome?: string | null
          template_sku?: string | null
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
          bagy_last_sync_at?: string | null
          bagy_last_sync_error?: string | null
          bagy_last_sync_status?: string | null
          bagy_order_id?: string | null
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
          cliente_cpf_cnpj?: string | null
          cliente_whatsapp?: string | null
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
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
          estoque_baixado?: boolean
          estoque_produto_id?: string | null
          extra_detalhes?: Json | null
          ficha_snapshot?: Json | null
          forma?: string | null
          forma_pagamento?: string | null
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
          nome_produto_estoque?: string | null
          numero?: string
          numero_pedido_bota?: string | null
          observacao?: string
          personalizacao_bordado?: string
          personalizacao_nome?: string
          pintura?: string | null
          pintura_desc?: string | null
          preco?: number
          preco_anterior?: number | null
          preco_congelado?: boolean
          preco_migrado_v2?: boolean
          preco_regra_versao?: number | null
          quantidade?: number
          quantidade_anterior?: number | null
          recorte_cano?: string | null
          recorte_gaspea?: string | null
          recorte_taloneira?: string | null
          sku_estoque?: string | null
          sob_medida?: boolean
          sob_medida_desc?: string | null
          solado?: string
          status?: string
          strass_qtd?: number | null
          tamanho?: string
          tem_laser?: boolean
          template_nome?: string | null
          template_sku?: string | null
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
      pdf_snapshots: {
        Row: {
          arquivo_kb: number | null
          filtros: Json
          gerado_em: string
          gerado_por: string | null
          gerado_por_nome: string | null
          id: string
          nome_arquivo: string | null
          order_ids: string[]
          storage_path: string | null
          tipo: string
          totais: Json
        }
        Insert: {
          arquivo_kb?: number | null
          filtros?: Json
          gerado_em?: string
          gerado_por?: string | null
          gerado_por_nome?: string | null
          id?: string
          nome_arquivo?: string | null
          order_ids?: string[]
          storage_path?: string | null
          tipo: string
          totais?: Json
        }
        Update: {
          arquivo_kb?: number | null
          filtros?: Json
          gerado_em?: string
          gerado_por?: string | null
          gerado_por_nome?: string | null
          id?: string
          nome_arquivo?: string | null
          order_ids?: string[]
          storage_path?: string | null
          tipo?: string
          totais?: Json
        }
        Relationships: []
      }
      preco_mudanca_aplicacoes: {
        Row: {
          created_at: string
          id: string
          mudanca_id: string
          order_id: string
          preco_antes_pedido: number | null
          preco_depois_pedido: number | null
          qtd_aplicada: number
          valor_total_delta: number
          valor_unit_delta: number
        }
        Insert: {
          created_at?: string
          id?: string
          mudanca_id: string
          order_id: string
          preco_antes_pedido?: number | null
          preco_depois_pedido?: number | null
          qtd_aplicada?: number
          valor_total_delta?: number
          valor_unit_delta?: number
        }
        Update: {
          created_at?: string
          id?: string
          mudanca_id?: string
          order_id?: string
          preco_antes_pedido?: number | null
          preco_depois_pedido?: number | null
          qtd_aplicada?: number
          valor_total_delta?: number
          valor_unit_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "preco_mudanca_aplicacoes_mudanca_id_fkey"
            columns: ["mudanca_id"]
            isOneToOne: false
            referencedRelation: "preco_mudancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preco_mudanca_aplicacoes_mudanca_id_fkey"
            columns: ["mudanca_id"]
            isOneToOne: false
            referencedRelation: "vw_preco_mudancas"
            referencedColumns: ["id"]
          },
        ]
      }
      preco_mudancas: {
        Row: {
          aplicar_em: string | null
          applied_at: string | null
          campo_slug: string | null
          categoria_slug: string | null
          created_at: string
          created_by: string | null
          data_corte: string
          delta: number
          error_message: string | null
          escopo: string
          id: string
          observacao: string | null
          pedidos_ajustados: number
          preco_antes: number
          preco_depois: number
          status: string
          target_id: string
          target_label: string
          tipo: string
          valor_total_compensado: number
        }
        Insert: {
          aplicar_em?: string | null
          applied_at?: string | null
          campo_slug?: string | null
          categoria_slug?: string | null
          created_at?: string
          created_by?: string | null
          data_corte?: string
          delta?: number
          error_message?: string | null
          escopo: string
          id?: string
          observacao?: string | null
          pedidos_ajustados?: number
          preco_antes?: number
          preco_depois?: number
          status?: string
          target_id: string
          target_label?: string
          tipo: string
          valor_total_compensado?: number
        }
        Update: {
          aplicar_em?: string | null
          applied_at?: string | null
          campo_slug?: string | null
          categoria_slug?: string | null
          created_at?: string
          created_by?: string | null
          data_corte?: string
          delta?: number
          error_message?: string | null
          escopo?: string
          id?: string
          observacao?: string | null
          pedidos_ajustados?: number
          preco_antes?: number
          preco_depois?: number
          status?: string
          target_id?: string
          target_label?: string
          tipo?: string
          valor_total_compensado?: number
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
          nome_loja: string | null
          nome_usuario: string
          telefone: string
          telefone_loja: string | null
          verificado: boolean
        }
        Insert: {
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id: string
          nome_completo?: string
          nome_loja?: string | null
          nome_usuario: string
          telefone?: string
          telefone_loja?: string | null
          verificado?: boolean
        }
        Update: {
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          nome_loja?: string | null
          nome_usuario?: string
          telefone?: string
          telefone_loja?: string | null
          verificado?: boolean
        }
        Relationships: []
      }
      regata_stock: {
        Row: {
          cor_bordado: string
          cor_tecido: string
          desenho_bordado: string
          id: string
          quantidade: number
        }
        Insert: {
          cor_bordado?: string
          cor_tecido: string
          desenho_bordado: string
          id?: string
          quantidade?: number
        }
        Update: {
          cor_bordado?: string
          cor_tecido?: string
          desenho_bordado?: string
          id?: string
          quantidade?: number
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
      system_announcements: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          mensagem: string | null
          scheduled_at: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mensagem?: string | null
          scheduled_at: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          mensagem?: string | null
          scheduled_at?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_counters: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      system_flags: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: boolean
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: boolean
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: boolean
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
      vw_auditoria_alteracoes: {
        Row: {
          afetou_valor: boolean | null
          cliente: string | null
          data: string | null
          descricao: string | null
          detalhes: Json | null
          hora: string | null
          id: string | null
          justificativa: string | null
          numero: string | null
          order_id: string | null
          status_atual: string | null
          tipo: string | null
          ts: string | null
          usuario: string | null
          vendedor: string | null
        }
        Relationships: []
      }
      vw_preco_mudancas: {
        Row: {
          aplicar_em: string | null
          applied_at: string | null
          campo_slug: string | null
          categoria_slug: string | null
          created_at: string | null
          created_by: string | null
          criado_por_nome: string | null
          data_corte: string | null
          delta: number | null
          error_message: string | null
          escopo: string | null
          id: string | null
          observacao: string | null
          pedidos_ajustados: number | null
          preco_antes: number | null
          preco_depois: number | null
          status: string | null
          target_id: string | null
          target_label: string | null
          tipo: string | null
          valor_total_compensado: number | null
        }
        Relationships: []
      }
      vw_revendedor_saldo: {
        Row: {
          saldo_disponivel: number | null
          total_ajustes: number | null
          total_estornos: number | null
          total_recebido: number | null
          total_utilizado: number | null
          total_utilizado_bruto: number | null
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
      aplicar_mudanca_preco:
        | {
            Args: {
              _aplicar_em?: string
              _data_corte?: string
              _escopo: string
              _observacao?: string
              _preco_depois: number
              _target_id: string
              _tipo: string
            }
            Returns: Json
          }
        | {
            Args: {
              _aplicar_em?: string
              _data_corte?: string
              _escopo: string
              _modo?: string
              _observacao?: string
              _preco_depois: number
              _target_id: string
              _tipo: string
            }
            Returns: Json
          }
      aplicar_mudancas_futuras_pendentes: { Args: never; Returns: number }
      aprovar_comprovante_revendedor: {
        Args: { _comprovante_id: string }
        Returns: Json
      }
      bagy_enqueue_status: {
        Args: {
          _bagy_order_id: string
          _target_status: string
          _tracking_code?: string
          _tracking_url?: string
        }
        Returns: string
      }
      bordado_baixar_pedido: {
        Args: {
          _justificativa?: string
          _novo_status: string
          _order_id: string
        }
        Returns: Json
      }
      bump_preco_regra_versao: { Args: never; Returns: number }
      comprar_estoque:
        | { Args: { _items: Json }; Returns: undefined }
        | {
            Args: {
              _cliente: string
              _items: Json
              _numero_pedido: string
              _vendedor: string
              _whatsapp: string
            }
            Returns: Json
          }
      comprar_estoque_bagy:
        | {
            Args: {
              _bagy_order_id: string
              _cliente: string
              _items: Json
              _numero_pedido: string
              _user_id: string
              _vendedor: string
              _whatsapp: string
            }
            Returns: Json
          }
        | {
            Args: {
              _bagy_created_at?: string
              _bagy_order_id: string
              _cliente: string
              _cpf_cnpj?: string
              _forma_pagamento?: string
              _items: Json
              _numero_pedido: string
              _user_id: string
              _vendedor: string
              _whatsapp: string
            }
            Returns: Json
          }
      criar_ajuste_solicitacao: {
        Args: { _motivo: string; _order_id: string; _valor_solicitado: number }
        Returns: string
      }
      criar_estoque_produto: {
        Args: {
          _ficha_snapshot?: Json
          _order_id: string
          _override_foto?: string
          _override_nome?: string
          _override_preco?: number
          _qtd_override?: number
          _tamanho_override?: string
        }
        Returns: string
      }
      current_user_nome_completo: { Args: never; Returns: string }
      decidir_ajuste_solicitacao: {
        Args: { _aprovar: boolean; _id: string; _resposta?: string }
        Returns: Json
      }
      decrement_regata_stock: { Args: { stock_id: string }; Returns: undefined }
      decrement_stock: { Args: { stock_id: string }; Returns: undefined }
      descartar_comprovantes_historico: {
        Args: { _ids: string[]; _motivo: string }
        Returns: Json
      }
      devolver_estoque_pedido: {
        Args: { _extra_detalhes: Json }
        Returns: Json
      }
      estornar_baixa_revendedor: {
        Args: { _baixa_id: string; _motivo: string }
        Returns: undefined
      }
      excluir_estoque_produto: { Args: { _produto_id: string }; Returns: Json }
      find_order_by_id_suffix: {
        Args: { suffix: string }
        Returns: {
          acessorios: string
          adicional_desc: string | null
          adicional_valor: number | null
          alteracoes: Json
          bagy_last_sync_at: string | null
          bagy_last_sync_error: string | null
          bagy_last_sync_status: string | null
          bagy_order_id: string | null
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
          cliente_cpf_cnpj: string | null
          cliente_whatsapp: string | null
          conferido: boolean
          conferido_em: string | null
          conferido_por: string | null
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
          estoque_baixado: boolean
          estoque_produto_id: string | null
          extra_detalhes: Json | null
          ficha_snapshot: Json | null
          forma: string | null
          forma_pagamento: string | null
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
          nome_produto_estoque: string | null
          numero: string
          numero_pedido_bota: string | null
          observacao: string
          personalizacao_bordado: string
          personalizacao_nome: string
          pintura: string | null
          pintura_desc: string | null
          preco: number
          preco_anterior: number | null
          preco_congelado: boolean
          preco_migrado_v2: boolean
          preco_regra_versao: number | null
          quantidade: number
          quantidade_anterior: number | null
          recorte_cano: string | null
          recorte_gaspea: string | null
          recorte_taloneira: string | null
          sku_estoque: string | null
          sob_medida: boolean
          sob_medida_desc: string | null
          solado: string
          status: string
          strass_qtd: number | null
          tamanho: string
          tem_laser: boolean
          template_nome: string | null
          template_sku: string | null
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
      find_orders_by_status_change: {
        Args: { _ate: string; _de: string; _status: string[] }
        Returns: string[]
      }
      find_template_by_sku: { Args: { _sku: string }; Returns: string }
      get_auditoria_alteracoes: {
        Args: {
          _ate?: string
          _busca?: string
          _de?: string
          _limit?: number
          _numero?: string
          _offset?: number
          _tipos?: string[]
          _usuario?: string
          _vendedor?: string
        }
        Returns: {
          afetou_valor: boolean | null
          cliente: string | null
          data: string | null
          descricao: string | null
          detalhes: Json | null
          hora: string | null
          id: string | null
          justificativa: string | null
          numero: string | null
          order_id: string | null
          status_atual: string | null
          tipo: string | null
          ts: string | null
          usuario: string | null
          vendedor: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "vw_auditoria_alteracoes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_auditoria_alteracoes_count: {
        Args: {
          _ate?: string
          _busca?: string
          _de?: string
          _numero?: string
          _tipos?: string[]
          _usuario?: string
          _vendedor?: string
        }
        Returns: number
      }
      get_orders_totals: {
        Args: {
          _conferido?: string
          _date_from?: string
          _date_to?: string
          _ids_mudou?: string[]
          _produtos?: string[]
          _search?: string
          _status?: string[]
          _vendedores?: string[]
        }
        Returns: {
          total_pedidos: number
          total_produtos: number
          valor_total: number
        }[]
      }
      get_pending_value: { Args: { vendor?: string }; Returns: number }
      get_preco_regra_versao: { Args: never; Returns: number }
      get_production_counts: {
        Args: { product_types?: string[]; vendors?: string[] }
        Returns: {
          in_production: number
          total: number
        }[]
      }
      get_public_tracking: { Args: { _id: string }; Returns: Json }
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
      get_vendedores_distinct: { Args: never; Returns: string[] }
      has_nfe_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      list_bordado_usuarios: { Args: never; Returns: string[] }
      list_profiles_minimal: {
        Args: never
        Returns: {
          id: string
          nome_completo: string
          nome_usuario: string
        }[]
      }
      marcar_comprovante_notificacao_lida: {
        Args: { _id: string }
        Returns: undefined
      }
      marcar_comprovante_utilizado: {
        Args: { _comprovante_id: string; _motivo: string }
        Returns: Json
      }
      marcar_notificacao_lida: { Args: { _id: string }; Returns: undefined }
      marcar_pedidos_como_cobrado: {
        Args: { _order_ids: string[]; _origem?: string }
        Returns: Json
      }
      marcar_todas_comprovante_notificacoes_lidas: {
        Args: never
        Returns: undefined
      }
      marcar_todas_notificacoes_lidas: { Args: never; Returns: number }
      montagem_baixar_pedido: { Args: { _order_id: string }; Returns: Json }
      montagem_marcar_erro: {
        Args: { _destino: string; _motivo?: string; _order_id: string }
        Returns: Json
      }
      parse_historico_date: { Args: { _data: string }; Returns: string }
      processar_baixas_automaticas_geral: { Args: never; Returns: Json }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
        | "bordado"
        | "montagem"
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
        "bordado",
        "montagem",
      ],
    },
  },
} as const
