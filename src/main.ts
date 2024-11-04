import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

let playerPoints = 0;

const OAKES_CLASSROOM_POSITION = leaflet.latLng(
  36.98949379578401,
  -122.06277128548504,
);
const ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const MAX_COINS = 100;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

interface Cache {
  numCoins: number;
}

interface Cell {
  readonly x: number;
  readonly y: number;
  cache: Cache;
  popupDiv: HTMLDivElement;
}

const cells: Cell[] = [];

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM_POSITION,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
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

function updateCellAndStatus(cell: Cell) {
  cell.popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cell.cache
    .numCoins.toString();
  statusPanel.innerHTML = `You have: ${playerPoints} points.`;
}

function collectCoinFromCell(cell: Cell) {
  if (cell.cache.numCoins > 0) {
    cell.cache.numCoins--;
    playerPoints++;
    updateCellAndStatus(cell);
  }
}

function depositCoinToCell(cell: Cell) {
  if (playerPoints > 0) {
    playerPoints--;
    cell.cache.numCoins++;
    updateCellAndStatus(cell);
  }
}

function spawnCache(x: number, y: number): Cell {
  const currentCell: Cell = {
    x,
    y,
    cache: {
      numCoins: Math.floor(luck([x, y, "initialValue"].toString()) * MAX_COINS),
    },
    popupDiv: document.createElement("div"),
  };
  const origin = OAKES_CLASSROOM_POSITION;
  const bounds = leaflet.latLngBounds([
    [origin.lat + x * TILE_DEGREES, origin.lng + y * TILE_DEGREES],
    [origin.lat + (x + 1) * TILE_DEGREES, origin.lng + (y + 1) * TILE_DEGREES],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    currentCell.popupDiv.innerHTML = `
                <div>There is a cache here at (${x},${y}). It has <span id="value">${currentCell.cache.numCoins}</span> coins.</div>`;
    const getButton = document.createElement("button");
    getButton.innerText = "Collect coin";
    currentCell.popupDiv.appendChild(getButton);
    const putButton = document.createElement("button");
    putButton.innerText = "Deposit coin";
    currentCell.popupDiv.appendChild(putButton);
    getButton.addEventListener("click", () => {
      collectCoinFromCell(currentCell);
    });
    putButton.addEventListener("click", () => {
      depositCoinToCell(currentCell);
    });
    return currentCell.popupDiv;
  });
  return currentCell;
}

for (let x = -NEIGHBORHOOD_SIZE; x < NEIGHBORHOOD_SIZE; x++) {
  for (let y = -NEIGHBORHOOD_SIZE; y < NEIGHBORHOOD_SIZE; y++) {
    if (luck([x, y].toString()) < CACHE_SPAWN_PROBABILITY) {
      cells.push(spawnCache(x, y));
    }
  }
}
