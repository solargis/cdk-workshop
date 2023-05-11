import { Meta } from '@angular/platform-browser';

export class Config {
  apiBaseUrl: string
  wsEndpointUrl: string
}

export function configFactory(meta: Meta): Config {
  const apiBaseMeta = meta.getTag('name=x-api-base');
  const wsEndpointMeta = meta.getTag('name=x-ws-endpoint')
  return {
    apiBaseUrl: apiBaseMeta.content,
    wsEndpointUrl: wsEndpointMeta.content
  };
}
