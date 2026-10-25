(function () {
  "use strict";
  const wholePoints = [
    { label:"이동 지점 1", x:22, y:31 },
    { label:"이동 지점 2", x:72, y:29 },
    { label:"이동 지점 3", x:34, y:72 },
    { label:"이동 지점 4", x:77, y:70 }
  ];
  const detailBlue = [
    { label:"이동 지점 1", x:20, y:30 },
    { label:"이동 지점 2", x:77, y:29 },
    { label:"이동 지점 3", x:29, y:72 },
    { label:"이동 지점 4", x:72, y:71 },
    { label:"꺾임 테스트", x:82, y:82, routeVia:[{x:40,y:30},{x:40,y:74},{x:72,y:74}] }
  ];
  const detailRed = [
    { label:"상호작용 지점 1", x:49, y:43 },
    { label:"상호작용 지점 2", x:52, y:63 },
    { label:"상호작용 지점 3", x:39, y:55 }
  ];
  const roomBlue = [
    { label:"침대 옆", x:42, y:57 },
    { label:"책상 앞", x:70, y:65 }
  ];
  const roomRed = [
    { label:"달력 열기", x:62, y:31, action:"calendar" },
    { label:"침대에서 자기", x:27, y:49, action:"sleep" },
    { label:"나가기", x:64, y:75, action:"exit-room" }
  ];
  const outsideRed = [...detailRed,{label:"내 방으로 들어가기",x:82,y:20,action:"enter-room"}];
  const REFERENCE_MOVE_MS = 1120;
  const activeMoves = new WeakMap();
  const coords=(point)=>`left:${point.x}%;top:${point.y}%`;
  function stampMarkup(point, name) {
    return `<div class="map-stamp" data-stamp style="${coords(point)}" data-name="${escapeHtml(name)}">${escapeHtml((name||"인장").slice(0,1))}</div>`;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function isMine(item){const ownName=window.GHData.state.character?.name;return typeof item.mine==="boolean"?item.mine:item.name===ownName;}
  function renderSpeechBubbles(messages,point){
    const active=messages.filter((item)=>Date.now()-Number(item.createdAt||0)<5000);
    if(!active.length)return "";
    const left=Math.max(20,Math.min(80,point.x));
    const bubbles=active.map((item)=>`<div class="stamp-bubble ${isMine(item)?"mine":"other"}" data-bubble-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(item.text)}</div>`).join("");
    for(const item of active){const remaining=Math.max(0,5000-(Date.now()-Number(item.createdAt||0)));setTimeout(()=>{document.querySelectorAll("[data-bubble-id]").forEach((bubble)=>{if(bubble.dataset.bubbleId===String(item.id))bubble.remove();});},remaining);}
    return `<div class="stamp-bubble-stack" style="left:${left}%;top:${point.y-4}%">${bubbles}</div>`;
  }
  function renderSpeechHistory(messages){
    const entries=messages.map((item)=>`<div class="map-speech ${isMine(item)?"mine":"other"}"><span class="speech-name">${escapeHtml(item.name)}:</span>${escapeHtml(item.text)}</div>`).join("");
    return `<section class="speech-history" aria-label="말하기 내역"><h2>말하기 내역</h2><div class="speech-history-list" data-speech-history aria-live="polite">${entries||'<p class="speech-empty">아직 말하기 내역이 없어요.</p>'}</div></section>`;
  }
  function renderBoard(kind) {
    const state=window.GHData.state;const isWhole=kind==="whole";const scene=isWhole?"whole":state.map.detailScene||"room";const isRoom=scene==="room";const points=isWhole?wholePoints:(isRoom?roomBlue:detailBlue);const active=Number(isWhole?state.map.wholePoint:(isRoom?state.map.roomPoint:state.map.detailPoint))||0;
    const marker=points[Math.min(active,points.length-1)];const name=state.character?.name||"내 캐릭터";const messages=state.areaMessages||[];
    const moveButtons=points.map((p,index)=>`<button class="map-point blue" type="button" data-map-point="${kind}" data-point-index="${index}" style="${coords(p)}" aria-label="${p.label}로 이동"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const interactionPoints=isWhole?[]:(isRoom?roomRed:outsideRed);
    const redButtons=interactionPoints.map((p,index)=>`<button class="map-point red" type="button" data-interaction-point="${index}" style="${coords(p)}" aria-label="${p.label}"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const roomArt=isRoom?`<div class="room-art" aria-hidden="true"><div class="room-back-wall"></div><div class="room-bed"><span>침대</span></div><div class="room-desk"><span>책상</span></div><div class="room-calendar">달력</div><div class="room-door"><span>문</span></div></div>`:"";
    const roomClass=isRoom?" room-interior":"";const locationLabel=isWhole?"전체맵":(isRoom?"내방":"방 밖 · 임시 맵");
    return `<div class="map-board${roomClass}" data-map-board="${kind}" data-scene="${scene}" aria-label="${locationLabel}">
      ${roomArt}<span class="map-hint">${isWhole?"임시 전체맵":"파란 점은 이동, 빨간 점은 상호작용"}</span><span class="map-location-label">${locationLabel}</span>
      ${moveButtons}${redButtons}${stampMarkup(marker,name)}${isWhole?"":renderSpeechBubbles(messages,marker)}
    </div>
    <div class="map-legend"><span><i class="legend-dot blue"></i>파란 점을 눌러 이동</span>${isWhole?"":"<span><i class=\"legend-dot red\"></i>빨간 점을 눌러 상호작용</span>"}</div>`;
  }
  function render(kind=window.GHData.state.map.active||"whole") {
    window.GHData.state.map.active=kind;window.GHData.save();
    const title=kind==="whole"?"전체맵":(window.GHData.state.map.detailScene==="room"?"내방":"방 밖 · 임시 맵");
    const note=kind==="whole"?"전체 학교 지도는 추후 설정할 예정이에요.":(window.GHData.state.map.detailScene==="room"?"달력·침대·문은 빨간 점으로, 침대와 책상 근처는 파란 점으로 상호작용해요.":"임시 외부 맵이에요. 빨간 점을 눌러 내 방으로 돌아올 수 있어요.");
    const detailSpeech=kind==="detail"?`${renderSpeechHistory(window.GHData.state.areaMessages||[])}<section class="section-block"><h2>말하기</h2><form class="say-form" id="area-say-form"><input class="text-entry" name="message" maxlength="500" placeholder="이 세부맵에 있는 사람에게 말하기" required><button class="button-primary" type="submit">보내기</button></form></section>`:"";
    return `<div class="game-screen"><div class="status-bar">${window.GHApp.statusMarkup()}</div>
      <header class="screen-heading"><h1>${title}</h1>${kind==="detail"?"<small>현재 세부맵</small>":"<small>지도 배경 미정</small>"}</header>
      <main class="screen-scroll"><p class="hint map-page-hint">${note}</p>${renderBoard(kind)}${detailSpeech}</main>
      ${window.GHApp.navMarkup(kind==="whole"?"전체맵":"세부맵")}</div>`;
  }
  function move(kind,index,board) {
    const state=window.GHData.state;const scene=board.dataset.scene;const points=kind==="whole"?wholePoints:(scene==="room"?roomBlue:detailBlue);const point=points[index];if(!point)return;
    const key=kind==="whole"?"wholePoint":(scene==="room"?"roomPoint":"detailPoint");
    const stamp=board.querySelector("[data-stamp]");if(!stamp)return;
    const boardRect=board.getBoundingClientRect();const stampRect=stamp.getBoundingClientRect();
    const previous={x:((stampRect.left+stampRect.width/2-boardRect.left)/boardRect.width)*100,y:((stampRect.top+stampRect.height/2-boardRect.top)/boardRect.height)*100};
    state.map[key]=index;state.map.currentPoint=point.label;window.GHData.save();
    board.querySelector("[data-route]")?.remove();
    if(previous.x!==point.x||previous.y!==point.y){
      const route=document.createElementNS("http://www.w3.org/2000/svg","svg");route.setAttribute("class","map-route");route.setAttribute("viewBox","0 0 100 100");route.setAttribute("preserveAspectRatio","none");route.setAttribute("aria-hidden","true");route.dataset.route="";
      const waypoints=Array.isArray(point.routeVia)?point.routeVia:[];
      const routePoints=[previous,...waypoints,point].filter((item)=>Number.isFinite(Number(item.x))&&Number.isFinite(Number(item.y)));
      const polyline=document.createElementNS("http://www.w3.org/2000/svg","polyline");polyline.setAttribute("points",routePoints.map((item)=>`${item.x},${item.y}`).join(" "));polyline.setAttribute("class","map-route-line");route.append(polyline);board.insertBefore(route,stamp);
      const name=state.character?.name||"내 캐릭터";stamp.dataset.name=name;stamp.textContent=name.slice(0,1);
      animateAlongRoute(stamp,board,routePoints,detailBlue,()=>route.remove());
    }
  }
  function distanceOnBoard(from,to,bounds){return Math.hypot((Number(to.x)-Number(from.x))*bounds.width/100,(Number(to.y)-Number(from.y))*bounds.height/100);}
  function animateAlongRoute(stamp,board,routePoints,referencePoints,onComplete=()=>{}){
    const previousFrame=activeMoves.get(stamp);if(previousFrame)globalThis.cancelAnimationFrame?.(previousFrame);
    const bounds=board.getBoundingClientRect();
    const pixelPoints=routePoints.map((point)=>({x:Number(point.x)*bounds.width/100,y:Number(point.y)*bounds.height/100}));
    const segments=[];let totalLength=0;
    for(let i=1;i<pixelPoints.length;i++){const from=pixelPoints[i-1],to=pixelPoints[i],length=Math.hypot(to.x-from.x,to.y-from.y);segments.push({from,to,length});totalLength+=length;}
    const referenceLength=referencePoints.length>=3?distanceOnBoard(referencePoints[1],referencePoints[2],bounds):0;
    const duration=referenceLength?totalLength/referenceLength*REFERENCE_MOVE_MS:REFERENCE_MOVE_MS;
    let startedAt=null;
    const frame=(timestamp)=>{
      if(startedAt===null)startedAt=timestamp;
      const elapsed=Math.min(duration,Math.max(0,timestamp-startedAt));
      let distance=totalLength*(duration?elapsed/duration:1);let position=pixelPoints[pixelPoints.length-1];
      for(const segment of segments){if(distance<=segment.length){const ratio=segment.length?distance/segment.length:1;position={x:segment.from.x+(segment.to.x-segment.from.x)*ratio,y:segment.from.y+(segment.to.y-segment.from.y)*ratio};break;}distance-=segment.length;}
      stamp.style.left=`${position.x/bounds.width*100}%`;stamp.style.top=`${position.y/bounds.height*100}%`;
      if(elapsed<duration){activeMoves.set(stamp,requestAnimationFrame(frame));}
      else{activeMoves.delete(stamp);onComplete();}
    };
    activeMoves.set(stamp,requestAnimationFrame(frame));
  }
  function showInteraction(index) {
    const state=window.GHData.state;const scene=state.map.detailScene||"room";const point=(scene==="room"?roomRed:outsideRed)[index];if(!point)return;
    if(point.action==="calendar"){showSchedule();return;}
    if(point.action==="sleep"){
      window.GHApp.openDialog("침대에서 자기",`<p>침대에서 잘까요?</p><p class="hint">잠자기 후 피로 회복 수치는 아직 정해지지 않아, 확인 전까지 상태 수치는 바뀌지 않아요.</p><div class="dialog-actions"><button class="button-quiet" type="button" data-dialog-close>아니요</button><button class="button-primary" type="button" data-sleep-confirm>잠들기</button></div>`);return;
    }
    if(point.action==="exit-room"){changeScene("outside");return;}
    if(point.action==="enter-room"){changeScene("room");return;}
    window.GHApp.openDialog("상호작용 지점",`<p>${escapeHtml(point.label)}</p><p>물체 설명은 맵 설정이 정해진 뒤 추가할게요.</p>`);
  }
  function changeScene(scene){const state=window.GHData.state;state.map.detailScene=scene;if(scene==="outside")state.map.detailPoint=0;state.map.currentPoint=scene==="room"?roomBlue[Number(state.map.roomPoint)||0].label:detailBlue[Number(state.map.detailPoint)||0].label;state.page="세부맵";window.GHData.save();window.GHApp.render();}
  function showSchedule(){
    const days=["27","28","29","30",...Array.from({length:31},(_,i)=>String(i+1))];
    const cells=days.map((day,index)=>{const isCurrent=index>=4;const selected=isCurrent&&day==="25";return `<span class="schedule-day${isCurrent?"":" muted"}${selected?" selected":""}">${day}${selected?'<i class="schedule-event-dot"></i>':""}</span>`;}).join("");
    window.GHApp.openDialog("일정표",`<div class="schedule-month"><button type="button" aria-label="이전 달" disabled>‹</button><strong>2026년 10월</strong><button type="button" aria-label="다음 달" disabled>›</button></div><div class="schedule-grid">${["일","월","화","수","목","금","토"].map((day)=>`<span class="weekday">${day}</span>`).join("")}${cells}</div><div class="schedule-date-label">10월 25일 일요일</div><button type="button" class="schedule-event" data-schedule-event><b>10:00</b><span><strong>임시 이벤트</strong><small>시안용 일정 · 눌러서 팀원 보기</small></span></button>`);
  }
  function showEventTeam(){
    window.GHApp.openDialog("임시 이벤트",`<p>2026년 10월 25일 10:00</p><div class="schedule-team-head"><strong>팀원 목록</strong><button class="plus-button" type="button" data-team-add aria-label="팀원 추가">＋</button></div><p class="hint">현재 팀원이 없어요.</p>`);
  }
  function showTeamLetter(){
    const sender=window.GHData.state.character?.name||"내 캐릭터";
    window.GHApp.openDialog("편지 쓰기",`<div class="team-letter-paper"><div class="letter-date">2026년 10월 25일</div><p class="letter-line"><span>받는 사람</span><input class="letter-recipient" placeholder="캐릭터 이름 검색"></p><p class="letter-sender">보내는 사람　${escapeHtml(sender)}</p><p class="letter-subject">임시 이벤트 팀 제의</p><textarea class="letter-body" maxlength="500" placeholder="하고 싶은 말을 편지지에 적어주세요."></textarea><div class="letter-limit">기본 500자 · 편지 세트 보유 시 1,000자 <span>0 / 500</span></div></div><div class="dialog-actions"><button class="button-quiet" type="button" data-team-back>돌아가기</button><button class="button-primary" type="button" data-team-letter-send>편지 보내기</button></div>`);
  }
  window.GHMaps={render,move,showInteraction,showEventTeam,showTeamLetter,changeScene,wholePoints,detailBlue,detailRed,roomBlue,roomRed};
})();
