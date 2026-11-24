---
id: backend-tutorials
title: Backend implementation tutorials
track: build
group: Tutorials
order: 8
eyebrow: Build safely on Express + MySQL
audience: Backend developers
readTime: 36 min
summary: Concrete server recipes for generic resources, custom routes, services, queries, validation, errors, logging, settings, and tests.
---

Use the generic API for ordinary table CRUD. Add custom routes only when an operation spans tables, has business invariants, invokes an external system, needs a transaction, or has a response that is not a table resource. Custom does not mean unvalidated.

## Tutorial: expose a table through generic CRUD

1. **Create the migration** — Define projects with a primary key, bounded columns, indexes, timestamps, and foreign keys.
2. **Describe it** — Describe the table in Settings › Data model (or let New table write the whole migration). The server then enforces its rules on every generic write.
3. **Create API resources** — Register GET/POST/PUT/DELETE paths and methods in admin_resources.
4. **Create permissions** — Add read/create/update/delete permission names and map them to resources.
5. **Assign a role** — Map only the permissions required by that role.
6. **Use existing routes** — BaseRoute + validateTable + BaseService now handle CRUD; no new Express route is required.

```sql Migration example
CREATE TABLE projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NOT NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_code (code),
  KEY idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```js Tutorial: custom transaction endpoint
const AppError = require('../shared/helpers/AppError');
const conn = require('../core/config/conn');

app.post('/api/v1/projects/:id/archive', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) throw new AppError('ERR_INVALID_INPUT');

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      'UPDATE projects SET status = ? WHERE id = ? AND status = ?',
      ['archived', id, 'active'],
    );
    if (result.affectedRows !== 1) throw new AppError('ERR_CONFLICT', 'Project cannot be archived');
    await connection.execute(
      'INSERT INTO project_events (project_id, event_type, actor_id) VALUES (?, ?, ?)',
      [id, 'ARCHIVED', req.user.sub],
    );
    await connection.commit();
    res.json({ status: 'ok', data: { id, status: 'archived' } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

// Also register POST /api/v1/projects/:id/archive in the ACL tables.
```

```js Tutorial: QueryBuilder inside a trusted service
const Model = require('../core/model/model');

async function activeProjectSummary(ownerId) {
  return new Model()
    .select(['id', 'name', 'code', 'status'], 'projects')
    .where('owner_id', '=', ownerId)
    .where('status', '=', 'active')
    .orderBy('created_at', 'DESC')
    .limit(100)
    .execute();
}

// Values are bound parameters. Table/column identifiers here are developer-authored.
// Browser-provided tables must go through validateTable/resolveTableDefinition.
```

```js Tutorial: validate a custom request
const { z } = require('zod');
const AppError = require('../shared/helpers/AppError');

const archiveSchema = z.object({ reason: z.string().trim().min(5).max(300) }).strict();
const parsed = archiveSchema.safeParse(req.body);
if (!parsed.success) {
  throw new AppError('ERR_VALIDATION_FAILED', 'Check the submitted information', {
    fields: parsed.error.issues.map((issue) => issue.path.join('.')),
  });
}
// Use parsed.data, never req.body, after validation.
```

```js Tutorial: operational error and structured log
if (!project) {
  throw new AppError('ERR_RECORD_NOT_FOUND', 'Project was not found');
}

logger.security('Project archived', {
  requestId: req.requestId,
  userId: req.user.sub,
  projectId: project.id,
  operation: 'archive-project',
});

// Do not put passwords, tokens, cookies, secrets, or full request bodies in log context.
```

## Tutorial: add a database-managed setting

1. **Define ownership** — Decide whether the value is public UI configuration, non-sensitive runtime configuration, or a secret. Secrets remain environment/server-controlled.
2. **Create schema and default** — Add a migration and a safe default value.
3. **Validate the entire document** — Use a strict Zod schema with ranges and enums, as UiSettingsRoute does.
4. **Use optimistic concurrency** — Require expectedVersion and update WHERE version = expectedVersion.
5. **Audit and publish** — Log the actor and broadcast a change event after commit.

## What to test

| Case | Expected assertion |
| --- | --- |
| Authorized role | Correct response and database change |
| Unmapped role | 403 with stable errorCode |
| Invalid input | 400 without partial write |
| Missing record | 404 or domain-specific conflict |
| Concurrent version | 409 and no overwrite |
| Sensitive field/table | Rejected even for a structurally valid request |
| Unexpected database error | Generic production response; detailed structured server log |

:::warning Route registration is not authorization
Creating an Express handler does not make it reachable to ordinary roles. Add the exact method/path to admin_resources and map it to a permission. Keep privileged bypass limited to SuperAdmin and dev.
:::
