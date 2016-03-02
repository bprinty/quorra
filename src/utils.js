/**

Common utilities used across plot generators.

@author <bprinty@gmail.com>

*/


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


textAnnotation = function(plot, data) {
    var cl = (data.group == null) ? 'annotation text' : 'annotation text g_' + data.group;
    var annot = plot.plotarea.selectAll('.annotation.text#' + data.id)
        .data([data]).enter()
        .append('text')
        .attr('id', data.id)
        .attr('class', cl)
        .attr('x', plot.xscale(data.x) + data['text-margin'].x)
        .attr('y', plot.yscale(data.y) + data['text-margin'].y)
        .style("font-size", data['text-size'])
        .style("text-anchor", "middle")
        .text(data.text);
    _.map(data.style, function(i){ annot.style(i, data.style[i]); });
    return annot;
}


squareAnnotation = function(plot, data) {
    var cl = (data.group == null) ? 'annotation square': 'annotation square' + ' g_' + data.group;
    var x = plot.xscale(data.x);
    var y = plot.yscale(data.y);
    var annot = plot.plotarea.selectAll('.annotation.square#' + data.id)
        .data([data]).enter()
        .append('rect')
        .attr('transform', 'rotate(' + data.rotate + ' ' + x + ' ' + y + ')')
        .attr('id', data.id)
        .attr('class', cl)
        .attr('width', data.size)
        .attr('height', data.size)
        .attr('x', x - data.size / 2)
        .attr('y', y - data.size / 2);
    _.map(data.style, function(i){ annot.style(i, data.style[i]); });
    return annot;
}


rectangleAnnotation = function(plot, data) {
    var cl = (data.group == null) ? 'annotation rectangle': 'annotation rectangle' + ' g_' + data.group;
    var x = plot.xscale(data.x);
    var y = plot.yscale(data.y);
    var xwidth = Math.abs(plot.xscale(data.width) - plot.xscale(0));
    var xheight = Math.abs(plot.yscale(data.height) - plot.yscale(0));
    var annot = plot.plotarea.selectAll('.annotation.rectangle#' + data.id)
        .data([data]).enter()
        .append('rect')
        .attr('transform', 'rotate(' + data.rotate + ' ' + x + ' ' + y + ')')
        .attr('id', data.id)
        .attr('class', cl)
        .attr('width', xwidth)
        .attr('height', xheight)
        .attr('x', x)
        .attr('y', y);
    _.map(data.style, function(i){ annot.style(i, data.style[i]); });
    return annot;
}


circleAnnotation = function(plot, data) {
    var cl = (data.group == null) ? 'annotation circle': 'annotation circle' + ' g_' + data.group;
    var annot = plot.plotarea.selectAll('.annotation.circle#' + data.id)
        .data([data]).enter()
        .append('circle')
        .attr('id', data.id)
        .attr('class', cl)
        .attr('r', data.size / 2)
        .attr('cx', plot.xscale(data.x))
        .attr('cy', plot.yscale(data.y));
    _.map(data.style, function(i){ annot.style(i, data.style[i]); });
    return annot;
}


triangleAnnotation = function(plot, data) {
    var cl = (data.group == null) ? 'annotation triangle': 'annotation triangle' + ' g_' + data.group;
    var x = plot.xscale(data.x);
    var y = plot.yscale(data.y);
    var annot = plot.plotarea.selectAll('.annotation.triangle#' + data.id)
        .data([data]).enter()
        .append('path')
        .attr('transform', 'rotate(' + data.rotate + ' ' + x + ' ' + y + ')')
        .attr('id', data.id)
        .attr('class', cl)
        .attr('d', function(d){
            return [
            'M' + (x - (d.size / 2)) + ',' + (y - (d.size / 2)),
            'L' + (x + (d.size / 2)) + ',' + (y - (d.size / 2)),
            'L' + x + ',' + (y + (d.size / 2)),
            'Z'].join('');
        });
    _.map(data.style, function(i){ annot.style(i, data.style[i]); });
    return annot;
}


// underscore additions
_.center = function(x, bounds){
    return _.min([_.max([x, bounds[0]]), bounds[1]]);
}

_.uniquesort = function(x, func) {
    if (typeof func === 'undefined') {
        func = function(x){ return x; };
    }
    return _.unique(_.map(x, func)).sort();
}

