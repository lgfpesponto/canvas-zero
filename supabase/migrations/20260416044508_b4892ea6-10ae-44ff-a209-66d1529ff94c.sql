
UPDATE ficha_variacoes
SET preco_adicional = CASE nome
  WHEN 'Estilizado em Dinossauro' THEN 50
  WHEN 'Aramado' THEN 40
  WHEN 'Estilizado em Tatu' THEN 40
  WHEN 'Escamado' THEN 20
  WHEN 'Estilizado Duplo' THEN 20
  WHEN 'Vaca Holandesa' THEN 15
  WHEN 'Vaca Pintada' THEN 15
  WHEN 'Estilizado em Avestruz' THEN 10
  ELSE preco_adicional
END
WHERE campo_id IN (
  SELECT id FROM ficha_campos WHERE slug IN ('couro_cano', 'couro_gaspea', 'couro_taloneira')
)
AND nome IN ('Estilizado em Dinossauro', 'Aramado', 'Estilizado em Tatu', 'Escamado', 'Estilizado Duplo', 'Vaca Holandesa', 'Vaca Pintada', 'Estilizado em Avestruz');
