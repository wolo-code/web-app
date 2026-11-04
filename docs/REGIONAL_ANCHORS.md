# Named-region anchors, registry v1

## Public behavior

Supported cities keep their existing centers and codes. When a city is unavailable,
out of range, or offline encoding cannot look it up, the app can use
`Region index word word word`. The Address Panel's Code reference selector lists
overlapping regional alternatives for the selected tile. Changing that selection
re-encodes the same location against the chosen anchor. A selected regional
namespace remains preferred for subsequent regional fallbacks while applicable.

The shipped registry has **321 active regions and 160 pending candidates** from
the 481-name proposal. Missing source matches are not given invented footprints.
Active and pending names are both listed in `RegionRegistry.js`. Matching is a
first implementation from Natural Earth's named features, not a per-region survey.

## Fixed global anchors and compact regional indices

The globe has 360 rows and 720 columns of half-degree tiles. Global tile identity
is `row * 720 + column`, starting at latitude -90 and longitude -180. Each center
is `(row / 2 - 89.75, column / 2 - 179.75)`. All tiles are addressable by at least
one of the twelve broad fallback namespaces; the tests exhaustively check this.

Each region stores a sorted set of intersecting global tiles as `[start, length]`
ranges. A public index is the **one-based rank** of that tile in the frozen set.
Stored references use `region:v1:<region-key>:<index>`, fitting the existing
bookmark `city_id` field without a database migration. Resolution reconstructs
the anchor directly from the bundled registry, including offline and after reload.

Never reorder or regenerate the v1 ranges with different inputs. The builder
refuses to overwrite changed v1 output. Future geometries require an explicitly
versioned migration that retains resolution of existing v1 references. A version
number alone is insufficient for public text: if a later registry changes public
prefix/index meanings, it must also use new public names or preserve old indices.

Overlapping region/index pairs that select the same global tile use precisely
the same grid and therefore the same three words. A bare three-word code still
requires a selected city or regional anchor context.

## Existing codec and polar adaptation

The 15-bit indices on each axis, 30-bit packing, 1,024-word dictionary, and existing
`encode__` / `decode__` routines are reused without changes. Legacy city origins
are unchanged and have a regression fixture.

Regional origins use the inherited latitude scale at the latitude of the grid
origin for both the longitude origin offset and the longitude step. This avoids
using a center-latitude offset with an origin-latitude step. Southern regional
grids reflect latitude before calling the codec so the origin does not move past
the South Pole. This orientation is fixed by v1 and shared by all aliases of a tile.
Longitude is unwrapped relative to the anchor on encode and wrapped to [-180,180)
on decode. Pole selection canonicalizes longitude to zero; exact pole encoding
uses the anchor meridian since all meridians coincide there. Quantization overshoot
of at most 0.00002 degrees at a pole is clamped; larger invalid latitudes are rejected.

The target remains approximately two-metre spacing. Tests check axis errors at
tile corners in every latitude band against a roughly one-metre rounding bound;
this is not a claim of a newly surveyed or exact ellipsoidal metre grid.

## Geography provenance and coverage conventions

Land and marine footprints come from Natural Earth 10m physical-label polygons:

- [Physical labels and boundary limitations](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/)
- [Land-region GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_regions_polys.geojson)
- [Marine-region GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_marine_polys.geojson)
- [Natural Earth public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/)

The bundled registry records each input file's SHA-256 digest. Feature NAME and
NAME_EN matches, plus explicit aliases in the builder, select source geometries.
Every intersecting half-degree tile is accepted in full, including the part outside
the original polygon. These are frozen addressing footprints, not territorial
boundaries or precise coastlines. Thin straits and small islands can select anchors
whose centers lie outside the feature itself.

Atlantic combines North and South Atlantic; Pacific likewise. Oceania combines
Australia, Melanesia, Micronesia, Polynesia, New Zealand, and New Guinea. Arctic also
includes the full cap from 66.5 degrees north; Southern Ocean includes the cap south
of 60 degrees south, deliberately overlapping Antarctica.

Source fallback polygons leave 19,210 of the 259,200 tiles unassigned. These residual
tiles are assigned to Arctic (north of 66.5), Southern Ocean (south of -60), or an
ocean longitude sector: Atlantic [-70,20), Indian Ocean [20,147), Pacific otherwise.
This is a Wolo coverage convention, including source gaps and omitted small islands;
it is not an assertion that every residual location is literally ocean water.

Reproduction, with local source files matching the recorded digests, numpy, and
shapely installed:

```text
python scripts/build-region-registry.py --land <land-geojson> --marine <marine-geojson> --candidates <Region-prefixes.json>
```

No new runtime package, third-party lookup, quadtree, or backend region endpoint
is required. The registry is embedded in the ordinary app bundle and consequently
uses the existing service-worker caching pipeline.

## City proposals and email details

Propose a city is available from the full Info view and Address Panel. City name
is required; country/region and the selected map location are optional. The form
captures its location when opened and never borrows a later map selection.

The existing `/CityRequest/<push-id>` database path receives `city_name`, `country`,
optional `lat_lng`, matching `gp_id` and address when known, `source`, server time,
and `processed: false`. A missing location is supported in the admin console; the
reviewer chooses a center before adding the city. This flow proposes a city and
does not automatically create a new city record.

Only after Firebase acknowledges the write does the app display the request ID and
open the user's email composer to the existing public support contact,
`support@wolo.codes`. The subject is `Wolo add city request <push-id>`. The editable
body includes the submitted fields and space for additional information. An Add
details by email link remains available if automatic opening is blocked or no
default email handler is configured. The app never sends that user email itself.

Duplicate clicks while submitting are ignored. Rejected writes restore the form
and never open a draft or announce success. Offline submission requests a network
connection; it does not invent an acknowledged request ID. The existing backend
admin notification also includes the ID in its subject, escapes submitted HTML,
and returns its send promise so the function can complete reliably.

Source changes require app baking, Hosting deployment, and deployment of the
changed `emailOnCitySubmit` function to reach production. No deployment or real
city-request submission is performed by the offline tests or UI preview.
