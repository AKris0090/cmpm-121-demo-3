import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board, Cache, Cell, Coin } from "./board.ts";

const playerCoins: Coin[] = [];

const OAKES_CLASSROOM_POSITION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
const ZOOM_LEVEL = 19;
const TILE_RADIUS = 10;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;

const board = new Board(TILE_DEGREES, TILE_RADIUS);

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

function updateCellAndStatus(cache: Cache, popupDiv: HTMLDivElement) {
  const popupText = popupDiv.querySelector<HTMLSpanElement>("#value");
  popupText!.innerHTML = "";
  for (let i = 0; i < cache.coins.length; i++) {
    popupText!.innerHTML += cache.coins[i].toString();
  }
  statusPanel!.innerHTML =
    `<pre>You have ${playerCoins.length} coins: \n</pre>`;
  for (let i = 0; i < playerCoins.length; i++) {
    const coin = playerCoins[i];
    statusPanel!.innerHTML! += coin.toString();
  }
}

function collectCoinFromCell(cache: Cache, popupDiv: HTMLDivElement) {
  if (cache.coins.length > 0) {
    const currentCoin = cache.coins.pop()!;
    playerCoins.push(currentCoin);
    updateCellAndStatus(cache, popupDiv);
  }
}

function depositCoinToCell(cache: Cache, popupDiv: HTMLDivElement) {
  if (playerCoins.length > 0) {
    const currentCoin = playerCoins.pop()!;
    cache.coins.push(currentCoin);
    updateCellAndStatus(cache, popupDiv);
  }
}

function spawnCache(cell: Cell) {
  const rect = leaflet.rectangle(board.getCellBounds(cell));
  rect.addTo(map);

  rect.bindPopup(() => {
    const popupDiv = board.getCellDiv(cell);
    const cache = board.getCellCache(cell);
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
    popupDiv!.appendChild(getButton);
    const putButton = document.createElement("button");
    putButton.innerText = "Deposit coin";
    popupDiv!.appendChild(putButton);
    getButton.addEventListener("click", () => {
      collectCoinFromCell(cache, popupDiv);
    });
    putButton.addEventListener("click", () => {
      depositCoinToCell(cache, popupDiv);
    });
    return popupDiv;
  });
}

board.getCellsNearPoint(playerMarker.getLatLng()).forEach((cell) => {
  if (luck([cell.x, cell.y].toString()) < CACHE_SPAWN_PROBABILITY) {
    spawnCache(cell);
  }
});
