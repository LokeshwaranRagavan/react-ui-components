import * as React from 'react';
import { useCallback, useState } from 'react';
import { IDropDownPopup, ListItemData } from '../../common/types';
import { getValue } from '@syncfusion/react-base';
import { FieldSettingsModel, ScrollEvent, DropdownVirtualProps, T } from '../types';
import { scrollIntoItem } from '@syncfusion/react-lists';
import { getTextValueField } from '../../common/utils';

/**
 * Specifies the properties used by the `useKeyboardNavigation` hook to manage the state and behavior of the DropDownList component.
 *
 * @private
 */
interface KeyboardParams {
    isInteractive: boolean;
    skipDisabledItems: boolean;
    isRemoteData?: boolean
    dataSourceListItems: ListItemData[];
    fields?: FieldSettingsModel;
    onChange: (nextValue: string | number | boolean, currentItem: T, currentText: string,
        e: React.KeyboardEvent<HTMLElement>, prevItem?: T, clearAll?: boolean) => void;
    dropdownbaseRef: React.RefObject<IDropDownPopup | null>;
    showPopup: (e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement> | Event) => void;
    hidePopup: (e?: React.KeyboardEvent<HTMLElement>) => void;
    setIsSpanFocused: (v: boolean) => void;
    prefetchData?: () => Promise<(string | number | boolean | { [key: string]: unknown })[] | null>;
    currentItemData?: string | number | boolean | { [key: string]: unknown } | null;
    onScroll?: (event: ScrollEvent) => void;
    virtualization?: DropdownVirtualProps;
    filterable?: boolean;
    highlightMode?: boolean;
    showSelectAll?: boolean;
    handleSelectAll?: (args: React.SyntheticEvent) => void;
    hasCustomValue?: boolean;
    handleCustomValSelect?: (args: React.KeyboardEvent<HTMLElement>) => void;
    hasChip?: boolean;
    spanClickable?: boolean;
}

/**
 * Specifies the return structure of the `useKeyboardNavigation` hook used in dropdown components.
 *
 * @private
 */
interface KeyboardNavigationReturn {
    keyActionHandler: (e: React.KeyboardEvent<HTMLElement>) => void;
    handleCustomTypeAhead: (text: string) => string | null;
    typeAheadMatchedItem: ListItemData | null;
    isShowSelectAllFocused: boolean;
    isCustomElemFocused: boolean
    setTypeAheadMatchedItem: React.Dispatch<React.SetStateAction<ListItemData | null>>
    setIsCustomElemFocused: React.Dispatch<React.SetStateAction<boolean>>
}

export const useKeyboardNavigation: (params: KeyboardParams) => KeyboardNavigationReturn =
    (params: KeyboardParams): KeyboardNavigationReturn => {
        const {
            isInteractive,
            skipDisabledItems,
            isRemoteData,
            dataSourceListItems,
            fields,
            onChange,
            dropdownbaseRef,
            showPopup,
            hidePopup,
            setIsSpanFocused,
            prefetchData,
            currentItemData,
            onScroll,
            virtualization,
            filterable,
            highlightMode = false,
            showSelectAll,
            handleSelectAll,
            hasCustomValue,
            hasChip,
            handleCustomValSelect,
            spanClickable
        } = params;
        const [typeAheadMatchedItem, setTypeAheadMatchedItem] = useState<ListItemData | null>(null);
        const [isShowSelectAllFocused, setIsShowSelectAllFocused] =
        useState<boolean>(Boolean(showSelectAll) && !typeAheadMatchedItem && !currentItemData);
        const [isCustomElemFocused, setIsCustomElemFocused] = useState<boolean>(false) ;

        const buildListItems: (raw: (string | number | boolean | { [key: string]: unknown; })[]) => ListItemData[] =
            useCallback((raw: (string | number | boolean | { [key: string]: unknown; })[]) => {
                return (raw as (string | number | { [key: string]: unknown })[]).map(
                    (item: string | number | { [key: string]: unknown }) => {
                        const isDisabled: boolean | '' | undefined = fields?.disabled && typeof item === 'object' && getValue(fields.disabled, item) === true;
                        const isHeader: boolean = typeof item === 'object' && !!getValue('isHeader', item);
                        const isMaxDisabled: boolean = dropdownbaseRef.current ?
                            dropdownbaseRef.current?.isItemDisabledByMaxSelection?.(item) : false;
                        return { item, isDisabled: Boolean(isDisabled) || isMaxDisabled, isHeader };
                    }
                );
            }, [fields?.disabled, dropdownbaseRef]);

        const isItemDisabled: (item: ListItemData) => boolean =
            useCallback((item: ListItemData) => {
                if (item?.isHeader) { return true; }
                return Boolean(item?.isDisabled);
            }, []);

        const findNextEnabledItem: (items: ListItemData[], startIndex: number, direction: number) => number = useCallback(
            (items: ListItemData[], startIndex: number, direction: number) => {
                if (!skipDisabledItems) {
                    return Math.max(0, Math.min(items.length - 1, startIndex + direction));
                }
                let index: number = startIndex;
                const maxIterations: number = items.length;
                for (let i: number = 0; i < maxIterations; i++) {
                    index += direction;
                    if (index < 0 || index >= items.length) {
                        break;
                    }
                    if (!isItemDisabled(items[index as number])) {
                        return index;
                    }
                }
                return -1;
            }, [skipDisabledItems, isItemDisabled]);

        const findEdgeEnabledItem: (items: ListItemData[], fromEnd?: boolean) => number = useCallback(
            (items: ListItemData[], fromEnd: boolean = false) => {
                if (!skipDisabledItems) {
                    return fromEnd ? items.length - 1 : 0;
                }
                if (fromEnd) {
                    for (let i: number = items.length - 1; i >= 0; i--) {
                        if (!isItemDisabled(items[i as number])) {
                            return i;
                        }
                    }
                    return -1;
                } else {
                    for (let i: number = 0; i < items.length; i++) {
                        if (!isItemDisabled(items[i as number])) {
                            return i;
                        }
                    }
                    return -1;
                }
            }, [skipDisabledItems, isItemDisabled]);

        const findNearestEnabledItem: (items: ListItemData[], targetIndex: number) => number = useCallback(
            (items: ListItemData[], targetIndex: number) => {
                if (!skipDisabledItems) {
                    return targetIndex;
                }
                if (!isItemDisabled(items[targetIndex as number])) {
                    return targetIndex;
                }
                let forwardIndex: number = targetIndex;
                let backwardIndex: number = targetIndex;
                while (forwardIndex < items.length - 1 || backwardIndex > 0) {
                    if (forwardIndex < items.length - 1) {
                        forwardIndex++;
                        if (!isItemDisabled(items[forwardIndex as number])) {
                            return forwardIndex;
                        }
                    }
                    if (backwardIndex > 0) {
                        backwardIndex--;
                        if (!isItemDisabled(items[backwardIndex as number])) {
                            return backwardIndex;
                        }
                    }
                }
                return -1;
            },
            [skipDisabledItems, isItemDisabled]
        );

        const getItemText: (li: ListItemData) => string = (li: ListItemData) => String(getTextValueField(li.item, 'text', fields) ?? '');

        const findNextByChar: (items: ListItemData[], char: string, startFrom: number) => number =
            (items: ListItemData[], char: string, startFrom: number) => {
                if (!items || items.length === 0 || !char) { return -1; }
                const total: number = items.length;
                let idx: number = Math.max(-1, Math.min(total - 1, startFrom));
                for (let i: number = 0; i < total; i++) {
                    idx = (idx + 1) % total;
                    const it: ListItemData = items[idx as number];
                    if (isItemDisabled(it)) { continue; }
                    if (getItemText(it).toLowerCase().startsWith(char)) { return idx; }
                }
                return -1;
            };

        const triggerOnChangeEvent: (targetItem: ListItemData, e: React.KeyboardEvent<HTMLElement>, prevItem?: ListItemData) => void =
            (targetItem: ListItemData, e: React.KeyboardEvent<HTMLElement>, prevItem?: ListItemData) => {
                const nextValue: string | number | boolean = getTextValueField(targetItem.item, 'value', fields);
                const currentText: string = String(getTextValueField(targetItem.item, 'text', fields) ?? nextValue);
                if (nextValue !== undefined) {
                    onChange(nextValue, targetItem.item, currentText, e, prevItem?.item);
                }
            };

        const getData: () => ListItemData[] = () => {
            const filteredData: string[] | number[] | boolean[] | { [key: string]: object; }[] | null = dropdownbaseRef.current ?
                dropdownbaseRef.current?.getFilteredListData?.() : null;
            return Array.isArray(filteredData) ? buildListItems(filteredData) : dataSourceListItems;
        };

        const getCurrentIndex: (items: ListItemData[]) => number = (items: ListItemData[]) => {
            const currentData: T | ListItemData | null | undefined =
            highlightMode && typeAheadMatchedItem ? typeAheadMatchedItem.item : currentItemData;
            const currValue: string | number | boolean | null = typeof currentData === 'object' && currentData !== null
                ? (getValue(fields?.value ?? 'value', currentData) as string | number | boolean | null)
                : (currentData as string | number | boolean | null);
            const currIndexFromItem: number = items.findIndex((li: ListItemData) => String(getTextValueField(li.item, 'value', fields)) === String(currValue ?? ''));
            return currIndexFromItem !== -1 ? currIndexFromItem : currentData ? currIndexFromItem :  -1;
        };

        const selectItem: ( e: React.KeyboardEvent<HTMLElement>, items: ListItemData[], targetIndex: number, currentIndex: number,
            isPreviewOnly?: boolean) => void = useCallback((e: React.KeyboardEvent<HTMLElement>, items: ListItemData[],
                                                            targetIndex: number, currentIndex: number, isPreviewOnly: boolean = true) => {
            const prev: ListItemData | undefined = currentIndex > -1 ? items[currentIndex as number] : undefined;
            if (isPreviewOnly && highlightMode) {
                setTypeAheadMatchedItem(items[targetIndex as number]);
                setIsShowSelectAllFocused(false);
                setIsCustomElemFocused(false);
            } else {
                triggerOnChangeEvent(items[targetIndex as number], e, prev);
            }

            const isEndReached: boolean = targetIndex >= items.length - 1;
            if (isEndReached && virtualization && onScroll) {
                const startIndex: number = Array.isArray(items) ? items.length : 0;
                const overscan: number = virtualization.overscanCount ?? 5;
                const count: number = virtualization.pageSize + overscan;
                onScroll({originalEvent: (e.nativeEvent as unknown as Event), startIndex, count});
            }
        }, [triggerOnChangeEvent, virtualization, onScroll, highlightMode, setIsShowSelectAllFocused, setIsCustomElemFocused]);

        const handleTypeAhead: (e: React.KeyboardEvent<HTMLElement>) => void = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
            const char: string = e.key.toLowerCase();
            const runOnItems: (items: ListItemData[]) => void = (items: ListItemData[]) => {
                if (items.length === 0) { return; }
                const curr: number = getCurrentIndex(items);
                const matchIdx: number = findNextByChar(items, char, curr);
                if (matchIdx === -1) { return; }
                selectItem(e, items, matchIdx, curr, highlightMode);
                if (dropdownbaseRef.current) {
                    scrollIntoItem(matchIdx, dropdownbaseRef.current?.getScrollContainer?.() as HTMLElement);
                }
            };

            if ((!dataSourceListItems || dataSourceListItems.length === 0) && prefetchData && isRemoteData) {
                fetchData(e);
                return;
            }
            const logicalItems: ListItemData[] = getData();
            if (logicalItems) {
                runOnItems(logicalItems);
            }
        }, [isRemoteData, dataSourceListItems, prefetchData, buildListItems, dropdownbaseRef,
            skipDisabledItems, triggerOnChangeEvent, currentItemData, fields, selectItem, highlightMode]);

        const handleCustomTypeAhead: (text: string) => string | null = useCallback((text: string) => {
            const searchItems: ListItemData[] = getData();
            if (!searchItems || searchItems.length === 0) {
                setTypeAheadMatchedItem(null);
                return null;
            }
            const matchIndex: number = findNextByChar(searchItems, text.toLowerCase(), -1);
            let matchedText: string | null = null;
            if (matchIndex === -1) {
                setTypeAheadMatchedItem(null);
            } else {
                setTypeAheadMatchedItem(searchItems[matchIndex as number]);
                matchedText = String(getTextValueField(searchItems[matchIndex as number].item, 'text', fields));
                if (dropdownbaseRef.current) {
                    scrollIntoItem(matchIndex, dropdownbaseRef.current?.getScrollContainer?.() as HTMLElement);
                }
            }
            return matchedText;
        }, [getData, findNextByChar, setTypeAheadMatchedItem, dropdownbaseRef]);

        const isNavKey: (key: string) => boolean | undefined = (key: string) => key === 'ArrowDown' || key === 'ArrowUp' || key === 'PageUp' || key === 'PageDown' || (spanClickable && (key === 'Home' || key === 'End'));

        const computeNextIndex: (key: string, items: ListItemData[], currentIndex: number) => number =
            useCallback((key: string, items: ListItemData[], currentIndex: number) => {
                if (!highlightMode && typeAheadMatchedItem){
                    const matchedIndex: number = items.findIndex((li: ListItemData) => String(getTextValueField(li.item, 'value', fields)) ===
                        String(getTextValueField(typeAheadMatchedItem.item, 'value', fields)));
                    setTypeAheadMatchedItem(null);
                    return matchedIndex;
                }
                const len: number = items.length;
                switch (key) {
                case 'ArrowDown':
                    return findNextEnabledItem(items, currentIndex, 1);
                case 'ArrowUp':
                    return findNextEnabledItem(items, currentIndex, -1);
                case 'PageDown': {
                    const base: number = currentIndex !== -1 ? currentIndex : 0;
                    const raw: number = Math.max(0, Math.min(len - 1, base + 10));
                    return findNearestEnabledItem(items, raw);
                }
                case 'PageUp': {
                    const base: number = currentIndex !== -1 ? currentIndex : len - 1;
                    const raw: number = Math.max(0, Math.min(len - 1, base - 10));
                    return findNearestEnabledItem(items, raw);
                }
                case 'Home':
                    return findEdgeEnabledItem(items, false);
                case 'End':
                    return findEdgeEnabledItem(items, true);
                default:
                    return currentIndex;
                }
            }, [findNextEnabledItem, findNearestEnabledItem, findEdgeEnabledItem, getTextValueField, typeAheadMatchedItem]);

        const fetchData: (e: React.KeyboardEvent<HTMLElement>) => void = (e: React.KeyboardEvent<HTMLElement>) => {
            prefetchData?.().then((fetched: (string | number | boolean | { [key: string]: unknown; })[] | null) => {
                if (!fetched || fetched.length === 0) {
                    return;
                }
                const tempItems: ListItemData[] = buildListItems(fetched);
                runNavigation(e, tempItems, e.key);
            });
        };

        const runNavigation: (e: React.KeyboardEvent<HTMLElement>, items: ListItemData[], key: string) => void = useCallback(
            (e: React.KeyboardEvent<HTMLElement>, items: ListItemData[], key: string) => {
                if (items.length === 0) { return; }
                let curr: number = getCurrentIndex(items);
                const isUp: boolean = key === 'ArrowUp';
                const isDown: boolean = key === 'ArrowDown';
                if (isShowSelectAllFocused && showSelectAll) {
                    if (isUp){
                        return;
                    }
                    if (isDown){
                        setIsShowSelectAllFocused(false);
                        if (hasCustomValue){
                            setIsCustomElemFocused(true);
                            return;
                        }
                        curr = -1;
                    }
                }
                if (isCustomElemFocused){
                    if (isUp){
                        setIsCustomElemFocused(false);
                        setIsShowSelectAllFocused(true);
                        return;
                    }
                    if (isDown){
                        setIsCustomElemFocused(false);
                        curr = -1;
                    }
                }
                const next: number = computeNextIndex(key, items, curr);
                if (next !== curr && next >= 0 && next < items.length) {
                    selectItem(e, items, next, curr);
                    if (dropdownbaseRef.current) {
                        scrollIntoItem(next, dropdownbaseRef.current?.getScrollContainer?.() as HTMLElement);
                    }
                    return;
                }
                if (isUp && next === -1){
                    if (hasCustomValue) {
                        setIsCustomElemFocused(true);
                        setTypeAheadMatchedItem(null);
                        return;
                    }
                    if (showSelectAll) {
                        setIsCustomElemFocused(false);
                        setIsShowSelectAllFocused(true);
                        setTypeAheadMatchedItem(null);
                        return;
                    }
                }
            }, [computeNextIndex, triggerOnChangeEvent, currentItemData, fields, selectItem, setIsShowSelectAllFocused, showSelectAll,
                setTypeAheadMatchedItem, isShowSelectAllFocused, setIsCustomElemFocused, hasCustomValue, isCustomElemFocused]
        );

        const togglePopup: (e: React.KeyboardEvent<HTMLElement>, isOpen: boolean) => void =
            (e: React.KeyboardEvent<HTMLElement>, isOpen: boolean) => {
                if (isOpen) {
                    showPopup(e);
                    setIsSpanFocused(true);
                    e.preventDefault();
                } else {
                    hidePopup(e);
                }
                setIsSpanFocused(true);
            };

        const keyActionHandler: (e: React.KeyboardEvent<HTMLElement>) => void = useCallback(
            (e: React.KeyboardEvent<HTMLElement>) => {
                if (!isInteractive) {
                    return;
                }
                if (e.altKey) {
                    if (e.key === 'ArrowDown') {
                        togglePopup(e, true);
                        return;
                    }
                    if (e.key === 'ArrowUp') {
                        togglePopup(e, false);
                        e.preventDefault();
                        return;
                    }
                }
                if (e.key === ' ' && !highlightMode) {
                    togglePopup(e, true);
                    return;
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (dropdownbaseRef?.current) {
                        const logicalItems: ListItemData[] = getData();
                        if (!logicalItems) { return; }
                        let curr: number = getCurrentIndex(logicalItems);
                        if (curr === -1 && spanClickable && filterable && logicalItems.length > 0) {
                            curr = findEdgeEnabledItem(logicalItems, false);
                        }
                        if (isShowSelectAllFocused && showSelectAll && handleSelectAll) {
                            handleSelectAll(e);
                            togglePopup(e, false);
                            return;
                        }
                        if (isCustomElemFocused && hasCustomValue && handleCustomValSelect) {
                            handleCustomValSelect(e);
                            togglePopup(e, false);
                            return;
                        }
                        if (typeAheadMatchedItem){
                            curr = logicalItems.findIndex((li: ListItemData) => String(getTextValueField(li.item, 'value', fields)) ===
                        String(getTextValueField(typeAheadMatchedItem.item, 'value', fields)));
                            if (!highlightMode) {
                                setTypeAheadMatchedItem(null);
                            }
                            const filterElement: HTMLInputElement | null | undefined =
                                dropdownbaseRef.current.externalFilterInputRef?.current;
                            if (filterElement) {
                                filterElement.setSelectionRange(filterElement.value.length, filterElement.value.length);
                            }
                        }
                        if (curr >= 0 && curr < logicalItems.length) {
                            selectItem(e, logicalItems, curr, curr, false);
                        }
                        togglePopup(e, false);
                        return;
                    }
                    else {
                        togglePopup(e, true);
                        return;
                    }

                } else if (e.key === 'Tab' || e.key === 'Escape') {
                    if ((e.shiftKey && hasChip && (e.target as HTMLElement)?.dataset.index !== '0') ) {
                        return;
                    }
                    if (e.key === 'Escape' && !dropdownbaseRef?.current && !spanClickable) {
                        setTypeAheadMatchedItem(null);
                        setIsShowSelectAllFocused(false);
                        setIsCustomElemFocused(false);
                        onChange('', {}, '', e, undefined, true);
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    setTypeAheadMatchedItem(null);
                    togglePopup(e, false);
                    if (e.key === 'Tab') {
                        setIsSpanFocused(false);
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const isPrintable: boolean = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
                if (isPrintable && !filterable) {
                    e.preventDefault();
                    handleTypeAhead(e);
                    return;
                }

                if (isNavKey(e.key)) {
                    e.preventDefault();
                    if ((!dataSourceListItems || dataSourceListItems.length === 0) && prefetchData && isRemoteData) {
                        fetchData(e);
                        return;
                    }
                    const logicalItems: ListItemData[] = getData();
                    if (logicalItems) {
                        runNavigation(e, logicalItems, e.key);
                    }
                }
            },
            [isInteractive, dropdownbaseRef, showPopup, hidePopup, setIsSpanFocused, dataSourceListItems, prefetchData, buildListItems,
                runNavigation, isRemoteData, currentItemData, togglePopup, getData, fetchData, typeAheadMatchedItem,
                setTypeAheadMatchedItem, handleCustomTypeAhead, highlightMode, showSelectAll, handleSelectAll, isShowSelectAllFocused,
                setIsShowSelectAllFocused, isCustomElemFocused, hasCustomValue, handleCustomValSelect]
        );

        return { keyActionHandler, handleCustomTypeAhead, typeAheadMatchedItem, setTypeAheadMatchedItem, isShowSelectAllFocused,
            isCustomElemFocused, setIsCustomElemFocused };
    };
