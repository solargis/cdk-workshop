import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'

import { Image, SavedImage } from 'shared/types/pin.types'

@Component({
  selector: 'app-image',
  styles: [
    `
      .bottom {
        display: flex;
        justify-content: space-between;
        padding-top: 8px;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    `
  ],
  template: `
    <mat-progress-bar
      *ngIf="image && loading"
      mode="query"
      color="primary"
    ></mat-progress-bar>
    <ng-container *ngIf="image">
      <div *ngIf="image.url || image.dataUrl">
        <img
          [src]="image.url || image.dataUrl"
          [ngStyle]="{ display: loading ? 'none' : 'inline-block' }"
          (load)="loading = false"
        />
      </div>
      <div *ngIf="diplayBottom" class="bottom">
        <div>{{ image.size | filesize }}</div>
        <div>{{ image.lastModified | date }}</div>
      </div>
    </ng-container>
  `
})
export class ImageComponent implements OnChanges {
  @Input() image: Partial<SavedImage>

  @Input() diplayBottom: boolean = true

  loading = true

  ngOnChanges (changes: SimpleChanges): void {
    if (changes.image && this.image) {
      this.loading = true
    }
  }
}
