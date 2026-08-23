const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.brwvbpkgimhamivmaflu:MsMSuqhLo3Mzr3h0@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  try {
    // Attempt the query. Wait, we can't call the function directly because auth.uid() will be NULL.
    // Let's test the specific regex part of the function that might be failing!
    
    const query = `
    SELECT
        regexp_replace(lower(btrim(regexp_replace(
          concat_ws(' ', 
            trim((regexp_split_to_array(split_part('You wouldn''t ...\nif the fish had been cooked properly.', E'\\n', 2), '\\.{3,}|_{3,}|…'))[1]),
            trim('have become ill'),
            trim((regexp_split_to_array(split_part('You wouldn''t ...\nif the fish had been cooked properly.', E'\\n', 2), '\\.{3,}|_{3,}|…'))[2])
          )
        , '[[:punct:]]', '', 'g'))), '\\s+', ' ', 'g') as test_result
    `;
    const res = await client.query(query);
    console.log(res.rows);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}
run();
