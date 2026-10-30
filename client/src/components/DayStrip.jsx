import { dayOfMonth, formatDay, weekday } from '../utils/format';

// Row of day buttons; days are 'YYYY-MM-DD' strings
export default function DayStrip({ days, selected, onSelect }) {
  return (
    <div className="day-strip" role="group" aria-label="Choose a day">
      {days.map((day) => (
        <button
          key={day}
          type="button"
          className="day-tab"
          aria-pressed={day === selected}
          aria-label={formatDay(day)}
          onClick={() => onSelect(day)}
        >
          <span className="day-name">{weekday(day)}</span>
          <span className="day-num">{dayOfMonth(day)}</span>
        </button>
      ))}
    </div>
  );
}
