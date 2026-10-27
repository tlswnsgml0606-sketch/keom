(function () {
  "use strict";
  const stats = Object.entries(window.GHData.statEffects);
  const cropSources = new WeakMap();
  const statRows = () => stats.map(([name,effect]) => `<div class="stat-row">
    <span class="stat-name">${name}</span><span class="stat-effect">${effect}</span>
    <button class="step-button" type="button" data-stat-change="-1" data-stat="${name}" aria-label="${name} 1 감소">−</button>
    <b class="stat-value" data-stat-value="${name}">0</b>
    <button class="step-button" type="button" data-stat-change="1" data-stat="${name}" aria-label="${name} 1 증가">+</button>
  </div>`).join("");
  function formBody() {
    return `<section class="section-block"><h2>인장</h2><div class="portrait-row"><img class="portrait-preview" data-portrait src="" alt="선택한 인장" hidden><div class="portrait-preview default-portrait" data-default-portrait aria-label="기본 사진"><span class="default-avatar-head"></span><span class="default-avatar-body"></span></div><div class="portrait-controls"><div class="choice-row"><button class="button-quiet" type="button" data-upload>사진 추가</button><button class="button-quiet" type="button" data-use-default>기본 사진</button><button class="button-quiet" type="button" data-adjust-portrait hidden>사진 위치·크기 조정</button></div><span class="hint" data-photo-label>사진을 추가하거나 기본 사진을 선택해 주세요.</span><input type="file" accept="image/*" data-photo-input hidden></div></div></section>
      <section class="section-block"><h2>기본 정보</h2><div class="two-fields"><div class="field"><label for="character-name">이름</label><input id="character-name" name="name" required pattern="[가-힣A-Za-z]+( [가-힣A-Za-z]+)*" title="한글과 영어만 입력할 수 있어요." placeholder="이름 입력"><span class="hint">한글과 영어만 입력할 수 있어요.</span></div><div class="field"><label for="character-height">키 (cm)</label><input id="character-height" name="height" required inputmode="numeric" pattern="[0-9]+" title="숫자만 입력할 수 있어요." placeholder="키 입력"><span class="hint">숫자만 입력할 수 있어요.</span></div><div class="field"><label for="character-age">나이</label><input id="character-age" name="age" required inputmode="numeric" pattern="[0-9]+" title="숫자만 입력할 수 있어요." placeholder="나이 입력"><span class="hint">숫자만 입력할 수 있어요.</span></div></div></section>
      <input type="hidden" name="job" value="퇴치">
      <section class="section-block"><h2>무기 선택</h2><p class="hint">퇴치사 무기 중 하나를 선택해 주세요.</p><div class="choice-row"><button class="choice" type="button" data-weapon="검">검</button><button class="choice" type="button" data-weapon="총">총</button><button class="choice" type="button" data-weapon="부적과 붓">부적과 붓</button><button class="choice" type="button" data-weapon="격투가의 글러브">격투가의 글러브</button></div><input type="hidden" name="weapon"></section>
      <section class="section-block"><h2>스탯 분배</h2><p class="points-remaining">남은 포인트 <b data-points-left>10</b> / 10 <small class="stat-cap-note">스탯 최대 200</small></p><div class="stats-list">${statRows()}</div></section>
      <section class="section-block"><h2>자기소개</h2><div class="field"><textarea name="introduction" maxlength="500" placeholder="자기소개를 입력해 주세요."></textarea><span class="hint character-count"><span data-char-count>0</span> / 500자</span></div></section>
      <p class="form-error" data-form-error role="alert" hidden></p><button class="button-primary" type="submit">캐릭터 정보 저장</button>`;
  }
  function render() {
    return `<main class="game-screen setup-screen">
      <div class="brand"><span class="brand-seal">鬼</span><h1>귀령학교</h1><span class="brand-hanja">鬼靈學校</span></div>
      <div class="form-title"><h2>캐릭터 정보 입력</h2><p>캐릭터의 기본 정보를 작성해 주세요.</p></div>
      <div class="setup-form-scroll"><form id="character-form" class="character-form">${formBody()}</form></div>
    </main>`;
  }
  function getValues(form) {
    return Object.fromEntries(new FormData(form).entries());
  }
  function currentStats(form) {
    return Object.fromEntries(stats.map(([name]) => [name, Number(form.querySelector(`[data-stat-value="${name}"]`).textContent)]));
  }
  function updateStats(form) {
    const values=currentStats(form); const used=Object.values(values).reduce((sum,value)=>sum+value,0);
    form.querySelector("[data-points-left]").textContent=String(10-used);
    form.querySelectorAll('[data-stat-change="1"]').forEach((button)=>button.disabled=used>=10);
    form.querySelectorAll('[data-stat-change="-1"]').forEach((button)=>button.disabled=values[button.dataset.stat]===0);
  }
  async function compressImage(file) {
    const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=source;});
    const scale=Math.min(1,512/Math.max(image.width,image.height));const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/jpeg",.8);
  }
  async function handleClick(form,event) {
    const weaponButton=event.target.closest("[data-weapon]");
    if(weaponButton){form.querySelectorAll("[data-weapon]").forEach((button)=>button.setAttribute("aria-pressed",String(button===weaponButton)));form.elements.weapon.value=weaponButton.dataset.weapon;return;}
    const change=event.target.closest("[data-stat-change]");
    if(change){const value=form.querySelector(`[data-stat-value="${change.dataset.stat}"]`);const next=Number(value.textContent)+Number(change.dataset.statChange);if(next>=0&&Object.values(currentStats(form)).reduce((a,b)=>a+b,0)+Number(change.dataset.statChange)<=10)value.textContent=String(next);updateStats(form);return;}
    if(event.target.closest("[data-upload]")){form.querySelector("[data-photo-input]").click();return;}
    if(event.target.closest("[data-adjust-portrait]")||event.target.closest("[data-portrait]")){openCrop(form);return;}
    if(event.target.closest("[data-use-default]")){form.dataset.portrait="";form.dataset.portraitChosen="default";form.querySelector("[data-portrait]").hidden=true;form.querySelector("[data-default-portrait]").hidden=false;form.querySelector("[data-adjust-portrait]").hidden=true;cropSources.delete(form);form.querySelector("[data-photo-label]").textContent="기본 사진을 선택했어요.";}
  }
  async function handlePhoto(form,event) {
    const file=event.target.files?.[0];if(!file)return;
    if(!file.type.startsWith("image/")){return {error:"이미지 파일을 선택해 주세요."};}
    try {const data=await compressImage(file);const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=data;});cropSources.set(form,{image,zoom:1,x:0,y:0});form.dataset.portrait=data;form.dataset.portraitChosen="upload";const preview=form.querySelector("[data-portrait]");preview.src=data;preview.hidden=false;form.querySelector("[data-default-portrait]").hidden=true;form.querySelector("[data-adjust-portrait]").hidden=false;form.querySelector("[data-photo-label]").textContent=file.name;openCrop(form);return {ok:true};}
    catch(_error){return {error:"이미지를 읽지 못했어요. 다른 사진을 선택해 주세요."};}
  }
  function openCrop(form){
    const source=cropSources.get(form);if(!source)return;
    const html=`<div class="portrait-crop"><div class="portrait-crop-window"><img data-crop-preview src="${form.querySelector("[data-portrait]").src||source.image.src}" alt="인장 자르기 미리보기"></div><p class="hint">원형 안에 보이는 부분이 인장으로 저장돼요. 사진을 드래그하거나 위치를 조절해 주세요.</p><label>가로 위치 <input type="range" min="-50" max="50" value="${source.x}" data-crop-x></label><label>세로 위치 <input type="range" min="-50" max="50" value="${source.y}" data-crop-y></label><label>확대·축소 <input type="range" min="100" max="250" value="${Math.round(source.zoom*100)}" data-crop-zoom></label></div><div class="dialog-actions"><button class="button-quiet" type="button" data-dialog-close>취소</button><button class="button-primary" type="button" data-crop-save>인장 적용</button></div>`;
    window.GHApp.openDialog("인장 사진 조정",html);const dialog=document.getElementById("message-dialog");const preview=dialog.querySelector("[data-crop-preview]");preview.src=source.image.src;updateCropPreview(dialog,source);
    const windowNode=dialog.querySelector(".portrait-crop-window");let drag=null;
    windowNode.addEventListener("pointerdown",(event)=>{drag={x:event.clientX,y:event.clientY,sourceX:source.x,sourceY:source.y};windowNode.setPointerCapture(event.pointerId);});
    windowNode.addEventListener("pointermove",(event)=>{if(!drag)return;source.x=Math.max(-50,Math.min(50,drag.sourceX-(event.clientX-drag.x)/.7));source.y=Math.max(-50,Math.min(50,drag.sourceY-(event.clientY-drag.y)/.7));dialog.querySelector("[data-crop-x]").value=source.x;dialog.querySelector("[data-crop-y]").value=source.y;updateCropPreview(dialog,source);});
    windowNode.addEventListener("pointerup",()=>{drag=null;});windowNode.addEventListener("pointercancel",()=>{drag=null;});
  }
  function updateCropPreview(dialog,source){
    const image=dialog.querySelector("[data-crop-preview]");if(!image)return;
    const min=Math.min(source.image.naturalWidth,source.image.naturalHeight);const zoom=source.zoom;const width=220*source.image.naturalWidth/min*zoom;const height=220*source.image.naturalHeight/min*zoom;
    image.style.width=`${width}px`;image.style.height=`${height}px`;image.style.left=`calc(50% + ${source.x*.7}px)`;image.style.top=`calc(50% + ${source.y*.7}px)`;
  }
  function updateCropInput(target){
    const dialog=target.closest("#message-dialog");const form=document.getElementById("character-form");const source=form&&cropSources.get(form);if(!dialog||!source)return;
    if(target.matches("[data-crop-x]"))source.x=Number(target.value);
    if(target.matches("[data-crop-y]"))source.y=Number(target.value);
    if(target.matches("[data-crop-zoom]"))source.zoom=Number(target.value)/100;
    updateCropPreview(dialog,source);
  }
  function applyCrop(form){
    const source=cropSources.get(form);if(!source)return;
    const side=Math.min(source.image.naturalWidth,source.image.naturalHeight)/source.zoom;
    const cx=source.image.naturalWidth/2-(source.image.naturalWidth-side)*source.x/100;
    const cy=source.image.naturalHeight/2-(source.image.naturalHeight-side)*source.y/100;
    const sx=Math.max(0,Math.min(source.image.naturalWidth-side,cx-side/2));const sy=Math.max(0,Math.min(source.image.naturalHeight-side,cy-side/2));
    const canvas=document.createElement("canvas");canvas.width=256;canvas.height=256;canvas.getContext("2d").drawImage(source.image,sx,sy,side,side,0,0,256,256);
    const data=canvas.toDataURL("image/jpeg",.88);form.dataset.portrait=data;const preview=form.querySelector("[data-portrait]");preview.src=data;preview.hidden=false;form.querySelector("[data-default-portrait]").hidden=true;form.querySelector("[data-photo-label]").textContent="인장을 조정했어요. 사진을 눌러 다시 조정할 수 있어요.";
  }
  function validate(form) {
    if(!form.reportValidity())return {error:null};
    const values=getValues(form);
    if(!form.dataset.portraitChosen)return {error:"인장을 추가하거나 기본 사진을 선택해 주세요."};
    if(!/^[가-힣A-Za-z]+(?: [가-힣A-Za-z]+)*$/.test(values.name))return {error:"이름은 한글과 영어만 입력할 수 있어요."};
    if(!/^\d+$/.test(values.height)||!/^[0-9]+$/.test(values.age))return {error:"키와 나이는 숫자만 입력해 주세요."};
    if(!form.elements.job.value)form.elements.job.value="퇴치";
    if(!form.elements.weapon.value)return {error:"무기를 선택해 주세요."};
    const assigned=Object.values(currentStats(form)).reduce((a,b)=>a+b,0);
    if(assigned!==10)return {error:`스탯 포인트를 모두 분배해 주세요. (남은 포인트 ${10-assigned})`};
    return {ok:true, values, stats:currentStats(form), portrait:form.dataset.portrait||null};
  }
  window.GHCharacter = { render, handleClick, handlePhoto, validate, updateStats, resizeImage:compressImage, updateCropInput, applyCrop };
})();
