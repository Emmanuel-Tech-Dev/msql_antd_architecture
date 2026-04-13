import { CalendarOutlined, ExportOutlined, FilterOutlined, ReloadOutlined, SortAscendingOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Input, Space, Table } from 'antd'
import React from 'react'
import utils from '../utils/function_utils'

const CustomTable = ({ tableConfig, columns }) => {
    return (
        <Card className='' styles={{
            body: {
                padding: "0px"
            }
        }}>
            <Card >
                <div className='flex items-center justify-between'>
                    <div>
                        <Input.Search
                            placeholder="Search..."
                            onSearch={(v) => tableConfig.handleGlobalSearch(v)}   // → appends ?search=term → hits fullTextSearch
                            className='!w-100 '

                        />

                    </div>


                    <Space>
                        <div className='flex gap-2 items-center'>
                            <Button icon={<ReloadOutlined />} onClick={() => tableConfig.runRequest()} />
                            <Button icon={<ExportOutlined />} />


                        </div>
                        <Divider vertical />
                        <Button>
                            <CalendarOutlined />
                            <span>{utils.getCurrentDate()}</span>
                        </Button>
                    </Space>
                </div>
            </Card>



            <Table {...tableConfig?.tableProps} columns={columns} />



        </Card>
    )
}

export default CustomTable