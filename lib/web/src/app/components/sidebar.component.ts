import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Store } from '@ngxs/store';

import { ImageInputComponent } from './image-input.component';
import { DeletePin, SavePin, UnselectPin } from '../state/pin.state';
import { PinPoint, SavedPin, Image } from 'shared/types/pin.types';
import { toDMS } from 'shared/utils/point.utils';

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
  `],
  template: `
      <mat-card>
          <mat-card-title>
              {{ printPoint(pin.point) }}
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
  
  @ViewChild(ImageInputComponent)
  private imageInputComponent: ImageInputComponent;
  
  unsavedImage: Image;
  
  constructor(private store: Store) {}
  
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
  
}
