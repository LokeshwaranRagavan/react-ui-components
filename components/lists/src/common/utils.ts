import { isNullOrUndefined, getValue, extend } from '@syncfusion/react-base';
import { DataManager, Query, QueryOptions } from '@syncfusion/react-data';
import { defaultMappedFields } from './listItems';
import { FieldsMapping, GroupedData, SortOrder } from './types';

/**
 * Groups the data source based on the specified fields and sort order.
 *
 * @param {{Object}[]} dataSource - The data source to group.
 * @param {FieldsMapping} fields - The fields configuration for grouping.
 * @param {SortOrder} sortOrder - Optional sort order for the grouped data.
 * @returns {GroupedData[]} An array of grouped data objects.
 */
export function groupDataSource(dataSource: { [key: string]: Object }[], fields: FieldsMapping, sortOrder: SortOrder = SortOrder.None):
GroupedData[] {
    const groupedData: GroupedData[] = [];
    const curFields: FieldsMapping = extend({}, defaultMappedFields, fields);
    if (curFields.groupBy){
        let cusQuery: Query = new Query().group(String(curFields.groupBy));
        cusQuery = addSorting(sortOrder, 'key'  , cusQuery);
        const ds: GroupedData[] = getData(dataSource, cusQuery) as GroupedData[];
        ds.forEach((group: GroupedData) => {
            const groupItem: GroupedData = {} as GroupedData;
            groupItem[String(curFields.text)] = group.key;
            groupItem.isHeader = true;
            let newtext: string = String(curFields.text);
            if (newtext === 'id') {
                newtext = 'text';
                Object.assign(groupItem, { 'text': group.key });
            }
            groupItem[String(curFields.id)] = `group-list-item-${group.key ? group.key.toString().trim() : 'undefined'}`;
            groupItem.items = group.items;
            groupedData.push(groupItem);
            groupedData.push(...(group.items as GroupedData[]));
        });
    }
    return groupedData;
}

/**
 * Adds sorting to a query based on the specified sort order and field.
 *
 * @param {SortOrder} sortOrder - The sort order to apply.
 * @param {string} sortBy - The field to sort by.
 * @param {Query} query - Optional existing query to add sorting to.
 * @returns {Query} The query with added sorting.
 */
export function addSorting(sortOrder: SortOrder, sortBy: string, query: Query = new Query()): Query {
    const safeQuery: Query = query instanceof Query ? query : new Query();
    if (sortOrder === 'Ascending') {
        safeQuery.sortBy(sortBy, 'ascending', true);
    } else if (sortOrder === 'Descending') {
        safeQuery.sortBy(sortBy, 'descending', true);
    } else if (safeQuery.queries) {
        safeQuery.queries = safeQuery.queries.filter((q: QueryOptions) => q.fn !== 'onSortBy');
    }
    return safeQuery;
}

/**
 * Executes a query on the data source.
 *
 * @param {{Object}[]} dataSource - The data source to query.
 * @param {Query} query - The query to execute.
 * @returns {Object[]} The result of the query execution.
 */
export function getData(dataSource: { [key: string]: Object }[], query: Query): { [key: string]: Object }[] {
    if (!dataSource || !query) {
        return [];
    }
    return new DataManager(dataSource).executeLocal(query) as { [key: string]: Object }[];
}

/**
 * Gets the field values from a data item based on the specified fields mapping.
 *
 * @param {Object} dataItem - The data item to extract field values from.
 * @param {FieldsMapping} fields - The fields mapping configuration.
 * @returns {Object|string|number} An object containing the extracted field values, or the original data item if it's a primitive value.
 */
export function getFieldValues(dataItem: { [key: string]: Object } | string | number | boolean, fields: FieldsMapping)
    : { [key: string]: Object } | string | number | boolean {
    const fieldData: { [key: string]: Object } = {};
    if (isNullOrUndefined(dataItem)) {
        return dataItem;
    }
    else if (typeof dataItem === 'string' || typeof dataItem === 'number' || typeof dataItem === 'boolean') {
        const stringValue: string = dataItem.toString();
        fieldData[fields.text || 'text'] = stringValue;
        fieldData[fields.id || 'id'] = dataItem;
        return fieldData;
    }
    else if (!isNullOrUndefined(dataItem.isHeader)) {
        return dataItem;
    }
    else {
        for (const field of Object.keys(fields)) {
            if (Object.prototype.hasOwnProperty.call(fields, field)) {
                const dataField: string = fields[field as keyof FieldsMapping] as string;
                const value: { [key: string]: Object } = !isNullOrUndefined(dataField) &&
                    typeof (dataField) === 'string' ? getValue(dataField, dataItem) : undefined;
                if (!isNullOrUndefined(value) && typeof dataField === 'string' && dataField.trim()) {
                    fieldData[String(dataField)] = value;
                }
            }
        }
        if (!fields.text && fields.id && !isNullOrUndefined(getValue(fields.id, dataItem))) {
            const idField: string = fields.id;
            const valueData: string = getValue(idField, dataItem);
            fieldData['text'] = valueData;
        }
    }
    return fieldData;
}

export const getItemHeight: (container: HTMLElement) => number = (container: HTMLElement): number => {
    if (!container) { return 40; }
    const firstItem: HTMLElement | null = container.querySelector('.sf-list-item');
    const height: number = firstItem ? firstItem.offsetHeight : 0;
    return (typeof height === 'number' && height > 0) ? height : 40;
};

export const getItemByIndex: (index: number, container: HTMLElement) => HTMLElement | null =
    (index: number, container: HTMLElement): HTMLElement | null => {
        if (!container) { return null; }
        return container.querySelector(`.sf-list-item[data-index="${index}"]`);
    };

export const scrollIntoItem: (index: number, container: HTMLElement) => void =
    (index: number, container: HTMLElement): void => {
        if (!container || isNullOrUndefined(index)) { return; }
        requestAnimationFrame(() => {
            const focused: HTMLElement | null = getItemByIndex(index, container);
            if (focused) {
                focused?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
            } else {
                const itemHeight: number = getItemHeight(container);
                container.scrollTop = index * itemHeight;
            }
        });
    };

const clamp: (n: number, min: number, max: number) => number = (n: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, n));
};

export const computeWindow: (total: number, scrollTop: number, itemSize: number, pageSize: number, overscan: number)
=> { startIndex: number; endIndex: number; offsetY: number; totalHeight: number; } =
    (total: number, scrollTop: number, itemSize: number, pageSize: number, overscan: number):
    { startIndex: number; endIndex: number; offsetY: number; totalHeight: number; } => {
        const baseIndex: number = Math.floor(scrollTop / Math.max(1, itemSize));
        const startIndex: number = clamp(baseIndex - overscan, 0, Math.max(0, total));
        const endIndex: number = clamp(startIndex + pageSize + overscan * 2, 0, total);
        const offsetY: number = startIndex * itemSize;
        const totalHeight: number = Math.max(0, total * itemSize);

        return { startIndex, endIndex, offsetY, totalHeight };
    };

export const isValidLI: (li: Element) => boolean = (li: Element): boolean => {
    return (
        li && li.classList.contains('sf-list-item') && !li.classList.contains('sf-list-group-item') &&
        !li.classList.contains('sf-disabled') && !li.classList.contains('sf-display-none'));
};
