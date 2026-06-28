import re
import json

def parse_toeic_md(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    entries_raw = re.split(r'\n---\n', content)
    
    results = []
    
    for entry_text in entries_raw:
        header_match = re.search(r'## ENTRY \d+\n', entry_text)
        if not header_match:
            continue
        
        entry = {
            "entry_id": "",
            "source_text": "",
            "normalized_text": "",
            "part_of_speech": "",
            "item_type": "",
            "forms": [],
            "synonyms": [],
            "collocations": [],
            "grammar_note": ""
        }
        
        lines = entry_text.split('\n')
        
        in_forms = False
        in_collocations = False
        in_meanings = False
        in_examples = False
        in_synonyms = False
        
        for line in lines:
            if line.startswith('## ENTRY'):
                continue
            
            m = re.match(r'- \*\*id\*\*:\s*(.+)', line)
            if m:
                entry["entry_id"] = m.group(1).strip()
                continue
            
            m = re.match(r'- \*\*source_text\*\*:\s*(.+)', line)
            if m:
                entry["source_text"] = m.group(1).strip()
                continue
            
            m = re.match(r'- \*\*normalized_text\*\*:\s*(.+)', line)
            if m:
                entry["normalized_text"] = m.group(1).strip()
                continue
            
            m = re.match(r'- \*\*item_type\*\*:\s*(.+)', line)
            if m:
                entry["item_type"] = m.group(1).strip()
                continue
            
            m = re.match(r'- \*\*part_of_speech\*\*:\s*(.+)', line)
            if m:
                entry["part_of_speech"] = m.group(1).strip()
                continue
            
            # Section detection
            if line.startswith('- **forms**:'):
                in_forms = True
                in_collocations = False
                in_meanings = False
                in_examples = False
                in_synonyms = False
                continue
            
            if line.startswith('- **collocations**:'):
                in_collocations = True
                in_forms = False
                in_meanings = False
                in_examples = False
                in_synonyms = False
                # Handle inline collocations: "**collocations**: membership fee (phí), card (thẻ)"
                cm = re.match(r'- \*\*collocations\*\*:\s*(.+)', line)
                if cm:
                    coll_parts = re.split(r',(?![^(]*\))', cm.group(1).strip())
                    for coll_part in coll_parts:
                        coll_part = coll_part.strip()
                        if not coll_part:
                            continue
                        if ':' in coll_part:
                            coll_text = coll_part.split(':', 1)[0].strip()
                        else:
                            coll_text = coll_part
                        coll_text = re.sub(r'\([^)]*\)', '', coll_text).strip()
                        coll_text = re.sub(r'^\*\*|\*\*$', '', coll_text).strip()
                        if coll_text and coll_text not in entry["collocations"]:
                            entry["collocations"].append(coll_text)
                continue
            
            if line.startswith('- **meanings**:'):
                in_meanings = True
                in_collocations = False
                in_forms = False
                in_examples = False
                in_synonyms = False
                continue
            
            if line.startswith('- **examples**:'):
                in_examples = True
                in_meanings = False
                in_collocations = False
                in_forms = False
                in_synonyms = False
                continue
            
            if line.startswith('- **synonyms**:'):
                in_synonyms = True
                in_meanings = False
                in_collocations = False
                in_forms = False
                in_examples = False
                # Handle inline synonyms: "**synonyms**: minimize, decrease, decline, diminish"
                sm = re.match(r'- \*\*synonyms\*\*:\s*(.+)', line)
                if sm:
                    clean = re.sub(r'\([^)]*\)', '', sm.group(1).strip())
                    words = re.split(r'\s*,\s*|\s*;\s*', clean)
                    for w in words:
                        w = w.strip().strip('"').strip("'").lower()
                        if w and w != entry["source_text"].lower() and w not in entry["synonyms"]:
                            entry["synonyms"].append(w)
                continue
            
            if line.startswith('- **grammar'):
                in_examples = True
                in_meanings = False
                in_collocations = False
                in_forms = False
                in_synonyms = False
                m = re.match(r'- \*\*grammar.*\*\*:\s*(.+)', line)
                if m:
                    entry["grammar_note"] = m.group(1).strip()
                continue
            
            if line.startswith('- **note**:'):
                in_examples = True
                in_meanings = False
                in_collocations = False
                in_forms = False
                in_synonyms = False
                note_match = re.match(r'- \*\*note\*\*:\s*(.+)', line)
                if note_match:
                    note_text = note_match.group(1).strip()
                    
                    # Extract synonyms from note patterns:
                    # "reduce = minimize = decrease = decline = diminish"
                    if '=' in note_text:
                        parts_eq = re.split(r'\s*=\s*|\s*[,]\s*', note_text)
                        for part in parts_eq:
                            # Extract English words, skip Vietnamese
                            words = re.findall(r'\b([a-zA-Z][a-zA-Z\-]+)\b', part)
                            for w in words:
                                w = w.strip().lower()
                                if (len(w) > 2 and w not in ('the', 'trang') 
                                    and w != entry["source_text"].lower() 
                                    and w not in entry["synonyms"]):
                                    entry["synonyms"].append(w)
                    
                    # Pattern 2: "Synonyms: X, Y, Z" (with colon)
                    if re.search(r'\bsynonyms?\s*:', note_text, re.IGNORECASE):
                        syn_part = re.split(r'\bsynonyms?\s*:', note_text, maxsplit=1, flags=re.IGNORECASE)
                        if len(syn_part) > 1:
                            # Split by comma, extract English words
                            words = re.findall(r'\b([a-zA-Z][a-zA-Z\-]+(?:\s+[a-zA-Z][a-zA-Z\-]+)*)\b', syn_part[1])
                            for w in words:
                                w = w.strip().lower()
                                if (len(w) > 1 and w not in entry["synonyms"] 
                                    and w != entry["source_text"].lower()):
                                    entry["synonyms"].append(w)
                continue
            
            # Check for other fields that stop section parsing
            if line.startswith('- **') and not any([
                line.startswith('- **forms'),
                line.startswith('- **collocations'),
                line.startswith('- **meanings'),
                line.startswith('- **examples'),
                line.startswith('- **synonyms')
            ]):
                in_forms = False
                in_collocations = False
                in_meanings = False
                in_examples = False
                in_synonyms = False
            
            # Parse forms section
            if in_forms:
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                if line_stripped.startswith('- '):
                    line_stripped = line_stripped[2:]
                
                relation_match = re.match(
                    r'(adverb(?:\s*\([^)]*\))?|'
                    r'adjective(?:\s*\([^)]*\))?|'
                    r'noun(?:\s*\([^)]*\))?|'
                    r'verb(?:\s*\([^)]*\))?|'
                    r'related(?:\s*\w+)?|'
                    r'base(?:\s*\w+)?|'
                    r'plural(?:\s*\([^)]*\))?|'
                    r'singular(?:\s*\([^)]*\))?|'
                    r'abbreviation(?:\s*\([^)]*\))?)\s*:\s*(.+)',
                    line_stripped
                )
                
                if relation_match:
                    relation_type = relation_match.group(1).strip()
                    value_part = relation_match.group(2).strip()
                    
                    # Normalize relation type
                    rel_lower = relation_type.lower()
                    if 'adverb' in rel_lower:
                        rel_base = 'adverb'
                    elif 'adjective' in rel_lower:
                        rel_base = 'adjective'
                    elif 'noun' in rel_lower:
                        rel_base = 'noun' if '(' not in rel_lower else 'related'
                    elif 'verb' in rel_lower:
                        rel_base = 'verb' if '(' not in rel_lower else 'related'
                    elif 'related' in rel_lower:
                        rel_base = 'related'
                    elif 'singular' in rel_lower:
                        rel_base = 'singular'
                    elif 'plural' in rel_lower:
                        rel_base = 'plural'
                    elif 'base' in rel_lower:
                        rel_base = 'base'
                    elif 'abbreviation' in rel_lower:
                        rel_base = 'abbreviation'
                    else:
                        rel_base = relation_type
                    
                    source_lower = entry["source_text"].lower()
                    
                    # Clean value: remove Vietnamese explanations in parentheses and quotes
                    clean = re.sub(r'\([^)]*\)', '', value_part)
                    clean = re.sub(r'"[^"]*"', '', clean)
                    
                    # Split by common separators
                    words_raw = re.split(r'\s*/\s*|\s*,\s*', clean)
                    
                    # Check if the source word appears as a WHOLE WORD in the value part
                    # Use word-boundary matching to avoid "produce" matching "producer"
                    value_lower = value_part.lower()
                    source_as_whole_word = bool(re.search(
                        r'(?<![a-zA-Z])' + re.escape(source_lower) + r'(?![a-zA-Z])', 
                        value_lower
                    ))
                    
                    # For multi-word source text (phrases), also check whole-word matching
                    # of the main word (e.g. "aim to" → check "aim")
                    source_content_words = [w for w in source_lower.split() if len(w) > 1]
                    source_main_word_present = len(source_content_words) > 1 and any(
                        re.search(r'(?<![a-zA-Z])' + re.escape(sw) + r'(?![a-zA-Z])', value_lower)
                        for sw in source_content_words
                    )
                    
                    source_is_present = source_as_whole_word or source_main_word_present
                    
                    for w in words_raw:
                        w = w.strip().strip('"').strip("'").strip()
                        if not w:
                            continue
                        if re.match(r'^V\d+\s*=', w) or w in ('V1=V2=V3', 'V1', 'V2', 'V3'):
                            continue
                        if not re.search(r'[a-zA-Z]', w):
                            continue
                        # Clean remaining Vietnamese text fragments
                        w = re.sub(r'(s\u1ed1\s+\w+|ng\u01b0\u1eddi|hi\u1ebfm\s+d\u00f9ng|b\u1ea5t\s+quy\s+t\u1eafc)', '', w).strip()
                        if not w:
                            continue
                        
                        w_lower = w.lower()
                        
                        # Skip plural/singular forms - they're just inflections
                        if rel_base in ('plural', 'singular'):
                            continue
                        
                        # Skip if same as source word
                        if w_lower == source_lower:
                            continue
                        
                        # Derivational suffixes that indicate genuinely different word forms
                        derivational_suffixes = (
                            'tion', 'sion', 'ment', 'ance', 'ence', 'ancy', 'ency',
                            'ity', 'ness', 'ship', 'hood', 'dom',
                            'er', 'or', 'ist', 'ism',
                            'al', 'ial', 'ical', 'ive', 'ative',
                            'able', 'ible', 'ly',
                            'ize', 'ify', 'ate', 'ise',
                            'ful', 'less', 'ous', 'ious', 'ic', 'ish', 'y', 'ary', 'ory',
                            'ant', 'ent', 'ure', 'ture', 'age'
                        )
                        
                        if source_is_present:
                            # First, check if it's a simple inflection (s/es/ed/ing/d) → skip
                            is_inflectional = (
                                w_lower in (source_lower + 's', source_lower + 'es', 
                                          source_lower + 'ed', source_lower + 'd',
                                          source_lower + 'ing', source_lower + 'ings') or
                                (source_lower.endswith('e') and w_lower == source_lower[:-1] + 'ing') or
                                (source_lower.endswith('y') and w_lower == source_lower[:-1] + 'ies') or
                                (source_lower.endswith('e') and w_lower == source_lower[:-1] + 'ed')
                            )
                            if is_inflectional:
                                continue
                            
                            # Check if it looks like an irregular conjugation
                            # (shares significant prefix with source, similar length)
                            common_prefix = 0
                            for i in range(min(len(source_lower), len(w_lower))):
                                if source_lower[i] == w_lower[i]:
                                    common_prefix += 1
                                else:
                                    break
                            
                            # Irregular conjugation: shares >40% of prefix chars, length diff small
                            prefix_ratio = common_prefix / max(len(source_lower), 1)
                            len_diff = abs(len(w_lower) - len(source_lower))
                            is_irregular_conjugation = (
                                prefix_ratio >= 0.4 and common_prefix >= 2 and len_diff <= 3
                            )
                            if is_irregular_conjugation:
                                continue
                            
                            # Check if it has a clear derivational suffix → keep
                            # (longer suffixes that indicate genuine word class change)
                            has_derivational = any(
                                w_lower.endswith(s) and len(w_lower) > len(s) + 2
                                for s in derivational_suffixes
                            )
                            if not has_derivational:
                                continue
                        
                        entry["forms"].append({"text": w, "relation": rel_base})
            
            # Parse collocations section
            if in_collocations:
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                if line_stripped.startswith('- '):
                    line_stripped = line_stripped[2:]
                
                # Collocations can be:
                # 1. "commercial break: quảng cáo giải lao (TV/radio)" - single
                # 2. "membership fee (phí thành viên), membership card (thẻ thành viên)" - multiple separated by comma
                # Each collocation has format: English text (Vietnamese explanation)
                
                # Split by comma first, but be careful about commas inside parentheses
                coll_parts = re.split(r',(?![^(]*\))', line_stripped)
                
                for coll_part in coll_parts:
                    coll_part = coll_part.strip()
                    if not coll_part:
                        continue
                    
                    # Extract English text:
                    # If there's a colon, everything before it
                    # Then remove Vietnamese parenthetical
                    if ':' in coll_part:
                        coll_text = coll_part.split(':', 1)[0].strip()
                    else:
                        coll_text = coll_part
                    
                    # Remove any parenthetical Vietnamese
                    coll_text = re.sub(r'\([^)]*\)', '', coll_text).strip()
                    # Remove leading/trailing markers
                    coll_text = re.sub(r'^\*\*|\*\*$', '', coll_text).strip()
                    
                    if coll_text and coll_text not in entry["collocations"]:
                        entry["collocations"].append(coll_text)
            
            # Parse meanings for synonyms
            if in_meanings:
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                if '(= ' in line_stripped or '= ' in line_stripped or ' =' in line_stripped:
                    eq_matches = re.findall(r'\(=\s*([^)]+)\)', line_stripped)
                    for em in eq_matches:
                        words = re.split(r',\s*', em)
                        for w in words:
                            w = w.strip().lower()
                            if w and w not in entry["synonyms"] and w != entry["source_text"].lower():
                                entry["synonyms"].append(w)
                    
                    eq_matches2 = re.findall(r'(?:^|\s)=\s*([a-zA-Z][a-zA-Z,\-\s]+?)(?:$|,|\s*[;)])', line_stripped)
                    for em in eq_matches2:
                        words = re.split(r',\s*', em)
                        for w in words:
                            w = w.strip().lower()
                            if w and w not in entry["synonyms"] and w != entry["source_text"].lower():
                                entry["synonyms"].append(w)
            
            # Parse synonyms section
            if in_synonyms:
                line_stripped = line.strip()
                if not line_stripped:
                    continue
                if line_stripped.startswith('- '):
                    line_stripped = line_stripped[2:]
                clean = re.sub(r'\([^)]*\)', '', line_stripped)
                words = re.split(r'\s*,\s*|\s*;\s*', clean)
                for w in words:
                    w = w.strip().strip('"').strip("'").lower()
                    if w and w != entry["source_text"].lower() and w not in entry["synonyms"]:
                        entry["synonyms"].append(w)
        
        if entry["entry_id"]:
            results.append(entry)
    
    return results

if __name__ == '__main__':
    entries = parse_toeic_md('E:/WebApp/MemoryLang/toeic_vocab_db.md')
    
    total = len(entries)
    with_forms = sum(1 for e in entries if e["forms"])
    with_synonyms = sum(1 for e in entries if e["synonyms"])
    with_collocations = sum(1 for e in entries if e["collocations"])
    with_grammar = sum(1 for e in entries if e["grammar_note"])
    
    print(f"Total entries: {total}")
    print(f"Entries with forms: {with_forms}")
    print(f"Entries with synonyms: {with_synonyms}")
    print(f"Entries with collocations: {with_collocations}")
    print(f"Entries with grammar_note: {with_grammar}")
    print(f"Total forms extracted: {sum(len(e['forms']) for e in entries)}")
    print(f"Total synonyms extracted: {sum(len(e['synonyms']) for e in entries)}")
    print(f"Total collocations extracted: {sum(len(e['collocations']) for e in entries)}")
    
    with open('E:/WebApp/MemoryLang/scripts/toeic_forms.json', 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    
    print("Done! Written to E:/WebApp/MemoryLang/scripts/toeic_forms.json")
    
    print("\n--- Key entries ---")
    targets = ['entry-008', 'entry-013', 'entry-015', 'entry-017', 'entry-020', 
               'entry-028', 'entry-042', 'entry-053', 'entry-057', 'entry-060',
               'entry-084', 'entry-086', 'entry-102', 'entry-150', 'entry-163']
    for e in entries:
        if e['entry_id'] in targets:
            print(f"\n{e['entry_id']}: {e['source_text']}")
            if e['forms']:
                for f in e['forms']:
                    print(f"  - {f['text']} ({f['relation']})")
            if e['synonyms']:
                print(f"  Synonyms: {e['synonyms']}")
            if e['collocations']:
                print(f"  Collocations: {e['collocations']}")
            if e['grammar_note']:
                pass  # skip to avoid Unicode issues in terminal
