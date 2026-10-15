begin;

alter table public.performances
  add column if not exists city_key text not null default 'daejeon';

create index if not exists performances_city_key_idx on public.performances (city_key);

alter table public.performances drop constraint if exists performances_title_key;
alter table public.performances drop constraint if exists performances_title_unique;
alter table public.performances drop constraint if exists performances_title_city_key_key;
alter table public.performances
  add constraint performances_title_city_key_key unique (title, city_key);

alter table public.hero_slides
  add column if not exists city_key text not null default 'daejeon';

create index if not exists hero_slides_city_key_idx on public.hero_slides (city_key);
create index if not exists tour_spots_areacode_idx on public.tour_spots (areacode);
create index if not exists tour_festivals_areacode_idx on public.tour_festivals (areacode);

commit;
