import { Button, Color, Variant } from '@syncfusion/react-buttons';
import { IL10n, L10n, useProviderContext } from '@syncfusion/react-base';
import * as React from 'react';

interface DateRangeFooterProps {
    onCancel: () => void;
    onApply: () => void;
    canApply: boolean;
    className?: string;
}

export const DateRangeFooter: React.FC<DateRangeFooterProps> = ({
    onCancel,
    onApply,
    canApply,
    className
}: DateRangeFooterProps): React.JSX.Element => {
    const { locale } = useProviderContext();
    const l10n: IL10n = L10n('daterangepicker', {
        apply: 'Apply',
        cancel: 'Cancel'
    }, locale);
    const cancelLabel: string = l10n.getConstant('cancel');
    const applyLabel: string = l10n.getConstant('apply');
    const classNames: string = ['sf-daterangepicker-footer', className].filter(Boolean).join(' ');

    return (
        <div className={classNames}>
            <Button
                type='button'
                className='sf-cancel'
                variant={Variant.Standard}
                color={Color.Secondary}
                onClick={onCancel}
                aria-label={cancelLabel}
            >
                {cancelLabel}
            </Button>
            <Button
                type='button'
                className='sf-apply'
                variant={Variant.Standard}
                disabled={!canApply}
                onClick={onApply}
                aria-label={applyLabel}
            >
                {applyLabel}
            </Button>
        </div>
    );
};

DateRangeFooter.displayName = 'DateRangeFooter';
