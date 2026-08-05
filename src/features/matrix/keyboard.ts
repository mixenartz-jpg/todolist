/**
 * Matris klavye gezinmesi — saf reducer.
 *
 * Odak konumu `{row, col}` olarak state'te tutulur, DOM'dan okunmaz.
 * Bu sayede ay değiştirme ve odak koruma tahmin edilebilir olur ve
 * mantık tarayıcısız test edilebilir.
 */

export interface FocusPosition {
  row: number;
  col: number;
}

export interface GridBounds {
  rows: number;
  cols: number;
}

export type MatrixAction =
  | { type: "left" }
  | { type: "right" }
  | { type: "up" }
  | { type: "down" }
  | { type: "rowStart" }
  | { type: "rowEnd" }
  | { type: "gridStart" }
  | { type: "gridEnd" }
  | { type: "toColumn"; col: number }
  | { type: "set"; position: FocusPosition };

/**
 * Bir sonraki odak konumu.
 *
 * Yatay hareket satır sonunda komşu satıra SARAR — 31 günlük bir
 * satırın sonundan sağa gitmek bir sonraki rutinin ilk gününe götürür.
 * Dikey hareket sarmaz, kenarda durur: rutinler arası atlarken
 * beklenmedik sıçrama olmamalı.
 */
export function matrixFocusReducer(
  state: FocusPosition,
  action: MatrixAction,
  bounds: GridBounds,
): FocusPosition {
  const { rows, cols } = bounds;
  if (rows <= 0 || cols <= 0) return state;

  const clamped = clamp(state, bounds);

  switch (action.type) {
    case "left": {
      if (clamped.col > 0) return { ...clamped, col: clamped.col - 1 };
      if (clamped.row > 0) return { row: clamped.row - 1, col: cols - 1 };
      return clamped;
    }

    case "right": {
      if (clamped.col < cols - 1) return { ...clamped, col: clamped.col + 1 };
      if (clamped.row < rows - 1) return { row: clamped.row + 1, col: 0 };
      return clamped;
    }

    case "up":
      return { ...clamped, row: Math.max(0, clamped.row - 1) };

    case "down":
      return { ...clamped, row: Math.min(rows - 1, clamped.row + 1) };

    case "rowStart":
      return { ...clamped, col: 0 };

    case "rowEnd":
      return { ...clamped, col: cols - 1 };

    case "gridStart":
      return { row: 0, col: 0 };

    case "gridEnd":
      return { row: rows - 1, col: cols - 1 };

    case "toColumn":
      // Ay değişiminde veya "bugüne atla"da kullanılır: satır korunur.
      return { ...clamped, col: clampNumber(action.col, 0, cols - 1) };

    case "set":
      return clamp(action.position, bounds);
  }
}

function clamp(position: FocusPosition, bounds: GridBounds): FocusPosition {
  return {
    row: clampNumber(position.row, 0, bounds.rows - 1),
    col: clampNumber(position.col, 0, bounds.cols - 1),
  };
}

function clampNumber(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

/**
 * Klavye olayını eyleme çevirir. Tanınmayan tuş → null.
 *
 * Değer girişi (rakamlar, +/-, Backspace) ve toggle (Space/Enter)
 * burada DEĞİL, bileşende ele alınır: onlar odak değil veri değiştirir.
 */
export function keyToAction(
  key: string,
  modifiers: { ctrl: boolean; meta: boolean },
): MatrixAction | null {
  const withModifier = modifiers.ctrl || modifiers.meta;

  switch (key) {
    case "ArrowLeft":
      return { type: "left" };
    case "ArrowRight":
      return { type: "right" };
    case "ArrowUp":
      return { type: "up" };
    case "ArrowDown":
      return { type: "down" };
    case "Home":
      return withModifier ? { type: "gridStart" } : { type: "rowStart" };
    case "End":
      return withModifier ? { type: "gridEnd" } : { type: "rowEnd" };
    default:
      return null;
  }
}
