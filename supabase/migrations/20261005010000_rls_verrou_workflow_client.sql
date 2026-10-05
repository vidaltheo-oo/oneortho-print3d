-- Verrouillage du workflow cote client (audit securite 2026-10-05).
-- Avant : un client pouvait modifier/supprimer ses devis, pieces et commandes
-- (statut, montants, reference) via l'API REST, et les creer a n'importe quel
-- statut (ex. devis "accepte", commande "en_production"), contournant la
-- validation admin. Le code client n'utilise que des INSERT sur ces tables.
-- Les politiques *_admin_all (is_admin()) sont inchangees.

drop policy if exists commandes_update on public.commandes;
drop policy if exists commandes_delete on public.commandes;
drop policy if exists devis_update on public.devis;
drop policy if exists devis_delete on public.devis;
drop policy if exists devis_pieces_update on public.devis_pieces;
drop policy if exists devis_pieces_delete on public.devis_pieces;

-- Devis : cree uniquement au statut "envoye" (etape "Nouveau").
drop policy if exists devis_insert on public.devis;
create policy devis_insert on public.devis
  for insert with check (
    statut = 'envoye'
    and exists (
      select 1 from public.clients c
      where c.id = devis.client_id and c.user_id = auth.uid()
    )
  );

-- Pieces : uniquement sur un devis du client encore "envoye" et sans commande
-- (pas d'ajout de pieces apres validation ou passage de commande).
drop policy if exists devis_pieces_insert on public.devis_pieces;
create policy devis_pieces_insert on public.devis_pieces
  for insert with check (
    exists (
      select 1 from public.devis d
      join public.clients c on c.id = d.client_id
      where d.id = devis_pieces.devis_id
        and c.user_id = auth.uid()
        and d.statut = 'envoye'
        and not exists (select 1 from public.commandes k where k.devis_id = d.id)
    )
  );

-- Commandes : statut initial "en_attente", sur un devis du meme client.
drop policy if exists commandes_insert on public.commandes;
create policy commandes_insert on public.commandes
  for insert with check (
    statut = 'en_attente'
    and exists (
      select 1 from public.clients c
      join public.devis d on d.client_id = c.id
      where c.id = commandes.client_id
        and c.user_id = auth.uid()
        and d.id = commandes.devis_id
    )
  );
