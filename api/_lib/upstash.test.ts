import { describe, expect, it } from 'vitest';
import { findCredentials } from './upstash';

describe('findCredentials', () => {
  it('finds Vercel default, Upstash and custom-prefixed names', () => {
    expect(findCredentials({ KV_REST_API_URL: 'u', KV_REST_API_TOKEN: 't' })).toEqual({ url: 'u', token: 't' });
    expect(findCredentials({ UPSTASH_REDIS_REST_URL: 'u', UPSTASH_REDIS_REST_TOKEN: 't' })).toEqual({ url: 'u', token: 't' });
    expect(findCredentials({ STORAGE_KV_REST_API_URL: 'u', STORAGE_KV_REST_API_TOKEN: 't' })).toEqual({ url: 'u', token: 't' });
    expect(findCredentials({ STORAGE_KV_REST_API_URL: 'u' })).toBeNull();
    expect(findCredentials({})).toBeNull();
  });
});
