export const normalizePosition = (position) => {
  const lat = Number(position?.lat ?? position?.latitude);
  const lng = Number(position?.lng ?? position?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError("A map position requires numeric lat and lng values");
  }

  return { lat, lng };
};

export const normalizeTravelMode = (mode = "driving") => {
  const normalized = String(mode).toLowerCase();
  const aliases = {
    bicycling: "bicycling",
    cycling: "bicycling",
    driving: "driving",
    pedestrian: "walking",
    transit: "transit",
    walking: "walking",
  };

  return aliases[normalized] || "driving";
};
