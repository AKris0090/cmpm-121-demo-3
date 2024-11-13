import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board, Cache, Cell, Coin } from "./board.ts";

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
  map.eachLayer((layer: leaflet.TileLayer) => {
    if (!(layer instanceof leaflet.TileLayer)) {
      map.removeLayer(layer);
    }
  });
  board.clearVisibleCaches();

  playerMarker.addTo(map);
  const visibleCells = board.getCellsNearPoint(playerMarker.getLatLng());
  for (let i = 0; i < visibleCells.length; i++) {
    const cache = board.getCacheFromCell(visibleCells[i]);
    drawCache(cache, visibleCells[i]);
  }
}
bus.addEventListener("playerMoved", redrawMap);

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM_POSITION,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png", {
    maxZoom: ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(OAKES_CLASSROOM_POSITION);
playerMarker.bindTooltip(`Your position`);
playerMarker.addTo(map);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

function updateCacheStatus(cache: Cache, popupDiv: HTMLDivElement) {
  const popupText = popupDiv.querySelector<HTMLSpanElement>("#value");
  popupText!.innerHTML = "";
  popupText!.innerHTML = cache.coins.map((coin) => coin.toString()).join("");
  statusPanel!.innerHTML =
    `<pre>You have ${playerCoins.length} coins: \n</pre>`;
  statusPanel!.innerHTML += playerCoins.map((coin) => coin.toString()).join("");
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

function collectCoinFromCell(cache: Cache, popupDiv: HTMLDivElement) {
  transferCoin(cache.coins, playerCoins, cache, popupDiv);
}

function depositCoinToCell(cache: Cache, popupDiv: HTMLDivElement) {
  transferCoin(playerCoins, cache.coins, cache, popupDiv);
}

function createCachePopup(cache: Cache, cell: Cell): HTMLDivElement {
  const popupDiv = document.createElement("div");
  popupDiv!.innerHTML = `
              <div>There is a cache here at (${
    cell.x.toFixed(
      4,
    )
  },${
    cell.y.toFixed(
      4,
    )
  }). It has coins: <span id='value'></span></div>`;

  const popupText = popupDiv.querySelector<HTMLSpanElement>("#value");
  for (let i = 0; i < cache.coins.length; i++) {
    popupText!.innerHTML += cache.coins[i].toString();
  }

  const getButton = document.createElement("button");
  getButton.innerText = "Collect coin";
  getButton.addEventListener("click", () => {
    collectCoinFromCell(cache, popupDiv);
  });

  const putButton = document.createElement("button");
  putButton.innerText = "Deposit coin";
  putButton.addEventListener("click", () => {
    depositCoinToCell(cache, popupDiv);
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
initializeMovementButtons();
redrawMap();

function onLocationFound(e: leaflet.LocationEvent) {
  playerMarker.setLatLng(e.latlng);
  redrawMap();
}

function onLocationError(e: leaflet.LocationError) {
  alert(e.message);
}

map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

document.getElementById("sensor")!.addEventListener("click", () => {
  map.locate({ setView: true, maxZoom: ZOOM_LEVEL });
});
