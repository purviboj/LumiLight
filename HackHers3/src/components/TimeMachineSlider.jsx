export default function TimeMachineSlider({
  selectedYear,
  onYearChange,
  minYear = 1990,
  maxYear = 2025
}) {
  return (
    <div className="glass-panel panel-hover rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Time Machine</h2>
        {/* Compact label keeps the active year visible while scrubbing. */}
        <span className="rounded-md bg-lumi-accent/20 px-2 py-1 text-xs font-semibold text-lumi-accent transition-colors duration-200">
          {selectedYear}
        </span>
      </div>

      <input
        type="range"
        min={minYear}
        max={maxYear}
        step="1"
        value={selectedYear}
        onChange={(event) => onYearChange(Number(event.target.value))}
        className="time-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700/80"
      />

      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  );
}
