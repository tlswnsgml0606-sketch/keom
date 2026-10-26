(function () {
  "use strict";
  let adapter = window.GHBackendAdapter || null;
  const listeners = new Map();
  function connect(nextAdapter) {
    if (!nextAdapter || typeof nextAdapter.publish !== "function" || typeof nextAdapter.subscribe !== "function") {
      throw new TypeError("백엔드 어댑터는 publish와 subscribe 메서드를 제공해야 해요.");
    }
    adapter = nextAdapter;
    for (const [topic, callbacks] of listeners) {
      for (const callback of callbacks) adapter.subscribe(topic, callback);
    }
    return true;
  }
  function publish(topic, payload) {
    if (!adapter) return Promise.resolve({ delivered: false, localOnly: true, topic });
    return Promise.resolve(adapter.publish(topic, payload)).then((result) => ({ delivered: true, localOnly: false, result }));
  }
  function subscribe(topic, callback) {
    if (typeof callback !== "function") throw new TypeError("수신 함수가 필요해요.");
    if (!listeners.has(topic)) listeners.set(topic, new Set());
    listeners.get(topic).add(callback);
    if (adapter) adapter.subscribe(topic, callback);
    return () => listeners.get(topic)?.delete(callback);
  }
  const topicCatalog = Object.freeze([
    "account.created", "character.created", "account.profile", "account.search", "account.search.results", "invite.issued", "invite.redeemed",
    "map.position", "map.speech", "chat.message", "chat.whisper", "letter.sent", "letter.response",
    "enrollment.quarter", "enrollment.grade", "story.trigger",
    "event.schedule", "event.team", "event.deadline", "event.result", "status.update", "state.effect", "record.append",
    "class.progress", "activity.timer", "inventory.update", "market.purchase", "auction.update"
  ]);
  window.GHSync = { connect, publish, subscribe, topicCatalog, get connected() { return Boolean(adapter); } };
})();
