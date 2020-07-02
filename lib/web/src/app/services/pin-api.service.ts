import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'

import { Config } from '../config'
import { Image, Pin, SavedPin } from 'shared/types/pin.types'

@Injectable()
export class PinApiService {
  private pinApiUrl: string

  constructor (private http: HttpClient, config: Config) {
    this.pinApiUrl = config.apiBaseUrl + 'pin'
  }

  listPins (): Observable<SavedPin[]> {
    return this.http.get<SavedPin[]>(this.pinApiUrl)
  }

  savePin (
    pin: Pin,
    unsavedImage: Image,
    customName: string
  ): Observable<SavedPin> {
    return this.http.post<SavedPin>(this.pinApiUrl, {
      ...pin,
      customName,
      unsavedImage
    })
  }

  renamePin (pointUrl: string, customName: string) {
    return this.http.patch<SavedPin>(`${this.pinApiUrl}/${pointUrl}`, {
      customName
    })
  }

  deletePin (pointUrl: string): Observable<any> {
    return this.http.delete(this.pinApiUrl + '/' + pointUrl)
  }

  getPin (pointUrl: string): Observable<SavedPin> {
    return this.http.get<SavedPin>(this.pinApiUrl + '/' + pointUrl)
  }
}
