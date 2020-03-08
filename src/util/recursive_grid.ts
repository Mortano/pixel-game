import * as isPOT from "is-power-of-two";

interface Extent2D {
    x: number,
    y: number,
    sidelength: number
}

class QuadtreeNode {
    public children: QuadtreeNode[];

    public get level(): number {
        return this._level;
    }

    public get extent(): Extent2D {
        return this._extent;
    }

    constructor(private _level: number, private _extent: Extent2D) {
        this.children = undefined;
    }

    public isLeaf(): boolean {
        return this.children == undefined;
    }

    public isInterior(): boolean {
        return !this.isLeaf();
    }

    public isFullyRefined(): boolean {
        return this._extent.sidelength == 1;
    }

    public convertToInterior(): void {
        if (!this.isLeaf()) throw new Error("Can't call makeInterior on a node that is already an interior node!");

        const childSidelength = this._extent.sidelength / 2;

        this.children = [
            new QuadtreeNode(this._level + 1, {
                x: this._extent.x,
                y: this._extent.y,
                sidelength: childSidelength
            }),
            new QuadtreeNode(this._level + 1, {
                x: this._extent.x + childSidelength,
                y: this._extent.y,
                sidelength: childSidelength
            }),
            new QuadtreeNode(this._level + 1, {
                x: this._extent.x,
                y: this._extent.y + childSidelength,
                sidelength: childSidelength
            }),
            new QuadtreeNode(this._level + 1, {
                x: this._extent.x + childSidelength,
                y: this._extent.y + childSidelength,
                sidelength: childSidelength
            })
        ];
    }

}

export interface RefineInfo {
    refinedLevel: number,
    pixelsRefined: number
}

/**
 * This is a 2D grid of pixels that represents the 'pixelization' of an image. This 
 * is done by assigning each pixe a value that corresponds to the mipmap level of the
 * image to sample from. It starts out with the smallest mipmap level for each pixel
 * and can be refined dynamically
 */
export class RecursiveGrid {

    /**
     * Stores the mipmap levels for each pixel
     */
    private _data: Uint8Array;
    private _maxMipmapLevel: number;

    private _quadtree: QuadtreeNode;
    private _leafNodes: Set<QuadtreeNode> = new Set<QuadtreeNode>();

    public get data(): Uint8Array {
        return this._data;
    }

    constructor(private sidelength: number) {
        if (!isPOT(sidelength)) throw new Error("Sidelength must be a power of two!");

        this._maxMipmapLevel = Math.log2(this.sidelength);

        this._data = new Uint8Array(sidelength * sidelength);
        this._data.fill(this._maxMipmapLevel);

        console.log(`Maximum mipmap level: ${this._maxMipmapLevel}`);

        this._quadtree = new QuadtreeNode(0, {
            x: 0,
            y: 0,
            sidelength: sidelength
        });
        this._leafNodes.add(this._quadtree);
    }

    public refineOne(): RefineInfo {
        const node = this._getRandomLeafNode();
        if (node == undefined) return undefined;
        if (node.isInterior()) throw new Error("Node should not be interior node!");

        let expectedVal = this._maxMipmapLevel - node.level;

        for (let y = node.extent.y; y < node.extent.y + node.extent.sidelength; ++y) {
            for (let x = node.extent.x; x < node.extent.x + node.extent.sidelength; ++x) {
                const idx1D = (y * this.sidelength) + x;
                this.data[idx1D] -= 1;
            }
        }

        node.convertToInterior();
        this._leafNodes.delete(node);
        if (!node.isFullyRefined()) {
            node.children.forEach(childNode => this._leafNodes.add(childNode));
        }

        return {
            refinedLevel: node.level,
            pixelsRefined: node.extent.sidelength * node.extent.sidelength
        };
    }

    public reset(): void {
        this._data.fill(this._maxMipmapLevel);

        this._quadtree = new QuadtreeNode(0, {
            x: 0,
            y: 0,
            sidelength: this.sidelength
        });
        this._leafNodes.clear();
        this._leafNodes.add(this._quadtree);
    }

    private _getRandomLeafNode(): QuadtreeNode {
        if (this._leafNodes.size == 0) return undefined;

        // Weight nodes by their area so that larger nodes have a higher chance
        // of being selected. We can do this by using the roulette wheel selection
        // algorithm

        const nodeWeight = (node: QuadtreeNode) => {
            return node.extent.sidelength * node.extent.sidelength;
        };

        const leafNodesAsArray = Array.from(this._leafNodes);
        const leafNodeWeights = leafNodesAsArray.map(nodeWeight);
        const totalWeight = leafNodeWeights.reduce((accum, weight) => accum + weight);

        const rndWeight = Math.random() * totalWeight;

        let partialSum = 0;
        for (let idx = 0; idx < leafNodeWeights.length; ++idx) {
            let weightEnd = partialSum + leafNodeWeights[idx];
            partialSum = weightEnd;
            if (rndWeight < weightEnd) return leafNodesAsArray[idx];
        }

        return leafNodesAsArray[leafNodesAsArray.length - 1];
    }

}