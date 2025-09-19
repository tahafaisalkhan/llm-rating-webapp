// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setRater, isAllowed } from "../utils/auth";
import { CREDENTIALS } from "../config/appConfig";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const uname = (name || "").trim();
      const pwd = (password || "");
      if (!isAllowed(uname, pwd)) {
        setErr("Invalid username or password.");
        return;
      }
      setRater(uname);
      navigate("/");
    } catch (e2) {
      setErr(e2.message || "Login failed.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Rater Login</h1>
        <p className="text-sm text-gray-600">Enter your username and password.</p>

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="username (e.g., tahafaisalkhan)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <div className="text-sm text-red-700">{err}</div>}

        <button className="w-full bg-black text-white rounded px-3 py-2 font-semibold">
          Continue
        </button>

        <div className="text-xs text-gray-500">
          Contact team if username/password are not working.
        </div>
      </form>
    </div>
  );
}
