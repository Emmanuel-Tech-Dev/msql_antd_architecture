// src/hooks/table/useTableColumns.js

import { useState, useRef, useCallback } from "react";
import { Button, Input, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { apiRequest } from "../../services/apiClient";
import Settings from "../../utils/Settings";

const useTableColumns = ({ isClientSide, tableParams, updateParams, run }) => {
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const searchInput = useRef(null);

  const handleSearch = useCallback(
    (selectedKeys, confirm, dataIndex) => {
      confirm();
      const term = selectedKeys[0] ?? "";
      setSearchText(term);
      setSearchedColumn(dataIndex);

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
    (clearFilters, dataIndex) => {
      clearFilters();
      setSearchText("");
      setSearchedColumn("");

      const newFilters = { ...tableParams.filters };
      delete newFilters[`${dataIndex}_like`];

      updateParams({
        pagination: { ...tableParams.pagination, current: 1 },
        filters: newFilters,
      });
    },
    [tableParams, updateParams],
  );

  const getColumnSearchProps = useCallback(
    (dataIndex) => ({
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
        close,
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
            style={{ marginBottom: 8, display: "block" }}
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
                clearFilters && handleReset(clearFilters, dataIndex)
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
        <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
      ),
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
            highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
            searchWords={[searchText]}
            autoEscape
            textToHighlight={text ? text.toString() : ""}
          />
        ) : (
          text
        ),
    }),
    [searchText, searchedColumn, handleSearch, handleReset, isClientSide],
  );

  const setColFilters = useCallback(
    async (dataIndex, resource) => {
      if (isClientSide) return;
      if (columnFilters[dataIndex]) return;

      try {
        const res = await apiRequest(
          "get",
          `${Settings.baseUrl}/api/${resource}/filters`,
          null,
          { headers: { "x-table-config": JSON.stringify({ col: dataIndex }) } },
        );

        const filters =
          res?.data?.map((item, index) => ({
            text: item?.[dataIndex],
            value: item?.[dataIndex],
            key: item?.id ?? `${item?.[dataIndex]}-${index}`,
          })) ?? [];

        setColumnFilters((prev) => ({ ...prev, [dataIndex]: filters }));
      } catch (error) {
        console.error(
          "[useTableColumns] Failed to fetch column filters:",
          error,
        );
      }
    },
    [isClientSide, columnFilters],
  );

  const getColumnFilterProps = useCallback(
    (dataIndex, resource) => {
      if (isClientSide) return {};
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
        onFilter: () => true,
      };
    },
    [isClientSide, columnFilters, tableParams.filters, setColFilters],
  );

  return {
    searchText,
    searchedColumn,
    columnFilters,
    getColumnSearchProps,
    getColumnFilterProps,
    setColFilters,
  };
};

export default useTableColumns;
