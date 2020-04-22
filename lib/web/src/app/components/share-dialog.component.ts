import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PinPoint } from 'shared/types/pin.types';

@Component({
  styles: [``],
  template: `
      {{getPointUrl()}}
      <button class="share" mat-icon-button matTooltip="Copy" (click)="copyUrl()">
        <mat-icon>file_copy</mat-icon>
      </button>
  `
})
export class ShareDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: PinPoint) {
  }

  getPointUrl(): string {
    return `${window.location.origin}?p=${this.data.lat},${this.data.lng}`;
  }

  copyUrl(): void {
    this.copyMessage(this.getPointUrl());
  }

  private copyMessage(val: string): void {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }
}
