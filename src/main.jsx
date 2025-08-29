import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import Detail from "./pages/Detail";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id/:set" element={<Detail />} /> {/* set = "set1"|"set2" */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
