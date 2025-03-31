import path from "path";
import fs from "fs";

export function random(min: number, max: number) {
  return Math.floor((Math.random()) * (max - min + 1)) + min;
}

export function unused_auth_filename(dir: string) {
  for (let i = 1; i < 10; i++) {
    const _filename = `${i}.json`;
    const _dir = path.join(dir, _filename);
    if (!fs.existsSync(_dir)) return _filename;
  }
  return "10.json";
}

export function match_rated(oldValue: string, newValue: string) {
  let _rated = 0;

  const __old = oldValue.split("").filter(e => e !== ":").join("").toLowerCase();
  const __new = newValue.split("").filter(e => e !== ":").join("").toLowerCase();

  if (__old === __new) {
    _rated = 9999;
  } else {
    for (let i = 0; i < __old.length; i++) {
      if (__new[i] && __new[i] == __old[i]) {
        _rated = _rated + 1;
      }
    }
  }

  return _rated;
}

export function diceCoefficient(a: string, b: string) {
  const bigrams = (str: string) => new Set([...str.toLowerCase()].map((_, i, arr) => arr.slice(i, i + 2).join('')).filter(x => x.length === 2));
  const setA = bigrams(a);
  const setB = bigrams(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return (2 * intersection.size) / (setA.size + setB.size);
}