import { MapAbstraction } from "./mapAbstraction.ts";
import luck from "./luck.ts";

export interface Cell {
  readonly x: number;
  readonly y: number;
}

export interface Coin {
  cell: Cell;
  serial: number;
  button: HTMLButtonElement;

  toString(): string;
}

export interface Cache {
  coins: Coin[];

  toMomento(): string;
  fromMomento(momento: string): void;
}

export function createCoin(
  cell: Cell,
  serial: number,
  map: MapAbstraction,
): Coin {
  const newCoin: Coin = {
    cell,
    serial,
    button: document.createElement("button"),
    toString() {
      return `\n${cell.x.toFixed(4)}:${cell.y.toFixed(4)}, serial:${serial} `;
    },
  };

  newCoin.button.innerText = "Locate Home";
  newCoin.button.onclick = () => {
    map.centerOnPoint(newCoin.cell, true);
  };
  return newCoin;
}

export function newCache(
  cell: Cell,
  maxCoins: number,
  map: MapAbstraction,
): Cache {
  const newCache: Cache = {
    coins: [],

    toMomento() {
      return JSON.stringify({
        coins: this.coins,
      });
    },
    fromMomento(momento: string) {
      this.coins = [];
      const parsed = JSON.parse(momento);
      for (let i = 0; i < parsed.coins.length; i++) {
        const parsedCoin = parsed.coins[i];
        const newCoin: Coin = createCoin(
          parsedCoin.cell,
          parsedCoin.serial,
          map,
        );
        this.coins.push(newCoin);
      }
    },
  };

  const numCoins =
    luck([cell.x, cell.y, "https://github.com/AKris0090/Orchid"].toString()) *
    maxCoins;
  for (let i = 0; i < numCoins; i++) {
    newCache.coins.push(createCoin(cell, i, map));
  }

  return newCache;
}
