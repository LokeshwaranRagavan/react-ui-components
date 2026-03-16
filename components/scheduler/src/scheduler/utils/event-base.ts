import { getRecurrenceDates } from '../../../recurrence-editor';
import { extend, isNullOrUndefined } from '@syncfusion/react-base';
import { EventModel, EventFields } from '../types/scheduler-types';
import { AlertAction, AlertType, CrudAction } from '../types/enums';
import { DateService } from '../services/DateService';
import { IScheduler } from '../index';
import { AlertDialog } from '../types/internal-interface';

/**
 * Expands recurring events into individual event instances within a date range
 *
 * @param {EventModel[]} events - The events to process
 * @param {Date[]} dateRange - The date range to expand events for
 * @param {number} firstDayOfWeek - First day of week
 * @private
 * @returns {EventModel[]} - Expanded events including recurring instances
 */
export function expandRecurringEvents(events: EventModel[], dateRange: Date[], firstDayOfWeek?: number): EventModel[] {
    if (!events || events.length === 0 || !dateRange || dateRange.length === 0) {
        return events;
    }
    const expandedEvents: EventModel[] = [];
    for (const event of events) {
        if (event.recurrenceRule && !event.recurrenceID) {
            const occurrences: EventModel[] = generateRecurrenceEvents(event, dateRange, firstDayOfWeek);
            expandedEvents.push(...occurrences);
        } else {
            expandedEvents.push(event);
        }
    }
    return expandedEvents;
}

/**
 * Generates occurrences based on a recurrence pattern
 *
 * @param {EventModel} event - The base event
 * @param {Date[]} dateRange - Current dates
 * @param {number} firstDayOfWeek - First day of week
 * @returns {EventModel[]} - Generated occurrences
 */
function generateRecurrenceEvents(
    event: EventModel,
    dateRange: Date[],
    firstDayOfWeek?: number
): EventModel[] {
    const viewDate: Date = dateRange?.length ? new Date(dateRange[0].getTime()) : new Date(event.startTime.getTime());
    const occurrenceDates: number[] = getRecurrenceDates(
        event.startTime as Date,
        event.recurrenceRule as string,
        event.recurrenceException as string,
        firstDayOfWeek ?? 0, undefined, viewDate
    );
    const duration: number = event.endTime.getTime() - event.startTime.getTime();
    const occurrenceCollection: EventModel[] = [];
    for (let i: number = 0; i < occurrenceDates.length; i++) {
        const occurrenceDate: number = occurrenceDates[i as number];
        const clonedEvent: EventModel = <EventModel>extend({}, event, null, true);
        clonedEvent.startTime = new Date(occurrenceDate);
        clonedEvent.endTime = new Date(new Date(occurrenceDate).getTime() + duration);
        clonedEvent.recurrenceID = clonedEvent.id;
        clonedEvent.guid = generateGuid();
        delete clonedEvent.recurrenceException;
        occurrenceCollection.push(clonedEvent);
    }
    return occurrenceCollection;
}

/**
 * Generates a unique GUID for each occurrence
 *
 * @returns {string} - Generated GUID in UUID v4 format
 */
function generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (idNumber: string) => {
        const randomNumber: number = Math.random() * 16 | 0;
        const guid: number = idNumber === 'x' ? randomNumber : (randomNumber & 0x3 | 0x8);
        return guid.toString(16);
    });
}

/**
 * Validates whether a recurring event can be dragged to a new start time
 *
 * @param {EventModel} original - The event being dragged
 * @param {Date} newStartTime - The new start time for the event
 * @param {Date} newEndTime - The new end time for the event
 * @param {EventModel[]} eventsProcessed - The processed events array
 * @param {EventModel[]} eventsData - The original events data
 * @param {EventFields} fields - The event field mapping
 *
 * @private
 * @returns {Object} - Validation result with isValid, shouldAlert, and optional messageKey
 */
export function editOccurrenceValidation(
    original: EventModel,
    newStartTime: Date,
    newEndTime: Date,
    eventsProcessed: EventModel[],
    eventsData: EventModel[],
    fields?: EventFields
): AlertDialog {
    if (!original[fields?.recurrenceID || 'recurrenceID'] || !original[fields?.recurrenceRule || 'recurrenceRule']) {
        return { isValid: true, shouldAlert: false, messageKey: AlertType.SameDayAlert };
    }
    const parentEvent: EventModel | undefined = eventsProcessed.find((e: EventModel) => e.id === original[fields?.recurrenceID || 'recurrenceID']);
    let reccurrenceCollection: EventModel[] = eventsData.filter((e: EventModel) =>
        e.recurrenceID === parentEvent.id && e.recurrenceRule
    );
    reccurrenceCollection = reccurrenceCollection.sort((a: EventModel, b: EventModel) =>
        a.startTime.getTime() - b.startTime.getTime());
    const index: number = reccurrenceCollection.findIndex((e: EventModel) => e.guid === original[fields?.guid || 'guid']);
    if (index === -1) {
        return { isValid: true, shouldAlert: false };
    }
    const previousEventDate: number = DateService.normalizeDate(reccurrenceCollection[index - 1]?.startTime)?.getTime();
    const nextEventDate: number = DateService.normalizeDate(reccurrenceCollection[index + 1]?.startTime)?.getTime();
    const normalizedNewDate: number = DateService.normalizeDate(newStartTime).getTime();
    if (index === 0 && normalizedNewDate < nextEventDate) {
        return { isValid: true, shouldAlert: false };
    }
    if (index === reccurrenceCollection.length - 1 && normalizedNewDate > previousEventDate) {
        return { isValid: true, shouldAlert: false };
    }
    if (normalizedNewDate > previousEventDate && normalizedNewDate < nextEventDate) {
        if (reccurrenceCollection[index + 1]?.startTime.getTime() < newEndTime.getTime()) {
            return { isValid: false, shouldAlert: true, messageKey: AlertType.SameDayAlert };
        }
        return { isValid: true, shouldAlert: false };
    }
    if ((normalizedNewDate < previousEventDate && normalizedNewDate < nextEventDate) ||
        (normalizedNewDate > previousEventDate && normalizedNewDate > nextEventDate) ||
        (!previousEventDate && normalizedNewDate > nextEventDate) || (!nextEventDate && normalizedNewDate < previousEventDate)) {
        return { isValid: false, shouldAlert: true, messageKey: AlertType.OccurrenceAlert };
    }
    return { isValid: false, shouldAlert: true, messageKey: AlertType.SameDayAlert };
}

/**
 * Validates whether a recurring event can be dragged to a new start time
 *
 * @param {EventModel} original - The event being dragged
 * @param {EventModel[]} eventsProcessed - The processed events array
 * @param {EventFields} fields - The event field mapping
 * @private
 * @returns {EventModel} - Returns parent event
 */
export function getRecurrenceParent(
    original: EventModel,
    eventsProcessed: EventModel[],
    fields?: EventFields
): EventModel | undefined {
    return eventsProcessed?.find((e: EventModel) => e.id === (original.recurrenceID || original[fields.recurrenceID]));
}

/**
 * Validates whether a recurring event can be dragged to a new start time
 *
 * @param {EventModel[]} eventsData - The processed events array
 * @param {EventFields} fields - The event field mapping
 * @private
 * @returns {EventModel} - Returns parent event
 */
export function getRecurrenceMaxId(
    eventsData: EventModel[],
    fields: EventFields
): number {
    if (!eventsData || eventsData.length === 0) { return 0; }
    return eventsData.reduce((max: number, event: EventModel) => {
        if (!event) { return max; }
        const idValue: unknown = event[fields?.id] || event.id;
        if (isNullOrUndefined(idValue)) { return max; }
        const eventId: number = Number(idValue);
        if (isNaN(eventId)) { return max; }
        return Math.max(max, eventId);
    }, 0);
}

/**
 * Updates the datasource with a modified event, handling recurrence rules
 *
 * @param {EventModel} original - The original event
 * @param {Date} newStartTime - The new start time
 * @param {Date} newEndTime - The new end time
 * @param {IScheduler} schedulerRef - Reference to the scheduler
 * @param {EventFields} fields - The event field mapping
 * @param {EventModel[]} eventsData - The events data array
 * @private
 * @returns {EventModel} - The updated event
 */
export function updateDatasource(
    original: EventModel,
    newStartTime: Date,
    newEndTime: Date,
    schedulerRef: React.RefObject<IScheduler>,
    fields: EventFields,
    eventsData: EventModel[]
): EventModel {
    const updatedEvent: EventModel = {};
    if (Array.isArray(eventsData) || original || fields) {
        updatedEvent[fields.id] = original.id;
        populateEventFields(updatedEvent, original, newStartTime, newEndTime, fields);
        if (schedulerRef?.current?.saveEvent) {
            schedulerRef.current.saveEvent(updatedEvent, original.recurrenceID ? 'EditOccurrence' : 'Edit');
        }
    }
    return updatedEvent;
}

/**
 * Updates the datasource with a modified event, handling recurrence rules
 *
 * @param {EventModel} original - The original event
 * @param {EventFields} fields - The event field mapping
 * @param {EventModel[]} eventsProcessed - The processed events array
 * @private
 * @returns {EventModel} - Returns the updated parent event
 */
export function updateParentRecurrenceEvent(
    original: EventModel,
    fields: EventFields,
    eventsProcessed: EventModel[]
): EventModel {
    const parentEvent: EventModel = getRecurrenceParent(original, eventsProcessed, fields) ?? {};
    const existingException: string = (parentEvent[fields.recurrenceException] || parentEvent.recurrenceException) ?
        String(parentEvent[fields.recurrenceException] ?? parentEvent.recurrenceException) : '';
    const occurrenceException: string = (original.recurrenceException || String(original[fields.recurrenceException] ?? '') || '');
    const exceptions: string[] = [];
    if (existingException?.trim()) { exceptions.push(existingException.trim()); }
    if (occurrenceException?.trim()) { exceptions.push(occurrenceException.trim()); }
    const combinedException: string = exceptions.length > 0 ? exceptions.join(',') : '';
    const parentEventUpdate: EventModel = {
        [fields.id]: parentEvent[fields.id] || parentEvent.id,
        [fields.recurrenceException]: combinedException
    };
    return parentEventUpdate;
}

/**
 * Populates event fields with updated time and recurrence information
 *
 * @param {EventModel} updatedEvent - The event object to populate
 * @param {EventModel} original - The original event
 * @param {Date} newStartTime - The new start time
 * @param {Date} newEndTime - The new end time
 * @param {EventFields} fields - The event field mapping
 *
 * @private
 * @returns {void}
 */
export function populateEventFields(
    updatedEvent: EventModel,
    original: EventModel,
    newStartTime: Date,
    newEndTime: Date,
    fields: EventFields
): void {
    updatedEvent[fields.subject] = original.subject;
    updatedEvent[fields.startTime] = newStartTime;
    updatedEvent[fields.endTime] = newEndTime;
    updatedEvent[fields.isAllDay] = original.isAllDay;
    updatedEvent[fields.recurrenceID] = original.recurrenceID;
    updatedEvent[fields.recurrenceException] = original.recurrenceException;
    updatedEvent[fields.recurrenceRule] = original.recurrenceRule;
}


/**
 * Handles recurrence deletion based on occurrence or series selection
 *
 * @param {string} title - The title of the alert dialog
 * @param {string} message - The message to display in the alert dialog
 * @param {string} confirmText - The text for the confirm button in the alert dialog
 * @param {object} confirmationDialog - An optional confirmation dialog instance with show and hide methods
 * @param {Function} confirmationDialog.show - Method to display the confirmation dialog
 * @param {Function} confirmationDialog.hide - Method to hide the confirmation dialog
 * @private
 * @returns {void}
 */
export function showAlertDialog(
    title: string,
    message: string,
    confirmText: string,
    confirmationDialog: {
        show: (options: { title: string; message: string; confirmText: string; showCancel: boolean; onConfirm: () => void }) => void;
        hide: () => void;
    }
): void {
    confirmationDialog?.show({
        title: title,
        message: message,
        confirmText: confirmText,
        showCancel: false,
        onConfirm: () => confirmationDialog.hide()
    });
}

/**
 * Shows a recurrence alert dialog (edit, delete, or series change) based on the action type
 *
 * @param {string} action - The action type: 'recurrenceEdit', 'recurrenceDelete', or 'seriesChange'
 * @param {object} confirmationDialog - The confirmation dialog instance with show and hide methods
 * @param {Function} confirmationDialog.show - Method to display the confirmation dialog
 * @param {Function} confirmationDialog.hide - Method to hide the confirmation dialog
 * @param {Function} getString - Function to get localized strings
 * @param {Function} onSelect - Callback when user selects an option
 * @private
 * @returns {void}
 */
export function showRecurrenceAlert(
    action: CrudAction | AlertAction,
    confirmationDialog: {
        show: (options: any) => void;
        hide: () => void;
    },
    getString: (key: string) => string,
    onSelect: (selectOption: CrudAction) => void
): void {
    const alertConfig: Record<string, { title: string; message: string; showCancel?: boolean; confirmText?: string }> = {
        [AlertAction.RecurrenceEdit]: {
            title: getString('editEvent'),
            message: getString('editEventContent'),
            showCancel: false
        },
        [AlertAction.RecurrenceDelete]: {
            title: getString('deleteEvent'),
            message: getString('editEventContent'),
            showCancel: false
        },
        [AlertAction.SeriesChange]: {
            title: getString('alert'),
            message: getString('seriesChangeAlert'),
            showCancel: true,
            confirmText: getString('yes')
        }
    };

    const config: { title: string; message: string; showCancel?: boolean; confirmText?: string; } = alertConfig[action as string];
    confirmationDialog?.show({
        action: action,
        title: config.title,
        message: config.message,
        confirmText: config.confirmText || getString('ok'),
        showCancel: config.showCancel ?? false,
        onConfirm: (selectOption: CrudAction) => {
            onSelect(selectOption);
            confirmationDialog.hide();
        }
    });
}
