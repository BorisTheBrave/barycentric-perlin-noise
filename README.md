Barycentric Perlin Noise
=====================

This code generates perlin noise with n dimensions of output such that the component sum is a constant. This is useful for
blending together n textures or assigning n biomes.

An explanation and demo can be found at https://www.boristhebrave.com/

Usage
-----

Compile with tsc or webpack.

Construct a `BarycentricPerlin` class, with the number of dimensions and the size of the rect to cover. 
Then call `regen` to pick a set of gradients, and `eval` to interpolate to a specific floating point inside the rect.

See also the usage in `demo.ts`, or the comments. 

Copyright
---------
Code is covered by the MIT license.

The demo images are from https://3dtextures.me under a free license.