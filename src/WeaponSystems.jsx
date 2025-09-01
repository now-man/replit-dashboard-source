// WeaponSystems.jsx
import React from "react";

export default function WeaponSystems({ missionLogs }) {
  // missionLogs 객체의 키(날짜)를 가져와 최신순으로 정렬
  const sortedDates = Object.keys(missionLogs).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div>
      {/* sortedDates 배열의 길이를 확인하여 로그 유무를 판단 */}
      {sortedDates.length === 0 ? (
        <div className="card">
          <h3>작전 피드백 기록</h3>
          <p>기록된 피드백이 없습니다. '피드백 입력' 페이지에서 새로운 피드백을 추가해주세요.</p>
        </div>
      ) : (
        // 날짜별로 순회하며 로그 목록을 생성
        sortedDates.map(date => (
          <div key={date} className="card log-card">
            <h3>{date}</h3>
            <div className="log-list">
              {}
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