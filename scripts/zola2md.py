#!/usr/bin/env python3
"""Zola (Tera) content -> plain Markdown + YAML frontmatter, for Astro.

Only rewrites engine-specific syntax into standard Markdown:
  {{ image_view(path="x", title='t') }}  -> ![t](/x)
  {% mermaiddiagram() %} ... {% end %}   -> ```mermaid fence
  <!-- more -->                          -> kept (plain HTML comment)
Frontmatter: drops Zola-only keys (template, page_template, sort_by),
flattens [taxonomies].tags -> tags.
"""
import re
import sys
import tomllib
from pathlib import Path

SRC = Path(sys.argv[1])
DST = Path(sys.argv[2])

IMG = re.compile(r"""\{\{\s*image_view\(\s*path\s*=\s*["']([^"']+)["']\s*(?:,\s*title\s*=\s*['"]([^'"]*)['"])?\s*\)\s*\}\}""")
MERMAID = re.compile(r"\{%\s*mermaiddiagram\(\)\s*%\}(.*?)\{%\s*end\s*%\}", re.S)

KEEP = ("title", "date", "updated", "description", "thumbnail")


def yaml_scalar(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if hasattr(v, "isoformat"):
        return v.isoformat()
    s = str(v).replace('"', '\\"')
    return f'"{s}"'


def convert(text: str) -> str:
    if not text.startswith("+++"):
        return text
    end = text.index("\n+++", 3)
    fm = tomllib.loads(text[4:end].strip())
    body = text[end + 4:].lstrip("\n")

    body = MERMAID.sub(lambda m: "```mermaid\n" + m.group(1).strip("\n") + "\n```", body)
    body = IMG.sub(lambda m: f"![{m.group(2) or ''}](/{m.group(1)})", body)

    out = ["---"]
    for k in KEEP:
        if k in fm:
            out.append(f"{k}: {yaml_scalar(fm[k])}")
    tags = fm.get("taxonomies", {}).get("tags") or []
    out.append("tags:" + (" []" if not tags else ""))
    for t in tags:
        out.append(f"  - {yaml_scalar(t)}")
    out.append("---")
    return "\n".join(out) + "\n\n" + body.strip() + "\n"


count = 0
for p in sorted(SRC.rglob("*.md")):
    rel = p.relative_to(SRC)
    if rel.name == "_index.md":
        rel = rel.with_name("index.md")  # section index -> collection index
    tgt = DST / rel
    tgt.parent.mkdir(parents=True, exist_ok=True)
    tgt.write_text(convert(p.read_text(encoding="utf-8")), encoding="utf-8")
    count += 1
print(f"converted {count} files -> {DST}")
