import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Rubric from "./pages/Rubric";  // <-- add this

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id/:set" element={<Detail />} />
        <Route path="/rubric" element={<Rubric />} />   {/* <-- add this */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
