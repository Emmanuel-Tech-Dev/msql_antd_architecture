import { create } from "zustand";
import { createTrackedSelector } from "react-tracked";
import { devtools, persist } from "zustand/middleware";
//SOME STORE KEYS ARE SET DYAMICALLY

const store = (set, get) => ({
  loggedInUser: "", //user email @ chat
  phoneWidthBreakPoint: 700,
  routes: [], //admin/home.js,
  tables_metadata: [], //@bootstrap @ app.js

  setArray: (key, value) => {
    set((state) => ({
      [key]: [...state[key], ...value],
    }));
  },
  setValue: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    set((state) => ({ [key]: value }));
  },
  setLastAuthorizedPath: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    set((state) => ({ [key]: value }));
  },
  //   setCurrentRoute: (route) => {
  //     console.log(`setCurrentRoute: ${route}`);
  //     set({ current_route: route });
  //   },
  getArrayObjectsValue: (stateKey, searchKey, value) => {
    //returns a single item
    const state = get(); //zustand get callback function
    console.log(state, stateKey, searchKey, value);
    const record = state[stateKey];

    let val = {};
    if (Array.isArray(record)) {
      record?.forEach((v) => {
        if (v[searchKey] === value) {
          val = v;
        }
      });
    }
    return val;
  },
  getValue: (key) => {
    const state = get();
    return state[key];
  },
  getValuesBy: (stateKey, searchKey, value) => {
    //returns an array
    const state = get(); //zustand get callback function
    const record = state[stateKey];
    let val = [];
    if (Array.isArray(record)) {
      record?.forEach((v) => {
        if (v[searchKey] === value) {
          val.push(v);
        }
      });
    }
    return val;
  },
  updateObjectValue: (stateKey, whereKey, value) => {
    set((state) => {
      const record = { ...state[stateKey] };
      record[whereKey] = value;
      return { [stateKey]: record };
    });
  },
  updateValue: (stateKey, whereKey, whereValue, newValue) => {
    set((state) => {
      const record = state[stateKey];
      let newState = [...record];
      newState &&
        newState?.forEach((v, i) => {
          if (v[whereKey] === whereValue) {
            newState[i] = newValue;
          }
        });
      return { [stateKey]: newState };
    });
  },
  updateArrayObjectValue: (
    stateKey,
    whereKey,
    whereValue,
    itemKey,
    newValue,
  ) => {
    set((state) => {
      const record = state[stateKey];
      let newState = [...record];
      newState &&
        newState?.forEach((v, i) => {
          if (v[whereKey] === whereValue) {
            newState[i][itemKey] = newValue;
          }
        });
      return { [stateKey]: newState };
    });
  },
  deleteValue: (stateKey) => {
    set((state) => {
      localStorage.removeItem(stateKey);
      let newState = { ...state };
      delete newState[stateKey];
      return newState;
    });
  },
  deleteObjectValue: (stateKey, whereKey) => {
    set((state) => {
      localStorage.removeItem(stateKey);
      const record = state[stateKey];
      let newState = { ...record };
      delete newState[whereKey];
      return { [stateKey]: newState };
    });
  },
});

export const useStore = create(devtools(store));

const useTrackedStore = createTrackedSelector(useStore);
export default useTrackedStore;
