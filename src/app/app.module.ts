import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PixelizationComponent } from './pixelization/pixelization.component';
import { LoadImagesComponent } from './load-images/load-images.component';
import { DragDropDirective } from './drag-drop.directive';

@NgModule({
  declarations: [
    AppComponent,
    PixelizationComponent,
    LoadImagesComponent,
    DragDropDirective
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
