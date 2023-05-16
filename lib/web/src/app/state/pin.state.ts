import { Injectable } from '@angular/core';
import { Action, NgxsOnInit, Selector, State, StateContext, Store } from '@ngxs/store';

import { NominatimService } from '../services/nominatim.service';
import { PinApiService } from '../services/pin-api.service';
import { Image, Pin, PinPoint, SavedPin } from 'shared/types/pin.types';
import { pointToUrl } from 'shared/utils/point.utils';

// Actions

export class PinFromMap {
  static readonly type = '[pin] from map';
  constructor(public point: PinPoint | string) {}
}

export class PinFromSearch {
  static readonly type = '[pin] from search';
  constructor(public pin: Pin) {}
}

export class UnselectPin {
  static readonly type = '[pin] unselect'
}

export class SavePin {
  static readonly type = '[pin] save';
  constructor(public unsavedImage: Image) {}
}

export class DeletePin {
  static readonly type = '[pin] delete';
}

export class GeocodePinPoint {
  static readonly type = '[pin] geocode point';
  constructor(public point) {}
}

// State model

export interface PinStateModel {
  pins: SavedPin[];
  selectedPin: Pin | SavedPin;
  inProgress: boolean;
}

// Reducers + effects

@Injectable()
@State<PinStateModel>({
  name: 'pin',
  defaults: { pins: [], selectedPin: undefined, inProgress: false }
})
export class PinState implements NgxsOnInit {

  @Selector() static pins(state: PinStateModel) {
    return state.pins;
  }

  @Selector() static selectedPin(state: PinStateModel) {
    return state.selectedPin;
  }

  constructor(
    private store: Store,
    private nominatim: NominatimService,
    private pinApi: PinApiService
  ) {}

  ngxsOnInit(ctx?: StateContext<PinStateModel>): void | any {
    this.pinApi.listPins().subscribe(
      pins => ctx.patchState({ pins })
    );
    this.pinApi.listenPinChanges().subscribe(pinChange => {
      const { pins, selectedPin } = ctx.getState();

      const patchedPins = [
        ...pins.filter(({ pointUrl }) => pointUrl !== pinChange.pointUrl), // remove changed pin
        ...(pinChange.eventName !== 'REMOVE' ? [pinChange.NewImage] : [])  // (re)add inserted or modified pin
      ];

      // patch selected pin
      if ((selectedPin as SavedPin)?.pointUrl === pinChange.pointUrl) {
        const fallbackSelection = selectedPin
          ? { point: selectedPin.point, address: selectedPin.address }
          : undefined;
        ctx.patchState({
          pins: patchedPins,
          selectedPin: pinChange.eventName === 'REMOVE' ? fallbackSelection : pinChange.NewImage
        });
      } else {
        ctx.patchState({ pins: patchedPins });
      }
    });
  }

  @Action(PinFromMap)
  pinFromMap(ctx: StateContext<PinStateModel>, { point }: PinFromMap) {
    const savedPin = this.findSavedPin(ctx, point);
    if (savedPin) {
      ctx.patchState({ selectedPin: savedPin });
    } else {
      ctx.patchState({ selectedPin: { point } as Pin });
      this.store.dispatch(new GeocodePinPoint(point));
    }
  }

  @Action(PinFromSearch)
  pinFromSearch(ctx: StateContext<PinStateModel>, { pin }: PinFromSearch) {
    const savedPin = this.findSavedPin(ctx, pin.point);
    ctx.patchState({ selectedPin: savedPin || pin });
  }

  @Action(UnselectPin)
  unselectPin(ctx: StateContext<PinStateModel>) {
    ctx.patchState({ selectedPin: undefined });
  }

  @Action(SavePin)
  savePin(ctx: StateContext<PinStateModel>, { unsavedImage }: SavePin) {
    const { selectedPin } = ctx.getState();
    // is unsaved pin
    if (!(selectedPin as SavedPin).pointUrl) {
      this.pinApi.savePin(selectedPin, unsavedImage)
        .subscribe(savedPin => {
          const { pins } = ctx.getState();
          ctx.patchState({
            pins: [...pins, savedPin],
            selectedPin: savedPin }
          );
        });
    }
  }

  @Action(DeletePin)
  deletePin(ctx: StateContext<PinStateModel>) {
    const { selectedPin } = ctx.getState();
    const pointUrl = (selectedPin as SavedPin).pointUrl;
    if (pointUrl) {
      this.pinApi.deletePin(pointUrl).subscribe(() => {
        const { pins, selectedPin } = ctx.getState();
        const { point, address } = selectedPin;
        ctx.patchState({
          pins: pins.filter(pin => pin.pointUrl !== pointUrl),
          selectedPin: { point, address }
        })
      });
    }
  }

  @Action(GeocodePinPoint)
  geocodePinPoint(ctx: StateContext<PinStateModel>, { point }: GeocodePinPoint) {
    this.nominatim.getAddress(point).subscribe(address => {
      const { selectedPin } = ctx.getState();
      ctx.patchState({ selectedPin: { ...selectedPin, address } })
    });
  }

  private findSavedPin(ctx: StateContext<PinStateModel>, point: PinPoint | string): SavedPin | undefined {
    const pointUrl = typeof point === 'string' ? point : pointToUrl(point);
    const { pins } = ctx.getState();
    return pins.find(pin => pin.pointUrl === pointUrl);
  }

}
