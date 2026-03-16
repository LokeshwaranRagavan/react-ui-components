import { FC, ReactElement } from 'react';
import { SchedulerHeaderProps } from '../types/scheduler-types';

/**
 * SchedulerHeader component for composing a customizable header with built-in visuals
 * and customizations using children ToolbarItem.
 *
 * This is a thin wrapper component that delegates to internal toolbar primitives.
 * When used, it enables per-item control of built-in toolbar items and supports
 * custom date range rendering and header composition.
 *
 * @param {SchedulerHeaderProps} props - Component props
 * @returns {ReactElement} Rendered header component
 *
 * @example
 * ```tsx
 * <Scheduler header={(props) => (
 *   <SchedulerHeader
 *     {...props}
 *     overflowMode=OverflowMode.Scrollable
 *     viewSwitcher={null}
 *   >
 *     {props.children}
 *     <ToolbarItem>
 *       <Button>Custom Action</Button>
 *     </ToolbarItem>
 *   </SchedulerHeader>
 * )} />
 * ```
 */
export const SchedulerHeader: FC<SchedulerHeaderProps> = (props: SchedulerHeaderProps): ReactElement => {
    // This component marks that custom header configuration is being used.
    // The actual rendering logic is handled by SchedulerToolbar component
    // which receives the props through the scheduler context.
    return <>{props.children}</>;
};

SchedulerHeader.displayName = 'SchedulerHeader';

export default SchedulerHeader;
