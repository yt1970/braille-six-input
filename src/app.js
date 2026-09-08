import {
  CHOON_MASK,
  DAKUTEN_MASK,
  DAKUON_MAP,
  HANDAKUTEN_MASK,
  HANDAKUON_MAP,
  KAGI_MASK,
  KAKKO_MASK,
  KANA_MAP,
  KANA_TO_MASK,
  NUMBER_MAP,
  NUMBER_PREFIX_MASK,
  PUNCTUATION_MAP,
  SOKUON_MASK,
  YOUDAKU_PREFIX_MASK,
  YOUHANDAKU_PREFIX_MASK,
  dotMask,
} from "./braille-map.js";

const DOT_KEY_CODES = {
  KeyF: 1,
  KeyD: 2,
  KeyS: 3,
  KeyJ: 4,
  KeyK: 5,
  KeyL: 6,
};

const YOON_PREFIX_MASK = dotMask(4);

// 拗音(点4 / Issue #3-1)と、開拗音系の一部特殊音(Issue #3-4-1のうち
// 前置符号が拗音符と同じ点4のもの: イェ・キェ・シェ・チェ・ニェ・ヒェ・スィ・ティ)。
const YOON_MAP = new Map([
  ["きゃ", "か"], ["きゅ", "く"], ["きょ", "こ"],
  ["しゃ", "さ"], ["しゅ", "す"], ["しょ", "そ"],
  ["ちゃ", "た"], ["ちゅ", "つ"], ["ちょ", "と"],
  ["にゃ", "な"], ["にゅ", "ぬ"], ["にょ", "の"],
  ["ひゃ", "は"], ["ひゅ", "ふ"], ["ひょ", "ほ"],
  ["みゃ", "ま"], ["みゅ", "む"], ["みょ", "も"],
  ["りゃ", "ら"], ["りゅ", "る"], ["りょ", "ろ"],
  ["イェ", "え"], ["キェ", "け"], ["シェ", "せ"],
  ["チェ", "て"], ["ニェ", "ね"], ["ヒェ", "へ"],
  ["スィ", "し"], ["ティ", "ち"],
].reduce((map, [youon, base]) => {
  map.set(`${YOON_PREFIX_MASK}:${KANA_TO_MASK.get(base)}`, youon);
  return map;
}, new Map()));

// 拗濁音(点4・5 / Issue #3-2)と、同じ前置符号を使う開拗音系の特殊音
// (ジェ・ズィ・ディ、Issue #3-4-1)。
const YOUDAKU_MAP = new Map([
  ["ぎゃ", "か"], ["ぎゅ", "く"], ["ぎょ", "こ"],
  ["じゃ", "さ"], ["じゅ", "す"], ["じょ", "そ"],
  ["ぢゃ", "た"], ["ぢゅ", "つ"], ["ぢょ", "と"],
  ["びゃ", "は"], ["びゅ", "ふ"], ["びょ", "ほ"],
  ["ジェ", "せ"], ["ズィ", "し"], ["ディ", "ち"],
].reduce((map, [youdaku, base]) => {
  map.set(`${YOUDAKU_PREFIX_MASK}:${KANA_TO_MASK.get(base)}`, youdaku);
  return map;
}, new Map()));

// 拗半濁音(点4・6 / Issue #3-3)。
const YOUHANDAKU_MAP = new Map([
  ["ぴゃ", "は"], ["ぴゅ", "ふ"], ["ぴょ", "ほ"],
].reduce((map, [youhandaku, base]) => {
  map.set(`${YOUHANDAKU_PREFIX_MASK}:${KANA_TO_MASK.get(base)}`, youhandaku);
  return map;
}, new Map()));

const DAKUON_BY_MASK = new Map(
  [...DAKUON_MAP.entries()].map(([kana, mask]) => [mask, kana]),
);
const HANDAKUON_BY_MASK = new Map(
  [...HANDAKUON_MAP.entries()].map(([kana, mask]) => [mask, kana]),
);

const EMPTY_HISTORY_LABEL = "まだ入力がありません";

const state = {
  pressedCodes: new Set(),
  pressedDots: new Set(),
  history: [],
  pendingModifier: null,
  numberMode: false,
  kagiOpen: true,
  kakkoOpen: true,
};

const compositionText = document.querySelector("#compositionText");
const outputChars = document.querySelector("#outputChars");
const cursor = document.querySelector("#cursor");
const historyText = document.querySelector("#historyText");
const clearButton = document.querySelector("#clearButton");

function dotsToMask(dots) {
  return dotMask(...dots);
}

function modifierLabel(modifier) {
  return {
    daku: "濁音符を入力中。続けて清音を入力",
    handaku: "半濁音符を入力中。続けて「は行」を入力",
    youon: "拗音符を入力中。続けて清音を入力",
    youdaku: "拗濁音符を入力中。続けて清音を入力",
    youhandaku: "拗半濁音符を入力中。続けて「は行」を入力",
  }[modifier];
}

function updateView() {
  const pressed = [...state.pressedDots].sort((a, b) => a - b);
  if (pressed.length) {
    compositionText.textContent = `点 ${pressed.join("・")} を入力中`;
  } else if (state.pendingModifier) {
    compositionText.textContent = modifierLabel(state.pendingModifier);
  } else if (state.numberMode) {
    compositionText.textContent = "数字モード";
  } else {
    compositionText.textContent = "待機中";
  }

  outputChars.textContent = state.history.join("");

  // カーソル: 点を押している最中(まだ1文字が確定していない間)は
  // 「入力中」の色に変え、点滅を止めることで進捗が視覚的にわかるようにする。
  cursor.classList.toggle("is-composing", pressed.length > 0);

  const hasHistory = state.history.length > 0;
  historyText.textContent = hasHistory
    ? state.history.join(" ")
    : EMPTY_HISTORY_LABEL;
  historyText.classList.toggle("is-empty", !hasHistory);
}

function resolveChord(mask) {
  if (state.numberMode) {
    if (mask === NUMBER_PREFIX_MASK) {
      // 数字符を続けて入力しても、数字モードを継続するだけでよい。
      return null;
    }

    const number = NUMBER_MAP.get(mask);
    if (number !== undefined) {
      // 数字が続く限り、数符を打ち直さなくても数字モードを維持する。
      return number;
    }

    // 数字以外のマスが来たら数字モードを終了し、このマスは通常どおり処理する。
    state.numberMode = false;
  }

  if (mask === NUMBER_PREFIX_MASK) {
    state.numberMode = true;
    return null;
  }

  // 外字符(点5・6)は読点「、」と同一マスのため廃止済み。
  // アルファベット入力機能は現状提供していない(Issue #4参照)。

  if (mask === CHOON_MASK) {
    return "ー";
  }

  if (mask === SOKUON_MASK) {
    // 促音符(っ): 単独の1マス(点2)でそのまま出力する。
    return "っ";
  }

  if (mask === KAGI_MASK) {
    // 第1鉤括弧: 開き「と閉じ」は同じマスなので、交互に出力する。
    const symbol = state.kagiOpen ? "「" : "」";
    state.kagiOpen = !state.kagiOpen;
    return symbol;
  }

  if (mask === KAKKO_MASK) {
    // 第1丸括弧: 開き(と閉じ)は同じマスなので、交互に出力する。
    const symbol = state.kakkoOpen ? "(" : ")";
    state.kakkoOpen = !state.kakkoOpen;
    return symbol;
  }

  const punctuation = PUNCTUATION_MAP.get(mask);
  if (punctuation !== undefined) {
    // 読点「、」・句点「。」・疑問符「？」・感嘆符「！」など、既存の仮名・符号と
    // マスが衝突しない句読点記号 (Issue #2 / Issue #5)。
    return punctuation;
  }

  if (mask === DAKUTEN_MASK) {
    state.pendingModifier = "daku";
    return null;
  }
  if (mask === HANDAKUTEN_MASK) {
    state.pendingModifier = "handaku";
    return null;
  }
  if (mask === YOON_PREFIX_MASK) {
    state.pendingModifier = "youon";
    return null;
  }
  if (mask === YOUDAKU_PREFIX_MASK) {
    // 拗濁音(点4・5)。濁音(点5)・拗音(点4)とは別マスなので衝突しない (Issue #3)。
    state.pendingModifier = "youdaku";
    return null;
  }
  if (mask === YOUHANDAKU_PREFIX_MASK) {
    // 拗半濁音(点4・6)。半濁音(点6)・拗音(点4)とは別マスなので衝突しない (Issue #3)。
    state.pendingModifier = "youhandaku";
    return null;
  }

  if (state.pendingModifier === "daku") {
    const kana = DAKUON_BY_MASK.get(mask);
    state.pendingModifier = null;
    return kana ?? "？";
  }
  if (state.pendingModifier === "handaku") {
    const kana = HANDAKUON_BY_MASK.get(mask);
    state.pendingModifier = null;
    return kana ?? "？";
  }
  if (state.pendingModifier === "youon") {
    const kana = YOON_MAP.get(`${YOON_PREFIX_MASK}:${mask}`);
    state.pendingModifier = null;
    return kana ?? "？";
  }
  if (state.pendingModifier === "youdaku") {
    const kana = YOUDAKU_MAP.get(`${YOUDAKU_PREFIX_MASK}:${mask}`);
    state.pendingModifier = null;
    return kana ?? "？";
  }
  if (state.pendingModifier === "youhandaku") {
    const kana = YOUHANDAKU_MAP.get(`${YOUHANDAKU_PREFIX_MASK}:${mask}`);
    state.pendingModifier = null;
    return kana ?? "？";
  }

  return KANA_MAP.get(mask) ?? "？";
}

function finalizeChord() {
  if (!state.pressedDots.size) {
    return;
  }

  const value = resolveChord(dotsToMask(state.pressedDots));
  state.pressedDots.clear();
  if (value !== null) {
    state.history.push(value);
  }
  updateView();
}

function removeLast() {
  state.history.pop();
  updateView();
}

function insertSpace() {
  // 分かち書きの区切り。数字モードや保留中の符号は、
  // 他の非対象マスと同様にここで解除する。
  state.numberMode = false;
  state.pendingModifier = null;
  state.history.push(" ");
  updateView();
}

function resetInput() {
  state.pressedCodes.clear();
  state.pressedDots.clear();
  state.history = [];
  state.pendingModifier = null;
  state.numberMode = false;
  state.kagiOpen = true;
  state.kakkoOpen = true;
  updateView();
}

function handleKeyDown(event) {
  const dot = DOT_KEY_CODES[event.code];

  if (dot && !event.repeat) {
    event.preventDefault();
    state.pressedCodes.add(event.code);
    state.pressedDots.add(dot);
    updateView();
    return;
  }

  if (event.code === "Backspace") {
    event.preventDefault();
    removeLast();
  } else if (event.code === "Escape") {
    event.preventDefault();
    resetInput();
  } else if (event.code === "Space") {
    event.preventDefault();
    if (state.pressedDots.size === 0) {
      insertSpace();
    }
  }
}

function handleKeyUp(event) {
  if (!DOT_KEY_CODES[event.code]) {
    return;
  }

  state.pressedCodes.delete(event.code);
  if (state.pressedCodes.size === 0) {
    finalizeChord();
  }
}

function clearPressedState() {
  state.pressedCodes.clear();
  state.pressedDots.clear();
  updateView();
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", clearPressedState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearPressedState();
  }
});
clearButton.addEventListener("click", resetInput);

updateView();
