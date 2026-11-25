import { googleMapsProvider } from "./googleMapsProvider";
import { mapboxProvider } from "./mapboxProvider";

const providers = new Map([
  [googleMapsProvider.name, googleMapsProvider],
  [mapboxProvider.name, mapboxProvider],
]);

const validateProvider = (provider) => {
  if (!provider?.name || typeof provider.create !== "function") {
    throw new TypeError("A map provider requires a name and create function");
  }
  return provider;
};

export const registerMapProvider = (name, adapter) => {
  const provider = validateProvider({ ...adapter, name });
  providers.set(name, provider);
  return () => providers.delete(name);
};

export const resolveMapProvider = (provider) => {
  if (typeof provider === "object") return validateProvider(provider);
  const resolved = providers.get(provider);
  if (!resolved) {
    throw new Error(
      `Unknown map provider "${provider}". Registered providers: ${[
        ...providers.keys(),
      ].join(", ")}`,
    );
  }
  return resolved;
};

export const listMapProviders = () => [...providers.keys()];
