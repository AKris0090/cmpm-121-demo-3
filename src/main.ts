import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import {
  newPolylineAbstraction,
  PolylineAbstraction,
} from "./polylineAbstraction.ts";
import { MapAbstraction, newMapAbstraction } from "./mapAbstraction.ts";
import { Board } from "./board.ts";
import { Cell, createCoin } from "./boardPieces.ts";

const OAKES_CLASSROOM_POSITION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
const ZOOM_LEVEL = 19;
const TILE_RADIUS = 8;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MAX_COINS_PER_CACHE = 5;

let board: Board;

let previousPlayerPosition: Cell;
let polylines: PolylineAbstraction;
let mapAbstraction: MapAbstraction;

// Event bus for player movement
const bus = new EventTarget();
function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}
function redrawMap() {
  polylines.addPointToCurrentLine(mapAbstraction.playerMarker.getLatLng());
  mapAbstraction.redrawMap(board, polylines);
  mapAbstraction.centerOnPoint(mapAbstraction.playerMarker.getLatLng(), false);
}
bus.addEventListener("redraw", redrawMap);

// Player movement with arrow buttons
function movePlayerLatLang(lat: number, lng: number) {
  const currentPos = mapAbstraction.playerMarker.getLatLng();
  mapAbstraction.setPlayerMarker(
    leaflet.latLng(currentPos.lat + lat, currentPos.lng + lng),
  );
  notify("redraw");
}

function initializeMovementButtons() {
  [
    { id: "north", lat: TILE_DEGREES, lng: 0 },
    { id: "south", lat: -TILE_DEGREES, lng: 0 },
    { id: "west", lat: 0, lng: -TILE_DEGREES },
    { id: "east", lat: 0, lng: TILE_DEGREES },
  ].forEach(({ id, lat, lng }) => {
    document
      .getElementById(id)!
      .addEventListener("click", () => movePlayerLatLang(lat, lng));
  });
}

// Geolocation functions for player movement
function askQuestion(): Promise<boolean> {
  return new Promise((resolve) => {
    const answer = globalThis.confirm(
      "Are you sure you want to reset the game?",
    );
    resolve(answer);
  });
}

function onLocationFound(e: leaflet.LocationEvent) {
  const currentCell = board.getCellAtPoint({
    x: e.latlng.lat,
    y: e.latlng.lng,
  });
  if (!(currentCell === previousPlayerPosition)) {
    mapAbstraction.setPlayerMarker(e.latlng);
    mapAbstraction.centerOnPoint(e.latlng, false);
    previousPlayerPosition = currentCell;
    polylines.addPointToCurrentLine(e.latlng);
    notify("redraw");
  }
}

function onLocationError(e: leaflet.LocationError) {
  alert(e.message);
}

document.getElementById("sensor")!.addEventListener("click", () => {
  mapAbstraction.centerGeoPosition();
  polylines.createPolyline();
});

document.getElementById("resetPosition")!.addEventListener("click", () => {
  mapAbstraction.centerOnPoint(mapAbstraction.playerMarker.getLatLng(), false);
});

// Reset functions to clear all player data
function clearHistory() {
  mapAbstraction.playerMarker.setLatLng(OAKES_CLASSROOM_POSITION);
  mapAbstraction.centerOnPoint(OAKES_CLASSROOM_POSITION, false);
  mapAbstraction.playerCoins.splice(0, mapAbstraction.playerCoins.length);
  localStorage.removeItem("playerCaches");
  localStorage.removeItem("playerPositions");
  localStorage.removeItem("currentPosition");
  localStorage.removeItem("playerCoins");
}

document.getElementById("reset")!.addEventListener("click", () => {
  askQuestion().then((response) => {
    if (response) {
      clearHistory(); // clear localStorage, playerMarker, playerCoins
      board.updateStatusPanel(mapAbstraction); // reset status panel
      board.clearMemory(); // reset all caches to default states
      polylines.clearPolylines(); // clear all polylines/paths
      notify("redraw"); // redraw map
    }
  });
});

function saveCoins() {
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

// Save player data on unload
globalThis.onbeforeunload = () => {
  try {
    polylines.savePolylines();
    board.saveCaches();
    localStorage.setItem(
      "currentPosition",
      JSON.stringify(mapAbstraction.playerMarker.getLatLng()),
    );
    saveCoins();
  } catch (error) {
    console.error("Error saving data on unload:", error);
  }
};

// Load player data from local storage
globalThis.onload = () => {
  try {
    const defaultPosition = leaflet.latLng(
      36.98949379578401,
      -122.06277128548504,
    );
    const savedCoins = localStorage.getItem("playerCoins");
    const savedPosition = localStorage.getItem("currentPosition");

    mapAbstraction = newMapAbstraction(ZOOM_LEVEL, defaultPosition);
    if (savedPosition) {
      mapAbstraction.setPlayerMarker(JSON.parse(savedPosition));
      mapAbstraction.centerOnPoint(JSON.parse(savedPosition), false);
    } else {
      mapAbstraction.setPlayerMarker(defaultPosition);
      mapAbstraction.centerOnPoint(defaultPosition, false);
    }

    const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
    board = new Board(
      TILE_DEGREES,
      TILE_RADIUS,
      CACHE_SPAWN_PROBABILITY,
      MAX_COINS_PER_CACHE,
      statusPanel,
    );
    board.loadKnownCaches();

    polylines = newPolylineAbstraction();
    polylines.loadPolylines(mapAbstraction.map);

    mapAbstraction.map.on("locationfound", onLocationFound);
    mapAbstraction.map.on("locationerror", onLocationError);

    if (savedCoins) {
      const allCoins = JSON.parse(savedCoins);
      for (let i = 0; i < allCoins.length; i++) {
        mapAbstraction.playerCoins.push(
          createCoin(allCoins[i].cell, allCoins[i].serial, mapAbstraction),
        );
      }
      board.updateStatusPanel(mapAbstraction);
    }

    redrawMap();
  } catch (error) {
    console.error("Error loading data on load:", error);
  }
};

// Initialize movement buttons
initializeMovementButtons();
