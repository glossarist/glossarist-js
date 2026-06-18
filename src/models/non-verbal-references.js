import { NonVerbalReference } from './non-verbal-reference.js';

export class FigureReference extends NonVerbalReference {
  static fromJSON(data) { return NonVerbalReference.fromJSON(data); }
}
NonVerbalReference.register('figure', FigureReference);

export class TableReference extends NonVerbalReference {
  static fromJSON(data) { return NonVerbalReference.fromJSON(data); }
}
NonVerbalReference.register('table', TableReference);

export class FormulaReference extends NonVerbalReference {
  static fromJSON(data) { return NonVerbalReference.fromJSON(data); }
}
NonVerbalReference.register('formula', FormulaReference);
