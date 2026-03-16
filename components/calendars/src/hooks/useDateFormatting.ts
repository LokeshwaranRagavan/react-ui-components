import { useCallback, useMemo } from 'react';
import { formatDate } from '@syncfusion/react-base';
import { parseInputValueDate } from '../datepicker/utils';

export interface UseDateFormattingOptions {
    locale?: string;
    type: 'date' | 'dateTime';
    format?: string;
    inputFormats?: string[] | undefined;
}

export interface UseDateFormattingResult {
    formatValue: (d: Date) => string;
    parseInput: (raw: string) => Date | null;
}

export default function useDateFormatting(opts: UseDateFormattingOptions): UseDateFormattingResult {
    const { locale, type, format, inputFormats } = opts;

    const inputFormatsString: string[] = useMemo(() => {
        if (!inputFormats || inputFormats.length === 0) {
            return [];
        }
        return inputFormats
            .map((f: string) => (typeof f === 'string' ? f : ''))
            .filter(Boolean);
    }, [inputFormats]);

    const formatValue: (d: Date) => string = useCallback((d: Date): string => {
        if (!d || isNaN(d.getTime())) {
            return '';
        }
        try {
            return formatDate(d, {
                locale: locale || 'en-US',
                format: format,
                type
            });
        } catch {
            return '';
        }
    }, [locale, format, type]);

    const parseInput: (raw: string) => Date | null = useCallback((raw: string): Date | null => {
        const valueText: string = raw?.trim();
        if (!valueText) {
            return null;
        }
        const hasFormats: boolean = Boolean(format) || (inputFormatsString && inputFormatsString.length > 0);
        if (hasFormats) {
            const parsed: Date | null = parseInputValueDate(valueText, {
                locale,
                format,
                inputFormatsString
            });
            if (parsed && !isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        if (type === 'dateTime') {
            const normalized: string = valueText.replace(/(am|pm)/gi, (s: string) => s.toUpperCase());
            const ctor: Date = new Date(normalized);
            return isNaN(ctor.getTime()) ? null : ctor;
        }
        return null;
    }, [locale, format, type, inputFormatsString]);

    return { formatValue, parseInput };
}
