import React from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { financePalette } from '../../theme/financePalette'

const Header = ({ palette = financePalette }) => {
    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b px-4 md:px-8" style={{ backgroundColor: palette.surface, borderColor: palette.outlineVariant }}>
            <div className="hidden max-w-md flex-1 items-center gap-2 md:flex">
                <div className="relative w-full">
                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: palette?.outline }} />
                    <input
                        className="w-full rounded border bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#1e00a9]"
                        style={{ borderColor: palette?.outlineVariant }}
                        placeholder="Search portfolios, tickers..."
                    />
                </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
                <div className="hidden text-right sm:block">
                    <p className="m-0 text-xs font-bold">Exchange Rate</p>
                    <p className="m-0 text-[10px] font-bold" style={{ color: palette.primary }}>
                        {/* 1 USD = {roundMoney(usdGhsRate || 0)} GHS */}
                    </p>
                </div>
            </div>
        </header>
    )
}

export default Header
