import { Meta } from '@angular/platform-browser';

export class Config {
  apiBaseUrl: string
}

export function configFactory(meta: Meta): Config {
  const apiBaseMeta = meta.getTag('name=x-api-base');
  return {
    apiBaseUrl: apiBaseMeta.content
  };
}
