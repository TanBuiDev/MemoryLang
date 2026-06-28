"""
Export vocabulary data from MemoryLang database to PDF.
Requires: pip install python-dotenv supabase python-docx
"""
import os, json, sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("ERROR: Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

sb = create_client(url, key)

# Fetch all non-deleted vocabulary entries
all_rows = []
batch_size = 1000
for offset in range(0, 5000, batch_size):
    res = sb.table("user_terms").select("source_text,translation") \
        .is_("deleted_at", "null") \
        .order("created_at", desc=True) \
        .range(offset, offset + batch_size - 1) \
        .execute()
    if not res.data:
        break
    all_rows.extend(res.data)
    print(f"Fetched {len(all_rows)} rows...")
    if len(res.data) < batch_size:
        break

print(f"Total: {len(all_rows)} entries")

if not all_rows:
    print("No data found. If using ANON key, RLS may block. Use SERVICE_ROLE_KEY instead.")
    sys.exit(1)

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

doc = Document()

section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(1.5)
section.bottom_margin = Cm(1.5)
section.left_margin = Cm(1.5)
section.right_margin = Cm(1.5)

title = doc.add_heading("MemoryLang - Vocabulary Export", level=1)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph(f"Total: {len(all_rows)} entries").alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph()

table = doc.add_table(rows=1, cols=2)
table.style = "Table Grid"
table.alignment = WD_TABLE_ALIGNMENT.CENTER

for cell in table.columns[0].cells:
    cell.width = Cm(6)
for cell in table.columns[1].cells:
    cell.width = Cm(12)

hdr = table.rows[0]
hdr.cells[0].text = "Source Text"
hdr.cells[1].text = "Translation"
for cell in hdr.cells:
    for p in cell.paragraphs:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    shading = cell._element.get_or_add_tcPr()
    elm = shading.makeelement(qn("w:shd"), {
        qn("w:val"): "clear", qn("w:color"): "auto", qn("w:fill"): "1C293C",
    })
    shading.append(elm)

for r in all_rows:
    row = table.add_row()
    row.cells[0].text = r.get("source_text", "")
    row.cells[1].text = r.get("translation", "")
    for cell in row.cells:
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.size = Pt(8)
                run.font.name = "Calibri"

output = str(Path(__file__).parent.parent / "memorylang_vocabulary.docx")
doc.save(output)
print(f"Saved to {output}")

# Also save as JSON for reference
json_out = str(Path(__file__).parent.parent / "memorylang_vocabulary.json")
with open(json_out, "w", encoding="utf-8") as f:
    json.dump(all_rows, f, ensure_ascii=False, indent=2)
print(f"JSON saved to {json_out}")
