import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from "react-dom";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from "chart.js";
// annotationPlugin은 더 이상 사용하지 않으므로 import에서 제거합니다.
import { ArrowLeft, BotMessageSquare, Settings, MapPin, Edit3, Compass, Save } from 'lucide-react';
import WeaponSystems from "./WeaponSystems";

// --- CSS Imports ---
import "react-calendar/dist/Calendar.css";
import "./dashboard.css";

// --- Chart.js Registration ---
// annotationPlugin은 더 이상 사용하지 않으므로 register에서 제거합니다.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- Pre-defined Unit Data ---
const UNIT_DATA = {
  "제15특수임무비행단": { lat: 37.434879, lon: 127.105050 },
  "제17전투비행단": { lat: 36.722701, lon: 127.499102 },
  "제11전투비행단": { lat: 35.899526, lon: 128.639791 },
};

// =================================================================
//  Helper Functions
// =================================================================
const formatDateKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// =================================================================
//  Sub Components
// =================================================================

// --- Clock ---
function Clock({ timezone }) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let displayDate = now;
      let tzOptions = { timeZone: 'UTC' };

      if (timezone === 'KST') {
        const kstOffset = 9 * 60 * 60 * 1000;
        displayDate = new Date(now.getTime() + kstOffset);
      }

      const timeString = displayDate.toLocaleTimeString('en-GB', { ...tzOptions, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const dateString = `${displayDate.getUTCFullYear()}년 ${displayDate.getUTCMonth() + 1}월 ${displayDate.getUTCDate()}일`;

      setTime(timeString);
      setDate(dateString);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return <div>{date} | {time} {timezone}</div>;
}

// --- Weather ---
function Weather({ settings }) {
  const [weatherText, setWeatherText] = useState("날씨 정보 로딩 중...");

  useEffect(() => {
    const fetchWeather = (lat, lon) => {
      if (!lat || !lon) {
          setWeatherText("위도/경도 정보 없음");
          return;
      }
      const API_KEY = "402b17f5ee941f24e13c01620a13c7b8";
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`;

      fetch(url)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
          if (data.cod !== 200) {
            setWeatherText(`날씨 오류: ${data.message}`);
            return;
          }
          const temp = data.main.temp.toFixed(1);
          const description = data.weather[0].description;
          const locationName = settings.location.method === 'unit' ? settings.unitName : data.name;
          setWeatherText(`${locationName} | ${description} | ${temp}°C`);
        })
        .catch(() => setWeatherText("날씨 정보를 가져올 수 없습니다."));
    };

    const { location } = settings;

    if (location.method === 'current') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => setWeatherText("현재 위치를 찾을 수 없습니다.")
      );
    } else if (location.coords.lat && location.coords.lon) {
      fetchWeather(location.coords.lat, location.coords.lon);
    } else {
        setWeatherText("위치 정보가 설정되지 않음");
    }

  }, [settings]);

  return <div>{weatherText}</div>;
}


// --- GnsGraph (수정된 부분) ---
function GnsGraph({ settings }) {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        fetch("/data.json")
            .then((response) => response.json())
            .then((data) => {
                const gnssData = data.gnss_prediction;
                const threshold = parseFloat(settings?.defaultThreshold ?? 0);

                setChartData({
                    labels: gnssData.labels,
                    datasets: [
                        {
                            label: "GNSS 오차율 (%)",
                            data: gnssData.error_rate,
                            borderColor: "rgb(74, 163, 255)",
                            //backgroundColor: "rgba(74, 163, 255, 0.2)",
                            fill: false,
                            tension: 0.4,
                        },
                        {
                            label: "임계값 (%)",
                            data: Array(gnssData.labels.length).fill(threshold),
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            fill: false,
                            pointRadius: 0,
                        }
                    ],
                });
            });
    }, [settings]); // settings가 바뀔 때마다 차트를 다시 그리도록 설정

    const options = {
        maintainAspectRatio: false,
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: false, // Y축 제목 숨김
                }
            },
            x: {
                title: {
                    display: true,
                    text: '시간'
                }
            }
        },
        plugins: {
            legend: {
                position: 'top', // 범례 위치
            },
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

    return (
        <div className="card panel-gnss">
            <h3>시간대별 GNSS 예측 그래프</h3>
            <div className="chartbox">
                {chartData ? (
                    <Line options={options} data={chartData} />
                ) : (
                    <p>그래프 로딩 중...</p>
                )}
            </div>
        </div>
    );
}

// --- MyCalendar and its helpers ---
const StatusDot = ({ status }) => <div className={`status-dot c-lv${status - 1}`}></div>;

const LogTooltip = ({ logs, x, y }) => {
    return ReactDOM.createPortal(
      <div className="log-tooltip" style={{ top: `${y}px`, left: `${x}px` }}>
        {logs.map(log => (
          <div key={log.id} className="tooltip-item">
            <span className="tooltip-time">{log.time} - {log.equipment}</span>
            <span className="tooltip-impact">영향:
              <span className={`impact-text impact-text-${log.impactLevel.toLowerCase()}`}>{log.impactLevel}</span>
            </span>
          </div>
        ))}
      </div>,
      document.body
    );
};

function MyCalendar({ missionLogs }) {
  const [date, setDate] = useState(null);
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [opStatusData, setOpStatusData] = useState({});
  const [tooltipData, setTooltipData] = useState({ visible: false, logs: [], x: 0, y: 0 });
  const calendarRef = useRef(null);

  useEffect(() => {
    fetch("/data.json").then(res => res.json()).then(data => setOpStatusData(data.operation_status || {}));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setDate(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (logs, event) => {
    if (!logs || logs.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData({
      visible: true,
      logs,
      y: rect.top + window.scrollY - 8,
      x: rect.left + window.scrollX + rect.width / 2,
    });
  };

  const handleMouseLeave = () => setTooltipData(p => ({ ...p, visible: false }));
  const handleActiveStartDateChange = ({ activeStartDate }) => {
      setDate(null);
      setActiveStartDate(activeStartDate);
  };

  return (
    <div className="card panel-calendar">
      <div className="calendar-container" ref={calendarRef}>
        <Calendar
          value={date}
          onChange={setDate}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={handleActiveStartDateChange}
          formatDay={(locale, date) => date.getDate().toString()}
          formatMonthYear={(locale, date) => `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}`}
          calendarType="gregory"
          showNeighboringMonth={false}
          next2Label={null}
          prev2Label={null}
          tileContent={({ date, view }) => {
            if (view === "month") {
              const dateKey = formatDateKey(date);
              const status = opStatusData[dateKey];
              const logsForDate = missionLogs[dateKey];
              return (
                <div className="tile-event-wrapper" onMouseEnter={(e) => handleMouseEnter(logsForDate, e)} onMouseLeave={handleMouseLeave}>
                  <div className="tile-content-wrapper">
                    {status && <StatusDot status={status} />}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
      </div>
       <div className="calendar-legend-container">
            <div className="legend-item"><span className="legend-dot c-lv0"></span> 정상</div>
            <div className="legend-item"><span className="legend-dot c-lv1"></span> 주의</div>
            <div className="legend-item"><span className="legend-dot c-lv2"></span> 경고</div>
            <div className="legend-item"><span className="legend-dot c-lv3"></span> 위험</div>
      </div>
      {tooltipData.visible && <LogTooltip logs={tooltipData.logs} x={tooltipData.x} y={tooltipData.y} />}
    </div>
  );
}

// --- Other Dashboard Components ---
function TecChange() {
  return ( <div className="card panel-map"><h3>30일 평균 대비 TEC 변화</h3><div className="mapbox"><img src="/TEC_change.png" alt="TEC 변화" /></div></div> );
}
function MissionNotice() {
  return ( <div className="card panel-notice"><h3>금일 임무 권고 사항</h3><div className="notice"><div className="icon" /><div className="body"><strong>XAI:</strong> 2025-08-25 14:20~19:20<br />Kp 7 지수 이상 상승 예측으로 GNSS 15m 오차가 증가할 것으로 예상되어 정밀 타격 임무의 CEP오차가 증가할 수 있음. <span className="badge warn">경보</span><time>업데이트: 09:45 UTC</time></div></div></div> );
}
function NavigationGauge() {
  return ( <div className="card panel-gauges"><h3>위성 항법 경보 태세</h3><div className="gauges"><div className="gauge warn"><div className="dial" /><div className="label">실제</div></div><div className="gauge ok"><div className="dial" /><div className="label">예측</div></div></div></div> );
}
function TodoList() {
  return ( <div className="card panel-todo"><h3>주요활동</h3><div className="todo"><div className="item"><span className="time">12:30</span><span>항공통제비행대 임무전 브리핑</span><span className="tag">Brief</span></div><div className="item"><span className="time">14:00</span><span>E-737 Take Off</span><span className="tag">Flight</span></div></div></div> );
}
function DashboardLayout({ missionLogs, settings }) {
  return ( <section className="grid"> <GnsGraph settings={settings} /> <MyCalendar missionLogs={missionLogs} /> <TecChange /> <MissionNotice /> <NavigationGauge /> <TodoList /> </section> );
}

// --- FeedbackView ---
function FeedbackView({ equipment, onSubmit }) {
  const navigate = useNavigate();
  const [log, setLog] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    equipment: equipment.length > 0 ? equipment[0].name : '',
    impactLevel: '정상',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!log.equipment) { alert("장비를 선택해주세요."); return; }
    if (!log.date) { alert("날짜를 선택해주세요."); return; }
    onSubmit(log);
  };
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={() => navigate(-1)} className="back-button"><ArrowLeft size={24} /></button>
            <h3 style={{ margin: '0 0 0 1rem' }}>작전 피드백 입력</h3>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-row">
                <div> <label className="form-label">작전 날짜</label> <input type="date" value={log.date} onChange={e => setLog({ ...log, date: e.target.value })} className="form-input" /> </div>
                <div> <label className="form-label">작전 시간</label> <input type="time" value={log.time} onChange={e => setLog({ ...log, time: e.target.value })} className="form-input" /> </div>
            </div>
            <div> <label className="form-label">운용 장비</label> <select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })} className="form-input"> {equipment.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)} </select> </div>
            <div> <label className="form-label">관측된 GNSS 영향 수준</label> <div className="impact-buttons"> {['정상', '주의', '위험'].map(level => ( <button key={level} type="button" onClick={() => setLog({ ...log, impactLevel: level })} className={`impact-button ${log.impactLevel === level ? `impact-${level.toLowerCase()}` : ''}`}> {level} </button> ))} </div> </div>
            <div style={{ paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}> <button type="submit" className="submit-button"> <BotMessageSquare size={20} /><span>피드백 제출</span> </button> </div>
        </form>
    </div>
  );
};


// =================================================================
//  Settings View Component
// =================================================================
const SettingsView = ({ settings, setSettings, goBack }) => {
  const [localSettings, setLocalSettings] = useState(JSON.parse(JSON.stringify(settings)));

  const handleUnitChange = (e) => {
    const unitName = e.target.value;
    const newCoords = UNIT_DATA[unitName];
    if (newCoords && window.confirm(`'${unitName}'의 위치(${newCoords.lat}, ${newCoords.lon})로 자동 전환하시겠습니까?`)) {
      setLocalSettings(prev => ({
        ...prev,
        unitName: unitName,
        location: {
          method: 'unit',
          coords: newCoords,
        }
      }));
    } else {
       setLocalSettings(prev => ({ ...prev, unitName }));
    }
  };

  const handleLocationMethodChange = (method) => {
    if (method === 'unit') {
      const unitName = localSettings.unitName;
      const coords = UNIT_DATA[unitName] || { lat: null, lon: null };
       setLocalSettings(prev => ({ ...prev, location: { method, coords }}));
    } else {
       setLocalSettings(prev => ({ ...prev, location: { ...prev.location, method }}));
    }
  };

  const handleSave = () => {
    setSettings(localSettings);
    goBack();
  };

  return (
    <div className="card settings-card">
      <div className="settings-header">
        <button onClick={goBack} className="back-button"><ArrowLeft size={24} /></button>
        <h3>설정</h3>
      </div>
      <div className="settings-content">
        <div className="setting-section">
          <h4>부대 및 위치</h4>
          <div className="form-group">
            <label>부대명</label>
            <select className="form-input" value={localSettings.unitName} onChange={handleUnitChange}>
              {Object.keys(UNIT_DATA).map(name => <option key={name} value={name}>{name}</option>)}
              <option value="기타">기타</option>
            </select>
          </div>
          <div className="form-group">
            <label>위치 설정 방식</label>
            <div className="radio-group">
              <button onClick={() => handleLocationMethodChange('unit')} className={localSettings.location.method === 'unit' ? 'active' : ''}><Compass size={16}/> 부대 위치</button>
              <button onClick={() => handleLocationMethodChange('manual')} className={localSettings.location.method === 'manual' ? 'active' : ''}><Edit3 size={16}/> 직접 입력</button>
              <button onClick={() => handleLocationMethodChange('current')} className={localSettings.location.method === 'current' ? 'active' : ''}><MapPin size={16}/> 현재 위치</button>
            </div>
          </div>
          {localSettings.location.method === 'manual' && (
            <div className="form-row">
              <div className="form-group">
                <label>위도</label>
                <input type="number" step="any" className="form-input" placeholder="e.g., 37.4348" value={localSettings.location.coords.lat || ''} onChange={e => setLocalSettings(p => ({...p, location: {...p.location, coords: {...p.location.coords, lat: parseFloat(e.target.value) || null}} }))}/>
              </div>
              <div className="form-group">
                <label>경도</label>
                <input type="number" step="any" className="form-input" placeholder="e.g., 127.1050" value={localSettings.location.coords.lon || ''} onChange={e => setLocalSettings(p => ({...p, location: {...p.location, coords: {...p.location.coords, lon: parseFloat(e.target.value) || null}} }))}/>
              </div>
            </div>
          )}
        </div>
        <div className="setting-section">
            <h4>표준 시간</h4>
             <div className="form-group">
                <div className="radio-group">
                    <button onClick={() => setLocalSettings(p => ({...p, timezone: 'KST'}))} className={localSettings.timezone === 'KST' ? 'active' : ''}>KST</button>
                    <button onClick={() => setLocalSettings(p => ({...p, timezone: 'UTC'}))} className={localSettings.timezone === 'UTC' ? 'active' : ''}>UTC</button>
                </div>
            </div>
        </div>
        <div className="setting-section">
            <h4>GNSS 오차율 임계값 (%)</h4>
             <div className="form-group">
                 <label>GNSS 오차율 임계값</label>
                <input type="number" step="0.1" className="form-input" value={localSettings.defaultThreshold} onChange={e => setLocalSettings(p => ({...p, defaultThreshold: parseFloat(e.target.value) || 0 }))}/>
            </div>
        </div>

      </div>
       <div className="settings-footer">
            <button onClick={handleSave} className="submit-button"><Save size={18}/><span>설정 저장</span></button>
        </div>
    </div>
  );
};


// =================================================================
//  Main App Component
// =================================================================

const MOCK_EQUIPMENT = [
  { id: 1, name: "JDAM" }, { id: 2, name: "정찰 드론" }, { id: 3, name: "데이터링크" }, { id: 4, name: "E-737" },
];

export default function App() {
  const [missionLogs, setMissionLogs] = useState(() => JSON.parse(localStorage.getItem('missionLogs') || '{}'));

  const [settings, setSettings] = useState(() => {
    try {
        const savedSettings = localStorage.getItem('appSettings');
        const defaultSettings = {
            unitName: "제15특수임무비행단",
            location: { method: 'unit', coords: UNIT_DATA["제15특수임무비행단"] },
            timezone: 'KST',
            defaultThreshold: 5.0,
        };
        return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    } catch (e) {
        return { unitName: "제15특수임무비행단", location: { method: 'unit', coords: UNIT_DATA["제15특수임무비행단"] }, timezone: 'KST', defaultThreshold: 5.0 };
    }
  });

  const navigate = useNavigate();

  useEffect(() => { localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); }, [missionLogs]);
  useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);

  const handleFeedbackSubmit = (logData) => {
    const dateKey = formatDateKey(logData.date);
    const newLog = { id: Date.now(), time: logData.time, equipment: log_data.equipment, impactLevel: logData.impactLevel };
    const updatedLogsForDate = [...(missionLogs[dateKey] || []), newLog];
    setMissionLogs({ ...missionLogs, [dateKey]: updatedLogsForDate });
    navigate("/weapons");
  };

  return (
    <div>
      <header className="header">
        <div className="bar">
          <div className="logo"><span className="mark" /> AIR4SPACE</div>
          <nav>
            <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>우주기상</NavLink>
            <NavLink to="/weapons" className={({ isActive }) => isActive ? "active" : ""}>무기체계</NavLink>
            <NavLink to="/feedback" className={({ isActive }) => isActive ? "active" : ""}>피드백</NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ""}>
                <Settings size={20} />
            </NavLink>
          </nav>
          <div className="meta">
            <div className="time-weather">
              <Clock timezone={settings.timezone} />
              <Weather settings={settings} />
            </div>
          </div>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<DashboardLayout missionLogs={missionLogs} settings={settings} />} />
          <Route path="/weapons" element={<WeaponSystems missionLogs={missionLogs} />} />
          <Route 
            path="/feedback" 
            element={<FeedbackView equipment={MOCK_EQUIPMENT} onSubmit={handleFeedbackSubmit} />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsView settings={settings} setSettings={setSettings} goBack={() => navigate('/')} />} 
          />
        </Routes>
      </main>
    </div>
  );
}