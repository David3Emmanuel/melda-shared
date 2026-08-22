"use strict";
// Single entry point for the shared library. The backend imports the pure runtime
// logic (aggregation, grading) plus the seed; the two apps import the types, which
// are erased at build. Everything the domain and the wire expose lives behind the
// bare `melda-shared` specifier.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataset = void 0;
__exportStar(require("./domain/models"), exports);
__exportStar(require("./domain/insights/aggregate"), exports);
__exportStar(require("./domain/experience"), exports);
__exportStar(require("./ai/types"), exports);
__exportStar(require("./contract"), exports);
var seed_1 = require("./data/seed");
Object.defineProperty(exports, "dataset", { enumerable: true, get: function () { return seed_1.dataset; } });
