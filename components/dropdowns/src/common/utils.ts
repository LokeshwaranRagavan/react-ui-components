import { getValue, isNullOrUndefined, SortOrder } from '@syncfusion/react-base';
import { FieldSettingsModel } from '../drop-down-list/types';
import { Query } from '@syncfusion/react-data';
import { addSorting, getData, groupDataSource } from '@syncfusion/react-lists';

export const getLastItemData: <T>(itemData: T[] | null) => T | null = <T, >(itemData: T[] | null): T | null => {
    if (!Array.isArray(itemData) || itemData.length === 0) {
        return null;
    }
    return itemData[itemData.length - 1];
};

export const hasItemData: <T>(itemData: T[] | null) => boolean = <T, >(itemData: T[] | null): boolean => {
    return Array.isArray(itemData) && itemData.length > 0;
};

export const compareItemData: <T>(item1: T | null, item2: T | null) => boolean = <T, >(item1: T | null, item2: T | null): boolean => {
    if (item1 == null && item2 == null) {
        return true;
    }
    if (item1 == null || item2 == null) {
        return false;
    }
    try {
        const str1: string = JSON.stringify(item1);
        const str2: string = JSON.stringify(item2);
        return str1 === str2;
    } catch {
        return item1 === item2;
    }
};

export const updateItemData: <T>(currentItemData: T[] | null, newItem: T | T[] | null, multiSelectable: boolean,
    maximumSelectionLength?: number) => T[] | null = <T, >(currentItemData: T[] | null, newItem: T | T[] | null, multiSelectable: boolean,
    maximumSelectionLength: number = 0): T[] | null => {
    if (newItem === null) {
        return [];
    }
    if (multiSelectable) {
        if (Array.isArray(newItem)) {
            if (compareItemData(currentItemData, newItem)) {
                return currentItemData;
            }
            return newItem;
        }
        const itemExists: boolean = currentItemData?.some((item: T) =>
            compareItemData(item, newItem)
        ) || false;
        if (itemExists) {
            return currentItemData?.filter((item: T) =>
                !compareItemData(item, newItem)
            ) || [];
        }
        if (maximumSelectionLength > 0 && currentItemData && currentItemData.length >= maximumSelectionLength) {
            return currentItemData;
        }
        return [...(currentItemData || []), newItem];
    } else {
        return Array.isArray(newItem) ? newItem : [newItem];
    }
};

export const isPrimitive: <T>(value: T) => boolean = <T>(value: T): boolean => {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
};

export const findItem: <T>(value: T, listData: T[], valueField: string) => T | undefined =
    <T>(value: T, listData: T[], valueField: string): T | undefined => {

        if (isNullOrUndefined(listData) || listData.length === 0) { return undefined; }
        const valueStr: string = String(value);
        const firstItem: T = listData[0];
        for (const entry of listData) {
            if (isNullOrUndefined(entry)) { continue; }
            const fieldVal: T = isPrimitive(firstItem) ? entry : getValue(valueField, entry);
            if (!isNullOrUndefined(fieldVal) && compareItemData(String(fieldVal), valueStr)) {
                return entry;
            }
        }
        return undefined;
    };

export const getIndexOfItemData: <T>(itemData: T | null | undefined, listData: T[] | undefined, fields: FieldSettingsModel) => number =
    <T, >(itemData: T | undefined | null, listData: T[] | undefined, fields: FieldSettingsModel): number => {
        if (isNullOrUndefined(itemData) || !Array.isArray(listData) || listData.length === 0) {
            return -1;
        }
        const valueField: string = fields?.value || 'value';
        const targetValue: string = typeof itemData === 'object' ? String(getValue(valueField, itemData)) : String(itemData);
        for (let i: number = 0; i < listData.length; i++) {
            const row: T = listData[i as number];
            if (isNullOrUndefined(row)) { continue; }
            if (typeof row === 'object' && (row as Record<string, unknown>)?.['isHeader']) { continue; }
            if (typeof row === 'object') {
                const rowVal: unknown = getValue(valueField, row);
                if (!isNullOrUndefined(rowVal) && String(rowVal) === targetValue) {
                    return i;
                }
            } else {
                if (String(row) === targetValue) {
                    return i;
                }
            }
        }
        return -1;
    };

export const getTextValueField: <T>(item: T, type: string, fields?: FieldSettingsModel) => string | number | boolean =
    <T>(item: T, type: string, fields?: FieldSettingsModel): string | number | boolean => {
        let valueField: string;
        if (type === 'value') {
            valueField = fields?.value ?? 'value';
        } else {
            valueField = fields?.text ?? 'text';
        }
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return item;
        } else if (typeof item === 'object' && item !== null) {
            return getValue(valueField, item);
        } else {
            return '';
        }
    };

export const splitMatches: (rawText: string, term: string) => { text: string; highlight: boolean; }[] =
    (rawText: string, term: string): Array<{ text: string; highlight: boolean }> => {
        const text: string = rawText ?? '';
        const search: string = (term ?? '').toLowerCase();
        if (!search) { return [{ text, highlight: false }]; }

        const lower: string = text.toLowerCase();
        const parts: Array<{ text: string; highlight: boolean }> = [];
        let i: number = 0;

        while (i < text.length) {
            const idx: number = lower.indexOf(search, i);
            if (idx === -1) {
                parts.push({ text: text.slice(i), highlight: false });
                break;
            }
            if (idx > i) { parts.push({ text: text.slice(i, idx), highlight: false }); }
            parts.push({ text: text.slice(idx, idx + search.length), highlight: true });
            i = idx + search.length;
        }

        return parts;
    };


export const applyMaxSuggestions: <T>(items: T[], maxSuggestions?: number | undefined,
    inputRef?: React.RefObject<HTMLInputElement | null>) => T[] = <T, >(items: T[],
    maxSuggestions?: number, inputRef?: React.RefObject<HTMLInputElement | null>): T[] => {
    if (inputRef?.current && inputRef.current.value?.trim() && typeof maxSuggestions === 'number' && maxSuggestions > 0 && Array.isArray(items)) {
        return items.slice(0, maxSuggestions);
    }
    return items;
};

export const normalizeOperator: <T>(op: T) => 'startsWith' | 'endsWith' | 'contains' = <T>(op: T) => {
    const raw: string = String(op ?? '');
    switch (raw) {
    case 'StartsWith':
        return 'startsWith';
    case 'EndsWith':
        return 'endsWith';
    case 'Contains':
        return 'contains';
    default:
        return 'contains';
    }
};

export const processDataResult: <T>(result: T[], fields: {text?: string | undefined; value?: string | undefined;
    groupBy?: string | undefined; }, sortOrder: SortOrder, query: Query) => T[] = <T, >(  result: T[],
    fields: { text?: string; value?: string; groupBy?: string }, sortOrder: SortOrder, query: Query): T[] => {
    const isPrimitiveArray: boolean = result.length > 0 && (
        typeof result[0] === 'string' || typeof result[0] === 'number' || typeof result[0] === 'boolean'
    );
    if (isPrimitiveArray || !fields.groupBy) {
        if (isPrimitiveArray && sortOrder !== SortOrder.None) {
            const sortedResult: T[] = [...result];
            if (sortOrder === SortOrder.Ascending) {
                sortedResult.sort((a: T, b: T) => String(a).localeCompare(String(b)));
            } else if (sortOrder === SortOrder.Descending) {
                sortedResult.sort((a: T, b: T) => String(b).localeCompare(String(a)));
            }
            return sortedResult;
        } else {
            const sortQuery: Query = addSorting(sortOrder, fields?.text || 'text', query);
            const response: Object | null = getData(result as { [key: string]: Object }[], sortQuery);
            const fullResult: { [key: string]: object; }[] = (response && Array.isArray((response as { result: unknown }).result) ?
                (response as { result: unknown }).result : response) as { [key: string]: object; }[];
            return fullResult as unknown as T[];
        }
    } else {
        return groupDataSource(result as { [key: string]: Object }[], fields, sortOrder) as unknown as T[];
    }
};

export const getResolvedQuery: (query?: Query) => Query = (query?: Query) => {
    return (query || new Query()).clone();
};
