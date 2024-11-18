import leaflet from "leaflet";
import { Board } from "./board.ts";
import { PolylineAbstraction } from "./polylineAbstraction.ts";
import { Cache, Cell, Coin } from "./boardPieces.ts";

export interface MapAbstraction {
  map: leaflet.Map;
  playerMarker: leaflet.Marker;
  zoom: number;
  playerCoins: Coin[];

  centerOnPoint(cell: leaflet.latlng, showMarker: boolean): void;
  clearMap(): void;
  addToMap(object: leaflet.object): void;
  redrawMap(board: Board, polyLine: leaflet.Polyline): void;
  setPlayerMarker(cell: Cell): void;
  centerGeoPosition(): void;
  drawCache(board: Board, newCache: Cache, cell: Cell): void;
  transferCoin(
    board: Board,
    source: Coin[],
    target: Coin[],
    cache: Cache,
    popupDiv: HTMLDivElement,
  ): void;
  collectCoinFromCell(
    board: Board,
    cache: Cache,
    cell: Cell,
    popupDiv: HTMLDivElement,
  ): void;
  depositCoinToCell(
    board: Board,
    cache: Cache,
    cell: Cell,
    popupDiv: HTMLDivElement,
  ): void;
  createCachePopup(board: Board, cache: Cache, cell: Cell): HTMLDivElement;
}

export function newMapAbstraction(
  zoomLevel: number,
  defaultPosition: leaflet.LatLng,
): MapAbstraction {
  const newMapAbstraction: MapAbstraction = {
    map: leaflet.map(document.getElementById("map")!, {
      center: defaultPosition,
      zoom: zoomLevel,
      minZoom: zoomLevel,
      maxZoom: zoomLevel,
      zoomControl: false,
      scrollWheelZoom: false,
    }),
    zoom: zoomLevel,
    playerMarker: leaflet.marker(defaultPosition),
    playerCoins: [],
    centerOnPoint(point: leaflet.latLng, showMarker: boolean = false) {
      this.map.setView(point, this.zoom);
      if (showMarker) {
        const currentMarker = leaflet.marker(leaflet.latLng(point));
        currentMarker.bindTooltip(
          `Coin collected from: ${point.lat.toFixed(4)}, ${
            point.lng.toFixed(
              4,
            )
          }`,
        );
        this.addToMap(currentMarker);
      }
    },
    clearMap() {
      if (!this.map) return;
      this.map.eachLayer((layer: leaflet.TileLayer) => {
        if (!(layer instanceof leaflet.TileLayer)) {
          this.map.removeLayer(layer);
        }
      });
    },
    addToMap(object: leaflet.object) {
      object.addTo(this.map);
    },
    redrawMap(board: Board, polyLine: PolylineAbstraction) {
      this.clearMap();
      board.clearVisibleCaches();

      this.addToMap(this.playerMarker);
      polyLine.drawPolylines(this.map);
      const visibleCells = board.getCellsNearPoint(
        this.playerMarker.getLatLng(),
        this,
      );
      for (let i = 0; i < visibleCells.length; i++) {
        const cache = board.getCacheFromCell(visibleCells[i]);
        this.drawCache(board, cache, visibleCells[i]);
      }
    },
    setPlayerMarker(position: leaflet.latLng) {
      this.playerMarker.setLatLng(position);
    },
    centerGeoPosition() {
      this.map.locate({ setView: true, maxZoom: this.zoom });
    },
    drawCache(board: Board, newCache: Cache, cell: Cell) {
      const rect = board.getCacheRectangle(cell);
      rect.addTo(this.map);

      rect.bindPopup(() => {
        return this.createCachePopup(board, newCache, cell);
      });
    },
    transferCoin(
      board: Board,
      source: Coin[],
      target: Coin[],
      cache: Cache,
      popupDiv: HTMLDivElement,
    ) {
      if (source.length > 0) {
        const coin = source.pop()!;
        target.push(coin);
        board.updateCacheStatus(this, cache, popupDiv);
        board.updateStatusPanel(this);
      }
    },
    collectCoinFromCell(
      board: Board,
      cache: Cache,
      cell: Cell,
      popupDiv: HTMLDivElement,
    ) {
      this.transferCoin(board, cache.coins, this.playerCoins, cache, popupDiv);
      board.saveCache(cell, cache);
    },
    depositCoinToCell(
      board: Board,
      cache: Cache,
      cell: Cell,
      popupDiv: HTMLDivElement,
    ) {
      this.transferCoin(board, this.playerCoins, cache.coins, cache, popupDiv);
      board.saveCache(cell, cache);
    },
    createCachePopup(board: Board, cache: Cache, cell: Cell): HTMLDivElement {
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

        board.createLocateButton(this, coin.cell, coinInfo);
      }
      popupDiv!.appendChild(popupText);

      const getButton = document.createElement("button");
      getButton.innerText = "Collect coin";
      getButton.addEventListener("click", () => {
        this.collectCoinFromCell(board, cache, cell, popupText);
      });

      const putButton = document.createElement("button");
      putButton.innerText = "Deposit coin";
      putButton.addEventListener("click", () => {
        this.depositCoinToCell(board, cache, cell, popupText);
      });

      popupDiv!.appendChild(getButton);
      popupDiv!.appendChild(putButton);
      return popupDiv;
    },
  };

  leaflet
    .tileLayer("https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png", {
      maxZoom: newMapAbstraction.zoom,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    .addTo(newMapAbstraction.map);

  newMapAbstraction.playerMarker.bindTooltip(`Your position`);
  newMapAbstraction.playerMarker.addTo(newMapAbstraction.map);

  return newMapAbstraction;
}
