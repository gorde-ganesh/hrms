export {};

// Express 5 types ParamsDictionary with [key: string]: string | string[]
// Augment it to narrow back to string for route params
declare module 'express-serve-static-core' {
  interface ParamsDictionary {
    [key: string]: string;
  }
}
