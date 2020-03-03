import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import * as THREE from "three";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {

  title = 'app';

  @ViewChild('mainCanvas')
  private _mainCanvas: ElementRef;

  private _renderer: THREE.WebGLRenderer;
  private _scene: THREE.Scene;
  private _camera: THREE.Camera;

  private _material: THREE.ShaderMaterial;

  private _images: THREE.Texture[] = [];
  private _curImage: number = -1;
  private _running: boolean = false;

  private _samplingMap: THREE.Texture;
  private _samplingMapData: Uint8Array;

  private readonly _imageWidth = 256;
  private readonly _imageHeight = 256;
  private readonly _startValue = 128;
  private readonly UPDATE_INTERVAL = 80; //ms
  

  ngAfterViewInit(): void {
    document.onkeyup = (evt) => {
      if(evt.key !== ' ') return;

      if(!this._running) {
        this.start();
      } else {
        this.nextImage();
      }
    };


    this._renderer = new THREE.WebGLRenderer({
      canvas: this._mainCanvas.nativeElement
    });
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this._scene = new THREE.Scene();

    const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const indices = [0, 1, 2, 0, 2, 3];

    const geo = new THREE.BufferGeometry();
    geo.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const vertSource = `

      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragSource = `
      uniform sampler2D texture;
      uniform sampler2D samplingMap;

      varying vec2 vUv;

      void main() {
        float samplingFactor = texture2D(samplingMap, vUv).a * 256.0;
        float scaledU = floor(vUv.x * 512.0 / samplingFactor) * (samplingFactor / 512.0);
        float scaledV = floor(vUv.y * 512.0 / samplingFactor) * (samplingFactor / 512.0);
        gl_FragColor = texture2D(texture, vec2(scaledU, scaledV));
        //gl_FragColor = vec4(scaledU, scaledV, 0.0, 1.0);
      }
    `;

    this._material = new THREE.ShaderMaterial({
      vertexShader: vertSource,
      fragmentShader: fragSource,
      uniforms: {
        'texture': { value: null },
        'samplingMap': { value: null }
      }
    });

    const imageMesh = new THREE.Mesh(geo, this._material);
    this._scene.add(imageMesh);

    this._samplingMapData = new Uint8Array(this._imageHeight * this._imageWidth);
    this._samplingMap = new THREE.DataTexture(this._samplingMapData, this._imageWidth, this._imageHeight, THREE.AlphaFormat, THREE.UnsignedByteType);
    this._samplingMap.minFilter = THREE.LinearFilter;
    this._samplingMap.magFilter = THREE.LinearFilter;
    this.resetSamplingMap();

    this._material.uniforms['samplingMap'].value = this._samplingMap;

    //TODO Generic image loading code
    const path = 'assets/images/tracer.jpg';
    const texture = new THREE.TextureLoader().load(path);
    texture.minFilter = THREE.NearestFilter;
    this._images.push(texture);

    this.render();
  }

  start() {
    this._curImage = 0;
    this._material.uniforms['texture'].value = this._images[this._curImage];
    this.resetSamplingMap();
    this._running = true;

    setTimeout(() => {
      this.updateSamplingMap();
    }, this.UPDATE_INTERVAL);
  }

  nextImage() {
    if(this._curImage === this._images.length - 1) {
      this._running = false;
      return;
    }

    this._curImage++;
    this._material.uniforms['texture'].value = this._images[this._curImage];
    this.resetSamplingMap();
  }

  private render() {
    requestAnimationFrame(() => this.render());
    this._renderer.render(this._scene, this._camera);
  }

  private resetSamplingMap() {
    for (let idx = 0; idx < this._samplingMapData.length; ++idx) {
      this._samplingMapData[idx] = this._startValue;
    }
    this._samplingMap.needsUpdate = true;
  }

  private updateSamplingMap() {
    if(!this._running) return;

    //Pick a quadrant and refine it recursively. If it is not refined, we split it into 4 smaller quadrants, otherwise
    //we pick one of the quadrants and repeat, until we find a non-refined quadrant or a quadrant that has size 1    
    this.tryRefineQuadrant(0, 0, 0);
    setTimeout(() => {
      this.updateSamplingMap();
    }, this.UPDATE_INTERVAL);
  }

  private tryRefineQuadrant(originX: number, originY: number, depth: number) {
    const quadrantSize = (depth) => { return this._imageWidth / Math.pow(2, depth); };
    const isQuadrantUnrefined = (originX, originY, quadrantDepth) => {
      const length = quadrantSize(quadrantDepth);
      const startIdx = (originY * this._imageWidth) + originX;
      const valueAtLevel = Math.floor(this._startValue * (quadrantSize(quadrantDepth) / this._imageWidth));
      for (let idx = startIdx + 1; idx < startIdx + length; ++idx) {
        if (this._samplingMapData[idx] < valueAtLevel) return false;
      }
      return true;
    };

    if (quadrantSize(depth) === 1) {
      console.log("Can't refine quadrant with size 1");
      return;
    }

    if(this._samplingMapData[(originY * this._imageWidth) + originX] === 1) {
      console.log('Quadrant is already completely refined!');
      return;
    }

    if (isQuadrantUnrefined(originX, originY, depth)) {
      this.refineQuadrant(originX, originY, quadrantSize(depth));
      return;
    }

    depth += 1;
    const shiftX = Math.floor(Math.random() * 2);
    const shiftY = Math.floor(Math.random() * 2);

    const newQuadrantSize = quadrantSize(depth);

    this.tryRefineQuadrant(originX + shiftX * newQuadrantSize, originY + shiftY * newQuadrantSize, depth);
  }

  private refineQuadrant(originX: number, originY: number, size: number) {

    //Either split the quadrant up into 4 new quadrants (if its values already match its level), or half the values

    const valueAtLevel = Math.floor(this._startValue * (size / this._imageWidth));
    const startIdx = (originY * this._imageWidth) + originX;
    const actualValue = this._samplingMapData[startIdx];
    if (valueAtLevel === actualValue) {
      //Time to split up into 4 pieces
      const shiftX = Math.floor(Math.random() * 2) * (size / 2);
      const shiftY = Math.floor(Math.random() * 2) * (size / 2);

      for (let y = originY + shiftY; y < originY + shiftY + (size / 2); ++y) {
        for (let x = originX + shiftX; x < originX + shiftX + (size / 2); ++x) {
          const idx = (y * this._imageWidth) + x;
          this._samplingMapData[idx] = Math.floor(this._samplingMapData[idx] / 2);
        }
      }
    } else {
      //Just half the values
      for (let y = originY; y < originY + size; ++y) {
        for (let x = originX; x < originX + size; ++x) {
          const idx = (y * this._imageWidth) + x;
          this._samplingMapData[idx] = Math.floor(this._samplingMapData[idx] / 2);
        }
      }
    }

    this._samplingMap.needsUpdate = true;
  }

}
