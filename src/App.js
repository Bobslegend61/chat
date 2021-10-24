import Chart from "react-apexcharts";
import DateRangePicker from "react-bootstrap-daterangepicker";
import moment from "moment";
import "./App.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-daterangepicker/daterangepicker.css";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const token = "";
  const [startDate, setStartDate] = useState(moment().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(
    moment().add(1, "days").format("YYYY-MM-DD"),
  );
  const [label, setLabel] = useState("Today");

  const [allLogs, setAllLogs] = useState([]);

  const [data, setData] = useState({
    options: {
      chart: {
        type: "bar",
        height: 350,
        stacked: true,
        toolbar: {
          show: true,
        },
        zoom: {
          enabled: true,
        },
      },
      xaxis: {
        categories: [],
      },
    },
    series: [],
  });

  const handleCallback = (start, end, label) => {
    if (label === "Custom Range") {
      setLabel(
        `${moment(start).format("YYYY/MM/DD")} - ${moment(end).format(
          "YYYY/MM/DD",
        )}`,
      );
    } else {
      setLabel(label);
    }

    setEndDate(moment(end).add(1, "days").format("YYYY-MM-DD"));
    setStartDate(moment(start).format("YYYY-MM-DD"));
  };

  useEffect(() => {
    const getLogs = async () => {
      try {
        const res = await axios({
          url: `admin/logs/graph?start=${startDate}&end=${endDate}&env=Sandbox`,
          method: "GET",
          baseURL: "https://services_staging.dojah.io/",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(res.data);
        setAllLogs(res.data.logs);
      } catch (error) {
        console.log(error);
      }
    };

    getLogs();
  }, [startDate]);

  useEffect(() => {
    const refreshChart = async () => {
      try {
        if (["Today", "Yesterday"].includes(label)) {
          const startOfDay = moment(startDate).startOf("day");
          const endOfDay =
            label === "Today"
              ? moment()
              : moment(endDate).subtract(1, "days").endOf("day");

          const hourDiff = endOfDay.diff(startOfDay, "hours");
          const categoryData = [];
          for (let i = 0; i <= hourDiff; i++) {
            categoryData.push(moment().startOf("day").add(i, "h").format("ha"));
          }

          let data = [];
          if (allLogs.length > 0) {
            const res = await axios({
              url: `admin/logs?start=${startDate}&end=${endDate}&env=Sandbox&limit=${allLogs[0].total}`,
              method: "GET",
              baseURL: "https://services_staging.dojah.io/",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            data = res.data.api_logs;
          }
          const all = {};
          const success = {};
          const failed = {};
          for (let log of data) {
            const currentHour = moment(log.createdAt).utc().format("ha");
            if (all[currentHour]) {
              all[currentHour] = all[currentHour] + 1;
            } else {
              all[currentHour] = 1;
            }

            if (log.status === "Success") {
              if (success[currentHour]) {
                success[currentHour] = success[currentHour] + 1;
              } else {
                success[currentHour] = 1;
              }
            }

            if (log.status === "Failed") {
              if (failed[currentHour]) {
                failed[currentHour] = failed[currentHour] + 1;
              } else {
                failed[currentHour] = 1;
              }
            }
          }

          setData((prevState) => ({
            ...prevState,
            options: {
              ...prevState.options,
              xaxis: {
                categories: categoryData,
              },
            },
            series: [
              {
                name: "All",
                data: categoryData.map((data) => all?.[data] || 0),
              },
              {
                name: "Success",
                data: categoryData.map((data) => success?.[data] || 0),
              },
              {
                name: "Failed",
                data: categoryData.map((data) => failed?.[data] || 0),
              },
            ],
          }));
        } else {
          const start = moment(startDate);
          const end = moment(endDate).subtract(1, "days");
          const categoryData = [start.format("DD-MM-YYYY")];
          const daysDiff = end.diff(start, "days");

          for (let i = 1; i <= daysDiff; i++) {
            categoryData.push(start.add(1, "days").format("DD-MM-YYYY"));
          }

          const res = await Promise.all([
            axios({
              url: `admin/logs/graph?start=${startDate}&end=${endDate}&env=Sandbox&status=success`,
              method: "GET",
              baseURL: "https://services_staging.dojah.io/",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }),
            axios({
              url: `admin/logs/graph?start=${startDate}&end=${endDate}&env=Sandbox&status=failed`,
              method: "GET",
              baseURL: "https://services_staging.dojah.io/",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }),
          ]);

          const success = res[0].data.logs;
          const failed = res[1].data.logs;

          setData((prevState) => ({
            ...prevState,
            options: {
              ...prevState.options,
              xaxis: {
                categories: categoryData,
              },
            },
            series: [
              {
                name: "All",
                data: categoryData.map(
                  (data) => allLogs.find(({ _id }) => _id === data)?.total || 0,
                ),
              },
              {
                name: "Success",
                data: categoryData.map(
                  (data) => success.find(({ _id }) => _id === data)?.total || 0,
                ),
              },
              {
                name: "Failed",
                data: categoryData.map(
                  (data) => failed.find(({ _id }) => _id === data)?.total || 0,
                ),
              },
            ],
          }));
        }
      } catch (error) {
        console.log(error);
      }
    };

    refreshChart();
  }, [allLogs]);

  return (
    <div className="App">
      <div className="selectors">
        <DateRangePicker
          onCallback={handleCallback}
          initialSettings={{
            maxDate: moment(),
            // minDate: startDate,
            startDate: moment(),
            endDate: moment(),
            // singleDatePicker: true,
            ranges: {
              Today: [moment(), moment()],
              Yesterday: [
                moment().subtract(1, "days"),
                moment().subtract(1, "days"),
              ],
              "Last 7 Days": [moment().subtract(7, "days"), moment()],
              "Last 30 Days": [moment().subtract(30, "days"), moment()],
              "This Month": [
                moment().startOf("month"),
                moment().endOf("month"),
              ],
              "Last Month": [
                moment().subtract(1, "month").startOf("month"),
                moment().subtract(1, "month").endOf("month"),
              ],
            },
          }}
        >
          <div>{label}</div>
        </DateRangePicker>
      </div>
      <Chart
        options={data.options}
        series={data.series}
        type="bar"
        width={500}
        height={320}
      />
    </div>
  );
}

export default App;
