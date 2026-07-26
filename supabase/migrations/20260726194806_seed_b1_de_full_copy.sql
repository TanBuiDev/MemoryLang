begin;

insert into public.exams (
  id,
  source_key,
  title,
  category,
  description,
  time_limit_minutes,
  total_questions,
  is_published,
  access_tier,
  cefr_level,
  default_time_minutes
) values (
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'b1-de-full-copy',
  'B1 Full Practice Test',
  'GENERAL',
  'Draft B1 practice content imported from DeFull Copy.pdf.',
  120,
  90,
  false,
  'free',
  'B1',
  120
)
on conflict (source_key) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  time_limit_minutes = excluded.time_limit_minutes,
  total_questions = excluded.total_questions,
  is_published = false,
  access_tier = excluded.access_tier,
  cefr_level = excluded.cefr_level,
  default_time_minutes = excluded.default_time_minutes;

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
  created_by
) values (
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-use-of-english',
  'grammar',
  'multiple_choice',
  'Grammar and Use of English',
  'Choose the best answer among A, B, C, or D.',
  null,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs',
  'signs',
  'multiple_choice',
  'Signs',
  'Read each sign and choose the best answer among A, B, C, or D. Sign images are pending admin upload and were not OCR-transcribed.',
  'Source numbers 1-10 are included because their answers are highlighted in the PDF. Source numbers 11-15 are excluded because the PDF provides no answer annotation.',
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  'reading-text-2-coasteering',
  'reading',
  'multiple_choice',
  'Text 2: Coasteering',
  'Read the passage carefully and choose the correct answer among A, B, C, or D.',
  null,
  'Lily Carter had no idea what present she wanted for her 14th birthday. But she’d always been keen on challenging sports, especially to do with water, like surfing and sailing. So when her parents heard about an activity called coasteering - exploring rocks along the coast by climbing and swimming - they thought Lily would love it. They found a course offered at an activity center called Porthdean, just along the coast from the family home, which was perfect. So after checking it was led by experienced instructors, they signed her up.

Lily had seen a TV show about coasteering and was interested in doing it, although she’d thought only adults could take part. But then she discovered that on courses at Porthdean, there’d also be people her age jumping from rocks into the sea, and also exploring caves - which she was never normally allowed to do, so she really wanted to go. But she still asked her dad to go along too and, although he wondered whether he’d like coasteering himself, he knew how much Lily wanted someone to accompany her, so he agreed.

Lily and her dad drove to Porthdean, where they attended a session with their instructors to learn basic safety and techniques and be given helmets and special wetsuits to keep the cold out. The group they joined was quite small, which meant they got lots of individual attention. Says Lily, “The entire trip was awesome - although the water was freezing! But our instructors encouraged the whole group so much, we were ready to try absolutely all the challenges, even stuff we hadn’t expected at all, like jumping off high cliffs! I must admit, the one I jumped off wasn’t that high, but Dad went much higher!”

“Anyway, Dad and I hadn’t realized how hard it would be physically, so we were glad we were fit,” explains Lily. “Even so, afterward, we actually felt like we’d done loads of hard exercise in the gym! But I’ll keep the memories of that trip forever, I reckon. And the instructors are going to put a video of it onto the website, so my friends will see it. They’d never believe me otherwise!”',
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  'reading-text-3-karina-moore',
  'reading',
  'multiple_choice',
  'Text 3: Karina Moore - Teenage High Diver!',
  'Read the passage carefully and choose the correct answer among A, B, C, or D.',
  null,
  'Several times a week, teenager Karina Moore trains at her local pool to jump from the high-diving board into the water - in an attempt to become a national diving champion.

Karina first learned about diving during a family break in Spain, where the resort’s pool had a high-diving board. Young people were diving off it, and it looked fun, but Karina didn’t join in, even though she was a strong swimmer. Then after returning home, she discovered a long-distance runner she’d always admired had started diving for relaxation - so she became more interested.

Karina joined a beginners’ diving class at her local pool. They had several sessions jumping onto soft materials before trying the high board. “The water looked a long way down,” says Karina, “but after our training, I felt I’d handle it - without injuring myself! They’d warned me I’d land in the water fast - at around 60 kph - but I was prepared. I couldn’t wait to get started - although the others weren’t so keen! Anyway, I wasn’t disappointed by the experience.”

In Karina’s area, there’s now lots of interest in high diving, but it’s sometimes difficult for swimmers to find suitable practice facilities. Although the pools are deep enough, they’re in use so often by diving clubs that other people don’t get opportunities to practise. Fortunately, though, Karina’s coach noticed her talent and helped her develop her techniques. After only two years, she’s winning competitions in her area.

But what’s it like to concentrate so much on diving? “I train 20 hours a week,” says Karina, “and I won’t pretend it’s easy - you have to enjoy it to spend so much time doing it! It’s not easy for my parents either, though - they drive me to training sessions early in the morning, and that costs money. But they’ve had financial help from sports organisations, luckily. And my schoolwork and social life are good. I still meet my mates - and there’s always the phone! The only thing I hadn’t realised was that the pool water would damage my hair - I used to love my long hair, but I’ve had to cut it short because it looked awful! But I’ll definitely keep on diving!”',
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-william-the-hero',
  'cloze',
  'multiple_choice',
  'Text 15: William the hero!',
  'Fill in each numbered blank with one suitable word or phrase.',
  null,
  'Brave William Baldock, who is six years old, is a hero after helping his mother when she fell downstairs. William quickly rang (1) ____________ an ambulance when he discovered his mother had broken her leg. In spite of being frightened, he (2) ____________ the emergency services what had happened and answered all the questions they asked him. He also telephoned his father (3) ____________ work, and then his grandmother, to explain what he had (4) ____________. While waiting for (5) ____________ people to come, William looked after his 18-month-old sister.

When ambulance man Steve Lyn went to the house, he was amazed: “It’s (6) ____________ that a young boy of six knew the right number to (7) ____________, and was able to give us the correct information. (8) ____________ of William’s quick thinking, we were able to (9) ____________ there immediately.”

Mrs Baldock left hospital yesterday, very (10) ____________ to both William and the ambulance service.',
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'sentence-transformation',
  'transformation',
  'fill_blank',
  'Sentence Transformation',
  'Complete the second sentence using the word in brackets so that it has the same meaning as the first sentence.',
  null,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1',
  'listening',
  'fill_blank',
  'Listening Text 1: Being a Kid',
  'Listen and fill in the missing words in the blanks.',
  '1. Being a kid can be lots of fun. You play a lot - you have a lot of games that Mom and Dad don’t know how to play. I love playing (1) ____________. I get a lot of time to play soccer as a kid. Adults don’t have as much time to play - my dad works so he doesn’t get to play soccer very much. One bad thing about a kid is school. I don’t really like going to school. I can’t stand doing (2) ____________ either - especially cleaning my room. Oh, and, my brother has a new (3) ____________. That’s really annoying because he isn’t very good at playing it!

2. Some good things about being a kid are: summer (4) ____________, playing sports, and getting lots of presents on my birthday - adults don’t get as many presents. I like playing with my friends every weekend, too. Bad things about being a kid are: some of the chores I have to do - I don’t mind doing some of them, but there are some I can’t (5) ____________, like doing dishes. Sometimes I can’t watch TV when my Dad wants to watch a program that I can’t watch. I don’t like that, and, I don’t like doing homework. But I am happy I don’t have to pay (6) ____________! That’s one bad thing about being an adult.

3. I don’t like having to go to bed so early - at (7) ____________. I always have to finish all the food on my plate, even if I don’t like it. One thing I really don’t like - I don’t like older people telling me what to do. That’s probably the (8) ____________ thing about being a kid. There are a lot of good things though. I don’t have to work and my parents give me money for (9) ____________. When I am an adult, I’ll have to pay for everything. And, I get to see my friends all the time at school - we have (10) ____________ so we can play. You don’t have (10) ____________ when you’re an adult!',
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  'listening-text-31',
  'listening',
  'multiple_choice',
  'Listening Text 31: Apartment Search',
  'Listen carefully and choose the best answer (A, B, or C) for each question.',
  null,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  'listening-text-34',
  'listening',
  'multiple_choice',
  'Listening Text 34: Movie Date',
  'Listen carefully and choose the best answer (A, B, or C) for each question.',
  null,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  'listening-text-52',
  'listening',
  'true_false',
  'Listening Text 52: Long-Distance Running',
  'Listen and decide if the following statements are True (T) or False (F).',
  null,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  'listening-text-56',
  'listening',
  'true_false',
  'Listening Text 56: Vitamin D and Sunshine',
  'Listen and decide if the following statements are True (T) or False (F).',
  null,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  instructions = excluded.instructions,
  content = excluded.content,
  passage = excluded.passage,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'd27e4873-ceb1-558f-9368-b5929c6f7dba'::uuid,
  'writing-topic-7',
  'writing',
  'Writing Topic 7: Applying for a Part-Time Job',
  'You are looking for a part-time job. Write an email with at least 150 words to an employment agency. In your email: introduce yourself; explain what sort of job you would like; say what experience and skills you have.',
  'Use an appropriate letter/email format, state the purpose, present and extend all bullet points, link ideas coherently, and use accurate vocabulary and varied grammar.',
  'Dear ...,

My name is ... and I am currently a student. I am writing to apply for a part-time job so that I can earn some extra money and gain more work experience.

I would like to work in a convenience store or small shop. I can work in the evenings. I’m interested in jobs such as serving customers, checking goods, and helping at the cash register.

Previously, I worked part-time at a convenience store. My duties included helping customers, putting products on shelves, checking prices, cleaning the store, and doing cashier work. This experience helped me improve my communication and teamwork skills.

I am friendly, careful, hardworking, and responsible. I can learn new tasks quickly and work well with other people.

Please let me know if you have a suitable part-time position. You can contact me by email at ... or by phone at ...

Yours faithfully,
...',
  10,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  instructions = excluded.instructions,
  content = excluded.content,
  source_page = excluded.source_page,
  image_url = null,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '8805b86d-cd1a-5d1e-b181-00ddb66d27c7'::uuid,
  'speaking-test-instructions',
  'speaking',
  'Speaking Test Instructions - CEFR B1',
  'For candidates: Each candidate has three to five minutes to present his/her topic. No supporting documents are permitted during the test.

For examiners: Ask three to five questions to each candidate. Each candidate’s oral performance is evaluated as follows: Content 6 marks; Grammar 4 marks; Pronunciation 5 marks; Fluency 5 marks; Total 20 marks.

Phase 1 - Topic selection: The examiners invite 6 candidates at a time to pick up topics. Each candidate has about 5 minutes to brainstorm ideas and make notes, if necessary, on blank papers provided by the examiners.

Phase 2 - Interview (4 minutes). Warm-up (1 minute): The examiners randomly ask each candidate 2 to 3 questions: May I have your full name, please? How are you today? What’s your major? Where are you living now? What do you often do in your free time? How many people are there in your family? Who are they?

Topic discussion (2 minutes): The examiners ask the candidate to talk about the chosen topic. Candidates are not expected to read scripts from their notes.

Further discussion (1 minute): The examiners ask a few more questions related to the previous topic.

Phase 3 - Closure: The examiners signal that it is the end of the test, thank the candidate, and complete the scoring form.',
  'Follow the three speaking-test phases and the timing shown in the source.',
  null,
  16,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  instructions = excluded.instructions,
  content = excluded.content,
  source_page = excluded.source_page,
  image_url = null,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '5b516ad2-fdee-5a34-8091-00c0d35b5519'::uuid,
  'speaking-example-famous-person',
  'speaking',
  'Example: A Famous Person You Would Like to Meet',
  'Describe a famous person that you would like to meet. You should say: Who is he/she? Why is he/she famous? Why do you want to meet him/her? What would you like to do if you met him/her?',
  'Further discussion: What is he/she like? What does he/she look like? How would you feel if you met this famous person? What would you say or ask if you had the chance to meet this famous person? Have you ever had the opportunity to meet a celebrity or famous person before? Do you think it is important for young people to have positive role models among famous individuals?',
  null,
  16,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  instructions = excluded.instructions,
  content = excluded.content,
  source_page = excluded.source_page,
  image_url = null,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  '697a21b6-1706-5dd6-82c0-55baa4dc74c2'::uuid,
  'speaking-topic-33',
  'speaking',
  'Topic 33: A Park You Like Visiting',
  'Describe a park you like visiting. You should answer: Where is the park? When did you visit the park? What is the park like? Why do you like visiting it?',
  null,
  null,
  18,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  instructions = excluded.instructions,
  content = excluded.content,
  source_page = excluded.source_page,
  image_url = null,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'd707199f-80a5-585b-a8c9-05f87c21a3af'::uuid,
  'speaking-topic-34',
  'speaking',
  'Topic 34: A Time When You Cooked a Meal',
  'Describe a time when you cooked a meal. You should answer: What did you cook? When and where did you cook it? Who was with you? How did you feel about it?',
  null,
  'I’d like to talk about the time I cooked fried rice with eggs, vegetables, and chicken. It was last Sunday evening. I cooked it in the kitchen of the shared house where I live with other students. One of my roommates helped me prepare the ingredients. To be honest, I felt a little nervous at first, but in the end, I was really happy and proud because everyone enjoyed the meal and gave me good feedback.',
  18,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  instructions = excluded.instructions,
  content = excluded.content,
  source_page = excluded.source_page,
  image_url = null,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  created_by
) values (
  'd76c945a-fef1-5acc-b510-90d975b64b4a'::uuid,
  'speaking-topic-35',
  'speaking',
  'Topic 35: A Time When You Spent a Lot of Money',
  'Describe a time when you spent a lot of money on something. You should answer: What did you buy? When did you buy it? Where did you buy it? Why did you spend a lot of money to buy it?',
  null,
  'I once spent a lot of money on a Yonex badminton racket. I bought it about three months ago at a sports shop near my house called Hali Sports. It cost more than two million Vietnamese dong, which was quite expensive for a student like me. However, I decided to buy it because I play badminton regularly and I wanted a strong, high-quality racket. I believed it would help me play better and last for a long time, so it was a worthwhile investment.',
  18,
  null,
  null,
  false,
  'free',
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb,
  null
)
on conflict (source_key) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  instructions = excluded.instructions,
  content = excluded.content,
  source_page = excluded.source_page,
  image_url = null,
  audio_url = null,
  is_published = false,
  access_tier = excluded.access_tier,
  metadata = excluded.metadata,
  created_by = null;

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
  metadata
) values (
  '912e9b10-fb50-5a5d-bd38-f10165ab1137'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-101',
  '101',
  'multiple_choice',
  'Andrew managed ____________ a promotion.',
  '[{"key":"A","text":"in getting","is_correct":false},{"key":"B","text":"to get","is_correct":true},{"key":"C","text":"getting","is_correct":false},{"key":"D","text":"get","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'adc63ee7-2e6c-53c9-b244-157a1f7ccca3'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-102',
  '102',
  'multiple_choice',
  'I’d rather ____________ with my cousin for the weekend.',
  '[{"key":"A","text":"stay","is_correct":true},{"key":"B","text":"to stay","is_correct":false},{"key":"C","text":"staying","is_correct":false},{"key":"D","text":"to staying","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '168fa41f-354b-55b4-9e78-5e325bf80ea2'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-103',
  '103',
  'multiple_choice',
  'They suggested ____________ the children to the new aquarium.',
  '[{"key":"A","text":"to take","is_correct":false},{"key":"B","text":"in taking","is_correct":false},{"key":"C","text":"taking","is_correct":true},{"key":"D","text":"to taking","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '52075198-f1d7-533b-af40-c97f3c75abfc'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-104',
  '104',
  'multiple_choice',
  'Don’t forget ____________ off the computer when you finish.',
  '[{"key":"A","text":"turning","is_correct":false},{"key":"B","text":"to turning","is_correct":false},{"key":"C","text":"turn","is_correct":false},{"key":"D","text":"to turn","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '80a912e0-c578-5591-b015-eaf65317cceb'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-105',
  '105',
  'multiple_choice',
  'I’m sorry, but I don’t really feel like ____________ them tonight.',
  '[{"key":"A","text":"seeing","is_correct":true},{"key":"B","text":"to see","is_correct":false},{"key":"C","text":"see","is_correct":false},{"key":"D","text":"to seeing","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '2fe80ef6-e508-5d38-8e6f-85e2b6bee4c8'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-106',
  '106',
  'multiple_choice',
  'Charles ____________ his car washed for two months.',
  '[{"key":"A","text":"hadn’t been","is_correct":false},{"key":"B","text":"hasn’t had","is_correct":true},{"key":"C","text":"hasn’t","is_correct":false},{"key":"D","text":"hadn’t been having","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  5,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '41c6b221-c218-57f3-a48d-340866c6bad8'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-107',
  '107',
  'multiple_choice',
  'Could I ____________ by fax, please?',
  '[{"key":"A","text":"have been sent","is_correct":false},{"key":"B","text":"have sent it","is_correct":false},{"key":"C","text":"had it sent","is_correct":false},{"key":"D","text":"have it sent","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  6,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '87c49930-18df-52bc-9a6e-4d4998cf9c40'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-108',
  '108',
  'multiple_choice',
  'You ____________ checked the report twice.',
  '[{"key":"A","text":"should have been","is_correct":false},{"key":"B","text":"could","is_correct":false},{"key":"C","text":"should have","is_correct":true},{"key":"D","text":"could have been","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  1,
  null,
  7,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'cc11dfda-6db8-550c-82e9-a39d8f6ace6b'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-109',
  '109',
  'multiple_choice',
  'They ____________ come back from the shopping centre by now.',
  '[{"key":"A","text":"must have","is_correct":true},{"key":"B","text":"must have to","is_correct":false},{"key":"C","text":"might be","is_correct":false},{"key":"D","text":"may have been","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  8,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '631968fa-fd65-527e-a191-930dd648a159'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-110',
  '110',
  'multiple_choice',
  'I’m not sure, but I think he ____________ used your coffee mug.',
  '[{"key":"A","text":"can have been","is_correct":false},{"key":"B","text":"might have to","is_correct":false},{"key":"C","text":"can be","is_correct":false},{"key":"D","text":"may have","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  9,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'b37f0108-5935-5720-a21e-572e23e6c0da'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-111',
  '111',
  'multiple_choice',
  'I was cooking and talking on the phone ____________.',
  '[{"key":"A","text":"at once","is_correct":false},{"key":"B","text":"at random","is_correct":false},{"key":"C","text":"at a glance","is_correct":false},{"key":"D","text":"at the same time","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  10,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '31bd764e-066e-5969-b405-925589d22432'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-112',
  '112',
  'multiple_choice',
  'They’re having a lesson ____________.',
  '[{"key":"A","text":"at random","is_correct":false},{"key":"B","text":"at a glance","is_correct":false},{"key":"C","text":"at the moment","is_correct":true},{"key":"D","text":"at once","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  11,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'dcfa6c38-4a00-5330-aa0e-a3e0732b3b19'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-113',
  '113',
  'multiple_choice',
  '____________ of six, he wanted to become an astronaut.',
  '[{"key":"A","text":"At a glance","is_correct":false},{"key":"B","text":"At the age","is_correct":true},{"key":"C","text":"At the moment","is_correct":false},{"key":"D","text":"At the same time","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  12,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'c6796dcf-e879-5611-9dd5-2e0583f872ce'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-114',
  '114',
  'multiple_choice',
  'The headmaster told them to go to their classroom ____________.',
  '[{"key":"A","text":"at once","is_correct":true},{"key":"B","text":"at the age","is_correct":false},{"key":"C","text":"at his own speed","is_correct":false},{"key":"D","text":"at a glance","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  13,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '5e372da6-d692-5786-bce7-ad8fd063ceab'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-115',
  '115',
  'multiple_choice',
  'I’m really sorry, but I didn’t have ____________ that your mother was so seriously ill.',
  '[{"key":"A","text":"the chance","is_correct":false},{"key":"B","text":"an argument","is_correct":false},{"key":"C","text":"a lot in common","is_correct":false},{"key":"D","text":"the slightest idea","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  14,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '0afe6296-911d-5e9e-ba40-2d20d23a7f75'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-116',
  '116',
  'multiple_choice',
  'The chief editor had ____________ at the whole magazine before it was printed.',
  '[{"key":"A","text":"an effect","is_correct":false},{"key":"B","text":"a look","is_correct":true},{"key":"C","text":"a lot in common","is_correct":false},{"key":"D","text":"an argument","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  15,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '9c07aaf9-7b2d-58e4-9726-abe6ceea29c9'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-117',
  '117',
  'multiple_choice',
  'I’m sure that he had ____________ leaving you here all by yourself.',
  '[{"key":"A","text":"a look at","is_correct":false},{"key":"B","text":"the chance","is_correct":false},{"key":"C","text":"no intention of","is_correct":true},{"key":"D","text":"an effect on","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  16,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'b16126bd-5e93-5373-a03b-1b8bf6b918f8'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-118',
  '118',
  'multiple_choice',
  'Unfortunately, they had a big ____________ their supervisor yesterday morning.',
  '[{"key":"A","text":"effect on","is_correct":false},{"key":"B","text":"intention of","is_correct":false},{"key":"C","text":"look at","is_correct":false},{"key":"D","text":"argument with","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  17,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'cfbd51fc-e5ff-5fce-8e0e-3c90238b4a43'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-119',
  '119',
  'multiple_choice',
  'Gregory never ____________ what his mother tells him.',
  '[{"key":"A","text":"informs","is_correct":false},{"key":"B","text":"is used to","is_correct":false},{"key":"C","text":"pays attention to","is_correct":true},{"key":"D","text":"makes his way to","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  18,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '350c1272-49cc-5900-8a2c-dea79af945bd'::uuid,
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  'grammar-120',
  '120',
  'multiple_choice',
  'Mona’s teacher ____________ her from taking the exams.',
  '[{"key":"A","text":"informed","is_correct":false},{"key":"B","text":"discouraged","is_correct":true},{"key":"C","text":"waited","is_correct":false},{"key":"D","text":"made","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  2,
  null,
  19,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '3f189632-548a-5989-b3cf-417f1f6d6678'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-1',
  '1',
  'multiple_choice',
  'Read sign 1 and choose the best answer.',
  '[{"key":"A","text":"Always keep this door open.","is_correct":false},{"key":"B","text":"Do not park in front of this entrance.","is_correct":true},{"key":"C","text":"Permission is needed to park here.","is_correct":false},{"key":"D","text":"Only use this entrance in an emergency.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'b4d384e6-090c-5eb8-930b-eb53af5ecbf4'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-2',
  '2',
  'multiple_choice',
  'Read sign 2 and choose the best answer.',
  '[{"key":"A","text":"Drinks cannot be ordered at the bar.","is_correct":false},{"key":"B","text":"Use this machine when the bar is closed.","is_correct":false},{"key":"C","text":"There is a drinks machine in the bar.","is_correct":false},{"key":"D","text":"This machine is not working at the moment.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '93dc8eaa-c5a0-5b4c-adc9-05ac03bcab64'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-3',
  '3',
  'multiple_choice',
  'Read sign 3 and choose the best answer.',
  '[{"key":"A","text":"The librarian needs to see your books before you go.","is_correct":true},{"key":"B","text":"Make sure you take all your books with you.","is_correct":false},{"key":"C","text":"Return your books before you leave the library.","is_correct":false},{"key":"D","text":"The librarian will show you where to put your books.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '68994bac-b8e9-5915-b8ce-9479df516e84'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-4',
  '4',
  'multiple_choice',
  'Read sign 4 and choose the best answer.',
  '[{"key":"A","text":"This room cannot be used at present.","is_correct":false},{"key":"B","text":"This door must always be kept locked.","is_correct":false},{"key":"C","text":"Lock the room when it is not being used.","is_correct":true},{"key":"D","text":"Keep the key to this door in the room.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '6a3c5fb7-d16c-5b43-836f-6a7dd894519e'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-5',
  '5',
  'multiple_choice',
  'Read sign 5 and choose the best answer.',
  '[{"key":"A","text":"Supersaver tickets can be used every day except Fridays.","is_correct":true},{"key":"B","text":"You need a special ticket to travel on a Friday.","is_correct":false},{"key":"C","text":"Supersaver tickets cannot be bought before the weekend.","is_correct":false},{"key":"D","text":"You can save money by traveling on a Friday.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '7ee76745-629c-57e2-b0d4-37f6a2738634'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-6',
  '6',
  'multiple_choice',
  'Read sign 6 and choose the best answer.',
  '[{"key":"A","text":"Do not forget to put your luggage outside your room.","is_correct":false},{"key":"B","text":"Keep the corridor clear of luggage.","is_correct":true},{"key":"C","text":"Bags left in the corridor will be removed.","is_correct":false},{"key":"D","text":"Bags will be collected from the corridor.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  5,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '2b67faf1-54df-5ce8-a5d0-c4cfac9f76d8'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-7',
  '7',
  'multiple_choice',
  'Read sign 7 and choose the best answer.',
  '[{"key":"A","text":"Wait upstairs to see the nurse.","is_correct":true},{"key":"B","text":"Go upstairs to make an appointment with the nurse.","is_correct":false},{"key":"C","text":"The nurse will tell you when it is your turn.","is_correct":false},{"key":"D","text":"The nurse can only see patients with appointments.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  3,
  null,
  6,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'e6813f89-737a-5627-87bf-9a388815063f'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-8',
  '8',
  'multiple_choice',
  'Read sign 8 and choose the best answer.',
  '[{"key":"A","text":"Do not touch the fruit before paying for it.","is_correct":false},{"key":"B","text":"Damaged fruit must be paid for.","is_correct":false},{"key":"C","text":"Self-service fruit is cheaper.","is_correct":false},{"key":"D","text":"Choose your fruit and then pay for it.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  4,
  null,
  7,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '9269bf5b-c8b1-5ad1-a4d1-74c31875c205'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-9',
  '9',
  'multiple_choice',
  'Read sign 9 and choose the best answer.',
  '[{"key":"A","text":"Please be quiet while people are taking their examination.","is_correct":true},{"key":"B","text":"Do not talk to the examiner.","is_correct":false},{"key":"C","text":"Do not speak during the examination.","is_correct":false},{"key":"D","text":"The examiner will tell you when you can talk.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  4,
  null,
  8,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '15dddf60-c219-5d04-8a3c-bf1892c9632a'::uuid,
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  'signs-10',
  '10',
  'multiple_choice',
  'Read sign 10 and choose the best answer.',
  '[{"key":"A","text":"Bring your computer here for repairs.","is_correct":false},{"key":"B","text":"We will not mend computers bought from other shops.","is_correct":true},{"key":"C","text":"We charge to repair computers not bought here.","is_correct":false},{"key":"D","text":"Computers bought here never need repairing.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  4,
  null,
  9,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '51498848-6f2d-5f07-b9a2-d0ccfc576342'::uuid,
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  'reading-text-2-1',
  '1',
  'multiple_choice',
  'Why did Lily’s parents choose Porthdean for her coasteering present?',
  '[{"key":"A","text":"It offered various courses in her favorite watersport.","is_correct":false},{"key":"B","text":"The instructors there were highly recommended.","is_correct":false},{"key":"C","text":"It wasn’t too far away from where they lived.","is_correct":true},{"key":"D","text":"She had already tried some activities there.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  5,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '60fcba41-3fba-5c4d-96f1-0f962f3fc19a'::uuid,
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  'reading-text-2-2',
  '2',
  'multiple_choice',
  'How did Lily feel about the coasteering course?',
  '[{"key":"A","text":"pleased that it included something she’d always wanted to try","is_correct":true},{"key":"B","text":"excited about doing the experience all on her own","is_correct":false},{"key":"C","text":"keen to find out more about what it involved","is_correct":false},{"key":"D","text":"interested to see whether she was the only teenager","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  6,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'b233e312-b3f6-5c4b-8e2b-d1a5fd513bdd'::uuid,
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  'reading-text-2-3',
  '3',
  'multiple_choice',
  'Lily particularly liked her instructors because they made sure everyone',
  '[{"key":"A","text":"was comfortable with the kit they were given.","is_correct":false},{"key":"B","text":"felt confident about the new things they would attempt.","is_correct":true},{"key":"C","text":"got the same amount of attention.","is_correct":false},{"key":"D","text":"knew all the activities they would take part in.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  6,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'db4028fb-50f7-5ca8-a092-8132e9d2c10f'::uuid,
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  'reading-text-2-4',
  '4',
  'multiple_choice',
  'Lily says that after the course, she was',
  '[{"key":"A","text":"happy she’d shared something so exciting with her dad.","is_correct":false},{"key":"B","text":"sorry she hadn’t worked at getting fitter before she went.","is_correct":false},{"key":"C","text":"proud that her friends all thought she’d done well.","is_correct":false},{"key":"D","text":"surprised at how exhausted she was by the activities.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  6,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '17815cf3-e7e7-51a0-9a36-b3a984b191a4'::uuid,
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  'reading-text-2-5',
  '5',
  'multiple_choice',
  'What would Lily text to a friend while she was away on the course?',
  '[{"key":"A","text":"I don’t think Dad was sure before he came that he’d enjoy it - but actually, he’s been braver than me!","is_correct":true},{"key":"B","text":"I wanted to do the coasteering course, and mentioned it to my parents before my birthday. But I never expected they’d let me go!","is_correct":false},{"key":"C","text":"Our session before the activities was great, although I really didn’t think I’d need a wetsuit for the cold - and I was right!","is_correct":false},{"key":"D","text":"Going into caves was amazing. I’d love to explore them by myself when we’re next at the beach - I’m sure my parents will let me!","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  6,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'abeda796-2a25-5578-85d2-d45ba82c2058'::uuid,
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  'reading-text-3-1',
  '1',
  'multiple_choice',
  'What made Karina keen to take up diving?',
  '[{"key":"A","text":"She wanted to repeat her holiday experience.","is_correct":false},{"key":"B","text":"She found out her athletics hero had taken it up.","is_correct":true},{"key":"C","text":"She’d visited a pool where some teenagers were doing it.","is_correct":false},{"key":"D","text":"She wanted a new challenge after her success at swimming.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  7,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'd8b793ae-1cde-5ef2-b520-56acb72ac760'::uuid,
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  'reading-text-3-2',
  '2',
  'multiple_choice',
  'How did Karina feel the first time she used the highboard?',
  '[{"key":"A","text":"worried about how far it was above the pool","is_correct":false},{"key":"B","text":"pleased to experience it with other beginners","is_correct":false},{"key":"C","text":"confident that she wouldn’t get hurt","is_correct":true},{"key":"D","text":"shocked to hit the water at such speed","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  7,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '013db7dc-0c23-503a-8fc8-a38d49943e43'::uuid,
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  'reading-text-3-3',
  '3',
  'multiple_choice',
  'What does the writer suggest about diving facilities in Karina’s area?',
  '[{"key":"A","text":"They’re not used as much as they could be.","is_correct":false},{"key":"B","text":"There aren’t enough coaches teaching people to use them.","is_correct":false},{"key":"C","text":"There aren’t as many boards as there used to be.","is_correct":false},{"key":"D","text":"They’re not available to the public for long enough each day.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  7,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'ae6c1585-80a1-576e-b100-51ad3dffe4e8'::uuid,
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  'reading-text-3-4',
  '4',
  'multiple_choice',
  'How does Karina feel about spending so much time diving?',
  '[{"key":"A","text":"surprised by one effect it has had on her","is_correct":true},{"key":"B","text":"sorry she no longer sees her friends so much","is_correct":false},{"key":"C","text":"anxious about the amount of money it costs","is_correct":false},{"key":"D","text":"grateful to be able to focus on something she loves","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  7,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '77f5bb66-c89a-52b3-9770-8ab46143c5a5'::uuid,
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  'reading-text-3-5',
  '5',
  'multiple_choice',
  'What would the writer say about Karina?',
  '[{"key":"A","text":"She’s a young girl who’s achieved a lot by becoming a national diving champion - and all with very little support.","is_correct":false},{"key":"B","text":"She’s made enormous progress in a very short time - after only a couple of years, she’s already showing great signs of success.","is_correct":true},{"key":"C","text":"She has a lot of natural talent, but she’s already thinking of having a break from the high board for a while.","is_correct":false},{"key":"D","text":"She’s sad that she’s given up almost everything for her sport - and her lifestyle really sounds quite hard.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  7,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '973d7f20-ca2e-5c43-be4c-b60b1ff05d5f'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-1',
  '1',
  'multiple_choice',
  'Choose the answer for blank (1).',
  '[{"key":"A","text":"to","is_correct":false},{"key":"B","text":"off","is_correct":false},{"key":"C","text":"for","is_correct":true},{"key":"D","text":"with","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '2271f58b-ea60-57bb-994b-40b895b3615a'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-2',
  '2',
  'multiple_choice',
  'Choose the answer for blank (2).',
  '[{"key":"A","text":"said","is_correct":false},{"key":"B","text":"talked","is_correct":false},{"key":"C","text":"spoke","is_correct":false},{"key":"D","text":"told","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'b6894305-493b-598e-a3dd-cffb8214d948'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-3',
  '3',
  'multiple_choice',
  'Choose the answer for blank (3).',
  '[{"key":"A","text":"in","is_correct":false},{"key":"B","text":"at","is_correct":true},{"key":"C","text":"on","is_correct":false},{"key":"D","text":"by","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '14f0b7eb-f13d-544d-8d41-974889d0dfc4'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-4',
  '4',
  'multiple_choice',
  'Choose the answer for blank (4).',
  '[{"key":"A","text":"done","is_correct":true},{"key":"B","text":"made","is_correct":false},{"key":"C","text":"acted","is_correct":false},{"key":"D","text":"worked","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '5a629aef-f589-50c0-9134-da99d3819f7d'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-5',
  '5',
  'multiple_choice',
  'Choose the answer for blank (5).',
  '[{"key":"A","text":"these","is_correct":true},{"key":"B","text":"every","is_correct":false},{"key":"C","text":"each","is_correct":false},{"key":"D","text":"this","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'f6eedf66-c078-5422-9d49-6ac3b73d9a69'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-6',
  '6',
  'multiple_choice',
  'Choose the answer for blank (6).',
  '[{"key":"A","text":"pleased","is_correct":false},{"key":"B","text":"fine","is_correct":false},{"key":"C","text":"clever","is_correct":false},{"key":"D","text":"great","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  5,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '41f82673-3189-5d6f-9186-89f682d8283f'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-7',
  '7',
  'multiple_choice',
  'Choose the answer for blank (7).',
  '[{"key":"A","text":"put","is_correct":false},{"key":"B","text":"set","is_correct":false},{"key":"C","text":"dial","is_correct":true},{"key":"D","text":"hit","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  6,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '52331654-dcf5-54d6-b5b4-b0aeeef891b9'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-8',
  '8',
  'multiple_choice',
  'Choose the answer for blank (8).',
  '[{"key":"A","text":"Since","is_correct":false},{"key":"B","text":"Because","is_correct":true},{"key":"C","text":"As","is_correct":false},{"key":"D","text":"Although","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  7,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '3b675c93-5e71-5945-84a1-57412a6f35a7'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-9',
  '9',
  'multiple_choice',
  'Choose the answer for blank (9).',
  '[{"key":"A","text":"manage","is_correct":false},{"key":"B","text":"find","is_correct":false},{"key":"C","text":"get","is_correct":true},{"key":"D","text":"reach","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  8,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '6a0325e9-b3fa-5a15-9549-9061608bd01c'::uuid,
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  'cloze-text-15-10',
  '10',
  'multiple_choice',
  'Choose the answer for blank (10).',
  '[{"key":"A","text":"agreeable","is_correct":false},{"key":"B","text":"happy","is_correct":false},{"key":"C","text":"grateful","is_correct":true},{"key":"D","text":"approving","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  8,
  null,
  9,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'ac32b080-c0b6-5510-a3fa-c5f187ac85d1'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-61',
  '61',
  'fill_blank',
  'You’ll be caught! (away)
You won’t …',
  '[]'::jsonb,
  '["get away with it!"]'::jsonb,
  9,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '5c564853-2752-55c3-be59-f2a13e09d343'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-62',
  '62',
  'fill_blank',
  'I didn’t do anything wrong! (guilty)
I’m not …',
  '[]'::jsonb,
  '["guilty of anything!"]'::jsonb,
  9,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '0da94ed7-62f3-5f4f-babc-89378c62de97'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-63',
  '63',
  'fill_blank',
  'I was talking to Jo on the phone when we were disconnected. (off)
Jo and I … when we were talking on the phone.',
  '[]'::jsonb,
  '["were cut off"]'::jsonb,
  9,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'c44d2cca-963f-5c3c-8a60-e21ffcc45592'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-64',
  '64',
  'fill_blank',
  'You can have half of this pizza. (share)
I’ll …',
  '[]'::jsonb,
  '["share this pizza with you."]'::jsonb,
  9,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'aefde235-e05a-5124-93aa-b3e0c6cfeaef'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-65',
  '65',
  'fill_blank',
  'I was so ill that I didn’t go to school. (too)
I was …',
  '[]'::jsonb,
  '["too ill to go to school."]'::jsonb,
  9,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '17be5ecf-728a-529d-a747-e4ee418c1571'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-66',
  '66',
  'fill_blank',
  'I’m much better at this job than Gordon is. (than)
Gordon is … I am at this job.',
  '[]'::jsonb,
  '["much worse than"]'::jsonb,
  9,
  null,
  5,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '12279422-3df6-5310-811a-6e57414918d3'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-67',
  '67',
  'fill_blank',
  'There were such a lot of customers that I didn’t get a break all day. (many)
There were … that I didn’t get a break all day.',
  '[]'::jsonb,
  '["so many customers"]'::jsonb,
  9,
  null,
  6,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '59e59c33-b5b7-5737-a008-70aa7227882e'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-68',
  '68',
  'fill_blank',
  'I’ve never done a job more difficult than this. (most)
This is … I’ve ever done.',
  '[]'::jsonb,
  '["the most difficult job"]'::jsonb,
  9,
  null,
  7,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '1d5d079d-7bb2-5d5f-8411-a51cbf8da0ec'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-69',
  '69',
  'fill_blank',
  'The hospital was so big that I couldn’t find my cousin’s bed. (such)
It was … I couldn’t find my cousin’s bed.',
  '[]'::jsonb,
  '["such a big hospital that"]'::jsonb,
  9,
  null,
  8,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'a0bf5832-ad37-53e8-adca-0fc56c146d3e'::uuid,
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  'transformation-70',
  '70',
  'fill_blank',
  'Tim caught a cold on holiday, but I was lucky and I didn’t. (than)
I was … and didn’t catch a cold on holiday.',
  '[]'::jsonb,
  '["luckier than Tim"]'::jsonb,
  9,
  null,
  9,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'db7b56f4-87b6-5809-b668-d00c76cc7c91'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-1',
  '1',
  'fill_blank',
  'I love playing (1) ____________.',
  '[]'::jsonb,
  '["soccer"]'::jsonb,
  11,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '5a5ff0ea-09d9-5b91-bbdd-60d4ea3caedb'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-2',
  '2',
  'fill_blank',
  'I can’t stand doing (2) ____________ either.',
  '[]'::jsonb,
  '["chores"]'::jsonb,
  11,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '28c0886b-a177-58c9-a025-be87c8be6d71'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-3',
  '3',
  'fill_blank',
  'My brother has a new (3) ____________.',
  '[]'::jsonb,
  '["trumpet"]'::jsonb,
  11,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '55204d01-3271-5cce-b506-05c87ba12f57'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-4',
  '4',
  'fill_blank',
  'Some good things about being a kid are: summer (4) ____________.',
  '[]'::jsonb,
  '["vacation"]'::jsonb,
  11,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '00f7f9e7-a052-5be0-bd18-79581bb95fcb'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-5',
  '5',
  'fill_blank',
  'There are some chores I can’t (5) ____________.',
  '[]'::jsonb,
  '["stand"]'::jsonb,
  11,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'd9a8e84d-c14b-50fd-90e5-29ca2e0e004b'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-6',
  '6',
  'fill_blank',
  'I am happy I don’t have to pay (6) ____________.',
  '[]'::jsonb,
  '["taxes"]'::jsonb,
  11,
  null,
  5,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '14441f3f-c452-521a-91f4-2705ab9967f8'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-7',
  '7',
  'fill_blank',
  'I don’t like having to go to bed so early - at (7) ____________.',
  '[]'::jsonb,
  '["7:30"]'::jsonb,
  11,
  null,
  6,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '31671540-f0b2-5dad-bfb8-3b9f925f04f0'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-8',
  '8',
  'fill_blank',
  'That’s probably the (8) ____________ thing about being a kid.',
  '[]'::jsonb,
  '["worst"]'::jsonb,
  11,
  null,
  7,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '82b4a4b3-3aca-5ce0-9063-9cf501f744aa'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-9',
  '9',
  'fill_blank',
  'My parents give me money for (9) ____________.',
  '[]'::jsonb,
  '["allowance"]'::jsonb,
  11,
  null,
  8,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '9f706ec2-36c1-5fc0-9646-ede1eb8ca01e'::uuid,
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  'listening-text-1-10',
  '10',
  'fill_blank',
  'We have (10) ____________ so we can play.',
  '[]'::jsonb,
  '["recess"]'::jsonb,
  11,
  null,
  9,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'fb7b9179-878e-5198-b0ff-af3267a303b6'::uuid,
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  'listening-text-31-1',
  '1',
  'multiple_choice',
  'What is the main topic of the conversation?',
  '[{"key":"A","text":"Problems with living in an apartment","is_correct":false},{"key":"B","text":"A search for a new apartment","is_correct":true},{"key":"C","text":"The cost of rent near universities","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  12,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '29f710bd-f89f-5134-bd4a-a35e2732da30'::uuid,
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  'listening-text-31-2',
  '2',
  'multiple_choice',
  'Why doesn’t Ann like her current apartment?',
  '[{"key":"A","text":"It’s too expensive.","is_correct":false},{"key":"B","text":"The neighborhood is noisy.","is_correct":false},{"key":"C","text":"It’s located some distance from school.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  12,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '00870198-5ab1-500f-878d-03ba410ac9d2'::uuid,
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  'listening-text-31-3',
  '3',
  'multiple_choice',
  'How much money does Ann want to pay for rent?',
  '[{"key":"A","text":"No more than $200","is_correct":true},{"key":"B","text":"Around $200","is_correct":false},{"key":"C","text":"A little more than $200","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  12,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '072e7bc3-3ecc-55c4-b03a-baf29f8413c9'::uuid,
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  'listening-text-31-4',
  '4',
  'multiple_choice',
  'What kind of place is she looking for?',
  '[{"key":"A","text":"Somewhere that is within a short driving distance of campus","is_correct":false},{"key":"B","text":"An apartment with furniture already in it","is_correct":true},{"key":"C","text":"A place where she can live alone","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  12,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'f7ce4e5b-d2b3-5e3c-b250-057d57581e9b'::uuid,
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  'listening-text-31-5',
  '5',
  'multiple_choice',
  'How is Roger going to help her?',
  '[{"key":"A","text":"He is planning on calling a friend who owns an apartment building.","is_correct":false},{"key":"B","text":"He will check the newspapers to see if he can find an apartment for rent.","is_correct":false},{"key":"C","text":"He is going to visit an apartment building near his place.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  12,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'f0461d3b-0ca8-54a8-af0e-19e1f1b759e9'::uuid,
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  'listening-text-34-1',
  '1',
  'multiple_choice',
  'What kind of movie is the girl going to see on her date?',
  '[{"key":"A","text":"Horror","is_correct":false},{"key":"B","text":"Romance","is_correct":false},{"key":"C","text":"Science fiction","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  13,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'd55ed2f5-bcea-5d7b-beea-f9c50afc87de'::uuid,
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  'listening-text-34-2',
  '2',
  'multiple_choice',
  'At what theater is the movie playing?',
  '[{"key":"A","text":"Central Palace","is_correct":false},{"key":"B","text":"Campus Plaza","is_correct":true},{"key":"C","text":"Common Plex","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  13,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'ddda07ee-a2ee-5889-93d2-d80f9b65e620'::uuid,
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  'listening-text-34-3',
  '3',
  'multiple_choice',
  'How is the girl getting to the movie?',
  '[{"key":"A","text":"She is getting a ride with her brother.","is_correct":false},{"key":"B","text":"Her date is coming to pick her up.","is_correct":true},{"key":"C","text":"She is going by bus and will meet her date there.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  13,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '626b6728-18b8-536d-9e90-00e9bbfa5a6d'::uuid,
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  'listening-text-34-4',
  '4',
  'multiple_choice',
  'What time does the movie begin?',
  '[{"key":"A","text":"7:30 p.m.","is_correct":true},{"key":"B","text":"8:00 p.m.","is_correct":false},{"key":"C","text":"8:30 p.m.","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  13,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '389d55b0-35b5-5a30-9abb-361a7858ad47'::uuid,
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  'listening-text-34-5',
  '5',
  'multiple_choice',
  'What time does she have to be home?',
  '[{"key":"A","text":"10:00 p.m.","is_correct":false},{"key":"B","text":"10:30 p.m.","is_correct":false},{"key":"C","text":"11:00 p.m.","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  13,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '71eea00a-10f8-5cd5-92a8-ad9514fd4d6d'::uuid,
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  'listening-text-52-1',
  '1',
  'true_false',
  'The main idea of the talk is one reason for long-distance running.',
  '[{"key":"A","text":"True","is_correct":true},{"key":"B","text":"False","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  14,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'd54016f7-45e9-528f-85db-659b2a9c360c'::uuid,
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  'listening-text-52-2',
  '2',
  'true_false',
  'The professor organizes the information in the lecture by describing a process.',
  '[{"key":"A","text":"True","is_correct":true},{"key":"B","text":"False","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  14,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'e9b1136c-e45c-5b3f-af42-fdfe20e0fe0e'::uuid,
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  'listening-text-52-3',
  '3',
  'true_false',
  'Clever traps is the type of hunt that is being done by the San people.',
  '[{"key":"A","text":"True","is_correct":false},{"key":"B","text":"False","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  14,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '613a6a65-6fb2-5629-9865-f4e36974d96d'::uuid,
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  'listening-text-52-4',
  '4',
  'true_false',
  'The San people are in Asia.',
  '[{"key":"A","text":"True","is_correct":false},{"key":"B","text":"False","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  14,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'fe4e4a28-f62b-5f5b-8aca-5a9c2cd3f6ba'::uuid,
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  'listening-text-52-5',
  '5',
  'true_false',
  'Track and Field events happened long before they became a sport.',
  '[{"key":"A","text":"True","is_correct":true},{"key":"B","text":"False","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  14,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '19e71634-3e45-5419-8ef3-0df8a91fdb8e'::uuid,
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  'listening-text-56-1',
  '1',
  'true_false',
  'The professor mainly discusses the importance of getting vitamin D from sunshine as an aspect of health.',
  '[{"key":"A","text":"True","is_correct":true},{"key":"B","text":"False","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  15,
  null,
  0,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '4ce1a9bc-55f7-58af-96d5-e25025cf487a'::uuid,
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  'listening-text-56-2',
  '2',
  'true_false',
  'The speaker’s main point is to get enough vitamin D, we need sunshine.',
  '[{"key":"A","text":"True","is_correct":true},{"key":"B","text":"False","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  15,
  null,
  1,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '4084c6d3-a906-5351-900c-9e115f4831e7'::uuid,
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  'listening-text-56-3',
  '3',
  'true_false',
  'The professor emphasizes her point about getting enough vitamin D by showing what happens when we’re in the sun.',
  '[{"key":"A","text":"True","is_correct":false},{"key":"B","text":"False","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  15,
  null,
  2,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  'ecdd062f-e0cd-56a2-928c-ce9eaec34f0b'::uuid,
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  'listening-text-56-4',
  '4',
  'true_false',
  'Without Vitamin D, we may develop strong bones and teeth.',
  '[{"key":"A","text":"True","is_correct":false},{"key":"B","text":"False","is_correct":true}]'::jsonb,
  '[]'::jsonb,
  15,
  null,
  3,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

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
  metadata
) values (
  '05445c8d-2664-5a5e-a1f1-0586d0a77709'::uuid,
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  'listening-text-56-5',
  '5',
  'true_false',
  'Too much sunshine can cause skin cancer.',
  '[{"key":"A","text":"True","is_correct":true},{"key":"B","text":"False","is_correct":false}]'::jsonb,
  '[]'::jsonb,
  15,
  null,
  4,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18}'::jsonb
)
on conflict (activity_id, source_key) do update set
  source_number = excluded.source_number,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  options = excluded.options,
  accepted_answers = excluded.accepted_answers,
  source_page = excluded.source_page,
  image_url = null,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '28b1c838-a209-5b9f-8e57-b3a0981b98af'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-1-grammar-use-of-english',
  'grammar',
  'Grammar and Use of English',
  'Choose the best answer among A, B, C, or D.',
  'activity',
  'd96a13eb-13ef-59f5-b700-7af504bc024c'::uuid,
  1,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"grammar-use-of-english"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '2874f1fc-0a21-5304-8d13-05480f11d6ca'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-2-signs',
  'signs',
  'Signs',
  'Read each sign and choose the best answer among A, B, C, or D. Sign images are pending admin upload and were not OCR-transcribed.',
  'activity',
  'f8bcae7f-728e-5780-b76d-a877d870aad6'::uuid,
  2,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"signs"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '94a843c2-4e77-5f4d-82cd-be2594707c6b'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-3-reading-text-2-coasteering',
  'reading',
  'Text 2: Coasteering',
  'Read the passage carefully and choose the correct answer among A, B, C, or D.',
  'activity',
  'eb32c551-8492-52f1-ae2c-1f555a4edc0d'::uuid,
  3,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"reading-text-2-coasteering"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  'b1e8c9ce-1d70-59df-a886-dd4acd88e64f'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-4-reading-text-3-karina-moore',
  'reading',
  'Text 3: Karina Moore - Teenage High Diver!',
  'Read the passage carefully and choose the correct answer among A, B, C, or D.',
  'activity',
  'edca1111-734d-5da3-ab53-3897fe21642c'::uuid,
  4,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"reading-text-3-karina-moore"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '7fbd632a-93f8-5d70-b66c-9b7627377c51'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-5-cloze-text-15-william-the-hero',
  'cloze',
  'Text 15: William the hero!',
  'Fill in each numbered blank with one suitable word or phrase.',
  'activity',
  '347e3b87-e118-51af-95a0-89c1524c207b'::uuid,
  5,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"cloze-text-15-william-the-hero"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '6d1822c3-04d2-5902-adec-ca876fb87fff'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-6-sentence-transformation',
  'transformation',
  'Sentence Transformation',
  'Complete the second sentence using the word in brackets so that it has the same meaning as the first sentence.',
  'activity',
  '37da03a9-1cb8-593e-bc87-0289fd58c103'::uuid,
  6,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"sentence-transformation"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  'e88c1950-6933-56ee-b767-faccb56d9056'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-7-writing-topic-7',
  'writing',
  'Writing Topic 7: Applying for a Part-Time Job',
  'Use an appropriate letter/email format, state the purpose, present and extend all bullet points, link ideas coherently, and use accurate vocabulary and varied grammar.',
  'prompt',
  'd27e4873-ceb1-558f-9368-b5929c6f7dba'::uuid,
  7,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"writing-topic-7"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  'f1ce59e9-1f44-536c-8c93-d03befb56aea'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-8-listening-text-1',
  'listening',
  'Listening Text 1: Being a Kid',
  'Listen and fill in the missing words in the blanks.',
  'activity',
  'bc2e71ce-453d-555d-bf44-a287d6f7e909'::uuid,
  8,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"listening-text-1"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '400b046f-b25c-5f9e-b998-fb11f4c2c727'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-9-listening-text-31',
  'listening',
  'Listening Text 31: Apartment Search',
  'Listen carefully and choose the best answer (A, B, or C) for each question.',
  'activity',
  '6c677672-60bc-5788-8f2f-6d60aa839ad5'::uuid,
  9,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"listening-text-31"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  'f4ca1af5-f17f-55bd-af32-29a9aee50206'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-10-listening-text-34',
  'listening',
  'Listening Text 34: Movie Date',
  'Listen carefully and choose the best answer (A, B, or C) for each question.',
  'activity',
  '3471a5a5-1d67-5662-a0d4-1232517916ec'::uuid,
  10,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"listening-text-34"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '72e935b3-77e6-573f-9a81-312094b617c9'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-11-listening-text-52',
  'listening',
  'Listening Text 52: Long-Distance Running',
  'Listen and decide if the following statements are True (T) or False (F).',
  'activity',
  '76f1c818-8a6f-5858-aea4-7ec19cd5a8bf'::uuid,
  11,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"listening-text-52"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '46623838-6f83-525a-b319-e1f7b956b81c'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-12-listening-text-56',
  'listening',
  'Listening Text 56: Vitamin D and Sunshine',
  'Listen and decide if the following statements are True (T) or False (F).',
  'activity',
  '88cc0703-122f-5a80-a3b4-01791d001d49'::uuid,
  12,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"listening-text-56"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  'c1d0f82c-de52-5240-8767-de5f937683a0'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-13-speaking-test-instructions',
  'speaking',
  'Speaking Test Instructions - CEFR B1',
  'Follow the three speaking-test phases and the timing shown in the source.',
  'prompt',
  '8805b86d-cd1a-5d1e-b181-00ddb66d27c7'::uuid,
  13,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"speaking-test-instructions"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '8ed744a7-091f-5b56-9fd4-0107068c606b'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-14-speaking-example-famous-person',
  'speaking',
  'Example: A Famous Person You Would Like to Meet',
  'Further discussion: What is he/she like? What does he/she look like? How would you feel if you met this famous person? What would you say or ask if you had the chance to meet this famous person? Have you ever had the opportunity to meet a celebrity or famous person before? Do you think it is important for young people to have positive role models among famous individuals?',
  'prompt',
  '5b516ad2-fdee-5a34-8091-00c0d35b5519'::uuid,
  14,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"speaking-example-famous-person"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '07b100e8-0dca-5714-97b6-dd0ec8373a52'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-15-speaking-topic-33',
  'speaking',
  'Topic 33: A Park You Like Visiting',
  null,
  'prompt',
  '697a21b6-1706-5dd6-82c0-55baa4dc74c2'::uuid,
  15,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"speaking-topic-33"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '27102c4e-ef2f-528a-af5f-c88d2616669e'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-16-speaking-topic-34',
  'speaking',
  'Topic 34: A Time When You Cooked a Meal',
  null,
  'prompt',
  'd707199f-80a5-585b-a8c9-05f87c21a3af'::uuid,
  16,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"speaking-topic-34"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

insert into public.exam_sections (
  id,
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
) values (
  '022c560d-7424-5bfc-ba8f-36cfec800284'::uuid,
  'a9b0dbd3-7aea-55fa-8b27-0d9234daf205'::uuid,
  'section-17-speaking-topic-35',
  'speaking',
  'Topic 35: A Time When You Spent a Lot of Money',
  null,
  'prompt',
  'd76c945a-fef1-5acc-b510-90d975b64b4a'::uuid,
  17,
  true,
  null,
  '{"source_document":"DeFull Copy.pdf","source_page_count":18,"resource_source_key":"speaking-topic-35"}'::jsonb
)
on conflict (exam_id, source_key) do update set
  skill = excluded.skill,
  title = excluded.title,
  instructions = excluded.instructions,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  order_index = excluded.order_index,
  is_required = excluded.is_required,
  suggested_time_minutes = excluded.suggested_time_minutes,
  metadata = excluded.metadata;

commit;
