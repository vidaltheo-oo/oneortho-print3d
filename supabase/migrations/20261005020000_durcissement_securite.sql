-- Durcissement securite (audit 2026-10-05), complement de
-- 20261005010000_rls_verrou_workflow_client.sql.

-- [AUD-03] Un client ne peut plus supprimer sa fiche (cascade sur devis et
-- commandes = perte de tracabilite). Suppression reservee aux admins.
drop policy if exists clients_delete on public.clients;

-- [AUD-04] Chemins Storage limites au prefixe {auth.uid()}/ du client.
drop policy if exists devis_pieces_insert on public.devis_pieces;
create policy devis_pieces_insert on public.devis_pieces
  for insert with check (
    (storage_path is null or split_part(storage_path, '/', 1) = auth.uid()::text)
    and exists (
      select 1 from public.devis d
      join public.clients c on c.id = d.client_id
      where d.id = devis_pieces.devis_id
        and c.user_id = auth.uid()
        and d.statut = 'envoye'
        and not exists (select 1 from public.commandes k where k.devis_id = d.id)
    )
  );

drop policy if exists commandes_insert on public.commandes;
create policy commandes_insert on public.commandes
  for insert with check (
    statut = 'en_attente'
    and (bon_commande_path is null
         or split_part(bon_commande_path, '/', 1) = auth.uid()::text)
    and exists (
      select 1 from public.clients c
      join public.devis d on d.client_id = c.id
      where c.id = commandes.client_id
        and c.user_id = auth.uid()
        and d.id = commandes.devis_id
    )
  );

-- [AUD-06] Bucket stl-files : STL et PDF uniquement, 50 Mo (limite du
-- configurateur).
update storage.buckets
  set allowed_mime_types = array['model/stl', 'application/pdf'],
      file_size_limit = 52428800
  where id = 'stl-files';

-- [AUD-08] search_path fige sur la fonction trigger.
alter function public.set_updated_at() set search_path = public;

-- [AUD-08] TRUNCATE n'est pas soumis a la RLS : retire aux roles API.
revoke truncate on all tables in schema public from anon, authenticated;

-- [AUD-09] Une seule commande par devis.
alter table public.commandes
  add constraint commandes_devis_id_key unique (devis_id);
