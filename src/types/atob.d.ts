// Hermes provides `atob`/`btoa` at runtime, but they aren't part of the
// TypeScript lib definitions used by this project.
declare function atob(data: string): string;
declare function btoa(data: string): string;
