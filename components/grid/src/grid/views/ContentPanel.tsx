import {
    forwardRef,
    ForwardRefExoticComponent,
    RefAttributes,
    useImperativeHandle,
    useRef,
    useMemo,
    memo,
    CSSProperties,
    RefObject,
    JSX,
    ReactElement,
    useState,
    useLayoutEffect
} from 'react';
import { ContentTableBase } from './index';
import {
    ContentPanelRef,
    IContentPanelBase,
    ContentTableRef,
    ScrollMode,
    IRow
} from '../types';
import { ColumnProps } from '../types/column.interfaces';
import {
    useGridComputedProvider,
    useGridMutableProvider
} from '../contexts';
import { formatUnit } from '@syncfusion/react-base';

// CSS class constants following enterprise naming convention
const CSS_CONTENT_TABLE: string = 'sf-grid-table';
const CSS_VIRTUAL_TABLE: string = 'sf-virtual-table';
const CSS_VIRTUAL_TRACK: string = 'sf-virtual-track';

/**
 * Default styles for content table to ensure consistent rendering
 *
 * @type {CSSProperties}
 */
const DEFAULT_TABLE_STYLE: CSSProperties = {
    borderCollapse: 'separate',
    borderSpacing: '0.25px'
};

/**
 * ContentPanelBase component renders the scrollable grid content area
 *
 * @component
 * @private
 * @param {Partial<IContentPanelBase>} props - Component properties
 * @param {object} props.panelAttributes - Attributes to apply to the content panel container
 * @param {object} props.scrollContentAttributes - Attributes to apply to the scrollable content container
 * @param {RefObject<ContentPanelRef>} ref - Forwarded ref to expose internal elements and methods
 * @returns {JSX.Element} The rendered grid content wrapper
 */
const ContentPanelBase: <T>(props: Partial<IContentPanelBase> & RefAttributes<ContentPanelRef<T>>) => ReactElement =
    memo(forwardRef<ContentPanelRef, Partial<IContentPanelBase>>(
        <T, >(props: Partial<IContentPanelBase>, ref: RefObject<ContentPanelRef<T>>) => {
            const { panelAttributes, scrollContentAttributes, virtualRowScrollContentAttributes, virtualColumnScrollContentAttributes } =
                props;
            const { id, height, rowHeight, getRowHeight, scrollModule } = useGridComputedProvider<T>();
            const { currentViewData, offsetY, offsetX, totalVirtualColumnWidth, totalRecordsCount, virtualSettings, scrollMode } =
                useGridMutableProvider<T>();
            const [columnClientWidth, setColumnClientWidth] = useState<number>(0);

            // Refs for DOM elements and child components
            const contentPanelRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
            const contentScrollRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
            const virtualContentRowScrollRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
            const virtualContentColumnScrollRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
            const contentTableRef: RefObject<ContentTableRef<T>> = useRef<ContentTableRef<T>>(null);
            const contentVirtualTableRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
            const [rowsClientHeight, setRowsClientHeight] = useState<number>(contentTableRef.current?.totalRenderedRowHeight.current ?? 0);

            const virtualHeight: number = useMemo(() => {
                if (height === 'auto') {
                    return rowsClientHeight || (contentTableRef.current?.totalRenderedRowHeight.current +
                            contentTableRef.current?.totalAddFormRenderedRowHeight.current) ||
                        contentTableRef.current?.contentSectionRef?.clientHeight;
                }

                const totalRows: number = (scrollMode === ScrollMode.Virtual ? totalRecordsCount : currentViewData?.length) || 0;
                const cache: Map<string | number, IRow<ColumnProps<T>>> = contentTableRef.current?.cachedRowObjects.current;
                const addFormHeight: number = contentTableRef.current?.totalAddFormRenderedRowHeight.current || 0;

                // Hybrid approach ONLY when getRowHeight is provided
                if (getRowHeight && cache && cache.size > 0) {
                    // Calculate average from cache for better estimation
                    let measuredTotalHeight: number = 0;
                    let measuredCount: number = 0;

                    // Efficient iteration (no array conversion needed)
                    cache.forEach((row: IRow<ColumnProps<T>>) => {
                        if (row.height) {
                            measuredTotalHeight += row.height;
                            measuredCount++;
                        }
                    });

                    // Calculate average height from measured rows (more accurate than fixed rowHeight)
                    const avgHeight: number = measuredCount > 0 ?
                        (measuredTotalHeight / measuredCount) : rowHeight;

                    // Use average height for ALL rows (consistent total height regardless of cache size)
                    let calculatedHeight: number = totalRows * avgHeight + addFormHeight;

                    // Check if stretching is needed due to browser limits
                    const maxDivHeight: number = scrollModule?.virtualRowInfo?.maxDivHeight || 33554400;

                    if (calculatedHeight > maxDivHeight) {
                        // Clamp to browser limit - stretching will handle the rest
                        calculatedHeight = maxDivHeight;

                        // Mark stretching as active
                        if (scrollModule?.virtualRowInfo) {
                            scrollModule.virtualRowInfo.isStretchingActive = true;
                        }
                    } else {
                        // Reset stretching state when not needed
                        if (scrollModule?.virtualRowInfo) {
                            scrollModule.virtualRowInfo.isStretchingActive = false;
                            scrollModule.virtualRowInfo.browserLimitStretchedRowOffset = 0;
                        }
                    }

                    return calculatedHeight;
                }

                // Average-based calculation (fixed height behavior)
                const averageRowHeight: number = (
                    contentTableRef.current?.totalRenderedRowHeight.current /
                    (totalRows < contentTableRef.current?.cachedRowObjects.current.size ?
                        totalRows : contentTableRef.current?.cachedRowObjects.current.size)
                );
                let calculatedHeight: number = totalRows * (isNaN(averageRowHeight) || !isFinite(averageRowHeight) ? rowHeight :
                    averageRowHeight);
                calculatedHeight += addFormHeight;

                // Check if stretching is needed due to browser limits
                const maxDivHeight: number = scrollModule?.virtualRowInfo?.maxDivHeight || 33554400;

                if (calculatedHeight > maxDivHeight) {
                    // Clamp to browser limit - stretching will handle the rest
                    calculatedHeight = maxDivHeight;

                    // Mark stretching as active
                    if (scrollModule?.virtualRowInfo) {
                        scrollModule.virtualRowInfo.isStretchingActive = true;
                    }
                } else {
                    // Reset stretching state when not needed
                    if (scrollModule?.virtualRowInfo) {
                        scrollModule.virtualRowInfo.isStretchingActive = false;
                        scrollModule.virtualRowInfo.browserLimitStretchedRowOffset = 0;
                    }
                }

                return calculatedHeight;

            }, [currentViewData, contentTableRef.current?.totalRenderedRowHeight.current, scrollMode, totalRecordsCount,
                contentTableRef.current?.cachedRowObjects.current.size, getRowHeight, height, rowHeight,
                contentTableRef.current?.totalAddFormRenderedRowHeight.current, rowsClientHeight,
                scrollModule?.virtualRowInfo?.maxDivHeight]);

            /**
             * Expose internal elements and methods through the forwarded ref
             * Only define properties specific to ContentPanel and forward ContentTable properties
             */
            useImperativeHandle(ref, () => ({
                // ContentPanel specific properties
                contentPanelRef: contentPanelRef.current,
                contentScrollRef: contentScrollRef.current,
                virtualContentRowScrollRef: virtualContentRowScrollRef.current,
                virtualContentColumnScrollRef: virtualContentColumnScrollRef.current,

                // Forward all properties from ContentTable
                ...(contentTableRef.current as ContentTableRef<T>),
                columnClientWidth: columnClientWidth
            }), [contentPanelRef.current, contentScrollRef.current, contentTableRef.current, columnClientWidth]);

            useLayoutEffect(() => {
                setColumnClientWidth(contentTableRef.current?.columnClientWidth);
            }, [offsetX, contentTableRef.current?.columnClientWidth]);

            useLayoutEffect(() => {
                if (height !== 'auto' && rowsClientHeight !== contentTableRef.current?.totalRenderedRowHeight.current +
                    contentTableRef.current?.totalAddFormRenderedRowHeight.current) {
                    setRowsClientHeight(contentTableRef.current?.totalRenderedRowHeight.current +
                    contentTableRef.current?.totalAddFormRenderedRowHeight.current);
                } else if (height === 'auto' && rowsClientHeight !== contentTableRef.current?.contentSectionRef?.clientHeight) {
                    setRowsClientHeight(contentTableRef.current?.contentSectionRef?.clientHeight);
                }
            }, [contentTableRef.current?.contentSectionRef?.clientHeight]);

            /**
             * Memoized content table component to prevent unnecessary re-renders
             */
            const contentTable: JSX.Element = useMemo(() => (
                <ContentTableBase<T>
                    ref={contentTableRef}
                    className={CSS_CONTENT_TABLE}
                    role="presentation"
                    id={`${id}_content_table`}
                    style={DEFAULT_TABLE_STYLE}
                />
            ), [id]);

            const virtualWrapperStyle: CSSProperties = useMemo(() => {
                return {
                    position: 'absolute', // required inline element styles for responsive UI state update
                    maxHeight: formatUnit(height),
                    transform: `translate3d(${offsetX || 0}px, ${offsetY || 0}px, 0) translateZ(0)`,
                    // resizeSettings Auto based currently handled, columns occupied whitespaces, each columns render beyond configured widths.
                    ...(virtualSettings.enableColumn && totalVirtualColumnWidth > contentScrollRef.current?.clientWidth &&
                        totalVirtualColumnWidth > columnClientWidth ? { width: columnClientWidth } : {})
                };
            }, [height, offsetY, offsetX, contentScrollRef.current?.clientWidth, columnClientWidth, totalVirtualColumnWidth]);

            const virtualTrackStyle: CSSProperties = useMemo(() => ({
                height: virtualHeight || formatUnit(height),
                width: totalVirtualColumnWidth
            }), [virtualHeight, totalVirtualColumnWidth, height, columnClientWidth]);

            return (
                <div
                    {...panelAttributes}
                    ref={contentPanelRef}
                >
                    <div
                        ref={contentScrollRef}
                        {...scrollContentAttributes}
                    >
                        { !virtualSettings.enableRow && !virtualSettings.enableColumn ? (
                            contentTable
                        ) : (
                            <>
                                <div ref={contentVirtualTableRef} className={CSS_VIRTUAL_TABLE} style={virtualWrapperStyle}>
                                    {contentTable}
                                </div>
                                <div className={CSS_VIRTUAL_TRACK} style={virtualTrackStyle} />
                            </>
                        )}
                    </div>
                    {virtualSettings.enableRow && virtualHeight > contentPanelRef.current?.clientHeight &&
                    <div ref={virtualContentRowScrollRef} style={{
                        overflowX: totalVirtualColumnWidth > contentPanelRef.current?.clientWidth ? 'scroll' : 'hidden',
                        width: virtualContentRowScrollRef.current?.offsetWidth || 16
                    }} className="sf-virtual-vertical-scrollbar" {...virtualRowScrollContentAttributes} tabIndex={-1}>
                        <div className="sf-virtual-vertical-track" style={{
                            height: virtualTrackStyle.height,
                            width: virtualContentRowScrollRef.current?.offsetWidth
                        }}></div>
                    </div>}
                    {virtualSettings.enableColumn && totalVirtualColumnWidth > contentPanelRef.current?.clientWidth &&
                    <div ref={virtualContentColumnScrollRef} style={{
                        overflowY: virtualHeight > contentPanelRef.current?.clientHeight ? 'scroll' : 'hidden',
                        height: virtualContentColumnScrollRef.current?.offsetHeight || 16
                    }} className="sf-virtual-horizontal-scrollbar" {...virtualColumnScrollContentAttributes} tabIndex={-1}>
                        <div className="sf-virtual-horizontal-track" style={{
                            height: virtualContentColumnScrollRef.current?.offsetHeight,
                            width: virtualTrackStyle.width
                        }}></div>
                    </div>}
                </div>
            );
        }
    ), (prevProps: Partial<IContentPanelBase>, nextProps: Partial<IContentPanelBase>) => {
        // Custom comparison function for memo to prevent unnecessary re-renders
        // Only re-render if styles have changed
        const prevStyle: CSSProperties = prevProps.scrollContentAttributes?.style;
        const nextStyle: CSSProperties = nextProps.scrollContentAttributes?.style;
        const isBusyEqual: boolean = prevProps.scrollContentAttributes?.['aria-busy'] === nextProps.scrollContentAttributes?.['aria-busy'];
        prevProps.panelAttributes.className = nextProps.panelAttributes.className;

        // Deep comparison of style objects
        const stylesEqual: boolean = JSON.stringify(prevStyle) === JSON.stringify(nextStyle);

        return stylesEqual && isBusyEqual;
    }) as <T>(props: Partial<IContentPanelBase> & RefAttributes<ContentPanelRef<T>>) => ReactElement;

/**
 * Set display name for debugging purposes
 */
(ContentPanelBase as ForwardRefExoticComponent<Partial<IContentPanelBase> & RefAttributes<ContentPanelRef>>).displayName = 'ContentPanelBase';

/**
 * Export the ContentPanelBase component for use in other components
 *
 * @private
 */
export { ContentPanelBase };
