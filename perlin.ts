export type Vector = [number, number, number]

export function add(v1: Vector, v2: Vector):Vector
{
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

export function scale(s: number, v: Vector): Vector
{
    return [s*v[0], s*v[1], s*v[2]];
}

export function cross(v: Vector): Vector
{
    return scale(1/Math.sqrt(3), [
        v[1] - v[2],
        v[2] - v[0],
        v[0] - v[1],
    ]);
}

export function shift(s: number, v: Vector): Vector
{
    return [s + v[0], s + v[1], s + v[2]];
}

function randomTangent(): [number, number]
{
    let angle = Math.random() * 2 * Math.PI;
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    return [s, c]
}

function randomTangentB():Vector
{
    while(true)
    {
        let x = Math.random() * 2 - 1;
        let y = Math.random() * 2 - 1;
        let z = -x - y;
        let d2 = x*x + y*y + z*z;
        if(d2 <= 1)
        {
            let d = Math.sqrt(d2)
            return [x / d, y / d, z / d];
        }
    }
}

export class BarycentricPerlin
{
    gradients: [Vector, Vector][][]
    offsets: Vector[][]
    type: "INDEP_AXES" | "BARYCENTRIC_VARIANT" | "BARYCENTRIC" = "INDEP_AXES"

    regen(): void
    {
        this.gradients = [];
        this.offsets = [];
        for(let x=0; x < 100;x++) {
            this.gradients[x] = [];
            this.offsets[x] = [];
            for(let y=0; y < 100;y++) {
                switch(this.type)
                {
                case "INDEP_AXES":
                    let t1 = randomTangent();
                    let t2 = randomTangent();
                    let t3 = randomTangent();
                    this.gradients[x][y] = [[t1[0], t2[0], t3[0]], [t1[1], t2[1], t3[1]]];
                    this.offsets[x][y] = [0, 0, 0];
                    break;
                case "BARYCENTRIC_VARIANT":
                {
                    let angle = Math.random() * 2 * Math.PI;
                    let s = Math.sin(angle);
                    let c = Math.cos(angle);
                    let t:Vector = randomTangentB();
                    this.gradients[x][y] = [scale(s, t), scale(c, t)];
                    this.offsets[x][y] = [0, 0, 0];
                    break;
                }
                case "BARYCENTRIC":
                {
                    let t:Vector = randomTangentB();
                    let maxL = Number.POSITIVE_INFINITY;
                    let minL = Number.NEGATIVE_INFINITY;
                    for(let i=0;i<3;i++)
                    {
                        if(t[i] != 0)
                        {
                            let l = -1/3 / t[i];
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
                    let offset = shift(1 / 3, scale(center, t))
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

