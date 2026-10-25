(function () {
  "use strict";
  function render() {
    return `<main class="game-screen auth-screen">
      <div class="brand"><span class="brand-seal">鬼</span><h1>귀령학교</h1><span class="brand-hanja">鬼靈學校</span></div>
      <div class="form-title"><h2>입학 신청</h2><p>계정 정보를 입력해 주세요.</p></div>
      <form class="auth-form" id="signup-form" novalidate>
        <div class="field"><label for="signup-id">아이디</label><input id="signup-id" name="username" autocomplete="username" required maxlength="32" placeholder="아이디 입력"></div>
        <div class="field"><label for="signup-password">비밀번호</label><input id="signup-password" name="password" type="password" autocomplete="new-password" required placeholder="비밀번호 입력"></div>
        <div class="field"><label for="signup-confirm">비밀번호 확인</label><input id="signup-confirm" name="confirm" type="password" autocomplete="new-password" required placeholder="비밀번호 다시 입력"></div>
        <div class="field"><label for="signup-code">초대 코드</label><input id="signup-code" name="inviteCode" autocomplete="off" required minlength="7" maxlength="7" pattern="[A-Za-z]{7}" placeholder="영문 7자리 코드 입력"><span class="hint">배포받은 초대 코드를 입력해 주세요.</span></div>
        <p class="form-error" data-form-error role="alert" hidden></p>
        <button class="button-primary" type="submit">가입하기</button>
      </form>
    </main>`;
  }
  function submit(form) {
    const fields = new FormData(form);
    const username = String(fields.get("username") || "").trim();
    const password = String(fields.get("password") || "");
    const confirm = String(fields.get("confirm") || "");
    const inviteCode = String(fields.get("inviteCode") || "");
    if (!username || !password || !confirm || !inviteCode) return { error:"아이디, 비밀번호, 비밀번호 확인, 초대 코드를 모두 입력해 주세요." };
    if (password !== confirm) return { error:"비밀번호 확인이 일치하지 않아요." };
    if (!/^[A-Za-z]{7}$/.test(inviteCode)) return { error:"초대 코드는 영문 대소문자 7자리로 입력해 주세요." };
    if (!window.GHData.state.account) {
      window.GHData.state.account = { username, inviteCode, createdAt:Date.now() };
      window.GHData.save();
    }
    return { ok:true };
  }
  window.GHAuth = { render, submit };
})();
