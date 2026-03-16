import * as React from 'react';
import { ChipItemProps, Chip, ChipDeleteEvent } from '@syncfusion/react-buttons';
import { DisplayMode } from '../../multi-select';
import { FieldSettingsModel, T } from '../../drop-down-list';
import { useMemo } from 'react';
import { getTextValueField } from '../../common/utils';

/**
 * Props for SelectedValuesRenderer component
 */
export interface SelectedValuesRendererProps {
    /**
     * Display mode for rendering selected values
     *
     * @default DisplayMode.Box
     */
    mode?: DisplayMode;

    /**
     * Array of selected item data
     */
    itemData: T[] | null;

    /**
     * Field configuration for extracting text and value
     */
    resolvedFields: FieldSettingsModel;

    /**
     * Character to use for joining values in delimiter modes
     *
     * @default -
     */
    delimiterChar?: string;

    /**
     * Whether input is currently focused (for auto mode)
     */
    isInputFocused?: boolean;

    /**
     * Specifies whether component is disabled.
     */
    disabled?: boolean;

    /**
     * Custom template or render function for each selected chip (multi-select mode).
     *
     */
    chipTemplate?: ((Item: T) => React.ReactNode);

    /**
     * Callback when a chip remove button is clicked
     *
     * @event onChipDelete
     */
    onChipDelete?: (itemData: ChipDeleteEvent) => void;

    /**
     * Triggers when the selected chips in the ChipList change.
     *
     * @event onChipClick
     */
    onChipClick?: (args: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * SelectedValuesRenderer component
 * Renders selected values as either individual chips or delimited text based on mode
 */
export const SelectedValuesRenderer: React.FC<SelectedValuesRendererProps> = React.memo(({
    mode,
    itemData,
    resolvedFields,
    delimiterChar,
    onChipDelete,
    isInputFocused,
    chipTemplate,
    onChipClick,
    disabled
}: SelectedValuesRendererProps) => {
    if (!itemData || itemData.length === 0) {
        return null;
    }

    const effectiveMode: 'chips' | 'delimiter' = useMemo(() => {
        switch (mode) {
        case DisplayMode.Auto:
            return isInputFocused ? 'chips' : 'delimiter';
        case DisplayMode.Delimiter:
            return 'delimiter';
        case DisplayMode.Box:
        default:
            return 'chips';
        }
    }, [mode, isInputFocused]);

    const chipItems: ChipItemProps[] = useMemo(() =>
        itemData.map((item: T) => ({
            text: getTextValueField(item as { [key: string]: unknown }, 'text', resolvedFields),
            value: getTextValueField(item as { [key: string]: unknown }, 'value', resolvedFields),
            children: chipTemplate?.(item)
        })) as ChipItemProps[], [itemData, resolvedFields]);

    const delimiterClassNames: string = useMemo(() => {
        return [
            'sf-multiselect-values sf-multiselect-delimiter',
            !isInputFocused ? 'sf-ellipsis' : 'sf-multiselect-delimiter-focus'
        ].filter(Boolean).join(' ');
    }, [isInputFocused]);

    if (effectiveMode === 'chips') {
        return (
            <div className={'sf-multiselect-values sf-multiselect-chip'}>
                {chipItems.map((chip: ChipItemProps, index: number) => (
                    <Chip key={chip.value} text={chip.text} value={chip.value} removable={true}
                        children={chip.children} disabled={disabled} onClick={onChipClick} onDelete={onChipDelete} data-index={index} />
                ))}
            </div>
        );
    }

    if (effectiveMode === 'delimiter') {
        if (isInputFocused) {
            return (
                <div className={delimiterClassNames}>
                    {itemData.map((item: T, index: number) => {
                        const text: string | number | boolean = getTextValueField(item as { [key: string]: unknown }, 'text', resolvedFields);
                        const isLast: boolean = index === itemData.length - 1;
                        return (
                            <span key={index} className="sf-multiselect-delimiter-item">
                                {text}
                                {!isLast && `${delimiterChar} `}
                            </span>
                        );
                    })}
                </div>
            );
        } else {
            const delimitedText: string = itemData.map((item: T) => getTextValueField(item as { [key: string]: unknown }, 'text', resolvedFields)).join(delimiterChar + ' ');
            return (
                <div className={delimiterClassNames}>
                    {delimitedText}
                </div>
            );
        }
    }

    return null;
});

export default SelectedValuesRenderer;
