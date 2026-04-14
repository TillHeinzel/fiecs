export type Initializer = {
  canDefaultInitialize: boolean;
  tryInitialize: (val?: { data: unknown }) => unknown;
};
