import * as leaflet from "leaflet";
import { PolylineAbstraction } from "./PolyLineInterface.ts";
import {
  createCoinDiv,
  MapAbstraction,
  movePlayerLatLang,
  onLocationError,
  onLocationFound,
} from "./MapInterface.ts";
import { BoardInterface, clearHistory } from "./BoardInterface.ts";

// Geolocation functions for player movement
function askQuestion(): Promise<boolean> {
  return new Promise((resolve) => {
    const answer = globalThis.confirm(
      "Are you sure you want to reset the game?",
    );
    resolve(answer);
  });
}

export interface UserInterfaceAbstraction {
  polylines: PolylineAbstraction;
  mapAbstraction: MapAbstraction;
  board: BoardInterface;
  statusPanel: HTMLDivElement;

  startUserInterface(
    defaultPosition: leaflet.LatLng,
    tileDegrees: number,
    zoomLevel: number,
  ): void;
  redrawMap(): void;
  updateStatusPanel(mapAbs: MapAbstraction, tileWidth: number): void;
}

export function newUserInterfaceAbstraction(
  polylines: PolylineAbstraction,
  mapAbstraction: MapAbstraction,
  board: BoardInterface,
): UserInterfaceAbstraction {
  const userInterface: UserInterfaceAbstraction = {
    polylines: polylines,
    mapAbstraction: mapAbstraction,
    board: board,
    statusPanel: document.getElementById("statusPanel") as HTMLDivElement,

    startUserInterface(
      defaultPosition: leaflet.LatLng,
      tileDegrees: number,
      zoomLevel: number,
    ): void {
      // Event listeners for buttons
      [
        { id: "north", lat: tileDegrees, lng: 0 },
        { id: "south", lat: -tileDegrees, lng: 0 },
        { id: "west", lat: 0, lng: -tileDegrees },
        { id: "east", lat: 0, lng: tileDegrees },
      ].forEach(({ id, lat, lng }) => {
        document.getElementById(id)!.addEventListener("click", () => {
          movePlayerLatLang(mapAbstraction, lat, lng);
          this.redrawMap();
        });
      });

      // Pressing the reset button resets the map to the default position
      document
        .getElementById("resetPosition")!
        .addEventListener("click", () => {
          mapAbstraction.reCenterOnPoint(
            mapAbstraction.playerMarker.getLatLng(),
            false,
          );
        });

      // Reset button with confirmation promise
      document.getElementById("reset")!.addEventListener("click", () => {
        askQuestion().then((response) => {
          if (response) {
            // if user confirms reset
            clearHistory(
              defaultPosition,
              mapAbstraction,
              board,
              this,
              polylines,
            ); // clear all history, reset map
            this.redrawMap();
          }
        });
      });

      // Pressing the sensor button binds the locationfound and locationerror events to the map
      document.getElementById("sensor")!.addEventListener("click", () => {
        mapAbstraction.leafMap.locate({ setView: true, maxZoom: zoomLevel });
        mapAbstraction.reCenterOnPoint(
          mapAbstraction.playerMarker.getLatLng(),
          false,
        );
        mapAbstraction.leafMap.on(
          "locationfound",
          (e: leaflet.LocationEvent) => {
            onLocationFound(this, board, mapAbstraction, polylines, e);
          },
        );
        mapAbstraction.leafMap.on(
          "locationerror",
          (e: leaflet.LocationEvent) => {
            onLocationError(e);
          },
        );
        polylines.createPolyline();
      });

      this.updateStatusPanel(mapAbstraction, board.tileWidth);
      this.redrawMap();
    },
    // Redraws the polylines on the map, then calls for the map's cells to be redrawn
    redrawMap(): void {
      this.polylines.addPointToCurrentLine(
        this.mapAbstraction.playerMarker.getLatLng(),
      );
      this.mapAbstraction.redrawMap(this.board, this.polylines, this);
      this.mapAbstraction.reCenterOnPoint(
        this.mapAbstraction.playerMarker.getLatLng(),
        false,
      );
    },
    // Updates the status panel with the coins the player has
    updateStatusPanel(mapAbs: MapAbstraction, tileWidth: number): void {
      this.statusPanel.innerText =
        `You have ${mapAbs.playerCoins.length} coins:`;
      const statusPanelDiv = createCoinDiv(
        mapAbs,
        mapAbs.playerCoins,
        tileWidth,
      );
      this.statusPanel.appendChild(statusPanelDiv);
    },
  };

  return userInterface;
}
