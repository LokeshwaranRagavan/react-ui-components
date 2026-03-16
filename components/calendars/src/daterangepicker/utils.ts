import { MS_PER_DAY } from '../calendar-core/';
import { clampDate, isValidDateObj } from '../calendar/utils';

type Range = [Date | null, Date | null];

export const toDateOrNull: (x: unknown) => Date | null = (x: unknown) =>
    x instanceof Date && !isNaN(x.getTime()) ? x : null;

export const normalizeRange: (value: unknown) => Range = (value: unknown) => {
    if (Array.isArray(value) && value.length >= 2) {
        return [toDateOrNull(value[0]), toDateOrNull(value[1])];
    }
    return [null, null];
};


export const sortRange: (a?: Date | null | undefined, b?: Date | null | undefined)
=> Range = (a: Date | null | undefined, b: Date | null | undefined) => {
    const A: Date | null = toDateOrNull(a);
    const B: Date | null = toDateOrNull(b);
    if (A && B) {
        return A <= B ? [A, B] : [B, A];
    }
    if (A) {
        return [A, null];
    }
    if (B) {
        return [B, null];
    }
    return [null, null];
};

export const getDaySpan: (start: Date, end: Date) => number = (start: Date, end: Date) => {
    const s: number = Math.min(+start, +end);
    const e: number = Math.max(+start, +end);
    return Math.round((e - s) / MS_PER_DAY) + 1;
};

export const isValidInRange: (d: Date | null, min: Date, max: Date) => boolean = (d: Date | null, min: Date, max: Date) =>
    !!(d && !isNaN(d.getTime()) && d >= min && d <= max);

export const isValidRange: (s: Date | null, e: Date | null, minDate: Date, maxDate: Date, minRangeDays?: number, maxRangeDays?: number
) => boolean = (s: Date | null, e: Date | null, minDate: Date, maxDate: Date, minRangeDays?: number, maxRangeDays?: number) => {
    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) {
        return false;
    }
    if (s < minDate || s > maxDate) {
        return false;
    }
    if (e < minDate || e > maxDate) {
        return false;
    }
    const span: number = getDaySpan(s, e);
    if (minRangeDays && span < minRangeDays) {
        return false;
    }
    if (maxRangeDays && span > maxRangeDays) {
        return false;
    }
    return true;
};


export const parseRangeInput: (
    text: string,
    separator: string,
    parseSingle: (s: string) => Date | null
) => Range = (text: string, separator: string, parseSingle: (s: string) => Date | null) => {
    const raw: string = (text || '').trim();
    if (!raw) {
        return [null, null];
    }
    const parts: string[] = raw.split(separator).map((p: string) => p.trim());
    const s: Date | null = parts[0] ? parseSingle(parts[0]) : null;
    const e: Date | null = parts[1] ? parseSingle(parts[1]) : null;
    return sortRange(s, e);
};

export const formatRangeText: (
    r: Range,
    fmtDate: (d: Date) => string,
    separator: string
) => string = (r: Range, fmtDate: (d: Date) => string, separator: string) => {
    const [s, e] = r;
    const S: string = s && isValidDateObj(s) ? fmtDate(s) : '';
    const E: string = e && isValidDateObj(e) ? fmtDate(e) : '';
    if (!S && !E) {
        return '';
    }
    if (!E) {
        return `${S}${separator}`;
    }
    if (!S) {
        return `${separator}${E}`;
    }
    return `${S}${separator}${E}`;
};


export const coerceRangeStrict: (
    r: Range,
    minDate: Date,
    maxDate: Date,
    minRangeDays?: number,
    maxRangeDays?: number
) => Range = (
    r: Range,
    minDate: Date,
    maxDate: Date,
    minRangeDays: number | undefined,
    maxRangeDays: number | undefined
) => {
    let [s, e] = sortRange(r[0], r[1]);
    if (!s || !isValidDateObj(s)) {
        return [null, null];
    }
    s = clampDate(s, minDate, maxDate);
    if (!e || !isValidDateObj(e)) {
        return [s, e];
    }
    e = clampDate(e, minDate, maxDate);
    const span: number = getDaySpan(s, e);
    if (typeof minRangeDays === 'number' && span < minRangeDays) {
        const target: Date = new Date(s);
        target.setDate(s.getDate() + (minRangeDays - 1));
        e = clampDate(target, minDate, maxDate);
    }
    if (typeof maxRangeDays === 'number' && span > maxRangeDays) {
        const target: Date = new Date(s);
        target.setDate(s.getDate() + (maxRangeDays - 1));
        e = clampDate(target, minDate, maxDate);
    }
    return sortRange(s, e);
};
