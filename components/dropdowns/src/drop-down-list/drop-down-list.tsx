import { useEffect, forwardRef, useMemo, useImperativeHandle, useId } from 'react';
import * as React from 'react';
import { AnimationOptions, preRender } from '@syncfusion/react-base';
import { DropDownListProps } from './types';
import { IDropdown, Dropdown } from '../common/drop-down';

export { AnimationOptions };

type IDropDownListProps = DropDownListProps & Omit<React.InputHTMLAttributes<HTMLDivElement>, keyof DropDownListProps>;

/**
 * Specifies the methods and extended properties for DropdownList component.
 */
export interface IDropDownList extends DropDownListProps {

    /**
     * Specifies the DOM element of the component.
     *
     * @private
     */
    element?: HTMLElement | null;
}

/**
 * DropDownList lets users choose a single option from a list. It works with local or remote data sources, supports custom item, group, header, footer, and value templates,
 * offers built-in filtering with debounce and case/accent handling, enables grouping and sorting, and keyboard navigation.
 *
 * ```typescript
 * import { DropDownList } from "@syncfusion/react-dropdowns";
 *
 * export default function App() {
 *   const data = [
 *     { text: "Apple", value: "apple" },
 *     { text: "Banana", value: "banana" },
 *     { text: "Cherry", value: "cherry" }
 *   ];
 *
 *   return (
 *     <DropDownList
 *       id="fruits"
 *       dataSource={data}
 *       fields={{ text: "text", value: "value" }}
 *       placeholder="Select a fruit" />
 *   );
 * }
 * ```
 */
export const DropDownList: React.ForwardRefExoticComponent<IDropDownListProps & React.RefAttributes<IDropDownList>> =
    forwardRef<IDropDownList, IDropDownListProps>((props: IDropDownListProps, ref: React.Ref<IDropDownList>) => {
        const {
            dataSource,
            query,
            fields,
            value,
            placeholder = '',
            id = `dropdownlist_${useId()}`,
            disabled = false,
            readOnly = false,
            popupSettings = {},
            allowObjectBinding = false,
            labelMode,
            open,
            defaultOpen,
            skipDisabledItems,
            defaultValue,
            ignoreCase = true,
            ignoreAccent = false,
            filterable = false,
            filterType = 'StartsWith',
            filterPlaceholder = '',
            debounceDelay = 0,
            sortOrder,
            loading = false,
            size,
            variant,
            inputProps = {},
            itemTemplate,
            headerTemplate,
            footerTemplate,
            groupTemplate,
            valueTemplate,
            noRecordsTemplate,
            clearButton = false,
            dropdownIcon,
            valid,
            validationMessage = '',
            validityStyles = true,
            required,
            className,
            virtualization,
            resizable,
            onChange,
            onOpen,
            onClose,
            onError,
            onFilter,
            onDataRequest,
            onDataLoad,
            onScroll,
            onErrorTemplate,
            ...otherProps
        } = props;

        useEffect(() => {
            preRender('dropdownlist');
        }, []);

        const baseRef: React.RefObject<IDropdown | null> = React.useRef<IDropdown>(null);

        const publicAPI: Partial<IDropDownList> = useMemo(() => ({
            dataSource,
            query,
            fields,
            value,
            placeholder,
            id,
            popupSettings,
            allowObjectBinding,
            itemTemplate,
            headerTemplate,
            valueTemplate,
            groupTemplate,
            noRecordsTemplate,
            footerTemplate,
            labelMode,
            open,
            skipDisabledItems,
            ignoreCase,
            ignoreAccent,
            filterable,
            filterType,
            filterPlaceholder,
            sortOrder,
            clearButton,
            dropdownIcon,
            loading,
            size,
            variant
        }), [dataSource, fields, value, placeholder, id, popupSettings, allowObjectBinding]);


        useImperativeHandle(ref, () => ({
            ...publicAPI as IDropDownList,
            element: baseRef.current?.element
        }), [publicAPI, baseRef]);

        return (
            <Dropdown
                {...otherProps}
                id={id}
                ref={baseRef}
                componentClassName='sf-ddl'
                spanClickable
                inputClassName='sf-dropdown-list'
                localeComponentName='dropdownList'
                ariaLabel='dropdownlist'
                dataSource={dataSource}
                query={query}
                fields={fields}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                popupSettings={popupSettings}
                allowObjectBinding={allowObjectBinding}
                labelMode={labelMode}
                open={open}
                defaultOpen={defaultOpen}
                skipDisabledItems={skipDisabledItems}
                defaultValue={defaultValue}
                ignoreCase={ignoreCase}
                ignoreAccent={ignoreAccent}
                filterable={filterable}
                filterType={filterType}
                filterPlaceholder={filterPlaceholder}
                debounceDelay={debounceDelay}
                sortOrder={sortOrder}
                loading={loading}
                size={size}
                variant={variant}
                inputProps={inputProps}
                itemTemplate={itemTemplate}
                headerTemplate={headerTemplate}
                footerTemplate={footerTemplate}
                groupTemplate={groupTemplate}
                valueTemplate={valueTemplate}
                noRecordsTemplate={noRecordsTemplate}
                clearButton={clearButton}
                dropdownIcon={dropdownIcon}
                valid={valid}
                validationMessage={validationMessage}
                validityStyles={validityStyles}
                required={required}
                className={className}
                virtualization={virtualization}
                resizable={resizable}
                onChange={onChange}
                onOpen={onOpen}
                onClose={onClose}
                onError={onError}
                onFilter={onFilter}
                onDataRequest={onDataRequest}
                onDataLoad={onDataLoad}
                onScroll={onScroll}
                onErrorTemplate={onErrorTemplate}
            />
        );
    });

export default React.memo(DropDownList);
