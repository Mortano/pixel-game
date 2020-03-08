import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import { PixelizationComponent } from './pixelization/pixelization.component';
import { ImageStorageService } from './image-storage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {

  title = 'app';

  @ViewChild("pixelization")
  private _pixelization: PixelizationComponent;

  private _currentImageIndex: number = 0;

  constructor(public imageStorageService: ImageStorageService) {
    imageStorageService.onImagesLoaded.subscribe((loadedImages) => {
      this._currentImageIndex = -1;
      // this._pixelization.setImage(loadedImages[0].image);
      // this._pixelization.startPixelization();
    });
  }

  ngAfterViewInit(): void {
    document.onkeyup = (evt) => {
      if (evt.key !== ' ') return;
      if (!this.imageStorageService.hasImagesLoaded) return;

      if (this._pixelization.isRunning()) {
        this._pixelization.showSolution();
      } else {
        //Show next image or done screen
        if (this._currentImageIndex < (this.imageStorageService.images.length - 1)) {
          this.showNextImage();
        } else {
          console.log('Done');
        }
      }
    };
  }

  private showNextImage() {
    this._currentImageIndex += 1;
    this._pixelization.setImage(this.imageStorageService.images[this._currentImageIndex].image);
    this._pixelization.startPixelization();
  }

}
