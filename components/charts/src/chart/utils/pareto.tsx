import * as React from 'react';
import { ChartDataLabelProps, ChartMarkerProps, ChartParetoOptionsProps, ChartSeriesProps } from '../base/interfaces';
import { defaultChartConfigs } from '../base/default-properties';
import { ChartMarker } from '../series/Marker';
import { SeriesProperties, ChartParetoOptionsInternalProps } from '../chart-area/chart-interfaces';
import { ChartParetoOptions } from '../series/ParetoOptions';
import { ChartSeries, pickPrimitiveProps } from '../series/Series';

type ChartSeriesProperty = ChartSeriesProps & { children?: React.ReactNode };


/**
 * Builds the Pareto signature used to track dependency changes in Series.tsx.
 * Mirrors the exact extraction logic that previously lived inside Series.tsx.
 *
 * @param {React.ReactNode[]} children - Collection of series children to inspect.
 * @returns {string} JSON string representing primitive Pareto props for all series.
 * @private
 */
export function buildParetoSignature(children: React.ReactNode[]): string {
    const signature: Array<Partial<ChartSeriesProperty> | null> = children.map((child: React.ReactNode) => {
        if (
            React.isValidElement(child) &&
            child.type === ChartSeries &&
            (child.props as ChartSeriesProperty).children
        ) {
            let isParetoSignature: Partial<ChartSeriesProperty> | null = null;
            React.Children.forEach(
                (child.props as ChartSeriesProperty).children,
                (childElement: React.ReactNode) => {
                    if (!React.isValidElement(childElement)) { return; }
                    const type: React.ElementType = childElement.type as React.ElementType<keyof React.JSX.IntrinsicElements>;
                    const isParetoNamed: boolean =
                        (typeof type === 'function') &&
                        ('displayName' in type) &&
                        ((type as { displayName?: string }).displayName === 'ChartParetoOptions');
                    if (childElement.type === ChartParetoOptions || isParetoNamed) {
                        const { children: paretoChildren, ...paretoProps } =
                            childElement.props as ChartParetoOptionsProps & { children?: React.ReactNode };
                        isParetoSignature = {
                            ...(pickPrimitiveProps(paretoProps as ChartSeriesProperty) as object)
                        };
                        let paretoMarkerSignature: Partial<ChartSeriesProperty> = {};
                        React.Children.forEach(paretoChildren, (paretoChildElement: React.ReactNode) => {
                            if (React.isValidElement(paretoChildElement) && paretoChildElement.type === ChartMarker) {
                                paretoMarkerSignature = {
                                    ...paretoMarkerSignature,
                                    ...pickPrimitiveProps(paretoChildElement.props as ChartSeriesProperty)
                                };
                                if ((paretoChildElement.props as { children?: React.ReactNode }).children) {
                                    React.Children.forEach(
                                        (paretoChildElement.props as { children?: React.ReactNode }).children,
                                        (dataLabelChild: React.ReactNode) => {
                                            if (React.isValidElement(dataLabelChild)) {
                                                const dataLabelType: React.ElementType =
                                                    dataLabelChild.type as React.ElementType<keyof React.JSX.IntrinsicElements>;
                                                const isDataLabelNamed: boolean =
                                                    (typeof dataLabelType === 'function') &&
                                                    ('displayName' in dataLabelType) &&
                                                    ((dataLabelType as { displayName?: string }).displayName === 'ChartDataLabel');
                                                if (isDataLabelNamed) {
                                                    paretoMarkerSignature = {
                                                        ...paretoMarkerSignature,
                                                        ...pickPrimitiveProps(dataLabelChild.props as ChartSeriesProperty)
                                                    };
                                                }
                                            }
                                        }
                                    );
                                }
                            }
                        });
                        if (isParetoSignature && Object.keys(paretoMarkerSignature).length) {
                            isParetoSignature = { ...isParetoSignature, marker: paretoMarkerSignature };
                        }
                    }
                }
            );
            return isParetoSignature;
        }
        return null;
    });
    return JSON.stringify(signature);
}


/**
 * Handles Pareto options merging within the getSeriesArray() workflow.
 * Performs the same deep-merge behavior originally used in Series.tsx,
 * including nested marker configuration and datalabel font merge.
 *
 * @param {React.ReactNode} seriesChild - Child element of a ChartSeries.
 * @param {SeriesProperties} seriesProps - Mutable target series object.
 * @returns {void}
 * @private
 */
export function handleParetoInGetSeries(seriesChild: React.ReactNode, seriesProps: SeriesProperties): void {
    if (React.isValidElement(seriesChild)) {
        const type: React.ElementType = seriesChild.type as React.ElementType<keyof React.JSX.IntrinsicElements>;
        const isParetoNamed: boolean =
            (typeof type === 'function') &&
            ('displayName' in type) &&
            ((type as { displayName?: string }).displayName === 'ChartParetoOptions');
        if (seriesChild.type === ChartParetoOptions || isParetoNamed) {
            const { children: paretoChildren, ...paretoProps } =
                seriesChild.props as ChartParetoOptionsProps & { children?: React.ReactNode };
            const defaultPareto: ChartParetoOptionsInternalProps | undefined =
                (defaultChartConfigs.ChartSeries as Partial<SeriesProperties>)
                    .paretoOptions as ChartParetoOptionsInternalProps | undefined;
            const mergedPareto: ChartParetoOptionsInternalProps = {
                ...(defaultPareto || {}),
                ...paretoProps
            };
            React.Children.forEach(paretoChildren, (markerChild: React.ReactNode) => {
                if (React.isValidElement(markerChild) && markerChild.type === ChartMarker) {
                    const { children: markerChildren, ...markerProps } = markerChild.props as ChartSeriesProperty;
                    const defaultParetoMarker: ChartMarkerProps | undefined = defaultPareto?.marker ??
                        defaultChartConfigs.ChartSeries.marker;
                    const paretoMarkerConfig: ChartMarkerProps = {
                        ...defaultParetoMarker,
                        ...markerProps
                    } as ChartMarkerProps;
                    React.Children.forEach(markerChildren, (dataLabelChild: React.ReactNode) => {
                        if (React.isValidElement(dataLabelChild)) {
                            const dataLabelType: React.ElementType = dataLabelChild.type as
                                React.ElementType<keyof React.JSX.IntrinsicElements>;
                            const isDataLabelComponent: boolean =
                                (typeof dataLabelType === 'function') &&
                                ('displayName' in dataLabelType) &&
                                ((dataLabelType as { displayName?: string }).displayName === 'ChartDataLabel');
                            if (isDataLabelComponent) {
                                paretoMarkerConfig.dataLabel = {
                                    ...defaultPareto?.marker?.dataLabel,
                                    ...(dataLabelChild.props as ChartDataLabelProps)
                                };
                                paretoMarkerConfig.dataLabel.font = {
                                    ...defaultPareto?.marker?.dataLabel?.font,
                                    ...((dataLabelChild.props as ChartDataLabelProps).font)
                                };
                            }
                        }
                    });
                    mergedPareto.marker = paretoMarkerConfig;
                }
            });
            (seriesProps as SeriesProperties).paretoOptions = mergedPareto as ChartParetoOptionsProps;
        }
    }
}


/**
 * Extracts Pareto-related properties during deepSignature construction.
 * Captures paretoOptions including nested Marker and DataLabel configurations.
 *
 * @param {React.ReactNode} seriesChild - Child element possibly containing Pareto config.
 * @param {SeriesProperties} seriesPropsSignature - Signature accumulator for current series.
 * @returns {void}
 * @private
 */
export function handleParetoInDeepSignature(seriesChild: React.ReactNode, seriesPropsSignature: SeriesProperties): void {
    if (React.isValidElement(seriesChild)) {
        const type: React.ElementType = seriesChild.type as React.ElementType<keyof React.JSX.IntrinsicElements>;
        const isParetoNamed: boolean =
            (typeof type === 'function') &&
            ('displayName' in type) &&
            ((type as { displayName?: string }).displayName === 'ChartParetoOptions');

        if (seriesChild.type === ChartParetoOptions || isParetoNamed) {
            const { children: paretoChildren, ...paretoProps } =
                seriesChild.props as ChartParetoOptionsProps & { children?: React.ReactNode };
            const paretoOptions: ChartParetoOptionsInternalProps = { ...(paretoProps as ChartParetoOptionsProps) };
            if (paretoChildren) {
                React.Children.forEach(paretoChildren, (markerChild: React.ReactNode) => {
                    if (React.isValidElement(markerChild) && markerChild.type === ChartMarker) {
                        const markerProps: ChartMarkerProps = { ...(markerChild.props as ChartMarkerProps) };
                        if ((markerChild.props as { children?: React.ReactNode }).children) {
                            React.Children.forEach(
                                (markerChild.props as { children?: React.ReactNode }).children,
                                (dataLabelChild: React.ReactNode) => {
                                    if (React.isValidElement(dataLabelChild)) {
                                        const dataLabelElementType: React.ElementType =
                                            dataLabelChild.type as React.ElementType<keyof React.JSX.IntrinsicElements>;
                                        const isDataLabelComponent: boolean =
                                            (typeof dataLabelElementType === 'function') &&
                                            ('displayName' in dataLabelElementType) &&
                                            ((dataLabelElementType as { displayName?: string }).displayName === 'ChartDataLabel');
                                        if (isDataLabelComponent) {
                                            markerProps.dataLabel = dataLabelChild.props as ChartDataLabelProps;
                                        }
                                    }
                                }
                            );
                        }
                        paretoOptions.marker = markerProps;
                    }
                });
            }
            (seriesPropsSignature as SeriesProperties).paretoOptions = paretoOptions;
        }
    }
}
