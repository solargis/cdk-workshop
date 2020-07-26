import { Component, HostListener, Input } from '@angular/core';
import { ApplicationRef, ComponentFactoryResolver, ComponentRef, Injector, OnDestroy, SimpleChange } from '@angular/core';
import { ElementRef, OnChanges, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import * as L from 'leaflet';
import * as isEqual from 'lodash.isequal';
import { Observable, Subscription, of } from 'rxjs';
import { distinctUntilChanged, filter, first, map, withLatestFrom, catchError, switchMap } from 'rxjs/operators';

import { PinMarkerComponent } from './pin-marker.component';
import { PinFromMap, PinState } from '../state/pin.state';
import { diffArrays } from '../utils/array.utils';
import { CustomIcon } from '../utils/leaflet.utils';
import { simpleChange } from '../utils/simple-change.operator';
import { PinPoint, Pin, SavedPin } from 'shared/types/pin.types';
import { ActivatedRoute } from '@angular/router';
import { PinApiService } from '../services/pin-api.service';

@Component({
  selector: 'div[map]', // tslint:disable-line
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./map.component.scss'],
  template: ''
})
export class MapComponent implements OnInit, OnChanges, OnDestroy {
  @Input() pin: Pin;

  @Select(PinState.pins) pins$: Observable<SavedPin[]>;
  @Select(PinState.selectedPin) selectedPin$: Observable<Pin>;

  map: L.Map;
  selectedPinMarker: L.Marker;
  savedPinMarkers: { [pointUrl: string]: L.Marker } = {};

  private subscriptions = [] as Subscription[];

  constructor (
    private injector: Injector,
    private resolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private el: ElementRef,
    private store: Store,
    private route: ActivatedRoute,
    private pinApi: PinApiService
  ) {
    L.Icon.Default.imagePath = 'assets/leaflet/';
  }

  ngOnInit (): void {
    const initialCenter = [48, 17];

    this.map = L.map(this.el.nativeElement, {
      worldCopyJump: true,
      zoomControl: true,
      tap: false,
      doubleClickZoom: false,
      center: initialCenter,
      zoom: 4,
      layers: [
        new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        })
      ]
    });

    this.route.queryParams
      .pipe(
        first(),
        filter(params => !!params.pointUrl),
        map(p => p.pointUrl as string),
        switchMap(pointUrl =>
          this.pinApi.getPin(pointUrl).pipe(
            map(() => pointUrl),
            catchError(e => of(pointUrl))
          )
        )
      )
      .subscribe(pointUrl => {
        const [lat, lng] = pointUrl.split(',').map(n => parseFloat(n))
        this.store.dispatch(new PinFromMap({ lat, lng }))
      })

    this.subscriptions.push(
      this.pins$
        .pipe(
          map(pins => pins.reduce((set, pin) => (set.add(pin.pointUrl), set), new Set<string>())),
          distinctUntilChanged((set1, set2) => isEqual(set1, set2)),
          map(pointUrlsSet => Array.from(pointUrlsSet)),
          simpleChange(),
          map((pointUrlsChange: SimpleChange) => diffArrays<string>(
            pointUrlsChange.previousValue,
            pointUrlsChange.currentValue)
          ),
          withLatestFrom(this.pins$)
        )
        .subscribe(([{ added, removed }, pins]) => {
          // handle removed
          removed.forEach(pointUrl => {
            const pinMarkerToRemove = this.savedPinMarkers[pointUrl];
            this.map.removeLayer(pinMarkerToRemove);
            delete this.savedPinMarkers[pointUrl];
          });
          // handle added
          const addedPins = added.map(pointUrl => pins.find(pin => pin.pointUrl === pointUrl));
          addedPins.forEach(pin => {
            const pinMarkerToAdd = this.createPinMarker(pin);
            this.map.addLayer(pinMarkerToAdd);
            this.savedPinMarkers[pin.pointUrl] = pinMarkerToAdd;
          });
        })
    );

    // zoom to pins
    this.pins$
      .pipe(
        filter(pins => pins && !!pins.length),
        first()
      ).subscribe(pins => {
        const points = pins.map(pin => pin.point);
        this.map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 });
      });

    this.selectedPinMarker = L.marker(initialCenter);

    this.subscriptions.push(
      this.selectedPin$.subscribe(pin => {
        this.pin = pin
        if (this.map) {
          if (this.pin && !(this.pin as SavedPin).pointUrl) {
            // add unsaved pin marker
            this.selectedPinMarker.setLatLng(this.pin.point)
            if (!this.map.hasLayer(this.selectedPinMarker)) {
              this.selectedPinMarker.addTo(this.map)
            }
          } else {
            // remove unsaved pin marker
            this.selectedPinMarker.removeFrom(this.map)
          }
          if (this.pin) {
            this.ensurePointInView(this.pin.point)
          }
          setTimeout(() => this.map.invalidateSize({ pan: false }))
        }
      })
    )

    L.control.scale().addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.store.dispatch(new PinFromMap(e.latlng));
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && changes.pin) {
      if (this.pin && !(this.pin as SavedPin).pointUrl) {
        // add unsaved pin marker
        this.selectedPinMarker.setLatLng(this.pin.point);
        if (!this.map.hasLayer(this.selectedPinMarker)) {
          this.selectedPinMarker.addTo(this.map);
        }
      } else {
        // remove unsaved pin marker
        this.selectedPinMarker.removeFrom(this.map);
      }
      if (this.pin) {
        this.ensurePointInView(this.pin.point);
      }
      setTimeout(() => this.map.invalidateSize({ pan: false }));
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  @HostListener('window:resize')
  onResize() {
    this.map.invalidateSize();
  }

  private ensurePointInView(point: PinPoint) {
    if (!this.map.getBounds().contains(point)) {
      this.map.setView(point, this.map.getZoom());
    }
  }

  private createPinMarker(pin: SavedPin): L.Marker {
    const pinMarker = L.marker(pin.point, { draggable: false, zIndexOffset: 100 });
    const icon = this.createPinMarkerIcon(pin.pointUrl);
    pinMarker.setIcon(new CustomIcon({ nativeElement: icon.location.nativeElement }));
    return pinMarker;
  }

  public createPinMarkerIcon(pointUrl: string): ComponentRef<PinMarkerComponent> {
    const inputProviders = [{ provide: 'pointUrl', useValue: pointUrl }];
    let injector = Injector.create({ providers: inputProviders, parent: this.injector });

    const compFactory = this.resolver.resolveComponentFactory(PinMarkerComponent);
    const pinMarkerIcon: ComponentRef<PinMarkerComponent> = compFactory.create(injector);

    this.appRef.attachView(pinMarkerIcon.hostView);
    pinMarkerIcon.instance.onDestroyCallback = () => {
      this.appRef.detachView(pinMarkerIcon.hostView)
    };
    return pinMarkerIcon;
  }
}
