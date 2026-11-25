const WOLO_PRECISION_GRID_PLACES = 15;
const WOLO_PRECISION_GRID_SCALE = 10n ** BigInt(WOLO_PRECISION_GRID_PLACES);

function scaleWoloDecimal(decimal, places) {
	const negative = decimal.startsWith('-');
	const [whole, fraction = ''] = decimal.replace(/^[+-]/, '').split('.');
	const scaled = BigInt(whole + fraction.padEnd(places, '0'));
	return negative ? -scaled : scaled;
}

function formatWoloDecimal(integer, places) {
	const digits = String(integer < 0n ? -integer : integer).padStart(places + 1, '0');
	return (integer < 0n ? '-' : '') +
		(places ? digits.slice(0, -places) + '.' + digits.slice(-places) : digits);
}

function parseWoloDecimalPosition(text) {
	const match = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/.exec(text);
	if(!match)
		return null;
	const decimals = match.slice(1);
	const places = Math.max(...decimals.map(decimal => (decimal.split('.')[1] || '').length));
	const scale = 10n ** BigInt(places);
	const [lat, lng] = decimals.map(decimal => scaleWoloDecimal(decimal, places));
	if(lat < -90n * scale || lat > 90n * scale || lng < -180n * scale || lng > 180n * scale)
		return null;
	return {lat: Number(decimals[0]), lng: Number(decimals[1]), precisionDecimals: decimals};
}

function splitPrecisionWoloText(text) {
	const parts = /^(.+?\s+[a-z]+\s+[a-z]+)\.([a-z]+(?:\s+[a-z]+)*)$/i.exec(text);
	return parts ? {base: parts[1], words: parts[2].toLowerCase().split(/\s+/)} : null;
}

function precisionWoloText(baseWords, precisionWords) {
	return baseWords.join(' ') + (precisionWords && precisionWords.length ? '.' + precisionWords.join(' ') : '');
}

function woloPrecisionField(places) {
	const words = [places % 512];
	for(let leading = Math.floor(places / 512); leading; leading = Math.floor(leading / 512))
		words.unshift(512 + leading % 512);
	return words;
}

function woloPrecisionCell(begin, indices, places) {
	const scales = [lat_span_half(begin.lat) * 2, lng_span_half(begin.lat) * 2];
	if(![begin.lat, begin.lng, ...scales].every(Number.isFinite) || scales.some(step => step <= 0 || step >= 360) ||
		Math.abs(begin.lat) >= 360 || Math.abs(begin.lng) >= 360)
		return null;
	const origins = [begin.lat, begin.lng];
	const axes = [indices[0] * 32 + (indices[2] >> 5), indices[1] * 32 + (indices[2] & 31)];
	const scale = 10n ** BigInt(places);
	const divisor = 2n * WOLO_PRECISION_GRID_SCALE;
	const ceil = value => value / divisor + (value % divisor > 0n ? 1n : 0n);
	const bounds = axes.map((axis, j) => {
		const origin = scaleWoloDecimal(origins[j].toFixed(12), WOLO_PRECISION_GRID_PLACES);
		const step = scaleWoloDecimal(scales[j].toFixed(WOLO_PRECISION_GRID_PLACES), WOLO_PRECISION_GRID_PLACES);
		const lower = ceil(scale * (2n * origin + BigInt(2 * axis - 1) * step));
		const upper = ceil(scale * (2n * origin + BigInt(2 * axis + 1) * step));
		return {lower, count: upper - lower};
	});
	const size = bounds[0].count * bounds[1].count;
	// A cell with one possible pair uses zero rank words.
	const width = size > 1n ? Math.ceil((size - 1n).toString(2).length / 10) : 0;
	return size ? {bounds, size, width, scale} : null;
}

function wrapScaledWoloLongitude(value, scale) {
	const half = 180n * scale;
	const turn = 2n * half;
	return ((value + half) % turn + turn) % turn - half;
}

function precisionWoloGridPair(city, lat, lng, scale, places, inverse) {
	const region = isRegionAnchor(city) ? regionAnchorFromId(city.id) : null;
	if(!region)
		return [lat, lng];
	const north = region.center.lat < 0 ? -lat : lat;
	if(north === -90n * scale || north === 90n * scale || (!inverse && lng === 180n * scale))
		return null;
	if(inverse)
		return [north, wrapScaledWoloLongitude(lng, scale)];
	// Tile centers have quarter degrees even when the input has fewer places.
	const factor = 10n ** BigInt(Math.max(0, 2 - places));
	const center = scaleWoloDecimal(region.center.lng.toFixed(2), Math.max(2, places));
	return [north, (center + wrapScaledWoloLongitude(lng * factor - center, scale * factor)) / factor];
}

function encodePrecisionWolo(city, begin, indices, decimals) {
	const places = Math.max(...decimals.map(decimal => (decimal.split('.')[1] || '').length));
	const cell = woloPrecisionCell(begin, indices, places);
	if(!cell)
		return null;
	const [lat, lng] = decimals.map(decimal => scaleWoloDecimal(decimal, places));
	const pair = precisionWoloGridPair(city, lat, lng, cell.scale, places, false);
	if(!pair)
		return null;
	const offsets = pair.map((coordinate, j) => coordinate - cell.bounds[j].lower);
	if(offsets.some((offset, j) => offset < 0n || offset >= cell.bounds[j].count))
		return null;
	let rank = offsets[0] * cell.bounds[1].count + offsets[1];
	const payload = Array(cell.width);
	for(let i = payload.length - 1; i >= 0; i--) {
		payload[i] = Number(rank % 1024n);
		rank /= 1024n;
	}
	return woloPrecisionField(places).concat(payload).map(index => wordList.getWord(index));
}

function decodePrecisionWolo(city, begin, indices, words) {
	const digits = words.map(word => wordList.indexOf(word));
	const end = digits.findIndex(digit => digit >= 0 && digit < 512);
	if(end < 0 || digits.some(digit => digit < 0) || (end > 0 && digits[0] === 512))
		return null;
	const payload = digits.slice(end + 1);
	let places = 0;
	for(const digit of digits.slice(0, end + 1)) {
		places = places * 512 + digit % 512;
		// Each nonzero grid step is at least 10^-15 degrees.
		if(places > WOLO_PRECISION_GRID_PLACES + 2 * payload.length)
			return null;
	}
	const cell = woloPrecisionCell(begin, indices, places);
	if(!cell || payload.length !== cell.width)
		return null;
	const rank = payload.reduce((value, digit) => value * 1024n + BigInt(digit), 0n);
	if(rank >= cell.size)
		return null;
	const gridLat = cell.bounds[0].lower + rank / cell.bounds[1].count;
	const gridLng = cell.bounds[1].lower + rank % cell.bounds[1].count;
	const pair = precisionWoloGridPair(city, gridLat, gridLng, cell.scale, places, true);
	if(!pair)
		return null;
	const decimals = pair.map(value => formatWoloDecimal(value, places));
	const position = parseWoloDecimalPosition(decimals.join(','));
	if(!position)
		return null;
	const gridPosition = isRegionAnchor(city) ? regionGridPosition(city, position) : position;
	const checked = gridPosition && encode__(begin, gridPosition);
	const forward = precisionWoloGridPair(city, pair[0], pair[1], cell.scale, places, false);
	if(!checked || indices.some((index, j) => index !== checked[j]) ||
		!forward || forward[0] !== gridLat || forward[1] !== gridLng)
		return null;
	position.precisionWords = digits.map(index => wordList.getWord(index));
	return position;
}
