#!/usr/bin/env python3
"""Validate the R0.3 architecture set under docs/architecture/.

The point of this checker is to keep the architecture documents honest and
machine-checkable: every P0 integration must name an owner, a dependency, a
failure mode and a feasibility test, and nothing may be called "verified"
without pointing at evidence that exists.

Exit code 0 = every rule passes, 1 = at least one violation.

Usage:
    python3 scripts/validate_architecture_docs.py [--root docs/architecture]
"""

from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys

REQUIRED_FILES = [
    "README.md",
    "01-system-boundaries.md",
    "03-integration-register.md",
    "04-risk-register.md",
    "05-dependency-register.md",
    "06-assumption-register.md",
    "07-data-contracts.md",
]

# Systems that must appear in the boundary document (master plan v1.1, section 2).
REQUIRED_SYSTEMS = [
    "Paperclip",
    "Nuxt",
    "Medusa",
    "CRM",
    "Odoo",
    "Supplier Engine",
    "OpenSEO",
]

# Paperclip company agents that may own an integration. Source: Paperclip
# company API for company 857eb467-866b-45a1-a84f-92308790b2e9 (BUS-3).
ALLOWED_OWNERS = {
    "Business Empire Hermes",
    "Business Empire Pi",
    "Business Empire Codex",
    "Business Empire Orchestrator",
    "LavaBean Engineer",
    "Company owner (human)",
}

EVIDENCE_STATUSES = {"verified", "assumption", "unknown"}
TEST_STATUSES = {"passed", "planned", "blocked", "not-run"}
ADR_STATUSES = {"proposed", "accepted", "rejected", "superseded"}
DEPENDENCY_KINDS = {"internal", "external", "human", "platform"}
DEPENDENCY_STATUSES = {"open", "in-progress", "done", "unknown"}

INTEGRATION_COLUMNS = [
    "id",
    "integration",
    "boundary",
    "priority",
    "owner",
    "dependency",
    "failure_mode",
    "evidence_status",
    "feasibility_test",
    "test_status",
    "verification",
    "basis",
]
RISK_COLUMNS = ["id", "risk", "likelihood", "impact", "control", "owner", "basis"]
DEPENDENCY_COLUMNS = ["id", "dependency", "kind", "owner", "blocks", "status", "basis"]
ASSUMPTION_COLUMNS = ["id", "assumption", "basis", "verification", "owner", "status"]
ASSUMPTION_STATUSES = {"open", "confirmed", "refuted"}

ADR_REQUIRED_FIELDS = [
    "status",
    "date",
    "deciders",
    "context",
    "decision",
    "consequences",
    "validation",
]

RELATIVE_LINK = re.compile(r"`([^`]+\.(?:md|py|json|yml|yaml|sh))`")


def _cells(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def _norm(header: str) -> str:
    return re.sub(r"[\s\-]+", "_", header.strip().lower())


def parse_first_table(path: str) -> tuple[list[str], list[list[str]]]:
    """Return (header, rows) for the first markdown table in the file."""
    with open(path, encoding="utf-8") as handle:
        lines = handle.read().splitlines()

    start = None
    for index, line in enumerate(lines):
        if line.strip().startswith("|") and index + 1 < len(lines):
            separator = lines[index + 1].strip()
            if set(separator) <= set("|-: ") and "-" in separator:
                start = index
                break
    if start is None:
        return [], []

    header = [_norm(c) for c in _cells(lines[start])]
    rows: list[list[str]] = []
    for line in lines[start + 2 :]:
        if not line.strip().startswith("|"):
            break
        rows.append(_cells(line))
    return header, rows


def _table_errors(name: str, relative: str, header: list[str], rows: list[list[str]], required: list[str]) -> list[str]:
    if not header:
        return [f"{relative}: no markdown table found for {name}"]
    errors = [f"{relative}: missing column(s) {sorted(set(required) - set(header))}"] if set(required) - set(header) else []
    if not rows:
        errors.append(f"{relative}: table has a header but no data rows")
    for position, row in enumerate(rows, start=2):
        if len(row) != len(header):
            errors.append(f"{relative}: row {position} has {len(row)} cells, header has {len(header)}")
    return errors


def _record(header: list[str], row: list[str]) -> dict[str, str]:
    return dict(zip(header, row))


def _artifact_exists(root: str, token: str) -> bool:
    """A verification token counts as evidence when the referenced path exists."""
    candidate = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(root))), token)
    return os.path.exists(candidate) or os.path.exists(os.path.join(root, token))


def check(root: str = "docs/architecture") -> list[str]:
    errors: list[str] = []

    for name in REQUIRED_FILES:
        if not os.path.isfile(os.path.join(root, name)):
            errors.append(f"{name}: required document is missing")
    if errors:
        return errors

    # 01 — system boundaries must describe every system the plan names.
    with open(os.path.join(root, "01-system-boundaries.md"), encoding="utf-8") as handle:
        boundaries = handle.read()
    for system in REQUIRED_SYSTEMS:
        if system not in boundaries:
            errors.append(f"01-system-boundaries.md: system '{system}' is not described")
    for token in ("```", "assumption", "unknown"):
        if token not in boundaries:
            errors.append(f"01-system-boundaries.md: expected {token!r} to appear")

    # 03 — integration register.
    integration_rel = "03-integration-register.md"
    header, rows = parse_first_table(os.path.join(root, integration_rel))
    errors += _table_errors("integration register", integration_rel, header, rows, INTEGRATION_COLUMNS)
    integrations: dict[str, dict[str, str]] = {}
    for position, row in enumerate(rows, start=2):
        if len(row) != len(header):
            continue
        record = _record(header, row)
        ident = record.get("id", "")
        where = f"{integration_rel} row {position} ({ident or 'no id'})"
        if not re.fullmatch(r"INT-\d{2}", ident):
            errors.append(f"{where}: id must look like INT-01")
        integrations[ident] = record
        for column in ("integration", "boundary", "owner", "dependency", "failure_mode", "basis"):
            if not record.get(column, "").strip():
                errors.append(f"{where}: '{column}' is empty")
        if record.get("priority") not in {"P0", "P1", "P2"}:
            errors.append(f"{where}: priority must be P0, P1 or P2")
        if record.get("evidence_status") not in EVIDENCE_STATUSES:
            errors.append(f"{where}: evidence_status must be one of {sorted(EVIDENCE_STATUSES)}")
        if record.get("test_status") not in TEST_STATUSES:
            errors.append(f"{where}: test_status must be one of {sorted(TEST_STATUSES)}")
        if record.get("owner") not in ALLOWED_OWNERS:
            errors.append(f"{where}: owner '{record.get('owner')}' is not a named Paperclip owner")
        if record.get("priority") == "P0" and not record.get("feasibility_test", "").strip():
            errors.append(f"{where}: P0 integration needs at least one feasibility test")
        if record.get("evidence_status") == "verified":
            verification = record.get("verification", "")
            if not re.search(r"BUS-\d+|tests/|scripts/|PR #", verification):
                errors.append(f"{where}: 'verified' needs a BUS-issue or repository artifact in 'verification'")
            elif record.get("test_status") != "passed":
                errors.append(f"{where}: 'verified' contradicts test_status '{record.get('test_status')}'")

    p0 = {ident for ident, record in integrations.items() if record.get("priority") == "P0"}
    if len(p0) < 6:
        errors.append(f"{integration_rel}: expected at least 6 P0 integrations, found {len(p0)}")

    # 04 — risk register.
    risk_rel = "04-risk-register.md"
    risk_header, risk_rows = parse_first_table(os.path.join(root, risk_rel))
    errors += _table_errors("risk register", risk_rel, risk_header, risk_rows, RISK_COLUMNS)
    for position, row in enumerate(risk_rows, start=2):
        if len(row) != len(risk_header):
            continue
        record = _record(risk_header, row)
        where = f"{risk_rel} row {position} ({record.get('id', 'no id')})"
        if not re.fullmatch(r"RISK-\d{2}", record.get("id", "")):
            errors.append(f"{where}: id must look like RISK-01")
        for column in ("risk", "likelihood", "impact", "control", "owner", "basis"):
            if not record.get(column, "").strip():
                errors.append(f"{where}: '{column}' is empty")

    # 05 — dependency register.
    dependency_rel = "05-dependency-register.md"
    dep_header, dep_rows = parse_first_table(os.path.join(root, dependency_rel))
    errors += _table_errors("dependency register", dependency_rel, dep_header, dep_rows, DEPENDENCY_COLUMNS)
    dependencies: dict[str, dict[str, str]] = {}
    for position, row in enumerate(dep_rows, start=2):
        if len(row) != len(dep_header):
            continue
        record = _record(dep_header, row)
        ident = record.get("id", "")
        where = f"{dependency_rel} row {position} ({ident or 'no id'})"
        dependencies[ident] = record
        if not re.fullmatch(r"DEP-\d{2}", ident):
            errors.append(f"{where}: id must look like DEP-01")
        for column in ("dependency", "owner", "blocks", "basis"):
            if not record.get(column, "").strip():
                errors.append(f"{where}: '{column}' is empty")
        if record.get("kind") not in DEPENDENCY_KINDS:
            errors.append(f"{where}: kind must be one of {sorted(DEPENDENCY_KINDS)}")
        if record.get("status") not in DEPENDENCY_STATUSES:
            errors.append(f"{where}: status must be one of {sorted(DEPENDENCY_STATUSES)}")

    # 06 — assumption register.
    assumption_rel = "06-assumption-register.md"
    assumption_header, assumption_rows = parse_first_table(os.path.join(root, assumption_rel))
    errors += _table_errors("assumption register", assumption_rel, assumption_header, assumption_rows, ASSUMPTION_COLUMNS)
    assumptions: dict[str, dict[str, str]] = {}
    for position, row in enumerate(assumption_rows, start=2):
        if len(row) != len(assumption_header):
            continue
        record = _record(assumption_header, row)
        ident = record.get("id", "")
        where = f"{assumption_rel} row {position} ({ident or 'no id'})"
        assumptions[ident] = record
        if not re.fullmatch(r"ASM-\d{2}", ident):
            errors.append(f"{where}: id must look like ASM-01")
        for column in ("assumption", "basis", "verification", "owner", "status"):
            if not record.get(column, "").strip():
                errors.append(f"{where}: '{column}' is empty")
        if record.get("status") not in ASSUMPTION_STATUSES:
            errors.append(f"{where}: status must be one of {sorted(ASSUMPTION_STATUSES)}")

    # Cross-references: integrations may only point at registers that exist.
    for ident, record in integrations.items():
        for dep in re.findall(r"DEP-\d{2}", record.get("dependency", "")):
            if dep not in dependencies:
                errors.append(f"03-integration-register.md {ident}: references missing dependency {dep}")
        for asm in re.findall(r"ASM-\d{2}", record.get("basis", "")):
            if asm not in assumptions:
                errors.append(f"03-integration-register.md {ident}: references missing assumption {asm}")

    # 03 — "no invented API capability": any endpoint-looking claim must be
    # marked unverified unless the row is verified.
    with open(os.path.join(root, integration_rel), encoding="utf-8") as handle:
        register_text = handle.read()
    for token in re.findall(r"`(?:GET|POST|PUT|PATCH|DELETE)\s+[^`]+`", register_text):
        if "unverified" not in register_text:
            errors.append(f"03-integration-register.md: endpoint claim {token} without an 'unverified' marker")

    # 02 — ADRs.
    adr_dir = os.path.join(root, "02-adrs")
    if not os.path.isdir(adr_dir):
        errors.append("02-adrs/: directory is missing")
    else:
        adrs = sorted(f for f in os.listdir(adr_dir) if re.fullmatch(r"ADR-\d{3}-[a-z0-9-]+\.md", f))
        if len(adrs) < 8:
            errors.append(f"02-adrs/: expected at least 8 ADRs, found {len(adrs)}")
        index_path = os.path.join(adr_dir, "README.md")
        index_text = pathlib.Path(index_path).read_text(encoding="utf-8") if os.path.isfile(index_path) else ""
        if not index_text:
            errors.append("02-adrs/README.md: index is missing")
        for adr in adrs:
            with open(os.path.join(adr_dir, adr), encoding="utf-8") as handle:
                text = handle.read()
            for field in ADR_REQUIRED_FIELDS:
                if not re.search(rf"^##\s+{field}\s*$", text, re.IGNORECASE | re.MULTILINE):
                    errors.append(f"02-adrs/{adr}: missing '## {field}' section")
            match = re.search(r"^##\s+Status\s*\n+\s*(\w+)", text, re.IGNORECASE | re.MULTILINE)
            status = match.group(1).lower() if match else ""
            if status not in ADR_STATUSES:
                errors.append(f"02-adrs/{adr}: status {status!r} is not one of {sorted(ADR_STATUSES)}")
            if status == "accepted" and not re.search(r"BUS-\d+|tests/|scripts/", text):
                errors.append(f"02-adrs/{adr}: 'accepted' needs a validation artifact or BUS issue")
            if adr not in index_text:
                errors.append(f"02-adrs/README.md: does not index {adr}")

    # 07 — data contracts may only describe internal shapes; external payloads
    # are unverified until a source register proves them.
    contracts_path = os.path.join(root, "07-data-contracts.md")
    contracts = pathlib.Path(contracts_path).read_text(encoding="utf-8")
    if "unverified" not in contracts:
        errors.append("07-data-contracts.md: external payload shapes must be marked 'unverified'")
    for link in RELATIVE_LINK.findall(contracts):
        if not _artifact_exists(root, link) and not link.startswith("docs/"):
            errors.append(f"07-data-contracts.md: references {link!r}, which does not exist in this branch")

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default="docs/architecture")
    args = parser.parse_args(argv)

    errors = check(args.root)
    if errors:
        print(f"architecture docs: {len(errors)} problem(s)")
        for error in errors:
            print(f"  - {error}")
        return 1
    print("architecture docs: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
