import { Component } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PinState, PinFromMap } from '../state/pin.state';
import { Pin, PinPoint } from 'shared/types/pin.types';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
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
      <div class="header">
          <app-header [pin]="selectedPin$ | async"></app-header>
      </div>
      <div class="main">
          <div class="fixed">
              <div map [pin]="selectedPin$ | async"></div>
          </div>
          <div class="sidebar" *ngIf="selectedPin$ | async">
              <app-sidebar [pin]="selectedPin$ | async"></app-sidebar>
          </div>
      </div>`
})
export class AppComponent {

  @Select(PinState.selectedPin) selectedPin$: Observable<Pin>;
  @Select(PinState.pins) pins$: Observable<[Pin]>;
  constructor(private store: Store) {
    this.pins$.pipe(take(2)).subscribe((data) => {
      this.processPointFromURL();
    });
  }

  processPointFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const pointStr = urlParams.get('p');
    if(pointStr) {
      const pointParts = pointStr.split(',');
      if(pointParts.length === 2) {
        const point: PinPoint = {lat: parseFloat(pointParts[0]), lng: parseFloat(pointParts[1])}
        this.store.dispatch(new PinFromMap(point));
      }
    }
  }
}
