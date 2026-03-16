import * as React from 'react';
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo, useCallback, Ref, JSX } from 'react';
import { DataManager, Query, DataOptions, QueryOptions } from '@syncfusion/react-data';
import { getValue, IL10n, isNullOrUndefined, L10n, Size, useProviderContext } from '@syncfusion/react-base';
import { ListItems, SelectEvent, DataSource, GetItemPropsOptions, scrollIntoItem, FieldsMapping, ScrollEvent, GroupedData } from '@syncfusion/react-lists';
import { InputBase, renderClearButton } from '@syncfusion/react-inputs';
import { useFilter } from '../drop-down-list/hooks/useFilter';
import { DropDownPopupClassList, DropDownPopupProps, IDropDownPopup } from './types';
import {ScrollMode, FieldSettingsModel, SortOrder, T} from '../drop-down-list/types';
import Header from './header';
import Footer from './footer';
import NoRecords from './no-records';
import ErrorMessage from './error-message';
import { Spinner } from '@syncfusion/react-popups';
import { compareItemData, getLastItemData, getTextValueField, isPrimitive, applyMaxSuggestions, getIndexOfItemData, normalizeOperator, processDataResult, getResolvedQuery } from './utils';

const defaultMappedFields: FieldSettingsModel = {
    text: 'text',
    value: 'value',
    disabled: 'disabled',
    groupBy: undefined,
    htmlAttributes: 'htmlAttributes'
};

const DropDownPopupClasses: DropDownPopupClassList = {
    root: 'sf-dd-base',
    content: 'sf-content',
    selected: 'sf-active',
    focus: 'sf-item-focus',
    li: 'sf-list-item',
    disabled: 'sf-disabled',
    grouping: 'sf-dd-group',
    hover: 'sf-hover',
    noData: 'sf-dd-nodata'
};

type IDropDownPopupProps = DropDownPopupProps & Omit<React.HTMLAttributes<HTMLDivElement>, keyof DropDownPopupProps>;

/**
 * DropDownPopup provides core functionality for dropdown-type components
 */
export const DropDownPopup: React.ForwardRefExoticComponent<IDropDownPopupProps & React.RefAttributes<IDropDownPopup>> =
    forwardRef<IDropDownPopup, IDropDownPopupProps>((props: IDropDownPopupProps, ref: Ref<IDropDownPopup>) => {
        const {
            dataSource = [],
            fields = defaultMappedFields,
            query,
            isDropdownFiltering = false,
            filterPlaceholder = '',
            ignoreCase,
            ignoreAccent,
            filterType = 'StartsWith',
            size = Size.Medium,
            itemTemplate,
            groupTemplate,
            headerTemplate,
            footerTemplate,
            sortOrder = SortOrder.None,
            noRecordsTemplate,
            onErrorTemplate,
            id,
            debounceDelay = 0,
            remoteCacheRef,
            itemData,
            virtualization,
            focusedItem,
            externalFilterInputRef,
            maxSuggestions,
            forceFilterOnOpen,
            maximumSelectionLength = 0,
            hideSelectedItem,
            customValueNode,
            selectAllNode,
            onError,
            onItemClick,
            onFilter,
            keyActionHandler,
            onDataRequest,
            onPopupDataLoad,
            onScroll
        } = props;

        const { locale } = useProviderContext();
        const localeStrings: Record<string, string> = {
            noRecordsMessage: 'No Records Found',
            errorMessage: 'Request Failed'
        };
        const l10nInstance: IL10n = L10n('dropdownList', localeStrings, locale || 'en-US');
        const baseQuery: Query = getResolvedQuery(query) ?? new Query();
        const [listData, setListDatas] = useState<{ [key: string]: object }[] | boolean[] | string[] | number[]>([]);
        const [isRequesting, setIsRequesting] = useState<boolean>(false);
        const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);
        const [typedString, setTypedString] = useState<string>('');
        const [isActionFailed, setIsActionFailed] = useState<boolean>(false);

        const listItemsRef: React.RefObject<(HTMLLIElement | null)[]> = useRef<(HTMLLIElement | null)[]>([]);
        const filterInputElementRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);
        const typedStringRef: React.RefObject<string> = useRef(typedString);
        const containerRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);
        const filterTimerRef: React.RefObject<number | null> = React.useRef<number | null>(null);
        const initialDataSourceRef: React.RefObject<string | null> = React.useRef<string | null>(null);
        const filterCacheRef: React.RefObject<Array<{ [key: string]: unknown } | string | number | boolean>> =
            React.useRef<Array<{ [key: string]: unknown } | string | number | boolean>>([]);
        const listBaseKey: React.RefObject<number> = React.useRef<number>(0);
        const isRequestingRef: React.RefObject<boolean> = useRef(false);
        const setRequesting: (val: boolean) => void = useCallback((val: boolean) => {
            isRequestingRef.current = val;
            setIsRequesting(val);
        }, []);

        const getQuery: (newQuery?: Query) => Query = useCallback((newQuery?: Query): Query => {
            let filterQuery: Query;
            if (isDropdownFiltering) {
                filterQuery = getResolvedQuery(newQuery);
                const currentText: string = typedStringRef.current ?? '';
                if (currentText !== '') {
                    const filteringType: 'startsWith' | 'endsWith' | 'contains' = normalizeOperator(filterType);
                    const dataType: string | null =
                    typeOfData(dataSource as (string | number | boolean | { [key: string]: object })[]).typeof;
                    const isPrimitive: boolean = !(dataSource instanceof DataManager) && (dataType === 'string' || dataType === 'number' || dataType === 'boolean');
                    if (isPrimitive) {
                        filterQuery.where('', filteringType, currentText, ignoreCase, ignoreAccent);
                    } else {
                        const field: string = (fields?.text) ? fields.text : 'text';
                        filterQuery.where(field, filteringType, currentText, ignoreCase, ignoreAccent);
                    }
                }
            } else {
                filterQuery = getResolvedQuery(newQuery);
            }
            return getResolvedQuery(filterQuery);
        }, [query, isDropdownFiltering, filterType, ignoreCase, ignoreAccent, fields]);

        const computedNonHiddenItems: T[] = useMemo(() => {
            if (!hideSelectedItem || !isDataInitialized || !Array.isArray(itemData) || itemData.length === 0) {
                return listData as T[];
            }
            const data: T[] = (listData as T[]) ?? [];
            const isItemSelected: (candidate: T) => boolean = (candidate: T): boolean => {
                for (let i: number = 0; i < itemData.length; i++) {
                    if (compareItemData(candidate, itemData[i as number] as T)) { return true; }
                }
                return false;
            };
            const nonHidden: T[] = [];
            for (let i: number = 0; i < data.length; i++) {
                const item: T & Partial<GroupedData> = data[i as number] as T & Partial<GroupedData>;
                let selected: boolean = isItemSelected(item as T);
                if (item?.isHeader) {
                    const children: T[] = Array.isArray(item.items) ? (item.items as T[]) : [];
                    if (children.length === 0) {
                        selected = true;
                    } else {
                        const selectedChild: T[] = [];
                        for (let j: number = 0; j < children.length; j++) {
                            if (isItemSelected(children[j as number])) {
                                selectedChild.push(children[j as number]);
                            }
                        }
                        selected = selectedChild.length === children.length;
                    }
                }

                if (!selected) { nonHidden.push(item as T); }
            }
            return nonHidden;
        }, [hideSelectedItem, isDataInitialized, itemData, listData, compareItemData]);

        const processAndSetData: (result: (string | number | boolean | {[key: string]: object; })[]) => void =
        useCallback((result: Array<{ [key: string]: object } | string | number | boolean>): void => {
            if (!isDataInitialized) {
                setIsDataInitialized(true);
            }
            const processed: (string | number | boolean | {[key: string]: Object; })[] =
            processDataResult(result, fields, sortOrder, query ?? new Query());
            setListDatas(processed as {[key: string]: Object; }[]);
        }, [fields, sortOrder, query, isDataInitialized]);

        const ensureValueInDatasource: (selected: string | number | boolean | {[key: string]: unknown; }) => void =
        useCallback((selected: { [key: string]: unknown } | string | number | boolean): void => {
            if (dataSource instanceof DataManager !== true || !remoteCacheRef?.current || !selected) { return; }
            const cache: T[] = Array.from(remoteCacheRef?.current) ;
            const isPrimitive: boolean = typeof selected === 'string' || typeof selected === 'number' || typeof selected === 'boolean';
            const selectedValue: string = String(isPrimitive ? selected as string | number | boolean :
                getValue(fields.value as string, selected as { [key: string]: unknown })) ;
            const exists: boolean = cache.some((data: T) => String(isPrimitive ?
                typeof data !== 'object' && data : typeof data === 'object' && getValue(fields.value as string, data)) === selectedValue);
            if (!exists) {
                cache.push(selected as { [key: string]: unknown } | string | number | boolean);
                remoteCacheRef.current = cache as Array<{ [key: string]: unknown } | string | number | boolean>;
            }
        }, [fields, remoteCacheRef]);

        const setListData: (dataSource: { [key: string]: unknown }[] | string[] | number[] | DataManager | boolean[],
            query?: Query, fromFilter?: boolean, typedText?: string) => void = useCallback((  dataSource: { [key: string]: unknown }[] |
        string[] | number[] | DataManager | boolean[], query?: Query, fromFilter?: boolean, typedText?: string ): void => {
            if (fromFilter && dataSource instanceof DataManager && virtualization &&
                virtualization.scrollMode === ScrollMode.FetchViewPort) {
                fetchRemoteVirtualData(dataSource, getResolvedQuery(query), fromFilter, typedText);
                return;
            }
            let filteredDataSource: typeof dataSource;
            if (Array.isArray(dataSource)) {
                filteredDataSource = dataSource.filter((item: string | number | boolean | { [key: string]: unknown }) =>
                    item !== null && item !== undefined) as typeof dataSource;
            } else {
                filteredDataSource = dataSource;
            }
            typedStringRef.current = typedText ?? '';
            const eventArgs: { data: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[],
                query: Query | undefined} = { data: filteredDataSource, query: getResolvedQuery(query) };

            if (filteredDataSource instanceof DataManager) {
                const data: DataManager = filteredDataSource as DataManager;

                if (isDropdownFiltering && !fromFilter && itemData){
                    for (const item of itemData) {
                        ensureValueInDatasource(item);
                    }
                }
                if (remoteCacheRef?.current && !fromFilter) {
                    const cached: T[] = remoteCacheRef.current;
                    const localData: DataManager = new DataManager(cached as DataOptions | JSON[]);
                    const localQuery: Query = eventArgs.query ? eventArgs.query : getQuery(new Query());
                    if (localQuery.queries.some((q: QueryOptions) => q.fn === 'onTake')) {
                        localQuery.queries = localQuery?.queries?.filter((item: QueryOptions) => item.fn !== 'onTake');
                        localQuery.take(cached.length);
                    }
                    const result: unknown = localQuery.executeLocal(localData);
                    const listItems: { [key: string]: object; }[]  = (result && Array.isArray((result as {result: unknown}).result) ?
                        (result as {result: unknown}).result : result) as { [key: string]: object; }[];
                    const args: {data: {[key: string]: object; }[]; } = { data: listItems };
                    onPopupDataLoad?.(args);
                    processAndSetData(args.data);
                    return;
                }

                if (!isRequesting) {
                    onDataRequest?.({ data: eventArgs.data, query: query ? eventArgs.query as Query : getQuery(new Query()) });
                    setIsRequesting(true);
                    setIsActionFailed(false);
                    data.executeQuery(eventArgs.query ? eventArgs.query : getQuery(new Query()))
                        .then((e: unknown) => {
                            const fullResult: { [key: string]: object; }[]  = (e && Array.isArray((e as {result: unknown}).result) ?
                                (e as {result: unknown}).result : []) as { [key: string]: object; }[];
                            if (remoteCacheRef && !fromFilter) {
                                remoteCacheRef.current = fullResult;
                            }

                            if (!(e as {cancel: boolean}).cancel) {
                                const args: {data: {[key: string]: object; }[]; } = {
                                    data: (e as {result: unknown}).result as { [key: string]: object; }[]};
                                args.data = applyMaxSuggestions(args.data, maxSuggestions, externalFilterInputRef);
                                onPopupDataLoad?.(args, fromFilter);
                                processAndSetData(args.data);
                            }
                            setIsRequesting(false);
                            setIsActionFailed(false);
                        })
                        .catch((error: object) => {
                            setIsRequesting(false);
                            setIsActionFailed(true);
                            setIsDataInitialized(false);
                            onError?.(error as Error);
                        });
                }
            } else {
                const dataManager: DataManager = new DataManager(eventArgs.data as DataOptions | JSON[]);
                let listItems: { [key: string]: object }[] =
                    getQuery(eventArgs.query || new Query()).executeLocal(dataManager) as { [key: string]: object }[];
                listItems = applyMaxSuggestions(listItems, maxSuggestions, externalFilterInputRef);
                const args: {data: {[key: string]: object; }[]; } = {data: listItems};
                onPopupDataLoad?.(args);
                processAndSetData(args.data);
                setIsRequesting(false);
                setIsActionFailed(false);
            }
        }, [isRequesting, getQuery, sortOrder, onError, onErrorTemplate, onDataRequest, onPopupDataLoad, processAndSetData,
            ensureValueInDatasource]);

        const fetchRemoteVirtualData: (dataSource: DataManager, query: Query, fromFilter?: boolean, typedText?: string,
            fromScroll?: boolean) => Promise<void> = useCallback(async(dataSource: DataManager, query: Query, fromFilter?: boolean,
                                                                       typedText?: string, fromScroll?: boolean ): Promise<void> => {
            if (fromFilter) {
                filterCacheRef.current = [];
            }
            typedStringRef.current = typedText ?? '';
            const eventArgs: { data: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[],
                query: Query } = { data: dataSource, query: query };
            const data: DataManager = dataSource as DataManager;
            if (isDropdownFiltering && !fromFilter && itemData){
                for (const item of itemData) {
                    ensureValueInDatasource(item);
                }
            }
            const currentFilter: HTMLInputElement | null = externalFilterInputRef?.current ?? filterInputElementRef?.current;
            const isFilteringActive: boolean = Boolean(isDropdownFiltering && currentFilter?.value);
            if (fromFilter && virtualization && isFilteringActive) {
                const initialTake: number = virtualization.pageSize + (virtualization.overscanCount ?? 5);
                const filterQuery: Query = getQuery(new Query()).skip(0).take(initialTake).requiresCount();
                if (!isRequestingRef.current) {
                    onDataRequest?.({ data: eventArgs.data, query: filterQuery });
                    setRequesting(true);
                    setIsActionFailed(false);
                    await data.executeQuery(filterQuery)
                        .then((e: unknown) => {
                            const fullResult: { [key: string]: object; }[] = (e && Array.isArray((e as {result: unknown}).result)
                                ? (e as {result: unknown}).result : []) as { [key: string]: object; }[];
                            filterCacheRef.current = filterCacheRef.current.concat(fullResult);
                            listBaseKey.current ++;
                            const args: {data: {[key: string]: object; }[]; } = {
                                data: applyMaxSuggestions(fullResult, maxSuggestions, externalFilterInputRef)};
                            onPopupDataLoad?.(args, fromFilter);
                            processAndSetData(filterCacheRef.current as { [key: string]: object }[]);
                            setRequesting(false);
                            setIsActionFailed(false);
                        })
                        .catch((error: object) => {
                            setRequesting(false);
                            setIsActionFailed(true);
                            setIsDataInitialized(false);
                            onError?.(error as Error);
                        });
                }
                return;
            }
            if (remoteCacheRef?.current && !fromScroll) {
                const cached: (string | number | boolean | {[key: string]: unknown; })[] = remoteCacheRef.current as string[];
                const localData: DataManager = new DataManager(cached as DataOptions | JSON[]);
                const localQuery: Query = eventArgs.query;
                if (localQuery.queries.some((q: QueryOptions) => q.fn === 'onTake')) {
                    localQuery.queries = localQuery?.queries?.filter((item: QueryOptions) => item.fn !== 'onTake');
                    localQuery.take(cached.length);
                }
                const result: unknown = localQuery.executeLocal(localData);
                const listItems: { [key: string]: object; }[]  = (result && Array.isArray((result as {result: unknown}).result) ?
                    (result as {result: unknown}).result : result) as { [key: string]: object; }[];
                const args: {data: {[key: string]: object; }[]; } = { data: listItems };
                onPopupDataLoad?.(args);
                processAndSetData(args.data);
                return;
            }
            if (!isRequestingRef.current) {
                onDataRequest?.({ data: eventArgs.data, query: eventArgs.query as Query });
                setRequesting(true);
                setIsActionFailed(false);
                await data.executeQuery(eventArgs.query)
                    .then((e: unknown) => {
                        const fullResult: { [key: string]: object; }[]  = (e && Array.isArray((e as {result: unknown}).result) ?
                            (e as {result: unknown}).result : []) as { [key: string]: object; }[];
                        if (isFilteringActive) {
                            let existingF: Array<{ [key: string]: unknown } | string | number | boolean> = [];
                            if (Array.isArray(filterCacheRef.current)) {
                                existingF = filterCacheRef.current;
                            }
                            const mergedF: Array<{ [key: string]: unknown } | string | number | boolean> =
                                        existingF.concat(fullResult);
                            filterCacheRef.current = mergedF;
                        } else if (remoteCacheRef && (!fromFilter || forceFilterOnOpen)) {
                            let existing: Array<{ [key: string]: unknown } | string | number | boolean> = [];
                            if (Array.isArray(remoteCacheRef.current)) {
                                existing = remoteCacheRef.current as string[];
                            }
                            const concatenated: Array<{ [key: string]: unknown } | string | number | boolean> =
                                        existing.concat(fullResult);
                            remoteCacheRef.current = concatenated;
                        }
                        if (!(e as {cancel: boolean}).cancel) {
                            if (isFilteringActive && filterCacheRef?.current) {
                                const args: {data: {[key: string]: object; }[]; } = {
                                    data: applyMaxSuggestions(Array.from(filterCacheRef.current), maxSuggestions, externalFilterInputRef) as
                                    {[key: string]: object; }[]};
                                onPopupDataLoad?.(args, true);
                                processAndSetData(filterCacheRef.current as { [key: string]: object }[]);
                            } else if (remoteCacheRef?.current) {
                                const args: {data: {[key: string]: object; }[]; } = {
                                    data: applyMaxSuggestions(Array.from(remoteCacheRef.current), maxSuggestions, externalFilterInputRef) as
                                    {[key: string]: object; }[]};
                                onPopupDataLoad?.(args);
                                processAndSetData(remoteCacheRef.current as { [key: string]: object }[]);
                            }
                        }
                        setRequesting(false);
                        setIsActionFailed(false);
                    })
                    .catch((error: object) => {
                        setRequesting(false);
                        setIsActionFailed(true);
                        setIsDataInitialized(false);
                        onError?.(error as Error);
                    });
            }
        }, [getQuery, onError, onDataRequest, onPopupDataLoad, processAndSetData, ensureValueInDatasource, forceFilterOnOpen,
            isDropdownFiltering, filterInputElementRef, itemData, virtualization, typedStringRef, remoteCacheRef, filterCacheRef,
            setRequesting, setIsDataInitialized, setIsActionFailed, listBaseKey, isRequestingRef, externalFilterInputRef, maxSuggestions]);

        const handleInternalScrollRequest: (e: ScrollEvent) => void = useCallback(async(e: ScrollEvent) => {
            if (!virtualization) { return; }
            if (!(dataSource instanceof DataManager) || (virtualization && virtualization.scrollMode === ScrollMode.FetchAll)) {
                onScroll?.(e);
                return;
            }
            const currentFilter: HTMLInputElement | null = externalFilterInputRef?.current ?? filterInputElementRef?.current;
            const isFilteringActive: boolean = Boolean(isDropdownFiltering && currentFilter?.value);
            typedStringRef.current = isFilteringActive ? currentFilter?.value as string : typedStringRef.current;
            const scrollQuery: Query = getQuery(new Query()).skip(e.startIndex).take(e.count).requiresCount();
            await fetchRemoteVirtualData(dataSource, scrollQuery, false, undefined, true);
            onScroll?.(e);
        }, [dataSource, onScroll, fetchRemoteVirtualData, getQuery, isDropdownFiltering,
            filterInputElementRef, typedStringRef, virtualization, externalFilterInputRef]);

        const {handleInputChange, clearText, filter} = useFilter({
            isDropdownFiltering: isDropdownFiltering,
            ignoreCase,
            ignoreAccent,
            filterType,
            fields,
            dataSource: dataSource as { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[],
            baseQuery: getResolvedQuery(baseQuery),
            onFilter: onFilter,
            setListData,
            externalTypedString: typedString,
            setExternalTypedString: setTypedString,
            externalFilterInputRef: externalFilterInputRef ?? filterInputElementRef
        });

        const listbaseClasses: string = useMemo(() => {
            const isPrimitiveArray: boolean = Array.isArray(listData) && listData.length > 0 &&
            (typeof listData[0] === 'string' || typeof listData[0] === 'number' || typeof listData[0] === 'boolean');
            return [
                DropDownPopupClasses.content,
                DropDownPopupClasses.root,
                (!isPrimitiveArray && fields.groupBy) ? DropDownPopupClasses.grouping : '',
                listData.length === 0 ? 'sf-dd-nodata' : ''
            ].filter(Boolean).join(' ');
        }, [fields.groupBy, listData]);

        const computedDisabledItems: Set<T> = useMemo(() => {
            if (maximumSelectionLength > 0 && Array.isArray(itemData) && itemData.length >= maximumSelectionLength && isDataInitialized) {
                const disabled: Set<T> = new Set<T>();
                const filteredData: T[] = listData as T[];
                for (let i: number = 0; i < filteredData.length; i++) {
                    const item: T = filteredData[i as number];
                    const isSelected: boolean = itemData.some((selected: T) => { return compareItemData(item, selected); });
                    if (!isSelected) {
                        disabled.add(item);
                    }
                }
                return disabled;
            }
            return new Set();
        }, [maximumSelectionLength, itemData, isDataInitialized, listData]);

        const renderNoRecords: JSX.Element = (
            <NoRecords noRecordsTemplate={noRecordsTemplate} defaultText={l10nInstance.getConstant('noRecordsMessage')} />
        );

        const renderError: JSX.Element = (
            <ErrorMessage errorTemplate={onErrorTemplate}defaultText={l10nInstance.getConstant('errorMessage')} />
        );

        useEffect(() => {
            if (isDropdownFiltering && filterInputElementRef.current) {
                filterInputElementRef.current.focus({preventScroll: true});
            }
        }, [isDropdownFiltering, filterInputElementRef.current, isDataInitialized]);

        useEffect(() => {
            if (!isDataInitialized || initialDataSourceRef.current !== JSON.stringify(dataSource)) {
                initialDataSourceRef.current = JSON.stringify(dataSource) ?? null;
                if (forceFilterOnOpen && externalFilterInputRef?.current?.value.trim() !== '') {
                    if (debounceDelay && debounceDelay > 0) {
                        const value: string = externalFilterInputRef?.current?.value as string;
                        if (filterTimerRef.current) {
                            clearTimeout(filterTimerRef.current as unknown as number);
                            filterTimerRef.current = null;
                        }
                        setTypedString(value);
                        filterTimerRef.current = window.setTimeout(() => {
                            filter(dataSource as string[], undefined);
                            clearTimeout(filterTimerRef.current as unknown as number);
                            filterTimerRef.current = null;
                        }, debounceDelay);
                    } else {
                        filter(dataSource as string[], undefined);
                    }
                } else {
                    if (dataSource instanceof DataManager && virtualization && virtualization.scrollMode === ScrollMode.FetchViewPort) {
                        const initialTake: number = virtualization.pageSize + (virtualization.overscanCount ?? 5);
                        const initialQuery: Query = getQuery(new Query()).skip(0).take(initialTake).requiresCount();
                        fetchRemoteVirtualData(dataSource, initialQuery);
                    } else {
                        setListData(dataSource as string[], query);
                    }
                }
            }
        }, [dataSource, query, isDataInitialized]);

        useEffect(() => {
            return () => {
                if (filterTimerRef.current) {
                    clearTimeout(filterTimerRef.current as unknown as number);
                    filterTimerRef.current = null;
                }
            };
        }, []);

        const scrollItemIntoViewWithin: (container: HTMLElement, el: HTMLElement) => void =
        useCallback((container: HTMLElement, el: HTMLElement) => {
            const popupElement: HTMLElement = containerRef?.current?.parentElement as HTMLElement;
            const originalDisplay: string = popupElement.style.display;
            popupElement.style.visibility = 'hidden';
            popupElement.style.display = 'block';
            const itemTop: number = el.offsetTop;
            const itemBottom: number = itemTop + el.offsetHeight;
            const viewTop: number = container.scrollTop;
            const viewBottom: number = container.scrollTop + container.clientHeight;
            if (itemBottom > viewBottom) {
                container.scrollTop = itemBottom - container.clientHeight;
            } else if (itemTop < viewTop) {
                container.scrollTop = Math.max(0, itemTop);
            }
            popupElement.style.visibility = '';
            popupElement.style.display = originalDisplay;
        }, [containerRef]);

        useEffect(() => {
            if (!isDataInitialized || (isNullOrUndefined(itemData) && !focusedItem)) { return; }
            const currentItemData: T | null = focusedItem ? focusedItem.item : getLastItemData(itemData as T[]);
            const currValue: T = typeof currentItemData === 'object' && currentItemData !== null
                ? (getValue(fields?.value ?? 'value', currentItemData)) : (currentItemData);
            if (isNullOrUndefined(currValue)) { return; }
            const listItems: HTMLLIElement[] | undefined = getListItems();
            const activeItem: HTMLLIElement | undefined =
            listItems?.find((item: HTMLElement) => item?.dataset?.value === String(currValue));
            const container: HTMLElement | null = getScrollContainer();
            if (activeItem && container) {
                scrollItemIntoViewWithin(container, activeItem);
            }
            else if (Boolean(virtualization) && container && itemData) {
                const currentIndex: number = getIndexOfItemData(getLastItemData(itemData), listData, fields);
                if (currentIndex !== -1) {
                    scrollIntoItem(currentIndex, container);
                }
            }
        }, [isDataInitialized]);

        const typeOfData: (items: (string | number | boolean | { [key: string]: object })[]) =>
        { typeof: string | null, item: string | number | boolean | { [key: string]: object } | null } =
            useCallback((items: (string | number | boolean | { [key: string]: object })[]) => {
                let item: {typeof: string | null; item: string | number | boolean | { [key: string]: object } | null; }
                = { typeof: null, item: null };
                if (!Array.isArray(items) || items.length === 0) {
                    return item;
                }
                for (let i: number = 0; i < items.length; i++) {
                    if (items[i as number] !== null && items[i as number] !== undefined) {
                        const listDataType: boolean = typeof items[i as number] === 'string' ||
                            typeof items[i as number] === 'number' || typeof items[i as number] === 'boolean';
                        const isNullData: boolean = listDataType ? isNullOrUndefined(items[i as number]) :
                            isNullOrUndefined(getValue((fields.value as string), items[i as number]));
                        if (!isNullData) {
                            return item = { typeof: typeof items[i as number], item: items[i as number] };
                        }
                    }
                }
                return item;
            }, [fields]);

        const getFormattedValue: (value: string | number | boolean) => string | number | boolean =
            useCallback((value: string | number | boolean): string | number | boolean => {
                if (listData && listData.length) {
                    const item: { [key: string]: object } &
                    { typeof?: string; item?: string | number | boolean | { [key: string]: object } | null } =
                    typeOfData(listData) as { [key: string]: object } &
                    { typeof?: string; item?: string | number | boolean | { [key: string]: object } | null };
                    if (typeof getValue((fields.value as string), item.item as { [key: string]: object }) === 'number' ||
                        item.typeof === 'number') {
                        return parseFloat(value as string);
                    }
                    if (typeof getValue((fields.value as string), item.item as { [key: string]: object }) === 'boolean' ||
                        item.typeof === 'boolean') {
                        return ((value === 'true') || ('' + value === 'true'));
                    }
                }
                return value as string | number | boolean;
            }, [listData, fields, typeOfData]);

        const getDataByValue: (value: string | number | boolean) => { [key: string]: Object } | string | number | boolean | undefined =
    useCallback((value: string | number | boolean) => {
        if (!isNullOrUndefined(listData)) {
            const type: string = typeOfData(listData).typeof as string;
            if (type === 'string' || type === 'number' || type === 'boolean') {
                for (let i: number = 0; i < listData.length; i++) {
                    const item: { [key: string]: Object } | string | number | boolean = listData[i as number];
                    if (isNullOrUndefined(item)) {continue; }
                    if (String(item) === String(value)) {
                        return item;
                    }
                }
            } else {
                for (let i: number = 0; i < listData.length; i++) {
                    const item: { [key: string]: Object } | string | number | boolean = listData[i as number];
                    if (isNullOrUndefined(item)) {continue; }
                    if (String(getValue((fields.value as string), item)) === String(value)) {
                        return item;
                    }
                }
            }
        }
        return undefined;
    }, [listData, fields, typeOfData]);

        const checkIgnoreCase: (item: string, text: string, ignoreCase: boolean) => boolean =
        useCallback((item: string, text: string, ignoreCase: boolean): boolean => {
            if (isNullOrUndefined(item)) {
                return false;
            }
            if (!ignoreCase) {
                return String(item) === text?.toString();
            }
            return String(item).toLowerCase() === text?.toString().toLowerCase();
        }, []);

        const checkValueCase: (text: string, ignoreCase: boolean) => string | number | null =
        useCallback((text: string, ignoreCase: boolean ): string | number | null => {
            if (!isNullOrUndefined(listData)) {
                const dataSource: { [key: string]: object }[] = listData as { [key: string]: object }[];
                const match: {[key: string]: object; } | undefined =
                dataSource.find((item: {[key: string]: object; }) => !isNullOrUndefined(getValue(fields.value as string, item)) &&
                checkIgnoreCase(String(getValue(fields.value || '', item)), text, ignoreCase) );
                return match ? (getValue((fields.text || fields.value) as string, match) as string) : null;
            }
            return null;
        }, [listData, fields, typeOfData]);

        const getTextByValue: (value: string | number | boolean) => string = useCallback((value: string | number | boolean): string => {
            const dataType: string = typeOfData(dataSource as (string | number | boolean | { [key: string]: object })[]).typeof as string;
            if (dataType === 'string' || dataType === 'number' || dataType === 'boolean') {
                return value.toString();
            }

            return checkValueCase(value as string, ignoreCase ? true : false) as string || '';
        }, [checkValueCase, typeOfData, dataSource]);

        const handleItemClick: (e: SelectEvent) => void =
            useCallback((e: SelectEvent): void => {
                onItemClick?.(e.event as React.MouseEvent<HTMLLIElement, MouseEvent>, e.index as number);
            }, [getDataByValue, getFormattedValue, getTextByValue, onItemClick, typeOfData, dataSource]);

        const getItemProps: (args: GetItemPropsOptions) => React.HTMLAttributes<HTMLElement> = useCallback((args: GetItemPropsOptions):
        React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement> => {

            let itemValue: string = '';
            let textValue: string = '';
            if (isPrimitive(args.item)) {
                itemValue = textValue = String(args.item);
            } else {
                itemValue = String(getValue(fields.value || '', args.item));
                textValue = String(getValue(fields.text || fields.value || '', args.item));
            }
            let isActive: boolean = false;
            try {
                if (itemData !== undefined && itemData !== null) {
                    isActive = itemData.some((item: T ) => {
                        const currVal: string = typeof item === 'object' ? String((item as Record<string, unknown>)[fields.value || 'value']) : String(item);
                        const currText: string = typeof item === 'object' ? String((item as Record<string, unknown>)[fields.text || fields.value || '']) : String(item);
                        return String(itemValue) === currVal && String(textValue) === currText;
                    });
                }
            } catch {
                isActive = false;
            }
            let isFocused: boolean = itemData && itemData.length > 0 ? false : ( (listData?.[0] as { [key: string]: object }).isHeader ?
                args.index === 1 : args.index === 0 );

            if (focusedItem !== null && focusedItem !== undefined) {
                isFocused = String(getTextValueField(args.item, 'value', fields)) === String(getTextValueField(focusedItem.item, 'value', fields));
            }
            isFocused = (selectAllNode || customValueNode) && !focusedItem ? false : isFocused;
            const isDisabled: string | boolean | undefined = fields.disabled && typeof args.item === 'object' && getValue(fields.disabled, args.item) === true;
            const isDisabledByMaxSelection: boolean = Array.from(computedDisabledItems).some(
                (disabledItem: T) => compareItemData(disabledItem, args.item));
            const itemClassName: string = [
                isActive ? DropDownPopupClasses.selected : '',
                isFocused ? DropDownPopupClasses.focus : '',
                isDisabled || isDisabledByMaxSelection ? DropDownPopupClasses.disabled : ''
            ].filter(Boolean).join(' ');

            return {
                className: itemClassName,
                id: `${id}_option_${args.index}`,
                'aria-selected': isActive ? 'true' : 'false',
                'aria-disabled': (isDisabled || isDisabledByMaxSelection) ? 'true' : 'false',
                ref: (el: HTMLLIElement | null) => { listItemsRef.current[args.index as number] = el; }
            };
        }, [listData, listbaseClasses, fields, DropDownPopupClasses, itemData, id, focusedItem, computedDisabledItems, selectAllNode,
            customValueNode]);

        const processedFields: FieldsMapping = useMemo((): FieldsMapping => {
            if (!fields || Object.keys(fields).length === 0) {
                return fields;
            }
            return {id: fields?.value, text: fields?.text, groupBy: fields?.groupBy,
                disabled: fields?.disabled, htmlAttributes: fields?.htmlAttributes};
        }, [fields]);

        const ulListContainer: React.ReactElement = useMemo(() => {
            return <ListItems
                key={`list-base${listBaseKey.current}`}
                getItemProps={getItemProps}
                items={computedNonHiddenItems as DataSource[]}
                parentClass={listbaseClasses}
                itemTemplate={itemTemplate}
                groupTemplate={groupTemplate}
                fields={processedFields}
                ariaAttributes={{
                    itemRole: 'option',
                    listRole: 'listbox',
                    groupItemRole: 'presentation'
                }}
                onSelect={handleItemClick}
                virtualization={virtualization}
                onScrollRequest={handleInternalScrollRequest}
                disableDefaultInteractions={true} />;
        }, [ listbaseClasses, itemTemplate, groupTemplate, computedNonHiddenItems, handleItemClick, getItemProps, fields, itemData,
            listBaseKey]);

        const isItemDisabledByMaxSelection: (item: T) => boolean =
            useCallback((item: T): boolean => {
                const isDisabled: boolean = Array.from(computedDisabledItems).some((disabledItem: T) =>
                    compareItemData(disabledItem, item));
                let isExist: boolean = true;
                if (hideSelectedItem && itemData && itemData.length > 0) {
                    isExist = computedNonHiddenItems.some((data: T) => compareItemData(data, item));
                }
                return isDisabled || !isExist;
            }, [computedDisabledItems, computedNonHiddenItems]);

        const getListItems: () => HTMLLIElement[] = useCallback((): HTMLLIElement[] => {
            if ((fields.groupBy || itemTemplate) && containerRef.current) {
                return Array.from(containerRef.current.getElementsByClassName(DropDownPopupClasses.li)) as HTMLLIElement[];
            }
            return listItemsRef.current.filter(Boolean) as HTMLLIElement[];
        }, [fields.groupBy, itemTemplate, DropDownPopupClasses.li]);

        const getScrollContainer: () => HTMLElement | null = useCallback((): HTMLElement | null => {
            const root: HTMLElement | null = containerRef.current as HTMLElement | null;
            if (!root) { return null; }
            const specific: HTMLElement | null = root.querySelector('.sf-ul') as HTMLElement | null;
            if (specific) { return specific; }
            return null;
        }, []);

        const getFilteredListData: () => {[key: string]: object; } [] | boolean[] | string[] | number[] =
        useCallback((): {[key: string]: object; } [] | boolean[] | string[] | number[] => {
            return listData;
        }, [listData, setListData]);

        const getIndexByValue: (value: string | number | boolean) => number = useCallback((value: string | number | boolean): number => {
            let index: number = -1;
            const listItems: HTMLLIElement[] = getListItems();
            for (let i: number = 0; i < listItems.length; i++) {
                const itemValue: string | null = (listItems[i as number]).dataset?.value ?? null;
                if (!isNullOrUndefined(value) && !isNullOrUndefined(itemValue) && String(itemValue) === String(value)) {
                    index = i;
                    break;
                }
            }
            return index;
        }, [getListItems]);

        const handleFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void =
        useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            if (debounceDelay && debounceDelay > 0) {
                const value: string = externalFilterInputRef ? externalFilterInputRef.current?.value as string :
                    filterInputElementRef.current?.value as string;
                if (filterTimerRef.current) {
                    clearTimeout(filterTimerRef.current as unknown as number);
                    filterTimerRef.current = null;
                }
                setTypedString(value);
                filterTimerRef.current = window.setTimeout(() => {
                    handleInputChange(e);
                    clearTimeout(filterTimerRef.current as unknown as number);
                    filterTimerRef.current = null;
                }, debounceDelay);
            } else {
                handleInputChange(e);
            }
        }, [debounceDelay, handleInputChange, filterInputElementRef, filterTimerRef, setTypedString, externalFilterInputRef]);

        const filteringAction: (ds: object[] | DataManager | string[] | number[] | boolean[], query?: Query,
            e?: React.ChangeEvent<HTMLInputElement>, clearEvent?: React.MouseEvent) => void =
            useCallback((ds: object[] | DataManager |string[] | number[] | boolean[], query?: Query,
                         e?: React.ChangeEvent<HTMLInputElement>, clearEvent?: React.MouseEvent) => {
                if (e) {
                    handleFilterChange(e);
                    return;
                }
                if (clearEvent) {
                    clearText(clearEvent);
                    return;
                }
                filter(ds as string[], query);
            }, [filter, handleFilterChange, clearText]);

        useImperativeHandle(ref, () => ({
            getFormattedValue,
            getDataByValue,
            getIndexByValue,
            getTextByValue,
            getScrollContainer,
            getListItems,
            getFilteredListData,
            isItemDisabledByMaxSelection,
            filterType,
            externalFilterInputRef,
            filter: filteringAction
        } as IDropDownPopup), [ getFormattedValue, getDataByValue, getIndexByValue, getTextByValue, getListItems, listData,
            getScrollContainer, isItemDisabledByMaxSelection ]);

        const isNotAllowedFilterKey: (key: string) => boolean = (key: string): boolean => new Set([' ', 'Home', 'End']).has(key);

        const handleFilterKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void =
        useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
            if (isNotAllowedFilterKey(e.key)) {
                return;
            }
            keyActionHandler?.(e);
        }, [keyActionHandler]);

        return (
            <>
                { isDataInitialized ? (
                    <div
                        className={size === Size.Small ? 'sf-small' : size === Size.Large ? 'sf-large' : 'sf-medium'}
                        ref={containerRef}
                    >
                        {isDropdownFiltering && !externalFilterInputRef?.current && (
                            <span className={'sf-ddl-filter-parent'}>
                                <span
                                    className={`sf-input-group sf-control sf-input-focus ${
                                        size === Size.Small ? 'sf-small' : size === Size.Large ? 'sf-large' : 'sf-medium'
                                    }`}
                                >
                                    <InputBase
                                        name={id + '_filter'}
                                        ref={filterInputElementRef as React.RefObject<HTMLInputElement>}
                                        type='text'
                                        value={typedString}
                                        className={'sf-input-filter'}
                                        placeholder={filterPlaceholder}
                                        title='Filter'
                                        onChange={handleFilterChange}
                                        onKeyDown={handleFilterKeyDown}
                                    />
                                    {isRequesting ? (<Spinner
                                        size={size === Size.Small ? '16px' : '20px'}
                                        visible={true}
                                    />) : renderClearButton(typedString, clearText) }
                                </span>
                            </span>
                        )}
                        {headerTemplate &&  (
                            <div className="sf-dd-header">
                                <Header headerTemplate={headerTemplate} />
                            </div>
                        )}
                        {selectAllNode}
                        {customValueNode}
                        {(computedNonHiddenItems.length === 0 ? renderNoRecords : ulListContainer)}
                        {footerTemplate &&  (
                            <div className="sf-dd-footer">
                                <Footer footerTemplate={footerTemplate} />
                            </div>
                        )}
                    </div>
                ) : (
                    isActionFailed && (
                        <div className={DropDownPopupClasses.root + ' ' + DropDownPopupClasses.content + ' ' + DropDownPopupClasses.noData}>
                            {renderError}
                        </div>
                    )
                )}
            </>
        );
    });

export default React.memo(DropDownPopup);
