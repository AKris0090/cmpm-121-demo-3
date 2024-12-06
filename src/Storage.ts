import leaflet from "leaflet";
import { Cell } from "./Pieces.ts";
import { PolylineAbstraction } from "./PolyLineInterface.ts";
import { MapAbstraction } from "./MapInterface.ts";
import { BoardInterface, materializeCoins } from "./BoardInterface.ts";

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

function savePolylines(polylines: PolylineAbstraction) {
  const positions: Cell[][] = [];
  for (let i = 0; i < polylines.polyLineArray.length; i++) {
    if (polylines.polyLineArray[i].getLatLngs().length > 1) {
      positions.push(polylines.polyLineArray[i].getLatLngs());
    }
  }
  localStorage.setItem("polyLines", JSON.stringify(positions));
}

function saveCaches(knownCaches: Map<string, string>) {
  localStorage.setItem(
    "playerCaches",
    JSON.stringify({
      cacheKeys: Array.from(knownCaches.keys()),
      caches: Array.from(knownCaches.values()),
    }),
  );
}

function saveCurrentPosition(mapAbstraction: MapAbstraction) {
  localStorage.setItem(
    "currentPosition",
    JSON.stringify(mapAbstraction.playerMarker.getLatLng()),
  );
}

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

export function newStorage(): {
  storage: Storage;
  loadedPositions: leaflet.LatLng[][] | null;
} {
  const loadedPositions: leaflet.LatLng[][] | null = JSON.parse(
    localStorage.getItem("polyLines")!,
  );
  const storage: Storage = {
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
