"use strict";
// Domain model for MELDA's teacher-first MVP.
//
// One subject (Chemistry), one classroom, a handful of concepts and lessons,
// one review assignment, and the raw learning records the UNDERSTAND layer
// aggregates. Everything downstream (seed, insights, screens) imports these
// types, so this file is the single source of truth for the data shape.
Object.defineProperty(exports, "__esModule", { value: true });
