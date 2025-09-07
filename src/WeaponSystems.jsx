// WeaponSystems.jsx
import React from "react";

export default function WeaponSystems({ missionLogs }) {
  // 🔽 정렬 순서를 new Date(a) - new Date(b)로 변경하여 날짜순(오름차순)으로 정렬합니다.
  const sortedDates = Object.keys(missionLogs).sort((a, b) => new Date(a) - new Date(b));

  return (
    <div>
      {sortedDates.length === 0 ? (
        <div className="card">
          <h3>작전 피드백 기록</h3>
          <p>기록된 피드백이 없습니다. '피드백 입력' 페이지에서 새로운 피드백을 추가해주세요.</p>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date} className="card log-card">
            <h3>{date}</h3>
            <div className="log-list">
              {missionLogs[date]
                .slice() 
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(log => (
                  <div key={log.id} className="log-item">
                    <span className="log-time">{log.time}</span>
                    <span className="log-equipment">{log.equipment}</span>
                    <span className={`log-impact impact-text-${log.impactLevel.toLowerCase()}`}>
                      {log.impactLevel}
                    </span>
                  </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}