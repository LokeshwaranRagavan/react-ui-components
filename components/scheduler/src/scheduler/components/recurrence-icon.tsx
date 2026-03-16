import { ReactNode } from 'react';
import { EventModel } from '../types/scheduler-types';
import { CSS_CLASSES } from '../common/constants';
import { RepeatIcon, RecurrenceEditIcon, IconComponent } from '@syncfusion/react-icons';
import { Browser } from '@syncfusion/react-base';

export interface RecurrenceIconProps {
    event: EventModel;
}

/**
 * Component that renders the recurrence icon for an event.
 * Shows a RecurrenceEditIcon if the event is an edited occurrence,
 * otherwise shows a RepeatIcon. Only renders on non-mobile devices.
 *
 * @param {EventModel} event - The event model object
 * @returns {ReactNode} The rendered recurrence icon or null if no recurrence
 */
export const RecurrenceIcon: React.FC<RecurrenceIconProps> = ({ event }: RecurrenceIconProps): ReactNode => {
    const hasRecurrence: string | number = event.recurrenceRule || event.recurrenceID;
    if (!hasRecurrence || Browser.isDevice) {
        return null;
    }

    const isEditedOccurrence: boolean = event.id !== event.recurrenceID;
    const IconComponent: IconComponent = isEditedOccurrence ? RecurrenceEditIcon : RepeatIcon;
    const iconClass: string = isEditedOccurrence
        ? CSS_CLASSES.EVENT_RECURRENCE_EDIT_ICON_CLASS
        : CSS_CLASSES.EVENT_RECURRENCE_ICON_CLASS;

    return (
        <div className={`${CSS_CLASSES.ICONS} ${iconClass}`}>
            <IconComponent />
        </div>
    );
};

RecurrenceIcon.displayName = 'RecurrenceIcon';
