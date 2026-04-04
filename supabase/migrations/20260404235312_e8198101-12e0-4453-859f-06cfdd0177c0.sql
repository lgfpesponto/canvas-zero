
-- Remove the old unique constraint that only considers (cor_tira, tipo_metal)
ALTER TABLE public.gravata_stock DROP CONSTRAINT IF EXISTS gravata_stock_cor_tira_tipo_metal_key;

-- Create new unique index that includes cor_brilho (using COALESCE for NULL handling)
CREATE UNIQUE INDEX gravata_stock_unique_variation 
ON public.gravata_stock (cor_tira, tipo_metal, COALESCE(cor_brilho, ''));
