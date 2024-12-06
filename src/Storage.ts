import leaflet from "leaflet";
import { Cell } from "./Pieces.ts";
import { PolylineAbstraction } from "./PolyLineInterface.ts";
import { MapAbstraction } from "./MapInterface.ts";
import { BoardInterface, materializeCoins } from "./BoardInterface.ts";

// Storage is an interface for saving and loading player data
export interface Storage {
  load(
    savedCoins: string | null,
    savedPosition: string | null,
    mapAbstraction: MapAbstraction,
    board: BoardInterface,
    defaultPosition: leaflet.LatLng,
  ): void;
  store(
    polylines: PolylineAbstraction,
    board: BoardInterface,
    mapAbstraction: MapAbstraction,
  ): void;
  clear(): void;
}

// savePolylines saves the polylines to local storage.
function savePolylines(polylines: PolylineAbstraction) {
  const positions: Cell[][] = [];
  for (let i = 0; i < polylines.polyLineArray.length; i++) {
    if (polylines.polyLineArray[i].getLatLngs().length > 1) {
      positions.push(polylines.polyLineArray[i].getLatLngs());
    }
  }
  localStorage.setItem("polyLines", JSON.stringify(positions));
}

// saveCaches saves the known caches to local storage.
function saveCaches(knownCaches: Map<string, string>) {
  localStorage.setItem(
    "playerCaches",
    JSON.stringify({
      cacheKeys: Array.from(knownCaches.keys()),
      caches: Array.from(knownCaches.values()),
    }),
  );
}

// saveCurrentPosition saves the player's current position to local storage.
function saveCurrentPosition(mapAbstraction: MapAbstraction) {
  localStorage.setItem(
    "currentPosition",
    JSON.stringify(mapAbstraction.playerMarker.getLatLng()),
  );
}

// savePlayerCoins saves the player's coins to local storage.
function savePlayerCoins(mapAbstraction: MapAbstraction) {
  localStorage.setItem(
    "playerCoins",
    JSON.stringify(
      mapAbstraction.playerCoins.map((coin) => ({
        cell: coin.cell,
        serial: coin.serial,
      })),
    ),
  );
}

// loadKnownCaches loads the known caches from local storage.
function loadKnownCaches(board: BoardInterface) {
  const cacheJSON = localStorage.getItem("playerCaches");
  if (!cacheJSON) {
    return;
  }
  const parsedCaches = JSON.parse(cacheJSON!);
  for (let i = 0; i < parsedCaches.caches.length; i++) {
    board.knownCaches.set(parsedCaches.cacheKeys[i], parsedCaches.caches[i]);
  }
}

// newStorage creates a new storage object with a store, load, and clear method.
export function newStorage(): {
  storage: Storage;
  loadedPositions: leaflet.LatLng[][] | null;
} {
  const loadedPositions: leaflet.LatLng[][] | null = JSON.parse(
    localStorage.getItem("polyLines")!,
  );
  const storage: Storage = {
    // store saves the polylines, caches, current position, and player coins to local storage.
    store(
      polylines: PolylineAbstraction,
      board: BoardInterface,
      mapAbstraction: MapAbstraction,
    ) {
      try {
        savePolylines(polylines);
        saveCaches(board.knownCaches);
        saveCurrentPosition(mapAbstraction);
        savePlayerCoins(mapAbstraction);
      } catch (error) {
        console.error("Error saving data on unload:", error);
      }
    },
    // load loads the player's coins, position, and known caches from local storage.
    load(
      savedCoins: string | null,
      savedPosition: string | null,
      mapAbstraction: MapAbstraction,
      board: BoardInterface,
      defaultPosition: leaflet.LatLng,
    ) {
      savedCoins = localStorage.getItem("playerCoins");
      savedPosition = localStorage.getItem("currentPosition");

      if (savedPosition) {
        mapAbstraction.setPlayerMarker(JSON.parse(savedPosition));
      } else {
        mapAbstraction.setPlayerMarker(defaultPosition);
      }

      loadKnownCaches(board);

      // Load player coins
      if (savedCoins) {
        const allCoins = JSON.parse(savedCoins);
        materializeCoins(allCoins, mapAbstraction, board);
      }
    },
    // clear clears all local storage data.
    clear() {
      localStorage.removeItem("playerCaches"); // clear all caches
      localStorage.removeItem("playerPositions"); // clear all positions
      localStorage.removeItem("currentPosition"); // clear current position
      localStorage.removeItem("playerCoins"); // clear all coins
      localStorage.removeItem("polyLines"); // clear all polylines
    },
  };
  return { storage, loadedPositions };
}
