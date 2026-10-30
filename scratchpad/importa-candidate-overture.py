# Carica `public.palestre_candidate`: i luoghi di Overture Maps in Italia dove
# ci si allena, da cui chi non trova la sua palestra la sceglie ("Aggiungi" in
# Cerca → Palestre; migrazione 20261028120000_palestre_aggiunte.sql). Si lancia
# a mano, quando si vuole:
#
#     pip install duckdb
#     python3 scratchpad/importa-candidate-overture.py
#
# Rispetto a importa-palestre-overture.py (che mette sulla mappa la Toscana
# con filtri stretti) qui entra quasi tutto: categorie piu' larghe, nessuna
# soglia di confidence, nessun filtro sui nomi. Va bene perche' le candidate
# non si vedono: compaiono solo cercandole per nome, e a sceglierne una e' una
# persona che sa qual e' la sua.
#
# Fuori: le chiuse, quelle senza nome, e quelle che non cadono in un comune
# italiano (i confini ISTAT, come in palestre-completa.py: dentro, o entro
# 3 km per la costa) — cosi' via anche Svizzera, Slovenia, San Marino.
# Comune, provincia e regione vengono dagli stessi confini.
#
# Rilanciabile: si rifa' la tabella da capo (le candidate gia' scelte stanno in
# `palestre`, con lo stesso fonte_id, e cerca_candidate le salta).
#
# ⚠️ Per ora solo sul progetto di SVILUPPO: se il .env punta alla produzione,
# si ferma.

import os
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

import duckdb

RELEASE = '2026-10-21.0'  # https://docs.overturemaps.org/release-calendar/
ANNO = '2026'
ISTAT = f'https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/{ANNO}/Limiti0101{ANNO}_g.zip'
PRODUZIONE = 'nmnsdyutsjrxcvjvwvog'
# Dove ci si allena. Fuori yoga, personal trainer e negozi: in Italia sono
# ~8.000 righe che con una palestra non c'entrano.
CATEGORIE = ['gym', 'sport_or_fitness_facility', 'martial_arts_club', 'pilates_studio',
             'gymnastics_center', 'gymnastics_club', 'boxing_class', 'boxing_gym',
             'rock_climbing_gym', 'karate_club', 'kickboxing_club', 'chinese_martial_arts_club']

radice = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
try:
    env = open(os.path.join(radice, '.env')).read().splitlines()
except FileNotFoundError:
    env = []
if any(r.split('=', 1)[0].strip() in ('DATABASE_URL', 'PGHOST', 'PGUSER') and PRODUZIONE in r for r in env):
    sys.exit('Il .env punta al database di produzione: qui si carica solo su quello di sviluppo.')

cartella = os.path.join(tempfile.gettempdir(), f'istat-{ANNO}')
if not os.path.isdir(cartella):
    print('Scarico i confini ISTAT…')
    zip_istat, _ = urllib.request.urlretrieve(ISTAT)
    zipfile.ZipFile(zip_istat).extractall(cartella)
shp = lambda nome: os.path.join(cartella, f'{nome}0101{ANNO}_g', f'{nome}0101{ANNO}_g_WGS84.shp')

print(f'Leggo Overture {RELEASE} (qualche minuto)…')
c = duckdb.connect()
c.sql("install spatial; load spatial; install httpfs; load httpfs; set s3_region='us-west-2'")
c.execute(f"""
  create table t as
  select 'overture:' || id as fonte_id, names.primary as nome, taxonomy.primary as categoria,
         (bbox.ymin + bbox.ymax) / 2 as lat, (bbox.xmin + bbox.xmax) / 2 as lon,
         addresses[1].freeform as indirizzo
    from read_parquet('s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*', hive_partitioning = 1)
   where bbox.xmin between 6.6 and 18.6 and bbox.ymin between 35.4 and 47.1
     and list_contains(?, taxonomy.primary)
     and coalesce(operating_status, 'open') = 'open'
     and nullif(trim(names.primary), '') is not null
""", [CATEGORIE])

# Gli shapefile ISTAT sono in UTM 32N (EPSG:32632), nonostante il nome.
c.execute("""
  create table comuni as
  select c.COMUNE as comune, p.SIGLA as provincia, r.DEN_REG as regione, c.geom
    from st_read(?) c
    join st_read(?) p using (COD_UTS)
    join st_read(?) r on r.COD_REG = c.COD_REG
""", [shp('Com'), shp('ProvCM'), shp('Reg')])
c.sql("""
  create table punti as
  select fonte_id, st_transform(st_point(lon, lat), 'EPSG:4326', 'EPSG:32632', always_xy := true) as punto from t
""")
c.sql("""
  create table luogo as
  select p.fonte_id, c.comune, c.provincia, c.regione
    from punti p join comuni c on st_contains(c.geom, p.punto)
""")
c.sql("""
  insert into luogo
  select distinct on (p.fonte_id) p.fonte_id, c.comune, c.provincia, c.regione
    from punti p join comuni c on st_dwithin(c.geom, p.punto, 3000)
   where p.fonte_id not in (select fonte_id from luogo)
   order by p.fonte_id, st_distance(c.geom, p.punto)
""")
righe = c.sql("""
  select distinct on (t.fonte_id) t.fonte_id, t.nome, t.categoria, t.lat, t.lon, l.comune, l.provincia, l.regione, t.indirizzo
    from t join luogo l using (fonte_id)
""").fetchall()
if not righe:
    sys.exit('Nessuna candidata da Overture: niente da caricare.')


def testo(v):
    if v is None:
        return 'null'
    if isinstance(v, float):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


valori = ',\n'.join('(' + ', '.join(testo(v) for v in r) + ')' for r in righe)
sql = f"""truncate public.palestre_candidate;
insert into public.palestre_candidate (fonte_id, nome, categoria, lat, lon, comune, provincia, regione, indirizzo) values
{valori};"""

file = os.path.join(tempfile.gettempdir(), 'palestre-candidate.sql')
open(file, 'w').write(sql)
fuori = c.sql('select count(*) from t').fetchall()[0][0] - len(righe)
print(f'{len(righe)} candidate da Overture ({fuori} fuori dai comuni italiani, tolte) → {file}')
subprocess.run(['npm', 'run', 'db', '--', '--file', file], cwd=radice, check=True)
