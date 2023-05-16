import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

import { Config } from '../config';
import { Image, Pin, SavedPin, SavedPinChange } from 'shared/types/pin.types';

@Injectable()
export class PinApiService {

  private pinApiUrl: string;
  private wsEndpointUrl: string

  constructor(private http: HttpClient, config: Config) {
    this.pinApiUrl = config.apiBaseUrl + 'pin';
    this.wsEndpointUrl = config.wsEndpointUrl;
  }

  listenPinChanges(): Observable<SavedPinChange> {
    const subject = new Subject<SavedPinChange>();
    const socket = new WebSocket(this.wsEndpointUrl);
    socket.addEventListener('message', ({ data }) => {
      const pinChanges = JSON.parse(data);
      pinChanges.forEach(pinChange => subject.next(pinChange));
    });
    // socket.addEventListener('close', () => { subject.complete(); });
    return subject;
  }

  listPins(): Observable<SavedPin[]> {
    return this.http
      .get<SavedPin[]>(this.pinApiUrl);
  }

  savePin(pin: Pin, unsavedImage: Image): Observable<SavedPin> {
    return this.http
      .post<SavedPin>(this.pinApiUrl, { ...pin, unsavedImage });
  }

  deletePin(pointUrl: string): Observable<any> {
    return this.http
      .delete(this.pinApiUrl + '/' + pointUrl);
  }

  // getPin(pointUrl: string): Observable<SavedPin> {
  //   return this.http
  //     .get<SavedPin>(this.pinApiUrl + '/' + pointUrl);
  // }

}
