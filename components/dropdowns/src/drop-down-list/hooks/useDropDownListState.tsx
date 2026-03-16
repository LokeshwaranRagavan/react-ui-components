import { useEffect, useMemo, useState } from 'react';
import type { DropDownListProps } from '../types';
import { compareItemData } from '../../common/utils';
import { T } from '../types';

/**
 * Specifies the properties used by the `useDropDownListState` hook to manage the state and behavior of the DropDownList component.
 *
 * @private
 */
interface UseDropDownListStateProps {
    value?: number | string | boolean | object | null;
    defaultValue?: number | string | boolean | object | null;
    open?: boolean;
    loading?: boolean;
    onChange?: DropDownListProps['onChange'];
}

/**
 * Represents the internal state structure used by the DropDownList component.
 *
 * @private
 */
interface DropDownListState {
    isPopupOpen: boolean;
    dropdownValue: (number | string | boolean | { [key: string]: unknown })[] | null;
    textValue: string;
    isSpanFocused: boolean;
    isLoading: boolean;
    itemData: (string | number | boolean | { [key: string]: unknown })[] | null;
}

/**
 * Defines the action methods used to update the internal state of the DropDownList component.
 *
 * @private
 */
interface DropDownListActions {
    setIsPopupOpen: (v: boolean) => void;
    setDropdownValue: (v: (number | string | boolean | { [key: string]: unknown })[] | null) => void;
    setTextValue: (v: string) => void;
    setIsSpanFocused: (v: boolean) => void;
    setIsLoading: (v: boolean) => void;
    setItemData: (v: (string | number | boolean | { [key: string]: unknown })[] | null) => void;
}

type UseDropDownListStateReturn = [DropDownListState, DropDownListActions];

export const useDropDownListState: (props?: UseDropDownListStateProps) => UseDropDownListStateReturn
= (props: UseDropDownListStateProps = {}): UseDropDownListStateReturn => {
    const {
        value,
        defaultValue,
        open,
        loading,
        onChange
    } = props;

    const [isPopupOpen, setIsPopupOpen] = useState<boolean>(!!open);
    const [textValue, setTextValue] = useState<string>('');
    const [isSpanFocused, setIsSpanFocused] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(!!loading);
    const [itemData, setItemData] = useState<T[] | null>(null);

    const isOpenControlled: boolean = useMemo(() => open !== undefined, [open]);
    const isValueControlled: boolean = useMemo(() => value !== undefined && !!onChange, [value, onChange]);
    const initialValue: T[] | null = useMemo(() => {
        if (isValueControlled) { return [value] as T[] | null; }
        if (value !== undefined) { return [value] as T[] | null; }
        if (defaultValue !== undefined) { return [defaultValue] as T[] | null; }
        return null;
    }, [isValueControlled, value, defaultValue]);
    const [dropdownValue, setDropdownValue] = useState<T[] | null>(initialValue);

    useEffect(() => {
        if (isOpenControlled) {
            setIsPopupOpen(!!open);
        }
    }, [isOpenControlled, open]);

    useEffect(() => {
        setIsLoading(!!loading);
    }, [loading]);

    useEffect(() => {
        if (isValueControlled) {
            setDropdownValue(value as (number | string | boolean | { [key: string]: unknown })[] | null);
        }
    }, [isValueControlled, value]);

    const state: DropDownListState = {
        isPopupOpen,
        dropdownValue: dropdownValue as { [key: string]: unknown }[],
        textValue,
        isSpanFocused,
        isLoading,
        itemData: itemData as { [key: string]: unknown }[]
    };

    const actions: DropDownListActions = {
        setIsPopupOpen: (v: boolean) => setIsPopupOpen(v),
        setDropdownValue: (v: (number | string | boolean | { [key: string]: unknown })[] | null) => setDropdownValue((prev: T[] | null) => {
            if (compareItemData(prev, v)) {
                return prev;
            }
            return v;
        }),
        setTextValue: (v: string) => setTextValue(v),
        setIsSpanFocused: (v: boolean) => setIsSpanFocused(v),
        setIsLoading: (v: boolean) => setIsLoading(v),
        setItemData: (v: (string | number | boolean | { [key: string]: unknown })[] | null) => setItemData((prev: T[] | null) => {
            if (compareItemData(prev, v)) {
                return prev;
            }
            return v;
        })
    };

    return [state, actions];
};
