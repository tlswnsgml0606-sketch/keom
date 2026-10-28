(function () {
  "use strict";
  const KEY = "gwiryeonghakgyo.static-demo.v1";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const statEffects = {
    "력力": "귀신을 더 강하게 공격할 수 있다.",
    "체體": "쉽게 지치지 않는다.",
    "지知": "더 빨리 배운다.",
    "정正": "더 정확한 공격을 할 수 있다.",
    "민敏": "공격을 더 잘 피할 수 있다."
  };
  const statNotes = {
    "력力": "공격력 상승",
    "체體": "피로 증가량 감소",
    "지知": "경험치 획득 소요 시간 감소",
    "정正": "치명타 확률 증가",
    "민敏": "회피 확률 증가"
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
      wholeSelectedPoint: -1,
      detailPoint: 0,
      roomPoint: 0,
      roomSelectedPoint: -1,
      detailSelectedPoint: -1,
      roomInteractionSelectedPoint: -1,
      detailInteractionSelectedPoint: -1,
      markerVisibilityVersion: 1,
      lastClickedMarker: null,
      roomArrivedPoint: 0,
      detailScene: "room",
      detailArrivedPoint: 0,
      currentPoint: "침대 옆"
    },
    records: [],
    areaMessages: [],
    conversations: { 대화: [], 사담: [] },
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
        const aliases={힘:"력力",체력:"체體",지능:"지知",섬세:"정正",민첩:"민敏",매력:"민敏"};
        for(const [oldName,newName] of Object.entries(aliases)){if(character.stats[oldName]!==undefined){if(character.stats[newName]===undefined)character.stats[newName]=character.stats[oldName];delete character.stats[oldName];}}
        if(character.job==="포획"){character.job="퇴치";if(character.weapon==="무당의 방울")character.weapon="검";}
      }
      const map={ ...defaults.map, ...(value.map || {}) };
      if(value.map?.markerVisibilityVersion!==1){map.roomSelectedPoint=-1;map.detailSelectedPoint=-1;map.wholeSelectedPoint=-1;map.roomInteractionSelectedPoint=-1;map.detailInteractionSelectedPoint=-1;map.lastClickedMarker=null;map.markerVisibilityVersion=1;}
      if(map.roomArrivedPoint===undefined)map.roomArrivedPoint=map.roomPoint;
      if(map.detailArrivedPoint===undefined)map.detailArrivedPoint=map.detailPoint;
      const conversations={ ...defaults.conversations, ...(value.conversations || {}) };
      delete conversations.귓속말;
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
  window.GHData = { KEY, alphabet, statEffects, statNotes, freshState, load, save, clear, get state(){return state;}, setState, todayKey, generateCode, addRecord, addAlert, unreadCount, ensureDemoData, startSleep, applySleepRecovery };
})();
