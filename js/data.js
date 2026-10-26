(function () {
  "use strict";
  const KEY = "gwiryeonghakgyo.static-demo.v1";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const statEffects = {
    힘: "퇴치 공격력을 높이고, 택배 상하차 알바에 유용",
    체력: "피로가 덜 쌓임",
    민첩: "공격 치명률을 높임. 치명 시 피해가 15~30% 증가",
    지능: "다른 스탯 경험치 획득이 빨라지고, 조사 정보가 늘어날 수 있음",
    섬세: "퇴치 정확도를 높이고, 도구 제작과 바느질 알바에 유용"
  };
  const freshState = () => ({
    account: null,
    pendingAccount: null,
    sessionActive: true,
    authMode: "signup",
    character: null,
    page: "",
    statusVersion: 3,
    status: { fatigue: 0, life: 100, mental: 400, sleepStartedAt: null, sleepWakeAt: null },
    map: {
      active: "whole",
      wholePoint: 0,
      detailPoint: 0,
      roomPoint: 0,
      roomArrivedPoint: 0,
      detailScene: "room",
      detailArrivedPoint: 0,
      currentPoint: "침대 옆"
    },
    records: [],
    areaMessages: [],
    conversations: { 대화: [], 사담: [], 귓속말: [] },
    selectedChat: "임시",
    alerts: [],
    alertFilter: "전체",
    chatFilter: "대화",
    inviteCodes: [],
    pastEvents: [],
    events: [],
    letters: [],
    inventory: [],
    currency: 0,
    demoAccount: { id:"demo-imsi", name:"임시", portrait:"임", arrivedAt:1, isDemo:true },
    demoAccount2: { id:"demo-imsi-2", name:"임시 2", portrait:"임2", arrivedAt:2, isDemo:true },
    whisperMessages: [],
    remotePresence: [],
    remoteAccounts: [],
    demoSeeded: false
  });
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!value || typeof value !== "object") return freshState();
      const defaults=freshState();
      const migratedStatus={ ...defaults.status, ...(value.status || {}) };
      if(Number(value.statusVersion||0)<2)migratedStatus.mental=400;
      const character=value.character?{...value.character,stats:{...(value.character.stats||{})}}:null;
      if(character){
        if(character.stats.매력!==undefined&&character.stats.민첩===undefined)character.stats.민첩=character.stats.매력;
        delete character.stats.매력;
        if(character.job==="포획"){character.job="퇴치";if(character.weapon==="무당의 방울")character.weapon="검";}
      }
      const map={ ...defaults.map, ...(value.map || {}) };
      if(map.roomArrivedPoint===undefined)map.roomArrivedPoint=map.roomPoint;
      if(map.detailArrivedPoint===undefined)map.detailArrivedPoint=map.detailPoint;
      const conversations={ ...defaults.conversations, ...(value.conversations || {}) };
      conversations.귓속말=Array.isArray(conversations.귓속말)?conversations.귓속말:[];
      return { ...defaults, ...value, character, pendingAccount:value.pendingAccount||null, statusVersion:3, status:migratedStatus, map, conversations, demoAccount2:value.demoAccount2||defaults.demoAccount2, events:Array.isArray(value.events)?value.events:[], letters:Array.isArray(value.letters)?value.letters:[], inventory:Array.isArray(value.inventory)?value.inventory:[], currency:Number(value.currency)||0, areaMessages:Array.isArray(value.areaMessages)?value.areaMessages:[], whisperMessages:Array.isArray(value.whisperMessages)?value.whisperMessages:[], remotePresence:Array.isArray(value.remotePresence)?value.remotePresence:[], remoteAccounts:Array.isArray(value.remoteAccounts)?value.remoteAccounts:[] };
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
  function addAlert(type, title, text, extra={}) {
    state.alerts.unshift({ id:Date.now()+Math.random(), type, title, text, read:false, createdAt:Date.now(), ...extra });
    save();
  }
  function ensureDemoData(){
    if(!state.conversations.대화.some((item)=>item.with==="임시"))state.conversations.대화.push({id:"demo-talk-1",with:"임시",author:"임시",text:"안녕하세요! 저는 채팅 점검용 계정 임시예요.",mine:false,createdAt:Date.now()-120000});
    if(!state.conversations.사담.some((item)=>item.with==="임시"))state.conversations.사담.push({id:"demo-talk-2",with:"임시",author:"임시",text:"이 사담 대화도 현재 브라우저 안에서만 보여요.",mine:false,createdAt:Date.now()-60000});
    if(!state.conversations.대화.some((item)=>item.with==="임시 2"))state.conversations.대화.push({id:"demo2-talk-1",with:"임시 2",author:"임시 2",text:"안녕하세요, 임시 2예요. @임시 검색 추천 목록을 확인할 때 함께 보여요.",mine:false,createdAt:Date.now()-30000});
    if(!state.conversations.사담.some((item)=>item.with==="임시 2"))state.conversations.사담.push({id:"demo2-talk-2",with:"임시 2",author:"임시 2",text:"사담 대화 시제품 메시지예요.",mine:false,createdAt:Date.now()-20000});
    if(!state.events.some((item)=>item.id==="demo-event"))state.events.push({id:"demo-event",title:"탐방 이벤트",date:"2026-10-25",time:"10:00",team:["임시"],demo:true});
    if(state.account&&state.character&&!state.letters.some((item)=>item.id==="demo-invite")){
      state.letters.unshift({id:"demo-invite",type:"team-proposal",from:"임시",to:state.character.name,subject:"탐방 이벤트 팀 제의",body:"안녕하세요. 2026년 10월 25일 10시에 진행하는 탐방 이벤트에 함께하고 싶어 편지를 보내요. 수락 또는 거절로 답장을 보내주세요.",eventId:"demo-event",status:"pending",createdAt:Date.now()});
      addAlert("편지","탐방 이벤트 팀 제의","임시 님이 탐방 이벤트 팀을 제의했어요.",{letterId:"demo-invite"});
    }
    if(state.account&&state.character&&!state.alerts.some((item)=>item.id==="demo-chat-alert-2"))state.alerts.unshift({id:"demo-chat-alert-2",type:"채팅",title:"새 채팅",text:"임시 2 님이 대화 메시지를 보냈어요.",read:false,createdAt:Date.now(),conversation:"대화",contact:"임시 2"});
    state.demoSeeded=true;save();
  }
  function startSleep(minutes=60,now=Date.now()){if(Number(state.status.fatigue)<=0)return false;state.status.sleepStartedAt=now;state.status.sleepWakeAt=now+Math.max(1,Number(minutes)||1)*60000;save();return true;}
  function applySleepRecovery(now=Date.now()){
    const started=Number(state.status.sleepStartedAt);if(!started||Number(state.status.fatigue)<=0)return false;
    const wakeAt=Number(state.status.sleepWakeAt||Infinity);const ticks=Math.floor((Math.min(now,wakeAt)-started)/300000);if(ticks<1&&now<wakeAt)return false;
    state.status.fatigue=Math.max(0,Number(state.status.fatigue)-ticks);
    state.status.sleepStartedAt=state.status.fatigue===0||now>=wakeAt?null:started+ticks*300000;
    if(!state.status.sleepStartedAt)state.status.sleepWakeAt=null;
    save();return true;
  }
  function unreadCount() { return state.alerts.filter((item)=>!item.read).length; }
  window.GHData = { KEY, alphabet, statEffects, freshState, load, save, clear, get state(){return state;}, setState, todayKey, generateCode, addRecord, addAlert, unreadCount, ensureDemoData, startSleep, applySleepRecovery };
})();
