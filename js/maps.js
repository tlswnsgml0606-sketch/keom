(function () {
  "use strict";
  const wholePoints = [{ x:50, y:48, action:"enter-room" }];
  const detailBlue = [
    { x:20, y:30 }, { x:77, y:29 }, { x:29, y:72 }, { x:72, y:71 },
    { x:82, y:82 }, { x:49, y:35 }, { x:52, y:71 }, { x:31, y:55 }, { x:78, y:28 }
  ];
  const detailRed = [
    { label:"물체 살펴보기", x:49, y:43, approachPoint:5 },
    { label:"문 살펴보기", x:52, y:63, approachPoint:6 },
    { label:"책장 살펴보기", x:39, y:55, approachPoint:7 }
  ];
  const roomBlue = [
    { x:42, y:49 }, { x:78, y:68 }, { x:79, y:20 }, { x:66, y:82 }
  ];
  const roomRed = [
    { label:"달력 열기", x:71, y:20, action:"calendar", approachPoint:2, labelPosition:"below-left" },
    { label:"침대에서 자기", x:34, y:49, action:"sleep", approachPoint:0, labelPosition:"left" },
    { label:"나가기", x:58, y:82, action:"exit-room", approachPoint:3, labelPosition:"above" }
  ];
  const outsideRed = [...detailRed,{label:"내 방으로 들어가기",x:78,y:20,action:"enter-room",approachPoint:8}];
  const REFERENCE_MOVE_MS = 1120;
  const activeMoves = new WeakMap();
  const coords=(point)=>`left:${point.x}%;top:${point.y}%`;
  function stampMarkup(point, name, options={}) {
    const initial=options.sleeping?name:(name||"인장").slice(0,1);
    return `<button type="button" class="map-stamp${options.sleeping?" sleeping-stamp":""}" data-stamp data-profile-name="${escapeHtml(name)}" style="${coords(point)}" data-name="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">${escapeHtml(initial)}</button>`;
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
    const name=state.character?.name||"내 캐릭터";const sleeping=Boolean(state.status.sleepStartedAt);const marker=isWhole?{x:50,y:28}:sleeping&&isRoom?{x:23.5,y:42.5}:points[Math.min(active,points.length-1)];const messages=state.areaMessages||[];
    const moveButtons=points.map((p,index)=>`<button class="map-point ${isWhole?"green":"blue"}" type="button" data-map-point="${kind}" data-point-index="${index}" style="${coords(p)}" aria-label="${isWhole?"내 방으로 이동":"이동"}"><span class="map-dot"></span></button>`).join("");
    const interactionPoints=isWhole?[]:(isRoom?roomRed:outsideRed);
    const redButtons=interactionPoints.map((p,index)=>`<button class="map-point red label-${p.labelPosition||"below"}" type="button" data-interaction-point="${index}" style="${coords(p)}" aria-label="${p.label}"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const event=state.events.find((item)=>item.demo);const remote=state.remotePresence||[];const roomRemote=remote.filter((person)=>person.scene==="room"||person.location==="내 방");const people=[{name,portrait:state.character?.portrait,arrivedAt:Number(state.map.arrivedAt||0),mine:true},{name:state.demoAccount.name,portrait:null,arrivedAt:Number(state.demoAccount.arrivedAt||1)},{name:state.demoAccount2.name,portrait:null,arrivedAt:Number(state.demoAccount2.arrivedAt||2)},...roomRemote].sort((a,b)=>a.arrivedAt-b.arrivedAt);const latest=people[people.length-1];const zoom=Math.max(100,Math.min(400,Number(state.map.wholeZoom)||100));const wholeOccupants=`<div class="whole-occupants" aria-label="내 방에 있는 사람">${zoom>=250?stampMarkup({x:50,y:28},latest.name):`<button type="button" class="whole-name" data-profile-name="${escapeHtml(latest.name)}">${escapeHtml(latest.name)}</button>`}${people.length>1?`<span class="whole-count">${escapeHtml(latest.name)}님 외 ${people.length-1}명</span>`:""}${event?`<span class="whole-event">${escapeHtml(event.title)}</span>`:""}</div>`;
    const roomArt=isRoom?`<div class="room-art${sleeping?" sleeping":""}" aria-hidden="true"><div class="room-back-wall"></div><div class="room-bed"><span>침대</span></div><div class="room-desk"><span>책상</span></div><div class="room-calendar">달력</div><div class="room-door"><span>문</span></div></div>`:isWhole?`<div class="whole-room-card${event?" event-active":""}" aria-label="내 방, ${people.length}명">${wholeOccupants}<span class="whole-room-name">내 방</span></div>`:"";
    const roomClass=isRoom?" room-interior":"";const locationLabel=isWhole?"전체맵":(isRoom?"내방":"방 밖 · 임시 맵");
    const demoStamps=!isWhole&&!sleeping?`<button class="map-stamp demo-stamp" type="button" data-profile-name="임시" data-name="임시" style="${coords(isRoom?roomBlue[2]:detailBlue[1])}">임</button><button class="map-stamp demo-stamp second" type="button" data-profile-name="임시 2" data-name="임시 2" style="${coords(isRoom?roomBlue[1]:detailBlue[2])}">임2</button>${state.remotePresence.filter((person)=>person.scene===scene).map((person)=>{const remotePoints=scene==="room"?roomBlue:detailBlue;const remotePoint=remotePoints[Math.max(0,Math.min(remotePoints.length-1,Number(person.statePoint)||0))];return `<button class="map-stamp demo-stamp remote-stamp" type="button" data-profile-name="${escapeHtml(person.name)}" data-name="${escapeHtml(person.name)}" style="${coords(remotePoint)}">${escapeHtml(person.name.slice(0,1))}</button>`;}).join("")}`:"";
    const zoomControls=isWhole?`<div class="map-zoom" aria-label="전체맵 확대"><button type="button" data-map-zoom="-25" aria-label="축소">−</button><output data-zoom-value>${zoom}%</output><button type="button" data-map-zoom="25" aria-label="확대">＋</button></div>`:"";
    return `<div class="map-board${roomClass}" data-map-board="${kind}" data-scene="${scene}" data-zoom="${zoom}" style="--map-zoom:${zoom/100}" aria-label="${locationLabel}">
      ${roomArt}<span class="map-hint">${isWhole?"초록 점을 눌러 내 방으로 이동":"파란 점은 이동, 빨간 점은 상호작용"}</span><span class="map-location-label">${locationLabel}</span>
      ${moveButtons}${redButtons}${demoStamps}${isWhole?"":stampMarkup(marker,name,{sleeping})}${isWhole?"":renderSpeechBubbles(messages,marker)}
    </div>
    ${zoomControls}
    <div class="map-legend"><span><i class="legend-dot ${isWhole?"green":"blue"}"></i>${isWhole?"초록 점을 눌러 세부 구역으로 이동":"파란 점을 눌러 이동"}</span>${isWhole?"":"<span><i class=\"legend-dot red\"></i>빨간 점은 가까운 파란 점에 도착해야 상호작용</span>"}</div>`;
  }
  function render(kind=window.GHData.state.map.active||"whole") {
    window.GHData.state.map.active=kind;window.GHData.save();
    const title=kind==="whole"?"전체맵":(window.GHData.state.map.detailScene==="room"?"내방":"방 밖 · 임시 맵");
    const note=kind==="whole"?"현재 공개된 지도는 내 방 구역이에요. 확대하면 인장과 닉네임을 볼 수 있어요.":(window.GHData.state.map.detailScene==="room"?"이동점에 이름은 표시하지 않아요. 빨간 점은 인근 이동점에 도착한 뒤 사용할 수 있어요.":"임시 외부 맵이에요. 빨간 점 근처 파란 점으로 이동해 내 방에 들어가세요.");
    const detailSpeech=kind==="detail"?`<section class="map-chat-panel" data-map-chat-panel><div class="map-chat-list" data-speech-history aria-live="polite">${renderSpeechHistory(window.GHData.state.areaMessages||[])}</div><form class="say-form" id="area-say-form"><input class="text-entry" data-area-chat-input name="message" maxlength="500" autocomplete="off" placeholder="말하기 · @이름으로 귓속말" required><div class="mention-suggestions" data-mention-suggestions hidden></div><button class="button-primary" type="submit">보내기</button></form></section>`:"";
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
    const previousIndex=Number(state.map[arrivedKey]??state.map[key]??0);const alreadyMoving=activeMoves.has(stamp);state.map[key]=index;state.map[arrivedKey]=null;state.map.currentPoint="이동 중";window.GHData.save();
    if(!alreadyMoving&&Math.hypot(previous.x-point.x,previous.y-point.y)<0.5){state.map[arrivedKey]=index;window.GHData.save();return;}
    board.querySelector("[data-route]")?.remove();
    if(previous.x!==point.x||previous.y!==point.y){
      board.querySelectorAll(".footstep").forEach((step)=>step.remove());
      const waypoints=scene==="room"?findRoomRoute(previous,point,board):[];
      if(waypoints===null){toastRouteBlocked();state.map[key]=previousIndex;state.map[arrivedKey]=previousIndex;window.GHData.save();return;}
      const routePoints=[previous,...waypoints,point].filter((item)=>Number.isFinite(Number(item.x))&&Number.isFinite(Number(item.y)));
      const name=state.character?.name||"내 캐릭터";stamp.dataset.name=name;stamp.textContent=name.slice(0,1);
      animateAlongRoute(stamp,board,routePoints,detailBlue,()=>{state.map[arrivedKey]=index;state.map.arrivedAt=Date.now();window.GHData.save();window.GHSync?.publish("map.position",{scene,statePoint:index,name:state.character?.name}).catch(()=>{});board.querySelectorAll(".map-point.is-moving-target").forEach((button)=>button.classList.remove("is-moving-target"));setTimeout(()=>board.querySelectorAll(".footstep").forEach((step)=>{step.style.opacity="0";setTimeout(()=>step.remove(),450);}),1800);});
    }else{state.map[arrivedKey]=index;window.GHData.save();}
  }
  function findRoomRoute(from,to,board){
    const bounds=board.getBoundingClientRect();
    const rects=[".room-bed",".room-desk",".room-calendar",".room-door"].map((selector)=>board.querySelector(selector)?.getBoundingClientRect()).filter(Boolean);
    const padx=22/Math.max(1,bounds.width)*100,pady=22/Math.max(1,bounds.height)*100;
    const padded=rects.map((r)=>({left:(r.left-bounds.left)/bounds.width*100-padx,top:(r.top-bounds.top)/bounds.height*100-pady,right:(r.right-bounds.left)/bounds.width*100+padx,bottom:(r.bottom-bounds.top)/bounds.height*100+pady}));
    const nodes=[from,to];
    for(const r of padded){const gap=.25;nodes.push({x:r.left-gap,y:r.top-gap},{x:r.right+gap,y:r.top-gap},{x:r.right+gap,y:r.bottom+gap},{x:r.left-gap,y:r.bottom+gap});}
    const intersects=(a,b,r)=>{let t0=0,t1=1;const dx=b.x-a.x,dy=b.y-a.y;for(const [p,q] of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]){if(Math.abs(p)<1e-9){if(q<=0)return false;continue;}const t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}}return t0<t1&&t1>0&&t0<1;};
    const clear=(a,b)=>!padded.some((r)=>intersects(a,b,r));
    const scaleX=(bounds.width||1)/(bounds.height||1);const distance=(a,b)=>Math.hypot((b.x-a.x)*scaleX,b.y-a.y);
    const costs=nodes.map((_,i)=>i===0?0:Infinity);const previous=nodes.map(()=>-1);const visited=new Set();
    while(visited.size<nodes.length){let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]))current=i;if(current<0||!Number.isFinite(costs[current]))break;if(current===1)break;visited.add(current);
      for(let next=0;next<nodes.length;next++){if(next===current||visited.has(next)||!clear(nodes[current],nodes[next]))continue;const cost=costs[current]+distance(nodes[current],nodes[next]);if(cost<costs[next]){costs[next]=cost;previous[next]=current;}}
    }
    if(previous[1]<0)return null;
    const path=[];for(let at=1;at>0;at=previous[at])path.push(nodes[at]);path.reverse();return path.slice(0,-1);
  }
  function toastRouteBlocked(){window.GHApp.toast("가구를 피해 이동할 경로를 찾지 못했어요.");}
  function distanceOnBoard(from,to,bounds){return Math.hypot((Number(to.x)-Number(from.x))*bounds.width/100,(Number(to.y)-Number(from.y))*bounds.height/100);}
  function animateAlongRoute(stamp,board,routePoints,referencePoints,onComplete=()=>{}){
    const previousFrame=activeMoves.get(stamp);if(previousFrame)globalThis.cancelAnimationFrame?.(previousFrame);
    const bounds=board.getBoundingClientRect();
    const pixelPoints=routePoints.map((point)=>({x:Number(point.x)*bounds.width/100,y:Number(point.y)*bounds.height/100}));
    const segments=[];let totalLength=0;
    for(let i=1;i<pixelPoints.length;i++){const from=pixelPoints[i-1],to=pixelPoints[i],length=Math.hypot(to.x-from.x,to.y-from.y);segments.push({from,to,length});totalLength+=length;}
    const referenceLength=referencePoints.length>=3?distanceOnBoard(referencePoints[1],referencePoints[2],bounds):0;
    const duration=referenceLength?totalLength/referenceLength*REFERENCE_MOVE_MS:REFERENCE_MOVE_MS;
    const steps=Math.max(1,Math.floor(totalLength/24));const footprints=[];
    const pointAt=(distance)=>{let left=distance;for(const segment of segments){if(left<=segment.length){const ratio=segment.length?left/segment.length:1;return{x:segment.from.x+(segment.to.x-segment.from.x)*ratio,y:segment.from.y+(segment.to.y-segment.from.y)*ratio};}left-=segment.length;}return pixelPoints[pixelPoints.length-1];};
    for(let i=1;i<=steps;i++){
      const position=pointAt(Math.min(totalLength,i*totalLength/steps));const foot=document.createElement("button");foot.type="button";foot.className="footstep";foot.dataset.profileName=stamp.dataset.name||"";foot.style.left=(position.x/bounds.width*100)+"%";foot.style.top=(position.y/bounds.height*100)+"%";foot.innerHTML='<i aria-hidden="true"></i><span>'+escapeHtml(stamp.dataset.name||"")+"</span>";board.append(foot);footprints.push(foot);
      setTimeout(()=>{foot.classList.add("footstep-visible");footprints.forEach((item,index)=>{const age=footprints.indexOf(foot)-index;if(age>=3){item.style.opacity="0";setTimeout(()=>item.remove(),450);}else item.style.opacity=age<2?"1":".55";});},duration*i/steps);
    }
    let startedAt=null;
    const frame=(timestamp)=>{
      if(startedAt===null)startedAt=timestamp;
      const elapsed=Math.min(duration,Math.max(0,timestamp-startedAt));
      let distance=totalLength*(duration?elapsed/duration:1);let position=pixelPoints[pixelPoints.length-1];
      for(const segment of segments){if(distance<=segment.length){const ratio=segment.length?distance/segment.length:1;position={x:segment.from.x+(segment.to.x-segment.from.x)*ratio,y:segment.from.y+(segment.to.y-segment.from.y)*ratio};break;}distance-=segment.length;}
      stamp.style.left=`${position.x/bounds.width*100}%`;stamp.style.top=`${position.y/bounds.height*100}%`;
      board.querySelectorAll(".map-point.blue").forEach((button)=>button.classList.toggle("is-moving-target",button.dataset.pointIndex===String(Number(board.dataset.scene==="room"?window.GHData.state.map.roomPoint:window.GHData.state.map.detailPoint))));
      if(elapsed<duration){activeMoves.set(stamp,requestAnimationFrame(frame));}
      else{activeMoves.delete(stamp);onComplete();}
    };
    activeMoves.set(stamp,requestAnimationFrame(frame));
  }
  function showInteraction(index,board) {
    const state=window.GHData.state;const scene=board?.dataset.scene||state.map.detailScene||"room";const point=(scene==="room"?roomRed:outsideRed)[index];if(!point)return;
    const stamp=board?.querySelector("[data-stamp]");const arrived=scene==="room"?state.map.roomArrivedPoint:state.map.detailArrivedPoint;
    if(arrived!==point.approachPoint||!stamp||activeMoves.has(stamp)){window.GHApp.toast("조금 더 가까이 가보자");return;}
    if(point.action==="calendar"){showSchedule();return;}
    if(point.action==="sleep"){
      const status=state.status;const remaining=status.sleepWakeAt?Math.max(0,Math.ceil((status.sleepWakeAt-Date.now())/60000)):0;const sleepText=status.sleepStartedAt?`이미 잠들어 있어요. 약 ${remaining}분 뒤 깨어나요.`:`현재 피로 ${status.fatigue}/100 · 잠든 동안 5분마다 피로가 1 감소해요.`;
      window.GHApp.openDialog("침대에서 자기",`<p>얼마나 잘까요?</p><label class="sleep-duration">수면 시간(분)<input type="number" min="1" step="1" value="60" data-sleep-minutes ${status.sleepStartedAt?"disabled":""}></label><p class="hint">${sleepText}</p><div class="dialog-actions"><button class="button-quiet" type="button" data-dialog-close>아니요</button><button class="button-primary" type="button" data-sleep-confirm ${status.sleepStartedAt||Number(status.fatigue)<=0?"disabled":""}>잠들기</button></div>`);return;
    }
    if(point.action==="exit-room"){changeScene("outside");return;}
    if(point.action==="enter-room"){changeScene("room");return;}
    window.GHApp.openDialog("상호작용 지점",`<p>${escapeHtml(point.label)}</p><p>물체 설명은 맵 설정이 정해진 뒤 추가할게요.</p>`);
  }
  function changeScene(scene){const state=window.GHData.state;state.map.detailScene=scene;if(scene==="outside"){state.map.detailPoint=0;state.map.detailArrivedPoint=0;}state.map.currentPoint="위치";state.page="세부맵";window.GHData.save();window.GHSync?.publish("map.position",{scene,statePoint:scene==="room"?state.map.roomPoint:state.map.detailPoint,name:state.character?.name,location:scene==="room"?"내 방":"방 밖"}).catch(()=>{});window.GHApp.render();}
  function showSchedule(){
    const days=["27","28","29","30",...Array.from({length:31},(_,i)=>String(i+1))];
    const cells=days.map((day,index)=>{const isCurrent=index>=4;const selected=isCurrent&&day==="25";return `<span class="schedule-day${isCurrent?"":" muted"}${selected?" selected":""}">${day}${selected?'<i class="schedule-event-dot"></i>':""}</span>`;}).join("");
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");
    window.GHApp.openDialog("일정표",`<div class="schedule-month"><button type="button" aria-label="이전 달" disabled>‹</button><strong>2026년 10월</strong><button type="button" aria-label="다음 달" disabled>›</button></div><div class="schedule-grid">${["일","월","화","수","목","금","토"].map((day)=>`<span class="weekday">${day}</span>`).join("")}${cells}</div><div class="schedule-date-label">10월 25일 일요일</div>${event?`<button type="button" class="schedule-event" data-schedule-event="${event.id}"><b>${escapeHtml(event.time)}</b><span><strong>${escapeHtml(event.title)}</strong><small>팀원 확인 · 눌러서 목록 보기</small></span></button>`:'<p class="hint">등록된 이벤트가 없어요.</p>'}`);
  }
  function showEventTeam(){
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");if(!event)return;
    const members=event.team.map((name)=>`<div class="team-member-row" data-team-member="${escapeHtml(name)}"><span>${escapeHtml(name)}</span>${name.startsWith("임시")?'<small class="hint">테스트 계정</small>':""}<button class="button-quiet team-eject-button" type="button" data-team-eject-toggle="${escapeHtml(name)}" hidden>방출</button><small class="hint long-press-hint">길게 눌러 방출</small></div>`).join("")||'<p class="hint">현재 팀원이 없어요.</p>';
    window.GHApp.openDialog(event.title,`<p>${escapeHtml(event.date)} ${escapeHtml(event.time)}</p><div class="schedule-team-head"><strong>팀원 목록</strong><button class="plus-button" type="button" data-team-add aria-label="팀원 추가">＋</button></div><div class="schedule-team-list">${members}</div>`);
  }
  function showEjectLetter(name){
    const sender=window.GHData.state.character?.name||"내 캐릭터";const event=window.GHData.state.events.find((item)=>item.id==="demo-event");if(!event||!event.team.includes(name))return;
    window.GHApp.openDialog("팀 방출 편지",`<article class="team-letter-paper"><div class="letter-date">${escapeHtml(window.GHData.todayKey())}</div><p class="letter-line"><span>받는 사람</span><strong>${escapeHtml(name)}</strong></p><p class="letter-sender">보내는 사람　${escapeHtml(sender)}</p><p class="letter-subject">${escapeHtml(event.title)} 팀 방출</p><textarea class="letter-body" maxlength="500" placeholder="편지지에 방출 사유를 적어주세요."></textarea><div class="letter-limit"><span>기본 500자 · 편지 세트 보유 시 1,000자</span><span>0 / 500</span></div></article><div class="dialog-actions"><button class="button-quiet" type="button" data-team-back>돌아가기</button><button class="button-primary" type="button" data-team-eject-send="${escapeHtml(name)}">편지 보내기</button></div>`);
  }
  function showTeamLetter(){
    const sender=window.GHData.state.character?.name||"내 캐릭터";
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");
    window.GHApp.openDialog("편지 쓰기",`<div class="team-letter-paper"><div class="letter-date">${escapeHtml(window.GHData.todayKey())}</div><p class="letter-line"><span>받는 사람</span><input class="letter-recipient" list="demo-recipients" value="임시" placeholder="캐릭터 이름 검색"><datalist id="demo-recipients"><option value="임시"><option value="임시 2"></datalist></p><p class="letter-sender">보내는 사람　${escapeHtml(sender)}</p><p class="letter-subject">${escapeHtml(event?.title||"이벤트")} 팀 제의</p><textarea class="letter-body" maxlength="500" placeholder="하고 싶은 말을 편지지에 적어주세요."></textarea><div class="letter-limit">기본 500자 · 편지 세트 보유 시 1,000자 <span>0 / 500</span></div></div><div class="dialog-actions"><button class="button-quiet" type="button" data-team-back>돌아가기</button><button class="button-primary" type="button" data-team-letter-send>편지 보내기</button></div>`);
  }
  window.GHMaps={render,move,showInteraction,showEventTeam,showTeamLetter,showEjectLetter,changeScene,wholePoints,detailBlue,detailRed,roomBlue,roomRed};
})();
