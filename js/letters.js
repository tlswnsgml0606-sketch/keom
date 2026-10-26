(function () {
  "use strict";
  const esc=(value)=>String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function eventFor(letter){return window.GHData.state.events.find((item)=>item.id===letter.eventId);}
  function open(id){
    const state=window.GHData.state;const letter=state.letters.find((item)=>item.id===id);if(!letter)return;
    const event=eventFor(letter);const pending=letter.status==="pending";
    const actions=pending?`<div class="letter-response-actions"><button class="button-secondary" type="button" data-letter-reply="accept" data-letter-id="${esc(letter.id)}">수락</button><button class="button-secondary" type="button" data-letter-reply="reject" data-letter-id="${esc(letter.id)}">거절</button></div>`:`<p class="letter-result">${letter.status==="accepted"?"수락 답장을 보냈어요.":letter.status==="rejected"?"거절 답장을 보냈어요.":letter.decision==="accept"?"수락 답장을 보냈어요.":letter.decision==="reject"?"거절 답장을 보냈어요.":"보낸 편지"}</p>`;
    letter.read=true;window.GHData.save();
    window.GHApp.openDialog("편지",`<article class="letter-view"><div class="letter-date">${esc(letter.date||"2026-10-25")}</div><div class="letter-sender">보내는 사람　${esc(letter.from)}</div><div class="letter-recipient-line">받는 사람　${esc(letter.to)}</div><h3 class="letter-subject">${esc(letter.subject)}</h3><div class="letter-view-body">${esc(letter.body).replace(/\n/g,"<br>")}</div>${event?`<p class="hint">연결 일정: ${esc(event.title)} · ${esc(event.date)} ${esc(event.time)}</p>`:""}${actions}</article>`);
  }
  function composeResponse(id,decision){
    const state=window.GHData.state;const letter=state.letters.find((item)=>item.id===id);if(!letter||letter.status!=="pending")return;
    const event=eventFor(letter);const action=decision==="accept"?"수락":"거절";state.activeLetterId=id;state.activeLetterDecision=decision;
    window.GHApp.openDialog("답장 편지 쓰기",`<div class="team-letter-paper"><div class="letter-date">${esc(window.GHData.todayKey())}</div><p class="letter-sender">보내는 사람　${esc(state.character?.name||"내 캐릭터")}</p><p class="letter-line"><span>받는 사람</span><strong>${esc(letter.from)}</strong></p><p class="letter-subject">${esc(event?.title||"이벤트")} 팀 ${action}</p><textarea class="letter-body" data-letter-body maxlength="500" placeholder="편지지에 답장을 적어주세요."></textarea><div class="letter-limit">기본 500자 · 편지 세트 보유 시 1,000자 <span>0 / 500</span></div></div><div class="dialog-actions"><button class="button-quiet" type="button" data-letter-open="${esc(id)}">편지로 돌아가기</button><button class="button-primary" type="button" data-letter-send>편지 보내기</button></div>`);
  }
  function sendResponse(){
    const state=window.GHData.state;const letter=state.letters.find((item)=>item.id===state.activeLetterId);if(!letter||letter.status!=="pending")return false;
    const decision=state.activeLetterDecision;const action=decision==="accept"?"수락":"거절";const body=String(document.querySelector("[data-letter-body]")?.value||"").trim();const event=eventFor(letter);
    state.letters.unshift({id:`reply-${Date.now()}`,type:"team-response",from:state.character?.name||"내 캐릭터",to:letter.from,subject:`${event?.title||"이벤트"} 팀 ${action}`,body,decision,eventId:letter.eventId,status:"sent",date:window.GHData.todayKey(),createdAt:Date.now()});
    letter.status=decision==="accept"?"accepted":"rejected";
    if(decision==="accept"&&event&&!event.team.includes(state.character?.name))event.team.push(state.character?.name);
    if(event)window.GHSync.publish("event.team",event).catch(()=>{});
    window.GHData.addRecord("편지",`${letter.subject}에 ${action} 답장을 보냈어요.`);window.GHSync.publish("letter.response",{letterId:letter.id,decision,body,from:state.character?.name}).catch(()=>{});
    state.activeLetterId=null;state.activeLetterDecision=null;window.GHData.save();return true;
  }
  function sendTeamProposal(eventId,recipient,body){
    const state=window.GHData.state;const event=state.events.find((item)=>item.id===eventId);if(!event||!recipient.trim())return false;
    state.letters.unshift({id:`outgoing-${Date.now()}`,type:"team-proposal",from:state.character?.name||"내 캐릭터",to:recipient.trim(),subject:`${event.title} 팀 제의`,body:String(body||"").trim(),eventId,date:window.GHData.todayKey(),status:"sent",createdAt:Date.now()});
    window.GHData.addRecord("편지",`${recipient.trim()}에게 ${event.title} 팀 제의 편지를 보냈어요.`);window.GHSync.publish("letter.sent",state.letters[0]).catch(()=>{});window.GHData.save();return true;
  }
  function sendTeamEjection(eventId,recipient,body){
    const state=window.GHData.state;const event=state.events.find((item)=>item.id===eventId);if(!event||!event.team.includes(recipient))return false;
    state.letters.unshift({id:`ejection-${Date.now()}`,type:"team-ejection",from:state.character?.name||"내 캐릭터",to:recipient,subject:`${event.title} 팀 방출`,body:String(body||"").trim(),eventId,status:"sent",date:window.GHData.todayKey(),createdAt:Date.now()});
    event.team=event.team.filter((name)=>name!==recipient);window.GHData.addRecord("편지",`${recipient}에게 ${event.title} 팀 방출 편지를 보냈어요.`);window.GHSync.publish("event.team",event).catch(()=>{});window.GHSync.publish("letter.sent",state.letters[0]).catch(()=>{});window.GHData.save();return true;
  }
  window.GHLetters={open,composeResponse,sendResponse,sendTeamProposal,sendTeamEjection};
})();
