import { SimpleChange } from '@angular/core';
import { Observable } from 'rxjs';
import { scan } from 'rxjs/operators';

export function simpleChange() {
  return (source: Observable<any>): Observable<SimpleChange> => {
    return source.pipe(
      scan((lastChange: SimpleChange, val) => ({
        currentValue: val,
        previousValue: lastChange.currentValue,
        firstValue: !lastChange.currentValue
      }), {})
    ) as Observable<SimpleChange>;
  }
}
