import { useContext, useEffect } from 'react';
import { PieChartSelectionProps } from '../base/interfaces';
import { ChartContext, ChartProviderChildProps } from '../layout/ChartProvider';
import { defaultChartConfigs } from '../base/default-properties';

/**
 * PieChartSelection component applies selection settings to the chart.
 *
 * This component is non-visual and updates the pie and donut chart context with selection configuration
 * such as mode, multi-select, selected indexes, and pattern when mounted.
 *
 * @param {PieChartSelectionProps} props - Selection configuration properties.
 * @returns {null} This component does not render UI and returns null.
 */
export const PieChartSelection: React.FC<PieChartSelectionProps> = (props: PieChartSelectionProps) => {
    const context: ChartProviderChildProps = useContext(ChartContext);

    useEffect(() => {
        context?.setChartSelection({ ...defaultChartConfigs.ChartSelection, ...props });
    }, [
        props.mode,
        props.allowMultiSelection,
        props.selectedDataIndexes,
        props.pattern
    ]);
    return null;
};
