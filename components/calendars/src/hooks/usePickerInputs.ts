import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlaceholderL10n } from '../datepicker/utils';

export interface UsePickerInputOptions {
    locale?: string | null;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    placeholder?: string;
    placeholderKey?: 'datepicker' | 'datetimepicker' | 'timepicker' | 'daterangepicker';
    labelMode?: 'Never' | 'Always' | 'Auto';
    disabled?: boolean;
    readOnly?: boolean;
    editable?: boolean;
    openOnFocus?: boolean;
    strictMode?: boolean;
    required?: boolean;
    valid?: boolean;
    validationMessage?: string;
    value: Date | null | undefined;
    formatValue: (d: Date) => string;
    parseInput: (raw: string) => Date | null;
    isValid: (d: Date | null) => boolean;
    commitValue: (d: Date | null, event?: React.SyntheticEvent) => void;
    onOpen?: () => void;
}

export interface UsePickerInputResult {
    inputValue: string;
    isInputValid: boolean;
    isFocused: boolean;
    getPlaceholder: string;
    handleInputFocus: () => void;
    handleInputBlur: () => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleClear: () => void;
    handleClearMouseDown: (e: React.MouseEvent<HTMLSpanElement>) => void;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    setIsInputValid: React.Dispatch<React.SetStateAction<boolean>>;
    setIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function usePickerInput(options: UsePickerInputOptions): UsePickerInputResult {
    const {
        locale,
        inputRef,
        placeholder = '',
        placeholderKey = 'picker',
        disabled = false,
        readOnly = false,
        openOnFocus = false,
        strictMode = false,
        required = false,
        valid,
        validationMessage = '',
        value,
        formatValue,
        parseInput,
        isValid,
        commitValue,
        onOpen
    } = options;

    const [inputValue, setInputValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [isInputValid, setIsInputValid] = useState<boolean>(
        valid !== undefined ? valid : (required ? !!value : true)
    );

    useEffect(() => {
        if (value) {
            const formatted: string = formatValue(value);
            if (formatted !== inputValue) {
                setInputValue(formatted);
            }
        } else if (inputValue) {
            setInputValue('');
        }
    }, [value, formatValue]);

    useEffect(() => {
        const isValidNow: boolean = valid !== undefined ? valid : (required ? !!value : true);
        setIsInputValid(isValidNow);
        if (inputRef?.current) {
            inputRef.current.setCustomValidity(isValidNow ? '' : (validationMessage || ''));
        }
    }, [valid, validationMessage, required, value, inputRef]);

    const getPlaceholder: string = useMemo(() => {
        return getPlaceholderL10n(placeholderKey, placeholder, locale as string);
    }, [placeholderKey, locale, placeholder]);

    const handleInputFocus : () => void = useCallback((): void => {
        setIsFocused(true);
        if (openOnFocus && !disabled && !readOnly) {
            onOpen?.();
        }
    }, [openOnFocus, disabled, readOnly, onOpen]);

    const handleInputBlur: () => void = useCallback((): void => {
        setIsFocused(false);
        const raw: string = inputValue.trim();
        if (!raw) {
            if (inputValue !== '') {
                setInputValue('');
            }
            commitValue(null);
            setIsInputValid(valid !== undefined ? valid : !required);
            return;
        }

        const parsed: Date | null = parseInput(raw);
        const ok: boolean  = parsed !== null && isValid(parsed);

        if (ok) {
            commitValue(parsed);
        } else {
            if (strictMode) {
                setInputValue(value ? formatValue(value) : '');
                commitValue(value ?? null);
            } else {
                setIsInputValid(false);
            }
        }
    }, [inputValue, valid, required, strictMode, parseInput, isValid, commitValue, value, formatValue]);

    const handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>): void => {
            const next: string = event.target.value;
            setInputValue(next);
            if (valid === undefined) {
                if (!next.trim()) {
                    setIsInputValid(!required);
                } else if (!strictMode) {
                    const parsed: Date | null = parseInput(next);
                    setIsInputValid(parsed !== null && isValid(parsed));
                }
            }
        }, [valid, required, strictMode, parseInput, isValid]);

    const handleClear: () => void = useCallback((): void => {
        setInputValue('');
        commitValue(null);
        if (inputRef?.current) {
            inputRef.current.focus();
        }
    }, [commitValue, inputRef]);

    const handleClearMouseDown: (e: React.MouseEvent<HTMLSpanElement>)
    => void = useCallback((e: React.MouseEvent<HTMLSpanElement>): void => {
        e.preventDefault();
        handleClear();
    }, [handleClear]);

    return {
        inputValue,
        isInputValid,
        isFocused,
        getPlaceholder,
        handleInputFocus,
        handleInputBlur,
        handleInputChange,
        handleClear,
        handleClearMouseDown,
        setInputValue,
        setIsInputValid,
        setIsFocused
    };
}
