import * as React from 'react';
import { useCallback, useState } from 'react';
import { DataManager, Query } from '@syncfusion/react-data';
import { FieldSettingsModel, FilterEvent, FilterType } from '../types';
import { getResolvedQuery, normalizeOperator } from '../../common/utils';

/**
 * Specifies the properties used by the `useFilter` hook to manage the state and behavior of the DropDownList component.
 *
 * @private
 */
interface UseFilterParams {
    isDropdownFiltering: boolean;
    ignoreCase?: boolean;
    ignoreAccent?: boolean;
    filterType: FilterType;
    fields: FieldSettingsModel;
    dataSource: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[];
    baseQuery: Query;
    onFilter?: (args: FilterEvent) => void;
    setListData: (dataSource: { [key: string]: unknown }[] | DataManager |
    string[] | number[] | boolean[], query?: Query, fromFilter?: boolean, typedText?: string ) => void;
    externalTypedString?: string;
    setExternalTypedString?: (v: string) => void;
    externalFilterInputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Specifies the return structure of the `useFilter` hook used in dropdown components.
 *
 * @private
 */
interface UseFilterReturn {
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearText: (e: React.MouseEvent) => void;
    filter: (ds: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[], query?: Query) => void;
}

export const useFilter: (params: UseFilterParams) => UseFilterReturn = (params: UseFilterParams): UseFilterReturn => {
    const {
        isDropdownFiltering,
        ignoreCase,
        ignoreAccent,
        filterType,
        fields,
        dataSource,
        onFilter,
        setListData,
        baseQuery,
        externalFilterInputRef
    } = params;

    const [internalTypedString, setInternalTypedString] = useState<string>('');

    const typedString: string = params.externalTypedString !== undefined ? params.externalTypedString : internalTypedString;
    const setTypedString: (v: string) => void = params.setExternalTypedString || setInternalTypedString;

    const filteringAction: ( ds: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[], query?: Query | null )
    => void = useCallback(( ds: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[], query?: Query | null ) => {
        if (externalFilterInputRef?.current != null && externalFilterInputRef.current.value.trim() !== '') {
            const filterQuery: Query = getResolvedQuery(query || baseQuery);
            if (!query) {
                const op: 'startsWith' | 'endsWith' | 'contains' = normalizeOperator(filterType);
                const isPrimitive: boolean = Array.isArray(ds) && ds.length > 0 && (typeof (ds)[0] === 'string' || typeof (ds)[0] === 'number'
                || typeof (ds)[0] === 'boolean');
                if (isPrimitive) {
                    filterQuery.where('', op, externalFilterInputRef.current.value, ignoreCase, ignoreAccent);
                } else {
                    filterQuery.where((fields.text || 'text') as string, op, externalFilterInputRef.current.value, ignoreCase, ignoreAccent);
                }
            }
            setListData(ds, filterQuery, true, externalFilterInputRef.current.value);
        } else {
            setListData(ds, getResolvedQuery(query || baseQuery), true);
        }
    }, [filterType, fields, ignoreCase, ignoreAccent, setListData, baseQuery] );

    const searchLists: (e: React.ChangeEvent<HTMLInputElement>, filterValue?: string) => void =
        useCallback((e: React.ChangeEvent<HTMLInputElement>, filterValue?: string) => {
            if (isDropdownFiltering && externalFilterInputRef?.current != null) {
                const eventArgs: {
                    preventDefaultAction: boolean;
                    text: string;
                    event: React.ChangeEvent<HTMLInputElement>;
                } = {
                    preventDefaultAction: false,
                    text: filterValue as string,
                    event: e
                };
                if (onFilter) {
                    onFilter(eventArgs);
                }
                if (!eventArgs.preventDefaultAction && dataSource) {
                    filteringAction(dataSource, null);
                }
            }
        }, [isDropdownFiltering, filteringAction, onFilter, dataSource] );

    const filter: ( ds: { [key: string]: unknown }[] | DataManager | string[] | number[] | boolean[], query?: Query) => void =
    useCallback( (  ds: { [key: string]: unknown }[] | DataManager | string[] | number[] |
    boolean[], query?: Query ) => {
        filteringAction(ds, query);
    }, [typedString, ignoreCase, filteringAction] );

    const handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setTypedString(e.target.value);
            searchLists(e, e.target.value);
        },
        [searchLists]
    );

    const clearText: (e: React.MouseEvent) => void = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setTypedString('');
        setListData(dataSource, baseQuery || new Query(), true);
    }, [setTypedString, setListData, dataSource, baseQuery]);

    return { handleInputChange, clearText, filter };
};
