# ---------------------------------------------------------------------------
# Toglie lo sfondo bianco a una figura del corpo (quelle generate per la donna)
# e la mette nel riquadro delle figure dell'app (466x1200, lib/corpoImmagini),
# alta e centrata come quella dell'uomo della stessa vista.
#
#   python scratchpad/sfondo-via.py figura.png fronte uscita.png
#
# Lo sfondo e' tutto il quasi-bianco: il grigio chiaro dei tendini e' molto piu'
# scuro, e cosi' vanno via anche i buchi chiusi (fra la coda e il collo).
# Sul bordo l'alfa si ricava da quanto il pixel e' chiaro (le sfumature del
# contorno), cosi' non resta l'alone bianco.
# ---------------------------------------------------------------------------
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CORPO = Path(__file__).resolve().parent.parent / 'public' / 'corpo'
CHIARO = 190  # sopra e' sfondo: i tendini stanno a 130-150, in mezzo solo sfumature
SCURO = 120   # il contorno: da qui in giu' e' tutto figura


def via_lo_sfondo(rgb):
    lum = rgb.astype(float).mean(axis=2)
    # Tutto il quasi-bianco, anche quello chiuso (fra coda e collo): il grigio
    # piu' chiaro della figura, i tendini, sta molto sotto.
    sfondo = lum > CHIARO
    alfa = np.where(sfondo, 0.0, 1.0)
    # La fascia fra sfondo e figura: alfa dalla luminosita'.
    fascia = ndimage.binary_dilation(sfondo, iterations=3) & ~sfondo
    alfa[fascia] = np.clip((255 - lum[fascia]) / (255 - SCURO), 0, 1)
    out = np.dstack([rgb, (alfa * 255).astype(np.uint8)])
    # Il colore dei pixel di bordo: quello del contorno, non il bianco mischiato.
    contorno = np.median(rgb[lum < SCURO], axis=0)
    out[fascia, :3] = contorno
    return out


def nel_riquadro(rgba, vista):
    uomo = np.array(Image.open(CORPO / f"{'fronte' if vista == 'fronte' else 'retro'}.png").convert('RGBA'))
    ys, _ = np.where(uomo[:, :, 3] > 128)
    top, bot = ys.min(), ys.max()
    ys, xs = np.where(rgba[:, :, 3] > 128)
    fig = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = (bot - top + 1) / fig.height
    fig = fig.resize((round(fig.width * s), bot - top + 1), Image.LANCZOS)
    tela = Image.new('RGBA', (uomo.shape[1], uomo.shape[0]), (0, 0, 0, 0))
    tela.alpha_composite(fig, ((tela.width - fig.width) // 2, int(top)))
    return tela


if __name__ == '__main__':
    src, vista, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    rgb = np.array(Image.open(src).convert('RGB'))
    nel_riquadro(via_lo_sfondo(rgb), vista).save(dst, optimize=True)
    print(dst)
