import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Every new page opens at the top instead of keeping the previous page's
// scroll position. Runs before paint so the old position never flashes.
const useScrollToTop = () => {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [pathname]);
};

export default useScrollToTop;
