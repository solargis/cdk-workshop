import { Component } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PinState } from '../state/pin.state';
import { Pin } from 'shared/types/pin.types';

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
      <router-outlet></router-outlet>
      `
})
export class AppComponent {
  @Select(PinState.selectedPin) selectedPin$: Observable<Pin>;
}
