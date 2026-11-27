export const ADMIN_ENTRY_PATH = '/admin';

const NON_DESTINATION_PATHS = new Set([
    '/admin/404',
    '/404',
    '/login',
    '/otp_request',
    '/verify_otp',
]);

const AREA_NAME = /^[A-Za-z0-9_-]+$/;
let workspaceAreas = [ADMIN_ENTRY_PATH];

// The signed-in areas: /admin always, plus the names given to
// <FrameworkApp areas>, so { finance } adds /finance.
export function setWorkspaceAreas(names = []) {
    for (const name of names) {
        if (!AREA_NAME.test(name)) {
            throw new Error(`[Framework] Area name "${name}" must be one path segment: letters, digits, _ or -`);
        }
    }
    workspaceAreas = [...new Set([ADMIN_ENTRY_PATH, ...names.map((name) => `/${name}`)])];
}

export function workspaceAreaOf(path) {
    const value = String(path ?? '');
    return workspaceAreas.find((area) => value === area || value.startsWith(`${area}/`)) ?? null;
}

export function isWorkspacePath(path) {
    return workspaceAreaOf(path) !== null;
}

export function isWorkspaceArea(path) {
    return workspaceAreas.includes(path);
}

// A page path as stored on a resource: "invoices" is short for
// "/admin/invoices", and a path starting with "/" is used as written, so
// "/admin/invoices" and "/finance/payroll" keep working.
export function toRoutePath(path, prefix = ADMIN_ENTRY_PATH) {
    const cleaned = String(path ?? '').trim().replace(/\/+$/, '');
    if (!cleaned) return null;
    return cleaned.startsWith('/') ? cleaned : `${prefix}/${cleaned}`;
}

export function resolvePostLoginPath(candidate) {
    const path = String(candidate ?? '').trim();
    if (!isWorkspacePath(path) || NON_DESTINATION_PATHS.has(path)) {
        return ADMIN_ENTRY_PATH;
    }
    return path;
}

// The first page by sidebar order; with an area ("/finance"), the first page inside it.
export function firstAccessibleRoute(browserRoutes = [], area = null) {
    return [...browserRoutes]
        .filter((route) => route?.resource_path && route.resource_path !== '/admin/404')
        .filter((route) => !area || workspaceAreaOf(route.resource_path) === area)
        .sort(
            (left, right) =>
                (left.order ?? left.display_order ?? Number.MAX_SAFE_INTEGER)
                - (right.order ?? right.display_order ?? Number.MAX_SAFE_INTEGER),
        )[0]?.resource_path ?? null;
}
