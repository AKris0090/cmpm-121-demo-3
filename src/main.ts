import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board, Cache, Cell, Coin, createCoin } from "./board.ts";

const playerCoins: Coin[] = [];

const OAKES_CLASSROOM_POSITION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
const ZOOM_LEVEL = 19;
const TILE_RADIUS = 8;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MAX_COINS_PER_CACHE = 5;

const board = new Board(
  TILE_DEGREES,
  TILE_RADIUS,
  CACHE_SPAWN_PROBABILITY,
  MAX_COINS_PER_CACHE,
);
const bus = new EventTarget();

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function redrawMap() {
  polyline.addLatLng(playerMarker.getLatLng());
  if (!map) return;
  map.eachLayer((layer: leaflet.TileLayer) => {
    if (!(layer instanceof leaflet.TileLayer)) {
      map.removeLayer(layer);
    }
  });
  board.clearVisibleCaches();

  playerMarker.addTo(map);
  polyline.addTo(map);
  const visibleCells = board.getCellsNearPoint(playerMarker.getLatLng());
  for (let i = 0; i < visibleCells.length; i++) {
    const cache = board.getCacheFromCell(visibleCells[i]);
    drawCache(cache, visibleCells[i]);
  }
}
bus.addEventListener("playerMoved", redrawMap);

let map: leaflet.Map;

let playerMarker: leaflet.Marker;

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

function updateStatusPanel() {
  statusPanel!.innerText = `You have ${playerCoins.length} coins:`;

  for (let i = 0; i < playerCoins.length; i++) {
    const coin = playerCoins[i];

    const coinInfo = document.createElement("div");
    coinInfo.innerText += coin.toString();
    statusPanel!.appendChild(coinInfo);

    createAddButton(coin.cell, statusPanel);
  }
}

function createAddButton(cell: Cell, panel: HTMLDivElement) {
  const newButton = document.createElement("button");
  newButton.innerText = "Locate Home";

  newButton.addEventListener("click", () => {
    centerOnPoint(cell);
  });

  panel.appendChild(newButton);
}

function updateCacheStatus(cache: Cache, popupDiv: HTMLDivElement) {
  popupDiv!.innerText = ``;
  for (let i = 0; i < cache.coins.length; i++) {
    const coin = cache.coins[i];

    const coinInfo = document.createElement("div");
    coinInfo.innerText += coin.toString();
    popupDiv!.appendChild(coinInfo);

    createAddButton(coin.cell, coinInfo);
  }
  updateStatusPanel();
}

function transferCoin(
  source: Coin[],
  target: Coin[],
  cache: Cache,
  popupDiv: HTMLDivElement,
) {
  if (source.length > 0) {
    const coin = source.pop()!;
    target.push(coin);
    updateCacheStatus(cache, popupDiv);
  }
}

function collectCoinFromCell(
  cache: Cache,
  cell: Cell,
  popupDiv: HTMLDivElement,
) {
  transferCoin(cache.coins, playerCoins, cache, popupDiv);
  board.saveCache(cell, cache);
}

function depositCoinToCell(cache: Cache, cell: Cell, popupDiv: HTMLDivElement) {
  transferCoin(playerCoins, cache.coins, cache, popupDiv);
  board.saveCache(cell, cache);
}

function createCachePopup(cache: Cache, cell: Cell): HTMLDivElement {
  const popupDiv = document.createElement("div");
  popupDiv!.innerHTML = `
              <div>There is a cache here at (${
    cell.x.toFixed(
      4,
    )
  },${cell.y.toFixed(4)}). It has coins: </div>`;

  const popupText = document.createElement("div");
  for (let i = 0; i < cache.coins.length; i++) {
    const coin = cache.coins[i];

    const coinInfo = document.createElement("div");
    coinInfo.innerText += coin.toString();
    popupText!.appendChild(coinInfo);

    createAddButton(coin.cell, coinInfo);
  }
  popupDiv!.appendChild(popupText);

  const getButton = document.createElement("button");
  getButton.innerText = "Collect coin";
  getButton.addEventListener("click", () => {
    collectCoinFromCell(cache, cell, popupText);
  });

  const putButton = document.createElement("button");
  putButton.innerText = "Deposit coin";
  putButton.addEventListener("click", () => {
    depositCoinToCell(cache, cell, popupText);
  });

  popupDiv!.appendChild(getButton);
  popupDiv!.appendChild(putButton);
  return popupDiv;
}

function drawCache(newCache: Cache, cell: Cell) {
  const rect = board.getCacheRectangle(cell);
  rect.addTo(map);

  rect.bindPopup(() => {
    return createCachePopup(newCache, cell);
  });
}

function movePlayerLatLang(lat: number, lng: number) {
  const currentPos = playerMarker.getLatLng();
  playerMarker.setLatLng(
    leaflet.latLng(currentPos.lat + lat, currentPos.lng + lng),
  );
  notify("playerMoved");
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

document.getElementById("resetPosition")!.addEventListener("click", () => {
  map.setView(playerMarker.getLatLng(), ZOOM_LEVEL);
});

function askQuestion(): Promise<boolean> {
  return new Promise((resolve) => {
    const answer = globalThis.confirm(
      "Are you sure you want to reset the game?",
    );
    resolve(answer);
  });
}

function clearHistory() {
  playerMarker.setLatLng(OAKES_CLASSROOM_POSITION);
  map.setView(OAKES_CLASSROOM_POSITION, ZOOM_LEVEL);
  localStorage.removeItem("playerCaches");
  localStorage.removeItem("playerPositions");
  localStorage.removeItem("currentPosition");
  localStorage.removeItem("playerCoins");
}

export function centerOnPoint(location: Cell) {
  map.setView(leaflet.latLng([location.x, location.y]), ZOOM_LEVEL);
  const currentMarker = leaflet.marker(
    leaflet.latLng([location.x, location.y]),
  );
  currentMarker.bindTooltip(
    `Coin collected from: ${location.x.toFixed(4)}, ${location.y.toFixed(4)}`,
  );
  currentMarker.addTo(map);
}

document.getElementById("reset")!.addEventListener("click", () => {
  askQuestion().then((response) => {
    if (response) {
      clearHistory();
      playerCoins.splice(0, playerCoins.length);
      updateStatusPanel();
      board.clearMemory();
      redrawMap();
    }
  });
});

const playerPositions: Cell[] = [];

const polyline = leaflet.polyline([], { color: "red" });

function onLocationFound(e: leaflet.LocationEvent) {
  const currentCell = board.getCellAtPoint({
    x: e.latlng.lat,
    y: e.latlng.lng,
  });
  if (!(currentCell === playerPositions[playerPositions.length - 1])) {
    playerMarker.setLatLng(e.latlng);
    playerPositions.push(e.latlng);
    polyline.addLatLng(e.latlng);
    redrawMap();
  }
}

function onLocationError(e: leaflet.LocationError) {
  alert(e.message);
}

document.getElementById("sensor")!.addEventListener("click", () => {
  map.locate({ setView: true, maxZoom: ZOOM_LEVEL });
});

globalThis.onload = () => {
  try {
    const savedCache = localStorage.getItem("playerCaches");
    const savedPositions = localStorage.getItem("playerPositions");
    const currentPos = localStorage.getItem("currentPosition");
    const savedCoins = localStorage.getItem("playerCoins");

    if (savedCoins) {
      const allCoins = JSON.parse(savedCoins);
      for (let i = 0; i < allCoins.length; i++) {
        playerCoins.push(createCoin(allCoins[i].cell, allCoins[i].serial));
      }
      updateStatusPanel();
    }

    if (savedPositions) {
      const positions = JSON.parse(savedPositions);
      const latLng = leaflet.latLng(positions.lat, positions.lng);
      playerPositions.push(latLng);
      map = leaflet.map(document.getElementById("map")!, {
        center: latLng,
        zoom: ZOOM_LEVEL,
        minZoom: ZOOM_LEVEL,
        maxZoom: ZOOM_LEVEL,
        zoomControl: false,
        scrollWheelZoom: false,
      });
    } else {
      map = leaflet.map(document.getElementById("map")!, {
        center: OAKES_CLASSROOM_POSITION,
        zoom: ZOOM_LEVEL,
        minZoom: ZOOM_LEVEL,
        maxZoom: ZOOM_LEVEL,
        zoomControl: false,
        scrollWheelZoom: false,
      });
    }

    playerMarker = leaflet.marker(OAKES_CLASSROOM_POSITION);

    if (savedCache && currentPos) {
      board.setKnownCaches(savedCache);
      const parsedLocation = JSON.parse(currentPos);
      playerMarker.setLatLng(
        leaflet.latLng(parsedLocation.lat, parsedLocation.lng),
      );
      if (parsedLocation && parsedLocation.lat && parsedLocation.lng) {
        map.setView([parsedLocation.lat, parsedLocation.lng], ZOOM_LEVEL);
      } else {
        console.warn("Parsed location data is incomplete:", parsedLocation);
      }
    }

    leaflet
      .tileLayer("https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png", {
        maxZoom: ZOOM_LEVEL,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
      .addTo(map);

    playerMarker.bindTooltip(`Your position`);
    playerMarker.addTo(map);

    polyline.addTo(map);

    map.on("locationfound", onLocationFound);
    map.on("locationerror", onLocationError);

    redrawMap(); // Call redrawMap after map is fully initialized
  } catch (error) {
    console.error("Error loading data on load:", error);
  }
};

globalThis.onbeforeunload = () => {
  try {
    // Save player positions, known caches, and current position to localStorage
    localStorage.setItem("playerPositions", JSON.stringify(playerPositions));
    localStorage.setItem("playerCaches", board.saveJSON());
    localStorage.setItem(
      "currentPosition",
      JSON.stringify(playerMarker.getLatLng()),
    );
    localStorage.setItem(
      "playerCoins",
      JSON.stringify(
        playerCoins.map((coin) => ({
          cell: coin.cell,
          serial: coin.serial,
        })),
      ),
    );
  } catch (error) {
    console.error("Error saving data on unload:", error);
  }
};

initializeMovementButtons();
