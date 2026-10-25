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
    { label:"이동 지점 4", x:72, y:71 }
  ];
  const detailRed = [
    { label:"상호작용 지점 1", x:49, y:43 },
    { label:"상호작용 지점 2", x:52, y:63 },
    { label:"상호작용 지점 3", x:39, y:55 }
  ];
  const coords=(point)=>`left:${point.x}%;top:${point.y}%`;
  function stampMarkup(point, name, bubble="") {
    return `<div class="map-stamp" data-stamp style="${coords(point)}" data-name="${escapeHtml(name)}">${escapeHtml((name||"인장").slice(0,1))}</div>${bubble?`<div class="stamp-bubble" style="left:${point.x}%;top:${point.y-8}%">${escapeHtml(bubble)}</div>`:""}`;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function renderBoard(kind) {
    const state=window.GHData.state;const isWhole=kind==="whole";const points=isWhole?wholePoints:detailBlue;const active=Number(isWhole?state.map.wholePoint:state.map.detailPoint)||0;
    const marker=points[Math.min(active,points.length-1)];const name=state.character?.name||"내 캐릭터";const latest=isWhole?null:state.areaMessages[state.areaMessages.length-1];
    const moveButtons=points.map((p,index)=>`<button class="map-point blue" type="button" data-map-point="${kind}" data-point-index="${index}" style="${coords(p)}" aria-label="${p.label}로 이동"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    const redButtons=isWhole?"":detailRed.map((p,index)=>`<button class="map-point red" type="button" data-interaction-point="${index}" style="${coords(p)}" aria-label="${p.label} 설명 보기"><span class="map-dot"></span><span class="map-point-label">${p.label}</span></button>`).join("");
    return `<div class="map-board" data-map-board="${kind}" aria-label="${isWhole?"전체맵":"세부맵"} 임시 점 이동판">
      <span class="map-hint">지도 배경은 추후 설정</span><span class="map-location-label">${isWhole?"전체맵":"세부맵"}</span>
      ${moveButtons}${redButtons}${stampMarkup(marker,name,latest?.text||"")}
    </div>
    <div class="map-legend"><span><i class="legend-dot blue"></i>파란 점을 눌러 이동</span>${isWhole?"":"<span><i class=\"legend-dot red\"></i>빨간 점을 눌러 설명 확인</span>"}</div>`;
  }
  function render(kind=window.GHData.state.map.active||"whole") {
    window.GHData.state.map.active=kind;window.GHData.save();
    const title=kind==="whole"?"전체맵":"세부맵";
    const detailSpeech=kind==="detail"?`<section class="section-block"><h2>말하기</h2><form class="say-form" id="area-say-form"><input class="text-entry" name="message" maxlength="500" placeholder="이 세부맵에 있는 사람에게 말하기" required><button class="button-primary" type="submit">보내기</button></form></section>`:"";
    return `<div class="game-screen"><div class="status-bar">${window.GHApp.statusMarkup()}<span class="status-extra">학교</span></div>
      <header class="screen-heading"><h1>${title}</h1>${kind==="detail"?"<small>현재 세부맵</small>":"<small>지도 배경 미정</small>"}</header>
      <main class="screen-scroll"><p class="hint map-page-hint">점 이동을 확인할 수 있도록 임시 점만 배치했어요. 지도 그림과 장소 정보는 비워뒀어요.</p>${renderBoard(kind)}${detailSpeech}</main>
      ${window.GHApp.navMarkup(kind==="whole"?"전체맵":"세부맵")}</div>`;
  }
  function move(kind,index,board) {
    const points=kind==="whole"?wholePoints:detailBlue;const point=points[index];if(!point)return;
    const state=window.GHData.state;const key=kind==="whole"?"wholePoint":"detailPoint";state.map[key]=index;state.map.currentPoint=point.label;window.GHData.save();
    const stamp=board.querySelector("[data-stamp]");if(stamp){stamp.style.left=`${point.x}%`;stamp.style.top=`${point.y}%`;stamp.dataset.name=state.character?.name||"내 캐릭터";stamp.textContent=(state.character?.name||"내 캐릭터").slice(0,1);}
  }
  function showInteraction(index) {
    window.GHApp.openDialog("상호작용 지점",`<p>상호작용 지점 ${index+1}</p><p>물체와 설명은 맵이 정해진 뒤 추가할게요.</p>`);
  }
  window.GHMaps={render,move,showInteraction,wholePoints,detailBlue,detailRed};
})();
