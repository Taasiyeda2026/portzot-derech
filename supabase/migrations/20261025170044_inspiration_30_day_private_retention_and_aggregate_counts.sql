-- Supabase production migration 20261025170044.
-- Anonymize usage totals and remove identifiable classroom data 30 days after creation.
-- Existing daily cron job inspiration-retention continues to call cleanup().

create table if not exists inspiration_private.inspiration_daily_usage (
  activity_date date primary key,
  games_count bigint not null default 0 check (games_count >= 0),
  participants_count bigint not null default 0 check (participants_count >= 0),
  cards_selected_count bigint not null default 0 check (cards_selected_count >= 0),
  updated_at timestamptz not null default now()
);

alter table inspiration_private.inspiration_daily_usage enable row level security;
revoke all on table inspiration_private.inspiration_daily_usage from public, anon, authenticated;

create or replace function inspiration_private.cleanup()
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  game record;
  participants_total bigint;
  selected_total bigint;
  removed_rooms bigint := 0;
begin
  for game in
    select r.id, r.created_at
    from public.inspiration_rooms r
    where r.created_at < now() - interval '30 days'
    order by r.created_at
    for update skip locked
  loop
    select count(*) into participants_total
    from public.inspiration_room_players p
    where p.room_id = game.id;

    select count(*) into selected_total
    from public.inspiration_room_cards c
    where c.room_id = game.id and c.player_id is not null;

    -- Existing foreign keys cascade to participants, room cards, and events.
    delete from public.inspiration_rooms where id = game.id;

    insert into inspiration_private.inspiration_daily_usage
      (activity_date, games_count, participants_count, cards_selected_count)
    values
      ((game.created_at at time zone 'Asia/Jerusalem')::date,
       1, participants_total, selected_total)
    on conflict (activity_date) do update
      set games_count = inspiration_private.inspiration_daily_usage.games_count + excluded.games_count,
          participants_count = inspiration_private.inspiration_daily_usage.participants_count + excluded.participants_count,
          cards_selected_count = inspiration_private.inspiration_daily_usage.cards_selected_count + excluded.cards_selected_count,
          updated_at = now();

    removed_rooms := removed_rooms + 1;
  end loop;

  -- Preserve the existing short-term request-rate history cleanup.
  delete from inspiration_private.rate_limits
  where window_start < now() - interval '1 day';

  return removed_rooms;
end
$function$;

revoke all on function inspiration_private.cleanup() from public, anon, authenticated;
