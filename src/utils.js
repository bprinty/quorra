
// log key presses
quorra.keys = {
    shift: false,
    a: false
};

document.onkeydown = function (e) {
    e = e || window.event;
    var k = e.which;
    switch (k) {
        case 16: quorra.keys.shift = true;
        case 65: quorra.keys.a = true;
    }
};

document.onkeyup = function (e) {
    e = e || window.event;
    var k = e.which;
    switch (k) {
        case 16: quorra.keys.shift = false;
        case 65: quorra.keys.a = false;
    }
};


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


quorra.uuid = function() {
    /**
    quorra.uuid()

    Generate random uuid with seed. 

    @author <bprinty@gmail.com>
    */

    function uk() {
        return Math.floor((1 + quorra.random()) * 0x10000)
            .toString(16).substring(1);
    }
    return 'u' + [
        uk() + uk(),
        uk(), uk(), uk(),
        uk() + uk() + uk()
    ].join('-');
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


quorra.square = function(svg, x, y, data){
    var square = svg.selectAll('.annotation.square#' + quorra.uuid())
        .data([data]).enter()
        .append('rect')
        .attr('class', 'annotation square')
        .attr('width', data.size)
        .attr('height', data.size)
        .attr('x', x - data.size / 2)
        .attr('y', y - data.size / 2)
        .on('mouseover', function(){
            d3.select(this).style('opacity', 0.75);
        })
        .on('mouseout', function(){
            d3.select(this).style('opacity', 1);
        })
        .on('click', data.click);

    for (i in data.style){
        square.style(i, data.style[i]);
    }
    
    return;
}


quorra.circle = function(svg, x, y, data){
    var circle = svg.selectAll('.annotation.circle#' + quorra.uuid())
        .data([data]).enter()
        .append('circle')
        .attr('class', 'annotation circle')
        .attr('r', data.size / 2)
        .attr('cx', x)
        .attr('cy', y)
        .on('mouseover', function(){
            d3.select(this).style('opacity', 0.75);
        })
        .on('mouseout', function(){
            d3.select(this).style('opacity', 1);
        })
        .on('click', data.click);;

    for (i in data.style){
        circle.style(i, data.style[i]);
    }

    return;
}


quorra.triangle = function(svg, x, y, data){
    var triangle = svg.selectAll('.annotation.triangle#' + quorra.uuid())
        .data([data]).enter()
        .append('path')
        .attr('class', 'annotation triangle')
        .attr('d', function(d){
            return [
            'M' + (x - (d.size / 2)) + ',' + (y - (d.size / 2)),
            'L' + (x + (d.size / 2)) + ',' + (y - (d.size / 2)),
            'L' + x + ',' + (y + (d.size / 2)),
            'Z'].join('');
        })
        .on('mouseover', function(){
            d3.select(this).style('opacity', 0.75);
        })
        .on('mouseout', function(){
            d3.select(this).style('opacity', 1);
        })
        .on('click', data.click);

    for (i in data.style){
        triangle.style(i, data.style[i]);
    }

    return;
}


// underscore additions
_.center = function(x, bounds){
    return _.min([_.max([x, bounds[0]]), bounds[1]]);
}


