import * as React from 'react';
import { useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { InputBase, renderFloatLabelElement } from '@syncfusion/react-inputs';
import { Browser, useProviderContext, preRender, LabelMode, Size, formatDate, Variant, IL10n, L10n } from '@syncfusion/react-base';
import { Popup, CollisionType, type IPopup } from '@syncfusion/react-popups';
import { ArrowTailIcon, CloseIcon, TimelineTodayIcon } from '@syncfusion/react-icons';
import { Calendar } from '../calendar';
import { CalendarView, type CalendarProps, type CalendarChangeEvent, type ViewChangeEvent } from '../calendar';
import { isValidDateObj, clampDate } from '../calendar/utils';
import usePickerPopup from '../hooks/usePickerPopup';
import useDateFormatting from '../hooks/useDateFormatting';
import { DateRangePickerProps, DateRangePreset } from './types';
import { getFocusableElementsInRoot } from '../datepicker/utils';
import { Button } from '@syncfusion/react-buttons';
import { PickerVariant } from '../datepicker';
import { GregorianCalendar } from '../calendar-core';
import usePickerInput, { UsePickerInputResult } from '../hooks/usePickerInputs';
import { coerceRangeStrict, formatRangeText, getDaySpan, isValidRange, normalizeRange, parseRangeInput, sortRange } from './utils';
import { DateRangeFooter } from './daterange-footer';

const DEFAULT_MIN_DATE: Date = new Date(1900, 0, 1);
const DEFAULT_MAX_DATE: Date = new Date(2099, 11, 31);

export interface IDateRangePicker extends DateRangePickerProps {
    /**
     * Reference to the root span element.
     *
     * @private
     * @default -
     */
    element?: HTMLSpanElement | null;
}
type IDateRangePickerProps = IDateRangePicker & Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'value' | 'onChange'>;

/**
 * DateRangePicker component
 */
export const DateRangePicker: React.ForwardRefExoticComponent<IDateRangePickerProps & React.RefAttributes<IDateRangePicker>> =
    forwardRef<IDateRangePicker, IDateRangePickerProps>((props: IDateRangePickerProps, ref: React.Ref<IDateRangePicker>) => {
        const {
            className = '',
            placeholder = 'Select date range',
            id = `daterangepicker_${useId()}`,
            disabled = false,
            readOnly = false,
            labelMode = 'Never',
            size = Size.Medium,
            format = 'M/d/yyyy',
            clearButton = true,
            strictMode = false,
            value,
            defaultValue,
            minDate = DEFAULT_MIN_DATE,
            maxDate = DEFAULT_MAX_DATE,
            start = CalendarView.Month,
            depth = CalendarView.Month,
            firstDayOfWeek = 0,
            weekNumber = false,
            weekRule,
            pickerIcon = true,
            weekDaysFormat,
            open,
            inputFormats,
            pickerVariant = PickerVariant.Auto,
            showDaysOutsideCurrentMonth,
            disablePastDays,
            disableFutureDays,
            variant = Variant.Standard,
            zIndex = 1000,
            cellTemplate,
            headerTemplate,
            onChange,
            onOpen,
            onClose,
            openOnFocus = false,
            editable = true,
            required = false,
            valid,
            validationMessage = '',
            validityStyles = true,
            presets = [],
            separator = ' - ',
            minRangeDays,
            maxRangeDays,
            ...otherProps
        } = props;

        const { locale, dir } = useProviderContext();
        const l10n: IL10n = L10n('daterangepicker', {
            startDate: 'Start Date',
            endDate: 'End Date',
            selectedDays: 'Selected Days',
            customRange: 'Custom Range'
        }, locale);
        const calendarSystem: GregorianCalendar = useMemo<GregorianCalendar>(() => new GregorianCalendar(), []);

        const isControlled: boolean = value !== undefined;
        const [internalValue, setInternalValue] = useState<[Date | null, Date | null]>(
            normalizeRange(value ?? defaultValue ?? null)
        );
        const currentValue: [Date | null, Date | null] = (isControlled ? normalizeRange(value) : internalValue);
        const [draft, setDraft] = useState<[Date | null, Date | null]>(currentValue);

        const containerRef: React.RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null);
        const [isPresetMenu, setIsPresetMenu] = useState<boolean>(true);
        const inputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null);
        const popupRef: React.RefObject<IPopup | null> = useRef<IPopup | null>(null);
        const leftCalRef: React.RefObject<any> = useRef<any>(null);
        const rightCalRef: React.RefObject<any> = useRef<any>(null);
        const iconRef: React.RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null);
        const isDevice: boolean = Browser.isDevice;
        const useDialog: boolean =
            pickerVariant === PickerVariant.Popup || (pickerVariant === PickerVariant.Auto && isDevice);
        const useInline: boolean =
            pickerVariant === PickerVariant.Inline || (pickerVariant === PickerVariant.Auto && !isDevice);
        const [hoverDate, setHoverDate] = useState<Date | null>(null);
        const [presetFocusedIndex, setPresetFocusedIndex] = useState<number>(0);
        const presetListRef: React.RefObject<HTMLUListElement | null> = useRef<HTMLUListElement | null>(null);
        const [activePart, setActivePart] = useState<'start' | 'end' | 'none'>('start');
        const { parseInput } = useDateFormatting({
            locale,
            type: 'date',
            format: format,
            inputFormats
        });

        const fmtDate: (d: Date) => string = useCallback((d: Date): string => {
            return formatDate(d, {
                format: format,
                locale,
                calendar: 'gregorian',
                type: 'date'
            }) || '';
        }, [format, locale]);

        const { isOpen, showPopup, hidePopup, togglePopup, zIndexPopup } = usePickerPopup({
            open,
            defaultOpen: false,
            disabled,
            readOnly,
            onOpen,
            onClose,
            containerRef,
            contentRefs: [popupRef as unknown as React.RefObject<HTMLElement | null>],
            inputRef,
            baseZIndex: zIndex
        });

        useEffect((): void => {
            preRender('daterangepicker');
        }, []);

        const commit: (next: [Date | null, Date | null]) => void = useCallback((next: [Date | null, Date | null]): void => {
            const [s0, e0] = sortRange(next[0], next[1]);
            if (!isControlled) {
                setInternalValue([s0, e0]);
            }
            onChange?.([s0, e0]);
        }, [isControlled, onChange]);

        const canApplyRange: (r: [Date | null, Date | null]) => boolean = useCallback((r: [Date | null, Date | null]) => {
            if (strictMode) {
                return true;
            }
            return isValidRange(r[0], r[1], minDate, maxDate, minRangeDays ?? undefined, maxRangeDays ?? undefined);
        }, [minDate, maxDate, minRangeDays, maxRangeDays, strictMode]);

        const applyDraft: () => void = () => {
            if (!canApplyRange(draft)) {
                return;
            }
            const next: [Date | null, Date | null] = strictMode ?
                coerceRangeStrict(draft, minDate, maxDate, minRangeDays ?? undefined, maxRangeDays ?? undefined)
                : sortRange(draft[0], draft[1]);
            commit(next);
            pickerInput.setInputValue(formatRangeText(next, fmtDate, separator));
            pickerInput.setIsInputValid(true);
            hidePopup();
        };

        const handleIconClick: () => void = useCallback((): void => {
            togglePopup();
        }, [togglePopup]);

        const getFocusableElements: () => HTMLElement[] = useCallback((): HTMLElement[] => {
            const root: Element | undefined = popupRef.current?.element as Element | undefined;
            return getFocusableElementsInRoot(root);
        }, []);

        const handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void = useCallback((e: React.KeyboardEvent<HTMLElement>): void => {
            let focusableElements: HTMLElement[];
            let currentElement: HTMLElement | null;
            let currentIndex: number;
            let nextIndex: number;
            switch (e.key) {
            case 'ArrowDown':
                if (e.altKey || e.metaKey) {
                    e.preventDefault();
                    showPopup();
                }
                break;
            case 'ArrowUp':
                if (e.altKey || e.metaKey) {
                    e.preventDefault();
                    hidePopup();
                }
                break;
            case 'Tab':
                focusableElements = getFocusableElements();
                if (!focusableElements.length) {
                    return;
                }
                e.preventDefault(); e.stopPropagation();
                currentElement = document.activeElement as HTMLElement | null;
                currentIndex = currentElement ? focusableElements.indexOf(currentElement) : -1;
                nextIndex = e.shiftKey
                    ? (currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1)
                    : (currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1);
                focusableElements[nextIndex as number]?.focus();
                break;
            default:
                break;
            }
        }, [showPopup, hidePopup, getFocusableElements]);

        const startOfMonth: (d: Date) => Date = useCallback((d: Date): Date => calendarSystem.startOfMonth(d), [calendarSystem]);
        const clampMonthToRange: (left: Date) => Date = useCallback((left: Date): Date => {
            const minM: Date = startOfMonth(minDate);
            const maxM: Date = startOfMonth(maxDate);
            const x: Date = startOfMonth(left);
            return clampDate(x, minM, maxM);
        }, [minDate, maxDate, startOfMonth]);

        const [leftBaseMonth, setLeftBaseMonth] = useState<Date>(() => {
            const today: Date = startOfMonth(new Date());
            const [s, e] = normalizeRange(value ?? defaultValue ?? null);
            if (s && isValidDateObj(s)) {
                return startOfMonth(s);
            }
            if (e && isValidDateObj(e)) {
                return startOfMonth(calendarSystem.addMonths(e, -1));
            }
            return today;
        });
        const [rightBaseMonth, setRightBaseMonth] = useState<Date>(() => {
            const [s, e] = normalizeRange(value ?? defaultValue ?? null);
            if (e && isValidDateObj(e)) {
                return startOfMonth(e);
            }
            if (s && isValidDateObj(s)) {
                return startOfMonth(calendarSystem.addMonths(s, 1));
            }
            return startOfMonth(calendarSystem.addMonths(new Date(), 1));
        });

        const cvStartTs: number = currentValue[0]?.getTime?.() ?? NaN;
        const cvEndTs: number = currentValue[1]?.getTime?.() ?? NaN;

        useEffect((): void => {
            if (isOpen) {
                return;
            }
            const today: Date = startOfMonth(new Date());
            let leftMonth: Date =
                (currentValue[0] && isValidDateObj(currentValue[0])) ? startOfMonth(currentValue[0] as Date)
                    : (currentValue[1] && isValidDateObj(currentValue[1]))
                        ? startOfMonth(calendarSystem.addMonths(currentValue[1] as Date, -1)) : today;
            leftMonth = leftMonth && !isNaN(leftMonth.getTime()) ? leftMonth : today;
            leftMonth = clampMonthToRange(leftMonth);
            const rightMonth: Date =
                (currentValue[1] && isValidDateObj(currentValue[1])) ? startOfMonth(currentValue[1] as Date)
                    : calendarSystem.addMonths(leftMonth, 1);
            setLeftBaseMonth(leftMonth);
            setRightBaseMonth(clampMonthToRange(rightMonth));
        }, [isOpen, currentValue[0]?.getTime(), currentValue[1]?.getTime(), startOfMonth, calendarSystem, clampMonthToRange]);

        useEffect(() => {
            if (!strictMode) {
                return;
            }
            const [s, e] = currentValue;
            if (!s || !e) {
                return;
            }
            const days: number = getDaySpan(s, e);
            const tooShort: boolean = typeof minRangeDays === 'number' && days < minRangeDays;
            const tooLong: boolean = typeof maxRangeDays === 'number' && days > maxRangeDays;
            if (tooShort || tooLong) {
                const coerced: [Date | null, Date | null] = coerceRangeStrict(
                    currentValue,
                    minDate,
                    maxDate,
                    minRangeDays ?? undefined,
                    maxRangeDays ?? undefined
                );
                commit(coerced);
                pickerInput.setInputValue(formatRangeText(coerced, fmtDate, separator));
                pickerInput.setIsInputValid(true);
            }
        }, [
            strictMode,
            cvStartTs,
            cvEndTs,
            minRangeDays, maxRangeDays,
            minDate.getTime?.(), maxDate.getTime?.()
        ]);

        const handleLeftViewChange: (args: ViewChangeEvent) => void = useCallback((args: ViewChangeEvent): void => {
            if (args?.date instanceof Date && !isNaN(args.date.getTime())) {
                setLeftBaseMonth(clampMonthToRange(startOfMonth(args.date)));
            }
            props.onViewChange?.({ view: args.view, date: args.date, event: args.event });
        }, [props.onViewChange, startOfMonth, clampMonthToRange]);

        const handleRightViewChange: (args: ViewChangeEvent) => void = useCallback((args: ViewChangeEvent): void => {
            if (args?.date instanceof Date && !isNaN(args.date.getTime())) {
                setRightBaseMonth(clampMonthToRange(startOfMonth(args.date)));
            }
            props.onViewChange?.({ view: args.view, date: args.date, event: args.event });
        }, [props.onViewChange, startOfMonth, clampMonthToRange]);

        const handleCalendarChange: (ev: CalendarChangeEvent) => void = useCallback((ev: CalendarChangeEvent): void => {
            const d: Date | null = (ev?.value as Date) ?? null;
            if (!(d instanceof Date) || isNaN(d.getTime())) { return; }
            if (useDialog) {
                setDraft((prev: [Date | null, Date | null]) => {
                    const [s, e] = prev;
                    if (activePart === 'start') {
                        if (e && isValidDateObj(e)) {
                            if (d.getTime() <= e.getTime()) {
                                leftCalRef.current?.navigateTo?.(CalendarView.Month, new Date(d.getFullYear(), d.getMonth(), 1));
                                return [d, e];
                            }
                            setActivePart('end');
                            leftCalRef.current?.navigateTo?.(CalendarView.Month, new Date(d.getFullYear(), d.getMonth(), 1));
                            return [d, null];
                        }
                        setActivePart('end');
                        leftCalRef.current?.navigateTo?.(CalendarView.Month, new Date(d.getFullYear(), d.getMonth(), 1));
                        return [d, null];
                    }
                    if (activePart === 'end') {
                        if (s && isValidDateObj(s)) {
                            if (d.getTime() >= s.getTime()) {
                                return [s, d];
                            }
                            return [d, null];
                        }
                        setActivePart('end');
                        return [d, null];
                    }
                    if (s && e) {
                        return [d, null];
                    }
                    if (s && !e) {
                        if (s.getTime() === d.getTime()) {
                            return [s, d];
                        }
                        if (d.getTime() < s.getTime()) {
                            return [d, null];
                        }
                        return [s, d];
                    }
                    return [d, null];
                });
                return;
            }
            setDraft((prev: [Date | null, Date | null]) => {
                if (!(d instanceof Date) || isNaN(d.getTime())) {
                    return prev;
                }
                const [s, e] = prev;
                if (s && e) {
                    return [d, null];
                }
                if (s && !e) {
                    if (s.getTime() === d.getTime()) {
                        return [s, d];
                    }
                    if (d.getTime() < s.getTime()) {
                        return [d, null];
                    }
                    return [s, d];
                }
                return [d, null];
            });
        }, [useDialog, activePart]);

        const leftNormalizedDates: Date[] = useMemo(() => {
            if (!draft[0] || !draft[1]) {
                return [];
            }
            const [start, end] = draft;
            if (!(start instanceof Date) || !(end instanceof Date)) {
                return [];
            }
            const leftYear: number = leftBaseMonth.getFullYear();
            const leftMonth: number = leftBaseMonth.getMonth();
            const dates: Date[] = [];
            if (start.getFullYear() === leftYear && start.getMonth() === leftMonth) {
                dates.push(start);
            }
            if (end.getFullYear() === leftYear && end.getMonth() === leftMonth) {
                dates.push(end);
            }
            return dates;
        }, [draft[0]?.getTime(), draft[1]?.getTime(), leftBaseMonth]);

        const rightNormalizedDates: Date[] = useMemo(() => {
            if (!draft[0] || !draft[1]) {
                return [];
            }
            const [start, end] = draft;
            if (!(start instanceof Date) || !(end instanceof Date)) {
                return [];
            }
            const rightYear: number = rightBaseMonth.getFullYear();
            const rightMonth: number = rightBaseMonth.getMonth();
            const dates: Date[] = [];
            if (start.getFullYear() === rightYear && start.getMonth() === rightMonth) {
                dates.push(start);
            }
            if (end.getFullYear() === rightYear && end.getMonth() === rightMonth) {
                dates.push(end);
            }
            return dates;
        }, [draft[0]?.getTime(), draft[1]?.getTime(), rightBaseMonth]);

        const { earliestEnd, latestEnd } = useMemo(() => {
            const s: Date | null = draft[0];
            const e: Date | null = draft[1];
            if (!(s instanceof Date) || isNaN(s.getTime()) || (e instanceof Date && !isNaN(e.getTime()))) {
                return { earliestEnd: null as Date | null, latestEnd: null as Date | null };
            }
            const earliest: Date | null = typeof minRangeDays === 'number' && minRangeDays > 1
                ? calendarSystem.addDays(s, minRangeDays - 1) : null;
            const latest: Date | null = typeof maxRangeDays === 'number' && maxRangeDays > 0
                ? calendarSystem.addDays(s, maxRangeDays - 1) : null;
            const clampTo: (d: Date | null) => Date | null = (d: Date | null): Date | null => (d ? clampDate(d, minDate, maxDate) : null);
            return { earliestEnd: clampTo(earliest), latestEnd: clampTo(latest) };
        }, [draft[0]?.getTime?.(), draft[1]?.getTime?.(), minDate, maxDate, minRangeDays, maxRangeDays, calendarSystem]);

        const inlineMinForEnd: Date = useMemo(() => (draft[0] && !draft[1] && earliestEnd) ? earliestEnd
            : minDate, [draft[0]?.getTime?.(), draft[1]?.getTime?.(), earliestEnd, minDate]);
        const inlineMaxForEnd: Date = useMemo(() => (draft[0] && !draft[1] && latestEnd) ? latestEnd
            : maxDate, [draft[0]?.getTime?.(), draft[1]?.getTime?.(), latestEnd, maxDate]);

        const handleCellHover: (d: Date | null) => void = useCallback((d: Date | null): void => {
            const [start, end] = draft;
            if (!(start instanceof Date) || isNaN(start.getTime()) || (end instanceof Date && !isNaN(end.getTime()))) {
                setHoverDate(null);
                return;
            }
            setHoverDate(d);
        }, [draft[0]?.getTime(), draft[1]?.getTime()]);

        const previewRange: [Date | null, Date | null] = useMemo(() => {
            const [start, end] = draft;
            if (start && !end && hoverDate) {
                return [start, hoverDate];
            }
            return draft;
        }, [draft[0]?.getTime(), draft[1]?.getTime(), hoverDate?.getTime()]);

        const areCalendarsAdjacent: () => boolean = useCallback((): boolean => {
            const monthDiff: number = (rightBaseMonth.getFullYear() - leftBaseMonth.getFullYear()) * 12 +
                (rightBaseMonth.getMonth() - leftBaseMonth.getMonth());
            return monthDiff === 1;
        }, [leftBaseMonth, rightBaseMonth]);

        const handleLeftBoundaryNavigation: (direction: 'left' | 'right' | 'up' | 'down', date: Date) => boolean = useCallback(
            (direction: 'left' | 'right' | 'up' | 'down'): boolean => {
                if ((direction === 'right' || direction === 'down') && areCalendarsAdjacent()) {
                    const firstDateOfMonth: Date = new Date(rightBaseMonth.getFullYear(), rightBaseMonth.getMonth(), 1);
                    rightCalRef.current?.focusGrid?.(firstDateOfMonth);
                    return true;
                }
                return false;
            },
            [rightBaseMonth, areCalendarsAdjacent]
        );

        const handleRightBoundaryNavigation: (direction: 'left' | 'right' | 'up' | 'down', date: Date) => boolean = useCallback(
            (direction: 'left' | 'right' | 'up' | 'down'): boolean => {
                if ((direction === 'left' || direction === 'up') && areCalendarsAdjacent()) {
                    const lastDateOfMonth: Date = new Date(leftBaseMonth.getFullYear(), leftBaseMonth.getMonth() + 1, 0);
                    leftCalRef.current?.focusGrid?.(lastDateOfMonth);
                    return true;
                }
                return false;
            },
            [leftBaseMonth, areCalendarsAdjacent]
        );

        const leftCalProps: CalendarProps = useMemo(() => {
            const p: CalendarProps = {
                minDate: inlineMinForEnd,
                maxDate: inlineMaxForEnd,
                start, depth, firstDayOfWeek, weekNumber, weekRule,
                showDaysOutsideCurrentMonth,
                disablePastDays, disableFutureDays, showTodayButton: false,
                weekDaysFormat, cellTemplate,
                headerTemplate,
                range: previewRange,
                onChange: handleCalendarChange,
                onCellHover: handleCellHover,
                onViewChange: handleLeftViewChange,
                multiSelect: false,
                value: leftNormalizedDates,
                disableOtherMonthNavigation: true,
                onOutOfRangeNavigation: handleLeftBoundaryNavigation
            };
            return p;
        }, [
            previewRange[0]?.getTime(), previewRange[1]?.getTime(),
            leftNormalizedDates.length,
            minDate, maxDate, start, depth, firstDayOfWeek, weekNumber, weekRule,
            weekDaysFormat, cellTemplate, headerTemplate,
            handleCalendarChange, handleLeftViewChange, showDaysOutsideCurrentMonth, handleCellHover,
            disablePastDays, disableFutureDays, leftBaseMonth, inlineMinForEnd.getTime?.(), inlineMaxForEnd.getTime?.()
        ]);

        const rightCalProps: CalendarProps = useMemo(() => {
            const p: CalendarProps = {
                minDate: inlineMinForEnd,
                maxDate: inlineMaxForEnd,
                start, depth, firstDayOfWeek, weekNumber, weekRule,
                showDaysOutsideCurrentMonth, showTodayButton: false,
                disablePastDays, disableFutureDays, weekDaysFormat,
                cellTemplate,
                range: previewRange,
                onCellHover: handleCellHover,
                headerTemplate,
                onChange: handleCalendarChange,
                onViewChange: handleRightViewChange,
                multiSelect: false,
                value: rightNormalizedDates,
                disableOtherMonthNavigation: true,
                onOutOfRangeNavigation: handleRightBoundaryNavigation
            };
            return p;
        }, [
            previewRange[0]?.getTime(), previewRange[1]?.getTime(),
            rightNormalizedDates.length,
            minDate, maxDate, start, depth, firstDayOfWeek, weekNumber, weekRule,
            weekDaysFormat, cellTemplate, headerTemplate, handleRightBoundaryNavigation,
            handleCalendarChange, handleRightViewChange, showDaysOutsideCurrentMonth, handleCellHover,
            disablePastDays, disableFutureDays, rightBaseMonth, inlineMinForEnd.getTime?.(), inlineMaxForEnd.getTime?.()
        ]);

        const openFullPanel: () => void = useCallback((): void => {
            setIsPresetMenu(false);
            leftCalRef.current?.focusGrid?.();
        }, []);

        const handlePresetSelect: (p: DateRangePreset) => void = useCallback((p: DateRangePreset) => {
            const next: [Date | null, Date | null] = sortRange(p.start, p.end);
            if (strictMode) {
                const coerced: [Date | null, Date | null] = coerceRangeStrict(
                    next, minDate, maxDate, minRangeDays ?? undefined, maxRangeDays ?? undefined);
                commit(coerced);
                pickerInput.setInputValue(formatRangeText(coerced, fmtDate, separator));
                pickerInput.setIsInputValid(true);
                hidePopup();
                return;
            }
            if (canApplyRange(next)) {
                commit(next);
                pickerInput.setInputValue(formatRangeText(next, fmtDate, separator));
                pickerInput.setIsInputValid(true);
                hidePopup();
            } else {
                setDraft(next);
                openFullPanel();
            }
        }, [strictMode, minDate, maxDate,  commit, canApplyRange,
            fmtDate, separator, hidePopup, openFullPanel]);

        const presetClickHandler: (preset: DateRangePreset) => () => void = useCallback(
            (preset: DateRangePreset) => () => handlePresetSelect(preset),
            [handlePresetSelect]
        );

        const handlePresetKeyDown: (e: React.KeyboardEvent<HTMLElement>)
        => void = useCallback((e: React.KeyboardEvent<HTMLElement>): void => {
            const presetCount: number = (presets?.length || 0) + 1;
            switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setPresetFocusedIndex((prev: number) => (prev + 1) % presetCount);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setPresetFocusedIndex((prev: number) => (prev - 1 + presetCount) % presetCount);
                break;
            case 'Home':
                e.preventDefault();
                setPresetFocusedIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setPresetFocusedIndex(presetCount - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (presetFocusedIndex < presets.length) {
                    handlePresetSelect(presets[presetFocusedIndex as number]);
                } else {
                    openFullPanel();
                }
                break;
            case 'Escape':
                e.preventDefault();
                hidePopup();
                inputRef.current?.focus();
                break;
            default:
                break;
            }
        }, [presets, presetFocusedIndex, handlePresetSelect, openFullPanel, hidePopup]);

        const renderPresets: (presetList: DateRangePreset[]) => React.ReactNode = useCallback(
            (presetList: DateRangePreset[]): React.ReactNode => {
                if (!presetList || !presetList.length) {
                    return null;
                }
                return (
                    <ul
                        ref={presetListRef}
                        className="sf-list-parent sf-ul sf-font-size-sm"
                        role="listbox"
                        aria-activedescendant={`${id}_preset_option_${presetFocusedIndex}`}
                        tabIndex={-1}
                        onKeyDown={handlePresetKeyDown}
                    >
                        {presetList.map((p: DateRangePreset, idx: number) => (
                            <li
                                key={`${p.label}-${idx}`}
                                role="option"
                                tabIndex={0}
                                className={`sf-list-item ${presetFocusedIndex === idx ? 'sf-item-focus' : ''}`}
                                onClick={presetClickHandler(p)}
                                onKeyDown={handlePresetKeyDown}
                                onFocus={() => setPresetFocusedIndex(idx)}
                                aria-selected={presetFocusedIndex === idx}
                            >
                                <span className="sf-text-content">{p.label}</span>
                            </li>
                        ))}
                        <li
                            key="custom-range"
                            role="option"
                            tabIndex={0}
                            className={`sf-list-item ${presetFocusedIndex === presetList.length ? 'sf-item-focus' : ''}`}
                            onClick={openFullPanel}
                            onKeyDown={handlePresetKeyDown}
                            onFocus={() => setPresetFocusedIndex(presetList.length)}
                            aria-selected={presetFocusedIndex === presetList.length}
                        >
                            <span className="sf-text-content">{l10n.getConstant('customRange')}</span>
                        </li>
                    </ul>
                );
            },
            [presets, presetFocusedIndex, handlePresetKeyDown, presetClickHandler, openFullPanel, l10n, id]
        );

        useEffect(() => {
            if (isOpen && isPresetMenu) {
                setPresetFocusedIndex(0);
                setTimeout(() => {
                    presetListRef.current?.focus();
                }, 50);
            }
        }, [isOpen, isPresetMenu]);

        const startText: string = useMemo<string>(() => {
            const s: Date | null = draft[0];
            return s && isValidDateObj(s) ? fmtDate(s) : l10n.getConstant('startDate');
        }, [draft[0], fmtDate]);

        const endText: string = useMemo<string>(() => {
            const e: Date | null = draft[1];
            return e && isValidDateObj(e) ? fmtDate(e) : l10n.getConstant('endDate');
        }, [draft[1], fmtDate]);

        const daySpanText: string = useMemo<string>(() => {
            const [start, end] = draft;
            if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime())) {
                return l10n.getConstant('selectedDays');
            }
            const days: number = getDaySpan(start, end);
            return `${days} Days`;
        }, [draft[0], draft[1]]);

        const formatValueForHook: () => string = useCallback(
            () => formatRangeText(currentValue, fmtDate, separator),
            [cvStartTs, cvEndTs, fmtDate, separator]
        );

        const parseForHook: (raw: string) => Date | null = useCallback((raw: string) => {
            const [s, e] = parseRangeInput(raw, separator, parseInput);
            return (s && e && isValidRange(s, e, minDate, maxDate, minRangeDays ?? undefined, maxRangeDays ?? undefined)) ? s : null;
        }, [separator, parseInput, minDate, maxDate, minRangeDays, maxRangeDays]);

        const isValidForHook: (_d: Date | null) => boolean = useCallback((_d: Date | null) => true, []);

        const commitValueForHook: (d: Date | null) => void = useCallback((d: Date | null) => {
            if (d === null) {
                commit([null, null]);
            }
        }, [commit]);

        const pickerInput: UsePickerInputResult = usePickerInput({
            locale,
            inputRef,
            placeholder,
            placeholderKey: 'daterangepicker',
            labelMode,
            disabled,
            readOnly,
            editable,
            openOnFocus,
            strictMode,
            required,
            valid,
            validationMessage,
            value: currentValue[0] && currentValue[1] ? currentValue[0] : null,
            formatValue: formatValueForHook,
            parseInput: parseForHook,
            isValid: isValidForHook,
            commitValue: commitValueForHook,
            onOpen: showPopup
        });

        useEffect(() => {
            const [s, e] = currentValue;
            const isEmpty: boolean = !s && !e;
            const ok: boolean = isEmpty ? !required : canApplyRange(currentValue);
            pickerInput.setIsInputValid(ok);
        }, [
            currentValue[0]?.getTime?.(),
            currentValue[1]?.getTime?.(),
            minDate.getTime?.(),
            maxDate.getTime?.(),
            minRangeDays,
            maxRangeDays,
            strictMode,
            required,
            validationMessage
        ]);

        const publicAPI: Partial<IDateRangePicker> = {
            placeholder, editable, inputFormats, openOnFocus, format, labelMode, size, disabled, open,
            clearButton, zIndex, strictMode, pickerVariant, value: currentValue, minDate, maxDate,
            firstDayOfWeek, start, depth, weekNumber, weekRule, pickerIcon, weekDaysFormat,
            required, valid, validationMessage, validityStyles, cellTemplate, headerTemplate,
            showDaysOutsideCurrentMonth, disablePastDays, disableFutureDays, presets, separator, minRangeDays, maxRangeDays
        };

        useImperativeHandle(ref, (): IDateRangePicker => ({
            ...(publicAPI as IDateRangePicker),
            element: containerRef.current
        }), [publicAPI]);

        useEffect(() => {
            if (!isOpen) {
                setIsPresetMenu(presets.length > 0);
                return;
            }
            let draft: [Date | null, Date | null] = currentValue;
            const inputValue: string = pickerInput.inputValue?.trim();
            if (inputValue) {
                const parsed: [Date | null, Date | null] = parseRangeInput(inputValue, separator, parseInput);
                if (canApplyRange(parsed)) {
                    draft = parsed;
                }
            }
            const today: Date = startOfMonth(new Date());
            let leftMonth: Date = today;
            let rightMonth: Date = calendarSystem.addMonths(today, 1);
            if (draft[0] && isValidDateObj(draft[0])) {
                leftMonth = startOfMonth(draft[0] as Date);
                leftCalRef.current?.navigateTo?.(CalendarView.Month, leftMonth);
                setLeftBaseMonth(clampMonthToRange(leftMonth));
            }
            if (draft[1] && isValidDateObj(draft[1])) {
                rightMonth = startOfMonth(draft[1] as Date);
            } else if (draft[0] && isValidDateObj(draft[0])) {
                rightMonth = calendarSystem.addMonths(leftMonth, 1);
            }
            if (draft[0] && draft[1] && isValidDateObj(draft[0]) && isValidDateObj(draft[1])) {
                const leftMonthTime: number = startOfMonth(draft[0] as Date).getTime();
                const rightMonthTime: number = startOfMonth(draft[1] as Date).getTime();
                if (leftMonthTime === rightMonthTime) {
                    rightMonth = calendarSystem.addMonths(leftMonth, 1);
                }
            }
            rightCalRef.current?.navigateTo?.(CalendarView.Month, rightMonth);
            setRightBaseMonth(clampMonthToRange(rightMonth));
            if (canApplyRange(draft)) {
                setDraft(draft);
            } else {
                setDraft([null, null]);
            }
        }, [isOpen, currentValue[0]?.getTime(), currentValue[1]?.getTime(), startOfMonth,
            calendarSystem, clampMonthToRange, separator, parseInput, canApplyRange]);

        const openPopup: () => void = useCallback((): void => {
            leftCalRef.current?.focusGrid?.();
        }, [onOpen]);

        const classNames: string = [
            'sf-input-group sf-control', 'sf-medium', 'sf-daterangepicker',
            className,
            disabled ? 'sf-disabled' : '',
            readOnly ? 'sf-readonly' : '',
            isOpen ? 'sf-input-focus' : '',
            pickerInput.isFocused ? 'sf-input-focus' : '',
            labelMode !== 'Never' ? 'sf-float-input' : '',
            dir === 'rtl' ? 'sf-rtl' : '',
            validityStyles && (!pickerInput.isInputValid || valid === false) ? 'sf-error' : '',
            size === Size.Small ? 'sf-small' : size === Size.Large ? 'sf-large' : 'sf-medium',
            variant && (variant as string).toLowerCase?.() !== 'standard'
                ? ((variant as string).toLowerCase() === 'outlined' ? 'sf-outline' : `sf-${(variant as string).toLowerCase()}`)
                : ''
        ].filter(Boolean).join(' ');

        const handleClearMouseDown: (e: React.MouseEvent<HTMLSpanElement>)
        => void = useCallback((e: React.MouseEvent<HTMLSpanElement>): void => {
            e.preventDefault();
            pickerInput.handleClear();
            hidePopup();
        }, [pickerInput, hidePopup]);

        useEffect((): void => {
            const [s, e] = draft;
            if (s && !e) {
                setActivePart('end');
            }
            else if (!s && !e) {
                setActivePart('start');
            }
            else {
                setActivePart('none');
            }
        }, [draft]);

        const dialogMinDate: Date = useMemo(() => (useDialog && activePart === 'end' && earliestEnd)
            ? earliestEnd : minDate, [useDialog, activePart, earliestEnd, minDate]);
        const dialogMaxDate: Date = useMemo(() => (useDialog && activePart === 'end' && latestEnd)
            ? latestEnd : maxDate, [useDialog, activePart, latestEnd, maxDate]);

        const dialogCalProps: CalendarProps = useMemo(() => {
            const p: any = { ...leftCalProps };
            p.minDate = dialogMinDate;
            p.maxDate = dialogMaxDate;
            p.disablePastDays = false;
            p.disableFutureDays = false;
            p.showTodayButton = false;
            return p as CalendarProps;
        }, [leftCalProps, dialogMinDate, dialogMaxDate]);

        const handleStartPillClick: () => void = useCallback((): void => {
            setActivePart('start');
            const s: Date | null = draft[0];
            if (s && isValidDateObj(s)) {
                leftCalRef.current?.navigateTo?.(
                    CalendarView.Month,
                    new Date(s.getFullYear(), s.getMonth(), 1)
                );
            }
        }, [draft]);

        const handleCancelClick: () => void = useCallback((): void => {
            setDraft(currentValue);
            hidePopup();
        }, [currentValue[0]?.getTime?.(), currentValue[1]?.getTime?.(), hidePopup]);

        return (
            <span ref={containerRef} className={classNames} {...otherProps}>
                <InputBase
                    ref={inputRef}
                    id={id}
                    placeholder={labelMode === 'Never' ? pickerInput.getPlaceholder : ''}
                    disabled={disabled}
                    readOnly={readOnly || !editable}
                    value={pickerInput.inputValue}
                    onChange={editable && !readOnly && !disabled ? pickerInput.handleInputChange : undefined}
                    role="combobox"
                    aria-haspopup="dialog"
                    aria-autocomplete="none"
                    aria-expanded={!!isOpen}
                    aria-controls={isOpen ? `${id}_options` : undefined}
                    aria-disabled={disabled}
                    onFocus={pickerInput.handleInputFocus}
                    onBlur={pickerInput.handleInputBlur}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    required={required}
                />
                {labelMode !== 'Never' && renderFloatLabelElement(
                    labelMode as LabelMode,
                    false,
                    pickerInput.inputValue,
                    placeholder,
                    id
                )}
                {clearButton && !!pickerInput.inputValue && (pickerInput.isFocused || !!isOpen) && !readOnly && !disabled && (
                    <span
                        className="sf-clear-icon sf-input-icon"
                        aria-label="clear date range"
                        role="button"
                        onMouseDown={handleClearMouseDown}
                    >
                        <CloseIcon />
                    </span>
                )}
                <span
                    ref={iconRef}
                    className="sf-input-icon sf-icons"
                    aria-label="select date range"
                    role="button"
                    onClick={handleIconClick}
                    onMouseDown={(e: React.MouseEvent<HTMLSpanElement, MouseEvent>): void => {
                        e.preventDefault();
                    }}
                >
                    {pickerIcon === true ? <TimelineTodayIcon viewBox="0 0 24 26" /> : pickerIcon}
                </span>
                {isOpen && createPortal(
                    <>
                        {useDialog && (
                            <div id={`${id}_options`} className="sf-picker-popup" style={{ zIndex: zIndexPopup.toString() }}>
                                <div className={'sf-overlay'}></div>
                                <Popup
                                    ref={popupRef}
                                    className={'sf-daterangepicker sf-popup sf-content-center'}
                                    open={!!isOpen}
                                    zIndex={zIndexPopup}
                                    onOpen={openPopup}
                                    relateTo={document.body}
                                    style={{ top: '0px', left: '0px', position: 'relative' }}
                                    position={{ X: 'center', Y: 'center' }}
                                    onKeyDown={handleKeyDown}
                                    collision={{ X: CollisionType.Fit, Y: CollisionType.Fit }}
                                >
                                    {isPresetMenu ? (
                                        <div className="sf-daterangepicker-preset sf-overflow-auto sf-control">
                                            {renderPresets(presets ?? [])}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="sf-daterangepicker-tab">
                                                <Button
                                                    variant={(activePart === 'start' || (!draft[0] && !draft[1])) ? Variant.Filled : Variant.Standard}
                                                    onClick={handleStartPillClick}
                                                    className='sf-start-btn'
                                                    aria-selected={activePart === 'start'}
                                                >
                                                    {startText}
                                                </Button>
                                                <Button
                                                    variant={activePart === 'end' ? Variant.Filled : Variant.Standard}
                                                    aria-selected={activePart === 'end'}
                                                    className='sf-end-btn'
                                                >
                                                    {endText}
                                                </Button>
                                            </div>
                                            <div className="sf-daterange-selected-days sf-font-size-sm">{daySpanText}</div>
                                            <div className="sf-calendar-container sf-single">
                                                <div className="sf-single-container">
                                                    <Calendar
                                                        ref={leftCalRef}
                                                        {...dialogCalProps}
                                                        className="sf-calendar sf-single-calendar"
                                                    />
                                                </div>
                                            </div>
                                            <DateRangeFooter
                                                onCancel={handleCancelClick}
                                                onApply={applyDraft}
                                                className={'sf-dialog-footer'}
                                                canApply={canApplyRange(draft)}
                                            />
                                            {presets && presets.length > 0 && (
                                                <div className="sf-daterangepicker-preset sf-overflow-auto sf-control">
                                                    {renderPresets(presets ?? [])}
                                                </div>

                                            )}
                                        </>
                                    )}
                                </Popup>
                            </div>
                        )}
                        {useInline && typeof document != 'undefined' && (
                            <Popup
                                ref={popupRef}
                                id={`${id}_options`}
                                className={`sf-daterangepicker sf-popup ${presets && presets.length > 0 ? 'sf-preset' : ''}`}
                                open={!!isOpen}
                                zIndex={zIndexPopup}
                                onOpen={openPopup}
                                relateTo={containerRef.current as HTMLElement}
                                position={{ X: 'left', Y: 'bottom' }}
                                offsetY={4}
                                onKeyDown={handleKeyDown}
                                collision={{ X: CollisionType.Flip, Y: CollisionType.Flip }}
                            >
                                {isPresetMenu ? (
                                    <div className="sf-daterangepicker-preset">
                                        {renderPresets(presets ?? [])}
                                    </div>
                                ) : (
                                    <>
                                        <div className="sf-date-range-container">
                                            <div className="sf-daterangepicker-header">
                                                <div className="sf-daterange-label sf-font-size-base">
                                                    <a className="sf-start-label" aria-atomic="true" aria-live="assertive" aria-label="Start Date" role="button">
                                                        {startText}
                                                    </a>
                                                    <ArrowTailIcon></ArrowTailIcon>
                                                    <a className="sf-end-label" aria-atomic="true" aria-live="assertive" aria-label="End Date" role="button">
                                                        {endText}
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="sf-daterange-selected-days sf-font-size-sm">{daySpanText}</div>
                                            <div className="sf-calendar-container sf-display-flex">
                                                <div className="sf-left-container">
                                                    <Calendar ref={leftCalRef} {...leftCalProps} className="sf-left-calendar" />
                                                </div>
                                                <div className="sf-right-container">
                                                    <Calendar ref={rightCalRef} {...rightCalProps} className="sf-right-calendar" />
                                                </div>
                                            </div>
                                        </div>
                                        {presets && presets.length > 0 && (
                                            <div className="sf-daterangepicker-preset sf-overflow-auto">
                                                {renderPresets(presets)}
                                            </div>
                                        )}
                                        <DateRangeFooter
                                            onCancel={handleCancelClick}
                                            onApply={applyDraft}
                                            className={'sf-daterangepicker-footer'}
                                            canApply={canApplyRange(draft)}
                                        />
                                    </>
                                )}
                            </Popup>
                        )}
                    </>,
                    document.body
                )}
            </span>
        );
    });

DateRangePicker.displayName = 'DateRangePicker';
export default DateRangePicker;
