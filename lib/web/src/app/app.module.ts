import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserModule, Meta } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxsModule } from '@ngxs/store';
import { FileSizeModule } from 'ngx-filesize';

import { AppComponent } from './components/app.component';
import { HeaderComponent } from './components/header.component';
import { ImageComponent } from './components/image.component';
import { MapComponent } from './components/map.component';
import { SearchComponent } from './components/search.component';
import { SidebarComponent } from './components/sidebar.component';
import { ImageInputComponent } from './components/image-input.component';
import { Config, configFactory } from './config';
import { NominatimService } from './services/nominatim.service';
import { PinState } from './state/pin.state';
import { environment } from '../environments/environment';
import { PinApiService } from './services/pin-api.service';


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ImageComponent,
    ImageInputComponent,
    MapComponent,
    SearchComponent,
    SidebarComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    FileSizeModule,
    HttpClientModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    NgxsModule.forRoot([PinState], {
      developmentMode: !environment.production
    })
  ],
  providers: [
    NominatimService,
    PinApiService,
    { provide: Config, useFactory: configFactory, deps: [Meta] }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {

}
