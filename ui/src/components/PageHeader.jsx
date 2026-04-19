

import { Breadcrumb, Button, Space } from 'antd'
import React from 'react'

export const PageHeader = ({ header, items, children }) => {
    return (
        <div className=" py-2 w-full rounded-lg flex items-center justify-between  ">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">{header}</h1>
                <Breadcrumb
                    items={items}
                />
            </div>

            <Space size="small">
                {children}
            </Space>

        </div>
    )
}
