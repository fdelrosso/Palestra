# La "maschera" della mappa delle palestre: tutto tranne l'Italia, che
# MappaPalestre copre di grigio. Si rifa' a mano, solo se cambiano i confini:
#
#     pip install duckdb
#     python3 scratchpad/italia-maschera.py [tolleranza in metri, default 800]
#
# Scrive src/data/italiaMaschera.json: un poligono grande quanto il mondo con
# un buco per ogni pezzo d'Italia (penisola e isole). Viene dai confini
# ISTAT delle regioni (CC BY, gia' citato nei crediti della mappa), uniti in
# uno e semplificati: alla scala della mappa d'Italia 800 m non si vedono, e
# il file resta piccolo (sta nel pezzo di codice della mappa, che si scarica
# solo aprendola).
# San Marino e la Citta' del Vaticano nei confini ISTAT sono buchi: si
# riempiono, se no resterebbero due puntini grigi in mezzo all'Italia. Le isole
# sotto 1 km² si lasciano andare: sarebbero puntini, e nessuna ha palestre.

import json
import os
import sys
import tempfile
import urllib.request
import zipfile

import duckdb

ANNO = '2026'
ISTAT = f'https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/{ANNO}/Limiti0101{ANNO}_g.zip'
TOLLERANZA = float(sys.argv[1]) if len(sys.argv) > 1 else 800
ISOLA_MINIMA = 1_000_000  # m²

radice = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cartella = os.path.join(tempfile.gettempdir(), f'istat-{ANNO}')
if not os.path.isdir(cartella):
    print('Scarico i confini ISTAT…')
    zip_istat, _ = urllib.request.urlretrieve(ISTAT)
    zipfile.ZipFile(zip_istat).extractall(cartella)
regioni = os.path.join(cartella, f'Reg0101{ANNO}_g', f'Reg0101{ANNO}_g_WGS84.shp')

c = duckdb.connect()
c.sql('install spatial; load spatial')
# In UTM 32N (metri) si unisce, si tolgono i buchi e le isolette, si
# semplifica; poi in gradi per la mappa.
pezzi = c.execute(f"""
  with italia as (select st_union_agg(geom) as g from st_read(?)),
  pezzi as (select unnest(st_dump(g)).geom as p from italia)
  select st_asgeojson(st_transform(
           st_simplifypreservetopology(st_makepolygon(st_exteriorring(p)), {TOLLERANZA}),
           'EPSG:32632', 'EPSG:4326', always_xy := true))
    from pezzi
   where st_area(st_makepolygon(st_exteriorring(p))) >= {ISOLA_MINIMA}
""", [regioni]).fetchall()

# Un buco per pezzo, con le coordinate a 3 decimali (~100 m).
buchi = []
for (g,) in pezzi:
    anello = json.loads(g)['coordinates'][0]
    buchi.append([[round(x, 3), round(y, 3)] for x, y in anello])
mondo = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
maschera = {
    'type': 'Feature',
    'properties': {},
    'geometry': {'type': 'Polygon', 'coordinates': [mondo, *buchi]},
}
uscita = os.path.join(radice, 'src', 'data', 'italiaMaschera.json')
with open(uscita, 'w') as f:
    json.dump(maschera, f, separators=(',', ':'))
punti = sum(len(b) for b in buchi)
print(f'{len(buchi)} pezzi d\'Italia, {punti} punti, {os.path.getsize(uscita) // 1024} KB → {uscita}')
