import {
    useEffect,
    useRef,
    useState,
    useMemo,
    useCallback,
    memo,
    JSX,
    RefObject,
    MemoExoticComponent,
    ReactElement
} from 'react';
import {
    CellType,
    CellTypes,
    ColumnType,
    FilterPredicates,
    UseDataResult,
    SelectionMode,
    WrapMode,
    ActionType,
    FilterDialogBeforeOpenEvent
} from '../types';
import { IGrid } from '../types/grid.interfaces';
import { SortDescriptor } from '../types/sort.interfaces';
import { MutableGridSetter } from '../types/interfaces';
import {
    useGridComputedProvider,
    useGridMutableProvider
} from '../contexts';
import { useColumn } from '../hooks';
import { IL10n, isNullOrUndefined, SanitizeHtmlHelper } from '@syncfusion/react-base';
import { Checkbox, CheckboxChangeEvent } from '@syncfusion/react-buttons';
import { ArrowUpIcon, ArrowDownIcon, FilterIcon, FilterActiveIcon } from '@syncfusion/react-icons';
import { ColumnProps, IColumnBase, ColumnRef, CellClassProps } from '../types/column.interfaces';
import { CommandColumnBase } from './CommandColumn';
import { ExcelFilterArgs, ExcelFilter } from '../views/common/Excel-CheckBox-filter';
import { DataManager, DataResult } from '@syncfusion/react-data';

// CSS class constants following enterprise naming convention
const CSS_HEADER_CELL_DIV: string = 'sf-grid-header-cell';
const CSS_HEADER_TEXT: string = 'sf-grid-header-text';
const CSS_SORT_ICON: string = 'sf-grid-sort-container sf-icons';
const CSS_FILTER_ICON: string = 'sf-grid-filter-container sf-icons';
const CSS_SORT_NUMBER: string = 'sf-grid-sort-order';
const CSS_DESCENDING_SORT: string = 'sf-descending sf-icon-descending';
const CSS_ASENDING_SORT: string = 'sf-ascending sf-icon-ascending';
const CSS_COMMAND_CELL: string = 'sf-grid-command-cell';
const CSS_FIXED_HEIGHT_TEMPLATE_CELL: string = 'sf-templatecell';
const CSS_FIXED_HEIGHT_TEMPLATE_WRAPPER: string = 'fixed-height-wrapper';

/**
 * ColumnBase component renders a table cell (th or td) with appropriate content
 *
 * @component
 * @private
 * @param {IColumnBase} props - Component properties
 * @param {RefObject<ColumnRef>} ref - Forwarded ref to expose internal elements
 * @returns {JSX.Element} The rendered table cell (th or td)
 */
const ColumnBase: <T>(props: Partial<IColumnBase<T>>) => JSX.Element = memo(<T, >(props: Partial<IColumnBase<T>>) => {
    const grid: Partial<IGrid<T>> & Partial<MutableGridSetter<T>> = useGridComputedProvider<T>();
    const { onHeaderCellRender, onCellRender, onAggregateCellRender, enableHtmlSanitizer, getColumnByField,
        textWrapSettings, clipMode, serviceLocator, selectionSettings } = grid;
    const { isInitialBeforePaint, cssClass, evaluateTooltipStatus, isInitialLoad, currentViewData,
        selectionModule, getParentElement, filterModule } = useGridMutableProvider<T>();
    const localization: IL10n = serviceLocator?.getService<IL10n>('localization');
    const filterType: boolean = grid.filterSettings?.type === 'Excel' || grid.filterSettings?.type === 'CheckBox';

    // Get column-specific APIs and properties
    const { gridAPI, gridInternal } = useColumn<T>(props);

    const {
        cellType,
        visibleClass,
        alignHeaderClass,
        alignClass,
        formattedValue,
        isMaskCell
    } = gridInternal;

    const { ...column } = gridAPI;

    const filterColumn: FilterPredicates[] = grid.filterSettings?.columns?.filter((col: FilterPredicates) => {
        return column.field === col.field;
    });

    const {
        index,
        field,
        headerText,
        allowFilter,
        disableHtmlEncode,
        allowSort,
        customAttributes,
        cellClass
    } = column;
    const aggregateCellClass: string | ((props?: CellClassProps<T>) => string) = props?.cell?.aggregateColumn?.cellClass;

    // Create ref for the cell element
    const cellRef: RefObject<ColumnRef> = useRef<ColumnRef>({
        cellRef: useRef<HTMLTableCellElement>(null)
    });

    // Filter dialog open/close state and handlers
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const openFilterDialog: () => void = useCallback(() : void => {
        // prevent header click/sort and focus side-effects
        setIsFilterOpen(true);
    }, []);

    const closeFilterDialog: () => void = useCallback(() : void => {
        setIsFilterOpen(false);
    }, []);

    const updateFilterModel: (cell: React.RefObject<HTMLElement>) => ExcelFilterArgs = (
        cell: React.RefObject<HTMLElement>): ExcelFilterArgs => {
        const dataSource: Object = grid.dataSource as DataManager | DataResult;
        const gridDataManager: DataManager = grid?.dataSource instanceof DataManager ? grid.dataSource :
            new DataManager(grid?.dataSource as DataManager);
        const updateColumn: ColumnProps =  grid.getColumns().find((col: ColumnProps) => col.field === column.field);
        const option: ExcelFilterArgs = {
            filterType: updateColumn.filter.type ?? grid.filterSettings.type, type: updateColumn.type, field: updateColumn.field,
            column: updateColumn, dataSource: dataSource, format: updateColumn.format, height: 800, columns: grid.getColumns(),
            filteredColumns: grid.filterSettings?.columns, target: cell.current, dataManager: gridDataManager,
            isRemote: (grid.getDataModule() as UseDataResult)?.isRemote(),
            parentCurrentViewDataCount: currentViewData.length, parentElement: getParentElement(),
            cssClass: cssClass, handler: filterModule.filterHandler, query: grid.query?.clone(),
            serviceLocator: grid.serviceLocator,
            id: grid.id, loadingIndicator: grid.filterSettings?.loadingIndicator,
            operators: filterModule.customOperators[updateColumn.type + 'Operator'],
            ignoreAccent: grid.filterSettings?.ignoreAccent,
            caseSensitive: grid.filterSettings?.caseSensitive,
            enableSort: grid.sortSettings?.enabled,
            disableSearchOption: updateColumn.filter.hideSearchbox,
            disableSortOption: false,
            isCustomDataSource: false,
            formatFn: updateColumn.formatFn,
            enableHtmlSanitizer : enableHtmlSanitizer
        };
        const args: FilterDialogBeforeOpenEvent = {
            cancel: false, requestType: ActionType.FilterDialogBeforeOpen, columnType: option.type,
            columnName: updateColumn.field, action: ActionType.FilterDialogBeforeOpen, options: option
        };
        args.type = ActionType.FilterDialogBeforeOpen;
        grid.onFilterDialogBeforeOpen?.(args);
        if (args.cancel) {
            closeFilterDialog();
        }
        if (option.dataSource !== dataSource) {
            option.isCustomDataSource = true;
        }
        return option;
    };

    /**
     * Handle header cell info event
     */
    const handleHeaderCellInfo: Function = useCallback(() => {
        if (onHeaderCellRender && cellRef.current?.cellRef.current) {
            onHeaderCellRender({
                node: cellRef.current.cellRef.current,
                cell: props.cell,
                column: column
            });
        }
    }, []);

    /**
     * Handle aggregate cell info event
     */
    const handleAggregateCellInfo: Function = useCallback(() => {
        if (onAggregateCellRender && cellRef.current?.cellRef.current) {
            onAggregateCellRender({
                data: props.row.data,
                cell: cellRef.current.cellRef.current,
                column: props.cell.aggregateColumn
            });
        }
    }, []);

    /**
     * Handle query cell info event
     */
    const handleQueryCellInfo: Function = useCallback(() => {
        if (onCellRender && cellRef.current?.cellRef.current) {
            onCellRender({
                cell: cellRef.current.cellRef.current,
                column: column,
                data: props.row.data,
                colSpan: props.cell.colSpan,
                rowSpan: props.cell.rowSpan
            });
        }
    }, []);

    useEffect(() => {
        if (column.clipMode === 'Clip' || (!column.clipMode && clipMode === 'Clip')) {
            if (cellRef.current?.cellRef.current?.classList?.contains?.('sf-ellipsistooltip')) {
                cellRef.current?.cellRef.current?.classList?.remove?.('sf-ellipsistooltip');
            }
            cellRef.current?.cellRef.current?.classList?.add?.('sf-clip');
        } else if (column.clipMode === 'EllipsisWithTooltip' || (!column.clipMode && clipMode === 'EllipsisWithTooltip')
            && !(textWrapSettings?.enabled && (textWrapSettings.wrapMode === WrapMode.Content
            || textWrapSettings.wrapMode === 'Both'))) {
            if (column.type !== 'checkbox' && evaluateTooltipStatus(cellRef.current?.cellRef.current)) {
                if (cellRef.current?.cellRef.current?.classList?.contains?.('sf-clip')) {
                    cellRef.current?.cellRef.current?.classList?.remove?.('sf-clip');
                }
                cellRef.current?.cellRef.current?.classList?.add?.('sf-ellipsistooltip');
            }
        }
    }, [column.clipMode, clipMode]);

    /**
     * Trigger appropriate cell info events based on cell type
     */
    useEffect(() => {
        if (isInitialBeforePaint.current) { return; }
        if (cellType === CellTypes.Header) {
            handleHeaderCellInfo();
        } else if (cellType === CellTypes.Summary) {
            handleAggregateCellInfo();
        } else if (column?.uid !== 'empty-cell-uid') {
            handleQueryCellInfo();
        }
    }, [formattedValue, handleHeaderCellInfo, handleQueryCellInfo, handleAggregateCellInfo, isInitialBeforePaint.current]);

    useEffect(() => {
        if (isInitialBeforePaint.current) { return; }
        if (!isInitialLoad && column?.uid === 'empty-cell-uid') {
            handleQueryCellInfo();
        }
    }, [formattedValue, isInitialLoad, handleQueryCellInfo, isInitialBeforePaint.current]);

    const headerSortProperties: { index: number, className: string, direction: string } = useMemo(() => {
        if (cellType !== CellTypes.Header) { return null; }
        const sortedColumn: SortDescriptor[] = grid.sortSettings?.columns;
        let index: number | null = null;
        let cssSortClassName: string = '';
        let direction: string = 'none';
        for (let i: number = 0, len: number = sortedColumn?.length; i < len; i++) {
            if (column.field === sortedColumn?.[parseInt(i.toString(), 10)].field) {
                index = sortedColumn?.length > 1 ? i + 1 : null;
                direction = sortedColumn?.[parseInt(i.toString(), 10)].direction;
                cssSortClassName = sortedColumn?.[parseInt(i.toString(), 10)].direction === 'Ascending' ? CSS_ASENDING_SORT :
                    sortedColumn?.[parseInt(i.toString(), 10)].direction === 'Descending' ? CSS_DESCENDING_SORT : '';
            }
        }
        return { index: index, className: cssSortClassName, direction: direction };
    }, [grid.sortSettings]);

    /**
     * Method to sanitize any suspected untrusted strings and scripts before rendering them.
     *
     * @param {string} value - Specifies the html value to sanitize
     * @returns {string} Returns the sanitized html string
     */

    const sanitizeContent: (value: string) => string | JSX.Element = useCallback((value: string): string | JSX.Element => {
        let sanitizedValue: string;
        if (enableHtmlSanitizer) {
            sanitizedValue =  SanitizeHtmlHelper.sanitize(value);
        } else {
            sanitizedValue = value;
        }
        if (cellType === CellTypes.Data && getColumnByField?.(column.field)?.type === ColumnType.Boolean && column.displayAsCheckBox) {
            const checked: boolean = isNaN(parseInt(sanitizedValue?.toString(), 10)) ? sanitizedValue === 'true' :
                parseInt(sanitizedValue.toString(), 10) > 0;
            return <Checkbox checked={checked} disabled={true} className={cssClass}/>;
        } else {
            return sanitizedValue;
        }
    }, [getColumnByField]);

    const rowCheckBoxOnChange: (event: CheckboxChangeEvent) => void = useCallback((event: CheckboxChangeEvent) : void => {
        if (!selectionModule || props.row?.rowIndex === undefined) { return; }
        if (event?.value) {
            selectionModule.selectRow(props.row?.rowIndex);
        } else {
            selectionModule.clearRowSelection([props.row?.rowIndex]);
        }
    }, [props.row?.rowIndex, selectionModule]);

    /**
     * Memoized header cell content
     */
    const headerCellContent: JSX.Element | null = useMemo(() => {
        if (cellType !== CellTypes.Header) { return null; }

        // Extract existing className from customAttributes to avoid duplication
        const existingClassName: string = customAttributes.className;

        // Create array of unique class names to avoid duplicates
        const classNames: string[] = props.cell.className.split(' ');

        // Add existing classes from customAttributes (includes cell type classes from Row.tsx)
        if (!isNullOrUndefined(existingClassName)) {
            classNames.push(...existingClassName.split(' ').filter((cls: string) => cls.trim()));
        }

        // Add alignment class if not already present
        classNames.push(alignHeaderClass);

        // Add custom header cell class.
        classNames.push(!isNullOrUndefined(cellClass) ? (typeof cellClass === 'function' ?
            cellClass({rowIndex: props.row.rowIndex, column, cellType: CellType.Header}) : cellClass) : '');
        classNames.push(!isNullOrUndefined(props.cell.column.headerTemplate) ? CSS_FIXED_HEIGHT_TEMPLATE_CELL : '');
        // Remove duplicates and join
        const finalClassName: string = [...new Set(classNames)].filter((cls: string) => cls).join(' ');
        const content: string | JSX.Element = !isNullOrUndefined(props.cell.column.headerTemplate) ? (column?.autoHeight ||
            (textWrapSettings?.enabled && textWrapSettings?.wrapMode !== WrapMode.Content) ? formattedValue :
            <div className={CSS_FIXED_HEIGHT_TEMPLATE_WRAPPER} style={{height: props?.row?.height}}>
                {formattedValue as ReactElement}</div>) as ReactElement
            : sanitizeContent(formattedValue as string || headerText || field);

        // Special rendering for checkbox selection column (select-all)
        if (column?.type === ColumnType.Checkbox && column?.headerCheckbox) {
            return (
                <th
                    ref={cellRef.current.cellRef}
                    {...customAttributes}
                    className={finalClassName}
                    aria-sort={'none'}
                >
                    <div className='sf-cell-inner'>
                        <div className={CSS_HEADER_CELL_DIV} data-mappinguid={props.cell.column.uid} key={`header-cell-${props.cell?.column?.uid}`}>
                            <Checkbox
                                className="sf-grid-checkselectall"
                                checked={props.row?.isSelected && (currentViewData?.length ?? 0) > 0}
                                indeterminate={props.row?.isIntermediateState}
                                onChange={selectionModule.headerCheckBoxOnChange.bind(null, props.row)}
                                aria-label={localization?.getConstant('SelectAllRows')}
                                disabled={!currentViewData?.length || selectionSettings.mode === SelectionMode.Single}
                            />
                        </div>
                    </div>
                </th>
            );
        }

        return (
            <th
                ref={cellRef.current.cellRef}
                {...customAttributes}
                className={finalClassName}
                aria-sort={headerSortProperties.direction === 'Ascending' ? 'ascending' :
                    headerSortProperties.direction === 'Descending' ? 'descending' : 'none'}
                {...(allowFilter && filterType
                    ? {
                        onKeyDown: (e: React.KeyboardEvent<HTMLTableCellElement>) => {
                            const isAltArrowDown: boolean =
                                e.altKey && (e.key === 'ArrowDown' || e.code === 'ArrowDown');
                            if (isAltArrowDown) {
                                e.preventDefault();
                                e.stopPropagation();
                                openFilterDialog();
                            }
                        }
                    }
                    : {})}
            >
                <div className='sf-cell-inner'>
                    <div className={CSS_HEADER_CELL_DIV} data-mappinguid={props.cell.column.uid} key={`header-cell-${props.cell?.column?.uid}`}>
                        <span className={CSS_HEADER_TEXT} {...(disableHtmlEncode || isNullOrUndefined(disableHtmlEncode) ?
                            { children: content } :
                            { dangerouslySetInnerHTML: { __html: content } })}
                        />
                        {allowSort && grid?.sortSettings?.enabled && (
                            headerSortProperties.direction === 'Ascending' ? (
                                <span className={`${CSS_SORT_ICON} ${headerSortProperties.className}`}>
                                    <ArrowUpIcon />
                                </span>
                            ) : headerSortProperties.direction === 'Descending' ? (
                                <span className={`${CSS_SORT_ICON} ${headerSortProperties.className}`}>
                                    <ArrowDownIcon />
                                </span>
                            ) : null
                        )}
                        {headerSortProperties.index && <span className={CSS_SORT_NUMBER}>{headerSortProperties.index}</span>}
                        {column.type !== 'checkbox' && column.type !== 'command' && allowFilter && filterType && (
                            <>
                                <span
                                    className={CSS_FILTER_ICON}
                                    onClick={openFilterDialog}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
                                        if ((e as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || (e as React.KeyboardEvent<HTMLInputElement>).key === ' ') {
                                            openFilterDialog();
                                        }
                                    }}
                                >
                                    {filterColumn.length ? <FilterActiveIcon color='#4285F4'/> : <FilterIcon />}
                                </span>
                                {isFilterOpen && (
                                    <ExcelFilter
                                        isOpen={isFilterOpen}
                                        options={updateFilterModel(cellRef.current?.cellRef)}
                                        onCancel={closeFilterDialog}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </th>
        );
    }, [
        cellType,
        index,
        customAttributes,
        cellClass,
        alignHeaderClass,
        visibleClass,
        formattedValue,
        field,
        headerText,
        disableHtmlEncode,
        props.row?.rowIndex,
        grid.sortSettings,
        props.row,
        column?.autoHeight,
        currentViewData,
        grid.filterSettings,
        isFilterOpen
    ]);

    /**
     * Memoized data cell content
     */
    const dataCellContent: JSX.Element | null = useMemo(() => {
        if (cellType !== CellTypes.Data) { return null; }

        // Extract existing className from customAttributes to avoid duplication
        const existingClassName: string = customAttributes.className;

        // Create array of unique class names to avoid duplicates
        const classNames: string[] = props.cell.className.split(' ');

        // Add existing classes from customAttributes (includes cell type classes from Row.tsx)
        if (!isNullOrUndefined(existingClassName)) {
            classNames.push(...existingClassName.split(' ').filter((cls: string) => cls.trim()));
        }

        // Add alignment class if not already present
        classNames.push(alignClass);

        // Add custom content cell class.
        classNames.push(!isNullOrUndefined(cellClass) ? (typeof cellClass === 'function' ?
            cellClass({data: props.row.data, rowIndex: props.row.rowIndex, column, cellType: CellType.Content}) : cellClass) : '');
        classNames.push(!isNullOrUndefined(props.cell.column.template) ? CSS_FIXED_HEIGHT_TEMPLATE_CELL : '');

        const content: string | JSX.Element = !isNullOrUndefined(props.cell.column.template) || isMaskCell ?
            (column?.autoHeight || (textWrapSettings?.enabled && textWrapSettings?.wrapMode !== WrapMode.Header) || isMaskCell ?
                formattedValue : <div className={CSS_FIXED_HEIGHT_TEMPLATE_WRAPPER} style={{height: props?.row?.height}}>
                    {formattedValue as ReactElement}</div>) as ReactElement
            : sanitizeContent(formattedValue as string);
        classNames.push((column?.type !== ColumnType.Checkbox) && (content === '' || isNullOrUndefined(content) &&
            !props.cell.column.getCommandItems) ? 'sf-empty-cell' : '');
        // Remove duplicates and join
        const finalClassName: string = [...new Set(classNames)].filter((cls: string) => cls).join(' ');

        // Special rendering for checkbox selection column (row checkbox)
        if (column.type === ColumnType.Checkbox) {
            return (
                <td
                    ref={cellRef.current.cellRef}
                    {...customAttributes}
                    className={finalClassName}
                >
                    <Checkbox
                        className="sf-grid-checkselect"
                        checked={props.row?.isSelected}
                        aria-label={localization?.getConstant('SelectRow')}
                        {...(grid.selectionSettings?.checkboxOnly ? { onChange: rowCheckBoxOnChange } : {})}
                    />
                </td>
            );
        }

        return (
            props.cell.column.type === ColumnType.Command ?
                <td
                    ref={cellRef.current.cellRef}
                    {...customAttributes}
                    className={`${finalClassName} ${CSS_COMMAND_CELL}`}
                >
                    <CommandColumnBase row={props.row} column={props.cell.column} />
                </td>
                :
                <td
                    ref={cellRef.current.cellRef}
                    {...customAttributes}
                    className={finalClassName}
                    {...(disableHtmlEncode || isNullOrUndefined(disableHtmlEncode) ?
                        { children: content } :
                        { dangerouslySetInnerHTML: { __html: content } })} />
        );
    }, [
        cellType,
        customAttributes,
        cellClass,
        alignClass,
        visibleClass,
        formattedValue,
        column?.autoHeight,
        index,
        disableHtmlEncode,
        props.row?.rowIndex,
        props.row?.isSelected
    ]);

    /**
     * Memoized summary cell content
     */
    const summaryCellContent: JSX.Element | null = useMemo(() => {
        if (cellType !== CellTypes.Summary) { return null; }

        // Extract existing className from customAttributes to avoid duplication
        const existingClassName: string = customAttributes.className;

        // Create array of unique class names to avoid duplicates
        const classNames: string[] = [];

        // Add existing classes from customAttributes (includes cell type classes from Row.tsx)
        classNames.push(...existingClassName.split(' ').filter((cls: string) => cls.trim()));

        // Add alignment class if not already present
        classNames.push(alignClass);

        // Add custom aggregate class.
        classNames.push(!isNullOrUndefined(aggregateCellClass) ? (typeof aggregateCellClass === 'function' ?
            aggregateCellClass({data: props.row.data, rowIndex: props.row.rowIndex, column, cellType: CellType.Aggregate}) : aggregateCellClass) : '');
        classNames.push(!isNullOrUndefined(props.cell.isTemplate) ? CSS_FIXED_HEIGHT_TEMPLATE_CELL : '');

        const content: string | JSX.Element = props.cell.isTemplate ? (column?.autoHeight ? formattedValue :
            <div className={CSS_FIXED_HEIGHT_TEMPLATE_WRAPPER} style={{height: props?.row?.height}}>
                {formattedValue as ReactElement}</div>) as ReactElement :
            sanitizeContent(formattedValue as string);

        classNames.push(content === '' || isNullOrUndefined(content) ? 'sf-empty-cell' : '');
        // Remove duplicates and join
        const finalClassName: string = [...new Set(classNames)].filter((cls: string) => cls).join(' ');
        return (
            <td
                ref={cellRef.current.cellRef}
                data-mappinguid={props.cell.column.uid}
                {...customAttributes}
                className={finalClassName}
                {...(disableHtmlEncode || isNullOrUndefined(disableHtmlEncode) ?
                    { children: content } :
                    { dangerouslySetInnerHTML: { __html: content } })}
            />
        );
    }, [
        cellType,
        customAttributes,
        cellClass,
        alignClass,
        visibleClass,
        formattedValue,
        index,
        disableHtmlEncode,
        column?.autoHeight,
        props.row?.rowIndex
    ]);

    // Return the appropriate cell content based on cell type
    return cellType === CellTypes.Header ? headerCellContent : cellType === CellTypes.Summary ? summaryCellContent : dataCellContent;
}
) as <T>(props: Partial<IColumnBase<T>>) => JSX.Element;

/**
 * Set display name for debugging purposes
 */
(ColumnBase as MemoExoticComponent<<T>(props: Partial<IColumnBase<T>>) => JSX.Element>).displayName = 'ColumnBase';

/**
 * Column component for declarative usage in user code
 *
 * @component
 * @example
 * ```tsx
 * <Column field="name" headerText="Name" />
 * ```
 * @param {Partial<ColumnProps>} _props - Column configuration properties
 * @returns {JSX.Element} ColumnBase component with the provided properties
 */
export const Column: <T>(props: Partial<ColumnProps<T>>) => JSX.Element =
// eslint-disable-next-line @typescript-eslint/no-unused-vars
<T, >(_props: Partial<ColumnProps<T>>): JSX.Element => {
    return null;
};

/**
 * Export the ColumnBase component for internal use
 *
 * @private
 */
export { ColumnBase };
