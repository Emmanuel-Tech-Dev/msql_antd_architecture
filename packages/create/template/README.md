# {{title}}

Built on the msql-antd framework: the API is `@msql-antd/framework-server`, the UI is `@msql-antd/framework-ui`.

| Folder | What goes in it |
| --- | --- |
| server/index.js | `createServer({ routes, origins, paths })`: your routes, policies and folders |
| server/route | Your route classes |
| server/migrations | Your tables and rows, as numbered SQL files |
| ui/src/main.jsx | `<FrameworkApp config resources routes>`: your resources and pages |
| ui/src/pages | Your pages |

```bash
npm install
npm run db:setup   # first time, on an empty database (fill in server/.env first)
npm run dev        # API on :3000, UI on :5173, Ctrl+C stops both
npm run migrate    # after adding a migration or upgrading the framework
```

The framework's own documentation is at http://localhost:5173/docs.
