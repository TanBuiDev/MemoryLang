#!/usr/bin/env python3
"""Extract B1 PDF text and annotation provenance into a reviewable JSON artifact."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import fitz


EXPECTED_PAGE_COUNT = 18
EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)


def normalize_text(value: str, *, free_text: bool = False) -> str:
    """Remove non-portable PDF text artifacts without changing usable content."""
    normalized = EMAIL_PATTERN.sub("", value)
    if free_text:
        normalized = normalized.replace("\ufffd", " ")
    return normalized


def color_value(value: Any) -> list[float]:
    return [float(component) for component in value] if value else []


def annotation_payload(annotation: fitz.Annot) -> dict[str, Any]:
    annotation_type = annotation.type
    content = annotation.info.get("content") or ""
    is_free_text = annotation_type[1] == "FreeText"
    rect = annotation.rect
    colors = annotation.colors or {}
    return {
        "type": {"code": annotation_type[0], "name": annotation_type[1]},
        "rect": {"x0": rect.x0, "y0": rect.y0, "x1": rect.x1, "y1": rect.y1},
        "content": normalize_text(content, free_text=is_free_text),
        "stroke_color": color_value(colors.get("stroke")),
        "fill_color": color_value(colors.get("fill")),
    }


def extract_pdf(input_path: Path) -> dict[str, Any]:
    document = fitz.open(input_path)
    try:
        if document.is_encrypted:
            raise ValueError("PDF must not be encrypted")
        if document.page_count != EXPECTED_PAGE_COUNT:
            raise ValueError(
                f"Expected {EXPECTED_PAGE_COUNT} pages, found {document.page_count}"
            )

        pages: list[dict[str, Any]] = []
        annotation_count = 0
        for page_number, page in enumerate(document, start=1):
            annotations = [annotation_payload(item) for item in (page.annots() or [])]
            annotation_count += len(annotations)
            pages.append(
                {
                    "page_number": page_number,
                    "text": normalize_text(page.get_text()),
                    "image_count": len(page.get_images(full=True)),
                    "size": {"width": page.rect.width, "height": page.rect.height},
                    "annotations": annotations,
                }
            )
        return {
            "source_file": input_path.name,
            "page_count": document.page_count,
            "annotation_count": annotation_count,
            "pages": pages,
        }
    finally:
        document.close()


def assert_fixture(artifact: dict[str, Any], fixture_path: Path) -> None:
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    problems: list[str] = []
    for key in ("page_count", "annotation_count"):
        if artifact[key] != fixture[key]:
            problems.append(f"{key}: expected {fixture[key]}, found {artifact[key]}")

    for page_key, markers in fixture["required_markers"].items():
        page_number = int(page_key)
        page_text = artifact["pages"][page_number - 1]["text"]
        for marker in markers:
            if marker not in page_text:
                problems.append(f"page {page_number} is missing marker: {marker}")

    for page_number in fixture.get("required_image_pages", []):
        image_count = artifact["pages"][page_number - 1]["image_count"]
        if image_count <= 0:
            problems.append(f"page {page_number} is missing expected images")

    if problems:
        raise ValueError("Fixture assertion failed:\n- " + "\n- ".join(problems))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="source PDF path")
    parser.add_argument("--output", required=True, type=Path, help="raw JSON artifact path")
    parser.add_argument(
        "--assert-fixture", type=Path, help="JSON fixture used to validate the extraction"
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        artifact = extract_pdf(args.input)
        if args.assert_fixture:
            assert_fixture(artifact, args.assert_fixture)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    except (OSError, ValueError, fitz.FileDataError, json.JSONDecodeError) as error:
        print(f"Extraction failed: {error}", file=sys.stderr)
        return 1

    print(
        f"Extracted {artifact['page_count']} pages and "
        f"{artifact['annotation_count']} annotations to {args.output}"
    )
    if args.assert_fixture:
        print(f"Fixture assertion passed: {args.assert_fixture}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
