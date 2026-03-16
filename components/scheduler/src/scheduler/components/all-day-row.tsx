import { ForwardRefExoticComponent, RefAttributes, forwardRef, useRef, useImperativeHandle, useEffect,
    useCallback, useState, Ref, RefObject, ReactNode } from 'react';
import { AllDayRowProps, IAllDayRow, ProcessedEventsData } from '../types/internal-interface';
import { useSchedulerRenderDatesContext } from '../context/scheduler-render-dates-context';
import { DateService } from '../services/DateService';
import { useAllDayEvents } from '../hooks/useAllDayEvents';
import { AllDayRowCell } from './all-day-row-cell';
import { useSchedulerPropsContext } from '../context/scheduler-context';
import { CSS_CLASSES } from '../common/constants';

export const AllDayRow: ForwardRefExoticComponent<AllDayRowProps & RefAttributes<IAllDayRow>> =
forwardRef<IAllDayRow, AllDayRowProps>((props: AllDayRowProps, ref: Ref<IAllDayRow>): ReactNode => {
    const {
        isCollapsed,
        onCollapseChange,
        onMoreEventsChange
    } = props;

    const { renderDates } = useSchedulerRenderDatesContext();
    const { timeScale } = useSchedulerPropsContext();
    const allDayRowRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
    const prevAllDayHeightRef: RefObject<number> = useRef<number>(0);
    const maxEventsPerRow: number = 3;
    const [allDayRowHeight, setAllDayRowHeight] = useState<string>('auto');

    const {
        eventsByDate,
        hasEventsExceedingMaxCount,
        calculateHeight,
        getVisibleEvents,
        getHiddenEventCount
    } = useAllDayEvents(isCollapsed, maxEventsPerRow);

    const handleCollapseToggle: () => void = useCallback((): void => {
        if (onCollapseChange) {
            onCollapseChange();
        }
    }, [onCollapseChange]);

    useImperativeHandle(ref, () => ({
        hasMoreEvents: hasEventsExceedingMaxCount
    }));

    useEffect(() => {
        if (onMoreEventsChange) {
            onMoreEventsChange(hasEventsExceedingMaxCount);
        }
    }, [hasEventsExceedingMaxCount, onMoreEventsChange]);

    useEffect(() => {
        if (!allDayRowRef.current) { return; }
        if (!timeScale.enable) {
            setAllDayRowHeight('auto');
            prevAllDayHeightRef.current = 0;
        } else {
            const height: number = calculateHeight();
            const prevHeight: number = prevAllDayHeightRef.current || 0;
            const scrollOffset: number = height - prevHeight;
            setAllDayRowHeight(`${height}px`);
            const scrollElement: HTMLElement = allDayRowRef.current?.closest(`.${CSS_CLASSES.MAIN_SCROLL_CONTAINER}`);
            if (scrollElement && scrollOffset !== 0) {
                scrollElement.scrollTop = scrollElement.scrollTop - scrollOffset;
            }
            prevAllDayHeightRef.current = height;
        }
    }, [isCollapsed, eventsByDate, calculateHeight]);

    const rowClassName: string = [
        'sf-all-day-row',
        isCollapsed ? 'sf-all-day-collapsed' : '',
        hasEventsExceedingMaxCount ? 'sf-has-more-events' : ''
    ].filter(Boolean).join(' ');

    const renderDateCell: (date: Date) => ReactNode = (date: Date): ReactNode => {
        const dateKey: string = DateService.generateDateKey(date);
        const visibleEvents: ProcessedEventsData[] = getVisibleEvents(dateKey);
        const hiddenEventCount: number = getHiddenEventCount(dateKey);

        return (
            <AllDayRowCell
                key={dateKey}
                date={date}
                visibleEvents={visibleEvents}
                hiddenEventCount={hiddenEventCount}
                onMoreIndicatorClick={handleCollapseToggle}
            />
        );
    };

    return (
        <div
            ref={allDayRowRef}
            className={rowClassName}
            style={{ height: allDayRowHeight }}
        >
            {renderDates.map(renderDateCell)}
        </div>
    );
});

AllDayRow.displayName = 'AllDayRow';
export default AllDayRow;
