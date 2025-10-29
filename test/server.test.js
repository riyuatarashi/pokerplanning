const request = require('supertest');
const { app, getFibonacci } = require('../server');

describe('PokerPlanning API', () => {
  it('should return a Fibonacci sequence via /api/fibonacci', async () => {
    const res = await request(app).get('/api/fibonacci');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('values');
    // Should contain at least 10 numbers and include 1, 2, 3, 5
    expect(res.body.values.length).toBeGreaterThanOrEqual(10);
    expect(res.body.values.slice(0, 5)).toEqual([1, 2, 3, 5, 8]);
  });
});

describe('getFibonacci utility', () => {
  it('should generate a Fibonacci sequence of the specified length', () => {
    const seq = getFibonacci();
    expect(seq).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
  });
});