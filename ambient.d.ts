export {}


declare global {
  interface Node {
    querySelector: <E extends HTMLElement = HTMLElement>(s: string) => E
    getElementById: <E extends HTMLElement = HTMLElement>(s: string) => E
  }

  interface OffsetTableEntry {
    codepoint: number
    offset: number
  }
  interface HashTableEntry {
    hash: number
    size: number
    offset: number
  }

  var data: Uint8Array
  var offset: number
  var supported_codepoints: string[]
  var a: OffsetTableEntry[]
}
