"""Trace the white RJA logo in a PNG into an SVG path (pixel-edge contours + RDP simplification)."""
import sys
from collections import defaultdict
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('L')
bbox = im.point(lambda v: 255 if v > 128 else 0).getbbox()
im = im.crop(bbox)
W, H = im.size
px = im.load()
fg = [[px[x, y] > 128 for x in range(W)] for y in range(H)]


def on(x, y):
    return 0 <= x < W and 0 <= y < H and fg[y][x]


# Directed boundary edges with the foreground on the left-hand side.
nxt = defaultdict(list)
for y in range(H):
    for x in range(W):
        if not fg[y][x]:
            continue
        if not on(x, y - 1):
            nxt[(x + 1, y)].append((x, y))
        if not on(x, y + 1):
            nxt[(x, y + 1)].append((x + 1, y + 1))
        if not on(x - 1, y):
            nxt[(x, y)].append((x, y + 1))
        if not on(x + 1, y):
            nxt[(x + 1, y + 1)].append((x + 1, y))

loops = []
while nxt:
    start = next(iter(nxt))
    loop, p = [start], start
    while True:
        q = nxt[p].pop()
        if not nxt[p]:
            del nxt[p]
        if q == start:
            break
        loop.append(q)
        p = q
    loops.append(loop)


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5 or 1
    idx, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            idx, dmax = i, d
    if dmax > eps:
        return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


sys.setrecursionlimit(100000)
parts = []
for loop in loops:
    if len(loop) < 8:
        continue
    # Split the closed loop at its farthest point so RDP keeps both halves.
    far = max(range(len(loop)), key=lambda i: (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2)
    a = rdp(loop[:far + 1], 0.7)
    b = rdp(loop[far:] + [loop[0]], 0.7)
    pts = a[:-1] + b[:-1]
    parts.append('M' + 'L'.join(f'{x:g} {y:g}' for x, y in pts) + 'Z')

d = ''.join(parts)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 {W} {H}" fill="none">'
       f'<path fill-rule="evenodd" clip-rule="evenodd" d="{d}" fill="currentColor"></path></svg>')
open(out, 'w').write(svg)
print(W, H, len(loops), len(d))
