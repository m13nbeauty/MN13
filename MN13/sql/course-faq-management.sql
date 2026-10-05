CREATE OR REPLACE FUNCTION public.mn13_public_document(source jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('version',1,'updatedAt',source->'updatedAt','pageVisibility',coalesce(source->'pageVisibility','{"courses":true,"diary":true}'::jsonb),'courses',coalesce((select jsonb_agg(c - array['reviewNote','sourceNames','sourceImageFilenames','imageWidth','imageHeight']) from jsonb_array_elements(source->'courses') c where c->'visible'='true'::jsonb and coalesce(source#>>'{pageVisibility,courses}','true')='true'),'[]'::jsonb),'faqs',coalesce((select jsonb_agg(jsonb_build_object('id',f->'id','title',f->'title','answer',f->'answer','visible',true,'sortOrder',f->'sortOrder')) from jsonb_array_elements(coalesce(source->'faqs','[]'::jsonb)) f where f->'visible'='true'::jsonb and coalesce(btrim(f->>'answer'),'')<>'' and coalesce(source#>>'{pageVisibility,courses}','true')='true'),'[]'::jsonb),'journals',coalesce((select jsonb_agg(j - array['reviewNote','sourceNames']) from jsonb_array_elements(source->'journals') j where j->'visible'='true'::jsonb and j->'consent'='true'::jsonb and coalesce(source#>>'{pageVisibility,diary}','true')='true'),'[]'::jsonb));
$function$;
CREATE OR REPLACE FUNCTION public.mn13_save_content(next_document jsonb, expected_revision bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare new_revision bigint;
begin
 if not mn13_private.is_admin() then raise exception 'MN13_ADMIN_REQUIRED' using errcode='42501'; end if;
 if not next_document ? 'faqs' then next_document=jsonb_set(next_document,'{faqs}',coalesce((select document->'faqs' from public.mn13_content where id='main'),'[]'::jsonb));end if;
 if jsonb_typeof(next_document->'faqs') is distinct from 'array' then raise exception 'INVALID_FAQS';end if;
 if exists(select 1 from jsonb_array_elements(next_document->'faqs') f where coalesce(btrim(f->>'id'),'')='' or coalesce(btrim(f->>'title'),'')='' or jsonb_typeof(f->'visible') is distinct from 'boolean' or jsonb_typeof(f->'answer') is distinct from 'string' or jsonb_typeof(f->'sortOrder') is distinct from 'number' or (f->'visible'='true'::jsonb and coalesce(btrim(f->>'answer'),'')='')) then raise exception 'INVALID_FAQ_ENTRY';end if;
 if exists(select f->>'id' from jsonb_array_elements(next_document->'faqs') f group by f->>'id' having count(*)>1) then raise exception 'DUPLICATE_FAQ_ID';end if;
 if next_document->'version' is distinct from '1'::jsonb or jsonb_typeof(next_document->'courses') is distinct from 'array' or jsonb_typeof(next_document->'journals') is distinct from 'array' then raise exception 'INVALID_CONTENT'; end if;
 if exists(select 1 from (select c as entry from jsonb_array_elements(next_document->'courses') c union all select j from jsonb_array_elements(next_document->'journals') j) e where coalesce(btrim(entry->>'id'),'')='' or coalesce(btrim(entry->>'title'),'')='' or jsonb_typeof(entry->'visible') is distinct from 'boolean') then raise exception 'INVALID_ENTRY'; end if;
 if exists(select 1 from jsonb_array_elements(next_document->'journals') j where j->'visible'='true'::jsonb and (j->'consent' is distinct from 'true'::jsonb or coalesce(j->>'beforeImage','')='' or coalesce(j->>'afterImage','')='')) then raise exception 'JOURNAL_CONSENT_REQUIRED'; end if;
 update public.mn13_content set document=next_document,revision=revision+1,updated_at=now() where id='main' and revision=expected_revision returning revision into new_revision;
 if new_revision is null then raise exception 'MN13_VERSION_CONFLICT' using errcode='40001'; end if;
 update public.mn13_public_content set document=public.mn13_public_document(next_document),revision=new_revision,updated_at=now() where id='main';
 if not found then raise exception 'PUBLIC_CONTENT_MISSING';end if;
 return new_revision;
end;
$function$;
update public.mn13_content set document=jsonb_set(document,'{faqs}','[{"id":"faq-1","title":"不知道適合哪堂課，可以先詢問嗎？","answer":"可以。先告訴我們你目前的狀態與最在意的地方，小如如會和你討論適合的保養方向，不需要先選好課程。","visible":true,"sortOrder":0},{"id":"faq-2","title":"第一次到店，會如何安排？","answer":"我們會先了解你的膚況、身體感受與日常習慣，再討論這次想照顧的重點，調整適合你的保養安排。","visible":true,"sortOrder":1},{"id":"faq-3","title":"課程費用什麼時候確認？","answer":"課程內容與費用會在開始前與你確認，確認後再安排保養。也歡迎先透過官方 LINE 詢問。","visible":true,"sortOrder":2},{"id":"faq-4","title":"工作室地址在哪裡？","answer":"目前服務地點位於工作室，採完全預約制。預約成功後，會提供確切地址。","visible":true,"sortOrder":3},{"id":"faq-pending-1","title":"每次服務大約需要多久？","answer":"","visible":false,"sortOrder":4},{"id":"faq-pending-2","title":"課程前需要準備什麼？","answer":"","visible":false,"sortOrder":5},{"id":"faq-pending-3","title":"課程後有哪些注意事項？","answer":"","visible":false,"sortOrder":6},{"id":"faq-pending-4","title":"敏感肌或特殊狀況，可以安排保養嗎？","answer":"","visible":false,"sortOrder":7},{"id":"faq-pending-5","title":"可以直接指定課程嗎？","answer":"","visible":false,"sortOrder":8}]'::jsonb),revision=revision+1,updated_at=now() where id='main' and not document ? 'faqs';
update public.mn13_public_content p set document=public.mn13_public_document(c.document),revision=c.revision,updated_at=now() from public.mn13_content c where p.id=c.id and c.id='main';