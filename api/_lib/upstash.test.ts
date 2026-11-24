import { describe, expect, it } from 'vitest';
import { findCredentials, toHash } from './upstash';

describe('findCredentials', () => {
  it('finds Vercel default, Upstash and custom-prefixed names', () => {
    expect(findCredentials({ KV_REST_API_URL: 'u', KV_REST_API_TOKEN: 't' })).toEqual({ url: 'u', token: 't' });
    expect(findCredentials({ UPSTASH_REDIS_REST_URL: 'u', UPSTASH_REDIS_REST_TOKEN: 't' })).toEqual({ url: 'u', token: 't' });
    expect(findCredentials({ STORAGE_KV_REST_API_URL: 'u', STORAGE_KV_REST_API_TOKEN: 't' })).toEqual({ url: 'u', token: 't' });
    expect(findCredentials({ STORAGE_KV_REST_API_URL: 'u' })).toBeNull();
    expect(findCredentials({})).toBeNull();
  });
});

describe('toHash', () => {
  it('reads the flat array Upstash returns for HGETALL with raw strings', () => {
    expect(toHash(['2026-11-24', '{"kind":"note","text":"Out"}', '2026-11-25', '{"kind":"recipe","recipeId":"a"}'])).toEqual({
      '2026-11-24': '{"kind":"note","text":"Out"}',
      '2026-11-25': '{"kind":"recipe","recipeId":"a"}',
    });
  });
  it('handles empty and missing hashes, and the object form', () => {
    expect(toHash([])).toEqual({});
    expect(toHash(null)).toEqual({});
    expect(toHash({ settings: { weekStartsOn: 0 }, x: '1' })).toEqual({ settings: '{"weekStartsOn":0}', x: '1' });
  });
});
