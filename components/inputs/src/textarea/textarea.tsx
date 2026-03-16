import * as React from 'react';
import { forwardRef, ReactNode, Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useId, useLayoutEffect } from 'react';
import { CLASS_NAMES, inputBaseProps, LabelMode, renderClearButton, renderFloatLabelElement } from '../common/inputbase';
import { preRender, useProviderContext, Variant, Size } from '@syncfusion/react-base';
export { LabelMode, Variant, Size };

export interface TextAreaChangeEvent {
    /**
     * Specifies the initial event object received from the textarea element.
     */
    event?: React.ChangeEvent<HTMLTextAreaElement>;

    /**
     * Specifies the current value of the TextArea.
     */
    value?: string;
}

/**
 * Constant for multi-line input class
 */
const MULTILINE: string = 'sf-multi-line-input';

/**
 * Constant for auto-width class
 */
const AUTOWIDTH: string = 'sf-auto-width';

/**
 * Specifies the available resize modes for components that support resizing.
 *
 * @enum {string}
 */
export enum ResizeMode {
    /**
     * Disables resizing functionality.
     */
    None = 'None',

    /**
     * Enables resizing in both horizontal and vertical directions.
     */
    Both = 'Both',

    /**
     * Enables resizing only in the horizontal direction.
     */
    Horizontal = 'Horizontal',

    /**
     * Enables resizing only in the vertical direction.
     */
    Vertical = 'Vertical'
}

const RESIZE_MAP: Record<ResizeMode, string> = {
    /**
     * Constant for no resize mode
     */
    [ResizeMode.None]: 'sf-resize-none',
    /**
     * Constant for both horizontal and vertical resize mode
     */
    [ResizeMode.Both]: 'sf-resize-xy',
    /**
     * Constant for horizontal resize mode
     */
    [ResizeMode.Horizontal]: 'sf-resize-x',
    /**
     * Constant for vertical resize mode
     */
    [ResizeMode.Vertical]: 'sf-resize-y'
};

export interface TextAreaProps extends inputBaseProps {
    /**
     * Specifies the value of the component. When provided, the component will be controlled.
     *
     * @default -
     */
    value?: string;

    /**
     * Specifies the default value of the component. Used for uncontrolled mode.
     *
     * @default -
     */
    defaultValue?: string;

    /**
     * Specifies the floating label type for the component.
     *
     * @default 'Never'
     */
    labelMode?: LabelMode;

    /**
     * Specifies the placeholder text for the component.
     *
     * @default -
     */
    placeholder?: string;

    /**
     * Specifies the resize mode for the textarea
     *
     * @default ResizeMode.Both
     */
    resizeMode?: ResizeMode;

    /**
     * Specifies the number of columns for the textarea
     *
     * @default -
     */
    cols?: number;

    /**
     * Specifies whether to show a clear button within the input field.
     * When enabled, a clear button (×) appears when the field has a value,
     * allowing users to quickly clear the input with a single click.
     *
     * @default false
     */
    clearButton?: ReactNode;

    /**
     * Specifies the number of rows for the textarea
     *
     * @default 2
     */
    rows?: number;

    /**
     * Specifies whether to automatically increase the textarea vertically as content increases.
     * When enabled, height expands vertically (downwards).
     *
     * @default false
     */
    autoResize?: boolean;

    /**
     * Specifies the Callback that fired when the input value is changed.
     *
     * @event onChange
     * @returns {void}
     */
    onChange?: (event: TextAreaChangeEvent) => void;
}

export interface ITextArea extends TextAreaProps {
    /**
     * Specifies the TextArea component element.
     *
     * @private
     * @default null
     */
    element?: HTMLTextAreaElement | null;
}

type ITextAreaProps = TextAreaProps & Omit<React.InputHTMLAttributes<HTMLTextAreaElement>, keyof TextAreaProps>;

/**
 * TextArea component that provides a multi-line text input field with enhanced functionality.
 * Supports both controlled and uncontrolled modes based on presence of value or defaultValue prop.
 *
 * ```typescript
 * import { TextArea } from '@syncfusion/react-inputs';
 *
 * <TextArea defaultValue="Initial text" placeholder="Enter text" rows={5} cols={40} />
 * ```
 */
export const TextArea: React.ForwardRefExoticComponent<ITextAreaProps & React.RefAttributes<ITextArea>> =
forwardRef<ITextArea, ITextAreaProps>((props: ITextAreaProps, ref: Ref<ITextArea>) => {
    const {
        readOnly = false,
        value,
        defaultValue,
        labelMode = 'Never',
        placeholder = '',
        disabled = false,
        width,
        resizeMode = ResizeMode.Both,
        maxLength,
        cols = null,
        rows = null,
        clearButton = false,
        autoResize = false,
        className = '',
        size = Size.Medium,
        variant,
        onChange,
        onBlur,
        onFocus,
        ...rest
    } = props;

    const isControlled: boolean = value !== undefined;

    const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(
        defaultValue || ''
    );

    const displayValue: string | undefined = isControlled ? value : uncontrolledValue;

    const textareaId: string = `textArea_${useId()}`;

    const [isFocused, setIsFocused] = useState(false);
    const id: string = useMemo(() => rest.id || textareaId, [rest.id]);
    const elementRef: React.RefObject<HTMLTextAreaElement | null> = useRef<HTMLTextAreaElement>(null);
    const autoResizeFrameIdRef: React.RefObject<number | null> = useRef<number | null>(null);
    const resizeObserverInstanceRef: React.RefObject<ResizeObserver | null> =
    useRef<ResizeObserver | null>(null);
    const lastObservedInlineSizeRef: React.RefObject<number | null> =
    useRef<number | null>(null);
    const { locale, dir } = useProviderContext();

    const publicAPI: Partial<ITextAreaProps> = {
        clearButton,
        labelMode,
        disabled,
        readOnly,
        resizeMode
    };

    useEffect(() => {
        preRender('textarea');
    }, []);

    useEffect(() => {
        if (isControlled) {
            setUncontrolledValue(value || '');
        }
    }, [isControlled, value]);

    const getContainerClassNames: () => string = () => {
        return classNames(
            CLASS_NAMES.INPUTGROUP,
            CLASS_NAMES.WRAPPER,
            labelMode !== 'Never' ? CLASS_NAMES.FLOATINPUT : '',
            MULTILINE,
            className,
            (dir === 'rtl') ? CLASS_NAMES.RTL : '',
            disabled ? CLASS_NAMES.DISABLE : '',
            isFocused ? CLASS_NAMES.TEXTBOX_FOCUS : '',
            ((displayValue) !== '') ? CLASS_NAMES.VALIDINPUT : '',
            variant && variant.toLowerCase() !== 'standard'  ? variant.toLowerCase() === 'outlined' ? 'sf-outline' : `sf-${variant.toLowerCase()}` : '',
            AUTOWIDTH,
            size && size.toLowerCase() !== 'small' ? `sf-${size.toLowerCase()}` : '',
            'sf-control'
        );
    };

    const classNames: (...classes: string[]) => string = (...classes: string[]) => {
        return classes.filter(Boolean).join(' ');
    };

    const containerClassNames: string = getContainerClassNames();

    useImperativeHandle(ref, () => ({
        ...publicAPI as ITextArea,
        element: elementRef.current
    }));

    const adjustHeight: (textAreaElement: HTMLTextAreaElement | null) => void
    = useCallback((textAreaElement: HTMLTextAreaElement | null) => {
        if (!textAreaElement) { return; }
        textAreaElement.style.height = 'auto';
        textAreaElement.style.height = `${textAreaElement.scrollHeight}px`;
    }, []);

    const requestAdjustHeight: () => void = useCallback(() => {
        if (!autoResize || !elementRef.current) { return; }
        if (autoResizeFrameIdRef.current !== null) {
            cancelAnimationFrame(autoResizeFrameIdRef.current);
            autoResizeFrameIdRef.current = null;
        }
        autoResizeFrameIdRef.current = requestAnimationFrame(() => {
            adjustHeight(elementRef.current);
        });
    }, [autoResize, adjustHeight]);

    const getObservedInlineSize: (entry: ResizeObserverEntry) => number | null = (
        entry: ResizeObserverEntry): number | null => {
        const firstBox: ResizeObserverSize | undefined = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize;

        if (firstBox && typeof firstBox.inlineSize === 'number') {
            return firstBox.inlineSize;
        }

        const width: number = entry.contentRect.width;
        return typeof width === 'number' ? width : null;
    };

    useEffect(() => {
        return () => {
            if (autoResizeFrameIdRef.current !== null) {
                cancelAnimationFrame(autoResizeFrameIdRef.current);
                autoResizeFrameIdRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!autoResize || !elementRef.current) {return; }
        let frameScheduled: boolean = false;
        const scheduleAdjustHeight: () => void = (): void => {
            if (frameScheduled) {return; }
            frameScheduled = true;
            requestAnimationFrame((): void => {
                frameScheduled = false;
                if (!elementRef.current) {return; }
                requestAdjustHeight();
            });
        };

        if ('ResizeObserver' in window) {
            const handleObservedSizeChange: ResizeObserverCallback = (
                entries: ResizeObserverEntry[]
            ): void => {
                const entry: ResizeObserverEntry | undefined = entries[0];
                if (!entry) {return; }
                const inlineSize: number | null = getObservedInlineSize(entry);
                if (inlineSize !== null && lastObservedInlineSizeRef.current === inlineSize) {
                    return;
                }
                lastObservedInlineSizeRef.current = inlineSize;
                scheduleAdjustHeight();
            };
            const observer: ResizeObserver = new ResizeObserver(handleObservedSizeChange);
            observer.observe(elementRef.current);
            resizeObserverInstanceRef.current = observer;
            return (): void => {
                observer.disconnect();
                resizeObserverInstanceRef.current = null;
                lastObservedInlineSizeRef.current = null;
            };
        }
        const view: Window | null = elementRef.current.ownerDocument ? elementRef.current.ownerDocument.defaultView : null;
        if (!view) { return; }
        const handleWindowResize: (event: UIEvent) => void = (): void => {
            scheduleAdjustHeight();
        };
        view.addEventListener('resize', handleWindowResize);
        return (): void => {
            view.removeEventListener('resize', handleWindowResize);
        };
    }, [autoResize, requestAdjustHeight]);

    useLayoutEffect(() => {
        if (!autoResize || !elementRef.current) { return; }
        requestAdjustHeight();
    }, [autoResize, displayValue, width, rows, cols]);

    const handleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void =
    useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue: string = event.target.value;
        if (!isControlled) {
            setUncontrolledValue(newValue);
        }
        if (onChange) {
            onChange({ event, value: newValue });
        }
        if (autoResize) {
            requestAdjustHeight();
        }
    }, [isControlled, onChange, uncontrolledValue, value, autoResize, requestAdjustHeight]);

    const handleFocus: (event: React.FocusEvent<HTMLTextAreaElement, Element>) => void =
    useCallback((event: React.FocusEvent<HTMLTextAreaElement, Element>) => {
        setIsFocused(true);
        if (onFocus) {
            onFocus(event);
        }
    }, [onFocus]);

    const handleBlur: (event: React.FocusEvent<HTMLTextAreaElement, Element>) => void =
    useCallback((event: React.FocusEvent<HTMLTextAreaElement, Element>) => {
        setIsFocused(false);
        if (onBlur) {
            onBlur(event);
        }
    }, [onBlur]);

    const clearValue: () => void = useCallback(() => {
        const newValue: string = '';
        if (!isControlled) {
            setUncontrolledValue(newValue);
            if (elementRef.current) {
                elementRef.current.value = newValue;
            }
        }

        if (onChange) {
            onChange({ value: newValue, event: undefined });
        }
        if (autoResize) {
            requestAdjustHeight();
        }
    }, [onChange, isControlled, requestAdjustHeight]);

    const getCurrentResizeClass: (resizeMode: ResizeMode) => string = (resizeMode: ResizeMode) => {
        return RESIZE_MAP[`${resizeMode}`];
    };

    return (
        <div className={containerClassNames} >
            <textarea
                ref={elementRef}
                id={id}
                value={isControlled ? (value) : undefined}
                defaultValue={!isControlled ? (defaultValue) : undefined}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                readOnly={readOnly}
                placeholder={labelMode === 'Never' ? placeholder : undefined}
                disabled={disabled}
                maxLength={maxLength}
                cols={cols ?? undefined}
                rows={rows ?? undefined}
                {...rest}
                style={{
                    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
                    resize: resizeMode === 'None' || autoResize ? 'none' : undefined,
                    overflowY: autoResize ? 'hidden' : undefined
                }}
                className={`sf-textarea sf-lib sf-input ${getCurrentResizeClass(resizeMode)}`}
                aria-labelledby={`label_${id}`}
            />
            {renderFloatLabelElement(
                labelMode,
                isFocused || (displayValue) !== '',
                (displayValue as string),
                placeholder,
                id
            )}
            {clearButton && renderClearButton(
                (displayValue && isFocused) ? (displayValue).toString() : '',
                clearValue, clearButton, 'textarea', locale
            )}
        </div>
    );
});

export default TextArea;
