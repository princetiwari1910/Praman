from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ADDRESS_PATTERN = re.compile(r"0x[0-9a-fA-F]{40}")


def find_addresses_in_text(text: str) -> list[str]:
    """Find all 0x followed by 40 hex characters in the text, lowercase, dedupe, sort."""
    addresses: set[str] = set()
    for m in ADDRESS_PATTERN.finditer(text):
        addr = m.group(0).lower()
        addresses.add(addr)
    return sorted(addresses)


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Load OFAC SDN addresses from a text/CSV file")
    parser.add_argument("csv_path", help="Path to the OFAC SDN file (CSV or plain text)")
    parser.add_argument("--out", dest="out_path", help="Output JSON path (default: backend/data/sanctions.json)")
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        print(f"Error: file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    # Read file with UTF-8 encoding, errors replace
    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    addresses = find_addresses_in_text(text)
    count = len(addresses)

    if count == 0:
        print("Error: no addresses found in the file", file=sys.stderr)
        sys.exit(1)

    output = {
        "source": "OFAC SDN (user-supplied file)",
        "loaded_at": datetime.now(timezone.utc).isoformat(),
        "count": count,
        "addresses": addresses,
    }

    # Default output path: backend/data/sanctions.json
    if args.out_path is None:
        out_path = Path(__file__).resolve().parent.parent / "data" / "sanctions.json"
    else:
        out_path = Path(args.out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Loaded {count} addresses")
    if count == 0:
        print("Error: no addresses found in the file", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()