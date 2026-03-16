import { useCallback } from 'react';
import { useProviderContext } from '@syncfusion/react-base';
import { EventModel, SchedulerEditorSubmitEvent } from '../types/scheduler-types';
import { EventService } from '../services/EventService';
import { DateService } from '../services/DateService';
import { useSchedulerPropsContext } from '../context/scheduler-context';
import { useSchedulerEventsContext } from '../context/scheduler-events-context';
import { useSchedulerLocalization } from '../common/locale';
import { useEditorContext } from '../context/scheduler-editor-popup-context';
import { CrudAction, AlertAction, AlertType } from '../types/enums';
import { getRecurrenceStringFromDate } from '../../recurrence-editor';
import { editOccurrenceValidation, showAlertDialog, showRecurrenceAlert } from '../utils/event-base';
import { AlertDialog } from '../types/internal-interface';

/** @private */
export interface UseEditorActionsResult {
    handleSave: () => void;
    handleDelete: () => void;
    handleCancel: () => void;
    buildEventData: () => EventModel;
    validateEventConflicts: (eventData: EventModel) => boolean;
}

/**
 * Custom hook to manage common editor actions (save, delete, cancel).
 * Encapsulates validation, data merging, and confirmation logic.
 *
 * @param {void} onClose - Callback to close the editor
 * @returns {UseEditorActionsResult} Object with handler functions and utility methods
 *
 */
export const useEditorActions: (onClose: () => void) => UseEditorActionsResult = (
    onClose: () => void
): UseEditorActionsResult => {
    const { locale } = useProviderContext();
    const { getString } = useSchedulerLocalization(locale || 'en-US');
    const {
        schedulerRef,
        showDeleteAlert,
        eventSettings,
        eventOverlap,
        confirmationDialog,
        onEditorSubmit, enableRecurrenceValidation
    } = useSchedulerPropsContext();
    const { eventsData, eventsProcessed } = useSchedulerEventsContext();

    const {
        data,
        action,
        originalData,
        startDateOnly,
        startTimeOnly,
        endDateOnly,
        endTimeOnly,
        slotDuration,
        formRef,
        validateRequiredFields
    } = useEditorContext();

    /**
     * Builds the event data object from editor state.
     * Merges default fields with custom fields and preserves extra fields on edit.
     *
     * @returns {EventModel} Complete event object ready for save
     */
    const buildEventData: () => EventModel = useCallback((): EventModel => {
        let computedStart: Date | undefined;
        let computedEnd: Date | undefined;

        if (data?.isAllDay) {
            const sDate: Date = startDateOnly ? DateService.normalizeDate(startDateOnly) : undefined;
            const eDate: Date = endDateOnly ? DateService.normalizeDate(endDateOnly) : sDate;
            computedStart = sDate;
            computedEnd = eDate;
        } else {
            const combine: (date?: Date, time?: Date) => Date = (date?: Date, time?: Date): Date =>
                DateService.combineDateAndTime(date, time);
            computedStart = combine(startDateOnly, startTimeOnly) ?? data?.startTime;
            computedEnd = combine(endDateOnly, endTimeOnly) ?? data?.endTime;
            if (computedStart && computedEnd && computedEnd <= computedStart) {
                const adjusted: Date = new Date(computedStart);
                adjusted.setMinutes(adjusted.getMinutes() + slotDuration);
                computedEnd = adjusted;
            }
        }

        const baseData: EventModel = {
            [eventSettings?.fields?.subject || 'subject']: data?.subject || getString('newEvent'),
            [eventSettings?.fields?.startTime || 'startTime']: computedStart,
            [eventSettings?.fields?.endTime || 'endTime']: computedEnd,
            [eventSettings?.fields?.isAllDay || 'isAllDay']: !!data?.isAllDay,
            [eventSettings?.fields?.location || 'location']: data?.location || '',
            [eventSettings?.fields?.description || 'description']: data?.description || '',
            [eventSettings?.fields?.recurrenceRule || 'recurrenceRule']: data?.recurrenceRule || ''
        };

        if (action === 'Edit' && originalData) {
            const INTERNAL_KEYS: Set<string> = new Set([
                'id', 'subject', 'startTime', 'endTime', 'isAllDay', 'location', 'description', 'isReadonly', 'isBlock'
            ]);
            const mappedFieldKeys: Set<string> = new Set(
                Object.values(eventSettings?.fields).filter((k: string) => k !== eventSettings?.fields?.id) as string[]
            );
            const preservedExtras: Record<string, unknown> = Object.fromEntries(
                Object.entries(originalData as Record<string, unknown>).filter(
                    ([k]: [string, unknown]) => !INTERNAL_KEYS.has(k) && !mappedFieldKeys.has(k)
                )
            );
            return {
                ...preservedExtras,
                ...baseData,
                [eventSettings.fields.id]: originalData.id
            } as unknown as EventModel;
        } else {
            return {
                ...baseData,
                [eventSettings.fields.id]: EventService.generateEventGuid()
            };
        }
    }, [data?.isAllDay, startDateOnly, startTimeOnly, endDateOnly, endTimeOnly, slotDuration, data?.startTime,
        data?.endTime, eventSettings, data?.subject, data?.location, data?.description, action, originalData]);

    /**
     * Checks for overlapping events and block ranges.
     * Shows confirmation dialog if conflicts found.
     *
     * @param {EventModel} eventData - Event to validate
     * @returns {boolean} True if event can be saved, false if conflicts exist
     */
    const validateEventConflicts: (eventData: EventModel) => boolean = useCallback((eventData: EventModel): boolean => {
        if (!eventOverlap && EventService.checkEventOverlap(eventData, eventsData, false, eventSettings.fields)) {
            confirmationDialog?.show({
                title: getString('eventOverlap'),
                message: getString('overlapAlert'),
                confirmText: getString('ok'),
                showCancel: false,
                onConfirm: () => confirmationDialog.hide()
            });
            return false;
        }

        if (EventService.isBlockRange(eventData, eventsData, false, eventSettings.fields)) {
            confirmationDialog?.show({
                title: getString('alert'),
                message: getString('blockAlert'),
                confirmText: getString('ok'),
                showCancel: false,
                onConfirm: () => confirmationDialog.hide()
            });
            return false;
        }
        return true;
    }, [eventOverlap, eventsData, eventSettings, confirmationDialog]);

    /**
     * Handles save action with validation and data merging.
     */
    const handleSave: () => void = useCallback((): void => {
        const validationError: string | null = validateRequiredFields(getString);
        if (validationError) {
            confirmationDialog?.show({
                title: getString('alert'),
                message: validationError,
                confirmText: getString('ok'),
                showCancel: false,
                onConfirm: () => confirmationDialog.hide()
            });
            return;
        }

        if (formRef?.current && !formRef.current?.validate()) {
            return;
        }

        // Build event data
        let eventData: EventModel = buildEventData();

        if (onEditorSubmit) {
            const saveArgs: SchedulerEditorSubmitEvent = {
                data: eventData,
                cancel: false,
                requestType: action,
                originalData: action === 'Add' ? undefined : originalData
            };
            onEditorSubmit(saveArgs);
            if (saveArgs.cancel) { return; }
            eventData = saveArgs.data;
            const startTime: Date = eventData[eventSettings.fields.startTime] as Date;
            const endTime: Date = eventData[eventSettings.fields.endTime] as Date;
            if (!startTime || !endTime) {
                showAlertDialog(getString('alert'), getString('invalidDateValue'), getString('ok'), confirmationDialog);
                return;
            }
            if (!eventData[eventSettings.fields.isAllDay] && startTime && endTime && endTime <= startTime) {
                showAlertDialog(getString('alert'), getString('invalidDateRange'), getString('ok'), confirmationDialog);
                return;
            }
        }

        if (!validateEventConflicts(eventData)) { return; }

        if (originalData) {
            eventData[eventSettings.fields.id] = originalData.id;
            eventData[eventSettings.fields.recurrenceID] = originalData.recurrenceID;
            eventData[eventSettings.fields.guid] = originalData.guid;
        }
        if (action === 'Edit' && originalData) {
            schedulerRef?.current?.saveEvent?.(eventData);
        } else if (action === 'EditOccurrence' && originalData) {
            eventData[eventSettings.fields.recurrenceException] = getRecurrenceStringFromDate(originalData.startTime);
            if (originalData.recurrenceRule) {
                const newStartTime: Date = eventData[eventSettings.fields.startTime] as Date;
                const newEndTime: Date = eventData[eventSettings.fields.endTime] as Date;
                const recurrenceValidation: AlertDialog = enableRecurrenceValidation ?
                    editOccurrenceValidation(originalData, newStartTime, newEndTime, eventsProcessed, eventsData) :
                    { isValid: true, shouldAlert: false, messageKey: AlertType.SameDayAlert };
                if (!recurrenceValidation.isValid) {
                    showAlertDialog(getString('alert'), getString(recurrenceValidation.messageKey), getString('ok'), confirmationDialog);
                    return;
                }
            }
            schedulerRef?.current?.saveEvent?.(eventData, 'EditOccurrence');
        } else if (action === 'EditSeries') {
            let isSeriesEventChanged: boolean = false;
            for (const e of eventsProcessed) {
                if ((e.recurrenceID && e.recurrenceID === originalData.recurrenceID && e.id !== originalData.recurrenceID) ||
                    (!e.recurrenceID && e.recurrenceRule && e.id === originalData.recurrenceID && e.recurrenceException)) {
                    isSeriesEventChanged = true;
                    break;
                }
            }
            if (isSeriesEventChanged) {
                showRecurrenceAlert(AlertAction.SeriesChange, confirmationDialog, getString, (selectOption: CrudAction) => {
                    schedulerRef?.current?.saveEvent?.(eventData, selectOption);
                    onClose();
                });
                return;
            } else {
                schedulerRef?.current?.saveEvent?.(eventData, 'EditSeries');
            }
        } else {
            schedulerRef?.current?.addEvent?.(eventData);
        }
        onClose();

    }, [validateRequiredFields, buildEventData, validateEventConflicts, action, originalData,
        schedulerRef, onClose, confirmationDialog]);

    /**
     * Delete handler with confirmation.
     */
    const handleDelete: () => void = useCallback((): void => {
        if (!originalData) { return; }
        const performDelete: () => void = (): void => {
            const deleteAction: CrudAction = (action === 'EditSeries' && originalData.recurrenceID) ?
                'DeleteSeries' : 'DeleteOccurrence';
            schedulerRef?.current?.deleteEvent?.(originalData, deleteAction);
        };
        onClose();
        showDeleteAlert?.(performDelete);
    }, [originalData, action, schedulerRef, onClose, showDeleteAlert]);

    /**
     * Cancel handler - simply closes the editor.
     */
    const handleCancel: () => void = useCallback((): void => onClose(), [onClose]);

    return {
        handleSave,
        handleDelete,
        handleCancel,
        buildEventData,
        validateEventConflicts
    };
};

export default useEditorActions;
