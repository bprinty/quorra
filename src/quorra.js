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
        if (_this.type === 'histogram') {
            domain[1] = domain[1] + (domain[1] - domain[0])/(_this.attr.bins-1);
        }

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
                return _this.attr.xformat(_this.xordrev(d));
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
                return _this.attr.yformat(_this.yordrev(d));
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
        var domain = _this.xscale.domain();
        var range = _this.yscale.domain();
        return _.filter(_this.data, function(d, i) {
            var xval = _this.xmapper(_this.attr.x(d, i));
            var yval = _this.ymapper(_this.attr.y(d, i));
            if (xval >= (domain[0] - _this.xdelta) && xval <= (domain[1] + _this.xdelta) &&
                yval >= (range[0] - _this.ydelta) && yval <= (range[1] + _this.ydelta)) {
                return true;
            }
            return false;
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
                    var xmap = d3.scale.linear().domain(_this.xscale.range()).range(_this.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.yscale.range()).range(_this.yscale.domain());
                    var xval = _.map(_this.xscale.range(), function(x){ return xmap(x - d3.event.dx); });
                    var yval = _.map(_this.yscale.range(), function(x){ return ymap(x - d3.event.dy); });
                    _this.redraw(xval, yval, false);
                    var l = _this.xstack.length;
                    _this.xscale = d3.scale.linear().domain(xval).range(_this.xstack[l-1].range());
                    _this.yscale = d3.scale.linear().domain(yval).range(_this.ystack[l-1].range());
                    _this.attr.events.pan(_this.attr);
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
            _this.attr.events.zoom();
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
                .style('stroke', '#ddd')
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

