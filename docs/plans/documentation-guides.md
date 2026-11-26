# Documentation: task guides

The in-app docs explain how the framework works (Learn) and list what it exports (Reference). What is missing are **task guides** in the style of Google's developer docs: one page per thing someone wants to do, so anyone can follow it without knowing the codebase.

## Every guide has the same shape

| Section | What it says |
| --- | --- |
| Title | The task, as a verb: "Add a page to the sidebar" |
| When to use this | What it achieves, when to choose it, and when to use something else instead |
| Before you begin | What must already be in place (a running project, a permission, a table) |
| Steps | Numbered steps. Each says where (file or screen), what to type or click, with real code and the exact screen, button and field names |
| Check that it works | How to see the result, as a user and as an administrator |
| Common problems | Symptom · cause · fix, from the real behaviour of the code |
| Related | The guides, concept pages and reference pages to read next |

Rules: every screen, button and field name is copied from the code; every code sample is one that runs; every result shown is real. A guide does one task; a longer job links several guides in order.

## Guides

### Start
- Create a project and sign in for the first time
- Run the API and the UI on your machine
- Upgrade the framework to a new version

### Pages and navigation
- Add a page to the sidebar
- Add a public page (no sign-in)
- Show a page only to some roles
- Hide or show buttons and links by permission (Can, useCan, PageLink)
- Link to another page safely (PageLink)

### Tables and forms
- Describe an existing table for forms and lists
- Create a new table with the data-model builder
- Show a table as a list page (MetadataTable)
- Change how a column or field looks
- Arrange a form in sections or steps
- Show a field only when another has a value (conditions)
- Offer choices from another table (lookups, dependent lookups)
- Upload files and images in a form
- Collect repeating rows (list and groupList)
- Save a form through your own route (onSubmit)
- Let users select rows and act on them (bulk delete, your own bulk actions)
- Import records from a CSV file
- Add your own field type

### Access
- Create a role and give it access
- Give a role access to a table (Grant table access)
- Protect your own API route
- Give one user an exception (overrides)
- Add a rule that refuses access (ABAC policy)
- Suspend a user or force a password change

### Server
- Write your own API route
- Read and write data with the query builder
- Do several writes together (transactions)
- Check request input (validateRequest)
- Return errors the UI understands (AppError)
- Add a project migration
- Load data at sign-in (bootstrap profiles)
- Send a live update to users (realtime)
- Read and change system settings
- Cache slow results (CacheManager)
- Write to the logs

### UI data
- Load a list or one record (useList, useOne)
- Create, update and delete records (useCreate, useUpdate, useDeleteOne)
- Call any endpoint (useCustom, apiClient)
- Open a form in a modal or drawer (useRecordForm)
- Show a map, a route or a location picker
- Add a rich text editor

### Operate
- Configure CORS for your UI's address
- Deploy to a server
- Back up and restore the database
- Read the logs
- Fix "403 Access denied" (find the missing link)

## Order of work

Batch 1 (the access and navigation tasks people ask about most): Add a page to the sidebar · Show a page only to some roles · Protect your own API route · Create a role and give it access · Give a role access to a table · Fix "403 Access denied".
Then Tables and forms, Server, UI data, Start, Operate. Each batch ends with the docs tests passing and a commit. Existing overview pages stay as concept pages and link to the guides.
