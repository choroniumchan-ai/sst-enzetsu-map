// データ構造: 地名(place) / 年月日(date) / 詳細(description) / リンク(url)
// タイトルは持たず、place が見出しとして表示されます。
// date は "yyyy" (月日不明) または "yyyy/MM" / "yyyy/MM/dd" 形式で入力してください。
// 月日が不明な場合、並び替え・期間フィルタでは内部的に1月1日として扱います。
// const EVENTS = [
//   { id: "1", place: "本能寺の変(京都府京都市)", lat: 35.0116, lng: 135.7681,
//     date: "1582/06/21",
//     description: "織田信長が家臣・明智光秀の謀反により自刃したとされる事件。",
//     url: "https://ja.wikipedia.org/wiki/本能寺の変" },
//   { id: "2", place: "関ヶ原の戦い(岐阜県不破郡関ケ原町)", lat: 35.3667, lng: 136.4667,
//     date: "1600/10/21",
//     description: "徳川家康率いる東軍と石田三成率いる西軍が激突した天下分け目の戦い。",
//     url: "https://ja.wikipedia.org/wiki/関ヶ原の戦い" },
//   { id: "3", place: "大坂夏の陣(大阪府大阪市)", lat: 34.6873, lng: 135.5262,
//     date: "1615/05/08",
//     description: "豊臣家が滅亡した戦い。徳川による全国統一が完成したとされる。",
//     url: "https://ja.wikipedia.org/wiki/大坂の陣" },
//   { id: "4", place: "江戸城築城(東京都千代田区)", lat: 35.6852, lng: 139.7528,
//     date: "1457",
//     description: "太田道灌により築城された城。後に徳川将軍家の居城となる。",
//     url: "https://ja.wikipedia.org/wiki/江戸城" },
//   { id: "5", place: "黒船来航(神奈川県横須賀市)", lat: 35.2842, lng: 139.6764,
//     date: "1853/07/08",
//     description: "ペリー率いるアメリカ艦隊が浦賀に来航し、日本の開国のきっかけとなった。",
//     url: "https://ja.wikipedia.org/wiki/黒船来航" },
//   { id: "6", place: "東日本大震災(宮城県石巻市)", lat: 38.4342, lng: 141.3033,
//     date: "2011/03/11",
//     description: "三陸沖を震源とする巨大地震と津波により東北沿岸部に甚大な被害をもたらした。",
//     url: "https://ja.wikipedia.org/wiki/東北地方太平洋沖地震" },
//   { id: "7", place: "阪神・淡路大震災(兵庫県神戸市)", lat: 34.6901, lng: 135.1955,
//     date: "1995/01/17",
//     description: "淡路島北部を震源とする直下型地震。神戸市を中心に甚大な被害を出した。",
//     url: "https://ja.wikipedia.org/wiki/阪神・淡路大震災" },
//   { id: "8", place: "姫路城築城(兵庫県姫路市)", lat: 34.8394, lng: 134.6939,
//     date: "1346",
//     description: "白鷺城とも呼ばれる名城。江戸時代初期に現在の姿に大改修された。",
//     url: "https://ja.wikipedia.org/wiki/姫路城" },
//   { id: "9", place: "沖縄戦(沖縄県那覇市)", lat: 26.2124, lng: 127.6809,
//     date: "1945/04/01",
//     description: "太平洋戦争末期に沖縄本島で行われた地上戦。多くの民間人を含む犠牲者を出した。",
//     url: "https://ja.wikipedia.org/wiki/沖縄戦" },
//   { id: "10", place: "首里城創建(沖縄県那覇市)", lat: 26.2170, lng: 127.7195,
//     date: "1429",
//     description: "琉球王国の王城として築かれた城。琉球の政治・外交・文化の中心地だった。",
//     url: "https://ja.wikipedia.org/wiki/首里城" }
// ];

// 変更前: const EVENTS = [ ... ];
// 変更後: 空の配列として定義（後から代入できるように let を使用）
let EVENTS = [];

const PAGE_SIZE = 5; // 1ページに表示する件数

// ---------- 緯度経度から都道府県を判定する(データには都道府県を持たせず、境界データから逆引きする) ----------

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function findPrefecture(lat, lng) {
  if (typeof PREFECTURE_BOUNDARIES === "undefined") return null;
  for (const name of PREFECTURE_ORDER) {
    const rings = PREFECTURE_BOUNDARIES[name];
    for (const ring of rings) {
      if (pointInRing(lng, lat, ring)) return name;
    }
  }
  // 海岸沿いなどで境界データの簡略化により判定漏れした場合、最も近い都道府県を採用する
  return nearestPrefecture(lat, lng);
}

function nearestPrefecture(lat, lng) {
  if (typeof PREFECTURE_BOUNDARIES === "undefined") return null;
  let best = null;
  let bestDistSq = Infinity;
  for (const name of PREFECTURE_ORDER) {
    for (const ring of PREFECTURE_BOUNDARIES[name]) {
      for (const [x, y] of ring) {
        const distSq = (x - lng) ** 2 + (y - lat) ** 2;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = name;
        }
      }
    }
  }
  return best;
}



// ページ読み込み時に一度だけ計算してイベントに付与しておく(都度計算しない)
// EVENTS.forEach(ev => {
//   ev.prefecture = findPrefecture(ev.lat, ev.lng);
// });

// 国土地理院の地図タイル一覧(すべて無料・出典表示のみ必須)
const BASEMAPS = {
  std:   { url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",          label: "標準地図" },
  pale:  { url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",         label: "淡色地図" },
  blank: { url: "https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png",        label: "白地図" },
  photo: { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", label: "写真" }
};
const GSI_ATTRIBUTION =
  '地図: <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>';
const DEFAULT_BASEMAP = "pale";

let map;
let tileLayer;
let markers = {};          // id -> Leaflet marker
let activeId = null;
let activeMarker = null;   // アクティブ（選択中）の波紋アニメーションマーカー

const state = {
  page: 1,
  sortDir: "desc",         // "desc" = 新しい順(デフォルト) / "asc" = 古い順
  filtered: []
};

document.addEventListener("DOMContentLoaded", async () => {
  // 1. マップなどのUIの基本初期化（データがなくてもできること）
  initMap();
  initPrefectureSelect();
  bindControls();
  updateSortButtonLabel();
  initMobileTabs();        // モバイル用タブの初期化

  // 2. HTTP GET で JSON データを取得
  try {
    // 取得したいURLをここにそのまま記述します
    const targetUrl = "https://script.google.com/macros/s/AKfycbyvXteKcgkDxTCvDr9V8G6fuuIonKvIdDxTRRzS9A8e5Cnm2JUkRrRC_LECZnNBH6Q/exec";
    const response = await fetch(targetUrl); // 取得

    // サーバーがエラー（404 Not Found や 500 Internal Server Errorなど）を返していないかチェック
    if (!response.ok) {
      throw new Error(`HTTPエラーが発生しました。ステータス: ${response.status}`);
    }

    EVENTS = await response.json();

    // 3. データ取得後に都道府県を判定・付与する（元のコードにあった処理をここに移動）
    EVENTS.forEach(ev => {
      ev.prefecture = findPrefecture(ev.lat, ev.lng);
    });

    // 4. データを反映して初期描画
    applyFilter();

  } catch (error) {
    console.error("データの取得に失敗しました:", error);
    document.getElementById("result-count").textContent = "データの読み込みエラー";
  }
});

// ---------- map ----------

function initMap() {
  map = L.map("map", { preferCanvas: true }).setView([36.5, 138.0], 5);
  setBasemap(DEFAULT_BASEMAP);
  map.addControl(new BasemapControl());
}

function setBasemap(key) {
  const basemap = BASEMAPS[key] || BASEMAPS[DEFAULT_BASEMAP];
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(basemap.url, { attribution: GSI_ATTRIBUTION, maxZoom: 18 }).addTo(map);
}

const BasemapControl = L.Control.extend({
  options: { position: "topright" },
  onAdd: function () {
    const div = L.DomUtil.create("div", "basemap-control");
    const options = Object.keys(BASEMAPS)
      .map(key => `<option value="${key}"${key === DEFAULT_BASEMAP ? " selected" : ""}>${BASEMAPS[key].label}</option>`)
      .join("");
    div.innerHTML = `<select id="basemap-select" aria-label="地図の種類">${options}</select>`;
    L.DomEvent.disableClickPropagation(div);
    div.querySelector("select").addEventListener("change", e => setBasemap(e.target.value));
    return div;
  }
});

// ---------- prefecture combobox ----------

function initPrefectureSelect() {
  const select = document.getElementById("prefecture-select");
  PREFECTURE_ORDER.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

// ---------- controls ----------

function bindControls() {
  document.getElementById("search-input").addEventListener("input", applyFilter);
  document.getElementById("year-start").addEventListener("input", applyFilter);
  document.getElementById("year-end").addEventListener("input", applyFilter);
  document.getElementById("prefecture-select").addEventListener("change", applyFilter);

  document.getElementById("sort-toggle-btn").addEventListener("click", () => {
    state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
    updateSortButtonLabel();
    applyFilter();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    document.getElementById("year-start").value = "";
    document.getElementById("year-end").value = "";
    document.getElementById("prefecture-select").value = "";
    state.sortDir = "desc";
    updateSortButtonLabel();
    applyFilter();
  });

  document.getElementById("download-btn").addEventListener("click", downloadFiltered);
}

function updateSortButtonLabel() {
  document.getElementById("sort-toggle-btn").textContent =
    "並び替え: " + (state.sortDir === "desc" ? "新しい順" : "古い順");
}

// ---------- date parsing ----------
// "yyyy" / "yyyy/MM" / "yyyy/MM/dd" を受け付け、月日が無ければ1月1日として扱う。

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(-?\d+)(?:\/(\d{1,2}))?(?:\/(\d{1,2}))?$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = m[2] ? parseInt(m[2], 10) : 1;
  const day = m[3] ? parseInt(m[3], 10) : 1;
  const d = new Date(0);
  d.setFullYear(year, month - 1, day);
  return d;
}

function formatDateDisplay(dateStr) {
  const m = String(dateStr || "").match(/^(-?\d+)(?:\/(\d{1,2}))?(?:\/(\d{1,2}))?$/);
  if (!m) return dateStr || "";
  const [, year, month, day] = m;
  if (month && day) return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
  if (month) return `${year}年${parseInt(month, 10)}月`;
  return `${year}年`;
}

// <input type="month"> の値("YYYY-MM")を境界のDateに変換する。
// kind: "start" なら月初0:00、"end" なら月末23:59:59。
function parseMonthInput(value, kind) {
  if (!value) return null;
  const [y, m] = value.split("-").map(Number);
  if (kind === "end") {
    return new Date(y, m, 0, 23, 59, 59); // m(1始まり)の月の末日
  }
  return new Date(y, m - 1, 1, 0, 0, 0);
}

// ---------- filtering / sorting ----------

function applyFilter() {
  const q = document.getElementById("search-input").value.trim().toLowerCase();
  // const yearStart = parseInt(document.getElementById("year-start").value, 10);
  // const yearEnd = parseInt(document.getElementById("year-end").value, 10);
  // const hasYearStart = !isNaN(yearStart);
  // const hasYearEnd = !isNaN(yearEnd);
  const startDate = parseMonthInput(document.getElementById("year-start").value, "start");
  const endDate = parseMonthInput(document.getElementById("year-end").value, "end");
  const prefecture = document.getElementById("prefecture-select").value;

  let filtered = EVENTS.filter(ev => {
    if (prefecture && ev.prefecture !== prefecture) {
      return false;
    }
    if (q && ![ev.place, ev.description].some(text => text.toLowerCase().includes(q))) {
      return false;
    }
    //if (hasYearStart || hasYearEnd) {
    if (startDate || endDate) {
      const d = parseEventDate(ev.date);
      if (!d) return false;
      // const y = d.getFullYear();
      // if (hasYearStart && y < yearStart) return false;
      // if (hasYearEnd && y > yearEnd) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const ad = parseEventDate(a.date);
    const bd = parseEventDate(b.date);
    if (!ad && !bd) return 0;
    if (!ad) return 1;
    if (!bd) return -1;
    return state.sortDir === "desc" ? bd - ad : ad - bd;
  });

  state.page = 1;
  render(filtered);
}

// ---------- render ----------

function render(filtered) {
  state.filtered = filtered;
  document.getElementById("result-count").textContent = `${filtered.length} / ${EVENTS.length} 件`;
  renderMarkers(filtered);
  renderList();
  renderPagination();
}

function renderMarkers(filtered) {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  if (activeMarker) {
    map.removeLayer(activeMarker);
    activeMarker = null;
  }

  // 1. 同一座標のイベントを高速にグループ化する（Mapオブジェクトを使用）
  // 浮動小数点の誤差を考慮し、緯度・経度を固定小数点（整数化）してキーにする
  const coordsMap = new Map();

  for (let i = 0; i < filtered.length; i++) {
    const ev = filtered[i];
    const latNum = Number(ev.lat);
    const lngNum = Number(ev.lng);
    
    // 座標を整数化してキーにする（文字列結合より高速）
    const key = (Math.round(latNum * 100000) * 100000) + Math.round(lngNum * 100000);
    
    let group = coordsMap.get(key);
    if (!group) {
      group = [];
      coordsMap.set(key, group);
    }
    group.push({ ev, lat: latNum, lng: lngNum });
  }

  // 2. グループごとに一括してマーカーを配置（重なりがある場合のみ計算する）
  coordsMap.forEach(group => {
    const len = group.length;
    
    // 重なりがない（1件だけ）の場合は、三角関数の計算を完全にスキップして高速化
    if (len === 1) {
      const item = group[0];
      createLeafletMarker(item.lat, item.lng, item.ev);
      return;
    }

    // 重なりがある場合のみ、事前に必要な数値を計算してループ回数を減らす
    const offset = 0.00015;
    const angleStep = 6.28318 / Math.min(len, 8); // 2 * Math.PI の近似値で計算を軽量化

    for (let i = 0; i < len; i++) {
      const item = group[i];
      let lat = item.lat;
      let lng = item.lng;

      // 最初の1件目は中心に置き、2件目以降から周囲に配置する
      if (i > 0) {
        const angle = i * angleStep;
        const currentOffset = offset * (1 + Math.floor(i / 8) * 0.5);
        lat += Math.sin(angle) * currentOffset;
        lng += Math.cos(angle) * currentOffset;
      }

      createLeafletMarker(lat, lng, item.ev);
    }
  });

  // Object.values(markers).forEach(m => map.removeLayer(m));
  // markers = {};

  // filtered.forEach(ev => {
  //   const marker = L.circleMarker([ev.lat, ev.lng], markerStyle(false)).addTo(map);
  //   marker.bindPopup(
  //     `<p class="popup-title">${ev.place}</p>` +
  //     `<p class="popup-place">${formatDateDisplay(ev.date)}</p>` +
  //     `<p class="popup-desc">${ev.description}</p>` +
  //     `<a class="popup-link" href="${ev.url}" target="_blank" rel="noopener">詳細を見る →</a>`,
  //     { minWidth: 260, maxWidth: 300 }
  //   );
  //   marker.on("click", () => setActive(ev.id, true));
  //   markers[ev.id] = marker;
  // });
}

// マーカー生成共通処理
function createLeafletMarker(lat, lng, ev) {
  const marker = L.circleMarker([lat, lng], markerStyle(false)).addTo(map);
  marker.bindPopup(
    `<p class="popup-title">${ev.place}</p>` +
    `<p class="popup-place">${formatDateDisplay(ev.date)}</p>` +
    `<p class="popup-desc">${ev.description}</p>` +
    `<a class="popup-link" href="${ev.url}" target="_blank" rel="noopener">詳細を見る →</a>`,
    { minWidth: 260, maxWidth: 300 }
  );
  marker.on("click", () => setActive(ev.id, true));
  markers[ev.id] = marker;
}


function renderList() {
  const list = document.getElementById("event-list");
  list.innerHTML = "";

  if (state.filtered.length === 0) {
    list.innerHTML = '<li class="empty-state">条件に一致するイベントが見つかりませんでした。</li>';
    return;
  }

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

  pageItems.forEach(ev => {
    const li = document.createElement("li");
    li.className = "event-row";
    li.dataset.id = ev.id;
    li.innerHTML =
      `<span class="event-row-body">` +
      `<p class="event-row-title">${ev.place}</p>` +
      `<p class="event-row-date">${formatDateDisplay(ev.date)}</p>` +
      `</span>`;
    li.addEventListener("click", () => {
      setActive(ev.id, false);
      if (window.innerWidth <= 768) {
        const tabMap = document.getElementById("tab-map");
        if (tabMap) tabMap.click();
      }
    });
    list.appendChild(li);
  });
}

function renderPagination() {
  const nav = document.getElementById("pagination");
  nav.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  if (totalPages <= 1) return;

  nav.appendChild(pageButton("«", state.page - 1, state.page === 1));

  const windowStart = Math.max(1, state.page - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  for (let p = windowStart; p <= windowEnd; p++) {
    const btn = pageButton(String(p), p, false);
    if (p === state.page) btn.classList.add("is-current");
    nav.appendChild(btn);
  }

  nav.appendChild(pageButton("»", state.page + 1, state.page === totalPages));
}

function pageButton(label, targetPage, disabled) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.disabled = disabled;
  btn.addEventListener("click", () => {
    state.page = targetPage;
    renderList();
    renderPagination();
    document.getElementById("event-list").scrollTop = 0;
  });
  return btn;
}

// ---------- active state / map <-> list sync ----------

function setActive(id, fromMap) {
  activeId = id;

  // リストの行のアクティブ表示切り替え
  document.querySelectorAll(".event-row").forEach(row => row.classList.toggle("is-active", row.dataset.id === id));

  const ev = EVENTS.find(e => e.id === id);
  if (!ev) return;

  // 古いアクティブ用アニメーションマーカーを削除
  if (activeMarker) {
    map.removeLayer(activeMarker);
    activeMarker = null;
  }

  // 新しいアクティブ用アニメーションマーカーを生成して重ねる
  const activeIcon = L.divIcon({
    className: 'active-pulse-marker',
    html: '<div class="active-pulse-container"><div class="active-pulse-wave"></div><div class="active-pulse-core"></div></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  activeMarker = L.marker([ev.lat, ev.lng], { icon: activeIcon, interactive: false }).addTo(map);

  if (fromMap) {
    document.querySelector(`.event-row[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" });
  } else {
    map.setView([ev.lat, ev.lng], Math.max(map.getZoom(), 11));
    if (markers[id]) markers[id].openPopup();
  }
}

function markerStyle(active) {
  // 通常のCanvasサークルマーカーのスタイル（橙色が際立つように枠線と色を調整）
  return {
    radius: 6,
    weight: 1.5,
    color: "#ffffff",
    fillColor: "#F05A00", // 鮮やかな橙色
    fillOpacity: 0.95
  };
}

// ---------- download (現在の絞り込み結果のみ、ページングは無視して全件) ----------

const DOWNLOAD_COLUMNS = [
  { key: "id", header: "ID" },
  { key: "place", header: "地名" },
  { key: "date", header: "年月日" },
  { key: "description", header: "詳細" },
  { key: "url", header: "リンク" }
];

function downloadFiltered() {
  const events = state.filtered || [];
  if (events.length === 0) {
    alert("ダウンロードできるデータがありません(絞り込み条件を見直してください)。");
    return;
  }

  if (typeof XLSX !== "undefined") {
    downloadXlsx(events);
  } else {
    // xlsx変換ライブラリが読み込めなかった場合はJSONにフォールバック
    console.warn("SheetJS(xlsx)を読み込めなかったため、JSON形式でダウンロードします。");
    downloadJson(events);
  }
}

function downloadXlsx(events) {
  const rows = events.map(ev => {
    const row = {};
    DOWNLOAD_COLUMNS.forEach(col => {
      row[col.header] = ev[col.key];
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: DOWNLOAD_COLUMNS.map(c => c.header) });
  worksheet["!cols"] = [
    { wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 50 }, { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "イベント一覧");
  XLSX.writeFile(workbook, "events.xlsx");
}

function downloadJson(events) {
  const json = JSON.stringify(events, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "events.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initMobileTabs() {
  const tabMap = document.getElementById("tab-map");
  const tabList = document.getElementById("tab-list");
  const mapEl = document.getElementById("map");
  const sidebarEl = document.getElementById("sidebar");

  if (!tabMap || !tabList || !mapEl || !sidebarEl) return;

  // 初期状態（モバイル表示時）：地図のみを表示
  if (window.innerWidth <= 768) {
    sidebarEl.classList.add("mobile-hidden");
  }

  tabMap.addEventListener("click", () => {
    tabMap.classList.add("is-active");
    tabList.classList.remove("is-active");
    sidebarEl.classList.add("mobile-hidden");
    mapEl.classList.remove("mobile-hidden");
    // 地図のサイズ再計算（表示崩れ防止）
    setTimeout(() => {
      if (map) map.invalidateSize({ animate: true });
    }, 50);
  });

  tabList.addEventListener("click", () => {
    tabList.classList.add("is-active");
    tabMap.classList.remove("is-active");
    mapEl.classList.add("mobile-hidden");
    sidebarEl.classList.remove("mobile-hidden");
  });

  // リサイズ時の表示調整（PCサイズに戻ったときに表示崩れを防ぐ）
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      sidebarEl.classList.remove("mobile-hidden");
      mapEl.classList.remove("mobile-hidden");
    } else {
      // モバイルサイズになったら現在選択されているタブの表示に合わせる
      if (tabMap.classList.contains("is-active")) {
        sidebarEl.classList.add("mobile-hidden");
      } else {
        mapEl.classList.add("mobile-hidden");
      }
    }
  });
}
