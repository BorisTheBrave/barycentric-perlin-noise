type Vector = [number, number, number]

function add(v1: Vector, v2: Vector):Vector
{
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function scale(s: number, v: Vector): Vector
{
    return [s*v[0], s*v[1], s*v[2]];
}

function cross(v: Vector): Vector
{
    return scale(1/Math.sqrt(3), [
        v[1] - v[2],
        v[2] - v[0],
        v[0] - v[1],
    ]);
}

function shift(s: number, v: Vector): Vector
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

class BarycentricPerlin
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

type Style = "RGB" | "TEXTURE" | "BEST" | "CROSSHATCH";

class CrosshatchSettings
{
    diamonds: boolean;
    thin: boolean;
    width: number;
    threshold: number;
}

function drawPerlin(img: ImageData, 
    perlin: BarycentricPerlin,
    width: number, height: number, 
    tilesize: number,
    style: Style,
    crosshatchSettings?: CrosshatchSettings,
    texture1?: ImageData,
    texture2?: ImageData,
    texture3?: ImageData)
{
    let p=0;
    for(let y=0;y<height;y++)
    for(let x=0;x<width;x++)
    {
        // Slight offset to avoid integer co-ordinates,
        // as those look bad when taking the best color.
        let v = perlin.eval((x + 0.5) / tilesize, (y+0.5) / tilesize);
        if (style == "RGB" || style == "TEXTURE") 
        {
            // Use a high contrast for textures to keep the blend regions small
            // Even in RGB mode we increase the contract a bit as perlin noise
            // otherwise is kinda bland.
            let contrast = style == "TEXTURE" ? 20 : 3;
            if(perlin.type == "BARYCENTRIC")
            {
                // Bump up the contrast for good effects
                v = shift(1/3, scale(contrast, shift(-1/3, v)));
                // Move into color space from range [0, 1]
                v = scale(256, v);
            } else {
                // Bump up the contrast for good effects
                v = scale(contrast, v);
                // Move into color space from range [-1, 1]
                v = scale(128, shift(1, v));
            }
        }
        else if (style == "BEST")
        {
            let m = Math.max(...v);
            v = [v[0] == m ? 255 : 128, v[1] == m ? 255 : 128, v[2] == m ? 255 : 128];
        }
        else if (style == "CROSSHATCH")
        {
            let ms = v.map((x, i) => [x, i]).sort((x,y) => x[0] - y[0]);
            // Find the biggest two components
            let m1 = ms[2][0];
            let m2 = ms[1][0];
            // Invert is a graphical trick so we don't see a boundary
            // at the point where m1 and m2 swap
            let invert = ms[2][1] < ms[1][1];
            // From 0 to 1, how much the 2nd color shows
            let otherness = 1 - Math.abs(m1 - m2) / crosshatchSettings.threshold;
            let m: number;
            // If we're not crosshatched at all, just use the largest component
            if(otherness < 0)
            {
                m = m1;
            }
            else
            {
                // Choose which color to use.
                let diag1 = (x + y) / crosshatchSettings.width % 1;
                let diag2 = (x - y) / crosshatchSettings.width % 1;
                if (diag2 < 0)
                {
                    diag2 += 1;
                }
                let thresh = crosshatchSettings.thin ? 1 - otherness * 0.5 : 0.5;
                let thresh2 = thresh;
                if (invert) 
                {
                    thresh = 1 - thresh;
                }
                let crossed = invert != (diag1 > thresh / 2 && diag1 < 1 - thresh / 2)
                if (crosshatchSettings.diamonds)
                {
                    crossed = crossed == !(diag2 > thresh2 / 2 && diag2 < 1 - thresh2 / 2)
                }
                m = crossed ? m2 : m1;
            }
            // Color according to which component is largest
            v = [v[0] == m ? 255 : 128, v[1] == m ? 255 : 128, v[2] == m ? 255 : 128];
        }
        if (style != "TEXTURE")
        {
            img.data[p + 0] = v[0];
            img.data[p + 1] = v[1];
            img.data[p + 2] = v[2];
            img.data[p + 3] = 255;
        }else{
            if(texture1 && texture2 && texture3)
            {
                let texture1P = (x + y * texture1.width) * 4;
                let texture2P = (x + y * texture2.width) * 4;
                let texture3P = (x + y * texture3.width) * 4;
                for(let c=0;c<3;c++)
                {
                    let v1 = Math.max(v[0], 0);
                    let v2 = Math.max(v[1], 0);
                    let v3 = Math.max(v[2], 0);
                    let total = v1 + v2 + v3;
                    img.data[p + c] = 
                        v1 / total * texture1.data[texture1P + c] +
                        v2 / total * texture2.data[texture2P + c] +
                        v3 / total * texture3.data[texture3P + c];
                }
                img.data[p + 3] = 255;
            }
        }
        p += 4;
        
    }
}


var perlin = new BarycentricPerlin();

let grassData: ImageData;
let waterData: ImageData;
let sandData: ImageData;

function regenPerlin()
{
    let typeSelect = <HTMLSelectElement>document.getElementById("type");
    switch(typeSelect.value)
    {
        case "independent":
            perlin.type = "INDEP_AXES";
            break;
        case "barycentric_variant":
            perlin.type = "BARYCENTRIC_VARIANT";
            break;
        case "barycentric":
            perlin.type = "BARYCENTRIC";
            break;
    }
    perlin.regen();
}

function draw()
{
    // load paramters
    let colorTypeSelect = <HTMLSelectElement>document.getElementById("colortype");
    let style: Style;
    let crosshatchSettings: CrosshatchSettings = {
        diamonds: false,
        thin: false,
        threshold: 0.03,
        width: 10,
    };
    switch(colorTypeSelect.value)
    {
        case "RGB":
            style = "RGB";
            break;
        case "TEXTURE":
            style = "TEXTURE";
            break;
        case "BEST":
            style = "BEST"
            break;
        case "1":
            style = "CROSSHATCH"
            crosshatchSettings.diamonds = false;
            crosshatchSettings.thin = false;
            break;
        case "2":
        style = "CROSSHATCH"
            crosshatchSettings.diamonds = true;
            crosshatchSettings.thin = false;
            break;
        case "3":
            style = "CROSSHATCH"
            crosshatchSettings.diamonds = false;
            crosshatchSettings.thin = true;
            break;
        case "4":
            style = "CROSSHATCH"
            crosshatchSettings.diamonds = true;
            crosshatchSettings.thin = true;
            break;
    }
    
    var c = <HTMLCanvasElement>document.getElementById("canvas");
    var ctx = c.getContext("2d");
    ctx.font = "30px Arial";
    ctx.fillText("Loading...", 10, 50); 

    let width = 500;
    let height = 500;
    let tilesize = 100;

    var img = ctx.createImageData(width, height);
    drawPerlin(img, perlin, width, height, tilesize, style, crosshatchSettings, sandData, grassData, waterData);
    
    ctx.putImageData(img, 0, 0);
}

function init(path: string)
{
    function getData(img: HTMLImageElement)
    {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );
        return context.getImageData(0, 0, img.width, img.height);
    }
    
    var grass = new Image();
    grass.addEventListener("load", () => grassData = getData(grass));
    grass.src = path + "grass_small.jpg";
    
    var water = new Image();
    water.addEventListener("load", () => waterData = getData(water));
    water.src = path + "water_small.jpg";
    
    var sand = new Image();
    sand.addEventListener("load", () => sandData = getData(sand));
    sand.src = path + "sand_small.jpg";

    regenPerlin();
    draw();
}
