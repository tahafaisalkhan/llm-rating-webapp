import React from "react";

export default function PreferenceBox({
  submitted,   // boolean (has a prior submission)
  selected,    // 1 | 2 | "tie" | undefined
  setSelected,
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

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        {prefBtn(1, "1")}
        {prefBtn(2, "2")}
        {prefBtn("tie", "Tie")}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!selected}
          className="px-3 py-1.5 rounded-md bg-black text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitted ? "Resubmit" : "Submit"}
        </button>
      </div>
    </div>
  );
}
