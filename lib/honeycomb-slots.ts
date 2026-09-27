/* The honeycomb's service cells. Keys are "col,row" positions inside the
   comb; the admin homepage editor lets you choose which category sits in
   each one. Order: from the bottom-left tail up to the top-right tip. */

export const DEFAULT_SERVICES: Record<string, string> = {
  "0,5": "grim",
  "0,7": "pastrim",
  "1,5": "perkthyes",
  "2,3": "korrier",
  "2,7": "shtepiak",
  "3,1": "shtepiak",
  "3,5": "elektricist",
  "4,1": "dado",
  "4,3": "frizer",
  "6,1": "korrier",
  "0.5,6": "ngrohje-klimatizim",
  "1.5,4": "kurse",
  "1.5,6": "dado",
  "2.5,2": "moler",
  "2.5,4": "grim",
  "2.5,6": "mjeshter-i-ujit",
  "3.5,2": "kopshtar",
  "3.5,4": "pastrim",
  "4.5,0": "valle",
  "4.5,2": "perkthyes",
  "5.5,0": "ngrohje-klimatizim",
  "5.5,2": "kurse"
};

export const CELL_LABELS: Record<string, string> = {
  "0,7": "Rreshti i fundit — majtas",
  "2,7": "Rreshti i fundit — djathtas",
  "0.5,6": "Rreshti 7 — majtas",
  "1.5,6": "Rreshti 7 — mesi",
  "2.5,6": "Rreshti 7 — djathtas",
  "0,5": "Rreshti 6 — majtas",
  "1,5": "Rreshti 6 — mesi",
  "3,5": "Rreshti 6 — djathtas",
  "1.5,4": "Rreshti 5 — majtas",
  "2.5,4": "Rreshti 5 — mesi",
  "3.5,4": "Rreshti 5 — djathtas",
  "2,3": "Rreshti 4 — majtas (afër bletës)",
  "4,3": "Rreshti 4 — djathtas (afër bletës)",
  "2.5,2": "Rreshti 3 — majtas",
  "3.5,2": "Rreshti 3 — mesi",
  "4.5,2": "Rreshti 3 — djathtas",
  "5.5,2": "Rreshti 3 — skaj",
  "3,1": "Rreshti 2 — majtas",
  "4,1": "Rreshti 2 — mesi",
  "6,1": "Rreshti 2 — skaj",
  "4.5,0": "Maja — majtas",
  "5.5,0": "Maja — djathtas",
};
