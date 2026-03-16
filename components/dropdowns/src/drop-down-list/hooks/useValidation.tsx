import * as React from 'react';
import { useEffect, useMemo } from 'react';

export const useValidation: <T>(props: {
    dropdownValue: T | null; inputElementRef: React.RefObject<HTMLInputElement | null>;
    required?: boolean; valid?: boolean; validationMessage?: string; }) => { isInputValid: boolean; } =
    <T, >(props: { dropdownValue: T | null; inputElementRef: React.RefObject<HTMLInputElement | null>; required?: boolean;
        valid?: boolean; validationMessage?: string; }): { isInputValid: boolean } => {
        const { dropdownValue, inputElementRef, required, valid, validationMessage } = props;

        const isInputValid: boolean = useMemo<boolean>(() => {
            if (valid !== undefined) { return Boolean(valid); }
            return required ? dropdownValue != null : true;
        }, [valid, required, dropdownValue]);

        useEffect(() => {
            const message: string = isInputValid ? '' : (validationMessage || '');
            const el: HTMLInputElement | null | undefined = inputElementRef?.current ?? undefined;
            if (el && typeof el.setCustomValidity === 'function') {
                el.setCustomValidity(message);
            }
        }, [isInputValid, validationMessage, inputElementRef]);

        return { isInputValid };
    };
