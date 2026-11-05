"""Regression tests for the R0.3 architecture documents.

The documents are the deliverable, so their required structure is tested the
same way code is: a checker that fails on defects, exercised against the real
`docs/architecture` tree and against deliberately broken copies.
"""

import os
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_architecture_docs as validator  # noqa: E402

DOCS = ROOT / "docs" / "architecture"


def _copy_docs(destination: Path) -> Path:
    target = destination / "architecture"
    shutil.copytree(DOCS, target)
    return target


def _replace(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise AssertionError(f"fixture text not found in {path.name}: {old[:60]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


class ArchitectureSetTest(unittest.TestCase):
    def test_document_set_is_complete_and_valid(self):
        missing = [name for name in validator.REQUIRED_FILES if not (DOCS / name).is_file()]
        self.assertEqual(missing, [], f"missing architecture documents: {missing}")
        adrs = sorted(p.name for p in (DOCS / "02-adrs").glob("ADR-*.md"))
        self.assertGreaterEqual(len(adrs), 8, "the plan fixes eight architecture decisions")
        self.assertEqual(validator.check(str(DOCS)), [])

    def test_cli_reports_success(self):
        self.assertEqual(validator.main(["--root", str(DOCS)]), 0)

    def test_every_p0_integration_has_owner_dependency_failure_mode_and_test(self):
        header, rows = validator.parse_first_table(str(DOCS / "03-integration-register.md"))
        records = [dict(zip(header, row)) for row in rows]
        p0 = [r for r in records if r.get("priority") == "P0"]

        self.assertGreaterEqual(len(p0), 8, "M1-M4 critical path integrations must be P0")
        for record in p0:
            with self.subTest(integration=record.get("id")):
                self.assertIn(record["owner"], validator.ALLOWED_OWNERS)
                self.assertTrue(record["dependency"].strip())
                self.assertTrue(record["failure_mode"].strip())
                self.assertTrue(record["feasibility_test"].strip())
                self.assertIn(record["evidence_status"], validator.EVIDENCE_STATUSES)

    def test_core_plan_systems_are_p0(self):
        header, rows = validator.parse_first_table(str(DOCS / "03-integration-register.md"))
        records = [dict(zip(header, row)) for row in rows]
        p0_text = " ".join(r["integration"] for r in records if r.get("priority") == "P0")
        for system in ("Paperclip", "Medusa", "Odoo", "Supplier", "Nuxt", "payment"):
            self.assertIn(system.lower(), p0_text.lower(), f"{system} must be a P0 integration")


class ValidatorCatchesDefectsTest(unittest.TestCase):
    """Negative tests: the checker must fail when the register is incomplete."""

    def test_missing_owner_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            docs = _copy_docs(Path(tmp))
            register = docs / "03-integration-register.md"
            text = register.read_text(encoding="utf-8")
            row = next(line for line in text.splitlines() if line.startswith("| INT-02"))
            broken = row.split("|")
            broken[5] = " "  # owner column
            _replace(register, row, "|".join(broken))
            errors = validator.check(str(docs))
            self.assertTrue(any("owner" in e and "INT-02" in e for e in errors), errors)

    def test_verified_status_without_evidence_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            docs = _copy_docs(Path(tmp))
            register = docs / "03-integration-register.md"
            text = register.read_text(encoding="utf-8")
            row = next(line for line in text.splitlines() if line.startswith("| INT-02"))
            broken = row.split("|")
            broken[8] = " verified "
            broken[11] = " none "
            _replace(register, row, "|".join(broken))
            errors = validator.check(str(docs))
            self.assertTrue(any("INT-02" in e and "verified" in e for e in errors), errors)

    def test_unknown_dependency_reference_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            docs = _copy_docs(Path(tmp))
            register = docs / "03-integration-register.md"
            text = register.read_text(encoding="utf-8")
            row = next(line for line in text.splitlines() if line.startswith("| INT-02"))
            broken = row.split("|")
            broken[6] = " DEP-99 "  # dependency column
            _replace(register, row, "|".join(broken))
            errors = validator.check(str(docs))
            self.assertTrue(any("DEP-99" in e for e in errors), errors)

    def test_missing_document_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            docs = _copy_docs(Path(tmp))
            (docs / "04-risk-register.md").unlink()
            errors = validator.check(str(docs))
            self.assertTrue(any("04-risk-register.md" in e for e in errors), errors)

    def test_adr_without_required_section_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            docs = _copy_docs(Path(tmp))
            adr = sorted((docs / "02-adrs").glob("ADR-*.md"))[0]
            _replace(adr, "## Validation", "## Something else")
            errors = validator.check(str(docs))
            self.assertTrue(any(adr.name in e and "validation" in e.lower() for e in errors), errors)


if __name__ == "__main__":
    unittest.main()
