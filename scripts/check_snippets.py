"""Syntax-check every Python lesson example without importing its dependencies."""

from __future__ import annotations

import ast
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
failures: list[str] = []
checked = 0

for lesson_path in sorted((ROOT / "content" / "lessons").glob("chapter-*.json")):
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    for section in lesson.get("sections", []):
        code = section.get("code")
        if not code or code.get("language") != "python":
            continue
        checked += 1
        try:
            ast.parse(code["source"], filename=f"{lesson_path.name}:{section['id']}")
        except SyntaxError as error:
            failures.append(
                f"{lesson_path.name}/{section.get('id')}: "
                f"line {error.lineno}: {error.msg}"
            )

if failures:
    raise SystemExit("\n".join(f"- {failure}" for failure in failures))

print(f"Syntax-checked {checked} Python lesson examples.")
