import { useState } from 'react';
import { Button } from 'antd';

// "Follow one request": PUT /api/taxes/7 through every layer, one stage at a time.
const STAGES = [
  {
    side: 'Browser', name: 'Page and hook', question: 'What does the user want?', file: 'packages/framework-ui/src/core/hooks/data/useUpdate.js',
    body: 'The page calls useUpdate. It never builds URLs or calls axios itself.',
    pass: 'Hands "update taxes 7 with { rate: 15 }" to the data provider.', why: 'Pages describe what they want; one layer knows how.',
  },
  {
    side: 'Browser', name: 'Data provider and apiClient', question: 'How is it sent?', file: 'packages/framework-ui/src/core/provider/mysqlOrmProvider.js · services/apiClient.js',
    body: 'The data provider turns the intent into PUT /api/taxes/7. apiClient adds Authorization: Bearer <access token>.',
    pass: 'The request leaves the browser.', stop: 'On a 401 it refreshes the token once and replays the request.',
    why: 'Token handling and retries live in one file for the whole app.',
  },
  {
    side: 'Server', name: 'Logging, limits, CORS, headers', question: 'Is this a well-formed request from an allowed origin?', file: 'server/createServer.js · core/middleware/requestLogger.js',
    body: 'A request id and a log line; body size limit; 3000 requests per 15 minutes per address (500 per signed-in user once the token is checked); allowed origins; helmet security headers.',
    pass: 'Passes on to the route chain.', stop: 'Rejected: wrong origin, too large, or rate-limited.', why: 'Cheap checks first, before any database work.',
  },
  {
    side: 'Server', name: 'authMiddleWare', question: 'Who are you?', file: 'server/core/middleware/authMiddleWare.js',
    body: "Verifies the JWT signature and issuer, then compares the token's token_version with the database.",
    pass: 'req.user is set.', stop: 'ERR_TOKEN_INVALID: missing, expired, forged, or from before a password change.',
    why: 'Sign-in and refresh routes are registered before this, so they work without a token.',
  },
  {
    side: 'Server', name: 'authorization', question: 'May you do this?', file: 'server/core/middleware/authorization.js',
    body: 'Loads roles, permissions, overrides and allowed endpoints (cached 5 minutes). PUT /api/taxes/:id must match one of your resources unless you are privileged. Then every ABAC policy runs; a policy can only deny.',
    pass: 'req.permissions, req.roles and req.isPrivileged are attached.', stop: 'ERR_ACCESS_DENIED with the reason and the policy that denied it.',
    why: 'Roles decide the endpoint; deny-only policies add conditions.',
  },
  {
    side: 'Server', name: 'validateTable', question: 'Which columns may you touch?', file: 'server/core/middleware/validateTable.js',
    body: 'The table exists and is not blocked. Sensitive columns are removed, and so are fields guarded by a readPermission you lack.',
    pass: 'req.validatedResource.fields lists your columns.', stop: 'Writing a column outside that list is refused.',
    why: 'The column list is decided per user, once, for every later step.',
  },
  {
    side: 'Server', name: 'Metadata check', question: 'Is the record valid?', file: 'server/core/lib/baseService.js → metadataSchema.js',
    body: "A zod schema built from the table's metadata coerces types, drops read-only and hidden fields, and checks required fields, rules, options, show-when conditions and lookup values.",
    pass: 'A clean record: { rate: 15 }.', stop: 'ERR_VALIDATION_FAILED with a message per field, e.g. "Rate must be at most 100".',
    why: 'The same rules the form shows, enforced where they cannot be skipped.',
  },
  {
    side: 'Server', name: 'Model and QueryBuilder', question: 'What SQL runs?', file: 'server/core/model/model.js',
    body: "update('taxes', record).where('id', '=', 7) becomes parameterised SQL. Reads go through redactSensitiveData.",
    pass: 'The row is updated.', why: 'No string-built SQL; values are always parameters.',
  },
  {
    side: 'Browser', name: 'Response or error', question: 'What does the user see?', file: 'server/core/middleware/errorHandler.js · shared/helpers/AppError.js',
    body: 'Success returns { status: "ok", message, data }. Any thrown AppError becomes the same JSON error shape with the right HTTP status and is logged. React Query refetches the list.',
    pass: 'The table shows 15%.', why: 'One error shape means one way to show errors in the UI.',
  },
];

export default function RequestWalkthrough({ title, headingId }) {
  const [current, setCurrent] = useState(0);
  const stage = STAGES[current];

  return (
    <section className="docs-block docs-walkthrough" aria-labelledby={headingId}>
      {title && <h2 id={headingId}>{title}</h2>}
      <div className="docs-walkthrough__frame">
        <div className="docs-walkthrough__head">
          <code><b>PUT</b> /api/taxes/7 {'{ "rate": 15 }'}</code>
          <span className="docs-walkthrough__count">Stage {current + 1} of {STAGES.length}</span>
          <Button onClick={() => setCurrent(current - 1)} disabled={current === 0}>Back</Button>
          <Button type="primary" onClick={() => setCurrent(current + 1)} disabled={current === STAGES.length - 1}>Next stage</Button>
        </div>
        <ol className="docs-walkthrough__rail" aria-label="Stages">
          {STAGES.map((item, index) => (
            <li key={item.name}>
              <button
                type="button"
                aria-current={index === current ? 'step' : undefined}
                className={index === current ? 'is-current' : index < current ? 'is-done' : ''}
                onClick={() => setCurrent(index)}
              >
                <span aria-hidden="true">{index + 1}</span>{item.name}
              </button>
            </li>
          ))}
        </ol>
        <div className="docs-walkthrough__stage" aria-live="polite">
          <span className="docs-walkthrough__question">{stage.side} · {stage.question}</span>
          <h3>{current + 1}. {stage.name}</h3>
          <code className="docs-walkthrough__file">{stage.file}</code>
          <p>{stage.body}</p>
          <div className="docs-walkthrough__outcomes">
            <div><span className="is-pass">continues</span>{stage.pass}</div>
            {stage.stop && <div><span className="is-stop">stops</span>{stage.stop}</div>}
          </div>
          <p className="docs-walkthrough__why"><strong>Why it&apos;s here:</strong> {stage.why}</p>
        </div>
      </div>
    </section>
  );
}
