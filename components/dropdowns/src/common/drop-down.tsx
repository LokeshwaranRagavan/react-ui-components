import * as React from 'react';
import { ChangeEvent, JSX, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { CLASS_NAMES, InputBase, renderClearButton, renderFloatLabelElement, validationProps } from '@syncfusion/react-inputs';
import { ChevronDownFillIcon, ResizerRightIcon } from '@syncfusion/react-icons';
import { DropDownProps, DropDownFilterIconProps, DropDownSelectionProps, InputProps, IDropDownPopup, ListItemData } from './types';
import { getValue, IL10n, isNullOrUndefined, L10n, useProviderContext } from '@syncfusion/react-base';
import { useDropDownListState } from '../drop-down-list/hooks/useDropDownListState';
import { getZindexPartial, IPopup, IResize, Popup, Spinner, useResize } from '@syncfusion/react-popups';
import { createPortal } from 'react-dom';
import { usePopupManagement } from '../drop-down-list/hooks/usePopupManagement';
import { DataManager, Query } from '@syncfusion/react-data';
import { DropDownPopup } from '.';
import { useValidation } from '../drop-down-list/hooks/useValidation';
import { useValueSync } from '../drop-down-list/hooks/useValueSync';
import {ScrollMode, CollisionType, T, DataRequestEvent, ResizeEvent, DropdownVirtualProps, PopupSettings, Size, Variant, FieldSettingsModel, SortOrder } from '../drop-down-list/types';
import { useKeyboardNavigation } from '../drop-down-list/hooks/useKeyboardNavigation';
import ValueTemplate from '../drop-down-list/value-template';
import { DisplayMode, MultiSelectCommonProps, SelectedValuesRenderer } from '../multi-select';
import { Checkbox, ChipDeleteEvent } from '@syncfusion/react-buttons';
import { compareItemData, findItem, getLastItemData, getTextValueField, hasItemData, isPrimitive, updateItemData, getIndexOfItemData, processDataResult, splitMatches } from './utils';
import { useSelectAll } from './hooks/useSelectAll';

/**
 * Props for the ComboBox component.
 *
 */
export interface DropdownProps extends DropDownProps, DropDownFilterIconProps, DropDownSelectionProps,
    validationProps, InputProps, MultiSelectCommonProps {
    /**
     *Specifies whether the input field automatically fills with the first matching
     * suggestion during typing. The auto-filled portion appears highlighted.
     *
     * @default false
     */
    autofill?: boolean;

    /**
     * Specifies whether to highlight the matched search text within each suggestion.
     *
     * @default false
     */
    autoHighlight?: boolean;

    /** Specifies whether users can commit custom text values (not in the suggestion list) by pressing Enter.
     * When enabled, free-form input is accepted as a valid selection.
     *
     *@default false
     */
    customValue?: boolean;

    /**
     * Specifies the value to enable popup resizing functionality.
     *
     * @default false
     */
    resizable?: boolean;

    /**
     * Specifies a custom template for rendering the selected value in the input element, allowing for customized appearance of the selection.
     *
     * @default -
     */
    valueTemplate?: Function | React.ReactNode;

    /**
     * Allows custom rendering of the selected value inside the input area.
     * Receives the input element as a React element and should return a React node to be displayed.
     *
     * @default -
     */
    inputValueRenderer?: (rendering: React.ReactElement<HTMLInputElement>) => React.ReactNode;

    /**
     * Specifies the placeholder text to be shown in the filter bar of the dropdown component.
     *
     * @default -
     */
    filterPlaceholder?: string;

    /**
     * Specifies the minimum number of characters required before suggestions appear.
     *
     * @default 0
     */
    minLength?: number;

    /**
     *Specifies the maximum number of suggestions to display.
     *
     *@default -
     */
    maxSuggestions?: number;

    /**
     * Specifies additional CSS class(es) to apply to the input element.
     *
     * @private
     * @default -
     */
    inputClassName?: string;

    /**
     * Localization component name used to resolve localized strings (e.g., placeholder).
     * When provided, L10n will use this key to lookup localized resources.
     *
     * @private
     * @default -
     */
    localeComponentName?: string;

    /**
     * Accessible label for the input element (mapped to aria-label).
     *
     * @private
     * @default -
     */
    ariaLabel?: string;

    /**
     * Specifies the component-specific CSS class(es) to apply to the root container of the dropdown.
     *
     * @private
     * @default -
     */
    componentClassName?: string;

    /**
     * Specifies whether clicking the span toggles/opens the popup.
     * When true, the input behaves like a span-click driven dropdown (input becomes readOnly for direct typing).
     *
     * @private
     * @default false
     */
    spanClickable?: boolean;

    /**
     * When true, force a filter call after the popup is actually mounted (useful for Autocomplete).
     * This avoids calling filter inside onOpen where DropDownPopup may not be mounted yet.
     *
     * @private
     */
    forceFilterOnOpen?: boolean;

    /**
     * Specifies whether dropdown is multi selectable
     *
     * @private
     */
    multiSelectable?: boolean

    /**
     *Specifies a custom template for rendering the selected value in the input element, allowing for customized appearance of the selection.
     *
     * @default -
     */
    multiSelectValueTemplate?: ((SelectedItems: T[]) => React.ReactNode);

    /** Specifies the callback invoked when a custom value (not in the suggestion list)
     * is committed via Enter key. Receives the custom string value as a parameter.
     *
     * @event onCustomValueSelect
     */
    onCustomValueSelect?: (value: string) => void;

    /**
     * Specifies the event fired when resizing occurs (applicable when resizable is enabled).
     *
     * @event onResize
     */

    onResize?: (event: ResizeEvent) => void;
}

/**
 * Imperative API for ComboBox.
 */
export interface IDropdown extends DropdownProps {
    /**
     * Reference to the input element.
     *
     * @private
     * @default null
     */
    element?: HTMLInputElement | null;
}

type IDropdownProps = DropdownProps & Omit<React.InputHTMLAttributes<HTMLSpanElement>, keyof DropdownProps>;

/**
 * ComboBox lets users type to search or choose a single option from a list. It supports controlled and uncontrolled usage (value / defaultValue),
 * works with local or remote data sources, supports custom item.
 */
export const Dropdown: React.ForwardRefExoticComponent<IDropdownProps & React.RefAttributes<IDropdown>> =
    React.forwardRef<IDropdown, IDropdownProps>((props: IDropdownProps, ref: React.Ref<IDropdown>) => {
        const {
            id = `dropdown_${useId()}`,
            dataSource = [],
            fields,
            value,
            defaultValue,
            placeholder,
            disabled,
            readOnly,
            labelMode = 'Never',
            size = Size.Medium,
            variant = Variant.Standard,
            className,
            required,
            inputProps,
            clearButton,
            dropdownIcon = <ChevronDownFillIcon />,
            loading,
            popupSettings,
            open,
            defaultOpen,
            query,
            sortOrder = SortOrder.None,
            allowObjectBinding,
            customValue,
            itemTemplate,
            headerTemplate,
            footerTemplate,
            groupTemplate,
            noRecordsTemplate,
            onErrorTemplate,
            virtualization,
            ignoreCase,
            ignoreAccent,
            filterable,
            filterType,
            debounceDelay,
            valid,
            validationMessage,
            validityStyles,
            skipDisabledItems = true,
            autofill,
            autoHighlight,
            resizable,
            filterPlaceholder,
            minLength = 0,
            maxSuggestions,
            mode,
            delimiterChar,
            checkbox,
            closeOnSelect = true,
            openOnClick = true,
            maximumSelectionLength = 0,
            hideSelectedItem,
            addTagOnBlur,
            showSelectAll,
            selectAllText,
            unSelectAllText,
            inputValueRenderer,
            onResize,
            onOpen,
            onClose,
            onDataRequest,
            onDataLoad,
            onError,
            onScroll,
            onChange,
            onFilter,
            onCustomValueSelect,
            onChipClick,
            onChipDelete,
            onSelectAll,
            componentClassName,
            spanClickable,
            inputClassName,
            valueTemplate,
            localeComponentName,
            ariaLabel,
            forceFilterOnOpen,
            multiSelectable,
            chipTemplate,
            multiSelectValueTemplate,
            ...restAttributes
        } = props;

        const isRemoteData: boolean = useMemo(() => dataSource instanceof DataManager, [dataSource]);

        const { dir, locale } = useProviderContext();
        const [state, actions] = useDropDownListState({ defaultValue });
        const { isPopupOpen, textValue, isSpanFocused, isLoading, itemData, dropdownValue } = state;
        const { setTextValue, setIsSpanFocused, setIsPopupOpen, setIsLoading, setDropdownValue, setItemData } = actions;

        const inputElementRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null);
        const popupRef: React.RefObject<IPopup | null> = useRef<IPopup | null>(null);
        const spanElementRef: React.RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null);
        const dropdownBaseRef: React.RefObject<IDropDownPopup | null> = useRef<IDropDownPopup | null>(null);
        const remoteCacheRef: React.RefObject<T[] | null> = useRef<T[] | null>(null);
        const isFetchedRef: React.RefObject<boolean> = useRef<boolean>(false);
        const initialDataSourceRef: React.RefObject<string | null> = useRef<string | null>(null);
        const initialFieldsRef: React.RefObject<string | null> = useRef<string | null>(null);

        const [calculatedZIndex, setCalculatedZIndex] = useState<number>(1000);
        const [popupDimensions, setPopupDimensions] = useState<{ height: number, width: number }>({ height: 0, width: 0 });
        const [isValueTemplateVisible, setIsValueTemplateVisible] = useState(false);

        const showValueTemplate: boolean = useMemo(() =>
            Boolean(valueTemplate && isValueTemplateVisible), [valueTemplate, isValueTemplateVisible]);
        const publicAPI: Partial<IDropdown> = useMemo(() => ({
            value, defaultValue, placeholder, disabled, className, labelMode, size, variant, required, inputProps, clearButton, loading
        }), [value, defaultValue, placeholder, disabled, className, labelMode, size, variant, required, inputProps, clearButton, loading]);

        useImperativeHandle(ref, () => ({
            ...publicAPI,
            element: inputElementRef.current
        }), [publicAPI, inputElementRef]);

        const onResizeHandler: (args: ResizeEvent) => void = useCallback((args: ResizeEvent) => {
            setPopupDimensions({ height: args.height, width: args.width });
            onResize?.(args);
        }, [onResize]);

        const resizeOptions: IResize = useMemo(() => ({
            enabled: resizable,
            handles: ['SouthEast'],
            onResize: onResizeHandler
        }), [resizable, onResizeHandler]);

        const { renderResizeHandles } = useResize(popupRef as unknown as React.RefObject<HTMLElement>, resizeOptions);

        useEffect(() => {
            const explicit: number | undefined = popupSettings?.zIndex;
            let base: number = (typeof explicit === 'number' && Number.isFinite(explicit)) ? explicit : 1000;
            if (base === 1000 && spanElementRef.current) {
                const partial: number = Number(getZindexPartial(spanElementRef.current));
                if (Number.isFinite(partial)) {
                    base = partial;
                }
            }
            setCalculatedZIndex(Math.max(3, base + 1));
        }, [popupSettings?.zIndex, spanElementRef]);

        const { isInputValid } = useValidation({
            dropdownValue: dropdownValue && dropdownValue.length > 0 ? dropdownValue[0] : null,
            inputElementRef, required, valid, validationMessage
        });

        const resolvedFields: FieldSettingsModel = useMemo(() => {
            return { text: fields?.text, value: fields?.value ?? 'value', disabled: fields?.disabled ?? 'disabled', groupBy: fields?.groupBy, htmlAttributes: fields?.htmlAttributes };
        }, [fields?.text, fields?.value, fields?.groupBy, fields?.disabled, fields?.htmlAttributes]);

        const combinedPopupSettings: PopupSettings = useMemo(() => {
            return {
                ...{
                    position: { X: 'left', Y: 'bottom' }, collision: dir === 'rtl' ?
                        { X: CollisionType.Fit, Y: CollisionType.Flip } : { X: CollisionType.Flip, Y: CollisionType.Flip },
                    autoReposition: true, width: '100%', height: '300px'
                }, ...popupSettings
            };
        }, [popupSettings, dir]);

        const { showPopup, hidePopup, setPopupWidth, setPopupHeight, popupClassNames } = usePopupManagement({
            isPopupOpen,
            open,
            setIsPopupOpen,
            setIsSpanFocused,
            spanElementRef: spanElementRef as React.RefObject<HTMLSpanElement>,
            inputElementRef: inputElementRef as React.RefObject<HTMLInputElement>,
            popupRef: popupRef as React.RefObject<IPopup>,
            onOpen: onOpen,
            onClose: onClose,
            popupWidth: combinedPopupSettings.width as string,
            popupHeight: combinedPopupSettings.height as string,
            className,
            multiSelectable
        });

        const resolvedVirtualization: DropdownVirtualProps | undefined = useMemo(() => {
            if (!virtualization) { return undefined; }
            return { ...virtualization, scrollMode: virtualization.scrollMode ?? ScrollMode.FetchAll };
        }, [virtualization]);

        const listData: ListItemData[] = useMemo(() => {
            const source: DataManager | T[] = remoteCacheRef.current ? remoteCacheRef.current : dataSource;
            if (!Array.isArray(source) || source.length === 0) {
                return [];
            }
            const normalized: T[] = (source).filter((v: T) => v != null);
            if (normalized.length === 0) { return []; }
            const processed: (string | number | boolean | { [key: string]: Object; })[] = processDataResult(
                normalized as Array<{ [key: string]: Object } | string | number | boolean>,
                resolvedFields, sortOrder, (query ?? new Query())
            );
            return processed.map((item: string | number | boolean | { [key: string]: Object; }) => {
                const isDisabled: string | boolean | undefined =
                    resolvedFields.disabled && typeof item === 'object' && getValue(resolvedFields.disabled, item) === true;
                const isHeader: boolean = typeof item === 'object' && !!getValue('isHeader', item);
                return {
                    item: item as (string | number | { [key: string]: unknown }),
                    isDisabled: Boolean(isDisabled), isHeader
                };
            });
        }, [remoteCacheRef.current, dataSource, resolvedFields, sortOrder, query]);

        const prefetchIfNeeded: () => Promise<object[] | null> = useCallback(async (): Promise<object[] | null> => {
            if (!isRemoteData || isFetchedRef.current) {
                return null;
            }
            const dm: DataManager = dataSource as DataManager;
            try {
                setIsLoading(true);
                onDataRequest?.({ data: dm, query: query ?? new Query() });
                const res: unknown = await dm.executeQuery(query ?? new Query());
                const arr: { [key: string]: unknown; }[] =
                    (Array.isArray((res as { result: unknown })?.result) ?
                        (res as { result: unknown }).result : []) as { [key: string]: unknown; }[];
                isFetchedRef.current = true;
                onDataLoad?.({ data: arr });
                setIsLoading(false);
                return arr as { [key: string]: unknown; }[];
            } catch (err: unknown) {
                setIsLoading(false);
                onError?.(err as Error);
                return null;
            }
        }, [isRemoteData, dataSource, query, setIsLoading, onDataRequest, onDataLoad, onError]);

        const prefetchData: () => Promise<(string | number | { [key: string]: unknown; })[] | null> = useCallback(async () => {
            const data: DataManager | string[] | number[] | boolean[] | unknown[] | null = await prefetchIfNeeded();
            if (Array.isArray(data)) {
                const normalized: (string | number | { [key: string]: unknown; })[] = (data as object[]).filter(
                    (v: object) => v != null) as Array<{ [key: string]: unknown } | string | number>;
                remoteCacheRef.current = normalized;
                return normalized;
            }
            return null;
        }, [prefetchIfNeeded]);

        const clearSelection: () => void = useCallback(() => {
            setTextValue('');
            setDropdownValue(updateItemData(dropdownValue, null, Boolean(multiSelectable)));
            setItemData(updateItemData(itemData, null, Boolean(multiSelectable)));
        }, [dropdownValue, itemData, multiSelectable]);

        const clearFilter: (e: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLLIElement>) => void =
            useCallback((e: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLLIElement>) => {
                if (multiSelectable && filterable) {
                    dropdownBaseRef.current?.filter([], undefined, undefined, e as React.MouseEvent);
                }
            }, [dropdownBaseRef, multiSelectable, filterable]);

        const keyBoardSelectionCallback: (nextValue: string | number | boolean, currentItem: T, currentText: string,
            e: React.KeyboardEvent<HTMLElement>, prevItem?: T, clearAll?: boolean) => void =
            useCallback((nextValue: string | number | boolean, currentItem: T, currentText: string,
                         e: React.KeyboardEvent<HTMLElement>, prevItem?: T, clearAll?: boolean) => {
                let newValues: T[] | null = null;
                if (clearAll) {
                    clearSelection();
                }
                else {
                    newValues = updateItemData(dropdownValue, nextValue, Boolean(multiSelectable), maximumSelectionLength);
                    setDropdownValue(newValues as { [key: string]: unknown; }[]);
                    setItemData(updateItemData(itemData, currentItem, Boolean(multiSelectable), maximumSelectionLength) as string[]);
                    setTextValue?.(multiSelectable ? '' : currentText);
                    clearFilter(e);
                }

                if (onChange) {
                    onChange({
                        event: e,
                        previousItemData: prevItem as { [key: string]: unknown; },
                        value: spanClickable ? nextValue : multiSelectable ? newValues : currentText,
                        itemData: currentItem as { [key: string]: unknown; }
                    });
                }
            }, [itemData, multiSelectable, spanClickable, setItemData, setDropdownValue, setTextValue, onChange,
                dropdownValue, maximumSelectionLength, clearSelection, clearFilter]);

        useValueSync({
            value,
            defaultValue,
            dataSource: dataSource as string[],
            dataSourceListItems: listData,
            fields: resolvedFields,
            isValueControlled: value !== undefined,
            allowObjectBinding,
            dropdownbaseRef: dropdownBaseRef,
            dropdownValue,
            setDropdownValue,
            setTextValue,
            setItemData,
            prefetchData,
            spanClickable,
            customValue,
            multiSelectable,
            itemData
        });

        const onKeyboardPopupHide: (e?: React.KeyboardEvent<HTMLElement>) => void = useCallback((e?: React.KeyboardEvent<HTMLElement>) => {
            if (closeOnSelect || (e?.key !== 'Enter' && e?.key !== ' ')) {
                hidePopup(e);
                inputElementRef.current?.focus();
            }
        }, [hidePopup, closeOnSelect, inputElementRef]);

        const { isAllSelected, isIndeterminate, handleSelectAll } = useSelectAll({
            enabled: multiSelectable && checkbox && showSelectAll,
            listData,
            itemData: itemData as T[],
            setItemData: setItemData as (v: T[] | null) => void,
            setDropdownValue: setDropdownValue as (v: T[] | null) => void,
            fields: resolvedFields,
            onSelectAll,
            maximumSelectionLength
        });

        const { keyActionHandler, handleCustomTypeAhead, typeAheadMatchedItem, setTypeAheadMatchedItem, isShowSelectAllFocused,
            isCustomElemFocused, setIsCustomElemFocused } =
        useKeyboardNavigation({
            isInteractive: !disabled && !readOnly,
            skipDisabledItems,
            onChange: keyBoardSelectionCallback,
            isRemoteData,
            dataSourceListItems: listData,
            fields: resolvedFields,
            dropdownbaseRef: dropdownBaseRef,
            showPopup,
            hidePopup: onKeyboardPopupHide,
            setIsSpanFocused,
            prefetchData,
            currentItemData: getLastItemData(itemData),
            onScroll,
            virtualization: resolvedVirtualization,
            filterable,
            highlightMode: multiSelectable,
            showSelectAll: showSelectAll && checkbox,
            handleSelectAll: handleSelectAll,
            handleCustomValSelect: (e: React.KeyboardEvent<HTMLElement>) => commitIfCustom(e),
            hasCustomValue: Boolean(multiSelectable && customValue && textValue),
            hasChip: Boolean(multiSelectable && mode !== DisplayMode.Delimiter && itemData && itemData.length > 0),
            spanClickable
        });

        const commitIfCustom: (evt?: React.KeyboardEvent<HTMLElement> | React.FocusEvent<HTMLElement> | React.MouseEvent<Element>,
            allowCustomVal?: boolean) => void = useCallback((evt?: React.KeyboardEvent<HTMLElement> | React.FocusEvent<HTMLElement> |
        React.MouseEvent<Element>, allowCustomVal: boolean = true) => {
            const text: string = inputElementRef.current ? inputElementRef.current.value : (textValue ?? '');
            if (!text) { return; }

            const filteredData: string[] | number[] | boolean[] | { [key: string]: unknown; }[] | undefined =
                    dropdownBaseRef?.current?.getFilteredListData?.();
            const candidateItems: string[] | number[] | boolean[] | { [key: string]: unknown; }[] =
                    Array.isArray(filteredData) && filteredData.length > 0
                        ? (filteredData) : (listData?.map((li: ListItemData) => li.item) ?? []) as
                        string[] | number[] | boolean[] | { [key: string]: unknown; }[];

            const isTextMatchInItems: string | number | boolean | { [key: string]: unknown; } | undefined =
                    candidateItems.find((it: string | number | boolean | { [key: string]: unknown }) => {
                        return String(getTextValueField(it as unknown as (string | number | boolean | { [key: string]: unknown }), 'text', resolvedFields)) === text;
                    });
            let currentDropdownValue: string | number | boolean | { [key: string]: unknown; } | null = null;
            let currentItemData: string | number | boolean | { [key: string]: unknown; } | null = null;
            let currentText: string = '';
            if (isTextMatchInItems) {
                currentDropdownValue = getTextValueField(isTextMatchInItems, 'value', resolvedFields);
                currentItemData = isTextMatchInItems;
                currentText = String(getTextValueField(isTextMatchInItems, 'text', resolvedFields));
                setTypeAheadMatchedItem(null);
            }
            if (!isTextMatchInItems && customValue && allowCustomVal) {
                currentDropdownValue = currentItemData = currentText = text;
            }
            if (!isTextMatchInItems && !customValue) {
                currentDropdownValue = currentItemData = null;
                if (multiSelectable) {
                    setTextValue('');
                    return;
                }
            }
            const newValues: T[] | null = updateItemData(dropdownValue, currentDropdownValue, Boolean(multiSelectable),
                                                         maximumSelectionLength);
            setDropdownValue(newValues as { [key: string]: unknown }[]);
            setItemData(updateItemData(itemData, currentItemData as string, Boolean(multiSelectable), maximumSelectionLength));
            setTextValue(multiSelectable ? '' : currentText);
            if (isPopupOpen && closeOnSelect) {
                hidePopup?.();
            }
            if (!isTextMatchInItems && customValue && allowCustomVal) {
                onCustomValueSelect?.(currentText);
            }
            if (onChange) {
                onChange({
                    event: (evt as React.KeyboardEvent<Element>),
                    previousItemData: getLastItemData(itemData) ?? null,
                    value: spanClickable ? currentDropdownValue : multiSelectable ? newValues : getTextValueField(currentItemData as { [key: string]: unknown; }, 'text', resolvedFields),
                    itemData: currentItemData
                });
            }
            if (autofill) {
                inputElementRef.current?.setSelectionRange(inputElementRef.current?.value.length, inputElementRef.current?.
                    value.length);
            }
        }, [customValue, inputElementRef, textValue, dropdownBaseRef, listData, resolvedFields, setDropdownValue,
            autofill, setItemData, setTextValue, onCustomValueSelect, onChange, itemData, hidePopup, isPopupOpen,
            setTypeAheadMatchedItem, spanClickable, multiSelectable, dropdownValue, closeOnSelect, maximumSelectionLength,
            addTagOnBlur]);

        useEffect(() => {
            if (open === undefined && defaultOpen) {
                setIsSpanFocused(true);
                showPopup?.();
            }
        }, []);

        useEffect(() => {
            if (spanClickable && isPopupOpen && filterable && dropdownBaseRef.current) {
                requestAnimationFrame(() => {
                    setIsSpanFocused(false);
                });
            }
        }, [isPopupOpen, filterable, spanClickable]);

        useEffect(() => {
            if (open === undefined) { return; }
            setIsPopupOpen(open);
            setIsSpanFocused(open);
            if (open) {
                inputElementRef.current?.focus();
            }
        }, [open, inputElementRef, setIsPopupOpen, setIsSpanFocused]);

        useEffect(() => {
            if (initialDataSourceRef.current === null) {
                initialDataSourceRef.current = JSON.stringify(props.dataSource) ?? null;
            }
            if (initialFieldsRef.current === null) {
                initialFieldsRef.current = JSON.stringify(props.fields) ?? null;
            }
        }, []);

        useEffect(() => {
            if (JSON.stringify(props.dataSource) !== initialDataSourceRef.current ||
                JSON.stringify(props.fields) !== initialFieldsRef.current) {
                initialDataSourceRef.current = JSON.stringify(props.dataSource) ?? null;
                initialFieldsRef.current = JSON.stringify(props.fields) ?? null;
                remoteCacheRef.current = null;
                if (isFetchedRef?.current) {
                    isFetchedRef.current = false;
                    prefetchData();
                }
                setIsLoading(false);
            }
        }, [props.dataSource, props.fields]);

        useEffect(() => {
            if (spanClickable && isRemoteData && isPopupOpen && !isFetchedRef.current) {
                setIsLoading(true);
            }
            if (multiSelectable && !showSelectAll && isPopupOpen && !itemData?.length && !typeAheadMatchedItem && listData.length > 0) {
                if (customValue && textValue) { return; }
                const firstValidItem: ListItemData | undefined = listData.find((item: ListItemData) => !item.isDisabled && !item.isHeader);
                if (firstValidItem) {
                    setTypeAheadMatchedItem(firstValidItem);
                }
            }
        }, [isRemoteData, isPopupOpen, spanClickable, setIsLoading]);

        const dropdownIconClick: (e: React.MouseEvent<HTMLSpanElement>) => void = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
            if (spanClickable || e.button === 2 || disabled || readOnly) { return; }
            setIsSpanFocused(!isPopupOpen);
            if (!(e.target as HTMLElement).closest('.sf-chip-delete')) {
                e.preventDefault();
            }
            if (isRemoteData && isPopupOpen) {
                setIsLoading(false);
            }
            if (isPopupOpen) {
                hidePopup(e as React.MouseEvent<HTMLElement, MouseEvent>);
            } else {
                showPopup(e as React.MouseEvent<HTMLElement, MouseEvent>);
            }
        }, [disabled, isPopupOpen, isRemoteData, readOnly, spanClickable, setIsSpanFocused, setIsLoading, hidePopup, showPopup]);

        const handleInputChange: (event: ChangeEvent<HTMLInputElement>) => void = useCallback((event: ChangeEvent<HTMLInputElement>) => {
            const currentText: string = event.target.value;
            setTextValue(currentText);
            if (spanClickable) { return; }
            const inputEvent: InputEvent = event.nativeEvent as InputEvent;
            const isDeletion: boolean = !!(inputEvent && inputEvent.inputType && inputEvent.inputType.toLowerCase().includes('delete'));
            const meetsThreshold: boolean = currentText?.length >= minLength;
            if (value !== undefined && !multiSelectable) {
                onChange?.({
                    event: event,
                    previousItemData: getLastItemData(itemData) ?? null,
                    value: currentText,
                    itemData: null
                });
            }
            if (isDeletion) {
                if (!multiSelectable) {
                    setItemData(updateItemData(itemData, null, Boolean(multiSelectable)));
                    setDropdownValue(updateItemData(dropdownValue, null, Boolean(multiSelectable)));
                }
                if (!meetsThreshold) {
                    hidePopup();
                }
            }
            if (!meetsThreshold) {
                return;
            }
            if (!isPopupOpen) {
                showPopup(event.nativeEvent);
            }
            if (filterable) {
                requestAnimationFrame(() => {
                    dropdownBaseRef.current?.filter([], undefined, event);
                    if (autofill && !isDeletion) {
                        requestAnimationFrame(() => {
                            const matchedText: string | null = handleCustomTypeAhead(currentText);
                            if (autofill && matchedText) {
                                setTextValue(matchedText);
                                requestAnimationFrame(() => {
                                    if (inputElementRef.current) {
                                        const start: number = currentText.length;
                                        const end: number = matchedText.length;
                                        inputElementRef.current.setSelectionRange(start, end);
                                    }
                                });
                            }
                        });
                    }
                });

            } else if (!isDeletion) {
                const matchedText: string | null = handleCustomTypeAhead(currentText);
                if (autofill && matchedText) {
                    setTextValue(matchedText);
                    requestAnimationFrame(() => {
                        if (inputElementRef.current) {
                            const start: number = currentText.length;
                            const end: number = matchedText.length;
                            inputElementRef.current.setSelectionRange(start, end);
                        }
                    });
                }
            }
        }, [setTextValue, dropdownBaseRef, spanClickable, filterable, handleCustomTypeAhead, isPopupOpen, autofill, inputElementRef,
            resolvedFields, minLength, dropdownValue, itemData, multiSelectable, hidePopup]);

        const handleFocus: () => void = useCallback(() => {
            setIsSpanFocused(true);
            if (spanClickable) {
                const length: number | undefined = inputElementRef.current?.value.length;
                if (length) {
                    inputElementRef.current?.setSelectionRange(length, length);
                }
            }
        }, [setIsSpanFocused, spanClickable, inputElementRef]);

        const onBlurHandler: (e: React.FocusEvent<HTMLElement>) => void = useCallback((e: React.FocusEvent<HTMLElement>) => {
            if (disabled) { return; }
            const target: (EventTarget & Element) | null = e.relatedTarget;
            const movedToPopup: boolean = !!(target && popupRef?.current && popupRef?.current?.element?.contains(target));
            if (!spanClickable && !movedToPopup) {
                commitIfCustom(e, Boolean(!multiSelectable || (multiSelectable && addTagOnBlur)));
            }
            if (!spanElementRef.current?.contains(target) && !movedToPopup) {
                setIsSpanFocused(false);
            }
        }, [disabled, spanElementRef, setIsSpanFocused, commitIfCustom, spanClickable, popupRef, multiSelectable, addTagOnBlur]);

        const handleRemoveChip: (args: ChipDeleteEvent) => void = useCallback((args: ChipDeleteEvent) => {
            if (itemData) {
                const removedValue: string | number | undefined = args.data.value;
                const updatedItemData: T[] =
                    itemData.filter((item: T) => {
                        return !compareItemData(getTextValueField(item as string, 'value', resolvedFields), removedValue) ;
                    });

                const updatedDropdownValue: T[] | null =
                    updatedItemData.length > 0 ?
                        updatedItemData.map((item: T) => {
                            if (typeof item === 'object' && item !== null && resolvedFields.value) {
                                return getValue(resolvedFields.value, item);
                            }
                            return item;
                        }) : null;
                setItemData((updatedItemData.length > 0 ? updatedItemData : []) as { [key: string]: unknown; }[]);
                setDropdownValue(updatedDropdownValue as { [key: string]: unknown; }[]);
                const currentItemData: T = (updatedItemData.length > 0 ? updatedItemData[0] : null) as { [key: string]: unknown; };
                if (onChange) {
                    onChange({
                        event: args.event, previousItemData: getLastItemData(itemData) ?? null,
                        value: updatedDropdownValue, itemData: currentItemData as { [key: string]: unknown; }
                    });
                }
                if (onChipDelete) {
                    const removedItemData: T[] = itemData.filter((item: T) => {
                        return compareItemData(getTextValueField(item as string, 'value', resolvedFields), removedValue) ;
                    });
                    onChipDelete(removedItemData?.[0]);
                }
                inputElementRef.current?.focus();
            }
        }, [itemData, resolvedFields, setItemData, setDropdownValue, onChange, inputElementRef, onChipDelete]);

        const handleClear: (e: React.MouseEvent) => void = useCallback((e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            clearSelection();
            if (!spanClickable) {
                if (isPopupOpen) {
                    hidePopup();
                }
                if (filterable) {
                    dropdownBaseRef.current?.filter([], undefined, undefined, e);
                }
            }
            if (onChange) {
                onChange({
                    event: e, previousItemData: getLastItemData(itemData) ?? null,
                    value: multiSelectable ? [] : null, itemData: null
                });
            }
        }, [onChange, itemData, setTextValue, setDropdownValue, setItemData, isPopupOpen, dropdownValue, multiSelectable, clearSelection]);

        const onKeyHandler: (e: React.KeyboardEvent<HTMLSpanElement>) => void = useCallback((e: React.KeyboardEvent<HTMLSpanElement>) => {
            if (!spanClickable) {
                if ((!multiSelectable || isCustomElemFocused) && e.key === 'Enter' && textValue && (!itemData || itemData.length === 0) && !typeAheadMatchedItem) {
                    commitIfCustom(e);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                const isPrintable: boolean = e.key.trim().length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
                if (!isShowSelectAllFocused && multiSelectable && isPrintable && customValue) {
                    setIsCustomElemFocused(true);
                }
                if ((isPrintable && !filterable) || (e.key === ' ' && textValue)) {
                    return;
                }
                if (multiSelectable) {
                    if (!e.altKey && e.key === 'ArrowDown' && !isPopupOpen) {
                        setIsSpanFocused(true);
                        showPopup(e);
                        return;
                    }
                    if (e.key === 'Backspace' && !textValue && itemData && itemData.length > 0 && dropdownValue) {
                        setItemData(itemData.slice(0, -1));
                        const updatedValues: T[] = dropdownValue.slice(0, -1);
                        setDropdownValue(updatedValues as string[]);
                        if (onChange) {
                            onChange({
                                event: e, previousItemData: getLastItemData(itemData) ?? null,
                                value: updatedValues, itemData: getLastItemData(itemData) as { [key: string]: unknown; }
                            });
                        }
                        return;
                    }
                }
            }
            keyActionHandler(e);
        }, [keyActionHandler, filterable, spanClickable, commitIfCustom, textValue, itemData, typeAheadMatchedItem, multiSelectable,
            isPopupOpen, showPopup, setIsSpanFocused, dropdownValue, isCustomElemFocused, customValue, setIsCustomElemFocused,
            isShowSelectAllFocused]);

        const onItemClick: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void = useCallback((e: React.MouseEvent<HTMLLIElement>) => {
            e.preventDefault();
            const target: Element = e.target as Element;
            const li: HTMLLIElement | null = target.closest('.sf-list-item');
            if (li) {
                const dataValue: string = li.dataset?.value as string;
                if (!isNullOrUndefined(dataValue)) {
                    const formattedValue: string | number | boolean | undefined = dropdownBaseRef?.current?.getFormattedValue?.(dataValue);
                    let displayText: string = dropdownBaseRef?.current?.getTextByValue(formattedValue as string | number | boolean) || '';
                    if (displayText === '' && !resolvedFields?.text && formattedValue !== undefined) {
                        displayText = String(formattedValue);
                    }
                    setTextValue?.(multiSelectable ? '' : displayText);
                    const selectedData: string | number | boolean | { [key: string]: object } | undefined =
                        dropdownBaseRef?.current?.getDataByValue(formattedValue as string | number | boolean);

                    let nextValue: string | number | boolean | null | undefined = formattedValue;
                    let newValues: T[] | null = null;
                    if (selectedData !== null && selectedData !== undefined) {
                        setTypeAheadMatchedItem(null);
                        setItemData(updateItemData(itemData, selectedData, Boolean(multiSelectable), maximumSelectionLength));
                        if (isPrimitive(selectedData)) {
                            newValues = updateItemData(dropdownValue, selectedData, Boolean(multiSelectable), maximumSelectionLength);
                            setDropdownValue(newValues as { [key: string]: unknown; }[]);
                            nextValue = selectedData as string;
                        } else if (formattedValue !== null && formattedValue !== undefined) {
                            newValues = updateItemData(dropdownValue, formattedValue, Boolean(multiSelectable), maximumSelectionLength);
                            setDropdownValue(newValues as { [key: string]: unknown; }[]);
                            nextValue = formattedValue;
                        }
                        clearFilter(e);
                    }

                    if (onChange && nextValue !== undefined) {
                        onChange({
                            event: e,
                            previousItemData: getLastItemData(itemData) ?? null,
                            value: spanClickable ? nextValue : multiSelectable ? newValues : getTextValueField(selectedData as { [key: string]: unknown; }, 'text', resolvedFields),
                            itemData: selectedData ? selectedData : null
                        });
                    }
                }
                if (closeOnSelect) {
                    hidePopup?.();
                }
                inputElementRef?.current?.focus();
            }
        }, [hidePopup, setTextValue, setDropdownValue, dropdownBaseRef, inputElementRef, resolvedFields, setItemData,
            itemData, onChange, spanClickable, multiSelectable, dropdownValue, closeOnSelect, maximumSelectionLength, clearFilter]);

        const handleDataRequest: (event: DataRequestEvent) => void = useCallback((event: DataRequestEvent): void => {
            if (!spanClickable) {
                setIsLoading(true);
            }
            onDataRequest?.(event);
        }, [onDataRequest, spanClickable]);

        const handleOnDataLoad: (e: { data: DataManager | T[] }, fromFilter?: boolean) => void =
            useCallback((e: { data: DataManager | T[] }, fromFilter?: boolean): void => {
                onDataLoad?.(e);
                setIsLoading(false);
                if (fromFilter) { return; }
                if (Array.isArray(e.data)) {
                    const normalized: T[] = (e.data).filter((v: T) => v != null);
                    remoteCacheRef.current = normalized;
                } else {
                    remoteCacheRef.current = null;
                }
                isFetchedRef.current = true;
            }, [onDataLoad, remoteCacheRef]);

        const handleOnError: (err: Error) => void = useCallback((err: Error) => {
            setIsLoading(false);
            onError?.(err);
        }, [onError]);

        const uiLoading: boolean = useMemo(() => (((Boolean(loading) && !isPopupOpen) || isLoading)), [isLoading, isPopupOpen, loading]);

        const getPlaceholder: string = useMemo(() => {
            const l10n: IL10n = L10n(String(localeComponentName), { placeholder: placeholder }, locale);
            l10n.setLocale(locale);
            const localized: string = l10n.getConstant('placeholder');
            if (multiSelectable && itemData && itemData.length > 0) {
                return '';
            }
            return localized || (placeholder || '');
        }, [locale, placeholder, localeComponentName, multiSelectable, itemData]);

        const containerClassNames: string = useMemo(() => {
            return [
                'sf-input-group sf-control sf-dropdown',
                componentClassName,
                uiLoading ? 'sf-loading' : '',
                disabled ? 'sf-disabled' : '',
                dir === 'rtl' ? 'sf-rtl' : '',
                readOnly ? 'sf-readonly' : '',
                labelMode !== 'Never' ? CLASS_NAMES.FLOATINPUT : '',
                size === Size.Small ? 'sf-small' : size === Size.Large ? 'sf-large' : 'sf-medium',
                (!isInputValid && validityStyles) ? 'sf-error' : '',
                variant && variant.toLowerCase() === 'outlined' ? 'sf-outline' : `sf-${variant.toLowerCase()}`,
                isSpanFocused ? 'sf-input-focus' : '',
                multiSelectable && mode !== DisplayMode.Box && !isSpanFocused && itemData && itemData.length > 0 ? 'sf-delimiter' : '',
                multiSelectable && itemData && itemData.length > 0 ? 'sf-min-input' : '',
                className
            ].filter(Boolean).join(' ');
        }, [disabled, className, dir, readOnly, labelMode, size, variant, isSpanFocused, isInputValid,
            validityStyles, uiLoading, componentClassName, mode, multiSelectable, itemData]);

        const inputClassNames: string = useMemo(() => {
            return [
                dir === 'rtl' ? 'sf-rtl' : '',
                isInputValid ? 'sf-valid-input' : '',
                inputClassName,
                showValueTemplate ? 'sf-input-value-template' : '',
                'sf-ellipsis'
            ].filter(Boolean).join(' ');
        }, [dir, isInputValid, inputClassName, showValueTemplate]);

        const popupElementClassNames: string = useMemo(() => {
            return [
                popupClassNames,
                resizable ? 'sf-dropdown-resizable' : ''
            ].filter(Boolean).join(' ');
        }, [popupClassNames]);

        const restInputProps: Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof DropdownProps> = React.useMemo(() => {
            const { className: inputPropsClassName, ...otherInputProps } = inputProps || {};
            const mergedClassName: string = [inputPropsClassName, inputClassNames].filter(Boolean).join(' ');
            return {
                ...otherInputProps, id, className: mergedClassName, readOnly: spanClickable || readOnly,
                required, disabled, value: textValue, defaultValue: undefined
            };
        }, [inputProps, textValue, inputClassNames, id, readOnly, required, disabled, spanClickable]);

        const iconClassNames: string = useMemo(() => {
            return [
                'sf-input-icon sf-ddl-icon',
                isPopupOpen ? 'sf-icon-rotate' : 'sf-icon-normal'
            ].filter(Boolean).join(' ');
        }, [isPopupOpen]);

        const comboboxA11yProps: Omit<React.InputHTMLAttributes<HTMLSpanElement>, keyof DropdownProps> = React.useMemo(() => ({
            'aria-controls': isPopupOpen ? `${id}_popup` : undefined,
            'aria-activedescendant': isPopupOpen && dropdownBaseRef && hasItemData(itemData) ? `${id}_option_${getIndexOfItemData(getLastItemData(itemData),
                                                                                                                                  dropdownBaseRef?.current?.getFilteredListData?.() as { [key: string]: unknown; }[], resolvedFields)}` : undefined,
            'aria-expanded': open ?? isPopupOpen
        }), [id, open, isPopupOpen, itemData, dropdownBaseRef]);

        const highlightTemplate: (item: string | number | boolean | { [key: string]: unknown; }) => JSX.Element =
            useCallback((item: string | number | boolean | { [key: string]: unknown }) => {
                const rawText: string = String(getTextValueField(item, 'text', resolvedFields));
                const parts: { text: string; highlight: boolean; }[] = splitMatches(rawText, textValue);
                return (
                    <span className="sf-dd-item">
                        {parts.map((p: { text: string; highlight: boolean; }, i: number) =>
                            p.highlight
                                ? <span key={i} className="sf-dd-highlight">{p.text}</span>
                                : <span key={i}>{p.text}</span>
                        )}
                    </span>
                );
            }, [resolvedFields, textValue, filterType, ignoreCase, ignoreAccent]);

        const effectiveItemTemplate: Function | React.ReactNode = useMemo(() => {
            if (!autoHighlight) { return itemTemplate; }
            return itemTemplate ?? highlightTemplate;
        }, [autoHighlight, itemTemplate, highlightTemplate]);

        const checkboxWrappedTemplate: Function | React.ReactNode = useMemo(() => {
            if (!checkbox) { return effectiveItemTemplate; }

            return (item: T) => {
                const valueField: string = resolvedFields.value || '';
                const isChecked: boolean = !!(itemData && itemData.some((selectedItem: T) => {
                    const selectedValue: T = typeof selectedItem === 'object'
                        && selectedItem !== null ? (selectedItem as Record<string, unknown>)[String(valueField)] as T : (selectedItem);
                    const currentItemValue: T = typeof item === 'object' && item !== null ? (item as Record<string, unknown>)[String(valueField)] as T : (item);
                    return String(selectedValue) === String(currentItemValue);
                }));

                const templateContent: JSX.Element | React.ReactNode = effectiveItemTemplate ? (typeof effectiveItemTemplate === 'function'
                    ? effectiveItemTemplate(item) : effectiveItemTemplate) : <>{String(getTextValueField(item as { [key: string]: unknown }, 'text', resolvedFields))}</>;

                return (
                    <div className="sf-dd-checkbox-item-wrapper" >
                        <Checkbox checked={isChecked} readOnly type='hidden' className="sf-item-checkbox" tabIndex={-1} size={size} />
                        <div className="sf-item-content">
                            {templateContent}
                        </div>
                    </div>
                );
            };
        }, [effectiveItemTemplate, itemData, resolvedFields, checkbox, size]);

        const onCustomValueClick: (e: React.MouseEvent<HTMLSpanElement>) => void = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
            commitIfCustom(e);
        }, [commitIfCustom]);

        const customValueClassNames: string = useMemo(() => {
            return [
                'sf-multiselect-custom-value sf-list-item',
                isCustomElemFocused ? 'sf-item-focus' : ''
            ].filter(Boolean).join(' ');
        }, [isCustomElemFocused]);

        const multiSelectCustomValue: React.ReactNode = useMemo(() => {
            if (!customValue || !multiSelectable || !textValue) { return null; }
            return (
                <span className={customValueClassNames} onMouseDown={onCustomValueClick}>{textValue}</span>
            );
        }, [multiSelectable, customValue, textValue, onCustomValueClick, customValueClassNames]);

        const dropDownClick: (e: React.MouseEvent<HTMLSpanElement>) => void = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
            if (multiSelectable && openOnClick) {
                dropdownIconClick(e);
                return;
            }
            if (!spanClickable || e.button === 2 || disabled) { return; }
            const el: Element | null = e.target instanceof Element ? e.target : null;
            if (el && el.parentElement && el.parentElement.matches('.sf-clear-icon')) { return; }
            setIsSpanFocused(!isPopupOpen);
            e.preventDefault();
            if (isLoading && !isRemoteData && !loading) {
                setIsLoading(false);
            }
            if (!readOnly) {
                if (isPopupOpen) {
                    hidePopup(e as React.MouseEvent<HTMLElement, MouseEvent>);
                } else {
                    showPopup(e as React.MouseEvent<HTMLElement, MouseEvent>);
                }
            }
            if (isRemoteData && isPopupOpen) {
                setIsLoading(false);
            }
        }, [setIsLoading, disabled, readOnly, isPopupOpen, isRemoteData, spanClickable, setIsSpanFocused, openOnClick, dropdownIconClick,
            multiSelectable]);

        const onChipClickHandler: (e: React.MouseEvent<HTMLDivElement>) => void = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
            const currentValue: string | undefined = e.currentTarget.dataset.value;
            if (onChipClick && currentValue) {
                const currentClickedItem: T | undefined = dropdownBaseRef?.current ? dropdownBaseRef.current.getDataByValue(currentValue) :
                    findItem(currentValue, listData.map((data: ListItemData) => data.item), resolvedFields.value as string);
                onChipClick({ event: e, itemData: currentClickedItem as T });
            }
        }, [resolvedFields, listData, dropdownBaseRef, onChipClick]);

        const selectAllNodeClassNames: string = useMemo(() => {
            return [
                'sf-dd-select-all-wrapper sf-list-item sf-dd-checkbox-item-wrapper',
                isShowSelectAllFocused ? 'sf-item-focus' : ''
            ].filter(Boolean).join(' ');
        }, [isShowSelectAllFocused]);

        const onSelectAllClick: (e: React.SyntheticEvent) => void = useCallback((e: React.SyntheticEvent) => {
            handleSelectAll(e);
            inputElementRef.current?.focus();
            setIsSpanFocused(true);
        }, [handleSelectAll, inputElementRef, setIsSpanFocused]);

        const selectAllNode: React.ReactNode = useMemo(() => {
            if (!showSelectAll || !checkbox || !multiSelectable) { return null; }
            return (
                <>
                    <div className={selectAllNodeClassNames} onMouseDown={onSelectAllClick}>
                        <Checkbox checked={isAllSelected} indeterminate={isIndeterminate} type='hidden' size={size} readOnly tabIndex={-1}/>
                        <span className='sf-dd-select-all-text'>
                            {isAllSelected ? unSelectAllText : selectAllText}
                        </span>
                    </div>
                    <div className='sf-dd-separator sf-no-pointer'></div>
                </>
            );
        }, [showSelectAll, multiSelectable, isAllSelected, isIndeterminate, onSelectAllClick, size, selectAllText, unSelectAllText,
            selectAllNodeClassNames]);

        const renderValueTemplate: () => JSX.Element | null = useCallback(() => {
            return (
                <ValueTemplate
                    valueTemplate={valueTemplate}
                    dropdownValue={dropdownValue}
                    dataSource={Array.isArray(dataSource) ? dataSource as string[] : []}
                    fields={resolvedFields}
                    allowObjectBinding={allowObjectBinding}
                    onRenderedChange={setIsValueTemplateVisible}
                />
            );
        }, [valueTemplate, dropdownValue, dataSource, resolvedFields, allowObjectBinding]);

        const popupContent: JSX.Element = useMemo(() => (
            <DropDownPopup
                key={'dropdown'}
                id={id}
                ref={dropdownBaseRef}
                dataSource={dataSource}
                itemData={itemData}
                fields={resolvedFields}
                query={query}
                size={size}
                sortOrder={sortOrder}
                onItemClick={onItemClick}
                itemTemplate={checkboxWrappedTemplate}
                headerTemplate={headerTemplate}
                footerTemplate={footerTemplate}
                groupTemplate={groupTemplate}
                noRecordsTemplate={noRecordsTemplate}
                onErrorTemplate={onErrorTemplate}
                onError={handleOnError}
                onDataRequest={handleDataRequest}
                onPopupDataLoad={handleOnDataLoad}
                remoteCacheRef={remoteCacheRef}
                virtualization={resolvedVirtualization}
                onScroll={onScroll}
                onFilter={onFilter}
                externalFilterInputRef={!spanClickable ? inputElementRef : undefined}
                ignoreAccent={ignoreAccent}
                ignoreCase={ignoreCase}
                filterType={filterType}
                debounceDelay={debounceDelay}
                focusedItem={typeAheadMatchedItem}
                resizable={resizable}
                onResize={onResize}
                isDropdownFiltering={filterable}
                filterPlaceholder={filterPlaceholder}
                keyActionHandler={spanClickable ? keyActionHandler : undefined}
                maxSuggestions={maxSuggestions}
                forceFilterOnOpen={forceFilterOnOpen}
                maximumSelectionLength={maximumSelectionLength}
                hideSelectedItem={hideSelectedItem}
                customValueNode={multiSelectCustomValue}
                selectAllNode={selectAllNode}
            />
        ), [dropdownBaseRef, dataSource, resolvedFields, query, size, sortOrder, onItemClick, checkboxWrappedTemplate,
            headerTemplate, footerTemplate, groupTemplate, noRecordsTemplate, handleOnError, onErrorTemplate,
            handleDataRequest, handleOnDataLoad, id, remoteCacheRef, onScroll, itemData, inputElementRef, ignoreAccent,
            ignoreCase, filterType, debounceDelay, typeAheadMatchedItem, onFilter, onResize, resizable, filterable,
            filterPlaceholder, spanClickable, keyActionHandler, resolvedVirtualization, maxSuggestions, forceFilterOnOpen,
            maximumSelectionLength, hideSelectedItem, multiSelectCustomValue, selectAllNode]);

        const rootInput: JSX.Element = useMemo(() => (
            <InputBase
                id={id}
                ref={inputElementRef}
                type="text"
                role='combobox'
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                aria-autocomplete='list'
                aria-disabled={disabled}
                aria-readonly={readOnly}
                placeholder={getPlaceholder}
                floatLabelType={labelMode}
                required={required}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={onBlurHandler}
                {...comboboxA11yProps}
                {...restInputProps}
            />
        ), [id, inputElementRef, ariaLabel, disabled, readOnly, getPlaceholder, labelMode, resizable, handleInputChange, handleFocus,
            onBlurHandler, comboboxA11yProps, restInputProps]);

        const getMultiSelectValueTemplate: React.ReactNode = useMemo(() => {
            return multiSelectValueTemplate?.(itemData as T[]);
        }, [multiSelectValueTemplate, itemData]);

        return (<>
            <span ref={spanElementRef} className={containerClassNames} tabIndex={-1}
                onKeyDown={onKeyHandler} onMouseDown={dropDownClick} {...restAttributes}>
                {spanClickable && valueTemplate && (
                    <span className={`sf-input-value ${showValueTemplate ? 'sf-content' : 'sf-display-none'}`}>
                        {renderValueTemplate()}
                    </span>
                )}
                {multiSelectable && (multiSelectValueTemplate ? <div className='sf-multiselect-values'> {getMultiSelectValueTemplate} </div> :
                    (<SelectedValuesRenderer mode={mode} itemData={itemData} resolvedFields={resolvedFields}
                        delimiterChar={delimiterChar} onChipDelete={handleRemoveChip} isInputFocused={isSpanFocused}
                        chipTemplate={chipTemplate} onChipClick={onChipClickHandler} disabled={disabled} />))}
                {!inputValueRenderer && rootInput}
                {inputValueRenderer && (<span className={'sf-input-value sf-content'}>{inputValueRenderer(rootInput)}</span>)}
                {labelMode !== 'Never' && renderFloatLabelElement(labelMode, isSpanFocused, (textValue || (itemData && itemData.length > 0)) ? 'validValue' : '', placeholder, id)}
                <span className='sf-multiselect-icon-wrapper sf-display-flex'>
                    {clearButton && ((textValue || (itemData && itemData.length > 0)) && (isSpanFocused || isPopupOpen)) && renderClearButton( 'validValue', handleClear)}
                    {!uiLoading && dropdownIcon && (<span onMouseDown={dropdownIconClick} aria-hidden='true' className={iconClassNames} > {dropdownIcon} </span>)}
                    {uiLoading && (<Spinner size={size === Size.Small ? '16px' : '20px'} visible={true} />)}
                </span>

            </span>

            {isPopupOpen && typeof document !== 'undefined' && createPortal(
                <Popup
                    ref={popupRef}
                    className={popupElementClassNames}
                    id={`${id}_popup`}
                    relateTo={spanElementRef.current as HTMLElement}
                    width={popupDimensions.width ? popupDimensions.width : setPopupWidth()}
                    height="auto"
                    position={combinedPopupSettings.position}
                    zIndex={calculatedZIndex}
                    collision={combinedPopupSettings.collision}
                    open={isPopupOpen}
                    autoReposition={combinedPopupSettings.autoReposition}
                    animation={{ show: { name: 'FadeIn', duration: 100 }, hide: { name: 'FadeOut', duration: 100 } }}
                    offsetX={combinedPopupSettings.offsetX}
                    offsetY={combinedPopupSettings.offsetY}
                    style={{ maxHeight: popupDimensions.height ? popupDimensions.height : setPopupHeight() }}
                >
                    {popupContent}
                    {(resizable) && renderResizeHandles(<ResizerRightIcon fill='currentColor' />)}
                </Popup>,
                document.body
            )}
        </>

        );
    });

export default React.memo(Dropdown);
