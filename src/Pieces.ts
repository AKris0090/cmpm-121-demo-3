import luck from "./luck.ts";

// Cell is an interface that represents a cell on the game board.
export interface Cell {
  readonly x: number;
  readonly y: number;
}

// Coin is an interface that represents a coin in a cache.
export interface Coin {
  cell: Cell;
  serial: number;

  toString(): string;
}

// createCoin creates a new coin at a cell with a serial number.
export function createCoin(
  cell: Cell,
  serial: number,
  tileWidth: number,
): Coin {
  const newCoin: Coin = {
    cell,
    serial,
    toString() {
      return `\n${(cell.x * tileWidth).toFixed(4)}:${
        (
          cell.y * tileWidth
        ).toFixed(4)
      }, serial:${serial} `;
    },
  };
  return newCoin;
}

// Cache is an interface that represents a geocache of coins in a cell.
export interface Cache {
  cell: Cell;
  coins: Coin[];

  toMomento(): string;
  fromMomento(momento: string): void;
}

// newCache creates a new cache at a cell with a maximum number of coins.
export function newCache(
  cell: Cell,
  maxCoins: number,
  tileWidth: number,
): Cache {
  const newCache: Cache = {
    coins: [],
    cell: cell,

    // toMomento returns a string representation of the cache.
    toMomento() {
      return JSON.stringify({
        coins: this.coins,
      });
    },

    // fromMomento restores the cache from a momento string.
    fromMomento(momento: string) {
      this.coins = [];
      const parsed = JSON.parse(momento);
      for (let i = 0; i < parsed.coins.length; i++) {
        const parsedCoin = parsed.coins[i];
        // Loading coins from JSON doesn't create the objects, so create them now.
        const newCoin: Coin = createCoin(
          parsedCoin.cell,
          parsedCoin.serial,
          tileWidth,
        );
        this.coins.push(newCoin);
      }
    },
  };

  // Randomly generate coins in the cache.
  const numCoins = luck(
    [
      cell.x * tileWidth,
      cell.y * tileWidth,
      "https://github.com/AKris0090/Orchid",
    ].toString(),
  ) * maxCoins;
  for (let i = 0; i < numCoins; i++) {
    newCache.coins.push(createCoin(cell, i, tileWidth));
  }

  return newCache;
}
