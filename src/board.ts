import leaflet from "leaflet";
import luck from "./luck.ts";
import { MapAbstraction } from "./mapAbstraction.ts";
import { Cache, Cell, newCache } from "./boardPieces.ts";

export class Board {
  readonly tileWidth: number;
  readonly halfTileWidth: number;
  readonly tileVisibilityRadius: number;
  readonly cacheSpawnProbability: number;
  readonly maxCoins: number;

  private readonly knownCells: Map<string, Cell>;
  private readonly knownCaches: Map<string, string>;
  private readonly currentlyVisibleCaches: Map<string, Cache>;
  statusPanel: HTMLDivElement;

  constructor(
    tileWidth: number,
    tileVisibilityRadius: number,
    cacheSpawnProbability: number,
    maxCoins: number,
    statusPanel: HTMLDivElement,
  ) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.cacheSpawnProbability = cacheSpawnProbability;
    this.halfTileWidth = tileWidth / 2;
    this.maxCoins = maxCoins;
    this.knownCells = new Map();
    this.knownCaches = new Map();
    this.currentlyVisibleCaches = new Map();
    this.statusPanel = statusPanel;
  }

  private cellToKey(cell: Cell): string {
    return [cell.x, cell.y].toString();
  }

  private generateCache(cell: Cell, map: MapAbstraction): Cache {
    const key = this.cellToKey(cell);
    if (!this.knownCaches.has(key)) {
      const currentCache = newCache(
        {
          x: cell.x * this.tileWidth,
          y: cell.y * this.tileWidth,
        },
        this.maxCoins,
        map,
      );
      this.knownCaches.set(key, currentCache.toMomento());
      return currentCache;
    }
    const existingCache: Cache = newCache(cell, 0, map);
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

  getPointAtCell(location: Cell): leaflet.latLng {
    return {
      lat: location.x * this.tileWidth + this.tileWidth / 2,
      long: location.y * this.tileWidth + this.tileWidth / 2,
    };
  }

  getCellsNearPoint(point: leaflet.LatLng, map: MapAbstraction): Cell[] {
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
          const currentCache = this.generateCache(cannonicalCell, map);
          this.currentlyVisibleCaches.set(key, currentCache);
        }
      }
    }
    this.saveVisibleCaches();

    return resultCells;
  }

  createLocateButton(map: MapAbstraction, cell: Cell, panel: HTMLDivElement) {
    const newButton = document.createElement("button");
    newButton.innerText = "Locate Home";

    newButton.addEventListener("click", () => {
      const point: leaflet.latLng = leaflet.latLng(cell.x, cell.y);
      map.centerOnPoint(point, true);
    });

    panel.appendChild(newButton);
  }

  updateStatusPanel(map: MapAbstraction) {
    this.statusPanel!.innerText = `You have ${map.playerCoins.length} coins:`;

    for (let i = 0; i < map.playerCoins.length; i++) {
      const coin = map.playerCoins[i];

      const coinInfo = document.createElement("div");
      coinInfo.innerText += coin.toString();
      this.statusPanel!.appendChild(coinInfo);

      this.createLocateButton(map, coin.cell, coinInfo);
    }
  }

  updateCacheStatus(
    map: MapAbstraction,
    cache: Cache,
    popupDiv: HTMLDivElement,
  ) {
    popupDiv!.innerText = ``;
    for (let i = 0; i < cache.coins.length; i++) {
      const coin = cache.coins[i];

      const coinInfo = document.createElement("div");
      coinInfo.innerText += coin.toString();
      popupDiv!.appendChild(coinInfo);

      this.createLocateButton(map, coin.cell, coinInfo);
    }
  }

  saveVisibleCaches() {
    this.currentlyVisibleCaches.forEach((val, key) => {
      this.knownCaches.set(key, val.toMomento());
    });
  }

  clearVisibleCaches() {
    this.saveVisibleCaches();
    this.currentlyVisibleCaches.clear();
  }

  getCacheRectangle(cell: Cell): leaflet.Rectangle {
    return leaflet.rectangle(this.getCellBounds(cell));
  }

  saveCache(cell: Cell, cache: Cache) {
    this.knownCaches.set(this.cellToKey(cell), cache.toMomento());
  }

  loadKnownCaches() {
    const cacheJSON = localStorage.getItem("playerCaches");
    if (!cacheJSON) {
      return;
    }
    const parsedCaches = JSON.parse(cacheJSON!);
    for (let i = 0; i < parsedCaches.caches.length; i++) {
      this.knownCaches.set(parsedCaches.cacheKeys[i], parsedCaches.caches[i]);
    }
  }

  saveCaches(): void {
    localStorage.setItem(
      "playerCaches",
      JSON.stringify({
        cacheKeys: Array.from(this.knownCaches.keys()),
        caches: Array.from(this.knownCaches.values()),
      }),
    );
  }

  clearMemory() {
    this.knownCaches.clear();
    this.knownCells.clear();
    this.currentlyVisibleCaches.clear();
  }
}
