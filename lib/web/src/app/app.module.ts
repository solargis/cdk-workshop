import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule, Meta } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { Config, configFactory } from './config';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    { provide: Config, useFactory: configFactory, deps: [Meta] }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

}

