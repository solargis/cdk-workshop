import { PinPoint } from '../types/pin.types';

const LATLNG_DECIMAL_PLACES = 6;

function round(num: number, decimalPlaces: number): number {
  return parseFloat(num.toFixed(decimalPlaces));
}

export function pointToUrl(latlng: PinPoint, separator = ','): string {
  return [latlng.lat, latlng.lng]
    .map((l) => round(l, LATLNG_DECIMAL_PLACES))
    .join(separator);
}

export function urlToPoint(url: string, separator = ','): PinPoint | undefined {
  if(url) {
    const pointParts = url.split(separator);
    if(pointParts.length === 2) {
      return {lat: parseFloat(pointParts[0]), lng: parseFloat(pointParts[1])}
    }
  }
  return undefined;
}

export function toDMS(value: number, precision = 0): string {
  let power, degrees, minutes, seconds, rest, result = [];

  if (value < 0) {
    result.push('-');
    value = Math.abs(value);
  }
  power = int(Math.pow(10, precision || 0));
  degrees = Math.floor(value);
  value = (value - degrees) * 60;
  minutes = Math.floor(value);
  value = (value - minutes) * 60;
  seconds = precision ? Math.floor(value) : Math.round(value);
  value = (value - seconds) * power;
  rest = precision ? Math.round(value) : 0;

  // rounding corrections
  seconds += int(rest / power);
  rest = rest % power;
  minutes += int(seconds / 60);
  seconds = seconds % 60;
  degrees += int(minutes / 60);
  minutes = minutes % 60;

  result.push(zeroPadding(degrees, 2), '°');
  result.push(zeroPadding(minutes, 2), '\'');
  result.push(zeroPadding(seconds, 2));
  if (rest > 0) {
    result.push(".", zeroPadding(rest, precision));
  }
  result.push('"');
  return result.join("");
}

const int = (n: number) => Math.sign(n) * Math.floor(Math.abs(n));

const zeroPadding = (value: any, length: number) => (''+value).padStart(length, '0');
