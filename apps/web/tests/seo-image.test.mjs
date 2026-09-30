import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeSeoLocale,
  resolveSeoImage,
} from '../src/lib/front-experience/seo-image.mjs';

test('normalizeSeoLocale accepts BCP-47 and underscore tags', () => {
  assert.equal(normalizeSeoLocale('zh-CN'), 'zh_CN');
  assert.equal(normalizeSeoLocale('en-US'), 'en_US');
  assert.equal(normalizeSeoLocale('en'), 'en');
  assert.equal(normalizeSeoLocale('zh'), 'zh_CN');
  assert.equal(normalizeSeoLocale(null), 'zh_CN');
  assert.equal(normalizeSeoLocale(''), 'zh_CN');
});

test('resolveSeoImage prefers locale map then fallback image', () => {
  const seo = {
    image: '/brand/help-share.png',
    images: {
      zh_CN: '/brand/help-share.zh_CN.png',
      en: '/brand/help-share.en.png',
    },
  };

  assert.equal(resolveSeoImage(seo, 'zh-CN'), '/brand/help-share.zh_CN.png');
  assert.equal(resolveSeoImage(seo, 'en'), '/brand/help-share.en.png');
  assert.equal(resolveSeoImage(seo, 'en-GB'), '/brand/help-share.en.png');
  assert.equal(resolveSeoImage({ image: '/brand/help-share.png' }, 'fr'), '/brand/help-share.png');
  assert.equal(resolveSeoImage({}, 'zh_CN'), undefined);
});
