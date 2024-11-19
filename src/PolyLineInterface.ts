import leaflet from "leaflet";
import { Cell } from "./Pieces.ts";

// PolylineAbstraction is an interface that represents a collection of polylines
// on a map. It provides methods to create, save, load, draw, and clear polylines.
// It also provides methods to add points to the current polyline and get the current
// polyline.
export interface PolylineAbstraction {
  polyLineArray: leaflet.Polyline[];
  currentPolyLineIndex: number;

  createPolyline(): leaflet.Polyline;
  addPointToCurrentLine(position: leaflet.LatLng): void;
  loadPolylines(map: leaflet.Map): void;
  savePolylines(): void;
  drawPolylines(map: leaflet.Map): void;
  clearPolylines(): void;
}

// newPolylineAbstraction creates and returns a new PolylineAbstraction object with an empty array of polylines and a current polyline index of 0.
export function newPolylineAbstraction(): PolylineAbstraction {
  const newPolylineAbstraction: PolylineAbstraction = {
    polyLineArray: [],
    currentPolyLineIndex: 0,

    // Create a new polyline and add it to the list of polylines
    createPolyline(): leaflet.Polyline {
      const newPolyline = leaflet.polyline([], { color: "red" });
      this.polyLineArray.push(newPolyline);
      this.currentPolyLineIndex++;
      return newPolyline;
    },

    // Add a point to the current polyline
    addPointToCurrentLine(position: leaflet.LatLng) {
      this.polyLineArray[this.currentPolyLineIndex - 1].addLatLng(position);
    },

    // Load polylines from local storage
    loadPolylines(map: leaflet.Map) {
      const loadedPositions: leaflet.LatLng[][] = JSON.parse(
        localStorage.getItem("polyLines")!,
      );
      if (!loadedPositions) {
        this.createPolyline();
        return;
      }

      // For each stored polyline, load and add the stored points
      for (let i = 0; i < loadedPositions.length; i++) {
        this.createPolyline();
        for (let j = 0; j < loadedPositions[i].length; j++) {
          this.addPointToCurrentLine([
            loadedPositions[i][j].lat,
            loadedPositions[i][j].lng,
          ]);
        }
      }

      // Create a new polyline for the user's current path
      this.createPolyline();
      // Add all polylines to the map
      this.drawPolylines(map);
    },

    // Save all polylines to local storage
    savePolylines() {
      const positions: Cell[][] = [];
      for (let i = 0; i < this.polyLineArray.length; i++) {
        if (this.polyLineArray[i].getLatLngs().length > 1) {
          positions.push(this.polyLineArray[i].getLatLngs());
        }
      }
      localStorage.setItem("polyLines", JSON.stringify(positions));
    },

    // Draw all polylines on the map
    drawPolylines(map: leaflet.Map) {
      for (let i = 0; i < this.polyLineArray.length; i++) {
        this.polyLineArray[i].addTo(map);
      }
    },

    // Clear all polylines from the map and local storage
    clearPolylines() {
      for (let i = 0; i < this.polyLineArray.length; i++) {
        this.polyLineArray[i].remove();
      }
      this.polyLineArray = [];
      this.currentPolyLineIndex = 0;
      localStorage.removeItem("polyLines");
    },
  };

  return newPolylineAbstraction;
}
