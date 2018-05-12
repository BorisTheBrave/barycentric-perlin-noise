// In the following code, the length of Vectors is always n,
// the number of output dimensions for the barcentric noise
export type Vector = number[];

// Adds two vectors
export function add(v1: Vector, v2: Vector):Vector
{
    return v1.map((value, index) => v1[index] + v2[index])
}

// Multiplies a vector by a scalar
export function scale(s: number, v: Vector): Vector
{
    return v.map(value => s * value);
}

// Adds a scalar to a vector pointwise
export function shift(s: number, v: Vector): Vector
{
    return v.map(value => s + value);
}

// Return a random unit vector in 2d space
function randomTangent(): [number, number]
{
    let angle = Math.random() * 2 * Math.PI;
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    return [s, c]
}

// Chooses a random barycentric gradient of dimention n.
// I.e. a unit vector with a component sum of zero.
// NB: This gets less efficient for higher n,
// there's proabably a better way to do this.
function randomTangentB(n: number):Vector
{
    while(true)
    {
        let v = new Array(n);
        // Component sum
        let sum = 0;
        // Sum of squares
        let d2 = 0
        for(let i=0; i<n-1; i++) 
        {
            let x = Math.random() * 2 - 1;
            v[i] = x;
            sum += x;
            d2 += x * x;
        }
        v[n-1] = -sum;
        d2 += v[n-1] * v[n-1];
        if(d2 <= 1)
        {
            // Normalize
            let d = Math.sqrt(d2)
            return v.map(x => x / d);
        }
    }
}

export type BarycentricPerlinType = 
    // Evaluates n independent Perlin noises with nothing special
    "INDEP_AXES" |
    // An n-dimensional perlin with component sum 0 and range [-1, 1]
    "BARYCENTRIC_VARIANT" |
    // An n-dimensional perlin with component sum 1 and range [0, 1]
    "BARYCENTRIC";

export class BarycentricPerlin
{
    // The gradient randomly chosen for each
    // integer co-ordinate
    gradients: [Vector, Vector][][];
    // The value the noise takes on the integer co-ordinate.
    // This is always zero for INDEP_AXES and BARYCENTRIC_VARIANT
    offsets: Vector[][];

    constructor(public n: number, public width: number, public height: number, public type: BarycentricPerlinType = "BARYCENTRIC")
    {
    }

    // Generate random gradients. This must be called before eval
    regen(): void
    {
        this.gradients = [];
        this.offsets = [];
        let origin = new Array(this.n);
        for(let i=0;i<this.n;i++) {
            origin[i] = 0;
        }

        for(let x=0; x <= this.width; x++) {
            this.gradients[x] = [];
            this.offsets[x] = [];
            for(let y=0; y <= this.height; y++) {
                switch(this.type)
                {
                case "INDEP_AXES":
                    // Just call randomTangent n times.
                    let t = new Array(this.n);
                    for(let i=0;i<this.n;i++) {
                        t[i] = randomTangent();
                    }
                    this.gradients[x][y] = [t.map(x => x[0]), t.map(x => x[1])];
                    this.offsets[x][y] = origin;
                    break;
                case "BARYCENTRIC_VARIANT":
                {
                    // Take a random output unit tangent, and a random input unit tangent.
                    // And setup the gradient to map one to the other.
                    // NB: The gradient is from a 2d space to a nd space, so there's a lot
                    // of degrees of freedom that we're not using here, but I experimented a bit
                    // and it's not really visible to do anything more.
                    let angle = Math.random() * 2 * Math.PI;
                    let s = Math.sin(angle);
                    let c = Math.cos(angle);
                    let t:Vector = randomTangentB(this.n);
                    this.gradients[x][y] = [scale(s, t), scale(c, t)];
                    this.offsets[x][y] = origin;
                    break;
                }
                case "BARYCENTRIC":
                {
                    let t:Vector = randomTangentB(this.n);
                    let maxL = Number.POSITIVE_INFINITY;
                    let minL = Number.NEGATIVE_INFINITY;
                    // Find the range of values for l such that
                    // (l * t + simplexCenter) is still inside the 
                    // simplex. Recall the simplex is bounded by hyperplane
                    // x_i >= 0, so this is easy to calculate.
                    for(let i=0;i<this.n;i++)
                    {
                        if(t[i] != 0)
                        {
                            let l = -1 / this.n / t[i];
                            if(l < 0)
                            {
                                minL = Math.max(minL, l);
                            } else {
                                maxL = Math.min(maxL, l);
                            }
                        }
                    }
                    if(maxL < minL)
                        throw new Error();
                    // Given minL and maxL, we compute how to 
                    // scale and offset the gradient so that the range
                    // matches minL and maxL
                    let center = (minL + maxL) / 2;
                    let halfWidth = (maxL - minL) / 2;
                    let offset = shift(1 / this.n, scale(center, t))
                    t = scale(halfWidth, t);

                    // Same as BARYCENTRIC_VARIANT
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
    
    // Function to interpolate between a0 and a1
    // Weight w should be in the range [0.0, 1.0]
    private lerp(a0: Vector, a1: Vector, w: number): Vector
    {
        w = w*w*w* (6* w *w -15 * w + 10)
        return add(scale((1.0 - w),a0), scale(w, a1));
    }
    
    // Computes the dot product of the distance and gradient vectors.
    private dotGridGradient(ix: number, iy: number, x: number, y: number): Vector
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

