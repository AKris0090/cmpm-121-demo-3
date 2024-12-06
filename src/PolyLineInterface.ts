import leaflet from "leaflet";

// PolylineAbstraction is an interface that represents a collection of polylines
// on a map. It provides methods to create, save, load, draw, and clear polylines.
// It also provides methods to add points to the current polyline and get the current
// polyline.
export interface PolylineAbstraction {
  polyLineArray: leaflet.Polyline[];
  currentPolyLineIndex: number;

  createPolyline(): leaflet.Polyline;
  addPointToCurrentLine(position: leaflet.LatLng): void;
  drawLoadedPolylines(
    map: leaflet.Map,
    loadedPositions: leaflet.latlng[][] | null,
  ): void;
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
    drawLoadedPolylines(
      map: leaflet.Map,
      loadedPositions: leaflet.LatLng[][] | null,
    ) {
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
    },
  };

  return newPolylineAbstraction;
}
