# Aggiunge a `public.palestre` le palestre della Toscana di Overture Maps,
# dove OpenStreetMap ne ha poche. Si lancia a mano, DOPO importa-palestre.mjs
# e PRIMA di palestre-completa.py:
#
#     pip install duckdb
#     python3 scratchpad/importa-palestre-overture.py
#
# Legge i file pubblici di Overture (S3, niente account) con DuckDB, scrive un
# .sql nella cartella temporanea e lo passa a `npm run db -- --file`, come lo
# script di OSM. Rilanciabile: le gia' presenti (stesso `fonte_id`) si
# aggiornano, quelle di Overture che non passano piu' i filtri si tolgono.
#
# Cosa entra: categoria gym o boxing_gym, aperte, con un nome, confidence di
# Overture >= 0.77, e il nome che non sembra una scuola o una societa' di un
# altro sport (NON_PALESTRE). Quelle a meno di ~150 m da una palestra gia' in
# tabella (di OSM) si saltano: sono quasi sempre la stessa.
# ponytail: doppioni riconosciuti solo per distanza, e il filtro sui nomi e' a
# occhio. Se rilanciando OSM dopo Overture compaiono doppioni, vanno tolti a mano.
#
# Perche' solo il nome: le pagine Facebook (quasi tutto Overture viene da Meta)
# la categoria "gym" se la scelgono da sole, e cosi' entrano una sala scommesse
# o un club di tifosi con sito, telefono e confidence 0.95. Sito e telefono li
# hanno anche le palestre vere: filtrare su quelli ne toglieva 47, tutte buone.
#
# Doppioni dentro Overture: stesso nome a meno di ~300 m ("CrossMove360" e
# "CrossMove360ASD"), dopo aver tolto ASD/SSD/SRL e la punteggiatura. Resta
# quella con la confidence piu' alta.
#
# ⚠️ Per ora solo sul progetto di SVILUPPO: se il .env punta alla produzione,
# si ferma.

import os
import subprocess
import sys
import tempfile

import duckdb

RELEASE = '2026-10-21.0'  # https://docs.overturemaps.org/release-calendar/
PRODUZIONE = 'nmnsdyutsjrxcvjvwvog'
SOGLIA = 0.77
# Overture scrive la regione come codice ISTAT ('52') o, per alcune righe,
# come nome della provincia.
PROVINCE = ['Metropolitan City of Florence', 'Province of Pisa', 'Province of Lucca',
            'Province of Livorno', 'Province of Arezzo', 'Province of Prato',
            'Province of Pistoia', 'Province of Siena', 'Province of Grosseto',
            'Province of Massa and Carrara', 'Province of Massa-Carrara']
NON_PALESTRE = (r'(?i)comunal|scuola media|scuola elementare|scuola primaria|istituto|liceo|'
                r'palazzetto|palasport|palazzo dello sport|calcio|pallanuoto|pallavolo|volley|'
                r'basket|rugby|tennis|padel|golf|oratorio|parrocchia|piscina|canottier|vela|surf|'
                r'ballo|danza|massaggi|centri estivi|caccia|scommess|goldbet|snai|tifos|'
                r'inter club|milan club|juventus club|^a\.?c\.? ')
NORMALIZZA = r'\b(a\.?s\.?d|s\.?s\.?d|a\.?r\.?l|s\.?r\.?l)\b\.?|[^a-z0-9]'

radice = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
try:
    env = open(os.path.join(radice, '.env')).read().splitlines()
except FileNotFoundError:
    env = []
if any(r.split('=', 1)[0].strip() in ('DATABASE_URL', 'PGHOST', 'PGUSER') and PRODUZIONE in r for r in env):
    sys.exit('Il .env punta al database di produzione: qui si carica solo su quello di sviluppo.')

print(f'Leggo Overture {RELEASE} (qualche minuto)…')
c = duckdb.connect()
c.sql("install httpfs; load httpfs; set s3_region='us-west-2'")
c.execute(f"""
  create table t as
  select 'overture:' || id as fonte_id, names.primary as nome,
         (bbox.ymin + bbox.ymax) / 2 as lat, (bbox.xmin + bbox.xmax) / 2 as lon,
         addresses[1].locality as comune, addresses[1].freeform as indirizzo, confidence,
         regexp_replace(lower(names.primary), ?, '', 'g') as chiave
    from read_parquet('s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*', hive_partitioning = 1)
   where bbox.xmin between 9.6 and 12.4 and bbox.ymin between 42.2 and 44.5
     and (addresses[1].region = '52' or list_contains(?, addresses[1].region))
     and taxonomy.primary in ('gym', 'boxing_gym')
     and coalesce(operating_status, 'open') = 'open'
     and names.primary is not null
     and confidence >= ?
     and not regexp_matches(names.primary, ?)
""", [NORMALIZZA, PROVINCE, SOGLIA, NON_PALESTRE])
# 0.0027° di lat e 0.0037° di lon sono ~300 m in Toscana.
righe = c.sql("""
  select fonte_id, nome, lat, lon, comune, indirizzo from t a
   where not exists (select 1 from t b
                      where b.chiave = a.chiave
                        and abs(b.lat - a.lat) < 0.0027 and abs(b.lon - a.lon) < 0.0037
                        and (b.confidence > a.confidence or (b.confidence = a.confidence and b.fonte_id > a.fonte_id)))
""").fetchall()
if not righe:
    sys.exit('Nessuna palestra da Overture: niente da caricare.')


def testo(v):
    if v is None:
        return 'null'
    if isinstance(v, float):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


valori = ',\n'.join('(' + ', '.join(testo(v) for v in r) + ')' for r in righe)
sql = f"""create temporary table v (fonte_id text, nome text, lat float8, lon float8, comune text, indirizzo text);
insert into v values
{valori};
-- Chi aveva scelto una palestra tolta resta senza (on delete set null).
-- Quelle prese dalle candidate da un utente (creata_da) restano: non sono di
-- questo import (scratchpad/importa-candidate-overture.py).
delete from public.palestre p
 where p.fonte_id like 'overture:%' and p.creata_da is null
   and not exists (select 1 from v where v.fonte_id = p.fonte_id);
insert into public.palestre (fonte_id, nome, lat, lon, comune, indirizzo)
select v.* from v
-- 0.0014° di lat e 0.0019° di lon sono ~150 m in Toscana.
where not exists (select 1 from public.palestre p
                   where p.fonte_id not like 'overture:%'
                     and abs(p.lat - v.lat) < 0.0014 and abs(p.lon - v.lon) < 0.0019)
on conflict (fonte_id) do update set
  nome = excluded.nome, lat = excluded.lat, lon = excluded.lon,
  comune = excluded.comune, indirizzo = excluded.indirizzo;"""

file = os.path.join(tempfile.gettempdir(), 'palestre-overture.sql')
open(file, 'w').write(sql)
print(f'{len(righe)} palestre da Overture, senza i doppioni fra loro (prima di quelli con OSM) → {file}')
subprocess.run(['npm', 'run', 'db', '--', '--file', file], cwd=radice, check=True)
