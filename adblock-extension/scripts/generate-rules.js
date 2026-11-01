#!/usr/bin/env node
/**
 * Generates rules/ad-networks.json from the domain list below.
 *
 * Why generate instead of hand-writing: declarativeNetRequest rules need
 * unique integer ids and a strict shape. Keeping the human-maintained part
 * as a plain list and generating the JSON removes a whole class of typos.
 *
 * Run:  node scripts/generate-rules.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

/** Every resource type except main_frame; used for ad scripts, iframes, pixels. */
const SUB_RESOURCE_TYPES = [
  'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object',
  'xmlhttprequest', 'ping', 'media', 'websocket', 'other'
];

/**
 * Ad / pop-under / tracker networks. Subdomains match automatically.
 * Grouped by what they are so the list stays reviewable.
 */
const AD_DOMAINS = [
  // Pop-under and push networks heavily used by streaming sites
  'propellerads.com', 'propellerclick.com', 'onclickads.net', 'onclkds.com',
  'onclickmax.com', 'monetag.com', 'pushame.com', 'popads.net', 'popcash.net',
  'popmyads.com', 'adsterra.com', 'highperformanceformat.com',
  'highperformancedformats.com', 'exoclick.com', 'exosrv.com', 'realsrv.com',
  'trafficjunky.net', 'trafficjunky.com', 'hilltopads.net', 'hilltopads.com',
  'clickadu.com', 'clickaine.com', 'adcash.com', 'juicyads.com', 'richads.com',
  'ad-maven.com', 'admaven.com', 'evadav.com', 'pushground.com', 'zeropark.com',
  'galaksion.com', 'trafficstars.com', 'tsyndicate.com', 'adspyglass.com',
  'adsco.re', 'adtng.com', 'pemsrv.com', 'adxpansion.com', 'plugrush.com',
  'ero-advertising.com', 'propu.sh', 'bidvertiser.com', 'a-ads.com',
  'coinzilla.com', 'adskeeper.com', 'adtelligent.com', 'vidoomy.com',
  'popunder.net', 'popunder.ru', 'popundertotal.com',
  'adexchangeprediction.com', 'adsupply.com', 'adnium.com', 'adsrvmedia.net',
  'oclasrv.com', 'oclaserver.com',
  'adblockanalytics.com', 'tynt.com', 'bebi.com', 'mobtyb.com',
  // Native / recommendation widgets
  'mgid.com', 'taboola.com', 'outbrain.com', 'revcontent.com', 'content-ad.net',
  // Programmatic / display
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adservice.google.com', 'adnxs.com', 'rubiconproject.com', 'pubmatic.com',
  'openx.net', 'criteo.com', 'criteo.net', 'smartadserver.com', 'yieldmo.com',
  '33across.com', 'amazon-adsystem.com', 'media.net', 'inmobi.com',
  'adform.net', 'casalemedia.com', 'indexww.com', 'sharethrough.com',
  'lijit.com', 'sovrn.com', 'teads.tv', 'undertone.com', 'zedo.com',
  // Tracking / analytics typically bundled with the above
  'scorecardresearch.com', 'histats.com', 'mc.yandex.ru', 'hotjar.com',
  'statcounter.com', 'quantserve.com'
];

/**
 * Regex rules for networks that rotate domains. Adsterra serves from
 * random hosts like pl1234567.profitablegatecpm.com, so a domain list
 * cannot keep up; the pattern can.
 */
const REGEX_FILTERS = [
  '^https?://[a-z0-9.-]*(profitable|effective|highperformance)[a-z]*(cpm|format)[a-z]*\\.com/',
  '^https?://[a-z0-9.-]*\\.(onclickmax|onclickperformance|onclicksuper)\\.[a-z]+/',
  '^https?://[a-z0-9.-]*/(popunder|popads|popcash|popmagic)\\d*\\.js(\\?|$)'
];

function buildRules() {
  const rules = [];
  let id = 1;

  // Rule 1: block all sub-resources from ad domains.
  rules.push({
    id: id++,
    priority: 1,
    action: { type: 'block' },
    condition: {
      requestDomains: AD_DOMAINS,
      resourceTypes: SUB_RESOURCE_TYPES
    }
  });

  // Rule 2: block top-level navigation to ad domains. This is what kills a
  // pop-under tab: the new tab opens, then its navigation is blocked.
  rules.push({
    id: id++,
    priority: 1,
    action: { type: 'block' },
    condition: {
      requestDomains: AD_DOMAINS,
      resourceTypes: ['main_frame']
    }
  });

  for (const regexFilter of REGEX_FILTERS) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        regexFilter,
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame', ...SUB_RESOURCE_TYPES]
      }
    });
  }

  return rules;
}

function main() {
  const rules = buildRules();
  const outPath = path.join(__dirname, '..', 'rules', 'ad-networks.json');
  fs.writeFileSync(outPath, JSON.stringify(rules, null, 2) + '\n');
  console.log(`Wrote ${rules.length} rules covering ${AD_DOMAINS.length} domains to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { AD_DOMAINS, REGEX_FILTERS, SUB_RESOURCE_TYPES, buildRules };
