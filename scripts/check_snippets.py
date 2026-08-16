"""Syntax-check every lesson example and optionally execute safe, local snippets."""

from __future__ import annotations

import ast
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
failures: list[str] = []
checked = 0
executed = 0
skipped = 0
skip_reasons: dict[str, int] = {}
execute = "--execute" in sys.argv

# These examples require network downloads, repository data, a compiler/export
# toolchain, CUDA, or a multi-process torchrun environment. They remain parsed
# and receive an explicit classification instead of silently escaping review.
EXTERNAL_PATTERNS = {
    "cumulative prerequisite": ("# Prerequisite:", "# Prerequisites:"),
    "network weights": ("Weights.DEFAULT", ".DEFAULT", "download=True", "weights=weights"),
    "repository data": ("data/p1ch", "decode_image(image_path"),
    "distributed launch": ("init_process_group", "dist.is_initialized", "init_device_mesh", "fully_shard("),
    "compiler or exporter": ("torch.compile(", "torch.export.export(", "torch.onnx.export(", "torch.profiler"),
    "accelerator-specific": ("GradScaler(\"cuda\"", "autocast(\"cuda\""),
    "optional dependency": ("import torchao", "from torchao")
}


def external_reason(source: str) -> str | None:
    for reason, patterns in EXTERNAL_PATTERNS.items():
        if any(pattern in source for pattern in patterns):
            return reason
    return None

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
            continue
        if execute:
            reason = external_reason(code["source"])
            if reason:
                skipped += 1
                skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
                continue
            with tempfile.TemporaryDirectory(prefix="pytorch-atlas-") as directory:
                environment = {**os.environ, "PYTHONHASHSEED": "0", "MPLBACKEND": "Agg"}
                try:
                    result = subprocess.run(
                        [sys.executable, "-c", code["source"]],
                        cwd=directory,
                        env=environment,
                        capture_output=True,
                        text=True,
                        timeout=45,
                        check=False,
                    )
                except subprocess.TimeoutExpired:
                    failures.append(f"{lesson_path.name}/{section.get('id')}: runtime timed out")
                    continue
                if result.returncode:
                    detail = (result.stderr or result.stdout).strip().splitlines()[-1:]
                    failures.append(f"{lesson_path.name}/{section.get('id')}: runtime failed: {' '.join(detail)}")
                else:
                    executed += 1

if execute and executed < 55:
    failures.append(f"runtime coverage too low: executed {executed} of {checked} examples")
if execute and executed + skipped != checked:
    failures.append("every syntax-clean example must be executed or explicitly classified")

if failures:
    raise SystemExit("\n".join(f"- {failure}" for failure in failures))

if execute:
    reasons = ", ".join(f"{key}={value}" for key, value in sorted(skip_reasons.items()))
    print(f"Syntax-checked {checked} examples; executed {executed} local examples and classified {skipped} external/toolchain examples ({reasons}).")
else:
    print(f"Syntax-checked {checked} Python lesson examples.")
