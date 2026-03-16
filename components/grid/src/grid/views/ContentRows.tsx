import {
    forwardRef,
    useImperativeHandle,
    useRef,
    RefAttributes,
    ForwardRefExoticComponent,
    ReactElement,
    useMemo,
    useCallback,
    memo,
    isValidElement,
    Children,
    JSX,
    ReactNode,
    RefObject,
    useEffect,
    SetStateAction,
    Dispatch,
    ComponentType,
    useState,
    useLayoutEffect
} from 'react';
import {
    ContentRowsRef,
    ICell,
    IContentRowsBase,
    IRow,
    RowRef,
    CellTypes, RenderType,
    IRowBase,
    ScrollMode,
    LoadingIndicatorType
} from '../types';
import { ColumnProps, ColumnTemplateProps, IColumnBase } from '../types/column.interfaces';
import { EditFormTemplate, InlineEditFormRef } from '../types/edit.interfaces';
import { useGridComputedProvider, useGridMutableProvider } from '../contexts';
import { ColumnBase, RowBase } from '../components';
import { IL10n, isNullOrUndefined } from '@syncfusion/react-base';
import { getUid } from '../utils';
import { InlineEditForm } from './index';
import { ColumnsChildren, ValueType } from '../types/interfaces';
const CSS_EMPTY_ROW: string = 'sf-empty-row';
const CSS_DATA_ROW: string = 'sf-grid-content-row';
const CSS_ALT_ROW: string = 'sf-alt-row';

/**
 * RenderEmptyRow component displays when no data is available
 *
 * @component
 * @private
 * @returns {JSX.Element} The rendered empty row component
 */
function RenderEmptyRow<T>(): JSX.Element {
    const { serviceLocator, emptyRecordTemplate } = useGridComputedProvider<T>();
    const localization: IL10n = serviceLocator?.getService<IL10n>('localization');
    const { columnsDirective } = useGridMutableProvider();

    /**
     * Calculate the number of columns to span the empty message
     */
    const columnsLength: number = useMemo(() => {
        const children: ReactNode = (columnsDirective.props as ColumnsChildren<T>).children;
        return Children.count(children);
    }, [columnsDirective]);

    const rowRef: RefObject<RowRef<T>> = useRef<RowRef<T>>(null);

    /**
     * Render the empty row template based on configuration
     */
    const renderEmptyTemplate: ComponentType<void> | ReactElement | string = useMemo(() => {
        if (isNullOrUndefined(emptyRecordTemplate)) {
            return <>{localization?.getConstant('noRecordsMessage')}</>;
        } else if (typeof emptyRecordTemplate === 'string' || isValidElement(emptyRecordTemplate)) {
            return emptyRecordTemplate;
        } else {
            return emptyRecordTemplate;
        }
    }, [emptyRecordTemplate, localization]);

    return (
        <>
            {useMemo(() => (
                <RowBase<T>
                    ref={rowRef}
                    key="empty-row"
                    row={{ rowIndex: 0, uid: 'empty-row-uid' }}
                    rowType={RenderType.Content}
                    role="row"
                    className={CSS_EMPTY_ROW}
                >
                    <ColumnBase<T>
                        key="empty-cell"
                        index={0}
                        uid='empty-cell-uid'
                        customAttributes={{
                            style: { left: '0px' },
                            colSpan: columnsLength,
                            tabIndex: 0 // Make the empty cell focusable
                        }}
                        template={renderEmptyTemplate as ComponentType<ColumnTemplateProps<T>> | ReactElement | string}
                    />
                </RowBase>
            ), [columnsLength, renderEmptyTemplate])}
        </>
    );
}

/**
 * Set display name for debugging purposes
 */
RenderEmptyRow.displayName = 'RenderEmptyRow';

/**
 * ContentRowsBase component renders the data rows within the table body section
 *
 * @component
 * @private
 * @param {Partial<IContentRowsBase>} props - Component properties
 * @param {RefObject<ContentRowsRef>} ref - Forwarded ref to expose internal elements and methods
 * @returns {JSX.Element} The rendered tbody element with data rows
 */
const ContentRowsBase: <T>(props: Partial<IContentRowsBase> & RefAttributes<ContentRowsRef<T>>) => ReactElement =
    memo(forwardRef<ContentRowsRef, Partial<IContentRowsBase>>(
        <T, >(_props: Partial<IContentRowsBase>, ref: RefObject<ContentRowsRef<T>>) => {
            const { columnsDirective, currentViewData, virtualCachedViewData, editModule, uiColumns, selectionModule,
                commandColumnModule, totalRecordsCount,
                offsetY, virtualSettings, scrollMode, isInitialLoad } = useGridMutableProvider<T>();
            const { commandEdit, commandAddRef, commandEditInlineFormRef, commandAddInlineFormRef } = commandColumnModule;
            const { rowHeight, enableAltRow, columns, rowTemplate, getPrimaryKeyFieldNames, getRowHeight, scrollModule, textWrapSettings,
                pageSettings, sortSettings, filterSettings, searchSettings, loadingIndicatorSettings, contentScrollRef, element
            } = useGridComputedProvider<T>();
            const { indicatorType } = loadingIndicatorSettings;
            const primaryKey: ColumnProps = columns.find((column: ColumnProps) => column.isPrimaryKey);
            // Refs for DOM elements and child components
            const contentSectionRef: RefObject<HTMLTableSectionElement> = useRef<HTMLTableSectionElement>(null);
            const rowsObjectRef: RefObject<IRow<ColumnProps<T>>[]> = useRef<IRow<ColumnProps<T>>[]>([]);
            const rowElementRefs: RefObject<HTMLTableRowElement[] | HTMLCollectionOf<HTMLTableRowElement>> =
                useRef<HTMLTableRowElement[] | HTMLCollectionOf<HTMLTableRowElement>>([]);
            const addInlineFormRef: RefObject<InlineEditFormRef<T>> = useRef<InlineEditFormRef<T>>(null);
            const editInlineFormRef: RefObject<InlineEditFormRef<T>> = useRef<InlineEditFormRef<T>>(null);
            const cachedRowObjects: RefObject<Map<number | string, IRow<ColumnProps<T>>>> =
                useRef<(Map<number | string, IRow<ColumnProps<T>>>)>(new Map());
            const totalRenderedRowHeight: RefObject<number> = useRef<number>(0);
            const totalAddFormRenderedRowHeight: RefObject<number> = useRef<number>(0);
            const [_requireMoreVirtualRowsForceRefresh, setRequireMoreVirtualRowsForceRefresh] = useState<Object>({});

            /**
             * Returns the collection of content row elements
             *
             * @returns {HTMLCollectionOf<HTMLTableRowElement> | undefined} Collection of row elements
             */
            const getRows: () => HTMLCollectionOf<HTMLTableRowElement> | undefined = useCallback(() => {
                return rowElementRefs.current as HTMLCollectionOf<HTMLTableRowElement>;
            }, [contentSectionRef.current?.children]);

            /**
             * Returns the row options objects with DOM element references
             *
             * @returns {IRow<ColumnProps>[]} Array of row options objects with element references
             */
            const getRowsObject: () => IRow<ColumnProps<T>>[] = useCallback(() => rowsObjectRef.current, [rowsObjectRef.current]);

            /**
             * Gets a row by index.
             *
             * @param  {number} index - Specifies the row index.
             * @returns {HTMLTableRowElement} returns the element
             */
            const getRowByIndex: (index: number) => HTMLTableRowElement = useCallback((index: number) =>  {
                return !isNullOrUndefined(index) ? (virtualSettings.enableRow ? cachedRowObjects.current?.get(index)?.element :
                    getRows()[parseInt(index.toString(), 10)]) : undefined;
            }, []);

            /**
             * @param {string} uid - Defines the uid
             * @returns {IRow<ColumnProps>} Returns the row object
             * @private
             */
            const getRowObjectFromUID: (uid: string) => IRow<ColumnProps<T>> = useCallback((uid: string) => {
                const rows: IRow<ColumnProps<T>>[] = getRowsObject() as IRow<ColumnProps<T>>[];
                if (rows) {
                    for (const row of rows) {
                        if (row.uid === uid) {
                            return row;
                        }
                    }
                }
                return null;
            }, []);

            /**
             * Expose internal elements and methods through the forwarded ref
             * Only define properties specific to ContentRows
             */
            useImperativeHandle(ref, () => ({
                contentSectionRef: contentSectionRef.current,
                getRows,
                getRowsObject,
                getRowByIndex,
                getRowObjectFromUID,
                addInlineRowFormRef: addInlineFormRef,
                editInlineRowFormRef: editInlineFormRef,
                cachedRowObjects,
                totalRenderedRowHeight,
                totalAddFormRenderedRowHeight,
                setRequireMoreVirtualRowsForceRefresh
            }), [getRows, getRowsObject, getRowByIndex, getRowObjectFromUID, cachedRowObjects,
                currentViewData, addInlineFormRef.current, editInlineFormRef.current, totalRenderedRowHeight,
                setRequireMoreVirtualRowsForceRefresh, totalAddFormRenderedRowHeight]);

            /**
             * Memoized empty row component to display when no data is available
             */
            const emptyRowComponent: JSX.Element | null = useMemo(() => {
                if (!columnsDirective || !currentViewData || currentViewData.length === 0) {
                    return <RenderEmptyRow<T> />;
                }
                return null;
            }, [columnsDirective, currentViewData]);

            /**
             * Callback to store row element references directly in the row object
             *
             * @param {number} index - Row index
             * @param {HTMLTableRowElement} element - Row DOM element
             */
            const storeRowRef: (index: number, element: HTMLTableRowElement, cellRef: ICell<ColumnProps<T>>[],
                setRowObject: Dispatch<SetStateAction<IRow<ColumnProps<T>>>>) => void =
                useCallback((index: number, element: HTMLTableRowElement, cellRef: ICell<ColumnProps<T>>[],
                             setRowObject: Dispatch<SetStateAction<IRow<ColumnProps<T>>>>) => {
                    if (rowsObjectRef.current[index as number]) {
                        // Directly update the element reference in the row object
                        rowsObjectRef.current[index as number].element = element;
                        rowElementRefs.current[index as number] = element;
                        rowsObjectRef.current[index as number].cells = cellRef;
                        rowsObjectRef.current[index as number].setRowObject = setRowObject;
                        if (textWrapSettings?.enabled || cellRef?.find((cell: ICell<ColumnProps<T>>) => cell?.column?.autoHeight) ||
                            (rowTemplate && rowsObjectRef.current?.[index as number]?.isDataRow &&
                                rowsObjectRef.current?.[index as number]?.data)) { // Lazy/Auto/TextWrap RowHeight Calculation
                            const rowElementHeight: number = element.offsetHeight || Math.ceil(element.getBoundingClientRect().height);
                            if (rowsObjectRef.current[index as number]?.height !== Math.round(rowElementHeight)) {
                                totalRenderedRowHeight.current = (totalRenderedRowHeight.current -
                                    rowsObjectRef.current[index as number]?.height) + Math.round(rowElementHeight);
                            }
                            rowsObjectRef.current[index as number].height = rowElementHeight;
                        }
                        const cachedRowObject: IRow<ColumnProps<T>> =
                            cachedRowObjects.current.get(rowsObjectRef.current[index as number]?.rowIndex);
                        if (virtualSettings.enableRow) {
                            cachedRowObjects.current.set(rowsObjectRef.current[index as number].rowIndex, {
                                ...cachedRowObject ?? {},
                                ...rowsObjectRef.current[index as number]
                            });
                        }
                    }
                }, []);


            const inlineAddForm: JSX.Element | JSX.Element[] = useMemo(() => {
                const options: IRow<ColumnProps<T>> = {
                    uid: getUid('grid-add-row'),
                    data: editModule?.originalData,
                    rowIndex: editModule?.editSettings?.newRowPosition === 'Top' ? 0 : currentViewData?.length, // Critical: Use original data index for proper tracking
                    isDataRow: false
                };
                // Enhanced check for showAddNewRow functionality
                // This ensures add form is properly visible in all scenarios
                const isCommandAdd: boolean = commandEdit.current && commandAddRef.current.length ? true : false;
                const showAddForm: boolean = editModule?.editSettings?.allowAdd &&
                    (editModule?.editSettings?.showAddNewRow ||
                    (!options.data && editModule?.isEdit) || isCommandAdd);

                return showAddForm ? isCommandAdd ?
                    commandAddRef.current.map((row: IRow<ColumnProps>) => {
                        return (
                            <InlineEditForm<T>
                                ref={(addInlineFormRef: InlineEditFormRef<T>) => {
                                    commandAddInlineFormRef.current[row.uid] = { current: addInlineFormRef };
                                }}
                                key={`add-edit-${row.uid}-${scrollModule?.virtualColumnInfo?.startIndex}`}
                                stableKey={`add-edit-${row.uid}-${row.rowIndex}`}
                                isAddOperation={true}
                                columns={uiColumns.current ?? columns as ColumnProps<T>[]}
                                editData={row.data as T}
                                rowObject={row as IRow<ColumnProps<T>>}
                                validationErrors={virtualSettings.enableRow ?
                                    commandAddInlineFormRef.current?.[row?.uid]?.current?.formState?.errors || {} : {}}
                                editRowIndex={row.rowIndex}
                                rowUid={row.uid}
                                disabled={editModule?.isShowAddNewRowDisabled}
                                onFieldChange={(field: string, value: ValueType | null) => {
                                    if (editModule?.updateEditData) {
                                        editModule?.updateEditData?.(field, value, row as IRow<ColumnProps<T>>);
                                    }
                                }}
                                onSave={() => editModule?.saveDataChanges()}
                                onCancel={editModule?.cancelDataChanges}
                                template={editModule?.editSettings?.template as React.ComponentType<EditFormTemplate<T>>}
                            />
                        );
                    })
                    : (
                        <InlineEditForm<T>
                            ref={(addFormRef: InlineEditFormRef<T>) => {
                                addInlineFormRef.current = addFormRef;
                            }}
                            key={`add-edit-${options.uid}-${scrollModule?.virtualColumnInfo?.startIndex}`}
                            stableKey={`add-edit-${options.uid}-${editModule?.editRowIndex}`}
                            isAddOperation={true}
                            columns={uiColumns.current ?? columns as ColumnProps<T>[]}
                            editData={editModule?.editData}
                            validationErrors={editModule?.validationErrors || {}}
                            editRowIndex={options.rowIndex}
                            rowUid={options.uid}
                            // Properly handle disabled state for showAddNewRow inputs
                            // This ensures inputs are disabled during data row editing and re-enabled after
                            disabled={editModule?.isShowAddNewRowDisabled}
                            onFieldChange={(field: string, value: ValueType | null) => {
                                if (editModule?.updateEditData) {
                                    editModule?.updateEditData?.(field, value, options);
                                }
                            }}
                            onSave={() => editModule?.saveDataChanges()}
                            onCancel={editModule?.cancelDataChanges}
                            template={editModule?.editSettings?.template as React.ComponentType<EditFormTemplate<T>>}
                        />
                    ) : <></>;
            }, [
                columnsDirective, currentViewData?.length, rowHeight,
                editModule?.isEdit,
                editModule?.editRowIndex,
                editModule?.isShowAddNewRowActive,
                editModule?.isShowAddNewRowDisabled,
                editModule?.showAddNewRowData,
                editModule?.editSettings?.newRowPosition,
                editModule?.editSettings?.template,
                commandAddRef?.current?.length
            ]);
            useLayoutEffect(() => {
                totalAddFormRenderedRowHeight.current = 0;
                const commandKeys: string[] = Object.keys(commandAddInlineFormRef.current);
                if (addInlineFormRef.current) {
                    const rowElement: HTMLTableRowElement = addInlineFormRef.current?.rowRef.current;
                    const rowElementHeight: number = rowElement?.offsetHeight ||
                        Math.ceil(rowElement?.getBoundingClientRect?.()?.height);
                    totalAddFormRenderedRowHeight.current = rowElementHeight;
                } else if (commandKeys.length) {
                    for (const key of commandKeys) {
                        const rowElement: HTMLTableRowElement =
                            commandAddInlineFormRef.current[key as string]?.current?.rowRef.current;
                        const rowElementHeight: number = rowElement?.offsetHeight ||
                            Math.ceil(rowElement?.getBoundingClientRect?.()?.height);
                        if (!isNaN(rowElementHeight)) {
                            totalAddFormRenderedRowHeight.current += rowElementHeight;
                        }
                    }
                }
                if (totalAddFormRenderedRowHeight.current !== 0 && editModule?.editSettings?.allowAdd && contentScrollRef &&
                    editModule.editSettings.mode === 'Normal') {
                    if (editModule?.editSettings?.newRowPosition === 'Top') {
                        contentScrollRef.scrollTop = 0;
                    } else {
                        contentScrollRef.scrollTop = contentScrollRef.scrollHeight;
                    }
                }
            }, [inlineAddForm]);

            const generateCell: () => IRow<ColumnProps<T>>[] = useCallback((): IRow<ColumnProps<T>>[] => {
                const cells: ICell<IColumnBase<T>>[] = [];
                const childrenArray: ReactElement<IColumnBase<T>>[] = columns as ReactElement<IColumnBase<T>>[];
                for (let index: number = 0; index < childrenArray.length; index++) {
                    const child: ColumnProps<T> = childrenArray[index as number] as ColumnProps<T>;
                    const option: ICell<IColumnBase<T>> = {
                        visible: child.visible !== false,
                        isDataCell: !isNullOrUndefined(child.field),
                        isTemplate: !isNullOrUndefined(child.template),
                        rowID: child.uid,
                        column: child,
                        cellType: CellTypes.Data,
                        colSpan: 1
                    };
                    cells.push(option);
                }
                return cells;
            }, [columns]);

            useMemo(() => {
                totalRenderedRowHeight.current = 0;
                rowsObjectRef.current = [];
                cachedRowObjects.current.clear();
            }, [filterSettings?.columns, filterSettings?.columns.length, sortSettings?.columns, sortSettings?.columns.length,
                searchSettings?.value]);

            useMemo(() => {
                if (scrollMode === ScrollMode.Virtual) {
                    if (virtualSettings.enableCache) { return; }

                    // Remove all not in view pages cached rowObjects
                    const previousPages: number[] = scrollModule?.virtualRowInfo?.previousPages ?? [];
                    const currentPages: number[] = scrollModule?.virtualRowInfo?.currentPages ?? [];

                    // Find removed pages
                    const removedPages: number[] = previousPages.filter((page: number) => !currentPages.includes(page));

                    if (removedPages.length > 0) {
                        const pageSize: number = pageSettings.pageSize;
                        // Collect all keys to remove in one pass
                        const keysToRemove: Set<number> = new Set<number>();
                        for (const page of removedPages) {
                            const startIndex: number = (page - 1) * pageSize;
                            const endIndex: number = startIndex + pageSize;
                            for (let i: number = startIndex; i < endIndex; i++) {
                                keysToRemove.add(i);
                            }
                        }

                        // Clear cachedRowObjects in one pass
                        keysToRemove.forEach((key: number) => cachedRowObjects.current.delete(key));

                        // Filter rowsObjectRef in one pass
                        rowsObjectRef.current = rowsObjectRef.current.filter((row: IRow<ColumnProps<T>>) =>
                            !keysToRemove.has(row.rowIndex));

                        // Adjust totalRenderedRowHeight only if needed
                        totalRenderedRowHeight.current = Array.from(cachedRowObjects.current.values())
                            .reduce((sum: number, row: IRow<ColumnProps<T>>) => sum + (row.height ?? 0), 0);
                    }
                } else {
                    // Non-virtual or single-page mode: full reset
                    totalRenderedRowHeight.current = 0;
                    rowsObjectRef.current = [];
                    cachedRowObjects.current.clear();
                }
            }, [currentViewData, pageSettings, getRowHeight, virtualSettings, scrollMode]);

            const processRowData: (dataRowIndex: number, ariaRowIndex: number, data: T, rows: JSX.Element[],
                rowOptions: IRow<ColumnProps<T>>[], indent?: number, currentDataRowIndex?: number,
                parentUid?: string) => void = (dataRowIndex: number, ariaRowIndex: number, data: T, rows: JSX.Element[],
                                               rowOptions: IRow<ColumnProps<T>>[], indent?: number, currentDataRowIndex?: number,
                                               parentUid?: string) =>  {
                const row: T = data;
                const options: IRow<ColumnProps<T>> = {};
                options.uid = primaryKey ? 'grid-row-' + row?.[`${primaryKey.field}`] : `${'grid-row-' + dataRowIndex}`;
                options.rowIndex = currentDataRowIndex ? currentDataRowIndex : dataRowIndex;
                const isVisible: boolean = Array.from(rowsObjectRef.current).some(
                    (r: IRow<ColumnProps<T>>) => r.uid === options.uid && r.data
                );
                const cachedRowObject: IRow<ColumnProps<T>> = cachedRowObjects.current.get(options.rowIndex);
                options.key = isVisible && cachedRowObject ? cachedRowObject.key : getUid('grid-row');
                options.parentUid = parentUid;
                options.data = row;
                options.isDataRow = true;
                options.isCaptionRow = false;
                options.indent = indent;
                options.isAltRow = enableAltRow ? dataRowIndex % 2 !== 0 : false;
                // Initialize row selection based on persisted state and remote "Select All" mode
                const primaryKeys: string[] = getPrimaryKeyFieldNames?.();
                const rowKey: string = row?.[primaryKeys[0]];
                if (selectionModule.isHeaderSelectAllMode) {
                    options.isSelected = !selectionModule.unselectedRowState.has(rowKey);
                    if (options.isSelected && row) {
                        selectionModule.selectedRowState.add(rowKey);
                        selectionModule.persistSelectedData.set(rowKey, row);
                    }
                } else {
                    options.isSelected = selectionModule.selectedRowState.has(rowKey) ||
                    (virtualSettings.enableRow && selectionModule?.selectedRowIndexes?.includes(options.rowIndex));
                }

                if (rowTemplate) {
                    options.cells = generateCell();
                }

                options.height = !isVisible && getRowHeight ? getRowHeight(options) :
                    (cachedRowObject?.height || rowHeight);
                // Store the options object for getRowsObject
                rowOptions.push({ ...options });

                const customAttributes: Partial<IRowBase<T>> | ({'data-uid': string, 'data-rowindex': number}) = {
                    className: `${CSS_DATA_ROW + (options.isAltRow ? (' ' + CSS_ALT_ROW) : '')}`,
                    role: 'row',
                    'data-rowindex': ariaRowIndex + 1, // only rendered visible row based index
                    'aria-rowindex': options.rowIndex + 1, // accessibility
                    'data-uid': options.uid, // each row data purpose primarykey
                    style: { height: `${options.height}px` }
                };

                // Create the row element with a callback ref to store the element reference
                rows.push(
                    <RowBase<T>
                        ref={(element: RowRef<T>) => {
                            if (element?.rowRef?.current) {
                                storeRowRef(ariaRowIndex, element.rowRef.current, element.getCells(), element.setRowObject);
                                const selectedRowIndex: number = selectionModule.selectedRowIndexes.indexOf(
                                    rowsObjectRef.current[ariaRowIndex as number]?.rowIndex);
                                if (rowsObjectRef.current[ariaRowIndex as number]?.isSelected && selectedRowIndex === -1) {
                                    selectionModule.selectedRowIndexes.push(rowsObjectRef.current[ariaRowIndex as number]?.rowIndex);
                                }
                                else if (!rowsObjectRef.current[ariaRowIndex as number]?.isSelected && selectedRowIndex !== -1) {
                                    selectionModule.selectedRowIndexes.splice(rowsObjectRef.current[ariaRowIndex as number]?.rowIndex, 1);
                                }
                            } else if (contentSectionRef.current?.children?.[ariaRowIndex as number] && rowTemplate &&
                                typeof rowTemplate !== 'string' && !isValidElement(rowTemplate)) { // functional/class component if ref not assigned by user
                                storeRowRef(ariaRowIndex,
                                            contentSectionRef.current?.children?.[ariaRowIndex as number] as HTMLTableRowElement,
                                            element?.getCells?.(), element?.setRowObject);
                            } else if (element?.editInlineRowFormRef?.current) {
                                rowsObjectRef.current[ariaRowIndex as number].editInlineRowFormRef = element?.editInlineRowFormRef;
                                editInlineFormRef.current = rowsObjectRef.current[ariaRowIndex as number].editInlineRowFormRef.current; // final single row ref for edit form.
                                rowElementRefs.current[ariaRowIndex as number] = element?.editInlineRowFormRef?.current.rowRef.current;
                                rowsObjectRef.current[ariaRowIndex as number].cells = element.getCells();
                                commandEditInlineFormRef.current[rowsObjectRef.current[ariaRowIndex as number].uid]
                                    = element?.editInlineRowFormRef;
                            }
                        }}
                        key={options.key}
                        row={{ ...options }}
                        rowType={RenderType.Content}
                        className={CSS_DATA_ROW + (options.isAltRow ? (' ' + CSS_ALT_ROW) : '')}
                        role="row"
                        data-rowindex={ariaRowIndex + 1} // only rendered visible row based index
                        aria-rowindex={options.rowIndex + 1} // accessibility
                        data-uid={options.uid} // each row data purpose primarykey
                        style={{ height: `${options.height || rowHeight}px` }}
                        {...customAttributes}
                    >
                        {(columnsDirective.props as ColumnsChildren<T>).children}
                    </RowBase>
                );
            };

            /**
             * Memoized data rows to prevent unnecessary re-renders
             */
            const dataRows: JSX.Element[] = useMemo(() => {
                if ((!columnsDirective || !currentViewData || currentViewData.length === 0) && (indicatorType ===
                    LoadingIndicatorType.Spinner || !isInitialLoad || !contentSectionRef.current?.closest('.sf-grid-content'))) {
                    rowsObjectRef.current = [];
                    return [];
                }
                rowElementRefs.current = [];

                const rows: JSX.Element[] = [];
                const rowOptions: IRow<ColumnProps<T>>[] = [];

                const contentHeight: number = contentSectionRef.current?.closest('.sf-grid-content')?.clientHeight;
                const from: number = offsetY ? scrollModule?.virtualRowInfo?.startIndex : offsetY;
                const to: number = scrollModule?.virtualRowInfo?.endIndex ?
                    scrollModule?.virtualRowInfo?.endIndex : Math.ceil(contentHeight / rowHeight);
                scrollModule.virtualRowInfo.requiredRowsRange = [];
                totalRenderedRowHeight.current = !virtualSettings.enableRow ? 0 : totalRenderedRowHeight.current;
                // Check if we're near the end (within 3x buffer of last row) - only for dynamic heights
                // When near end, bypass buffer limit to ensure all remaining rows are rendered
                const isNearEnd: boolean = getRowHeight && to > 0 &&
                    from >= to - (virtualSettings.rowBuffer * 3);
                for (let dataRowIndex: number = from, ariaRowIndex: number = 0, buffer: number = 0, renderedRowHeight: number = 0;
                    dataRowIndex < to &&
                    (isNearEnd || buffer <= (from !== 0 && dataRowIndex !== (to - 1) ? virtualSettings.rowBuffer * 2 :
                        virtualSettings.rowBuffer)); dataRowIndex++, ariaRowIndex++) {
                    processRowData(dataRowIndex, ariaRowIndex, (scrollMode === ScrollMode.Virtual ?
                        (virtualCachedViewData.get(dataRowIndex) ?? cachedRowObjects.current?.get(dataRowIndex)?.data) :
                        currentViewData[parseInt(dataRowIndex.toString(), 10)]), rows, rowOptions);
                    renderedRowHeight += rowOptions[ariaRowIndex as number]?.height;
                    const cachedRowObject: IRow<ColumnProps<T>> =
                        cachedRowObjects.current.get(rowOptions[ariaRowIndex as number]?.rowIndex);
                    if (!cachedRowObject) {
                        totalRenderedRowHeight.current += rowOptions[ariaRowIndex as number]?.height;
                    } else if (cachedRowObject.height !== rowOptions[ariaRowIndex as number]?.height) {
                        totalRenderedRowHeight.current = (totalRenderedRowHeight.current - cachedRowObject.height) +
                            rowOptions[ariaRowIndex as number]?.height;
                    }
                    cachedRowObjects.current.set(rowOptions[ariaRowIndex as number].rowIndex, {
                        ...rowOptions[ariaRowIndex as number]
                    });
                    if (virtualSettings.enableRow) {
                        if (renderedRowHeight > contentHeight) {
                            buffer++;
                        }
                    } else if (!virtualSettings.preventMaxRenderedRows) {
                        buffer++;
                    }
                    if (scrollMode === ScrollMode.Virtual && !rowOptions[ariaRowIndex as number]?.data) {
                        if (scrollModule.virtualRowInfo.requiredRowsRange.length) {
                            scrollModule.virtualRowInfo.requiredRowsRange[1] = dataRowIndex;
                        } else {
                            scrollModule.virtualRowInfo.requiredRowsRange.push(dataRowIndex);
                        }
                    }
                }
                const [startRow, endRow]: number[] = scrollModule.virtualRowInfo.requiredRowsRange;
                if (scrollMode === ScrollMode.Virtual && scrollModule?.isDataOperationPreventVirtualCache.current &&
                    !isNullOrUndefined(startRow) && !isNullOrUndefined(endRow)) {
                    const pageSize: number = pageSettings.pageSize;
                    // Calculate start and end pages based on row range
                    const startPage: number = Math.floor(((startRow ?? endRow) - (virtualSettings.rowBuffer)) / pageSize) + 1;
                    const endPage: number = Math.floor(((endRow ?? startRow) + (virtualSettings.rowBuffer)) / pageSize) + 1;
                    requestAnimationFrame(() => {
                        scrollModule.scrollIntoVirtualRowsRangeView(startPage, endPage, totalRecordsCount); // current page reset on data operation, so that query will combine properly.
                    });
                }
                rowsObjectRef.current = rowOptions;
                return rows;
            }, [columnsDirective, currentViewData, storeRowRef, rowHeight, enableAltRow, offsetY, getRowHeight,
                _requireMoreVirtualRowsForceRefresh, scrollMode, virtualSettings?.enableRow, isInitialLoad]);

            useEffect(() => {
                if (cachedRowObjects.current.size) {
                    if (!virtualSettings.enableRow) {
                        cachedRowObjects.current.clear(); // Clears all entries
                    }
                }

                if (scrollMode !== ScrollMode.Auto && !scrollModule?.virtualRowInfo?.requiredRowsRange?.length &&
                    !element?.querySelector('.sf-spinner') && !element?.querySelector('.sf-skeleton') &&
                    !scrollModule?.virtualRowInfo?.requiredRowsRange?.length) {
                    selectionModule?.updateHeaderSelectionState?.();
                }
            }, [dataRows]);
            useEffect(() => {
                return () => {
                    totalRenderedRowHeight.current = 0;
                    rowsObjectRef.current = [];
                    rowElementRefs.current = [];
                    cachedRowObjects.current.clear(); // Clears all entries
                };
            }, []);

            return (
                <tbody
                    ref={contentSectionRef}
                    {..._props}
                >
                    {editModule?.editSettings?.allowAdd && editModule?.editSettings?.newRowPosition === 'Top' && editModule.editSettings.mode === 'Normal' && inlineAddForm}
                    {dataRows.length > 0 ? dataRows : emptyRowComponent}
                    {editModule?.editSettings?.allowAdd && editModule?.editSettings?.newRowPosition === 'Bottom' && editModule.editSettings.mode === 'Normal' && inlineAddForm}
                </tbody>
            );
        }
    )) as (props: Partial<IContentRowsBase> & RefAttributes<ContentRowsRef>) => ReactElement;

/**
 * Set display name for debugging purposes
 */
(ContentRowsBase as ForwardRefExoticComponent<Partial<IContentRowsBase> & RefAttributes<ContentRowsRef>>).displayName = 'ContentRowsBase';

/**
 * Export the ContentRowsBase component for use in other components
 *
 * @private
 */
export { ContentRowsBase };
