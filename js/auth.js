(function () {
  "use strict";
  const LOCK_KEY = "gwiryeonghakyo.signup-lock.v1";
  const WITHDRAWN_KEY = "gwiryeonghakyo.withdrawn-credentials.v1";
  const DAY = 24 * 60 * 60 * 1000;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function hashPassword(password, salt) {
    if (!globalThis.crypto?.subtle) throw new Error("안전한 암호화 기능을 사용할 수 없어요. GitHub Pages 주소에서 다시 열어 주세요.");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({name:"PBKDF2", salt, iterations:120000, hash:"SHA-256"}, key, 256);
    return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2,"0")).join("");
  }
  function cooldownRemaining() {
    try { return Math.max(0, Number(JSON.parse(localStorage.getItem(LOCK_KEY)||"{}").until||0)-Date.now()); }
    catch (_error) { return 0; }
  }
  function startCooldown() { localStorage.setItem(LOCK_KEY, JSON.stringify({until:Date.now()+7*DAY})); }
  function rememberWithdrawal() {
    const account=window.GHData.state.account;
    if(!account?.passwordHash||!account?.passwordSalt)return;
    try { const blocked=JSON.parse(localStorage.getItem(WITHDRAWN_KEY)||"[]");blocked.push({username:account.username,passwordHash:account.passwordHash,passwordSalt:account.passwordSalt});localStorage.setItem(WITHDRAWN_KEY,JSON.stringify(blocked)); } catch (_error) {}
  }
  function render() {
    const state = window.GHData.state;
    const login = state.authMode === "login" && state.account;
    const setupPassword = Boolean(login && !state.account.passwordHash);
    const locked = cooldownRemaining();
    const title = login ? "로그인" : "입학 신청";
    return `<main class="game-screen auth-screen">
      <div class="brand"><span class="brand-seal">鬼</span><h1>귀령학교</h1><span class="brand-hanja">鬼靈學校</span></div>
      <div class="form-title"><h2>${title}</h2><p>${login?"아이디와 비밀번호를 입력해 주세요.":"계정 정보를 입력해 주세요."}</p></div>
      <form class="auth-form" id="${login?"login-form":"signup-form"}" novalidate>
        <div class="field"><label for="auth-id">아이디</label><input id="auth-id" name="username" autocomplete="username" required maxlength="32" pattern="[A-Za-z0-9]+" title="영문과 숫자만 사용할 수 있고, 두 종류를 모두 포함해 주세요." placeholder="아이디 입력">${login?"":'<span class="hint">영문과 숫자를 함께 사용해 주세요. 다른 문자는 사용할 수 없어요.</span>'}</div>
        <div class="field"><label for="auth-password">비밀번호</label><input id="auth-password" name="password" type="password" autocomplete="${login?"current-password":"new-password"}" required minlength="8" maxlength="16" placeholder="${login?"비밀번호 입력":"테스트용 비밀번호 입력"}">${login?"":'<span class="hint">8~16자, 영문·숫자·특수문자를 모두 포함해 주세요. abc, 123처럼 연속된 영문이나 숫자는 사용할 수 없어요. 아이디와 연속 3자 이상 겹치는 문자열도 사용할 수 없어요.</span>'}</div>
        ${!login?`<div class="field"><label for="auth-confirm">비밀번호 확인</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" required placeholder="비밀번호 다시 입력"></div><div class="field"><label for="auth-code">초대 코드</label><input id="auth-code" name="inviteCode" autocomplete="off" required minlength="7" maxlength="7" pattern="[A-Za-z]{7}" placeholder="영문 7자리 코드 입력"><span class="hint">배포받은 초대 코드를 입력해 주세요.</span></div>`:setupPassword?`<div class="field"><label for="auth-confirm">비밀번호 확인</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" required placeholder="새 테스트 비밀번호 다시 입력"></div><p class="hint">이전에 만든 시제품 계정이에요. 이번에 테스트용 비밀번호를 설정해 주세요.</p>`:""}
        <p class="form-error" data-form-error role="alert" hidden></p>
        <button class="button-primary" type="submit" ${!login&&locked?"disabled":""}>${login?"로그인":"가입하기"}</button>
      </form>
      <p class="auth-demo-note">시제품 전용 계정입니다. 실제 비밀번호는 입력하지 마세요. 계정 데이터는 이 브라우저에만 저장됩니다.</p>
      <button class="button-quiet auth-mode-toggle" type="button" data-auth-mode="${login?"signup":"login"}">${login?"새 계정 가입하기":"이미 계정이 있나요? 로그인"}</button>
      ${!login&&locked?`<p class="hint">이 브라우저에서는 ${Math.ceil(locked/DAY)}일 후 새 가입이 가능해요.</p>`:""}
    </main>`;
  }
  function hasSequence(password) {
    const groups=password.toLowerCase().match(/[a-z]+|[0-9]+/g)||[];
    return groups.some((group)=>{for(let i=0;i<=group.length-3;i++){const a=group.charCodeAt(i),b=group.charCodeAt(i+1),c=group.charCodeAt(i+2);if((b-a===1&&c-b===1)||(b-a===-1&&c-b===-1))return true;}return false;});
  }
  function passwordError(username,password) {
    if(password.length<8||password.length>16)return "비밀번호는 8~16자로 입력해 주세요.";
    const specialSymbol = /[^\p{L}\p{N}\s]/u.test(password);
    if(!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)||!specialSymbol)return "비밀번호에 영문, 숫자, 특수문자를 모두 포함해 주세요.";
    if(hasSequence(password))return "비밀번호에는 abc나 123처럼 연속된 영문·숫자를 사용할 수 없어요.";
    const id=username.toLowerCase();
    for(let i=0;i<=id.length-3;i++)if(password.toLowerCase().includes(id.slice(i,i+3)))return "비밀번호는 아이디와 연속 3자 이상 겹칠 수 없어요.";
    return "";
  }
  async function submit(form) {
    const fields = new FormData(form);
    const username = String(fields.get("username")||"").trim();
    const password = String(fields.get("password")||"");
    if (!username || !password) return {error:"아이디와 비밀번호를 입력해 주세요."};
    if (form.id === "login-form") {
      const account=window.GHData.state.account;
      if (!account || account.username!==username) return {error:"아이디 또는 비밀번호가 맞지 않아요."};
      if (!account.passwordHash || !account.passwordSalt) {
        if (String(fields.get("confirm")||"")!==password) return {error:"비밀번호 확인이 일치하지 않아요."};
        const policyError=passwordError(username,password);if(policyError)return {error:policyError};
        const salt=crypto.getRandomValues(new Uint8Array(16));
        account.passwordSalt=btoa(String.fromCharCode(...salt));account.passwordHash=await hashPassword(password,salt);
        window.GHData.state.sessionActive=true;window.GHData.state.authMode="signup";window.GHData.save();return {ok:true,login:true};
      }
      const digest=await hashPassword(password, Uint8Array.from(atob(account.passwordSalt), (c)=>c.charCodeAt(0)));
      if (digest!==account.passwordHash) return {error:"아이디 또는 비밀번호가 맞지 않아요."};
      window.GHData.state.sessionActive=true;window.GHData.state.authMode="signup";window.GHData.save();return {ok:true,login:true};
    }
    const confirm = String(fields.get("confirm")||"");
    const inviteCode = String(fields.get("inviteCode")||"");
    if (!confirm || !inviteCode) return {error:"아이디, 비밀번호, 비밀번호 확인, 초대 코드를 모두 입력해 주세요."};
    if (cooldownRemaining()) return {error:"이 브라우저에서는 탈퇴 후 7일 동안 새로 가입할 수 없어요."};
    if (window.GHData.state.account) return {error:"이미 이 브라우저에 계정이 있어요. 로그인해 주세요."};
    if(!/^[A-Za-z0-9]+$/.test(username)||!/[A-Za-z]/.test(username)||!/[0-9]/.test(username))return {error:"아이디는 영문과 숫자를 모두 포함하고, 다른 문자는 사용할 수 없어요."};
    const policyError=passwordError(username,password);if(policyError)return {error:policyError};
    if (password!==confirm) return {error:"비밀번호 확인이 일치하지 않아요."};
    if (!/^[A-Za-z]{7}$/.test(inviteCode)) return {error:"초대 코드는 영문 대소문자 7자리로 입력해 주세요."};
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const hash=await hashPassword(password,salt);
    try {
      const blocked=JSON.parse(localStorage.getItem(WITHDRAWN_KEY)||"[]");
      for(const item of blocked){if(item.username===username&&item.passwordHash===await hashPassword(password,Uint8Array.from(atob(item.passwordSalt),(c)=>c.charCodeAt(0))))return {error:"탈퇴한 계정에서 사용한 아이디와 비밀번호 조합은 다시 사용할 수 없어요."};}
    } catch (_error) { return {error:"가입 정보를 확인하지 못했어요. 다시 시도해 주세요."}; }
    window.GHData.state.account={username,inviteCode,createdAt:Date.now(),passwordSalt:btoa(String.fromCharCode(...salt)),passwordHash:hash};
    window.GHData.state.sessionActive=true;window.GHData.save();return {ok:true};
  }
  window.GHAuth = { render, submit, startCooldown, rememberWithdrawal };
})();
