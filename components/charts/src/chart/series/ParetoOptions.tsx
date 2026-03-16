import * as React from 'react';
import { ChartParetoOptionsProps } from '../base/interfaces';

/**
 * @description Provides declarative configuration for Pareto cumulative line series behavior and appearance.
 * @returns {null} Renders nothing; used to declaratively configure Pareto series options.
 */
export const ChartParetoOptions: React.FC<ChartParetoOptionsProps & { children?: React.ReactNode }> = () => {
    return null;
};

ChartParetoOptions.displayName = 'ChartParetoOptions';
