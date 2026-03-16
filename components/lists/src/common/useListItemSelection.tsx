import { useState, useCallback } from 'react';
import { DataSource, FieldsMapping } from './types';
import { scrollIntoItem } from './utils';

/**
 * An interface that holds clicked ListView item details.
 */
export interface SelectEvent {
    /**
     * Specifies the clicked list item data.
     */
    data?: { [key: string]: Object };

    /**
     * Specifies the DOM event object triggered by the user's interaction through mouse or keyboard.
     */
    event: React.MouseEvent | React.KeyboardEvent;

    /**
     * Specifies whether the item is selected.
     */
    selected?: boolean;

    /**
     * Specifies the index of the list item.
     */
    index?: number;
}

export interface UseListItemSelectionProps {
    fields: FieldsMapping;
    listItemDatas: DataSource[];
    onSelect?: (event: SelectEvent, isAlreadySelected: boolean) => void;
    setListItemDatas: (data: DataSource[]) => void;
    scrollParent?: React.RefObject<HTMLElement>;
}

export type UseListItemSelectionResult = {
    focusedItem: DataSource | null;
    activeItemsId: string[];
    handleSelection: (item: DataSource, e: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<Element>, index: number) => void;
    keyActionHandler: (e: React.KeyboardEvent<HTMLElement>) => void;
};

export const useListItemSelection: ({fields, listItemDatas,
    onSelect, setListItemDatas, scrollParent }: UseListItemSelectionProps) => UseListItemSelectionResult = ({
    fields,
    listItemDatas,
    onSelect,
    setListItemDatas,
    scrollParent
}: UseListItemSelectionProps) => {
    const [focusedItem, setFocusedItem] = useState<DataSource | null>(null);
    const [activeItemsId, setActiveItemsId] = useState<string[]>([]);

    const scrollToIndex: (index: number) => void = (index: number): void => {
        const scroller: HTMLElement | null =  (scrollParent?.current && 'element' in scrollParent.current && scrollParent.current.element ? scrollParent.current.element as HTMLElement :
            scrollParent?.current as HTMLElement);
        if (!scroller) { return; }
        const clamped: number = Math.max(0, Math.min(index, Math.max(0, (listItemDatas?.length) - 1)));
        setFocusedItem(listItemDatas[Number(clamped)]);
        scrollIntoItem(clamped, scroller);
    };

    const isValidItem: (item: DataSource) => boolean = (item: DataSource): boolean => {
        const disabledField: string | undefined = fields.disabled;
        const isHeader: boolean = item.isHeader === true;
        const isDisabled: boolean = disabledField ?
            (item[String(disabledField)] === true || item[String(disabledField)] === 'true') : false;
        const isHidden: boolean = item[String(fields.visible)] === true;
        return (!isHeader && !isDisabled && !isHidden);
    };

    const processSelection: (e: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<Element>,
        item: DataSource, index: number) => void = useCallback((
        e: React.MouseEvent | React.KeyboardEvent, item: DataSource, index: number ): void => {
        const eventArgs: SelectEvent = {data: item, event: e, selected: true, index: index};
        const idField: string = fields?.id || 'id';
        const isAlreadySelected: boolean = focusedItem ?
            Math.max(0, listItemDatas.findIndex((item: DataSource) => String(item[String(idField)])
            === String(focusedItem[String(idField)]))) === index : false;
        onSelect?.(eventArgs, isAlreadySelected);
        setFocusedItem(item);
        const itemId: string = (item[String(idField)]).toString();
        setActiveItemsId([itemId.toString()]);
        setFocusedItem(item);
    }, [onSelect, setListItemDatas, listItemDatas, focusedItem, fields]);

    const handleSelection: (item: DataSource, e: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<Element>, index: number)
    => void = useCallback((item: DataSource, e: React.MouseEvent | React.KeyboardEvent, index: number): void => {
        if (isValidItem(item)) {
            processSelection(e, item, index);
        }
    }, [processSelection, listItemDatas]);

    const findValidIndex: (startIndex: number, direction: number, items: DataSource[], key: string) => number = (
        startIndex: number, direction: number, items: DataSource[], key: string): number => {
        let index: number = key === 'arrowKey' ? startIndex + direction : startIndex;
        const disabledField: string | undefined = fields.disabled;
        while (index >= 0 && index < items.length) {
            const item: DataSource = items[Number(index)];
            const isHeader: boolean = item.isHeader === true;
            const isDisabled: boolean = disabledField ?
                (item[String(disabledField)] === true || item[String(disabledField)] === 'true') : false;
            const isHidden: boolean = item[String(fields.visible)] === true;
            if (!isHeader && !isDisabled && !isHidden) {
                return index;
            }
            index += direction;
        }
        return -1;
    };

    const findAndScrollToIndex: (startIndex: number, prev: boolean, key: string) => void =
    useCallback(( startIndex: number,  prev: boolean, key: string): void => {
        const dir: number = prev ? -1 : 1;
        const newIndex: number = findValidIndex(startIndex, dir, listItemDatas, key);
        const targetIndex: number = newIndex !== -1 ? newIndex : startIndex;
        scrollToIndex(targetIndex);
    }, [listItemDatas]);

    const homeKeyHandler: (e: React.KeyboardEvent<HTMLElement>, end: boolean) => void
    = useCallback((_e: React.KeyboardEvent<HTMLElement>, end: boolean): void => {
        if (!listItemDatas || listItemDatas.length === 0) { return; }
        const start: number = end ? listItemDatas.length - 1 : 0;
        findAndScrollToIndex(start, end, 'homeKey');
    }, [listItemDatas]);

    const arrowKeyHandler: (e: React.KeyboardEvent<HTMLElement>, prev: boolean) => void
    = useCallback((_e: React.KeyboardEvent<HTMLElement>, prev: boolean): void => {
        if (!listItemDatas || listItemDatas.length === 0) { return; }

        const idField: string = fields?.id || 'id';
        const currentIndex: number = focusedItem ?
            Math.max(0, listItemDatas.findIndex((item: DataSource) => String(item[String(idField)])
            === String(focusedItem[String(idField)]))) : -1;
        const startIndex: number = currentIndex === -1 ? (prev ? listItemDatas.length - 1 : -1) : currentIndex;
        findAndScrollToIndex(startIndex, prev, 'arrowKey');
    }, [listItemDatas, focusedItem, fields?.id]);

    const keyActionHandler: (e: React.KeyboardEvent<HTMLElement>) => void
    = useCallback((e: React.KeyboardEvent<HTMLElement>): void => {
        switch (e.key) {
        case 'Home':
            e.preventDefault();
            homeKeyHandler(e, false);
            break;
        case 'End':
            e.preventDefault();
            homeKeyHandler(e, true);
            break;
        case 'ArrowDown':
            e.preventDefault();
            arrowKeyHandler(e, false);
            break;
        case 'ArrowUp':
            e.preventDefault();
            arrowKeyHandler(e, true);
            break;
        }
    }, [homeKeyHandler, arrowKeyHandler]);

    return {
        focusedItem,
        activeItemsId,
        handleSelection,
        keyActionHandler
    };
};
