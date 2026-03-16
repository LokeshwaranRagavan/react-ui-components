import * as React from 'react';
import { MenuAnimationProps, MenuItemProps, ContextMenuSelectEvent } from '../context-menu';

/**
 * Interface for common menu props shared by menu-like components.
 */
export interface MenuProps {
    /**
     * Specifies whether to show the sub menu on click instead of hover.
     * When set to true, the sub menu will open only on mouse click rather than on hover.
     *
     * @default false
     */
    itemOnClick?: boolean;

    /**
     * Specifies menu items with their properties which will be rendered as Menu.
     * This array defines the structure and content of the menu.
     *
     * @default []
     */
    items?: MenuItemProps[];

    /**
     * Specifies the delay time in milliseconds before opening the submenu when hovering.
     *
     * @default 0
     */
    hoverDelay?: number;

    /**
     * Specifies the animation settings for the Menu open.
     *
     * @default { duration: 400, easing: 'ease', effect: 'FadeIn' }
     */
    animation?: MenuAnimationProps;

    /**
     * Specifies whether to close the Menu when the document is scrolled.
     * When set to true, scrolling the page will automatically close the menu.
     *
     * @default true
     */
    closeOnScroll?: boolean;

    /**
     * Specifies a custom template for menu items. This function receives the entire item object
     * as an argument and should return a React node that will replace the default content.
     *
     * @default -
     */
    itemTemplate?: (item: MenuItemProps) => React.ReactNode;

    /**
     * Specifies the callback function that triggers before open the Menu.
     *
     * @event onOpen
     */
    onOpen?: (event: Event) => void;

    /**
     * Specifies the callback function that triggers before closing the Menu.
     *
     * @event onClose
     */
    onClose?: (event: Event) => void;

    /**
     * Specifies the callback function that triggers when selecting a Menu item.
     *
     * @event onSelect
     */
    onSelect?: (event: ContextMenuSelectEvent) => void;
}
