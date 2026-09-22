#!/usr/bin/env python3
"""Ritaglia il logo e ne ricava tutte le icone.

    python3 scratchpad/genera-icone.py

Sorgente: src/assets/progetto palestra logo.jpg — il logo vero, manubrio col
battito, con sotto la scritta. Da qui esce SOLO il marchio: la scritta ha le
lettere riempite di fotografie e sotto i 200px diventa fango, e il nome
nell'app e' gia' testo vero (il wordmark del benvenuto, che segue il tema).

Tre cose che il file sorgente non ha e che servono:
  - il fondo non e' bianco ma un grigio 232..254 con una sfumatura: appoggiato
    su una card bianca si vedrebbe il quadrato. Si porta il punto di bianco a
    BIANCO_DA, cosi' il fondo diventa 255 pieno e il quadrato sparisce.
  - il marchio e' largo 2.25:1, quindi dentro un'icona quadrata va centrato
    con dei margini, non riscalato a forza.
  - il JPEG sorgente pesa 348KB: nell'app ci va un PNG da 256px.

⚠️ Rigenera dei file versionati. Si rilancia solo se cambia il logo.
"""
from pathlib import Path
from PIL import Image

RADICE = Path(__file__).resolve().parent.parent
SORGENTE = RADICE / 'src/assets/progetto palestra logo.jpg'
# Riquadro del solo marchio nel JPEG sorgente (la scritta sta sotto, da y=649).
RITAGLIO = (143, 259, 915, 602)
BIANCO_DA = 234  # tutto quello che e' piu' chiaro diventa bianco pieno

def marchio():
    im = Image.open(SORGENTE).convert('RGB').crop(RITAGLIO)
    # Punto di bianco: rampa lineare 0..BIANCO_DA -> 0..255.
    return im.point(lambda v: min(255, round(v * 255 / BIANCO_DA)))

def quadrata(src, lato, pieno):
    """Marchio centrato su un quadrato bianco. `pieno` = quanto della larghezza
    occupa (le icone maskable vengono ritagliate a cerchio, quindi meno)."""
    larga = round(lato * pieno)
    alta = round(larga * src.height / src.width)
    out = Image.new('RGB', (lato, lato), (255, 255, 255))
    out.paste(src.resize((larga, alta), Image.LANCZOS), ((lato - larga) // 2, (lato - alta) // 2))
    return out

def main():
    src = marchio()
    print('marchio ritagliato', src.size)

    # Dentro l'app: sfondo bianco, ma il rapporto vero (la card del benvenuto
    # e' larga quanto il logo, non quadrata).
    dentro = src.resize((512, round(512 * src.height / src.width)), Image.LANCZOS)
    # 128 colori: il marchio e' grigi piatti + una riga ciano, e la tavolozza
    # dimezza il file (102KB -> 45KB) senza che si veda. E' la prima immagine
    # della prima schermata, quindi vale la pena.
    dentro = dentro.quantize(colors=128, dither=Image.FLOYDSTEINBERG)
    dentro.save(RADICE / 'src/assets/logo.png', optimize=True)
    print('scritto src/assets/logo.png', dentro.size)

    for nome, lato, pieno in [
        ('pwa-192.png', 192, 0.92),
        ('pwa-512.png', 512, 0.92),
        ('pwa-512-maskable.png', 512, 0.68),
        ('apple-touch-icon.png', 180, 0.86),
        ('favicon.png', 96, 0.96),
    ]:
        quadrata(src, lato, pieno).save(RADICE / 'public' / nome, optimize=True)
        print('scritto public/' + nome, f'{lato}×{lato}', 'pieno', pieno)

main()
