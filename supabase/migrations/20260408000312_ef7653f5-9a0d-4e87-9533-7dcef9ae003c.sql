
create table public.custom_options (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  label text not null,
  preco numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.custom_options enable row level security;

create policy "Anyone authenticated can view" on public.custom_options for select to authenticated using (true);
create policy "Admins can insert" on public.custom_options for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can update" on public.custom_options for update to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can delete" on public.custom_options for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role));
