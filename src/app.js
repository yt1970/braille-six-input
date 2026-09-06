import {
  CHOON_MASK,
  DAKUTEN_MASK,
  DAKUON_MAP,
  HANDAKUTEN_MASK,
  HANDAKUON_MAP,
  KANA_MAP,
  KANA_TO_MASK,
  NUMBER_MAP,
  NUMBER_PREFIX_MASK,
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

const YOON_MAP = new Map([
  ["きゃ", "か"], ["きゅ", "く"], ["きょ", "こ"],
  ["しゃ", "さ"], ["しゅ", "す"], ["しょ", "そ"],
  ["ちゃ", "た"], ["ちゅ", "つ"], ["ちょ", "と"],
  ["にゃ", "な"], ["にゅ", "ぬ"], ["にょ", "の"],
  ["ひゃ", "は"], ["ひゅ", "ふ"], ["ひょ", "ほ"],
  ["みゃ", "ま"], ["みゅ", "む"], ["みょ", "も"],
  ["りゃ", "ら"], ["りゅ", "る"], ["りょ", "ろ"],
].reduce((map, [youon, base]) => {
  map.set(`${YOON_PREFIX_MASK}:${KANA_TO_MASK.get(base)}`, youon);
  return map;
}, new Map()));

const DAKUON_BY_MASK = new Map(
  [...DAKUON_MAP.entries()].map(([kana, mask]) => [mask, kana]),
);
const HANDAKUON_BY_MASK = new Map(
  [...HANDAKUON_MAP.entries()].map(([kana, mask]) => [mask, kana]),
);

const state = {
  pressedCodes: new Set(),
  pressedDots: new Set(),
  history: [],
  pendingModifier: null,
  numberMode: false,
};

const compositionText = document.querySelector("#compositionText");
const outputText = document.querySelector("#outputText");
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

  outputText.textContent = state.history.length
    ? state.history.join("")
    : "まだ入力がありません";
  historyText.textContent = state.history.length
    ? state.history.join(" ")
    : "-";
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

  if (mask === CHOON_MASK) {
    return "ー";
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

function resetInput() {
  state.pressedCodes.clear();
  state.pressedDots.clear();
  state.history = [];
  state.pendingModifier = null;
  state.numberMode = false;
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
