import { Component, Input } from '@angular/core';

import { Image, SavedImage } from 'shared/types/pin.types';

@Component({
  selector: 'app-image',
  styles: [`
    .bottom {
        display: flex;
        justify-content: space-between;
        padding-top: 8px;
    }
    img {
        max-width: 100%;
        height: auto;
    }
  `],
  template: `
      <mat-progress-bar *ngIf="image && loading" mode="query" color="primary"></mat-progress-bar>
      <ng-container *ngIf="image">
          <div *ngIf="image.url || image.dataUrl">
              <img [src]="image.url || image.dataUrl"
                   [ngStyle]="{'display': loading ? 'none' : 'inline-block'}"
                   (loadstart)="loading = true"
                   (loadeddata)="loading = false">
          </div>
          <div class="bottom">
              <div>{{ image.size | filesize }}</div>
              <div>{{ image.lastModified | date }}</div>
          </div>
      </ng-container>
  `
})
export class ImageComponent {

  @Input() image: Partial<SavedImage>;

  loading = false;

}
