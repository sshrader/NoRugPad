# Orbit Pad brand assets: logo mark, wordmark, X profile picture and banner. Run: python3 build.py, then render each SVG to PNG.
INK='#0b0a1f'; PANEL='#17143a'; STAR='#f4f0ff'; YEL='#ffd426'; PINK='#ff3d9a'; LIME='#b6f23a'; SKY='#3cc8ff'
FONT="Inter Display, Inter, sans-serif"  # Anton is the site font; swap it in here if installed

def mark(cx, cy, r):
    k = r/24.0
    return f'''<g transform="translate({cx} {cy}) scale({k}) translate(-24 -24)">
<ellipse cx="24" cy="26" rx="22" ry="7" transform="rotate(-18 24 26)" fill="none" stroke="{PINK}" stroke-width="4"/>
<circle cx="24" cy="24" r="14" fill="{YEL}" stroke="{INK}" stroke-width="3"/>
<path d="M5 31 Q24 40 43 17" fill="none" stroke="{PINK}" stroke-width="4" stroke-linecap="round" transform="translate(0 -1)"/>
<circle cx="19" cy="21" r="2.4" fill="{INK}"/><circle cx="29" cy="21" r="2.4" fill="{INK}"/></g>'''

def text(x, y, size, txt, fill=STAR, shadow=PINK, off=5, anchor='start'):
    t = lambda dx, dy, f: f'<text x="{x+dx}" y="{y+dy}" font-family="{FONT}" font-weight="900" font-size="{size}" text-anchor="{anchor}" letter-spacing="-1" fill="{f}">{txt}</text>'
    return t(off, off, shadow) + t(0, 0, fill)

def stars(w, h, n, seed=3):
    out = []; s = seed
    for i in range(n):
        s = (s * 1103515245 + 12345) % 2147483648; x = s % w
        s = (s * 1103515245 + 12345) % 2147483648; y = s % h
        r = 1.2 + (i % 4) * 0.5
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{YEL if i % 9 == 0 else STAR}" opacity="{0.45 + (i % 5) * 0.12:.2f}"/>')
    return ''.join(out)

def wrap(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'

ROCKET = f'''<g>
<circle cx="520" cy="96" r="58" fill="{SKY}" stroke="{INK}" stroke-width="4"/>
<ellipse cx="520" cy="104" rx="96" ry="20" transform="rotate(-16 520 104)" fill="none" stroke="{YEL}" stroke-width="7"/>
<circle cx="78" cy="84" r="26" fill="{STAR}" stroke="{INK}" stroke-width="4"/>
<circle cx="68" cy="76" r="6" fill="#cfc9f5"/><circle cx="88" cy="94" r="4" fill="#cfc9f5"/>
<rect x="430" y="150" width="26" height="240" fill="{PINK}" stroke="{INK}" stroke-width="4"/>
<path d="M430 190 L456 220 M456 190 L430 220 M430 240 L456 270 M456 240 L430 270 M430 290 L456 320 M456 290 L430 320" stroke="{INK}" stroke-width="3"/>
<rect x="352" y="176" width="80" height="12" fill="{STAR}" stroke="{INK}" stroke-width="3"/>
<path d="M300 36 C356 84 366 190 354 286 L246 286 C234 190 244 84 300 36Z" fill="{STAR}" stroke="{INK}" stroke-width="5"/>
<path d="M246 224 L196 306 L248 286Z" fill="{PINK}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<path d="M354 224 L404 306 L352 286Z" fill="{PINK}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<rect x="262" y="284" width="76" height="22" rx="4" fill="#3a3550" stroke="{INK}" stroke-width="4"/>
<circle cx="300" cy="148" r="48" fill="{YEL}" stroke="{INK}" stroke-width="5"/>
<circle cx="300" cy="148" r="38" fill="{PANEL}" stroke="{INK}" stroke-width="4"/>
<g transform="translate(300 148) scale(1.35) translate(-24 -24)"><ellipse cx="24" cy="26" rx="22" ry="7" transform="rotate(-18 24 26)" fill="none" stroke="{PINK}" stroke-width="4"/><circle cx="24" cy="24" r="14" fill="{YEL}" stroke="{INK}" stroke-width="3"/><path d="M5 31 Q24 40 43 17" fill="none" stroke="{PINK}" stroke-width="4" stroke-linecap="round" transform="translate(0 -1)"/><circle cx="19" cy="21" r="2.4" fill="{INK}"/><circle cx="29" cy="21" r="2.4" fill="{INK}"/></g>
<path d="M272 308 Q300 420 328 308Z" fill="{YEL}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M286 308 Q300 374 314 308Z" fill="{PINK}"/>
<rect x="180" y="392" width="240" height="22" fill="{YEL}" stroke="{INK}" stroke-width="4"/>
<rect x="0" y="414" width="600" height="26" fill="{PANEL}"/>
</g>'''

open('logo-mark.svg','w').write(wrap(1024,1024, f'<rect width="1024" height="1024" fill="{INK}"/>'+stars(1024,1024,60)+mark(512,512,330)))
open('logo-wordmark.svg','w').write(wrap(1400,520, f'<rect width="1400" height="520" fill="{INK}"/>'+stars(1400,520,70)+mark(250,260,170)+text(470,250,150,'ORBIT',off=8)+text(470,400,150,'PAD',fill=YEL,off=8)))
open('x-profile.svg','w').write(wrap(400,400, f'<rect width="400" height="400" fill="{INK}"/>'+stars(400,400,26)+mark(200,200,150)))

# X banner 1500x500. The profile picture covers the bottom-left corner on desktop, so the copy starts at x=300.
sticker = f'''<g transform="rotate(-3 300 90)"><rect x="304" y="62" width="196" height="52" rx="10" fill="{STAR}"/><rect x="298" y="56" width="196" height="52" rx="10" fill="{YEL}" stroke="{INK}" stroke-width="5"/>
<text x="396" y="93" font-family="{FONT}" font-weight="900" font-size="30" text-anchor="middle" fill="{INK}">ORBIT PAD</text></g>'''
body = (f'<rect width="1500" height="500" fill="{INK}"/>' + stars(1500,500,110,7) + sticker +
  text(300,220,64,'TURN AN IDEA',off=5) + text(300,306,64,'INTO A COIN.',fill=YEL,off=5) +
  f'<text x="300" y="366" font-family="{FONT}" font-weight="700" font-size="26" fill="#cfc9f5">AI writes it, draws its mascot, and launches it on Solana.</text>' +
  f'<g transform="translate(900 20) scale(1.08)">{ROCKET}</g>')
open('x-banner.svg','w').write(wrap(1500,500,body))
