import React, { useEffect } from 'react'

import useApi from '../../hooks/useApi'
import { Avatar, List } from 'antd'
import { UserOutlined } from '@ant-design/icons'

const UserLists = ({ role_name }) => {

    const { data, loading, run } = useApi('get', `/access/users/${role_name}`, {})


    // console.log(loading, data.data)

    useEffect(() => {
        run();
    }, [role_name])
    return (
        <div>
            <List
                className='h-[100dvh]'
                size="small"
                header={<div>Users</div>}
                bordered
                dataSource={data?.data || []}
                renderItem={item => <List.Item>
                    <div className='flex gap-2 items-center'>
                        <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                        <div>
                            <h1 className='font-semibold'>{item?.name}</h1>
                            <p className='text-xs text-slate-600'>{item?.email}</p>
                        </div>

                    </div>
                </List.Item>}
            />
        </div>
    )
}

export default UserLists