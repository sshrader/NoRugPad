INK='#14110f'; YEL='#ffd426'; PINK='#ff3d9a'; LIME='#b6f23a'; SKY='#3cc8ff'; BG='#e9e5ff'
FONT="Inter Display, Inter, sans-serif"

def face(cx, cy, r, fill=YEL, tongue=PINK, rot=0):
    k = r/16.0
    p = tongue
    return f'''<g transform="translate({cx} {cy}) rotate({rot}) scale({k}) translate(-16 -16)">
<circle cx="16" cy="16" r="14.2" fill="{fill}" stroke="{INK}" stroke-width="2"/>
<ellipse cx="16" cy="20.6" rx="6.4" ry="4.9" fill="{p}" stroke="{INK}" stroke-width="1.6"/>
<ellipse cx="8.6" cy="14.8" rx="2.4" ry="3.2" transform="rotate(-22 8.6 14.8)" fill="{p}" stroke="{INK}" stroke-width="1.5"/>
<ellipse cx="12.9" cy="9.6" rx="2.5" ry="3.4" transform="rotate(-8 12.9 9.6)" fill="{p}" stroke="{INK}" stroke-width="1.5"/>
<ellipse cx="19.1" cy="9.6" rx="2.5" ry="3.4" transform="rotate(8 19.1 9.6)" fill="{p}" stroke="{INK}" stroke-width="1.5"/>
<ellipse cx="23.4" cy="14.8" rx="2.4" ry="3.2" transform="rotate(22 23.4 14.8)" fill="{p}" stroke="{INK}" stroke-width="1.5"/></g>'''

def stroke_text(x, y, size, txt, fill='#fff', sw=10, shadow=6, anchor='start', rot=0):
    t = lambda dx, dy, extra: f'<text x="{x+dx}" y="{y+dy}" font-family="{FONT}" font-weight="900" font-size="{size}" text-anchor="{anchor}" letter-spacing="-1" {extra}>{txt}</text>'
    return f'''<g transform="rotate({rot} {x} {y})">
{t(shadow, shadow, f'fill="{INK}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"')}
{t(0, 0, f'fill="{INK}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"')}
{t(0, 0, f'fill="{fill}"')}</g>'''

def dots(w, h, step=30):
    return f'<pattern id="d" width="{step}" height="{step}" patternUnits="userSpaceOnUse"><circle cx="{step/2}" cy="{step/2}" r="2.2" fill="#cfc8ff"/></pattern><rect width="{w}" height="{h}" fill="{BG}"/><rect width="{w}" height="{h}" fill="url(#d)"/>'

def wrap(w, h, body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{defs}</defs>{body}</svg>'

# 1. Pad logo: the mark, big, with sticker shadow
open('logo-mark.svg','w').write(wrap(1024,1024,
  f'<rect width="1024" height="1024" fill="{BG}"/>'
  f'<circle cx="536" cy="536" r="408" fill="{INK}"/>' + face(512,512,408)))

# 2. Wordmark lockup
open('logo-wordmark.svg','w').write(wrap(1400,520,
  f'<rect width="1400" height="520" fill="{BG}"/>' + face(250,260,170) +
  stroke_text(470,250,150,'PAW',sw=14,shadow=8) + stroke_text(470,400,150,'PRINT',fill=YEL,sw=14,shadow=8)))

# 3. X profile 400x400 (circle crop safe)
open('x-profile.svg','w').write(wrap(400,400,
  f'<rect width="400" height="400" fill="{PINK}"/>'
  f'<circle cx="206" cy="206" r="150" fill="{INK}"/>' + face(200,200,150)))

# 4. X banner 1500x500 (profile photo covers bottom-left)
MX=990
belt = f'<rect x="{MX+215}" y="372" width="{1500-MX-215}" height="30" fill="{INK}"/><rect x="{MX+215}" y="372" width="{1500-MX-215}" height="12" fill="{YEL}"/>'
belt += ''.join(f'<rect x="{x}" y="384" width="14" height="18" fill="{INK}"/>' for x in range(MX+235,1500,40))
coins = face(1250,330,40,YEL,tongue=PINK,rot=-8) + face(1345,330,40,PINK,tongue=YEL,rot=6) + face(1440,330,40,LIME,rot=-4) + face(1380,215,30,SKY,rot=14)
machine = f'''<rect x="{MX}" y="96" width="200" height="290" rx="22" fill="{INK}" transform="translate(9 9)"/>
<rect x="{MX}" y="96" width="200" height="290" rx="22" fill="{PINK}" stroke="{INK}" stroke-width="7"/>
<rect x="{MX+20}" y="125" width="160" height="96" rx="12" fill="#fff" stroke="{INK}" stroke-width="6"/>
<text x="{MX+100}" y="190" font-family="{FONT}" font-weight="900" font-size="48" text-anchor="middle" fill="{INK}">IDEA</text>
<rect x="{MX+190}" y="300" width="40" height="72" fill="{INK}"/>
<circle cx="{MX+45}" cy="330" r="16" fill="{YEL}" stroke="{INK}" stroke-width="5"/><circle cx="{MX+95}" cy="330" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'''
sticker = f'''<g transform="rotate(-3 300 90)"><rect x="304" y="62" width="200" height="52" rx="10" fill="{INK}"/><rect x="298" y="56" width="200" height="52" rx="10" fill="{YEL}" stroke="{INK}" stroke-width="5"/>
<text x="398" y="93" font-family="{FONT}" font-weight="900" font-size="30" text-anchor="middle" fill="{INK}">PAWPRINT</text></g>'''
body = (dots(1500,500) + sticker +
  stroke_text(300,220,60,'DESCRIBE A COIN.',sw=10,shadow=6) +
  stroke_text(300,305,60,'MEET ITS MASCOT.',fill=YEL,sw=10,shadow=6) +
  f'<text x="300" y="365" font-family="{FONT}" font-weight="700" font-size="26" fill="{INK}">AI writes the coin and draws its mascot.</text>' +
  machine + belt + coins)
open('x-banner.svg','w').write(wrap(1500,500,body))
