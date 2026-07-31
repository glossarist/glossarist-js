import { NonVerbalReference } from './non-verbal-reference.js';
import type { NonVerbalReferenceInput } from './non-verbal-reference.js';

export class FigureReference extends NonVerbalReference {
  static override fromJSON(
    data: NonVerbalReferenceInput,
  ): FigureReference | NonVerbalReference {
    return NonVerbalReference.fromJSON(data) as FigureReference | NonVerbalReference;
  }
}
NonVerbalReference.register('figure', FigureReference);

export class TableReference extends NonVerbalReference {
  static override fromJSON(
    data: NonVerbalReferenceInput,
  ): TableReference | NonVerbalReference {
    return NonVerbalReference.fromJSON(data) as TableReference | NonVerbalReference;
  }
}
NonVerbalReference.register('table', TableReference);

export class FormulaReference extends NonVerbalReference {
  static override fromJSON(
    data: NonVerbalReferenceInput,
  ): FormulaReference | NonVerbalReference {
    return NonVerbalReference.fromJSON(data) as FormulaReference | NonVerbalReference;
  }
}
NonVerbalReference.register('formula', FormulaReference);
