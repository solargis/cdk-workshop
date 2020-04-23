import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { urlToPoint, toDMS } from 'shared/utils/point.utils';
import { PinFromServer, PinState, PinFromServerState, PinFromMap } from '../state/pin.state';
import { Store, Select } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { Pin } from '../../../../shared/types/pin.types';
import { takeUntil } from "rxjs/operators";
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  styles: [`
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
    }
    dt {
      margin-left: 10px;
    }
    dt:after{
      content: ':'
    }
    .close {
      position: absolute;
      top: 0;
      right: 0;
    }
    :host {
      position: relative;
    }
  `],
  template: `
  <div *ngIf="(selectedPin$ | async) as pin">
    <img [src]="pin.image?.url">
    <dl>
      <dt>latitude</dt>
      <dd>{{toDMS(pin.point?.lat)}}</dd>
      <dt>length</dt>
      <dd>{{toDMS(pin.point?.lng)}}</dd>
      <dt>created</dt>
      <dd>{{date(pin.created)}}</dd>
      <dt>address</dt>
      <dd>{{pin.address?.display_name}}</dd>
    </dl>
  </div>
  <div>
  </div>
  <button class="close" mat-icon-button (click)="close()">
      <mat-icon>close</mat-icon>
  </button>
  `
})
export class PinDetailComponent implements OnDestroy {
  @Select(PinState.selectedPin) selectedPin$: Observable<Pin>;
  @Select(PinState.pinFromServerSate) state$: Observable<PinFromServerState>;
  killer = new Subject();

  constructor(store: Store, route: ActivatedRoute, private router: Router, private snackBar: MatSnackBar) {
    const point = urlToPoint(route.snapshot.params.pointStr);
    if(point) {
      store.dispatch(new PinFromServer(point));
    }
    this.state$.pipe(takeUntil(this.killer)).subscribe((state) => {
      if(state === 'error') {
        this.router.navigate(['/']);
        this.snackBar.open('Pinned image not found on given position');
        store.dispatch(new PinFromMap(point));
      }
    });
  }

  toDMS(value: number, precision = 0) {
    return toDMS(value, precision);
  }

  date(time: number) {
    return new Date(time).toDateString();
  }

  close(): void {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    this.killer.next();
    this.killer.complete();
  }
}
