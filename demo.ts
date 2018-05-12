import { BarycentricPerlin } from './perlin'
import { drawPerlin, Style, CrosshatchSettings } from './drawing'

let width = 500;
let height = 500;
let tilesize = 100;

var perlin = new BarycentricPerlin(3, Math.floor(width / tilesize) + 1, Math.floor(height/ tilesize) + 1);

let textureData: ImageData[] = [];

export function regenPerlin()
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

export function draw()
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

    if(style == "TEXTURE" && !(textureData[0] && textureData[1] && textureData[2]))
    {
        ctx.font = "30px Arial";
        ctx.clearRect(0, 0, width, height);
        ctx.fillText("Loading...", 10, 50); 
    }else{
        var img = ctx.createImageData(width, height);
        drawPerlin(img, perlin, width, height, tilesize, style, crosshatchSettings, textureData[0], textureData[1], textureData[2]);
        ctx.putImageData(img, 0, 0);
    }
    
}

export function init(path: string)
{
    let loadedCount = 0;
    function load(img: HTMLImageElement, index: number)
    {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );
        textureData[index] = context.getImageData(0, 0, img.width, img.height);
        loadedCount += 1;
        let colorTypeSelect = <HTMLSelectElement>document.getElementById("colortype");
        if(loadedCount == 3 && colorTypeSelect.value == "TEXTURE") {
            draw();
        }
    }

    var grass = new Image();
    grass.addEventListener("load", () => load(grass, 0));
    grass.src = path + "grass_small.jpg";
    
    var water = new Image();
    water.addEventListener("load", () => load(water, 1));
    water.src = path + "water_small.jpg";
    
    var sand = new Image();
    sand.addEventListener("load", () => load(sand, 2));
    sand.src = path + "sand_small.jpg";

    regenPerlin();
    draw();
}
