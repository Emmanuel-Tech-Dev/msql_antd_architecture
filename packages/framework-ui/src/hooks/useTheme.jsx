import { useContext } from 'react'
import ThemeCtx from "../utils/ThemeProvider"

export function useTheme() {
    return useContext(ThemeCtx)
}