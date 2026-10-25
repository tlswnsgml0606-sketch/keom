(function () {
  "use strict";
  const KEY = "gwiryeonghakgyo.static-demo.v1";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const statEffects = {
    힘: "퇴치 공격력을 높이고, 택배 상하차 알바에 유용",
    체력: "피로가 덜 쌓임",
    매력: "포획 성공률, 매점 할인, NPC 허가 필요 이벤트에 영향",
    지능: "다른 스탯 경험치 획득이 빨라지고, 조사 정보가 늘어날 수 있음",
    섬세: "퇴치 정확도, 포획 보유 수, 도구 제작과 바느질 알바에 영향"
  };
  const freshState = () => ({
    account: null,
    sessionActive: true,
    authMode: "signup",
    character: null,
    page: "",
    statusVersion: 2,
    status: { fatigue: 100, life: 100, mental: 400 },
    map: {
      active: "whole",
      wholePoint: 0,
      detailPoint: 0,
      currentPoint: "이동 지점 1"
    },
    records: [],
    areaMessages: [],
    conversations: { 대화: [], 사담: [] },
    alerts: [],
    alertFilter: "전체",
    chatFilter: "대화",
    inviteCodes: [],
    pastEvents: []
  });
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!value || typeof value !== "object") return freshState();
      const defaults=freshState();
      const migratedStatus={ ...defaults.status, ...(value.status || {}) };
      if(Number(value.statusVersion||0)<2)migratedStatus.mental=400;
      return { ...defaults, ...value, statusVersion:2, status:migratedStatus, map:{ ...defaults.map, ...(value.map || {}) }, conversations:{ ...defaults.conversations, ...(value.conversations || {}) } };
    } catch (_error) {
      return freshState();
    }
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (_error) { return false; }
  }
  function clear() {
    try { localStorage.removeItem(KEY); state = freshState(); return true; }
    catch (_error) { return false; }
  }
  function setState(next) { state = next; save(); }
  function todayKey(date = new Date()) {
    return new Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
  }
  function generateCode() {
    const bytes = new Uint8Array(7);
    const result = [];
    while (result.length < 7) {
      if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
      else for (let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
      for (const byte of bytes) if (byte < 208 && result.length < 7) result.push(alphabet[byte % alphabet.length]);
    }
    return result.join("");
  }
  function addRecord(type, text, date = todayKey()) {
    state.records.push({ id:Date.now()+Math.random(), type, text, date, createdAt:Date.now() });
    save();
  }
  function addAlert(type, title, text) {
    state.alerts.unshift({ id:Date.now()+Math.random(), type, title, text, read:false, createdAt:Date.now() });
    save();
  }
  function unreadCount() { return state.alerts.filter((item)=>!item.read).length; }
  window.GHData = { KEY, alphabet, statEffects, freshState, load, save, clear, get state(){return state;}, setState, todayKey, generateCode, addRecord, addAlert, unreadCount };
})();
