# How Wolo chooses a city for a map point

When you click a point on the web map, Wolo chooses a city grid to generate the three words. Online, a covering city identified by Google's address hierarchy takes priority over a closer sublocality. You can still choose a nearby city explicitly to generate a code for the same point on that city's grid.

## Selection order

1. Wolo reverse-geocodes the coordinates and tries Google's results tagged `locality` in response order. A result qualifies if its Google place ID maps to a registered Wolo city and that city's grid covers the point.
2. If no direct locality qualifies, Wolo checks for a locality named only inside a Google address result. It looks among nearby Wolo cities for a unique covering match, using the exact normalized locality name and the country and administrative details Google supplies.
3. If the locality evidence is missing, ambiguous, or outside the relevant grid, Wolo tries the address-derived sublocality or administrative area. It then tries the nearest covering Wolo city, followed by a regional code if no city qualifies.

The coverage check uses the city's Wolo encoding grid. Each online lookup belongs to the click that started it, so a late result from an earlier click cannot replace the newer selection. Offline encoding uses the selected city or regional fallback without a live reverse-geocoding lookup.

## Bengaluru and Vittasandra example

| Action in the local app | Observed result |
| --- | --- |
| Open `bengaluru.fan.plug.part` and click its decoded point | Wolo generates `bengaluru.fan.plug.part`. |
| Choose Vittasandra explicitly at the same point | Wolo generates `vittasandra.live.muffin.plate`. |
| Open `india.karnataka.bangalore_division.vittasandra.live.muffin.pen` | The link decodes successfully. Clicking its point defaults to `bengaluru.fan.plug.octopus`. |

The two example links decode to slightly different coordinates. For the Bengaluru point, Google returned Hebbagodi as a standalone locality and included Bengaluru as the locality inside several address results. Wolo used the nested locality evidence to select Bengaluru.

## Implementation and verification

The [shared encoder](../Root/JS/Component/Root/Code/Core.js) applies the selection order and uses the [nearby-city lookup](../Root/JS/Component/Root/City.js) to find covering candidates. The [regression tests](../tests/offline/places-search.test.js) cover locality precedence, nested matches, ambiguity, grid coverage, explicit sublocality selection, and out-of-order lookups.

The behavior was introduced in commit `8b5aebc`. All eight focused tests passed. The full offline suite passed 233 of 234 tests, with one unrelated failure in the Info panel's version styling.
