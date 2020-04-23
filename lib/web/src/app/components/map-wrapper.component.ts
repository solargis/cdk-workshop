import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Select, Store } from '@ngxs/store';
import { PinState, PinFromMap, PinsInitialize } from '../state/pin.state';
import { Pin, SavedPin, PinPoint } from 'shared/types/pin.types';
import { urlToPoint } from 'shared/utils/point.utils';
import { take } from 'rxjs/operators';

@Component({
  styles: [`
      :host {
          height: 100vh;
          display: flex;
          flex-flow: column;
      }
      .header {
          flex: 0 0 48px;
          height: 48px;
          border-bottom: 3px solid #d0d5db;
      }
      .main {
          height: 100%; /*calc(100% - 48px);*/
          display: flex;
          flex-flow: row;
          overflow-y: auto;
      }
      .fixed { flex: 1 }
      .sidebar {
          flex: 0 0 400px;
          overflow-y: auto;
          padding: 8px;
      }
      @media (max-width: 863px) {
          .main { flex-flow: column; }
          .fixed { flex: 0 0 360px; }
          .sidebar { flex: 1 0 auto; }
      }
  `],
  template: `
      <div class="main">
          <div class="fixed">
              <div map [pin]="selectedPin$ | async"></div>
          </div>
          <div class="sidebar" *ngIf="selectedPin$ | async">
              <app-sidebar [pin]="selectedPin$ | async"></app-sidebar>
          </div>
      </div>
      `
})
export class MapWrapperComponent {
  @Select(PinState.selectedPin) selectedPin$: Observable<Pin>;
  @Select(PinState.pins) pins$: Observable<SavedPin[]>;

  constructor(private store: Store) {
    const pinsInitialized = store.selectSnapshot(PinState.pinsInitialized);

    if(!pinsInitialized) {
      store.dispatch(new PinsInitialize());

      this.pins$.pipe(take(2)).subscribe((data) => {
        this.processPointFromURL();
      });
    } else {
      this.processPointFromURL();
    }
  }

  // should be called after pins are loaded, otherwise it will not show image in sidebar
  processPointFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const point = urlToPoint(urlParams.get('p'));
    if(point) {
      this.store.dispatch(new PinFromMap(point));
    }
  }
}
