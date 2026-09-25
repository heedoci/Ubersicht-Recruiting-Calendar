import { run } from "uebersicht";

const BASE = "$HOME/Library/Application Support/Übersicht/widgets/RecruitingCalendar.widget";
const PY_CMD = `python3 "${BASE}/fetch_jobs.py"`;
const CONFIG_CMD = `open -e "$HOME/Library/Application Support/RecruitingCalendar/config.json"`;
const POSITION_SCRIPT = `"${BASE}/save_position.py"`;
const HOVER_SETTING_SCRIPT = `"${BASE}/save_hover.py"`;

export const command = PY_CMD;
export const refreshFrequency = 30 * 60 * 1000;

export const initialState = {
  data: null,
  error: null,
  loading: true,
  monthOffset: 0,
  filter: "all",
  favoritesOnly: false,
  hoverKey: null,
  hoverEnabled: true,
  widgetLeft: 18,
  widgetTop: 18,
  positionLoaded: false,
};

const parseOutput = (output) => {
  try {
    return JSON.parse(output || "{}");
  } catch (e) {
    return { ok: false, error: `JSON parse error: ${String(e)}`, jobs: [] };
  }
};

const applyLoadedData = (prev, parsed) => {
  const persistedHover =
    parsed && Object.prototype.hasOwnProperty.call(parsed, "hoverEnabled")
      ? Boolean(parsed.hoverEnabled)
      : prev.hoverEnabled;

  if (prev.positionLoaded) {
    return {
      ...prev,
      data: parsed,
      error: null,
      loading: false,
      hoverEnabled: persistedHover,
      hoverKey: persistedHover ? prev.hoverKey : null,
    };
  }

  const p = parsed && parsed.widgetPosition ? parsed.widgetPosition : {};
  return {
    ...prev,
    data: parsed,
    error: null,
    loading: false,
    hoverEnabled: persistedHover,
    hoverKey: persistedHover ? prev.hoverKey : null,
    widgetLeft: Math.max(0, Number(p.left) || 18),
    widgetTop: Math.max(0, Number(p.top) || 18),
    positionLoaded: true,
  };
};

export const updateState = (event, previousState) => {
  const prev = previousState || initialState;

  if (event.type === "MONTH_DELTA")
    return { ...prev, monthOffset: prev.monthOffset + event.delta };
  if (event.type === "TODAY")
    return { ...prev, monthOffset: 0 };
  if (event.type === "SET_FILTER")
    return { ...prev, filter: event.filter };
  if (event.type === "TOGGLE_FAVORITES")
    return { ...prev, favoritesOnly: !prev.favoritesOnly };
  if (event.type === "HOVER_DAY") {
    if (!prev.hoverEnabled) return prev;
    return { ...prev, hoverKey: event.key };
  }
  if (event.type === "LEAVE_DAY")
    return { ...prev, hoverKey: null };
  if (event.type === "SET_HOVER_ENABLED")
    return {
      ...prev,
      hoverEnabled: Boolean(event.enabled),
      hoverKey: event.enabled ? prev.hoverKey : null,
    };
  if (event.type === "SET_POSITION")
    return {
      ...prev,
      widgetLeft: Math.max(0, Number(event.left) || 0),
      widgetTop: Math.max(0, Number(event.top) || 0),
      positionLoaded: true,
    };
  if (event.type === "RESET_POSITION")
    return {
      ...prev,
      widgetLeft: 18,
      widgetTop: 18,
      positionLoaded: true,
    };
  if (event.type === "LOADING")
    return { ...prev, loading: true };
  if (event.type === "DATA_UPDATED")
    return applyLoadedData(prev, parseOutput(event.output));
  if (event.type === "DATA_ERROR")
    return {
      ...prev,
      error: String(event.error || "Refresh failed"),
      loading: false,
    };

  if (Object.prototype.hasOwnProperty.call(event, "output")) {
    const next = applyLoadedData(prev, parseOutput(event.output));
    return {
      ...next,
      error: event.error ? String(event.error) : null,
    };
  }

  if (event.error) {
    return {
      ...prev,
      error: String(event.error),
      loading: false,
    };
  }

  return prev;
};

export const className = `
  top: 0;
  left: 0;
  right: auto;
  width: 940px;
  color: rgba(255,255,255,.95);
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", sans-serif;
  user-select: none;

  * { box-sizing: border-box; }

  .panel {
    overflow: visible;
    position: relative;
    background: transparent;
    text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 7px rgba(0,0,0,.72);
    will-change: transform;
  }

  .header, .toolbar, .header-left, .header-right, .nav, .filters {
    display: flex;
    align-items: center;
  }

  .header {
    justify-content: space-between;
    gap: 12px;
    margin: 0 12px 8px;
    padding: 6px 2px;
    cursor: grab;
  }

  .header.dragging { cursor: grabbing; }
  .header-left { gap: 12px; }
  .header-right { gap: 8px; }

  .title {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -.35px;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: rgba(255,255,255,.72);
  }

  .pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34c789;
  }

  .pulse.cache { background: #f0a642; }
  .pulse.loading { opacity: .45; }

  .drag-hint {
    font-size: 9px;
    color: rgba(255,255,255,.52);
    white-space: nowrap;
  }

  button {
    pointer-events: auto;
    appearance: none;
    border: 0;
    outline: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  .icon-btn {
    height: 28px;
    min-width: 28px;
    padding: 0 8px;
    border-radius: 8px;
    background: rgba(12,16,22,.20);
    border: 1px solid rgba(255,255,255,.08);
    color: rgba(255,255,255,.92);
    font-size: 11px;
  }

  .icon-btn:hover {
    background: rgba(35,44,57,.58);
    border-color: rgba(255,255,255,.24);
  }

  .icon-btn:disabled {
    opacity: .3;
    cursor: default;
  }

  .hover-toggle.on {
    background: rgba(57,208,162,.14);
    border-color: rgba(86,224,177,.22);
    color: rgba(193,255,232,.96);
  }

  .hover-toggle.off {
    color: rgba(255,255,255,.46);
  }

  .toolbar {
    justify-content: space-between;
    gap: 10px;
    margin: 0 12px 8px;
    padding: 0 2px;
  }

  .nav { gap: 6px; }

  .month-label {
    min-width: 86px;
    text-align: center;
    font-size: 13px;
    font-weight: 740;
  }

  .filters {
    gap: 5px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .filter-btn {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    border-radius: 999px;
    background: rgba(12,16,22,.18);
    border: 1px solid rgba(255,255,255,.07);
    color: rgba(255,255,255,.82);
    font-size: 9px;
    font-weight: 680;
  }

  .filter-btn:hover,
  .filter-btn.active {
    background: rgba(255,255,255,.10);
    border-color: rgba(255,255,255,.18);
  }

  .filter-dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(255,255,255,.10);
  }

  .filter-dot.all {
    background: conic-gradient(
      #33c79a 0deg 72deg,
      #60a5fa 72deg 144deg,
      #f3ad45 144deg 216deg,
      #a98cf7 216deg 288deg,
      #9aa3b2 288deg 360deg
    );
  }

  .filter-dot.research { background: #33c79a; }
  .filter-dot.clinical { background: #60a5fa; }
  .filter-dot.production { background: #f3ad45; }
  .filter-dot.sales { background: #a98cf7; }
  .filter-dot.other { background: #9aa3b2; }

  .warning {
    margin: 0 14px 8px;
    color: rgba(255,196,96,.88);
    font-size: 9px;
  }

  .weekdays, .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin: 0 12px;
  }

  .weekdays {
    border: 1px solid rgba(255,255,255,.11);
    border-bottom: 0;
    border-radius: 14px 14px 0 0;
    background: rgba(12,16,22,.24);
  }

  .weekday {
    padding: 7px 5px;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    color: rgba(255,255,255,.62);
  }

  .weekday.sun { color: rgba(255,112,112,.88); }
  .weekday.sat { color: rgba(118,174,255,.92); }

  .grid {
    border: 1px solid rgba(255,255,255,.11);
    border-radius: 0 0 14px 14px;
    background: rgba(12,16,22,.22);
    overflow: visible;
  }

  .day {
    position: relative;
    min-height: 78px;
    padding: 6px;
    border-right: 1px solid rgba(255,255,255,.055);
    border-bottom: 1px solid rgba(255,255,255,.055);
  }

  .day:nth-child(7n) { border-right: 0; }
  .day.empty { opacity: .15; }

  .day-number {
    width: 21px;
    height: 21px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 730;
  }

  .day.today .day-number {
    background: rgba(61,120,255,.96);
    color: white;
  }

  .job {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    margin-top: 3px;
    color: rgba(255,255,255,.88);
    font-size: 8.7px;
    text-decoration: none;
  }

  .job:hover { color: white; }

  .dot {
    width: 5px;
    height: 5px;
    flex: 0 0 auto;
    border-radius: 50%;
  }

  .job.research .dot { background: #33c79a; }
  .job.clinical .dot { background: #60a5fa; }
  .job.production .dot { background: #f3ad45; }
  .job.sales .dot { background: #a98cf7; }
  .job.other .dot { background: #9aa3b2; }

  .job-company {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .new-badge {
    padding: 1px 3px;
    border-radius: 999px;
    background: rgba(76,141,255,.18);
    color: rgba(182,214,255,.95);
    font-size: 6.8px;
    font-weight: 850;
  }

  a.job.closed .job-company {
    text-decoration: line-through;
    text-decoration-color: rgba(255,255,255,.45);
    color: rgba(255,255,255,.30);
  }

  .day-popup {
    pointer-events: auto;
    position: absolute;
    z-index: 9999;
    width: 420px;
    max-height: min(52vh, 520px);
    display: flex;
    flex-direction: column;
    padding: 14px 10px 11px 16px;
    overflow: hidden;
    border-radius: 15px;
    background: rgba(16,20,27,.94);
    border: 1px solid rgba(255,255,255,.13);
    box-shadow: 0 18px 48px rgba(0,0,0,.43);
  }

  .popup-right { left: 8px; top: calc(100% + 6px); }
  .popup-left { right: 8px; top: calc(100% + 6px); }
  .popup-up-right { left: 8px; bottom: calc(100% + 6px); }
  .popup-up-left { right: 8px; bottom: calc(100% + 6px); }

  .popup-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 7px;
    padding-right: 5px;
  }

  .popup-title {
    font-size: 12px;
    font-weight: 800;
  }

  .popup-date-status {
    color: rgba(255,255,255,.45);
    font-size: 8.5px;
  }

  .popup-list {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 5px;
  }

  .popup-job {
    display: block;
    padding: 8px 4px;
    border-top: 1px solid rgba(255,255,255,.07);
    color: rgba(255,255,255,.92);
    text-decoration: none;
  }

  .popup-job:first-child { border-top: 0; }

  .popup-job-title {
    margin-top: 2px;
    font-size: 9px;
    color: rgba(255,255,255,.72);
  }

  .popup-meta {
    margin-top: 3px;
    font-size: 8px;
    color: rgba(255,255,255,.42);
  }

  a.popup-job.closed .popup-company-name,
  a.popup-job.closed .popup-job-title {
    text-decoration: line-through;
    color: rgba(255,255,255,.34);
  }

  .footer {
    display: grid;
    grid-template-columns: 1.05fr 1.05fr 1fr;
    gap: 18px;
    padding: 8px 14px 4px;
  }

  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 3px;
  }

  .section-title {
    font-size: 10px;
    font-weight: 800;
  }

  .section-count {
    font-size: 8px;
    color: rgba(255,255,255,.38);
  }

  .deadline-list {
    display: grid;
    gap: 0;
  }

  .ongoing-list,
  .recent-list {
    display: grid;
    gap: 0;
    max-height: 154px;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding-right: 5px;
    scrollbar-width: thin;
  }

  .ongoing-list::-webkit-scrollbar,
  .recent-list::-webkit-scrollbar {
    width: 5px;
  }

  .ongoing-list::-webkit-scrollbar-thumb,
  .recent-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.16);
    border-radius: 999px;
  }

  a.deadline,
  a.ongoing-item,
  a.recent-item {
    display: block;
    min-width: 0;
    padding: 6px 2px;
    border-bottom: 1px solid rgba(255,255,255,.10);
    color: rgba(255,255,255,.94);
    text-decoration: none;
  }

  a.deadline:hover,
  a.ongoing-item:hover,
  a.recent-item:hover {
    background: rgba(255,255,255,.04);
  }

  .deadline-top,
  .recent-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .company {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 9px;
    font-weight: 760;
  }

  .dday {
    flex: 0 0 auto;
    color: rgba(255,191,112,.90);
    font-size: 8px;
    font-weight: 800;
  }

  .recent-age {
    flex: 0 0 auto;
    color: rgba(137,197,255,.88);
    font-size: 8px;
    font-weight: 760;
  }

  .subline {
    margin-top: 2px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: rgba(255,255,255,.39);
    font-size: 8.25px;
  }

  .empty-message,
  .error {
    color: rgba(255,255,255,.48);
    font-size: 9px;
  }

  .error {
    padding: 18px;
    line-height: 1.6;
  }
`;

const pad = (n) => String(n).padStart(2, "0");

const categoryKey = (category) => {
  const c = category || "";
  if (c.includes("연구")) return "research";
  if (c.includes("임상") || c.includes("RA") || c.includes("허가")) return "clinical";
  if (c.includes("생산") || c.includes("품질") || c.includes("QC") || c.includes("QA")) return "production";
  if (c.includes("영업") || c.includes("마케팅")) return "sales";
  return "other";
};

const filterName = {
  all: "전체",
  research: "연구개발",
  clinical: "임상·RA",
  production: "생산·품질",
  sales: "영업·마케팅",
  other: "기타",
};

const ddayText = (days) => {
  if (days === null || days === undefined) return "";
  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
};

const recentAgeText = (firstSeen) => {
  if (!firstSeen) return "";
  try {
    const seen = new Date(firstSeen);
    const diff = Math.max(0, Date.now() - seen.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return `${seen.getMonth() + 1}/${seen.getDate()}`;
  } catch (e) {
    return "";
  }
};

const monthInfo = (offset) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return {
    year: d.getFullYear(),
    monthIndex: d.getMonth(),
    month: d.getMonth() + 1,
  };
};

const formatClock = (iso) => {
  const m = String(iso || "").match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
};

const manualRefresh = (dispatch) => {
  dispatch({ type: "LOADING" });
  run(PY_CMD)
    .then((output) => dispatch({ type: "DATA_UPDATED", output }))
    .catch((error) =>
      dispatch({ type: "DATA_ERROR", error: String(error) })
    );
};

const setHoverEnabled = (dispatch, enabled) => {
  dispatch({ type: "SET_HOVER_ENABLED", enabled });
  run(
    `python3 ${HOVER_SETTING_SCRIPT} ${enabled ? "true" : "false"}`
  ).catch(() => {});
};

const openJob = (event, url) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!url) return;
  run(`/usr/bin/open ${JSON.stringify(url)}`).catch(() => {});
};

const isInteractiveTarget = (target) =>
  Boolean(
    target &&
      target.closest &&
      target.closest(
        "button, a, input, textarea, select, [data-no-drag='true']"
      )
  );

const persistPosition = (left, top) =>
  run(
    `python3 ${POSITION_SCRIPT} ${Math.round(left)} ${Math.round(top)}`
  );

const beginWidgetDrag = (
  event,
  dispatch,
  currentLeft,
  currentTop
) => {
  if (event.button !== 0 || isInteractiveTarget(event.target)) return;

  const handle = event.currentTarget;
  const panel = handle.closest(".panel");
  if (!panel) return;

  event.preventDefault();

  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = Number(currentLeft) || 18;
  const startTop = Number(currentTop) || 18;
  const rect = panel.getBoundingClientRect();

  let last = { left: startLeft, top: startTop };
  handle.classList.add("dragging");

  const move = (e) => {
    const margin = 18;
    const maxLeft = Math.max(
      margin,
      (window.innerWidth || 0) - rect.width - margin
    );
    const maxTop = Math.max(
      margin,
      (window.innerHeight || 0) - rect.height - margin
    );

    last = {
      left: Math.min(
        Math.max(startLeft + e.clientX - startX, margin),
        maxLeft
      ),
      top: Math.min(
        Math.max(startTop + e.clientY - startY, margin),
        maxTop
      ),
    };

    panel.style.transform =
      `translate3d(${last.left}px, ${last.top}px, 0)`;
  };

  const up = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    handle.classList.remove("dragging");

    dispatch({
      type: "SET_POSITION",
      left: last.left,
      top: last.top,
    });
    persistPosition(last.left, last.top).catch(() => {});
  };

  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
};

const resetWidgetPosition = (event, dispatch) => {
  if (isInteractiveTarget(event.target)) return;
  event.preventDefault();
  dispatch({ type: "RESET_POSITION" });
  run(`python3 ${POSITION_SCRIPT} reset`).catch(() => {});
};

export const render = (props, dispatch) => {
  const {
    data,
    error,
    loading,
    monthOffset,
    filter,
    favoritesOnly,
    hoverKey,
    hoverEnabled,
    widgetLeft,
    widgetTop,
  } = props || initialState;

  if (error && !data) {
    return (
      <div className="panel">
        <div className="error">
          채용 데이터를 불러오지 못했습니다.<br />
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel">
        <div className="error">채용 데이터를 불러오는 중입니다…</div>
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="panel">
        <div className="error">
          채용 데이터를 불러오지 못했습니다.<br />
          {data.error || "Unknown error"}
        </div>
      </div>
    );
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const favorites = Array.isArray(data.favorites)
    ? data.favorites
    : [];

  const visibleJobs = jobs.filter((job) => {
    if (favoritesOnly && !job.favorite) return false;
    if (
      filter !== "all" &&
      categoryKey(job.category) !== filter
    )
      return false;
    return true;
  });

  const { year, monthIndex, month } = monthInfo(monthOffset);
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const now = new Date();

  const byDate = {};
  visibleJobs.forEach((job) => {
    if (!job.closesAt) return;
    if (!byDate[job.closesAt]) byDate[job.closesAt] = [];
    byDate[job.closesAt].push(job);
  });

  const ongoingJobs = visibleJobs.filter(
    (job) =>
      !job.closesAt ||
      (job.closeType || "").includes("상시") ||
      (job.closeType || "").toLowerCase().includes("rolling")
  );

  const recentJobs = visibleJobs
    .filter((job) => Boolean(job.firstSeen))
    .sort(
      (a, b) =>
        (new Date(b.firstSeen).getTime() || 0) -
        (new Date(a.firstSeen).getTime() || 0)
    )
    .slice(0, 12);

  const deadlines = visibleJobs
    .filter(
      (job) =>
        Number.isFinite(job.daysLeft) &&
        job.daysLeft >= 0
    )
    .sort(
      (a, b) =>
        a.daysLeft - b.daysLeft ||
        a.company.localeCompare(b.company)
    )
    .slice(0, 4);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const rows = cells.length / 7;
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const filters = [
    "all",
    "research",
    "clinical",
    "production",
    "sales",
    "other",
  ];

  return (
    <div
      className="panel"
      style={{
        transform: `translate3d(${widgetLeft}px, ${widgetTop}px, 0)`,
      }}
    >
      <div
        className="header"
        onMouseDown={(e) =>
          beginWidgetDrag(
            e,
            dispatch,
            widgetLeft,
            widgetTop
          )
        }
        onDoubleClick={(e) =>
          resetWidgetPosition(e, dispatch)
        }
        title="드래그해서 이동 · 더블클릭하면 위치 초기화"
      >
        <div className="header-left">
          <div className="title">채용 달력</div>
          <div className="status">
            <span
              className={`pulse ${data.usedCache ? "cache" : ""} ${
                loading ? "loading" : ""
              }`}
            ></span>
            <span>
              {loading
                ? "갱신 중…"
                : data.usedCache
                  ? "저장 데이터"
                  : `${formatClock(data.fetchedAt)} 갱신`}
              {" · "}
              {data.count || 0}개
              {data.newCount > 0
                ? ` · 신규 ${data.newCount}`
                : ""}
            </span>
          </div>
          <div className="drag-hint">상단을 드래그해 이동</div>
        </div>

        <div className="header-right" data-no-drag="true">
          <button
            className={`icon-btn hover-toggle ${
              hoverEnabled ? "on" : "off"
            }`}
            onClick={() =>
              setHoverEnabled(dispatch, !hoverEnabled)
            }
          >
            호버 {hoverEnabled ? "ON" : "OFF"}
          </button>
          <button
            className="icon-btn"
            onClick={() => run(CONFIG_CMD)}
          >
            ⚙︎ 설정
          </button>
          <button
            className="icon-btn"
            onClick={() => manualRefresh(dispatch)}
          >
            ↻
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="nav">
          <button
            className="icon-btn"
            onClick={() =>
              dispatch({
                type: "MONTH_DELTA",
                delta: -1,
              })
            }
          >
            ‹
          </button>
          <div className="month-label">
            {year}.{pad(month)}
          </div>
          <button
            className="icon-btn"
            onClick={() =>
              dispatch({
                type: "MONTH_DELTA",
                delta: 1,
              })
            }
          >
            ›
          </button>
          <button
            className="icon-btn"
            onClick={() => dispatch({ type: "TODAY" })}
            disabled={monthOffset === 0}
          >
            오늘
          </button>
        </div>

        <div className="filters">
          {filters.map((key) => (
            <button
              className={`filter-btn ${
                filter === key ? "active" : ""
              }`}
              onClick={() =>
                dispatch({
                  type: "SET_FILTER",
                  filter: key,
                })
              }
              key={key}
            >
              <span
                className={`filter-dot ${key}`}
              ></span>
              <span>{filterName[key]}</span>
            </button>
          ))}

          <button
            className={`filter-btn ${
              favoritesOnly ? "active" : ""
            }`}
            onClick={() =>
              dispatch({ type: "TOGGLE_FAVORITES" })
            }
            disabled={favorites.length === 0}
          >
            ★ 관심회사
          </button>
        </div>
      </div>

      {data.warning ? (
        <div className="warning">{data.warning}</div>
      ) : null}

      <div className="weekdays">
        {weekdays.map((w, i) => (
          <div
            className={`weekday ${i === 0 ? "sun" : ""} ${
              i === 6 ? "sat" : ""
            }`}
            key={w}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid">
        {cells.map((d, idx) => {
          if (!d) {
            return (
              <div
                className="day empty"
                key={`empty-${idx}`}
              ></div>
            );
          }

          const dateKey = `${year}-${pad(month)}-${pad(d)}`;
          const list = byDate[dateKey] || [];
          const col = idx % 7;
          const row = Math.floor(idx / 7);
          const openLeft = col >= 4;
          const openUp = row >= rows - 2;
          const popupClass = openUp
            ? openLeft
              ? "popup-up-left"
              : "popup-up-right"
            : openLeft
              ? "popup-left"
              : "popup-right";

          const isToday =
            year === now.getFullYear() &&
            monthIndex === now.getMonth() &&
            d === now.getDate();

          const isHovered =
            hoverEnabled &&
            hoverKey === dateKey &&
            list.length > 0;

          return (
            <div
              className={`day ${isToday ? "today" : ""}`}
              key={dateKey}
              onMouseEnter={() =>
                hoverEnabled &&
                list.length > 0 &&
                dispatch({
                  type: "HOVER_DAY",
                  key: dateKey,
                })
              }
              onMouseLeave={() =>
                isHovered &&
                dispatch({ type: "LEAVE_DAY" })
              }
            >
              <span className="day-number">{d}</span>

              {list.slice(0, 3).map((job) => (
                <a
                  className={`job ${categoryKey(
                    job.category
                  )} ${job.daysLeft < 0 ? "closed" : ""}`}
                  href={job.url || "#"}
                  data-no-drag="true"
                  onClick={(e) => openJob(e, job.url)}
                  key={job.id}
                >
                  <span className="dot"></span>
                  <span className="job-company">
                    {job.favorite ? "★ " : ""}
                    {job.company}
                  </span>
                  {job.isNew ? (
                    <span className="new-badge">NEW</span>
                  ) : null}
                </a>
              ))}

              {isHovered ? (
                <div
                  className={`day-popup ${popupClass}`}
                >
                  <div className="popup-head">
                    <div className="popup-title">
                      {month}월 {d}일 · {list.length}개
                    </div>
                    <div className="popup-date-status">
                      {list.every(
                        (job) => job.daysLeft < 0
                      )
                        ? "접수 마감"
                        : "마감 예정"}
                    </div>
                  </div>

                  <div className="popup-list">
                    {list.map((job) => (
                      <a
                        className={`popup-job ${
                          job.daysLeft < 0 ? "closed" : ""
                        }`}
                        href={job.url || "#"}
                        data-no-drag="true"
                        onClick={(e) =>
                          openJob(e, job.url)
                        }
                        key={`popup-${job.id}`}
                      >
                        <div className="popup-company-name">
                          {job.favorite ? "★ " : ""}
                          {job.company}
                        </div>
                        <div className="popup-job-title">
                          {job.title}
                        </div>
                        <div className="popup-meta">
                          {[
                            job.employment,
                            job.category,
                            job.region,
                            ddayText(job.daysLeft),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="footer">
        <div>
          <div className="section-head">
            <div className="section-title">마감 임박</div>
            <div className="section-count">
              현재 필터 기준
            </div>
          </div>

          {deadlines.length ? (
            <div className="deadline-list">
              {deadlines.map((job) => (
                <a
                  className="deadline"
                  href={job.url || "#"}
                  data-no-drag="true"
                  onClick={(e) => openJob(e, job.url)}
                  key={`deadline-${job.id}`}
                >
                  <div className="deadline-top">
                    <span className="company">
                      {job.favorite ? "★ " : ""}
                      {job.company}
                    </span>
                    <span className="dday">
                      {ddayText(job.daysLeft)}
                    </span>
                  </div>
                  <div className="subline">{job.title}</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-message">
              예정된 마감 공고가 없습니다.
            </div>
          )}
        </div>

        <div>
          <div className="section-head">
            <div className="section-title">
              최근 추가된 채용
            </div>
            <div className="section-count">
              {recentJobs.length}개
            </div>
          </div>

          {recentJobs.length ? (
            <div className="recent-list">
              {recentJobs.map((job) => (
                <a
                  className="recent-item"
                  href={job.url || "#"}
                  data-no-drag="true"
                  onClick={(e) => openJob(e, job.url)}
                  key={`recent-${job.id}`}
                >
                  <div className="recent-top">
                    <span className="company">
                      {job.favorite ? "★ " : ""}
                      {job.company}
                      {job.isNew ? " · NEW" : ""}
                    </span>
                    <span className="recent-age">
                      {recentAgeText(job.firstSeen)}
                    </span>
                  </div>
                  <div className="subline">{job.title}</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-message">
              새로 감지된 공고가 생기면 표시됩니다.
            </div>
          )}
        </div>

        <div>
          <div className="section-head">
            <div className="section-title">
              상시 · 수시채용
            </div>
            <div className="section-count">
              {ongoingJobs.length}개 · 스크롤
            </div>
          </div>

          {ongoingJobs.length ? (
            <div className="ongoing-list">
              {ongoingJobs.map((job) => (
                <a
                  className="ongoing-item"
                  href={job.url || "#"}
                  data-no-drag="true"
                  onClick={(e) => openJob(e, job.url)}
                  key={`ongoing-${job.id}`}
                >
                  <div className="company">
                    {job.favorite ? "★ " : ""}
                    {job.company}
                    {job.isNew ? " · NEW" : ""}
                  </div>
                  <div className="subline">{job.title}</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-message">
              표시할 상시·수시채용이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
