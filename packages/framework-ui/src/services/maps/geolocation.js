export const getBrowserPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
        ...options,
      },
    );
  });
