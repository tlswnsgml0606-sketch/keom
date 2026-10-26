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
    if(state.pendingAccount){app.innerHTML=`<div class="app-shell">${GHCharacter.render()}</div>`;return;}
    if(!state.account||state.sessionActive===false){app.innerHTML=`<div class="app-shell">${GHAuth.render()}</div>`;return;}
    if(!state.character){app.innerHTML=`<div class="app-shell">${GHCharacter.render()}</div>`;return;}
    GHData.ensureDemoData();
    const page=state.page||"전체맵";
    const content=page==="전체맵"?GHMaps.render("whole"):page==="세부맵"?GHMaps.render("detail"):page==="기록"?GHPages.renderRecords():page==="채팅"?GHPages.renderChat():page==="알림"?GHPages.renderAlerts():GHPages.renderAccount();
    app.innerHTML=`<div class="app-shell">${content}</div>`;
  }
  function toast(message){const old=document.querySelector(".toast");old?.remove();const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),2600);}
  function openDialog(title,html){const dialog=document.getElementById("message-dialog");if(dialog.open)dialog.close();document.getElementById("dialog-title").textContent=title;document.getElementById("dialog-body").innerHTML=html;dialog.showModal();}
  function showError(form,message){const el=form.querySelector("[data-form-error]");if(!el)return;el.textContent=message||"";el.hidden=!message;}
  function setPage(page){GHData.state.page=page;if(page==="전체맵")GHData.state.map.active="whole";if(page==="세부맵")GHData.state.map.active="detail";GHData.save();render();}
  function addAreaMessage(form){
    const text=String(new FormData(form).get("message")||"").trim();if(!text)return;
    const state=GHData.state;const names=[state.demoAccount.name,state.demoAccount2.name];const mentioned=names.sort((a,b)=>b.length-a.length).find((name)=>text.startsWith("@"+name)&&(text.length===name.length+1||/\s/.test(text[name.length+1])));const mention=mentioned?{name:mentioned,text:text.slice(mentioned.length+1).trim()}:null;
    if(mention){
      const recipient=mention.name;
      const whisper={id:`whisper-${Date.now()}`,with:recipient,author:state.character.name,text:mention.text||text,mine:true,createdAt:Date.now()};
      state.whisperMessages.push(whisper);state.conversations["귓속말"]??=[];state.conversations["귓속말"].push(whisper);
      GHSync.publish("chat.whisper",whisper).catch(()=>{});
      GHData.addAlert("채팅","새 귓속말",`${recipient}에게 귓속말을 보냈어요.`,{contact:recipient});GHData.addRecord("귓속말",`${state.character.name} → ${recipient}: ${whisper.text}`);
      GHData.save();render();toast(`${recipient}에게만 보이는 귓속말을 보냈어요.`);return;
    }
    const record={id:Date.now()+Math.random(),name:state.character.name,mine:true,text,date:GHData.todayKey(),createdAt:Date.now(),scene:state.map.detailScene};state.areaMessages.push(record);GHSync.publish("map.speech",record).catch(()=>{});GHData.addRecord("말하기",`${record.name}: ${text}`,record.date);render();document.querySelector("[data-area-chat-input]")?.focus();
  }
  async function makeFullbody(form,input){
    const file=input.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){toast("이미지 파일을 선택해 주세요.");return;}
    try{
      const result=await GHCharacter.resizeImage(file);GHData.state.character.fullbodyImage=result;GHData.save();GHSync.publish("account.profile",{name:GHData.state.character.name,fullbodyImage:result,portrait:GHData.state.character.portrait,introduction:GHData.state.character.introduction}).catch(()=>{});render();toast("전신 이미지를 저장했어요.");
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
    const zoom=event.target.closest("[data-map-zoom]");if(zoom){GHData.state.map.wholeZoom=Math.max(100,Math.min(400,(Number(GHData.state.map.wholeZoom)||100)+Number(zoom.dataset.mapZoom)));GHData.save();render();return;}
    const board=event.target.closest("[data-map-board]");const mapPoint=event.target.closest("[data-map-point]");
    if(mapPoint&&board){GHMaps.move(mapPoint.dataset.mapPoint,Number(mapPoint.dataset.pointIndex),board);return;}
    const redPoint=event.target.closest("[data-interaction-point]");if(redPoint){GHMaps.showInteraction(Number(redPoint.dataset.interactionPoint),redPoint.closest("[data-map-board]"));return;}
    if(event.target.closest("[data-dialog-close]")){document.getElementById("message-dialog").close();return;}
    if(event.target.closest("[data-schedule-event]")){GHMaps.showEventTeam();return;}
    if(event.target.closest("[data-team-add]")){GHMaps.showTeamLetter();return;}
    if(event.target.closest("[data-team-back]")){GHMaps.showEventTeam();return;}
    if(event.target.closest("[data-sleep-confirm]")){const minutes=Number(document.querySelector("[data-sleep-minutes]")?.value||60);GHData.startSleep(minutes);GHSync.publish("status.update",GHData.state.status).catch(()=>{});document.getElementById("message-dialog").close();render();toast(`${minutes}분 동안 잠들었어요. 지정 시간이 지나면 깨어나요.`);return;}
    const reply=event.target.closest("[data-letter-reply]");if(reply){GHLetters.composeResponse(reply.dataset.letterId,reply.dataset.letterReply);return;}
    const letterBack=event.target.closest("[data-letter-open]");if(letterBack){GHLetters.open(letterBack.dataset.letterOpen);return;}
    if(event.target.closest("[data-letter-send]")){if(GHLetters.sendResponse()){document.getElementById("message-dialog").close();render();toast("답장 편지를 보냈어요.");}return;}
    if(event.target.closest("[data-team-letter-send]")){const body=document.querySelector("#message-dialog .letter-body")?.value||"";const recipient=document.querySelector("#message-dialog .letter-recipient")?.value||"";if(GHLetters.sendTeamProposal("demo-event",recipient,body)){document.getElementById("message-dialog").close();render();toast("팀 제의 편지를 보냈어요.");}else toast("받는 사람을 입력해 주세요.");return;}
    if(event.target.closest("[data-team-eject-toggle]")){GHMaps.showEjectLetter(event.target.closest("[data-team-eject-toggle]").dataset.teamEjectToggle);return;}
    if(event.target.closest("[data-team-eject-send]")){const name=event.target.closest("[data-team-eject-send]").dataset.teamEjectSend;const body=document.querySelector("#message-dialog .letter-body")?.value||"";if(GHLetters.sendTeamEjection("demo-event",name,body)){document.getElementById("message-dialog").close();render();toast(`${name}에게 팀 방출 편지를 보냈어요.`);}return;}
    const jobButton=event.target.closest("[data-job]");if(jobButton){const form=event.target.closest("form");if(form)GHCharacter.handleClick(form,event);return;}
    if(event.target.closest("[data-stat-change],[data-weapon],[data-upload],[data-use-default]")){const form=event.target.closest("form");if(form)GHCharacter.handleClick(form,event);return;}
    const filter=event.target.closest("[data-chat-filter]");if(filter){GHData.state.chatFilter=filter.dataset.chatFilter;GHData.save();render();return;}
    const contact=event.target.closest("[data-chat-contact]");if(contact){GHData.state.selectedChat=contact.dataset.chatContact;GHData.save();render();return;}
    const mentionButton=event.target.closest("[data-mention-name]");if(mentionButton){const input=mentionButton.closest("form")?.querySelector("[data-area-chat-input]");if(input){input.value="@"+mentionButton.dataset.mentionName+" ";input.focus();}const menu=mentionButton.closest("[data-mention-suggestions]");if(menu)menu.hidden=true;return;}
    const alertFilter=event.target.closest("[data-alert-filter]");if(alertFilter){GHData.state.alertFilter=alertFilter.dataset.alertFilter;GHData.save();render();return;}
    const alertLine=event.target.closest("[data-alert-id]");if(alertLine){const item=GHData.state.alerts.find((a)=>String(a.id)===alertLine.dataset.alertId);if(item){item.read=true;GHData.save();if(item.letterId)GHLetters.open(item.letterId);else openDialog(item.title,`<p>${escapeHtml(item.text)}</p>`);render();}return;}
    if(event.target.closest("[data-generate-code]")){
      if(GHData.state.inviteCodes.length>=5){toast("입학 추천서는 최대 5개까지 만들 수 있어요.");return;}
      const code=GHData.generateCode();GHData.state.inviteCodes.push(code);GHData.save();render();toast("추천 코드가 생성됐어요.");return;
    }
    const copy=event.target.closest("[data-copy-code]");if(copy){navigator.clipboard?.writeText(copy.dataset.copyCode).then(()=>toast("코드를 복사했어요.")).catch(()=>toast(`코드: ${copy.dataset.copyCode}`));return;}
    if(event.target.closest("[data-account-settings]")){openDialog("내 계정",`<p>아이디: ${escapeHtml(GHData.state.account.username)}</p><p class="hint">계정 보안 설정은 서버 연결 단계에서 추가할 수 있어요.</p>`);return;}
    if(event.target.closest("[data-chat-search]")){
      const area=document.querySelector(".screen-scroll");if(!area)return;
      const existing=area.querySelector("[data-chat-search-panel]");if(existing){existing.remove();return;}
      const panel=document.createElement("div");panel.className="chat-search-panel";panel.dataset.chatSearchPanel="";
      panel.innerHTML='<label class="hint" for="chat-search-input">계정 이름 또는 채팅 내용 검색</label><input class="search-box" id="chat-search-input" data-chat-search-field placeholder="임시, 메시지 내용 등 검색"><div class="chat-search-results" data-chat-search-results></div>';
      area.prepend(panel);panel.querySelector("input").focus();return;
    }
    const profile=event.target.closest("[data-profile-name]");if(profile){const name=profile.dataset.profileName;openDialog(`${name} 프로필`,`<p>${escapeHtml(name)}</p><p class="hint">${name.startsWith("임시")?"채팅 확인용 시범 계정이에요.":"캐릭터 프로필 정보"}</p>`);return;}
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function handleSubmit(event){
    const form=event.target;
    if(form.id==="chat-form"){event.preventDefault();const text=String(new FormData(form).get("message")||"").trim();if(!text)return;const state=GHData.state;const category=state.chatFilter||"대화";const recipient=state.selectedChat||"임시";const item={id:`player-${Date.now()}`,with:recipient,author:state.character.name,text,mine:true,createdAt:Date.now(),category};(state.conversations[category]??=[]).push(item);GHSync.publish("chat.message",item).catch(()=>{});GHData.addRecord(category,`${state.character.name} → ${recipient}: ${text}`);GHData.save();render();return;}
    if(form.id==="signup-form"){
      event.preventDefault();GHAuth.submit(form).then((result)=>{if(result.error){showError(form,result.error);return;}GHData.state.page=result.login?(GHData.state.character?GHData.state.page||"전체맵":"캐릭터 설정"):"캐릭터 설정";GHData.save();render();}).catch((error)=>showError(form,error.message||"로그인 정보를 확인해 주세요."));return;
    }
    if(form.id==="login-form"){
      event.preventDefault();GHAuth.submit(form).then((result)=>{if(result.error){showError(form,result.error);return;}GHData.state.page=GHData.state.character?(GHData.state.page||"전체맵"):"캐릭터 설정";GHData.save();render();}).catch((error)=>showError(form,error.message||"로그인 정보를 확인해 주세요."));return;
    }
    if(form.id==="character-form"){
      event.preventDefault();const result=GHCharacter.validate(form);if(!result.ok){if(result.error!==null)showError(form,result.error);return;}
      const v=result.values;
      const finalized=GHAuth.finalizeSignup(v.name.trim());
      if(finalized?.error){showError(form,finalized.error);return;}
      GHData.state.character={name:v.name.trim(),height:v.height.trim(),age:v.age.trim(),job:"퇴치",weapon:v.weapon,stats:result.stats,introduction:v.introduction.trim(),portrait:result.portrait,fullbodyImage:null};
      GHData.state.page="전체맵";GHData.save();GHSync.publish("character.created",GHData.state.character).catch(()=>{});render();return;
    }
    if(form.id==="area-say-form"){event.preventDefault();addAreaMessage(form);return;}
  }
  let accountSearchTimer=null;
  function handleInput(event){
    if(event.target.matches(".letter-body")){const counter=event.target.closest(".team-letter-paper")?.querySelector(".letter-limit span");if(counter)counter.textContent=`${event.target.value.length} / 500`;}
    if(event.target.id==="record-search"){
      const query=event.target.value.trim().toLocaleLowerCase();let total=0;document.querySelectorAll("#record-list .record-group").forEach((group)=>{const dateMatch=group.dataset.recordDate.toLocaleLowerCase().includes(query);let shown=0;group.querySelectorAll(".record-line").forEach((line)=>{const match=!query||dateMatch||line.textContent.toLocaleLowerCase().includes(query);line.hidden=!match;if(match)shown++;});group.hidden=shown===0;if(!group.hidden)total+=shown;});const empty=document.querySelector("[data-record-empty]");if(empty)empty.hidden=total>0||!query;
    }
    if(event.target.matches("[data-chat-search-field]")){
      const query=event.target.value.trim().toLocaleLowerCase();const state=GHData.state;const accounts=[state.demoAccount,state.demoAccount2,...(state.remoteAccounts||[])].filter((item,index,list)=>item.name.toLocaleLowerCase().includes(query)&&list.findIndex((other)=>other.name.toLocaleLowerCase()===item.name.toLocaleLowerCase())===index);
      clearTimeout(accountSearchTimer);if(GHSync.connected&&query)accountSearchTimer=setTimeout(()=>GHSync.publish("account.search",{query}).catch(()=>{}),220);
      const matching=[];for(const [category,items] of Object.entries(state.conversations)){for(const item of items){if(!query||String(item.text).toLocaleLowerCase().includes(query))matching.push({category,...item});}}
      const results=document.querySelector("[data-chat-search-results]");if(results){const accountRows=accounts.map((item)=>`<button type="button" class="search-result" data-chat-contact="${escapeHtml(item.name)}"><span class="avatar">${escapeHtml(item.portrait)}</span><span><strong>${escapeHtml(item.name)}</strong><small>계정</small></span></button>`).join("");const messageRows=matching.slice(0,12).map((item)=>`<button type="button" class="search-result" data-search-chat-contact="${escapeHtml(item.with)}" data-search-chat-category="${escapeHtml(item.category)}"><span><strong>${escapeHtml(item.with)} · ${escapeHtml(item.category)}</strong><small>${escapeHtml(item.text)}</small></span></button>`).join("");results.innerHTML=`${accountRows?'<div class="search-result-heading">계정</div>'+accountRows:""}${messageRows?'<div class="search-result-heading">채팅 내역</div>'+messageRows:""}${!accountRows&&!messageRows?'<p class="hint">검색 결과가 없어요.</p>':""}`;results.hidden=!query;}
    }
    if(event.target.matches("[data-area-chat-input]")){
      const match=event.target.value.match(/@([^@\s]*)$/);const menu=event.target.closest("form")?.querySelector("[data-mention-suggestions]");if(menu){if(!match){menu.hidden=true;menu.innerHTML="";}else{const query=match[1].toLocaleLowerCase();const users=[GHData.state.demoAccount,GHData.state.demoAccount2].filter((item)=>item.name.toLocaleLowerCase().includes(query));menu.innerHTML=users.map((item)=>`<button type="button" data-mention-name="${escapeHtml(item.name)}"><span class="avatar">${escapeHtml(item.portrait)}</span><strong>${escapeHtml(item.name)}</strong></button>`).join("");menu.hidden=users.length===0;}}
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
  app.addEventListener("click",(event)=>{const result=event.target.closest("[data-search-chat-contact]");if(!result)return;GHData.state.selectedChat=result.dataset.searchChatContact;GHData.state.chatFilter=result.dataset.searchChatCategory;GHData.save();render();});
  let longPressTimer=null;let longPressTarget=null;
  app.addEventListener("pointerdown",(event)=>{const row=event.target.closest("[data-team-member]");if(!row)return;longPressTarget=row;longPressTimer=setTimeout(()=>{row.querySelector("[data-team-eject-toggle]")?.removeAttribute("hidden");row.classList.add("eject-available");},650);});
  const cancelLongPress=()=>{clearTimeout(longPressTimer);longPressTimer=null;longPressTarget=null;};
  app.addEventListener("pointerup",cancelLongPress);app.addEventListener("pointercancel",cancelLongPress);app.addEventListener("pointerleave",cancelLongPress);
  document.getElementById("message-dialog").addEventListener("pointerdown",(event)=>{const row=event.target.closest("[data-team-member]");if(!row)return;longPressTarget=row;longPressTimer=setTimeout(()=>{row.querySelector("[data-team-eject-toggle]")?.removeAttribute("hidden");row.classList.add("eject-available");},650);});
  const cancelDialogPress=()=>{clearTimeout(longPressTimer);longPressTimer=null;longPressTarget=null;};
  document.getElementById("message-dialog").addEventListener("pointerup",cancelDialogPress);document.getElementById("message-dialog").addEventListener("pointercancel",cancelDialogPress);
  GHSync.subscribe("map.position",(presence)=>{if(!presence?.name||presence.name===GHData.state.character?.name)return;const state=GHData.state;state.remotePresence??=[];state.remotePresence=state.remotePresence.filter((item)=>item.name!==presence.name);state.remotePresence.push({...presence,arrivedAt:Date.now()});GHData.save();if(["전체맵","세부맵"].includes(state.page))render();});
  GHSync.subscribe("map.speech",(message)=>{if(!message?.text||message.name===GHData.state.character?.name)return;const state=GHData.state;state.areaMessages.push({...message,mine:false,createdAt:Date.now()});GHData.addRecord("말하기",`${message.name}: ${message.text}`);if(state.page==="세부맵"&&state.map.detailScene===message.scene)render();});
  GHSync.subscribe("chat.message",(message)=>{if(!message?.with||!message?.text)return;const state=GHData.state;const category=message.category||"대화";state.conversations[category]??=[];state.conversations[category].push({...message,mine:false});GHData.addRecord(category,`${message.author}: ${message.text}`);GHData.addAlert("채팅","새 채팅",`${message.author} 님이 메시지를 보냈어요.`,{contact:message.author});if(state.page==="채팅")render();});
  GHSync.subscribe("chat.whisper",(message)=>{if(!message?.with||!message?.text||message.with!==GHData.state.character?.name)return;const state=GHData.state;state.conversations["귓속말"]??=[];state.conversations["귓속말"].push({...message,mine:false});GHData.addRecord("귓속말",`${message.author}: ${message.text}`);GHData.addAlert("채팅","새 귓속말",`${message.author} 님이 귓속말을 보냈어요.`,{contact:message.author});if(state.page==="채팅")render();});
  GHSync.subscribe("letter.sent",(letter)=>{if(!letter?.to||letter.to!==GHData.state.character?.name)return;const state=GHData.state;state.letters.unshift({...letter,read:false});GHData.addAlert("편지",letter.subject,`${letter.from} 님이 편지를 보냈어요.`,{letterId:letter.id});if(state.page==="알림")render();});
  GHSync.subscribe("letter.response",(reply)=>{if(!reply?.letterId)return;const state=GHData.state;const original=state.letters.find((item)=>item.id===reply.letterId);if(!original)return;original.status=reply.decision==="accept"?"accepted":"rejected";const event=state.events.find((item)=>item.id===original.eventId);const action=reply.decision==="accept"?"수락":"거절";const response={id:`received-reply-${Date.now()}`,type:"team-response",from:reply.from,to:state.character?.name,subject:`${event?.title||"이벤트"} 팀 ${action}`,body:reply.body||"",decision:reply.decision,eventId:original.eventId,status:"received",date:GHData.todayKey(),createdAt:Date.now()};state.letters.unshift(response);GHData.addAlert("편지",response.subject,`${reply.from} 님이 ${action} 답장을 보냈어요.`,{letterId:response.id});GHData.addRecord("편지",`${reply.from} 님이 ${original.subject}에 ${action}했어요.`);render();});
  GHSync.subscribe("event.team",(event)=>{if(!event?.id)return;const state=GHData.state;const index=state.events.findIndex((item)=>item.id===event.id);if(index<0)state.events.push(event);else state.events[index]=event;GHData.save();});
  GHSync.subscribe("event.schedule",(event)=>{if(!event?.id)return;const state=GHData.state;const index=state.events.findIndex((item)=>item.id===event.id);if(index<0)state.events.push(event);else state.events[index]=event;GHData.save();if(state.page==="전체맵"||state.page==="세부맵")render();});
  GHSync.subscribe("event.result",(result)=>{if(!result?.eventId)return;const state=GHData.state;const event=state.events.find((item)=>item.id===result.eventId);if(event)state.pastEvents.unshift(result.title||event.title);GHData.addRecord("이벤트",result.summary||`${result.title||event?.title||"이벤트"} 결과가 기록됐어요.`);if(state.page==="계정")render();});
  GHSync.subscribe("status.update",(status)=>{const state=GHData.state;if(!status||typeof status!=="object")return;for(const key of ["fatigue","life","mental"])if(Number.isFinite(Number(status[key])))state.status[key]=Number(status[key]);if("sleepStartedAt"in status)state.status.sleepStartedAt=status.sleepStartedAt;if("sleepWakeAt"in status)state.status.sleepWakeAt=status.sleepWakeAt;GHData.save();app.querySelectorAll(".status-bar").forEach((bar)=>{bar.innerHTML=statusMarkup();});});
  GHSync.subscribe("record.append",(record)=>{if(!record?.text||GHData.state.records.some((item)=>item.id===record.id))return;GHData.state.records.push(record);GHData.save();if(GHData.state.page==="기록")render();});
  GHSync.subscribe("inventory.update",(inventory)=>{if(!Array.isArray(inventory?.items))return;GHData.state.inventory=inventory.items;GHData.state.currency=Number(inventory.currency)||0;GHData.save();});
  GHSync.subscribe("invite.issued",(code)=>{if(!/^[A-Za-z]{7}$/.test(String(code?.code||"")))return;const state=GHData.state;if(!state.inviteCodes.includes(code.code)&&state.inviteCodes.length<5)state.inviteCodes.push(code.code);GHData.save();if(state.page==="계정")render();});
  GHSync.subscribe("account.search.results",(payload)=>{if(!payload||!Array.isArray(payload.accounts))return;const input=document.querySelector("[data-chat-search-field]");if(!input||input.value.trim().toLocaleLowerCase()!==String(payload.query||"").toLocaleLowerCase())return;GHData.state.remoteAccounts=payload.accounts.filter((item)=>item?.name&&typeof item.name==="string");handleInput({target:input});});
  window.GHApp={render,statusMarkup,navMarkup,openDialog,toast};
  render();
  setInterval(()=>{const sleeping=Boolean(GHData.state.status.sleepStartedAt);const changed=GHData.applySleepRecovery();if(sleeping&&!GHData.state.status.sleepStartedAt){GHSync.publish("status.update",GHData.state.status).catch(()=>{});render();toast("지정한 수면 시간이 끝나 깨어났어요.");return;}if(changed){GHSync.publish("status.update",GHData.state.status).catch(()=>{});app.querySelectorAll(".status-bar").forEach((bar)=>{bar.innerHTML=statusMarkup();});}},10000);
})();
