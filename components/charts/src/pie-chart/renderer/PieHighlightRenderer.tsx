import { extend, isNullOrUndefined } from '@syncfusion/react-base';
import { useLayoutEffect, useEffect, useContext, RefObject, JSX } from 'react';
import { PieSelectionMode, PieSelectionPattern } from '../base/enum';
import { Chart, PieBaseSelection, Points, SeriesProperties } from '../base/internal-interfaces';
import { registerChartEventHandler } from '../hooks/events';
import { useLayout } from '../layout/LayoutContext';
import { ChartContext } from '../layout/ChartProvider';
import { PieChartHighlightProps, PieChartDataIndexProps, PieChartSelectionProps } from '../base/interfaces';
import { blurEffect, isLegendTarget, performSelection } from './PieSelectionsRenderer';
import * as React from 'react';
import { indexFinder } from '../utils/helper';

/**
 * The HighlightRenderer component is responsible for rendering the highlight effects on the pie chart.
 * It handles the logic for applying and removing highlight styles based on user interactions like mouse movements.
 * It uses `useLayoutEffect` and `useEffect` hooks to manage the lifecycle and updates of the highlight rendering.
 *
 * @param {PieChartHighlightProps} props - The properties for the HighlightRenderer component, including mode, fill, and pattern.
 * @returns {Element} A JSX fragment that conditionally renders highlight elements.
 * @private
 */
export const PieHighlightRenderer: React.FC<PieChartHighlightProps> = (props: PieChartHighlightProps) => {
    const { layoutRef, phase, reportMeasured, setLayoutValue, legendRef, seriesRef } = useLayout();
    const { chartLegend, chartTooltip } = useContext(ChartContext);
    let highlightState: PieBaseSelection = layoutRef.current.chartHighlight as PieBaseSelection;
    let chartInstance: Chart = layoutRef.current as Chart;

    useLayoutEffect(() => {
        if (phase === 'measuring') {
            if ((props.mode !== 'None' || chartLegend.visible || chartTooltip?.enable) && layoutRef.current) {
                const chartHighlight: PieBaseSelection =
                    getHighlightOptions(props, layoutRef.current as Chart, chartLegend.visible as boolean,
                                        (chartTooltip?.enable && props.mode === 'None') as boolean);
                setLayoutValue('chartHighlight', chartHighlight);
            }
            reportMeasured('PieChartHighlight');

            highlightState = layoutRef.current?.chartHighlight as PieBaseSelection;
            chartInstance = layoutRef.current as Chart;
        }
    }, [phase]);

    useEffect(() => {
        if (phase !== 'measuring' && layoutRef.current?.chartHighlight) {
            (layoutRef.current.chartHighlight as PieBaseSelection).mode = props.mode;
            (layoutRef.current.chartHighlight as PieBaseSelection).fill = props.fill;
            (layoutRef.current.chartHighlight as PieBaseSelection).pattern = props.pattern as PieSelectionPattern;
            highlightState = layoutRef.current.chartHighlight as PieBaseSelection;
        }
    }, [props.mode, props.fill, props.pattern]);

    useEffect(() => {
        const chartId: string = (layoutRef.current as Chart)?.element?.id as string;

        const handleHighlight: (event: Event) => void = (event: Event): void => {
            highlightState = layoutRef.current?.chartHighlight as PieBaseSelection;
            chartInstance = layoutRef.current as Chart;

            let targetElement: Element = event.target as Element;
            const targetId: string = (targetElement as HTMLElement)?.id || '';

            // 1) Connector -> clear highlight (restore opacity)
            if (targetId.includes('_connector_')) { return; }

            // 2) Try to map data-label TEXT -> slice (text-only mapping)
            const remapped: SVGElement | null = mapDataLabelTargetToSlice(layoutRef, seriesRef, targetElement);
            if (remapped) {
                targetElement = remapped;
            }

            const finalId: string = (targetElement as HTMLElement)?.id || '';
            const isSliceTarget: boolean = finalId.indexOf('_Series_') > -1 && finalId.indexOf('_Point_') > -1;
            const isLegendTargetElement: boolean = finalId.indexOf('_legend_') > -1;

            const firstVisibleSeries: SeriesProperties | undefined = chartInstance?.visibleSeries?.[0];
            const hasAnyExplodedSlices: boolean = firstVisibleSeries?.points?.some((point: Points) => point.isExplode) || false;

            // Determine if the target itself is an exploded slice
            let isTargetExploded: boolean = false;
            if (isSliceTarget && firstVisibleSeries) {
                const foundIndex: { series: number; point: number; } = indexFinder(finalId, true) as { series: number; point: number };
                const point: Points = firstVisibleSeries.points?.[foundIndex.point];
                if (point && point.isExplode) {
                    isTargetExploded = true;
                }
            }

            if (isTargetExploded || (!isSliceTarget && !isLegendTargetElement && hasAnyExplodedSlices)) {
                if (highlightState?.previousSelectedElements?.length || (highlightState?.chartSelectedDataIndexes?.length || 0) > 0) {
                    // Clear state and force blur to restore opacities
                    handlePieLegendLeave(layoutRef, legendRef, seriesRef);
                }
                return;
            }
            if (isSliceTarget || isLegendTargetElement) {
                highlightChart( chartInstance, highlightState, targetElement, legendRef, seriesRef, !!layoutRef.current?.chartSelection &&
                    ((layoutRef.current?.chartSelection as PieBaseSelection).chartSelectedDataIndexes?.length as number) > 0
                );
                return;
            }

            // 5) Non-interactive area (no exploded slices, or mouse not over a 'gap' of an exploded slice) -> clear highlight
            if (highlightState?.previousSelectedElements?.length || (highlightState?.chartSelectedDataIndexes?.length || 0) > 0) {
                handlePieLegendLeave(layoutRef, legendRef, seriesRef);
            }
        };

        const handleSelection: (event: Event) => void = (event: Event): void => {
            if (isNullOrUndefined(event.target) || !(layoutRef.current?.chartHighlight)) {
                return;
            }
            highlightState = layoutRef.current?.chartHighlight as PieBaseSelection;
            chartInstance = layoutRef.current as Chart;

            const targetElement: HTMLElement = event.target as HTMLElement;
            highlightState.isLegendSelection =
                targetElement.id.indexOf('_legend_shape') > -1 ||
                targetElement.id.indexOf('_legend_text') > -1 ||
                targetElement.id.indexOf('_legend_g_') > -1;

            if (highlightState.isLegendSelection && (layoutRef.current?.chartLegend?.toggleVisibility)) {
                if (highlightState.previousSelectedElements?.length) {
                    const elementCollection: Element[] = highlightState.previousSelectedElements as Element[];
                    elementCollection.forEach((selectedElement: Element) => selectedElement.removeAttribute('data-highlighted'));
                    highlightState.isAdd = true;
                    highlightState.chartSelectedDataIndexes = [];
                    blurEffect(chartInstance, chartInstance.visibleSeries, highlightState, legendRef, seriesRef);
                    highlightState.previousSelectedElements = [];
                    highlightState.isSelected = false;
                }
                setTimeout(() => {
                    const currentChart: Chart = layoutRef.current as Chart;
                    const currentHighlight: PieBaseSelection = layoutRef.current?.chartHighlight as PieBaseSelection;
                    const hasSelection: boolean =
                        !!layoutRef.current?.chartSelection &&
                        ((layoutRef.current?.chartSelection as PieBaseSelection).chartSelectedDataIndexes?.length as number) > 0;

                    highlightChart(currentChart, currentHighlight, targetElement, legendRef, seriesRef, hasSelection);
                }, 5);

                return;
            }
        };

        const handleChartLeave: () => void = () => {
            handlePieLegendLeave(layoutRef, legendRef, seriesRef);
        };

        const legendGroupElement: SVGGElement = legendRef?.current as SVGGElement;
        const handleLegendLeave: () => void = () => {
            handlePieLegendLeave(layoutRef, legendRef, seriesRef);
        };

        const unregisterMouseMove: () => void = registerChartEventHandler('mouseMove', handleHighlight, chartId);
        const unregisterMouseClick: () => void = registerChartEventHandler('click', handleSelection, chartId);
        legendGroupElement?.addEventListener('mouseleave', handleLegendLeave);
        const unregisterMouseLeave: () => void = registerChartEventHandler('mouseLeave', handleChartLeave, chartId);

        const seriesGroupElement: SVGGElement = seriesRef?.current as SVGGElement;
        seriesGroupElement?.addEventListener('mouseleave', handleChartLeave);

        return () => {
            unregisterMouseClick();
            unregisterMouseMove();
            unregisterMouseLeave();
            legendGroupElement?.removeEventListener('mouseleave', handleLegendLeave);
            seriesGroupElement?.removeEventListener('mouseleave', handleChartLeave);
        };
    }, [props.mode, props]);

    return (
        <>
            {props.pattern !== 'None' &&
            props.mode !== 'None' &&
            chartInstance &&
            highlightState &&
            chartInstance.visibleSeries[0] && (() => {
                const series: SeriesProperties = chartInstance.visibleSeries[0];
                if (series.applyPattern) { return null; }
                return series.points.map((dataPoint: Points) => {
                    const color: string =
                        props.fill && props.fill.length > 0
                            ? props.fill
                            : (dataPoint.color as string);
                    const pointIndex: number = dataPoint.index as number;
                    const colorHash: string = (color).replace(/[^a-zA-Z0-9]/g, '');
                    const patternId: string = `${chartInstance.element.id}_${props.pattern}_Highlight_${colorHash}_${pointIndex}`;
                    return (
                        <React.Fragment key={patternId}>
                            {ensureSelectionPattern(
                                chartInstance.element.id,
                                props.pattern as PieSelectionPattern,
                                color,
                                pointIndex,
                                series.opacity as number,
                                'Highlight'
                            )}
                        </React.Fragment>
                    );
                });
            })()}
        </>
    );
};

/**
 * Retrieves and initializes the highlight options for the pie chart.
 * This function extends the provided props and sets default values or properties specific to chart highlighting.
 *
 * @param {PieChartHighlightProps} chartHighlight - The highlight properties passed to the renderer.
 * @param {Chart} chart - The pie chart instance.
 * @param {boolean} isLegendHighlightEnabled - A boolean indicating if highlight is enabled on the legend.
 * @param {boolean} isTooltipHighlightEnabled - A boolean indicating if tooltip was enabled.
 * @returns {PieBaseSelection} A BaseSelection object configured for chart highlighting.
 */
function getHighlightOptions(
    chartHighlight: PieChartHighlightProps,
    chart: Chart,
    isLegendHighlightEnabled: boolean,
    isTooltipHighlightEnabled: boolean
): PieBaseSelection {
    const highlight: PieBaseSelection = extend({}, chartHighlight) as PieBaseSelection;
    highlight.chart = chart;
    highlight.isLegendSelection = false;
    highlight.chartSelectedDataIndexes = [];
    highlight.previousSelectedElements = [];
    highlight.isSelected = false;
    highlight.isAdd = false;
    highlight.name = 'Highlight';
    highlight.isLegendHighlight = isLegendHighlightEnabled;
    highlight.isLegendToggle = false;
    highlight.isTooltipHighlight = isTooltipHighlightEnabled;
    return highlight;
}

/**
 * Handles the logic for highlighting chart elements based on user interaction.
 * It determines which elements should be highlighted or de-highlighted based on the current interaction target and highlight configuration.
 *
 * @param {Chart} chart - The chart instance.
 * @param {PieBaseSelection} chartHighlight - The highlight configuration object.
 * @param {Element} target - The DOM element that triggered the highlight event (e.g., the element under the mouse cursor).
 * @param {RefObject<SVGGElement | null>} legendRef - A reference to the chart's legend element.
 * @param {RefObject<SVGGElement | null>} seriesRef - A reference to the chart's series element.
 * @param {boolean} isSelected - An optional boolean indicating if any data points are already selected.
 * @returns {void}
 * @private
 */
export function highlightChart(chart: Chart, chartHighlight: PieBaseSelection, target: Element, legendRef: RefObject<SVGGElement | null>,
                               seriesRef: RefObject<SVGGElement | null>, isSelected?: boolean): void {
    if (!(chartHighlight.mode !== 'None' || chartHighlight.isLegendHighlight || chartHighlight.isTooltipHighlight)) {
        return;
    }
    if (isNullOrUndefined(target)) {
        return;
    }
    const targetEl: HTMLElement = target as HTMLElement;
    const selectionState: PieBaseSelection | undefined =
        (chart as Chart).chartSelection as PieBaseSelection | undefined;
    const selectionActive: boolean =
        !!selectionState &&
        (((selectionState.chartSelectedDataIndexes?.length as number) > 0) ||
            ((selectionState.previousSelectedElements?.length as number) > 0));

    const series: SeriesProperties | undefined = chart.visibleSeries?.[0];
    const skipFillReset: boolean = !!series?.applyPattern;

    let legendHoverIsSelected: boolean = false;
    const idStr: string = targetEl.id || '';
    if (selectionActive && idStr.includes('_legend_')) {
        const parts: string[] = idStr.split('_');
        const maybeIndex: number = Number.parseInt(parts[parts.length - 1] || '', 10);
        if (Number.isFinite(maybeIndex)) {
            const selectedSet: Set<number> = new Set<number>(
                (selectionState?.chartSelectedDataIndexes || []).map((d: PieChartDataIndexProps) => Number(d.pointIndex))
            );
            legendHoverIsSelected = selectedSet.has(maybeIndex);
            // Fallback: check sibling legend shape attribute if needed
            if (!legendHoverIsSelected) {
                const legendTranslate: SVGGElement | null = (legendRef?.current as SVGGElement) || null;
                const itemGroup: Element | null = legendTranslate?.children?.[0]?.children?.item(maybeIndex) || null;
                const legendShape: HTMLElement | null = (itemGroup?.children?.item(0) as HTMLElement) || null;
                legendHoverIsSelected = !!legendShape && legendShape.getAttribute('data-selected') === 'true';
            }
        }
    }

    const clearPreviousHighlight: () => void = (): void => {
        if (chartHighlight.previousSelectedElements && chartHighlight.previousSelectedElements.length > 0) {
            const elements: Element[] = chartHighlight.previousSelectedElements as Element[];
            elements.forEach((el: Element) => {
                el.removeAttribute('data-highlighted');
                const node: HTMLElement = el as HTMLElement;

                node.style.opacity = '';
                if (!skipFillReset) {
                    node.style.fill = '';
                    node.style.stroke = '';
                }
            });
        }
        chartHighlight.previousSelectedElements = [];
        chartHighlight.chartSelectedDataIndexes = [];
        chartHighlight.isSelected = false;
    };

    const hoveredIsSelected: boolean =
        targetEl.getAttribute('data-selected') === 'true' ||
        targetEl.hasAttribute('data-selected') ||
        legendHoverIsSelected;

    if (hoveredIsSelected) {
        clearPreviousHighlight();
        if (selectionActive) {
            (selectionState as PieBaseSelection).isAdd = true;
            blurEffect(chart, chart.visibleSeries, selectionState as PieBaseSelection, legendRef, seriesRef);
        } else {
            chartHighlight.isAdd = true;
            blurEffect(chart, chart.visibleSeries, chartHighlight, legendRef, seriesRef);
        }
        return;
    }
    if (targetEl.hasAttribute('data-highlighted')) {
        return;
    }
    clearPreviousHighlight();
    calculateSelectedElements(chart, chartHighlight, legendRef, seriesRef, targetEl, false, isSelected);
}

/**
 * Clears highlight state when mouse leaves the legend area
 *
 * @param {RefObject<Chart>} layoutRef - A reference to the chart's layout.
 * @param {RefObject<SVGGElement | null>} legendRef - A reference to the chart's legend element.
 * @param {RefObject<SVGGElement | null>} seriesRef - A reference to the chart's series element.
 * @returns {void}
 * @private
 */
export function handlePieLegendLeave(
    layoutRef: RefObject<Chart>,
    legendRef: RefObject<SVGGElement | null>,
    seriesRef: RefObject<SVGGElement | null>
): void {
    const chart: Chart = layoutRef.current as Chart;
    const chartHighlight: PieBaseSelection = layoutRef.current?.chartHighlight as PieBaseSelection;
    if (!chart || !chartHighlight) { return; }

    const attributes: 'data-selected' | 'data-highlighted' =
        chartHighlight.name === 'Selection' ? 'data-selected' : 'data-highlighted';

    // Clear highlight state for all previously tracked elements
    if (chartHighlight.previousSelectedElements && chartHighlight.previousSelectedElements.length > 0) {
        chartHighlight.previousSelectedElements.forEach((element: Element) => {
            element.removeAttribute(attributes);
            const node: HTMLElement = element as HTMLElement;
            node.style.fill = '';
        });
        chartHighlight.previousSelectedElements = [];
        chartHighlight.chartSelectedDataIndexes = [];
        chartHighlight.isSelected = false;
    }

    // Check for active selection
    const activeSelection: PieBaseSelection | undefined = layoutRef.current?.chartSelection as PieBaseSelection | undefined;
    const selectionActive: boolean =
        !!activeSelection &&
        (((activeSelection.chartSelectedDataIndexes?.length || 0) > 0) ||
            ((activeSelection.previousSelectedElements?.length || 0) > 0));
    if (selectionActive) {
        (activeSelection as PieBaseSelection).isAdd = true;
        blurEffect(chart, chart.visibleSeries, activeSelection as PieBaseSelection, legendRef, seriesRef);
    } else {
        chartHighlight.isAdd = true;
        blurEffect(chart, chart.visibleSeries, chartHighlight, legendRef, seriesRef);
    }
}

/**
 * Renders <pattern> definition nodes for selection/highlight fills.
 *
 * @param {string} chartId - Chart element id (used as prefix for pattern ids).
 * @param {PieSelectionPattern} patternName - Selection pattern enum name.
 * @param {string} color - Primary color for pattern elements (circles/rects/paths).
 * @param {number} index - Series index for id stability (pie typically uses 0).
 * @param {number} opacity - Series opacity to apply to pattern background rect.
 * @param {string} interaction - Context string ('Selection' | 'Highlight') included in the id.
 * @returns {JSX.Element} - A JSX `<pattern>` element with the requested geometry.
 * @private
 */
export function ensureSelectionPattern(
    chartId: string,
    patternName: PieSelectionPattern,
    color: string,
    index: number,
    opacity: number,
    interaction: string
): JSX.Element {
    const colorHash: string = color.replace(/[^a-zA-Z0-9]/g, '');
    const patternId: string = `${chartId}_${patternName}_${interaction}_${colorHash}_${index}`;
    const backgroundColor: string = interaction === 'Initial' ? 'transparent' : '#ffffff';

    let patternWidth: number = 6;
    let patternHeight: number = 6;
    let patternBody: JSX.Element[] = [
        <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />
    ];


    switch (patternName) {
    case 'Dots': {
        patternWidth = patternHeight = 6;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <circle key="dot" cx="3" cy="3" r="2" strokeWidth={1} fill={color} />
        ];
        break;
    }
    case 'Chessboard': {
        patternWidth = patternHeight = 10;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <rect key="c1" x="0" y="0" width="5" height="5" fill={color} opacity={opacity} />,
            <rect key="c2" x="5" y="5" width="5" height="5" fill={color} opacity={opacity} />
        ];
        break;
    }
    case 'DiagonalForward': {
        patternWidth = patternHeight = 6;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="df" d="M 3 -3 L 9 3 M 6 6 L 0 0 M 3 9 L -3 3" strokeWidth={2} stroke={color} fill="none" />
        ];
        break;
    }
    case 'DiagonalBackward': {
        patternWidth = patternHeight = 6;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="db" d="M 3 -3 L -3 3 M 0 6 L 6 0 M 9 3 L 3 9" strokeWidth={2} stroke={color} fill="none" />
        ];
        break;
    }
    case 'Grid': {
        patternWidth = patternHeight = 6;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path
                key="grid"
                d="M1 3.5L11 3.5 M0 3.5L11 3.5 M0 7.5L11 7.5 M0 11.5L11 11.5 M5.5 0L5.5 12 M11.5 0L11.5 12Z"
                strokeWidth={1}
                stroke={color}
                fill="none"
            />
        ];
        break;
    }
    case 'Crosshatch': {
        // Two diagonals crossing; keeps a tight tile feel
        patternWidth = patternHeight = 8;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="crosshatch" d="M0 0 L8 8 M8 0 L0 8" strokeWidth={1} stroke={color} fill="none" />
        ];
        break;
    }
    case 'Pacman': {
        // Matches Cartesian implementation shape and size closely
        patternWidth = 17.917;
        patternHeight = 18.384;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path
                key="pacman"
                d="M9.081,9.194l5.806-3.08c-0.812-1.496-2.403-3.052-4.291-3.052H8.835C6.138,3.063,3,6.151,3,8.723v1.679
       c0,2.572,3.138,5.661,5.835,5.661h1.761c2.085,0,3.835-1.76,4.535-3.514L9.081,9.194z"
                strokeWidth={1}
                stroke={color}
                fill={color}
            />
        ];
        break;
    }
    case 'Turquoise': {
        // Simple tiled border + accent dots to evoke 'turquoise tile'
        patternWidth = patternHeight = 8;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <rect key="tileBox" x="0.5" y="0.5" width="7" height="7" fill="none" stroke={color} strokeWidth={1} />,
            <circle key="t1" cx="2" cy="2" r="1" fill={color} opacity={opacity} />,
            <circle key="t2" cx="6" cy="6" r="1" fill={color} opacity={opacity} />
        ];
        break;
    }
    case 'Star': {
        // 5-point star at small scale
        patternWidth = patternHeight = 10;
        const starPath: string =
            'M5,1 L6.2,3.8 L9,4.1 L6.8,6.0 L7.6,9 L5,7.4 L2.4,9 L3.2,6 L1,4.1 L3.8,3.8 Z';
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="star" d={starPath} fill={color} stroke={color} strokeWidth={0.5} />
        ];
        break;
    }
    case 'Triangle': {
        patternWidth = patternHeight = 8;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="tri" d="M4 1 L7 7 L1 7 Z" fill={color} stroke={color} strokeWidth={0.5} />
        ];
        break;
    }
    case 'Circle': {
        patternWidth = patternHeight = 9;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <circle key="circle" cx="4.5" cy="4.5" r="3" fill={color} />
        ];
        break;
    }
    case 'Tile': {
        // 2x2 small squares
        patternWidth = patternHeight = 8;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <rect key="t1" x="0.5" y="0.5" width="3" height="3" fill={color} opacity={opacity} />,
            <rect key="t2" x="4.5" y="0.5" width="3" height="3" fill={color} opacity={opacity} />,
            <rect key="t3" x="0.5" y="4.5" width="3" height="3" fill={color} opacity={opacity} />,
            <rect key="t4" x="4.5" y="4.5" width="3" height="3" fill={color} opacity={opacity} />
        ];
        break;
    }
    case 'HorizontalDash': {
        patternWidth = patternHeight = 12;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="hdash" d="M0,1.5 L10 1.5 M0,5.5 L10 5.5 M0,9.5 L10 9.5 z" strokeWidth={1} stroke={color} fill={color} />
        ];
        break;
    }
    case 'VerticalDash': {
        patternWidth = patternHeight = 12;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="vdash" d="M1.5,0 L1.5 10 M5.5,0 L5.5 10 M9.5,0 L9.5 10 z" strokeWidth={1} stroke={color} fill={color} />
        ];
        break;
    }
    case 'Rectangle': {
        patternWidth = patternHeight = 12;
        patternBody = [
            <rect key="rect-bg" width={patternHeight} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <rect key="rect1" x="1" y="2" width="4" height="9" fill={color} opacity={opacity} />,
            <rect key="rect2" x="7" y="2" width="4" height="9" fill={color} opacity={opacity} />
        ];
        break;
    }
    case 'Box': {
        patternWidth = patternHeight = 10;
        patternBody = [
            <rect key="box-bg" width="13" height="13" fill={backgroundColor} opacity={opacity} />,
            <rect key="box" x="1.5" y="1.5" width={patternWidth} height="9" fill={color} opacity={opacity} />
        ];
        break;
    }
    case 'VerticalStripe': {
        patternWidth = 12;
        patternHeight = 10;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="vstripe" d="M0.5,0 L0.5 10 M4.5,0 L4.5 10 M8.5,0 L8.5 10 z" strokeWidth={1} stroke={color} fill={color} />
        ];
        break;
    }
    case 'HorizontalStripe': {
        patternWidth = 10;
        patternHeight = 12;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <path key="hstripe" d="M0,0.5 L10 0.5 M0,4.5 L10 4.5 M0,8.5 L10 8.5 z" strokeWidth={1} stroke={color} fill={color} />
        ];
        break;
    }
    case 'Bubble': {
        patternWidth = patternHeight = 20;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <circle key="bub2" cx="13.328" cy="6.24" r="4.884" strokeWidth={1} fill={color} />,
            <circle key="bub1" cx="5.217" cy="11.325" r="3.429" strokeWidth={1} fill="#D0A6D1" />,
            <circle key="bub3" cx="13.277" cy="14.66" r="3.018" strokeWidth={1} fill="#D0A6D1" />
        ];
        break;
    }
    default: {
        patternWidth = patternHeight = 6;
        patternBody = [
            <rect key="bg" x="0" y="0" width={patternWidth} height={patternHeight} fill={backgroundColor} opacity={opacity} />,
            <circle key="default" cx="3" cy="3" r="1.5" fill={color} />
        ];
        break;
    }
    }
    return (
        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width={patternWidth} height={patternHeight}>
            {patternBody}
        </pattern>
    );
}

/**
 * Maps a hovered **data label** element to its corresponding **pie slice** SVG element.
 *
 * @param {RefObject<Chart>} layoutRef - A reference to the chart's layout.
 * @param {RefObject<SVGGElement | null>} seriesRef - A reference to the chart's series element.
 * @param {Element} target - The DOM element that triggered the highlight event (e.g., the element under the mouse cursor).
 * @returns {SVGElement | null} returns the SVG element corresponding to the data label's target slice or null if none is found.
 * @private
 */
export function mapDataLabelTargetToSlice(
    layoutRef: React.RefObject<Chart>,
    seriesRef: React.RefObject<SVGGElement | null>,
    target: Element
): SVGElement | null {
    let element: Element = target;
    if (element.tagName && element.tagName.toLowerCase() === 'tspan' && element.parentElement) {
        element = element.parentElement;
    }
    const targetId: string = (element as HTMLElement).id || '';
    const chartId: string = layoutRef.current?.element?.id;
    const prefix: string = `${chartId}_datalabel_Series_`;
    const marker: string = '_text_';
    // Expect: <chartId>_datalabel_Series_<seriesIndex>_text_<pointIndex>
    if (!targetId.startsWith(prefix)) {
        return null;
    }
    const markerPos: number = targetId.indexOf(marker, prefix.length);
    if (markerPos === -1) {
        return null;
    }
    const seriesStr: string = targetId.substring(prefix.length, markerPos);
    const pointStr: string = targetId.substring(markerPos + marker.length);
    const seriesIndex: number = Number.parseInt(seriesStr, 10);
    const pointIndex: number = Number.parseInt(pointStr, 10);

    if (!Number.isFinite(seriesIndex) || !Number.isFinite(pointIndex)) {
        return null;
    }
    const seriesGroup: SVGGElement = seriesRef?.current as SVGGElement;
    if (!seriesGroup) {  return null; }

    const sliceId: string = `${chartId}_Series_${seriesIndex}_Point_${pointIndex}`;

    const direct: SVGElement | undefined = Array
        .from(seriesGroup.children)
        .find((n: Element) => (n as HTMLElement).id === sliceId) as SVGElement | undefined;

    if (direct) { return direct; }

    const descendant: SVGElement | null = seriesGroup.querySelector<SVGElement>(`#${sliceId}`);
    return descendant;
}

/**
 * Determines the selection target (slice or legend) from the dispatched event target
 * and applies selection or clearing accordingly.
 *
 * For pie charts, only `Point` and `None` modes are supported here.
 *
 * @param {Chart} chart - The chart instance.
 * @param {PieBaseSelection} chartSelection - The runtime selection object.
 * @param {RefObject<SVGGElement | null>} legendRef - Ref to the legend <g> container.
 * @param {RefObject<SVGGElement | null>} seriesRef - Ref to the series <g> container (pie slices).
 * @param {EventTarget} targetElement - The raw DOM event target.
 * @param {boolean} pointClick - Whether the source was a point click (true) or not (false).
 * @param {boolean} _isSelected - Reserved flag (unused in this implementation).
 * @returns {void}
 * @private
 */
export const calculateSelectedElements: (chart: Chart, chartSelection: PieBaseSelection,
    legendRef: RefObject<SVGGElement | null>, seriesRef: RefObject<SVGGElement | null>,
    targetElement: EventTarget, pointClick?: boolean, _isSelected?: boolean) => void = (
    chart: Chart,
    chartSelection: PieBaseSelection,
    legendRef: RefObject<SVGGElement | null>,
    seriesRef: RefObject<SVGGElement | null>,
    targetElement: EventTarget,
    pointClick?: boolean,
    _isSelected?: boolean
): void => {
    const target: HTMLElement = targetElement as HTMLElement;
    chartSelection.isLegendSelection = isLegendTarget(target, chart);

    const isSliceTarget: boolean =
        !!target.id &&
        target.id.indexOf('_Series_') > -1 &&
        target.id.indexOf('_Point_') > -1 &&
        (chartSelection.mode !== 'None' || chartSelection.isTooltipHighlight) as boolean;

    const isLegendClickAllowed: boolean =
        chartSelection.isLegendSelection && (!!chartSelection.isLegendToggle || chartSelection.isLegendHighlight) as boolean;

    if (isSliceTarget) {
        const foundIndex: { series: number; point: number; } = indexFinder(target.id, true) as { series: number; point: number };
        const firstVisibleSeries: SeriesProperties | undefined = chart.visibleSeries?.[0];
        const point: Points = firstVisibleSeries?.points?.[foundIndex.point];

        if (point && point.isExplode) {
            const attributes: 'data-selected' | 'data-highlighted' =
                chartSelection.name === 'Selection' ? 'data-selected' : 'data-highlighted';
            if (chartSelection.previousSelectedElements?.length) {
                chartSelection.previousSelectedElements.forEach((element: Element) => {
                    element.removeAttribute(attributes);
                });
                chartSelection.chartSelectedDataIndexes = [];
                chartSelection.previousSelectedElements = [];
                chartSelection.isSelected = false;
                chartSelection.isAdd = true;
                blurEffect(chart, chart.visibleSeries, chartSelection, legendRef, seriesRef);
            }
            return;
        }

        const index: { series: number; point: number; } = foundIndex;
        performSelection(chart, chartSelection, legendRef, seriesRef,
                         { pointIndex: index.point }, target, pointClick);

    } else if (isLegendClickAllowed) {
        const pointIndex: number = parseInt((target.id.split('_').pop() as string), 10);
        if (!isNaN(pointIndex)) {
            performSelection(chart, chartSelection, legendRef, seriesRef, { pointIndex: pointIndex }, target, pointClick);
        }
    } else {
        // Outside slice/legend: clear highlight; but DO NOT restore opacities if a selection is active.
        const attributes: 'data-selected' | 'data-highlighted' =
            chartSelection.name === 'Selection' ? 'data-selected' : 'data-highlighted';

        if (chartSelection.previousSelectedElements && chartSelection.previousSelectedElements.length > 0) {
            const elements: Element[] = chartSelection.previousSelectedElements as Element[];
            elements.forEach((element: Element) => {
                element.removeAttribute(attributes);
            });
            chartSelection.chartSelectedDataIndexes = [];
            chartSelection.previousSelectedElements = [];
            chartSelection.isSelected = false;

            // Only run blurEffect when there is NO active selection (i.e., highlight context without selection).
            const selectionIsActive: boolean = !!_isSelected;
            if (!(chartSelection.name === 'Highlight' && selectionIsActive)) {
                blurEffect(chart, chart.visibleSeries, chartSelection, legendRef, seriesRef);
            }
        }
    }
};

/**
 * Removes previously selected elements that conflict with the current index
 * in single-select mode. Also clears the corresponding legend shape (if tracked).
 *
 * @param {Chart} chart - Chart instance.
 * @param {PieChartDataIndexProps[]} indices - Current array of selected indexes (will be mutated).
 * @param {PieChartDataIndexProps} currentDataIndex - The new index being selected.
 * @param {PieBaseSelection} chartSelection Runtime selection object (mutable).
 * @param { RefObject<SVGGElement | null>} legendRef - Ref to legend container (used to clear matching legend shape).
 * @returns {void}
 * @private
 */
export function removeMultiSelectElements(
    chart: Chart, indices: PieChartDataIndexProps[], currentDataIndex: PieChartDataIndexProps,
    chartSelection: PieBaseSelection, legendRef: RefObject<SVGGElement | null>
): void {
    for (let i: number = 0; i < indices?.length; i++) {
        const targetIndex: PieChartDataIndexProps = indices[i as number];
        const shouldRemove: boolean = targetIndex.pointIndex !== currentDataIndex.pointIndex;
        if (shouldRemove) {
            const baseSliceId: string = `${chart.element.id}_Series_0_Point_${targetIndex.pointIndex}`;
            const suffix: string = `_Series_0_Point_${targetIndex.pointIndex}`;

            if (chartSelection.previousSelectedElements) {
                const toClear: Element[] = [];

                // Clear all slice-related nodes for this point (exact id or same suffix)
                for (const element of chartSelection.previousSelectedElements) {
                    const id: string = (element as HTMLElement).id || '';
                    if (id === baseSliceId || id.endsWith(suffix)) {
                        toClear.push(element);
                    }
                }
                const legendTranslateGroup: Element = (legendRef?.current as SVGGElement)?.children?.[0] as Element;
                if (legendTranslateGroup && !isNaN(targetIndex.pointIndex as number)) {
                    const legendItemGroup: Element =
                        legendTranslateGroup.children.item(targetIndex.pointIndex as number) as Element;
                    const legendShape: Element = legendItemGroup?.children.item(0) as Element;
                    if (legendShape && chartSelection.previousSelectedElements.includes(legendShape)) {
                        toClear.push(legendShape);
                    }
                }
                // Clean up DOM and styles
                toClear.forEach((element: Element) => {
                    element.removeAttribute('data-selected');
                    element.removeAttribute('data-highlighted');
                    const node: HTMLElement = element as HTMLElement;
                    node.style.opacity = '';
                    node.style.fill = '';
                });
                // Remove from tracking array
                chartSelection.previousSelectedElements =
                    chartSelection.previousSelectedElements.filter((element: Element) => !toClear.includes(element));
            }
            indices.splice(i, 1);
            i--;
        }
    }
}

/**
 * Animates the opacity restoration of an element.
 *
 * @param {HTMLElement} targetElement - The HTML element to animate.
 * @param {number} startOpacity - The starting opacity value.
 * @param {number} endOpacity - The ending opacity value.
 * @param {number} duration - The duration of the animation in milliseconds.
 * @returns {void}
 * @private
 */
export function animateOpacityRestore( targetElement: HTMLElement, startOpacity: number, endOpacity: number, duration: number
): void {
    // Cancel any existing animation on this element
    const existingAnimationId: string | null = targetElement.getAttribute('data-animation-id');
    if (existingAnimationId) {
        cancelAnimationFrame(parseInt(existingAnimationId, 10));
        targetElement.removeAttribute('data-animation-id');
    }

    const startTime: number = performance.now();
    let animationId: number;

    const animate: (currentTime: number) => void = (currentTime: number): void => {
        const elapsed: number = currentTime - startTime;
        const progress: number = Math.min(elapsed / duration, 1);
        const easeProgress: number = 1 - Math.pow(1 - progress, 3);
        const currentOpacity: number = startOpacity + (endOpacity - startOpacity) * easeProgress;
        targetElement.style.opacity = currentOpacity.toString();

        if (progress < 1) {
            animationId = requestAnimationFrame(animate);
            // Store the animation ID so we can cancel it later
            targetElement.setAttribute('data-animation-id', animationId.toString());
        } else {
            // Animation complete - set final state and cleanup
            targetElement.style.opacity = endOpacity === 1 ? '' : endOpacity.toString();
            targetElement.removeAttribute('data-animation-id');
        }
    };

    animationId = requestAnimationFrame(animate);
    targetElement.setAttribute('data-animation-id', animationId.toString());
}

/**
 * Synchronizes the runtime selection object with the latest PieChartSelection props once the component is out of the measuring phase.
 *
 * @param {RefObject<Chart>} layoutRef - Ref to the chart instance containing the runtime selection object.
 * @param {PieChartSelectionProps} props - Latest PieChartSelection props used to synchronize runtime state.
 * @param {RefObject<SVGGElement | null>} legendRef - Ref to the legend <g> container (used for dimming/cleanup).
 * @param {RefObject<SVGGElement | null>} seriesRef - Ref to the series <g> container (used for resolving slice elements).
 * @param {string} phase - Current layout phase; function is a no-op while phase === 'measuring'.
 * @returns {void} It returns nothing.
 * @private
 */
export function updateSelectionProps(
    layoutRef: RefObject<Chart>, props: PieChartSelectionProps,
    legendRef: RefObject<SVGGElement | null>, seriesRef: RefObject<SVGGElement | null>, phase: string
): void {
    if (phase === 'measuring' || !layoutRef.current?.chartSelection) { return; }

    const selectionRuntime: PieBaseSelection = layoutRef.current.chartSelection as PieBaseSelection;
    const previousMode: PieSelectionMode | undefined = selectionRuntime.mode;
    const previousAllowMultiSelection: boolean | undefined = selectionRuntime.allowMultiSelection;

    // Sync props into runtime object
    selectionRuntime.mode = props.mode;
    selectionRuntime.allowMultiSelection = props.allowMultiSelection;
    selectionRuntime.selectedDataIndexes =
        props.selectedDataIndexes && props.selectedDataIndexes.length > 0 ? [...props.selectedDataIndexes] : [];

    const chart: Chart = layoutRef.current as Chart;

    // Only allowMultiSelection changed (mode unchanged)?
    const onlyMultiSelectionChanged: boolean =
        previousMode === props.mode && previousAllowMultiSelection !== props.allowMultiSelection;

    if (selectionRuntime.previousSelectedElements && selectionRuntime.previousSelectedElements.length > 0) {
        const elements: Element[] = selectionRuntime.previousSelectedElements;

        if (onlyMultiSelectionChanged && elements.length > 0) {
            // Keep the first selected element, clear others
            const firstEl: HTMLElement = elements[0] as HTMLElement;
            const firstId: string = firstEl.id;

            const getPointIndex: (id: string) => number = (id: string): number => {
                if (id.includes('_legend_')) {
                    const numberIndexForLegend: number = Number.parseInt(id.split('_').pop() as string, 10);
                    return Number.isFinite(numberIndexForLegend) ? numberIndexForLegend : -1;
                }
                const matchingRegex: RegExpMatchArray | null = id.match(/_Point_(\d+)/);
                return matchingRegex ? Number.parseInt(matchingRegex[1], 10) : -1;
            };

            const keepPointIndex: number = getPointIndex(firstId);

            for (let i: number = elements.length - 1; i >= 0; i--) {
                const element: HTMLElement = elements[i as number] as HTMLElement;
                const pid: string = element.id;
                const index: number = getPointIndex(pid);
                if (index !== keepPointIndex) {
                    element.removeAttribute('data-selected');
                    element.style.fill = '';
                    const currentOpacity: string = element.style.opacity;
                    const opacityInNumeric: number = currentOpacity === '' ? NaN : parseFloat(currentOpacity);
                    if (!Number.isNaN(opacityInNumeric) && opacityInNumeric < 1) {
                        animateOpacityRestore(element, opacityInNumeric, 1, 600);
                    } else {
                        element.style.opacity = '';
                    }
                    elements.splice(i, 1);
                }
            }
            // Make sure the kept element(s) are fully visible
            elements.forEach((element: Element) => {
                const node: HTMLElement = element as HTMLElement;
                const currentOpacity: string = node.style.opacity;
                const opacityInNumeric: number = currentOpacity === '' ? NaN : parseFloat(currentOpacity);
                if (!Number.isNaN(opacityInNumeric) && opacityInNumeric < 1) {
                    animateOpacityRestore(node, opacityInNumeric, 1, 600);
                } else {
                    node.style.opacity = '';
                }
            });
            // Update runtime index list to only keep the retained point
            if (keepPointIndex !== -1) {
                selectionRuntime.chartSelectedDataIndexes = [{ pointIndex: keepPointIndex }];
                selectionRuntime.isSelected = true;
            } else {
                selectionRuntime.chartSelectedDataIndexes = [];
                selectionRuntime.isSelected = false;
            }
            // Re-apply dimming based on updated state
            selectionRuntime.isAdd = false;
            blurEffect(chart, chart.visibleSeries, selectionRuntime, legendRef, seriesRef);
            return;
        }
        // General clearing branch (mode change, or props.selectedDataIndexes changed)
        elements.forEach((element: Element) => {
            const node: HTMLElement = element as HTMLElement;
            element.removeAttribute('data-selected');
            node.style.fill = '';
            const currentOpacity: string = node.style.opacity;
            const opacityInNumeric: number = currentOpacity === '' ? NaN : parseFloat(currentOpacity);
            if (!Number.isNaN(opacityInNumeric) && opacityInNumeric < 1) {
                animateOpacityRestore(node, opacityInNumeric, 1, 600);
            } else {
                node.style.opacity = '';
            }
        });

        selectionRuntime.isAdd = true;
        selectionRuntime.chartSelectedDataIndexes = [];
        const shouldClearSelection: boolean = !props.selectedDataIndexes || props.selectedDataIndexes.length === 0;
        if (shouldClearSelection) {
            blurEffect(chart, chart.visibleSeries, selectionRuntime, legendRef, seriesRef);
        }
        selectionRuntime.previousSelectedElements = [];
        selectionRuntime.isSelected = false;
    }
}
