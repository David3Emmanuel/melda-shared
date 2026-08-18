// Single entry point for the shared library. The backend imports the pure runtime
// logic (aggregation, grading) plus the seed; the two apps import the types, which
// are erased at build. Everything the domain and the wire expose lives behind the
// bare `melda-shared` specifier.

export * from './domain/models';
export * from './domain/insights/aggregate';
export * from './domain/experience';
export * from './ai/types';
export * from './contract';
export { dataset } from './data/seed';
