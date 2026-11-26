---
id: ui-utilities
title: UI utilities
track: reference
group: Package reference
order: 0.3
eyebrow: utils from @msql-antd/framework-ui
audience: Frontend developers
readTime: 15 min
summary: Every function on the UI's utils object: what it takes, what it returns, and a real example result. Text, lists, numbers, money, dates, files, browser helpers and the soft validators.
---

## Import

```jsx Any page or component
import { utils } from '@msql-antd/framework-ui'

utils.pluralize(3, 'Invoice')        // "3 invoices"
utils.formatDateTime(record.created_at)
```

utils is one plain object. Every result on this page was produced by running the function. Results that depend on the viewer's language (dates, money) are shown for an English (US) browser; other browsers format them their own way.

:::note Before you write a helper
Search this page first. A general-purpose helper that is missing belongs in packages/framework-ui/src/utils/function_utils.js, not as a small function inside one page, so every project gets it.
:::

## Text and names

| Function | What it does | Example → result |
| --- | --- | --- |
| humanize(name) | A column or key name as words, first letter capital. Splits snake_case and camelCase | humanize("created_by") → "Created by"; humanize("phoneNo") → "Phone no" |
| initials(name) | Up to two initials, upper case. "U" when there is no name | initials("Ama Mensah Owusu") → "AM"; initials("") → "U" |
| pluralize(count, word) | The count and the word in lower case, with an s unless count is 1 | pluralize(1, "Invoice") → "1 invoice"; pluralize(3, "Invoice") → "3 invoices" |
| listPhrase(words) | Joins words with commas and "or" before the last | listPhrase(["email", "phone", "ID"]) → "email, phone or ID" |
| truncateText(text, maxLength, ellipsis = "...") | Shortens text to maxLength characters including the ellipsis | truncateText("abcdefghij", 6) → "abc..."; with "…" → "abcde…" |
| asText(value) | Text for an input or editor: null and undefined become "" | asText(null) → "" |
| avatarColor(text) | One of eight fixed colors, always the same for the same text (for avatars) | avatarColor("Ama") → "#06b6d4" |
| generateRandomColor() | A random light color | → e.g. "#DCFBEE" |
| isIdentifier(value) | True for a safe table, column or key name: letters, digits and _, not starting with a digit | isIdentifier("order_key") → true; isIdentifier("1bad") → false |
| IDENTIFIER | The regular expression isIdentifier uses | /^[A-Za-z_][A-Za-z0-9_]*$/ |

## Blank values, lists and objects

| Function | What it does | Example → result |
| --- | --- | --- |
| isBlank(value) | True when nothing was entered: undefined, null, "", only spaces, or an empty array. 0 and false are not blank | isBlank("  ") → true; isBlank([]) → true; isBlank(0) → false |
| blankToUndefined(value) | null and "" become undefined, anything else is kept (useful before sending optional fields) | blankToUndefined("") → undefined; blankToUndefined(0) → 0 |
| toList(value) | An array as it is, or comma-separated text as a trimmed array without empty items | toList("a, b,,c") → ["a", "b", "c"] |
| toggleInSet(set, value) | A new Set with value added, or removed if it was there. The original Set is not changed (safe for React state) | toggleInSet(new Set(["a"]), "a") → Set {} |
| groupBy(rows, key) | Rows grouped into an object by the value of key | groupBy([{s:"a"},{s:"b"},{s:"a"}], "s") → { a: [2 rows], b: [1 row] } |
| calculateDataOfAndArray(rows, key) | The sum of one numeric field over rows | calculateDataOfAndArray([{t:2},{t:3}], "t") → 5 |
| parseJson(value, fallback) | Parses JSON text. Returns fallback for empty or invalid text, and an object unchanged | parseJson('{"a":1}', null) → { a: 1 }; parseJson("{bad", []) → [] |

## Numbers and money

| Function | What it does | Example → result |
| --- | --- | --- |
| toNumber(value) | A number, or 0 when the value is not a number | toNumber("12.5") → 12.5; toNumber("x") → 0 |
| clamp(value, min, max) | value limited to the range min…max | clamp(15, 0, 10) → 10 |
| percentOf(part, total) | Whole-number percentage. 0 when total is 0 | percentOf(1, 3) → 33; percentOf(1, 0) → 0 |
| formatNumber(value) | Short form with K, M, B, T, Q above 999; "0" when not a number | formatNumber(1534000) → "1.5M"; formatNumber(950) → "950" |
| currencyConvertor(amount, currency = "GHS") | Money in the given currency (en-US format) | currencyConvertor(1234.5) → "GHS 1,234.50"; with "USD" → "$1,234.50" |
| percentageFormatter(fraction) | A fraction as a percentage with two decimals | percentageFormatter(0.256) → "25.60%" |
| formatBytes(bytes) | A file size | formatBytes(1572864) → "1.5 MB"; formatBytes(0) → "0 B" |
| formatUptime(seconds) | Days, hours and minutes | formatUptime(93784) → "1d 2h 3m" |
| purals(count) | The English plural category of a number (Intl.PluralRules). Not a pluralizer: use pluralize for text | purals(1) → "one"; purals(3) → "other" |

## Dates and time

Values from MySQL ("2026-11-25 14:05:00") work in every function here.

| Function | What it does | Example → result |
| --- | --- | --- |
| formatDateTime(value) | Date and time in the viewer's language | formatDateTime("2026-11-25T14:05") → "Nov 25, 2026, 2:05 PM" |
| formatDay(day, { withYear }) | A date-only value ("YYYY-MM-DD") without time-zone shifts | formatDay("2026-11-25") → "Nov 25"; with withYear: true → "Nov 25, 2026" |
| fromNow(value) | How long ago or how far ahead, in words. "—" for an empty or invalid value | 5 minutes ago → "5 minutes ago"; a day ago → "yesterday"; null → "—" |
| relativeTimeFormart(date) | Like fromNow, using Intl.RelativeTimeFormat. Needs a Date object, not text | a Date two days ahead → "in 2 days" |
| dateFormatter(value) | Long date, day first. "Invalid date" (and a console error) for a bad value | dateFormatter("2026-11-25") → "25 November 2026" |
| formatDateV3(value, format = "dddd, MMMM D, YYYY") | Any dayjs format | formatDateV3("2026-11-25") → "Wednesday, November 25, 2026"; with "DD/MM/YYYY" → "25/11/2026" |
| formatDate(value, joiner = "-") | Year, month and day as numbers | formatDate("2026-11-25T10:00") → "2026-11-25"; with "/" → "2026/11/25" |
| formatDateV2(text, delimiter = "-", joiner = "-") | Reverses the parts of a date string | formatDateV2("2026-11-25") → "25-11-2026" |
| getDateAndTime(value) | Weekday, date and 12-hour time | getDateAndTime("2026-11-25 14:05") → "Wednesday, November 25, 02:05 PM" |
| getCurrentDate() | Today, long form | → "November 26, 2026" |
| timeOfDay(date = now) | "HH:MM:SS", for log lines | → "14:05:09" |
| getDaysFromRawDate(start, end) | Whole days between two dates (dayjs) | getDaysFromRawDate("2026-11-01", "2026-11-25") → 24 |
| getDaysFromRawDateV2(start, end) | The same, rounded up (Date) | → 24 |

## Files, URLs and the browser

| Function | What it does | Example → result |
| --- | --- | --- |
| joinUrl(base, path) | Joins two parts with exactly one slash | joinUrl("http://api/", "/users") → "http://api/users" |
| fileNameFromUrl(url, fallback = "file") | The decoded file name at the end of a URL, without the query | fileNameFromUrl(".../photo%201.png?v=2") → "photo 1.png" |
| readFileAsText(file) | Promise of a File's text (CSV, JSON) | await readFileAsText(file) → "name,email\n…" |
| readFileAsDataUrl(file, errorMessage) | Promise of a File as a data: URL, for previews | await readFileAsDataUrl(image) → "data:image/png;base64,…" |
| getBase64(file) | The same as readFileAsDataUrl, older name | — |
| copyText(text) | Copies to the clipboard. Promise of true, or false when the browser refuses (no permission, page not on HTTPS) | if (!(await utils.copyText(link))) message.error("Could not copy") |
| handleDownloadCSV(rows, filename) | Downloads rows as filename.csv. Headers come from the first row's keys. Values are not quoted, so a comma inside a value splits the column | handleDownloadCSV(invoices, "invoices") |
| printReceipts(elementId) | Opens a print window with the element's content and the page's styles, prints and closes it. Needs pop-ups allowed | printReceipts("receipt") |
| prefersReducedMotion() | True when the operating system or the app (Appearance › reduce motion) asks for less motion | if (!utils.prefersReducedMotion()) startAnimation() |
| checkIsIOS() | True on iPhone, iPad and iPod | — |
| addMaximumScaleToMetaViewport() | Sets maximum-scale=1.0 on the viewport tag (stops iOS zooming into inputs) | — |
| sleep(ms) | Promise that resolves after ms milliseconds | await utils.sleep(500) |

## Soft validation

ValidationFactory holds named checks that return true or false. validateSoftData runs one of them, by name, on a value.

```jsx Check one value
const result = utils.validateSoftData({
  name: 'first_name',
  value: 'Ama',
  validator: 'validateAlphaMinCharLength(3)',   // name(arguments)
  required: true,                               // false: always valid
})
// { valid: true, name: 'first_name', value: 'Ama', validator: '…', required: true }

utils.ValidationFactory.validateSimpleEmail('a@b.co')   // true
```

| Group | Validators (all take the value first) |
| --- | --- |
| Letters | validateAlpha, validateAlphaAllowSpace, validateAlphaMinCharLength(min), validateAlphaMaxCharLength(max), validateAlphaMinMaxCharLength(min, max), and the same three with AllowSpace |
| Digits | validateNumber, validateDecNumber, validateNumberAllowSpace, validateNumberMinCharLength(min), validateNumberMaxCharLength(max), validateNumberMinMaxCharLength(min, max), and the same three with AllowSpace |
| Letters and digits | validateAlphaNumeric, validateAlphaNumericAllowSpace, validateAlphaNumericAllowExtraChar (also . @ $ # _ and space), MinCharLength, MaxCharLength, MinMaxCharLength, and the same three with AllowSpace |
| Email | validateSimpleEmail, validateEmailWithUnicode, validateEmailNoUnicode |
| Optional fields | looselyValidateNumber, looselyValidateDecNumber, looselyValidateAlphaNumericAllowSpace, looselyValidateEmailNoUnicode, looselyValidateEmailWithUnicode, looselyValidatePlainString, looselyValidateAlphaNumericAllowExtraChar: empty passes, anything else must match |
| Other | validateEmptyString (true when not empty), validateYYYYMMDate ("2026-11"), noValidation (always true), validateTelephoneNumber (7 to 15 digits, an optional leading +, and spaces, dashes, dots or brackets: "0241234567", "+233 24 123 4567") |

validateSoftListData(fields) checks a list of { name, value, validator, required } the same way and returns { valid: true, data } or { valid: false, name } for the first failure.

```jsx Check several values
utils.validateSoftListData([
  { name: 'email', value: 'a@b.co', validator: 'validateSimpleEmail', required: true },
  { name: 'first_name', value: 'Al', validator: 'validateAlphaMinCharLength(3)', required: true },
])
// { valid: false, name: 'first_name' }
```

For forms, prefer the metadata field rules or antd Form rules, which show the message under the field.

## Older helpers

These still work and are kept so existing pages keep running. New code should use the function on the right.

| Function | Result | Use instead |
| --- | --- | --- |
| getInitials(text) | The first letter, upper case: getInitials("ama") → "A" | initials |
| getInitials_v2(name) | Every word's first letter: getInitials_v2("Ama Kofi Mensah") → "AKM" | initials (two letters) |
| getBase64(file) | A data: URL | readFileAsDataUrl |
| formatDateV2, formatDate, getDaysFromRawDateV2 | See Dates and time | formatDateV3 (any format) or formatDay |

utils.bootstrap was removed in 0.2.0 (it could not run). Startup data is loaded by the framework's bootstrap profiles; see Server architecture.
