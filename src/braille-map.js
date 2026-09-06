// 点字1マスを6ビットのマスクに変換する。
// 点の位置は読みと同じ: 左列が1・2・3、右列が4・5・6。
export const dotMask = (...dots) =>
  dots.reduce((mask, dot) => mask | (1 << (dot - 1)), 0);

const kanaRows = [
  [
    ["あ", [1]], ["い", [1, 2]], ["う", [1, 4]], ["え", [1, 2, 4]], ["お", [2, 4]],
  ],
  [
    ["か", [1, 6]], ["き", [1, 2, 6]], ["く", [1, 4, 6]], ["け", [1, 2, 4, 6]], ["こ", [2, 4, 6]],
  ],
  [
    ["さ", [1, 5, 6]], ["し", [1, 2, 5, 6]], ["す", [1, 4, 5, 6]], ["せ", [1, 2, 4, 5, 6]], ["そ", [2, 4, 5, 6]],
  ],
  [
    ["た", [1, 3, 5]], ["ち", [1, 2, 3, 5]], ["つ", [1, 3, 4, 5]], ["て", [1, 2, 3, 4, 5]], ["と", [2, 3, 4, 5]],
  ],
  [
    ["な", [1, 3]], ["に", [1, 2, 3]], ["ぬ", [1, 3, 4]], ["ね", [1, 2, 3, 4]], ["の", [2, 3, 4]],
  ],
  [
    ["は", [1, 3, 6]], ["ひ", [1, 2, 3, 6]], ["ふ", [1, 3, 4, 6]], ["へ", [1, 2, 3, 4, 6]], ["ほ", [2, 3, 4, 6]],
  ],
  [
    ["ま", [1, 3, 5, 6]], ["み", [1, 2, 3, 5, 6]], ["む", [1, 3, 4, 5, 6]], ["め", [1, 2, 3, 4, 5, 6]], ["も", [2, 3, 4, 5, 6]],
  ],
  [
    ["や", [3, 4]], ["ゆ", [3, 4, 6]], ["よ", [3, 4, 5]],
  ],
  [
    ["ら", [1, 5]], ["り", [1, 2, 5]], ["る", [1, 4, 5]], ["れ", [1, 2, 4, 5]], ["ろ", [2, 4, 5]],
  ],
  [
    ["わ", [3]], ["を", [3, 5]], ["ん", [3, 5, 6]],
  ],
];

export const KANA_MAP = new Map(
  kanaRows.flat().map(([kana, dots]) => [dotMask(...dots), kana]),
);
export const KANA_TO_MASK = new Map(
  [...KANA_MAP.entries()].map(([mask, kana]) => [kana, mask]),
);

export const KANA_COUNT = kanaRows.flat().length;

// 濁音・半濁音は、符号の1マスと清音の1マスを続けて入力する。
export const DAKUTEN_MASK = dotMask(5);
export const HANDAKUTEN_MASK = dotMask(6);

const voicedRows = [
  ["がぎぐげご", "かきくけこ"],
  ["ざじずぜぞ", "さしすせそ"],
  ["だぢづでど", "たちつてと"],
  ["ばびぶべぼ", "はひふへほ"],
];

export const DAKUON_MAP = new Map();
for (const [voiced, base] of voicedRows) {
  [...voiced].forEach((kana, index) => {
    DAKUON_MAP.set(kana, KANA_TO_MASK.get(base[index]));
  });
}

export const HANDAKUON_MAP = new Map(
  [..."ぱぴぷぺぽ"].map((kana, index) => {
    const baseKana = [..."はひふへほ"][index];
    return [kana, KANA_TO_MASK.get(baseKana)];
  }),
);

export const NUMBER_PREFIX_MASK = dotMask(3, 4, 5, 6);

// 長音符(ー): ウ列・オ列の長音などを表す。点2・5。
export const CHOON_MASK = dotMask(2, 5);

const numberPatterns = {
  "1": [1],
  "2": [1, 2],
  "3": [1, 4],
  "4": [1, 4, 5],
  "5": [1, 5],
  "6": [1, 2, 4],
  "7": [1, 2, 4, 5],
  "8": [1, 2, 5],
  "9": [2, 4],
  "0": [2, 4, 5],
};

export const NUMBER_MAP = new Map(
  Object.entries(numberPatterns).map(([number, dots]) => [dotMask(...dots), number]),
);

// 外字符(アルファベットの前につける符号): 点5・6。
// これに続くマスは、かなではなくラテン文字として解釈する。
export const ALPHA_PREFIX = dotMask(5, 6);

// アルファベット(a-z): 国際点字と共通のパターン。
const alphaPatterns = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5],
  f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
  k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5],
  p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5],
  u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6],
  z: [1, 3, 5, 6],
};

export const ALPHA_MAP = new Map(
  Object.entries(alphaPatterns).map(([letter, dots]) => [dotMask(...dots), letter]),
);

// 第1鉤括弧「」: 点3・6の1マス。開き・閉じで同じマスを使い、交互に出力する。
// 第2鉤括弧(『』、第1鉤括弧の中で使うもの)は2マス構成(開始:5・6→3、終了:6→2・3)で
// 今回のMVP(1マス即時確定モデル)では未対応。『点訳のてびき 第4版』準拠。
export const KAGI_MASK = dotMask(3, 6);

// 第1丸括弧(): 点2・3・5・6の1マス。開き・閉じで同じマスを使い、交互に出力する。
// 第2丸括弧(二重括弧、第1丸括弧の中で使うもの)は2マス構成(開始:5→2・3・5・6、
// 終了:2・3・5・6→2)で今回のMVPでは未対応。『点訳のてびき 第4版』準拠。
export const KAKKO_MASK = dotMask(2, 3, 5, 6);
