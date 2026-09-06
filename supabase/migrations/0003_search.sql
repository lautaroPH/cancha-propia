-- Full-text search over the fields a visitor would actually search by.
-- Generated + GIN-indexed so search stays fast without an external search
-- service — revisit only if Postgres full-text genuinely falls short at
-- real directory size (see plan §11).
alter table athlete add column search_vector tsvector
  generated always as (
    to_tsvector('spanish',
      coalesce(full_name, '') || ' ' ||
      coalesce(sport, '') || ' ' ||
      coalesce(discipline, '') || ' ' ||
      coalesce(province, '') || ' ' ||
      coalesce(club, '') || ' ' ||
      coalesce(federation, '')
    )
  ) stored;

create index athlete_search_vector_idx on athlete using gin(search_vector);
