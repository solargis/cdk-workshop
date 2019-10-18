import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Image } from 'shared/types/pin.types';

@Component({
  selector: 'app-image-input',
  template: `
      <input #fileInput type="file" accept="image/*" style="display:none;" [formControl]="inputControl"/>
  `
})
export class ImageInputComponent implements OnInit, OnDestroy {
  
  @Input() unsavedImage: Image;
  @Output() unsavedImageChange = new EventEmitter<Image>();
  
  @ViewChild('fileInput', { static: true })
  input: ElementRef;
  
  inputControl = new FormControl();
  
  subscription: Subscription;
  
  ngOnInit(): void {
    this.subscription = this.inputControl.valueChanges.pipe(
      map(() => this.input.nativeElement.files[0]),
      switchMap(file => new Observable<Image>(observer => {
        if (!file) observer.next(null);
        else {
          const { name, type, size, lastModified } = file;
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            observer.next({
              name, type, size, lastModified, dataUrl: reader.result as string
            })
          });
          reader.readAsDataURL(file);
        }
      })),
    ).subscribe(image => this.unsavedImageChange.emit(image));
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  openFileDialog() {
    this.input.nativeElement.click();
  }
  
}

