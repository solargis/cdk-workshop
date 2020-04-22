import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';

import { ImageInputComponent } from './image-input.component';
import { DeletePin, SavePin, UnselectPin } from '../state/pin.state';
import { PinPoint, SavedPin, Image } from 'shared/types/pin.types';
import { toDMS } from 'shared/utils/point.utils';
import { ShareDialogComponent } from './share-dialog.component';

@Component({
  selector: 'app-sidebar',
  styles: [`
      .close {
          position: absolute !important;
          top: 0px;
          right: 0px;
      }
      .image {
          margin-top: 16px;
      }
      .share {
        bottom: -5px;
        position: absolute;
      }
      .point-container {
        position: relative;
        height: 1px;
        width: 40px;
        margin-right: 50px; /* share icon should not be under close icon on mobile */
      }
  `],
  template: `
      <mat-card>
          <mat-card-title>

              <span class="point-container">
              {{ printPoint(pin.point) }}
                <button class="share" mat-icon-button (click)="share(pin.point)" matTooltip="Share">
                    <mat-icon>link</mat-icon>
                </button>
              </span>
              <button class="close" mat-icon-button (click)="unselectPin()">
                  <mat-icon>close</mat-icon>
              </button>
          </mat-card-title>
          <mat-card-subtitle>
              {{ pin.address?.display_name || pin.address?.error }}
          </mat-card-subtitle>
          <div style="display:flex">
              <button mat-raised-button *ngIf="!unsavedImage && !pin.image" color="primary" (click)="selectImage()">
                  Pin Image
              </button>
              <mat-progress-bar *ngIf="unsavedImage" mode="indeterminate" color="accent"></mat-progress-bar>
              <a mat-button *ngIf="pin.image?.url" color="primary" [href]="pin.image.url" target="_blank">
                  Download Image
              </a>
              <button mat-button *ngIf="!unsavedImage && pin.pointUrl" color="warn" (click)="deletePin()">
                  Delete Pin
              </button>
          </div>
          <div class="image">
              <ng-container *ngIf="!pin.image">
                  <app-image-input [unsavedImage]="unsavedImage"
                                   (unsavedImageChange)="savePinWithImage($event)">
                  </app-image-input>
                  <app-image [image]="unsavedImage"></app-image>
              </ng-container>
              <app-image *ngIf="pin.image" [image]="pin.image"></app-image>
          </div>
      </mat-card>
  `
})
export class SidebarComponent implements OnChanges {

  @Input() pin: Partial<SavedPin>;

  @ViewChild(ImageInputComponent, { static: false })
  private imageInputComponent: ImageInputComponent;

  unsavedImage: Image;

  constructor(private store: Store, public dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.pin && this.pin.pointUrl) {
      this.unsavedImage = undefined;
    }
  }

  selectImage() {
    this.imageInputComponent.openFileDialog();
  }

  unselectPin() {
    this.store.dispatch(new UnselectPin());
  }

  savePinWithImage(unsavedImage: Image) {
    this.unsavedImage = unsavedImage;
    this.store.dispatch(new SavePin(unsavedImage));
  }

  deletePin() {
    this.store.dispatch(new DeletePin());
  }

  printPoint(point: PinPoint): string {
    return toDMS(point.lat) + ', ' + toDMS(point.lng);
  }

  share(point: PinPoint) {
    this.dialog.open(ShareDialogComponent, {data: point});
  }

}
