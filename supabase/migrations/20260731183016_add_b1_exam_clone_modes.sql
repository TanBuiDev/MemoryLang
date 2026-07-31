create or replace function public.create_b1_exam(
  p_request_id uuid,
  p_title text,
  p_description text,
  p_access_tier text,
  p_default_time_minutes integer,
  p_initialization_mode text,
  p_source_exam_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_exam_id uuid;
  v_exam_id uuid := pg_catalog.gen_random_uuid();
  v_exam_source_key text;
  v_resource_id uuid;
  v_resource_source_key text;
  v_section_source_key text;
  v_question_source_key text;
  v_resource_payload jsonb;
  v_blank_section record;
  v_source_exam_id uuid;
  v_source_snapshot jsonb := '{}'::jsonb;
  v_activity_id_map jsonb := '{}'::jsonb;
  v_prompt_id_map jsonb := '{}'::jsonb;
  v_question_id_map jsonb := '{}'::jsonb;
  v_source_section jsonb;
  v_source_activity jsonb;
  v_source_prompt jsonb;
  v_source_question jsonb;
  v_source_sample jsonb;
  v_source_usage jsonb;
  v_source_resource jsonb;
  v_old_id uuid;
  v_new_id uuid;
  v_mapped_resource_id uuid;
  v_presentation_type text;
  v_grading_mode text;
  v_activity_type text;
  v_starter_options jsonb;
  v_empty_presentation_config jsonb;
begin
  if auth.uid() is null or not security.has_permission('exam.create') then
    raise exception using errcode = '42501', message = 'B1_CREATE_FORBIDDEN';
  end if;
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'B1_REQUEST_ID_REQUIRED';
  end if;
  if pg_catalog.btrim(coalesce(p_title, '')) = '' then
    raise exception using errcode = '22023', message = 'B1_TITLE_REQUIRED';
  end if;
  if p_default_time_minutes is null or p_default_time_minutes not between 1 and 480 then
    raise exception using errcode = '22023', message = 'B1_DURATION_INVALID';
  end if;
  if p_access_tier not in ('free', 'pro') or p_access_tier is null then
    raise exception using errcode = '22023', message = 'B1_ACCESS_TIER_INVALID';
  end if;
  if p_initialization_mode is null
    or p_initialization_mode not in ('blank', 'structure_only', 'full_content') then
    raise exception using errcode = '22023', message = 'B1_MODE_INVALID';
  end if;
  if p_initialization_mode = 'blank' and p_source_exam_id is not null then
    raise exception using errcode = '22023', message = 'B1_SOURCE_NOT_ALLOWED';
  end if;
  if p_initialization_mode in ('structure_only', 'full_content')
    and not security.has_permission('exam.read') then
    raise exception using errcode = '42501', message = 'B1_CREATE_FORBIDDEN';
  end if;
  if p_initialization_mode in ('structure_only', 'full_content')
    and p_source_exam_id is null then
    raise exception using errcode = '22023', message = 'B1_SOURCE_UNAVAILABLE';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_request_id::text, 0)
  );

  select requests.exam_id
  into v_existing_exam_id
  from public.b1_exam_creation_requests requests
  where requests.requested_by = v_user_id
    and requests.request_id = p_request_id;

  if v_existing_exam_id is not null then
    return v_existing_exam_id;
  end if;

  if p_initialization_mode in ('structure_only', 'full_content') then
    select source_exam.id
    into v_source_exam_id
    from public.exams source_exam
    where source_exam.id = p_source_exam_id
      and source_exam.exam_format = 'b1_practice'
      and source_exam.deleted_at is null
    for share of source_exam;

    if v_source_exam_id is null then
      raise exception using errcode = '22023', message = 'B1_SOURCE_UNAVAILABLE';
    end if;

    -- Lock only the source rows that can be edited by administrators. Plain
    -- learner SELECTs remain compatible with these row-level SHARE locks.
    perform source_section.id
    from public.exam_sections source_section
    where source_section.exam_id = v_source_exam_id
    order by source_section.id
    for share of source_section;

    perform source_activity.id
    from public.practice_activities source_activity
    where exists (
      select 1
      from public.exam_sections source_section
      where source_section.exam_id = v_source_exam_id
        and source_section.resource_type = 'activity'
        and source_section.resource_id = source_activity.id
    )
    order by source_activity.id
    for share of source_activity;

    perform source_prompt.id
    from public.practice_prompts source_prompt
    where exists (
      select 1
      from public.exam_sections source_section
      where source_section.exam_id = v_source_exam_id
        and source_section.resource_type = 'prompt'
        and source_section.resource_id = source_prompt.id
    )
    order by source_prompt.id
    for share of source_prompt;

    if p_initialization_mode = 'full_content' then
      perform source_question.id
      from public.practice_questions source_question
      where exists (
        select 1
        from public.exam_sections source_section
        where source_section.exam_id = v_source_exam_id
          and source_section.resource_type = 'activity'
          and source_section.resource_id = source_question.activity_id
      )
      order by source_question.id
      for share of source_question;

      perform source_sample.id
      from public.practice_prompt_samples source_sample
      where exists (
        select 1
        from public.exam_sections source_section
        where source_section.exam_id = v_source_exam_id
          and source_section.resource_type = 'prompt'
          and source_section.resource_id = source_sample.prompt_id
      )
      order by source_sample.id
      for share of source_sample;

      perform source_asset.id
      from public.exam_media_assets source_asset
      where exists (
        select 1
        from public.exam_media_asset_usages source_usage
        where source_usage.asset_id = source_asset.id
          and (
            (
              source_usage.resource_type in ('activity', 'prompt')
              and exists (
                select 1
                from public.exam_sections source_section
                where source_section.exam_id = v_source_exam_id
                  and source_section.resource_type = source_usage.resource_type
                  and source_section.resource_id = source_usage.resource_id
              )
            )
            or (
              source_usage.resource_type = 'question'
              and exists (
                select 1
                from public.practice_questions source_question
                join public.exam_sections source_section
                  on source_section.exam_id = v_source_exam_id
                  and source_section.resource_type = 'activity'
                  and source_section.resource_id = source_question.activity_id
                where source_question.id = source_usage.resource_id
              )
            )
          )
      )
      order by source_asset.id
      for share of source_asset;

      perform source_usage.id
      from public.exam_media_asset_usages source_usage
      where (
        source_usage.resource_type in ('activity', 'prompt')
        and exists (
          select 1
          from public.exam_sections source_section
          where source_section.exam_id = v_source_exam_id
            and source_section.resource_type = source_usage.resource_type
            and source_section.resource_id = source_usage.resource_id
        )
      )
        or (
          source_usage.resource_type = 'question'
          and exists (
            select 1
            from public.practice_questions source_question
            join public.exam_sections source_section
              on source_section.exam_id = v_source_exam_id
              and source_section.resource_type = 'activity'
              and source_section.resource_id = source_question.activity_id
            where source_question.id = source_usage.resource_id
          )
        )
      order by source_usage.id
      for share of source_usage;
    end if;

    -- Capture every source relation in one statement snapshot. All later copy
    -- work reads this transaction-local value rather than live source tables.
    select pg_catalog.jsonb_build_object(
      'sections', coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', source_section.id,
            'source_key', source_section.source_key,
            'skill', source_section.skill,
            'title', source_section.title,
            'instructions', source_section.instructions,
            'resource_type', source_section.resource_type,
            'resource_id', source_section.resource_id,
            'order_index', source_section.order_index,
            'is_required', source_section.is_required,
            'suggested_time_minutes', source_section.suggested_time_minutes,
            'metadata', source_section.metadata
          )
          order by source_section.order_index, source_section.id
        )
        from public.exam_sections source_section
        where source_section.exam_id = v_source_exam_id
      ), '[]'::jsonb),
      'activities', coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', source_activity.id,
            'source_key', source_activity.source_key,
            'skill', source_activity.skill,
            'activity_type', source_activity.activity_type,
            'title', source_activity.title,
            'instructions', source_activity.instructions,
            'content', source_activity.content,
            'passage', source_activity.passage,
            'audio_url', source_activity.audio_url,
            'metadata', source_activity.metadata,
            'presentation_type', source_activity.presentation_type,
            'grading_mode', source_activity.grading_mode,
            'content_schema_version', source_activity.content_schema_version,
            'content_blocks', source_activity.content_blocks,
            'presentation_config', source_activity.presentation_config,
            'review_config', source_activity.review_config
          )
          order by source_activity.id
        )
        from public.practice_activities source_activity
        where exists (
          select 1
          from public.exam_sections source_section
          where source_section.exam_id = v_source_exam_id
            and source_section.resource_type = 'activity'
            and source_section.resource_id = source_activity.id
        )
      ), '[]'::jsonb),
      'prompts', coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', source_prompt.id,
            'source_key', source_prompt.source_key,
            'skill', source_prompt.skill,
            'title', source_prompt.title,
            'prompt', source_prompt.prompt,
            'instructions', source_prompt.instructions,
            'content', source_prompt.content,
            'source_page', source_prompt.source_page,
            'image_url', source_prompt.image_url,
            'audio_url', source_prompt.audio_url,
            'metadata', source_prompt.metadata,
            'presentation_type', source_prompt.presentation_type,
            'grading_mode', source_prompt.grading_mode,
            'content_schema_version', source_prompt.content_schema_version,
            'content_blocks', source_prompt.content_blocks,
            'presentation_config', source_prompt.presentation_config,
            'review_config', source_prompt.review_config
          )
          order by source_prompt.id
        )
        from public.practice_prompts source_prompt
        where exists (
          select 1
          from public.exam_sections source_section
          where source_section.exam_id = v_source_exam_id
            and source_section.resource_type = 'prompt'
            and source_section.resource_id = source_prompt.id
        )
      ), '[]'::jsonb),
      'questions', case when p_initialization_mode = 'full_content' then coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', source_question.id,
            'activity_id', source_question.activity_id,
            'activity_skill', source_activity.skill,
            'source_key', source_question.source_key,
            'source_number', source_question.source_number,
            'question_type', source_question.question_type,
            'prompt', source_question.prompt,
            'options', source_question.options,
            'accepted_answers', source_question.accepted_answers,
            'source_page', source_question.source_page,
            'image_url', source_question.image_url,
            'order_index', source_question.order_index,
            'metadata', source_question.metadata,
            'translation', source_question.translation,
            'explanation', source_question.explanation
          )
          order by source_question.activity_id, source_question.order_index, source_question.id
        )
        from public.practice_questions source_question
        join public.practice_activities source_activity
          on source_activity.id = source_question.activity_id
        where exists (
          select 1
          from public.exam_sections source_section
          where source_section.exam_id = v_source_exam_id
            and source_section.resource_type = 'activity'
            and source_section.resource_id = source_question.activity_id
        )
      ), '[]'::jsonb) else '[]'::jsonb end,
      'samples', case when p_initialization_mode = 'full_content' then coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', source_sample.id,
            'prompt_id', source_sample.prompt_id,
            'title', source_sample.title,
            'content', source_sample.content
          )
          order by source_sample.prompt_id, source_sample.title, source_sample.id
        )
        from public.practice_prompt_samples source_sample
        where exists (
          select 1
          from public.exam_sections source_section
          where source_section.exam_id = v_source_exam_id
            and source_section.resource_type = 'prompt'
            and source_section.resource_id = source_sample.prompt_id
        )
      ), '[]'::jsonb) else '[]'::jsonb end,
      'media_usages', case when p_initialization_mode = 'full_content' then coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', source_usage.id,
            'asset_id', source_usage.asset_id,
            'asset_public_url', source_asset.public_url,
            'resource_type', source_usage.resource_type,
            'resource_id', source_usage.resource_id,
            'usage_role', source_usage.usage_role
          )
          order by source_usage.id
        )
        from public.exam_media_asset_usages source_usage
        join public.exam_media_assets source_asset on source_asset.id = source_usage.asset_id
        where (
          source_usage.resource_type in ('activity', 'prompt')
          and exists (
            select 1
            from public.exam_sections source_section
            where source_section.exam_id = v_source_exam_id
              and source_section.resource_type = source_usage.resource_type
              and source_section.resource_id = source_usage.resource_id
          )
        )
          or (
            source_usage.resource_type = 'question'
            and exists (
              select 1
              from public.practice_questions source_question
              join public.exam_sections source_section
                on source_section.exam_id = v_source_exam_id
                and source_section.resource_type = 'activity'
                and source_section.resource_id = source_question.activity_id
              where source_question.id = source_usage.resource_id
            )
          )
      ), '[]'::jsonb) else '[]'::jsonb end
    )
    into v_source_snapshot;
  end if;

  v_exam_source_key := public.b1_exam_generated_source_key(
    v_exam_id,
    p_request_id,
    'exam',
    'b1'
  );

  insert into public.exams (
    id,
    title,
    category,
    description,
    time_limit_minutes,
    total_questions,
    is_published,
    access_tier,
    created_by,
    source_key,
    cefr_level,
    default_time_minutes,
    exam_format,
    cloned_from_exam_id,
    clone_mode
  )
  values (
    v_exam_id,
    pg_catalog.btrim(p_title),
    'GENERAL',
    p_description,
    p_default_time_minutes,
    0,
    false,
    p_access_tier,
    v_user_id,
    v_exam_source_key,
    'B1',
    p_default_time_minutes,
    'b1_practice',
    case when p_initialization_mode = 'blank' then null else v_source_exam_id end,
    case when p_initialization_mode = 'blank' then null else p_initialization_mode end
  );

  if p_initialization_mode = 'blank' then
    for v_blank_section in
      select
        section_specs.order_index,
        section_specs.title,
        section_specs.skill,
        section_specs.resource_type
      from (
        values
          (1, 'Reading'::text, 'reading'::text, 'activity'::text),
          (2, 'Listening'::text, 'listening'::text, 'activity'::text),
          (3, 'Writing'::text, 'writing'::text, 'prompt'::text),
          (4, 'Speaking'::text, 'speaking'::text, 'prompt'::text)
      ) as section_specs(order_index, title, skill, resource_type)
      order by section_specs.order_index
    loop
      v_resource_id := pg_catalog.gen_random_uuid();
      v_resource_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        v_blank_section.resource_type,
        v_blank_section.skill
      );
      v_section_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'section',
        v_blank_section.skill
      );

      if v_blank_section.resource_type = 'activity' then
        v_resource_payload := public.b1_exam_blank_activity_payload(v_blank_section.skill);

        insert into public.practice_activities (
          id,
          source_key,
          skill,
          activity_type,
          title,
          is_published,
          access_tier,
          created_by,
          presentation_type,
          grading_mode
        )
        values (
          v_resource_id,
          v_resource_source_key,
          v_blank_section.skill,
          v_resource_payload ->> 'activity_type',
          v_blank_section.title,
          false,
          p_access_tier,
          v_user_id,
          v_resource_payload ->> 'presentation_type',
          v_resource_payload ->> 'grading_mode'
        );

        v_question_source_key := public.b1_exam_generated_source_key(
          v_exam_id,
          p_request_id,
          'question',
          v_blank_section.skill
        );

        insert into public.practice_questions (
          activity_id,
          source_key,
          source_number,
          question_type,
          prompt,
          options,
          accepted_answers,
          order_index
        )
        values (
          v_resource_id,
          v_question_source_key,
          '1',
          v_resource_payload ->> 'question_type',
          '',
          v_resource_payload -> 'options',
          '[]'::jsonb,
          0
        );
      else
        v_resource_payload := public.b1_exam_blank_prompt_payload(v_blank_section.skill);

        insert into public.practice_prompts (
          id,
          source_key,
          skill,
          title,
          prompt,
          is_published,
          access_tier,
          created_by,
          presentation_type,
          grading_mode
        )
        values (
          v_resource_id,
          v_resource_source_key,
          v_blank_section.skill,
          v_blank_section.title,
          v_resource_payload ->> 'prompt',
          false,
          p_access_tier,
          v_user_id,
          v_resource_payload ->> 'presentation_type',
          v_resource_payload ->> 'grading_mode'
        );
      end if;

      insert into public.exam_sections (
        exam_id,
        source_key,
        skill,
        title,
        resource_type,
        resource_id,
        order_index,
        is_required
      )
      values (
        v_exam_id,
        v_section_source_key,
        v_blank_section.skill,
        v_blank_section.title,
        v_blank_section.resource_type,
        v_resource_id,
        v_blank_section.order_index,
        true
      );
    end loop;
  elsif p_initialization_mode = 'structure_only' then
    for v_source_section in
      select section_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'sections') as section_value(value)
    loop
      v_resource_id := pg_catalog.gen_random_uuid();
      v_resource_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        v_source_section ->> 'resource_type',
        v_source_section ->> 'skill'
      );
      v_section_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'section',
        v_source_section ->> 'skill'
      );

      if v_source_section ->> 'resource_type' = 'activity' then
        select activity_value.value
        into v_source_resource
        from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'activities') as activity_value(value)
        where activity_value.value ->> 'id' = v_source_section ->> 'resource_id'
        limit 1;

        v_presentation_type := v_source_resource ->> 'presentation_type';
        v_grading_mode := v_source_resource ->> 'grading_mode';
        v_activity_type := case
          when v_presentation_type = 'boolean_list' then 'true_false'
          when v_presentation_type = 'passage_text_inline' then 'fill_blank'
          when v_presentation_type = 'sentence_transformation' then 'short_text'
          else 'multiple_choice'
        end;
        v_starter_options := case
          when v_presentation_type = 'boolean_list' then pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('key', 'A', 'text', 'Đúng', 'is_correct', true),
            pg_catalog.jsonb_build_object('key', 'B', 'text', 'Sai', 'is_correct', false)
          )
          when v_presentation_type in ('passage_text_inline', 'sentence_transformation') then '[]'::jsonb
          else pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('key', 'A', 'text', '', 'is_correct', true),
            pg_catalog.jsonb_build_object('key', 'B', 'text', '', 'is_correct', false),
            pg_catalog.jsonb_build_object('key', 'C', 'text', '', 'is_correct', false),
            pg_catalog.jsonb_build_object('key', 'D', 'text', '', 'is_correct', false)
          )
        end;
        v_empty_presentation_config := case
          when v_presentation_type = 'matching' then
            '{"matching":{"leftItems":[],"rightItems":[],"pairs":[]}}'::jsonb
          when v_presentation_type = 'ordering' then
            '{"ordering":{"items":[]}}'::jsonb
          else '{}'::jsonb
        end;

        insert into public.practice_activities (
          id,
          source_key,
          skill,
          activity_type,
          title,
          instructions,
          content,
          passage,
          audio_url,
          is_published,
          access_tier,
          metadata,
          created_by,
          presentation_type,
          grading_mode,
          content_schema_version,
          content_blocks,
          presentation_config,
          review_config
        )
        values (
          v_resource_id,
          v_resource_source_key,
          v_source_section ->> 'skill',
          v_activity_type,
          v_source_section ->> 'title',
          null,
          null,
          null,
          null,
          false,
          p_access_tier,
          '{}'::jsonb,
          v_user_id,
          v_presentation_type,
          v_grading_mode,
          1,
          '[]'::jsonb,
          v_empty_presentation_config,
          '{}'::jsonb
        );

        if v_presentation_type not in ('matching', 'ordering')
          or v_presentation_type is null then
          v_question_source_key := public.b1_exam_generated_source_key(
            v_exam_id,
            p_request_id,
            'question',
            v_source_section ->> 'skill'
          );

          insert into public.practice_questions (
            activity_id,
            source_key,
            source_number,
            question_type,
            prompt,
            options,
            accepted_answers,
            source_page,
            image_url,
            order_index,
            metadata,
            translation,
            explanation
          )
          values (
            v_resource_id,
            v_question_source_key,
            '1',
            v_activity_type,
            '',
            v_starter_options,
            '[]'::jsonb,
            null,
            null,
            0,
            '{}'::jsonb,
            null,
            null
          );
        end if;
      else
        select prompt_value.value
        into v_source_resource
        from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'prompts') as prompt_value(value)
        where prompt_value.value ->> 'id' = v_source_section ->> 'resource_id'
        limit 1;

        insert into public.practice_prompts (
          id,
          source_key,
          skill,
          title,
          prompt,
          instructions,
          content,
          source_page,
          image_url,
          audio_url,
          is_published,
          access_tier,
          metadata,
          created_by,
          presentation_type,
          grading_mode,
          content_schema_version,
          content_blocks,
          presentation_config,
          review_config
        )
        values (
          v_resource_id,
          v_resource_source_key,
          v_source_section ->> 'skill',
          v_source_section ->> 'title',
          '',
          null,
          null,
          null,
          null,
          null,
          false,
          p_access_tier,
          '{}'::jsonb,
          v_user_id,
          v_source_resource ->> 'presentation_type',
          v_source_resource ->> 'grading_mode',
          1,
          '[]'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        );
      end if;

      insert into public.exam_sections (
        exam_id,
        source_key,
        skill,
        title,
        instructions,
        resource_type,
        resource_id,
        order_index,
        is_required,
        suggested_time_minutes,
        metadata
      )
      values (
        v_exam_id,
        v_section_source_key,
        v_source_section ->> 'skill',
        v_source_section ->> 'title',
        null,
        v_source_section ->> 'resource_type',
        v_resource_id,
        (v_source_section ->> 'order_index')::integer,
        (v_source_section ->> 'is_required')::boolean,
        (v_source_section ->> 'suggested_time_minutes')::integer,
        '{}'::jsonb
      );
    end loop;
  else
    for v_source_activity in
      select activity_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'activities') as activity_value(value)
    loop
      v_old_id := (v_source_activity ->> 'id')::uuid;
      v_new_id := pg_catalog.gen_random_uuid();
      v_activity_id_map := v_activity_id_map || pg_catalog.jsonb_build_object(
        v_old_id::text,
        v_new_id::text
      );
      v_resource_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'activity',
        v_source_activity ->> 'skill'
      );

      insert into public.practice_activities (
        id,
        source_key,
        skill,
        activity_type,
        title,
        instructions,
        content,
        passage,
        audio_url,
        is_published,
        access_tier,
        metadata,
        created_by,
        presentation_type,
        grading_mode,
        content_schema_version,
        content_blocks,
        presentation_config,
        review_config
      )
      values (
        v_new_id,
        v_resource_source_key,
        v_source_activity ->> 'skill',
        v_source_activity ->> 'activity_type',
        v_source_activity ->> 'title',
        v_source_activity ->> 'instructions',
        v_source_activity ->> 'content',
        v_source_activity ->> 'passage',
        v_source_activity ->> 'audio_url',
        false,
        p_access_tier,
        v_source_activity -> 'metadata',
        v_user_id,
        v_source_activity ->> 'presentation_type',
        v_source_activity ->> 'grading_mode',
        (v_source_activity ->> 'content_schema_version')::integer,
        v_source_activity -> 'content_blocks',
        v_source_activity -> 'presentation_config',
        v_source_activity -> 'review_config'
      );
    end loop;

    for v_source_prompt in
      select prompt_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'prompts') as prompt_value(value)
    loop
      v_old_id := (v_source_prompt ->> 'id')::uuid;
      v_new_id := pg_catalog.gen_random_uuid();
      v_prompt_id_map := v_prompt_id_map || pg_catalog.jsonb_build_object(
        v_old_id::text,
        v_new_id::text
      );
      v_resource_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'prompt',
        v_source_prompt ->> 'skill'
      );

      insert into public.practice_prompts (
        id,
        source_key,
        skill,
        title,
        prompt,
        instructions,
        content,
        source_page,
        image_url,
        audio_url,
        is_published,
        access_tier,
        metadata,
        created_by,
        presentation_type,
        grading_mode,
        content_schema_version,
        content_blocks,
        presentation_config,
        review_config
      )
      values (
        v_new_id,
        v_resource_source_key,
        v_source_prompt ->> 'skill',
        v_source_prompt ->> 'title',
        v_source_prompt ->> 'prompt',
        v_source_prompt ->> 'instructions',
        v_source_prompt ->> 'content',
        (v_source_prompt ->> 'source_page')::integer,
        v_source_prompt ->> 'image_url',
        v_source_prompt ->> 'audio_url',
        false,
        p_access_tier,
        v_source_prompt -> 'metadata',
        v_user_id,
        v_source_prompt ->> 'presentation_type',
        v_source_prompt ->> 'grading_mode',
        (v_source_prompt ->> 'content_schema_version')::integer,
        v_source_prompt -> 'content_blocks',
        v_source_prompt -> 'presentation_config',
        v_source_prompt -> 'review_config'
      );
    end loop;

    for v_source_question in
      select question_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'questions') as question_value(value)
    loop
      v_old_id := (v_source_question ->> 'id')::uuid;
      v_new_id := pg_catalog.gen_random_uuid();
      v_mapped_resource_id := (
        v_activity_id_map ->> (v_source_question ->> 'activity_id')
      )::uuid;
      v_question_id_map := v_question_id_map || pg_catalog.jsonb_build_object(
        v_old_id::text,
        v_new_id::text
      );
      v_question_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'question',
        v_source_question ->> 'activity_skill'
      );

      insert into public.practice_questions (
        id,
        activity_id,
        source_key,
        source_number,
        question_type,
        prompt,
        options,
        accepted_answers,
        source_page,
        image_url,
        order_index,
        metadata,
        translation,
        explanation
      )
      values (
        v_new_id,
        v_mapped_resource_id,
        v_question_source_key,
        v_source_question ->> 'source_number',
        v_source_question ->> 'question_type',
        v_source_question ->> 'prompt',
        v_source_question -> 'options',
        v_source_question -> 'accepted_answers',
        (v_source_question ->> 'source_page')::integer,
        v_source_question ->> 'image_url',
        (v_source_question ->> 'order_index')::integer,
        v_source_question -> 'metadata',
        v_source_question ->> 'translation',
        v_source_question ->> 'explanation'
      );
    end loop;

    for v_source_sample in
      select sample_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'samples') as sample_value(value)
    loop
      insert into public.practice_prompt_samples (
        prompt_id,
        title,
        content
      )
      values (
        (v_prompt_id_map ->> (v_source_sample ->> 'prompt_id'))::uuid,
        v_source_sample ->> 'title',
        v_source_sample ->> 'content'
      );
    end loop;

    for v_source_section in
      select section_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'sections') as section_value(value)
    loop
      v_mapped_resource_id := case v_source_section ->> 'resource_type'
        when 'activity' then (
          v_activity_id_map ->> (v_source_section ->> 'resource_id')
        )::uuid
        else (
          v_prompt_id_map ->> (v_source_section ->> 'resource_id')
        )::uuid
      end;
      v_section_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'section',
        v_source_section ->> 'skill'
      );

      insert into public.exam_sections (
        exam_id,
        source_key,
        skill,
        title,
        instructions,
        resource_type,
        resource_id,
        order_index,
        is_required,
        suggested_time_minutes,
        metadata
      )
      values (
        v_exam_id,
        v_section_source_key,
        v_source_section ->> 'skill',
        v_source_section ->> 'title',
        v_source_section ->> 'instructions',
        v_source_section ->> 'resource_type',
        v_mapped_resource_id,
        (v_source_section ->> 'order_index')::integer,
        (v_source_section ->> 'is_required')::boolean,
        (v_source_section ->> 'suggested_time_minutes')::integer,
        v_source_section -> 'metadata'
      );
    end loop;

    for v_source_usage in
      select usage_value.value
      from pg_catalog.jsonb_array_elements(v_source_snapshot -> 'media_usages') as usage_value(value)
    loop
      v_mapped_resource_id := case v_source_usage ->> 'resource_type'
        when 'activity' then (
          v_activity_id_map ->> (v_source_usage ->> 'resource_id')
        )::uuid
        when 'prompt' then (
          v_prompt_id_map ->> (v_source_usage ->> 'resource_id')
        )::uuid
        else (
          v_question_id_map ->> (v_source_usage ->> 'resource_id')
        )::uuid
      end;

      insert into public.exam_media_asset_usages (
        asset_id,
        resource_type,
        resource_id,
        usage_role
      )
      values (
        (v_source_usage ->> 'asset_id')::uuid,
        v_source_usage ->> 'resource_type',
        v_mapped_resource_id,
        v_source_usage ->> 'usage_role'
      );

      if v_source_usage ->> 'resource_type' = 'activity'
        and v_source_usage ->> 'usage_role' = 'audio' then
        update public.practice_activities
        set audio_url = v_source_usage ->> 'asset_public_url'
        where id = v_mapped_resource_id;
      elsif v_source_usage ->> 'resource_type' = 'prompt'
        and v_source_usage ->> 'usage_role' = 'audio' then
        update public.practice_prompts
        set audio_url = v_source_usage ->> 'asset_public_url'
        where id = v_mapped_resource_id;
      elsif v_source_usage ->> 'resource_type' = 'prompt'
        and v_source_usage ->> 'usage_role' = 'image' then
        update public.practice_prompts
        set image_url = v_source_usage ->> 'asset_public_url'
        where id = v_mapped_resource_id;
      elsif v_source_usage ->> 'resource_type' = 'question'
        and v_source_usage ->> 'usage_role' = 'image' then
        update public.practice_questions
        set image_url = v_source_usage ->> 'asset_public_url'
        where id = v_mapped_resource_id;
      end if;
    end loop;
  end if;

  insert into public.b1_exam_creation_requests (
    requested_by,
    request_id,
    exam_id
  )
  values (
    v_user_id,
    p_request_id,
    v_exam_id
  );

  return v_exam_id;
end;
$$;

revoke all on function public.create_b1_exam(uuid, text, text, text, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_b1_exam(uuid, text, text, text, integer, text, uuid)
  to authenticated;
