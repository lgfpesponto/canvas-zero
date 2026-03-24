UPDATE orders o
SET user_id = p.id
FROM profiles p
WHERE o.vendedor = p.nome_completo
  AND o.user_id != p.id;