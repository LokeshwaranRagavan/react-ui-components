import { FC, JSX, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayEventClone } from './day-event-clone';
import { TimeSlotEventClone } from './time-slot-event-clone';
import { useCloneEventContext, CloneEventContextValue } from '../context/clone-event-context';
import { ProcessedEventsData } from '../types/internal-interface';
import { useSchedulerPropsContext } from '../context/scheduler-context';
import { CSS_CLASSES } from '../common/constants';

export const CloneEvent: FC = () => {
    const state: CloneEventContextValue = useCloneEventContext();
    const { schedulerRef } = useSchedulerPropsContext();

    useEffect(() => {
        const onShow: (e: Event) => void = (e: Event) => {
            const detail: { container?: HTMLElement; payload?: { guid?: string; segments?: ProcessedEventsData[]; isDayEvent?: boolean; }; }
                = ((e as CustomEvent)?.detail || {});
            const mainTarget: HTMLElement = schedulerRef.current?.element;
            if (mainTarget && detail?.container && (detail.container === mainTarget || mainTarget.contains(detail.container))) {
                state.show({ guid: detail.payload?.guid, segments: detail.payload?.segments, isDayEvent: detail.payload?.isDayEvent });
            }
        };
        const onHide: (e: Event) => void = (e: Event) => {
            const detail: { container?: HTMLElement } = ((e as CustomEvent)?.detail || {});
            const mainTarget: HTMLElement = schedulerRef.current?.element;
            if (mainTarget && detail?.container && (detail.container === mainTarget || mainTarget.contains(detail.container))) {
                state.hide();
            }
        };
        window?.addEventListener('showCloneEvent', onShow);
        window?.addEventListener('hideCloneEvent', onHide);
        return () => {
            window?.removeEventListener('showCloneEvent', onShow);
            window?.removeEventListener('hideCloneEvent', onHide);
        };
    }, [schedulerRef, state]);

    const container: HTMLElement = state.isDayEvent ?
        schedulerRef.current?.element?.querySelector(`.${CSS_CLASSES.DAY_CLONE_CONTAINER}`) :
        schedulerRef.current?.element?.querySelector(`.${CSS_CLASSES.TIME_SLOT_CLONE_CONTAINER}`);

    const content: JSX.Element = (
        <>
            {state.visible && state.segments.map((segment: ProcessedEventsData, index: number) => (
                state.isDayEvent ? (
                    <DayEventClone key={`${segment?.guid}-${index}`}
                        {...segment}
                    />
                ) : (
                    <TimeSlotEventClone key={`${segment?.guid}-${index}`}
                        {...segment}
                    />
                )
            ))}
        </>
    );

    return container ? createPortal(content, container) : null;
};

export default CloneEvent;
