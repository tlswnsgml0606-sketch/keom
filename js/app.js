(function () {
  "use strict";
  const app=document.getElementById("app");
  const navItems=[["전체맵","⌖"],["세부맵","⌂"],["기록","≡"],["채팅","▤"],["알림","◉"],["계정","○"]];
  function statusMarkup(){const status=GHData.state.status;return `<span>피로 ${Number(status.fatigue)||0}/100</span><span>생명 ${Number(status.life)||0}/100</span><span>정신력 ${Number(status.mental)||0}/400</span>`;}
  function navMarkup(active){
    return `<nav class="bottom-nav" aria-label="주 메뉴">${navItems.map(([label,glyph])=>`<button class="nav-button" type="button" data-page="${label}" aria-current="${active===label?"page":"false"}"><span class="nav-icon">${glyph}${label==="알림"&&GHData.unreadCount()?`<i class="nav-badge">${GHData.unreadCount()}</i>`:""}</span>${label}</button>`).join("")}</nav>`;
  }
  function render(){
    const state=GHData.state;
    if(!state.account||state.sessionActive===false){app.innerHTML=`<div class="app-shell">${GHAuth.render()}</div>`;return;}
    if(!state.character){app.innerHTML=`<div class="app-shell">${GHCharacter.render()}</div>`;return;}
    const page=state.page||"전체맵";
    const content=page==="전체맵"?GHMaps.render("whole"):page==="세부맵"?GHMaps.render("detail"):page==="기록"?GHPages.renderRecords():page==="채팅"?GHPages.renderChat():page==="알림"?GHPages.renderAlerts():GHPages.renderAccount();
    app.innerHTML=`<div class="app-shell">${content}</div>`;
  }
  function toast(message){const old=document.querySelector(".toast");old?.remove();const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),2600);}
  function openDialog(title,html){const dialog=document.getElementById("message-dialog");document.getElementById("dialog-title").textContent=title;document.getElementById("dialog-body").innerHTML=html;dialog.showModal();}
  function showError(form,message){const el=form.querySelector("[data-form-error]");if(!el)return;el.textContent=message||"";el.hidden=!message;}
  function setPage(page){GHData.state.page=page;if(page==="전체맵")GHData.state.map.active="whole";if(page==="세부맵")GHData.state.map.active="detail";GHData.save();render();}
  function addAreaMessage(form){const text=String(new FormData(form).get("message")||"").trim();if(!text)return;const state=GHData.state;const record={id:Date.now()+Math.random(),name:state.character.name,mine:true,text,date:GHData.todayKey(),createdAt:Date.now()};state.areaMessages.push(record);GHData.addRecord("말하기",`${record.name}: ${text}`,record.date);render();const history=document.querySelector("[data-speech-history]");if(history)history.scrollTop=history.scrollHeight;document.querySelector('#area-say-form [name="message"]')?.focus();}
  async function makeFullbody(form,input){
    const file=input.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){toast("이미지 파일을 선택해 주세요.");return;}
    try{
      const result=await GHCharacter.resizeImage(file);GHData.state.character.fullbodyImage=result;GHData.save();render();toast("전신 이미지를 저장했어요.");
    }catch(_error){toast("이미지를 불러오지 못했어요.");}
  }
  function handleClick(event){
    const authMode=event.target.closest("[data-auth-mode]");if(authMode){GHData.state.authMode=authMode.dataset.authMode;GHData.save();render();return;}
    if(event.target.closest("[data-logout]")){GHData.state.sessionActive=false;GHData.state.authMode="login";GHData.save();render();return;}
    if(event.target.closest("[data-withdraw]")){
      openDialog("정말 탈퇴할까요?",'<p class="withdraw-note">(탈퇴시 데이터가 모두 삭제되고, 동일 기기로 가입이 7일동안 제한돼요.)</p><div class="dialog-actions"><button class="button-quiet" type="submit">취소</button><button class="button-primary danger-action" type="button" data-withdraw-confirm>탈퇴</button></div>');return;
    }
    if(event.target.closest("[data-withdraw-confirm]")){GHAuth.rememberWithdrawal();GHAuth.startCooldown();GHData.clear();document.getElementById("message-dialog").close();render();return;}
    const pageButton=event.target.closest("[data-page]");if(pageButton){setPage(pageButton.dataset.page);return;}
    const board=event.target.closest("[data-map-board]");const mapPoint=event.target.closest("[data-map-point]");
    if(mapPoint&&board){GHMaps.move(mapPoint.dataset.mapPoint,Number(mapPoint.dataset.pointIndex),board);return;}
    const redPoint=event.target.closest("[data-interaction-point]");if(redPoint){GHMaps.showInteraction(Number(redPoint.dataset.interactionPoint));return;}
    const jobButton=event.target.closest("[data-job]");if(jobButton){const form=event.target.closest("form");if(form)GHCharacter.handleClick(form,event);return;}
    if(event.target.closest("[data-stat-change],[data-weapon],[data-upload],[data-use-default]")){const form=event.target.closest("form");if(form)GHCharacter.handleClick(form,event);return;}
    const filter=event.target.closest("[data-chat-filter]");if(filter){GHData.state.chatFilter=filter.dataset.chatFilter;GHData.save();render();return;}
    const alertFilter=event.target.closest("[data-alert-filter]");if(alertFilter){GHData.state.alertFilter=alertFilter.dataset.alertFilter;GHData.save();render();return;}
    const alertLine=event.target.closest("[data-alert-id]");if(alertLine){const item=GHData.state.alerts.find((a)=>String(a.id)===alertLine.dataset.alertId);if(item){item.read=true;GHData.save();openDialog(item.title,`<p>${escapeHtml(item.text)}</p>`);render();}return;}
    if(event.target.closest("[data-generate-code]")){
      if(GHData.state.inviteCodes.length>=5){toast("입학 추천서는 최대 5개까지 만들 수 있어요.");return;}
      const code=GHData.generateCode();GHData.state.inviteCodes.push(code);GHData.save();render();toast("추천 코드가 생성됐어요.");return;
    }
    const copy=event.target.closest("[data-copy-code]");if(copy){navigator.clipboard?.writeText(copy.dataset.copyCode).then(()=>toast("코드를 복사했어요.")).catch(()=>toast(`코드: ${copy.dataset.copyCode}`));return;}
    if(event.target.closest("[data-account-settings]")){openDialog("내 계정",`<p>아이디: ${escapeHtml(GHData.state.account.username)}</p><p class="hint">계정 보안 설정은 서버 연결 단계에서 추가할 수 있어요.</p>`);return;}
    if(event.target.closest("[data-chat-search]")){
      const area=document.querySelector(".screen-scroll");if(!area)return;
      const existing=area.querySelector("[data-chat-search-field]");if(existing){existing.remove();return;}
      const input=document.createElement("input");input.className="search-box";input.dataset.chatSearchField="";input.placeholder="대화 상대 또는 채팅 검색";input.style.margin="0 0 12px";area.prepend(input);input.focus();return;
    }
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function handleSubmit(event){
    const form=event.target;
    if(form.id==="signup-form"){
      event.preventDefault();GHAuth.submit(form).then((result)=>{if(result.error){showError(form,result.error);return;}GHData.state.page=result.login?(GHData.state.character?GHData.state.page||"전체맵":"캐릭터 설정"):"캐릭터 설정";GHData.save();render();}).catch((error)=>showError(form,error.message||"로그인 정보를 확인해 주세요."));return;
    }
    if(form.id==="login-form"){
      event.preventDefault();GHAuth.submit(form).then((result)=>{if(result.error){showError(form,result.error);return;}GHData.state.page=GHData.state.character?(GHData.state.page||"전체맵"):"캐릭터 설정";GHData.save();render();}).catch((error)=>showError(form,error.message||"로그인 정보를 확인해 주세요."));return;
    }
    if(form.id==="character-form"){
      event.preventDefault();const result=GHCharacter.validate(form);if(!result.ok){if(result.error!==null)showError(form,result.error);return;}
      const v=result.values;GHData.state.character={name:v.name.trim(),height:v.height.trim(),age:v.age.trim(),job:v.job,weapon:v.weapon,stats:result.stats,introduction:v.introduction.trim(),portrait:result.portrait,fullbodyImage:null};GHData.state.page="전체맵";GHData.save();render();return;
    }
    if(form.id==="area-say-form"){event.preventDefault();addAreaMessage(form);return;}
  }
  function handleInput(event){
    if(event.target.id==="record-search"){
      const query=event.target.value.trim().toLocaleLowerCase();document.querySelectorAll("#record-list .record-group").forEach((group)=>{let shown=0;group.querySelectorAll(".record-line").forEach((line)=>{const match=line.textContent.toLocaleLowerCase().includes(query);line.hidden=!match;if(match)shown++;});group.hidden=shown===0;});
    }
  }
  function handleChange(event){
    if(event.target.matches("[data-photo-input]")){const form=event.target.closest("form");if(form)GHCharacter.handlePhoto(form,event).then((result)=>{if(result?.error)toast(result.error);});}
    if(event.target.matches("[data-fullbody-input]"))makeFullbody(event.target.closest("form"),event.target);
  }
  app.addEventListener("click",handleClick);
  document.getElementById("message-dialog").addEventListener("click",handleClick);
  app.addEventListener("submit",handleSubmit);
  app.addEventListener("input",handleInput);
  app.addEventListener("change",handleChange);
  window.GHApp={render,statusMarkup,navMarkup,openDialog,toast};
  render();
})();
