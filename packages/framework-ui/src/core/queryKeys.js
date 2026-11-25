const resourceScope = (resource, cacheKey) => resource || cacheKey;

const queryKeys = {
  all: (resource) => [resource],
  lists: (resource) => [resource, "list"],
  list: (cacheKey, resource, params) => [
    resourceScope(resource, cacheKey),
    "list",
    cacheKey ?? resource,
    params ?? {},
  ],
  details: (resource) => [resource, "detail"],
  one: (resource, id) => [resource, "detail", id],
  many: (resource, ids) => [resource, "many", ids],
  custom: (url, method, params, unwrap = false) => [
    "custom",
    String(method ?? "get").toLowerCase(),
    url,
    params ?? {},
    { unwrap },
  ],
  bootstrap: () => ["bootstrap"],
  filters: (resource, column) => [resource, "filters", column],
};

export default queryKeys;
