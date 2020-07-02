import { Component } from '@angular/core'
import { Image } from 'shared/types/pin.types'
import { ActivatedRoute, Router, Params } from '@angular/router'
import { switchMap, map, tap, catchError } from 'rxjs/operators'
import { PinApiService } from '../services/pin-api.service'
import { PinFromMap, SidebarInfo } from '../state/pin.state'
import { Store } from '@ngxs/store'
import { of, ObservableInput, Observable } from 'rxjs'
import { SavedPin, SavedImage } from '../../../../shared/types/pin.types'

@Component({
  selector: 'app-image-page',
  styles: [
    `
      .error {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }
    `
  ],
  template: `
    <ng-container>
      <app-image
        *ngIf="!hasError"
        [image]="image | async"
        [diplayBottom]="false"
      ></app-image>
      <div class="error" *ngIf="hasError">
        <h3>No pin found</h3>
        <button mat-button (click)="goHome()">Go to locations</button>
      </div>
    </ng-container>
  `
})
export class ImagePageComponent {
  constructor (
    private route: ActivatedRoute,
    private pinApi: PinApiService,
    private store: Store,
    private router: Router
  ) {}

  public hasError = false
  public pinUrl

  public goHome () {
    this.router.navigateByUrl(`/?pointUrl=${this.pinUrl}`)
  }

  public image: Observable<SavedImage> = this.route.params.pipe(
    tap(params => {
      this.pinUrl = params.id
    }),
    switchMap<Params, ObservableInput<SavedPin>>((params: Params) =>
      this.pinApi.getPin(params.id)
    ),
    tap(pin => this.store.dispatch(new PinFromMap(pin.pointUrl))),
    tap(() => this.store.dispatch(new SidebarInfo(true))),
    map<SavedPin, SavedImage>(pin => pin.image),
    catchError<SavedImage, ObservableInput<SavedImage>>(() => {
      this.hasError = true
      return of(null)
    })
  )
}
