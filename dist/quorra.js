/* quorra version 0.0.3 (http://github.com/bprinty/quorra) */
(function(){
/***
 *
 * Quorra base.
 * 
 * @author  <bprinty@gmail.com>
 */


/**
 * Base object exposing all internal functionality.
 */
function quorra() {}


quorra.debug = false;
quorra.error = function(text) {
    /**
    quorra.error()

    Class for managing error reporting.
    */

    console.log('ERROR: ' + text);
};

quorra.log = function(text) {
    /**
    quorra.log()

    Class for managing logging.
    */

    if (quorra.debug) {
        console.log('DEBUG: ' + text);
    }
};


/**
 * Render plot object.
 * @param {function} generator Plot generator function.
 * @return {object} Plot object.
 */
quorra.render = function(generator) {
    quorra.log('rendering element');
    var obj = generator();
    if (typeof generator.parent === 'undefined') {
        quorra.plots[generator.id()] = obj;
    }
    return obj;
};


quorra.plots = {};
function QuorraPlot(attributes) {
    /**
    QuorraPlot()

    Object for managing plot rendering, and extending
    common functionality across all plot models.
    */

    quorra.log('instantiating quorra plot object');

    if (typeof attributes === 'undefined') attributes = {};
    var _this = this;

    // constructor
    this.go = function(selection) {
        quorra.log('running generator function');

        // configure selection
        if (typeof selection === 'undefined') selection = _this.attr.bind;
        _this.selection = (typeof selection === 'string') ? d3.select(selection) : selection;

        if (_this.selection.select("svg")[0][0] !== null){
            _this.selection.select("svg").selectAll('*').remove();
        }
        _this.attr.svg = (_this.attr.svg === null) ? _this.selection.append("svg") : _this.attr.svg;


        // calculate basic dimensions
        var width = (_this.attr.width === "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height === "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        _this.innerwidth = width - _this.attr.margin.left - _this.attr.margin.right;
        _this.innerheight = height - _this.attr.margin.top - _this.attr.margin.bottom;

        // set up tooltip
        d3.selectAll("div.quorra-tooltip#" + _this.attr.id + "-tooltip").remove();
        if (_this.attr.tooltip === true) {
            _this.attr.tooltip = d3.select("body").append("div")
                .attr("class", "quorra-tooltip")
                .attr("id", _this.attr.id + "-tooltip")
                .style("position", "fixed")
                .style("visibility", "hidden")
                .style("z-index", 999);
        }

        // create svg and relevant plot areas
        _this.attr.svg = _this.attr.svg.attr("id", _this.attr.id)
            .attr("class", _this.attr.class)
            .attr("width", width)
            .attr("height", height);

        _this.defs = _this.attr.svg.append('defs');

        // set up clip path for windowing display
        _this.defs.append("clipPath")
            .attr("id", "clip-" + _this.attr.id).append("rect")
            .attr("x", 0).attr("y", 0)
            .attr("width", _this.innerwidth)
            .attr("height", _this.innerheight);

        // segment sections of canvas (makes axis rendering easier)
        _this.plotregion = _this.attr.svg.append('g')
            .attr("class", "plotregion")
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")");

        // perform provided data transformations
        _this.data = _this.attr.transform(_this.attr.data);

        // configure color pallette
        _this.pallette = (_this.attr.color === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(_this.attr.color);
        _this.pallette = _this.pallette.domain(_.uniquesort(_this.data, _this.attr.group));
        
        // get x domain and range
        if (typeof _this.data[0].x === 'string') {
            if (_this.attr.xorder.length > 0) {
                _this.domain = _this.attr.xorder;
            } else {
                _this.domain = _.uniquesort(_this.data, _this.attr.x);
            }
            _this.xdelta = 1;
        } else {
            _this.domain = [
                _.min(_.map(_this.data, _this.attr.x)),
                _.max(_.map(_this.data, _this.attr.x))
            ];
            _this.xdelta = (Math.abs(_this.domain[1] - _this.domain[0]) * _this.pallette.length)/_this.data.length;
        }

        // adjust domain for histogram data (needs to be inclusive on both
        // ends for proper display)
        if (_this.type === 'histogram') {
            _this.domain[1] = _this.domain[1] + (_this.domain[1] - _this.domain[0])/(_this.attr.bins-1);
        }

        // get y domain and range
        var max;
        if (typeof _this.data[0].y === 'string') {
            if (_this.attr.yorder.length >  0) {
                _this.range = _this.attr.yorder;
            } else {
                _this.range = _.uniquesort(_this.data, _this.attr.y);
            }
            _this.ydelta = 1;
        } else {
            if (_this.attr.layout === 'stacked'){
                // for some reason, underscore's map function won't 
                // work for accessing the d.y0 property -- so we have
                // to do it another way
                var ux = _.uniquesort(_this.data, _this.attr.x);
                max = _.max(_.map(ux, function(d){
                    var nd =_.filter(_this.data, function(g){ return _this.attr.x(g) == d; });
                    var tmap = _.map(nd, function(g){ return _this.attr.y(g); });
                    return _.reduce(tmap, function(a, b){ return a + b; }, 0);
                }));
            } else {
                max = _.max(_.map(_this.data, _this.attr.y));
            }
            _this.range = [
                _.min(_.map(_this.data, _this.attr.y)),
                max
            ];
            _this.ydelta = (Math.abs(_this.range[1] - _this.range[0]) * _this.pallette.length)/_this.data.length;
        }

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

        // create slider
        if (_this.attr.slider) {
            _this.slider();
        }

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

        // remove old axes elements and render new axes
        _this.plotregion.selectAll("*").remove();
        _this.axes();
        _this.plotarea = _this.plotregion.append('g')
            .attr('class', 'plotarea')
            .attr('clip-path', 'url(#clip-' + _this.attr.id + ')');
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

        // set up scaling for axes
        // TODO: allow users to pass in arbitrary scaling function
        //       i.e. d3.scale.log()

        // x scale formatting
        _this.xmapper = function(d) { return d; };
        if (typeof _this.data[0].x === 'string') {
            _this.xord = d3.scale.ordinal()
                .domain(_this.domain)
                .range(_.range(_this.domain.length));
            _this.xordrev = d3.scale.ordinal()
                .domain(_this.xord.range())
                .range(_this.xord.domain());
            _this.xmapper = function(d) { return _this.xord(d); };
            if (typeof domain[0] === 'string') {
                domain = _.map(domain, _this.xmapper);
                domain[0] = domain[0] - 0.5;
                domain[domain.length - 1] = domain[domain.length - 1] + 0.5;
            }
        }
        _this.xscale = d3.scale.linear()
            .domain([domain[0], domain[domain.length-1]])
            .range([0, _this.innerwidth]);

        // x axis formatting
        _this.xaxis = d3.svg.axis().scale(_this.xscale).orient(_this.attr.xorient);
        if (_this.attr.xticks !== "auto") {
            _this.xaxis = _this.xaxis.ticks(_this.attr.xticks);
        } else if (_this.type === 'histogram') {
            _this.xaxis = _this.xaxis.ticks(_this.attr.bins);
        }
        _this.xaxis = _this.xaxis.tickFormat(_this.attr.xformat);
        if (typeof _this.data[0].x === 'string') {
            if (typeof domain[0] == 'string') {
                domain = _.map(domain, _this.xord);
            }
            _this.xaxis = _this.xaxis.tickValues(_.range(
                Math.ceil(domain[0]),
                Math.floor(domain[domain.length - 1]) + 1
            )).tickFormat(function(d){
                // don't display axis labels for ticks out of ordinal range
                var ndom = _.map(_this.domain, _this.xmapper);
                if ((d >= ndom[0]) && (d <= ndom[ndom.length-1])) {
                    return _this.attr.xformat(_this.xordrev(d));            
                } else {
                    return '';
                }
            });
        }

        // y scale formatting
        _this.ymapper = function(d) { return d; };
        if (typeof _this.data[0].y === 'string') {
            _this.yord = d3.scale.ordinal()
                .domain(_this.range)
                .range(_.range(_this.range.length));
            _this.yordrev = d3.scale.ordinal()
                .domain(_this.yord.range())
                .range(_this.yord.domain());
            _this.ymapper = function(d) { return _this.yord(d); };
            if (typeof range[0] === 'string') {
                range = _.map(range, _this.ymapper);
                range[0] = range[0] - 0.5;
                range[range.length - 1] = range[range.length - 1] + 0.5;
            }
        }
        _this.yscale = d3.scale.linear()
            .domain([range[0], range[range.length-1]])
            .range([ _this.innerheight, 0]);

        // y axis formatting
        _this.yaxis = d3.svg.axis().scale(_this.yscale).orient(_this.attr.yorient);
        if (_this.attr.yticks !== "auto") {
            _this.yaxis = _this.yaxis.ticks(_this.attr.yticks);
        }
        _this.yaxis = _this.yaxis.tickFormat(_this.attr.yformat);
        if (typeof _this.data[0].y === 'string') {
            if (typeof range[0] == 'string') {
                range = _.map(range, _this.yord);
            }
            _this.yaxis = _this.yaxis.tickValues(_.range(
                Math.ceil(range[0]),
                Math.floor(range[range.length - 1]) + 1
            )).tickFormat(function(d){
                // don't display axis labels for ticks out of ordinal range
                var nran = _.map(_this.range, _this.ymapper);
                if ((d >= nran[0]) && (d <= nran[nran.length-1])) {
                    return _this.attr.yformat(_this.yordrev(d));            
                } else {
                    return '';
                }
            });
        }

        // configure grid (if specified)
        if (_this.attr.grid) {
            _this.xaxis = _this.xaxis.tickSize(-_this.innerheight, 0, 0);
            _this.yaxis = _this.yaxis.tickSize(-_this.innerwidth, 0, 0);
        }

        // x axis
        if (_this.attr.xaxis !== "hidden" && _this.attr.xaxis !== false) {
            _this.plotregion
                .append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + _this.innerheight + ")")
                .call(_this.xaxis)
                .append("text")
                    .attr("class", "label")
                    .attr("x", function(x){
                        if (_this.attr.labelposition === "end"){
                            return _this.innerwidth;
                        }else if (_this.attr.labelposition === "middle"){
                            return _this.innerwidth / 2;
                        }else if (_this.attr.labelposition === "beginning"){
                            return 0;
                        }
                    })
                    .attr("y", function(){
                        if (_this.attr.xaxis === "inside"){
                            return -6 + _this.attr.labelpadding.x;
                        }else if(_this.attr.xaxis === "outside"){
                            return 35 + _this.attr.labelpadding.x;
                        }
                    })
                    .style("text-anchor", _this.attr.labelposition)
                    .text(_this.attr.xlabel);
        }

        // y axis
        if (_this.attr.yaxis !== "hidden" && _this.attr.yaxis !== false) {
            _this.plotregion
                .append("g")
                .attr("class", "y axis")
                .call(_this.yaxis)
                .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("x", function(x){
                        if (_this.attr.labelposition === "end"){
                            return 0;
                        }else if (_this.attr.labelposition === "middle"){
                            return -_this.innerheight / 2;
                        }else if (_this.attr.labelposition === "beginning"){
                            return -_this.innerheight;
                        }
                    }).attr("y", function(){
                        if (_this.attr.yaxis === "inside"){
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
        quorra.log('To be implemented by models ...');
    };

    this.annotate = function() {
        quorra.log('drawing plot annotation');

        _.map(_this.attr.annotation, function(d) {
            quorra.render(d);
        });
    };

    this.slider = function() {
        quorra.log('instantiating plot slider');

        if (_this.attr.slider == null) {
            return;
        }

        // scaling methods
        var updatePlot = function(outer, cache) {
            var obj = outer.attr.slider.__parent__;
            var aidx = obj.attr.annotation.length - 1;
            var x1 = obj.attr.annotation[aidx].x();
            var x2 = x1 + obj.attr.annotation[aidx].width();
            var y2 = obj.attr.annotation[aidx].y();
            var y1 = y2 - obj.attr.annotation[aidx].height();
            outer.redraw(
                [x1, x2],
                [y1, y2],
                cache
            );
        }
 
        var updateSlider = function(outer) {
            var obj = outer.attr.slider.__parent__;
            var xrange = outer.xscale.domain();
            var yrange = outer.yscale.domain();
            var aidx = obj.attr.annotation.length - 1;
            var annot = obj.attr.annotation[aidx];
            var width = xrange[xrange.length - 1] - xrange[0];
            var height = yrange[yrange.length - 1] - yrange[0];
            annot.x(xrange[0]);
            annot.y(yrange[yrange.length - 1]);
            annot.width(width);
            annot.height(height);
            outer.attr.slider.__parent__.redraw();
        }

        var domain = _this.attr.xrange === "auto" ? _this.domain : _this.attr.xrange;
        var range = _this.attr.yrange === "auto" ? _this.range : _this.attr.yrange;

        if (typeof domain[0] == 'string') {
            domain = _.map(domain, _this.xmapper);
        }
        var width = Math.abs(domain[domain.length - 1] - domain[0]);
        var height = Math.abs(range[range.length - 1] - range[0]);
        var annot = _this.attr.slider.annotation().concat([{
            type: 'rect',
            width: width,
            height: height,
            draggable: true,
            x: domain[0],
            y: range[1],
            style: {
                opacity: 0.25
            },
            hoveropacity: 0.20,
            events: {
                drag: function() {
                    quorra.log('dragging slider');
                    updatePlot(_this, false);
                },
                dragend: function() {
                    quorra.log('dragging slider');
                    updatePlot(_this, true);
                }

            }
        }]);
        _this.attr.slider.annotation(annot);

        _this.attr.events.panold = _this.attr.events.pan
        _this.attr.events.pan = function() {
            updateSlider(_this);
            _this.attr.events.panold();
        }

        _this.attr.events.zoomold = _this.attr.events.zoom
        _this.attr.events.zoom = function() {
            updateSlider(_this);
            _this.attr.events.zoomold();
        }

        quorra.render(_this.attr.slider);


    };

    this.hotdata = function() {
        quorra.log('optimizing plot data for visible window');

        var domain = _this.xscale.domain();
        var range = _this.yscale.domain();
        return _.filter(_this.data, function(d, i) {
            if (_this.attr.xwindow) {
                var xval = _this.xmapper(_this.attr.x(d, i));
                if (xval < (domain[0] - _this.xdelta) || xval > (domain[1] + _this.xdelta)) {
                    return false;
                }
            }
            if (_this.attr.ywindow) {
                var yval = _this.ymapper(_this.attr.y(d, i));
                if (yval < (range[0] - _this.ydelta) || yval > (range[1] + _this.ydelta)) {
                    return false;
                }
            }
            return true;
        });
    };

    this.drawlegend = function() {
        quorra.log('drawing plot legend');

        // set up pallette ordering
        var data = _this.pallette.domain();
        if (_this.attr.lorder.length === data.length) {
            data = _this.attr.lorder;
        }

        // compute width and height for scaling
        var width = (_this.attr.width === "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height === "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
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
        var selector;
        if (_this.attr.lshape === "square") {
            selector = leg.append("rect")
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
            selector = leg.append("circle")
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
                if (parseFloat(d3.select(this).style('fill-opacity')) === 0){
                    d3.select(this).style('fill-opacity', _.contains(_this.attr.toggled, d) ? _this.attr.opacity : 0);
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
        _this.defs.append('symbol')
            .attr('id', 'glyph-refresh')
            .attr('viewBox', '0 0 1024 1024')
            .html([
                '<path d="M134.32 166.32c93.608-102.216 228.154-166.32 377.68-166.32 282.77 0 512 229.23 512 512h-96c0-229.75-186.25-416-416-416-123.020 0-233.542 53.418-309.696 138.306l149.696 149.694h-352v-352l134.32 134.32z"></path>',
                '<path d="M96 512c0 229.75 186.25 416 416 416 123.020 0 233.542-53.418 309.694-138.306l-149.694-149.694h352v352l-134.32-134.32c-93.608 102.216-228.154 166.32-377.68 166.32-282.77 0-512-229.23-512-512h96z"></path>'
            ].join(''));

        // zoom glyph
        _this.defs.append('symbol')
            .attr('id', 'glyph-search')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M992.262 871.396l-242.552-206.294c-25.074-22.566-51.89-32.926-73.552-31.926 57.256-67.068 91.842-154.078 91.842-249.176 0-212.078-171.922-384-384-384-212.076 0-384 171.922-384 384s171.922 384 384 384c95.098 0 182.108-34.586 249.176-91.844-1 21.662 9.36 48.478 31.926 73.552l206.294 242.552c35.322 39.246 93.022 42.554 128.22 7.356s31.892-92.898-7.354-128.22zM384 640c-141.384 0-256-114.616-256-256s114.616-256 256-256 256 114.616 256 256-114.614 256-256 256z');

        // image glyph
        _this.defs.append('symbol')
            .attr('id', 'glyph-image')
            .attr('viewBox', '0 0 1024 1024')
            .html([
                '<path d="M959.884 128c0.040 0.034 0.082 0.076 0.116 0.116v767.77c-0.034 0.040-0.076 0.082-0.116 0.116h-895.77c-0.040-0.034-0.082-0.076-0.114-0.116v-767.772c0.034-0.040 0.076-0.082 0.114-0.114h895.77zM960 64h-896c-35.2 0-64 28.8-64 64v768c0 35.2 28.8 64 64 64h896c35.2 0 64-28.8 64-64v-768c0-35.2-28.8-64-64-64v0z"></path>',
                '<path d="M832 288c0 53.020-42.98 96-96 96s-96-42.98-96-96 42.98-96 96-96 96 42.98 96 96z"></path>',
                '<path d="M896 832h-768v-128l224-384 256 320h64l224-192z"></path>'
            ].join(''));

        // pan glyph
        _this.defs.append('symbol')
            .attr('id', 'glyph-pan')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M512 704l64-64v192h128l-192 192-192-192h128v-192zM512 321.984l-64 62.016v-192h-128l192-192 192 192h-128v192zM320 512l64 64h-192v128l-192-192 192-192v128h192zM702.016 512l-62.016-64h192v-128l192 192-192 192v-128h-192z');

        // annotate glyph
        _this.defs.append('symbol')
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
                .attr("transform", "translate(" + (_this.innerwidth + _this.attr.margin.left + 5) + "," + (_this.innerheight - _this.attr.margin.bottom - gdata.length * 22 + 52) + ")")
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
                                .style("visibility", "visible")
                                .style("left", (d3.event.clientX + 10) + "px")
                                .style("top", (d3.event.clientY - 10) + "px");
                    }
                }).on("mousemove", function(d) {
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 10) + "px")
                            .style("top", (d3.event.clientY - 10) + "px");
                    }
                }).on('mouseout', function(d) {
                    d3.select(this).style('opacity', 1);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                }).on('click', function(d) {
                    switch(d){

                        case 'zoom':
                            _this.enabled.zoom = !_this.enabled.zoom;
                            this.enabled.pan = !_this.enabled.pan;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.zoom) ? 2 : 1)
                                .style('stroke', (_this.enabled.zoom) ? 'black' : '#ddd');
                            break;

                        case 'pan':
                            _this.enabled.pan = !_this.enabled.pan;
                            _this.enabled.zoom = !_this.enabled.zoom;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.pan) ? 2 : 1)
                                .style('stroke', (_this.enabled.pan) ? 'black' : '#ddd');
                            break;

                        case 'refresh':
                            _this.xstack = [_this.xstack[0]];
                            _this.ystack = [_this.ystack[0]];
                            _this.redraw(_this.xstack[0].domain(), _this.ystack[0].domain(), false);
                            _this.attr.events.zoom();
                            break;

                        case 'annotate':
                            _this.enabled.annotate = !_this.enabled.annotate;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.annotate) ? 2 : 1)
                                .style('stroke', (_this.enabled.annotate) ? 'black' : '#ddd');
                            break;

                        case 'export':
                            _this.attr.events.preexport(_this.attr);
                            quorra.export(_this.attr.svg, _this.attr.plotname);
                            _this.attr.events.postexport(_this.attr);
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
            .attr('x', _this.attr.gshape === 'square' ? 4 : 4)
            .attr('y', _this.attr.gshape === 'square' ? 4 : 0)
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
        };
        _this.enabled.pan = false;
        _this.enabled.zoom = true;

        // init viewbox for selection
        var viewbox = _this.attr.svg
            .append('path')
            .attr('class', 'viewbox')
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")");

        // set up drag behavior
        var drag = d3.behavior.drag()
            // .origin(function(d){ return d; })
            .on("dragstart", function(d) {
                var movement = mouse(_this.attr.svg);
                _this.zoomdata.x = movement.x - _this.attr.margin.left;
                _this.zoomdata.y = movement.y - _this.attr.margin.top;
                if(_this.enabled.pan) {
                    _this.attr.events.panstart(_this.attr);
                }
            }).on("dragend", function(d) {
                viewbox.attr('d', '');
                var movement = mouse(_this.attr.svg);
                movement.x = movement.x - _this.attr.margin.left;
                movement.y = movement.y - _this.attr.margin.top;

                if (_this.enabled.zoom) {
                    var changed = false;
                    var l = _this.xstack.length;
                    var xval, yval;

                    // only zoom on x if the selection is significant
                    if (Math.abs(_this.zoomdata.x - movement.x) > 10 && (_this.zoomdata.x > 0)){
                        var xdomain = _this.xstack[l-1].domain();
                        var xrange = _this.xstack[l-1].range();
                        var xmap = d3.scale.linear().domain(xrange).range(xdomain);
                        xval = [xmap(_this.zoomdata.x), xmap(movement.x)].sort(function(a, b){ return a - b; });
                        
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
                        yval = [ymap(_this.zoomdata.y), ymap(movement.y)].sort(function(a, b){ return a - b; });
                        
                        // bound zooming into current viewframe
                        yval[0] = Math.max(yval[0], ydomain[0]);
                        yval[1] = Math.min(yval[1], ydomain[1]);
                        var yscale = d3.scale.linear().domain(yval).range(yrange);
                        changed = true;
                    }

                    // only trigger event if something changed
                    if (changed) {
                        _this.redraw(xval, yval, true);
                        _this.attr.events.zoom(_this.attr);
                    }
                } else if(_this.enabled.pan) {
                    _this.xstack.push(_this.xscale);
                    _this.ystack.push(_this.yscale);
                    _this.attr.events.panend(_this.attr);
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
                    var l = _this.xstack.length;
                    var xmap = d3.scale.linear().domain(_this.xscale.range()).range(_this.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.yscale.range()).range(_this.yscale.domain());
                    var xval = _.map(_this.xscale.range(), function(x){ return xmap(x - d3.event.dx); });
                    var yval = _.map(_this.yscale.range(), function(x){ return ymap(x - d3.event.dy); });
                    _this.xscale = d3.scale.linear().domain(xval).range(_this.xstack[l-1].range());
                    _this.yscale = d3.scale.linear().domain(yval).range(_this.ystack[l-1].range());
                    _this.redraw(xval, yval, false);
                    _this.attr.events.pan(_this.attr);
                }
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            });

        // enable double click for jumping up on the stack
        _this.attr.svg.on('dblclick', function() {
            var l = _this.xstack.length;
            if (l > 1){
                _this.xstack.pop();
                _this.ystack.pop();
                l = l - 1;
            }
            _this.redraw(_this.xstack[l-1].domain(), _this.ystack[l-1].domain(), false);
            _this.attr.events.zoom();
        }).call(drag)
        .on("dblclick.zoom", null)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);

        // set up events for toggling enabled flags
        quorra.events.Shift.down = function() {
            d3.selectAll('.glyphbox#pan')
                .selectAll('.glyph')
                .style('stroke', 'black')
                .style('stroke-width', 2);
            _.each(Object.keys(quorra.plots), function(key){
                quorra.plots[key].enabled.pan = true;
                quorra.plots[key].enabled.zoom = false;
            });
        };
        quorra.events.Shift.up = function() {
            d3.selectAll('.glyphbox#pan')
                .selectAll('.glyph')
                .style('stroke', '#555')
                .style('stroke-width', 1);
            _.each(Object.keys(quorra.plots), function(key) {
                quorra.plots[key].enabled.pan = false;
                quorra.plots[key].enabled.zoom = true;
            });
        };

    };

    this.enableannotation = function() {
        quorra.log('enabling annotation events');

        // enable annotation on click event
        _this.attr.svg.on('click', function(){
            if (_this.enabled.annotate) {
                var coordinates = mouse(_this.attr.svg);
                if (coordinates.x > (_this.innerwidth + _this.attr.margin.left) ||
                    coordinates.x < _this.attr.margin.left ||
                    coordinates.y > (_this.innerheight + _this.attr.margin.top) ||
                    coordinates.y < _this.attr.margin.top) {
                    return;
                }

                var xmap = d3.scale.linear().domain(_this.xscale.range()).range(_this.xscale.domain());
                var ymap = d3.scale.linear().domain(_this.yscale.range()).range(_this.yscale.domain());
                var d = {
                    x: xmap(coordinates.x - _this.attr.margin.left),
                    y: ymap(coordinates.y - _this.attr.margin.top),
                };
                for (var i in _this.attr.annotation){
                    var annot = _this.attr.annotation[i];
                    if (
                        (Math.abs(_this.xscale(annot.x()) - _this.xscale(d.x)) < 20) &&
                        (Math.abs(_this.yscale(annot.y()) - _this.yscale(d.y)) < 20)
                    ){
                        return;
                    }
                }

                var attr = {};
                _.map(Object.keys(_this.attr.annotatable), function(x) {
                    if (x === 'add' || typeof _this.attr.annotatable[x] !== 'function') {
                        attr[x] = _this.attr.annotatable[x];
                    } else {
                        attr[x] = _this.attr.annotatable[x](d);
                    }
                });
                var obj = quorra.annotation(attr)
                    .bind(_this.go).x(d.x).y(d.y);
                attr.x = d.x;
                attr.y = d.y;
                _this.attr.annotation.push(obj);
                _this.annotate();
                obj.events().add(attr);
            }
        });

        // set up key bindings for events
        quorra.events.ShiftA.down = function() {
            d3.selectAll('.glyphbox#annotate')
                .selectAll('.glyph')
                .style('stroke', 'black')
                .style('stroke-width', 2);
            _.each(Object.keys(quorra.plots), function(key){
                quorra.plots[key].enabled.annotate = true;
            });
        };
        quorra.events.ShiftA.up = function() {
            d3.selectAll('.glyphbox#annotate')
                .selectAll('.glyph')
                .style('stroke', '#ddd')
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
        zoomable: false,
        annotatable: false,
        exportable: false,
        selectable: false,
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
            preexport: function() {
                quorra.log('pre export event');
            },
            postexport: function() {
                quorra.log('post export event');
            },
            click: function(d, i){
                quorra.log('clicked plot element');
            }
        },

        // plot styling
        grid: false,
        xticks: "auto",
        yticks: "auto",
        xaxis: "outside",
        yaxis: "outside",
        xformat: function(d){ return d; },
        yformat: function(d){ return d; },
        xorient: "bottom",
        yorient: "left",
        xlabel: "",
        ylabel: "",
        xorder: [],
        yorder: [],
        xwidnow: true,
        ywindow: false,
        labelposition: "middle",
        labelpadding: {x: 0, y: 0},
        opacity: 1,
        hovercolor: false,
        
        // legend
        legend: true,
        lmargin: {"top": 0, "bottom": 0, "left": 0, "right": 0},
        lposition: "outside",
        lshape: "square",
        lorder: [],
        toggle: true,
        toggled: [],
        selected: [],
        tooltip: true,

        // glyphs
        glyphs: true,
        gshape: "circle",

        // placeholder
        annotation: [],
        slider: null
        
    }, attributes);

    // binding attributes to constructor function
    parameterize(_this.attr, _this.go);
    _this.go.__parent__ = _this;
    
    // managing specialized attributes
    _this.go.annotation = function(value) {
        if (!arguments.length) return _.map(_this.attr.annotation, function(d){ return d.__parent__.attr; });
        _this.attr.annotation = _.map(value, function(d) {
            if (typeof d !== 'function') {
                d = quorra.annotation(d).bind(_this.go);
            }
            return d;
        });
        return _this.go;
    };

    _this.go.annotate = function(value) {
        if (typeof _this.attr.annotation === 'undefined') {
            _this.attr.annotation = [value];
        } else {
            _this.attr.annotation.push(value);
        }
        return _this.go;
    };

    return this.go;
}

/*

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


// underscore additions
_.center = function(x, bounds){
    return _.min([_.max([x, bounds[0]]), bounds[1]]);
};

_.uniquesort = function(x, func) {
    if (typeof func === 'undefined') {
        func = function(x){ return x; };
    }
    return _.unique(_.map(x, func)).sort();
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
function Annotation(attributes) {
    /**
    Annotation()

    Object for managing plot rendering, and extending
    common functionality across all plot models.

    @author <bprinty@gmail.com>
    */

    quorra.log('instantiating annotation object');

    if (typeof attributes === 'undefined') attributes = {};
    if (typeof plot === 'undefined') plot = 'body';
    var _this = this;

    // constructor
    this.go = function() {
        quorra.log('running annotation generator function');

        // set up tooltip
        d3.selectAll("div.annotation-tooltip#" + _this.attr.id + "-tooltip").remove();
        if (_this.attr.tooltip == true) {
            _this.attr.tooltip = d3.select("body").append("div")
                .attr("class", "annotation-tooltip")
                .attr("id", + _this.attr.id + "-tooltip")
                .style("position", "fixed")
                .style("visibility", "hidden")
                .style("zindex", 999);
        }

        // create wrapper element for annotation groups
        _this.plot.plotarea.selectAll('.annotation#' + _this.attr.id).remove();
        var cl = (_this.attr.group === null) ? 'annotation ' + _this.attr.type : 'annotation ' + _this.attr.type + ' g_' + _this.attr.group;
        var asel = _this.plot.plotarea.append('g')
            .attr('id', _this.attr.id).attr('class', cl)
            .style("visibility", function() {
                return _.contains(_this.plot.attr.toggled, _this.plot.attr.group(_this.attr)) ? 'none' : 'visible';
            }).style('opacity', _this.attr.style.opacity)
            .on('mouseover', function() {
                d3.select(this).style('opacity', _this.attr.hoveropacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.html(_this.attr.hovertext)
                        .style("visibility", "visible")
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
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            }).on('click', function() {
                _this.attr.events.click(_this.attr);
            });
        
        // enable drag behavior for annotation (if available and specified)
        var xscale = _this.attr.xfixed ? _this.plot.xstack[0] : _this.plot.xscale;
        var yscale = _this.attr.yfixed ? _this.plot.ystack[0] : _this.plot.yscale;
        var x = xscale(_this.attr.x);
        var y = yscale(_this.attr.y);
        if (_this.attr.draggable && !_this.plot.attr.zoomable) {
            var drag = d3.behavior.drag()
                .on("dragstart", function() {
                    _this.attr.events.dragstart(_this.attr);
                }).on("dragend", function() {
                     _this.attr.events.dragend(_this.attr);
                }).on("drag", function() {
                    // get mouse coordinates
                    var movement = mouse(_this.plot.attr.svg);
                    var xoffset = Math.abs(xscale(_this.attr.width) - xscale(0));
                    var yoffset = Math.abs(yscale(_this.attr.height) - yscale(0));
                    xoffset = (_this.attr.type === 'rect') ? xoffset / 2 : 0;
                    yoffset = (_this.attr.type === 'rect') ? yoffset / 2: 0;
                    var xcoord = movement.x - _this.plot.attr.margin.left - xoffset;
                    var ycoord = movement.y - _this.plot.attr.margin.top - yoffset;

                    // translate annotation object
                    var xmotion = _.center(xcoord, [0, _this.plot.innerwidth - 2*xoffset]);
                    var ymotion = _.center(ycoord, [0, _this.plot.innerheight - 2*yoffset]);
                    d3.select(this).attr('transform', 'translate(' + (xmotion - x) + ',' + (ymotion - y) + ')');
                    
                    // update annotation attributes with new data
                    var xmap = d3.scale.linear().domain(xscale.range()).range(xscale.domain());
                    var ymap = d3.scale.linear().domain(yscale.range()).range(yscale.domain());
                    _this.attr.x = xmap(xmotion);
                    _this.attr.y = ymap(ymotion);
                    d3.select(this).select('text').text(_this.attr.text);

                    _this.attr.events.drag(_this.attr);
                });

            asel.call(drag);
        }

        // extend annotation object with specific shape
        var aobj;
        if (_this.attr.type === 'rect') {
            aobj = asel.selectAll('.rect').data([_this.attr]).enter()
                .append('rect')
                .attr('class', 'rect')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('width', Math.abs(xscale(_this.attr.width) - xscale(0)))
                .attr('height', Math.abs(yscale(_this.attr.height) - yscale(0)))
                .attr('x', x)
                .attr('y', y);
        } else if (_this.attr.type === 'circle') {
            aobj = asel.selectAll('.circle').data([_this.attr]).enter()
                .append('circle')
                .attr('class', 'circle')
                .attr('r', _this.attr.size / 2)
                .attr('cx', x)
                .attr('cy', y);
        } else if (_this.attr.type === 'triangle') {
            aobj = asel.selectAll('.triangle').data([_this.attr]).enter()
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
        }
        if (_this.attr.stack === 'bottom') {
            asel.stagedown();
        }

        // apply styling
        if (_this.attr.type !== 'text'){
            _.map(
                _.without(Object.keys(_this.attr.style), 'opacity'),
                function(i){ aobj.style(i, _this.attr.style[i]); }
            );
        }
        
        // show text
        if (_this.attr.text !== '') {
            asel.selectAll('.text').data([_this.attr]).enter()
                .append('text')
                .attr('class', 'text')
                .attr('x', function(d) {
                    var txt = (typeof d.text === 'function') ? d.text(d) : d.text;
                    var xnew = x + d.tmargin.x + txt.toString().length*2;
                    if (d.type === 'rect') {
                        return xnew + 2;
                    } else if (d.type === 'circle') {
                        return x + d.tmargin.x;
                    } else if (d.type === 'triangle') {
                        return x + d.tmargin.x + (d.size / 2) - txt.toString().length*3;
                    } else {
                        return x + d.tmargin.x;
                    }
                })
                .attr('y', function(d) {
                    var ynew = y - (d.size / 2) - 5;
                    if (d.type === 'rect') {
                        return y - d.tmargin.y - 5;
                    } else if (d.type === 'circle') {
                        return ynew;
                    } else if (d.type === 'triangle') {
                        return ynew;
                    } else {
                        return y - d.tmargin.y;
                    }
                })
                .style("font-size", _this.attr.tsize)
                .style("text-anchor", "middle")
                .text(_this.attr.text);
        }

        return _this;
    };

    // setting up attributes
    this.attr = extend({
        parent: null,
        id: quorra.uuid(),
        type: 'text',
        text: '',
        // text: function(d){ return d3.format('.2f')(d.x); },
        hovertext: '',
        hoveropacity: 0.75,
        xfixed: false,
        yfixed: false,
        size: 15,
        group: null,
        rotate: 0,
        tsize: 12,
        tposition: {x: 0, y: 20},
        tmargin: {x: 0, y: 0},
        trotation: 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        draggable: false,
        tooltip: true,
        stack: 'top',
        events: {
            add: function() {
                quorra.log('add event');
            },
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

        // get hot data
        _this.plotdata = _this.hotdata();

        // organizing data
        // no interpolation should happen here because users should be
        // responsible for ensuring that their data is complete
        var layers = [];
        var ugrps = _this.pallette.domain();
        if (typeof _this.plotdata[0].x === 'string') {
            _this.plotdata = _this.plotdata.sort(function(a, b) { return a.x > b.x; });
        }
        for (var grp in ugrps) {
            var flt = _.filter(_this.plotdata, function(d){ return d.group == ugrps[grp]; });
            flt = _.map(flt, function(d) {
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
            .attr("class","layer");

        var bar = layer.selectAll("rect")
            .remove().data(function(d){ return d; })
            .enter().append("rect")
            .attr("class", function(d, i) {
                return "bar " + "g_" + d.group;
            })
            .attr("x", function(d, i) {
                if (layers[0].length > 1){
                    var offset = (typeof _this.attr.x(d, i) === 'string') ? 0.5 : 0;
                    if (_this.attr.layout === "stacked"){
                        return _this.xscale(_this.xmapper(_this.attr.x(d, i)) - offset);
                    }else{
                        var diff = Math.abs(_this.xscale(_this.xmapper(_this.attr.x(layers[0][1]))) - _this.xscale(_this.xmapper(_this.attr.x(layers[0][0]))));
                        return _this.xscale(_this.xmapper(_this.attr.x(d, i)) - offset) + _this.pallette.range().indexOf(_this.pallette(d.group))*(diff / _this.pallette.domain().length);
                    }
                }else{
                    var range = _this.xscale.range();
                    return range[1] - range[0] - 2;
                }
            })
            // NOTE: this needs to be fixed so that y0 is 
            // parameterized before this takes place.
            .attr("y", function(d, i) {
                return (_this.attr.layout == "stacked") ? _this.yscale(_this.ymapper(d.y0 + d.y)) : _this.yscale(_this.ymapper(d.y));
            })
            .attr("height", function(d, i){ return (_this.attr.layout == "stacked") ? (_this.yscale(_this.ymapper(d.y0)) - _this.yscale(_this.ymapper(d.y0 + d.y))) : _.max([_this.innerheight - _this.yscale(_this.ymapper(d.y)), 0]); })
            .attr("width", function(d){
                if (layers[0].length > 1){
                    var diff = Math.abs(_this.xscale(_this.xmapper(_this.attr.x(layers[0][1]))) - _this.xscale(_this.xmapper(_this.attr.x(layers[0][0]))));
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
                        .style("visibility", "visible")
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            }).on("click", function(d, i) {
                _this.attr.events.click(d, i);
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
        quorra.log('drawing plot data');

        // configuring path renderer
        var path = d3.svg.line()
            .x(function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
            .y(function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
            .interpolate(_this.attr.interpolate);

        // get hot data
        _this.plotdata = _this.hotdata();

        // draw lines
        var ugrps = _this.pallette.domain();
        for (var grp in ugrps) {

            // lines
            var subdat = _.filter(_this.plotdata, function(d){ return d.group == ugrps[grp]; });
            if (subdat.length == 0) {
                continue;
            }
            _this.plotarea.append("path")
                .datum(subdat)
                .attr("class", function(d, i){
                    return "line " + "g_" + d[0].group;
                })
                .attr("d", function(d){
                    var p = path(d);
                    if (_this.attr.layout === "line") {
                        return p;
                    } else if (_this.attr.layout === "area") {
                        return [
                            p,
                            "L" + _this.xscale(_this.xmapper(_this.domain[_this.domain.length - 1])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                            "L" + _this.xscale(_this.xmapper(_this.domain[0])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                            "Z"
                        ].join('');
                    }
                })
                .style("fill", function(d) {
                    if (_this.attr.layout === "line") {
                        return "none";
                    } else if (_this.attr.layout === "area") {
                        return _this.pallette(d[0].group);
                    }
                })
                .style("stroke", function(d, i) {
                    if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                        if (_this.attr.hovercolor !== false) {
                            return _this.attr.hovercolor;
                        } else {
                            return 'firebrick';
                        }
                    } else {
                        return _this.pallette(_this.attr.group(d[0], i));
                    }
                })
                .style("stroke-width", _this.attr.size)
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d[0], i)) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i) {
                    if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                        return;
                    }
                    if (_this.attr.hovercolor !== false) {
                        _this.plotarea.selectAll('.dot.g_' + d[0].group).style("fill", _this.attr.hovercolor);
                        _this.plotarea.selectAll('.line.g_' + d[0].group).style("stroke", _this.attr.hovercolor);
                        if (_this.attr.slider !== null) {
                            _this.attr.slider.__parent__.plotarea.selectAll('.dot.g_' + d[0].group).style("fill", _this.attr.hovercolor);
                            _this.attr.slider.__parent__.plotarea.selectAll('.line.g_' + d[0].group).style("stroke", _this.attr.hovercolor);
                        }
                    } else {
                        _this.plotarea.selectAll('.g_' + d[0].group).style("opacity", 0.25);
                        if (_this.attr.slider !== null) {
                            _this.attr.slider.__parent__.selectAll('.g_' + d[0].group).style("opacity", 0.25);
                        }
                    }
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d[0].group)
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mousemove", function(d) {
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mouseout", function(d) {
                    if (_this.attr.hovercolor !== false) {
                        _this.plotarea.selectAll('.dot.g_' + d[0].group).style("fill", _this.pallette(d[0].group));
                        _this.plotarea.selectAll('.line.g_' + d[0].group).style("stroke", _this.pallette(d[0].group));
                        if (_this.attr.slider !== null) {
                            _this.attr.slider.__parent__.plotarea.selectAll('.dot.g_' + d[0].group).style("fill", _this.pallette(d[0].group));
                            _this.attr.slider.__parent__.plotarea.selectAll('.line.g_' + d[0].group).style("stroke", _this.pallette(d[0].group));
                        }
                    } else {
                        _this.plotarea.selectAll('.g_' + d[0].group).style("opacity", _this.attr.opacity);
                        if (_this.attr.slider !== null) {
                            _this.attr.slider.__parent__.selectAll('.g_' + d[0].group).style("opacity", _this.attr.opacity);
                        }
                    }
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                }).on("click", function(d, i) {
                    if (_this.attr.selectable !== false) {
                        _this.attr.selected = selectmerge(_this.attr.selected, d[0].group, _this.attr.selectable);
                        _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                    }
                    if (_this.attr.slider) {
                        _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                        _this.attr.slider.__parent__.redraw();
                    }
                    _this.attr.events.click(d, i);
                });
        }

        // draw points (if specified)
        if (_this.attr.points > 0) {

            _this.plotarea.selectAll(".dot")
                .remove().data(_this.plotdata)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", _this.attr.points)
                .attr("cx", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .attr("cy", function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
                .style("fill", function(d, i){
                    if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                        if (_this.attr.hovercolor !== false) {
                            return _this.attr.hovercolor;
                        } else {
                            return 'firebrick';
                        }
                    } else {
                        return _this.pallette(_this.attr.group(d, i));
                    }
                })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(_this.attr.label(d, i))
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mousemove", function(d){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                }).on("click", function(d, i){
                    if (_this.attr.selectable !== false) {
                        _this.attr.selected = selectmerge(_this.attr.selected, d.group, _this.attr.selectable);
                        _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                    }
                    if (_this.attr.slider) {
                        _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                        _this.attr.slider.__parent__.redraw();
                    }
                    _this.attr.events.click(d, i);
                });
        }
    }

    return this.go;
}

Line.prototype = Object.create(QuorraPlot.prototype);
Line.prototype.constructor = Line;
quorra.line = function(attributes) {
    return new Line(attributes);
};
function Multiline(attributes) {
    /**
    quorra.multiline()

    Line plot with sections of different relative scaling.

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-multiline",
        points: 0,
        size: 3,
        layout: "line",
        interpolate: "linear",
        margin: {"top": 30, "bottom": 20, "left": 0, "right": 70},
        yranges: {}
    }, attributes));
    this.type = "multiline";

    // overwrite axes method
    this.axes = function() {
        quorra.log('redrawing axes');

        // parameterize axes scaling
        var domain = _this.attr.xrange === "auto" ? _this.domain : _this.attr.xrange;
        var range = _this.attr.yrange === "auto" ? _this.range : _this.attr.yrange;

        // x scale formatting
        _this.xord = d3.scale.ordinal()
            .domain(_this.domain)
            .range(_.range(_this.domain.length));
        _this.xordrev = d3.scale.ordinal()
            .domain(_this.xord.range())
            .range(_this.xord.domain());
        _this.xmapper = function(d) { return _this.xord(d); };
        if (typeof domain[0] === 'string') {
            domain = _.map(domain, _this.xmapper);
            domain[0] = domain[0] - 0.5;
            domain[domain.length - 1] = domain[domain.length - 1] + 0.5;
        }
        _this.xscale = d3.scale.linear()
            .domain([domain[0], domain[domain.length-1]])
            .range([0, _this.innerwidth]);

        // x axis formatting
        _this.xaxis = d3.svg.axis().scale(_this.xscale).orient('top');
        if (_this.attr.xticks !== "auto") {
            _this.xaxis = _this.xaxis.ticks(_this.attr.xticks);
        }
        _this.xaxis = _this.xaxis.tickFormat(_this.attr.xformat);
        if (typeof domain[0] == 'string') {
            domain = _.map(domain, _this.xord);
        }
        _this.xaxis = _this.xaxis.tickValues(_.range(
            Math.ceil(domain[0]),
            Math.floor(domain[domain.length - 1]) + 1
        )).tickFormat(function(d){
            // don't display axis labels for ticks out of ordinal range
            var ndom = _.map(_this.domain, _this.xmapper);
            if ((d >= ndom[0]) && (d <= ndom[ndom.length-1])) {
                return _this.attr.xformat(_this.xordrev(d));            
            } else {
                return '';
            }
        }).tickSize(0).tickPadding(15);

        // x axis
        _this.plotregion
            .append("g")
            .attr("class", "x axis")
            .call(_this.xaxis);

        _this.plotregion.selectAll(".x.axis .domain").remove();

        // y scale formatting
        _this.yscale = d3.scale.linear()
            .domain([0, 1])
            .range([_this.innerheight, 0]);
        _this.yscales = [];
        _this.yaxes = [];
        var xdiff = _this.xscale(1) - _this.xscale(0);
        for (var i=0; i<_this.domain.length; i++) {
            var xdat = _.filter(_this.data, function(d){ return d.x === _this.domain[i]; });
            xdat = _.map(xdat, function(d){ return d.y; });
            
            // configure scaling for each x group
            if (_this.attr.yranges[_this.domain[i]] !== undefined) {
                var domain = _this.attr.yranges[_this.domain[i]];
            } else {
                var domain = [_.min(xdat), _.max(xdat)];
            }
            var scale = d3.scale.linear()
                .domain(domain)
                .range([0, 1]);
            _this.yscales.push(scale);
            var vscale = d3.scale.linear()
                .domain(domain)
                .range(_this.yscale.range()).nice();

            // set up each vertical axis
            var axis = d3.svg.axis().scale(vscale).orient('left')
            if (_this.attr.yticks !== "auto") {
                axis = axis.ticks(_this.attr.yticks);
            }
            axis = axis.tickFormat(_this.attr.yformat);
            _this.yaxes.push(axis);

            _this.plotregion
                .append("g")
                .attr("transform", "translate(" + _this.xscale(i) + ",0)")
                .attr("class", "y axis")
                .call(axis);
        }
    }

    // overwrite render method
    this.plot = function() {
        quorra.log('drawing plot data');

        // get current view data
        _this.plotdata =_this.data;

        // draw lines
        var ugrps = _this.pallette.domain();
        for (var grp in ugrps) {

            // configuring path
            var path = d3.svg.line()
                .x(function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .y(function(d, i) {
                    return _this.yscale(_this.yscales[_this.xord(d.x)](d.y));
                })
                .interpolate(_this.attr.interpolate);

            // lines
            var subdat = _.filter(_this.plotdata, function(d){ return d.group === ugrps[grp]; });
            if (subdat.length == 0) {
                continue;
            }
            subdat = subdat.sort(function(a, b) {
                return _this.domain.indexOf(a.x) - _this.domain.indexOf(b.x);
            });
            _this.plotarea.append("path")
                .datum(subdat)
                .attr("class", function(d, i){
                    return "line " + "g_" + d[0].group;
                })
                .attr("d", function(d){
                    var p = path(d);
                    if (_this.attr.layout === "line") {
                        return p;
                    } else if (_this.attr.layout === "area") {
                        return [
                            p,
                            "L" + _this.xscale(_this.xmapper(_this.domain[_this.domain.length - 1])) + "," + _this.yscale(0),
                            "L" + _this.xscale(_this.xmapper(_this.domain[0])) + "," + _this.yscale(1),
                            "Z"
                        ].join('');
                    }
                })
                .style("fill", function(d){
                    if (_this.attr.layout === "line") {
                        return "none";
                    } else if (_this.attr.layout === "area") {
                        return _this.pallette(d[0].group);
                    }
                })
                .style("stroke", function(d, i){
                    if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                        if (_this.attr.hovercolor !== false) {
                            return _this.attr.hovercolor;
                        } else {
                            return 'firebrick';
                        }
                    } else {
                        return _this.pallette(_this.attr.group(d[0], i));
                    }
                })
                .style("stroke-width", _this.attr.size)
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d[0], i)) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i) {
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d[0].group)
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                    if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                        return;
                    }
                    if (_this.attr.hovercolor !== false) {
                        _this.plotarea.selectAll('.dot.g_' + d[0].group).style("fill", _this.attr.hovercolor);
                        _this.plotarea.selectAll('.line.g_' + d[0].group).style("stroke", _this.attr.hovercolor);
                    } else {
                        _this.plotarea.selectAll('.g_' + d[0].group).style("opacity", 0.25);
                    }
                }).on("mousemove", function(d) {
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mouseout", function(d, i) {
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                    if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                        return;
                    }
                    if (_this.attr.hovercolor !== false) {
                        _this.plotarea.selectAll('.dot.g_' + d[0].group).style("fill", _this.pallette(d[0].group));
                        _this.plotarea.selectAll('.line.g_' + d[0].group).style("stroke", _this.pallette(d[0].group));
                    } else {
                        _this.plotarea.selectAll('.g_' + d[0].group).style("opacity", _this.attr.opacity);
                    }
                }).on("click", function(d, i){
                    if (_this.attr.selectable !== false) {
                        _this.attr.selected = selectmerge(_this.attr.selected, d[0].group, _this.attr.selectable);
                        _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                    }
                    if (_this.attr.slider) {
                        _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                        _this.attr.slider.__parent__.redraw();
                    }
                    _this.attr.events.click(d, i);
                });

        }

        // draw points (if specified)
        if (_this.attr.points > 0) {

            _this.plotarea.selectAll(".dot")
                .remove().data(_this.plotdata)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", _this.attr.points)
                .attr("cx", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .attr("cy", function(d, i) { return _this.yscale(_this.yscales[_this.xord(d.x)](d.y)); })
                .style("fill", function(d, i){
                    if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                        if (_this.attr.hovercolor !== false) {
                            return _this.attr.hovercolor;
                        } else {
                            return 'firebrick';
                        }
                    } else {
                        return _this.pallette(_this.attr.group(d, i));
                    }
                })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(_this.attr.label(d, i))
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                    if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                        return;
                    }
                    if (_this.attr.hovercolor !== false) {
                        _this.plotarea.selectAll('.dot.g_' + d.group).style("fill", _this.attr.hovercolor);
                        _this.plotarea.selectAll('.line.g_' + d.group).style("stroke", _this.attr.hovercolor);
                    } else {
                        _this.plotarea.selectAll('.g_' + d.group).style("opacity", 0.25);
                    }
                }).on("mousemove", function(d){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mouseout", function(d, i){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                    if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                        return;
                    }
                    if (_this.attr.hovercolor !== false) {
                        _this.plotarea.selectAll('.dot.g_' + d.group).style("fill", _this.pallette(_this.attr.group(d, i)));
                        _this.plotarea.selectAll('.line.g_' + d.group).style("stroke", _this.pallette(_this.attr.group(d, i)));
                    } else {
                        _this.plotarea.selectAll('.g_' + d.group).style("opacity", _this.attr.opacity);
                    }
                }).on("click", function(d, i){
                    if (_this.attr.selectable !== false) {
                        _this.attr.selected = selectmerge(_this.attr.selected, d.group, _this.attr.selectable);
                        _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                    }
                    if (_this.attr.slider) {
                        _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                        _this.attr.slider.__parent__.redraw();
                    }
                    _this.attr.events.click(d, i);
                });
        }

    }

    return this.go;
}

Multiline.prototype = Object.create(QuorraPlot.prototype);
Multiline.prototype.constructor = Multiline;
quorra.multiline = function(attributes) {
    return new Multiline(attributes);
};
function Pie(attributes) {
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
        var g = _this.plotregion
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
                        .style("visibility", "visible")
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            }).on("click", _this.attr.events.click);
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
        line: false,
        lineinterpolate: "linear",
        linelayout: "line",
        linesize: 3
    }, attributes));
    this.type = "scatter";

    // overwrite render method
    this.plot = function() {

        // re-rendering data with jitter
        var domain = _this.xscale.domain();
        _this.plotdata = _.map(
            _this.hotdata(), function(d, i) {
            var c = extend({}, d);
            c.x = (quorra.pseudorandom(i) - 0.5) * _this.attr.xjitter + _this.xscale(_this.xmapper(_this.attr.x(d, i)));
            c.y = (quorra.pseudorandom(i) - 0.5) * _this.attr.yjitter + _this.yscale(_this.ymapper(_this.attr.y(d, i)));
            return c;
        });

        // plotting line
        if (_this.attr.line !== false) {
            var path = d3.svg.line()
                .x(function(d, i) { return d.x; })
                .y(function(d, i) { return d.y; })
                .interpolate(_this.attr.lineinterpolate);
    
            var ugrps = _this.pallette.domain();
            for (var grp in ugrps) {
                var subdat = _.filter(_this.plotdata, function(d){ return d.group == ugrps[grp]; });
                if (subdat.length == 0) {
                    continue;
                }
                _this.plotarea.append("path")
                    .datum(subdat)
                    .attr("class", function(d, i){
                        return "line " + "g_" + d[0].group;
                    })
                    .attr("d", function(d){
                        var p = path(d);
                        if (_this.attr.linelayout === "line") {
                            return p;
                        } else if (_this.attr.linelayout === "area") {
                            return [
                                p,
                                "L" + _this.xscale(_this.xmapper(_this.domain[_this.domain.length - 1])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                                "L" + _this.xscale(_this.xmapper(_this.domain[0])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                                "Z"
                            ].join('');
                        }
                    })
                    .style("fill", function(d){
                        if (_this.attr.linelayout === "line") {
                            return "none";
                        } else if (_this.attr.linelayout === "area") {
                            return _this.pallette(d[0].group);
                        }
                    })
                    .style("stroke", function(d, i) {
                        if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                            if (_this.attr.hovercolor !== false) {
                                return _this.attr.hovercolor;
                            } else {
                                return 'firebrick';
                            }
                        } else {
                            return _this.pallette(_this.attr.group(d[0], i));
                        }
                    })
                    .style("stroke-width", _this.attr.linesize)
                    .style("opacity", _this.attr.opacity)
                    .style("visibility", function(d, i) {
                        if (_.contains(_this.attr.selected, _this.attr.group(d[0], i))) {
                            return 'visible';
                        }
                        if (_this.attr.line === 'hover') {
                            return 'hidden';
                        } else if (_this.attr.line) {
                            return _.contains(_this.attr.toggled, _this.attr.group(d[0], i)) ? 'hidden' : 'visible';
                        }
                    }).on("click", function(d, i){
                        if (_this.attr.selectable !== false) {
                            _this.attr.selected = selectmerge(_this.attr.selected, d[0].group, _this.attr.selectable);
                            _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                        }
                        if (_this.attr.slider) {
                            _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                            _this.attr.slider.__parent__.redraw();
                        }
                        _this.attr.events.click(d, i);
                    });
            }
        }

        // plotting points
        _this.plotarea.selectAll(".dot")
            .remove().data(_this.plotdata)
            .enter().append("circle")
            .attr("class", function(d, i){
                return "dot " + "g_" + d.group;
            })
            .attr("r", _this.attr.size)
            .attr("cx", function(d, i) { return d.x; })
            .attr("cy", function(d, i) { return d.y; })
            .style("fill", function(d, i){
                if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                    if (_this.attr.hovercolor !== false) {
                        return _this.attr.hovercolor;
                    } else {
                        return 'firebrick';
                    }
                } else {
                    return _this.pallette(_this.attr.group(d, i));
                }
            })
            .style("opacity", _this.attr.opacity)
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
            })
            .attr("clip-path", "url(#clip)")
            .on("mouseover", function(d, i){
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(_this.attr.label(d, i))
                        .style("visibility", "visible")
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
                if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                    return;
                }
                if (_this.attr.line === 'hover') {
                    _this.plotarea.selectAll('.line.g_' + d.group).style('visibility', 'visible');
                }
                if (_this.attr.hovercolor !== false) {
                    _this.plotarea.selectAll('.dot.g_' + d.group).style("fill", _this.attr.hovercolor);
                    _this.plotarea.selectAll('.line.g_' + d.group).style("stroke", _this.attr.hovercolor);
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.dot.g_' + d.group).style("fill", _this.attr.hovercolor);
                        _this.attr.slider.__parent__.plotarea.selectAll('.line.g_' + d.group).style("stroke", _this.attr.hovercolor);
                    }
                } else {
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.g_' + d.group).style("opacity", 0.25);
                    }
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mouseout", function(d, i){
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("visibility", "hidden");
                }
                if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                    return;
                }
                if (_this.attr.line === 'hover') {
                    _this.plotarea.selectAll('.line.g_' + d.group).style('visibility', 'hidden');
                }
                if (_this.attr.hovercolor !== false) {
                    _this.plotarea.selectAll('.dot.g_' + d.group).style("fill", _this.pallette(_this.attr.group(d, i)));
                    _this.plotarea.selectAll('.line.g_' + d.group).style("stroke", _this.pallette(_this.attr.group(d, i)));
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.dot.g_' + d.group).style("fill", _this.pallette(_this.attr.group(d, i)));
                        _this.attr.slider.__parent__.plotarea.selectAll('.line.g_' + d.group).style("stroke", _this.pallette(_this.attr.group(d, i)));
                    }
                } else {
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.g_' + d.group).style("opacity", _this.attr.opacity);
                    }
                }
            }).on("click", function(d, i){
                if (_this.attr.selectable !== false) {
                    _this.attr.selected = selectmerge(_this.attr.selected, d.group, _this.attr.selectable);
                    _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                    if (_this.attr.slider) {
                        _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                        _this.attr.slider.__parent__.redraw();
                    }
                }
                _this.attr.events.click(d, i);
            });

        // generating density ticks (if specified)
        if (_this.attr.xdensity){
            _this.plotarea.selectAll(".xtick")
                .remove().data(_this.plotdata)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "xtick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .attr("x2", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
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
                .remove().data(_this.plotdata)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "ytick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return 0; })
                .attr("x2", function(d, i) { return 10; })
                .attr("y1", function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
                .attr("y2", function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        // generating regression line with smoothing curve (if specified)
        if (_this.attr.lm != false){
            quorra.error("Not yet implemented!");
        }
    }

    return this.go;
}

Scatter.prototype = Object.create(QuorraPlot.prototype);
Scatter.prototype.constructor = Scatter;
quorra.scatter = function(attributes) {
    return new Scatter(attributes);
};


quorra.version = "0.0.3";

window.quorra = quorra;

})();