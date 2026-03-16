import { useCallback, useLayoutEffect, useRef } from 'react';
import { DataManager } from '@syncfusion/react-data';
import { getValue, isNullOrUndefined } from '@syncfusion/react-base';
import type { IDropDownPopup, ListItemData } from '../../common/types';
import { FieldSettingsModel, T } from '../types';
import { compareItemData, updateItemData, isPrimitive } from '../../common/utils';

/**
 * Specifies the properties used by the `useValueSync` hook to manage the state and behavior of the DropDownList component.
 *
 * @private
 */
interface UseValueSyncProps {
    value?: number | string | boolean | object | null;
    defaultValue?: number | string | boolean | object | null;
    dataSource?: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[];
    dataSourceListItems?: ListItemData[];
    fields: FieldSettingsModel;
    isValueControlled?: boolean;
    allowObjectBinding?: boolean;
    dropdownbaseRef?: React.RefObject<IDropDownPopup | null>;
    dropdownValue?: (number | string | boolean | { [key: string]: unknown })[] | null
    setDropdownValue: (v: (number | string | boolean | { [key: string]: unknown })[] | null) => void;
    setTextValue: (v: string) => void;
    setItemData?: (v: (string | number | boolean | { [key: string]: unknown })[] | null) => void;
    prefetchData?: () => Promise<(string | number | boolean | { [key: string]: unknown })[] | null>;
    spanClickable?: boolean;
    customValue?: boolean;
    multiSelectable?: boolean;
    itemData?: (string | number | boolean | { [key: string]: unknown })[] | null;
}

export const useValueSync: (props: UseValueSyncProps) => void = (props: UseValueSyncProps): void => {
    const { value, defaultValue, dataSource, dataSourceListItems, fields, isValueControlled, allowObjectBinding,
        dropdownbaseRef, dropdownValue, setDropdownValue, setTextValue, setItemData, prefetchData,
        spanClickable, customValue, multiSelectable, itemData } = props;

    const prevDefaultRef: React.RefObject<number | string | boolean | object |
    null | undefined> = useRef<number | string | boolean | object | null | undefined>(defaultValue);
    const ranOnceRef: React.RefObject<boolean> = useRef<boolean>(false);
    const prevDataSourceRef: React.RefObject<unknown> = useRef<unknown>(dataSource);

    const setFallback: (val: T[] | T | null) => void = useCallback((val: T[] | T | null): void => {
        const values: T[] = Array.isArray(val) ? val : (val !== null ? [val] : []);
        if (values.length === 0) {
            setTextValue('');
            return;
        }
        if (Array.isArray(dataSource)) {
            const first: unknown = dataSource[0];
            const isStringArray: boolean = typeof first === 'string' || dataSource.length === 0;
            for (const candidate of values) {
                if (isStringArray && typeof candidate === 'boolean') {
                    setTextValue('');
                    return;
                } else if (typeof first === 'object' && !allowObjectBinding) {
                    return;
                }
            }
        }
        const textValues: string[] = [];
        const textField: string | undefined = (fields as FieldSettingsModel)?.text;
        for (const candidate of values) {
            const objectValue: string = textField && candidate && typeof candidate === 'object' ? String((candidate as Record<string, unknown>)[textField as string]) : '';
            const textValue: string = isPrimitive(candidate) ? String(candidate) : (allowObjectBinding && textField ? String(objectValue) : '');
            textValues.push(textValue);
        }
        const finalText: string = multiSelectable ? '' : (textValues[0] || '');
        setTextValue(finalText);

    }, [dataSource, isPrimitive, setTextValue, allowObjectBinding, fields?.text, multiSelectable]);

    const getLookupValue: (candidate: unknown) => string | number | boolean | null = useCallback(
        (candidate: unknown): string | number | boolean | null => {
            const valueField: string | undefined = (spanClickable === false && !multiSelectable  && fields?.text) ?
                fields?.text : fields?.value;
            if (allowObjectBinding && candidate && typeof candidate === 'object' && valueField) {
                const value: unknown = (candidate as Record<string, unknown>)[valueField as string];
                return (value as string | number | boolean);
            }
            return (candidate as string | number | boolean | null);
        },
        [allowObjectBinding, fields?.value, fields?.text, spanClickable]
    );

    const getTextFromData: (values: T[] | T, dataSourceListItems: ListItemData[] | undefined) => string =
    useCallback((values: T[] | T, dataSourceListItems: ListItemData[] | undefined) => {
        const valuesArray: T[] = Array.isArray(values) ? values : [values];
        const valueField: string | undefined = (spanClickable === false && !multiSelectable && fields?.text) ? fields?.text : fields?.value;
        if (!dataSourceListItems || dataSourceListItems.length === 0 || !valueField) {
            return valuesArray[0]?.toString() || '';
        }
        const matchedItems: T[] = [];
        const textValues: string[] = [];
        for (const searchValue of valuesArray) {
            for (let i: number = 0; i < dataSourceListItems.length; i++) {
                const itemValue: unknown = getValue(valueField, dataSourceListItems[i as number].item);

                if (String(itemValue) === String(searchValue)) {
                    const itemText: unknown = getValue((fields.text || fields.value) as string, dataSourceListItems[i as number].item);
                    matchedItems.push(dataSourceListItems[i as number].item as T);
                    textValues.push(String(itemText));
                    break;
                }
            }
        }
        if (matchedItems.length > 0) {
            const itemsToUpdate: T[] | T = multiSelectable ? matchedItems : matchedItems[0];
            setItemData?.(updateItemData(itemData as string[], itemsToUpdate as unknown as string, Boolean(multiSelectable)));
        }

        const finalText: string = multiSelectable ? '' : (textValues[0] || valuesArray[0]?.toString() || '');
        return finalText;

    }, [fields?.value, fields?.text, spanClickable, multiSelectable, setItemData, itemData]);

    const handleArrayDataSource: ( source: T[], val: T[] | T | null) => boolean =
    useCallback((source: T[], val: T[] | T | null): boolean => {
        if (!Array.isArray(source) || isNullOrUndefined(val)) { return false; }
        const values: T[] = Array.isArray(val) ? val : [val];
        const isPrimitiveArray: boolean = source.length > 0 && isPrimitive(source[0]);
        const valueField: string | undefined = (spanClickable === false && !multiSelectable && fields?.text) ? fields?.text : fields?.value;
        const textField: string | undefined = fields?.text as string | undefined;
        const indexMap: Map<string, number> = new Map();
        source.forEach((item: T, index: number) => {
            const key: string = isPrimitiveArray ? String(item) : (valueField ? String(getValue(valueField, item)) : '');
            indexMap.set(key, index);
        });
        const matchedItems: T[] = [];
        const textValues: string[] = [];

        for (const candidate of values) {
            const idx: number = indexMap.get(String(candidate)) ?? -1;
            if (idx !== -1) {
                const item: T = source[idx as number];
                matchedItems.push(item);
                const text: string = isPrimitiveArray ? String(item) : (textField ? String(getValue(textField, item)) : String(candidate));
                textValues.push(text);
            } else {
                return false;
            }
        }

        const itemsToUpdate: T[] | T = multiSelectable ? matchedItems : matchedItems[0];
        const textToSet: string = multiSelectable ? '' : (textValues[0] || matchedItems[0]?.toString() || '');
        setTextValue(textToSet);
        setItemData?.(updateItemData(itemData as string[], itemsToUpdate as unknown as string, Boolean(multiSelectable)));
        return true;
    }, [fields?.value, fields?.text, isPrimitive, setTextValue, spanClickable, setItemData, multiSelectable, itemData]);

    const applyCustomOrFallback: (candidate: number | string | boolean | object | null | undefined) => void =
        useCallback((candidate: number | string | boolean | object | null | undefined): void => {
            if (customValue) {
                const text: string = isPrimitive(candidate) ? String(candidate) : (allowObjectBinding && fields?.text ?
                    String((candidate as Record<string, unknown>)[fields.text as string]) : String(candidate));
                setTextValue(multiSelectable ? '' : text);
                setItemData?.(updateItemData(itemData as string[], candidate as string, Boolean(multiSelectable)));
            } else {
                setFallback(candidate as number | string | boolean | object);
            }
        }, [customValue, isPrimitive, allowObjectBinding, fields?.text, setTextValue, itemData, setItemData, setFallback, multiSelectable]);

    useLayoutEffect(() => {
        if (isValueControlled) {
            const candidate: string | number | boolean | object | null | undefined = value;
            if (!isNullOrUndefined(candidate) && (!Array.isArray(candidate) || candidate.length > 0)) {
                if (compareItemData(dropdownValue, candidate)){ return; }
                setDropdownValue(updateItemData(dropdownValue as string[], candidate as string, Boolean(multiSelectable)));
                const ds: { [key: string]: unknown; }[] | DataManager | string[] | number[] | boolean[] | undefined =
                dropdownbaseRef?.current ? dropdownbaseRef?.current?.getFilteredListData() : dataSource;
                if (ds && Array.isArray(ds)) {
                    if (!handleArrayDataSource( ds as Array<string | number | boolean | { [key: string]: object }>,
                                                candidate as number | string | boolean | object )) {
                        applyCustomOrFallback(candidate);
                    }
                } else if (ds instanceof DataManager) {
                    const lookupVal: string | number | boolean | null = getLookupValue(candidate);
                    if (!isNullOrUndefined(lookupVal)) {
                        let text: string = dropdownbaseRef?.current?.getTextByValue?.(lookupVal as string | number | boolean) ?? '';
                        if (text === '' && !dropdownbaseRef?.current) {
                            if (dataSourceListItems && dataSourceListItems.length > 0){
                                text = getTextFromData(lookupVal as string | number | boolean, dataSourceListItems);
                            }
                            else if (prefetchData) {
                                prefetchData().then((fetched: (string | number | boolean | { [key: string]: unknown; })[] | null) => {
                                    if (!fetched || fetched.length === 0) { return; }
                                    if (!handleArrayDataSource( fetched as Array<string | number | boolean | { [key: string]: object }>,
                                                                candidate as number | string | boolean | object)) {
                                        applyCustomOrFallback(candidate);
                                    }
                                });
                            }

                        }
                        setTextValue(multiSelectable ? '' : text);
                    } else {
                        setTextValue('');
                    }
                }
            }
            else {
                if (!multiSelectable) {
                    {setTextValue(''); }
                }
                setItemData?.(updateItemData(itemData as string[], null, Boolean(multiSelectable)));
            }
            return;
        }

        if (!ranOnceRef.current || !compareItemData(prevDefaultRef.current, defaultValue) ||
        !compareItemData(prevDataSourceRef.current, dataSource)) {
            const candidate: number | string | boolean | object | null | undefined = (value != null ? value : defaultValue)
            ?? (dropdownValue && dropdownValue.length > 0 ? dropdownValue[0] : null);
            if (!isNullOrUndefined(candidate)) {
                setDropdownValue(updateItemData(dropdownValue as string[], candidate as string, Boolean(multiSelectable)));
                if (dataSource && Array.isArray(dataSource)) {
                    if (!handleArrayDataSource( dataSource as Array<string | number | boolean | { [key: string]: object }>,
                                                candidate as number | string | boolean | object
                    )) {
                        applyCustomOrFallback(candidate);
                    }
                } else if (dataSource instanceof DataManager) {
                    if (prefetchData) {
                        prefetchData().then((fetched: (string | number | boolean | { [key: string]: unknown; })[] | null) => {
                            if (!fetched || fetched.length === 0) { return; }
                            if (!handleArrayDataSource( fetched as Array<string | number | boolean | { [key: string]: object }>,
                                                        candidate as number | string | boolean | object)) {
                                applyCustomOrFallback(candidate);
                            }
                        });
                    }
                }
            } else {
                setTextValue('');
            }
            ranOnceRef.current = true;
            prevDefaultRef.current = defaultValue;
            prevDataSourceRef.current = dataSource as unknown;
        }
    }, [isValueControlled, value, defaultValue, dataSource, fields?.value, fields?.text,
        handleArrayDataSource, setDropdownValue, setFallback, setTextValue, multiSelectable, dropdownValue]);
};
