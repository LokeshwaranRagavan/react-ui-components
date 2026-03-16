import { FC, ReactNode, useCallback, useMemo } from 'react';
import { Dialog } from '@syncfusion/react-popups';
import { Button } from '@syncfusion/react-buttons';
import { useProviderContext, Variant } from '@syncfusion/react-base';
import { useSchedulerLocalization } from '../../common/locale';
import { CSS_CLASSES } from '../../common/constants';
import { SchedulerEditorProps } from '../../types/scheduler-types';
import useEditorActions from '../../hooks/useEditorActions';
import EditorPopupFields from './editor-popup-fields';
import RecurrenceEditorDialog from './recurrence-editor-dialog';

export const SchedulerEditorPopup: FC<SchedulerEditorProps> = ({
    open,
    onClose,
    fields,
    action,
    children,
    dialogProps,
    className = '',
    style = {}
}: SchedulerEditorProps) => {
    const { locale } = useProviderContext();
    const { getString } = useSchedulerLocalization(locale || 'en-US');
    const { handleCancel, handleDelete, handleSave } = useEditorActions(onClose);

    const handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void =
        useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                handleSave();
            }
        }, [handleSave]);

    const header: ReactNode = useMemo(() => {
        if (dialogProps?.header) { return dialogProps.header; }
        return action === 'Add' ? getString('newEvent') : getString('editEvent');
    }, [dialogProps?.header, action, getString]);

    const footer: ReactNode = useMemo(() => {
        if (dialogProps?.footer) { return dialogProps?.footer; }
        return (
            <>
                {action !== 'Add' && (
                    <Button
                        className={CSS_CLASSES.DELETE_EVENT}
                        variant={Variant.Standard}
                        onClick={handleDelete}
                    >
                        {getString('delete')}
                    </Button>
                )}
                <Button
                    className={CSS_CLASSES.SAVE_EVENT}
                    variant={Variant.Standard}
                    onClick={handleSave}
                >
                    {getString('save')}
                </Button>
                <Button
                    className={CSS_CLASSES.CANCEL_EVENT}
                    variant={Variant.Standard}
                    onClick={handleCancel}
                >
                    {getString('cancel')}
                </Button>
            </>
        );
    }, [dialogProps?.footer, action, handleDelete, handleSave, handleCancel]);

    return (
        <>
            <Dialog
                header={header}
                open={open}
                onClose={onClose}
                modal={dialogProps?.modal ?? true}
                style={{ width: '500px', minHeight: '300px', ...style }}
                className={`${CSS_CLASSES.DIALOG} ${className}`}
                footer={footer}
                {...dialogProps}
            >
                <div className={CSS_CLASSES.FORM_CONTAINER} onKeyDown={handleKeyDown}>
                    {children ? children : (
                        <EditorPopupFields fields={fields} />
                    )}
                </div>
            </Dialog>
            <RecurrenceEditorDialog />
        </>
    );
};

export default SchedulerEditorPopup;

