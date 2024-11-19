import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import {
  newPolylineAbstraction,
  PolylineAbstraction,
} from "./PolyLineInterface.ts";
import { MapAbstraction, newMapAbstraction } from "./MapInterface.ts";
import { BoardInterface, newBoard } from "./BoardInterface.ts";
import { Cell, createCoin } from "./Pieces.ts";

// Constants
const OAKES_CLASSROOM_POSITION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
const ZOOM_LEVEL = 19;
const TILE_RADIUS = 8;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MAX_COINS_PER_CACHE = 5;

// Global variables
let board: BoardInterface;
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
  mapAbstraction.reCenterOnPoint(
    mapAbstraction.playerMarker.getLatLng(),
    false,
  );
}
// Redraw map on player movement
bus.addEventListener("redraw", redrawMap);

// Player movement with arrow buttons
function movePlayerLatLang(lat: number, lng: number) {
  const currentPos = mapAbstraction.playerMarker.getLatLng();
  mapAbstraction.setPlayerMarker(
    leaflet.latLng(currentPos.lat + lat, currentPos.lng + lng),
  );
  notify("redraw");
}

// Setup movement buttons
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

// onLocationFound is called when the app receives a location update from the device
function onLocationFound(e: leaflet.LocationEvent) {
  const currentCell = board.getCellAtPoint({
    x: e.latlng.lat,
    y: e.latlng.lng,
  });
  if (!(currentCell === previousPlayerPosition)) {
    mapAbstraction.setPlayerMarker(e.latlng);
    previousPlayerPosition = currentCell;
    polylines.addPointToCurrentLine(e.latlng);
    notify("redraw");
  }
}

// onLocationError is called when the app receives an error from the device (e.g. location services are disabled)
function onLocationError(e: leaflet.LocationError) {
  alert(e.message);
}

// Event listeners for buttons

// Pressing the sensor button binds the locationfound and locationerror events to the map
document.getElementById("sensor")!.addEventListener("click", () => {
  mapAbstraction.leafMap.locate({ setView: true, maxZoom: ZOOM_LEVEL });
  mapAbstraction.reCenterOnPoint(
    mapAbstraction.playerMarker.getLatLng(),
    false,
  );
  mapAbstraction.leafMap.on("locationfound", onLocationFound);
  mapAbstraction.leafMap.on("locationerror", onLocationError);
  polylines.createPolyline();
});

// Pressing the reset button resets the map to the default position
document.getElementById("resetPosition")!.addEventListener("click", () => {
  mapAbstraction.reCenterOnPoint(
    mapAbstraction.playerMarker.getLatLng(),
    false,
  );
});

// Reset functions to clear all player data
function clearHistory() {
  mapAbstraction.setPlayerMarker(OAKES_CLASSROOM_POSITION); // reset player position
  mapAbstraction.playerCoins.splice(0, mapAbstraction.playerCoins.length); // clear all coins
  localStorage.removeItem("playerCaches"); // clear all caches
  localStorage.removeItem("playerPositions"); // clear all positions
  localStorage.removeItem("currentPosition"); // clear current position
  localStorage.removeItem("playerCoins"); // clear all coins
  mapAbstraction.updateStatusPanel(board.tileWidth); // reset status panel
  board.clearMemory(); // reset all caches to default states
  polylines.clearPolylines(); // clear all polylines/paths
  polylines.createPolyline(); // create a new path
}

// Reset button with confirmation promise
document.getElementById("reset")!.addEventListener("click", () => {
  askQuestion().then((response) => {
    if (response) {
      // if user confirms reset
      clearHistory(); // clear all history, reset map
      notify("redraw"); // redraw map
    }
  });
});

// Save player coins to local storage
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
    board.saveAllCaches();
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
    // Load map, board, and polylines
    const defaultPosition = leaflet.latLng(
      36.98949379578401,
      -122.06277128548504,
    );
    const savedCoins = localStorage.getItem("playerCoins");
    const savedPosition = localStorage.getItem("currentPosition");
    const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;

    // Initialize map, board, and polylines
    mapAbstraction = newMapAbstraction(
      ZOOM_LEVEL,
      defaultPosition,
      statusPanel,
    );
    if (savedPosition) {
      mapAbstraction.setPlayerMarker(JSON.parse(savedPosition));
    } else {
      mapAbstraction.setPlayerMarker(defaultPosition);
    }

    board = newBoard(
      TILE_DEGREES,
      TILE_RADIUS,
      CACHE_SPAWN_PROBABILITY,
      MAX_COINS_PER_CACHE,
    );
    board.loadKnownCaches();

    polylines = newPolylineAbstraction();
    polylines.loadPolylines(mapAbstraction.leafMap);

    // Load player coins
    if (savedCoins) {
      const allCoins = JSON.parse(savedCoins);
      for (let i = 0; i < allCoins.length; i++) {
        mapAbstraction.playerCoins.push(
          createCoin(allCoins[i].cell, allCoins[i].serial, board.tileWidth),
        );
      }
      mapAbstraction.updateStatusPanel(board.tileWidth);
    }

    notify("redraw");
  } catch (error) {
    console.error("Error loading data on load:", error);
  }
};

// Initialize movement buttons
initializeMovementButtons();
