import { CalendarOutlined, FilterOutlined, ReloadOutlined, SortAscendingOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Input, Space, Table } from 'antd'
import React from 'react'
import utils from '../utils/function_utils'

const CustomTable = ({ tableConfig, columns }) => {
    return (
        <div className=''>
            <Card >
                <div className='flex items-center justify-between'>
                    <div>
                        <Input.Search
                            placeholder="Search..."
                            onSearch={(v) => tableConfig.handleGlobalSearch(v)}   // → appends ?search=term → hits fullTextSearch
                            className='!w-100 '

                        />
                        <Button icon={<ReloadOutlined />} className='ml-3' onClick={() => tableConfig.runRequest()} />
                    </div>


                    <Space>
                        <div className='flex gap-2 items-center'>
                            <Button icon={<FilterOutlined />} />
                            <Button icon={<SortAscendingOutlined />} />


                        </div>
                        <Divider vertical />
                        <Button>
                            <CalendarOutlined />
                            <span>{utils.getCurrentDate()}</span>
                        </Button>
                    </Space>
                </div>
            </Card>

            <div
                className='!mt-5'
                styles={{
                    body: {
                        padding: "0px"
                    }
                }}
            >

                <Table {...tableConfig?.tableProps} columns={columns} />


            </div>
        </div>
    )
}

export default CustomTable