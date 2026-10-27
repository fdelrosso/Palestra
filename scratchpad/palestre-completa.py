# Completa `public.palestre` dalle coordinate di ogni palestra. Si lancia a
# mano, dopo gli import (importa-palestre.mjs, importa-palestre-overture.py):
#
#     pip install duckdb
#     python3 scratchpad/palestre-completa.py
#
# 1. Comune, provincia (sigla) e regione, dai confini ISTAT. Le fonti il comune
#    lo danno a meta' e la provincia quasi mai; i confini invece valgono uguale
#    per tutte. Il comune che c'era lo sovrascrive.
#    I confini sono i "generalizzati" (~10MB, CC BY: va citato ISTAT), scaricati
#    nella cartella temporanea. Generalizzati vuol dire coste un po' tagliate:
#    una palestra sul mare che cade fuori da ogni comune prende il comune piu'
#    vicino, se e' entro 3 km. Oltre, resta com'era.
# 2. L'indirizzo, SOLO dove manca: la via del numero civico piu' vicino entro
#    40 m, dagli indirizzi di Overture (per l'Italia una sola fonte,
#    "it/countrywide", CC BY 4.0). Solo la via, senza numero: provato su 600
#    palestre OSM che l'indirizzo l'avevano, la via era giusta 8 volte su 10,
#    il numero 4 su 10 (quello accanto, quello di fronte).
#
# Rilanciabile. Legge le palestre con DuckDB direttamente dal database
# (DATABASE_URL e PGSSLROOTCERT del .env), scrive con `npm run db -- --file`
# come gli import.
#
# ⚠️ Per ora solo sul progetto di SVILUPPO: se il .env punta alla produzione,
# si ferma.

import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

import duckdb

ANNO = '2026'
ISTAT = f'https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/{ANNO}/Limiti0101{ANNO}_g.zip'
OVERTURE = '2026-10-21.0'  # https://docs.overturemaps.org/release-calendar/
PRODUZIONE = 'nmnsdyutsjrxcvjvwvog'
# Le parole che in un nome di via restano minuscole: "Via della Scala".
MINUSCOLE = {'a', 'ai', 'al', 'alla', 'alle', 'allo', 'agli', 'da', 'dai', 'dal', 'dalla', 'dei',
             'degli', 'del', 'della', 'delle', 'dello', 'di', 'e', 'in', 'sul', 'sulla',
             "de'", 'dell', 'dall', 'nell', 'sull', 'all', 'l', 'd'}

radice = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
try:
    for r in open(os.path.join(radice, '.env')).read().splitlines():
        if '=' in r and not r.lstrip().startswith('#'):
            k, v = r.split('=', 1)
            env[k.strip()] = v.strip().strip('"\'')
except FileNotFoundError:
    pass
url = env.get('DATABASE_URL')
if not url:
    sys.exit('Manca DATABASE_URL nel .env.')
if PRODUZIONE in url:
    sys.exit('Il .env punta al database di produzione: qui si lavora solo su quello di sviluppo.')
if env.get('PGSSLROOTCERT'):
    url += ('&' if '?' in url else '?') + f"sslmode=verify-full&sslrootcert={env['PGSSLROOTCERT']}"

cartella = os.path.join(tempfile.gettempdir(), f'istat-{ANNO}')
if not os.path.isdir(cartella):
    print('Scarico i confini ISTAT…')
    zip_istat, _ = urllib.request.urlretrieve(ISTAT)
    zipfile.ZipFile(zip_istat).extractall(cartella)
shp = lambda nome: os.path.join(cartella, f'{nome}0101{ANNO}_g', f'{nome}0101{ANNO}_g_WGS84.shp')

c = duckdb.connect()
c.sql("install spatial; load spatial; install postgres; load postgres; install httpfs; load httpfs; set s3_region='us-west-2'")
c.execute("attach ? as db (type postgres, read_only)", [url])
c.sql('create table palestre as select id, lat, lon, indirizzo from db.public.palestre')

# --- 1. comune, provincia, regione ------------------------------------------
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
  select id, st_transform(st_point(lon, lat), 'EPSG:4326', 'EPSG:32632', always_xy := true) as punto
    from palestre
""")
c.sql("""
  create table esito as
  select p.id, c.comune, c.provincia, c.regione
    from punti p join comuni c on st_contains(c.geom, p.punto)
""")
c.sql("""
  insert into esito
  select distinct on (p.id) p.id, c.comune, c.provincia, c.regione
    from punti p join comuni c on st_dwithin(c.geom, p.punto, 3000)
   where p.id not in (select id from esito)
   order by p.id, st_distance(c.geom, p.punto)
""")
luoghi = c.sql('select id, comune, provincia, regione from esito').fetchall()

# --- 2. indirizzo dove manca --------------------------------------------------
# Celle di ~55 m: ogni palestra cerca nella sua e nelle 8 intorno, cosi' il
# join coi civici di tutta Italia (decine di milioni) e' un join per uguaglianza.
print(f'Cerco i civici su Overture {OVERTURE} (qualche minuto)…')
civici = c.sql(f"""
  with celle as (
    select id, lat, lon, floor(lat / 0.0005) + dy as cy, floor(lon / 0.0007) + dx as cx
      from palestre, range(-1, 2) t1(dy), range(-1, 2) t2(dx)
     where indirizzo is null
  ), vicini as (
    select g.id, a.street, a.number,
           sqrt(power((a.lon - g.lon) * 111320 * cos(radians(g.lat)), 2) + power((a.lat - g.lat) * 110540, 2)) as metri
      from (select street, number, (bbox.ymin + bbox.ymax) / 2 as lat, (bbox.xmin + bbox.xmax) / 2 as lon
              from read_parquet('s3://overturemaps-us-west-2/release/{OVERTURE}/theme=addresses/type=address/*', hive_partitioning = 1)
             where country = 'IT' and street is not null and number is not null
               and bbox.xmin between 6 and 19 and bbox.ymin between 35 and 48) a
      join celle g on floor(a.lat / 0.0005) = g.cy and floor(a.lon / 0.0007) = g.cx
  )
  select distinct on (id) id, street from vicini where metri <= 40 order by id, metri
""").fetchall()
senza = c.sql('select count(*) from palestre where indirizzo is null').fetchall()[0][0]


# Il registro scrive gli accenti con l'apostrofo: "LOCALITA'", "GIOSUE'".
# Tranne "DE'", che e' "dei" accorciato: "Via de' Carracci".
ACCENTATE = {'a': 'à', 'e': 'è', 'i': 'ì', 'o': 'ò', 'u': 'ù'}


def parola(p, prima):
    if not prima and p in MINUSCOLE:
        return p
    # "dell'arte" → "dell'Arte", "sant'anna" → "Sant'Anna".
    if "'" in p[:-1]:
        a, b = p.split("'", 1)
        return parola(a, prima) + "'" + parola(b, True)
    return p[:1].upper() + p[1:]


def via(s):
    s = re.sub(r"(?<!\bd)([aeiou])'(?=\s|$)", lambda m: ACCENTATE[m[1]], s.lower())
    return ' '.join(parola(p, i == 0) for i, p in enumerate(s.split()))


testo = lambda v: "'" + str(v).replace("'", "''") + "'"
sql = f"""update public.palestre p
   set comune = v.comune, provincia = v.provincia, regione = v.regione
  from (values
{',\n'.join(f'({i}, {testo(co)}, {testo(pr)}, {testo(re)})' for i, co, pr, re in luoghi)}
) as v (id, comune, provincia, regione)
 where p.id = v.id;
"""
if civici:
    sql += f"""update public.palestre p
   set indirizzo = v.indirizzo
  from (values
{',\n'.join(f'({i}, {testo(via(st))})' for i, st in civici)}
) as v (id, indirizzo)
 where p.id = v.id and p.indirizzo is null;
"""

file = os.path.join(tempfile.gettempdir(), 'palestre-completa.sql')
open(file, 'w').write(sql)
print(f'{len(luoghi)} palestre su {len(c.sql("from palestre").fetchall())} con il comune, '
      f'{len(civici)} indirizzi trovati su {senza} che mancavano → {file}')
subprocess.run(['npm', 'run', 'db', '--', '--file', file], cwd=radice, check=True)
