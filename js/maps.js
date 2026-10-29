(function () {
  "use strict";
  const wholePoints = [];
  const detailBlue = [];
  const detailRed = [];
  const roomBlue = [];
  const roomRed = [];
  const outsideRed = [];
    const heldDirections = new Set();
  const MOVE_SPEED = 100;
  let movementFrame = 0;
  let lastMoveFrame = 0;
  let lastPositionSave = 0;
  let footstepDistance = 0;
  let footstepIndex = 0;
  let chatRevealed = false;
  const coords=(point)=>`left:${point.x}%;top:${point.y}%`;
  function stampMarkup(point, name, options={}) {
    const initial=options.sleeping?name:(name||"인장").slice(0,1);
    const portrait=options.portrait?`<img class="map-seal-image" src="${escapeHtml(options.portrait)}" alt="">`:"";
    return `<button type="button" class="map-stamp${options.sleeping?" sleeping-stamp":""}${options.whole?" whole-seal-stamp":""}${options.grouped?" has-group":""}" data-stamp data-profile-name="${escapeHtml(name)}" style="${coords(point)}" data-name="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">${portrait||escapeHtml(initial)}</button>`;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function isMine(item){const ownName=window.GHData.state.character?.name;return typeof item.mine==="boolean"?item.mine:item.name===ownName;}
  function renderSpeechBubbles(messages,point){
    const active=messages.filter((item)=>Date.now()-Number(item.createdAt||0)<3000);
    if(!active.length)return "";
    const left=Math.max(20,Math.min(80,point.x));
    const whispers=(window.GHData.state.whisperMessages||[]).filter((item)=>item.with===window.GHData.state.character?.name&&item.scene===(window.GHData.state.map.detailScene||"room")&&Date.now()-Number(item.createdAt||0)<3000).map((item)=>({...item,name:item.author,mine:false,whisper:true}));
    const all=[...active,...whispers].sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0));
    const bubbles=all.map((item)=>`<div class="stamp-bubble ${isMine(item)?"mine":"other"}${item.whisper?" whisper":""}" data-bubble-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}${item.whisper?" (귓속말)":""}:</strong> ${escapeHtml(item.text)}</div>`).join("");
    for(const item of all){const remaining=Math.max(0,3000-(Date.now()-Number(item.createdAt||0)));setTimeout(()=>{document.querySelectorAll("[data-bubble-id]").forEach((bubble)=>{if(bubble.dataset.bubbleId===String(item.id))bubble.remove();});},remaining);}
    return `<div class="stamp-bubble-stack" style="left:${left}%;top:${point.y-4}%">${bubbles}</div>`;
  }
  function renderSpeechHistory(messages){
    const entries=messages.map((item)=>`<div class="map-speech ${isMine(item)?"mine":"other"}"><span class="speech-name">${escapeHtml(item.name)}:</span>${escapeHtml(item.text)}</div>`).join("");
    return `<section class="speech-history" aria-label="말하기 내역"><h2>말하기 내역</h2><div class="speech-history-list" data-speech-history aria-live="polite">${entries||'<p class="speech-empty">아직 말하기 내역이 없어요.</p>'}</div></section>`;
  }
  function renderBoard(kind) {
    const state=window.GHData.state;const isWhole=kind==="whole";const scene=isWhole?"whole":state.map.detailScene||"room";const isRoom=scene==="room";
    state.map.playerPositions??={room:{x:50,y:50},outside:{x:50,y:50}};
    const position=state.map.playerPositions[scene]||{x:50,y:50};
    const sleeping=Boolean(state.status.sleepStartedAt);const messages=(state.areaMessages||[]).filter((item)=>!item.scene||item.scene===scene);
    const zoom=Math.max(80,Math.min(400,Number(state.map.wholeZoom)||100));
    const roomClass=isRoom?" room-interior":"";const locationLabel=isWhole?"전체맵":(isRoom?"내방":"방 밖 · 임시 맵");
    const dpad=kind==="detail"?`<div class="direction-pad" aria-label="이동 방향키"><button type="button" data-direction="up" aria-label="위로 이동">▲</button><button type="button" data-direction="left" aria-label="왼쪽으로 이동">◀</button><span aria-hidden="true"></span><button type="button" data-direction="right" aria-label="오른쪽으로 이동">▶</button><button type="button" data-direction="down" aria-label="아래로 이동">▼</button></div>`:"";
    const boardContent=`${isWhole?"":stampMarkup(position,state.character?.name||"내 캐릭터",{sleeping})}${dpad}`;
    const layer=isWhole?`<div class="map-layer" style="--map-zoom:${zoom/100}">${boardContent}</div>`:boardContent;
    const fixedMapText=isWhole?`<span class="map-location-label">전체맵</span>`:"";
    const chat=kind==="detail"?renderMapChat(messages):"";
    return `<div class="map-board${roomClass}${isWhole&&zoom>=150?" zoomed-in":""}" data-map-board="${kind}" data-scene="${scene}" data-zoom="${zoom}" aria-label="${locationLabel}">${layer}${fixedMapText}${chat}</div>
    ${isWhole?`<div class="map-zoom-readout" data-zoom-value aria-live="polite">${zoom}%</div>`:""}`;
  }
  function renderMapChat(messages){
    const entries=messages.map((item)=>`<div class="map-speech ${isMine(item)?"mine":"other"}"><span class="speech-name">${escapeHtml(item.name)}:</span>${escapeHtml(item.text)}</div>`).join("");
    return `<section class="map-chat-overlay${chatRevealed?" is-active":""}" data-map-chat-overlay><h2>말하기</h2><div class="map-chat-list" data-speech-history aria-live="polite">${entries||'<p class="speech-empty">아직 말하기 내역이 없어요.</p>'}</div><form class="say-form" id="area-say-form"><input class="text-entry" data-area-chat-input name="message" maxlength="500" autocomplete="off" placeholder="말하기 입력" required><div class="mention-suggestions" data-mention-suggestions hidden></div><button class="button-primary" type="submit">전송</button></form></section>`;
  }
  function setChatRevealed(value){chatRevealed=Boolean(value);document.querySelectorAll("[data-map-chat-overlay]").forEach((node)=>node.classList.toggle("is-active",chatRevealed));}
  function beginDirection(direction){
    if(window.GHData.state.page!=="세부맵"||window.GHData.state.status.sleepStartedAt)return;
    heldDirections.add(direction);if(!movementFrame){lastMoveFrame=0;movementFrame=requestAnimationFrame(moveFrame);}
  }
  function endDirection(direction){heldDirections.delete(direction);if(!heldDirections.size){if(movementFrame)cancelAnimationFrame(movementFrame);movementFrame=0;lastMoveFrame=0;persistPlayerPosition(true);}}
  function endAllDirections(){heldDirections.clear();if(movementFrame)cancelAnimationFrame(movementFrame);movementFrame=0;lastMoveFrame=0;persistPlayerPosition(true);}
  function moveFrame(timestamp){
    const board=document.querySelector('[data-map-board="detail"]');
    if(!board||window.GHData.state.page!=="세부맵"||window.GHData.state.status.sleepStartedAt||!heldDirections.size){movementFrame=0;persistPlayerPosition(true);return;}
    if(!lastMoveFrame)lastMoveFrame=timestamp;const dt=Math.min(50,timestamp-lastMoveFrame);lastMoveFrame=timestamp;
    let dx=(heldDirections.has("right")?1:0)-(heldDirections.has("left")?1:0);let dy=(heldDirections.has("down")?1:0)-(heldDirections.has("up")?1:0);const magnitude=Math.hypot(dx,dy)||1;dx/=magnitude;dy/=magnitude;
    const bounds=board.getBoundingClientRect();if(!bounds.width||!bounds.height){movementFrame=requestAnimationFrame(moveFrame);return;}
    const state=window.GHData.state;state.map.playerPositions??={room:{x:50,y:50},outside:{x:50,y:50}};const scene=board.dataset.scene||"room";const position=state.map.playerPositions[scene]||{x:50,y:50};
    const old={x:position.x/100*bounds.width,y:position.y/100*bounds.height};const next={x:Math.max(12,Math.min(bounds.width-12,old.x+dx*MOVE_SPEED*dt/1000)),y:Math.max(12,Math.min(bounds.height-12,old.y+dy*MOVE_SPEED*dt/1000))};
    const distance=Math.hypot(next.x-old.x,next.y-old.y);if(distance>0){position.x=next.x/bounds.width*100;position.y=next.y/bounds.height*100;state.map.playerPositions[scene]=position;const stamp=board.querySelector("[data-stamp]");if(stamp){stamp.style.left=`${position.x}%`;stamp.style.top=`${position.y}%`;}footstepDistance+=distance;while(footstepDistance>=14){footstepDistance-=14;placeFootstep(board,next,dx,dy,scene);}}
    if(timestamp-lastPositionSave>300){window.GHData.save();lastPositionSave=timestamp;}movementFrame=requestAnimationFrame(moveFrame);
  }
  function placeFootstep(board,position,dx,dy,scene){
    const bounds=board.getBoundingClientRect();const side=footstepIndex%2===0?-3:3;const foot=document.createElement("img");foot.className=`footstep ${footstepIndex%2===0?"left":"right"}`;foot.alt="";foot.setAttribute("aria-hidden","true");foot.src="assets/map-footprint.png";foot.style.left=`${(position.x-dy*side)/bounds.width*100}%`;foot.style.top=`${(position.y+dx*side)/bounds.height*100}%`;foot.style.setProperty("--angle",`${Math.atan2(dy,dx)*180/Math.PI+90}deg`);foot.dataset.profileName=window.GHData.state.character?.name||"";board.append(foot);setTimeout(()=>foot.remove(),820);footstepIndex++;
  }
  function persistPlayerPosition(publish){const state=window.GHData.state;window.GHData.save();if(publish&&state.character)window.GHSync?.publish("map.position",{scene:state.map.detailScene||"room",position:state.map.playerPositions?.[state.map.detailScene||"room"],name:state.character.name}).catch(()=>{});}
  function render(kind=window.GHData.state.map.active||"whole") {
    window.GHData.state.map.active=kind;window.GHData.save();
    const title=kind==="whole"?"전체맵":"세부맵";
    const note=kind==="detail"?'<span class="desktop-move-hint">방향키로 이동</span><span class="touch-move-hint">오른쪽 아래 방향키를 눌러 이동</span>':"지도는 준비 중입니다.";
    return `<div class="game-screen map-screen"><div class="status-bar">${window.GHApp.statusMarkup()}</div>
      <header class="screen-heading"><h1>${title}</h1>${kind==="detail"?"<small>현재 세부맵</small>":"<small>마우스 휠로 확대·축소</small>"}</header>
      <main class="screen-scroll"><p class="hint map-page-hint">${note}</p>${renderBoard(kind)}</main>
      ${window.GHApp.navMarkup(kind==="whole"?"전체맵":"세부맵")}</div>`;
  }
  function showInteraction(index,board) {
    const state=window.GHData.state;const scene=board?.dataset.scene||state.map.detailScene||"room";const point=(scene==="room"?roomRed:outsideRed)[index];if(!point)return;
    state.map.lastClickedMarker={kind:"interaction",scene,index};window.GHData.save();board?.querySelectorAll(".map-point.was-clicked").forEach((node)=>node.classList.remove("was-clicked"));board?.querySelector(`[data-interaction-point="${index}"]`)?.classList.add("was-clicked");
    const stamp=board?.querySelector("[data-stamp]");const arrived=scene==="room"?state.map.roomArrivedPoint:state.map.detailArrivedPoint;
    if(arrived!==point.approachPoint||!stamp){window.GHApp.toast("조금 더 가까이 가보자");return;}
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
  function handleMapClick(target){if(target?.closest?.("[data-map-chat-overlay]")){setChatRevealed(true);}else{setChatRevealed(false);}}
  document.addEventListener("wheel",(event)=>{const board=event.target.closest?.('[data-map-board="whole"]');if(!board)return;event.preventDefault();const state=window.GHData.state;const current=Math.max(80,Math.min(400,Number(state.map.wholeZoom)||100));const next=Math.max(80,Math.min(400,current+(event.deltaY<0?10:-10)));if(next===current)return;state.map.wholeZoom=next;window.GHData.save();board.dataset.zoom=String(next);board.classList.toggle("zoomed-in",next>=150);const layer=board.querySelector(".map-layer");if(layer)layer.style.setProperty("--map-zoom",String(next/100));const value=board.parentElement.querySelector("[data-zoom-value]");if(value)value.textContent=`${next}%`;},{passive:false});
  const keyDirections={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  document.addEventListener("keydown",(event)=>{const direction=keyDirections[event.key];if(!direction||event.target.closest?.("input,textarea,select,[contenteditable=true]"))return;if(window.GHData.state.page!=="세부맵")return;event.preventDefault();beginDirection(direction);});
  document.addEventListener("keyup",(event)=>{const direction=keyDirections[event.key];if(direction)endDirection(direction);});
  document.addEventListener("pointerdown",(event)=>{const button=event.target.closest?.("[data-direction]");if(!button)return;event.preventDefault();button.setPointerCapture?.(event.pointerId);button.classList.add("pressed");beginDirection(button.dataset.direction);});
  document.addEventListener("pointerup",(event)=>{const button=event.target.closest?.("[data-direction]");if(button){button.classList.remove("pressed");endDirection(button.dataset.direction);}else endAllDirections();});
  document.addEventListener("pointercancel",endAllDirections);window.addEventListener("blur",endAllDirections);
  function showSchedule(){
    const days=["27","28","29","30",...Array.from({length:31},(_,i)=>String(i+1))];
    const cells=days.map((day,index)=>{const isCurrent=index>=4;const selected=isCurrent&&day==="25";return `<span class="schedule-day${isCurrent?"":" muted"}${selected?" selected":""}">${day}${selected?'<i class="schedule-event-dot"></i>':""}</span>`;}).join("");
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");
    window.GHApp.openDialog("일정표",`<div class="schedule-month"><button type="button" aria-label="이전 달" disabled>‹</button><strong>2026년 10월</strong><button type="button" aria-label="다음 달" disabled>›</button></div><div class="schedule-grid">${["일","월","화","수","목","금","토"].map((day)=>`<span class="weekday">${day}</span>`).join("")}${cells}</div><div class="schedule-date-label">10월 25일 일요일</div>${event?`<button type="button" class="schedule-event" data-schedule-event="${event.id}"><b>${escapeHtml(event.time)}</b><span><strong>${escapeHtml(event.title)}</strong><small>팀원 확인 · 눌러서 목록 보기</small></span></button>`:'<p class="hint">등록된 이벤트가 없어요.</p>'}`);
  }
  function showEventTeam(){
    const event=window.GHData.state.events.find((item)=>item.id==="demo-event");if(!event)return;
    const members=event.team.map((name)=>`<div class="team-member-row" data-team-member="${escapeHtml(name)}"><span>${escapeHtml(name)}</span>${name.startsWith("임시")?'<small class="hint">테스트 계정</small>':""}<button class="button-quiet team-eject-button" type="button" data-team-eject-toggle="${escapeHtml(name)}">방출</button></div>`).join("")||'<p class="hint">현재 팀원이 없어요.</p>';
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
  window.GHMaps={render,showInteraction,showEventTeam,showTeamLetter,showEjectLetter,changeScene,handleMapClick,wholePoints,detailBlue,detailRed,roomBlue,roomRed};
})();
