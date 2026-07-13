// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// The SSRF matrix: every private/reserved range, metadata endpoints, scheme
// abuse, and DNS resolution to private space must be refused; ordinary public
// URLs must pass. This guard is the only thing between a customer-typed
// webhook URL and our internal network.

import { assertUrlSafe, isPrivateAddress } from './ssrf-protection';

jest.mock('dns/promises', () => ({
  lookup: jest.fn((hostname: string) => {
    const table: Record<string, string> = {
      'example.com': '93.184.216.34',
      'internal.evil.test': '10.0.0.5',
      'rebind.evil.test': '192.168.1.1',
    };
    const address = table[hostname];
    if (!address) {
      return Promise.reject(new Error('ENOTFOUND'));
    }
    return Promise.resolve([{ address, family: 4 }]);
  }),
}));

describe('isPrivateAddress', () => {
  it.each([
    ['127.0.0.1', true],
    ['127.255.255.255', true],
    ['10.0.0.1', true],
    ['10.255.255.255', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    ['172.32.0.1', false],
    ['192.168.0.1', true],
    ['169.254.169.254', true], // cloud metadata
    ['100.64.0.1', true], // CGNAT
    ['0.0.0.0', true],
    ['224.0.0.1', true], // multicast
    ['255.255.255.255', true],
    ['8.8.8.8', false],
    ['93.184.216.34', false],
    ['::1', true],
    ['::', true],
    ['fe80::1', true],
    ['fc00::1', true],
    ['fd12:3456::1', true],
    ['::ffff:127.0.0.1', true], // IPv4-mapped loopback
    ['::ffff:8.8.8.8', false],
    ['2606:4700::1111', false],
  ])('%s → private=%s', (address, expected) => {
    expect(isPrivateAddress(address)).toBe(expected);
  });
});

describe('assertUrlSafe', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:8080/admin',
    'http://localhost:3101/api/v1/users',
    'http://10.1.2.3/hook',
    'http://172.20.0.1/hook',
    'http://192.168.1.10/hook',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://[::1]/hook',
    'http://[fe80::1]/hook',
    'ftp://example.com/file',
    'file:///etc/passwd',
    'gopher://example.com',
  ])('refuses %s', async (url) => {
    await expect(assertUrlSafe(url)).rejects.toThrow();
  });

  it('refuses hostnames that resolve to private addresses', async () => {
    await expect(assertUrlSafe('https://internal.evil.test/hook')).rejects.toThrow(
      /resolves to a private address/,
    );
    await expect(assertUrlSafe('https://rebind.evil.test/hook')).rejects.toThrow(
      /resolves to a private address/,
    );
  });

  it('refuses unresolvable hosts and garbage URLs', async () => {
    await expect(assertUrlSafe('https://no-such-host.test/hook')).rejects.toThrow(
      /could not be resolved/,
    );
    await expect(assertUrlSafe('not a url at all')).rejects.toThrow(/Invalid URL/);
  });

  it('allows public hostnames and public IPs over http/https', async () => {
    await expect(assertUrlSafe('https://example.com/webhook')).resolves.toBeUndefined();
    await expect(assertUrlSafe('http://example.com:8443/webhook')).resolves.toBeUndefined();
    await expect(assertUrlSafe('https://93.184.216.34/webhook')).resolves.toBeUndefined();
  });
});
