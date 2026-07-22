#!/usr/bin/env python3
"""
Subset the three self-hosted faces.

Why this exists: the fonts as downloaded from Google are the heaviest thing on
the page — Fraunces alone is 118KB, because a variable font ships its whole
design space. On a throttled 4G connection that lands directly on the critical
path and pushes LCP past four seconds.

Two reductions, in order:

1. Restrict the variable axes to the ranges the design actually uses. Fraunces
   ships wght 100-900; this site uses 400-600. Pinning the rest of that range
   away is free — nothing on the site can reach it.
2. Subset the character set to Latin plus the punctuation we actually typeset.

Run: npm run fonts:subset   (requires: pip install fonttools brotli)

Re-run this after replacing any font file. The originals stay in assets/fonts/
so this is always repeatable from source.
"""
import pathlib
import shutil
import subprocess
import sys

from fontTools import ttLib
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "fonts"
OUT = ROOT / "public" / "fonts"

# Latin, Latin-1 supplement, and the specific marks this site typesets:
# curly quotes and apostrophes, en/em dash, ellipsis, middot, minus, arrow.
UNICODES = (
    "U+0020-007E,U+00A0-00FF,"
    "U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,"
    "U+2022,U+2026,U+00B7,U+2212,U+2192,U+00D7"
)

FONTS = [
    {
        "file": "fraunces-var.woff2",
        # SOFT 60-100 and WONK 0-1 are both used. wght is capped at the two
        # weights in the type scale, and opsz at the range the stylesheets
        # actually set (24 on case cards, 36 on the wordmark, 48 on headings).
        # Carrying the full 9-144 optical range cost 38KB on the critical path
        # for sizes nothing on the site renders at.
        "limits": {
            "wght": (400, 600),
            "SOFT": (60, 100),
            "WONK": (0, 1),
            "opsz": (24, 48),
        },
    },
    {
        "file": "schibsted-grotesk-var.woff2",
        "limits": {"wght": (400, 500)},
    },
    {
        "file": "dm-mono-400.woff2",
        "limits": None,  # already a static instance
    },
]


def main() -> int:
    if not SRC.exists():
        print(f"No source fonts at {SRC}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)

    total_before = 0
    total_after = 0

    for entry in FONTS:
        src = SRC / entry["file"]
        if not src.exists():
            print(f"  skip {entry['file']} — not in assets/fonts/")
            continue

        before = src.stat().st_size
        total_before += before

        work = OUT / f"_tmp_{entry['file']}"
        shutil.copy(src, work)

        # 1. Narrow the variable design space.
        if entry["limits"]:
            font = ttLib.TTFont(work)
            if "fvar" in font:
                axes = {a.axisTag for a in font["fvar"].axes}
                limits = {k: v for k, v in entry["limits"].items() if k in axes}
                font = instancer.instantiateVariableFont(font, limits, updateFontNames=False)
                font.flavor = "woff2"
                font.save(work)
            font.close()

        # 2. Subset the character set.
        dest = OUT / entry["file"]
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(work),
                f"--unicodes={UNICODES}",
                "--layout-features=kern,liga,clig,calt,tnum,frac",
                "--flavor=woff2",
                "--no-hinting",
                "--desubroutinize",
                f"--output-file={dest}",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        work.unlink(missing_ok=True)

        after = dest.stat().st_size
        total_after += after
        print(
            f"  {entry['file']:<32} {before/1024:6.1f}KB → {after/1024:6.1f}KB"
            f"  ({100 - after/before*100:.0f}% smaller)"
        )

    print(
        f"\n  total {total_before/1024:.1f}KB → {total_after/1024:.1f}KB"
        f"  ({100 - total_after/total_before*100:.0f}% smaller)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
