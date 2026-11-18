# QR statico per il poster: https://progettopalestra.it/?da=volantino (il
# ?da= dice all'app che il nuovo iscritto arriva dal volantino, lib/provenienza),
# correzione Q,
# puntini tondi, occhi pieni arrotondati, buco al centro per l'icona.
#   PYTHONPATH=<cartella con segno> python3 poster/qr.py > poster/qr.svg
import segno

URL = 'https://progettopalestra.it/?da=volantino'
# Sfumatura in diagonale nei blu dell'app, scura abbastanza per la lettura.
DA, A = '#0a72ad', '#1e3a8a'
BUCO = 9  # moduli per lato lasciati liberi al centro (~10% dell'area)

q = segno.make(URL, error='q', micro=False, boost_error=False)
m = [list(r) for r in q.matrix]
n = len(m)
c0 = (n - BUCO) // 2


def in_occhio(r, c):
    return (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)


parti = []
for r in range(n):
    for c in range(n):
        if not m[r][c] or in_occhio(r, c):
            continue
        if c0 <= r < c0 + BUCO and c0 <= c < c0 + BUCO:
            continue
        parti.append(f'<circle cx="{c + 0.5}" cy="{r + 0.5}" r="0.46"/>')

occhi = []
for r, c in [(0, 0), (0, n - 7), (n - 7, 0)]:
    occhi.append(
        f'<rect x="{c + 0.5}" y="{r + 0.5}" width="6" height="6" rx="2.2" fill="none" stroke="url(#s)"/>'
        f'<rect x="{c + 2}" y="{r + 2}" width="3" height="3" rx="1.1" fill="url(#s)"/>'
    )

print(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 {n + 8} {n + 8}">'
    f'<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{n}" y2="{n}">'
    f'<stop offset="0" stop-color="{DA}"/><stop offset="1" stop-color="{A}"/></linearGradient></defs>'
    f'<rect x="-4" y="-4" width="{n + 8}" height="{n + 8}" rx="4" fill="#fff"/>'
    f'<g fill="url(#s)">{"".join(parti)}</g>{"".join(occhi)}'
    # Il tondo per l'icona, nel buco lasciato libero.
    f'<circle cx="{n / 2}" cy="{n / 2}" r="{BUCO / 2 - 0.4}" fill="#fff" stroke="url(#s)" stroke-width="0.45"/></svg>'
)
