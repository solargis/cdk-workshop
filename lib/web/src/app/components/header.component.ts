import { Component, HostListener, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Pin } from 'shared/types/pin.types';

@Component({
  selector: 'app-header',
  styles: [`
      :host {
          height: 48px;
          display: flex;
          align-items: center;
      }
      a, img {
          height: 24px;
          padding: 0 8px;
      }
      .title {
          flex: 1 0 auto;
          font-size: 14px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.87);
      }
      .search {
          flex: 0 0 260px;
          padding: 24px 16px 0px 16px;
      }
      .langSelect {
        padding: 24px 16px 0px 16px;
        margin: 3px;
      }
  `],
  template: `
    <ng-container *ngIf="isDesktop || !searchActive">
      <a href="https://solargis.com" target="_blank">
        <img src="assets/solargis.svg" />
      </a>
      <div class="title">CDK FULLSTACK WORKSHOP</div>
    </ng-container>
    <button mat-button *ngIf="!isDesktop" (click)="searchActive = true">
      <mat-icon>{{ 'SEARCH' | translate }}</mat-icon>
    </button>
    <div class="search" *ngIf="isDesktop || searchActive">
      <app-search [pin]="pin" [(searchActive)]="searchActive"></app-search>
    </div>
    <div class="langSelect">
      <mat-form-field appearance="fill">
        <mat-label>{{ 'LANGUAGE' | translate }}</mat-label>
        <mat-select (selectionChange)="onLangSelect($event)">
          <mat-option [value]="languages.en">
            English
          </mat-option>
          <mat-option [value]="languages.sk">
            Slovenčina
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `
})
export class HeaderComponent implements OnInit {
  constructor (private translation: TranslateService) {}
  @Input() pin: Pin;

  languages = { en: 'en', sk: 'sk' };
  isDesktop: boolean;
  searchActive = false;

  ngOnInit(): void {
    this.translation.use('sk');
    this.onResize();
  }

  onLangSelect(event) {
    this.translation.use(event.value);
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth > 863;
  }
}
