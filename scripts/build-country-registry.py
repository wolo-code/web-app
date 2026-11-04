"""Append country namespaces without changing the published physical registry.

Requires numpy and shapely. Supply Natural Earth's local admin-0 countries GeoJSON.
The generated v1 registry is immutable, just like the physical region registry.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import shape
from shapely.strtree import STRtree


def normalized(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 -]', ' ', value.replace("'", '')).replace('-', ' ')).strip()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--countries', required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
existing = (root / 'Root/JS/Component/Root/RegionRegistry.js').read_text(encoding='utf-8')
physical = json.loads(existing.split(' = ', 1)[1].rstrip(';\n'))
used_names = {normalized(r['name']) for r in physical['regions']}
raw = args.countries.read_bytes()
ids = np.arange(360 * 720)
west, south = ids % 720 / 2 - 180, ids // 720 / 2 - 90
tree = STRtree(shapely.box(west, south, west + .5, south + .5))
regions = []
for feature in sorted(json.loads(raw)['features'], key=lambda f: f['properties']['ADM0_A3']):
    props = feature['properties']
    code = props['ADM0_A3']
    if code == 'ATA':  # Antarctica already has its own global fallback.
        continue
    original = props.get('NAME_EN') or props['ADMIN']
    name = original
    if normalized(name) in used_names:
        name += ' Region'
    assert normalized(name) not in used_names, name
    used_names.add(normalized(name))
    members = sorted(int(i) for i in tree.query(shapely.make_valid(shape(feature['geometry'])), predicate='intersects'))
    assert members, name
    ranges = []
    for cell in members:
        if ranges and cell == sum(ranges[-1]):
            ranges[-1][1] += 1
        else:
            ranges.append([cell, 1])
    regions.append({'key': 'country-' + code.lower(), 'name': name, 'country_name': original,
                    'country_code': code, 'fallback': False, 'aliases': [],
                    'count': len(members), 'ranges': ranges})

# Only install aliases that are globally unambiguous, including old prefixes.
for region in regions:
    alias = region['country_code']
    if normalized(alias) not in used_names:
        region['aliases'].append(alias)
        used_names.add(normalized(alias))

payload = {'version': 1, 'step': .5, 'source': {
    'file': args.countries.name, 'sha256': hashlib.sha256(raw).hexdigest(),
    'url': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'},
    'regions': regions}
output = '// Frozen country namespaces; existing physical-region indices are unchanged.\nvar WOLO_COUNTRY_REGISTRY = ' + json.dumps(payload, separators=(',', ':'), ensure_ascii=True) + ';\n'
target = root / 'Root/JS/Component/Root/CountryRegistry.js'
if target.exists() and target.read_text(encoding='utf-8') != output:
    raise SystemExit('Refusing to change published country indices. Preserve old namespaces explicitly.')
target.write_text(output, encoding='utf-8')
print(json.dumps({'countries_and_territories': len(regions), 'bytes': len(output),
                  'qualified_names': [r['name'] for r in regions if r['name'] != r['country_name']]}, indent=2))
