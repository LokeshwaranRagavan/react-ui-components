import { CalendarBaseProps, CalendarUiProps } from '../calendar';
import { LabelMode, Size, Variant } from '@syncfusion/react-base';
export { Variant };

/**
 * Specifies the variant behavior for picker components, determining how the popup is displayed across devices.
 */
export enum PickerVariant {
    /**
     * Specifies that the picker is always displayed as an anchored popup, suitable for both desktop and mobile.
     */
    Inline = 'Inline',

    /**
     * Specifies that the picker is always displayed as a centered dialog overlay, suitable for both desktop and mobile.
     */
    Popup = 'Popup',

    /**
     * Specifies that the picker automatically chooses the display mode based on device type:
     * desktop uses Inline, mobile uses Popup.
     */
    Auto = 'Auto'
}

export interface InputBaseProps {
    /**
     * Specifies the placeholder text to display in the input box when no value is set.
     *
     * @default -
     */
    placeholder?: string;

    /**
     * Specifies the float label behavior.
     * Possible values:
     * * `Never` - The label will never float.
     * * `Auto` - The label floats when the input has focus, value, or placeholder.
     * * `Always` - The label always floats.
     *
     * @default 'Never'
     */
    labelMode?: LabelMode;

    /**
     * Specifies the calendar/datepicker icon rendered in the input.
     *
     * @default undefined
     */
    pickerIcon?: React.ReactNode;

    /**
     * Specifies whether the component is disabled or not.
     *
     * @default false
     */
    disabled?: boolean;

    /**
     * Specifies whether the component is in read-only mode.
     * When enabled, users cannot change input value or open the picker.
     *
     * @default false
     */
    readOnly?: boolean;

    /**
     * Specifies whether the input field can be edited directly.
     * When false, only allows selection via calendar.
     *
     * @default true
     */
    editable?: boolean;

    /**
     * Specifies whether the DatePicker is a required field in a form.
     * When set to true, the component will be marked as required.
     *
     * @default false
     */
    required?: boolean;

    /**
     * Overrides the validity state of the component.
     * If valid is set, the required property will be ignored.
     *
     * @default false
     */
    valid?: boolean;

    /**
     * Controls the form error message of the component.
     *
     * @default -
     */
    validationMessage?: string;

    /**
     * If set to false, no visual representation of the invalid state of the component will be applied.
     *
     * @default true
     */
    validityStyles?: boolean;

    /**
     * Specifies the visual style variant of the component.
     *
     * @default Variant.Standard
     */
    variant?: Variant;

    /**
     * Specifies the size style of the Timepicker. Options include 'Small', 'Medium' and 'Large'.
     *
     * @default Size.Medium
     */
    size?: Size;

    /**
     * Specifies whether to show the clear button within the input field.
     *
     * @default true
     */
    clearButton?: boolean;

    /**
     * Enables strict date validation mode.
     * When enabled, invalid values are prevented or auto-corrected.
     *
     * @default false
     */
    strictMode?: boolean;

    /**
     * When true, should open the calendar popup on input focus.
     *
     * @default false
     */
    openOnFocus?: boolean;

    /**
     * Specifies whether the calendar popup is open or closed.
     *
     * @default false
     */
    open?: boolean;

    /**
     * Sets the z-index value for the dropdown popup, controlling its stacking order relative to other elements on the page.
     *
     * @default 1000
     */
    zIndex?: number;
}

export interface DatePickerProps extends CalendarBaseProps , InputBaseProps, CalendarUiProps {
    /**
     * Specifies the date format string for displaying and parsing date values.
     * Examples: 'MM/dd/yyyy', 'yyyy-MM-dd', etc.
     *
     * @default 'M/d/yyyy'
     */
    format?: string;

    /**
     * Specifies an array of acceptable date input formats for parsing user input.
     * Can be an array of strings or FormatObject.
     *
     * @default -
     */
    inputFormats?: string[];

    /**
     * Specifies the selected date of the DatePicker for controlled usage.
     *
     * @default -
     *
     */
    value?: Date | null;

    /**
     * Specifies the default selected date of the DatePicker for uncontrolled mode.
     *
     * @default -
     *
     */
    defaultValue?: Date;

    /**
     * Specifies the display variant of the calendar popup.
     * - Inline: anchored popup near the input (both desktop and mobile)
     * - Dialog: centered dialog overlay (both desktop and mobile)
     * - Auto: desktop = Inline, mobile = Dialog
     *
     * @default PickerVariant.Auto
     */
    pickerVariant?: PickerVariant;

    /**
     * Triggers when the DatePicker value is changed.
     *
     * @event onChange
     */
    onChange?: (event: DatePickerChangeEvent) => void;

    /**
     * Triggers when the calendar popup opens.
     *
     * @event onOpen
     */
    onOpen?: () => void;

    /**
     * Triggers when the calendar popup closes.
     *
     * @event onClose
     */
    onClose?: () => void;
}

/**
 * Defines the event arguments for the `onChange` event of the Datepicker.
 */
export interface DatePickerChangeEvent {
    /**
     * The selected date value. A single `Date` or `null`.
     */
    value: Date | null;

    /**
     * The original browser event that triggered the change.
     *
     */
    event?: React.SyntheticEvent;
}
