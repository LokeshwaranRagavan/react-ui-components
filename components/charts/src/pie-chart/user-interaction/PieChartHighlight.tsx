import { useContext, useEffect } from 'react';
import { PieChartHighlightProps } from '../base/interfaces';
import { ChartContext, ChartProviderChildProps } from '../layout/ChartProvider';
import { defaultChartConfigs } from '../base/default-properties';

/**
 * PieChartHighlight component applies highlight settings to the chart.
 *
 * This component is non-visual and updates the pie and donut chart context with highlight configuration
 * such as mode, color, and pattern when mounted.
 *
 * @param {PieChartHighlightProps} props - Highlight configuration properties.
 * @returns {null} This component does not render UI and returns null.
 */
export const PieChartHighlight: React.FC<PieChartHighlightProps> = (props: PieChartHighlightProps) => {
    const context: ChartProviderChildProps = useContext(ChartContext);

    useEffect(() => {
        context?.setChartHighlight({ ...defaultChartConfigs.ChartHighlight, ...props });
    }, [
        props.mode,
        props.fill,
        props.pattern
    ]);

    return null;
};
