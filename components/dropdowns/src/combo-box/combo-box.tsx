import * as React from 'react';
import { useEffect, useId, useImperativeHandle, useMemo } from 'react';
import { validationProps } from '@syncfusion/react-inputs';
import { DropDownProps, DropDownFilterIconProps, DropDownSelectionProps, InputProps } from '../common/types';
import { IDropdown, Dropdown } from '../common/drop-down';
import { preRender } from '@syncfusion/react-base';

/**
 * Props for the ComboBox component.
 *
 * @default -
 */
export interface ComboBoxProps extends DropDownProps, DropDownFilterIconProps, DropDownSelectionProps, validationProps, InputProps {
    /**
     *Specifies whether the input field automatically fills with the first matching
     * suggestion during typing. The auto-filled portion appears highlighted.
     *
     * @default false
     */
    autofill?: boolean;

    /**
     * Specifies whether to highlight the matched search text within each suggestion.
     *
     * @default false
     */
    autoHighlight?: boolean;

    /** Specifies whether users can commit custom text values (not in the suggestion list) by pressing Enter.
     * When enabled, free-form input is accepted as a valid selection.
     *
     *@default false
     */
    customValue?: boolean;

    /**
     * Specifies a custom template for rendering the value in the input element, allowing for customized appearance.
     *
     * @default -
     */
    valueTemplate?: (inputElement: React.ReactElement<HTMLInputElement>) => React.ReactNode;

    /** Specifies the callback invoked when a custom value (not in the suggestion list)
     * is committed via Enter key. Receives the custom string value as a parameter.
     *
     * @event onCustomValueSelect
     */
    onCustomValueSelect?: (value: string) => void;
}

/**
 * Imperative API for ComboBox.
 */
export interface IComboBox extends ComboBoxProps {
    /**
     * Reference to the input element.
     *
     * @private
     * @default null
     */
    element?: HTMLInputElement | null;
}

type IComboBoxProps = ComboBoxProps & Omit<React.InputHTMLAttributes<HTMLSpanElement>, keyof ComboBoxProps>;

/**
 * ComboBox lets users type to search or choose a single option from a list. It supports controlled and uncontrolled usage (value / defaultValue),
 * works with local or remote data sources, supports custom item.
 *
 * ```typescript
 * import { ComboBox } from "@syncfusion/react-dropdowns";
 *
 * export default function App() {
 *   const data = [
 *     { text: "Apple", value: "apple" },
 *     { text: "Banana", value: "banana" },
 *     { text: "Cherry", value: "cherry" }
 *   ];
 *
 *   return (
 *     <ComboBox
 *       id="fruits"
 *       dataSource={data}
 *       fields={{ text: "text", value: "value" }}
 *       placeholder="Select a fruit" />
 *   );
 * }
 * ```
 */
export const ComboBox: React.ForwardRefExoticComponent<IComboBoxProps & React.RefAttributes<IComboBox>> =
    React.forwardRef<IComboBox, IComboBoxProps>((props: IComboBoxProps, ref: React.Ref<IComboBox>) => {
        const {
            id = `combobox_${useId()}`,
            dataSource = [],
            fields,
            value,
            defaultValue,
            placeholder = '',
            disabled = false,
            readOnly = false,
            labelMode,
            size,
            variant,
            className,
            required,
            inputProps = {},
            clearButton = false,
            dropdownIcon,
            loading = false,
            popupSettings = {},
            open,
            defaultOpen,
            query,
            sortOrder,
            allowObjectBinding = false,
            customValue = false,
            itemTemplate,
            headerTemplate,
            footerTemplate,
            groupTemplate,
            noRecordsTemplate,
            onErrorTemplate,
            valueTemplate,
            virtualization,
            ignoreCase = true,
            ignoreAccent = false,
            filterable = false,
            filterType = 'StartsWith',
            debounceDelay = 0,
            valid,
            validationMessage = '',
            validityStyles = true,
            skipDisabledItems,
            autofill = false,
            autoHighlight,
            resizable,
            onResize,
            onOpen,
            onClose,
            onDataRequest,
            onDataLoad,
            onError,
            onScroll,
            onChange,
            onFilter,
            onCustomValueSelect,
            ...restProps
        } = props;

        const baseRef: React.RefObject<IDropdown | null> = React.useRef<IDropdown>(null);

        const publicAPI: Partial<IComboBox> = useMemo(() => ({
            dataSource,
            fields,
            value,
            defaultValue,
            placeholder,
            disabled,
            readOnly,
            labelMode,
            size,
            variant,
            className,
            required,
            inputProps,
            clearButton,
            dropdownIcon,
            loading,
            popupSettings,
            open,
            defaultOpen,
            query,
            sortOrder,
            allowObjectBinding,
            customValue,
            itemTemplate,
            headerTemplate,
            footerTemplate,
            groupTemplate,
            noRecordsTemplate,
            onErrorTemplate,
            valueTemplate,
            virtualization,
            ignoreCase,
            ignoreAccent,
            filterable,
            filterType,
            debounceDelay,
            valid,
            validationMessage,
            validityStyles,
            skipDisabledItems,
            autofill,
            autoHighlight,
            resizable
        }), [dataSource, fields, value, defaultValue, placeholder, disabled, readOnly, labelMode, size, variant, className, required,
            inputProps, clearButton, dropdownIcon, loading, popupSettings, open, defaultOpen, query, sortOrder, allowObjectBinding,
            customValue, itemTemplate, headerTemplate, footerTemplate, groupTemplate, noRecordsTemplate, onErrorTemplate,
            virtualization, ignoreCase, ignoreAccent, filterable, filterType, debounceDelay, valid, validationMessage, validityStyles,
            skipDisabledItems, autofill, autoHighlight, resizable, valueTemplate]);

        useImperativeHandle(ref, () => ({
            ...publicAPI,
            element: baseRef.current?.element
        }), [publicAPI, baseRef]);

        useEffect(() => {
            preRender('combobox');
        }, []);

        return (
            <Dropdown
                {...restProps}
                ref={baseRef}
                id={id}
                spanClickable={false}
                componentClassName='sf-combobox'
                inputClassName='sf-combobox-input'
                localeComponentName='comboBox'
                ariaLabel='combobox'
                forceFilterOnOpen={filterable}
                dataSource={dataSource}
                clearButton={clearButton}
                fields={fields}
                value={value}
                defaultValue={defaultValue}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                labelMode={labelMode}
                size={size}
                variant={variant}
                className={className}
                dropdownIcon={dropdownIcon}
                popupSettings={popupSettings}
                open={open}
                defaultOpen={defaultOpen}
                query={query}
                sortOrder={sortOrder}
                allowObjectBinding={allowObjectBinding}
                customValue={customValue}
                itemTemplate={itemTemplate}
                headerTemplate={headerTemplate}
                footerTemplate={footerTemplate}
                groupTemplate={groupTemplate}
                noRecordsTemplate={noRecordsTemplate}
                onErrorTemplate={onErrorTemplate}
                virtualization={virtualization}
                ignoreCase={ignoreCase}
                ignoreAccent={ignoreAccent}
                filterable={filterable}
                filterType={filterType}
                debounceDelay={debounceDelay}
                valid={valid}
                validationMessage={validationMessage}
                validityStyles={validityStyles}
                skipDisabledItems={skipDisabledItems}
                autofill={autofill}
                autoHighlight={autoHighlight}
                resizable={resizable}
                inputProps={inputProps}
                loading={loading}
                required={required}
                inputValueRenderer={valueTemplate}
                onResize={onResize}
                onOpen={onOpen}
                onClose={onClose}
                onDataRequest={onDataRequest}
                onDataLoad={onDataLoad}
                onError={onError}
                onScroll={onScroll}
                onChange={onChange}
                onFilter={onFilter}
                onCustomValueSelect={onCustomValueSelect}
            />
        );
    });

export default React.memo(ComboBox);
