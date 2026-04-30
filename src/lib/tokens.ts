// Study access tokens — maps obfuscated token → participant ID
// Pattern: [GROUP][1-4]-[4-char hex]
// This is the single source of truth — edit only this file.
export const TOKEN_MAP: Record<string, string> = {
  // Group A
  "A1-3f9a": "p12",
  "A2-7b2e": "p6",
  "A3-c514": "p31",
  "A4-8d63": "p32",
  // Group P
  "P1-2a7f": "p39",
  "P2-f1c9": "p36",
  "P3-4e8b": "p25",
  "P4-9d35": "p23",
  // Group T
  "T1-6c1a": "p57",
  "T2-b74e": "p16",
  "T3-3890": "p20",
  "T4-a2f6": "p30",
  // Group R
  "R1-d5e1": "p44",
  "R2-7f4c": "p2",
  "R3-1b8d": "p19",
  "R4-e9a3": "p27",
  // Group M
  "M1-5c7f": "p10",
  "M2-2d4b": "p43",
  "M3-8e6c": "p51",
  "M4-f3a1": "p45",
  // Group N
  "N1-4b9e": "p3",
  "N2-c2d7": "p22",
  "N3-71f5": "p24",
  "N4-9a3e": "p53",
  //Practice
  "practice" : "p25",
};
