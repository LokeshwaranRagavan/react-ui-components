import { SortOrder } from '@syncfusion/react-base';
export { SortOrder };

/**
 * An interface representing a data source object that maps string keys to various data types.
 * The value associated with each key can be an object, string, number, or boolean.
 */
export interface DataSource {
    [key: string]: object | string | number | boolean;
}

/**
 * Interface representing a grouped data.
 */
export interface GroupedData {
    [key: string]: object | string | number | boolean;
    /**
     * Indicates whether the record is a group header item.
     */
    isHeader: boolean;

    /**
     * Specifies the child items that belong to this group/category
     */
    items: GroupedData[];
}

/**
 * Interface representing field mappings in ListView items.
 */
export interface FieldsMapping {
    /**
     * The `id` field is used to map the unique identifier from the data source. This field is used to uniquely identify each ListView item.
     */
    id?: string;
    /**
     * The `text` field is used to map the text value from the data source for each list item.
     */
    text?: string;
    /**
     * The `visible` field is used to  hide or show the list item.
     */
    visible?: string;
    /**
     * The `url` field is used to map the URL value from the data source for each list item.
     * We can navigate to the URL by clicking on the list item.
     */
    url?: string;
    /**
     * The `disabled` field is used to enable or disable the list item.
     */
    disabled?: string;
    /**
     * The `groupBy` field is used to map the list items to the corresponding group based on group value in data source.
     */
    groupBy?: string;
    /**
     * The `icon` field is used to map the icon class value from the data source for each list item.
     *  We can add a specific image to the icons using `icon` field.
     */
    icon?: string;

    /**
     * The `tooltip` field is used to display the content about the target element when hovering on list item.
     */
    tooltip?: string;
    /**
     * The `htmlAttributes` field allows additional attributes such as id, class, etc., and
     *  accepts n number of attributes in a key-value pair format.
     */
    htmlAttributes?: string;
    /**
     * The `imageUrl` field is used to map the image URL value from the data source for each list item.
     */
    imageUrl?: string;
    /**
     * The `sortBy` field used to enable the sorting of list items to be ascending or descending order.
     */
    sortBy?: string;
}

/**
 * Interface that holds settings for virtualization in the ListView component.
 * Virtualization helps improve performance by only rendering items that are currently visible on the screen.
 */
export interface VirtualizationProps {
    /**
     * Specifies the fixed pixel height of each row.
     * Required for precise virtualization calculations.
     */
    itemSize: number;

    /**
     * Specifies the number of items in a single data page.
     * Used for progressive loading and skeleton sizing.
     */
    pageSize: number;

    /**
     * Specifies the extra items rendered before and after the viewport for smooth scrolling.
     *
     * @default 5
     */
    overscanCount?: number;

    /**
     * Specifies whether skeleton placeholders should be enabled during data fetch.
     *
     * @default false
     */
    showSkeleton?: boolean;

    /**
     * Specifies the total number of items available in the data source.
     */
    totalCount?: number;
}
