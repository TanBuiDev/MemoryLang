import postgres from 'postgres';
const sql = postgres('postgresql://postgres:MsMSuqhLo3Mzr3h0@db.brwvbpkgimhamivmaflu.supabase.co:5432/postgres');

async function test() {
  try {
    const res = await sql`
      SELECT
        regexp_replace(lower(btrim(regexp_replace(
          concat_ws(' ', 
            trim((regexp_split_to_array(split_part('You wouldn''t ...\nif the fish had been cooked properly.', E'\\n', 2), '\\.{3,}|_{3,}|…'))[1]),
            trim('have become ill'),
            trim((regexp_split_to_array(split_part('You wouldn''t ...\nif the fish had been cooked properly.', E'\\n', 2), '\\.{3,}|_{3,}|…'))[2])
          )
        , '[[:punct:]]', '', 'g'))), '\\s+', ' ', 'g') as test_result
    `;
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
  }
}

test();
