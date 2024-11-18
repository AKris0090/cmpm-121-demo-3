import leaflet from "leaflet";
import { Cell } from "./boardPieces.ts";

export interface PolylineAbstraction {
  polyLines: leaflet.Polyline[];
  currentPolyLine: number;

  createPolyline(): leaflet.Polyline;
  savePolylines(): void;
  loadPolylines(map: leaflet.Map): void;
  drawPolylines(map: leaflet.Map): void;
  addPointToCurrentLine(position: leaflet.LatLng): void;
  getCurrentPolyline(): leaflet.Polyline;
  clearPolylines(): void;
}

export function newPolylineAbstraction(): PolylineAbstraction {
  const newPolylineAbstraction: PolylineAbstraction = {
    polyLines: [],
    currentPolyLine: -1,

    createPolyline(): leaflet.Polyline {
      const newPolyline = leaflet.polyline([], { color: "red" });
      this.polyLines.push(newPolyline);
      this.currentPolyLine++;
      return newPolyline;
    },

    addPointToCurrentLine(position: leaflet.LatLng) {
      this.polyLines[this.currentPolyLine].addLatLng(position);
    },

    getCurrentPolyline() {
      return this.polyLines[this.currentPolyLine - 1];
    },

    loadPolylines(map: leaflet.Map) {
      const loadedPositions: leaflet.LatLng[][] = JSON.parse(
        localStorage.getItem("polyLines")!,
      );
      if (!loadedPositions) {
        return;
      }

      for (let i = 0; i < loadedPositions.length; i++) {
        this.createPolyline();
        for (let j = 0; j < loadedPositions[i].length; j++) {
          this.addPointToCurrentLine([
            loadedPositions[i][j].lat,
            loadedPositions[i][j].lng,
          ]);
        }
      }
      this.createPolyline();
      this.drawPolylines(map);
    },

    drawPolylines(map: leaflet.Map) {
      for (let i = 0; i < this.polyLines.length; i++) {
        this.polyLines[i].addTo(map);
      }
    },

    savePolylines() {
      const positions: Cell[][] = [];
      for (let i = 0; i < this.polyLines.length; i++) {
        if (this.polyLines[i].getLatLngs().length > 1) {
          positions.push(this.polyLines[i].getLatLngs());
        }
      }
      localStorage.setItem("polyLines", JSON.stringify(positions));
    },

    clearPolylines() {
      for (let i = 0; i < this.polyLines.length; i++) {
        this.polyLines[i].remove();
      }
      this.polyLines = [];
      this.polyLines.push(leaflet.polyline([], { color: "red" }));
      this.currentPolyLine = 0;
      localStorage.removeItem("polyLines");
    },
  };

  return newPolylineAbstraction;
}
