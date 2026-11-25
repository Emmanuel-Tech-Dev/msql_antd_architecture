
import React from 'react'
import { useTheme } from '../hooks/useTheme'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button } from 'antd'

const ThemeToggle = () => {
    const { isDark, toggle } = useTheme()
    return (
        <div>
            <Button icon={isDark ? <MoonOutlined /> : <SunOutlined />} onClick={() => toggle()} />
        </div>
    )
}

export default ThemeToggle