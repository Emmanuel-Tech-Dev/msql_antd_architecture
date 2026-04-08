// src/core/queryKeys.js

const queryKeys = {
  list: (resource, params) => [resource, "list", params ?? {}],
  one: (resource, id) => [resource, "detail", id],
  many: (resource, ids) => [resource, "many", ids],
  custom: (url, params) => ["custom", url, params ?? {}],
  bootstrap: () => ["bootstrap"],
  filters: (resource, column) => [resource, "filters", column],
};

export default queryKeys;
