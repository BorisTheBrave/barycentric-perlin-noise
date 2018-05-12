// In the following code, the length of Vectors is always n,
// the number of output dimensions for the barcentric noise
export type Vector = number[];

export function add(v1: Vector, v2: Vector):Vector
{
    return v1.map((value, index) => v1[index] + v2[index])
}

export function scale(s: number, v: Vector): Vector
{
    return v.map(value => s * value);
}

export function shift(s: number, v: Vector): Vector
{
    return v.map(value => s + value);
}

function randomTangent(): [number, number]
{
    let angle = Math.random() * 2 * Math.PI;
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    return [s, c]
}

// Chooses a random barycentric gradient.
// NB: This gets less efficient for higher n,
// there's proabably a better way to do this.
function randomTangentB(n: number):Vector
{
    while(true)
    {
        let v = new Array(n);
        let sum = 0;
        for(let i=0; i<n-1; i++) 
        {
            v[i] = Math.random() * 2 - 1;
            sum += v[i];
        }
        v[n-1] = -sum;
        let d2 = v.map(x => x*x).reduce((a, b) => a + b, 0);
        if(d2 <= 1)
        {
            let d = Math.sqrt(d2)
            return v.map(x => x / d);
        }
    }
}

export type BarycentricPerlinType = "INDEP_AXES" | "BARYCENTRIC_VARIANT" | "BARYCENTRIC";

export class BarycentricPerlin
{
    gradients: [Vector, Vector][][];
    offsets: Vector[][];

    constructor(public n: number, public width: number, public height: number, public type: BarycentricPerlinType = "BARYCENTRIC")
    {
    }

    regen(): void
    {
        this.gradients = [];
        this.offsets = [];
        for(let x=0; x <= this.width; x++) {
            this.gradients[x] = [];
            this.offsets[x] = [];
            for(let y=0; y <= this.height; y++) {
                console.log("regen", x, y);
                switch(this.type)
                {
                case "INDEP_AXES":
                    let t = new Array(this.n);
                    let o = new Array(this.n);
                    for(let i=0;i<this.n;i++) {
                        t[i] = randomTangent();
                        o[i] = 0;
                    }
                    let t3 = randomTangent();
                    this.gradients[x][y] = [t.map(x => x[0]), t.map(x => x[1])];
                    this.offsets[x][y] = o;
                    break;
                case "BARYCENTRIC_VARIANT":
                {
                    let o = new Array(this.n);
                    for(let i=0;i<this.n;i++) {
                        o[i] = 0;
                    }
                    let angle = Math.random() * 2 * Math.PI;
                    let s = Math.sin(angle);
                    let c = Math.cos(angle);
                    let t:Vector = randomTangentB(this.n);
                    this.gradients[x][y] = [scale(s, t), scale(c, t)];
                    this.offsets[x][y] = o;
                    break;
                }
                case "BARYCENTRIC":
                {
                    let t:Vector = randomTangentB(this.n);
                    let maxL = Number.POSITIVE_INFINITY;
                    let minL = Number.NEGATIVE_INFINITY;
                    for(let i=0;i<this.n;i++)
                    {
                        if(t[i] != 0)
                        {
                            let l = -1/this.n / t[i];
                            if(l < 0)
                            {
                                minL = Math.max(minL, l);
                            }else{
                                maxL = Math.min(maxL, l);
                            }
                        }
                    }
                    if(maxL < minL)
                        throw new Error();
                    let center = (minL + maxL) / 2;
                    let halfWidth = (maxL - minL) / 2;
                    let offset = shift(1 / this.n, scale(center, t))
                    t = scale(halfWidth, t);

                    let angle = Math.random() * 2 * Math.PI;
                    let s = Math.sin(angle);
                    let c = Math.cos(angle);
                    this.gradients[x][y] = [scale(s, t), scale(c, t)];
                    this.offsets[x][y] = offset;
                }
                }
            }
        }
    }
    
    // Function to linearly interpolate between a0 and a1
    // Weight w should be in the range [0.0, 1.0]
    lerp(a0: Vector, a1: Vector, w: number): Vector
    {
        w = w*w*w* (6* w *w -15 * w + 10)
        return add(scale((1.0 - w),a0), scale(w, a1));
    }
    
    // Computes the dot product of the distance and gradient vectors.
    dotGridGradient(ix: number, iy: number, x: number, y: number): Vector
    {
        let dx = x - ix;
        let dy = y - iy;
        let g = this.gradients[ix][iy];
        return add(add(scale(dx, g[0]), scale(dy, g[1])), this.offsets[ix][iy]);
    }
    
    // Compute Perlin noise at coordinates x, y
    eval(x: number, y: number): Vector
    {
        if(!this.gradients) {
            throw new Error("BarycentricPerlin must first be initialized by calling regen.")
        }

        // Determine grid cell coordinates
        let x0 = Math.floor(x);
        let x1 = x0 + 1;
        let y0 = Math.floor(y);
        let y1 = y0 + 1;
    
        // Determine interpolation weights
        // Could also use higher order polynomial/s-curve here
        let  sx = x - x0;
        let sy = y - y0;
    
        // Interpolate between grid point gradients
        let n0 = this.dotGridGradient(x0, y0, x, y);
        let n1 = this.dotGridGradient(x1, y0, x, y);
        let ix0 = this.lerp(n0, n1, sx);
        n0 = this.dotGridGradient(x0, y1, x, y);
        n1 = this.dotGridGradient(x1, y1, x, y);
        let ix1 = this.lerp(n0, n1, sx);
        let value = this.lerp(ix0, ix1, sy);
    
        return value;
    }
}

