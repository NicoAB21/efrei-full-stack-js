"""Génère les SVG de marque Occaz : logo (texte vectorisé depuis Inter 800) et favicon « oz ».
Usage (depuis frontend/src/design-system/) :
  pip install fonttools brotli
  python brand/gen-logo.py fonts/inter-latin-wght.woff2 brand && cp brand/favicon.svg ../../public/favicon.svg
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font = instantiateVariableFont(TTFont(sys.argv[1]), {"wght": 800})
out = sys.argv[2]
gs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm
x_height = font["OS/2"].sxHeight

def text_path(text, size, x0, baseline, tracking_em):
    s = size / upm
    pen = SVGPathPen(gs)
    x = x0
    for ch in text:
        name = cmap[ord(ch)]
        gs[name].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
        x += gs[name].width * s + tracking_em * size
    return pen.getCommands(), x - tracking_em * size - x0

# Proportions du logo CSS (.logo) multipliées : police 40 au lieu de 21
size, notch, pad_l, pad_r, height, radius = 40, 25, 48, 27, 72, 15
_, w_text = text_path("occaz", size, 0, 0, -0.04)
width = round(pad_l + w_text + pad_r)
baseline = height / 2 + x_height * size / upm / 2
d_text, _ = text_path("occaz", size, pad_l, baseline, -0.04)
tag = (f"M{notch} 0H{width - radius}A{radius} {radius} 0 0 1 {width} {radius}V{height - radius}"
       f"A{radius} {radius} 0 0 1 {width - radius} {height}H{notch}L0 {height / 2}Z")
hole = f'<circle cx="26.5" cy="{height / 2}" r="5.7" fill="#1e293b"/>'

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')

open(f"{out}/logo.svg", "w").write(svg(width, height, f'<path d="{tag}" fill="#c2410c"/>{hole}<path d="{d_text}" fill="#fff"/>', "Occaz"))

# Favicon « oz » : formes géométriques, rendu identique partout (pas de police dans un favicon)
fav = ('<rect x="1" y="1" width="30" height="30" rx="7.5" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>'
       '<circle cx="11" cy="17.5" r="4.6" fill="none" stroke="#1e293b" stroke-width="3.4"/>'
       '<path d="M17.6 12.9h7.1l-7.1 9.2h7.1" fill="none" stroke="#c2410c" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>')
open(f"{out}/favicon.svg", "w").write(svg(32, 32, fav, "Occaz"))
print("logo", width, "x", height)
