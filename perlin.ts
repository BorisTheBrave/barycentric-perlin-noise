let INDEP_AXES = false;
let SECOND_GEN = false;
let MAX = false;
let CROSSHATCH = true;
let CROSSHATCH_THRESHOLD = 0.1;
let CROSSHATCH_PIXELS = 10;
let CROSSHATCH_DIAMOND = false;
let CROSSHATCH_THIN = false;
let ABS = false;
let SHOW_GRID = false;
let HEIGHT = 500;
let WIDTH = 500;
let TILESIZE = 100;

// Simple perlin noise for pretty grass
let gradient: [number, number][][]

function randomTangent(): [number, number]
{
    let angle = Math.random() * 2 * Math.PI;
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    return [s, c]
}

function regenPerlin()
{
    gradient = [];
    for(let x=0; x < 100;x++) {
        gradient[x] = [];
        for(let y=0; y < 100;y++) {
            gradient[x][y] = randomTangent();
        }
    }
}

// Function to linearly interpolate between a0 and a1
// Weight w should be in the range [0.0, 1.0]
function lerp(a0: number, a1: number, w: number) {
    w = w*w*w* (6* w *w -15 * w + 10)
    return (1.0 - w)*a0 + w*a1;
}

// Computes the dot product of the distance and gradient vectors.
function dotGridGradient(ix: number, iy: number, x: number, y: number): number
{
    let dx = x - ix;
    let dy = y - iy;
    let grad = gradient[iy][ix]
    return (dx*grad[0] + dy*grad[1]);
}

// Compute Perlin noise at coordinates x, y
function perlin(x: number, y: number) {

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
    let n0 = dotGridGradient(x0, y0, x, y);
    let n1 = dotGridGradient(x1, y0, x, y);
    let ix0 = lerp(n0, n1, sx);
    n0 = dotGridGradient(x0, y1, x, y);
    n1 = dotGridGradient(x1, y1, x, y);
    let ix1 = lerp(n0, n1, sx);
    let value = lerp(ix0, ix1, sy);

    return value;
}

regenPerlin();

// Simple perlin noise for pretty grass
type Vector = [number, number, number]
let gradientB: [Vector, Vector][][]

function add(v1: Vector, v2: Vector):Vector
{
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function scale(s: number, v: Vector): Vector
{
    return [s*v[0], s*v[1], s*v[2]]
}

function randomTangentB():Vector
{
    while(true)
    {
        let x = Math.random() * 2 - 1;
        let y = Math.random() * 2 - 1;
        let z:number;
        if(true)
        {
            z = -x - y;
        }else{
            z = Math.random() * 2 - 1;
        }
        let d2 = x*x + y*y + z*z;
        if(d2 <= 1)
        {
            let d = Math.sqrt(d2)
            return [x / d, y / d, z / d];
        }
    }
}

function cross(v: Vector): Vector
{
    return scale(1/Math.sqrt(3), [
        v[1] - v[2],
        v[2] - v[0],
        v[0] - v[1],
    ]);
}

function regenPerlinB()
{
    let typeSelect = <HTMLSelectElement>document.getElementById("type");
    INDEP_AXES = false;
    SECOND_GEN = false;    
    switch(typeSelect.value)
    {
        case "Normal":
            INDEP_AXES = true;
            break;
        case "2":
            SECOND_GEN = true;
            break;
    }

    gradientB = [];
    for(let x=0; x < 100;x++) {
        gradientB[x] = [];
        for(let y=0; y < 100;y++) {
            if(INDEP_AXES)
            {
                let t1 = randomTangent();
                let t2 = randomTangent();
                let t3 = randomTangent();
                gradientB[x][y] = [[t1[0], t2[0], t3[0]], [t1[1], t2[1], t3[1]]];
            }else{
                let angle = Math.random() * 2 * Math.PI;
                let s = Math.sin(angle);
                let c = Math.cos(angle);
                let t:Vector = randomTangentB();
                gradientB[x][y] = [scale(s, t), scale(c, t)];
                if(SECOND_GEN)
                {
                    t = cross(t);
                    let angle = Math.random() * 2 * Math.PI;
                    let s = Math.sin(angle);
                    let c = Math.cos(angle);
                    let g = gradientB[x][y];
                    gradientB[x][y] = [scale(1 / Math.sqrt(2), add(g[0], scale(s, t))), scale(1/ Math.sqrt(2), add(g[1], scale(c, t)))];
                    
                }
            }
        }
    }
}

// Function to linearly interpolate between a0 and a1
// Weight w should be in the range [0.0, 1.0]
function lerpB(a0: Vector, a1: Vector, w: number) {
    w = w*w*w* (6* w *w -15 * w + 10)
    return add(scale((1.0 - w),a0), scale(w, a1));
}

// Computes the dot product of the distance and gradient vectors.
function dotGridGradientB(ix: number, iy: number, x: number, y: number): Vector
{
    let dx = x - ix;
    let dy = y - iy;
    return add(scale(dx, gradientB[iy][ix][0]), scale(dy, gradientB[iy][ix][1]));
}

// Compute Perlin noise at coordinates x, y
function perlinB(x: number, y: number) {

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
    let n0 = dotGridGradientB(x0, y0, x, y);
    let n1 = dotGridGradientB(x1, y0, x, y);
    let ix0 = lerpB(n0, n1, sx);
    n0 = dotGridGradientB(x0, y1, x, y);
    n1 = dotGridGradientB(x1, y1, x, y);
    let ix1 = lerpB(n0, n1, sx);
    let value = lerpB(ix0, ix1, sy);

    return value;
}

function draw()
{
    // load paramters
    let colorTypeSelect = <HTMLSelectElement>document.getElementById("colortype");
    MAX = false;
    CROSSHATCH = false;
    switch(colorTypeSelect.value)
    {
        case "RGB": 
            break;
        case "BEST":
            MAX = true;
            break;
        case "1":
            CROSSHATCH = true;
            CROSSHATCH_DIAMOND = false;
            CROSSHATCH_THIN = false;
            break;
        case "2":
            CROSSHATCH = true;
            CROSSHATCH_DIAMOND = true;
            CROSSHATCH_THIN = false;
            break;
        case "3":
            CROSSHATCH = true;
            CROSSHATCH_DIAMOND = false;
            CROSSHATCH_THIN = true;
            break;
        case "4":
            CROSSHATCH = true;
            CROSSHATCH_DIAMOND = true;
            CROSSHATCH_THIN = true;
            break;
            
    }
    

    var c = <HTMLCanvasElement>document.getElementById("canvas");
    var ctx = c.getContext("2d");
    ctx.font = "30px Arial";
    ctx.fillText("Loading...", 10, 50); 

    var img = ctx.createImageData(HEIGHT, WIDTH);
    let p=0;
    for(let y=0;y<HEIGHT;y++)
    for(let x=0;x<WIDTH;x++)
    {
        // Slight offset to avoid integer co-ordinates,
        // as those look bad when taking the best color.
        let v = perlinB((x + 0.5) / TILESIZE, (y+0.5) / TILESIZE);
        v = scale(3, v)
        if(ABS)
        {
            v = [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])]
        }
        
        if(MAX)
        {
            let m = Math.max(...v);
            v = [v[0] == m ? 1 : 0, v[1] == m ? 1 : 0, v[2] == m ? 1 : 0];
        }
        if(CROSSHATCH)
        {
            let ms = v.map((x, i) => [x, i]).sort((x,y) => x[0] - y[0]);
            // Find the biggest two components
            let m1 = ms[2][0];
            let m2 = ms[1][0];
            // Invert is a graphical trick so we don't see a boundary
            // at the point where m1 and m2 swap
            let invert = ms[2][1] < ms[1][1];
            // From 0 to 1, how much the 2nd color shows
            let otherness = 1 - Math.abs(m1 - m2) / CROSSHATCH_THRESHOLD;
            let m: number;
            // If we're not crosshatched at all, just use the largest component
            if(otherness < 0)
            {
                m = m1;
            }
            else
            {
                // Choose which color to use.
                let diag1 = (x + y) / CROSSHATCH_PIXELS % 1;
                let diag2 = (x - y) / CROSSHATCH_PIXELS % 1;
                if(diag2 < 0) diag2 += 1;
                let thresh = CROSSHATCH_THIN ? 1 - otherness * 0.5 : 0.5;
                let thresh2 = thresh;
                if(invert) thresh = 1 - thresh;
                let crossed = invert != (diag1 > thresh / 2 && diag1 < 1 - thresh / 2)
                if (CROSSHATCH_DIAMOND)
                    crossed = crossed == !(diag2 > thresh2 / 2 && diag2 < 1 - thresh2 / 2)
                m = crossed ? m2 : m1;
            }
            // Color according to which component is largest
            v = [v[0] == m ? 1 : 0, v[1] == m ? 1 : 0, v[2] == m ? 1 : 0];
        }
        if(SHOW_GRID)
        {
            if( x % TILESIZE < 3 && y % TILESIZE < 3)
            {
                v = [1,1,1];
            }
        }
        img.data[p + 0] = (v[0] + 1) * 128;
        img.data[p + 1] = (v[1] + 1) * 128;
        img.data[p + 2] = (v[2] + 1) * 128;
        img.data[p + 3] = 255;
        p += 4;
        
    }
    ctx.putImageData(img, 0, 0);
}

regenPerlinB();
draw();