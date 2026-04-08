
-- 1. Insert site (Rancho Chique) as vendedor_comissao
INSERT INTO public.user_roles (user_id, role)
VALUES ('9280a3c9-51e2-48ff-ab28-dbda5aaf9f82', 'vendedor_comissao');

-- 2. 7estrivos → admin_master
UPDATE public.user_roles SET role = 'admin_master'
WHERE user_id = '4ae76415-8574-4c6f-8251-4dedf63d2d76';

-- 3. fernanda → admin_producao
UPDATE public.user_roles SET role = 'admin_producao'
WHERE user_id = '893c9c12-0d79-4094-850e-c02dc272c902';

-- 4. Remaining 'user' roles → vendedor
UPDATE public.user_roles SET role = 'vendedor'
WHERE role::text = 'user';
