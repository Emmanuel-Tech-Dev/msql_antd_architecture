---
id: server-utilities
title: Server utilities
track: reference
group: Package reference
order: 0.4
eyebrow: utils from @msql-antd/framework-server
audience: Backend developers
readTime: 14 min
summary: Every function on the server's utils object: names and input checks, hashing and encryption, passwords, IDs, SQL helpers, redaction, settings and activity logs, with real example results.
---

## Import

```js Any route or service
const { utils } = require("@msql-antd/framework-server");

utils.requireIdentifier(req.params.table, "table name");
const slug = utils.slugify(req.body.title);
```

utils is one plain object. Every result on this page was produced by running the function. A general-purpose helper that is missing belongs in packages/framework-server/shared/utils/functions.js, not inside one route.

## Input checks

| Function | What it does | Example → result |
| --- | --- | --- |
| isBlank(value) | True for undefined, null, "", only spaces, or an empty array. 0 and false are not blank | isBlank("  ") → true; isBlank(0) → false |
| isIdentifier(value) | True for a safe SQL name: letters, digits and _, not starting with a digit | isIdentifier("admin_roles") → true; isIdentifier("1bad") → false |
| requireIdentifier(value, label) | Returns the name, or throws a 400 (ERR_INVALID_INPUT) naming the label. Use it before putting any name from a request into SQL | requireIdentifier("customers", "table name") → "customers"; requireIdentifier("a; DROP", "column name") → throws "Invalid column name: a; DROP" |
| requireIdentifiers(fields) | Throws a 400 "<name> is required" for the first value that is not a non-empty string | requireIdentifiers({ tableName: "x", userId: "" }) → throws "userId is required" |
| requireValidRange(min, max, label) | Throws ERR_VALIDATION_FAILED when max is below min. Passes when either is missing | requireValidRange(5, 3, "Amount") → throws "Amount maximum must be greater than or equal to its minimum" |
| clampInteger(value, fallback, max) | A whole number from 1 up to max; fallback when the value is not a positive integer (page sizes, limits) | clampInteger("250", 20, 100) → 100; clampInteger("x", 20, 100) → 20; clampInteger("0", 20, 100) → 20 |
| hasOwn(object, key) | True when the object has the key itself (not inherited) | hasOwn({ a: 1 }, "a") → true; hasOwn({ a: 1 }, "toString") → false |
| IDENTIFIER | The regular expression behind isIdentifier | /^[A-Za-z_][A-Za-z0-9_]*$/ |

## Text, lists and JSON

| Function | What it does | Example → result |
| --- | --- | --- |
| humanize(name) | A column name as words | humanize("created_by") → "Created by" |
| slugify(value) | Lower-case URL slug: accents removed, other characters become "-", at most 180 characters | slugify("Énergie & Café — Accra!") → "energie-cafe-accra" |
| uniqueIds(values) | Trimmed, non-empty, unique values as strings | uniqueIds([" a", "a", null, "b", 2]) → ["a", "b", "2"] |
| parseJson(value, fallback) | Parses JSON text; fallback for empty or invalid text; objects pass through | parseJson('{"a":1}', null) → { a: 1 }; parseJson("{bad", null) → null |
| convertArrayToObject(result) | Replaces result.record (an object of rows) with its first row; { record: null } when empty | convertArrayToObject({ record: { a: { id: 1 } } }) → { record: { id: 1 } } |

## Hashing, encryption and passwords

| Function | What it does | Example → result |
| --- | --- | --- |
| sha256(text) | Hex SHA-256 | sha256("abc") → "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" |
| hashToken(token) | The same as sha256, for storing tokens without the token itself | hashToken("abc") === sha256("abc") |
| hashPassword(password) | Promise of a bcrypt hash (10 rounds) | await hashPassword("Secret#1") → "$2b$10$…" (60 characters) |
| comparePassword(password, hash) | Promise of true when the password matches the hash | await comparePassword("Secret#1", hash) → true |
| encryptSensitive(text) | AES-256-GCM: encrypted and tamper-evident. Use this for stored secrets and personal data | → "gcm:<iv>:<tag>:<ciphertext>" |
| decryptSensitive(value) | Reverses encryptSensitive; throws for any other format or a changed value | decryptSensitive(encryptSensitive("0241234567")) → "0241234567" |
| encrypt(text) / decrypt(text) | AES-256-CBC, the older format ("<iv>:<ciphertext>"), without tamper detection. Keep for values already stored this way | decrypt(encrypt("hello")) → "hello" |

All four encryption functions need ENCRYPTION_KEY in .env, decoding to exactly 32 bytes (KEY_HOOK names the encoding, default utf8). Without it they throw "ENCRYPTION_KEY is not configured. Set it to a value that decodes to exactly 32 bytes."

## IDs and codes

| Function | What it does | Example → result |
| --- | --- | --- |
| generateCustomId(prefix = "USR", length = 6) | Prefix and up to length random digits | generateCustomId() → "USR-172569"; generateCustomId("INV", 8) → "INV-78922159" |
| generateCustomIDWithCrypto(prefix) | Prefix and a full UUID (no collisions in practice) | generateCustomIDWithCrypto("INV") → "INV-865ec4df-f7ba-4147-a522-a933800e3856" |
| genRegNumber(prefix = "REG") | Prefix, today's date and six random digits | genRegNumber() → "REG20261126937390" |
| genInstituitionCode(name, region) | Initials of the name's main words (OF, AND, THE… skipped), at most 10, then the region | genInstituitionCode("Kwame Nkrumah University of Science and Technology", "AS") → "KNUST-AS" |

generateCustomId is short and random, so two calls can produce the same id; give the column a unique index, or use generateCustomIDWithCrypto where a clash must be impossible.

## Redacting sensitive data

redactSensitiveData(data, extraKeys) returns a copy with secret fields replaced by "[REDACTED]", at any depth and inside arrays. Keys are matched ignoring case, spaces, _ and -: password, passwordHash, oldPassword, newPassword, accessToken, refreshToken, resetToken, otp, otpCode, otpSecret, token, secret, clientSecret, apiKey, privateKey, authorization and cookie. extraKeys adds your own.

```js Before logging or returning a user
utils.redactSensitiveData({ email: "a@b.co", password: "x", nested: { access_token: "t" } });
// { email: "a@b.co", password: "[REDACTED]", nested: { access_token: "[REDACTED]" } }

utils.redactSensitiveData({ ghana_card: "GHA-1" }, ["ghanaCard"]);
// { ghana_card: "[REDACTED]" }
```

removePasswordFromObject(data) is the older name for the same thing.

## SQL helpers

Prefer the query builder (Model, see Server API). These helpers are for the few raw queries the builder cannot express, and they are what the builder uses inside.

| Function | What it does | Example → result |
| --- | --- | --- |
| placeholders(values) | One ? per value, for IN (…) | placeholders([1, 2, 3]) → "?, ?, ?" |
| inPlaceholders(values) | Like placeholders, after flattening nested arrays and dropping null, "" and duplicates. Pass the same cleaned values as parameters, or the counts will not match | inPlaceholders([1, [2, 2], null, "", 3]) → "?, ?, ?" |
| buildQuery(sql, joins) | Inserts JOIN clauses after the outer FROM table, before WHERE / GROUP BY / ORDER BY / LIMIT | buildQuery("SELECT * FROM invoices i WHERE i.status = ? ORDER BY i.id", " LEFT JOIN customers c ON c.id = i.customer_id") → "SELECT * FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.status = ? ORDER BY i.id" |
| countQuery(sql, expression = "COUNT(*)", alias = "total") | The COUNT for a list query, without ORDER BY. A grouped or DISTINCT query is counted as a derived table, so each group counts once | "SELECT i.id FROM invoices i WHERE i.status = ? ORDER BY i.id" → "SELECT COUNT(*) AS total FROM invoices i WHERE i.status = ?" |
| topLevelIndex(sql, pattern, from = 0) | Position of a keyword in the outer query, skipping subqueries and quoted text; -1 when absent | topLevelIndex("SELECT (SELECT 1 FROM x) FROM y", /FROM\s/) → 25 |
| extractConfig(query) | Splits request query parameters into list options (keys starting with _) and filters; turns "true" and numbers back into booleans and numbers | { page: "2", _maxLimit: "100" } → { config: { maxLimit: 100 }, queryParams: { page: "2" } } |

## Settings, activity and files

| Function | What it does |
| --- | --- |
| activityLogs(userId, activityType, title, description, ip, userAgent) | Inserts a row into user_activity_logs. Promise; await it. Note the order: the second argument is stored as activity_type and the third as title |
| getSystemOpenRoute() | Promise of the paths in the system.open_routes setting (accepts a list or { route: [...] }); [] when unset |
| getFileType(mimetype) | "image", "video" or "unknown" |
| sendOtpPin(email, html, subject) | Sends an email through Gmail with EMAIL_USER and EMAIL_PASS. Promise; rejects when sending fails |

## Sign-in tokens and one-time codes

utils has no token or OTP functions: sign-in, token refresh and one-time codes are handled inside the framework by AuthService and otpService, with ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET and OTP_CHALLENGE_SECRET. A project does not create or check tokens itself; a route behind createServer already has req.user. The older helpers (generateToken, generateAuthTokens, generateStudentTokens, verifyToken, verifyRefreshToken, generateOtpSecret, generateOtpCode, verifyOtp) were removed in 0.2.0: they used the wrong secrets or could not run.
