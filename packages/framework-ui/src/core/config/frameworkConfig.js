// Settings a project passes to <FrameworkApp config>. A library build cannot read
// the project's import.meta.env, so these are filled in at runtime instead.
export const frameworkConfig = {
  apiUrl: '',
  socketUrl: '',
  googleClientId: '',
  mapProvider: 'mapbox',
  mapboxAccessToken: '',
  googleMapsApiKey: '',
  googleMapId: '',
};

export function configureFramework(options = {}) {
  for (const [key, value] of Object.entries(options)) {
    if (key in frameworkConfig && value !== undefined && value !== null) frameworkConfig[key] = value;
  }
  return frameworkConfig;
}

export const apiBaseUrl = () => String(frameworkConfig.apiUrl || window.location.origin).replace(/\/$/, '');
