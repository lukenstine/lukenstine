/**
 * URL helpers shared by the content scripts, background script and tests.
 *
 * Loaded as a plain script in the extension (it defines a global
 * `StreamShieldUrl`) and as a CommonJS module under Node for tests.
 */
(function (root) {
  'use strict';

  /**
   * Two-level public suffixes where the registrable domain is three labels
   * long (e.g. "bbc.co.uk"). Small list on purpose: a full public-suffix list
   * is 10k entries and this is only used to decide "same site or not".
   */
  const TWO_LEVEL_SUFFIXES = new Set([
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au',
    'co.nz', 'co.za', 'com.br', 'com.pk', 'net.pk', 'org.pk', 'edu.pk',
    'co.in', 'com.in', 'net.in', 'co.jp', 'com.mx', 'com.ar', 'com.tr'
  ]);

  /**
   * Returns the hostname of a URL string, lower-cased, or null if it is not
   * an http(s) URL. Non-http schemes (blob:, data:, javascript:) return null
   * because they never belong to a third party in the sense we care about.
   */
  function hostnameOf(url) {
    if (typeof url !== 'string' || url.length === 0) return null;
    try {
      const parsed = new URL(url, root.location ? root.location.href : undefined);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.hostname.toLowerCase();
    } catch (_err) {
      return null;
    }
  }

  /**
   * Returns the registrable ("base") domain of a hostname:
   *   "cdn.images.example.com" -> "example.com"
   *   "www.bbc.co.uk"          -> "bbc.co.uk"
   * IP addresses and single-label hosts are returned unchanged.
   */
  function baseDomain(hostname) {
    if (typeof hostname !== 'string' || hostname.length === 0) return '';
    const host = hostname.toLowerCase().replace(/\.$/, '');
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host;
    const labels = host.split('.');
    if (labels.length <= 2) return host;
    const lastTwo = labels.slice(-2).join('.');
    if (TWO_LEVEL_SUFFIXES.has(lastTwo) && labels.length >= 3) {
      return labels.slice(-3).join('.');
    }
    return lastTwo;
  }

  /**
   * True when `targetUrl` points at a different site than `pageUrl`.
   * Non-http targets (null hostname) are treated as first-party so we never
   * block blob: video URLs or javascript: links.
   */
  function isThirdParty(targetUrl, pageUrl) {
    const targetHost = hostnameOf(targetUrl);
    if (targetHost === null) return false;
    const pageHost = hostnameOf(pageUrl);
    if (pageHost === null) return true;
    return baseDomain(targetHost) !== baseDomain(pageHost);
  }

  /**
   * Normalises user input for the allowlist: strips scheme, path, port and
   * whitespace, lower-cases. Returns null when nothing usable is left.
   */
  function normaliseDomainInput(input) {
    if (typeof input !== 'string') return null;
    let value = input.trim().toLowerCase();
    if (value.length === 0) return null;
    if (!/^[a-z]+:\/\//.test(value)) value = 'https://' + value;
    const host = hostnameOf(value);
    if (!host || !/^[a-z0-9.-]+$/.test(host) || host.length > 253) return null;
    return host;
  }

  const api = { hostnameOf, baseDomain, isThirdParty, normaliseDomainInput };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.StreamShieldUrl = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
