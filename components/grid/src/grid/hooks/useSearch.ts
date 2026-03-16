import {  Dispatch, RefObject, SetStateAction, useCallback, useEffect, useState } from 'react';
import {  SearchEvent, SearchSettings } from '../types/search.interfaces';
import { isNullOrUndefined} from '@syncfusion/react-base';
import { GridRef } from '../types/grid.interfaces';
import { SearchAPI } from '../types/search.interfaces';
import { ActionType, ScrollMode, VirtualSettings } from '../types';

/**
 * Custom hook to manage Search configuration
 *
 * @private
 * @param {RefObject<GridRef>} gridRef - Reference to the grid component
 * @param {SearchSettings} searchSetting - Reference to the search settings
 * @param {Function} setGridAction - Function to update grid actions
 * @param {Function} setCurrentPage - State Dispatch Function to update grid currentPage
 * @param {Function} virtualSettings - virtualization settings
 * @param {Function} scrollMode - scroll mode setting
 * @returns {SearchAPI} An object containing various sort-related state and API
 */
export const useSearch: (gridRef?: RefObject<GridRef>, searchSetting?: SearchSettings,
    setGridAction?: (action: Object) => void, setCurrentPage?: Dispatch<SetStateAction<number>>, virtualSettings?: VirtualSettings,
    scrollMode?: ScrollMode) => SearchAPI = (gridRef?: RefObject<GridRef>, searchSetting?: SearchSettings,
                                             setGridAction?: (action: Object) => void,
                                             setCurrentPage?: Dispatch<SetStateAction<number>>, virtualSettings?: VirtualSettings,
                                             scrollMode?: ScrollMode) => {
    const [searchSettings, setSearchSetting] = useState<SearchSettings>(searchSetting);

    /**
     * update searchSettings properties searchModule
     */
    useEffect(() => {
        setSearchSetting(searchSetting);
        if (gridRef.current?.contentScrollRef && scrollMode === ScrollMode.Virtual && virtualSettings.enableRow &&
            virtualSettings.enableCache) {
            setCurrentPage(1);
        }
    }, [searchSetting]);

    /**
     * Checks if the input string contains non-numeric characters.
     *
     * @param {string} searchString - The string to be checked for non-numeric characters.
     * @returns {boolean} - `true` if the input string contains non-numeric characters, `false` otherwise.
     */
    const hasNonNumericCharacters: (searchString: string) => boolean = useCallback((searchString: string): boolean => {
        let decimalFound: boolean = false;
        for (const char of searchString) {
            if ((char < '0' || char > '9') && char !== '.') {
                return true;
            }
            if (char === '.') {
                if (decimalFound) {
                    // If decimal is found more than once, it's not valid
                    return true;
                }
                decimalFound = true;
            }
        }
        return false;
    }, []);

    /**
     * Searches Grid records by given key.
     *
     * @param  {string} searchString - Defines the key.
     * @returns {void}
     */
    const search: (searchString: string) => void = async(searchString: string): Promise<void> => {
        searchString = isNullOrUndefined(searchString) ? '' : searchString;
        let searchValue: string | number;
        if (gridRef.current?.searchSettings?.enabled === false) { return; }
        if (searchString !== gridRef.current.searchSettings.value) {
            // Check searchString is number and parseFloat to remove trailing zeros
            if (searchString !== '' && !hasNonNumericCharacters(searchString)) {
                if (searchString === '.' || (searchString.indexOf('.') === -1)) {
                    searchValue = searchString.toString();
                } else {
                    searchValue = parseFloat(searchString).toString();
                }
            } else {
                searchValue = searchString.toString();
            }
            const args: SearchEvent = { cancel: false, requestType: ActionType.Searching, value: searchValue };
            args.type = ActionType.Searching;
            const confirmResult: boolean = await gridRef.current?.editModule?.checkUnsavedChanges?.();
            if (!isNullOrUndefined(confirmResult) && !confirmResult) {
                return;
            }
            gridRef.current.onSearchStart?.(args);
            if (args.cancel) {
                return;
            }
            gridRef.current.searchSettings.value = searchValue;
            setSearchSetting((prevSettings: SearchSettings) => {
                return { ...prevSettings, key: searchValue as string };
            });
            args.type = 'actionComplete';
            setGridAction(args);
            if (gridRef.current?.contentScrollRef && scrollMode === ScrollMode.Virtual && virtualSettings.enableRow &&
                virtualSettings.enableCache) {
                setCurrentPage(1);
            }
        }
    };


    return { search, searchSettings, setSearchSetting };
};
