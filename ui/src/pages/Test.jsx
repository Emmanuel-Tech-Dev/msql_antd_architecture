// components/UsersTable.jsx

import { useEffect } from "react";
import useTableApi from "../hooks/useTableApi";
import { Button, Calendar, Input, Space, Table } from "antd";
import { useState } from "react";
import CustomTable from "../components/CustomTable";
import useDelete from "../hooks/useDelete";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import useApi from "../hooks/useApi";
import useCalendar from "../hooks/useCalender";
import useDrawer from "../hooks/useDrawer";
import useModal from "../hooks/useModal";
import useLocalForage, { DRIVERS } from "../hooks/useLocalForage";
import useMasonry from "../hooks/useMasonary";
import useAdd from "../hooks/useAdd";
import Settings from "../utils/Settings";
import useEdit from "../hooks/useEdit";
import ValuesStore from "../store/values-store"



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




export default function Test() {
    const valuesStore = ValuesStore()
    const addDataForms = useAdd("tables_metadata", "table_name")
    const edit = useEdit("tables_metadata", "table_name")

    const table = useTableApi({
        pagination: {
            currentPage: 1,
            pageSize: 10,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }
    }, {
        manual: true,
        // loadingDelay: 300
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
    const { confirm, saveCompleted } = useDelete({ resource: "admin" });
    // const { data, loading, run: fetchNewData } = useApi("get", "admin_roles")
    ;

    // const storage = useLocalForage({
    //     name: 'app',
    //     storeName: 'adminRoles',
    //     driver: DRIVERS.INDEXEDDB,
    // });



    const cal = useCalendar("basic", {
        notes: {
            '2026-03-08': [{ id: 1, title: 'Team meeting', type: 'warning' }],
            '2026-03-15': [{ id: 2, title: 'Release day', type: 'error' }],
        },
        onDateSelect: (date, { notes, events }) => {
            const formatted = date.format('YYYY-MM-DD');
            // setClickedDate(formatted);
            // setDrawerOpen(true);
            // fetchDayData(formatted); // ✅ fetch on click
            console.log(formatted)
        },
    });

    const drawer = useDrawer({ resizable: true, width: 500 });
    const modal = useModal({ draggable: true, width: 300 });




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
            dataIndex: "custom_id",
            key: "custome_id",
            // filteredValue: "role_name",
            // ...table.getColumnFilterProps("custom_id", "admin")
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
        {
            title: 'Action',
            render: (_, record) => {
                return (
                    <Space>

                        <Button type=""
                            onClick={(e) => editRecord(record, "admin")}
                            icon={<EditOutlined />}
                        />


                        {confirm(
                            record.id,
                            'Delete this user?',
                            <Button type="primary" danger icon={<DeleteOutlined />} />,
                            (success) => {
                                if (success) console.log('deleted');
                            }
                        )}
                    </Space>
                )
            }


            ,
        },
    ];



    function editRecord(record, tableName) {
        const storeKey = "editableRecord";
        valuesStore.setValue(storeKey, record);
        edit.setTblName(tableName);
        edit.setData(record);
        edit.setRecordKey(storeKey);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
    }


    function openAddModal(tableName = "admin") {
        addDataForms.setTblName(tableName)
        addDataForms.setShowModal(true)
        addDataForms.setSaveCompleted(false)
    }

    useEffect(() => {
        //table.setRecord(result)
        console.log("initialized..")
        table.setAllowSelection(true)
        // table.setColFilters("custom_id", `admin`)
        // table.runRequest()
    }, [])


    // console.log(data)

    useEffect(() => {
        if (saveCompleted) {
            table.runRequest(true)
        };
    }, [saveCompleted])

    //console.log(table.selectedRows)

    // console.log(data, loading)
    useEffect(() => {

        //  fetchNewData();
    }, []);



    // useEffect(() => {
    //     // console.log('data changed:', data);          // ← is data arriving?
    //     // console.log('data.result:', data?.data.result);   // ← does result exist?

    //     const fetch = async () => {
    //         await storage.setItem("adminRoles", data.data.result)
    //             // .then((val) => console.log('saved to indexedDB ✅', val))  // ← did it save?
    //             // .catch((err) => console.error('save failed ❌', err));
    //     }
    //     if (data?.data) {
    //         // ← any error?
    //         fetch()
    //     }
    // }, [data]);

    // useEffect(() => {
    //   const debug = async () => {
    //     // ✅ check which driver is actually being used
    //     console.log('driver:', storage.getDriver());

    //     // ✅ check if anything is in the store at all
    //     const all = await storage.getAll();
    //     console.log('all items in store:', all);

    //     // ✅ check keys
    //     const keys = await storage.keys();
    //     console.log('keys:', keys);

    //     // ✅ try a manual set and get
    //     await storage.setItem('test', { hello: 'world' });
    //     const test = await storage.getItem('test');
    //     console.log('test item:', test);
    //   };

    //   debug();
    // }, [])

    const gallery = useMasonry('dynamic', {
        columns: 3,
        gutter: 16,
        initialItems: [
            { id: 1, title: 'Card 1', description: 'Some text', height: 20 },
            { id: 2, title: 'Card 2', description: 'More text', height: 300 },
            { id: 3, title: 'Card 3', description: 'More text', height: 400 },
            { id: 4, title: 'Card 4', description: 'More text', height: 360 },
            { id: 8, title: 'Card 8', description: 'More text', height: 530 },
            { id: 5, title: 'Card 5', description: 'More text', height: 120 },
            { id: 6, title: 'Card 6', description: 'More text', height: 80 },
            { id: 7, title: 'Card 6', description: 'More text', height: 50 },
        ],
    });


    function saveOnOk() {
        addDataForms.save("admin")

    }


    return (
        <>
            <Button onClick={() => drawer.openDrawer({
                title: 'Edit User',
                content:
                    "Teststseteshshs",
                extra: (
                    <Space>
                        <Button onClick={drawer.closeDrawer}>Cancel</Button>
                        {/* <Button type="primary" onClick={handleSave}>Save</Button> */}
                    </Space>
                ),
            })}>Testing Click</Button>

            <Button onClick={() => modal.openModal({
                title: 'Drag me',        // ← hover title to drag
                content: "tehisgsgsgsdhs",
                onOk: async () => console.log("testing"),
            })}>Testing Click 2</Button>

            <Button
                onClick={() => openAddModal()}
            ></Button>

            {/* 
      <Input.Search
        placeholder="Search..."
        onSearch={(v) => table.handleGlobalSearch(v)}   // → appends ?search=term → hits fullTextSearch
      />

      <Table  {...table.tableProps} columns={columns} /> */}

            <CustomTable tableConfig={table} columns={columns} />


            {/* <Calendar {...cal.calendarProps} /> */}
            {drawer.drawerJSX()}
            {modal.modalJSX()}
            {/* {gallery.masonryJSX()} */}
            {addDataForms.addModal("Add Testing Hook", saveOnOk)}
            {edit.editModal("Edit Card")}

            {/* <AppLayout /> */}
        </>
    );
}