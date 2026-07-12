export const ADMIN_ENTRY_PATH = '/admin';

const NON_DESTINATION_PATHS = new Set([
    '/admin/404',
    '/404',
    '/login',
    '/otp_request',
    '/verify_otp',
]);

export function resolvePostLoginPath(candidate) {
    const path = String(candidate ?? '').trim();
    if (!path.startsWith('/admin') || NON_DESTINATION_PATHS.has(path)) {
        return ADMIN_ENTRY_PATH;
    }
    return path;
}

export function firstAccessibleRoute(browserRoutes = []) {
    return [...browserRoutes]
        .filter((route) => route?.resource_path && route.resource_path !== '/admin/404')
        .sort(
            (left, right) =>
                (left.order ?? left.display_order ?? Number.MAX_SAFE_INTEGER)
                - (right.order ?? right.display_order ?? Number.MAX_SAFE_INTEGER),
        )[0]?.resource_path ?? null;
}
