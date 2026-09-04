import { describe, expect, it } from 'vitest';
import { escapeHtml, fmt, fmt2 } from '../src/utils/format.js';

describe('formatting', () => {
    it('rounds to whole dollars', () => {
        expect(fmt(1234.56)).toBe('1,235');
        expect(fmt(0)).toBe('0');
    });

    it('keeps cents', () => {
        expect(fmt2(1234.5)).toBe('1,234.50');
        expect(fmt2(-4.5)).toBe('-4.50');
    });
});

describe('escapeHtml', () => {
    it('neutralises markup in user-supplied text', () => {
        expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('escapes quotes and ampersands', () => {
        expect(escapeHtml(`Ben & Jerry's "Half Baked"`)).toBe('Ben &amp; Jerry&#39;s &quot;Half Baked&quot;');
    });

    it('renders nullish values as empty', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('leaves ordinary text alone', () => {
        expect(escapeHtml('Coffee')).toBe('Coffee');
    });
});
