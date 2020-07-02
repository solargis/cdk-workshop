import { Routes } from '@angular/router'
import { MapComponent } from './components/map.component'
import { ImagePageComponent } from './components/image.page.component'

export const routes: Routes = [
  {
    path: '',
    component: MapComponent
  },
  {
    path: ':id',
    component: ImagePageComponent
  }
]
