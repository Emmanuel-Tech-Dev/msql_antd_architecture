import apiClient from "./apiClient";

const api = {
  //   async refreshToken() {
  //     try {
  //       const res = await apiClient.post("/auth/refreshToken");
  //       return res;
  //     } catch (error) {
  //       throw error.response.data;
  //     }
  //   },

  async getData(endpoint) {
    try {
      const res = await apiClient.get(endpoint);
      return res?.data.data;
    } catch (error) {
      throw error.response.data;
    }
  },
};

export default api;
