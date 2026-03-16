import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { ListItemData } from '../types';
import {FieldSettingsModel, T} from '../../drop-down-list/types';
import { SelectAllEvent } from '../../multi-select';
import { getTextValueField } from '../utils';

/**
 * Specifies the properties used by the `useSelectAll` hook to manage the state and behavior of the DropDownList component.
 *
 * @private
 */
interface UseSelectAllParams {
    enabled?: boolean;
    listData: ListItemData[];
    itemData?: T[];
    setItemData: (v: T[] | null) => void;
    setDropdownValue: (v: T[] | null) => void;
    fields: FieldSettingsModel;
    onSelectAll?: (event: SelectAllEvent) => void;
    maximumSelectionLength?: number;
}

/**
 * Specifies the return structure of the `useSelectAll` hook used in dropdown components.
 *
 * @private
 */
interface UseSelectAllReturn {
    isAllSelected: boolean;
    isIndeterminate: boolean;
    handleSelectAll: (e: React.SyntheticEvent) => void;
}

export const useSelectAll: (params: UseSelectAllParams) => UseSelectAllReturn = (params: UseSelectAllParams): UseSelectAllReturn => {
    const {
        enabled,
        listData,
        itemData,
        setItemData,
        setDropdownValue,
        fields,
        onSelectAll,
        maximumSelectionLength
    } = params;

    const selectableItems: T[] = useMemo(() => {
        if (!enabled) { return []; }
        return listData.filter((li: ListItemData) => !li.isDisabled && !li.isHeader).map((li: ListItemData) => li.item as T);
    }, [listData, enabled]);

    const isAllSelected: boolean = useMemo(() => {
        if (!enabled || !itemData?.length || selectableItems.length === 0) { return false; }
        return selectableItems.length === itemData.length;
    }, [itemData, selectableItems, enabled]);

    const isIndeterminate: boolean = useMemo(() => {
        if (!enabled || !itemData?.length || selectableItems.length === 0) { return false; }
        return itemData.length > 0 && itemData.length < selectableItems.length;
    }, [itemData, selectableItems, enabled]);

    const handleSelectAll: (e: React.SyntheticEvent) => void = useCallback((e: React.SyntheticEvent) => {
        e.preventDefault();
        let newItemData: T[];

        if (isAllSelected) {
            newItemData = [];
        } else {
            if (maximumSelectionLength && selectableItems.length > maximumSelectionLength) {
                newItemData = selectableItems.slice(0, maximumSelectionLength);
            } else {
                newItemData = [...selectableItems];
            }
        }
        setItemData(newItemData as string[]);
        setDropdownValue(newItemData.map((item: T) => getTextValueField(item as string, 'value', fields)));
        onSelectAll?.({ selectedItems: newItemData as string[], event: e });
    }, [isAllSelected, itemData, selectableItems, setItemData, setDropdownValue, fields, onSelectAll, maximumSelectionLength]);

    return { isAllSelected, isIndeterminate, handleSelectAll };
};
