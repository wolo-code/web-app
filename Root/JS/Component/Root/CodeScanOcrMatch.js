/**
 * Match noisy on-device OCR text to a valid Wolo Code using the known word list.
 */
(function(global) {
	'use strict';

	function normalizeOcrText(text) {
		if(!text)
			return '';
		return String(text)
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function levenshteinDistance(a, b) {
		var i;
		var j;
		var cost;
		var prev;
		var curr;
		if(a === b)
			return 0;
		if(!a)
			return b.length;
		if(!b)
			return a.length;
		prev = new Array(b.length + 1);
		curr = new Array(b.length + 1);
		for(j = 0; j <= b.length; j++)
			prev[j] = j;
		for(i = 1; i <= a.length; i++) {
			curr[0] = i;
			for(j = 1; j <= b.length; j++) {
				cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
				curr[j] = Math.min(
					curr[j - 1] + 1,
					prev[j] + 1,
					prev[j - 1] + cost
				);
			}
			prev = curr.slice();
		}
		return prev[b.length];
	}

	function fuzzyMatchWord(token, includesFn, canonicalWords) {
		var maxDist;
		var best = null;
		var bestDist = 99;
		var i;
		var word;
		var dist;
		if(!token || token.length < 2)
			return null;
		if(includesFn(token))
			return token;
		maxDist = token.length <= 4 ? 1 : 2;
		for(i = 0; i < canonicalWords.length; i++) {
			word = canonicalWords[i];
			if(Math.abs(word.length - token.length) > maxDist)
				continue;
			dist = levenshteinDistance(token, word);
			if(dist <= maxDist && dist < bestDist) {
				bestDist = dist;
				best = word;
			}
		}
		return best;
	}

	function correctTokens(tokens, includesFn, canonicalWords) {
		var corrected = [];
		var i;
		var match;
		for(i = 0; i < tokens.length; i++) {
			match = fuzzyMatchWord(tokens[i], includesFn, canonicalWords);
			corrected.push(match || tokens[i]);
		}
		return corrected;
	}

	function findWoloCodeInTokens(tokens, includesFn) {
		var i;
		var w1;
		var w2;
		var w3;
		var cityWords;
		var match = null;
		if(!tokens || tokens.length < 3)
			return null;
		for(i = 0; i <= tokens.length - 3; i++) {
			w1 = tokens[i];
			w2 = tokens[i + 1];
			w3 = tokens[i + 2];
			if(!includesFn(w1) || !includesFn(w2) || !includesFn(w3))
				continue;
			cityWords = tokens.slice(0, i);
			match = {
				words: cityWords.concat([w1, w2, w3]),
				code: cityWords.concat([w1, w2, w3]).join(' '),
				cityWordCount: cityWords.length,
				index: i
			};
		}
		return match;
	}

	function matchOcrTextToWoloCode(text, includesFn, canonicalWords) {
		var normalized = normalizeOcrText(text);
		var tokens;
		var corrected;
		if(!normalized)
			return null;
		tokens = normalized.split(' ').filter(Boolean);
		if(!tokens.length)
			return null;
		corrected = correctTokens(tokens, includesFn, canonicalWords || []);
		return findWoloCodeInTokens(corrected, includesFn);
	}

	function splitMatchForReview(match) {
		var cityCount;
		var cityWords;
		var woloWords;
		if(!match || !match.words || match.words.length < 3)
			return {city: '', words: ['', '', '']};
		cityCount = typeof match.cityWordCount == 'number' ? match.cityWordCount : 0;
		cityWords = match.words.slice(0, cityCount);
		woloWords = match.words.slice(cityCount);
		return {
			city: cityWords.join(' '),
			words: [woloWords[0] || '', woloWords[1] || '', woloWords[2] || '']
		};
	}

	function groupOcrRows(words) {
		var rows = [];
		words.slice().sort(function(a, b) {
			return a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0;
		}).forEach(function(word) {
			var box = word.bbox;
			var row = rows.find(function(candidate) {
				var overlap = Math.min(candidate.bbox.y1, box.y1) - Math.max(candidate.bbox.y0, box.y0);
				return overlap >= Math.min(candidate.bbox.y1 - candidate.bbox.y0, box.y1 - box.y0) * 0.5;
			});
			if(!row) {
				row = { words: [], bbox: box };
				rows.push(row);
			}
			row.words.push(word);
			row.bbox = unionBboxes([row.bbox, box]);
		});
		rows.forEach(function(row) {
			row.words.sort(function(a, b) { return a.bbox.x0 - b.bbox.x0; });
			row.text = row.words.map(function(word) { return word.text; }).join(' ').trim();
		});
		return rows.sort(function(a, b) { return a.bbox.y0 - b.bbox.y0; });
	}

	function containsBBox(outer, inner) {
		return inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;
	}

	// Locate four printed sides before interpreting text. Central side samples
	// tolerate rounded corners; no text-derived or fixed-aspect box is invented.
	function detectLabelRectangles(imageData, width, height) {
		if(!imageData || !imageData.data || width < 60 || height < 30) return [];
		var data = imageData.data;
		var horizontal = new Uint8Array(width * height);
		var vertical = new Uint8Array(width * height);
		var verticalSums = new Uint32Array(width * (height + 1));
		var segments = [];
		var rectangles = [];
		var minWidth = Math.max(50, Math.round(width * 0.12));
		var minHeight = Math.max(25, Math.round(height * 0.04));
		function contrast(a, b) {
			return Math.max(Math.abs(data[a] - data[b]), Math.abs(data[a + 1] - data[b + 1]), Math.abs(data[a + 2] - data[b + 2]));
		}
		for(var y = 1; y < height - 1; y++) {
			var start = -1;
			var last = -1;
			for(var x = 1; x < width - 1; x++) {
				var index = y * width + x;
				var pixel = index * 4;
				horizontal[index] = Math.max(contrast(pixel, pixel - width * 4), contrast(pixel, pixel + width * 4)) >= 18 ? 1 : 0;
				vertical[index] = Math.max(contrast(pixel, pixel - 4), contrast(pixel, pixel + 4)) >= 18 ? 1 : 0;
				verticalSums[index + width] = verticalSums[index] + vertical[index];
				if(horizontal[index]) {
					if(start < 0) start = x;
					last = x;
				}
				if(start >= 0 && (!horizontal[index] && x - last > 2 || x === width - 2)) {
					if(last - start >= minWidth) segments.push({ x0: start, x1: last, y: y });
					start = -1;
				}
			}
		}
		// Collapse the neighboring edge rows of the same horizontal stroke.
		var strokes = [];
		segments.forEach(function(segment) {
			var previous = strokes.find(function(stroke) {
				return segment.y - stroke.bottom <= 3 && Math.abs(stroke.x0 - segment.x0) <= 4 && Math.abs(stroke.x1 - segment.x1) <= 4;
			});
			if(previous) previous.bottom = segment.y;
			else strokes.push({ x0: segment.x0, x1: segment.x1, top: segment.y, bottom: segment.y });
		});
		// Bound work for busy camera frames; long printed sides take priority.
		strokes.sort(function(a, b) { return (b.x1 - b.x0) - (a.x1 - a.x0); });
		strokes = strokes.slice(0, 120).sort(function(a, b) { return a.top - b.top; });
		function findSide(from, to, y0, y1) {
			var best = null;
			for(var sx = Math.max(1, Math.floor(from)); sx <= Math.min(width - 2, Math.ceil(to)); sx++) {
				var hits = verticalSums[(y1 + 1) * width + sx] - verticalSums[y0 * width + sx];
				var coverage = hits / (y1 - y0 + 1);
				if(coverage >= 0.8 && (!best || coverage > best.coverage)) best = { x: sx, coverage: coverage };
			}
			return best;
		}
		function cornerConnected(sideX, edgeY, radius, directionX, directionY) {
			var hits = 0;
			radius = Math.max(0, radius);
			for(var step = 0; step <= 4; step++) {
				var angle = step * Math.PI / 8;
				var cx = Math.round(sideX + directionX * radius * (1 - Math.cos(angle)));
				var cy = Math.round(edgeY + directionY * radius * (1 - Math.sin(angle)));
				var found = false;
				for(var dy = -2; dy <= 2 && !found; dy++) {
					for(var dx = -2; dx <= 2; dx++) {
						var px = cx + dx;
						var py = cy + dy;
						if(px >= 0 && px < width && py >= 0 && py < height && (horizontal[py * width + px] || vertical[py * width + px])) { found = true; break; }
					}
				}
				if(found) hits++;
			}
			return hits >= 4;
		}
		strokes.forEach(function(top, i) {
			strokes.slice(i + 1).forEach(function(bottom) {
				var h = bottom.bottom - top.top;
				var w = top.x1 - top.x0;
				var corner = Math.min(w * 0.18, h * 0.3);
				if(h < minHeight || Math.abs(top.x0 - bottom.x0) > corner || Math.abs(top.x1 - bottom.x1) > corner) return;
				var middleTop = Math.ceil(top.bottom + h * 0.22);
				var middleBottom = Math.floor(bottom.top - h * 0.22);
				if(middleBottom <= middleTop) return;
				var left = findSide(Math.min(top.x0, bottom.x0) - corner, Math.min(top.x0, bottom.x0) + 3, middleTop, middleBottom);
				var right = findSide(Math.max(top.x1, bottom.x1) - 3, Math.max(top.x1, bottom.x1) + corner, middleTop, middleBottom);
				if(!left || !right || right.x - left.x < minWidth) return;
				if(!cornerConnected(left.x, top.top, top.x0 - left.x, 1, 1) ||
					!cornerConnected(right.x, top.top, right.x - top.x1, -1, 1) ||
					!cornerConnected(left.x, bottom.bottom, bottom.x0 - left.x, 1, -1) ||
					!cornerConnected(right.x, bottom.bottom, right.x - bottom.x1, -1, -1)) return;
				var rect = { x0: left.x, y0: top.top, x1: right.x + 1, y1: bottom.bottom + 1 };
				if(!rectangles.some(function(existing) { return bboxIoU(existing, rect) > 0.9; })) rectangles.push(rect);
			});
		});
		return rectangles;
	}

	function extractLabelMetadata(words, container) {
		var height = container.y1 - container.y0;
		var rows = groupOcrRows(words.filter(function(word) {
			return word.bbox.x0 >= container.x0 && word.bbox.x1 <= container.x1 &&
				(typeof word.confidence !== 'number' || word.confidence >= 55);
		})).filter(function(row) { return !/(?:www\.|https?:)/i.test(row.text) && !/^(?:wolo(?: codes?)?|codes?)$/.test(normalizeOcrText(row.text)); });
		var above = rows.filter(function(row) {
			return row.bbox.y1 <= container.y0 && row.bbox.y0 >= container.y0 - height * 0.75;
		}).slice(-2);
		var below = rows.filter(function(row) {
			return row.bbox.y0 >= container.y1 && row.bbox.y1 <= container.y1 + height;
		});
		// Keep the contiguous address block, stopping at a separated footer.
		for(var i = 1; i < below.length; i++) {
			if(below[i].bbox.y0 - below[i - 1].bbox.y1 > (below[i].bbox.y1 - below[i].bbox.y0) * 1.5) { below = below.slice(0, i); break; }
		}
		var title = above[0];
		var section = above[1];
		return {
			metadata: { title: title ? title.text : '', section: section ? section.text : '', address: below.map(function(row) { return row.text; }).join('\n') },
			regions: { title: title ? title.bbox : null, section: section ? section.bbox : null, address: unionBboxes(below.map(function(row) { return row.bbox; })) }
		};
	}

	function matchOcrRegionsToWoloCode(result, includesFn, canonicalWords) {
		var words = result && result.data && result.data.words;
		var containers = result && result.data && result.data.labelContainers;
		var best = null;
		if(!words || !containers || !containers.length) return null;
		words = words.filter(function(word) { return word && word.bbox && normalizeOcrText(word.text); });
		containers.forEach(function(container) {
			var rows = groupOcrRows(words.filter(function(word) { return containsBBox(container, word.bbox); }));
			rows.forEach(function(row) {
				var tokens = normalizeOcrText(row.text).split(' ');
				if(tokens.length !== 3 || row.words.some(function(word) { return typeof word.confidence === 'number' && word.confidence < 55; })) return;
				var corrected = tokens.map(function(token) { return fuzzyMatchWord(token, includesFn, canonicalWords || []); });
				if(corrected.some(function(word) { return !word; })) return;
				var score = (row.bbox.y1 - row.bbox.y0) / (container.y1 - container.y0) * 1000 + tokens.reduce(function(sum, token) { return sum + (includesFn(token) ? 10 : 0); }, 0);
				var area = (container.x1 - container.x0) * (container.y1 - container.y0);
				if(!best || score > best.score || (score === best.score && area < best.area))
					best = { words: corrected, bbox: row.bbox, container: container, rows: rows, score: score, area: area };
			});
		});
		if(!best) return null;
		var codeBox = best.bbox;
		var cityRow = best.rows.filter(function(row) { return row.bbox.y1 <= codeBox.y0; }).pop();
		if(cityRow && cityRow.words.some(function(word) { return typeof word.confidence === 'number' && word.confidence < 55; })) cityRow = null;
		var city = cityRow ? normalizeOcrText(cityRow.text) : '';
		var cityTokens = city ? city.split(' ') : [];
		var matched = cityTokens.concat(best.words);
		var optional = extractLabelMetadata(words, best.container);
		return {
			words: matched,
			code: matched.join(' '),
			cityWordCount: cityTokens.length,
			metadata: optional.metadata,
			regions: Object.assign({ container: best.container, city: cityRow ? cityRow.bbox : null, code: codeBox }, optional.regions)
		};
	}

	function buildCodeFromReview(city, w1, w2, w3) {
		var parts = [];
		var cityTokens;
		var word;
		cityTokens = normalizeOcrText(city).split(' ').filter(Boolean);
		parts = parts.concat(cityTokens);
		word = normalizeOcrText(w1);
		if(word)
			parts.push(word);
		word = normalizeOcrText(w2);
		if(word)
			parts.push(word);
		word = normalizeOcrText(w3);
		if(word)
			parts.push(word);
		return parts.join(' ');
	}

	function validateReviewWords(w1, w2, w3, includesFn) {
		var words = [w1, w2, w3].map(function(word) { return String(word || '').trim().toLowerCase(); });
		var i;
		for(i = 0; i < words.length; i++) {
			if(!words[i] || !includesFn(words[i]))
				return false;
		}
		return true;
	}

	function bboxIoU(a, b) {
		var x0;
		var y0;
		var x1;
		var y1;
		var interW;
		var interH;
		var inter;
		var areaA;
		var areaB;
		if(!a || !b)
			return 0;
		x0 = Math.max(a.x0, b.x0);
		y0 = Math.max(a.y0, b.y0);
		x1 = Math.min(a.x1, b.x1);
		y1 = Math.min(a.y1, b.y1);
		interW = Math.max(0, x1 - x0);
		interH = Math.max(0, y1 - y0);
		inter = interW * interH;
		areaA = Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0);
		areaB = Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
		if(areaA <= 0 || areaB <= 0)
			return 0;
		return inter / (areaA + areaB - inter);
	}

	function unionBboxes(bboxes) {
		var i;
		var bbox;
		var union = null;
		for(i = 0; i < bboxes.length; i++) {
			bbox = bboxes[i];
			if(!bbox)
				continue;
			if(!union) {
				union = {
					x0: bbox.x0,
					y0: bbox.y0,
					x1: bbox.x1,
					y1: bbox.y1
				};
				continue;
			}
			union.x0 = Math.min(union.x0, bbox.x0);
			union.y0 = Math.min(union.y0, bbox.y0);
			union.x1 = Math.max(union.x1, bbox.x1);
			union.y1 = Math.max(union.y1, bbox.y1);
		}
		return union;
	}

	function getCenteredFixedGuideBBox(width, height, aspect) {
		var cropWidth;
		var cropHeight;
		var sx;
		var sy;
		if(!width || !height)
			return null;
		if(width / height >= aspect) {
			cropHeight = height;
			cropWidth = Math.round(height * aspect);
		}
		else {
			cropWidth = width;
			cropHeight = Math.round(width / aspect);
		}
		sx = Math.max(0, Math.round((width - cropWidth) / 2));
		sy = Math.max(0, Math.round((height - cropHeight) / 2));
		return {
			x0: sx,
			y0: sy,
			x1: sx + cropWidth,
			y1: sy + cropHeight
		};
	}

	function isAspectRatioNear(bbox, targetAspect, tolerance) {
		var width;
		var height;
		var ratio;
		if(!bbox || !targetAspect)
			return false;
		width = bbox.x1 - bbox.x0;
		height = bbox.y1 - bbox.y0;
		if(width <= 0 || height <= 0)
			return false;
		ratio = width / height;
		return ratio >= targetAspect * (1 - tolerance) && ratio <= targetAspect * (1 + tolerance);
	}

	function luminanceAt(data, width, x, y) {
		var i = (y * width + x) * 4;
		return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
	}

	function measureRectEdgeContrast(imageData, width, height, rect, sampleStep) {
		var data = imageData.data;
		var samples = 0;
		var total = 0;
		var x;
		var y;
		var inner;
		var outer;
		var step = sampleStep || 4;
		if(!rect || width <= 0 || height <= 0)
			return 0;
		for(x = rect.x0; x < rect.x1; x += step) {
			if(rect.y0 > 0) {
				inner = luminanceAt(data, width, x, rect.y0);
				outer = luminanceAt(data, width, x, rect.y0 - 1);
				total += Math.abs(inner - outer);
				samples += 1;
			}
			if(rect.y1 < height - 1) {
				inner = luminanceAt(data, width, x, rect.y1 - 1);
				outer = luminanceAt(data, width, x, rect.y1);
				total += Math.abs(inner - outer);
				samples += 1;
			}
		}
		for(y = rect.y0; y < rect.y1; y += step) {
			if(rect.x0 > 0) {
				inner = luminanceAt(data, width, rect.x0, y);
				outer = luminanceAt(data, width, rect.x0 - 1, y);
				total += Math.abs(inner - outer);
				samples += 1;
			}
			if(rect.x1 < width - 1) {
				inner = luminanceAt(data, width, rect.x1 - 1, y);
				outer = luminanceAt(data, width, rect.x1, y);
				total += Math.abs(inner - outer);
				samples += 1;
			}
		}
		return samples ? total / samples : 0;
	}

	function extractMatchRegionDetails(result, match, includesFn, canonicalWords) {
		var ocrWords = result && result.data && result.data.words;
		var wanted;
		var bboxes = [];
		var matchedWordObjects = [];
		var i;
		var word;
		var token;
		var corrected;
		var startIndex;
		var union;
		var angle = 0;
		var first;
		var last;
		var dx;
		var dy;
		var cx;
		var cy;

		if(!ocrWords || !match || !match.words)
			return null;

		wanted = {};
		startIndex = typeof match.cityWordCount === 'number' ? match.cityWordCount : 0;
		for(i = startIndex; i < match.words.length; i++)
			wanted[match.words[i]] = true;

		for(i = 0; i < ocrWords.length; i++) {
			word = ocrWords[i];
			if(!word || !word.text || !word.bbox)
				continue;
			token = normalizeOcrText(word.text).split(' ').filter(Boolean)[0];
			if(!token)
				continue;
			corrected = fuzzyMatchWord(token, includesFn, canonicalWords) || token;
			if(wanted[corrected]) {
				bboxes.push(word.bbox);
				cx = (word.bbox.x0 + word.bbox.x1) / 2;
				cy = (word.bbox.y0 + word.bbox.y1) / 2;
				matchedWordObjects.push({
					word: corrected,
					bbox: word.bbox,
					baseline: word.baseline,
					cx: cx,
					cy: cy
				});
			}
		}

		if(!bboxes.length)
			return null;

		union = unionBboxes(bboxes);
		if(!union)
			return null;

		if(matchedWordObjects.length >= 2) {
			matchedWordObjects.sort(function(a, b) {
				return a.cx - b.cx;
			});
			first = matchedWordObjects[0];
			last = matchedWordObjects[matchedWordObjects.length - 1];
			dx = last.cx - first.cx;
			dy = last.cy - first.cy;
			if(Math.abs(dx) > 10) {
				angle = Math.atan2(dy, dx);
			}
		}
		else if(matchedWordObjects.length === 1 && matchedWordObjects[0].baseline && matchedWordObjects[0].baseline.has_baseline) {
			dx = matchedWordObjects[0].baseline.x1 - matchedWordObjects[0].baseline.x0;
			dy = matchedWordObjects[0].baseline.y1 - matchedWordObjects[0].baseline.y0;
			if(Math.abs(dx) > 5) {
				angle = Math.atan2(dy, dx);
			}
		}

		if(Math.abs(angle) < 0.004) {
			angle = 0;
		}

		return {
			bbox: union,
			angle: angle,
			center: {
				x: (union.x0 + union.x1) / 2,
				y: (union.y0 + union.y1) / 2
			},
			matchedWords: matchedWordObjects
		};
	}

	function extractMatchBBoxFromOcr(result, match, includesFn, canonicalWords) {
		var ocrWords = result && result.data && result.data.words;
		var wanted;
		var bboxes = [];
		var i;
		var word;
		var token;
		var corrected;
		var startIndex;
		if(!ocrWords || !match || !match.words)
			return null;
		wanted = {};
		startIndex = typeof match.cityWordCount === 'number' ? match.cityWordCount : 0;
		for(i = startIndex; i < match.words.length; i++)
			wanted[match.words[i]] = true;
		for(i = 0; i < ocrWords.length; i++) {
			word = ocrWords[i];
			if(!word || !word.text || !word.bbox)
				continue;
			token = normalizeOcrText(word.text).split(' ').filter(Boolean)[0];
			if(!token)
				continue;
			corrected = fuzzyMatchWord(token, includesFn, canonicalWords) || token;
			if(wanted[corrected])
				bboxes.push(word.bbox);
		}
		return unionBboxes(bboxes);
	}

	function isFixedBorderReady(canvas, matchBBox, aspect, tolerance, minContrast) {
		var guide;
		var ctx;
		var imageData;
		var contrast;
		if(!canvas || !matchBBox)
			return false;
		guide = getCenteredFixedGuideBBox(canvas.width, canvas.height, aspect);
		if(!guide)
			return false;
		if(!isAspectRatioNear(matchBBox, aspect, tolerance))
			return false;
		if(bboxIoU(matchBBox, guide) < 0.35)
			return false;
		ctx = canvas.getContext('2d');
		if(!ctx)
			return false;
		imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		contrast = measureRectEdgeContrast(imageData, canvas.width, canvas.height, guide);
		return contrast >= (minContrast || 12);
	}

	function getVideoViewfinderCropRect(videoWidth, videoHeight, viewportWidth, viewportHeight, liveZoom) {
		var cw = typeof videoWidth === 'number' ? videoWidth : 0;
		var ch = typeof videoHeight === 'number' ? videoHeight : 0;
		var vw = typeof viewportWidth === 'number' ? viewportWidth : 0;
		var vh = typeof viewportHeight === 'number' ? viewportHeight : 0;
		var zoom = typeof liveZoom === 'number' && liveZoom > 0 ? liveZoom : 1;
		var s0;
		var s;
		var sw;
		var sh;
		var sx;
		var sy;

		if(!vw || !vh || !cw || !ch) {
			return { sx: 0, sy: 0, sw: cw, sh: ch };
		}

		s0 = Math.max(vw / cw, vh / ch);
		s = s0 * zoom;

		sw = Math.min(cw, vw / s);
		sh = Math.min(ch, vh / s);

		sx = Math.max(0, (cw - sw) / 2);
		sy = Math.max(0, (ch - sh) / 2);

		return {
			sx: Math.round(sx),
			sy: Math.round(sy),
			sw: Math.round(sw),
			sh: Math.round(sh)
		};
	}

	function isCodeScanSupported() {
		return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
	}

	var codeScanOcrMatch = {
		normalizeOcrText: normalizeOcrText,
		levenshteinDistance: levenshteinDistance,
		fuzzyMatchWord: fuzzyMatchWord,
		correctTokens: correctTokens,
		findWoloCodeInTokens: findWoloCodeInTokens,
		matchOcrTextToWoloCode: matchOcrTextToWoloCode,
		matchOcrRegionsToWoloCode: matchOcrRegionsToWoloCode,
		detectLabelRectangles: detectLabelRectangles,
		splitMatchForReview: splitMatchForReview,
		buildCodeFromReview: buildCodeFromReview,
		validateReviewWords: validateReviewWords,
		bboxIoU: bboxIoU,
		unionBboxes: unionBboxes,
		getCenteredFixedGuideBBox: getCenteredFixedGuideBBox,
		isAspectRatioNear: isAspectRatioNear,
		measureRectEdgeContrast: measureRectEdgeContrast,
		extractMatchBBoxFromOcr: extractMatchBBoxFromOcr,
		extractMatchRegionDetails: extractMatchRegionDetails,
		isFixedBorderReady: isFixedBorderReady,
		getVideoViewfinderCropRect: getVideoViewfinderCropRect,
		isCodeScanSupported: isCodeScanSupported
	};

	if(typeof module !== 'undefined' && module.exports) {
		module.exports = codeScanOcrMatch;
	}
	if(typeof global !== 'undefined') {
		global.codeScanOcrMatch = codeScanOcrMatch;
	}
})(typeof window !== 'undefined' ? window : global);
