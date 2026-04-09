// src/hooks/table/useRowSelection.js

import { useState, useMemo } from "react";
import { Table } from "antd";

const useRowSelection = () => {
  const [allowSelection, setAllowSelection] = useState(false);
  const [selectionType, setSelectionType] = useState("checkbox");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentSelectedRow, setCurrentSelectedRow] = useState();

  const rowSelectionConfig = useMemo(() => {
    if (!allowSelection) return null;

    return {
      type: selectionType,
      selectedRowKeys,
      selections: [
        Table.SELECTION_ALL,
        Table.SELECTION_INVERT,
        Table.SELECTION_NONE,
      ],
      onChange: (keys, rows) => {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
      },
      onSelect: (record, selected, rows, nativeEvent) => {
        setCurrentSelectedRow({ record, selected, rows, nativeEvent });
      },
      onSelectAll: (selected, rows) => {
        setSelectedRows(rows);
      },
    };
  }, [allowSelection, selectionType, selectedRowKeys]);

  return {
    allowSelection,
    setAllowSelection,
    selectionType,
    setSelectionType,
    selectedRowKeys,
    setSelectedRowKeys,
    selectedRows,
    setSelectedRows,
    currentSelectedRow,
    setCurrentSelectedRow,
    rowSelectionConfig,
  };
};

export default useRowSelection;
