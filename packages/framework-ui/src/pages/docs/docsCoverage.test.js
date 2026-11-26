import { describe, expect, test } from 'vitest';
import * as framework from '../../index';
import utils from '../../utils/function_utils';

const pages = import.meta.glob('./content/reference/*.md', { query: '?raw', import: 'default', eager: true });
const page = (name) => pages[`./content/reference/${name}.md`];
const allReference = Object.values(pages).join('\n');
const mentioned = (text, name) => new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`).test(text);

// The reference pages must keep up with the package: anything exported or
// added to utils without documentation fails here.
describe('package reference covers everything the UI package exports', () => {
  test('every export of @msql-antd/framework-ui is documented', () => {
    const missing = Object.keys(framework).filter((name) => !mentioned(allReference, name));
    expect(missing).toEqual([]);
  });

  test('every utils function is on the UI utilities page', () => {
    const missing = Object.keys(utils).filter((name) => !mentioned(page('ui-utilities'), name));
    expect(missing).toEqual([]);
  });

  test('every soft validator is listed', () => {
    const text = page('ui-utilities');
    const missing = Object.keys(utils.ValidationFactory).filter((name) => {
      if (mentioned(text, name)) return false;
      // The page groups the length variants: "MinCharLength, MaxCharLength, MinMaxCharLength, and the same three with AllowSpace".
      const base = name.replace(/(MinMax|Min|Max)CharLength(AllowSpace)?$/, '');
      return !(base !== name && mentioned(text, `${base}MinCharLength`) || text.includes(`${base}, `) && text.includes('MinMaxCharLength'));
    });
    expect(missing).toEqual([]);
  });
});
