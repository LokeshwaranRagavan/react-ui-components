import {
    forwardRef,
    ForwardRefExoticComponent,
    RefAttributes,
    useImperativeHandle,
    useRef,
    useLayoutEffect,
    useMemo,
    memo,
    JSX,
    RefObject,
    ReactNode,
    useEffect,
    ReactElement,
    useState,
    useCallback
} from 'react';
import { HeaderPanelBase, ContentPanelBase, PagerPanelBase, GridToolbar, PopupEditForm } from './index';
import { RenderRef, IRenderBase, HeaderPanelRef, ContentPanelRef, FooterPanelRef, WrapMode, InlineEditFormRef, ColumnProps, IRow, ScrollMode, LoadingIndicatorType } from '../types';
import { useGridComputedProvider, useGridMutableProvider } from '../contexts';
import { useRender, useScroll } from '../hooks';
import { ToolbarItemProps, ToolbarAPI } from '../types/toolbar.interfaces';
import { PagerRef } from '@syncfusion/react-pager';
import { FooterPanelBase } from './FooterPanel';
import { Spinner, SpinnerProps } from '@syncfusion/react-popups';
import { isNullOrUndefined } from '@syncfusion/react-base';
import { DataManager } from '@syncfusion/react-data';
import { addLastRowBorder } from '../utils';

/**
 * CSS class names used in the Render component
 */
const CSS_CLASS_NAMES: Record<string, string> = {
    GRID_HEADER: 'sf-grid-header-container',
    HEADER_CONTENT: 'sf-grid-header-content',
    GRID_CONTENT: 'sf-grid-content-container',
    CONTENT: 'sf-grid-content',
    GRID_FOOTER: 'sf-grid-footer-container',
    GRID_FOOTER_PADDING: 'sf-grid-footer-padding',
    FOOTER_CONTENT: 'sf-grid-summary-content'
};

/**
 * Custom hook to synchronize scroll elements between header and content panels
 *
 * @private
 * @param {Object} headerRef - Reference to the header panel
 * @param {Object} contentRef - Reference to the content panel
 * @param {Object} footerRef - Reference to the footer panel
 * @param {Function} setHeaderElement - Function to set the header scroll element
 * @param {Function} setContentElement - Function to set the content scroll element
 * @param {Function} setFooterElement - Function to set the footer scroll element
 * @param {Function} setPadding - Function to set padding for scroll elements
 * @returns {void}
 */
const useSyncScrollElements: (
    headerRef: RefObject<HeaderPanelRef>,
    contentRef: RefObject<ContentPanelRef>,
    footerRef: RefObject<FooterPanelRef>,
    setHeaderElement: (el: HTMLElement | null) => void,
    setContentElement: (el: HTMLElement | null) => void,
    setFooterElement: (el: HTMLElement | null) => void,
    setPadding: () => void
) => void = (
    headerRef: RefObject<HeaderPanelRef>,
    contentRef: RefObject<ContentPanelRef>,
    footerRef: RefObject<FooterPanelRef>,
    setHeaderElement: (el: HTMLElement | null) => void,
    setContentElement: (el: HTMLElement | null) => void,
    setFooterElement: (el: HTMLElement | null) => void,
    setPadding: () => void
): void => {
    useLayoutEffect(() => {
        const headerElement: HTMLDivElement = headerRef.current?.headerScrollRef;
        setHeaderElement(headerElement);

        const contentElement: HTMLDivElement = contentRef.current?.contentScrollRef;
        setContentElement(contentElement);
        setPadding();

        const footerElement: HTMLDivElement = footerRef.current?.footerScrollRef;
        setFooterElement(footerElement);

        return () => {
            setHeaderElement(null);
            setContentElement(null);
            setFooterElement(null);
        };
    }, [headerRef, contentRef, footerRef.current, setHeaderElement, setContentElement, setFooterElement, setPadding]);
};

/**
 * Base component for rendering the grid structure with header and content panels
 *
 * @component
 */
const RenderBase: <T>(_props: Partial<IRenderBase> & RefAttributes<RenderRef<T>>) => ReactElement = memo(
    forwardRef<RenderRef, Partial<IRenderBase>>(<T, >(_props: Partial<IRenderBase>, ref: RefObject<RenderRef<T>>) => {
        const headerPanelRef: RefObject<HeaderPanelRef> = useRef<HeaderPanelRef>(null);
        const contentPanelRef: RefObject<ContentPanelRef<T>> = useRef<ContentPanelRef<T>>(null);
        const footerPanelRef: RefObject<FooterPanelRef> = useRef<FooterPanelRef>(null);
        const pagerObjectRef:  RefObject<PagerRef> = useRef<PagerRef>(null);
        const popupEditFormRef: RefObject<InlineEditFormRef<T>> = useRef<InlineEditFormRef<T>>(null);

        const { privateRenderAPI, protectedRenderAPI } = useRender<T>();
        const { privateScrollAPI, protectedScrollAPI, setHeaderScrollElement, setContentScrollElement, setFooterScrollElement } =
            useScroll<T>(contentPanelRef.current);
        const { setPadding } = protectedScrollAPI;
        const [isContentHeightUpdateRequired, setContentHeightUpdateRequired] = useState<Object>({});
        const { headerContentBorder, headerPadding, onContentScroll, onVirtualRowContentScroll, onVirtualColumnContentScroll,
            onHeaderScroll, onFooterScroll, getCssProperties } = privateScrollAPI;
        const { textWrapSettings, pageSettings, aggregates, toolbar, id, columns, dataSource, editSettings, height,
            loadingIndicatorSettings } = useGridComputedProvider<T>();
        const  { indicatorType, params } = loadingIndicatorSettings;
        const { columnsDirective, currentViewData, totalRecordsCount, cssClass, toolbarModule, editModule, scrollMode, virtualSettings } =
            useGridMutableProvider<T>();

        // Synchronize scroll elements between header and content panels
        useSyncScrollElements(
            headerPanelRef,
            contentPanelRef,
            footerPanelRef,
            setHeaderScrollElement,
            setContentScrollElement,
            setFooterScrollElement,
            setPadding
        );

        const refreshContentUI: () => void = useCallback(() => {
            contentPanelRef.current?.setRequireMoreVirtualRowsForceRefresh?.({});
        }, []);

        // Expose methods and properties through ref
        useImperativeHandle(ref, () => ({
            // Render specific methods
            refresh: protectedRenderAPI.refresh,
            showSpinner: protectedRenderAPI.showSpinner,
            hideSpinner: protectedRenderAPI.hideSpinner,
            scrollModule: protectedScrollAPI,
            // Forward all properties from header and content panels
            ...(headerPanelRef.current as HeaderPanelRef),
            ...(contentPanelRef.current as ContentPanelRef<T>),
            ...(footerPanelRef.current as FooterPanelRef),
            pagerModule: pagerObjectRef.current,
            ...(editModule.editSettings.mode === 'Popup' && editModule.isEdit ?
                isNullOrUndefined(editModule.originalData) ? { addInlineRowFormRef: popupEditFormRef }
                    : { editInlineRowFormRef: popupEditFormRef } : {}),
            refreshContentUI,
            isContentBusy: privateRenderAPI.isContentBusy
        }), [
            protectedRenderAPI.refresh,
            headerPanelRef.current,
            contentPanelRef.current,
            footerPanelRef.current,
            pagerObjectRef.current,
            popupEditFormRef.current
        ]);

        const pagerPanel: JSX.Element = useMemo(() => (
            <PagerPanelBase
                ref={pagerObjectRef}
                {...pageSettings}
            />

        ), [totalRecordsCount, pageSettings]);

        const isNoColumnRemoteData: boolean = useMemo(() => {
            return !columns.length && dataSource instanceof DataManager && dataSource.dataSource.url
                && Array.isArray(currentViewData) && currentViewData?.length > 0;
        }, [columns, dataSource, currentViewData]);

        // Memoize header panel to prevent unnecessary re-renders
        const headerPanel: JSX.Element = useMemo(() => {
            return (<HeaderPanelBase
                ref={(panelRef: HeaderPanelRef) => {
                    headerPanelRef.current = panelRef;
                    if (isNoColumnRemoteData) {
                        setContentHeightUpdateRequired({});
                    }
                }}
                panelAttributes={{
                    style: { ...headerPadding },
                    className: CSS_CLASS_NAMES.GRID_HEADER
                }}
                scrollContentAttributes={{
                    style: headerContentBorder,
                    className: CSS_CLASS_NAMES.HEADER_CONTENT,
                    onScroll: onHeaderScroll
                }}
            />
            );
        }, [headerPadding, headerContentBorder, onHeaderScroll, isNoColumnRemoteData]);

        useMemo(() => {
            if (contentPanelRef.current?.contentScrollRef && virtualSettings.enableRow && virtualSettings.enableCache) {
                contentPanelRef.current.contentScrollRef.scrollTop = 0;
                protectedScrollAPI.virtualRowInfo.startIndex = 0;
            }
        }, [totalRecordsCount]);
        useMemo(() => {
            protectedScrollAPI.virtualRowInfo.endIndex = (scrollMode === ScrollMode.Virtual ? totalRecordsCount :
                currentViewData?.length) ?? 0;
        }, [currentViewData, totalRecordsCount]);

        // Memoize content panel to prevent unnecessary re-renders
        const contentPanel: JSX.Element = useMemo(() => {
            const toolbarHeight: number = toolbarModule?.getToolbar()?.clientHeight ?? 0;
            const headerHeight: number = headerPanelRef.current?.headerPanelRef?.clientHeight ?? 0;
            const footerHeight: number = footerPanelRef.current?.footerPanelRef?.clientHeight ?? 0;
            const pagerHeight: number = pagerObjectRef.current?.element?.clientHeight ?? 0;

            const totalHeight: string = `calc(${privateRenderAPI.contentStyles.height} - ${toolbarHeight}px - ${headerHeight + 2}px - ${footerHeight}px - ${pagerHeight}px)`;

            return (<ContentPanelBase<T>
                ref={(panelRef: ContentPanelRef<T>) => {
                    contentPanelRef.current = panelRef;
                    if (privateRenderAPI.isContentBusy && columns.length && panelRef &&
                        panelRef.contentSectionRef.clientHeight < panelRef.contentPanelRef.clientHeight) {
                        refreshContentUI();
                    }
                    if (height !== 'auto' && (panelRef?.contentPanelRef.firstElementChild as HTMLElement)?.offsetHeight >
                        panelRef?.contentTableRef?.scrollHeight) {
                        addLastRowBorder(panelRef?.contentTableRef, editSettings);
                    }
                }}
                setHeaderPadding={setPadding}
                panelAttributes={{
                    className: `${CSS_CLASS_NAMES.GRID_CONTENT} ${textWrapSettings?.enabled &&
                        textWrapSettings?.wrapMode === WrapMode.Content ? 'sf-wrap' : ''}`.trim(),
                    style: {
                        height: totalHeight,
                        position: 'relative' // required inline element styles for responsive UI state update
                    }
                }}
                scrollContentAttributes={{
                    className: CSS_CLASS_NAMES.CONTENT,
                    style: {
                        ...privateRenderAPI.contentStyles,
                        height: '100%' // required inline element styles for responsive UI state update
                    },
                    onScroll: onContentScroll
                }}
                virtualRowScrollContentAttributes={{
                    onScroll: onVirtualRowContentScroll
                }}
                virtualColumnScrollContentAttributes={{
                    onScroll: onVirtualColumnContentScroll
                }}
            />
            );
        }, [setPadding, privateRenderAPI.contentStyles, privateRenderAPI.isContentBusy, onContentScroll, isContentHeightUpdateRequired]);

        const footerPanel: JSX.Element = useMemo(() => {
            if (!columnsDirective || !currentViewData || currentViewData.length === 0) {
                return null;
            }
            const tableScrollerPadding: boolean = headerPadding[`${getCssProperties.padding}`] && headerPadding[`${getCssProperties.padding}`] !== '0px' ? true : false;
            const cssClass: string = `${CSS_CLASS_NAMES.GRID_FOOTER} ${tableScrollerPadding ? CSS_CLASS_NAMES.GRID_FOOTER_PADDING : ''}`;
            return (<FooterPanelBase
                ref={footerPanelRef}
                panelAttributes={{
                    style: headerPadding,
                    className: cssClass.trim()
                }}
                scrollContentAttributes={{
                    className: CSS_CLASS_NAMES.FOOTER_CONTENT,
                    onScroll: onFooterScroll
                }}
                tableScrollerPadding={tableScrollerPadding}
            />);
        }, [headerPadding, getCssProperties, columnsDirective, currentViewData, onFooterScroll]);

        const popupEditPanel: JSX.Element = useMemo(() => {
            if ((editModule.editSettings.mode === 'Popup' || editModule.editSettings.mode === 'PopupTemplate') && editModule.isEdit) {
                return (
                    <PopupEditForm<T>
                        ref={(ref: InlineEditFormRef<T>) => {
                            if (ref?.formRef?.current) {
                                popupEditFormRef.current = ref;
                                editModule.popupEditFormRef.current = ref;
                            }
                            if (ref && !isNullOrUndefined(editModule.originalData)) {
                                editModule.rowObject.setRowObject((prev: IRow<ColumnProps<T>>) =>
                                    ({ ...prev, editInlineRowFormRef: { current: ref } }));
                            }
                        }}
                    />
                );
            }
            return null;
        }, [editModule]);

        useEffect(() => {
            if (!privateRenderAPI.isContentBusy && editModule?.isShowAddNewRowActive && !editModule?.isShowAddNewRowDisabled) {
                contentPanelRef?.current?.addInlineRowFormRef?.current?.focusFirstField();
            }
        }, [privateRenderAPI.isContentBusy]);
        useEffect(() => {
            setContentHeightUpdateRequired({});
        }, [toolbar]);

        const loadingSpinnerProps: SpinnerProps = indicatorType === LoadingIndicatorType.Spinner ? params : {};
        return (
            <>
                <Spinner visible={privateRenderAPI.isContentBusy &&
                    indicatorType === LoadingIndicatorType.Spinner} className={cssClass} overlay={true} {...loadingSpinnerProps} />
                {toolbarModule && toolbar?.length > 0 && (
                    <GridToolbar
                        key={id + '_grid_toolbar'}
                        className={cssClass}
                        toolbar={(toolbar as (string | ToolbarItemProps)[]) || []}
                        gridId={id}
                        toolbarAPI={toolbarModule as ToolbarAPI}
                    />
                )}
                {headerPanel}
                {contentPanel}
                {aggregates?.length ? footerPanel : null}
                {pageSettings?.enabled && pagerPanel}
                {popupEditPanel}
            </>
        );
    })
) as (_props: Partial<IRenderBase> & RefAttributes<RenderRef>) => ReactElement;

/**
 * Columns component that wraps RenderBase for external usage
 *
 * @returns {JSX.Element} Rendered component
 */
export const Columns: React.FC<{ children?: ReactNode }> = (): JSX.Element => {
    return null;
};

export {
    RenderBase
};

(RenderBase as ForwardRefExoticComponent<Partial<IRenderBase> & RefAttributes<RenderRef>>).displayName = 'RenderBase';
