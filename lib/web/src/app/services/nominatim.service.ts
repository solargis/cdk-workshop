import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { GeocodeResponse, ReverseGeocodeResponse } from 'shared/types/nominatim.types';
import { PinPoint } from 'shared/types/pin.types';

// adapted from https://github.com/shrinivas93/angular-nominatim

@Injectable()
export class NominatimService {
  
  constructor(private http: HttpClient) {}
  
  getLocation(q: string, addressdetails = 1, polygon_geojson = 0): Observable<GeocodeResponse[]> {
    return this.http.get<GeocodeResponse[]>('https://nominatim.openstreetmap.org/search', {
      params: {
        q,
        addressdetails: addressdetails.toString(),
        polygon_geojson: polygon_geojson.toString(),
        format: 'json'
      }
    });
  }
  
  getAddress({ lat, lng }: PinPoint, addressdetails = 1, polygon_geojson = 0): Observable<ReverseGeocodeResponse> {
    let params = new HttpParams();
    return this.http.get<ReverseGeocodeResponse>('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: lat.toString(),
        lon: lng.toString(),
        addressdetails: addressdetails.toString(),
        polygon_geojson: polygon_geojson.toString(),
        format: 'json'
      }
    });
  }
}
