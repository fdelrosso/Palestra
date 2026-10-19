# ---------------------------------------------------------------------------
# Le maschere dei SOTTOGRUPPI (public/corpo/fronte-quadricipiti.png, ...),
# ricavate da quelle dei gruppi (fronte-gambe.png, retro-schiena.png, ...).
#
#   python scratchpad/maschere-sottogruppi.py
#
# Ogni maschera di gruppo e' fatta di zone separate dai solchi, una per muscolo
# disegnato: qui le zone si assegnano ai sottogruppi (lib/muscoli SOTTOGRUPPI).
# Le zone si riconoscono dal BARICENTRO, non dal numero dell'etichetta, cosi' lo
# script regge anche se l'ordine delle zone cambia.
#
# Due casi non si fanno a zone:
#   - il deltoide e' una zona sola per lato: si taglia con la retta che va dal
#     mezzo della sua cima alla sua punta in basso. Dalla parte del corpo c'e'
#     l'anteriore (davanti) o il posteriore (dietro), fuori il laterale;
#   - i romboidi nel disegno non si vedono (stanno sotto il trapezio): sono la
#     fascia del trapezio fra le scapole piu' l'infraspinato.
#
# ⚠️ Se cambiano le figure o le maschere dei gruppi, si rilancia lo script e si
# guardano le immagini prodotte.
# ---------------------------------------------------------------------------
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CORPO = Path(__file__).resolve().parent.parent / 'public' / 'corpo'
CENTRO_X = 232  # la colonna vertebrale / la linea in mezzo al corpo


def maschera(nome):
    return np.array(Image.open(CORPO / f'{nome}.png').convert('RGBA'))[:, :, 3] > 128


def zone(nome):
    m = maschera(nome)
    lab, n = ndimage.label(m)
    out = []
    for i in range(1, n + 1):
        z = lab == i
        if z.sum() < 30:
            continue
        ys, xs = np.where(z)
        out.append({'i': i, 'm': z, 'cx': xs.mean(), 'cy': ys.mean(), 'x0': xs.min(), 'x1': xs.max(), 'y0': ys.min(), 'y1': ys.max()})
    return out


def salva(nome, m):
    a = np.zeros(m.shape + (4,), dtype=np.uint8)
    a[m] = (255, 255, 255, 255)
    Image.fromarray(a, 'RGBA').save(CORPO / f'{nome}.png', optimize=True)
    print(f'{nome}.png  {int(m.sum())} px')


def unisci(shape, zz):
    m = np.zeros(shape, dtype=bool)
    for z in zz:
        m |= z['m']
    return m


def tranne(zz, *escluse):
    via = {z['i'] for e in escluse for z in e}
    return [z for z in zz if z['i'] not in via]


def dal_centro(z):
    return abs(z['cx'] - CENTRO_X)


# ------------------------------------------------------------------ gambe
fg = zone('fronte-gambe')
shape = fg[0]['m'].shape
coscia = [z for z in fg if z['cy'] < 860]  # sotto il ginocchio: tibiali, fuori
# Le strisce interne e lunghe (sartorio/adduttori) sono le piu' vicine al
# centro fra quelle che partono in alto.
add_f = [z for z in coscia if z['y0'] < 600 and dal_centro(z) < 60]
salva('fronte-adduttori', unisci(shape, add_f))
salva('fronte-quadricipiti', unisci(shape, tranne(coscia, add_f)))

rg = zone('retro-gambe')
lat_r = [z for z in rg if dal_centro(z) > 100]  # il vasto laterale, visto da dietro
add_r = [z for z in rg if z['y0'] < 700 and dal_centro(z) < 45 and z['y1'] < 800]
salva('retro-quadricipiti', unisci(shape, lat_r))
salva('retro-adduttori', unisci(shape, add_r))
salva('retro-femorali', unisci(shape, tranne(rg, lat_r, add_r)))


# ------------------------------------------------------------------ spalle
def taglia_deltoide(nome, dentro, fuori):
    ant = np.zeros(shape, dtype=bool)
    lat = np.zeros(shape, dtype=bool)
    for z in zone(nome):
        ys, xs = np.where(z['m'])
        cima = xs[ys <= z['y0'] + 6].mean(), z['y0']
        punta = xs[ys >= z['y1'] - 6].mean(), z['y1']
        # Da che parte della retta cima→punta sta ogni pixel.
        lato = (punta[0] - cima[0]) * (ys - cima[1]) - (punta[1] - cima[1]) * (xs - cima[0])
        verso_centro = (punta[0] - cima[0]) * 0 - (punta[1] - cima[1]) * (CENTRO_X - cima[0])
        interno = np.sign(lato) == np.sign(verso_centro)
        ant[ys[interno], xs[interno]] = True
        lat[ys[~interno], xs[~interno]] = True
    salva(dentro, ant)
    salva(fuori, lat)


taglia_deltoide('fronte-spalle', 'fronte-deltoideAnteriore', 'fronte-deltoideLaterale')
taglia_deltoide('retro-spalle', 'retro-deltoidePosteriore', 'retro-deltoideLaterale')

# ------------------------------------------------------------------ schiena
salva('fronte-trapezio', maschera('fronte-schiena'))

rs = zone('retro-schiena')
trap = [z for z in rs if z['y0'] < 180]  # il trapezio e i due fasci sul collo
infra = [z for z in tranne(rs, trap) if z['cy'] < 310]  # infraspinato
teres = [z for z in tranne(rs, trap) if 310 <= z['cy'] < 340]  # grande rotondo
lomb = [z for z in rs if dal_centro(z) < 15 or z['cy'] > 495]  # erettori e fianchi bassi
dors = tranne(rs, trap, infra, teres, lomb)

m_trap = unisci(shape, trap)
fascia = np.zeros(shape, dtype=bool)
fascia[245:350, :] = True
salva('retro-trapezio', m_trap & ~fascia)
salva('retro-romboidi', (m_trap & fascia) | unisci(shape, infra))
salva('retro-dorsali', unisci(shape, dors + teres))
salva('retro-lombari', unisci(shape, lomb))
