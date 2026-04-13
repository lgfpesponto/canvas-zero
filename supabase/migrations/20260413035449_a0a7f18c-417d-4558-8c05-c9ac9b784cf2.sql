
-- Move Costura Atrás from Pesponto to Solados category (matches OrderPage layout)
UPDATE ficha_campos 
SET categoria_id = '5ae50814-d834-46bd-9d48-543b514ab485', ordem = 5
WHERE id = '805e01a6-7ac3-4979-8958-5b7ff58add24';
