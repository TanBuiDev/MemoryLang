import fs from 'node:fs'

const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'
const dict = JSON.parse(fs.readFileSync('scripts/ipa_dict.json', 'utf-8'))
const ipaMap = {}
for (const { word, ipa } of dict) ipaMap[word] = ipa

// Grammar patterns to skip
const skip = new Set([
  'S + Adv + V', 'be + Adv + Adj', 'as a result, + clause',
  'encourage + O + to V', 'be subject to + N/Ving', 'be accustomed to + N/Ving',
  'due to + N/Ving', 'contribute to + N/Ving', 'be eligible for + N / to V',
  'common toeic adverbs', 'Common TOEIC Adverbs'
])

function generateIpa(text) {
  const clean = text.replace(/['']/g, '').replace(/[,.;:!?()"'\\-]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = clean.split(' ')
  const parts = []
  for (const w of words) {
    const l = w.toLowerCase()
    if (ipaMap[l]) { parts.push(ipaMap[l]) }
    else { parts.push(l) }
  }
  return parts.length ? '/' + parts.join(' ') + '/' : null
}

// Generate SQL for ALL entries without IPA
// We'll generate a CASE WHEN statement with all entries
// Read the list from a file (we'll generate it)

const updates = []
const entries = [
  // Idioms
  ["right", "/raɪt/"],
  ["at no cost", "/æt noʊ kɒst/"],
  ["by means of", "/baɪ miːnz ɒv/"],
  ["in honor of", "/ɪn ˈɒn.ər ɒv/"],
  ["at all time", "/æt ɔːl taɪm/"],
  ["be noted for", "/biː ˈnoʊ.tɪd fɔːr/"],
  ["upon request", "/əˈpɒn rɪˈkwest/"],
  ["in excess of", "/ɪn ɪkˈses ɒv/"],
  ["on behalf of", "/ɒn bɪˈhæf ɒv/"],
  ["at the latest", "/æt ðə ˈleɪ.tɪst/"],
  ["go into effect", "/ɡoʊ ˈɪn.tuː ɪˈfekt/"],
  ["be on schedule", "/biː ɒn ˈʃed.juːl/"],
  ["under warranty", "/ˈʌn.dər ˈwɒr.ən.ti/"],
  ["in addition to", "/ɪn əˈdɪʃ.ən tuː/"],
  ["at one's expense", "/æt wʌnz ɪkˈspens/"],
  ["be responsive to", "/biː rɪˈspɒn.sɪv tuː/"],
  ["a parking permit", "/ə ˈpɑːr.kɪŋ ˈpɜːr.mɪt/"],
  ["be familiar with", "/biː fəˈmɪl.i.ər wɪð/"],
  ["weather condition", "/ˈweð.ər kənˈdɪʃ.ən/"],
  ["in celebration of", "/ɪn ˌsel.ɪˈbreɪ.ʃən ɒv/"],
  ["right/promptly/immediately before (after)", "/raɪt ˈprɒmpt.li ɪˈmiː.di.ət.li bɪˈfɔːr ˈæf.tər/"],
  ["be responsible for be", "/biː rɪˈspɒn.sɪ.bəl fɔːr biː/"],
  ["reserve the right to do", "/rɪˈzɜːrv ðə raɪt tuː duː/"],
  ["in accordance with", "/ɪn əˈkɔːr.dəns wɪð/"],
  ["in compliance with", "/ɪn kəmˈplaɪ.əns wɪð/"],
  ["in conjunction with", "/ɪn kənˈdʒʌŋk.ʃən wɪð/"],
  ["be compatible with", "/biː kəmˈpæt.ɪ.bəl wɪð/"],
  ["be associated with", "/biː əˈsoʊ.si.eɪ.tɪd wɪð/"],
  ["be able to do sth", "/biː ˈeɪ.bəl tuː duː ˈsʌm.θɪŋ/"],
  ["above one's expectation", "/əˈbʌv wʌnz ˌek.spekˈteɪ.ʃən/"],
  ["be eligible for + sth", "/biː ˈel.ɪ.dʒə.bəl fɔːr ˈsʌm.θɪŋ/"],
  ["be subject to+ sth, Ving", "/biː ˈsʌb.dʒekt tuː ˈsʌm.θɪŋ/"],
  ["take safety precautions", "/teɪk ˈseɪf.ti prɪˈkɔː.ʃənz/"],
  ["within 7 days of purchase", "/wɪðˈɪn ˈsev.ən deɪz ɒv ˈpɜːr.tʃəs/"],
  ["until further notice", "/ʌnˈtɪl ˈfɜːr.ðər ˈnoʊ.tɪs/"],
]

// Common short phrases
const shortPhrases = [
  ["about / almost", "/əˈbaʊt / ˈɔːl.moʊst/"],
  ["agree with", "/əˈɡriː wɪð/"],
  ["apply for", "/əˈplaɪ fɔːr/"],
  ["arrive in", "/əˈraɪv ɪn/"],
  ["because of", "/bɪˈkɒz ɒv/"],
  ["become available", "/bɪˈkʌm əˈveɪ.lə.bəl/"],
  ["behind schedule", "/bɪˈhaɪnd ˈʃed.juːl/"],
  ["beyond one's expectations", "/bɪˈjɒnd wʌnz ˌek.spekˈteɪ.ʃənz/"],
  ["comply with", "/kəmˈplaɪ wɪð/"],
  ["comly with", "/kəmˈplaɪ wɪð/"],
  ["deal with", "/diːl wɪð/"],
  ["in charge of", "/ɪn tʃɑːrdʒ ɒv/"],
  ["in combination with", "/ɪn ˌkɒm.bɪˈneɪ.ʃən wɪð/"],
  ["in observance of", "/ɪn əbˈzɜːr.vəns ɒv/"],
  ["in order to V", "/ɪn ˈɔːr.dər tuː/"],
  ["in writing", "/ɪn ˈraɪ.tɪŋ/"],
  ["out of order", "/aʊt ɒv ˈɔːr.dər/"],
  ["participate in", "/pɑːrˈtɪs.ɪ.peɪt ɪn/"],
  ["pay a bill", "/peɪ ə bɪl/"],
  ["pay by check", "/peɪ baɪ tʃek/"],
  ["pay the rent", "/peɪ ðə rent/"],
  ["put into practice", "/pʊt ˈɪn.tuː ˈpræk.tɪs/"],
  ["recover from", "/rɪˈkʌv.ər frɒm/"],
  ["respond to", "/rɪˈspɒnd tuː/"],
  ["sign a contract", "/saɪn ə ˈkɒn.trækt/"],
  ["take into consideration", "/teɪk ˈɪn.tuː kənˌsɪd.əˈreɪ.ʃən/"],
  ["transfer funds", "/trænsˈfɜːr fʌndz/"],
  ["wish to", "/wɪʃ tuː/"],
  ["for free", "/fɔːr friː/"],
  ["right before (after)", "/raɪt bɪˈfɔːr ˈæf.tər/"],
  ["immediately before (after)", "/ɪˈmiː.di.ət.li bɪˈfɔːr ˈæf.tər/"],
  ["promptly before (after)", "/ˈprɒmpt.li bɪˈfɔːr ˈæf.tər/"],
  ["need to do", "/niːd tuː duː/"],
  ["make a wish", "/meɪk ə wɪʃ/"],
]

const esc = s => s ? s.replace(/'/g, "''") : ''

const allEntries = [...updates, ...shortPhrases]
const cases = allEntries.map(([text, ipa]) =>
  `WHEN source_text = '${esc(text)}' THEN '${esc(ipa)}'`
)

// Also generate IPA from dictionary for unknown entries
// Skip grammar patterns and entries already in our list
const knownTexts = new Set(allEntries.map(([t]) => t))

// For the remaining entries (mostly full sentences), generate IPA word-by-word
// using the dictionary as best effort
const sentenceCases = []
const sentences = [
  ["a continuing rise in stock prices", "/ə kənˈtɪn.ju.ɪŋ raɪz ɪn stɒk ˈpraɪ.sɪz/"],
  ["A duplicate of the contracts is available", "/ə ˈdjuː.plɪ.kət ɒv ðə ˈkɒn.trækts ɪz əˈveɪ.lə.bəl/"],
  ["a notice has been posted", "/ə ˈnoʊ.tɪs hæz biːn ˈpoʊ.stɪd/"],
  ["accept responsibilities for", "/əkˈsept rɪˌspɒn.sɪˈbɪl.ɪ.tiz fɔːr/"],
  ["accommodate a tour group", "/əˈkɒm.ə.deɪt ə tʊr ɡruːp/"],
  ["according to the company newsletter", "/əˈkɔːr.dɪŋ tuː ðə ˈkʌm.pə.ni ˈnjuːz.le.tər/"],
  ["after he returned to the office", "/ˈæf.tər hiː rɪˈtɜːrnd tuː ðə ˈɒf.ɪs/"],
  ["although he was inexperienced", "/ɔːlˈðoʊ hiː wɒz ˌɪn.ɪkˈspɪr.i.ənst/"],
  ["announce the promotion", "/əˈnaʊns ðə prəˈmoʊ.ʃən/"],
  ["apologize A for B", "/əˈpɒl.ə.dʒaɪz eɪ fɔːr biː/"],
  ["applicants for the position", "/ˈæp.lɪ.kənts fɔːr ðə pəˈzɪʃ.ən/"],
  ["approve the construction plan", "/əˈpruːv ðə kənˈstrʌk.ʃən plæn/"],
  ["as quickly as possible", "/æz ˈkwɪk.li æz ˈpɒs.ɪ.bəl/"],
  ["ask A to (do)", "/æsk eɪ tuː duː/"],
  ["ask more information", "/æsk mɔːr ˌɪn.fəˈmeɪ.ʃən/"],
  ["at one's earliest convenience", "/æt wʌnz ˈɜːr.li.ɪst kənˈviː.ni.əns/"],
  ["attend a meeting", "/əˈtend ə ˈmiː.tɪŋ/"],
  ["attract many tourists", "/əˈtrækt ˈmen.i ˈtʊr.ɪsts/"],
  ["attribute economic improvement to the government's policy", "/əˈtrɪb.juːt ˌek.əˈnɒm.ɪk ɪmˈpruːv.mənt tuː ðə ˈɡʌv.ərn.mənts ˈpɒl.ɪ.si/"],
  ["authorize the purchase", "/ˈɔː.θər.aɪz ðə ˈpɜːr.tʃəs/"],
  ["avoid an economic slump", "/əˈvɔɪd ən ˌek.əˈnɒm.ɪk slʌmp/"],
  ["be acquainted with", "/biː əˈkweɪn.tɪd wɪð/"],
  ["be billed directly by", "/biː bɪld dɪˈrek.tli baɪ/"],
  ["be checked regularly", "/biː tʃekt ˈreɡ.jə.lər.li/"],
  ["be currently closed for renovations", "/biː ˈkɜːr.ənt.li kloʊzd fɔːr ˌren.əˈveɪ.ʃənz/"],
  ["be designed to do", "/biː dɪˈzaɪnd tuː duː/"],
  ["be experienced in", "/biː ɪkˈspɪr.i.ənst ɪn/"],
  ["be finally distributed", "/biː ˈfaɪ.nəl.i dɪˈstrɪb.juː.tɪd/"],
  ["be in charge of", "/biː ɪn tʃɑːrdʒ ɒv/"],
  ["be in the company's best interest", "/biː ɪn ðə ˈkʌm.pə.niz best ˈɪn.trəst/"],
  ["be interested in", "/biː ˈɪn.trə.stɪd ɪn/"],
  ["be invited to do", "/biː ɪnˈvaɪ.tɪd tuː duː/"],
  ["be involved in", "/biː ɪnˈvɒlvd ɪn/"],
  ["be known for", "/biː noʊn fɔːr/"],
  ["be related to", "/biː rɪˈleɪ.tɪd tuː/"],
  ["be related to, be involved in", "/biː rɪˈleɪ.tɪd tuː biː ɪnˈvɒlvd ɪn/"],
  ["be relatively expensive", "/biː ˈrel.ə.tɪv.li ɪkˈspen.sɪv/"],
  ["be responsible for", "/biː rɪˈspɒn.sɪ.bəl fɔːr/"],
  ["be scheduled to do", "/biː ˈʃed.juːld tuː duː/"],
  ["be transferred to", "/biː trænsˈfɜːrd tuː/"],
  ["because it was submitted late", "/bɪˈkɒz ɪt wɒz səbˈmɪt.ɪd leɪt/"],
  ["before you leave the office", "/bɪˈfɔːr juː liːv ðə ˈɒf.ɪs/"],
  ["choose accounting", "/tʃuːz əˈkaʊn.tɪŋ/"],
  ["conduct a study", "/kənˈdʌkt ə ˈstʌd.i/"],
  ["conduct a survey", "/kənˈdʌkt ə ˈsɜːr.veɪ/"],
  ["conduct a survey / a study / an inspection", "/kənˈdʌkt ə ˈsɜːr.veɪ ə ˈstʌd.i ən ɪnˈspek.ʃən/"],
  ["conduct an extensive search", "/kənˈdʌkt ən ɪkˈsten.sɪv sɜːrtʃ/"],
  ["conduct an inspection", "/kənˈdʌkt ən ɪnˈspek.ʃən/"],
  ["confirm a reservation", "/kənˈfɜːrm ə ˌrez.ərˈveɪ.ʃən/"],
  ["construction of the new plant", "/kənˈstrʌk.ʃən ɒv ðə njuː plɑːnt/"],
  ["contact the sales department", "/ˈkɒn.tækt ðə seɪlz dɪˈpɑːrt.mənt/"],
  ["contribute to + sth", "/kənˈtrɪb.juːt tuː ˈsʌm.θɪŋ/"],
  ["contribute to + sth / make a contribution to + sth", "/kənˈtrɪb.juːt tuː ˈsʌm.θɪŋ / meɪk ə ˌkɒn.trɪˈbjuː.ʃən tuː ˈsʌm.θɪŋ/"],
  ["cost significantly less", "/kɒst sɪɡˈnɪf.ɪ.kənt.li les/"],
  ["deliver a speech", "/dɪˈlɪv.ər ə spiːtʃ/"],
  ["despite his efforts", "/dɪˈspaɪt hɪz ˈef.ərts/"],
  ["discuss the deplay", "/dɪˈskʌs ðə dɪˈpleɪ/"],
  ["distribute the document", "/dɪˈstrɪb.juːt ðə ˈdɒk.jə.mənt/"],
  ["document all transactions", "/ˈdɒk.jə.ment ɔːl trænˈzæk.ʃənz/"],
  ["due to + N", "/djuː tuː en/"],
  ["due to the financial problem", "/djuː tuː ðə faɪˈnæn.ʃəl ˈprɒb.ləm/"],
  ["during the performance", "/ˈdjʊr.ɪŋ ðə pərˈfɔːr.məns/"],
  ["encourage + A + to do", "/ɪnˈkʌr.ɪdʒ eɪ tuː duː/"],
  ["encourage+A+to do", "/ɪnˈkʌr.ɪdʒ eɪ tuː duː/"],
  ["expand its market", "/ɪkˈspænd ɪts ˈmɑːr.kɪt/"],
  ["hold a press conference", "/hoʊld ə pres ˈkɒn.fər.əns/"],
  ["implement new procedures", "/ˈɪm.plɪ.ment njuː prəˈsiː.dʒərz/"],
  ["improve security", "/ɪmˈpruːv sɪˈkjʊr.ɪ.ti/"],
  ["inform A of B", "/ɪnˈfɔːrm eɪ ɒv biː/"],
  ["inspect the quality", "/ɪnˈspekt ðə ˈkwɒl.ɪ.ti/"],
  ["introduce a new product", "/ˌɪn.trəˈdjuːs ə njuː ˈprɒd.ʌkt/"],
  ["it is clear that", "/ɪt ɪz klɪr ðæt/"],
  ["join the club", "/dʒɔɪn ðə klʌb/"],
  ["leave immediately for Singapore", "/liːv ɪˈmiː.di.ət.li fɔːr ˌsɪŋ.əˈpɔːr/"],
  ["leave promptly at 7", "/liːv ˈprɒmpt.li æt ˈsev.ən/"],
  ["leave your hotel key", "/liːv jɔːr hoʊˈtel kiː/"],
  ["live within one's income", "/lɪv wɪðˈɪn wʌnz ˈɪn.kʌm/"],
  ["make a complaint", "/meɪk ə kəmˈpleɪnt/"],
  ["make a contribution to + sth", "/meɪk ə ˌkɒn.trɪˈbjuː.ʃən tuː ˈsʌm.θɪŋ/"],
  ["make necessary revisions", "/meɪk ˈnes.ə.ser.i rɪˈvɪʒ.ənz/"],
  ["meet one's needs", "/miːt wʌnz niːdz/"],
  ["notify the client", "/ˈnoʊ.tɪ.faɪ ðə ˈklaɪ.ənt/"],
  ["offer sb sth", "/ˈɒf.ər ˈsʌm.bɒd.i ˈsʌm.θɪŋ/"],
  ["offer sb sth / provide sb with sth", "/ˈɒf.ər ˈsʌm.bɒd.i ˈsʌm.θɪŋ / prəˈvaɪd ˈsʌm.bɒd.i wɪð ˈsʌm.θɪŋ/"],
  ["open a new exhibition", "/ˈoʊ.pən ə njuː ˌek.sɪˈbɪʃ.ən/"],
  ["open a now exhibition", "/ˈoʊ.pən ə njuː ˌek.sɪˈbɪʃ.ən/"],
  ["open an account", "/ˈoʊ.pən ən əˈkaʊnt/"],
  ["prohibit sb from Ving", "/prəˈhɪb.ɪt ˈsʌm.bɒd.i frɒm ˈviː.ɪŋ/"],
  ["propose to widen the road", "/prəˈpoʊz tuː ˈwaɪ.dən ðə roʊd/"],
  ["provide sb with sth", "/prəˈvaɪd ˈsʌm.bɒd.i wɪð ˈsʌm.θɪŋ/"],
  ["raise questions", "/reɪz ˈkwes.tʃənz/"],
  ["receive the necessary support", "/rɪˈsiːv ðə ˈnes.ə.ser.i səˈpɔːrt/"],
  ["reduce its staff", "/rɪˈdjuːs ɪts stæf/"],
  ["refuse the delivery", "/rɪˈfjuːz ðə dɪˈlɪv.ər.i/"],
  ["rejected the proposed policy", "/rɪˈdʒek.tɪd ðə prəˈpoʊzd ˈpɒl.ɪ.si/"],
  ["remind A of B", "/rɪˈmaɪnd eɪ ɒv biː/"],
  ["remind A to do", "/rɪˈmaɪnd eɪ tuː duː/"],
  ["renew a contract", "/rɪˈnjuː ə ˈkɒn.trækt/"],
  ["represent our company", "/ˌrep.rɪˈzent aʊər ˈkʌm.pə.ni/"],
  ["requests for computer upgrades", "/rɪˈkwests fɔːr kəmˈpjuː.tər ʌpˈɡreɪdz/"],
  ["require A to do", "/rɪˈkwaɪər eɪ tuː duː/"],
  ["reserve the right to refuse", "/rɪˈzɜːrv ðə raɪt tuː rɪˈfjuːz/"],
  ["retain competent employees", "/rɪˈteɪn ˈkɒm.pɪ.tənt ɪmˈplɔɪ.iːz/"],
  ["review the information", "/rɪˈvjuː ði ˌɪn.fərˈmeɪ.ʃən/"],
  ["run the department efficiently", "/rʌn ðə dɪˈpɑːrt.mənt ɪˈfɪʃ.ənt.li/"],
  ["send formal invitations", "/send ˈfɔːr.məl ˌɪn.vɪˈteɪ.ʃənz/"],
  ["ship an order", "/ʃɪp ən ˈɔːr.dər/"],
  ["since he was late", "/sɪns hiː wɒz leɪt/"],
  ["since last year", "/sɪns lɑːst jɪr/"],
  ["since you've been gone", "/sɪns juːv biːn ɡɒn/"],
  ["speak clearly", "/spiːk ˈklɪr.li/"],
  ["speak to the counselor", "/spiːk tuː ðə ˈkaʊn.səl.ər/"],
  ["submit A to B", "/səbˈmɪt eɪ tuː biː/"],
  ["take quick action", "/teɪk kwɪk ˈæk.ʃən/"],
  ["tell A about B", "/tel eɪ əˈbaʊt biː/"],
  ["terminate an agreement", "/ˈtɜːr.mɪ.neɪt ən əˈɡriː.mənt/"],
  ["thoroughly analyze", "/ˈθʌr.ə.li ˈæn.ə.laɪz/"],
  ["visit the new office", "/ˈvɪz.ɪt ðə njuː ˈɒf.ɪs/"],
  ["when you are ready", "/wen juː ɑːr ˈred.i/"],
  ["within 24 hours", "/wɪðˈɪn ˈtwen.ti fɔːr ˈaʊərz/"],
  ["work collaboratively", "/wɜːrk kəˈlæb.ər.ə.tɪv.li/"],
  ["be accustomed to + N / Ving", "/biː əˈkʌs.təmd tuː en / ˈviː.ɪŋ/"],
  ["be eligible for + sth / be eligible to do", "/biː ˈel.ɪ.dʒə.bəl fɔːr ˈsʌm.θɪŋ / biː ˈel.ɪ.dʒə.bəl tuː duː/"],
  ["be subject to + sth / Ving", "/biː ˈsʌb.dʒekt tuː ˈsʌm.θɪŋ / ˈviː.ɪŋ/"],
  ["Checks must be deposited by noon", "/tʃeks mʌst biː dɪˈpɒz.ɪ.tɪd baɪ nuːn/"],
  ["Financial incentives are highly recommended", "/faɪˈnæn.ʃəl ɪnˈsen.tɪvz ɑːr ˈhaɪ.li ˌrek.əˈmen.dɪd/"],
  ["Maps are displayed", "/mæps ɑːr dɪˈspleɪd/"],
  ["Mr. Pierce was elected as vice president", "/ˈmɪs.tər pɪrs wɒz ɪˈlek.tɪd æz vaɪs ˈprez.ɪ.dənt/"],
  ["Office supplies have been ordered", "/ˈɒf.ɪs səˈplaɪz hæv biːn ˈɔːr.dərd/"],
  ["The conference will be held in New York", "/ðə ˈkɒn.fər.əns wɪl biː held ɪn njuː jɔːrk/"],
  ["The document was sent to you", "/ðə ˈdɒk.jə.mənt wɒz sent tuː juː/"],
  ["The meeting will be postponed", "/ðə ˈmiː.tɪŋ wɪl biː poʊstˈpoʊnd/"],
  ["The problem was explained", "/ðə ˈprɒb.ləm wɒz ɪkˈspleɪnd/"],
  ["We wish to apologize for an error", "/wiː wɪʃ tuː əˈpɒl.ə.dʒaɪz fɔːr ən ˈer.ər/"],
]

const all = [...updates, ...shortPhrases, ...sentences]
const sc = s => s.replace(/'/g, "''")
const caseWhen = all
  .filter(([t]) => !skip.has(t))
  .map(([text, ipa]) => `WHEN source_text = '${sc(text)}' THEN '${sc(ipa)}'`)

const bigSql = `UPDATE public.user_terms SET ipa = CASE
${caseWhen.join('\n')}
END
WHERE user_id = '${USER_ID}' AND ipa IS NULL;`

fs.writeFileSync('scripts/fill_all_ipa.sql', bigSql, 'utf-8')
console.log(`Generated ${all.length} IPA entries, SQL: ${bigSql.length} chars`)
