/***
 *
 * Common utilities used in plot generation.
 * 
 * @author  <bprinty@gmail.com>
 */


// set default seed for random number generation
var seed = Math.round(Math.random()*100000);


/**
 * Set seed for reproducable random number generation. 
 * @param {number} value - The seed value to set.
 */
quorra.seed = function(value) {
    if (!arguments.length) return seed;
    seed = value;
};


/**
 * Random number generation using global seed.
 */
quorra.random = function() {
    if (typeof seed === 'undefined') seed = 42;
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};


/**
 * Random number generation using specified seed.
 * @param {number} seed - An explicit seed to use in number
 *                        generation
 */
quorra.pseudorandom = function(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};


/**
 * Generate random uuid with global seed.
 * @return {string} Unique UUID identifier
 */
quorra.uuid = function() {
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


quorra.export = function(svg, filename) {
    /**
    quorra.export()
    
    Export contents of svg to .png, with styling.
    */
    var sel = svg.attr({
        'xmlns': 'http://www.w3.org/2000/svg',
        version: '1.1'
    }).node();
    var cln = sel.cloneNode(true);
    d3.select(cln).selectAll('clippath').attr('id', 'clip-export');
    d3.select(cln).selectAll('.plotarea').attr('clip-path', 'url(#clip-export)');
    cln.id = "export";
    document.body.appendChild(cln);

    // set styling for elements
    d3.select(cln).style('background-color', '#fff');
    d3.select(cln).selectAll('.glyphbox').remove();
    d3.select(cln).selectAll('text').style('font-weight', 300).style('font-size', '12px').style('font-family', '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif');
    d3.select(cln).selectAll('.axis line').style('stroke', '#bbb').style('fill', 'none').style('shape-rendering', 'crispEdges');
    d3.select(cln).selectAll('.axis path').style('stroke', '#bbb').style('fill', 'none').style('shape-rendering', 'crispEdges');
    d3.select(cln).selectAll('.axis .tick line').style('stroke', '#bbb').style('opacity', 0.5);
    d3.select(cln).selectAll('.selector').style('stroke', '#bbb').style('stroke-width', '1px');
    d3.select(cln).selectAll('.xtick').style('stroke-width', '1.5px');
    d3.select(cln).selectAll('.ytick').style('stroke-width', '1.5px');

    // set up html5 canvas for image
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    // encode image in src tag
    var svgSize = cln.getBoundingClientRect();
    var svgData = new XMLSerializer().serializeToString(cln);
    canvas.width = svgSize.width;
    canvas.height = svgSize.height;
    var img = document.createElement("img");
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));

    // draw with canvas and export
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        var data = canvas.toDataURL("image/png");
        var a = document.createElement("a");
        a.download = filename + ".png";
        a.href = data;
        document.body.appendChild(a);
        a.click();
        a.remove();
        canvas.remove();
        document.body.removeChild(cln);
    };
};


// underscore replications (simplified)
quorra.identity = function(value) {
    return value;
};

quorra.contains = function(array, item) {
    return array.indexOf(item) >= 0;
};

quorra.uniq = function(array) {
    var result = [];
    var alreadySeen;
    for (var i = 0, len = array.length; i < length; i++) {
        if (!quorra.contains(result, array[i])) {
            result.push(array[i]);
        }
    }
    return result;
};


// underscore additions
quorra.center = function(x, bounds) {
    return Math.min(Math.max(x, bounds[0]), bounds[1]);
};

quorra.uniquesort = function(x, func) {
    func = func || quorra.identity;
    return quorra.uniq(x.map(func)).sort();
};


// d3 additions
d3.selection.prototype.stageup = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

d3.selection.prototype.stagedown = function() { 
    return this.each(function() { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) { 
            this.parentNode.insertBefore(this, firstChild); 
        } 
    }); 
};


// common generator object utilities
parameterize = function(attributes, generator) {
    /**
    parameterize()

    Add getters and setters to generator functions for
    specified attributes
    */

    // binding attributes to constructor function
    Object.keys(attributes).forEach(function(i) {
        generator[i] = function(value) {
            if (!arguments.length) return attributes[i];

            // maintain non-overridden object arguments
            if (typeof value === 'object') {
                if (typeof attributes[i] === 'object') {
                    if (Array.isArray(attributes[i]) && ! Array.isArray(value)) {
                        value = [value];
                    }
                    attributes[i] = _.extend(attributes[i], value);
                } else {
                    attributes[i] = value;
                }
            } else {
                attributes[i] = value;
            }
            return generator;
        };
    });
};

extend = function(stock, custom) {
    /**
    extend()

    Recursively extend attributes with specified parameters.
    */
    _.map(Object.keys(custom), function(d) {
        if (typeof stock[d] === 'undefined') {
            stock[d] = custom[d];
        }
    });

    _.map(Object.keys(stock), function(d) {
        if (typeof custom[d] !== 'undefined') {
            if (typeof stock[d] === "object" && ! Array.isArray(stock[d]) && stock[d] != null) {
                stock[d] = extend(stock[d], custom[d]);
            } else if (Array.isArray(stock[d]) && !Array.isArray(custom[d])) { 
                stock[d] = [custom[d]];
            } else {
                stock[d] = custom[d];
            }
        }
    });
    return stock;
};

selectmerge = function(selection, entry, type) {
    /**
    selectmerge()

    Merge selection for selectable objects based on selection type.
    */
    if (typeof type === 'undefined') type = true;

    var sel = selection;
    if (type == 'single') {
        selection = [];    
    }
    if (_.contains(sel, entry)) {   
        selection = _.without(selection, entry);
    } else {
        selection.push(entry);
    }
    return selection;
};
