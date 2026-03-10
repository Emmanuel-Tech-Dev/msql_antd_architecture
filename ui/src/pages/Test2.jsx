import React from 'react'
import useDynamicFilter, { FILTER_TYPES } from '../hooks/useDynamicFilter';

const Test2 = () => {
    // ─── horizontal bar (mercor style) ───────────────────────────────────────────
    // const filters = useDynamicFilter({
    //     variant: 'horizontal',
    //     mode: 'server',
    //     persistence: 'url',
    //     showSearch: true,
    //     onChange: (active) => console.log(active),
    //     filters: [
    //         {
    //             key: 'domain',
    //             label: 'Domain',
    //             type: FILTER_TYPES.TAG,
    //             options: ['Engineering', 'Design', 'Data', 'Marketing'],
    //         },
    //         {
    //             key: 'type',
    //             label: 'Type',
    //             type: FILTER_TYPES.RADIO,
    //             optionType: 'button',
    //             options: [
    //                 { label: 'Full-time', value: 'full' },
    //                 { label: 'Part-time', value: 'part' },
    //             ],
    //         },
    //         {
    //             key: 'salary',
    //             label: 'Salary',
    //             type: FILTER_TYPES.RANGE,
    //             range: [0, 200000],
    //             formatter: (v) => `$${v.toLocaleString()}`,
    //         },
    //         {
    //             key: 'posted',
    //             label: 'Posted',
    //             type: FILTER_TYPES.DATE_RANGE,
    //         },
    //     ],
    // });

    // return (
    //     <div>
    //         {filters.horizontalBarJSX}
    //         <JobList data={filters.filteredData} />
    //     </div>
    // );

    // ─── inline sidebar (e-commerce style) ───────────────────────────────────────
    // const filters = useDynamicFilter({
    //     variant: 'sidebar',
    //     mode: 'client',
    //     data: products,
    //     persistence: 'state',
    //     filters: [
    //         { key: 'category', label: 'Category', type: FILTER_TYPES.CHECKBOX, options: ['Shoes', 'Bags', 'Tops'] },
    //         { key: 'price', label: 'Price', type: FILTER_TYPES.RANGE, range: [0, 1000], formatter: (v) => `$${v}` },
    //         { key: 'inStock', label: 'In Stock', type: FILTER_TYPES.SWITCH },
    //         { key: 'brand', label: 'Brand', type: FILTER_TYPES.SELECT, options: [...] },
    //     ],
    // });

    // return (
    //     <div style={{ display: 'flex', gap: 24 }}>
    //         {filters.inlineSidebarJSX}       {/* left panel */}
    //         <ProductGrid data={filters.filteredData} />
    //     </div>
    // );

    // ─── drawer trigger (mobile / overlay style) ──────────────────────────────────
    return (
        // <div>
        //     {filters.sidebarJSX}             {/* button + drawer */}
        //     <ProductGrid data={filters.filteredData} />
        // </div>

        <div>
            {/* {filters.inlineSidebarJSX} */}
            {/* <JobList data={filters.filteredData} /> */}
        </div>
    );
}

export default Test2