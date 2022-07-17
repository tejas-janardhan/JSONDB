import * as fs from "fs";

const crypto = require("crypto");

export const generateId: () => string = () =>
  crypto.randomBytes(8).toString("hex");

export const objfromJsonPath = (path: string) => {
  return JSON.parse(fs.readFileSync(path).toString());
};

export const writeObjToJson = (obj: Record<any, any>, path: string) => {
  fs.writeFileSync(path, JSON.stringify(obj));
};

export const objLog = (obj: Record<any, any>) => {
  console.log(JSON.stringify(obj, null, 2));
};
