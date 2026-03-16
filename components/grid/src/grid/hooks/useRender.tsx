import {
    CSSProperties,
    useCallback,
    useEffect,
    useMemo,
    useState,
    ReactNode,
    ReactElement,
    JSX,
    Children,
    isValidElement,
    RefObject,
    useRef
} from 'react';
import {
    PendingState, MutableGridSetter, UseRenderResult
} from '../types/interfaces';
import {
    IGrid,
    IGridBase,
    GridRef } from '../types/grid.interfaces';
import { ColumnProps, PrepareColumns, IColumnBase } from '../types/column.interfaces';
import { AggregateRowProps, AggregateColumnProps } from '../types/aggregate.interfaces';
import { formatUnit, isNullOrUndefined } from '@syncfusion/react-base';
import { DataManager, DataResult, ReturnType } from '@syncfusion/react-data';
import { Column, ColumnBase } from '../components';
import {
    useGridComputedProvider,
    useGridMutableProvider
} from '../contexts';
import { defaultColumnProps } from '../hooks';
import { Columns, RenderBase, Aggregates } from '../views';
import { compareSelectedProperties, parseUnit, updateUIColumnType } from '../utils';
import { ActionType, ColumnType, FilterEvent, PageEvent, ScrollMode, SearchEvent, ServiceLocator, SortEvent } from '../types';

/**
 * CSS class names used in the component
 */
const CSS_CLASS_NAMES: Record<string, string> = {
    VISIBLE: '',
    HIDDEN: 'none'
};

/**
 * Custom hook to manage rendering state and data for the grid
 *
 * @private
 * @returns {UseRenderResult} Object containing APIs for grid rendering
 */
export const useRender: <T>() => UseRenderResult<T> = <T, >(): UseRenderResult<T> => {
    const grid: Partial<GridRef<T>> & Partial<MutableGridSetter<T>> = useGridComputedProvider<T>();
    const { setCurrentViewData, setInitialLoad, setTotalRecordsCount, aggregates, pageSettings,
        sortSettings, scrollModule } = grid;
    const { currentViewData, currentPage, gridAction, isInitialLoad, virtualSettings, scrollMode, uiColumns, setResponseData,
        dataModule, totalRecordsCount, selectionModule, setVirtualCachedViewData } =
        useGridMutableProvider<T>();

    const [isContentBusy, setIsContentBusy] = useState<boolean>(true);
    const [isLayoutRendered, setIsLayoutRendered] = useState<boolean>(false);
    const isColTypeDef: RefObject<boolean> = useRef<boolean>(false);

    /**
     * Get data operations from the grid's dataModule
     * This ensures single source of truth for DataManager across all components
     */
    const dataManager: DataManager | DataResult = dataModule?.dataManager;
    const generateQuery: Function = dataModule?.generateQuery;
    /**
     * Compute content styles based on grid height
     */
    const contentStyles: CSSProperties = useMemo<CSSProperties>(() => ({
        height: formatUnit(grid.height as string | number), // required inline element styles for responsive UI state update
        overflowY: grid.height === 'auto' ? (!virtualSettings.enableRow ? 'hidden' : 'auto') : 'scroll'
    }), [grid.height, virtualSettings.enableRow]);

    useMemo(() => {
        if (scrollMode === ScrollMode.Virtual && !isNullOrUndefined(scrollModule?.isDataOperationPreventVirtualCache.current)) {
            scrollModule.isDataOperationPreventVirtualCache.current = true;
        }
    }, [grid.filterSettings?.columns, grid.filterSettings?.columns.length, grid.sortSettings?.columns,
        grid.sortSettings?.columns.length, grid.searchSettings?.value, scrollMode]);

    const updateColumnTypes: (data: Object) => void = useCallback((data: Object) => {
        (uiColumns.current ?? grid.columns).map((newColumn: Partial<IColumnBase<T>>, index: number) => {
            if (!uiColumns.current) {
                uiColumns.current = [];
            }
            uiColumns.current[index as number] = updateUIColumnType(data, newColumn, grid.serviceLocator, isColTypeDef) as ColumnProps<T>;
            return newColumn;
        });
    }, [grid.columns, uiColumns.current]);

    /**
     * Handle successful data retrieval
     */
    const dataManagerSuccess: (response: Response | ReturnType) => void = useCallback((response: Response | ReturnType): void => {
        const data: ReturnType = response as ReturnType;
        if (!data?.result?.length && data.count && (grid.pageSettings?.enabled || scrollMode === ScrollMode.Virtual)
            && gridAction.requestType !== ActionType.Paging) {
            if (Object.keys(gridAction).length) {
                delete gridAction.cancel;
                if (gridAction.requestType === ActionType.Filtering || gridAction.requestType === ActionType.ClearFiltering) {
                    gridAction.type = 'filtered';
                    grid.onFilter?.(gridAction);
                } else if (gridAction.requestType === ActionType.Searching) {
                    gridAction.type = 'searched';
                    grid.onSearch?.(gridAction);
                }
            }
            grid.goToPage(Math.ceil(data.count / grid.pageSettings.pageSize));
            return;
        }
        if (grid.pageSettings?.enabled || scrollMode === ScrollMode.Virtual) {
            grid.pagerModule?.goToPage(currentPage);
        }
        setTotalRecordsCount(data.count);
        setResponseData(data);

        if (grid.onDataLoadStart) {
            grid.onDataLoadStart(data);
        }
        if (!grid.selectionSettings?.persistSelection) {
            grid.clearSelection();
        }

        /**
         * Data manager success handler:
         * Updates virtual cache and current view data based on active pages.
         */
        if (scrollMode === ScrollMode.Virtual && scrollModule?.virtualRowInfo?.currentPages.length > 1) {
            const activePages: number[] = scrollModule.virtualRowInfo.currentPages; // e.g., [2, 3]
            const pageSize: number = pageSettings.pageSize;

            setVirtualCachedViewData((prevMap: Map<number, T>) => {
                const newMap: Map<number, T> = new Map<number, T>();
                const newViewData: T[] = [];

                if (!scrollModule?.isDataOperationPreventVirtualCache.current) {
                    // Retain data for active pages and build newViewData
                    for (const page of activePages) {
                        const startKey: number = (page - 1) * pageSize;
                        const endKey: number = startKey + pageSize;
                        for (let key: number = startKey; key < endKey; key++) {
                            if (prevMap.has(key)) {
                                const item: T = prevMap.get(key)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                                newMap.set(key, item);
                                newViewData.push(item);
                            }
                        }
                    }
                }

                // Add new data for current page
                const startKey: number = (pageSettings.currentPage - 1) * pageSize;
                for (let i: number = 0; i < data.result.length; i++) {
                    const item: T = data.result[i as number] as T;
                    newMap.set(startKey + i, item);
                    newViewData.push(item);
                }

                // Update currentViewData in the same loop
                setCurrentViewData(newViewData);

                return newMap;
            });

        } else {
            if (scrollMode === ScrollMode.Virtual) {
                // Single page virtual mode: reset everything only if cache not enabled
                setVirtualCachedViewData((prevMap: Map<number, T>) => {
                    const newMap: Map<number, T> = !virtualSettings.enableCache ||
                        scrollModule?.isDataOperationPreventVirtualCache.current ? new Map<number, T>() : prevMap;
                    const startKey: number = (pageSettings.currentPage - 1) * pageSettings.pageSize;
                    for (let i: number = 0; i < data.result.length; i++) {
                        newMap.set(startKey + i, data.result[i as number] as T);
                    }
                    return newMap;
                });
            }
            setCurrentViewData(data.result as T[]);
        }
        if (!isColTypeDef.current && data.result.length > 0) {
            updateColumnTypes(data.result[0]);
        }
        setIsLayoutRendered(true);
    }, [grid.onDataLoadStart, setCurrentViewData, gridAction, virtualSettings, scrollModule?.isDataOperationPreventVirtualCache,
        scrollMode]);

    /**
     * Handle data retrieval failure
     */
    const dataManagerFailure: (error: Error) => void = useCallback((error: Error): void => {
        grid?.element?.setAttribute?.('aria-busy', 'false'); // To prevent react bad state update error dom manipulate along with state update which will reflect only through ref like useEffect.
        setIsContentBusy(false);
        grid.onError?.(error);
    }, [grid.onError]);

    /**
     * Show the loading spinner
     */
    const showSpinner: () => void = useCallback(() => {
        grid?.element?.setAttribute?.('aria-busy', 'true'); // To prevent react bad state update error dom manipulate along with state update which will reflect only through ref like useEffect.
        setIsContentBusy(true);
    }, []);

    /**
     * Hide the loading spinner
     */
    const hideSpinner: () => void = useCallback(() => {
        grid?.element?.setAttribute?.('aria-busy', 'false'); // To prevent react bad state update error dom manipulate along with state update which will reflect only through ref like useEffect.
        setIsContentBusy(false);
    }, []);

    /**
     * Refresh data from the data manager
     */
    const refreshDataManager: () => void = useCallback((): void => {
        grid?.element?.setAttribute?.('aria-busy', 'true'); // To prevent react bad state update error dom manipulate along with state update which will reflect only through ref like useEffect.
        setIsContentBusy(true);
        showSpinner();
        if (dataModule.dataState.current.isPending) {
            setTimeout(() => {
                dataModule.dataState.current.resolver?.(dataManager);
                if (isNullOrUndefined(dataModule.dataState.current.resolver) || dataModule.dataState.current.isEdit) {
                    dataManagerSuccess(dataManager as ReturnType);
                }
                dataModule.dataState.current = { isPending: false, resolver: undefined, isEdit: false };
            }, 0);
        } else {
            const dataManagerPromise: Promise<Object> = dataModule.getData(gridAction, generateQuery().requiresCount());
            dataManagerPromise.then(dataManagerSuccess).catch(dataManagerFailure);
        }
    }, [dataManager, grid.query, dataManagerSuccess, dataManagerFailure, grid.showSpinner, currentPage,
        aggregates, gridAction, grid.filterSettings, grid.sortSettings,  grid.searchSettings, pageSettings.pageSize]);

    // Initial data load
    useMemo(() => {
        refreshDataManager();
    }, [dataManager, grid.query, grid.columns, currentPage, aggregates, pageSettings?.enabled,
        grid.filterSettings, grid.sortSettings,  grid.searchSettings, pageSettings.pageSize]);

    // Handle layout rendered state
    useEffect(() => {
        if (isLayoutRendered) {
            if (scrollMode === ScrollMode.Auto) {
                selectionModule?.updateHeaderSelectionState?.();
            }
            hideSpinner();
            if (grid.onDataLoad) {
                grid.onDataLoad();
            }
            if (isInitialLoad) {
                grid?.onGridRenderComplete?.();
            }
            if (Object.keys(gridAction).length) {
                delete gridAction.cancel;
                if (gridAction.requestType === ActionType.Filtering || gridAction.requestType === ActionType.ClearFiltering) {
                    gridAction.type = 'filtered';
                    const eventArgs: FilterEvent = {
                        action: (gridAction as FilterEvent).action,
                        columns: (gridAction as FilterEvent).columns,
                        currentFilterColumn: (gridAction as FilterEvent).currentFilterColumn,
                        currentFilterPredicate: (gridAction as FilterEvent).currentFilterPredicate
                    };
                    grid.onFilter?.(eventArgs);
                } else if (gridAction.requestType === ActionType.Sorting || gridAction.requestType === ActionType.ClearSorting) {
                    gridAction.type = 'sorted';
                    const eventArgs: SortEvent = {
                        direction: (gridAction as SortEvent).direction,
                        field: (gridAction as SortEvent).field,
                        event: (gridAction as SortEvent).event,
                        action: gridAction.requestType,
                        columns: sortSettings.columns
                    };
                    grid.onSort?.(eventArgs);
                } else if (gridAction.requestType === ActionType.Searching) {
                    gridAction.type = 'searched';
                    const eventArgs: SearchEvent = {
                        value: (gridAction as SearchEvent).value
                    };
                    grid.onSearch?.(eventArgs);
                } else if (gridAction.requestType === ActionType.Paging) {
                    gridAction.type = 'pageChanged';
                    const eventArgs: PageEvent = {
                        currentPage: (gridAction as PageEvent).currentPage,
                        previousPage: (gridAction as PageEvent).previousPage,
                        totalRecordsCount: totalRecordsCount
                    };
                    grid.onPageChange?.(eventArgs);
                } else if (gridAction.requestType === 'Refresh' && gridAction.name === 'onActionComplete') {
                    gridAction.type = 'refreshed';
                    grid.onRefresh?.();
                }
                gridAction.type = 'actionComplete';
            }
            const actionCompleteEvent: CustomEvent = new CustomEvent('actionComplete');
            grid.element.dispatchEvent(actionCompleteEvent);
            const virtualScrollActionCompleteEvent: CustomEvent = new CustomEvent('virtualScrollSequencialRequest');
            grid.element.dispatchEvent(virtualScrollActionCompleteEvent);
            grid?.element?.setAttribute?.('aria-busy', 'false'); // To prevent react bad state update error dom manipulate along with state update which will reflect only through ref like useEffect.
            setIsContentBusy(false);
            setInitialLoad(false);
        }
    }, [isLayoutRendered, currentViewData]);

    // Memoize APIs to prevent unnecessary re-renders
    const publicRenderAPI: Partial<IGrid<T>> = useMemo(() => ({ ...grid }), [grid]);

    const privateRenderAPI: UseRenderResult<T>['privateRenderAPI'] = useMemo(() => ({
        contentStyles,
        isLayoutRendered,
        isContentBusy
    }), [contentStyles, isLayoutRendered, isContentBusy]);

    const protectedRenderAPI: UseRenderResult<T>['protectedRenderAPI'] = useMemo(() => ({
        refresh: refreshDataManager,
        showSpinner,
        hideSpinner
    }), [refreshDataManager]);

    return {
        publicRenderAPI,
        privateRenderAPI,
        protectedRenderAPI
    };
};

/**
 * Generate a unique key for a column
 *
 * @param {ColumnProps} columnProps - Column properties
 * @param {string} index - Index path for uniqueness
 * @param {string} prefix - Optional prefix for the key
 * @returns {string} Unique key for the column
 */
const generateUniqueKey: (columnProps: ColumnProps, index: string, prefix?: string) => string =
    (columnProps: ColumnProps, index: string, prefix: string = ''): string => {
        // Use field if available, otherwise use headerText, or fallback to index
        const baseKey: string = columnProps.field || columnProps.headerText || 'col';
        // Add a unique suffix based on the index path to ensure uniqueness
        return `${prefix}${baseKey}-${index}`;
    };

/**
 * Type definition for keys to compare in column objects
 * Improves type safety and provides better auto-completion
 */
type ColumnCompareKeys = Array<keyof ColumnProps>;
type AggregateColumnCompareKeys = Array<keyof AggregateColumnProps>;

/**
 * Get relevant column properties that should trigger change detection
 * This allows for better performance by only comparing properties that matter
 *
 * @returns {ColumnCompareKeys} - Data Affecting column properties comparison keys
 */
function getDataColumnCompareKeys(): ColumnCompareKeys {
    return [
        'allowSort', 'allowFilter', 'allowSearch', 'columns'
    ];
}

/**
 * Get relevant column properties that should trigger change detection
 * This allows for better performance by only comparing properties that matter
 *
 * @returns {ColumnCompareKeys} - UI Affecting column properties comparison keys
 */
function getUIColumnCompareKeys(): ColumnCompareKeys {
    return [
        'textAlign', 'headerTextAlign', 'disableHtmlEncode', 'clipMode', 'customAttributes', 'format', 'displayAsCheckBox', 'allowEdit',
        'templateSettings', 'edit', 'width', 'visible', 'headerText', 'template', 'headerTemplate', 'editTemplate',
        'valueAccessor', 'headerCheckbox', 'type', 'autoHeight'
    ];
}

/**
 * Get relevant aggregate column properties that should trigger change detection
 * This allows for better performance by only comparing properties that matter
 *
 * @returns {AggregateColumnCompareKeys} - Data Affecting aggregate column properties comparison keys
 */
function getAggregateColumnCompareKeys(): AggregateColumnCompareKeys {
    return [
        'type', 'format', 'columnName', 'field'
    ];
}

/**
 * Prepare columns from children or column definitions
 *
 * @param {ServiceLocator} serviceLocator - ServiceLocator for column formatting and parsing property updates.
 * @param {Object[]} children - Child react elements or column definitions
 * @param {number} parentDepth - Current depth in the column hierarchy
 * @param {string} parentIndex - Index path for uniqueness
 * @param {ColumnProps[]} prevColumns - previous columns which is used to compare old and new and detect whether customer changed state is related to column or not.
 * @param {ColumnProps[]} typeDetectedUIColumns - After getting data type updated ui columns.
 * @param {IGridBase} gridProps - The grid configured properties.
 * @param {boolean} isAutoHeightEnabled - Flag to indicate if auto height is enabled for any column, used for optimization to avoid unnecessary checks.
 * @returns {Object} Object containing columns, depth, children, and column group elements
 */
const prepareColumns: <T>(
    serviceLocator: ServiceLocator,
    children: ReactNode | (ColumnProps<T> | ReactElement)[],
    parentDepth?: number,
    parentIndex?: string,
    prevColumns?: ColumnProps<T>[],
    typeDetectedUIColumns?: ColumnProps<T>[],
    gridProps?: Partial<IGridBase<T>>,
    isAutoHeightEnabled?: boolean
) =>
PrepareColumns<T>
= <T, >(
    serviceLocator: ServiceLocator,
    children: ReactNode | (ColumnProps<T> | ReactElement)[],
    parentDepth: number = 0,
    parentIndex: string = '',
    prevColumns?: ColumnProps<T>[],
    typeDetectedUIColumns?: ColumnProps<T>[],
    gridProps?: IGridBase<T>,
    isAutoHeightEnabled: boolean = false
): PrepareColumns<T> => {
    let totalVirtualColumnWidth: number = 0;
    const columnOffsets: { [key: number]: number } = {};
    let maxDepth: number = parentDepth;
    let isCommandEditEnabled: boolean = false;
    let isColumnChanged: boolean = false; // currently used/handled always column state changed manner even unrelated state change props.children changed.
    let isUIColumnpropertiesChanged: boolean = false;
    let isCheckBoxColumn: boolean = false;
    const columns: ColumnProps<T>[] = [];
    const visibleColumns: ColumnProps<T>[] = [];
    const adjustedChildren: ReactNode[] = [];
    const colGroup: JSX.Element[] = [];
    const childArray: ReactElement[] = Array.isArray(children)
        ? children as ReactElement[]
        : Children.toArray(children) as ReactElement[];

    for (let i: number = 0, columnIndex: number = 0; i < childArray.length; i++) {
        const child: ReactElement = childArray[i as number];
        const currentIndex: string = parentIndex ? `${parentIndex}-${i}` : `${i}`;

        if (isValidReactElement(child) && (
            child.type === ColumnBase ||
            child.type === RenderBase ||
            child.type === Columns ||
            child.type === Column
        )) {
            const columnProps: ColumnProps<T> = defaultColumnProps<T>(child.props as ColumnProps<T>, serviceLocator, gridProps,
                                                                      typeDetectedUIColumns?.[columnIndex as number]);
            // Generate a unique key for the column
            const columnKey: string = generateUniqueKey(columnProps, currentIndex);

            if (child.type === ColumnBase || child.type === Column) {
                // Check for and process nested columns
                if ((child.props as { children: ReactNode })?.children) {
                    const childContents: PrepareColumns<T> = prepareColumns<T>(
                        serviceLocator,
                        (child.props as { children: ReactElement })?.children,
                        parentDepth + 1,
                        currentIndex,
                        prevColumns,
                        typeDetectedUIColumns,
                        gridProps,
                        isAutoHeightEnabled
                    );
                    totalVirtualColumnWidth += childContents.totalVirtualColumnWidth;
                    const keys: string[] = Object.keys(childContents.columnOffsets);
                    for (let offsetIndex: number = 0; offsetIndex < keys.length; offsetIndex++) {
                        visibleColumns.push(childContents.visibleColumns[offsetIndex as number]);
                        columnOffsets[visibleColumns.length as number] = childContents.columnOffsets[keys[offsetIndex as number] as string];
                    }
                    isCommandEditEnabled = childContents.isCommandEditEnabled;
                    isAutoHeightEnabled = isAutoHeightEnabled || childContents.isAutoHeightEnabled;
                    isColumnChanged = childContents.isColumnChanged;
                    isUIColumnpropertiesChanged = childContents.isUIColumnpropertiesChanged;
                    isCheckBoxColumn = childContents.isCheckBoxColumn;
                    columns.push({ ...columnProps, columns: childContents.columns }); // Nest child columns
                    colGroup.push(...childContents.colGroup); // Gather col elements from child columns
                    maxDepth = Math.max(maxDepth, childContents.depth);
                } else {
                    if (prevColumns?.[columnIndex as number]?.field === columnProps.field) {
                        // Only compare specific properties that should trigger a change
                        const hasChanged: boolean = isColumnChanged || !compareSelectedProperties(
                            prevColumns?.[columnIndex as number],
                            columnProps,
                            getDataColumnCompareKeys()
                        );
                        // Update isColumnChanged if any changes detected
                        isColumnChanged = isColumnChanged || hasChanged;
                        const hasUIChanged: boolean = isColumnChanged || !compareSelectedProperties(
                            prevColumns?.[columnIndex as number],
                            columnProps,
                            getUIColumnCompareKeys()
                        );
                        isUIColumnpropertiesChanged = isUIColumnpropertiesChanged || hasUIChanged;
                    }
                    // columnProps.index = columns.length;
                    columns.push(columnProps);
                    if (columnProps.type === ColumnType.Checkbox) {
                        isCheckBoxColumn = true;
                    }
                    if (columnProps.visible) {
                        isCommandEditEnabled = !isNullOrUndefined(columnProps.getCommandItems);
                        isAutoHeightEnabled = isAutoHeightEnabled || columnProps.autoHeight;
                        totalVirtualColumnWidth += parseUnit(columnProps.width) ?? 150;
                        visibleColumns.push(columnProps);
                        columnOffsets[visibleColumns.length as number] = totalVirtualColumnWidth;
                        // Only create col elements for leaf columns
                        colGroup.push(
                            <col
                                key={`col-${columnKey}-${Math.random().toString(36).substr(2, 9)}`}
                                style={{
                                    width: columnProps.width,
                                    display: CSS_CLASS_NAMES.VISIBLE
                                }}
                            />
                        );
                        adjustedChildren.push(
                            <ColumnBase<T> key={`col-base-${columnKey}`} {...columnProps}>
                                {(child.props as { children: ReactElement })?.children}
                            </ColumnBase>
                        );
                    }
                }
                columnIndex++;
            } else if (child.type === RenderBase || child.type === Columns) {
                const {
                    columns: childColumns,
                    depth,
                    colGroup: childColGroup,
                    children,
                    isColumnChanged: isChildrenColumnsChanged,
                    isUIColumnpropertiesChanged: isChildrenColumnsUIChanged,
                    isCheckBoxColumn: isChildCheckboxColumn,
                    totalVirtualColumnWidth: totalColumnWidth,
                    columnOffsets: childColumnOffsets,
                    visibleColumns: childVisibleColumns,
                    isCommandEditEnabled: isChildCommandEditEnabled,
                    isAutoHeightEnabled: isChildAutoHeightEnabled
                } = prepareColumns<T>(
                    serviceLocator,
                    (child.props as { children: ReactElement })?.children,
                    parentDepth,
                    currentIndex,
                    prevColumns,
                    typeDetectedUIColumns,
                    gridProps,
                    isAutoHeightEnabled
                );
                isCommandEditEnabled = isChildCommandEditEnabled;
                isAutoHeightEnabled = isAutoHeightEnabled || isChildAutoHeightEnabled;
                totalVirtualColumnWidth += totalColumnWidth;
                const keys: string[] = Object.keys(childColumnOffsets);
                for (let offsetIndex: number = 0; offsetIndex < keys.length; offsetIndex++) {
                    visibleColumns.push(childVisibleColumns[offsetIndex as number]);
                    columnOffsets[visibleColumns.length as number] = childColumnOffsets[keys[offsetIndex as number] as string];
                }
                isColumnChanged = isChildrenColumnsChanged;
                isUIColumnpropertiesChanged = isChildrenColumnsUIChanged;
                isCheckBoxColumn = isChildCheckboxColumn;
                columns.push(...childColumns);
                colGroup.push(...childColGroup);
                adjustedChildren.push(
                    ((children as ReactElement).props as { children: ReactElement[] })?.children
                );
                maxDepth = Math.max(maxDepth, depth);
            }
        } else if (isColumnObject(child)) {
            const columnObject: ColumnProps<T> =
                defaultColumnProps<T>(child as ColumnProps<T>, serviceLocator, gridProps, typeDetectedUIColumns?.[i as number]);
            const columnKey: string = generateUniqueKey(columnObject, currentIndex, 'obj-');

            if (prevColumns?.[columnIndex as number]?.field === columnObject.field) {
                // Only compare specific properties that should trigger a change
                const hasChanged: boolean = isColumnChanged || !compareSelectedProperties(
                    prevColumns?.[columnIndex as number],
                    columnObject,
                    getDataColumnCompareKeys()
                );
                // Update isColumnChanged if any changes detected
                isColumnChanged = isColumnChanged || hasChanged;
                const hasUIChanged: boolean = isColumnChanged || !compareSelectedProperties(
                    prevColumns?.[columnIndex as number],
                    columnObject,
                    getUIColumnCompareKeys()
                );
                isUIColumnpropertiesChanged = isUIColumnpropertiesChanged || hasUIChanged;
            }
            columns.push(columnObject);
            if (columnObject.type === ColumnType.Checkbox) {
                isCheckBoxColumn = true;
            }
            if (columnObject.visible) {
                isCommandEditEnabled = !isNullOrUndefined(columnObject.getCommandItems);
                isAutoHeightEnabled = isAutoHeightEnabled || columnObject.autoHeight;
                totalVirtualColumnWidth += parseUnit(columnObject.width) ?? 150;
                visibleColumns.push(columnObject);
                columnOffsets[visibleColumns.length as number] = totalVirtualColumnWidth;
                adjustedChildren.push(<ColumnBase<T> key={columnKey} {...columnObject} />);

                // Generate col element for object definitions
                colGroup.push(
                    <col
                        key={`col-${columnKey}-${Math.random().toString(36).substr(2, 9)}`}
                        style={{
                            width: columnObject.width,
                            display: CSS_CLASS_NAMES.VISIBLE
                        }}
                    />
                );
            }
            columnIndex++;
        }
    }

    if (maxDepth === parentDepth) {
        maxDepth++;
    }

    return {
        columns,
        depth: maxDepth,
        children: <RenderBase<T> key={'Columns'}>{adjustedChildren}</RenderBase>,
        colGroup,
        isColumnChanged,
        isUIColumnpropertiesChanged,
        isCheckBoxColumn,
        totalVirtualColumnWidth,
        columnOffsets,
        visibleColumns,
        isCommandEditEnabled,
        isAutoHeightEnabled
    };
};

/**
 * Helper function to check if an element is a valid React element
 *
 * @param {ReactNode} element - Element to check
 * @returns {boolean} true if the element is a valid React element
 */
const isValidReactElement: (element: ReactNode) => element is ReactElement = (element: ReactNode): element is ReactElement => {
    return isValidElement(element);
};

/**
 * Helper function to check if an object is a column model
 *
 * @param {ColumnProps | ReactNode} child - Object to check
 * @returns {boolean} true if the object is a column model
 */
function isColumnObject(child: ColumnProps | ReactNode): child is ColumnProps {
    return !isValidReactElement(child as ReactElement) &&
        typeof child === 'object' &&
        child !== null &&
        ('field' in child || (child as ColumnProps)?.type === ColumnType.Checkbox ||
        !isNullOrUndefined((child as ColumnProps)?.getCommandItems));
}

/**
 * Custom hook to process columns from props
 *
 * @param {Partial<IGridBase>} props - Grid properties
 * @param {ServiceLocator} serviceLocator - ServiceLocator for column formatting and parsing property updates.
 * @param {RefObject<GridRef>} gridRef - Grid reference object properties
 * @param {RefObject<PendingState>} dataState - Data state object properties
 * @param {RefObject<boolean>} isInitialBeforePaint - UI column properties changes not trigger event purpose boolean
 * @param {Object[]} currentViewData - Updated Current view data
 * @param {ColumnProps[]} typeDetectedUIColumns - After getting data type updated ui columns.
 * @returns {Partial<IGridBase>} Updated grid properties with processed columns
 */
export const useColumns: <T>(props: Partial<IGridBase<T>>, serviceLocator: ServiceLocator, gridRef: RefObject<GridRef<T>>,
    dataState?: RefObject<PendingState>, isInitialBeforePaint?: RefObject<boolean>, currentViewData?: T[],
    typeDetectedUIColumns?: ColumnProps<T>[]) =>
Partial<Omit<IGridBase<T>, 'uiColumns'>> & { uiColumns: ColumnProps<T>[], isCheckBoxColumn: boolean, totalVirtualColumnWidth: number,
    columnOffsets: {[key: number]: number}, visibleColumns: ColumnProps<T>[], isCommandEditEnabled: boolean,
    isAutoHeightEnabled: boolean } =
    <T, >(props: Partial<IGridBase<T>>, serviceLocator: ServiceLocator, gridRef: RefObject<GridRef<T>>, dataState?: RefObject<PendingState>,
        isInitialBeforePaint?: RefObject<boolean>, currentViewData?: T[], typeDetectedUIColumns?: ColumnProps<T>[]):
    Partial<Omit<IGridBase<T>, 'uiColumns'>> & { uiColumns: ColumnProps<T>[], isCheckBoxColumn: boolean,
        totalVirtualColumnWidth: number, columnOffsets: {[key: number]: number},
        visibleColumns: ColumnProps<T>[], isCommandEditEnabled: boolean, isAutoHeightEnabled: boolean } => {
        const prevPrepareColumns: RefObject<PrepareColumns<T>> = useRef({} as PrepareColumns<T>);
        const isNoColumnRemoteData: boolean = useMemo(() => {
            return !props.columns && !prevPrepareColumns.current?.columns?.length && props.dataSource instanceof DataManager
                && props.dataSource.dataSource.url && Array.isArray(currentViewData) && currentViewData?.length > 0;
        }, [props.children, props.columns, props.dataSource, currentViewData]);
        let isDataSourceChanged: boolean = false;
        useMemo(() => isDataSourceChanged = true, [props.dataSource]);
        const { children, depth: headerRowDepth, columns, colGroup, uiColumns, totalVirtualColumnWidth, columnOffsets, isCheckBoxColumn,
            visibleColumns, isCommandEditEnabled, isAutoHeightEnabled } = useMemo(() => {
            if (dataState.current.isPending && prevPrepareColumns.current.columns) {
                return prevPrepareColumns.current;
            }
            const result: PrepareColumns<T> = prepareColumns<T>(
                serviceLocator,
                props.columns as ColumnProps<T>[] ??
                    (!isNoColumnRemoteData ? props.children : null) ??
                    ((Array.isArray(props.dataSource) && (props.dataSource as Object[]).length > 0)
                        ? Object.keys((props.dataSource as Object[])[0])
                            .map((key: string) => ({
                                field: key,
                                headerText: key
                            }))
                        : ((Array.isArray(currentViewData) && currentViewData?.length > 0)
                            ? Object.keys(currentViewData[0])
                                .map((key: string) => ({
                                    field: key,
                                    headerText: key
                                }))
                            : undefined)
                    ), null, null, gridRef.current?.columns as ColumnProps<T>[], typeDetectedUIColumns, props
            );
            if (!result.isColumnChanged && gridRef.current?.columns) {
                if (result.isUIColumnpropertiesChanged || prevPrepareColumns.current?.columns?.length !== result.columns?.length) {
                    isInitialBeforePaint.current = true;
                    return {
                        ...prevPrepareColumns.current,
                        uiColumns: result.columns,
                        children: result.children,
                        colGroup: result.colGroup,
                        isCheckBoxColumn: result.isCheckBoxColumn,
                        visibleColumns: result.visibleColumns,
                        totalVirtualColumnWidth: result.totalVirtualColumnWidth,
                        columnOffsets: result.columnOffsets,
                        isCommandEditEnabled: result.isCommandEditEnabled,
                        isAutoHeightEnabled: result.isAutoHeightEnabled
                    };
                } else if (!isDataSourceChanged) {
                    return prevPrepareColumns.current;
                }
            }
            prevPrepareColumns.current = result;
            return result; // content refresh with dataManager request and triggering events.
        }, [props.children, props.columns, props.dataSource, isNoColumnRemoteData]);

        return useMemo(() => ({
            columns,
            uiColumns,
            visibleColumns,
            headerRowDepth,
            children,
            colElements: colGroup,
            isCheckBoxColumn,
            totalVirtualColumnWidth,
            columnOffsets,
            isCommandEditEnabled,
            isAutoHeightEnabled
        }), [columns, uiColumns, headerRowDepth]);
    };

const generateDirectiveAggregates: (props: { children?: ReactNode }) => AggregateRowProps[] =
    (props: { children?: ReactNode }): AggregateRowProps[] => {
        const aggregates: AggregateRowProps[] = [];
        const rowArray: ReactElement[] = Array.isArray(props.children)
            ? props.children as ReactElement[]
            : Children.toArray(props.children) as ReactElement[];
        for (let i: number = 0; i < rowArray.length; i++) {
            const aggregateRow: AggregateRowProps = { columns: [] };
            const childRow: AggregateRowProps = rowArray[parseInt(i.toString(), 10)].props;
            if (childRow.columns) {
                aggregateRow.columns = childRow.columns;
            } else if (childRow.children) {
                const aggregateColumns: AggregateColumnProps[] = [];
                const columnArray: ReactElement[] = Array.isArray(childRow.children)
                    ? childRow.children as ReactElement[]
                    : Children.toArray(childRow.children) as ReactElement[];
                for (let j: number = 0; j < columnArray.length; j++) {
                    const column: AggregateColumnProps = columnArray[parseInt(j.toString(), 10)].props;
                    aggregateColumns.push({...column});
                }
                aggregateRow.columns = aggregateColumns;
            }
            aggregates.push(aggregateRow);
        }
        return aggregates;
    };

const prepareAggregates: <T>(aggregates: AggregateRowProps[], gridRef: RefObject<GridRef<T>>) => boolean =
<T, >(aggregates: AggregateRowProps[], gridRef: RefObject<GridRef<T>>): boolean => {
    let isAggregateColumnsChanged: boolean = false;
    for (let i: number = 0; i < aggregates?.length; i++) {
        const columns: AggregateColumnProps<T>[] = aggregates[parseInt(i.toString(), 10)].columns;
        for (let j: number = 0; j < columns.length; j++) {
            if (!columns[parseInt(j.toString(), 10)].columnName) {
                if (gridRef.current?.aggregates?.[i as number]?.columns?.[j as number]?.columnName === columns[j as number].columnName
                ) {
                    // Only compare specific properties that should trigger a change
                    const hasChanged: boolean = !compareSelectedProperties(
                        gridRef.current?.aggregates?.[i as number]?.columns?.[j as number],
                        columns[j as number],
                        getAggregateColumnCompareKeys()
                    );
                    // Update isColumnChanged if any changes detected
                    isAggregateColumnsChanged = isAggregateColumnsChanged || hasChanged;
                }
                columns[parseInt(j.toString(), 10)].columnName = columns[parseInt(j.toString(), 10)].field;
            }
        }
    }
    return isAggregateColumnsChanged;
};

export const useAggregates: <T>(props: Partial<IGridBase<T>>, gridRef?: RefObject<GridRef<T>>) => AggregateRowProps[] =
    <T, >(props: Partial<IGridBase<T>>, gridRef?: RefObject<GridRef<T>>): AggregateRowProps[] => {
        let aggregates: AggregateRowProps[] = [];
        let isAggregateColumnsChanged: boolean = false;
        const childArray: ReactElement[] = Array.isArray(props.children)
            ? props.children as ReactElement[]
            : Children.toArray(props.children) as ReactElement[];
        const directiveAggregates: ReactElement = childArray.find((child: ReactElement) => {
            return child && child.type === Aggregates;
        });
        if (props.aggregates) {
            aggregates = useMemo(() => props.aggregates, [props.aggregates]);
        } else if (directiveAggregates) {
            aggregates = useMemo(() => generateDirectiveAggregates(directiveAggregates.props), [props.children]);
        }
        isAggregateColumnsChanged = prepareAggregates<T>(aggregates, gridRef);
        return useMemo(() => {
            if (isAggregateColumnsChanged) {
                return aggregates;
            } else {
                return gridRef.current?.aggregates ?? aggregates;
            }
        }, [isAggregateColumnsChanged]);
    };
