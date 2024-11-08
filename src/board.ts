import leaflet from "leaflet";
import luck from "./luck.ts";

export interface Cache {
  numCoins: number;
}

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;
  private readonly knownCache: Map<string, Cache>;
  private readonly knownDiv: Map<string, HTMLDivElement>;

  private MAX_COINS = 100;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
    this.knownCache = new Map();
    this.knownDiv = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { x, y } = cell;
    const key = [x, y].toString();
    if (!(this.knownCells.has(key))) {
      this.knownCells.set(key, { x, y });
      this.knownCache.set(key, {
        numCoins: Math.floor(
          luck([x, y, "initialValue"].toString()) * this.MAX_COINS,
        ),
      });
      this.knownDiv.set(key, document.createElement("div"));
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      x: Math.floor(point.lat / this.tileWidth),
      y: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellCache(cell: Cell): Cache {
    return this.knownCache.get([cell.x, cell.y].toString())!;
  }

  getCellDiv(cell: Cell): HTMLDivElement {
    return this.knownDiv.get([cell.x, cell.y].toString())!;
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds(
      leaflet.latLng(
        cell.x,
        cell.y,
      ),
      leaflet.latLng(
        cell.x + this.tileWidth,
        cell.y + this.tileWidth,
      ),
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];

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
        resultCells.push(
          this.getCanonicalCell({
            x: point.lat + dx * this.tileWidth,
            y: point.lng + dy * this.tileWidth,
          }),
        );
      }
    }

    return resultCells;
  }
}
