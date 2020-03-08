import { Component, OnInit } from '@angular/core';
import { ImageStorageService } from '../image-storage.service';

@Component({
  selector: 'app-load-images',
  templateUrl: './load-images.component.html',
  styleUrls: ['./load-images.component.css']
})
export class LoadImagesComponent implements OnInit {

  constructor(private imageStorageService: ImageStorageService) { }

  ngOnInit() {
  }

  uploadFile(event) {
    const images = Array.from(event).map((e: any) => {
      const url = e.name;
      //Absurd regex pulled from stackoverflow that should trim the file extension...
      const imageName = url.replace(/\.[^/.]+$/, "");
      return {
        name: imageName,
        url: url,
        data: e
      };
    });

    Promise.all(this.imageStorageService.loadImages(images)).then((loadedImages) => {
      console.log('Loaded images!');
    }, (err) => {
      console.error(err);
    })
  }

}
