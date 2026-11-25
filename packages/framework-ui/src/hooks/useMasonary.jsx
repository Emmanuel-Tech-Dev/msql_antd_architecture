// hooks/useMasonry.js
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Masonry, Image, Card, Skeleton, Empty } from 'antd';
import useApi from './useApi';

/**
 * useMasonry
 *
 * Variants:
 *  - 'basic'       → fixed columns, static items
 *  - 'responsive'  → columns adapt to breakpoints
 *  - 'image'       → image gallery with dynamic height on load
 *  - 'dynamic'     → items can be added/removed/pinned
 *  - 'custom'      → full control via itemRender + classNames + styles
 *
 * @param {string} variant  - 'basic' | 'responsive' | 'image' | 'dynamic' | 'custom'
 * @param {object} options  - configuration options
 */
const useMasonry = (variant = 'basic', options = {}) => {
    const {
        // data
        initialItems = [],
        url,

        // layout
        columns = 3,
        gutter = 8,
        fresh = false,

        // item field mapping
        imageKey = 'src',
        titleKey = 'title',
        descriptionKey = 'description',
        heightKey = 'height',
        keyField = 'id',

        // callbacks
        onItemClick,
        onLayoutChange,
        onLoad,
        onError,

        // custom render
        itemRender,

        // styles
        classNames,
        styles,
    } = options;

    // ─── Normalize to MasonryItem shape ───────────────────────────────────
    // ✅ useCallback so it's stable across renders
    const normalizeItems = useCallback((data) => {
        return data.map((item, index) => ({
            key: item[keyField] ?? item.key ?? index,
            height: item[heightKey] ?? item.height ?? undefined,
            column: item.column ?? undefined,
            data: item,
        }));
    }, [keyField, heightKey]);

    // ─── Derive normalized initial items via useMemo ───────────────────────
    // ✅ no useEffect needed — recalculates when initialItems changes
    const normalizedInitialItems = useMemo(
        () => normalizeItems(initialItems),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [normalizeItems, JSON.stringify(initialItems)]
    );

    // ─── State ────────────────────────────────────────────────────────────
    const [items, setItems] = useState(normalizedInitialItems);
    const [loading, setLoading] = useState(!!url); // ✅ true immediately if url provided
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [layout, setLayout] = useState([]);

    // ─── API fetch ────────────────────────────────────────────────────────
    const { run: fetchData } = useApi('get', url || '', {
        manual: true,
        onSuccess: (res) => {
            const raw = res?.data?.result || res?.data || res?.result || [];
            const normalized = normalizeItems(raw);
            setItems(normalized);
            setLoading(false);
            onLoad?.(normalized);
        },
        onError: (err) => {
            const msg = err?.message || 'Failed to load items';
            setError(msg);
            setLoading(false);
            onError?.(err);
        },
    });

    // ─── Fetch on mount if url provided ───────────────────────────────────
    // ✅ no setState inside effect body — fetchData handles its own state via onSuccess/onError
    useEffect(() => {
        if (url) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Sync initialItems when they change externally (no url) ───────────
    // ✅ useMemo derives normalizedInitialItems — effect just syncs to state
    useEffect(() => {
        if (!url) setItems(normalizedInitialItems);
    }, [normalizedInitialItems, url]);

    // ─── Manual reload ────────────────────────────────────────────────────
    const load = useCallback(() => {
        if (url) {
            setLoading(true);
            setError(null);
            fetchData();
        } else {
            setItems(normalizedInitialItems);
        }
    }, [url, fetchData, normalizedInitialItems]);

    // ─── Item management (dynamic variant) ────────────────────────────────

    const addItem = useCallback((item) => {
        setItems((prev) => [
            ...prev,
            {
                key: item[keyField] ?? item.key ?? Date.now(),
                height: item[heightKey] ?? item.height ?? undefined,
                column: item.column ?? undefined,
                data: item,
            },
        ]);
    }, [keyField, heightKey]);

    const removeItem = useCallback((key) => {
        setItems((prev) => prev.filter((item) => item.key !== key));
    }, []);

    const updateItem = useCallback((key, changes) => {
        setItems((prev) => prev.map((item) =>
            item.key === key
                ? { ...item, ...changes, data: { ...item.data, ...changes } }
                : item
        ));
    }, []);

    const pinItemToColumn = useCallback((key, column) => {
        setItems((prev) => prev.map((item) =>
            item.key === key ? { ...item, column } : item
        ));
    }, []);

    const clearItems = useCallback(() => setItems([]), []);

    const reorderItems = useCallback((newItems) => {
        setItems(normalizeItems(newItems));
    }, [normalizeItems]);

    // ─── Image load handler ────────────────────────────────────────────────
    const handleImageLoad = useCallback((key, e) => {
        const { naturalHeight, naturalWidth, offsetWidth } = e.target;
        if (!naturalHeight || !naturalWidth) return;
        const aspectRatio = naturalHeight / naturalWidth;
        const calculatedHeight = Math.round(offsetWidth * aspectRatio);
        setItems((prev) => prev.map((item) =>
            item.key === key ? { ...item, height: calculatedHeight } : item
        ));
    }, []);

    // ─── Selection ────────────────────────────────────────────────────────
    const handleItemClick = useCallback((item) => {
        setSelectedItem(item);
        onItemClick?.(item);
    }, [onItemClick]);

    // ─── Built-in renderers ───────────────────────────────────────────────

    const basicItemRender = useCallback((item) => (
        <Card
            size="small"
            hoverable
            onClick={() => handleItemClick(item)}
            style={{ cursor: 'pointer', height: '100%' }}
        >
            <Card.Meta
                title={item.data?.[titleKey]}
                description={item.data?.[descriptionKey]}
            />
        </Card>
    ), [handleItemClick, titleKey, descriptionKey]);

    const imageItemRender = useCallback((item) => {
        const src = item.data?.[imageKey] || item[imageKey];
        return (
            <div
                style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden' }}
                onClick={() => handleItemClick(item)}
            >
                <Image
                    src={src}
                    alt={item.data?.[titleKey] || ''}
                    width="100%"
                    style={{ display: 'block' }}
                    onLoad={(e) => handleImageLoad(item.key, e)}
                    placeholder={
                        <Skeleton.Image
                            active
                            style={{ width: '100%', height: item.height || 200 }}
                        />
                    }
                />
                {item.data?.[titleKey] && (
                    <div style={{
                        padding: '6px 8px',
                        background: 'rgba(0,0,0,0.45)',
                        color: '#fff',
                        fontSize: 12,
                        marginTop: -28,
                        position: 'relative',
                    }}>
                        {item.data[titleKey]}
                    </div>
                )}
            </div>
        );
    }, [handleItemClick, handleImageLoad, imageKey, titleKey]);

    // ─── Resolve columns ──────────────────────────────────────────────────
    const resolvedColumns = useMemo(() => {
        if (variant === 'responsive') {
            return typeof columns === 'object'
                ? columns
                : { xs: 1, sm: 2, md: columns };
        }
        return columns;
    }, [variant, columns]);

    // ─── Resolve gutter ───────────────────────────────────────────────────
    const resolvedGutter = useMemo(() => {
        if (variant === 'responsive' && typeof gutter === 'number') {
            return { xs: gutter / 2, sm: gutter, md: gutter };
        }
        return gutter;
    }, [variant, gutter]);

    // ─── Resolve item renderer ────────────────────────────────────────────
    const resolvedItemRender = useMemo(() => {
        if (itemRender) return itemRender;
        if (variant === 'image') return imageItemRender;
        return basicItemRender;
    }, [variant, itemRender, imageItemRender, basicItemRender]);

    // ─── Masonry props ────────────────────────────────────────────────────
    const masonryProps = useMemo(() => ({
        items,
        columns: resolvedColumns,
        gutter: resolvedGutter,
        fresh: variant === 'image' ? true : fresh,
        itemRender: resolvedItemRender,
        classNames,
        styles,
        onLayoutChange: (newLayout) => {
            setLayout(newLayout);
            onLayoutChange?.(newLayout);
        },
    }), [
        items, resolvedColumns, resolvedGutter,
        fresh, variant, resolvedItemRender,
        classNames, styles, onLayoutChange,
    ]);

    // ─── JSX ──────────────────────────────────────────────────────────────
    const masonryJSX = useCallback((overrides = {}) => {
        // ✅ skeleton while loading
        if (loading && items.length === 0) {
            return (
                <Masonry
                    columns={resolvedColumns}
                    gutter={resolvedGutter}
                    items={Array.from({ length: 6 }, (_, i) => ({
                        key: `skeleton-${i}`,
                        height: [200, 150, 250, 180, 220, 160][i],
                        children: (
                            <Skeleton
                                active
                                style={{ height: '100%' }}
                            />
                        ),
                    }))}
                />
            );
        }

        // ✅ empty state
        if (!loading && items.length === 0) {
            return <Empty description="No items to display" />;
        }

        return <Masonry {...masonryProps} {...overrides} />;
    }, [loading, items, masonryProps, resolvedColumns, resolvedGutter]);

    return {
        // state
        items,
        loading,
        error,
        selectedItem,
        layout,
        // data actions
        setItems,
        load,
        addItem,
        removeItem,
        updateItem,
        pinItemToColumn,
        clearItems,
        reorderItems,
        // helpers
        normalizeItems,
        handleItemClick,
        handleImageLoad,
        // props + jsx
        masonryProps,
        masonryJSX,
    };
};

export default useMasonry;



/*  

// ─── Basic ─────────────────────────────────────────────────────────────────
const gallery = useMasonry('basic', {
    columns: 3,
    gutter: 16,
    initialItems: [
        { id: 1, title: 'Card 1', description: 'Some text', height: 200 },
        { id: 2, title: 'Card 2', description: 'More text', height: 300 },
    ],
});
{gallery.masonryJSX()}

// ─── Responsive ────────────────────────────────────────────────────────────
const gallery = useMasonry('responsive', {
    url: 'gallery/items',
    columns: { xs: 1, sm: 2, md: 3 },
    gutter: { xs: 8, sm: 12, md: 16 },
});
{gallery.masonryJSX()}

// ─── Image gallery ─────────────────────────────────────────────────────────
const gallery = useMasonry('image', {
    url: 'gallery/images',
    imageKey: 'url',
    titleKey: 'caption',
    columns: { xs: 1, sm: 2, md: 3 },
    gutter: 12,
    onItemClick: (item) => modal.openModal({
        title: item.data.caption,
        content: <Image src={item.data.url} width="100%" />,
        footer: null,
    }),
});
{gallery.masonryJSX()}

// ─── Dynamic ───────────────────────────────────────────────────────────────
const gallery = useMasonry('dynamic', { columns: 3, gutter: 8 });

// add
gallery.addItem({ id: Date.now(), title: 'New', height: 200 });
// remove
gallery.removeItem(itemKey);
// pin to column
gallery.pinItemToColumn(itemKey, 2);
// update
gallery.updateItem(itemKey, { title: 'Updated title' });

// ─── Custom render ─────────────────────────────────────────────────────────
const gallery = useMasonry('custom', {
    url: 'gallery/items',
    columns: 4,
    gutter: 12,
    itemRender: (item) => (
        <Card hoverable cover={<img src={item.data.url} alt={item.data.title} />}>
            <Card.Meta title={item.data.title} description={item.data.desc} />
        </Card>
    ),
    classNames: { root: 'my-masonry', item: 'my-masonry-item' },
    styles: { root: { padding: 16 }, item: { borderRadius: 8 } },
    onLayoutChange: (layout) => console.log('layout changed', layout),
});
{gallery.masonryJSX()}

*/