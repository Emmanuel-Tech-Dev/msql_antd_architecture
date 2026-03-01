import { saveAs } from "file-saver";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";

// import moment from "moment";
// import CountUp from "react-countup";
// import { set } from "lodash";
// import { legacyLogicalPropertiesTransformer } from "@ant-design/cssinjs";

import dayjs from "dayjs";

const utils = {
  getCurrentDate() {
    const date = dayjs().format("MMMM D, YYYY");
    return date;
  },
  calculateDataOfAndArray: (data, value) => {
    const totalValue = data?.reduce((acc, item) => acc + item[value], 0);
    return totalValue;
  },

  getBase64: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    }),

  handleDownloadCSV: (data, filename) => {
    const csvData = data?.map((item) => Object.values(item));
    const csvHeaders = Object.keys(data[0]);
    const csvContent = [csvHeaders, ...csvData]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${filename}.csv`);
  },

  currencyConvertor: (amount, currency = "GHS") => {
    // Using Intl.NumberFormat for currency formatting
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    });
    return formatter.format(amount); // $123,456.7
  },

  dateFormatter: (date) => {
    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Check if date is already a Date object, otherwise convert it
    const validDate = date instanceof Date ? date : new Date(date);

    // Check if the conversion to Date was successful
    if (isNaN(validDate)) {
      console.error("Invalid date:", date);
      return "Invalid date";
    }

    return dateFormatter.format(validDate);
  },

  // format a number as a percentage
  percentageFormatter: (value) => {
    const percentageFormatter = new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
    });
    return percentageFormatter.format(value);
  },

  formatNumber: (value) => {
    value = Number(value);
    console.log("Converted to number:", value); // Debugging statement
    if (isNaN(value)) return "0";
    if (value < 1000) return value.toString();
    const units = ["", "K", "M", "B", "T", "Q"];
    let unitIndex = 0;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
      console.log("Value after division:", value, "Unit index:", unitIndex); // Debugging statement
    }

    const formattedValue =
      value.toFixed(1).replace(/\.0$/, "") + units[unitIndex];
    console.log("Formatted value:", formattedValue); // Debugging statement
    return formattedValue;
  },
  // Purals
  purals: (text) => {
    const pluralize = new Intl.PluralRules("en");
    return pluralize.select(text);
  },

  //Format relative time
  relativeTimeFormart: (date) => {
    const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
      numeric: "auto",
    });
    const now = new Date();
    const differenceInMs = date - now;

    // Calculate time differences
    const seconds = Math.round(differenceInMs / 1000);
    const minutes = Math.round(differenceInMs / (1000 * 60));
    const hours = Math.round(differenceInMs / (1000 * 60 * 60));
    const days = Math.round(differenceInMs / (1000 * 60 * 60 * 24));

    // Determine the appropriate unit and return the formatted string
    if (Math.abs(days) >= 1) {
      return relativeTimeFormatter.format(days, "day");
    } else if (Math.abs(hours) >= 1) {
      return relativeTimeFormatter.format(hours, "hour");
    } else if (Math.abs(minutes) >= 1) {
      return relativeTimeFormatter.format(minutes, "minute");
    } else {
      return relativeTimeFormatter.format(seconds, "second");
    }
  },

  generateRandomColor: () => {
    const letter = "BCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letter[Math.floor(Math.random() * letter.length)];
    }

    return color;
  },

  //   dateConvertor: (date) => {
  //     const formateDate = moment(date).format("MMMM DD, YYYY hh:mm:ss a");
  //     return formateDate;
  //   },
  //   dateConvertorV2: (date) => {
  //     const formateDate = moment(date).format("MMMM DD, YYYY");
  //     return formateDate;
  //   },

  printReceipts: (printableId) => {
    const printable = document.getElementById(printableId);
    if (!printable) {
      console.error(`Element with ID "${printableId}" not found.`);
      return;
    }

    // Ensure a single print window instance
    let printWindow = window.open("", "printWindow", "width=1000,height=1000");
    if (!printWindow) {
      console.error(
        "Failed to open print window. Please check browser popup settings.",
      );
      return;
    }

    // Fetch styles from the current document
    const styles = Array.from(
      document.querySelectorAll("link[rel='stylesheet'], style"),
    )
      .map((style) => style.outerHTML)
      .join("\n");

    const html = printable.innerHTML;

    // Write the printable content with styles
    printWindow.document.write(`
            <html>
              <head>
                ${styles} <!-- Inject styles -->
              </head>
              <body>${html}</body>
            </html>
          `);

    setTimeout(() => {
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);

    // Delay by 0ms to allow the DOM to update
  },

  //   generatePdf: (ref) => {
  //     const element = document.getElementById(ref);

  //     html2canvas(element, {
  //       scale: 2,
  //       useCORS: true,
  //       logging: false,
  //     })
  //       .then((canvas) => {
  //         const imgData = canvas.toDataURL("image/png");
  //         const pdf = new jsPDF({
  //           orientation: "landscape",
  //           unit: "px",
  //           format: "a5",
  //           // margins: 20
  //         });
  //         const imgProps = pdf.getImageProperties(imgData);
  //         const pdfWidth = pdf.internal.pageSize.getWidth() - 10;
  //         const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  //         pdf.addImage(
  //           imgData,
  //           "PNG",
  //           0,
  //           0,
  //           pdfWidth,
  //           pdfHeight,
  //           undefined,
  //           "FAST",
  //         );

  //         pdf.save(`Receipt-${new Date().toISOString().slice(0, 10)}.pdf`);
  //       })
  //       .catch((error) => {
  //         console.error("PDF Generation Error:", error);
  //         message.error("Failed to generate PDF");
  //       });
  //   },
  truncateText: (title, maxLength) => {
    if (title.length > maxLength) {
      return title.slice(0, maxLength - 3) + "...";
    }
    return title;
  },
  getInitials: (data) => {
    const firstLetter = data.charAt(0).toUpperCase();

    return firstLetter;
  },

  getInitials_v2: (name) => {
    const syllabul = name
      ?.split(" ")
      ?.map((word) => word[0]?.toUpperCase())
      ?.join("");

    return syllabul;
  },

  //   copyToClipboard: async (text) => {
  //     try {
  //       await navigator.clipboard.writeText(text);
  //       message.success("Copied to clipboard");
  //     } catch (error) {
  //       console.log(error);
  //       return message.error("Failed to copy to clipboard");
  //     }
  //   },

  //   formatter: (value) => {
  //     return <CountUp end={value} separator="," />;
  //   },

  fromNow(date) {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;
    const units = [
      {
        max: 30 * SECOND,
        divisor: 1,
        past1: "just now",
        pastN: "just now",
        future1: "just now",
        futureN: "just now",
      },
      {
        max: MINUTE,
        divisor: SECOND,
        past1: "a second ago",
        pastN: "# seconds ago",
        future1: "in a second",
        futureN: "in # seconds",
      },
      {
        max: HOUR,
        divisor: MINUTE,
        past1: "a minute ago",
        pastN: "# minutes ago",
        future1: "in a minute",
        futureN: "in # minutes",
      },
      {
        max: DAY,
        divisor: HOUR,
        past1: "an hour ago",
        pastN: "# hours ago",
        future1: "in an hour",
        futureN: "in # hours",
      },
      {
        max: WEEK,
        divisor: DAY,
        past1: "yesterday",
        pastN: "# days ago",
        future1: "tomorrow",
        futureN: "in # days",
      },
      {
        max: 4 * WEEK,
        divisor: WEEK,
        past1: "last week",
        pastN: "# weeks ago",
        future1: "in a week",
        futureN: "in # weeks",
      },
      {
        max: YEAR,
        divisor: MONTH,
        past1: "last month",
        pastN: "# months ago",
        future1: "in a month",
        futureN: "in # months",
      },
      {
        max: 100 * YEAR,
        divisor: YEAR,
        past1: "last year",
        pastN: "# years ago",
        future1: "in a year",
        futureN: "in # years",
      },
      {
        max: 1000 * YEAR,
        divisor: 100 * YEAR,
        past1: "last century",
        pastN: "# centuries ago",
        future1: "in a century",
        futureN: "in # centuries",
      },
      {
        max: Infinity,
        divisor: 1000 * YEAR,
        past1: "last millennium",
        pastN: "# millennia ago",
        future1: "in a millennium",
        futureN: "in # millennia",
      },
    ];
    const diff =
      Date.now() - (typeof date === "object" ? date : new Date(date)).getTime();
    const diffAbs = Math.abs(diff);
    for (const unit of units) {
      if (diffAbs < unit.max) {
        const isFuture = diff < 0;
        const x = Math.round(Math.abs(diff) / unit.divisor);
        if (x <= 1) return isFuture ? unit.future1 : unit.past1;
        return (isFuture ? unit.futureN : unit.pastN).replace("#", x);
      }
    }
  },

  bootstrap: (valuesStore, settingsStore, fetchItems = null, auto = true) => {
    if (auto) {
      const states = settingsStore.getStates();
      Object.keys(states)?.forEach(async (p) => {
        const params = states[p];
        if (typeof params == "object" && params?.url) {
          let data = {
            critfdx: params?.critfdx,
            critval: params?.critval,
            logical: params?.logical,
            table: params?.table,
            getall: params?.getall,
            fields: params?.fields,
          };

          let res = await utils.requestWithReauth(
            params.method,
            params.url,
            null,
            data,
          );
          valuesStore.setValue(params.storeName, res);
        }
      });
    }
    // Only call fetchItems if explicitly provided and auto is not already handling it
    if (fetchItems && !auto) {
      fetchItems?.forEach(async (params, i) => {
        let data = {
          critfdx: params?.critfdx,
          critval: params?.critval,
          logical: params?.logical,
          table: params?.table,
          getall: params?.getall,
          fields: params?.fields,
        };
        let res = await utils.requestWithReauth(
          params.method,
          params.url,
          null,
          data,
        );
        valuesStore.setValue(params.storeName, res);
      });
    }
  },

  //   DynamicIcon: ({ iconClass, size = "16px", className = "" }) => {
  //     return (
  //       <i
  //         className={`${iconClass} ${className}`}
  //         style={{
  //           fontSize: size,
  //           minWidth: size,
  //           textAlign: "center",
  //           display: "inline-block",
  //         }}
  //       />
  //     );
  //   },

  //   renderMenuItems: (items, key, navigate) =>
  //     items?.map((item) => {
  //       // const navigate = useNavigate();
  //       const icon = item?.icon;
  //       if (item?.has_dropdown) {
  //         return {
  //           key: item?.[key],
  //           label: item?.[key],
  //           icon: <utils.DynamicIcon iconClass={icon} size="12px" />,
  //           children: item.children?.length
  //             ? utils.renderMenuItems(item?.children, key, navigate)
  //             : [], // caret still shows
  //         };
  //       }

  //       return {
  //         key: item?.resource_name,
  //         label: item?.resource_name,
  //         icon: <utils.DynamicIcon iconClass={icon} size="12px" />,
  //         onClick: () => navigate(item?.resource_path),
  //       };
  //     }),

  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  groupBy: function (xs, key) {
    return xs?.reduce(function (rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  },

  //   showNotification(
  //     msg = "Attention",
  //     description,
  //     type = "text-red-500",
  //     placement = "bottomRight",
  //     config = {},
  //   ) {
  //     message.open({
  //       message: (
  //         <label className={`font-bolder ${type}`}>
  //           <i className="fas fa-exclamation-circle"></i> {msg}
  //         </label>
  //       ),
  //       description: description,
  //       placement: placement,
  //       ...config,
  //     });
  //   },
  formatDateV2(date, delimeter = "-", joiner = "-") {
    const d = date?.split(delimeter);
    const rev = d?.reverse();
    return rev?.join(joiner);
  },
  formatDate(date, joiner = "-") {
    var d = new Date(date),
      month = "" + (d.getMonth() + 1),
      day = "" + d.getDate(),
      year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join(joiner);
  },
  formatDateV3(date, format = "dddd, MMMM D, YYYY") {
    const d = dayjs(date);
    return d?.format(format);
  },

  formatBytes: (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  formatUptime: (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  },

  getDaysFromRawDate(start, end) {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    return endDate.diff(startDate, "days");
  },
  getDaysFromRawDateV2(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    return days;
  },

  // utils.setupInterceptors();
  // utils.csrfInstance()

  addMaximumScaleToMetaViewport: () => {
    const el = document.querySelector("meta[name=viewport]");
    if (el !== null) {
      let content = el.getAttribute("content");
      let re = /maximum\-scale=[0-9\.]+/g;
      if (re.test(content)) {
        content = content.replace(re, "maximum-scale=1.0");
      } else {
        content = [content, "maximum-scale=1.0"].join(", ");
      }
      el.setAttribute("content", content);
    }
  },

  checkIsIOS: () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
};

export default utils;
