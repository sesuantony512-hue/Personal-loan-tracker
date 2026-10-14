const test = require('node:test');
const assert = require('node:assert/strict');
const { sortByCalendarDateDescending } = require('../calculations');

test('sorts date-only values newest first and keeps equal-date records stable', () => {
  const records = [
    { id: 1, date: '2026-09-25' },
    { id: 2, date: '2026-10-02' },
    { id: 3, date: '2026-09-25' },
    { id: 4, date: '2026-09-30' }
  ];

  assert.deepEqual(
    sortByCalendarDateDescending(records, 'date').map((record) => record.id),
    [2, 4, 1, 3]
  );
  assert.deepEqual(records.map((record) => record.id), [1, 2, 3, 4]);
});

test('places missing or invalid calendar dates last', () => {
  const records = [
    { id: 1, date: null },
    { id: 2, date: '2026-09-30' },
    { id: 3, date: '2026-02-30' }
  ];

  assert.deepEqual(
    sortByCalendarDateDescending(records, 'date').map((record) => record.id),
    [2, 1, 3]
  );
});
