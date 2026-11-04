"""Build the frozen v1 region/anchor registry from Natural Earth GeoJSON.

Requires numpy and shapely. Input files are deliberately supplied locally: this
script never silently downloads a newer boundary dataset or renumbers a release.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import shapely
from shapely.strtree import STRtree


def normalize(value):
    value = unicodedata.normalize('NFKD', value or '')
    return re.sub(r'[^a-z0-9]', '', value.encode('ascii', 'ignore').decode().lower())


def ranges(ids):
    result = []
    for value in sorted(set(ids)):
        value = int(value)
        if result and value == result[-1][0] + result[-1][1]:
            result[-1][1] += 1
        else:
            result.append([value, 1])
    return result


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--land', type=Path, required=True)
parser.add_argument('--marine', type=Path, required=True)
parser.add_argument('--candidates', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
sources = []
features = {}
for source in [args.land, args.marine]:
    raw = source.read_bytes()
    sources.append({'file': source.name, 'sha256': hashlib.sha256(raw).hexdigest(),
                    'url': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/' + source.name})
    for feature in json.loads(raw)['features']:
        props = {k.lower(): v for k, v in feature['properties'].items()}
        geometry = shapely.make_valid(shapely.geometry.shape(feature['geometry']))
        for name in set([props.get('name'), props.get('name_en')]):
            if name:
                features.setdefault(normalize(name), []).append(geometry)

aliases = {
    'atlantic': ['North Atlantic Ocean', 'South Atlantic Ocean'],
    'pacific': ['North Pacific Ocean', 'South Pacific Ocean'],
    'arctic': ['Arctic Ocean'],
    'oceania': ['Australia', 'Melanesia', 'Micronesia', 'Polynesia', 'New Zealand', 'New Guinea'],
    'north-atlantic': ['North Atlantic Ocean'], 'south-atlantic': ['South Atlantic Ocean'],
    'north-pacific': ['North Pacific Ocean'], 'south-pacific': ['South Pacific Ocean'],
    'caribbean': ['Caribbean Sea'], 'sargasso': ['Sargasso Sea'], 'baltic': ['Baltic Sea'],
    'mediterranean': ['Mediterranean Sea'], 'adriatic': ['Adriatic Sea'], 'aegean': ['Aegean Sea'],
    'gobi': ['Gobi Desert'], 'himalaya': ['Himalayas'], 'caucasus': ['Caucasus Mountains'],
    'rocky-mountains': ['Rocky Mountains'], 'iberia': ['Iberian Peninsula'],
    'caspian': ['Caspian Sea'], 'aral': ['Aral Sea'],
    'hawaii': ['Hawaii', 'Hawaiian Islands'], 'tian-shan': ['Tian Shan'],
    'amazon-basin': ['Amazon basin'], 'congo-basin': ['Congo basin'],
}

# One half-degree tile per global anchor, numbered south-to-north, west-to-east.
ids = np.arange(360 * 720)
west = ids % 720 / 2 - 180
south = ids // 720 / 2 - 90
tiles = shapely.box(west, south, west + .5, south + .5)
tree = STRtree(tiles)
catalog = json.loads(args.candidates.read_text(encoding='utf-8'))['candidates']
active, pending = [], []
for candidate in catalog:
    key, name = candidate['candidate_key'], candidate['prefix']
    geometries = []
    for term in [name] + aliases.get(key, []):
        geometries.extend(features.get(normalize(term), []))
    members = set()
    for geometry in geometries:
        members.update(int(i) for i in tree.query(geometry, predicate='intersects'))
    if key == 'arctic':
        members.update(ids[south >= 66.5].tolist())
    if key == 'southern-ocean':
        members.update(ids[south < -60].tolist())
    if not members:
        pending.append({'key': key, 'name': name})
        continue
    active.append({'key': key, 'name': name, 'fallback': candidate['group'] == 'Global fallbacks',
                   'aliases': [], '_members': members})

by_key = {r['key']: r for r in active}
assert all(c['candidate_key'] in by_key for c in catalog if c['group'] == 'Global fallbacks')
covered = set().union(*(r['_members'] for r in active if r['fallback']))
residual = set(ids.tolist()) - covered
for cell in residual:
    lat, lng = south[cell] + .25, west[cell] + .25
    key = ('arctic' if lat >= 66.5 else 'southern-ocean' if lat < -60 else
           'atlantic' if -70 <= lng < 20 else 'indian-ocean' if 20 <= lng < 147 else 'pacific')
    by_key[key]['_members'].add(cell)

for region in active:
    members = region.pop('_members')
    region['count'] = len(members)
    region['ranges'] = ranges(members)

payload = {'version': 1, 'step': .5, 'sources': sources,
           'residual_fallback_tiles': len(residual), 'regions': active, 'pending': pending}
output = '// Frozen Wolo region registry v1. See docs/REGIONAL_ANCHORS.md.\nvar WOLO_REGION_REGISTRY = ' + json.dumps(payload, separators=(',', ':'), ensure_ascii=True) + ';\n'
target = root / 'Root/JS/Component/Root/RegionRegistry.js'
if target.exists() and target.read_text(encoding='utf-8') != output:
    raise SystemExit('Refusing to renumber existing v1 mappings. Create an explicit new registry version.')
target.write_text(output, encoding='utf-8')
print(json.dumps({'active': len(active), 'pending': len(pending), 'bytes': len(output),
                  'residual_fallback_tiles': len(residual), 'sources': sources}, indent=2))
