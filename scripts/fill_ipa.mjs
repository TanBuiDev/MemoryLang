import fs from 'node:fs'

const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'
const dict = JSON.parse(fs.readFileSync('scripts/ipa_dict.json', 'utf-8'))

// Build lookup map
const ipaMap = {}
for (const { word, ipa } of dict) {
  ipaMap[word] = ipa
}

// These are grammar/syntax patterns - no IPA
const grammarPatterns = new Set([
  'S + Adv + V', 'be + Adv + Adj', 'as a result, + clause',
  'encourage + O + to V', 'be subject to + N/Ving', 'be accustomed to + N/Ving',
  'due to + N/Ving', 'contribute to + N/Ving', 'be eligible for + N / to V',
  'common toeic adverbs', 'Common TOEIC Adverbs'
])

// This function generates IPA for a text by looking up each word
function generateIpa(text) {
  // Remove special characters and split
  const clean = text
    .replace(/['']/g, '')
    .replace(/[,.;:!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = clean.split(' ')
  const ipas = []
  for (const w of words) {
    const lower = w.toLowerCase()
    if (ipaMap[lower]) {
      ipas.push(ipaMap[lower])
    } else if (w.length <= 2) {
      // Short function words we might miss
      ipas.push(w.toLowerCase())
    } else {
      // Unknown word - try to estimate
      ipas.push('?')
    }
  }
  if (ipas.length === 0) return null
  if (ipas.some(i => i === '?')) {
    // Has unknown words - still generate but mark
  }
  return '/' + ipas.join(' ') + '/'
}

// Read the list of entries needing IPA (simulated - we'll generate SQL)
// For now, let's generate UPDATE statements for common patterns

// We know the entries without IPA from the earlier query.
// Let's generate bulk UPDATE for the ones we can handle.

const updates = []

// Common TOEIC phrases that need IPA
const manualPhrases = {
  'antique shop': "/ænˈtiːk ʃɒp/",
  'roofing nail': "/ˈruː.fɪŋ neɪl/",
  'administrative assistant': "/ədˌmɪn.ɪˈstreɪ.tɪv əˈsɪs.tənt/",
  'botanical garden': "/bəˈtæn.ɪ.kəl ˈɡɑː.dən/",
  'cash register': "/kæʃ ˈrɛdʒ.ɪ.stər/",
  'cathedral ceiling': "/kəˈθiː.drəl ˈsiː.lɪŋ/",
  'charitable organization': "/ˈtʃær.ɪ.tə.bəl ˌɔː.ɡən.aɪˈzeɪ.ʃən/",
  'commemorative plaque': "/kəˈmɛm.ər.ə.tɪv plæk/",
  'complaint form': "/kəmˈpleɪnt fɔːrm/",
  'computer virus': "/kəmˈpjuː.tər ˈvaɪ.rəs/",
  'construction site': "/kənˈstrʌk.ʃən saɪt/",
  'corporate merger': "/ˈkɔː.pər.ɪt ˈmɜː.dʒər/",
  'customer satisfaction': "/ˈkʌs.tə.mər ˌsæt.ɪsˈfæk.ʃən/",
  'distribution center': "/ˌdɪs.trɪˈbjuː.ʃən ˈsen.tər/",
  'farewell luncheon': "/ˈfeə.wɛl ˈlʌn.tʃən/",
  'farm-to-table': "/fɑːm tuː ˈteɪ.bəl/",
  'geothermal well': "/ˌdʒiː.əʊˈθɜː.məl wɛl/",
  'hiring manager': "/ˈhaɪərɪŋ ˈmænɪdʒər/",
  'human resources': "/ˈhjuː.mən rɪˈzɔː.sɪz/",
  'interior decorator': "/ɪnˈtɪər.i.ər ˈdɛk.ər.eɪ.tər/",
  'marble floor': "/ˈmɑː.bəl flɔːr/",
  'marketing campaign': "/ˈmɑː.kɪ.tɪŋ kæmˈpeɪn/",
  'media organization': "/ˈmiː.di.ə ˌɔː.ɡən.aɪˈzeɪ.ʃən/",
  'medication refill': "/ˌmɛd.ɪˈkeɪ.ʃən ˈriː.fɪl/",
  'mosaic workshop': "/məʊˈzeɪ.ɪk ˈwɜːk.ʃɒp/",
  'movie premiere': "/ˈmuː.vi prɪˈmɪər/",
  'press release': "/prɛs rɪˈliːs/",
  'property manager': "/ˈprɒp.ə.ti ˈmæn.ɪ.dʒər/",
  'rain garden': "/reɪn ˈɡɑː.dən/",
  'real estate agent': "/riːl ɪˈsteɪt ˈeɪ.dʒənt/",
  'surface transportation': "/ˈsɜː.fɪs ˌtræns.pɔːrˈteɪ.ʃən/",
  'sweeping view': "/ˈswiː.pɪŋ vjuː/",
  'underground minerals': "/ˌʌn.dərˈɡraʊnd ˈmɪn.ər.əlz/",
  'over-the-counter medication': "/ˌoʊ.vər.ðəˈkaʊn.tər ˌmed.ɪˈkeɪ.ʃən/",
  'flash-frozen food': "/flæʃ ˈfroʊ.zən fuːd/",
  'job seeker': "/dʒɒb ˈsiː.kər/",
  'interest rate': "/ˈɪn.trəst reɪt/",
  'post office': "/ˈpoʊst ˌɒf.ɪs/",
  'long-term employment': "/ˌlɔːŋˈtɜːrm ɪmˈplɔɪ.mənt/",
  'shipping charges': "/ˈʃɪp.ɪŋ ˌtʃɑːr.dʒɪz/",
  'billing statement': "/ˈbɪl.ɪŋ ˈsteɪt.mənt/",
  'attendance record': "/əˈten.dəns ˈrek.ɔːrd/",
  'weather condition': "/ˈweð.ər kənˈdɪʃ.ən/",
  'constructive criticism': "/kənˈstrʌk.tɪv ˈkrɪt.ɪ.sɪ.zəm/",
  'defective merchandise': "/dɪˈfek.tɪv ˈmɜːr.tʃən.daɪz/",
  'persuasive arguments': "/pərˈsweɪ.sɪv ˈɑːr.ɡjə.mənts/",
  'creative ideas': "/kriˈeɪ.tɪv aɪˈdiː.əz/",
  'immediate supervisor': "/ɪˈmiː.di.ət ˈsuː.pər.vaɪ.zər/",
  'job openings': "/dʒɒb ˈoʊ.pən.ɪŋz/",
  'conference participants': "/ˈkɑːn.fər.əns pɑːrˈtɪs.ɪ.pənts/",
  'registration instructions': "/ˌredʒ.ɪˈstreɪ.ʃən ɪnˈstrʌk.ʃənz/",
  'technical support workers': "/ˈtek.nɪ.kəl səˈpɔːrt ˈwɜːr.kərz/",
  'probable investors': "/ˈprɑː.bə.bəl ɪnˈves.tərz/",
  'written notification': "/ˈrɪt.ən ˌnoʊ.tɪ.fɪˈkeɪ.ʃən/",
  'impressive new cars': "/ɪmˈpres.ɪv njuː kɑːrz/",
  'additional investment': "/əˈdɪʃ.ən.əl ɪnˈvest.mənt/",
  'final conclusions': "/ˈfaɪ.nəl kənˈkluː.ʒənz/",
  'considerable efforts': "/kənˈsɪd.ər.ə.bəl ˈef.ərts/",
  'a financial consultant': "/ə faɪˈnæn.ʃəl kənˈsʌl.tənt/",
  'a leave of absence': "/ə liːv əv ˈæb.səns/",
  'a parking permit': "/ə ˈpɑːr.kɪŋ ˈpɜːr.mɪt/",
  'a recent study': "/ə ˈriː.sənt ˈstʌd.i/",
  'a study': "/ə ˈstʌd.i/",
  'an experienced manager': "/ən ɪkˈspɪr.i.ənst ˈmæn.ɪ.dʒər/",
  'an inspection': "/ən ɪnˈspek.ʃən/",
  'an increasingly competitive market': "/ən ɪnˈkriː.sɪŋ.li kəmˈpet.ɪ.tɪv ˈmɑːr.kɪt/",
  'the first stage of development': "/ðə fɜːrst steɪdʒ əv dɪˈvel.əp.mənt/",
  'the most promising candidate': "/ðə moʊst ˈprɑː.mɪ.sɪŋ ˈkæn.dɪ.deɪt/",
  'the present production schedule': "/ðə ˈprez.ənt prəˈdʌk.ʃən ˈskedʒ.uːl/",
  'the suggested revisions': "/ðə səˈdʒes.tɪd rɪˈvɪʒ.ənz/",
  'the terms of agreement': "/ðə tɜːrmz əv əˈɡriː.mənt/",
  'extremely competitive business world': "/ɪkˈstriːm.li kəmˈpet.ɪ.tɪv ˈbɪz.nɪs wɜːrld/",
}

// Generate CASE WHEN SQL
const cases = Object.entries(manualPhrases).map(([text, ipa]) => {
  const esc = (s) => s.replace(/'/g, "''")
  return `WHEN source_text = '${esc(text)}' THEN '${esc(ipa)}'`
})

// Also generate IPA for entries where we can use the dictionary
// For remaining entries, set to NULL (grammar patterns)
const sql = `UPDATE public.user_terms SET ipa = CASE
${cases.join('\n')}
END
WHERE user_id = '${USER_ID}' AND source_text IN (${Object.keys(manualPhrases).map(t => `'${t.replace(/'/g, "''")}'`).join(', ')})
AND ipa IS NULL;`

fs.writeFileSync('scripts/fill_ipa_phrases.sql', sql, 'utf-8')
console.log(`Generated SQL for ${Object.keys(manualPhrases).length} phrases`)
console.log(`SQL size: ${sql.length} chars`)
