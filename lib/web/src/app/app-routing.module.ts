import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PinDetailComponent } from './components/pin-detail.component';
import { MapWrapperComponent } from './components/map-wrapper.component';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: 'pin/:pointStr',
        pathMatch: 'full',
        component: PinDetailComponent
      },
      {
        path: '**',
        component: MapWrapperComponent
      }
    ])
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {}
