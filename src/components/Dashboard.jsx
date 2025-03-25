import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Activity, Clock, Smartphone, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SERVER_URL = "http://115.241.211.186:8080";

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", labels: { color: "#374151" } },
    title: {
      display: true,
      text: "Events Over Time",
      color: "#374151",
      font: { size: 16 },
    },
  },
  scales: {
    x: { ticks: { color: "#6B7280" }, grid: { display: false } },
    y: { ticks: { color: "#6B7280" }, grid: { color: "rgba(0, 0, 0, 0.05)" } },
  },
};

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "right", labels: { color: "#374151" } },
    title: {
      display: true,
      text: "Touch Detection Distribution",
      color: "#374151",
      font: { size: 16 },
    },
  },
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", labels: { color: "#374151" } },
    title: {
      display: true,
      text: "Active Devices Per Month",
      color: "#374151",
      font: { size: 16 },
    },
  },
  scales: {
    x: { ticks: { color: "#6B7280" }, grid: { display: false } },
    y: { ticks: { color: "#6B7280" }, grid: { color: "rgba(0, 0, 0, 0.05)" } },
  },
};

export function Dashboard() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [lineChartData, setLineChartData] = useState({});
  const [pieChartData, setPieChartData] = useState({});
  const [barChartData, setBarChartData] = useState({});

  useEffect(() => {
    const socketInstance = io(SERVER_URL);
    setSocket(socketInstance);

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));

    socketInstance.on("new-data", (data) => {
      console.log("Received new data from server: ", data);
      setEvents((prevEvents) => {
        const eventExists = prevEvents.some((event) => event._id === data._id);
        const updatedEvents = eventExists ? prevEvents : [...prevEvents, data];
        const sortedEvents = updatedEvents.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        updateChartData(sortedEvents);
        return sortedEvents;
      });
    });

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${SERVER_URL}/getData`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          mode: "cors",
          cache: "no-cache",
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        const sortedData = data.data.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setEvents(sortedData);
        updateChartData(sortedData);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch data";
        setError(`Connection error: ${errorMessage}`);
        console.error("Fetch request failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => socketInstance.disconnect();
  }, []);

  const updateChartData = (eventsData) => {
    // Line Chart Data
    const eventsByDate = eventsData.reduce((acc, event) => {
      const date = new Date(event.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    setLineChartData({
      labels: Object.keys(eventsByDate),
      datasets: [
        {
          label: "Events",
          data: Object.values(eventsByDate),
          borderColor: "rgb(79, 70, 229)",
          backgroundColor: "rgba(79, 70, 229, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    });

    // Pie Chart Data
    const touchStats = eventsData.reduce((acc, event) => {
      acc[event.touch_detected] = (acc[event.touch_detected] || 0) + 1;
      return acc;
    }, {});
    setPieChartData({
      labels: Object.keys(touchStats),
      datasets: [
        {
          data: Object.values(touchStats),
          backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(239, 68, 68, 0.8)"],
          borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)"],
          borderWidth: 1,
        },
      ],
    });

    // Bar Chart Data (Active Devices per Month)
    const activeDevicesByMonth = eventsData.reduce((acc, event) => {
      const date = new Date(event.createdAt);
      const monthYear = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!acc[monthYear]) {
        acc[monthYear] = new Set();
      }
      acc[monthYear].add(event.device_id);
      return acc;
    }, {});

    setBarChartData({
      labels: Object.keys(activeDevicesByMonth),
      datasets: [
        {
          label: "Active Devices",
          data: Object.values(activeDevicesByMonth).map((set) => set.size),
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
        },
      ],
    });
  };

  const handleDeviceClick = (deviceId) => {
    setSelectedDevice(deviceId);
  };

  const getTodayTouchStats = (deviceId) => {
    const today = new Date().toISOString().split("T")[0];
    const touchEventsToday = events.filter(
      (event) =>
        event.device_id === deviceId &&
        event.touch_detected === "YES" &&
        event.createdAt.startsWith(today)
    );
    return {
      count: touchEventsToday.length,
      loginTime:
        touchEventsToday.length > 0
          ? formatDateTime(
              touchEventsToday[touchEventsToday.length - 1].createdAt
            )
          : "N/A",
      logoutTime:
        touchEventsToday.length > 0
          ? formatDateTime(touchEventsToday[0].createdAt)
          : "N/A",
    };
  };

  const uniqueDevices = "100";
  const totalEvents = events.length;
  const activeDevices = new Set(
    events
      .filter((event) => event.date !== "1970-01-01")
      .map((event) => event.device_id)
  ).size;
  const latestEvent = events[0];

  const GRADIENTS = [
    "from-indigo-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-pink-500 to-rose-600",
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
            socket ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              socket ? "bg-green-500" : "bg-red-500"
            } animate-pulse`}
          />
          {socket ? "Connected" : "Disconnected"}
        </div>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-red-100 text-red-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </div>

      <motion.header
        className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="h-8 w-8" />
            Device Events Dashboard
          </h1>
          <p className="mt-2 text-indigo-100">
            Real-time monitoring and analytics
          </p>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            {
              title: "Total Stations",
              value: uniqueDevices,
              icon: <Smartphone className="h-6 w-6" />,
              gradient: GRADIENTS[0],
            },
            {
              title: "Active Stations",
              value: activeDevices,
              icon: <Activity className="h-6 w-6" />,
              gradient: GRADIENTS[1],
            },
            {
              title: "Total Jobs Finished",
              value: totalEvents,
              icon: <AlertCircle className="h-6 w-6" />,
              gradient: GRADIENTS[2],
            },
            {
              title: "Last Event",
              value: latestEvent
                ? formatDateTime(latestEvent.createdAt)
                : "N/A",
              icon: <Clock className="h-6 w-6" />,
              gradient: GRADIENTS[3],
            },
          ].map((stat, index) => (
            <motion.div key={stat.title} variants={itemVariants}>
              <StatsCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="bg-white shadow-xl rounded-2xl p-6"
            variants={itemVariants}
          >
            <div className="h-80">
              {lineChartData.labels && (
                <Line options={lineChartOptions} data={lineChartData} />
              )}
            </div>
          </motion.div>

          <motion.div
            className="bg-white shadow-xl rounded-2xl p-6"
            variants={itemVariants}
          >
            <div className="h-80">
              {pieChartData.labels && (
                <Pie options={pieChartOptions} data={pieChartData} />
              )}
            </div>
          </motion.div>

          <motion.div
            className="bg-white shadow-xl rounded-2xl p-6"
            variants={itemVariants}
          >
            <div className="h-80">
              {barChartData.labels && (
                <Bar options={barChartOptions} data={barChartData} />
              )}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="bg-white shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm bg-opacity-90 border border-gray-100"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Recent Events
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Device ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Event Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Event Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Touch Detected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Received At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence mode="popLayout">
                  {events.map((event, index) => (
                    <motion.tr
                      key={event._id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => handleDeviceClick(event.device_id)}
                      >
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors duration-200">
                          {event.device_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {event.touch_detected}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(event.createdAt)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-xl flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-700">Loading data...</span>
            </div>
          </div>
        )}

        {selectedDevice && (
          <motion.div
            className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Operator Activity for Device: {selectedDevice} (Today)
              </h3>
              {(() => {
                const stats = getTodayTouchStats(selectedDevice);
                return (
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Touches Today:</span>
                      <span>{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operator Login Time:</span>
                      <span>{stats.loginTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Device Start Time:</span>
                      <span>{stats.loginTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Device End Time:</span>
                      <span>{stats.loginTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operator Logout Time:</span>
                      <span>{stats.logoutTime}</span>
                    </div>
                  </div>
                );
              })()}
              <button
                className="mt-6 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                onClick={() => setSelectedDevice(null)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function StatsCard({ title, value, icon, gradient }) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300`}
    >
      <div className="px-6 py-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 bg-white bg-opacity-30 rounded-lg">
            <div className="text-white">{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-white text-opacity-80 truncate">
                {title}
              </dt>
              <dd className="text-lg font-bold text-white mt-1">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}




function formatDateTime(dateTimeStr) {
  return new Date(dateTimeStr).toLocaleString();
}
