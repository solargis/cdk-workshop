import { NominatimResponse } from './nominatim.types';

export type PinPoint = {
  lat: number,
  lng: number
}

export interface Pin {
  customName: string;
  point: PinPoint;
  address?: NominatimResponse;
  unsavedImage?: Image;
}

export interface Image {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  dataUrl?: string;
}

export interface SavedImage extends Image {
  s3key: string;
  url?: string;
}

export interface SavedPin extends Pin {
  pointUrl: string;
  sourceIp: string;
  created: number;
  image?: SavedImage;
  thumbnail?: SavedImage;
}
