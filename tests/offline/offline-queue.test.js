'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const queue = require('../../scripts/offline/queue');

test('offline queue preserves insertion order', () => {
	const first = queue.createQueueItem({ title: 'A' });
	const second = queue.createQueueItem({ title: 'B' });
	const stored = queue.enqueue(queue.enqueue([], first), second);
	const sorted = queue.sortQueue(stored);
	assert.equal(sorted[0].payload.title, 'A');
	assert.equal(sorted[1].payload.title, 'B');
});

test('offline queue flush removes successful items and keeps network failures', async () => {
	const items = [
		queue.createQueueItem({ title: 'ok' }),
		queue.createQueueItem({ title: 'retry' })
	];
	let attempts = 0;
	const result = await queue.flushQueue(items, async (payload) => {
		attempts += 1;
		if (payload.title === 'retry') {
			throw new Error('Network Error');
		}
	});
	assert.equal(attempts, 2);
	assert.equal(result.flushed, 1);
	assert.equal(result.failed, 1);
	assert.equal(result.remaining.length, 1);
	assert.equal(result.remaining[0].payload.title, 'retry');
});

test('shouldQueueSave treats offline and network errors as queueable', () => {
	assert.equal(queue.shouldQueueSave(false), true);
	assert.equal(queue.shouldQueueSave(true, new Error('Network Error')), true);
	assert.equal(queue.shouldQueueSave(true, new Error('permission-denied')), false);
});
