import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createTrackedSelector } from "react-tracked";
import Settings from "../utils/Settings";
const store = (set, get) => ({
  getStates: () => {
    //returns an array
    const states = get(); //zustand get callback function
    return states;
  },
  tables_metadata: {
    method: "post",
    table: "tables_metadata",
    url: `v1/bootstrap`,
    storeName: "tables_metadata",
  },

  settings: {
    method: "post",
    table: "admin_settings",
    url: `v1/bootstrap`,
    storeName: "settings",
    // critfdx: ["is_public"],
    // critval: ["1"],
    // fields: ["*"],
  },

  // admin_resources: {
  //   method: "post",
  //   table: "admin_resources",
  //   url: `${Settings.baseUrl}v1/get_browser_routes`,
  //   storeName: "admin_resources",
  //   critfdx: ["is_public"],
  //   critval: ["1"],
  //   fields: ["*"],
  // },

  // browser_routes: {
  //   method: "post",
  //   sql: `select * from admin_resources where is_public = 1 and type = 'BROWSER_ROUTE' order by rank desc`,
  //   url: `${Settings.baseUrl}/bootstrap_others`,
  //   storeName: "browser_routes",
  // },
});

const useStore = create(devtools(store));

const useTrackedStore = createTrackedSelector(useStore);
export default useTrackedStore;
