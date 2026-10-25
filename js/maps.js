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
    const state=window.GHData.state;const isWhole=kind==="whole";const points=isWhole?wholePoints:detailBlue;const active=Number(isWhole?state.map.wholePoint:state.map.detailPoint)||0;
    const marker=points[Math.min(active,points.length-1)];const name=state.character?.name||"내 캐릭터";const messages=state.areaMessages||[];
    const moveButtons=points.map((p,index)=>`<button class="map-point blue" type="button" data-map-point="${kind}" data-point-index="${index}" style="${coords(p)}" aria-label="${p.label}로 이동"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const redButtons=isWhole?"":detailRed.map((p,index)=>`<button class="map-point red" type="button" data-interaction-point="${index}" style="${coords(p)}" aria-label="${p.label} 설명 보기"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    return `<div class="map-board" data-map-board="${kind}" aria-label="${isWhole?"전체맵":"세부맵"} 임시 점 이동판">
      <span class="map-hint">지도 배경은 추후 설정</span><span class="map-location-label">${isWhole?"전체맵":"세부맵"}</span>
      ${moveButtons}${redButtons}${stampMarkup(marker,name)}${isWhole?"":renderSpeechBubbles(messages,marker)}
    </div>
    <div class="map-legend"><span><i class="legend-dot blue"></i>파란 점을 눌러 이동</span>${isWhole?"":"<span><i class=\"legend-dot red\"></i>빨간 점을 눌러 설명 확인</span>"}</div>`;
  }
  function render(kind=window.GHData.state.map.active||"whole") {
    window.GHData.state.map.active=kind;window.GHData.save();
    const title=kind==="whole"?"전체맵":"세부맵";
    const detailSpeech=kind==="detail"?`${renderSpeechHistory(window.GHData.state.areaMessages||[])}<section class="section-block"><h2>말하기</h2><form class="say-form" id="area-say-form"><input class="text-entry" name="message" maxlength="500" placeholder="이 세부맵에 있는 사람에게 말하기" required><button class="button-primary" type="submit">보내기</button></form></section>`:"";
    return `<div class="game-screen"><div class="status-bar">${window.GHApp.statusMarkup()}</div>
      <header class="screen-heading"><h1>${title}</h1>${kind==="detail"?"<small>현재 세부맵</small>":"<small>지도 배경 미정</small>"}</header>
      <main class="screen-scroll"><p class="hint map-page-hint">점 이동을 확인할 수 있도록 임시 점만 배치했어요. 지도 그림과 장소 정보는 비워뒀어요.</p>${renderBoard(kind)}${detailSpeech}</main>
      ${window.GHApp.navMarkup(kind==="whole"?"전체맵":"세부맵")}</div>`;
  }
  function move(kind,index,board) {
    const points=kind==="whole"?wholePoints:detailBlue;const point=points[index];if(!point)return;
    const state=window.GHData.state;const key=kind==="whole"?"wholePoint":"detailPoint";
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
      animateAlongRoute(stamp,board,routePoints,1120,()=>route.remove());
    }
  }
  function animateAlongRoute(stamp,board,routePoints,duration,onComplete=()=>{}){
    const previousFrame=activeMoves.get(stamp);if(previousFrame)globalThis.cancelAnimationFrame?.(previousFrame);
    const bounds=board.getBoundingClientRect();
    const pixelPoints=routePoints.map((point)=>({x:Number(point.x)*bounds.width/100,y:Number(point.y)*bounds.height/100}));
    const segments=[];let totalLength=0;
    for(let i=1;i<pixelPoints.length;i++){const from=pixelPoints[i-1],to=pixelPoints[i],length=Math.hypot(to.x-from.x,to.y-from.y);segments.push({from,to,length});totalLength+=length;}
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
    window.GHApp.openDialog("상호작용 지점",`<p>상호작용 지점 ${index+1}</p><p>물체와 설명은 맵이 정해진 뒤 추가할게요.</p>`);
  }
  window.GHMaps={render,move,showInteraction,wholePoints,detailBlue,detailRed};
})();
