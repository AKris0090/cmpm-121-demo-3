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
import { newStorage, Storage } from "./Storage.ts";
import {
  newUserInterfaceAbstraction,
  UserInterfaceAbstraction,
} from "./UserInterface.ts";

// Constants
const OAKES_CLASSROOM_POSITION: leaflet.LatLng = leaflet.latLng(
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
let polylines: PolylineAbstraction;
let mapAbstraction: MapAbstraction;
let storageSystem: Storage;
let userInterface: UserInterfaceAbstraction;

// Save player data on unload
globalThis.onbeforeunload = () => {
  storageSystem.store(polylines, board, mapAbstraction);
};

// Load player data from local storage
globalThis.onload = () => {
  try {
    const savedCoins: string | null = null;
    const savedPosition: string | null = null;

    // Initialize map, board, storage and polyline abstractions
    mapAbstraction = newMapAbstraction(ZOOM_LEVEL, OAKES_CLASSROOM_POSITION);
    board = newBoard(
      TILE_DEGREES,
      TILE_RADIUS,
      CACHE_SPAWN_PROBABILITY,
      MAX_COINS_PER_CACHE,
    );

    const { storage, loadedPositions } = newStorage();
    storageSystem = storage;
    storageSystem.load(
      savedCoins,
      savedPosition,
      mapAbstraction,
      board,
      OAKES_CLASSROOM_POSITION,
    );

    // load polylines from local storage
    polylines = newPolylineAbstraction();
    console.log("loadedPositions", loadedPositions);
    polylines.drawLoadedPolylines(mapAbstraction.leafMap, loadedPositions);

    // Initialize user interface
    userInterface = newUserInterfaceAbstraction(
      polylines,
      mapAbstraction,
      board,
    );
    // Initialize all buttons and event listeners, and redraw the map
    userInterface.startUserInterface(
      OAKES_CLASSROOM_POSITION,
      TILE_DEGREES,
      ZOOM_LEVEL,
    );
  } catch (error) {
    console.error("Error loading data on load:", error);
  }
};
