import { FC, ReactNode } from 'react';
import { CSS_CLASSES } from '../common/constants';
import { ProcessedEventsData } from '../types/internal-interface';
import { useEventRendering } from '../hooks/useEventRendering';

export const TimeSlotEventClone: FC<ProcessedEventsData> = (eventInfo: ProcessedEventsData) => {
    const { getEventContent } = useEventRendering({ variant: 'timeSlot' });

    const content: ReactNode = getEventContent(eventInfo);

    return (
        <div
            className={`${CSS_CLASSES.APPOINTMENT} ${CSS_CLASSES.EVENT_CLONE}`}
            style={eventInfo.eventStyle}
        >
            {content}
        </div>
    );
};

export default TimeSlotEventClone;
