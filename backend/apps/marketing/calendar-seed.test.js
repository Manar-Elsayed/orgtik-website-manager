const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, context } = require('../hr/runtime-harness');
const { createBusinessCalendar } = require('../../lib/business-calendar');
test('Marketing fixture and suite feed initialize when a historical seed date crosses Cairo midnight DST', () => {
  const calendar = createBusinessCalendar('Africa/Cairo');
  assert.throws(() => calendar.fromWall({ year: 2026, month: 4, day: 24, hour: 0, minute: 0, second: 0 }), { code: 'invalid_local_time' });
  const fixture = runtime('marketing', 'ws_orgtik', { fixtureId: 'orgtik-v1', now: '2026-10-14T01:00:00Z' });
  try {
    const actor = context(fixture, 'marketing');
    assert.ok(fixture.instance.bootstrap(actor).projects.length > 0);
    assert.ok(fixture.instance.suiteFeed(actor).projects.length > 0);
  } finally { fixture.close(); }
});
