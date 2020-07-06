import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core'
import { Store, Select } from '@ngxs/store'

import { ImageInputComponent } from './image-input.component'
import {
  DeletePin,
  SavePin,
  UnselectPin,
  PinState,
  RenamePin
} from '../state/pin.state'
import { PinPoint, SavedPin, Image } from 'shared/types/pin.types'
import { toDMS } from 'shared/utils/point.utils'
import { MatDialog } from '@angular/material/dialog'
import { ShareDialogComponent } from './share-dialog.component'
import { Observable } from 'rxjs'
import { FormGroup, FormControl } from '@angular/forms'

@Component({
  selector: 'app-sidebar',
  styles: [
    `
      .form {
        padding: 5px;
      }
      .close {
        position: absolute !important;
        top: 0px;
        right: 0px;
      }
      .image {
        margin-top: 16px;
      }
    `
  ],
  template: `
    <mat-card>
      <mat-card-title>
        {{ printPoint(pin.point) }}
        <button
          *ngIf="!(info$ | async)"
          class="close"
          mat-icon-button
          (click)="unselectPin()"
        >
          <mat-icon>{{ 'CLOSE' | translate }}</mat-icon>
        </button>
      </mat-card-title>
      <mat-card-subtitle>
        {{ pin.address?.display_name || pin.address?.error }}
      </mat-card-subtitle>
      <mat-card-content>
        <form [formGroup]="pinName" class="form" (ngSubmit)="rename()">
          <mat-form-field class="">
            <mat-label i18n="@@pinNameInputLabel">{{
              'PIN_NAME_LABEL' | translate
            }}</mat-label>
            <input
              formControlName="name"
              matInput
              placeholder="{{ pin.address?.address?.city }}"
            />
          </mat-form-field>
          <button
            mat-raised-button
            *ngIf="!unsavedImage && pin.pointUrl && !(info$ | async)"
            color="primary"
          >
            {{ 'PIN_CHANGE_NAME' | translate }}
          </button>
        </form>
      </mat-card-content>
      <mat-card-content *ngIf="info$ | async">
        <p>{{ 'CREATED' | translate }}: {{ pin.created | date }}</p>
        <h4>{{ 'IMAGE' | translate }}</h4>
        <p>{{ 'NAME' | translate }}: {{ pin.image?.name }}</p>
        <p>{{ 'SIZE' | translate }}: {{ pin.image?.size | filesize }}</p>
      </mat-card-content>
      <div style="display:flex">
        <button
          mat-raised-button
          *ngIf="!unsavedImage && !pin.image && !(info$ | async)"
          color="primary"
          (click)="selectImage()"
        >
          {{ 'PIN_IMAGE' | translate }}
        </button>
        <mat-progress-bar
          *ngIf="unsavedImage"
          mode="indeterminate"
          color="accent"
        ></mat-progress-bar>
        <a
          mat-button
          *ngIf="pin.image?.url && !(info$ | async)"
          color="primary"
          [href]="pin.image.url"
          target="_blank"
        >
          {{ 'DOWNLOAD_IMAGE' | translate }}
        </a>
        <button
          mat-button
          *ngIf="!unsavedImage && pin.pointUrl && !(info$ | async)"
          color="warn"
          (click)="deletePin()"
        >
          {{ 'DELETE_PIN' | translate }}
        </button>
        <button
          mat-button
          *ngIf="pin && !(info$ | async)"
          color="primary"
          (click)="share()"
        >
          {{ 'SHARE' | translate }}
        </button>
      </div>

      <div class="image">
        <ng-container *ngIf="!pin.image">
          <app-image-input
            [unsavedImage]="unsavedImage"
            (unsavedImageChange)="savePinWithImage($event)"
          >
          </app-image-input>
          <app-image [image]="unsavedImage"></app-image>
        </ng-container>
        <app-image
          *ngIf="pin.image && !(info$ | async)"
          [image]="pin.image"
        ></app-image>
      </div>
    </mat-card>
  `
})
export class SidebarComponent implements OnChanges {
  @Input() pin: Partial<SavedPin>

  @Select(PinState.sidebarInfo) info$: Observable<boolean>

  @ViewChild(ImageInputComponent, { static: false })
  private imageInputComponent: ImageInputComponent
  unsavedImage: Image

  constructor (private store: Store, private dialog: MatDialog) {}

  public pinName = new FormGroup(
    {
      name: new FormControl()
    },
    { updateOn: 'change' }
  )

  ngOnChanges (changes: SimpleChanges): void {
    if (changes.pin && this.pin.pointUrl) {
      this.unsavedImage = undefined
    }

    this.pinName.setValue({ name: this.getPinName() })
  }

  rename () {
    if (this.pin.pointUrl) {
      this.store.dispatch(new RenamePin(this.pinName.get('name').value))
    }
  }

  selectImage () {
    this.imageInputComponent.openFileDialog()
  }

  unselectPin () {
    this.store.dispatch(new UnselectPin())
  }

  savePinWithImage (unsavedImage: Image) {
    this.unsavedImage = unsavedImage
    this.store.dispatch(
      new SavePin(unsavedImage, this.pinName.get('name').value)
    )
  }

  deletePin () {
    this.store.dispatch(new DeletePin())
  }

  share () {
    const pointUrl = this.pin.pointUrl
      ? this.pin.pointUrl
      : `${this.pin.point.lat},${this.pin.point.lng}`
    this.dialog.open(ShareDialogComponent, {
      data: { pointUrl }
    })
  }

  printPoint (point: PinPoint): string {
    return toDMS(point.lat) + ', ' + toDMS(point.lng)
  }

  getPinName (): string {
    let name = ''
    // if (
    //   this.pin.address &&
    //   this.pin.address.address &&
    //   this.pin.address.address.city
    // ) {
    //   name = this.pin.address.address.city
    // }

    name = !!this.pin.customName ? this.pin.customName : name
    return name
  }
}
