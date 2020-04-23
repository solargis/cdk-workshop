import { Component, HostListener, Input, OnInit } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
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
  `],
  template: `
      <ng-container *ngIf="isDesktop || !searchActive">
          <a href="https://solargis.com" target="_blank">
              <img src="assets/solargis.svg">
          </a>
          <div class="title">{{'header.title' | transloco}}</div>
      </ng-container>
      <button mat-button *ngIf="!isDesktop" (click)="searchActive = true">
          <mat-icon>search</mat-icon>
      </button>
      <div class="search" *ngIf="isDesktop || searchActive">
          <app-search [pin]="pin" [(searchActive)]="searchActive"></app-search>
      </div>
      <select (change)="changeLang()" [(ngModel)]="lang">
        <option *ngFor="let lang of translocoService.getAvailableLangs()" [value]="lang">
          {{'lang.'+lang | transloco}}
        </option>
      </select>
  `
})
export class HeaderComponent implements OnInit {
  lang: string;
  constructor(public translocoService: TranslocoService){
    this.lang = translocoService.getActiveLang();
  }

  @Input() pin: Pin;

  isDesktop: boolean;
  searchActive = false;

  ngOnInit(): void {
    this.onResize();
  }

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth > 863;
  }

  changeLang() {
    this.translocoService.setActiveLang(this.lang);
  }

}
