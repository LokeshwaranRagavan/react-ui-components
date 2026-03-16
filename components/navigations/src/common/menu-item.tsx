
import * as React from 'react';
import type { HTMLAttributes } from 'react';
import { useProviderContext, useRippleEffect, SvgIcon } from '@syncfusion/react-base';
import type { MenuItemProps } from '../context-menu';

export type MenuItemComponentProps = MenuItemProps & Omit<MenuItemProps, 'items' | 'htmlAttributes'> & HTMLAttributes<HTMLLIElement>;
const SUBMENU_ICON: string = 'M7.58582 18L13.5858 12L7.58582 6L9.00003 4.58578L16.4142 12L9.00003 19.4142L7.58582 18Z';

/**
 * The MenuItem component represents an individual item within a Menu.
 * It serves as a configuration component and doesn't render anything directly.
 *
 * @example
 * ```jsx
 * <ContextMenu>
 *   <MenuItem text="File">
 *     <MenuItem text="New" />
 *     <MenuItem text="Open" />
 *     <MenuItem text="Save" />
 *   </MenuItem>
 *   <MenuItem separator={true} />
 *   <MenuItem text="Edit" icon={<svg>...</svg>}>
 *     <MenuItem text="Cut" icon={<svg>...</svg>} />
 *   </MenuItem>
 * </ContextMenu>
 * ```
 *
 * @returns {null} This is a wrapper component that doesn't render anything directly.
 */
export const MenuItem: React.FC<MenuItemComponentProps> = () => {
    return null;
};

interface MenuListItemProps  {
    item: MenuItemProps;
    itemClasses: string;
    isFocused: boolean;
    hasSubmenu: boolean;
    isDisabled: boolean;
    isSelected: boolean;
    isSeparator: boolean;
    onMouseEnter: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
    onClick: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
    getContent: (item: MenuItemProps) => React.ReactNode;
    focusedItemRef: React.RefObject<HTMLLIElement>;
    attributes?: React.HTMLAttributes<HTMLLIElement>;
}

export const MenuListItem: React.FC<MenuListItemProps > = (props: MenuListItemProps ) => {
    const { item, itemClasses, isFocused, hasSubmenu, isDisabled, isSelected, isSeparator,
        onMouseEnter, onClick, getContent, focusedItemRef, attributes } = props;
    const { ripple } = useProviderContext();
    const { rippleMouseDown, Ripple } = useRippleEffect(ripple);
    const handleMouseDown: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void =
    (e: React.MouseEvent<HTMLLIElement, MouseEvent>): void => {
        if (ripple && !isDisabled && !isSeparator) {
            rippleMouseDown(e);
        }
    };

    return (
        <li
            ref={isFocused ? focusedItemRef : undefined}
            className={itemClasses}
            onMouseEnter={onMouseEnter}
            onMouseDown={handleMouseDown}
            onClick={onClick}
            tabIndex={-1}
            role='menuitem'
            aria-disabled={!isSeparator ? isDisabled : undefined}
            aria-haspopup={!isSeparator ? hasSubmenu : undefined}
            aria-expanded={!isSeparator ? (hasSubmenu && isSelected ? true : false) : undefined}
            aria-label={isSeparator ? 'separator' : (item.text || undefined)}
            {...attributes}
        >
            {!isSeparator && (item.url ? (
                <a className='sf-menu-url' href={item.url} onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => e.stopPropagation()}>
                    <div className='sf-anchor-wrap'>
                        {getContent(item)}
                    </div>
                </a>
            ) : (getContent(item)))}
            {hasSubmenu && <span className='sf-submenu-icon'><SvgIcon d={SUBMENU_ICON} aria-label='submenu-icon'></SvgIcon></span>}
            {ripple && !isDisabled && !isSeparator && <Ripple />}
        </li>
    );
};
