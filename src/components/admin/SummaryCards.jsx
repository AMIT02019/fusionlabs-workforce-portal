export default function SummaryCards({ summary }) {
  const { total, present, halfday, absent, checkedIn } = summary

  return (
    <div className="summary-grid">
      <div className="summary-card sc-total">
        <div className="summary-label">Total Employees</div>
        <div className="summary-value">{total}</div>
      </div>
      <div className="summary-card sc-present">
        <div className="summary-label">Present Today</div>
        <div className="summary-value">{present}</div>
      </div>
      <div className="summary-card sc-halfday">
        <div className="summary-label">Half Day Today</div>
        <div className="summary-value">{halfday}</div>
      </div>
      <div className="summary-card sc-absent">
        <div className="summary-label">Absent Today</div>
        <div className="summary-value">{absent}</div>
      </div>
      <div className="summary-card sc-working">
        <div className="summary-label">Currently Checked In</div>
        <div className="summary-value">{checkedIn}</div>
      </div>
    </div>
  )
}
