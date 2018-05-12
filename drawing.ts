import { BarycentricPerlin, shift, scale } from './perlin'

export type Style = "RGB" | "TEXTURE" | "BEST" | "CROSSHATCH";

export class CrosshatchSettings
{
    diamonds: boolean;
    thin: boolean;
    width: number;
    threshold: number;
}

export function drawPerlin(img: ImageData, 
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