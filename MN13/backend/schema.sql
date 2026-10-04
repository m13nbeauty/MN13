create schema if not exists mn13_private;
revoke all on schema mn13_private from public, anon;
grant usage on schema mn13_private to authenticated;
create function mn13_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()) and lower(email)='m13nbeauty@gmail.com' and email_confirmed_at is not null);
$$;
revoke all on function mn13_private.is_admin() from public,anon;
grant execute on function mn13_private.is_admin() to authenticated;
create table public.mn13_content(id text primary key check(id='main'), document jsonb not null, revision bigint not null default 1, updated_at timestamptz not null default now());
create table public.mn13_public_content(id text primary key check(id='main'), document jsonb not null, revision bigint not null default 1, updated_at timestamptz not null default now());
alter table public.mn13_content enable row level security;
alter table public.mn13_public_content enable row level security;
revoke all on public.mn13_content,public.mn13_public_content from anon,authenticated;
grant select,update on public.mn13_content to authenticated;
grant select on public.mn13_public_content to anon,authenticated;
grant update on public.mn13_public_content to authenticated;
create policy mn13_admin_read on public.mn13_content for select to authenticated using ((select mn13_private.is_admin()));
create policy mn13_admin_update on public.mn13_content for update to authenticated using ((select mn13_private.is_admin())) with check ((select mn13_private.is_admin()));
create policy mn13_public_read on public.mn13_public_content for select to anon,authenticated using(true);
create policy mn13_public_update on public.mn13_public_content for update to authenticated using ((select mn13_private.is_admin())) with check ((select mn13_private.is_admin()));
create function public.mn13_public_document(source jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('version',1,'updatedAt',source->'updatedAt','courses',coalesce((select jsonb_agg(c - array['reviewNote','sourceNames','sourceImageFilenames','imageWidth','imageHeight']) from jsonb_array_elements(source->'courses') c where c->'visible'='true'::jsonb),'[]'::jsonb),'journals',coalesce((select jsonb_agg(j - array['reviewNote','sourceNames']) from jsonb_array_elements(source->'journals') j where j->'visible'='true'::jsonb and j->'consent'='true'::jsonb),'[]'::jsonb));
$$;
revoke all on function public.mn13_public_document(jsonb) from public,anon;
grant execute on function public.mn13_public_document(jsonb) to authenticated;
create function public.mn13_save_content(next_document jsonb, expected_revision bigint) returns bigint language plpgsql security invoker set search_path='' as $$
declare new_revision bigint;
begin
 if not mn13_private.is_admin() then raise exception 'MN13_ADMIN_REQUIRED' using errcode='42501'; end if;
 if next_document->'version' is distinct from '1'::jsonb or jsonb_typeof(next_document->'courses') is distinct from 'array' or jsonb_typeof(next_document->'journals') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
 if exists(select 1 from (select c as entry from jsonb_array_elements(next_document->'courses') c union all select j from jsonb_array_elements(next_document->'journals') j) e where coalesce(btrim(entry->>'id'),'')='' or coalesce(btrim(entry->>'title'),'')='' or jsonb_typeof(entry->'visible') is distinct from 'boolean') then raise exception 'INVALID_ENTRY'; end if;
 if exists(select 1 from jsonb_array_elements(next_document->'journals') j where j->'visible'='true'::jsonb and (j->'consent' is distinct from 'true'::jsonb or coalesce(j->>'beforeImage','')='' or coalesce(j->>'afterImage','')='')) then raise exception 'JOURNAL_CONSENT_REQUIRED'; end if;
 update public.mn13_content set document=next_document,revision=revision+1,updated_at=now() where id='main' and revision=expected_revision returning revision into new_revision;
 if new_revision is null then raise exception 'MN13_VERSION_CONFLICT' using errcode='40001'; end if;
 update public.mn13_public_content set document=public.mn13_public_document(next_document),revision=new_revision,updated_at=now() where id='main';
 if not found then raise exception 'PUBLIC_CONTENT_MISSING';end if;
 return new_revision;
end;
$$;
revoke all on function public.mn13_save_content(jsonb,bigint) from public,anon;
grant execute on function public.mn13_save_content(jsonb,bigint) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mn13-media','mn13-media',true,8388608,array['image/png','image/jpeg','image/webp']);
create policy mn13_media_insert on storage.objects for insert to authenticated with check(bucket_id='mn13-media' and (select mn13_private.is_admin()));
create policy mn13_media_admin_read on storage.objects for select to authenticated using(bucket_id='mn13-media' and (select mn13_private.is_admin()));
