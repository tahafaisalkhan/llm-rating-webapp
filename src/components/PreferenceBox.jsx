import React from "react";

export default function PreferenceBox({
  // NOTE: We now use `submitted` only to decide the button label.
  // It does NOT disable the controls anymore (so resubmission stays allowed).
  submitted,           // boolean (has a prior submission)
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
        onClick={() => setSelected(val)}
        className={[
          "px-3 py-1.5 rounded-md border text-sm font-medium transition",
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  const chip = (val, label, classes) => {
    const active = strength === val;
    const disabled = selected === "tie" || !selected;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setStrength(val)}
        className={[
          "px-3 py-1 rounded-full border text-xs font-medium transition",
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
    <div className="flex flex-col items-center gap-1">
      {/* Row 1: preference + submit (inline) */}
      <div className="flex items-center gap-2">
        {prefBtn(1, "1")}
        {prefBtn(2, "2")}
        {prefBtn("tie", "Tie")}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!selected || (selected !== "tie" && !strength)}
          className="px-3 py-1.5 rounded-md bg-black text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitted ? "Resubmit" : "Submit"}
        </button>
      </div>

      {/* Row 2: strength chips (appear below; hidden for tie/no choice) */}
      <div
        className={[
          "flex items-center gap-2 min-h-[30px]",
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
