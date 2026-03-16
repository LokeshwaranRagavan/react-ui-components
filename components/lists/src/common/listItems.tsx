import * as React from 'react';
import { DataSource, FieldsMapping, VirtualizationProps } from './types';
import { ListItem } from './listItem';
import { SelectEvent, useListItemSelection, UseListItemSelectionResult } from './useListItemSelection';
import { isNullOrUndefined } from '@syncfusion/react-base';
import VirtualScroller from './virtualScroller';
import { ScrollEvent } from '../list-view';

const UL_CLASS: string = 'sf-list-parent sf-ul';

export interface GetItemPropsOptions {
    item: { [key: string]: Object } | string | number;
    index: number;
}

/**
 * Interface for ListItems common props.
 *
 */
export interface ListItemBaseProps {
    /** ARIA roles/text for list and items; listRole is applied to the <ul>. */
    ariaAttributes?: ListAriaAttributes;
    /** Custom item content template (function or ReactNode). */
    itemTemplate?: Function | React.ReactNode;
    /** Custom group header template (function or ReactNode). */
    groupTemplate?: Function | React.ReactNode;
    /** Custom container class; also disables spacer path when set. */
    parentClass?: string;
    /** Fields mapping for ListItem; falls back to options.fields when omitted. */
    fields?: FieldsMapping;
    /*** Optional callback to provide additional/overridden HTML attributes for each rendered item. */
    getItemProps?: (args: GetItemPropsOptions) =>
    React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement> | undefined;
    /** KeyDown handler for each ListItem (overrides options.itemKeyDown when provided). */
    onItemKeyDown?: (e: React.KeyboardEvent<HTMLElement>, index: number) => void;
}

/**
 * Interface representing ARIA attribute in list item.
 *
 * @private
 */
export interface ListAriaAttributes {
    level?: number;
    listRole?: string;
    listLabel?: string;
    itemRole?: string;
    groupItemRole?: string;
}

/**
 * Default ARIA attributes.
 */
const defaultAriaAttributes: ListAriaAttributes = {
    level: 1,
    listRole: 'list',
    listLabel: 'list',
    itemRole: 'listitem',
    groupItemRole: 'group'
};

/**
 * Default field mapping configuration.
 */
export const defaultMappedFields: FieldsMapping = {
    id: 'id',
    text: 'text',
    url: 'url',
    disabled: 'disabled',
    icon: 'icon',
    visible: 'visible',
    tooltip: 'tooltip',
    htmlAttributes: 'htmlAttributes',
    imageUrl: 'imageUrl',
    groupBy: undefined
};

/**
 * Props for the ListItems component.
 */
export interface ListItemsProps extends ListItemBaseProps {
    /** Items to render (objects or primitives). */
    items?: DataSource[];
    /** Selection event handler triggered when item is selected/checked. */
    onSelect?: (event: SelectEvent, isAlreadySelected: boolean) => void;
    /** Function to update list item data source. */
    setListItemDatas?: (data: DataSource[]) => void;
    /** Whether the list is disabled. */
    disabled?: boolean;
    /**Ref to the scrollable parent element for virtualization calculations. */
    scrollParent?: React.RefObject<HTMLElement>
    /** Virtualization settings; when set and no parentClass, renders via VirtualizedList. */
    virtualization?: VirtualizationProps;
    /** Disable the built-in keyboard navigation and click actions. */
    disableDefaultInteractions?: boolean;
    /** Called when the scroll reaches the end of the current virtual window. The consumer should append the next set starting at `startIndex` with `count` items. */
    onScrollRequest?: (args: ScrollEvent) => void | Promise<void>;
}

/**
 * ListItems — presentational list renderer.
 */
export const ListItems: React.NamedExoticComponent<ListItemsProps & React.RefAttributes<HTMLDivElement>> =
    React.memo(React.forwardRef<HTMLDivElement, ListItemsProps>(({
        items,
        fields = defaultMappedFields,
        scrollParent,
        virtualization,
        parentClass,
        itemTemplate,
        groupTemplate,
        ariaAttributes, getItemProps,
        onItemKeyDown, onSelect, setListItemDatas, onScrollRequest,
        disableDefaultInteractions = false, disabled = false}:
    ListItemsProps, ref: React.ForwardedRef<HTMLDivElement>) => {
        const curAttributes: ListAriaAttributes = { ...defaultAriaAttributes, ...ariaAttributes };
        ariaAttributes = curAttributes;
        const contentRef: React.RefObject<HTMLDivElement | null> = React.useRef<HTMLDivElement | null>(null);
        const ULRef: React.RefObject<HTMLDivElement | HTMLUListElement | null> = React.useRef<HTMLDivElement>(null);

        React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement, []);

        const selectionHook: UseListItemSelectionResult = useListItemSelection({
            fields: fields,
            listItemDatas: items || [],
            onSelect,
            setListItemDatas: setListItemDatas || (() => undefined),
            scrollParent: (scrollParent?.current ? scrollParent : (ULRef as React.RefObject<HTMLElement>))
        });

        const idField: string = fields?.id ?? 'id';
        const focusedIndexNumber: number = React.useMemo(() => {
            if (!selectionHook.focusedItem || !items) { return -1; }
            const focussedId: string = String(selectionHook.focusedItem?.[String(idField)]);
            if (isNullOrUndefined(focussedId)) { return -1; }
            return items.findIndex((item: DataSource) => String(item?.[String(idField)]) === String(focussedId));
        }, [selectionHook.focusedItem, items, idField]);

        const handleItemClick: (e: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => void =
        React.useCallback((e: React.MouseEvent<HTMLLIElement>, index: number) => {
            if (disabled) { return; }
            if (disableDefaultInteractions) {
                onSelect?.({event: e, index: index}, focusedIndexNumber === index);
                return;
            }
            const currentData: DataSource | undefined = items?.[Number(index)];
            if (!currentData) { return; }
            selectionHook.handleSelection(currentData, e, index);
        }, [disableDefaultInteractions, disabled, selectionHook]);

        const handleItemKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void =
        React.useCallback((e: React.KeyboardEvent<HTMLElement>) => {
            if (disabled) { return; }
            if (!disableDefaultInteractions) {
                selectionHook.keyActionHandler(e);
            }
            onItemKeyDown?.(e, focusedIndexNumber);
        }, [disableDefaultInteractions, selectionHook, onItemKeyDown, focusedIndexNumber, disabled]);

        const wrapperClass: string = React.useMemo(() => { return [
            parentClass ? parentClass : 'sf-list-container',
            virtualization ? 'sf-virtualization' : ''
        ].filter(Boolean).join(' ').trim();
        }, [virtualization, parentClass]);

        const renderItem: (index: number, item: DataSource) => React.JSX.Element = React.useCallback(
            (index: number, item: DataSource) => (
                <ListItem
                    key={`sf-item-${index}`}
                    item={item}
                    fields={fields}
                    index={index}
                    onItemClick={handleItemClick}
                    getItemProps={getItemProps}
                    itemTemplate={itemTemplate}
                    groupTemplate={groupTemplate}
                    parentClass={parentClass}
                    ariaAttributes={ariaAttributes}
                    focusedIndex={focusedIndexNumber}
                    as={!virtualization ? 'li' : 'div'}
                />
            ),
            [fields, handleItemClick, getItemProps, itemTemplate, groupTemplate, parentClass, ariaAttributes,
                focusedIndexNumber]);

        const handleScrollRequest: React.UIEventHandler<HTMLUListElement>
        = React.useCallback((e: React.UIEvent<HTMLUListElement, UIEvent>) => {
            onScrollRequest?.({
                originalEvent: e.nativeEvent as Event,
                startIndex: 0,
                count: 0
            });
        }, [onScrollRequest]);

        return (
            <div ref={contentRef} className={wrapperClass}>
                {!virtualization ? (
                    <ul ref={ULRef as React.RefObject<HTMLUListElement>} className={UL_CLASS}
                        role={ariaAttributes?.listRole ?? undefined} aria-label={ariaAttributes?.listLabel ?? undefined}
                        tabIndex={0} onKeyDown={handleItemKeyDown} onScroll={handleScrollRequest}>
                        {items?.map((item: DataSource, index: number) => {
                            return renderItem(index, item);
                        })}
                    </ul>

                ) : (<div ref={ULRef as React.RefObject<HTMLDivElement>} className={UL_CLASS} role={ariaAttributes?.listRole ?? undefined}
                    aria-label={ariaAttributes?.listLabel ?? undefined} tabIndex={0} onKeyDown={handleItemKeyDown}>
                    <VirtualScroller
                        items={items as DataSource[]}
                        itemSize={virtualization?.itemSize}
                        pageSize={virtualization?.pageSize}
                        overscanCount={virtualization?.overscanCount}
                        showSkeleton={virtualization.showSkeleton}
                        scrollParent={scrollParent || ULRef as React.RefObject<HTMLElement>}
                        onScrollRequest={onScrollRequest}
                        itemContent={renderItem}
                    />
                </div>)}
            </div>
        );
    }));
