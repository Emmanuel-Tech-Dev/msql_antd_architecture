// src/hooks/table/useTableColumns.js

import { useState, useRef, useCallback } from 'react';
import { Button, Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Highlighter from 'react-highlight-words';
import { useDataProvider } from '../../core/provider/DataProvider';

const useTableColumns = ({ isClientSide, tableParams, updateParams }) => {
  const dataProvider = useDataProvider();
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const searchInput = useRef(null);

  const handleSearch = useCallback(
    (selectedKeys, confirm, dataIndex) => {
      confirm();
      const term = selectedKeys[0] ?? '';
      setSearchText(term);
      setSearchedColumn(dataIndex);

      // For online mode: push _like filter into tableParams → triggers refetch
      // For offline mode: same — processedOfflineData in useTableApi picks it up
      updateParams({
        pagination: { ...tableParams.pagination, current: 1 },
        filters: {
          ...tableParams.filters,
          [`${dataIndex}_like`]: term || undefined,
        },
      });
    },
    [tableParams, updateParams],
  );

  const handleReset = useCallback(
    (clearFilters, dataIndex, setSelectedKeys, confirm) => {
      setSelectedKeys([]);
      clearFilters();
      confirm();
      setSearchText('');
      setSearchedColumn('');

      const newFilters = { ...tableParams.filters };
      delete newFilters[`${dataIndex}_like`];

      updateParams({
        pagination: { ...tableParams.pagination, current: 1 },
        filters: newFilters,
      });
    },
    [tableParams, updateParams],
  );

  // ── getColumnSearchProps ──────────────────────────────────────────────────
  // Works for both online and offline.
  // Online:  handleSearch pushes to tableParams → API refetch
  // Offline: handleSearch pushes to tableParams → processedOfflineData filters
  //          onFilter also handles Ant Design's internal filter for extra safety
  const getColumnSearchProps = useCallback(
    (dataIndex) => ({
      filterDropdown: ({
        setSelectedKeys, selectedKeys, confirm, clearFilters, close,
      }) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder={`Search ${dataIndex}`}
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button
              onClick={() =>
                clearFilters && handleReset(clearFilters, dataIndex, setSelectedKeys, confirm)
              }
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                confirm({ closeDropdown: false });
                setSearchText(selectedKeys[0]);
                setSearchedColumn(dataIndex);
              }}
            >
              Filter
            </Button>
            <Button type="link" size="small" onClick={close}>
              Close
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      // onFilter — used by Ant Design for client-side filtering
      // For offline mode this acts as a second safety net alongside processedOfflineData
      // For online mode this always returns true (server handles filtering)
      onFilter: (value, row) => {
        if (!isClientSide) return true;
        return row[dataIndex]
          ?.toString()
          .toLowerCase()
          .includes(value.toLowerCase());
      },
      filterDropdownProps: {
        onOpenChange: (open) => {
          if (open) setTimeout(() => searchInput.current?.select(), 100);
        },
      },
      render: (text) =>
        searchedColumn === dataIndex ? (
          <Highlighter
            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text ? text.toString() : ''}
          />
        ) : (
          text
        ),
    }),
    [searchText, searchedColumn, handleSearch, handleReset, isClientSide],
  );

  // ── setColFilters — fetch distinct values for a column (online only) ──────
  const setColFilters = useCallback(
    async (dataIndex, resource) => {
      if (isClientSide) return; // no API call in offline mode
      if (columnFilters[dataIndex]) return; // already fetched

      try {
        const res = await dataProvider.custom({
          url: `/api/${resource}/filters`,
          method: 'get',
          headers: { 'x-table-config': JSON.stringify({ col: dataIndex }) },
          unwrap: true,
        });

        const filters =
          res?.data?.map((item, index) => ({
            text: item?.[dataIndex],
            value: item?.[dataIndex],
            key: item?.id ?? `${item?.[dataIndex]}-${index}`,
          })) ?? [];

        setColumnFilters((prev) => ({ ...prev, [dataIndex]: filters }));
      } catch (error) {
        console.error('[useTableColumns] Failed to fetch column filters:', error);
      }
    },
    [isClientSide, columnFilters, dataProvider],
  );

  // ── getColumnFilterProps ──────────────────────────────────────────────────
  // Online:  fetches distinct values from API, renders filter dropdown
  // Offline: renders filter dropdown using values derived from the local data
  //          No API call — values are computed from the data already in memory
  const getColumnFilterProps = useCallback(
    (dataIndex, resource, offlineData = null) => {
      if (isClientSide) {
        // Offline filter — derive unique values from the data passed in
        // Caller should pass offlineData (the full localRecord array) so we
        // can build the filter options without an API call
        const uniqueValues = offlineData
          ? [...new Set(offlineData.map((row) => row[dataIndex]).filter(Boolean))]
            .map((val) => ({ text: val, value: val }))
          : [];

        return {
          filters: uniqueValues,
          filterSearch: uniqueValues.length > 6, // search inside filter only if many options
          filterMultiple: true,
          // Ant Design handles onFilter for client-side
          onFilter: (value, row) =>
            String(row[dataIndex] ?? '') === String(value),
        };
      }

      // Online filter — fetch distinct values from API
      return {
        filters: columnFilters[dataIndex] ?? [],
        filterSearch: true,
        filterMultiple: true,
        filteredValues: tableParams.filters?.[dataIndex] ?? null,
        filterDropdownProps: {
          onOpenChange: (open) => {
            if (open) setColFilters(dataIndex, resource);
          },
        },
        onFilter: () => true, // server handles actual filtering
      };
    },
    [isClientSide, columnFilters, tableParams.filters, setColFilters],
  );

  const clearAllFilters = useCallback(() => {
    setSearchText('');
    setSearchedColumn('');
    setColumnFilters({});
    updateParams({
      pagination: { ...tableParams.pagination, current: 1 },
      filters: {},
    });
  }, [tableParams, updateParams]);


  return {
    searchText,
    searchedColumn,
    columnFilters,
    getColumnSearchProps,
    getColumnFilterProps,
    setColFilters,
    clearAllFilters,
  };
};

export default useTableColumns;
