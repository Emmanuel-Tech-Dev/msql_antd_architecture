---
id: guide-protect-route
title: Protect your own API route
track: build
group: Access
order: 0.83
eyebrow: Guide
audience: Developers and administrators
readTime: 7 min
summary: Decide who may call a route you wrote yourself, by registering it as an endpoint, linking it to a permission and giving the permission to a role.
---

## When to use this

Every route you add with createServer({ routes }) runs after sign-in and the permission check, so until you register it, everyone except SuperAdmin and dev gets 403. Use this guide once per route you write: an approve action, a report, an export.

| You want | Use instead |
| --- | --- |
| Access to a table's generic routes (/api/invoices, /api/invoices/:id …) | Give a role access to a table: it creates all of this for you |
| A route anyone can call without signing in (a webhook, a health check) | Pass it in createServer({ publicRoutes }) and check its own signature or secret |
| To hide a button for people who may not use the route | Hide or show buttons by permission, on top of this guide |

## How access works

The server allows a request when the chain exists: the user's role holds a permission, and the permission unlocks an endpoint whose method and path match the request.

```text The chain
Role  --holds-->  Permission  --unlocks-->  Endpoint (method + path)
Finance           approve:invoices          POST /api/v1/invoices/:id/approve
```

The full rules (one row per method, :id, a trailing *, ALL) are in Identity and access › How an API request is allowed.

## Before you begin

- The route is written and registered (Write your own API route). This guide protects POST /api/v1/invoices/:id/approve.
- You are signed in as SuperAdmin or dev, or a role that may edit Resources, Permissions and Roles.
- The role that should use the route exists (Create a role and give it access).

```js The route being protected (server/route/InvoiceRoute.js)
const { Model, AppError } = require("@msql-antd/framework-server");

module.exports = class InvoiceRoute {
  constructor(app) {
    app.post("/api/v1/invoices/:id/approve", async (req, res) => {
      const { affectedRows } = await new Model()
        .update("invoices", { status: "approved", approved_by: req.user.sub })
        .where("id", "=", req.params.id)
        .where("status", "=", "submitted")
        .execute();
      if (!affectedRows) throw new AppError("ERR_BUSINESS_LOGIC_ERROR", "Only a submitted invoice can be approved");
      res.json({ data: { id: req.params.id, status: "approved" } });
    });
  }
};
```

## Steps

1. **Register the endpoint** — Open Resources › Resource catalogue › Add resource and fill in the fields below, then save. One row is one method on one path: a route with GET and DELETE needs two rows.
2. **Create the permission** — Open Permissions › Add permission and create approve:invoices. Skip this when it already exists (for example from a custom action in Grant table access).
3. **Link them** — Open Resources › Policy links › Link resource. Choose the permission approve:invoices and the resource approve:invoices:by_id, then save.
4. **Give the permission to a role** — Open Roles, choose Configure access on the role (Finance). On the Capabilities tab, find the Invoices row and tick Approve in the Other actions column, then press Save role policy. (Permissions › Role assignments › Assign permission does the same, one assignment at a time.)
5. **Show the button only to them (optional)** — In the page, wrap the button in Can so people without the permission do not see it.

| Field in Add resource | Value |
| --- | --- |
| Resource Name | approve:invoices:by_id (unique; action:table:what is a good habit) |
| Type | API_ENDPOINT |
| Path | /api/v1/invoices/:id/approve (:id matches any value) |
| HTTP Method | POST |
| Public Access | No |
| Show in navigation | Hide |

```jsx 5. The button, for permitted people only
import { Can, apiClient } from '@msql-antd/framework-ui'

<Can permission="approve:invoices">
  <Button onClick={() => apiClient.post(`/api/v1/invoices/${invoice.id}/approve`)}>Approve</Button>
</Can>
```

## Check that it works

1. **As a member of Finance** — Press Approve: the request answers 200. Users who were signed in already get the change without signing out.
2. **As someone without the permission** — The button is not shown, and calling the route directly answers 403 with errorCode ERR_ACCESS_DENIED ("Access denied"); the error's details name the request: "Access denied to POST /api/v1/invoices/7/approve".
3. **As an administrator** — Resources › Policy links lists approve:invoices → approve:invoices:by_id.

## Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| 403 for everyone except SuperAdmin and dev | One link of the chain is missing | Check all three: the endpoint row (Resource catalogue), the policy link (Policy links), and the permission on the role (Roles › Configure access › Capabilities) |
| 403 with the right role | The endpoint's method or path does not match the request | Compare Path and HTTP Method with the request exactly; use :id for values, not the value itself |
| 403 on GET but not POST (or the reverse) | One row covers one method | Add a row for the other method, or set HTTP Method to ALL when every method may be allowed together |
| 403 "No resources available" (ERR_NO_RESOURCES) | The user has no role at all | Give the user a role under Users |
| 403 although everything is linked | An ABAC policy refused it (deniedBy in the error details) | Check the project's policies in createServer({ policies }) |
| 404 instead of 403 | The route is not registered in createServer({ routes }), or its path differs | Check server/index.js and the path in the route class |
| The button shows for everyone | Can is not used, or the page checks a different permission | Wrap the button in Can with the same permission name |

## Related

- Identity and access › How an API request is allowed: every matching rule.
- Write your own API route: the route class, request checks and errors.
- Give a role access to a table: the same chain, created for a table's generic routes.
- Hide or show buttons by permission: Can, useCan and PageLink.
