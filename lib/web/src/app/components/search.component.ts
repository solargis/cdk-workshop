import {
  Component,
  ElementRef, EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, of } from 'rxjs';
import { debounceTime, map, startWith, switchMap } from 'rxjs/operators';

import { NominatimService } from '../services/nominatim.service';
import { PinFromSearch } from '../state/pin.state';
import { Pin } from 'shared/types/pin.types';


@Component({
  selector: 'app-search',
  styles: [`
      mat-form-field {
          width: 100%;
      }
      ::ng-deep .mat-form-field-underline {
          display: none;
      }
  `],
  template: `
      <!-- Search input -->
      <mat-form-field>
          <input matInput #searchInput
                 [matAutocomplete]="auto"
                 [formControl]="searchControl"
                 (focus)="searchActiveChange.emit(true)"
                 placeholder="Click into the map or search here">
          <button mat-icon-button matSuffix *ngIf="!searchActive">
              <mat-icon>search</mat-icon>
          </button>
          <button mat-icon-button matSuffix *ngIf="searchControl.value" (click)="clearSearch()">
              <mat-icon>close</mat-icon>
          </button>
      </mat-form-field>
      <!-- Search results -->
      <mat-autocomplete #auto>
          <ng-container *ngIf="searchInput.value">
              <mat-option *ngFor="let pin of (geocodedPins$ | async) | slice:0:5" [value]="pin"
                          (onSelectionChange)="selectPin(pin)">
                  {{ pin.address?.display_name }}
              </mat-option>
          </ng-container>
      </mat-autocomplete>
  `
})
export class SearchComponent implements OnInit, OnChanges {
  
  @Input() pin: Pin;
  @Input() searchActive: boolean;
  
  @Output() searchActiveChange = new EventEmitter<boolean>();
  
  @ViewChild('searchInput', { static: true })
  searchInput: ElementRef;
  
  searchControl = new FormControl();
  geocodedPins$: Observable<Pin[]>;
  
  constructor(private nominatim: NominatimService, private store: Store) {}
  
  ngOnInit(): void {
    const query$ = this.searchControl.valueChanges.pipe(debounceTime(100));
    
    this.geocodedPins$ = query$.pipe(
      switchMap(query => query && query.length >= 3
        ? this.nominatim.getLocation(query)
        : of(null)
      ),
      map(results => results && results.map(result => ({
          point: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          },
          address: result
        } as Pin))
      ),
      startWith(undefined)
    );
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.pin && !changes.pin.firstChange) {
      this.clearSearch();
    }
    if (changes.searchActive) {
      if (!changes.searchActive.previousValue && changes.searchActive.currentValue) {
        setTimeout(() => {
          this.searchInput.nativeElement.focus();
        })
      }
    }
  }
  
  @HostListener('document:keyup.escape')
  public clearSearch() {
    this.searchControl.setValue(null);
    setTimeout(() => {
      this.searchInput.nativeElement.blur();
      this.searchActiveChange.emit(false);
    });
  }
  
  selectPin(pin: Pin) {
    this.store.dispatch(new PinFromSearch(pin));
  }
  
}
