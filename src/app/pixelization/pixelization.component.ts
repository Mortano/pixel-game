import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import * as THREE from "three";
import { RecursiveGrid } from 'src/util/recursive_grid';

enum State {
  ShowPixelized,
  ShowSolution
}

@Component({
  selector: 'app-pixelization',
  templateUrl: './pixelization.component.html',
  styleUrls: ['./pixelization.component.css']
})
export class PixelizationComponent implements AfterViewInit {

  @ViewChild('mainCanvas')
  private _mainCanvas: ElementRef;

  private _renderer: THREE.WebGLRenderer;
  private _scene: THREE.Scene;
  private _camera: THREE.Camera;

  private _imageMesh: THREE.Mesh;

  private _pixelizeMaterial: THREE.ShaderMaterial;
  private _regularMaterial: THREE.ShaderMaterial;

  private _samplingMap: THREE.Texture;

  private _samplingGrid: RecursiveGrid;

  private _state: State = undefined;

  private readonly SAMPLE_IMAGE_RESOLUTION = 256;
  private readonly UPDATE_INTERVAL = 20; //ms

  ngAfterViewInit(): void {

    var context = this._mainCanvas.nativeElement.getContext('webgl2', { alpha: false });

    this._renderer = new THREE.WebGLRenderer({
      canvas: this._mainCanvas.nativeElement,
      context: context
    } as any);
    this._renderer.setSize(512, 512);

    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this._scene = new THREE.Scene();

    const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const indices = [0, 1, 2, 0, 2, 3];

    const geo = new THREE.BufferGeometry();
    geo.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    this._imageMesh = new THREE.Mesh(geo);
    this._scene.add(this._imageMesh);

    this._samplingGrid = new RecursiveGrid(this.SAMPLE_IMAGE_RESOLUTION);
    this._samplingMap = new THREE.DataTexture(this._samplingGrid.data, this.SAMPLE_IMAGE_RESOLUTION, this.SAMPLE_IMAGE_RESOLUTION, THREE.AlphaFormat, THREE.UnsignedByteType);
    this._samplingMap.minFilter = THREE.LinearFilter;
    this._samplingMap.magFilter = THREE.LinearFilter;
    this.resetSamplingMap();

    this._createPixelizeMaterial();
    this._createRegularMaterial();

    this.render();
  }

  setImage(image: THREE.Texture) {
    this._renderer.setSize(image.image.width, image.image.height);
    this._pixelizeMaterial.uniforms["tex"].value = image;
    this._regularMaterial.uniforms["tex"].value = image;
  }

  startPixelization() {
    console.log('Starting pixelization!');
    this.resetSamplingMap();

    this.setState(State.ShowPixelized);

    this.updateLoop();
  }

  showSolution() {
    this.setState(State.ShowSolution);
  }

  public isRunning() {
    return this._state == State.ShowPixelized;
  }

  private setState(state: State) {
    if (state == this._state) return;

    this._state = state;
    switch (state) {
      case State.ShowPixelized:
        this._imageMesh.material = this._pixelizeMaterial;
        break;
      case State.ShowSolution:
        this._imageMesh.material = this._regularMaterial;
        break;
    }
  }

  private render() {
    requestAnimationFrame(() => this.render());
    this._renderer.render(this._scene, this._camera);
  }

  private updateLoop() {
    if (this._state == State.ShowSolution) return;

    this._samplingGrid.refineOne();
    this._samplingMap.needsUpdate = true;

    setTimeout(() => {
      this.updateLoop();
    }, this.UPDATE_INTERVAL);
  }

  private resetSamplingMap() {
    this._samplingGrid.reset();
    this._samplingMap.needsUpdate = true;
  }

  private _createPixelizeMaterial() {
    const vertSource = `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

    //It would be nice to use the mipmaps for pixelization, however automatic mipmap
    //creation only works on power-of-two textures :( Leaving this code in as a comment
    //if I ever get around to implementing manual mipmap creation

    //   const fragSourceWithMipmaps = `
    //   uniform sampler2D tex;
    //   uniform sampler2D samplingMap;

    //   varying vec2 vUv;

    //   void main() {
    //     float mipmapLevel = texture2D(samplingMap, vUv).a * 256.0;        
    //     float samplingFactor = pow(2.0, mipmapLevel);
    //     int uvX = int(floor(vUv.x * 512.0 / samplingFactor));
    //     int uvY = int(floor(vUv.y * 512.0 / samplingFactor));
    //     gl_FragColor = texelFetch(tex, ivec2(uvX, uvY), int(mipmapLevel));
    //   }
    // `;

    const fragSource = `
    uniform sampler2D tex;
    uniform sampler2D samplingMap;

    varying vec2 vUv;

    void main() {
      float mipmapLevel = texture2D(samplingMap, vUv).a * 256.0;        
      float samplingFactor = pow(2.0, mipmapLevel);
      float scaledU = floor(vUv.x * 512.0 / samplingFactor) * (samplingFactor / 512.0);
      float scaledV = floor(vUv.y * 512.0 / samplingFactor) * (samplingFactor / 512.0);
      gl_FragColor = texture2D(tex, vec2(scaledU, scaledV));
    }
  `;

    this._pixelizeMaterial = new THREE.ShaderMaterial({
      vertexShader: vertSource,
      fragmentShader: fragSource,
      uniforms: {
        'tex': { value: null },
        'samplingMap': { value: null }
      },
      name: "PixelizeMaterial"
    });

    this._pixelizeMaterial.uniforms['samplingMap'].value = this._samplingMap;
  }

  private _createRegularMaterial() {
    const vertSource = `

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

    const fragSource = `
    uniform sampler2D tex;

    varying vec2 vUv;

    void main() {
      gl_FragColor = texture2D(tex, vUv);
    }
  `;

    this._regularMaterial = new THREE.ShaderMaterial({
      vertexShader: vertSource,
      fragmentShader: fragSource,
      uniforms: {
        'tex': { value: null }
      },
      name: "RegularMaterial"
    });
  }

}
