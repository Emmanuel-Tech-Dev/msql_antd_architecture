// Turns one documentation page written in Markdown into the blocks the
// documentation page renders. Only the constructs the docs use are
// understood, so no Markdown library is needed:
//
//   ---                         front matter (key: value)
//   ## Heading                  title of the next list, steps, table or flow
//   - item                      bullets
//   1. **Step** — text          steps
//   | a | b |                   table (header, separator, rows; \| inside a cell)
//   :::flow … :::               flow: one "- item" per line; optional "# Phase"
//                               lines group the items, and "- [option] item"
//                               marks a step where the project's own code runs
//   :::lifecycle Example … :::  request round trip, one line each:
//                                 out|turn|back Zone | Step | detail
//                                 refuse 403 | reason       (for the step above)
//                                 retry From step → To step | what happens
//                                 note Text
//   :::note|warning|danger Title … :::   callout
//   ```lang Title … ```         code
//   ::hook-lab, ::architecture-simulator, ::request-walkthrough   embedded demos
//   anything else               a paragraph (consecutive lines joined)

const EMBEDS = new Set(['hook-lab', 'architecture-simulator', 'request-walkthrough']);
const STEP = /^\d+\.\s+\*\*(.+?)\*\*\s+—\s+(.*)$/;

const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));

function parseFrontMatter(lines) {
  if (lines[0] !== '---') return { meta: {}, start: 0 };
  const end = lines.indexOf('---', 1);
  const meta = Object.fromEntries(lines.slice(1, end).map((line) => {
    const at = line.indexOf(':');
    return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  }));
  return { meta, start: end + 1 };
}

function parseFlow(lines) {
  const flow = { items: [] };
  for (const line of lines) {
    if (line.startsWith('- ')) flow.items.push(line.slice(2));
    if (line.startsWith('# ')) (flow.phases ??= []).push({ name: line.slice(2).trim(), from: flow.items.length });
  }
  return flow;
}

function parseLifecycle(lines) {
  const lifecycle = { steps: [] };
  for (const line of lines.map((value) => value.trim()).filter(Boolean)) {
    const at = line.indexOf(' ');
    const keyword = line.slice(0, at);
    const parts = line.slice(at + 1).split(' | ').map((part) => part.trim());
    if (['out', 'turn', 'back'].includes(keyword)) {
      const [zone, title, text = ''] = parts;
      lifecycle.steps.push({ direction: keyword, zone, title, text, refusals: [] });
    } else if (keyword === 'refuse') {
      lifecycle.steps.at(-1).refusals.push({ code: parts[0], text: parts[1] || '' });
    } else if (keyword === 'retry') {
      const [from, to] = parts[0].split(' → ').map((part) => part.trim());
      lifecycle.retry = { from, to, text: parts[1] || '' };
    } else if (keyword === 'note') {
      lifecycle.note = line.slice(at + 1).trim();
    }
  }
  return lifecycle;
}

export function parseDocument(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const { meta, start } = parseFrontMatter(lines);
  const blocks = [];
  let title;
  const takeTitle = () => { const value = title; title = undefined; return value; };

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;

    if (line.startsWith('## ')) {
      title = line.slice(3).trim();
      continue;
    }

    if (line.startsWith('```')) {
      const [language = '', ...name] = line.slice(3).trim().split(' ');
      const body = [];
      for (index += 1; index < lines.length && lines[index] !== '```'; index += 1) body.push(lines[index]);
      blocks.push({ type: 'code', title: name.join(' ') || takeTitle(), language, value: body.join('\n') });
      continue;
    }

    if (line.startsWith(':::')) {
      const [kind, ...name] = line.slice(3).trim().split(' ');
      const body = [];
      for (index += 1; index < lines.length && lines[index] !== ':::'; index += 1) body.push(lines[index]);
      if (kind === 'flow') {
        blocks.push({ type: 'flow', title: takeTitle(), ...parseFlow(body) });
      } else if (kind === 'lifecycle') {
        blocks.push({ type: 'lifecycle', title: takeTitle(), example: name.join(' '), ...parseLifecycle(body) });
      } else {
        blocks.push({ type: 'callout', title: name.join(' '), text: body.join(' ').trim(), tone: kind });
      }
      continue;
    }

    if (line.startsWith('::')) {
      const [kind, ...name] = line.slice(2).trim().split(' ');
      if (EMBEDS.has(kind)) {
        const block = { type: kind };
        const embedTitle = name.join(' ') || takeTitle();
        if (embedTitle) block.title = embedTitle;
        blocks.push(block);
        continue;
      }
    }

    if (line.startsWith('- ')) {
      const items = [];
      for (; index < lines.length && lines[index].startsWith('- '); index += 1) items.push(lines[index].slice(2));
      index -= 1;
      blocks.push({ type: 'bullets', title: takeTitle(), items });
      continue;
    }

    if (STEP.test(line)) {
      const items = [];
      for (; index < lines.length && STEP.test(lines[index]); index += 1) {
        const [, stepTitle, stepText] = lines[index].match(STEP);
        items.push({ title: stepTitle, text: stepText });
      }
      index -= 1;
      blocks.push({ type: 'steps', title: takeTitle(), items });
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];
      for (; index < lines.length && lines[index].startsWith('|'); index += 1) rows.push(lines[index]);
      index -= 1;
      const [header, , ...body] = rows;
      blocks.push({ type: 'table', title: takeTitle(), columns: splitRow(header), rows: body.map(splitRow) });
      continue;
    }

    const paragraph = [];
    for (; index < lines.length && lines[index].trim() && !/^(## |```|:::|::|- |\|)/.test(lines[index]) && !STEP.test(lines[index]); index += 1) {
      paragraph.push(lines[index].trim());
    }
    index -= 1;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return { meta, blocks };
}

function flowLines(block) {
  return block.items.flatMap((item, index) => [
    ...(block.phases || []).filter((phase) => phase.from === index).map((phase) => `# ${phase.name}`),
    `- ${item}`,
  ]);
}

function lifecycleToMarkdown(block) {
  const lines = [`:::lifecycle${block.example ? ` ${block.example}` : ''}`];
  for (const step of block.steps) {
    lines.push(`${step.direction} ${step.zone} | ${step.title}${step.text ? ` | ${step.text}` : ''}`);
    for (const refusal of step.refusals) lines.push(`refuse ${refusal.code}${refusal.text ? ` | ${refusal.text}` : ''}`);
  }
  if (block.retry) lines.push(`retry ${block.retry.from} → ${block.retry.to} | ${block.retry.text}`);
  if (block.note) lines.push(`note ${block.note}`);
  return `${lines.join('\n')}\n:::`;
}

// The reverse, used once to move the old content into Markdown files and by
// the round-trip test.
export function blocksToMarkdown(meta, blocks) {
  const cell = (value) => String(value).replace(/\|/g, '\\|');
  const front = ['---', ...Object.entries(meta).map(([key, value]) => `${key}: ${value}`), '---'];
  const body = blocks.map((block) => {
    const heading = block.title ? `## ${block.title}\n\n` : '';
    switch (block.type) {
      case 'paragraph': return block.text;
      case 'callout': return `:::${block.tone} ${block.title}\n${block.text}\n:::`;
      case 'bullets': return `${heading}${block.items.map((item) => `- ${item}`).join('\n')}`;
      case 'steps': return `${heading}${block.items.map((item, at) => `${at + 1}. **${item.title}** — ${item.text}`).join('\n')}`;
      case 'flow': return `${heading}:::flow\n${flowLines(block).join('\n')}\n:::`;
      case 'lifecycle': return `${heading}${lifecycleToMarkdown(block)}`;
      case 'table': return `${heading}| ${block.columns.map(cell).join(' | ')} |\n| ${block.columns.map(() => '---').join(' | ')} |\n${block.rows.map((row) => `| ${row.map(cell).join(' | ')} |`).join('\n')}`;
      case 'code': return `\`\`\`${block.language} ${block.title}\n${block.value}\n\`\`\``;
      default: return `::${block.type}${block.title ? ` ${block.title}` : ''}`;
    }
  });
  return `${front.join('\n')}\n\n${body.join('\n\n')}\n`;
}
