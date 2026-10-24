# ---------------------------------------------------------------------------
# Le maschere della DONNA (public/corpo/donna/fronte-petto.png, ...), ricavate
# da quelle dell'uomo (public/corpo/fronte-petto.png, ...).
#
#   python scratchpad/maschere-donna.py
#
# Le due figure hanno la stessa posa e lo stesso riquadro (scratchpad/
# sfondo-via.py le mette alte uguali), ma la donna e' piu' stretta di spalle e
# piu' larga di fianchi. Allora:
#   1. si stira l'uomo sulla donna: in altezza fra quattro punti fermi (la
#      cima della testa, la riga delle spalle, la vita, i piedi: spalle e vita
#      della donna sono piu' basse), poi riga per riga in larghezza, ogni
#      tratto della sagoma dell'uomo (braccio, busto, braccio) sul tratto
#      della donna;
#   2. la figura della donna si divide in zone: il colore pieno dei muscoli fra
#      i contorni scuri e i tendini chiari (come le maschere dell'uomo, che
#      lasciano vuoti i solchi);
#   3. ogni zona della donna va al gruppo dell'uomo stirato che ne copre di
#      piu', se ne copre almeno il 40% (non la meta': i solchi dell'uomo
#      cadono a volte in mezzo a una zona di lei, come le dita del dentato sui
#      fianchi dell'addome). Poi, dentro ogni gruppo, lo stesso coi
#      sottogruppi. Cosi' le maschere seguono le linee del suo disegno.
# Le maschere che nell'uomo non sono zone intere ma tagli (i deltoidi divisi
# da una retta, i romboidi dentro il trapezio) si stirano pari pari e si
# ritagliano dentro la maschera del gruppo della donna.
#
# ⚠️ Se cambiano le maschere dell'uomo (scratchpad/maschere-sottogruppi.py) o
# la figura della donna, si rilancia e si guardano le immagini prodotte.
# ---------------------------------------------------------------------------
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CORPO = Path(__file__).resolve().parent.parent / 'public' / 'corpo'
DONNA = CORPO / 'donna'
CENTRO_X = 232  # la colonna vertebrale / la linea in mezzo al corpo

GRUPPI = {
    'fronte': ['petto', 'spalle', 'bicipiti', 'addome', 'schiena', 'gambe', 'polpacci'],
    'retro': ['schiena', 'spalle', 'tricipiti', 'glutei', 'gambe', 'polpacci'],
}
# Sottogruppo -> gruppo. Quelli in TAGLI si stirano a pixel, gli altri a zone.
SOTTO = {
    'fronte': {'trapezio': 'schiena', 'deltoideAnteriore': 'spalle', 'deltoideLaterale': 'spalle',
               'quadricipiti': 'gambe', 'adduttori': 'gambe'},
    'retro': {'trapezio': 'schiena', 'romboidi': 'schiena', 'dorsali': 'schiena', 'lombari': 'schiena',
              'deltoidePosteriore': 'spalle', 'deltoideLaterale': 'spalle', 'femorali': 'gambe',
              'adduttori': 'gambe', 'quadricipiti': 'gambe'},
}
TAGLI = {'deltoideAnteriore', 'deltoideLaterale', 'deltoidePosteriore', 'romboidi'}
PIENO = (84, 112)  # la luminosita' del colore pieno dei muscoli
SOGLIA = 0.4       # quanto di una zona deve coprire un muscolo per prendersela
MIN_ZONA = 30      # le zone piu' piccole sono briciole dei bordi


def rgba(p):
    return np.array(Image.open(p).convert('RGBA'))


def tratti(riga):
    """I tratti pieni di una riga della sagoma: [(x0, x1), ...]."""
    xs = np.where(riga)[0]
    if not len(xs):
        return []
    rotture = np.where(np.diff(xs) > 1)[0]
    inizi = np.r_[xs[0], xs[rotture + 1]]
    fini = np.r_[xs[rotture], xs[-1]]
    return [(a, b) for a, b in zip(inizi, fini) if b - a >= 2]


def punti_fermi(sagoma):
    """Cima, spalle (la prima riga larga piu' del 60% della piu' larga), vita
    (la riga dove il busto, senza le braccia, e' piu' stretto) e piedi."""
    larghezza = sagoma.sum(axis=1)
    ys = np.where(larghezza > 0)[0]
    cima, piedi = ys[0], ys[-1]
    spalle = int(np.argmax(larghezza > 0.6 * larghezza.max()))

    def busto(y):
        return next((b - a for a, b in tratti(sagoma[y]) if a <= CENTRO_X <= b), 10**6)

    vita = min(range(spalle + 100, spalle + 380), key=busto)
    return [cima, spalle, vita, piedi]


def stira(sagoma_uomo, sagoma_donna):
    """Per ogni pixel della donna, il pixel dell'uomo da cui prenderlo:
    (righe, colonne), -1 = niente."""
    h, w = sagoma_donna.shape
    righe = np.round(np.interp(np.arange(h), punti_fermi(sagoma_donna), punti_fermi(sagoma_uomo))).astype(int)
    mappa = np.full((h, w), -1, dtype=int)
    for y in range(h):
        tu, td = tratti(sagoma_uomo[righe[y]]), tratti(sagoma_donna[y])
        if not tu or not td:
            continue
        # Stesso numero di tratti: uno sull'altro. Se no, la riga intera.
        coppie = list(zip(td, tu)) if len(tu) == len(td) else [((td[0][0], td[-1][1]), (tu[0][0], tu[-1][1]))]
        for (d0, d1), (u0, u1) in coppie:
            x = np.arange(d0, d1 + 1)
            mappa[y, x] = np.round(u0 + (x - d0) * (u1 - u0) / max(d1 - d0, 1)).astype(int)
    return righe, mappa


def salva(nome, m):
    a = np.zeros(m.shape + (4,), dtype=np.uint8)
    a[m] = (255, 255, 255, 255)
    Image.fromarray(a, 'RGBA').save(DONNA / f'{nome}.png', optimize=True)
    print(f'donna/{nome}.png  {int(m.sum())} px')


for vista in ('fronte', 'retro'):
    uomo = rgba(CORPO / f'{vista}.png')
    donna = rgba(DONNA / f'{vista}.png')
    righe, mappa = stira(uomo[:, :, 3] > 128, donna[:, :, 3] > 128)
    ys, xs = np.where(mappa >= 0)

    def stirata(nome):
        m_uomo = rgba(CORPO / f'{vista}-{nome}.png')[:, :, 3] > 128
        m = np.zeros(mappa.shape, dtype=bool)
        m[ys, xs] = m_uomo[righe[ys], mappa[ys, xs]]
        return m

    lum = donna[:, :, :3].astype(float).mean(axis=2)
    lab, n = ndimage.label((donna[:, :, 3] > 250) & (lum >= PIENO[0]) & (lum <= PIENO[1]))
    zone = [z for z in (lab == i for i in range(1, n + 1)) if z.sum() >= MIN_ZONA]

    def assegna(nomi, dentro=None):
        """{nome: maschera}: ogni zona al muscolo che ne copre di piu'."""
        stirate = {k: stirata(k) for k in nomi}
        out = {k: np.zeros(mappa.shape, dtype=bool) for k in nomi}
        for z in zone:
            if not stirate or (dentro is not None and not (z & dentro).any()):
                continue
            copre = {k: (z & m).sum() / z.sum() for k, m in stirate.items()}
            k = max(copre, key=copre.get)
            if copre[k] >= SOGLIA:
                out[k] |= z
        return out

    gruppi = assegna(GRUPPI[vista])
    for g, m in gruppi.items():
        salva(f'{vista}-{g}', m)
    for g, m_g in gruppi.items():
        sotto = [s for s, gg in SOTTO[vista].items() if gg == g]
        a_zone = assegna([s for s in sotto if s not in TAGLI], m_g)
        for s in sotto:
            salva(f'{vista}-{s}', (stirata(s) if s in TAGLI else a_zone[s]) & m_g)
