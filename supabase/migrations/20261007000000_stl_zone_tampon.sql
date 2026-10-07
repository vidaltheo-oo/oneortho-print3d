-- Zone STL tampon : les fichiers sont telecharges par l'atelier puis supprimes
-- du bucket (l'archivage se fait hors plateforme). La ligne devis_pieces est
-- conservee (tracabilite du devis) ; storage_path reste renseigne pour memoire.
alter table public.devis_pieces
  add column if not exists stl_telecharge_le timestamptz,
  add column if not exists stl_supprime_le timestamptz;

-- Indicateur de capacite du tableau de bord admin. storage.objects n'est pas
-- expose par l'API REST : fonction security definer, reservee aux admins.
-- Le quota Supabase porte sur l'ensemble des buckets, d'ou la somme globale.
create or replace function public.admin_storage_usage()
returns table (stockage_octets bigint, fichiers bigint, base_octets bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select
      coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
      count(*)::bigint,
      pg_database_size(current_database())::bigint
    from storage.objects o;
end;
$$;

revoke all on function public.admin_storage_usage() from public, anon;
grant execute on function public.admin_storage_usage() to authenticated;
