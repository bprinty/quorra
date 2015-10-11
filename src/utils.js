
// set default seed for random number generation
var seed = Math.round(Math.random()*100000);

quorra.seed = function(value){
    /**
    quorra.seed()

    Set seed for reproducable random number generation. 

    @author <bprinty@gmail.com>
    */

    if (!arguments.length) return seed;
    seed = value;
};

quorra.random = function() {
    /**
    quorra.random()

    Random number generation using internal seed. 

    @author <bprinty@gmail.com>
    */

    if (typeof seed === 'undefined') seed = 42;
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

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


// shapes
quorra.text = function(svg, size, x, y, value){
    var text = svg.append('text')
        .attr('class', 'annotation')
        .attr('x', x)
        .attr('y', y)
        .style("font-size", size)
        .style("text-anchor", "middle")
        .text(value);

    return;
}


quorra.square = function(svg, size, x, y, style){
    var square = svg.append('rect')
        .attr('class', 'annotation')
        .attr('width', size)
        .attr('height', size)
        .attr('x', x - size / 2)
        .attr('y', y - size / 2);

    for (i in style){
        square.style(i, style[i]);
    }
    
    return;
}


quorra.circle = function(svg, size, x, y, style){
    var circle = svg.append('circle')
        .attr('class', 'annotation')
        .attr('r', size / 2)
        .attr('cx', x)
        .attr('cy', y);

    for (i in style){
        circle.style(i, style[i]);
    }

    return;
}


quorra.triangle = function(svg, size, x, y){

}


// underscore additions
_.center = function(x, bounds){
    return _.min([_.max([x, bounds[0]]), bounds[1]]);
}


