/*

Statistical functions used throughout quorra, including methods
for kernel density estimation.

@author <bprinty@gmail.com>

*/


function kdeEstimator(kernel, x) {
    /**
    quorra.kdeEstimator()

    Kernel density esimator, using supplied kernel. This code was inspired
    from http://bl.ocks.org/mbostock/4341954
    */
    return function(sample) {
        return x.map(function(x) {
            return {
                x: x,
                y: d3.mean(sample, function(v) { return kernel(x - v); }),
            };
        });
    };
}

function epanechnikovKernel(scale) {
    /**
    quorra.epanechnikovKernel()

    Epanechnikov Kernel for kernel density estinmation. This code was inspired
    from http://bl.ocks.org/mbostock/4341954
    */
    return function(u) {
        return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
    };
}

window.kdeEstimator = kdeEstimator;
window.epanechnikovKernel = epanechnikovKernel;
