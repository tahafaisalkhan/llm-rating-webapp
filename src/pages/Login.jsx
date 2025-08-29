import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAllowed, setRater } from "../utils/auth";

export default function Login() {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    const upper = (name || "").trim().toUpperCase();
    if (!isAllowed(upper)) {
      setErr("Not an allowed user. Use ALL CAPS (e.g., USER1).");
      return;
    }
    try {
      setRater(upper);
      nav("/");
    } catch (e2) {
      setErr(e2.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="bg-white border rounded-2xl p-6 w-[360px] space-y-4">
        <h1 className="text-xl font-bold text-center">Sign in</h1>
        <label className="text-sm text-gray-600 block">Username (ALL CAPS)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="USER1"
          className="w-full border rounded px-3 py-2 tracking-widest"
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="w-full bg-black text-white rounded py-2 font-semibold">Continue</button>
        <p className="text-xs text-gray-500">Allowed users are set in <code>src/config/appConfig.js</code></p>
      </form>
    </div>
  );
}
