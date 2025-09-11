// src/components/PreferenceBox.jsx
import React from "react";

export default function PreferenceBox({
  locked,
  selected,            // 1 | 2 | "tie" | undefined
  setSelected,
  strength,            // "weak" | "moderate" | "strong" | null
  setStrength,
  onSubmit,
}) {
  const prefBtn = (val, label) => {
    const active =
      (val === 1 && selected === 1) ||
      (val === 2 && selected === 2) ||
      (val === "tie" && selected === "tie");

    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => setSelected(val)}
        className={[
          "px-6 py-3 rounded-lg border text-xl font-semibold transition",
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
          locked ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const chip = (val, label, classes) => {
    const active = strength === val;
    const disabled = locked || selected === "tie" || !selected;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setStrength(val)}
        className={[
          "px-4 py-2 rounded-full border text-lg font-medium transition",
          active
            ? classes.active
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
        title={label}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="
        grid grid-cols-[1fr_auto] grid-rows-[auto_auto]
        items-start gap-x-6 gap-y-3
      "
    >
      {/* Row 1, Col 1: 1 / 2 / Tie */}
      <div className="flex items-center gap-4">
        {prefBtn(1, "1")}
        {prefBtn(2, "2")}
        {prefBtn("tie", "Tie")}
      </div>

      {/* Col 2 spans both rows: Submit lives here and never moves */}
      <div className="row-span-2 col-start-2 self-start">
        <button
          type="button"
          onClick={onSubmit}
          disabled={locked || !selected || (selected !== "tie" && !strength)}
          className={[
            "px-6 py-3 rounded-lg bg-black text-white font-semibold",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          Submit
        </button>
      </div>

      {/* Row 2, Col 1: Strength chips (reserve space so layout never shifts) */}
      <div
        className={[
          "flex items-center gap-3 min-h-[52px]",
          selected === "tie" || !selected ? "invisible" : "visible",
        ].join(" ")}
      >
        {chip("weak", "Weak", {
          active: "bg-amber-100 text-amber-800 border-amber-300",
        })}
        {chip("moderate", "Moderate", {
          active: "bg-blue-100 text-blue-800 border-blue-300",
        })}
        {chip("strong", "Strong", {
          active: "bg-red-600 text-white border-red-700",
        })}
      </div>
    </div>
  );
}
