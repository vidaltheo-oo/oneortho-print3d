-- Bon de commande client saisi au checkout (optionnel) :
-- n° de commande du client et chemin du PDF dans le bucket stl-files
-- ({user_id}/bons-commande/{horodatage}-{nom_fichier}).
alter table public.commandes
  add column if not exists ref_client text
    check (ref_client is null or char_length(ref_client) <= 50),
  add column if not exists bon_commande_path text;

-- Les politiques RLS existantes sur commandes (insert par le client proprietaire,
-- lecture admin) couvrent ces colonnes. Le PDF est ecrit sous le prefixe
-- {user_id}/ deja autorise en ecriture client sur stl-files.
-- Si le bucket restreint les types MIME autorises, ajouter application/pdf :
-- update storage.buckets
--   set allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
--   where id = 'stl-files' and allowed_mime_types is not null;
