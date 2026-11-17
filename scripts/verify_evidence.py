#!/usr/bin/env python3
"""Verify a Tathya evidence JSON file.

Usage: python scripts/verify_evidence.py <evidence.json>

Checks, each printed as PASS or FAIL:
  - format is tathya-evidence-v1 (or praman-evidence-v1)
  - recomputed sha256 equals "sha256" field
  - score == min(100, sum of reason weights)
  - band matches the score using "bands" from the file
  - sum of reason weights >= score check is not needed

Prints "EVIDENCE VALID" and exits 0 if all pass,
else "EVIDENCE INVALID" and exits 1.
No network access.
"""
import sys
import os
import json
import hashlib


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/verify_evidence.py <evidence.json>")
        sys.exit(1)

    path = sys.argv[1]

    if not os.path.isfile(path):
        print(f"FAIL: file not found: {path}")
        sys.exit(1)

    with open(path) as f:
        data = json.load(f)

    failures = []

    # 1. format is tathya-evidence-v1 or praman-evidence-v1
    fmt_ok = data.get("format") in ("tathya-evidence-v1", "praman-evidence-v1")
    failures.append(("format is tathya-evidence-v1", fmt_ok))

    # 2. recomputed sha256 equals "sha256"
    sha256_ok = False
    stored_sha = data.get("sha256", "")
    report = data.get("report", {})
    if isinstance(report, dict):
        report_json = json.dumps(
            {
                "address": report.get("address"),
                "chain": report.get("chain"),
                "score": report.get("score"),
                "band": report.get("band"),
                "reasons": report.get("reasons", []),
                "generated_at": report.get("generated_at", ""),
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        computed = hashlib.sha256(report_json.encode()).hexdigest()
        sha256_ok = computed == stored_sha
    failures.append(("recomputed sha256 equals \"sha256\"", sha256_ok))

    # 3. score == min(100, sum of reason weights)
    score_ok = False
    score_val = None
    reasons = report.get("reasons", []) if isinstance(report, dict) else []
    if isinstance(reasons, list) and all(isinstance(r, dict) and "weight" in r for r in reasons):
        total_weight = sum(r["weight"] for r in reasons)
        score_val = report.get("score") if isinstance(report.get("score"), (int, float)) else None
        score_ok = score_val == min(100, total_weight)
    failures.append(("score == min(100, sum of reason weights)", score_ok))

    # 4. band matches the score using "bands" from the file
    bands = data.get("bands", [])
    band_ok = False
    if isinstance(bands, list) and score_val is not None:
        for b in bands:
            if isinstance(b, dict) and "min" in b and "max" in b and "name" in b:
                if b["min"] <= score_val <= b["max"]:
                    band_ok = True
                    break
    failures.append(("band matches the score using \"bands\"", band_ok))

    all_pass = all(f[1] for f in failures)

    for name, ok in failures:
        status = "PASS" if ok else "FAIL"
        print(f"{status}: {name}")

    if all_pass:
        print("EVIDENCE VALID")
        sys.exit(0)
    else:
        print("EVIDENCE INVALID")
        sys.exit(1)


if __name__ == "__main__":
    main()