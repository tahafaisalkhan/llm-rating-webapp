import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Rubric from "./pages/Rubric";
import Login from "./pages/Login";
import { getRater } from "./utils/auth";

function RequireAuth({ children }) {
  const r = getRater();
  if (!r) return <Navigate to="/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/item/:id/:set"
          element={
            <RequireAuth>
              <Detail />
            </RequireAuth>
          }
        />
        <Route
          path="/rubric"
          element={
            <RequireAuth>
              <Rubric />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
