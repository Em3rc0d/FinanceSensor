#!/usr/bin/env python3
"""PF-EXP-001 private PDF *structural* preflight. Never emits document content.

Reads a chosen local PDF (not Gmail). Optional protected password prompt uses getpass;
no passwords from argv or environment, no output/caches of statements, no network.
Not a bank parser, ledger reconciler or an independent oracle.
"""
from __future__ import annotations
import argparse
import getpass
import json
import os
import sys
from pathlib import Path

import fitz


def probe(path: Path, source_class: str, password: str | None = None) -> dict:
    result = {
        "schema": "PF_EXP_001_G0_PDF_STRUCTURAL_PROBE_V1",
        "sourceClass": source_class,
        "status": "UNREADABLE",
        "encrypted": None,
        "pageCount": None,
        "pagesWithTextLayer": None,
        "pagesWithoutTextLayer": None,
        "gates": {"C0": "BLOCKED", "G0": "NOT_RUN", "G1": "NOT_RUN"},
        "disclaimer": "Structure only; period, completeness, financial correctness and oracle are unverified."
    }
    if not path.is_file() or not path.suffix.lower() == '.pdf':
        result["status"] = "INVALID_INPUT"
        return result
    try:
        with fitz.open(str(path)) as doc:
            result["encrypted"] = bool(doc.needs_pass)
            if doc.needs_pass:
                if password is None:
                    result["status"] = "PASSWORD_REQUIRED"
                    return result
                if not doc.authenticate(password):
                    result["status"] = "INVALID_PASSWORD"
                    return result
            count = len(doc)
            if count <= 0:
                result["status"] = "INVALID_PDF"
                return result
            with_text = sum(bool(page.get_text("text").strip()) for page in doc)
            result.update({
                "status": "STRUCTURALLY_OPENABLE",
                "pageCount": count,
                "pagesWithTextLayer": with_text,
                "pagesWithoutTextLayer": count - with_text,
            })
    except (fitz.FileDataError, fitz.FileNotFoundError, ValueError, OSError):
        result["status"] = "INVALID_PDF"
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description="Private PDF structural check; never prints statement data")
    ap.add_argument('file', help='local PDF path (never displayed in output)')
    ap.add_argument('--source-class', required=True, choices=['BCP_SAVINGS','RIPLEY_CREDIT','OTHER'])
    ap.add_argument('--password-prompt', action='store_true', help='read password invisibly from a local TTY')
    a = ap.parse_args()
    password = None
    if a.password_prompt:
        if not sys.stdin.isatty():
            print(json.dumps({"status":"INTERACTIVE_TERMINAL_REQUIRED","gates":{"G0":"NOT_RUN"}}))
            return 3
        password = getpass.getpass('PDF password (local only): ')
    try:
        result = probe(Path(a.file), a.source_class, password)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0 if result["status"] == "STRUCTURALLY_OPENABLE" else 3
    finally:
        password = None


if __name__ == '__main__':
    raise SystemExit(main())
