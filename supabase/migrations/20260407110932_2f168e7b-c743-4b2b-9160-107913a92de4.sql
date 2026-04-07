DELETE FROM orders WHERE id IN (
  'bfeaa9e0-1db4-4b7a-954f-b01c75a8b793',
  '8ba40cbf-394d-411f-9aa4-f9c1937783f3',
  'b8a766f7-71f0-43d6-8298-28d8db4fd253',
  '8f068a5a-ea8d-4db0-8449-6642f5b10c91'
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_numero_unique ON orders (numero);