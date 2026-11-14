declare const __HEARTHPANE_VERSION__: string;

export const COLLECTION_FILES = [
  "misty-mountain-lake.webp",
  "autumn-woodland.webp",
  "coastal-sunset.webp",
  "snow-covered-forest.webp"
];

export function collectionBackgrounds(version = typeof __HEARTHPANE_VERSION__ === "undefined" ? "0.7.0" : __HEARTHPANE_VERSION__): string[] {
  return COLLECTION_FILES.map((file) => `https://raw.githubusercontent.com/twangen/hearthpane/v${version}/assets/backgrounds/${file}`);
}

export function shuffledBackgrounds(images: string[], random = Math.random): string[] {
  const result = [...images];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/** Loads only the next usable image; owns and cancels all pending image work. */
export class BackgroundLoader {
  current = "";
  private _currentCandidate = "";
  private _primary: string[] = [];
  private _fallback: string[] = [];
  private _signature = "";
  private _generation = 0;
  private _busy = false;
  private _failedUntil = new Map<string, number>();
  private _cancel?: () => void;

  constructor(
    private readonly _resolve: (value: string) => Promise<string>,
    private readonly _show: (url: string) => void
  ) {}

  setSources(primary: string[], fallback: string[]): void {
    const signature = JSON.stringify([primary, fallback]);
    if (signature === this._signature) return;
    this.stop();
    this._signature = signature;
    this._primary = primary;
    this._fallback = fallback;
    void this.advance(true);
  }

  stop(): void {
    this._generation += 1;
    this._cancel?.();
    this._cancel = undefined;
    this._busy = false;
    this._signature = "";
  }

  async advance(initial = false): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    const generation = this._generation;
    try {
      const attempted = new Set<string>();
      for (const group of [this._primary, this._fallback]) {
        const currentIndex = group.indexOf(this._currentCandidate);
        const start = initial || currentIndex < 0 ? 0 : (currentIndex + 1) % group.length;
        for (let offset = 0; offset < group.length; offset += 1) {
          const candidate = group[(start + offset) % group.length];
          if (candidate === this._currentCandidate || attempted.has(candidate)) continue;
          attempted.add(candidate);
          if ((this._failedUntil.get(candidate) || 0) > Date.now()) continue;
          const url = await this._load(candidate, generation);
          if (generation !== this._generation) return;
          if (!url) {
            this._failedUntil.set(candidate, Date.now() + 600_000);
            continue;
          }
          this._failedUntil.delete(candidate);
          this.current = url;
          this._currentCandidate = candidate;
          this._show(url);
          return;
        }
        // A successful primary image remains preferable to the fallback,
        // including a single-image source and a rotation with failed siblings.
        if (group === this._primary && group.includes(this._currentCandidate)) return;
      }
    } finally {
      if (generation === this._generation) this._busy = false;
    }
  }

  private _load(candidate: string, generation: number): Promise<string> {
    return new Promise((resolve) => {
      let image: HTMLImageElement | undefined;
      let settled = false;
      const finish = (url: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (image) {
          image.onload = null;
          image.onerror = null;
          if (!url) image.removeAttribute("src");
        }
        this._cancel = undefined;
        resolve(url);
      };
      const timer = window.setTimeout(() => finish(""), 10_000);
      this._cancel = () => finish("");
      void this._resolve(candidate).then((url) => {
        if (settled || generation !== this._generation) return;
        if (!url) { finish(""); return; }
        image = new Image();
        image.onload = () => finish(image!.naturalWidth > 0 ? url : "");
        image.onerror = () => finish("");
        image.src = url;
      }, () => finish(""));
    });
  }
}
