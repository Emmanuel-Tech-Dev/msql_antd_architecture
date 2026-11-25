const Settings = {
  baseUrl: import.meta.env.VITE_BASE_URL,
  defaultNavContents: {
    defaults: {
      logoText: "MyWebsite",
      links: [
        { label: "Home", url: "/" },
        { label: "About", url: "/about" },
        { label: "Services", url: "/services" },
        { label: "Contact", url: "/contact" },
      ],
      buttons: [
        { label: "Login", url: "/login" },
        { label: "Sign Up", url: "/signup" },
      ],
    },
    navOverrides: {
      wrapper: "flex justify-between items-center bg-gray-100 px-6 py-4",
      logo: "text-2xl font-extrabold text-indigo-600",
      link: "text-gray-800 hover:text-indigo-500",
      button: "bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700",
    },
  },
};

export default Settings;
