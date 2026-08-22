"use strict";
// The one seam between the app and "the AI". Everything the UI needs from an
// assistant goes through this interface, so swapping MockAIService for a real
// ClaudeAIService later is a one-line change in ./index.ts and nothing else.
//
// Design note - compute vs narrate: MELDA never asks the model for numbers.
// The real figures (32% struggled, average mastery) come from deterministic
// aggregation in src/domain/insights. The AI only *narrates* and *drafts* prose
// around those numbers, which is the half a language model is actually good at
// and the half that is safe to mock.
Object.defineProperty(exports, "__esModule", { value: true });
