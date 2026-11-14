/**
 * Match noisy on-device OCR text to a valid Wolo Code using the known word list.
 */
(function(global) {
	'use strict';

	function normalizeOcrText(text) {
		if(!text)
			return '';
		return String(text)
			.normalize('NFKC')
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
		var ambiguous = false;
		var i;
		var word;
		var dist;
		if(!token || token.length < 2 || token.length > 64)
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
				ambiguous = false;
			}
			else if(dist === bestDist && word !== best) ambiguous = true;
		}
		return ambiguous ? null : best;
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

	function validOcrBox(box) {
		return !!box && ['x0', 'y0', 'x1', 'y1'].every(function(key) { return Number.isFinite(box[key]); }) && box.x1 > box.x0 && box.y1 > box.y0;
	}

	function reliableOcrWord(word) {
		return Number.isFinite(word.confidence) && word.confidence >= 55 && word.confidence <= 100;
	}

	// Straight printed edges concentrate in fewer rows and columns when aligned.
	// Estimate camera roll only; the rectangle detector still verifies the frame.
	function estimateLabelRoll(imageData, width, height) {
		var data = imageData.data;
		var horizontal = [];
		var vertical = [];
		var rowStride = width * 4;
		for(var y = 1; y < height - 1; y++) {
			for(var x = 1; x < width - 1; x++) {
				var pixel = (y * width + x) * 4;
				var dx = 0;
				var dy = 0;
				for(var channel = 0; channel < 3; channel++) {
					var i = pixel + channel;
					dx += Math.abs(data[i + 4] - data[i - 4]);
					dy += Math.abs(data[i + rowStride] - data[i - rowStride]);
				}
				if(dy >= 54 && dy >= dx * 2) horizontal.push(x, y);
				if(dx >= 54 && dx >= dy * 2) vertical.push(x, y);
			}
		}
		if(horizontal.length < 40 || vertical.length < 40) return 0;
		var offset = Math.ceil(Math.max(width, height) / 4);
		var rows = new Uint32Array(height + 2 * offset);
		var columns = new Uint32Array(width + 2 * offset);
		function score(angle) {
			var slope = Math.tan(angle * Math.PI / 180);
			var sum = 0;
			rows.fill(0);
			columns.fill(0);
			for(var i = 0; i < horizontal.length; i += 2) {
				sum += rows[Math.round(horizontal[i + 1] - slope * horizontal[i]) + offset]++;
			}
			for(var i = 0; i < vertical.length; i += 2) {
				sum += columns[Math.round(vertical[i] + slope * vertical[i + 1]) + offset]++;
			}
			return sum;
		}
		var bestAngle = 0;
		var originalScore = score(0);
		var bestScore = originalScore;
		function tryAngle(angle) {
			var candidateScore = score(angle);
			if(candidateScore > bestScore) {
				bestScore = candidateScore;
				bestAngle = angle;
			}
		}
		for(var angle = -12; angle <= 12; angle += 0.5) {
			if(angle) tryAngle(angle);
		}
		var coarseAngle = bestAngle;
		for(var step = -4; step <= 4; step++) {
			if(step) tryAngle(coarseAngle + step / 10);
		}
		return Math.abs(bestAngle) >= 0.3 && bestScore > originalScore * 1.08 ? bestAngle : 0;
	}

	// Locate four printed sides before interpreting text. Central side samples
	// tolerate rounded corners; no text-derived or fixed-aspect box is invented.
	function detectLabelRegions(imageData, width, height, focus) {
		if(!imageData || !imageData.data || width < 60 || height < 30) return { rectangles: [] };
		var data = imageData.data;
		var horizontal = new Uint8Array(width * height);
		var vertical = new Uint8Array(width * height);
		var verticalSums = new Uint32Array(width * (height + 1));
		var segments = [];
		var rectangles = [];
		var minWidth = Math.max(50, Math.round(width * 0.12));
		var minLeg = Math.max(8, Math.round(width * 0.008));
		var minHeight = Math.max(25, Math.round(height * 0.04));
		function contrast(a, b) {
			return Math.max(Math.abs(data[a] - data[b]), Math.abs(data[a + 1] - data[b + 1]), Math.abs(data[a + 2] - data[b + 2]));
		}
		function hasEdge(pixel, stride) {
			var before = pixel - stride;
			var after = pixel + stride;
			var strength = Math.max(contrast(pixel, before), contrast(pixel, after));
			// A soft edge can spread across two samples after focus or downsampling.
			return strength >= 18 || (strength >= 12 && contrast(before, after) >= 24);
		}
		for(var y = 1; y < height - 1; y++) {
			var start = -1;
			var last = -1;
			var colorStart = -1;
			var colorLast = -1;
			for(var x = 1; x < width - 1; x++) {
				var index = y * width + x;
				var pixel = index * 4;
				horizontal[index] = hasEdge(pixel, width * 4) ? 1 : 0;
				vertical[index] = hasEdge(pixel, 4) ? 1 : 0;
				verticalSums[index + width] = verticalSums[index] + vertical[index];
				if(horizontal[index]) {
					if(start < 0) start = x;
					last = x;
					if(colorStart >= 0 && contrast(pixel, (y * width + colorStart) * 4) > 35) {
						if(colorLast - colorStart >= minLeg) segments.push({ x0: colorStart, x1: colorLast, y: y });
						colorStart = -1;
					}
					if(colorStart < 0) colorStart = x;
					colorLast = x;
				}
				if(start >= 0 && (!horizontal[index] && x - last > 2 || x === width - 2)) {
					if(last - start >= minLeg) segments.push({ x0: start, x1: last, y: y });
					start = -1;
				}
				if(colorStart >= 0 && (!horizontal[index] && x - colorLast > 2 || x === width - 2)) {
					if(colorLast - colorStart >= minLeg) segments.push({ x0: colorStart, x1: colorLast, y: y });
					colorStart = -1;
				}
			}
		}
		// Collapse the neighboring edge rows of the same horizontal stroke.
		var strokes = [];
		var recentStrokes = [];
		var currentRow = -1;
		segments.forEach(function(segment) {
			if(segment.y !== currentRow) {
				currentRow = segment.y;
				recentStrokes = recentStrokes.filter(function(stroke) { return currentRow - stroke.bottom <= 3; });
			}
			var previous = recentStrokes.find(function(stroke) {
				return Math.abs(stroke.x0 - segment.x0) <= 4 && Math.abs(stroke.x1 - segment.x1) <= 4;
			});
			if(previous) {
				previous.bottom = segment.y;
				previous.x0 = Math.min(previous.x0, segment.x0);
				previous.x1 = Math.max(previous.x1, segment.x1);
			}
			else {
				var stroke = { x0: segment.x0, x1: segment.x1, top: segment.y, bottom: segment.y };
				strokes.push(stroke);
				recentStrokes.push(stroke);
			}
		});
		// Bound work for busy camera frames; long printed sides take priority.
		strokes.sort(function(a, b) { return (b.x1 - b.x0) - (a.x1 - a.x0); });
		var longStrokes = strokes.filter(function(stroke) { return stroke.x1 - stroke.x0 >= minWidth; }).slice(0, 120).sort(function(a, b) { return a.top - b.top; });
		function findSide(from, to, y0, y1, preferRight) {
			var best = null;
			for(var sx = Math.max(1, Math.floor(from)); sx <= Math.min(width - 2, Math.ceil(to)); sx++) {
				var hits = verticalSums[(y1 + 1) * width + sx] - verticalSums[y0 * width + sx];
				var coverage = hits / (y1 - y0 + 1);
				if(coverage >= 0.8 && (!best || coverage > best.coverage || preferRight && coverage === best.coverage)) best = { x: sx, coverage: coverage };
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
		longStrokes.forEach(function(top, i) {
			longStrokes.slice(i + 1).forEach(function(bottom) {
				var h = bottom.bottom - top.top;
				var w = top.x1 - top.x0;
				var corner = Math.min(w * 0.18, h * 0.3);
				if(h < minHeight || Math.abs(top.x0 - bottom.x0) > corner || Math.abs(top.x1 - bottom.x1) > corner) return;
				var middleTop = Math.ceil(top.bottom + h * 0.22);
				var middleBottom = Math.floor(bottom.top - h * 0.22);
				if(middleBottom <= middleTop) return;
				var left = findSide(Math.min(top.x0, bottom.x0) - corner, Math.min(top.x0, bottom.x0) + 3, middleTop, middleBottom, true);
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
		// All four corners must have both arms before a box can enter OCR.
		function findMarkers(bracketStrokes, minSpan, minFrameHeight, found) {
			bracketStrokes.forEach(function(leftTop) {
				bracketStrokes.forEach(function(rightTop) {
					var span = rightTop.x1 - leftTop.x0;
					var leftLength = leftTop.x1 - leftTop.x0;
					var rightLength = rightTop.x1 - rightTop.x0;
					if(Math.abs(leftTop.top - rightTop.top) > 3 || span < minSpan || rightTop.x0 - leftTop.x1 < span * 0.2 ||
						Math.min(leftLength, rightLength) < Math.max(leftLength, rightLength) * 0.65) return;
					var leg = Math.floor(Math.min(leftLength, rightLength) * 0.7);
					var top = Math.min(leftTop.top, rightTop.top);
					if(top + leg >= height - 1) return;
					var left = findSide(leftTop.x0 - 2, leftTop.x0 + 2, top + 3, top + leg);
					var right = findSide(rightTop.x1 - 2, rightTop.x1 + 2, top + 3, top + leg);
					if(!left || !right) return;
					bracketStrokes.forEach(function(leftBottom) {
						var bottom = leftBottom.bottom;
						if(bottom - top < Math.max(minFrameHeight, leg * 3) || Math.abs(leftBottom.x0 - leftTop.x0) > 3 || Math.abs(leftBottom.x1 - leftTop.x1) > 4) return;
						var rightBottom = bracketStrokes.find(function(stroke) {
							return Math.abs(stroke.bottom - bottom) <= 3 && Math.abs(stroke.x0 - rightTop.x0) <= 4 && Math.abs(stroke.x1 - rightTop.x1) <= 3;
						});
						if(!rightBottom || !findSide(left.x - 1, left.x + 1, bottom - leg, bottom - 3) ||
							!findSide(right.x - 1, right.x + 1, bottom - leg, bottom - 3)) return;
						var rect = { x0: left.x, y0: top, x1: right.x + 1, y1: Math.max(bottom, rightBottom.bottom) + 1 };
						var aspect = (rect.x1 - rect.x0) / (rect.y1 - rect.y0);
						if(aspect > 1 / 1.2 && aspect < 1.2) return;
						var existing = found.find(function(box) { return bboxIoU(box, rect) > 0.9; });
						if(existing) existing.anchored = true;
						else {
							rect.anchored = true;
							found.push(rect);
						}
					});
				});
			});
		}
		function searchFullImage() {
			var bracketStrokes = strokes.filter(function(stroke) { return stroke.x1 - stroke.x0 <= width * 0.3; }).slice(0, 200);
			findMarkers(bracketStrokes, minWidth, minHeight, rectangles);
			return rectangles;
		}

		// Reuse the edge maps and restrict the four-marker search to the portrait
		// card under the focus point. Small cards get their own stroke budget.
		var card = focus && findPortraitCard(rectangles, focus);
		if(card) {
			var cardWidth = card.x1 - card.x0;
			var cardHeight = card.y1 - card.y0;
			var local = rectangles.filter(function(box) { return box !== card && containsBBox(card, box); });
			var localStrokes = strokes.filter(function(stroke) {
				return stroke.x0 >= card.x0 && stroke.x1 <= card.x1 && stroke.top >= card.y0 && stroke.bottom < card.y1 &&
					stroke.x1 - stroke.x0 <= cardWidth * 0.3;
			}).slice(0, 200);
			findMarkers(localStrokes, Math.max(50, Math.round(cardWidth * 0.12)), Math.max(25, Math.round(cardHeight * 0.04)), local);
			if(local.some(function(box) { return box.x1 - box.x0 >= 1.2 * (box.y1 - box.y0) && findLabelCard([card], box); }))
				return { rectangles: [card].concat(local), searchFullImage: searchFullImage };
		}
		return { rectangles: searchFullImage() };
	}

	function detectLabelRectangles(imageData, width, height) {
		return detectLabelRegions(imageData, width, height).rectangles;
	}

	function findPortraitCard(rectangles, focus) {
		var best = null;
		var bestArea = Infinity;
		for(var box of rectangles) {
			var width = box.x1 - box.x0;
			var height = box.y1 - box.y0;
			var area = width * height;
			if(!box.anchored && height > width && area < bestArea &&
				focus.x >= box.x0 && focus.x <= box.x1 && focus.y >= box.y0 && focus.y <= box.y1) {
				best = box;
				bestArea = area;
			}
		}
		return best;
	}

	function findLabelCard(containers, container, sideways) {
		function width(box) { return sideways ? box.y1 - box.y0 : box.x1 - box.x0; }
		function height(box) { return sideways ? box.x1 - box.x0 : box.y1 - box.y0; }
		var codeWidth = width(container);
		var codeHeight = height(container);
		var cards = containers.filter(function(card) {
			var cardWidth = width(card);
			var cardHeight = height(card);
			// A portrait card can have very narrow margins beside its landscape code.
			var minMargin = cardHeight > cardWidth && codeWidth > codeHeight ? 0 : Math.max(4, codeWidth * 0.04);
			return !card.anchored && containsBBox(card, container) && cardWidth >= codeWidth + minMargin && cardHeight >= codeHeight * 1.25;
		});
		if(!cards.length) return null;
		var minWidth = Math.min.apply(null, cards.map(width));
		// Prefer the paper's close side margins, then its complete vertical extent.
		return cards.filter(function(card) { return width(card) <= minWidth * 1.02; }).sort(function(a, b) {
			return height(b) - height(a);
		})[0];
	}

	function formatScanAddress(metadata) {
		return [metadata.address_line_1, metadata.address_line_2].map(function(part) { return String(part || '').trim(); }).filter(Boolean).join('\n\n');
	}

	function isLabelBranding(row, container) {
		var text = normalizeOcrText(row.text).replace(/0/g, 'o');
		if(/(?:www\.|https?:)/i.test(row.text) || /^(?:wolo(?: codes?)?|codes?)$/.test(text)) return true;
		// The stylized W can disappear, and OCR can split or join the wordmark.
		if(row.bbox.y1 <= container.y0) return /^w?olo\s*(?:codes?)?$/.test(text);
		// The footer can be read with a damaged URL or with the URL missing entirely.
		return row.bbox.y0 >= container.y1 &&
			(/^scan or enter(?:\s|$)/.test(text) || text === 'enter at' ||
			/^(?:w{2,3})?w?olocodes?$/.test(text.replace(/\s/g, '')));
	}

	function extractLabelMetadata(words, container, card) {
		var metadata = { title: '', segment: '', address_line_1: '', address_line_2: '', address: '' };
		var regions = { title: null, segment: null, address_line_1: null, address_line_2: null, address: null };
		if(!card) return { metadata: metadata, regions: regions };
		var rows = groupOcrRows(words.filter(function(word) {
			return word && typeof word.text === 'string' && word.text.trim() && validOcrBox(word.bbox) &&
				containsBBox(card, word.bbox) && (typeof word.confidence !== 'number' || word.confidence >= 70);
		})).filter(function(row) { return !isLabelBranding(row, container); });
		var above = rows.filter(function(row) {
			return row.bbox.y1 <= container.y0;
		}).slice(-2);
		var below = rows.filter(function(row) { return row.bbox.y0 >= container.y1; });
		var paragraphs = [];
		below.forEach(function(row, i) {
			var previous = below[i - 1];
			var gap = previous ? row.bbox.y0 - previous.bbox.y1 : 0;
			var lineHeight = previous ? Math.max(row.bbox.y1 - row.bbox.y0, previous.bbox.y1 - previous.bbox.y0) : 0;
			if(!i || gap > lineHeight * 0.9) paragraphs.push([]);
			paragraphs[paragraphs.length - 1].push(row);
		});
		// Legacy labels have two physical address rows without a blank separator.
		if(paragraphs.length === 1 && below.length === 2) paragraphs = [[below[0]], [below[1]]];
		if(above[0]) { metadata.title = above[0].text; regions.title = above[0].bbox; }
		if(above[1]) { metadata.segment = above[1].text; regions.segment = above[1].bbox; }
		[paragraphs[0] || [], [].concat.apply([], paragraphs.slice(1))].forEach(function(paragraph, i) {
			var key = 'address_line_' + (i + 1);
			metadata[key] = paragraph.map(function(row) { return row.text; }).join(' ');
			regions[key] = unionBboxes(paragraph.map(function(row) { return row.bbox; }));
		});
		metadata.address = formatScanAddress(metadata);
		regions.address = unionBboxes([regions.address_line_1, regions.address_line_2]);
		return { metadata: metadata, regions: regions };
	}

	// Sparse OCR reads the three code words and misses the smaller type outside the box.
	// Bands stay inside the card: short strips above and below the box, nearest first.
	function detailScanBands(container, card) {
		var bands = [];
		var widthInset = 6;
		var x0;
		var x1;
		var boxHeight;
		var bandHeight;
		var yBottom;
		var yTop;
		var guard = 0;
		var belowTop;
		var belowBottom;
		if(!container || !card) return bands;
		x0 = card.x0 + widthInset;
		x1 = card.x1 - widthInset;
		if(x1 - x0 < 20) return bands;
		boxHeight = container.y1 - container.y0;
		bandHeight = Math.max(36, Math.round(boxHeight * 0.75));
		yBottom = container.y0 - 2;
		while(yBottom - card.y0 > 10 && guard < 4) {
			yTop = Math.max(card.y0 + 2, yBottom - bandHeight);
			if(yBottom - yTop >= 12) bands.push({ x0: x0, y0: yTop, x1: x1, y1: yBottom, role: 'above' });
			if(yTop <= card.y0 + 2) break;
			yBottom = yTop;
			guard += 1;
		}
		belowTop = container.y1 + 2;
		guard = 0;
		while(card.y1 - belowTop > 10 && guard < 4) {
			belowBottom = Math.min(card.y1 - 2, belowTop + bandHeight);
			if(belowBottom - belowTop >= 12) bands.push({ x0: x0, y0: belowTop, x1: x1, y1: belowBottom, role: 'below' });
			if(belowBottom >= card.y1 - 2) break;
			belowTop = belowBottom;
			guard += 1;
		}
		return bands;
	}

	function fillLabelMetadata(match, extraWords) {
		var read;
		var keys;
		var i;
		if(!match || !match.regions || !match.regions.container || !match.regions.card || !extraWords || !extraWords.length) return match;
		read = extractLabelMetadata(extraWords, match.regions.container, match.regions.card);
		if(!match.metadata) match.metadata = { title: '', segment: '', address_line_1: '', address_line_2: '', address: '' };
		keys = ['title', 'segment', 'address_line_1', 'address_line_2'];
		for(i = 0; i < keys.length; i++) {
			if(!match.metadata[keys[i]] && read.metadata[keys[i]]) {
				match.metadata[keys[i]] = read.metadata[keys[i]];
				match.regions[keys[i]] = read.regions[keys[i]];
			}
		}
		match.metadata.address = formatScanAddress(match.metadata);
		match.regions.address = unionBboxes([match.regions.address_line_1, match.regions.address_line_2]);
		return match;
	}

	function getLabelCodeBoxes(containers, focus) {
		containers = containers.filter(validOcrBox);
		var boxes = containers.filter(function(container) {
			if(container.anchored) return true;
			// A surrounding card cannot rescue words that spill out of its inner box.
			var width = container.x1 - container.x0;
			var height = container.y1 - container.y0;
			return !containers.some(function(inner) {
				var iw = inner.x1 - inner.x0;
				var ih = inner.y1 - inner.y0;
				return containsBBox(container, inner) && iw >= width * 0.35 && ih >= height * 0.12 && iw * ih < width * height * 0.9;
			});
		});
		if(!focus) return boxes;
		function distance(box) {
			return Math.hypot((box.x0 + box.x1) / 2 - focus.x, (box.y0 + box.y1) / 2 - focus.y);
		}
		return boxes.sort(function(a, b) {
			return Number(!!b.anchored) - Number(!!a.anchored) || distance(a) - distance(b);
		});
	}

	function rotateLabelBox(box, width, height, rotation) {
		if(!box || !rotation) return box;
		var rotated = { x0: height - box.y1, y0: box.x0, x1: height - box.y0, y1: box.x1 };
		if(rotation === 180) rotated = { x0: width - box.x1, y0: height - box.y1, x1: width - box.x0, y1: height - box.y0 };
		if(rotation === 270) rotated = { x0: box.y0, y0: width - box.x1, x1: box.y1, y1: width - box.x0 };
		if(box.anchored) rotated.anchored = true;
		return rotated;
	}

	function matchOcrRegionsToWoloCode(result, includesFn, canonicalWords) {
		var words = result && result.data && result.data.words;
		var containers = result && result.data && result.data.labelContainers;
		var focus = result && result.data && result.data.scanFocus;
		var best = null;
		if(!Array.isArray(words) || !Array.isArray(containers) || !containers.length) return null;
		containers = containers.filter(validOcrBox);
		if(focus && (!Number.isFinite(focus.x) || !Number.isFinite(focus.y))) focus = null;
		words = words.filter(function(word) { return word && validOcrBox(word.bbox) && normalizeOcrText(word.text); });
		getLabelCodeBoxes(containers).filter(function(container) { return container.x1 - container.x0 > container.y1 - container.y0; }).forEach(function(container) {
			var rows = groupOcrRows(words.filter(function(word) { return containsBBox(container, word.bbox); }));
			rows.forEach(function(row) {
				var tokens = normalizeOcrText(row.text).split(' ');
				if(tokens.length !== 3 || !row.words.every(reliableOcrWord)) return;
				var corrected = tokens.map(function(token) { return fuzzyMatchWord(token, includesFn, canonicalWords || []); });
				if(corrected.some(function(word) { return !word; })) return;
				var score = (row.bbox.y1 - row.bbox.y0) / (container.y1 - container.y0) * 1000 + tokens.reduce(function(sum, token) { return sum + (includesFn(token) ? 10 : 0); }, 0);
				var area = (container.x1 - container.x0) * (container.y1 - container.y0);
				var distance = focus ? Math.pow((row.bbox.x0 + row.bbox.x1) / 2 - focus.x, 2) + Math.pow((row.bbox.y0 + row.bbox.y1) / 2 - focus.y, 2) : 0;
				if(!best || distance < best.distance || distance === best.distance && (score > best.score || score === best.score && area < best.area))
					best = { words: corrected, bbox: row.bbox, container: container, rows: rows, score: score, area: area, distance: distance,
						exact: tokens.every(includesFn), confidence: Math.min.apply(null, row.words.map(function(word) { return word.confidence; })) };
			});
		});
		if(!best) return null;
		var codeBox = best.bbox;
		var cityRow = best.rows.filter(function(row) { return row.bbox.y1 <= codeBox.y0; }).pop();
		if(cityRow && !cityRow.words.every(reliableOcrWord)) cityRow = null;
		var city = cityRow ? normalizeOcrText(cityRow.text) : '';
		var cityTokens = city ? city.split(' ') : [];
		var matched = cityTokens.concat(best.words);
		var card = findLabelCard(containers, best.container);
		var optional = extractLabelMetadata(words, best.container, card);
		return {
			words: matched,
			code: matched.join(' '),
			cityWordCount: cityTokens.length,
			highConfidence: best.exact && (cityRow ?
				best.confidence >= 85 && cityRow.words.every(function(word) { return word.confidence >= 85; }) :
				best.confidence >= 90),
			metadata: optional.metadata,
			regions: Object.assign({ card: card, container: best.container, city: cityRow ? cityRow.bbox : null, code: codeBox }, optional.regions)
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
		findLabelCard: findLabelCard,
		findPortraitCard: findPortraitCard,
		rotateLabelBox: rotateLabelBox,
		getLabelCodeBoxes: getLabelCodeBoxes,
		normalizeOcrText: normalizeOcrText,
		levenshteinDistance: levenshteinDistance,
		fuzzyMatchWord: fuzzyMatchWord,
		correctTokens: correctTokens,
		findWoloCodeInTokens: findWoloCodeInTokens,
		matchOcrTextToWoloCode: matchOcrTextToWoloCode,
		matchOcrRegionsToWoloCode: matchOcrRegionsToWoloCode,
		detectLabelRectangles: detectLabelRectangles,
		detectLabelRegions: detectLabelRegions,
		estimateLabelRoll: estimateLabelRoll,
		detailScanBands: detailScanBands,
		readLabelMetadata: extractLabelMetadata,
		fillLabelMetadata: fillLabelMetadata,
		formatScanAddress: formatScanAddress,
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
