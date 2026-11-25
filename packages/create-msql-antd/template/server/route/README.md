Your route classes go here. A route is a class whose constructor registers endpoints:

```js
const { Model, AppError } = require("@msql-antd/framework-server");

class InvoiceRoute {
  constructor(app) {
    app.get("/api/v1/invoices/summary", async (req, res) => {
      const total = await new Model().select("id", "invoices").count();
      res.json({ total });
    });
  }
}

module.exports = InvoiceRoute;
```

Add it to `routes` in `index.js`, then create its API resource (Settings > Resources) and give a role the permission.
