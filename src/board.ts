import leaflet from "leaflet";
import luck from "./luck.ts";

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface Coin {
  cell: Cell;
  serial: number;

  toString(): void;
}

export interface Cache {
  coins: Coin[];

  toMomento(): string;
  fromMomento(momento: string): void;
}

export function createCoin(cell: Cell, serial: number): Coin {
  const newCoin: Coin = {
    cell,
    serial,
    toString() {
      return `<pre>${cell.x.toFixed(4)}:${
        cell.y.toFixed(
          4,
        )
      }, serial:${serial}</pre>`;
    },
  };

  return newCoin;
}

export function newCache(cell: Cell, maxCoins: number): Cache {
  const newCache: Cache = {
    coins: [],

    toMomento() {
      return JSON.stringify({
        coins: this.coins,
      });
    },
    fromMomento(momento: string) {
      this.coins = [];
      const parsed = JSON.parse(momento);
      for (let i = 0; i < parsed.coins.length; i++) {
        const parsedCoin = parsed.coins[i];
        const newCoin: Coin = createCoin(parsedCoin.cell, parsedCoin.serial);
        this.coins.push(newCoin);
      }
    },
  };

  const numCoins =
    luck([cell.x, cell.y, "https://github.com/AKris0090/Orchid"].toString()) *
    maxCoins;
  for (let i = 0; i < numCoins; i++) {
    newCache.coins.push(createCoin(cell, i));
  }

  return newCache;
}

export class Board {
  readonly tileWidth: number;
  readonly halfTileWidth: number;
  readonly tileVisibilityRadius: number;
  readonly cacheSpawnProbability: number;
  readonly maxCoins: number;

  private readonly knownCells: Map<string, Cell>;
  private readonly knownCaches: Map<string, string>;
  private readonly currentlyVisibleCaches: Map<string, Cache>;

  constructor(
    tileWidth: number,
    tileVisibilityRadius: number,
    cacheSpawnProbability: number,
    maxCoins: number,
  ) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.cacheSpawnProbability = cacheSpawnProbability;
    this.halfTileWidth = tileWidth / 2;
    this.maxCoins = maxCoins;
    this.knownCells = new Map();
    this.knownCaches = new Map();
    this.currentlyVisibleCaches = new Map();
  }

  private cellToKey(cell: Cell): string {
    return [cell.x, cell.y].toString();
  }

  private generateCache(cell: Cell): Cache {
    const key = this.cellToKey(cell);
    if (!this.knownCaches.has(key)) {
      const currentCache = newCache(
        {
          x: cell.x * this.tileWidth,
          y: cell.y * this.tileWidth,
        },
        this.maxCoins,
      );
      this.knownCaches.set(key, currentCache.toMomento());
      return currentCache;
    }
    const existingCache: Cache = newCache(cell, 0);
    existingCache.fromMomento(this.knownCaches.get(key)!);
    return existingCache;
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { x, y } = cell;
    const key = this.cellToKey(cell);
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { x, y });
    }
    return this.knownCells.get(key)!;
  }

  getCacheFromCell(cell: Cell): Cache {
    return this.currentlyVisibleCaches.get(this.cellToKey(cell))!;
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { x, y } = cell;
    const topLeft = {
      lat: x * this.tileWidth - this.halfTileWidth,
      long: y * this.tileWidth + this.halfTileWidth,
    };
    const bottomRight = {
      lat: x * this.tileWidth + this.halfTileWidth,
      long: y * this.tileWidth - this.halfTileWidth,
    };
    return leaflet.latLngBounds(
      [topLeft.lat, topLeft.long],
      [bottomRight.lat, bottomRight.long],
    );
  }

  getCellAtPoint(location: Cell): Cell {
    const i = Math.floor(location.x / this.tileWidth);
    const j = Math.floor(location.y / this.tileWidth);
    return this.getCanonicalCell({ x: i, y: j });
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const trueCell = this.getCellAtPoint({ x: point.lat, y: point.lng });

    for (
      let dx = -this.tileVisibilityRadius;
      dx <= this.tileVisibilityRadius;
      dx++
    ) {
      for (
        let dy = -this.tileVisibilityRadius;
        dy <= this.tileVisibilityRadius;
        dy++
      ) {
        const lat = trueCell.x + dx;
        const lang = trueCell.y + dy;
        if (
          luck([lat, lang, "https://github.com/AKris0090/Orchid"].toString()) <
            this.cacheSpawnProbability
        ) {
          const cannonicalCell = this.getCanonicalCell({ x: lat, y: lang });
          resultCells.push(cannonicalCell);
          const key = this.cellToKey(cannonicalCell);
          const currentCache = this.generateCache(cannonicalCell);
          this.currentlyVisibleCaches.set(key, currentCache);
        }
      }
    }

    return resultCells;
  }

  clearVisibleCaches() {
    this.currentlyVisibleCaches.forEach((val, key) => {
      this.knownCaches.set(key, val.toMomento());
    });
    this.currentlyVisibleCaches.clear();
  }

  getCacheRectangle(cell: Cell): leaflet.Rectangle {
    return leaflet.rectangle(this.getCellBounds(cell));
  }
}
