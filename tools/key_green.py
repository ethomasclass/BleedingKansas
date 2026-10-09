#!/usr/bin/env python3
"""Remove the flat green background from Google Flow images.

Usage:
    python3 tools/key_green.py IN.png [IN2.png ...] --out art/portraits

Each output is a PNG with a transparent background, same file name.
Optional: --frames N cuts a sprite strip into N equal frames and re-packs
them side by side on one transparent strip (cleans up uneven spacing).
"""
import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("This needs Pillow: pip install pillow")


def key_out(img, strength=1.0):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # how much greener than the other two channels this pixel is
            excess = g - max(r, b)
            if excess > 60 and g > 120:
                px[x, y] = (r, g, b, 0)
            elif excess > 20:
                # soft edge: fade out and pull the green spill back
                alpha = int(a * max(0.0, 1 - (excess - 20) / 40 * strength))
                px[x, y] = (r, min(g, max(r, b) + 10), b, alpha)
    return img


def trim(img):
    box = img.getbbox()
    return img.crop(box) if box else img


def repack(img, frames):
    w, h = img.size
    fw = w // frames
    parts = [trim(img.crop((i * fw, 0, (i + 1) * fw, h))) for i in range(frames)]
    cw = max(p.width for p in parts)
    ch = max(p.height for p in parts)
    out = Image.new("RGBA", (cw * frames, ch), (0, 0, 0, 0))
    for i, p in enumerate(parts):
        # feet on the bottom edge, centered in the cell
        out.paste(p, (i * cw + (cw - p.width) // 2, ch - p.height), p)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--frames", type=int, default=0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for f in args.files:
        img = key_out(Image.open(f))
        img = repack(img, args.frames) if args.frames else trim(img)
        dest = os.path.join(args.out, os.path.splitext(os.path.basename(f))[0] + ".png")
        img.save(dest)
        print("wrote", dest)


if __name__ == "__main__":
    main()
