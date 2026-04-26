-- Permitir admin_master inserir comprovantes de revendedor em nome de outros
CREATE POLICY "Admin master envia comprovantes por revendedor"
  ON public.revendedor_comprovantes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_master'::app_role)
    AND status = 'pendente'
    AND enviado_por = auth.uid()
  );

-- Habilitar realtime na tabela de comprovantes pra sincronizar a lista
ALTER TABLE public.revendedor_comprovantes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revendedor_comprovantes;