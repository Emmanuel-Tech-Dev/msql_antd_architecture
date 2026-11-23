import { Link } from 'react-router-dom';
import useCan from '../../core/hooks/access/useCan';

// Shows its children only when the person may do this. `permission` is a
// permission name such as 'manage:invoices', or an access request such as
// { resource: '/api/v1/invoices/:id', action: 'DELETE' }. The server checks
// the same rule; this only keeps people from seeing what they cannot use.
export function Can({ permission, fallback = null, children }) {
    return useCan(permission) ? children : fallback;
}

// A link to another page that becomes plain text when that page is not
// assigned to the person, so they never land on "page not available".
// `route` is the page's registered path, e.g. '/admin/customers/:customerId'.
export function PageLink({ to, route, className, children }) {
    const canOpen = useCan({ resource: route, action: 'navigate' });
    if (!canOpen) return <span className={className}>{children}</span>;
    return <Link to={to} className={className}>{children}</Link>;
}
