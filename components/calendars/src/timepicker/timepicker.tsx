import * as React from 'react';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useId, useMemo, JSX } from 'react';
import { InputBase, renderFloatLabelElement } from '@syncfusion/react-inputs';
import { preRender, useProviderContext, Browser, Variant, Size } from '@syncfusion/react-base';
import { CollisionType, type IPopup, Popup } from '@syncfusion/react-popups';
import { ClockIcon, CloseIcon } from '@syncfusion/react-icons';
import { createPortal } from 'react-dom';
import { clampTimeToRange } from './utils';
import { TimePickerProps } from './types';
import { PickerVariant } from '../datepicker/types';
import { Button } from '@syncfusion/react-buttons';
import TimeList from './timepicker-list';
import usePickerInput, { UsePickerInputResult } from '../hooks/usePickerInputs';
import usePickerPopup from '../hooks/usePickerPopup';
import useTimePanel from '../hooks/useTimePanel';

type ITimePickerProps = ITimePicker & Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'value' | 'onChange'>;

export interface ITimePicker extends TimePickerProps {
    /**
     * TimePicker element reference.
     *
     * @private
     * @default -
     */
    element?: HTMLSpanElement | null;
}

/**
 * The TimePicker component provides a time input with a list-based selector.
 */
export const TimePicker: React.ForwardRefExoticComponent<ITimePickerProps & React.RefAttributes<ITimePicker>> =
    forwardRef<ITimePicker, ITimePickerProps>((props: ITimePickerProps, ref: React.Ref<ITimePicker>) => {
        const {
            value,
            id= `timepicker_${useId()}`,
            defaultValue,
            format = 'h:mm a',
            minTime,
            maxTime,
            step = 30,
            placeholder = 'Choose a time',
            variant = Variant.Standard,
            size = Size.Medium,
            readOnly = false,
            disabled = false,
            itemTemplate,
            clearButton = true,
            className = '',
            zIndex = 1000,
            strictMode = false,
            open,
            pickerIcon = true,
            editable = true,
            fullScreenMode = false,
            pickerVariant = PickerVariant.Auto,
            openOnFocus = false,
            required = false,
            valid,
            validationMessage = '',
            validityStyles = true,
            labelMode = 'Never',
            onChange,
            onOpen,
            onClose,
            ...otherProps
        } = props;

        const [selectedTime, setSelectedTime] = useState<Date | null>(value ?? defaultValue ?? null);
        const [isIconActive, setIsIconActive] = useState<boolean>(false);

        const containerRef: React.RefObject<HTMLSpanElement | null> = useRef<HTMLSpanElement | null>(null);
        const inputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);
        const popupRef: React.RefObject<IPopup | null> = useRef<IPopup | null>(null);
        const mobRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null);

        const { dir, locale } = useProviderContext();
        const isControlled: boolean = value !== undefined;
        const currentValue: Date | null = isControlled ? (value || null) : selectedTime;

        const useDialog: boolean =
            pickerVariant === PickerVariant.Popup ||
            (pickerVariant === PickerVariant.Auto && Browser.isDevice);
        const useInline: boolean =
            pickerVariant === PickerVariant.Inline ||
            (pickerVariant === PickerVariant.Auto && !Browser.isDevice);

        const {
            displayedTimes,
            formatTime: formatTimeValue,
            parseTime,
            isValidTime,
            timeListRef,
            ensureSelectedVisible,
            forwardListKeyDown
        } = useTimePanel({
            step,
            minTime,
            maxTime,
            locale,
            timeFormat: format
        });

        const updateValue: (newValue: Date | null, event?: React.SyntheticEvent
        ) => void = useCallback((newValue: Date | null, event?: React.SyntheticEvent): void => {
            if (!isControlled) {
                setSelectedTime(newValue);
            }
            if (onChange) {
                onChange({ value: newValue, event });
            }
        }, [isControlled, onChange, required, valid]);

        const pickerInput: UsePickerInputResult = usePickerInput({
            locale,
            inputRef,
            placeholder,
            placeholderKey: 'timepicker',
            labelMode,
            disabled,
            readOnly,
            editable,
            openOnFocus,
            strictMode,
            required,
            valid,
            validationMessage,
            value: currentValue,
            formatValue: formatTimeValue,
            parseInput: (raw: string) => parseTime(raw, false),
            isValid: (d: Date | null) => isValidTime(d),
            commitValue: updateValue,
            onOpen: () => {
                showPopup();
            }
        });

        const { isOpen, showPopup, hidePopup, togglePopup, zIndexPopup } = usePickerPopup({
            open,
            defaultOpen: false,
            disabled,
            readOnly,
            onOpen,
            onClose,
            containerRef,
            contentRefs: [popupRef as unknown as React.RefObject<HTMLElement | null>],
            extraInsideRefs: [mobRef as unknown as React.RefObject<HTMLElement | null>],
            inputRef,
            baseZIndex: zIndex
        });

        const handleTimeSelection: (time: Date, event?: React.SyntheticEvent) => void =
            useCallback((time: Date, event?: React.SyntheticEvent): void => {
                if (!isControlled) {
                    pickerInput.setInputValue(formatTimeValue(time));
                }
                updateValue(time, event);
                hidePopup();
            }, [formatTimeValue, updateValue, hidePopup, isControlled, pickerInput]);

        const handleInvalidTime: () => void = useCallback((): void => {
            if (currentValue) {
                pickerInput.setInputValue(formatTimeValue(currentValue));
                pickerInput.setIsInputValid(true);
            } else {
                pickerInput.setInputValue('');
                pickerInput.setIsInputValid(!required);
            }
        }, [strictMode, currentValue, formatTimeValue, required, updateValue, pickerInput]);

        const handleOutOfRangeTime: (parsedTime: Date, e?: React.FocusEvent<HTMLInputElement>)
        => void = useCallback((parsedTime: Date, e?: React.FocusEvent<HTMLInputElement>): void => {
            const clamped: Date | null = clampTimeToRange(parsedTime, minTime ?? null, maxTime ?? null);
            if (clamped) {
                pickerInput.setInputValue(formatTimeValue(clamped));
                updateValue(clamped, e);
                pickerInput.setIsInputValid(true);
            } else {
                pickerInput.setInputValue('');
                updateValue(null, e);
                pickerInput.setIsInputValid(!required);
            }
        }, [strictMode, minTime, maxTime, required, formatTimeValue, updateValue, pickerInput]);

        const commitInput: (e?: React.SyntheticEvent) => void = useCallback((e?: React.SyntheticEvent): void => {
            const text: string = pickerInput.inputValue;
            if (text.trim() === '') {
                if (pickerInput.inputValue !== '') {
                    pickerInput.setInputValue('');
                }
                if (strictMode && required) {
                    if (currentValue) {
                        pickerInput.setInputValue(formatTimeValue(currentValue));
                        pickerInput.setIsInputValid(true);
                    } else {
                        pickerInput.setIsInputValid(!required);
                    }
                } else {
                    updateValue(null, e);
                    pickerInput.setIsInputValid(!required);
                }
                return;
            }

            if (strictMode) {
                const parsedTime: Date | null = parseTime(text, false);
                if (parsedTime === null) {
                    handleInvalidTime();
                    return;
                }
                const withinRange: boolean = isValidTime(parsedTime);
                if (withinRange) {
                    const formattedValue: string = formatTimeValue(parsedTime);
                    pickerInput.setInputValue(formattedValue);
                    updateValue(parsedTime, e);
                    pickerInput.setIsInputValid(true);
                } else {
                    handleOutOfRangeTime(parsedTime, e as React.FocusEvent<HTMLInputElement>);
                }
                return;
            }

            const parsedExact: Date | null = parseTime(text, true);
            if (parsedExact && isValidTime(parsedExact)) {
                updateValue(parsedExact, e);
                pickerInput.setIsInputValid(true);
            } else {
                pickerInput.setIsInputValid(false);
            }
        }, [
            pickerInput,
            strictMode,
            required,
            currentValue,
            parseTime,
            isValidTime,
            formatTimeValue,
            updateValue,
            handleInvalidTime,
            handleOutOfRangeTime
        ]);

        const handleKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
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
            case 'Enter':
                if (!isOpen) {
                    e.preventDefault();
                    commitInput(e);
                }
                break;
            default:
                break;
            }
            forwardListKeyDown(e, isOpen);
        }, [isOpen, showPopup, hidePopup, commitInput, forwardListKeyDown]);

        const isPartialTimeValid: (input: string) => boolean = useCallback((input: string): boolean => {
            if (!input.trim()) {
                return !required;
            }
            if (/^\d{1,2}$/.test(input)) {
                const hour: number = parseInt(input, 10);
                return hour >= 0 && hour <= 23;
            }
            if (/^\d{1,2}:$/.test(input)) {
                const hour: number = parseInt(input.split(':')[0], 10);
                return hour >= 0 && hour <= 23;
            }
            if (/^\d{1,2}:\d{1,2}$/.test(input)) {
                const [hourStr, minuteStr] = input.split(':');
                const hour: number = parseInt(hourStr, 10);
                const minute: number = parseInt(minuteStr, 10);
                return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
            }
            const parsedTime: Date | null = parseTime(input);
            return parsedTime !== null && isValidTime(parsedTime);
        }, [parseTime, isValidTime, required]);

        const handleInputChange: (event: React.ChangeEvent<HTMLInputElement>
        ) => void = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
            const newInputValue: string = event.target.value;
            pickerInput.setInputValue(newInputValue);
            if (valid === undefined) {
                pickerInput.setIsInputValid(isPartialTimeValid(newInputValue));
            }
        }, [valid, isPartialTimeValid]);

        useEffect(() => {
            preRender('timepicker');
        }, []);

        const publicAPI: Partial<ITimePicker> = {
            placeholder,
            format,
            labelMode,
            disabled,
            readOnly,
            editable,
            openOnFocus,
            open,
            clearButton,
            zIndex,
            strictMode,
            value: currentValue,
            minTime,
            maxTime,
            step,
            required,
            valid,
            validationMessage,
            validityStyles
        };

        useImperativeHandle(ref, () => ({
            ...publicAPI as ITimePicker,
            element: containerRef.current
        }), [publicAPI]);

        const handleIconClick: () => void = useCallback((): void => {
            togglePopup();
            setIsIconActive(true);
            inputRef.current?.focus();
        }, [togglePopup]);

        const handleClearMouseDown: (e: React.MouseEvent<HTMLSpanElement>)
        => void = useCallback((e: React.MouseEvent<HTMLSpanElement>): void => {
            e.preventDefault();
            pickerInput.handleClear();
            hidePopup();
        }, [pickerInput, hidePopup]);

        const classNames: string = [
            'sf-input-group sf-control', 'sf-timepicker',
            disabled ? 'sf-disabled' : '',
            readOnly ? 'sf-readonly' : '',
            isOpen || pickerInput.isFocused ? 'sf-input-focus' : '',
            labelMode !== 'Never' ? 'sf-float-input' : '',
            dir === 'rtl' ? 'sf-rtl' : '',
            size === Size.Small ? 'sf-small' : size === Size.Large ? 'sf-large' : 'sf-medium',
            !pickerInput.isInputValid && validityStyles ? 'sf-error' : '',
            variant && variant.toLowerCase() !== 'standard' ? (variant.toLowerCase() === 'outlined' ? 'sf-outline' : `sf-${variant.toLowerCase()}`)
                : '',
            className
        ].filter(Boolean).join(' ');

        const sizeSuffix: string = size.toLowerCase().substring(0, 2);
        const timeListNode: JSX.Element = useMemo(() => (
            <TimeList
                ref={timeListRef}
                times={displayedTimes}
                selected={currentValue}
                onSelect={(t: Date, e: React.SyntheticEvent | undefined) => {
                    handleTimeSelection(t as Date, e);
                }}
                formatter={formatTimeValue}
                itemTemplate={itemTemplate}
                idBase={`${id}`}
                className="sf-timepicker-list"
                sizeClass={`sf-timepicker-list-${sizeSuffix}`}
                isOpen={isOpen}
                dir={dir as 'ltr' | 'rtl'}
            />
        ), [
            displayedTimes,
            currentValue,
            formatTimeValue,
            itemTemplate,
            isOpen,
            dir,
            handleTimeSelection,
            sizeSuffix,
            id,
            timeListRef
        ]);

        return (
            <span
                ref={containerRef}
                className={classNames}
                {...otherProps}
            >
                <InputBase
                    ref={inputRef}
                    id={id}
                    className={'sf-timepicker'}
                    placeholder={labelMode === 'Never' ? pickerInput.getPlaceholder : ''}
                    disabled={disabled}
                    readOnly={readOnly || !editable}
                    onFocus={pickerInput.handleInputFocus}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        pickerInput.setIsFocused(false);
                        commitInput(e);
                        hidePopup();
                    }}
                    value={pickerInput.inputValue}
                    onChange={editable && !readOnly && !disabled ? handleInputChange : undefined}
                    role='combobox'
                    aria-haspopup='listbox'
                    autoComplete='off'
                    aria-expanded={isOpen}
                    aria-disabled={disabled}
                    aria-controls={isOpen ? `${id}_options` : undefined}
                    aria-label={pickerInput.getPlaceholder || 'Time picker input'}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    required={required}
                />

                {labelMode !== 'Never' && renderFloatLabelElement(
                    labelMode,
                    false,
                    pickerInput.inputValue,
                    placeholder,
                    id
                )}

                {clearButton && pickerInput.inputValue && (pickerInput.isFocused || isOpen) && (
                    <span
                        className='sf-clear-icon sf-input-icon'
                        aria-label='clear time value'
                        role='button'
                        onMouseDown={handleClearMouseDown}
                    >
                        <CloseIcon />
                    </span>
                )}

                <span
                    className={`sf-input-icon sf-time-icon sf-icons ${isIconActive ? 'sf-active' : ''}`}
                    aria-label='select time'
                    role='button'
                    onClick={handleIconClick}
                    onMouseDown={(e: React.MouseEvent<HTMLSpanElement, MouseEvent>): void => {
                        e.preventDefault();
                    }}
                >
                    {pickerIcon === true ? <ClockIcon /> : pickerIcon}
                </span>

                {isOpen &&
                    createPortal(
                        fullScreenMode && Browser.isDevice ? (
                            <div ref={mobRef} className='sf-timepicker-mob sf-control' style={{ zIndex }} role="dialog" aria-modal="true" aria-label="Time selection">
                                <div className='sf-timepicker-header'>
                                    <Button
                                        variant={Variant.Standard}
                                        onClick={hidePopup}
                                    >
                                        <CloseIcon />
                                    </Button>
                                    <span className="sf-timepicker-title">Select Time</span>
                                </div>
                                {timeListNode}
                            </div>
                        ) : (
                            <>
                                {useDialog && (
                                    <div className="sf-timepicker-popup-wrap sf-picker-popup" style={{ zIndex: zIndexPopup.toString() }}>
                                        <div className="sf-overlay"></div>
                                        <Popup
                                            ref={popupRef}
                                            className="sf-timepicker sf-popup sf-content-center"
                                            open={isOpen}
                                            zIndex={zIndexPopup}
                                            onOpen={() => {
                                                ensureSelectedVisible();
                                            }}
                                            relateTo={document.body}
                                            style={{ top: '0px', left: '0px', position: 'relative' }}
                                            position={{ X: 'center', Y: 'center' }}
                                            collision={{ X: CollisionType.Fit, Y: CollisionType.Fit }}
                                            aria-modal="true"
                                            role="dialog"
                                            aria-label="Time selection"
                                        >
                                            {timeListNode}
                                        </Popup>
                                    </div>
                                )}
                                {useInline && (
                                    <Popup
                                        ref={popupRef}
                                        className="sf-timepicker sf-popup"
                                        open={isOpen}
                                        zIndex={zIndexPopup}
                                        onOpen={() => {
                                            ensureSelectedVisible();
                                        }}
                                        relateTo={containerRef.current as HTMLElement}
                                        position={{ X: 'left', Y: 'bottom' }}
                                        collision={{ X: CollisionType.Flip, Y: CollisionType.Flip }}
                                        offsetY={4}
                                        aria-modal="true"
                                        role="dialog"
                                        aria-label="Time selection"
                                    >
                                        {timeListNode}
                                    </Popup>
                                )}
                            </>
                        ),
                        document.body
                    )}

            </span>
        );
    });

TimePicker.displayName = 'TimePicker';
export default TimePicker;
