import * as React from 'react';
import { useCallback, useEffect, useId, useImperativeHandle, useMemo } from 'react';
import { IDropdown, Dropdown } from '../common/drop-down';
import { preRender } from '@syncfusion/react-base';
import { MultiSelectProps, IMultiSelect, DisplayMode } from './types';
import { ChangeEvent, T } from '../drop-down-list/types';

type IMultiSelectProps = MultiSelectProps & Omit<React.InputHTMLAttributes<HTMLSpanElement>, keyof MultiSelectProps>;

/**
 * MultiSelect lets users select multiple options from a list. Supports controlled and uncontrolled usage,
 * local or remote data sources, filtering, custom values, and tag/delimiter display modes.
 *
 * ```typescript
 * import { MultiSelect } from "@syncfusion/react-dropdowns";
 *
 * export default function App() {
 *   const data = [
 *     { text: "Apple", value: "apple" },
 *     { text: "Banana", value: "banana" },
 *     { text: "Cherry", value: "cherry" }
 *   ];
 *
 *   return (
 *     <MultiSelect
 *       id="fruits"
 *       dataSource={data}
 *       fields={{ text: "text", value: "value" }}
 *       placeholder="Select fruits" />
 *   );
 * }
 * ```
 */
export const MultiSelect: React.ForwardRefExoticComponent<IMultiSelectProps & React.RefAttributes<IMultiSelect>> =
    React.forwardRef<IMultiSelect, IMultiSelectProps>((props: IMultiSelectProps, ref: React.Ref<IMultiSelect>) => {
        const {
            id = `multiselect_${useId()}`,
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
            loading = false,
            popupSettings = {},
            open,
            defaultOpen,
            query,
            sortOrder,
            allowObjectBinding = false,
            itemTemplate,
            headerTemplate,
            footerTemplate,
            groupTemplate,
            noRecordsTemplate,
            onErrorTemplate,
            virtualization,
            ignoreCase = true,
            ignoreAccent = false,
            filterType = 'StartsWith',
            debounceDelay = 0,
            valid,
            validationMessage = '',
            validityStyles = true,
            skipDisabledItems,
            checkbox = false,
            closeOnSelect = false,
            openOnClick = true,
            maximumSelectionLength = 0,
            customValue,
            filterable,
            dropdownIcon = false,
            mode = DisplayMode.Auto,
            delimiterChar = ',',
            resizable,
            chipTemplate,
            valueTemplate,
            hideSelectedItem = false,
            addTagOnBlur,
            showSelectAll,
            selectAllText = 'Select All',
            unSelectAllText = 'Unselect All',
            onSelectAll,
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
            onChipClick,
            onChipDelete,
            ...restProps
        } = props;

        const baseRef: React.RefObject<IDropdown | null> = React.useRef<IDropdown>(null);

        const publicAPI: Partial<IMultiSelect> = useMemo(() => ({
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
            loading,
            popupSettings,
            open,
            defaultOpen,
            query,
            sortOrder,
            allowObjectBinding,
            itemTemplate,
            headerTemplate,
            footerTemplate,
            groupTemplate,
            noRecordsTemplate,
            onErrorTemplate,
            virtualization,
            ignoreCase,
            ignoreAccent,
            filterType,
            debounceDelay,
            valid,
            validationMessage,
            validityStyles,
            skipDisabledItems,
            delimiterChar,
            mode,
            checkbox,
            closeOnSelect,
            openOnClick,
            maximumSelectionLength,
            customValue,
            resizable,
            hideSelectedItem,
            addTagOnBlur,
            showSelectAll,
            selectAllText,
            unSelectAllText
        }), [dataSource, fields, value, defaultValue, placeholder, disabled, readOnly, labelMode, size, variant, className, required,
            inputProps, clearButton, loading, popupSettings, open, defaultOpen, query, sortOrder, allowObjectBinding,
            itemTemplate, headerTemplate, footerTemplate, groupTemplate, noRecordsTemplate, onErrorTemplate, virtualization, ignoreCase,
            ignoreAccent, filterType, debounceDelay, valid, validationMessage, validityStyles, skipDisabledItems, delimiterChar,
            mode, checkbox, closeOnSelect, openOnClick, maximumSelectionLength, customValue, resizable, hideSelectedItem, showSelectAll,
            selectAllText, unSelectAllText]);

        useImperativeHandle(ref, () => ({
            ...publicAPI,
            element: baseRef.current?.element
        }), [publicAPI, baseRef]);

        useEffect(() => {
            preRender('multiselect');
        }, []);

        const onChangeHandler: (args: ChangeEvent) => void = useCallback((args: ChangeEvent) => {
            onChange?.({
                event: args.event, itemData: args.itemData as T,
                previousItemData: args.previousItemData as T, value: args.value as T[]
            });
        }, [onChange]);

        return (
            <Dropdown
                {...restProps}
                ref={baseRef}
                id={id}
                spanClickable={false}
                componentClassName='sf-multiselect'
                inputClassName='sf-multiselect-input'
                localeComponentName='multiSelect'
                ariaLabel='multiselect'
                multiSelectable
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
                dropdownIcon={dropdownIcon === true ? undefined : dropdownIcon}
                popupSettings={popupSettings}
                open={open}
                defaultOpen={defaultOpen}
                query={query}
                sortOrder={sortOrder}
                allowObjectBinding={allowObjectBinding}
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
                inputProps={inputProps}
                loading={loading}
                required={required}
                mode={mode}
                delimiterChar={delimiterChar}
                checkbox={checkbox}
                closeOnSelect={closeOnSelect}
                openOnClick={openOnClick}
                maximumSelectionLength={maximumSelectionLength}
                customValue={customValue}
                resizable={resizable}
                chipTemplate={chipTemplate}
                hideSelectedItem={hideSelectedItem}
                multiSelectValueTemplate={valueTemplate}
                addTagOnBlur={addTagOnBlur}
                showSelectAll={showSelectAll}
                selectAllText={selectAllText}
                unSelectAllText={unSelectAllText}
                onSelectAll={onSelectAll}
                onOpen={onOpen}
                onClose={onClose}
                onDataRequest={onDataRequest}
                onDataLoad={onDataLoad}
                onError={onError}
                onScroll={onScroll}
                onFilter={onFilter}
                onChange={onChangeHandler}
                onResize={onResize}
                onCustomValueSelect={onCustomValueSelect}
                onChipClick={onChipClick}
                onChipDelete={onChipDelete}
            />
        );
    });

export default React.memo(MultiSelect);
