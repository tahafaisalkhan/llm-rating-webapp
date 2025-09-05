// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setRater, isAllowed } from "../utils/auth";
import { ALLOWED_USERS } from "../config/appConfig";

export default function Login() {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const upper = (name || "").trim().toUpperCase();
      if (!isAllowed(upper)) {
        setErr("Not an allowed user.");
        return;
      }
      setRater(upper);
      navigate("/");
    } catch (e2) {
      setErr(e2.message || "Login failed.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Rater Login</h1>
        <p className="text-sm text-gray-600">Enter your username in ALL CAPS (e.g., USER1).</p>

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="USERNAME"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {err && <div className="text-sm text-red-700">{err}</div>}

        <button className="w-full bg-black text-white rounded px-3 py-2 font-semibold">
          Continue
        </button>

        <div className="text-xs text-gray-500">
          Allowed: {ALLOWED_USERS.join(", ")}
        </div>
      </form>
    </div>
  );
}
