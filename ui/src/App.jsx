// components/UsersTable.jsx

import { useEffect } from "react";
import useTableApi from "./hooks/useTableApi";
import { Button, Input, Table } from "antd";
import { useState } from "react";
import CustomTable from "./components/CustomTable";


const result = [
  {
    id: 9,
    custom_id: "REG20251223388396",
    name: "Root User",
    email: "emmanuelkusi345@gmail.com",
    phone_no: null,
    role: "admin",
    status: "active",
    created_at: "2025-12-23T10:00:00.000Z",
  },
  {
    id: 11,
    custom_id: "REG20251223215723",
    name: "John Doe",
    email: "johndoe@gmail.com",
    phone_no: "0241234567",
    role: "user",
    status: "active",
    created_at: "2025-12-23T11:00:00.000Z",
  },
  {
    id: 13,
    custom_id: "REG20251224123456",
    name: "Jane Smith",
    email: "janesmith@gmail.com",
    phone_no: "0551234567",
    role: "user",
    status: "inactive",
    created_at: "2025-12-24T09:00:00.000Z",
  },
  {
    id: 14,
    custom_id: "REG20251231542539",
    name: "testme",
    email: "emmanuelkusi3@gmail.com",
    phone_no: null,
    role: "user",
    status: "active",
    created_at: "2025-12-31T08:00:00.000Z",
  },
]




export default function App() {

  const table = useTableApi({
    pagination: {
      currentPage: 1,
      pageSize: 10,
      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
    }
  }, {
    manual: true,
    loadingDelay: 4000
  },
    "id", {
    // tableConfig — maps to every applyQueryParams option
    table: "admin",
    maxLimit: 100,
    defaultLimit: 10,
    // exclude: ["ssn"],
    //searchable: ["name", "email"],
    fullTextSearch: {
      enabled: true,
      columns: ["name", "email"],
      mode: "BOOLEAN",
      withScore: true,
      table: "admin"
    },
    filterable: ["id , name"]

  }
  )

    ;

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      sorter: true
    },
    {
      title: "Role",
      dataIndex: "role_name",
      key: "role_name",
      // filteredValue: "role_name",
      ...table.getColumnFilterProps("role_name", "admin_roles")
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ...table.getColumnSearchProps("name")
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",

    },
    {
      title: "Phone No",
      dataIndex: "phone_no",
      key: "phone_no",
      render: (val) => val ?? "N/A",
    },
    // {
    //   title: "Action",
    //   key: "action",
    //   render: (_, record) => (
    //     // <Space>
    //     //   <Button type="link" onClick={() => handleEdit(record)}>Edit</Button>
    //     //   <Button type="link" danger onClick={() => handleDelete(record)}>Delete</Button>
    //     // </Space>
    //   ),
    // },
  ];


  useEffect(() => {
    //table.setRecord(result)
    table.setAllowSelection(true)
    // table.setColFilters("role_name", `admin_roles`)
    table.runRequest()
  }, [])

  //console.log(table.selectedRows)

  return (
    <>
      <Button onClick={() => table.runRequest(true)}>Testing Click</Button>
      testing
      {/* 
      <Input.Search
        placeholder="Search..."
        onSearch={(v) => table.handleGlobalSearch(v)}   // → appends ?search=term → hits fullTextSearch
      />

      <Table  {...table.tableProps} columns={columns} /> */}

      <CustomTable tableConfig={table} columns={columns} />
    </>
  );
}