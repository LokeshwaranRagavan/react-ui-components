# React Lists Components

The Syncfusion React Lists package provides a feature-rich ListView component for dynamic list interactions in React apps.

## Setup

To install `lists` and its dependent packages, use the following command,

```sh
npm install @syncfusion/react-lists
```

## React ListView

The React ListView component is designed to display a list of items with rich functionality and customization options. It provides a flexible and interactive way to present data in a list format with support for grouping, templates, and virtualization.

**Key features**

- **Data Binding:** Seamlessly bind data from various sources including arrays, JSON objects, and remote data through DataManager for dynamic list population.

- **Query:** Use DataManager Query to fetch specific data from dataSource using where and select keywords for advanced filtering and data retrieval.

- **Sorting:** Sort list items in ascending, descending, or preserve original sequence with SortOrder options. Sorting applies to both items and group headers when grouping is enabled.

- **Customization:** Create highly personalized list items using custom templates including:
  - **Header Template:** Custom content rendered at the top of the list
  - **Item Template:** Personalized rendering for each list item
  - **Group Template:** Custom rendering for group header sections
  - **Footer Template:** Custom content rendered at the bottom of the list

- **Field Mapping:** Configure flexible field mapping to match your data structure. Default fields include id, text, url, disabled, icon, visible, tooltip, htmlAttributes, imageUrl, and groupBy properties.

- **Virtualization:** Enhance performance with virtual scrolling for large datasets, rendering only visible items to maintain optimal application speed.

- **Disabled State:** Disable user interactions with the ListView, preventing clicks and key presses from triggering actions.

**Usage**

```tsx
import { ListView } from '@syncfusion/react-lists';
    
export default function App() {
  const listDatas: { [key: string]: string }[] = [
    { id: '1', text: 'Artwork' }, 
    { id: '2', text: 'Abstract' }, 
    { id: '3', text: 'Modern Painting' }, 
    { id: '4', text: 'Ceramics' }, 
    { id: '5', text: 'Animation Art' }, 
    { id: '6', text: 'Oil Painting' }
  ];

  return (
    <div className="component-section">
      <ListView dataSource={listDatas} fields={{ id: 'id', text: 'text' }}></ListView>
    </div>
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
Check the changelog [here](https://github.com/syncfusion/react-ui-components/blob/master/components/lists/CHANGELOG.md). Get minor improvements and bug fixes every week to stay up to date with frequent updates.

## License and copyright

> This is a commercial product and requires a paid license for possession or use. Syncfusion’s licensed software, including this component, is subject to the terms and conditions of Syncfusion's [EULA](https://www.syncfusion.com/eula/es/). To acquire a license for [React UI components](https://www.syncfusion.com/react-components), you can [purchase](https://www.syncfusion.com/sales/products) or [start a free 30-day trial](https://www.syncfusion.com/account/manage-trials/start-trials).

> A [free community license](https://www.syncfusion.com/products/communitylicense) is also available for companies and individuals whose organizations have less than $1 million USD in annual gross revenue and five or fewer developers.

See [LICENSE FILE](https://github.com/syncfusion/react-ui-components/blob/master/license?utm_source=npm&utm_campaign=notification) for more info.

&copy; Copyright 2026 Syncfusion®, Inc. All Rights Reserved. The Syncfusion® Essential Studio® license and copyright applies to this distribution.