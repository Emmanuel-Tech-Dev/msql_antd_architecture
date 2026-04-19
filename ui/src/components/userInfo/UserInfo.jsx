import React, { useEffect } from 'react'
import useNotification from '../../hooks/useNotification'
import { Tabs } from 'antd'

const UserInfo = ({ user }) => {
    console.log(user)
    const { alert, AlertJsx } = useNotification()


    useEffect(() => {
        alert.warning("This is a demo application. The user information displayed here is for demonstration purposes only and does not include actual authentication or authorization mechanisms. Please do not use real user data when testing these features.")
    }, [])


    const TAB = [
        {
            key: 'profile',
            label: 'User Profile',
            content: <>
                Testing for users
            </>
        },
        {
            key: 'access',
            label: 'Access Summary',
            content: <>
                Testing for users
            </>
        }
    ]


    return (
        <div>
            <AlertJsx />

            <Tabs items={TAB} />


        </div>
    )
}

export default UserInfo