(function () {
  "use strict";
  const wholePoints = [{ label:"내 방", x:50, y:27, action:"enter-room" }];
  const detailBlue = [
    { label:"이동 지점 1", x:20, y:30 },
    { label:"이동 지점 2", x:77, y:29 },
    { label:"이동 지점 3", x:29, y:72 },
    { label:"이동 지점 4", x:72, y:71 },
    { label:"꺾임 테스트", x:82, y:82, routeVia:[{x:40,y:30},{x:40,y:74},{x:72,y:74}] },
    { label:"상호작용 지점 1 앞", x:48, y:34 },
    { label:"상호작용 지점 2 앞", x:54, y:72 },
    { label:"상호작용 지점 3 앞", x:34, y:57 },
    { label:"내 방 앞", x:78, y:29 }
  ];
  const detailRed = [
    { label:"상호작용 지점 1", x:49, y:43, approachPoint:5 },
    { label:"상호작용 지점 2", x:52, y:63, approachPoint:6 },
    { label:"상호작용 지점 3", x:39, y:55, approachPoint:7 }
  ];
  const roomBlue = [
    { label:"침대 옆", x:42, y:57 },
    { label:"책상 앞", x:70, y:65 },
    { label:"달력 앞", x:75, y:32 },
    { label:"문 앞", x:51, y:72 }
  ];
  const roomRed = [
    { label:"달력 열기", x:75, y:24, action:"calendar", approachPoint:2 },
    { label:"침대에서 자기", x:27, y:49, action:"sleep", approachPoint:0 },
    { label:"나가기", x:51, y:86, action:"exit-room", approachPoint:3, labelPosition:"above" }
  ];
  const outsideRed = [...detailRed,{label:"내 방으로 들어가기",x:82,y:20,action:"enter-room",approachPoint:8}];
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
    const moveButtons=points.map((p,index)=>`<button class="map-point ${isWhole?"green":"blue"}" type="button" data-map-point="${kind}" data-point-index="${index}" style="${coords(p)}" aria-label="${p.label}${isWhole?" 구역으로 이동":"로 이동"}"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const interactionPoints=isWhole?[]:(isRoom?roomRed:outsideRed);
    const redButtons=interactionPoints.map((p,index)=>`<button class="map-point red${p.labelPosition==="above"?" label-above":""}" type="button" data-interaction-point="${index}" style="${coords(p)}" aria-label="${p.label}"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const roomArt=isRoom?`<div class="room-art" aria-hidden="true"><div class="room-back-wall"></div><div class="room-bed"><span>침대</span></div><div class="room-desk"><span>책상</span></div><div class="room-calendar">달력</div><div class="room-door"><span>문</span></div></div>`:isWhole?'<div class="whole-room-card" aria-hidden="true"><span>내 방</span></div>':"";
    const roomClass=isRoom?" room-interior":"";const locationLabel=isWhole?"전체맵":(isRoom?"내방":"방 밖 · 임시 맵");
    return `<div class="map-board${roomClass}" data-map-board="${kind}" data-scene="${scene}" aria-label="${locationLabel}">
      ${roomArt}<span class="map-hint">${isWhole?"초록 점을 눌러 내 방으로 이동":"파란 점은 이동, 빨간 점은 상호작용"}</span><span class="map-location-label">${locationLabel}</span>
      ${moveButtons}${redButtons}${stampMarkup(marker,name)}${isWhole?"":renderSpeechBubbles(messages,marker)}
    </div>
    <div class="map-legend"><span><i class="legend-dot ${isWhole?"green":"blue"}"></i>${isWhole?"초록 점을 눌러 세부 구역으로 이동":"파란 점을 눌러 이동"}</span>${isWhole?"":"<span><i class=\"legend-dot red\"></i>빨간 점은 가까운 파란 점에 도착해야 상호작용</span>"}</div>`;
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
    if(kind==="whole"){state.map.wholePoint=index;window.GHData.save();changeScene("room");return;}
    const key=kind==="whole"?"wholePoint":(scene==="room"?"roomPoint":"detailPoint");
    const arrivedKey=scene==="room"?"roomArrivedPoint":"detailArrivedPoint";
    const stamp=board.querySelector("[data-stamp]");if(!stamp)return;
    const boardRect=board.getBoundingClientRect();const stampRect=stamp.getBoundingClientRect();
    const previous={x:((stampRect.left+stampRect.width/2-boardRect.left)/boardRect.width)*100,y:((stampRect.top+stampRect.height/2-boardRect.top)/boardRect.height)*100};
    const alreadyMoving=activeMoves.has(stamp);state.map[key]=index;state.map[arrivedKey]=null;state.map.currentPoint=point.label;window.GHData.save();
    if(!alreadyMoving&&Math.hypot(previous.x-point.x,previous.y-point.y)<0.5){state.map[arrivedKey]=index;window.GHData.save();return;}
    board.querySelector("[data-route]")?.remove();
    if(previous.x!==point.x||previous.y!==point.y){
      const route=document.createElementNS("http://www.w3.org/2000/svg","svg");route.setAttribute("class","map-route");route.setAttribute("viewBox","0 0 100 100");route.setAttribute("preserveAspectRatio","none");route.setAttribute("aria-hidden","true");route.dataset.route="";
      const waypoints=scene==="room"?findRoomRoute(previous,point,boardRect):Array.isArray(point.routeVia)?point.routeVia:[];
      const routePoints=[previous,...waypoints,point].filter((item)=>Number.isFinite(Number(item.x))&&Number.isFinite(Number(item.y)));
      const polyline=document.createElementNS("http://www.w3.org/2000/svg","polyline");polyline.setAttribute("points",routePoints.map((item)=>`${item.x},${item.y}`).join(" "));polyline.setAttribute("class","map-route-line");route.append(polyline);board.insertBefore(route,stamp);
      const name=state.character?.name||"내 캐릭터";stamp.dataset.name=name;stamp.textContent=name.slice(0,1);
      animateAlongRoute(stamp,board,routePoints,detailBlue,()=>{state.map[arrivedKey]=index;window.GHData.save();route.remove();});
    }else{state.map[arrivedKey]=index;window.GHData.save();}
  }
  function findRoomRoute(from,to,bounds){
    const obstacles=[{left:12,top:31,right:35,bottom:54},{left:67,top:43,right:90,bottom:60},{left:64,top:14,right:75,bottom:24},{left:44,top:77,right:58,bottom:94}];
    const padded=obstacles.map((r)=>({left:r.left-1.5,top:r.top-1.5,right:r.right+1.5,bottom:r.bottom+1.5}));
    const nodes=[from,to];
    for(const r of padded){nodes.push({x:r.left-1,y:r.top-1},{x:r.right+1,y:r.top-1},{x:r.right+1,y:r.bottom+1},{x:r.left-1,y:r.bottom+1});}
    const clear=(a,b)=>{
      const steps=Math.max(20,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*3));
      for(let step=1;step<steps;step++){const t=step/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(padded.some((r)=>x>r.left&&x<r.right&&y>r.top&&y<r.bottom))return false;}
      return true;
    };
    const scaleX=(bounds.width||1)/(bounds.height||1);const distance=(a,b)=>Math.hypot((b.x-a.x)*scaleX,b.y-a.y);
    const costs=nodes.map((_,i)=>i===0?0:Infinity);const previous=nodes.map(()=>-1);const visited=new Set();
    while(visited.size<nodes.length){let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]))current=i;if(current<0||!Number.isFinite(costs[current]))break;if(current===1)break;visited.add(current);
      for(let next=0;next<nodes.length;next++){if(next===current||visited.has(next)||!clear(nodes[current],nodes[next]))continue;const cost=costs[current]+distance(nodes[current],nodes[next]);if(cost<costs[next]){costs[next]=cost;previous[next]=current;}}
    }
    if(previous[1]<0)return [];
    const path=[];for(let at=1;at>0;at=previous[at])path.push(nodes[at]);path.reverse();return path.slice(1,-1);
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
  function showInteraction(index,board) {
    const state=window.GHData.state;const scene=board?.dataset.scene||state.map.detailScene||"room";const point=(scene==="room"?roomRed:outsideRed)[index];if(!point)return;
    const stamp=board?.querySelector("[data-stamp]");const arrived=scene==="room"?state.map.roomArrivedPoint:state.map.detailArrivedPoint;
    if(arrived!==point.approachPoint||!stamp||activeMoves.has(stamp))return;
    if(point.action==="calendar"){showSchedule();return;}
    if(point.action==="sleep"){
      const status=state.status;const sleepText=status.sleepStartedAt?"이미 잠들어 있어요. 5분마다 피로가 1씩 회복돼요.":`현재 피로 ${status.fatigue}/100 · 5분마다 피로가 1 감소해요.`;
      window.GHApp.openDialog("침대에서 자기",`<p>침대에서 잘까요?</p><p class="hint">${sleepText} 피로가 0이 되면 회복이 끝나요.</p><div class="dialog-actions"><button class="button-quiet" type="button" data-dialog-close>아니요</button><button class="button-primary" type="button" data-sleep-confirm ${status.sleepStartedAt||Number(status.fatigue)<=0?"disabled":""}>잠들기</button></div>`);return;
    }
    if(point.action==="exit-room"){changeScene("outside");return;}
    if(point.action==="enter-room"){changeScene("room");return;}
    window.GHApp.openDialog("상호작용 지점",`<p>${escapeHtml(point.label)}</p><p>물체 설명은 맵 설정이 정해진 뒤 추가할게요.</p>`);
  }
  function changeScene(scene){const state=window.GHData.state;state.map.detailScene=scene;if(scene==="outside"){state.map.detailPoint=0;state.map.detailArrivedPoint=0;}state.map.currentPoint=scene==="room"?roomBlue[Number(state.map.roomPoint)||0].label:detailBlue[Number(state.map.detailPoint)||0].label;state.page="세부맵";window.GHData.save();window.GHApp.render();}
  function showSchedule(){
    const days=["27","28","29","30",...Array.from({length:31},(_,i)=>String(i+1))];
    const cells=days.map((day,index)=>{const isCurrent=index>=4;const selected=isCurrent&&day==="25";return `<span class="schedule-day${isCurrent?"":" muted"}${selected?" selected":""}">${day}${selected?'<i class="schedule-event-dot"></i>':""}</span>`;}).join("");
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");
    window.GHApp.openDialog("일정표",`<div class="schedule-month"><button type="button" aria-label="이전 달" disabled>‹</button><strong>2026년 10월</strong><button type="button" aria-label="다음 달" disabled>›</button></div><div class="schedule-grid">${["일","월","화","수","목","금","토"].map((day)=>`<span class="weekday">${day}</span>`).join("")}${cells}</div><div class="schedule-date-label">10월 25일 일요일</div>${event?`<button type="button" class="schedule-event" data-schedule-event="${event.id}"><b>${escapeHtml(event.time)}</b><span><strong>${escapeHtml(event.title)}</strong><small>팀원 확인 · 눌러서 목록 보기</small></span></button>`:'<p class="hint">등록된 이벤트가 없어요.</p>'}`);
  }
  function showEventTeam(){
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");if(!event)return;
    const members=event.team.map((name)=>`<div class="team-member-row"><span>${escapeHtml(name)}</span>${name==="임시"?'<small class="hint">테스트 계정</small>':""}</div>`).join("")||'<p class="hint">현재 팀원이 없어요.</p>';
    window.GHApp.openDialog(event.title,`<p>${escapeHtml(event.date)} ${escapeHtml(event.time)}</p><div class="schedule-team-head"><strong>팀원 목록</strong><button class="plus-button" type="button" data-team-add aria-label="팀원 추가">＋</button></div><div class="schedule-team-list">${members}</div>`);
  }
  function showTeamLetter(){
    const sender=window.GHData.state.character?.name||"내 캐릭터";
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");
    window.GHApp.openDialog("편지 쓰기",`<div class="team-letter-paper"><div class="letter-date">${escapeHtml(window.GHData.todayKey())}</div><p class="letter-line"><span>받는 사람</span><input class="letter-recipient" list="demo-recipients" value="임시" placeholder="캐릭터 이름 검색"><datalist id="demo-recipients"><option value="임시"></datalist></p><p class="letter-sender">보내는 사람　${escapeHtml(sender)}</p><p class="letter-subject">${escapeHtml(event?.title||"이벤트")} 팀 제의</p><textarea class="letter-body" maxlength="500" placeholder="하고 싶은 말을 편지지에 적어주세요."></textarea><div class="letter-limit">기본 500자 · 편지 세트 보유 시 1,000자 <span>0 / 500</span></div></div><div class="dialog-actions"><button class="button-quiet" type="button" data-team-back>돌아가기</button><button class="button-primary" type="button" data-team-letter-send>편지 보내기</button></div>`);
  }
  window.GHMaps={render,move,showInteraction,showEventTeam,showTeamLetter,changeScene,wholePoints,detailBlue,detailRed,roomBlue,roomRed};
})();
