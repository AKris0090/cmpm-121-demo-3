import leaflet from "leaflet";
import luck from "./luck.ts";
import { MapAbstraction } from "./MapInterface.ts";
import { Cache, Cell, createCoin, newCache } from "./Pieces.ts";
import { UserInterfaceAbstraction } from "./UserInterface.ts";
import { PolylineAbstraction } from "./PolyLineInterface.ts";

// cellToKey is a helper function that converts a cell to a string key.
function cellToKey(cell: Cell, tileWidth: number): string {
  return [cell.x * tileWidth, cell.y * tileWidth].toString();
}

// Reset functions to clear all player data
export function clearHistory(
  defaultPosition: leaflet.LatLng,
  mapAbstraction: MapAbstraction,
  board: BoardInterface,
  userInterface: UserInterfaceAbstraction,
  polylines: PolylineAbstraction,
) {
  mapAbstraction.setPlayerMarker(defaultPosition); // reset player position
  mapAbstraction.playerCoins.splice(0, mapAbstraction.playerCoins.length); // clear all coins
  userInterface.updateStatusPanel(mapAbstraction, board.tileWidth); // reset status panel
  board.clearMemory(); // reset all caches to default states
  polylines.clearPolylines(); // clear all polylines/paths
  polylines.createPolyline(); // create a new path
}

// generateCache creates a new cache at a cell if it doesn't already exist
// Otherwise, it finds the existing cache in the board's knownCaches mapa and returns it.
function generateCache(boardObj: BoardInterface, cell: Cell): Cache {
  const key = cellToKey(cell, boardObj.tileWidth);
  if (!boardObj.knownCaches.has(key)) {
    // If cache is unknown, create a new cache
    const currentCache = newCache(cell, boardObj.maxCoins, boardObj.tileWidth);
    boardObj.knownCaches.set(key, currentCache.toMomento());
    return currentCache;
  }
  // If cache is known, return the existing cache
  const existingCache: Cache = newCache(cell, 0, boardObj.tileWidth);
  existingCache.fromMomento(boardObj.knownCaches.get(key)!);
  return existingCache;
}

// getCanonicalCell returns the canonical cell from the board's knownCells map.
function getCanonicalCell(boardObj: BoardInterface, cell: Cell): Cell {
  const { x, y } = cell;
  const key = cellToKey(cell, boardObj.tileWidth);
  if (!boardObj.knownCells.has(key)) {
    boardObj.knownCells.set(key, { x, y });
  }
  return boardObj.knownCells.get(key)!;
}

// getCellBounds returns the bounds of the cell for drawing the rectangle on the map.
function getCellBounds(tileWidth: number, cell: Cell): leaflet.LatLngBounds {
  const { x, y } = cell;
  const halfTileWidth = tileWidth / 2;
  const topLeft = {
    lat: x * tileWidth - halfTileWidth,
    long: y * tileWidth + halfTileWidth,
  };
  const bottomRight = {
    lat: x * tileWidth + halfTileWidth,
    long: y * tileWidth - halfTileWidth,
  };
  return leaflet.latLngBounds(
    [topLeft.lat, topLeft.long],
    [bottomRight.lat, bottomRight.long],
  );
}

// saveVisibleCaches saves the currently visible caches to the board's knownCaches map.
function saveVisibleCaches(boardObj: BoardInterface) {
  boardObj.currentlyVisibleCaches.forEach((val, key) => {
    boardObj.knownCaches.set(key, val.toMomento());
  });
}

// materializeCoins creates coins at all the cells in allCoins and adds them to the mapAbstraction's playerCoins array.
export function materializeCoins(
  allCoins: { cell: Cell; serial: number }[],
  mapAbstraction: MapAbstraction,
  board: BoardInterface,
) {
  for (let i = 0; i < allCoins.length; i++) {
    mapAbstraction.playerCoins.push(
      createCoin(allCoins[i].cell, allCoins[i].serial, board.tileWidth),
    );
  }
}

// BoardInterface is an interface that represents the game board.
// It contains methods for managing the game board state.
export interface BoardInterface {
  tileWidth: number;
  tileVisibilityRadius: number;
  cacheSpawnProbability: number;
  maxCoins: number;

  knownCells: Map<string, Cell>;
  knownCaches: Map<string, string>;
  currentlyVisibleCaches: Map<string, Cache>;

  getCacheFromCell(currentCell: Cell): Cache;
  getCellAtPoint(position: Cell): Cell;
  getCacheRectangle(currentCell: Cell): leaflet.Rectangle;
  getCellsNearPoint(position: leaflet.LatLng, mapAbs: MapAbstraction): Cell[];
  updateCacheMomento(currentCache: Cache): void;
  clearVisibleCaches(): void;
  clearMemory(): void;
}

// newBoard creates a new game board with the given parameters.
// It returns a BoardInterface object that represents the game board.
export function newBoard(
  tileWidth: number,
  tileVisibilityRadius: number,
  cacheSpawnProbability: number,
  maxCoins: number,
): BoardInterface {
  const newBoardInterface: BoardInterface = {
    tileWidth: tileWidth,
    tileVisibilityRadius: tileVisibilityRadius,
    cacheSpawnProbability: cacheSpawnProbability,
    maxCoins: maxCoins,
    knownCells: new Map(),
    knownCaches: new Map(),
    currentlyVisibleCaches: new Map(),

    // getCacheFromCell returns the cache at the given cell.
    getCacheFromCell: function (currentCell: Cell): Cache {
      return this.currentlyVisibleCaches.get(
        cellToKey(currentCell, this.tileWidth),
      )!;
    },

    // getCellAtPoint returns the cell at the given geoposition.
    getCellAtPoint(location: Cell): Cell {
      const i = Math.floor(location.x / this.tileWidth);
      const j = Math.floor(location.y / this.tileWidth);
      return getCanonicalCell(this, { x: i, y: j });
    },

    getCacheRectangle(cell: Cell): leaflet.Rectangle {
      return leaflet.rectangle(getCellBounds(this.tileWidth, cell));
    },

    // getCellsNearPoint returns the cells near the given geoposition.
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
            luck(
              [lat, lang, "https://github.com/AKris0090/Orchid"].toString(),
            ) < this.cacheSpawnProbability
          ) {
            const cannonicalCell = getCanonicalCell(this, { x: lat, y: lang });
            resultCells.push(cannonicalCell);
            const key = cellToKey(cannonicalCell, this.tileWidth);
            const currentCache = generateCache(this, cannonicalCell);
            this.currentlyVisibleCaches.set(key, currentCache);
          }
        }
      }
      saveVisibleCaches(this);

      return resultCells;
    },

    // updateCacheMomento updates the cache's momento in the board's knownCaches map.
    updateCacheMomento(cache: Cache) {
      this.knownCaches.set(
        cellToKey(cache.cell, this.tileWidth),
        cache.toMomento(),
      );
    },

    // clearVisibleCaches saved the currently visible caches, then
    // clears the currently visible caches from the board's knownCaches map.
    clearVisibleCaches() {
      saveVisibleCaches(this);
      this.currentlyVisibleCaches.clear();
    },

    // clearMemory clears all the known caches and cells from the board.
    clearMemory() {
      this.knownCaches.clear();
      this.knownCells.clear();
      this.currentlyVisibleCaches.clear();
    },
  };

  return newBoardInterface;
}
