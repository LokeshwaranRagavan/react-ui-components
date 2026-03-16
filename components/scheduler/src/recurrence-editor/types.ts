import { RadioButtonChangeEvent } from '@syncfusion/react-buttons';
import { DatePickerChangeEvent } from '@syncfusion/react-calendars';
import { ChangeEvent } from '@syncfusion/react-dropdowns';
import { NumericChangeEvent } from '@syncfusion/react-inputs';

export type EndType = 'Count' | 'Until' | 'Never';

export type FreqType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type DayFormatType = 'narrow' | 'wide' | 'short';

export type DayWeekType = 'day' | 'week';

export type DropdownData = { text: string; value: number };

export interface RecurrenceItems {
    text: string;
    value: string;
}

/**
 * Props for RecurrenceEditor component
 */
export interface RecurrenceEditorProps {
    /** RRULE string value representing the recurrence rule */
    value?: string;
    /** Array of frequency options for repeat mode dropdown */
    frequencies?: FreqType[];
    /** End type options (Never, Count, Until) */
    endTypes?: EndType[];
    /** First day of week index (0=Sunday, 1=Monday, etc.) */
    firstDayOfWeek?: number;
    /** Start date for recurrence calculation */
    startDate?: Date;
    /** Callback fired when recurrence rule changes */
    onChange?: (e: RecurrenceChangeEvent) => void;
}

export interface RecurrenceChangeEvent {
    value: string;
}

export interface RecurrenceState {
    freq: FreqType;
    endType: EndType;
    interval: number;
    count: number;
    month: number;
    weekDay: string;
    monthDate: number;
    dayWeekMode: DayWeekType;
    weekNumber: number;
    weekDays: string[];
    until: Date | null;
    maxDate: number | null;
}

export interface RecurrenceHandlers {
    onFreqChange: (e?: ChangeEvent) => void;
    onEndTypeChange: (e?: ChangeEvent) => void;
    onIntervalChange: (e?: NumericChangeEvent) => void;
    onCountChange: (e?: NumericChangeEvent) => void;
    onMonthChange: (e?: ChangeEvent) => void;
    onWeekDayChange: (e?: ChangeEvent) => void;
    onMonthDateChange: (e?: NumericChangeEvent) => void;
    onDayWeekChange: (e?: RadioButtonChangeEvent) => void;
    onWeekNumber: (e?: ChangeEvent) => void;
    onUntilChange: (e?: DatePickerChangeEvent) => void;
    onToggleSelectedWeekDay: (code: string) => void;
}
