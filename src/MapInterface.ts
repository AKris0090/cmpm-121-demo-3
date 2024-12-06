import leaflet from "leaflet";
import { BoardInterface } from "./BoardInterface.ts";
import { PolylineAbstraction } from "./PolyLineInterface.ts";
import { Cache, Cell, Coin } from "./Pieces.ts";
import { UserInterfaceAbstraction } from "./UserInterface.ts";

// Player movement with arrow buttons
export function movePlayerLatLang(
  mapAbs: MapAbstraction,
  lat: number,
  lng: number,
) {
  const currentPos = mapAbs.playerMarker.getLatLng();
  mapAbs.setPlayerMarker(
    leaflet.latLng(currentPos.lat + lat, currentPos.lng + lng),
  );
}

// onLocationFound is called when the app receives a location update from the device
export function onLocationFound(
  userInterface: UserInterfaceAbstraction,
  board: BoardInterface,
  mapAbs: MapAbstraction,
  polylines: PolylineAbstraction,
  e: leaflet.LocationEvent,
) {
  const currentCell = board.getCellAtPoint({
    x: e.latlng.lat,
    y: e.latlng.lng,
  });
  if (!(currentCell === mapAbs.previousPlayerPosition)) {
    mapAbs.setPlayerMarker(e.latlng);
    mapAbs.previousPlayerPosition = currentCell;
    polylines.addPointToCurrentLine(e.latlng);
    userInterface.redrawMap();
  }
}

// onLocationError is called when the app receives an error from the device (e.g. location services are disabled)
export function onLocationError(e: leaflet.LocationError) {
  alert(e.message);
}

// transferCoinFromTo is a helper function that transfers a coin from one Coin array to another.
function transferCoinFromTo(source: Coin[], destination: Coin[]) {
  if (source.length > 0) {
    const latestCoin = source.pop()!;
    destination.push(latestCoin);
  }
}

// clearMap is a helper function that removes all objects from a map.
function clearMap(leafMap: leaflet.Map) {
  if (!leafMap) return;
  leafMap.eachLayer((mapLayer: leaflet.TileLayer) => {
    if (!(mapLayer instanceof leaflet.TileLayer)) {
      leafMap.removeLayer(mapLayer);
    }
  });
}

// createLocateButton is a helper function that creates a button to locate a coin's home (intial spawn).
function createLocateButton(
  mapAbs: MapAbstraction,
  homeCell: Cell,
  cachePanel: HTMLDivElement,
  tileWidth: number,
) {
  const newButton = document.createElement("button");
  newButton.innerText = "Locate Home";

  newButton.addEventListener("click", () => {
    const point: leaflet.latLng = leaflet.latLng(
      homeCell.x * tileWidth,
      homeCell.y * tileWidth,
    );
    mapAbs.reCenterOnPoint(point, true);
  });

  cachePanel.appendChild(newButton);
}

// createCoinDiv is a helper function that creates a div containing a list of coins and buttons to locate their homes.
export function createCoinDiv(
  mapAbs: MapAbstraction,
  coins: Coin[],
  tileWidth: number,
): HTMLDivElement {
  const popupText = document.createElement("div");
  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];

    const coinInfo = document.createElement("div");
    coinInfo.innerText += coin.toString();
    popupText!.appendChild(coinInfo);

    createLocateButton(mapAbs, coin.cell, coinInfo, tileWidth);
  }
  return popupText;
}

// updateCachePopup updates a cache's popup with its coins.
function updateCachePopup(
  mapAbs: MapAbstraction,
  popupDiv: HTMLDivElement,
  targetCache: Cache,
  tileWidth: number,
): void {
  popupDiv.innerText = ``;
  const coinDiv = createCoinDiv(mapAbs, targetCache.coins, tileWidth);
  popupDiv.appendChild(coinDiv);
}

// collectCoinFromCell collects a coin from a cell and transfers it to the player's coins.
function collectCoinFromCell(
  mapAbs: MapAbstraction,
  boardObj: BoardInterface,
  userInterface: UserInterfaceAbstraction,
  targetCache: Cache,
  popupDiv: HTMLDivElement,
) {
  transferCoinFromTo(targetCache.coins, mapAbs.playerCoins);
  // Update the cache momento
  boardObj.updateCacheMomento(targetCache);
  // Update the status panel and cache popup
  updateCachePopup(mapAbs, popupDiv, targetCache, boardObj.tileWidth);
  userInterface.updateStatusPanel(mapAbs, boardObj.tileWidth);
}
// depositCoinToCell deposits a coin to a cell and transfers it from the player's coins.
function depositCoinToCell(
  mapAbs: MapAbstraction,
  boardObj: BoardInterface,
  userInterface: UserInterfaceAbstraction,
  targetCache: Cache,
  popupDiv: HTMLDivElement,
) {
  transferCoinFromTo(mapAbs.playerCoins, targetCache.coins);
  // Update the cache momento
  boardObj.updateCacheMomento(targetCache);
  // Update the status panel and cache popup
  updateCachePopup(mapAbs, popupDiv, targetCache, boardObj.tileWidth);
  userInterface.updateStatusPanel(mapAbs, boardObj.tileWidth);
}

// createCachePopup is a helper function that creates a cache's popup containing its coins and buttons to collect or deposit coins.
function createCachePopup(
  mapAbs: MapAbstraction,
  boardObj: BoardInterface,
  currentCache: Cache,
  userInterface: UserInterfaceAbstraction,
): HTMLDivElement {
  const popupDiv = document.createElement("div");
  const xPosition: number = currentCache.cell.x * boardObj.tileWidth;
  const yPosition: number = currentCache.cell.y * boardObj.tileWidth;
  popupDiv!.innerHTML = `
                    <div>There is a cache here at (${
    xPosition.toFixed(
      4,
    )
  },${yPosition.toFixed(4)}). It has coins: </div>`;

  const popupText = createCoinDiv(
    mapAbs,
    currentCache.coins,
    boardObj.tileWidth,
  );
  popupDiv!.appendChild(popupText);

  const getButton = document.createElement("button");
  getButton.innerText = "Collect coin";
  getButton.addEventListener("click", () => {
    collectCoinFromCell(
      mapAbs,
      boardObj,
      userInterface,
      currentCache,
      popupText,
    );
  });

  const putButton = document.createElement("button");
  putButton.innerText = "Deposit coin";
  putButton.addEventListener("click", () => {
    depositCoinToCell(mapAbs, boardObj, userInterface, currentCache, popupText);
  });

  popupDiv!.appendChild(getButton);
  popupDiv!.appendChild(putButton);
  return popupDiv;
}

// drawCache draws the rectangle for a cache on the map at a cell.
function drawCache(
  mapAbs: MapAbstraction,
  boardObj: BoardInterface,
  currentCache: Cache,
  userInterface: UserInterfaceAbstraction,
): void {
  const rect = boardObj.getCacheRectangle(currentCache.cell);
  rect.addTo(mapAbs.leafMap);

  rect.bindPopup(() => {
    return createCachePopup(mapAbs, boardObj, currentCache, userInterface);
  });
}

// MapAbstraction is an interface that represents a map. It provides methods to center
// on a point, redraw the map, set the player marker, draw a cache, collect a coin from
// a cell, deposit a coin to a cell, and create a cache popup.
export interface MapAbstraction {
  leafMap: leaflet.Map;
  mapZoom: number;
  playerMarker: leaflet.Marker;
  playerCoins: Coin[];
  previousPlayerPosition: Cell;

  reCenterOnPoint(position: leaflet.latlng, showMarker: boolean): void;
  redrawMap(
    boardObj: BoardInterface,
    polylineAbs: PolylineAbstraction,
    userInterface: UserInterfaceAbstraction,
  ): void;
  setPlayerMarker(targetPosition: leaflet.latLng): void;
}

// newMapAbstraction creates and returns a new MapAbstraction object with a map, zoom level, default position, player marker, and player coins.
export function newMapAbstraction(
  zoomLevel: number,
  defaultPosition: leaflet.LatLng,
): MapAbstraction {
  const newMapAbstraction: MapAbstraction = {
    leafMap: leaflet.map(document.getElementById("map")!, {
      center: defaultPosition,
      zoom: zoomLevel,
      minZoom: zoomLevel,
      maxZoom: zoomLevel,
      zoomControl: false,
      scrollWheelZoom: false,
    }),
    mapZoom: zoomLevel,
    playerMarker: leaflet.marker(defaultPosition),
    playerCoins: [],
    previousPlayerPosition: { x: 0, y: 0 },

    // reCenterOnPoint centers the map on a point and optionally shows a marker.
    reCenterOnPoint(position: leaflet.latLng, showMarker: boolean = false) {
      this.leafMap.setView(position, this.mapZoom);
      if (showMarker) {
        const currentMarker = leaflet.marker(leaflet.latLng(position));
        currentMarker.bindTooltip(
          `Coin collected from: ${
            position.lat.toFixed(
              4,
            )
          }, ${position.lng.toFixed(4)}`,
        );
        currentMarker.addTo(this.leafMap);
      }
    },

    // redrawMap redraws the map, clears the board's visible caches and draws all polylines.
    redrawMap(
      boardObj: BoardInterface,
      polylineAbs: PolylineAbstraction,
      userInterface: UserInterfaceAbstraction,
    ) {
      clearMap(this.leafMap);
      boardObj.clearVisibleCaches();

      this.playerMarker.addTo(this.leafMap);
      polylineAbs.drawPolylines(this.leafMap);
      const visibleCells = boardObj.getCellsNearPoint(
        this.playerMarker.getLatLng(),
        this,
      );
      for (let i = 0; i < visibleCells.length; i++) {
        const cache = boardObj.getCacheFromCell(visibleCells[i]);
        drawCache(this, boardObj, cache, userInterface);
      }
    },

    // setPlayerMarker sets the player marker to a position and re-centers the map on that position.
    setPlayerMarker(targetPosition: leaflet.latLng) {
      this.playerMarker.setLatLng(targetPosition);
      this.reCenterOnPoint(targetPosition, false);
    },
  };

  // Add the background tile layer to the map
  leaflet
    .tileLayer("https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png", {
      maxZoom: newMapAbstraction.mapZoom,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(newMapAbstraction.leafMap);

  // Add the player marker to the map
  newMapAbstraction.playerMarker.bindTooltip(`Your position`);
  newMapAbstraction.playerMarker.addTo(newMapAbstraction.leafMap);

  return newMapAbstraction;
}
