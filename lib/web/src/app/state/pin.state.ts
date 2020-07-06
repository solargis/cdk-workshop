import { Image, Pin, PinPoint, SavedPin } from 'shared/types/pin.types'
import {
  Action,
  NgxsOnInit,
  Selector,
  State,
  StateContext,
  Store
} from '@ngxs/store'

import { NominatimService } from '../services/nominatim.service'
import { PinApiService } from '../services/pin-api.service'
import { pointToUrl } from 'shared/utils/point.utils'

// Actions

export class PinFromMap {
  static readonly type = '[pin] from map'
  constructor (public point: PinPoint | string) {}
}

export class PinFromSearch {
  static readonly type = '[pin] from search'
  constructor (public pin: Pin) {}
}

export class UnselectPin {
  static readonly type = '[pin] unselect'
}

export class SavePin {
  static readonly type = '[pin] save'
  constructor (public unsavedImage: Image, public customName: string = '') {}
}

export class RenamePin {
  static readonly type = '[pin] rename'
  constructor (public customName: string) {}
}

export class DeletePin {
  static readonly type = '[pin] delete'
}

export class GeocodePinPoint {
  static readonly type = '[pin] geocode point'
  constructor (public point) {}
}

export class SidebarInfo {
  static readonly type = '[pin] sidebar info'
  constructor (public sidebarInfo) {}
}

// State model

export interface PinStateModel {
  pins: SavedPin[]
  selectedPin: Pin | SavedPin
  inProgress: boolean
  sidebarInfo: boolean
}

// Reducers + effects

@State<PinStateModel>({
  name: 'pin',
  defaults: {
    pins: [],
    selectedPin: undefined,
    inProgress: false,
    sidebarInfo: false
  }
})
export class PinState implements NgxsOnInit {
  @Selector() static pins (state: PinStateModel) {
    return state.pins
  }

  @Selector() static selectedPin (state: PinStateModel) {
    return state.selectedPin
  }

  @Selector() static sidebarInfo (state: PinStateModel) {
    return state.sidebarInfo
  }

  constructor (
    private store: Store,
    private nominatim: NominatimService,
    private pinApi: PinApiService
  ) {}

  ngxsOnInit (ctx?: StateContext<PinStateModel>): void | any {
    this.pinApi.listPins().subscribe(pins => ctx.patchState({ pins }))
  }

  @Action(PinFromMap)
  pinFromMap (ctx: StateContext<PinStateModel>, { point }: PinFromMap) {
    const savedPin = this.findSavedPin(ctx, point)
    if (savedPin) {
      ctx.patchState({ selectedPin: savedPin })
    } else {
      ctx.patchState({ selectedPin: { point } as Pin })
      this.store.dispatch(new GeocodePinPoint(point))
    }
  }

  @Action(SidebarInfo)
  sidebarInfo (ctx: StateContext<PinStateModel>, value: boolean) {
    ctx.patchState({ sidebarInfo: value })
  }

  @Action(PinFromSearch)
  pinFromSearch (ctx: StateContext<PinStateModel>, { pin }: PinFromSearch) {
    const savedPin = this.findSavedPin(ctx, pin.point)
    ctx.patchState({ selectedPin: savedPin || pin })
  }

  @Action(UnselectPin)
  unselectPin (ctx: StateContext<PinStateModel>) {
    ctx.patchState({ selectedPin: undefined })
  }

  @Action(SavePin)
  savePin (
    ctx: StateContext<PinStateModel>,
    { unsavedImage, customName }: SavePin
  ) {
    const { selectedPin } = ctx.getState()
    // is unsaved pin
    if (!(selectedPin as SavedPin).pointUrl) {
      this.pinApi
        .savePin(selectedPin, unsavedImage, customName)
        .subscribe(savedPin => {
          const { pins } = ctx.getState()
          ctx.patchState({
            pins: [...pins, savedPin],
            selectedPin: savedPin
          })
        })
    }
  }

  @Action(RenamePin)
  renamePin (ctx: StateContext<PinStateModel>, { customName }: RenamePin) {
    const { selectedPin } = ctx.getState()
    const pointUrl = (selectedPin as SavedPin).pointUrl
    // is unsaved pin
    if (pointUrl) {
      this.pinApi
        .renamePin((selectedPin as SavedPin).pointUrl, customName)
        .subscribe(savedPin => {
          const { pins } = ctx.getState()
          const newPins = this.updatePins(savedPin, pins)

          ctx.patchState({ pins: newPins })
        })
    }
  }

  @Action(DeletePin)
  deletePin (ctx: StateContext<PinStateModel>) {
    const { selectedPin } = ctx.getState()
    const pointUrl = (selectedPin as SavedPin).pointUrl
    if (pointUrl) {
      this.pinApi.deletePin(pointUrl).subscribe(() => {
        const { pins, selectedPin } = ctx.getState()
        const { point, address } = selectedPin
        ctx.patchState({
          pins: pins.filter(pin => pin.pointUrl !== pointUrl)
        })
      })
    }
  }

  @Action(GeocodePinPoint)
  geocodePinPoint (
    ctx: StateContext<PinStateModel>,
    { point }: GeocodePinPoint
  ) {
    this.nominatim.getAddress(point).subscribe(address => {
      const { selectedPin } = ctx.getState()
      ctx.patchState({ selectedPin: { ...selectedPin, address } })
    })
  }

  private findSavedPin (
    ctx: StateContext<PinStateModel>,
    point: PinPoint | string
  ): SavedPin | undefined {
    const pointUrl = typeof point === 'string' ? point : pointToUrl(point)
    const { pins } = ctx.getState()
    return pins.find(pin => pin.pointUrl === pointUrl)
  }

  private updatePins (pin: SavedPin, pins: SavedPin[]): SavedPin[] {
    const newPins = Array.from(pins)
    newPins.splice(
      pins.findIndex(p => p.pointUrl === pin.pointUrl),
      1,
      pin
    )

    return newPins
  }
}
