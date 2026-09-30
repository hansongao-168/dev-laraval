import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  localeFromAcceptLanguage,
  pickLocaleCandidate,
} from '../src/lib/front-experience/seo-locale.mjs';

test('pickLocaleCandidate prefers first non-empty value', () => {
  assert.equal(pickLocaleCandidate(null, '', 'en-US', 'zh-CN'), 'en_US');
  assert.equal(pickLocaleCandidate(undefined, null), 'zh_CN');
});

test('localeFromAcceptLanguage picks highest q', () => {
  assert.equal(localeFromAcceptLanguage('en-US,en;q=0.9,zh-CN;q=0.8'), 'en_US');
  assert.equal(localeFromAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8'), 'zh_CN');
  assert.equal(localeFromAcceptLanguage('en;q=0.5,zh-CN;q=0.9'), 'zh_CN');
  assert.equal(localeFromAcceptLanguage(''), null);
  assert.equal(localeFromAcceptLanguage(null), null);
});
