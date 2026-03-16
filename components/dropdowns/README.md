# React Dropdown Components

The Syncfusion React Dropdowns package is a feature-rich UI collection for dynamic dropdown interactions in React apps.

## Setup

To install `dropdowns` and its dependent packages, use the following command,

```sh
npm install @syncfusion/react-dropdowns
```

## React Dropdown List

The Dropdown List component provides a user-friendly interface for selecting a single option from a list of predefined values. It supports rich customization, filtering, and templating features, making it ideal for forms, data filtering, and guided user selections.

**Key features**

- **Primitive Data Binding:** Bind the Dropdown List to simple arrays of strings or numbers for straightforward use cases without complex data structures.

- **Grouping:** Organize Dropdown List items into logical categories using the groupBy property, improving navigation and discoverability in large datasets.

- **Filtering:** Enable the filterable property to allow users to search and narrow down options dynamically, with real-time updates to the list as they type.

- **Grouping with Filtering:** Combine grouping and filtering to enhance usability, especially when dealing with extensive or categorized data.

- **Templates:** Customize the Dropdown List appearance using various template options:

  - **Item Template:** Use itemTemplate to style individual items or display additional information.
  - **Header Template:** Add custom content at the top of the Dropdown List using headerTemplate.
  - **Footer Template:** Include extra information or actions at the bottom using footerTemplate.
  - **Value Template:** Style the selected value using valueTemplate for a personalized display.

- **Label Mode:** Control how labels or placeholders appear with the labelMode property. Available modes include Never, Always, and Auto.

- **Sorting:** Control item order using the sortOrder property.

- **Popup Customization:** Configure popupSettings (width, height, zIndex, position, offset, collision).

- **Clear Button:** Show a clear icon to reset selection via clearButton.

- **Sizes and Variants:** Adjust UI with size (Small, Medium, Large) and variant (Standard, Outlined, Filled).

**Usage**

```tsx
import { DropDownList } from '@syncfusion/react-dropdowns';

const data = [
  { text: 'Apple', value: 'apple' },
  { text: 'Banana', value: 'banana' },
  { text: 'Cherry', value: 'cherry' }
];

export default function App() {
  return (
    <DropDownList
      id="fruits"
      dataSource={data}
      fields={{ text: 'text', value: 'value' }}
      placeholder="Select a fruit"
    />
  );
}
```

## React Autocomplete

The Autocomplete component enables users to type and search for a single option from a predefined list, with automatic suggestions displayed as they type. It combines input functionality with filtering to provide a fast and intuitive selection experience.

**Key features**

- **Controlled and Uncontrolled Usage:** Manage state with value/defaultValue properties for flexible integration patterns.

- **Autofill:** Automatically completes the input field with the first matching suggestion while highlighting the auto-filled portion, allowing users to press Enter or Tab to accept.

- **Auto Highlight:** Highlights matched search text within each suggestion, making it easier to identify relevant matches.

- **Minimum Characters:** Use minLength to require a minimum number of characters before suggestions are displayed, reducing unnecessary filtering on short inputs.

- **Maximum Suggestions:** Control the maximum number of suggestions displayed using maxSuggestions to improve performance and UX with large datasets.

- **Custom Values:** Enable customValue to allow users to commit free-form text values not present in the data source by pressing Enter.

- **Templates:** Customize appearance with itemTemplate, headerTemplate, footerTemplate, groupTemplate, and valueTemplate.

- **Local and Remote Data:** Bind to local arrays or remote data sources through the dataSource property.

- **Customizable Appearance:** Adjust size and variant properties for different UI contexts.

**Usage**

```tsx
import { Autocomplete } from '@syncfusion/react-dropdowns';

const languages = [
  { text: 'JavaScript', value: 'js' },
  { text: 'TypeScript', value: 'ts' },
  { text: 'Python', value: 'python' }
];

export default function App() {
  return (
    <Autocomplete
      id="languages"
      dataSource={languages}
      fields={{ text: 'text', value: 'value' }}
      placeholder="Search language..."
      autofill={true}
      autoHighlight={true}
      minLength={1}
    />
  );
}
```

## React ComboBox

The ComboBox component combines an input field with a dropdown list, allowing users to either type a value or select from predefined options. It's ideal for scenarios where users need both the flexibility of free-form input and the convenience of predefined choices.

**Key features**

- **Controlled and Uncontrolled Usage:** Support for both value/defaultValue state management patterns for flexible component integration.

- **Autofill Support:** Automatically complete input with the first matching suggestion, with visual highlighting of the completed portion.

- **Auto Highlight:** Display highlighted text within suggestions to emphasize matching characters based on user input.

- **Custom Values:** Allow users to enter and commit custom text values not in the data source by pressing Enter, enabling flexible data entry.

- **Filtering:** Enable or disable filtering with the filterable property to control search capabilities.

- **Configurable Dropdown Icon:** Show or hide the dropdown arrow using the dropdownIcon property for different UI preferences.

- **Clear Button:** Include a clearButton to reset the selected value and input field.

- **Templates:** Customize rendering with itemTemplate, headerTemplate, footerTemplate, groupTemplate, and valueTemplate options.

- **Data Binding:** Support for both primitive and complex object data sources with field mapping.

- **Responsive Design:** Adjust size and variant for various screen sizes and design contexts.

**Usage**

```tsx
import { ComboBox } from '@syncfusion/react-dropdowns';

const cities = [
  { text: 'New York', value: 'ny' },
  { text: 'London', value: 'london' },
  { text: 'Tokyo', value: 'tokyo' }
];

export default function App() {
  return (
    <ComboBox
      id="cities"
      dataSource={cities}
      fields={{ text: 'text', value: 'value' }}
      placeholder="Select or type a city"
      filterable={true}
      clearButton={true}
    />
  );
}
```

## React MultiSelect

The MultiSelect component enables users to select multiple options from a list, with support for advanced features like checkboxes, custom selection limits, and flexible display modes including chip and delimiter modes. It's perfect for scenarios requiring bulk selection with fine-grained control.

**Key features**

- **Multiple Selection:** Allow users to select multiple items from the data source simultaneously.

- **Controlled and Uncontrolled Usage:** Support for both value/defaultValue patterns for flexible state management.

- **Checkbox Support:** Display checkboxes next to each item for explicit multi-selection feedback with the checkbox property.

- **Selection Limits:** Restrict the number of selectable items using maximumSelectionLength to enforce business rules.

- **Display Modes:** Choose between Auto, Box, and Delimiter display modes using the mode property to customize how selected items appear:
  - **Box Mode:** Display selected items as styled chips.
  - **Delimiter Mode:** Show selected items separated by a custom delimiter character.
  - **Auto Mode:** Automatically choose the best display mode based on focus.

- **Custom Chip Templates:** Customize the appearance of selected item chips using chipTemplate for styling.

- **Hide Selected Items:** Use hideSelectedItem to remove selected items from the dropdown.

- **Close on Select:** Control dropdown closure behavior with closeOnSelect to automatically close the dropdown immediately after an item is selected or keep it open for continuous multi-selection workflow.

- **Select All Functionality:** Enable select/unselect all items with showSelectAll and customize text using selectAllText and unSelectAllText.

- **Add Tag on Blur:** Allow users to commit typed values as new selections when leaving the input field using addTagOnBlur.

- **Flexible Templates:** Support for itemTemplate, headerTemplate, footerTemplate, groupTemplate, and valueTemplate for complete customization.

- **Data Source Options:** Bind to local arrays or remote data sources with field mapping.

**Usage**

```tsx
import { MultiSelect, DisplayMode } from '@syncfusion/react-dropdowns';

const skills = [
  { text: 'JavaScript', value: 'js' },
  { text: 'React', value: 'react' },
  { text: 'TypeScript', value: 'ts' },
  { text: 'Node.js', value: 'nodejs' }
];

export default function App() {
  return (
    <MultiSelect
      id="skills"
      dataSource={skills}
      fields={{ text: 'text', value: 'value' }}
      placeholder="Select skills"
      checkbox={true}
      showSelectAll={true}
      mode={DisplayMode.Box}
      maximumSelectionLength={3}
    />
  );
}
```

<p align="center">
Trusted by the world's leading companies
  <a href="https://www.syncfusion.com/">
    <img src="https://raw.githubusercontent.com/SyncfusionExamples/nuget-img/master/syncfusion/syncfusion-trusted-companies.webp" alt="Syncfusion logo">
  </a>
</p>

## Support

Product support is available through following mediums.

* [Support ticket](https://support.syncfusion.com/support/tickets/create) - Guaranteed Response in 24 hours | Unlimited tickets | Holiday support
* Live chat

## Changelog
Check the changelog [here](https://github.com/syncfusion/react-ui-components/blob/master/components/dropdowns/CHANGELOG.md). Get minor improvements and bug fixes every week to stay up to date with frequent updates.

## License and copyright

> This is a commercial product and requires a paid license for possession or use. Syncfusion’s licensed software, including this component, is subject to the terms and conditions of Syncfusion's [EULA](https://www.syncfusion.com/eula/es/). To acquire a license for [React UI components](https://www.syncfusion.com/react-components), you can [purchase](https://www.syncfusion.com/sales/products) or [start a free 30-day trial](https://www.syncfusion.com/account/manage-trials/start-trials).

> A [free community license](https://www.syncfusion.com/products/communitylicense) is also available for companies and individuals whose organizations have less than $1 million USD in annual gross revenue and five or fewer developers.

See [LICENSE FILE](https://github.com/syncfusion/react-ui-components/blob/master/license?utm_source=npm&utm_campaign=notification) for more info.

&copy; Copyright 2026 Syncfusion®, Inc. All Rights Reserved. The Syncfusion® Essential Studio® license and copyright applies to this distribution.

