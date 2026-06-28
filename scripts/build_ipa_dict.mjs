import fs from 'node:fs'

const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'

// Step 1: Build word-to-IPA dictionary from entries that already have IPA
// Read all rows from the DB (we'll fetch via SQL)

console.log(`
-- Step 1: Build word-to-IPA dictionary from existing data
-- Step 2: For each entry without IPA, look up each word
-- Step 3: Concatenate and UPDATE

-- First, let's extract IPA for common words from existing data
`)

// Known TOEIC vocabulary IPA dictionary from our data
const ipaDict = {
  "a": "/ə/",
  "an": "/ən/",
  "the": "/ðə/",
  "of": "/ɒv/",
  "in": "/ɪn/",
  "on": "/ɑːn/",
  "at": "/æt/",
  "to": "/tuː/",
  "for": "/fɔːr/",
  "with": "/wɪð/",
  "from": "/frɒm/",
  "by": "/baɪ/",
  "as": "/æz/",
  "is": "/ɪz/",
  "are": "/ɑːr/",
  "was": "/wɒz/",
  "were": "/wɜːr/",
  "be": "/biː/",
  "been": "/biːn/",
  "has": "/hæz/",
  "have": "/hæv/",
  "had": "/hæd/",
  "do": "/duː/",
  "does": "/dʌz/",
  "did": "/dɪd/",
  "will": "/wɪl/",
  "would": "/wʊd/",
  "can": "/kæn/",
  "could": "/kʊd/",
  "should": "/ʃʊd/",
  "may": "/meɪ/",
  "might": "/maɪt/",
  "must": "/mʌst/",
  "not": "/nɒt/",
  "or": "/ɔːr/",
  "and": "/ænd/",
  "but": "/bʌt/",
  "if": "/ɪf/",
  "than": "/ðæn/",
  "then": "/ðen/",
  "also": "/ˈɔːl.soʊ/",
  "very": "/ˈver.i/",
  "really": "/ˈriː.ə.li/",
  "just": "/dʒʌst/",
  "now": "/naʊ/",
  "new": "/njuː/",
  "about": "/əˈbaʊt/",
  "after": "/ˈæf.tər/",
  "before": "/bɪˈfɔːr/",
  "during": "/ˈdʊr.ɪŋ/",
  "since": "/sɪns/",
  "until": "/ʌnˈtɪl/",
  "while": "/waɪl/",
  "because": "/bɪˈkɒz/",
  "although": "/ɔːlˈðoʊ/",
  "however": "/haʊˈev.ər/",
  "therefore": "/ˈðeə.fɔːr/",
  "more": "/mɔːr/",
  "most": "/moʊst/",
  "some": "/sʌm/",
  "any": "/ˈen.i/",
  "all": "/ɔːl/",
  "both": "/boʊθ/",
  "each": "/iːtʃ/",
  "few": "/fjuː/",
  "many": "/ˈmen.i/",
  "much": "/mʌtʃ/",
  "other": "/ˈʌð.ər/",
  "own": "/oʊn/",
  "same": "/seɪm/",
  "such": "/sʌtʃ/",
  "that": "/ðæt/",
  "this": "/ðɪs/",
  "these": "/ðiːz/",
  "those": "/ðoʊz/",
  "it": "/ɪt/",
  "its": "/ɪts/",
  "he": "/hiː/",
  "she": "/ʃiː/",
  "they": "/ðeɪ/",
  "we": "/wiː/",
  "you": "/juː/",
  "your": "/jɔːr/",
  "our": "/aʊər/",
  "their": "/ðeər/",
  "his": "/hɪz/",
  "her": "/hɜːr/",
  "my": "/maɪ/",
  "one": "/wʌn/",
  "two": "/tuː/",
  "first": "/fɜːrst/",
  "last": "/lɑːst/",
  "next": "/nekst/",
  "only": "/ˈoʊn.li/",
  "still": "/stɪl/",
  "yet": "/jet/",
  "already": "/ɔːlˈred.i/",
  "always": "/ˈɔːl.weɪz/",
  "never": "/ˈnev.ər/",
  "often": "/ˈɒf.ən/",
  "sometimes": "/ˈsʌm.taɪmz/",
  "usually": "/ˈjuː.ʒu.ə.li/",
  "well": "/wel/",
  "too": "/tuː/",
  "enough": "/ɪˈnʌf/",
  "quite": "/kwaɪt/",
  "rather": "/ˈrɑː.ðər/",
  "almost": "/ˈɔːl.moʊst/",
  "perhaps": "/pərˈhæps/",
}

// Read TOEIC rows to extract more IPA entries
const rows = JSON.parse(fs.readFileSync('scripts/toeic_rows.json', 'utf-8'))
for (const r of rows) {
  if (r.ipa && r.item_type === 'word') {
    const word = r.source_text.toLowerCase().trim()
    if (!ipaDict[word]) {
      ipaDict[word] = r.ipa.split(' (')[0].split(' or')[0].trim()
    }
  }
}

// Also add entries from the user_terms that have IPA
// We'll generate SQL that reads from the DB directly

// Generate SQL: find entries without IPA, generate IPA from word dictionary
// This is complex to do in SQL, so let's generate a script approach

// Instead, let's generate a lookup table and a function
const dictEntries = Object.entries(ipaDict)
  .filter(([w]) => w.length > 0 && !w.includes("'"))
  .map(([word, ipa]) => {
    const cleanIpa = ipa.replace(/^\//, '').replace(/\/$/, '')
    return { word, ipa: cleanIpa }
  })

// Write dictionary as JSON for the update script
fs.writeFileSync('scripts/ipa_dict.json', JSON.stringify(dictEntries, null, 2), 'utf-8')
console.log(`IPA dictionary: ${dictEntries.length} words`)
console.log('Sample:', dictEntries.slice(0, 20).map(d => `${d.word}=${d.ipa}`).join(', '))
