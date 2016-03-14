/* quorra version 0.0.1 (http://github.com/bprinty/quorra) */
(function(){
/**

quorra base

@author <bprinty@gmail.com>

*/


function quorra() {
    /**
    quorra()

    Base class for all visualization components.
    */
}

quorra.debug = true;
quorra.error = function(text) {
    /**
    quorra.error()

    Class for managing error reporting.
    */
    console.log('ERROR: ' + text);
}

quorra.log = function(text) {
    /**
    quorra.log()

    Class for managing logging.
    */
    if (quorra.debug) {
        console.log('DEBUG: ' + text);
    }
}

quorra.render = function(generator) {
    /**
    quorra.render()
    
    Render created plot object.
    */
    quorra.log('rendering element');
    var obj = generator();
    if (typeof generator['parent'] === 'undefined') {
        quorra.plots[generator.id()] = obj;
    }
    return obj;
}

quorra.plots = {};
function QuorraPlot(attributes) {
    /**
    QuorraPlot()

    Object for managing plot rendering, and extending
    common functionality across all plot models.
    */
    quorra.log('instantiating quorra plot object');

    if (typeof attributes == 'undefined') attributes = {};
    var _this = this;

    // constructor
    this.go = function(selection) {
        quorra.log('running generator function');

        // configure selection
        if (typeof selection === 'undefined') selection = _this.attr.bind;
        _this.selection = (typeof selection === 'string') ? d3.select(selection) : selection;

        if (_this.selection.select("svg")[0][0] != null){
            _this.selection.select("svg").selectAll('*').remove();
        }
        _this.attr.svg = (_this.attr.svg === null) ? _this.selection.append("svg") : _this.attr.svg;

        // calculate basic dimensions
        var width = (_this.attr.width == "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        _this.innerwidth = width - _this.attr.margin.left - _this.attr.margin.right;
        _this.innerheight = height - _this.attr.margin.top - _this.attr.margin.bottom;

        // create svg and relevant plot areas
        _this.attr.svg = _this.attr.svg.attr("id", _this.attr.id)
            .attr("class", _this.attr.class)
            .attr("width", width)
            .attr("height", height);

        // set up clip path for windowing display
        _this.attr.svg.append("clipPath")
            .attr("id", "clip").append("rect")
            .attr("width", _this.innerwidth)
            .attr("height", _this.innerheight);

        // segment sections of canvas (makes axis rendering easier)
        _this.plotarea = _this.attr.svg.append('g')
            .attr("class", "plotarea")
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")");

        // perform provided data transformations
        _this.data = _this.attr.transform(_this.attr.data);
        
        // get x domain and range
        if (typeof _this.data[0].x === 'string') {
            _this.domain = _.uniquesort(_this.data, _this.attr.x);
        } else {
            _this.domain = [
                _.min(_.map(_this.data, _this.attr.x)),
                _.max(_.map(_this.data, _this.attr.x))
            ];
        }

        // get y domain and range
        if (typeof _this.data[0].y === 'string') {
            _this.range = _.uniquesort(_this.data, _this.attr.y);
        } else {
            if (_this.attr.layout === 'stacked'){
                // for some reason, underscore's map function won't 
                // work for accessing the d.y0 property -- so we have
                // to do it another way
                var ux = _.uniquesort(_this.data, _this.attr.x);
                var max = _.max(_.map(ux, function(d){
                    var nd =_.filter(_this.data, function(g){ return _this.attr.x(g) == d; });
                    var tmap = _.map(nd, function(g){ return _this.attr.y(g); });
                    return _.reduce(tmap, function(a, b){ return a + b; }, 0);
                }));
            } else {
                var max = _.max(_.map(_this.data, _this.attr.y));
            }
            _this.range = [
                _.min(_.map(_this.data, _this.attr.y)),
                max
            ];
        }

        // configure color pallette
        _this.pallette = (_this.attr.color === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(_this.attr.color);
        _this.pallette = _this.pallette.domain(_.uniquesort(_this.data, _this.attr.group));

        // set default behavior
        _this.enabled = {
            zoom: false,
            pan: false,
            annotate: false
        };

        // initialize interaction data
        _this.xstack = [];
        _this.ystack = [];
        
        // create legend (if specified)
        if (_this.attr.legend) {
            _this.drawlegend();
        }

        // enable interaction (if specified)
        if (_this.attr.zoomable) {
            _this.enablezoom();
        }
        if (_this.attr.annotatable) {
            _this.enableannotation();
        }

        // draw glyph elements
        if (_this.attr.glyphs) {
            _this.drawglyphs();
        }

        // draw plot
        _this.redraw();

        return _this;
    };

    this.redraw = function(xrange, yrange, cache) {
        quorra.log('redrawing plot');

        // configure window
        if (typeof xrange !== 'undefined') {
            _this.attr.xrange = xrange;
        }
        if (typeof yrange !== 'undefined') {
            _this.attr.yrange = yrange;
        }
        if (typeof cache === 'undefined') {
            cache = true;
        }

        // remove old plot and render new elements
        _this.plotarea.selectAll("*").remove();
        _this.axes();
        _this.plot();

        // add axis properties to stack
        if (cache) {
            _this.xstack.push(_this.xscale);
            _this.ystack.push(_this.yscale);
        }

        // draw annotation
        if (_this.attr.annotation) {
            _this.annotate();
        }
    };
    
    // rendering methods
    this.axes = function() {
        quorra.log('redrawing axes');

        // parameterize axes scaling
        var domain = _this.attr.xrange === "auto" ? _this.domain : _this.attr.xrange;
        var range = _this.attr.yrange === "auto" ? _this.range : _this.attr.yrange;
        if (_this.type == 'histogram') {
            domain[1] = domain[1] + (domain[1] - domain[0])/(_this.attr.bins-1);
        }

        // set up scaling for axes
        // TODO: allow users to pass in arbitrary scaling function
        //       i.e. d3.scale.log()
        if (typeof _this.data[0].x === 'string') {
            _this.xscale = d3.scale.ordinal()
                .domain(domain)
                .range([0, _this.innerwidth])
                .rangePoints([0, _this.innerwidth], 1);
        } else {
            _this.xscale = d3.scale.linear()
                .domain(domain)
                .range([0, _this.innerwidth]);
        }
        if (typeof _this.data[0].y === 'string') {
            _this.yscale = d3.scale.ordinal()
                .domain(range)
                .range([0, _this.innerheight])
                .rangePoints([_this.innerheight, 0], 1);
        } else {
            _this.yscale = d3.scale.linear()
                .domain(range)
                .range([ _this.innerheight, 0]);
        }

        // tick formatting
        _this.xaxis = d3.svg.axis().scale(_this.xscale).orient(_this.attr.xorient);
        if (_this.attr.xticks != "auto") {
            _this.xaxis = _this.xaxis.ticks(_this.attr.xticks);
        } else if (_this.type === 'histogram') {
            _this.xaxis = _this.xaxis.ticks(_this.attr.bins);
        }
        _this.yaxis = d3.svg.axis().scale(_this.yscale).orient(_this.attr.yorient);
        if (_this.attr.yticks != "auto") {
            _this.yaxis = _this.yaxis.ticks(_this.attr.yticks);
        }

        // number formatting
        if (_this.attr.xformat != "auto") {
            _this.xaxis = _this.xaxis.tickFormat(_this.attr.xformat);
        }
        if (_this.attr.yformat != "auto") {
            _this.yaxis = _this.yaxis.tickFormat(_this.attr.yformat);
        }

        // configure grid (if specified)
        if (_this.attr.grid) {
            _this.xaxis = _this.xaxis.tickSize(-_this.innerheight, 0, 0);
            _this.yaxis = _this.yaxis.tickSize(-_this.innerwidth, 0, 0);
        }

        // x axis
        if (_this.attr.xaxis !== "hidden" && _this.attr.xaxis != false) {
            _this.plotarea
                .append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + _this.innerheight + ")")
                .call(_this.xaxis)
                .append("text")
                    .attr("class", "label")
                    .attr("x", function(x){
                        if (_this.attr.labelposition == "end"){
                            return _this.innerwidth;
                        }else if (_this.attr.labelposition == "middle"){
                            return _this.innerwidth / 2;
                        }else if (_this.attr.labelposition == "beginning"){
                            return 0;
                        }
                    })
                    .attr("y", function(){
                        if (_this.attr.xaxis == "inside"){
                            return -6 + _this.attr.labelpadding.x;
                        }else if(_this.attr.xaxis === "outside"){
                            return 35 + _this.attr.labelpadding.x;
                        }
                    })
                    .style("text-anchor", _this.attr.labelposition)
                    .text(_this.attr.xlabel);
        }

        // y axis
        if (_this.attr.yaxis !== "hidden" && _this.attr.yaxis != false) {
            _this.plotarea
                .append("g")
                .attr("class", "y axis")
                .call(_this.yaxis)
                .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("x", function(x){
                        if (_this.attr.labelposition == "end"){
                            return 0;
                        }else if (_this.attr.labelposition == "middle"){
                            return -_this.innerheight / 2;
                        }else if (_this.attr.labelposition == "beginning"){
                            return -_this.innerheight;
                        }
                    }).attr("y", function(){
                        if (_this.attr.yaxis == "inside"){
                            return 6 + _this.attr.labelpadding.y;
                        }else if(_this.attr.yaxis === "outside"){
                            return -40 + _this.attr.labelpadding.y;
                        }
                    })
                    .attr("dy", ".71em")
                    .style("text-anchor", _this.attr.labelposition)
                    .text(_this.attr.ylabel);
        }
    };

    this.plot = function() {
        console.log('To be implemented by models ...');
    };

    this.annotate = function() {
        quorra.log('drawing plot annotation');

        _.map(_this.attr.annotation, function(d) {
            quorra.render(d);
        });
    };

    this.drawlegend = function() {
        quorra.log('drawing plot legend');

        // set up pallette ordering
        var data = _this.pallette.domain();
        if (_this.attr.lorder.length == data.length) {
            data = _this.attr.lorder;
        }

        // compute width and height for scaling
        var width = (_this.attr.width == "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        width = (_this.attr.lposition === "inside") ? width - 22 : width;

        // create container for legend
        var leg = _this.attr.svg
            .append("g")
            .attr("transform", "translate(" + (width - _this.attr.margin.right) + "," + _this.attr.margin.top + ")")
            .selectAll(".legend")
            .data(data)
            .enter().append("g")
            .attr("class", "legend")
            .attr("id", _this.attr.id + "-legend")
            .attr("transform", function(d, i) { return "translate(0," + (_this.attr.lmargin.top + i * 20) + ")"; });

        // draw group shape
        if (_this.attr.lshape === "square") {
            var selector = leg.append("rect")
                .attr("class", "selector")
                .attr("x", 5 + _this.attr.lmargin.left)
                .attr("y", _this.attr.lmargin.top)
                .attr("width", 18)
                .attr("height", 18)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", _this.pallette)
                .style("fill-opacity", function(d) {
                    return _.contains(_this.attr.toggled, d) ? 0 : _this.attr.opacity;
                });
        } else if (_this.attr.lshape === "circle") {
            var selector = leg.append("circle")
                .attr("class", "selector")
                .attr("cx", 20 + _this.attr.lmargin.left)
                .attr("cy", 8 + _this.attr.lmargin.top)
                .attr("r", 9)
                .style("fill", _this.pallette)
                .style("fill-opacity", function(d) {
                    return _.contains(_this.attr.toggled, d) ? 0 : _this.attr.opacity;
                });
        }

        // enable toggling events for turning on/off groups
        if (_this.attr.toggle) {
            selector.on("mouseover", function(d, i){
                d3.select(this).style('opacity', 0.75);
            }).on("mouseout", function(d, i){
                d3.select(this).style('opacity', 1);
            }).on("click", function(d, i) {
                if (d3.select(this).style('fill-opacity') == 0){
                    d3.select(this).style('fill-opacity', _.contains(_this.attr.toggled, d) ? _this.attr.opacity: 0);
                    _this.attr.svg.selectAll(".g_" + d).style('visibility', 'visible');
                    _this.attr.toggled = _.without(_this.attr.toggled, d);
                } else {
                    d3.select(this).style('fill-opacity', 0);
                    _this.attr.svg.selectAll(".g_" + d).style('visibility', 'hidden');
                    _this.attr.toggled = _.union(_this.attr.toggled, [d]);
                }
            });
        }

        // add group descriptor
        leg.append("text")
            .attr("x", function(){
                if (_this.attr.lposition === "inside"){
                    return _this.attr.lmargin.left;
                }else if (_this.attr.lposition === "outside"){
                    var pad = (_this.attr.lshape === "square") ? 0 : 7;
                    return 27 + _this.attr.lmargin.left + pad;
                }        
            })
            .attr("y", 9 + _this.attr.lmargin.top)
            .attr("dy", ".35em")
            .style("text-anchor", function() {
                if (_this.attr.lposition === "inside") {
                    return "end";
                }else if (_this.attr.lposition === "outside") {
                    return "beginning";
                }
            }).text(function(d) { return d; });
    };

    this.drawglyphs = function() {
        quorra.log('drawing plot glyphs');

        // all glyphs pulled from https://icomoon.io/app
        // refresh glyph
        _this.attr.svg.append('symbol')
            .attr('id', 'glyph-refresh')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M1024 384h-384l143.53-143.53c-72.53-72.526-168.96-112.47-271.53-112.47s-199 39.944-271.53 112.47c-72.526 72.53-112.47 168.96-112.47 271.53s39.944 199 112.47 271.53c72.53 72.526 168.96 112.47 271.53 112.47s199-39.944 271.528-112.472c6.056-6.054 11.86-12.292 17.456-18.668l96.32 84.282c-93.846 107.166-231.664 174.858-385.304 174.858-282.77 0-512-229.23-512-512s229.23-512 512-512c141.386 0 269.368 57.326 362.016 149.984l149.984-149.984v384z');

        // zoom glyph
        _this.attr.svg.append('symbol')
            .attr('id', 'glyph-search')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M992.262 871.396l-242.552-206.294c-25.074-22.566-51.89-32.926-73.552-31.926 57.256-67.068 91.842-154.078 91.842-249.176 0-212.078-171.922-384-384-384-212.076 0-384 171.922-384 384s171.922 384 384 384c95.098 0 182.108-34.586 249.176-91.844-1 21.662 9.36 48.478 31.926 73.552l206.294 242.552c35.322 39.246 93.022 42.554 128.22 7.356s31.892-92.898-7.354-128.22zM384 640c-141.384 0-256-114.616-256-256s114.616-256 256-256 256 114.616 256 256-114.614 256-256 256z');

        // image glyph
        _this.attr.svg.append('symbol')
            .attr('id', 'glyph-image')
            .attr('viewBox', '0 0 1024 1024')
            .html([
                '<path d="M959.884 128c0.040 0.034 0.082 0.076 0.116 0.116v767.77c-0.034 0.040-0.076 0.082-0.116 0.116h-895.77c-0.040-0.034-0.082-0.076-0.114-0.116v-767.772c0.034-0.040 0.076-0.082 0.114-0.114h895.77zM960 64h-896c-35.2 0-64 28.8-64 64v768c0 35.2 28.8 64 64 64h896c35.2 0 64-28.8 64-64v-768c0-35.2-28.8-64-64-64v0z"></path>',
                '<path d="M832 288c0 53.020-42.98 96-96 96s-96-42.98-96-96 42.98-96 96-96 96 42.98 96 96z"></path>',
                '<path d="M896 832h-768v-128l224-384 256 320h64l224-192z"></path>'
            ].join(''));

        // pan glyph
        _this.attr.svg.append('symbol')
            .attr('id', 'glyph-pan')
            .attr('viewBox', '0 0 1024 1024')
            .html([
                '<path d="M1024 0h-416l160 160-192 192 96 96 192-192 160 160z"></path>',
                '<path d="M1024 1024v-416l-160 160-192-192-96 96 192 192-160 160z"></path>',
                '<path d="M0 1024h416l-160-160 192-192-96-96-192 192-160-160z"></path>',
                '<path d="M0 0v416l160-160 192 192 96-96-192-192 160-160z"></path>'
            ].join(''));

        // annotate glyph
        _this.attr.svg.append('symbol')
            .attr('id', 'glyph-annotate')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M864 0c88.364 0 160 71.634 160 160 0 36.020-11.91 69.258-32 96l-64 64-224-224 64-64c26.742-20.090 59.978-32 96-32zM64 736l-64 288 288-64 592-592-224-224-592 592zM715.578 363.578l-448 448-55.156-55.156 448-448 55.156 55.156z');
 
        // adding glyphs to buffer
        var gdata = [];
        if (_this.attr.annotatable) {
            gdata.push('annotate');
        }
        if (_this.attr.zoomable) {
            gdata.push('pan', 'refresh');
        }
        if (_this.attr.exportable) {
            gdata.push('export');
        }

        // drawing glyphs and setting up click events
        var gly = _this.attr.svg.append("g")
                .attr("transform", "translate(" + (_this.innerwidth + _this.attr.margin.left + 7) + "," + (_this.innerheight - _this.attr.margin.bottom - gdata.length * 22 + 52) + ")")
                .selectAll(".glyphbox")
                .data(gdata)
                .enter().append("g")
                .attr("class", "glyphbox")
                .attr("id", function(d) { return d; })
                .attr("transform", function(d, i) { return "translate(0," + (i * 25) + ")"; })
                .on('mouseover', function(d) {
                    d3.select(this).style('opacity', 0.5);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d)
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 10) + "px")
                                .style("top", (d3.event.pageY - 10) + "px");
                    }
                }).on("mousemove", function(d) {
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.pageX + 10) + "px")
                            .style("top", (d3.event.pageY - 10) + "px");
                    }
                }).on('mouseout', function(d) {
                    d3.select(this).style('opacity', 1);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("opacity", 0);
                    }
                }).on('click', function(d) {
                    switch(d){

                        case 'zoom':
                            _this.enabled.zoom = !_this.enabled.zoom;
                            this.enabled.pan = !_this.enabled.pan;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.zoom) ? 3 : 1);
                            break;

                        case 'pan':
                            _this.enabled.pan = !_this.enabled.pan;
                            _this.enabled.zoom = !_this.enabled.zoom;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.pan) ? 3 : 1);
                            break;

                        case 'refresh':
                            _this.xstack = [_this.xstack[0]]
                            _this.ystack = [_this.ystack[0]]
                            _this.redraw(_this.xstack[0].domain(), _this.ystack[0].domain(), false);
                            break;

                        case 'annotate':
                            _this.enabled.annotate = !_this.enabled.annotate;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.annotate) ? 3 : 1);
                            break;

                        case 'export':
                            quorra.export(_this.attr.svg, _this.attr.plotname);
                            _this.attr.events.export();
                            break;
                    }
                });
        
        // drawing glyph outline
        if (_this.attr.gshape === "square"){
            gly.append("rect")
                .attr("class", "glyph")
                .attr("width", 22)
                .attr("height", 22)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", "transparent");

        } else {
            gly.append("circle")
                .attr("class", "glyph")
                .attr("cx", 11)
                .attr("cy", 7)
                .attr("r", 11)
                .style("fill", "transparent"); 
        }

        // rendering icons
        gly.append('svg')
            .attr('width', 22).attr('height', 22)
            .append("use")
            .attr('x', _this.attr.gshape == 'square' ? 4 : 4)
            .attr('y', _this.attr.gshape == 'square' ? 4 : 0)
            .attr('height', 14).attr('width', 14)
            .attr("xlink:href", function(d){
                switch(d){
                    case 'zoom': return '#glyph-search';
                    case 'pan': return '#glyph-pan';
                    case 'refresh': return '#glyph-refresh';
                    case 'export': return '#glyph-image';
                    case 'annotate': return '#glyph-annotate';
                }
            });
    };

    this.enablezoom = function() {
        quorra.log('enabling zoom events');

        // check if data is within plot boundaries
        function withinBounds(motion){
            if (
                (motion.x > _this.innerwidth) ||
                (motion.x < 0) ||
                (motion.y > _this.innerheight) ||
                (motion.y < 0)
            ){
                return false;
            }
            return true;
        }

        // set up initial properties
        _this.zoomdata = {
            x: _this.attr.margin.left,
            y: _this.attr.margin.right
        }
        _this.enabled.pan = false;
        _this.enabled.zoom = true;

        // init viewbox for selection
        var viewbox = _this.attr.svg
            .append('path')
            .attr('class', 'viewbox')
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")")

        // set up drag behavior
        var drag = d3.behavior.drag()
            // .origin(function(d){ return d; })
            .on("dragstart", function(d) {
                var movement = mouse(_this.attr.svg);
                _this.zoomdata.x = movement.x - _this.attr.margin.left;
                _this.zoomdata.y = movement.y - _this.attr.margin.top;
                if(_this.enabled.pan) {
                    _this.attr.events.panstart(d);
                }
            }).on("dragend", function(d) {
                viewbox.attr('d', '');
                var movement = mouse(_this.attr.svg);
                movement.x = movement.x - _this.attr.margin.left;
                movement.y = movement.y - _this.attr.margin.top;

                if (_this.enabled.zoom) {
                    var changed = false;
                    var l = _this.xstack.length;

                    // only zoom on x if the selection is significant
                    if (Math.abs(_this.zoomdata.x - movement.x) > 10 && (_this.zoomdata.x > 0)){
                        var xdomain = _this.xstack[l-1].domain();
                        var xrange = _this.xstack[l-1].range();
                        var xmap = d3.scale.linear().domain(xrange).range(xdomain);
                        var xval = [xmap(_this.zoomdata.x), xmap(movement.x)].sort(function(a, b){ return a - b; });
                        
                        // bound zooming into current viewframe
                        xval[0] = Math.max(xval[0], xdomain[0]);
                        xval[1] = Math.min(xval[1], xdomain[1]);
                        var xscale = d3.scale.linear().domain(xval).range(xrange);
                        changed = true;
                    }

                    // only zoom on y if the selection is significant
                    if (Math.abs(_this.zoomdata.y - movement.y) > 10 && (_this.zoomdata.y < _this.innerheight)){
                        var ydomain = _this.ystack[l-1].domain();
                        var yrange = _this.ystack[l-1].range();
                        var ymap = d3.scale.linear().domain(yrange).range(ydomain);
                        var yval = [ymap(_this.zoomdata.y), ymap(movement.y)].sort(function(a, b){ return a - b; });
                        
                        // bound zooming into current viewframe
                        yval[0] = Math.max(yval[0], ydomain[0]);
                        yval[1] = Math.min(yval[1], ydomain[1]);
                        var yscale = d3.scale.linear().domain(yval).range(yrange);
                        changed = true;
                    }

                    // only trigger event if something changed
                    if (changed) {
                        _this.redraw(xval, yval, true);
                        _this.attr.events.zoom(d);
                    }
                } else if(_this.enabled.pan) {
                    _this.xstack.push(_this.xscale);
                    _this.ystack.push(_this.yscale);
                    _this.attr.events.panend(d);
                }
            }).on("drag", function(d) {
                var movement = mouse(_this.attr.svg);
                movement.x = movement.x - _this.attr.margin.left;
                movement.y = movement.y - _this.attr.margin.top;
                if (_this.enabled.zoom) {
                    if (_this.zoomdata.y > _this.innerheight) {
                        movement.y = 0;
                    }
                    if (_this.zoomdata.x < 0) {
                        movement.x = _this.innerwidth;
                    }
                    viewbox.attr('d', [
                        'M' + _this.zoomdata.x + ',' + _this.zoomdata.y,
                        'L' + _this.zoomdata.x + ',' + movement.y,
                        'L' + movement.x + ',' + movement.y,
                        'L' + movement.x + ',' + _this.zoomdata.y,
                        'Z'
                    ].join(''));
                } else if(_this.enabled.pan && withinBounds(movement)) {
                    viewbox.attr('d', '');
                    var xmap = d3.scale.linear().domain(_this.xscale.range()).range(_this.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.yscale.range()).range(_this.yscale.domain());
                    var xval = _.map(_this.xscale.range(), function(x){ return xmap(x - d3.event.dx); });
                    var yval = _.map(_this.yscale.range(), function(x){ return ymap(x - d3.event.dy); });
                    _this.redraw(xval, yval, false);
                    var l = _this.xstack.length;
                    _this.xscale = d3.scale.linear().domain(xval).range(_this.xstack[l-1].range());
                    _this.yscale = d3.scale.linear().domain(yval).range(_this.ystack[l-1].range());
                    _this.attr.events.pan(d);
                }
            });

        // // set up zoom behavior
        // THIS WAS TEMPORARILY REMOVED BECAUSE IT SCROLLJACKS, BUT SOME EFFORT SHOULD
        // BE PUT INTO MAKING THIS AN OPTION AND MAKING IT COMPATIBLE WITH THE CURRENT CODE
        // var zoom = d3.behavior.zoom()
        //     .on("zoom", function(){
        //         var movement = mouse(_this.attr.svg);
        //         movement.x = movement.x - _this.attr.margin.left;
        //         movement.y = movement.y - _this.attr.margin.top;
        //         var time = Date.now();

        //         // correcting for touchpad/mousewheel discrepencies
        //         // and for things that fire as zoom events
        //         if (
        //             (!quorra.controller[id].zoom) ||
        //             (time - quorra.controller[id].time) < 25 ||
        //             (movement.x > quorra.controller[id].width) ||
        //             (movement.y < 0) ||
        //             (Math.abs(quorra.controller[id].scale - movement.scale) < 0.00001) ||
        //             (!movement.x)
        //         ){
        //             if (!quorra.keys.Shift){
        //                 // quorra.controller[id].svg.on(".zoom", null);
        //                 var fakescroll = (quorra.controller[id].scale - movement.scale) < 0 ? -10 : 10;
        //                 console.log(quorra.controller[id].svg.node().parentNode);
        //                 quorra.controller[id].svg.node().parentNode.scrollY += fakescroll;
        //                 // window.scroll(window.scrollX, window.scrollY + fakescroll);
        //             }
        //             quorra.controller[id].scale = movement.scale;
        //             return;
        //         }
        //         quorra.controller[id].time = time;

        //         // get zoom ratios for x and y axes
        //         var xzoom = 50*zoomscale(quorra.controller[id].xdrag);
        //         var yzoom = 50*zoomscale(quorra.controller[id].ydrag);
        //         if (quorra.controller[id].scale > movement.scale){
        //             xzoom = -xzoom;
        //             yzoom = -yzoom;
        //         }
                
        //         // zoom only on relevant axis
        //         var mx = movement.x/quorra.controller[id].width;
        //         var my = (quorra.controller[id].height -  movement.y)/quorra.controller[id].height;
        //         var xlzoom = (mx > 0) ? -(xzoom*mx) : 0;
        //         var xrzoom = (mx > 0) ? (xzoom*(1-mx)) : 0;
        //         var ydzoom = (my > 0) ? -(yzoom*my) : 0;
        //         var yuzoom = (my > 0) ? (yzoom*(1-my)): 0;

        //         // do the zooming
        //         var l = quorra.controller[id].xstack.length;
        //         var xdomain = quorra.controller[id].xdrag.domain();
        //         var ydomain = quorra.controller[id].ydrag.domain();
        //         var xval = [
        //             xdomain[0] + xlzoom,
        //             xdomain[1] + xrzoom
        //         ].sort(function(a, b){ return a - b; });
        //         var yval = [
        //             ydomain[0] + ydzoom,
        //             ydomain[1] + yuzoom
        //         ].sort(function(a, b){ return a - b; });
        //         quorra.controller[id].render(xval, yval);
        //         quorra.controller[id].xdrag = d3.scale.linear().domain(xval).range(quorra.controller[id].xstack[l-1].range());
        //         quorra.controller[id].ydrag = d3.scale.linear().domain(yval).range(quorra.controller[id].ystack[l-1].range());
        //         quorra.controller[id].scale = movement.scale;
        //         return;
        //     });

        // enable double click for jumping up on the stack
        _this.attr.svg.on('dblclick', function() {
            var l = _this.xstack.length;
            if (l > 1){
                _this.xstack.pop();
                _this.ystack.pop();
                l = l - 1;
            }
            _this.redraw(_this.xstack[l-1].domain(), _this.ystack[l-1].domain(), false);
        }).call(drag) // .call(zoom)
        .on("dblclick.zoom", null)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);

        // set up events for toggling enabled flags
        quorra.events.Shift.down = function() {
            d3.selectAll('.glyphbox#pan')
                .selectAll('.glyph')
                .style('stroke-width', 3);
            _.each(Object.keys(quorra.plots), function(key){
                quorra.plots[key].enabled.pan = true;
                quorra.plots[key].enabled.zoom = false;
            });
        };
        quorra.events.Shift.up = function() {
            d3.selectAll('.glyphbox#pan')
                .selectAll('.glyph')
                .style('stroke-width', 1);
            _.each(Object.keys(quorra.plots), function(key) {
                quorra.plots[key].enabled.pan = false;
                quorra.plots[key].enabled.zoom = true;
            });
        };

    };

    this.enableannotation = function() {
        quorra.log('enabling annotation events');

        // set up default attributes for new annotation
        var triggers = _.extend({
            id: function(d){ return quorra.uuid(); },
            type: function(d){ return 'circle'; },
            text: function(d){ return (_this.attr.xformat == "auto") ? d3.format(".2f")(d.x) : _this.attr.xformat(d.x); },
            size: function(d){ return 15; },
            group: function(d){ return null; },
            rotate: function(d){ return 0; },
            'text-size': function(d){ return 13; },
            'text-position': function(d){ return {x: 0, y: 20}; },
            'text-rotation': function(d){ return 0; },
            x: function(d){ return d.x; },
            y: function(d){ return d.y; },
            style: function(d){ return {}; },
            meta: function(d){ return {}; },
            draggable: false,
            events: {}
        }, _this.attr.annotatable);
        triggers['events'] = _.extend({
            dragstart: function(){},
            drag: function(){},
            dragend: function(){},
            click: function(){},
            add: function(d){}
        }, triggers['events']);

        // enable annotation on click event
        _this.attr.svg.on('click', function(){
            if (_this.enabled.annotate) {
                var coordinates = mouse(_this.attr.svg);
                if (coordinates[0] > (_this.innerwidth + _this.attr.margin.left) ||
                    coordinates[0] < _this.attr.margin.left ||
                    coordinates[1] > (_this.innerheight + _this.attr.margin.top) ||
                    coordinates[1] < _this.attr.margin.top) {
                    return;
                }

                var xmap = d3.scale.linear().domain(_this.xscale.range()).range(_this.xscale.domain());
                var ymap = d3.scale.linear().domain(_this.yscale.range()).range(_this.yscale.domain());
                var d = {
                    x: xmap(coordinates[0] - _this.attr.margin.left),
                    y: ymap(coordinates[1] - _this.attr.margin.top),
                }
                for (i in _this.attr.annotation){
                    var annot = _this.attr.annotation[i];
                    if ((Math.abs(_this.xscale(annot.x) - _this.xscale(d.x)) < 20) && (Math.abs(_this.yscale(annot.y) - _this.yscale(d.y)) < 20)){
                        return;
                    }
                }

                d.parent = _this.attr.id;
                _.each(['id', 'type', 'text', 'style', 'meta', 'size', 'group', 'text-size', 'text-position', 'events'], function(x){
                    d[x] = (typeof triggers[x] === "function") ? triggers[x](d) : triggers[x];
                });
                d.events = triggers.events;
                if (_this.attr.annotation){
                    _this.attr.annotation.push(d);
                }else{
                    _this.attr.annotation = [d];
                }
                _this.annotate();
                triggers.events.add(d);
            }
        });

        // set up key bindings for events
        quorra.events.ShiftA.down = function() {
            d3.selectAll('.glyphbox#annotate')
                .selectAll('.glyph')
                .style('stroke-width', 3);
            _.each(Object.keys(quorra.plots), function(key){
                quorra.plots[key].enabled.annotate = true;
            });
        };
        quorra.events.ShiftA.up = function() {
            d3.selectAll('.glyphbox#annotate')
                .selectAll('.glyph')
                .style('stroke-width', 1);
            _.each(Object.keys(quorra.plots), function(key){
                quorra.plots[key].enabled.annotate = false;
            });
        };
    };


    // tuneable plot attributes
    this.attr = extend({
        // sizing
        id: quorra.uuid(),
        plotname: "quorra-plot",
        type: "quorra-plot",
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 40, "left": 40, "right": 65},
        svg: null,
        bind: 'body',
        
        // data rendering
        data: [],
        x: function(d, i) { return d.x; },
        y: function(d, i) { return d.y; },
        group: function(d, i){ return (typeof d.group === 'undefined') ? 0 : d.group; },
        label: function(d, i){ return (typeof d.label === 'undefined') ? i : d.label; },
        transform: function(d){ return d; },
        color: "auto",
        xrange: "auto",
        yrange: "auto",

        // triggers
        groupclick: function(d, i){},
        labelclick: function(d, i){},
        zoomable: false,
        annotatable: false,
        exportable: false,
        events: {
            zoom: function() {
                quorra.log('zoom event');
            },
            pan: function() {
                quorra.log('pan event');
            },
            panstart: function() {
                quorra.log('pan start event');
            },
            panend: function() {
                quorra.log('pan end event');
            },
            export: function() {
                quorra.log('export event');
            }
        },

        // plot styling
        grid: false,
        xticks: "auto",
        yticks: "auto",
        xaxis: "outside",
        yaxis: "outside",
        xformat: "auto",
        yformat: "auto",
        xorient: "bottom",
        yorient: "left",
        xlabel: "",
        ylabel: "",
        labelposition: "middle",
        labelpadding: {x: 0, y: 0},
        opacity: 1,
        
        // legend
        legend: true,
        lmargin: {"top": 0, "bottom": 0, "left": 0, "right": 0},
        lposition: "outside",
        lshape: "square",
        lorder: [],
        toggle: true,
        toggled: [],

        // glyphs
        glyphs: true,
        gshape: "circle",
        
    }, attributes);

    // binding attributes to constructor function
    parameterize(_this.attr, _this.go);
    _this.go.__parent__ = _this;
    
    // managing specialized attributes
    _this.go.tooltip = function(value) {
        if (!arguments.length) return _this.attr.tooltip;
        if (value == true) {
            _this.attr.tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("opacity", 0);
        } else if (value != false) {
            _this.attr.tooltip = value;
        }
        return _this.go;
    };
    _this.go.annotation = function(value) {
        if (!arguments.length) return _.map(_this.attr.annotation, function(d){ return d.__parent__.attr; });
        _this.attr.annotation = _.map(value, function(d) {
            if (typeof d != 'function') {
                d = quorra.annotation(d).bind(_this.go);
            }
            return d;
        });
        return _this.go;
    };
    _this.go.add = function(value) {
        if (typeof _this.attr.annotation == 'undefined') {
            _this.attr.annotation = [value];
        } else {
            _this.attr.annotation.push(value);
        }
        return _this.go;
    }

    return this.go;
}

function Annotation(attributes) {
    /**
    Annotation()

    Object for managing plot rendering, and extending
    common functionality across all plot models.

    @author <bprinty@gmail.com>
    */

    quorra.log('instantiating annotation object');

    if (typeof attributes == 'undefined') attributes = {};
    if (typeof plot == 'undefined') plot = 'body';
    var _this = this;

    // constructor
    this.go = function() {
        quorra.log('running annotation generator function');

        // create wrapper element for annotation groups
        _this.plot.plotarea.selectAll('.annotation#' + _this.attr.id).remove();
        var cl = (_this.attr.group == null) ? 'annotation ' + _this.attr.type : 'annotation ' + _this.attr.type + ' g_' + _this.attr.group;
        var asel = _this.plot.plotarea.append('g')
            .attr('id', _this.attr.id).attr('class', cl)
            .attr("clip-path", "url(#clip)")
            .style("visibility", function() {
                return _.contains(_this.plot.attr.toggled, _this.plot.attr.group(_this.attr)) ? 'hidden' : 'visible';
            }).on('mouseover', function() {
                d3.select(this).style('opacity', 0.75*_this.attr.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.html(_this.attr.hovertext)
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on('mousemove', function() {
                if (_this.attr.tooltip) {
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on('mouseout', function() {
                d3.select(this).style('opacity', _this.attr.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.style("opacity", 0);
                }
            }).on('click', _this.attr.events.click);
        
        // enable drag behavior for annotation (if available and specified)
        var x = _this.plot.xscale(_this.attr.x);
        var y = _this.plot.yscale(_this.attr.y);
        if (_this.attr.draggable && !_this.plot.attr.zoomable) {
            var drag = d3.behavior.drag()
                .on("dragstart", function() {
                    _this.attr.events.dragstart();
                }).on("dragend", function() {
                     _this.attr.events.dragend();
                }).on("drag", function() {
                    // get mouse coordinates
                    var movement = mouse(_this.plot.attr.svg);
                    var xoffset = Math.abs(_this.plot.xscale(_this.attr.width) - _this.plot.xscale(0));
                    var yoffset = Math.abs(_this.plot.yscale(_this.attr.height) - _this.plot.yscale(0));
                    xoffset = (_this.attr.type === 'rect') ? xoffset / 2 : 0;
                    yoffset = (_this.attr.type === 'rect') ? yoffset / 2: 0;
                    xcoord = movement.x - _this.plot.attr.margin.left - xoffset;
                    ycoord = movement.y - _this.plot.attr.margin.top - yoffset;

                    // translate annotation object
                    console.log(ycoord);
                    console.log(_this.plot.innerheight);
                    console.log(_this.plot.attr.margin);
                    var xmotion = _.center(xcoord, [0, _this.plot.innerwidth - 2*xoffset]);
                    var ymotion = _.center(ycoord, [0, _this.plot.innerheight - 2*yoffset]);
                    d3.select(this).attr('transform', 'translate(' + (xmotion - x) + ',' + (ymotion - y) + ')');
                    
                    // update annotation attributes with new data
                    var xmap = d3.scale.linear().domain(_this.plot.xscale.range()).range(_this.plot.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.plot.yscale.range()).range(_this.plot.yscale.domain());
                    _this.attr.x = xmap(xmotion);
                    _this.attr.y = ymap(ymotion);
                    d3.select(this).select('text').text(_this.attr.text);

                    _this.attr.events.drag();
                });

            asel.call(drag);
        }

        // extend annotation object with specific shape
        var tmargin = {x: _this.attr.tmargin.x, y: _this.attr.tmargin.y};
        if (_this.attr.type == 'rect') {
            asel.selectAll('.rect').data([_this.attr]).enter()
                .append('rect')
                .attr('class', 'rect')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('width', Math.abs(_this.plot.xscale(_this.attr.width) - _this.plot.xscale(0)))
                .attr('height', Math.abs(_this.plot.yscale(_this.attr.height) - _this.plot.yscale(0)))
                .attr('x', x)
                .attr('y', y);
            tmargin.x = tmargin.x + _this.attr.text.length*2 + 2;
            tmargin.y = tmargin.y - 5;
        } else if (_this.attr.type == 'circle') {
            asel.selectAll('.circle').data([_this.attr]).enter()
                .append('circle')
                .attr('class', 'circle')
                .attr('r', _this.attr.size / 2)
                .attr('cx', x)
                .attr('cy', y);
            tmargin.y = tmargin.y - (_this.attr.size / 2) - 5;
        } else if (_this.attr.type == 'triangle') {
            asel.selectAll('.triangle').data([_this.attr]).enter()
                .append('path')
                .attr('class', 'triangle')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('d', function(d){
                    return [
                    'M' + (x - (d.size / 2)) + ',' + (y - (d.size / 2)),
                    'L' + (x + (d.size / 2)) + ',' + (y - (d.size / 2)),
                    'L' + x + ',' + (y + (d.size / 2)),
                    'Z'].join('');
                });
            tmargin.x = tmargin.x + (_this.attr.size / 2) - _this.attr.text.length*2;
            tmargin.y = tmargin.y - (_this.attr.size / 2) - 5;
        }
        if (_this.attr.text !== '') {
            asel.selectAll('.text').data([_this.attr]).enter()
                .append('text')
                .attr('class', 'text')
                .attr('x', x + tmargin.x)
                .attr('y', y + tmargin.y)
                .style("font-size", _this.attr.tsize)
                .style("text-anchor", "middle")
                .text(_this.attr.text);
        }
        
        // apply styling
        _.map(
            Object.keys(_this.attr.style),
            function(i){ asel.style(i, _this.attr.style[i]); }
        );

        return _this;
    }

    // setting up attributes
    this.attr = extend({
        parent: null,
        id: quorra.uuid(),
        type: 'text',
        text: function(d){ return d3.format('.2f')(d.x); },
        hovertext: '',
        xfixed: false,
        yfixed: false,
        size: 15,
        group: null,
        rotate: 0,
        tsize: 13,
        tposition: {x: 0, y: 20},
        tmargin: {x: 0, y: 0},
        trotation: 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        draggable: false,
        events: {
            drag: function() {
                quorra.log('drag event');
            },
            dragstart: function() {
                quorra.log('drag start event');
            },
            dragend: function() {
                quorra.log('drag end event');
            },
            click: function() {
                quorra.log('click event');
            }
        },
        style: {opacity: 1},
        meta: {}
    }, attributes);
    
    // binding attributes to constructor function
    parameterize(_this.attr, _this.go);
    _this.go.__parent__ = _this;
    
    // managing specialized attributes
    _this.attr.tooltip = d3.select("body").append("div")
        .attr("class", "annotation-tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    _this.go.tooltip = function(value) {
        if (!arguments.length) return _this.attr.tooltip;
        if (value == false){
            _this.attr.tooltip.remove();
        } else if (value != false) {
            _this.attr.tooltip = value;
        }
        return _this.go;
    };
    _this.go.bind = function(value) {
        if (!arguments.length) return _this.plot;
        _this.attr.parent = value;
        _this.plot = value.__parent__;
        _this.attr.parent = _this.plot.attr.id;
        return _this.go;
    };

    return _this.go;
}

quorra.annotation = function(attributes) {
    quorra.log('creating plot annotation');
    return new Annotation(attributes);
};
/**

Event handling within quorra.

@author <bprinty@gmail.com>

*/


// key map and default event definitions
var baseKeys = { 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc'};
var metaKeys = { 9: 'Tab', 13: 'Enter', 65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z'};
var allKeys = _.extend(_.clone(baseKeys), metaKeys);


// setting statuses for each key combination
quorra.keys = {};
_.each(allKeys, function(key){
    quorra.keys[key] = false;
});


// setting default functions for each key combination
quorra.events = {};
_.each(baseKeys, function(base){

    quorra.events[base] = {
        down: function(){},
        up: function(){}
    }
    _.each(metaKeys, function(meta){
        quorra.events[base + meta] = {
            down: function(){},
            up: function(){}
        }
    });
});


document.onkeydown = function (e) {
    /**
    Key down event handlers. Allows for event triggering on
    key press if methods for each key combination are specified.

    To set a method for a specific key down event, do:

    quorra.events.ShiftA.up = function(){
        console.log('Shift + A Pressed!');
    }

    @author <bprinty@gmail.com>
    */

    e = e || window.event;
    var k = e.which;
    if (_.has(allKeys, k)){
        quorra.keys[allKeys[k]] = true;
        if (_.has(metaKeys, k)){
            _.each(baseKeys, function(i){
                if (quorra.keys[i]){
                    quorra.events[i+metaKeys[k]].down();
                }
            });
        }else{
            quorra.events[allKeys[k]].down();
        }
    }
};


document.onkeyup = function (e) {
     /**
    Key up event handlers. Allows for event triggering on
    key release if methods for each key combination are specified.

    To set a method for a specific key down event, do:

    quorra.events.ShiftA.down = function(){
        console.log('Shift + A Released!');
    }

    @author <bprinty@gmail.com>
    */

    e = e || window.event;
    var k = e.which;
    if (_.has(allKeys, k)){
        quorra.keys[allKeys[k]] = false;
        if (_.has(metaKeys, k)){
            _.each(baseKeys, function(i){
                if (quorra.keys[i]){
                    quorra.events[i+metaKeys[k]].up();
                }
            });
        }else{
            quorra.events[allKeys[k]].up();
        }
    }
};


// return processed mouse coordinates from selection
function mouse(sel){
    var coordinates = d3.mouse(sel.node());
    var res = {};
    res.x = coordinates[0];
    res.y = coordinates[1];
    res.scale = (d3.event.type == 'zoom') ? d3.event.scale : 1;
    return res;
}


// return ratio of domain/range for scaling zoom
function zoomscale(scale){
    var d = scale.domain();
    var r = scale.range();
    var dx = Math.abs(d[1] - d[0]);
    var dr = Math.abs(r[1] - r[0]);
    return dx/dr;
}


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
    */

    if (!arguments.length) return seed;
    seed = value;
};


quorra.random = function() {
    /**
    quorra.random()

    Random number generation using internal seed. 
    */

    if (typeof seed === 'undefined') seed = 42;
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};


quorra.uuid = function() {
    /**
    quorra.uuid()

    Generate random uuid with seed. 
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
    document.body.appendChild(cln);

    // set styling for elements
    d3.select(cln).style('background-color', '#fff');
    d3.select(cln).selectAll('.glyphbox').remove();
    d3.select(cln).selectAll('text').style('font-weight', 300).style('font-size', '12px').style('font-family', '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif');
    d3.select(cln).selectAll('.axis line').style('stroke', '#bbb').style('fill', 'none').style('shape-rendering', 'crispEdges');
    d3.select(cln).selectAll('.axis path').style('stroke', '#bbb').style('fill', 'none').style('shape-rendering', 'crispEdges');
    d3.select(cln).selectAll('.axis .tick line').style('stroke', '#bbb').style('opacity', 0.5);
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

            // binding a tooltip requires removal of the previous
            if (i === 'tooltip') {
                attributes[i].remove();
            }
            // maintain non-overridden object arguments
            if (typeof value === 'object' && i != 'tooltip') {
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
}

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
        if (typeof custom[d] != 'undefined') {
            if (typeof stock[d] == "object" && ! Array.isArray(stock[d]) && stock[d] != null) {
                stock[d] = extend(stock[d], custom[d]);
            } else if (Array.isArray(stock[d]) && !Array.isArray(custom[d])) { 
                stock[d] = [custom[d]];
            } else {
                stock[d] = custom[d];
            }
        }
    });
    return stock;
}

/**

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
function Bar(attributes) {
    /**
    quorra.bar()

    Bar plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3943967

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-bar",
        layout: "stacked"
    }, attributes));
    this.type = "bar";

    // overwrite render method
    this.plot = function() {

        // organizing data
        // no interpolation should happen here because users should be
        // responsible for ensuring that their data is complete
        var layers = [];
        var ugrps = _this.pallette.domain();
        for (var grp in ugrps) {
            var flt = _.filter(_this.data, function(d){ return d.group == ugrps[grp]; });
            flt = _.map(flt, function(d){
                d.layer = grp;
                return d;
            });
            layers.push(_.filter(flt, function(d){ return d.group == ugrps[grp]; }));
        }
        var y0 = _.map(layers[0], function(d){ return 0; });
        for (var lay=0; lay<layers.length; lay++){
            layers[lay] = _.map(layers[lay], function(d, i){ 
                d.y0 = y0[i];
                y0[i] = y0[i] + d.y;
                return d;
            });  
        }

        // plotting bars
        var layer = _this.plotarea.selectAll(".layer")
            .remove().data(layers)
            .enter().append("g")
            .attr("class","layer")
            .attr("clip-path", "url(#clip)");

        var bar = layer.selectAll("rect")
            .remove().data(function(d){ return d; })
            .enter().append("rect")
            .attr("class", function(d, i) {
                return "bar " + "g_" + d.group;
            })
            .attr("x", function(d, i) {
                if (layers[0].length > 1){
                    if (_this.attr.layout === "stacked"){
                        return _this.xscale(_this.attr.x(d, i));
                    }else{
                        var diff = Math.abs(_this.xscale(_this.attr.x(layers[0][1])) - _this.xscale(_this.attr.x(layers[0][0])));
                        return _this.xscale(_this.attr.x(d, i)) + _this.pallette.range().indexOf(_this.pallette(d.group))*(diff / _this.pallette.domain().length);
                    }
                }else{
                    var range = _this.xscale.range();
                    return range[1] - range[0] - 2;
                }
            })
            // NOTE: this needs to be fixed so that y0 is 
            // parameterized before this takes place.
            .attr("y", function(d, i){ return (_this.attr.layout == "stacked") ? _this.yscale(d.y0 + d.y) : _this.yscale(d.y); })
            .attr("height", function(d, i){ return (_this.attr.layout == "stacked") ? (_this.yscale(d.y0) - _this.yscale(d.y0 + d.y)) : _.max([_this.innerheight - _this.yscale(d.y), 0]); })
            .attr("width", function(d){
                if (layers[0].length > 1){
                    var diff = Math.abs(_this.xscale(_this.attr.x(layers[0][1])) - _this.xscale(_this.attr.x(layers[0][0])));
                    if (_this.attr.layout === "stacked"){
                        return diff - 2;
                    }else{
                        return (diff / _this.pallette.domain().length) - 2;
                    }
                }else{
                    var range = _this.xscale.range();
                    return range[1] - range[0] - 2;
                }
            }).attr("fill", function(d, i){ return _this.pallette(d.group); })
            .style("opacity", _this.attr.opacity)
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, d.group) ? 'hidden' : 'visible';
            })
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(d.label)
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("opacity", 0);
                }
            });
    }

    return this.go;
}

Bar.prototype = Object.create(QuorraPlot.prototype);
Bar.prototype.constructor = Bar;
quorra.bar = function(attributes) {
    return new Bar(attributes);
};

function Density(attributes) {
    /**
    quorra.density()

    Density plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // parent class initialization
    Line.call(this, extend({
        class: "quorra-density",
        resolution: 10
    }, attributes));
    this.type = "density";

    // data transformation
    _this.attr.transform = function(data) {

        // generate kde scaling function
        var format = d3.format(".04f");
        var kde = kdeEstimator(epanechnikovKernel(9), d3.scale.linear().ticks(_this.attr.resolution));

        // rearranging data
        var grps = _.uniquesort(data, _this.attr.group);
        var newdata = [];
        for (var grp in grps){
            var subdat = _.filter(data, function(d){ return d.group == grps[grp]; });
            var newgrp = kde(_.map(subdat, function(d){ return d.x }));
            newgrp = _.map(newgrp, function(d){
                return {
                    x: d.x,
                    y: d.y,
                    group: grps[grp],
                    label: format(d.y)
                };
            });
            newdata = newdata.concat(newgrp);
        }

        return newdata;
    }

    return this.go;
}

Density.prototype = Object.create(Line.prototype);
Density.prototype.constructor = Density;
quorra.density = function(attributes) {
    return new Density(attributes);
};
function Histogram(attributes) {
    /**
    quorra.histogram()

    Histogram. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // parent class initialization
    Bar.call(this, extend({
        class: "quorra-histogram",
        bins: 10,
        display: 'counts' // fraction, percent, counts
    }, attributes));
    this.type = "histogram";

    // data transformation
    _this.attr.transform = function(data) {

        // formatters
        if (_this.attr.display == "percent") {
            var format = d3.format("0.02%");
        } else if (_this.attr.display == "counts") {
            var format = d3.format(".0f");
        } else if (_this.attr.display == "fraction"){
            var format = d3.format(".02f");
        }

        // generate histogram binning
        var histogram = d3.layout.histogram()
            .frequency(false)
            .bins(d3.scale.linear().ticks(_this.attr.bins));

        // rearranging data
        var grps = _.uniquesort(data, _this.attr.group);
        var newdata = [];
        for (var grp in grps){
            var subdat = _.filter(data, function(d){ return d.group == grps[grp]; });
            var newgrp = histogram(_.map(subdat, function(d){ return d.x }));
            newgrp = _.map(newgrp, function(d){
                if (_this.attr.display == 'counts') {
                    d.y = d.y*subdat.length;
                } else if (_this.attr.display == 'percent') {
                    d.y = d.y;
                }
                return {
                    x: d.x,
                    y: d.y,
                    group: grps[grp],
                    label: format(d.y)
                };
            });
            newdata = newdata.concat(newgrp);
        }

        return newdata;
    }

    return this.go;
}


Histogram.prototype = Object.create(Bar.prototype);
Histogram.prototype.constructor = Histogram;
quorra.histogram = function(attributes) {
    return new Histogram(attributes);
};

function Line(attributes) {
    /**
    quorra.line()

    Line plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-line",
        points: 0,
        size: 3,
        layout: "line",
        interpolate: "linear"
    }, attributes));
    this.type = "line";

    // overwrite render method
    this.plot = function() {

        // configuring path renderer
        var path = d3.svg.line()
            .x(function(d, i) { return _this.xscale(_this.attr.x(d, i)); })
            .y(function(d, i) { return _this.yscale(_this.attr.y(d, i)); })
            .interpolate(_this.attr.interpolate);

        // draw lines
        var ugrps = _this.pallette.domain();
        for (var grp in ugrps) {

            // lines
            var subdat = _.filter(_this.data, function(d){ return d.group == ugrps[grp]; });
            _this.plotarea.append("path")
                .datum(subdat)
                .attr("class", function(d, i){
                    return "line " + "g_" + d[0].group;
                })
                .attr("d", function(d){
                    var p = path(d);
                    if (_this.attr.layout === "line"){
                        return p;
                    }else if (_this.attr.layout === "area"){
                        return [
                            p,
                            "L" + _this.xscale(_this.domain[1]) + "," + _this.yscale(_this.range[0]),
                            "L" + _this.xscale(_this.domain[0]) + "," + _this.yscale(_this.range[0]),
                            "Z"
                        ].join('');
                    }
                })
                .style("fill", function(d){
                    if (_this.attr.layout === "line"){
                        return "none";
                    }else if (_this.attr.layout === "area"){
                        return _this.pallette(d[0].group);
                    }
                })
                .style("stroke", _this.pallette(ugrps[grp]))
                .style("stroke-width", _this.attr.size)
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i){
                    return _.contains(_this.attr.toggled, _this.attr.group(d[0], i)) ? 'hidden' : 'visible';
                })
                .attr("clip-path", "url(#clip)")
                .on("mouseover", function(d, i) {
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d[0].group)
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mousemove", function(d) {
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mouseout", function(d) {
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip.style("opacity", 0);
                    }
                }).on("click", _this.attr.groupclick);
        }

        // draw points (if specified)
        if (_this.attr.points > 0) {

            _this.plotarea.selectAll(".dot")
                .remove().data(_this.data)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", _this.attr.points)
                .attr("cx", function(d, i) { return _this.xscale(_this.attr.x(d, i)); })
                .attr("cy", function(d, i) { return _this.yscale(_this.attr.y(d, i)); })
                .style("fill", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                })
                .attr("clip-path", "url(#clip)")
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(_this.attr.label(d, i))
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mousemove", function(d){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("opacity", 0);
                    }
                }).on("click", _this.attr.labelclick);
        }
    }

    return this.go;
}

Line.prototype = Object.create(QuorraPlot.prototype);
Line.prototype.constructor = Line;
quorra.line = function(attributes) {
    return new Line(attributes);
};
quorra.multiline = function() {
    /**
    quorra.multiline()

    Multi line plot with group-relative scaling.

    @author <bprinty@gmail.com>
    */

    // attributes
    var width = "auto";
    var height = "auto";
    var margin = {"top": 30, "bottom": 20, "left": 40, "right": 20};
    var color = d3.scale.category10();
    var x = function(d, i) { return d.x; };
    var y = function(d, i) { return d.y; };
    var group = function(d, i){ return (typeof d.group == "undefined") ? 0 : d.group; };
    var label = function(d, i){ return (typeof d.label == "undefined") ? i : d.label; };
    var grouplabels = [];
    var groupformats = [];
    var groupticks = [];
    var legend = true;
    var xticks = "auto";
    var yticks = "auto";
    var tooltip = d3.select("body").append("div")
            .attr("id", "multiline-tooltip")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0);

    // generator
    function go(selection){
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (width == "auto") ? (parseInt(selection.style("width")) - margin.left - margin.right) : width;
        var h = (height == "auto") ? (parseInt(selection.style("height")) - margin.top - margin.bottom) : height;
        
        // transform data (if transformation function is applied)
        // this is used for density plots
        var data = selection.data()[0];

        // arrange data for grouping
        var groups = _.unique(_.map(data, function(d){ return d.group; }));
        var groupValues = _.map(groups, function(d){ return []; });
        for(var i=0; i<data.length; i++){
            idx = groups.indexOf(data[i].group);
            groupValues[idx].push(data[i].x);
        }

        // generate scaling in type-aware way
        var groupScales = _.map(groups, function(d){ return undefined; });
        for(i=0; i<groups.length; i++){
            if(typeof groupValues[i][0] === 'string'){
                groupScales[i] = d3.scale.ordinal().range([0, h]);
                groupScales[i].domain(groupValues[i]).rangePoints(groupScales[i].range(), 1);
            }else{
                groupScales[i] = d3.scale.linear().range([0, h]);
                groupScales[i].domain([_.min(groupValues[idx]), _.max(groupValues[idx])]).nice();
            }
        }

        // configure axes
        var groupAxes = _.map(groups, function(d){ return undefined; });
        for(i=0; i<groups.length; i++){
            groupAxes[i] = d3.svg.axis().scale(groupScales[i]).orient("left");
            if (groupticks.length === groups.length && groupticks[i] != "auto") {
                groupAxes[i] = groupAxes[i].ticks(groupticks[i]);
            }
            if (groupformats.length === groups.length && groupformats[i] != "auto"){
                groupAxes[i] = groupAxes[i].tickFormat(xformats[i]);
            }
        }

        // initialize canvas
        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-line")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // axes
        // for some reason (haven't been able to look into it yet)
        // all of the axes are using the same scale when they should
        // have different scaling relative to the input data
        var xScale = d3.scale.linear().range([0, w]);
        xScale.domain([0, groups.length]).nice();
        for(i=0; i<groups.length; i++){
            
            var label = (grouplabels.length == groups.length) ? grouplabels[i] : groups[i];
            var axes = groupAxes[i];
            var offset = xScale(i);
            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + offset + ", 0)")
                .call(axes)
            .append("text")
                .attr("class", "label")
                .attr("y", -margin.top + 5)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(label);

        }

        // plotting lines
        // note -- this is wrong right now, and so is the
        // code below I fell asleep working on this part, so it's
        // incomplete
        var line = d3.svg.line()
            .x(function(d, i) { return xScale(groups.indexOf(d.group)); })
            .y(function(d, i) { return groupScales[groups.indexOf(d.group)](x(d, i)); });
        
        svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line)
            .style("stroke", color(0))
            .style("opacity", 0.75)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                tooltip.html(d[0].group)
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mousemove", function(d){
                tooltip
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", 0.75);
                tooltip.style("opacity", 0);
            });

        // // legend (if specified)
        // if (legend) {
        //     var leg = svg.selectAll(".legend")
        //         .data(color.domain())
        //         .enter().append("g")
        //         .attr("class", "legend")
        //         .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
        // }
    }

    // getters/setters
    go.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return go;
    };
    go.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return go;
    };
    go.margin = function(value) {
        if (!arguments.length) return margin;
        margin = value;
        return go;
    };
    go.color = function(value) {
        if (!arguments.length) return color;
        color = value;
        return go;
    };
    go.x = function(value) {
        if (!arguments.length) return x;
        x = value;
        return go;
    };
    go.group = function(value) {
        if (!arguments.length) return group;
        group = value;
        return go;
    };
    go.label = function(value) {
        if (!arguments.length) return label;
        label = value;
        return go;
    };
    go.grouplabels = function(value) {
        if (!arguments.length) return grouplabels;
        grouplabels = value;
        return go;
    };
    go.groupformats = function(value) {
        if (!arguments.length) return groupformats;
        groupformats = value;
        return go;
    };
    go.groupticks = function(value) {
        if (!arguments.length) return groupticks;
        groupticks = value;
        return go;
    };
    go.legend = function(value) {
        if (!arguments.length) return legend;
        legend = value;
        return go;
    };
    go.tooltip = function(value) {
        if (!arguments.length) return tooltip;
        tooltip.remove();
        tooltip = value;
        return go;
    };

    return go;
};function Pie(attributes) {
    /**
    quorra.pie()

    Pie chart. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-pie",
        aggregate: function(x){ return(x[0]); },
        radius: "auto",
        inner: "auto",
    }, attributes));
    this.type = "pie";

    // overwrite render methods
    this.axes = function() {
        // no axes for pie chart
    }

    this.plot = function() {

        // if height/width are auto, determine them from selection
        var width = (_this.attr.width == "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        width = width - _this.attr.margin.left - _this.attr.margin.right;
        height = height - _this.attr.margin.top - _this.attr.margin.bottom;

        var r = (_this.attr.radius == "auto") ? (Math.min(width, height) / 2) : _this.attr.radius;
        var ir = (_this.attr.inner == "auto") ? 0 : _this.attr.inner;

        // aggregate data
        var newdata = [];
        var gps = _this.pallette.domain();
        for (var i in gps){
            var subdat = _.filter(_this.data, function(d){ return d.group == gps[i]; });
            newdata.push({
                x: _this.attr.aggregate(_.map(subdat, function(d){ return d.x; })),
                group: gps[i],
                label: (subdat.length <= 1) ? gps[i] : subdat.length + " " + gps[i]
            });
        }

        var arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius(ir);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d){ return d.x; });

        // plot
        var g = _this.plotarea
            .attr("transform", "translate(" + (_this.innerwidth / 2) + "," + (_this.innerheight / 2) + ")")
            .selectAll(".arc")
            .data(pie(newdata))
            .enter().append("g")
            .attr("class", function(d){
                return "arc g_" + d.data.group;
            })
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, _this.attr.group(d.data)) ? 'hidden' : 'visible';
            });

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return _this.pallette(_this.attr.group(d.data, i)); })
            .style("opacity", _this.attr.opacity)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(_this.attr.label(d.data, i))
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("opacity", 0);
                }
            }).on("click", _this.attr.labelclick);
    }

    return this.go;
};

Pie.prototype = Object.create(QuorraPlot.prototype);
Pie.prototype.constructor = Pie;
quorra.pie = function(attributes) {
    return new Pie(attributes);
};
function Scatter(attributes) {
    /**
    Scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-scatter",
        lm: false,
        xdensity: false,
        ydensity: false,
        xjitter: 0,
        yjitter: 0,
        size: 5,
    }, attributes));
    this.type = "scatter";

    // overwrite render method
    this.plot = function() {

        // plotting points
        _this.plotarea.selectAll(".dot")
            .remove().data(_this.data)
            .enter().append("circle")
            .attr("class", function(d, i){
                return "dot " + "g_" + d.group;
            })
            .attr("r", _this.attr.size)
            .attr("cx", function(d, i) {
                return (quorra.random() - 0.5) * _this.attr.xjitter + _this.xscale(_this.attr.x(d, i));
            })
            .attr("cy", function(d, i) {
                return (quorra.random() - 0.5) * _this.attr.yjitter + _this.yscale(_this.attr.y(d, i));
            })
            .style("fill", function(d, i) { return _this.pallette(_this.attr.group(d, i)); })
            .style("opacity", _this.attr.opacity)
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
            })
            .attr("clip-path", "url(#clip)")
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(_this.attr.label(d, i))
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("opacity", 0);
                }
            });

        // generating density ticks (if specified)
        if (_this.attr.xdensity){
            _this.plotarea.selectAll(".xtick")
                .remove().data(_this.data)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "xtick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return _this.xscale(_this.attr.x(d, i)); })
                .attr("x2", function(d, i) { return _this.xscale(_this.attr.x(d, i)); })
                .attr("y1", function(d, i) { return _this.innerheight; })
                .attr("y2", function(d, i) { return _this.innerheight-10; })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        if (_this.attr.ydensity){
            _this.plotarea.selectAll(".ytick")
                .remove().data(_this.data)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "ytick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return 0; })
                .attr("x2", function(d, i) { return 10; })
                .attr("y1", function(d, i) { return _this.yscale(_this.attr.y(d, i)); })
                .attr("y2", function(d, i) { return _this.yscale(_this.attr.y(d, i)); })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        // generating regression line with smoothing curve (if specified)
        if (_this.attr.lm != false){
            console.log("Not yet implemented!");
        }
    }

    return this.go;
}

Scatter.prototype = Object.create(QuorraPlot.prototype);
Scatter.prototype.constructor = Scatter;
quorra.scatter = function(attributes) {
    return new Scatter(attributes);
};


quorra.version = "0.0.1";

window.quorra = quorra;

})();