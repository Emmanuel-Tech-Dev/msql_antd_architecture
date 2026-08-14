const accessFunctions = {
  assigned(data, setKey) {
    if (!data?.data?.assigned) return null;
    return new Set(data.data.assigned.map((a) => a?.[setKey]));
  },
};

export default accessFunctions;
