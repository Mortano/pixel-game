import { Injectable, EventEmitter } from '@angular/core';

import * as THREE from "three";

export interface ImageInfo {
  name: string,
  url: string,
  data: Blob
}

export interface LoadedImage {
  name: string,
  image: THREE.Texture
}

@Injectable({
  providedIn: 'root'
})
export class ImageStorageService {

  private readonly ALLOWED_FILE_TYPES = [".jpg", ".jpeg", ".png"];

  private _images: LoadedImage[] = [];

  public get images(): LoadedImage[] {
    return this._images;
  }

  onImagesLoaded: EventEmitter<LoadedImage[]> = new EventEmitter();

  public get hasImagesLoaded(): boolean {
    return this._images.length > 0;
  }

  constructor() { }

  public loadImages(images: ImageInfo[]): Promise<LoadedImage[]> {
    this._images = [];
    return Promise.all(images.map((val, idx) => {
      if (!this.isValidFileType(val.url)) {
        return Promise.reject(`Unsupported image file type, must be one of [${this.ALLOWED_FILE_TYPES.reduce((accum, cur) => accum + " " + cur)}]`);
      }
      this._images.push({
        name: val.name,
        image: undefined
      });
      return this.tryLoadImage(val, idx);
    })).then(images => {
      this.onImagesLoaded.emit(images);
      return images;
    });
  }

  private tryLoadImage(image: ImageInfo, index: number): Promise<LoadedImage> {
    console.log(`Trying to load image ${image.url}`);
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      //TODO Handle failure
      reader.addEventListener('load', (event) => {

        const texture = new THREE.TextureLoader().load('assets/dummy.jpg', (tex) => {
          tex.image.src = event.target.result;
          tex.needsUpdate = true;

          this._images[index].image = tex;

          resolve(this._images[index]);
        }, () => { }, (err) => {
          console.log(err);
        });
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

      }, false);
      reader.addEventListener('error', (err) => {
        console.error(err);
      });
      reader.readAsDataURL(image.data);
    });
  }

  private isValidFileType(url: string): boolean {
    return this.ALLOWED_FILE_TYPES.some((extension) => {
      return url.toLowerCase().endsWith(extension);
    });
  }

}
