import { AfterViewInit, Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import * as isEqual from 'lodash.isequal';
import { interval, Observable, of, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, first, map, switchMap, timeout } from 'rxjs/operators';

import { PinApiService } from '../services/pin-api.service';
import { PinFromMap, PinState } from '../state/pin.state';
import { Pin, SavedImage, SavedPin } from 'shared/types/pin.types';

@Component({
  selector: 'app-pin-marker',
  styleUrls: ['./pin-marker.component.scss'],
  templateUrl: './pin-marker.component.html'
})
export class PinMarkerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Select(PinState.selectedPin) selectedPin$: Observable<Pin>;
  @Select(PinState.pins) pins$: Observable<SavedPin[]>;

  selected$: Observable<boolean>;
  pin$: Observable<SavedPin>;

  thumbnail: SavedImage;

  subscription: Subscription;
  public onDestroyCallback: () => void;

  @ViewChild('marker', { static: true })
  public marker: ElementRef;

  constructor (
    private elm: ElementRef,
    private store: Store,
    private pinApi: PinApiService,
    @Inject('pointUrl') private pointUrl: string
  ) {}

  ngOnInit() {
    this.selected$ = this.selectedPin$.pipe(
      map(pin => pin && (pin as SavedPin).pointUrl === this.pointUrl),
      distinctUntilChanged()
    );

    this.pin$ = this.pins$.pipe(
      map(pins => pins.find(p => p.pointUrl === this.pointUrl)),
      distinctUntilChanged((p1, p2) => isEqual(p1, p2))
    );

    const thumbnail$ = this.pin$.pipe(
      filter(pin => !!pin),
      switchMap(pin => {
        if (pin.thumbnail) {
          return of(pin.thumbnail);
        } else {
          return interval(500).pipe(
            switchMap((n: number) => this.pinApi.getPin(this.pointUrl)),
            map(pin => pin && pin.thumbnail),
            filter(thumbnail => !!thumbnail),
            first(),
            timeout(30000)
          )
        }
      })
    );
    this.subscription = thumbnail$.subscribe(
      thumbnail => (this.thumbnail = thumbnail)
    );
  }

  ngAfterViewInit() {
    this.adjustMarker();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    this.store.dispatch(new PinFromMap(this.pointUrl));
    event.stopPropagation();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.onDestroyCallback();
  }

  private adjustMarker() {
    const arrowHeight = 8;
    const alignWidth = 32; // align in px from left corner

    const parentElement = this.elm.nativeElement.parentElement;
    if (parentElement) {
      const height = this.marker.nativeElement.offsetHeight + arrowHeight;
      parentElement.style.margin = `-${height}px  0 0 -${alignWidth}px`;
    }
  }
}
