import React from "react";
import { Dashboard } from "./components/Dashboard";

const App = () => {
  return (
    <div className="">
      <Dashboard />
    </div>
  );
};
useEffect(() => {
  window.location.replace("https://digitalmanufacturing.cutmap.ac.in/dashboard");
}, []);

export default App;
