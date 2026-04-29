# City Name And Group Segregation

This document describes how decode separates the location part of a Wolo Code into a city name and an optional group, and how it resolves that against `CityDetail`.

## Input Shape

A decoded Wolo Code is handled as a list of lowercase words after removing the leading `\` and trailing `/`.

Generic example:

```text
city_name_first_part city_name_second_part word_one word_two word_three
```

The last three words are always treated as the Wolo position code:

```text
word_one word_two word_three
```

Everything before those three words is the city portion:

```text
city_name_first_part city_name_second_part
```

## Original Split

`decode()` in `Root/JS/Component/Root/Code/Core.js` still creates an initial split before calling city lookup:

```js
var ipGroup = words.slice(0, city_words_length-1);
var ipCity = words.slice(city_words_length-1, city_words_length)[0];
getCityFromName(ipGroup, ipCity, callback);
```

For a city portion with two words:

```text
city_name_first_part city_name_second_part
```

the initial split is:

```text
group = [city_name_first_part]
name = city_name_second_part
```

That split is only a starting point. `getCityFromName()` now re-evaluates the whole city portion so city names containing spaces are supported.

## Candidate Generation

`getCityFromName()` in `Root/JS/Component/Root/City.js` combines the initial group and name back into one ordered city-name part:

```js
var city_name_part = group.concat([name]);
```

For:

```text
city_name_first_part city_name_second_part
```

the combined value is:

```js
[
	"city_name_first_part",
	"city_name_second_part"
]
```

Lookup candidates are then generated from longest city name to shortest city name:

```text
1. group = []
   name = "city_name_first_part city_name_second_part"

2. group = ["city_name_first_part"]
   name = "city_name_second_part"
```

For three city/group words:

```text
group_part city_name_first_part city_name_second_part
```

the candidates are:

```text
1. group = []
   name = "group_part city_name_first_part city_name_second_part"

2. group = ["group_part"]
   name = "city_name_first_part city_name_second_part"

3. group = ["group_part", "city_name_first_part"]
   name = "city_name_second_part"
```

This order intentionally prefers city names with spaces before interpreting leading words as group names.

## Database Lookup

Each candidate queries `CityDetail` by exact `name_id`:

```js
ref.orderByChild('name_id').equalTo(query.name)
```

The database value is expected to be lowercase and space-preserving:

```text
name_id = "city_name_first_part city_name_second_part"
```

If no city has that `name_id`, lookup proceeds to the next candidate.

## Group Matching

When a `name_id` match exists, `matchCityByGroup()` filters matches by administrative group.

The group id is built from:

```text
country-administrative_level_1-administrative_level_2
```

Then it is lowercased, and duplicate group ids are ignored.

A match is accepted when either:

```text
group is empty
```

or:

```text
complete_group_id ends with group joined by "-"
```

Generic example:

```text
complete_group_id = "country_name-state_name-district_name"
group = ["state_name", "district_name"]
```

This accepts the city because:

```text
"country_name-state_name-district_name" ends with "state_name-district_name"
```

## Result Handling

After group matching:

```text
0 matches
```

Try the next generated candidate. If every candidate fails, continue decode with no city, which shows `INCORRECT_CITY`.

```text
1 match
```

Attach the Firebase key as `city.id` and continue decode with that city.

```text
multiple matches
```

Open the choose-city dialog so the user can choose the correct city record.

## Why Longest City Name First

Some valid city names contain spaces:

```text
city_name_first_part city_name_second_part
```

If the shortest city name were tried first, the decoder could incorrectly treat this as:

```text
group = [city_name_first_part]
name = city_name_second_part
```

Trying the longest candidate first makes the exact multi-word city `name_id` win. The group-based interpretation remains available as a fallback for cases where the leading word really is a group.

## Edge Cases

### Same Words, Different Meaning

The same words can be interpreted as either a spaced city name or a group plus shorter city name.

```text
city_name_first_part city_name_second_part word_one word_two word_three
```

Possible interpretations:

```text
1. group = []
   name = "city_name_first_part city_name_second_part"

2. group = ["city_name_first_part"]
   name = "city_name_second_part"
```

The current algorithm chooses interpretation 1 first. If both interpretations exist in the database, the spaced city name wins and the group-based city is never reached.

### Multi-Word Group With Multi-Word City

For:

```text
group_first_part group_second_part city_name_first_part city_name_second_part word_one word_two word_three
```

the algorithm will try every split from longest city name to shortest city name. A valid multi-word group is only considered after longer city-name candidates fail.

This is correct for spaced city names, but it means a database record with an unexpectedly long `name_id` could shadow the intended group-plus-city interpretation.

### Duplicate City Names

Multiple `CityDetail` records can share the same `name_id`.

If group is empty:

```text
group = []
name = "city_name"
```

all unique administrative groups can match. This can open the choose-city dialog.

If group is provided:

```text
group = ["state_name", "district_name"]
name = "city_name"
```

only matching administrative groups should remain.

### Missing Administrative Levels

`matchCityByGroup()` builds:

```text
country-administrative_level_1-administrative_level_2
```

If `administrative_level_1` or `administrative_level_2` is missing, JavaScript may produce string parts like:

```text
undefined
null
```

or extra separators. The current code only applies:

```js
.replace('--', '-')
```

That replaces only the first double dash and does not remove string values like `undefined`.

### Case And Spacing

Decode input is lowercased before lookup. Database `name_id` is expected to already be lowercase.

Extra spaces in user input are a possible risk area because `execDecode()` splits directly on a single space when a space exists. Multiple consecutive spaces can create empty words.

Generic example:

```text
city_name  word_one word_two word_three
```

can produce an empty token between `city_name` and `word_one`.

### Dot-Separated Input

If the input contains no spaces, `execDecode()` uses dot splitting.

```text
city_name.word_one.word_two.word_three
```

City names with spaces require space-separated input. Dot-separated city portions are only safe when each city/group token is intended to be a separate word.

### City Name Collides With Wolo Word

The final three tokens are always treated as Wolo position words. If a city name itself ends with words that are also valid Wolo words, the last three tokens still belong to the code, not the city.

This is expected, but it means city-name detection cannot consume words from the final three-code-word segment.

### Stale Or Incomplete Word List

Before city lookup, `decode()` validates the last three words against `wordList`.

If `wordList` has not loaded or is stale, city lookup may not run, or a valid code may be rejected before reaching `getCityFromName()`.

### Callback Side Effects

When all candidates fail, `getCityFromNameQuery()` calls:

```js
decode_continue();
```

This preserves the existing behavior, but it couples city lookup failure directly to decode UI handling. Reusing `getCityFromName()` outside decode would need care because failure does not currently call `callback(null)`.

## Possible Bug Areas To Check

### Candidate Shadowing

Check cases where both records exist:

```text
name_id = "city_name_first_part city_name_second_part"
```

and:

```text
name_id = "city_name_second_part"
group = ["city_name_first_part"]
```

The first record will always win. Confirm that this is desired for the product.

### Empty Tokens From Input Splitting

Check inputs with:

```text
leading spaces
trailing spaces
multiple spaces between words
mixed dots and spaces
```

The current parser trims the full string but does not normalize repeated internal whitespace before splitting.

### Administrative Group Normalization

Check records where one of these is missing:

```text
country
administrative_level_1
administrative_level_2
```

Also check names containing punctuation, abbreviations, or multiple words. Group comparison currently depends on `endsWith(group.join('-'))`.

### Duplicate Group Suppression

`matchCityByGroup()` tracks `complete_group_id_list` and only returns the first city for each complete group id.

If two records have the same city `name_id` and same administrative group but different Firebase ids, only one is considered. Verify this is acceptable.

### Async Decode State

City lookup is asynchronous and calls `pushLoader()` / `popLoader()` for every candidate query.

For many city/group words, this can create several sequential Firebase reads. Check loader state and stale decode sessions if the user starts another decode before all candidate queries finish.

### Database Indexing

Every candidate uses:

```js
orderByChild('name_id').equalTo(query.name)
```

Confirm Firebase rules/indexes include `name_id` under `CityDetail`; otherwise multi-candidate lookup can become slow.

### Autocomplete Assumptions

`SuggestComplete.js` has its own city-name matching path. If autocomplete suggests only the first word of a multi-word city or inserts extra spacing, decode can still fail before city lookup.

Check autocomplete with generic inputs like:

```text
city_name_first_part
city_name_first_part city_name_second_part
```

## Related Code

- `Root/JS/Component/Root/Code/Core.js`: validates the Wolo words and separates the city portion from the final three code words.
- `Root/JS/Component/Root/City.js`: generates city/group candidates, queries `CityDetail`, and applies group matching.
- `Root/JS/Component/Root/ChooseCity_by_name.js`: shows the user-facing chooser when multiple city records match.
