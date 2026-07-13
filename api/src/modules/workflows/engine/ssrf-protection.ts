// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: SSRF guard for customer-configured HTTP steps (webhook/api nodes).
// Ported from the enterprise SsrfProtectionService. A workflow URL is
// attacker-controlled input: without this, a customer could point a webhook
// at the cloud metadata endpoint or at services on our internal network.
//
// Defense: scheme allowlist, blocked hostname list, private/reserved IP
// detection, and DNS resolution of hostnames so a public name that resolves
// to a private address is refused too (DNS-rebinding still possible between
// check and fetch — acceptable for v1; enterprise accepts the same window).

import { lookup } from 'dns/promises';
import { isIP } from 'net';

const ALLOWED_SCHEMES = ['http:', 'https:'];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

/** True for loopback, link-local, private-range, and reserved addresses. */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return isPrivateIPv4(address);
  }
  if (version === 6) {
    return isPrivateIPv6(address);
  }
  return false;
}

function isPrivateIPv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) {
    return true; // "this" network, RFC1918 10/8, loopback
  }
  if (a === 169 && b === 254) {
    return true; // link-local incl. cloud metadata 169.254.169.254
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true; // RFC1918 172.16/12
  }
  if (a === 192 && b === 168) {
    return true; // RFC1918 192.168/16
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true; // CGNAT 100.64/10
  }
  if (a >= 224) {
    return true; // multicast + reserved
  }
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === '::' || lower === '::1') {
    return true; // unspecified, loopback
  }
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true; // link-local, ULA fc00::/7
  }
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped — check the embedded IPv4
    const embedded = lower.slice('::ffff:'.length);
    return isIP(embedded) === 4 ? isPrivateIPv4(embedded) : true;
  }
  return false;
}

/**
 * Throws when the URL is not safe to fetch from workflow infrastructure.
 * Resolves DNS so hostnames pointing at private space are refused.
 */
export async function assertUrlSafe(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    throw new Error(`URL scheme "${parsed.protocol}" is not allowed (http/https only)`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new Error(`Host "${hostname}" is not allowed`);
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error(`IP address "${hostname}" is in a private or reserved range`);
    }
    return;
  }

  let resolved: { address: string }[];
  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`Host "${hostname}" could not be resolved`);
  }
  for (const { address } of resolved) {
    if (isPrivateAddress(address)) {
      throw new Error(`Host "${hostname}" resolves to a private address`);
    }
  }
}
