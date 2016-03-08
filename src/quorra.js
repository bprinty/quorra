/**

quorra base

@author <bprinty@gmail.com>

*/

function quorra() {
    /**
    quorra()

    Base class for all visualization components.

    @author <bprinty@gmail.com>
    */
}

quorra.plots = {};


function QuorraPlot(attributes) {
    var _this = this;

    // constructor
    this.go = function(selection) {
        
        // configure selection
        _this.attr.container = (_this.attr.container === null) ? selection : _this.attr.selection;

        if (typeof _this.attr.container === 'string') _this.attr.container = d3.select(_this.attr.container);

        if (_this.attr.container.select("svg")[0][0] == null){
            _this.attr.svg = (_this.attr.svg === null) ? _this.attr.container.append("svg") : _this.attr.svg;
        } else {
            _this.attr.svg = _this.attr.container.select("svg");
        }

        // calculate basic dimensions
        var width = (_this.attr.width == "auto") ? parseInt(_this.attr.container.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.attr.container.style("height")) : _this.attr.height;
        _this.innerwidth = width - _this.attr.margin.left - _this.attr.margin.right;
        _this.innerheight = height - _this.attr.margin.top - _this.attr.margin.bottom;

        // create svg and relevant plot areas
        _this.attr.svg = _this.attr.svg.attr("id", _this.attr.id)
            .attr("class", _this.attr.class)
            .attr("width", width)
            .attr("height", height)
            .on("click", _this.attr.plotclick);

        // set up clip path for windowing display
        _this.attr.svg.append("clipPath")
            .attr("id", "clip").append("rect")
            .attr("width", _this.innerwidth)
            .attr("height", _this.innerheight);

        // segment sections of canvas (makes axis rendering easier)
        _this.plotarea = _this.attr.svg.append('g')
            .attr("class", "plotarea")
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")");            

        // configure/transform data -- figure out how to run
        // this whenever the selection-bound data is changed, and
        // not every time
        _this.data = _this.attr.transform(_this.attr.container.data()[0]);
        if (typeof _this.data[0].x === 'string') {
            _this.domain = _.uniquesort(_this.data, _this.attr.x);
        } else {
            // get max based on histogram binning
            _this.domain = [
                _.min(_.map(_this.data, _this.attr.x)),
                _.max(_.map(_this.data, _this.attr.x))
            ];
        }
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
        
        // draw plot
        _this.redraw();

        // create legend (if specified)
        if (_this.attr.legend) {
            _this.drawlegend();
        }

        // draw glyph elements
        if (_this.attr.glyphs) {
            _this.drawglyphs();
        }

        // enable interaction (if specified)
        if (_this.attr.zoomable) {
            _this.enablezoom();
        }
        if (_this.attr.annotatable) {
            _this.enableannotation();
        }
    };

    this.redraw = function(xrange, yrange, cache) {
        if (typeof xrange !== 'undefined') {
            _this.attr.xrange = xrange;
            // recompute scaling
        }
        if (typeof yrange !== 'undefined') {
            _this.attr.yrange = yrange;
            // recompute scaling
        }
        if (typeof cache === 'undefined') {
            cache = true;
        }
        _this.plotarea.selectAll("*").remove();
        _this.axes();
        _this.plot();
        if (cache) {
            _this.xstack.push(_this.xscale);
            _this.ystack.push(_this.yscale);
        }
        if (_this.attr.annotation) {
            _this.annotate();
        }
    };
    
    // rendering methods
    this.axes = function() {

        // parameterize axes scaling
        var domain = _this.attr.xrange === "auto" ? _this.domain : _this.attr.xrange;
        var range = _this.attr.yrange === "auto" ? _this.range : _this.attr.yrange;
        if (_this.type == 'histogram') {
            domain[1] = domain[1] + (domain[1] - domain[0])/(_this.attr.bins-1);
        }

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
        if (_this.attr.xaxis !== "hidden") {
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
        if (_this.attr.yaxis !== "hidden") {
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
        _.map(_this.attr.annotation, function(d) {

            // configure attributes
            var data = _.extend({
                parent: _this.attr.id,
                exists: false,
                id: quorra.uuid(),
                type: 'text',
                text: '',
                hovertext: '',
                xfixed: false,
                yfixed: false,
                size: 15,
                group: null,
                rotate: 0,
                'text-size': 13,
                'text-position': {x: 0, y: 20},
                'text-margin': {x: 0, y: 0},
                'text-rotation': 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                style: {
                    opacity: 1,
                },
                meta: {},
                click: function(){},
            }, d);
            data['text-position'] = _.extend({x: 0, y: 20}, data['text-position']);
            data['text-margin'] = _.extend({x: 0, y: 0}, data['text-margin']);
            data['style'] = _.extend({opacity: 1}, data['style']);

            if (data.type == 'square') {
                var annot = squareAnnotation(_this, data);
                data['text-margin'].y = data['text-margin'].y - (data.size / 2) - 5;
            } else if (data.type == 'rectangle') {
                var annot = rectangleAnnotation(_this, data);
                data['text-margin'].x = data['text-margin'].x + data.text.length*2 + 2;
                data['text-margin'].y = data['text-margin'].y - 5;
            } else if (data.type == 'circle') {
                var annot = circleAnnotation(_this, data);
                data['text-margin'].y = data['text-margin'].y - (data.size / 2) - 5;
            } else if (data.type == 'triangle') {
                var annot = triangleAnnotation(_this, data);
                data['text-margin'].x = data['text-margin'].x + (data.size / 2) - data.text.length*2;
                data['text-margin'].y = data['text-margin'].y - (data.size / 2) - 5;
            }
            annot.attr("clip-path", "url(#clip)")
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
            }).on('mouseover', function(d){
                d3.select(this).style('opacity', 0.75*d.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.html(d.hovertext)
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on('mousemove', function(){
                if (_this.attr.tooltip) {
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on('mouseout', function(d){
                d3.select(this).style('opacity', d.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.style("opacity", 0);
                }
            }).on('click', function(d){
                d.click(d);
            });
            if (data.text !== '') {
                var annot = textAnnotation(_this, data);
                annot.attr("clip-path", "url(#clip)")
                .style("visibility", function(d){
                    return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
                }).on('mouseover', function(){
                    d3.select(this).style('opacity', 0.75);
                }).on('mouseout', function(){
                    d3.select(this).style('opacity', 1);
                }).on('click', function(d){
                    d.click(d);
                });
            }

        });
    };

    this.drawlegend = function() {
        var data = _this.pallette.domain();
        if (_this.attr.lorder.length == data.length) {
            data = _this.attr.lorder;
        }

        var leg = _this.attr.svg
            .append("g")
            .attr("transform", "translate(" + (_this.attr.width - _this.attr.margin.right) + "," + _this.attr.margin.top + ")")
            .selectAll(".legend")
            .data(data)
            .enter().append("g")
            .attr("class", "legend")
            .attr("id", _this.attr.id + "-legend")
            .attr("transform", function(d, i) { return "translate(0," + (_this.attr.lmargin.top + i * 20) + ")"; });

        if (_this.attr.lshape === "square") {
            var selector = leg.append("rect")
                .attr("class", "selector")
                .attr("x", 20 + _this.attr.lmargin.left)
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

        if (_this.attr.toggle){
            selector.on("mouseover", function(d, i){
                d3.select(this).style('opacity', 0.75);
            }).on("mouseout", function(d, i){
                d3.select(this).style('opacity', 1);
            }).on("click", function(d, i){
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

        leg.append("text")
            .attr("x", function(){
                if (_this.attr.lposition === "inside"){
                    return 18 + _this.attr.lmargin.left;
                }else if (_this.attr.lposition === "outside"){
                    return 40 + _this.attr.lmargin.left;
                }        
            })
            .attr("y", 9)
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
 
        // adding glyphs
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

        var gly = _this.attr.svg.append("g")
                .attr("transform", "translate(" + (_this.innerwidth + _this.attr.margin.left + 7) + "," + (_this.innerheight - _this.attr.margin.bottom - gdata.length * 22 + 52) + ")")
                .selectAll(".glyphbox")
                .data(gdata)
                .enter().append("g")
                .attr("class", "glyphbox")
                .attr("id", function(d){ return d; })
                .attr("transform", function(d, i) { return "translate(0," + (i * 25) + ")"; })
                .on('mouseover', function(d){
                    d3.select(this).style('opacity', 0.5);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d)
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 10) + "px")
                                .style("top", (d3.event.pageY - 10) + "px");
                    }
                }).on("mousemove", function(d){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.pageX + 10) + "px")
                            .style("top", (d3.event.pageY - 10) + "px");
                    }
                }).on('mouseout', function(d){
                    d3.select(this).style('opacity', 1);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("opacity", 0);
                    }
                }).on('click', function(d){
                    switch(d){

                        case 'zoom':
                            _this.enabled.zoom = !_this.enabled.zoom;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke-width', (_this.enabled.zoom) ? 3 : 1);
                            break;

                        case 'pan':
                            _this.enabled.pan = !_this.enabled.pan;
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
                            // get svg and change attributes -- for some reason, it won't
                            // render well if xmlns is not set
                            var svg = _this.attr.svg.attr({
                                'xmlns': 'http://www.w3.org/2000/svg',
                                version: '1.1'
                            }).node();
                            var cln = svg.cloneNode(true);
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
                                a.download = _this.attr.plotname + ".png";
                                a.href = data;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                canvas.remove();
                                document.body.removeChild(cln);
                            };
                            break;
                    }
                });
        
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

        // set glyph highlight on shift event (for zoom)
        if (_this.attr.zoomable){
            quorra.events.Shift.down = function(){
                d3.selectAll('.glyphbox#pan')
                    .selectAll('.glyph')
                    .style('stroke-width', 3);
                _.each(Object.keys(quorra.plots), function(key){
                    quorra.plots[key].enabled.pan = true;
                });
            }
            quorra.events.Shift.up = function(){
                d3.selectAll('.glyphbox#pan')
                    .selectAll('.glyph')
                    .style('stroke-width', 1);
                _.each(Object.keys(quorra.plots), function(key) {
                    quorra.plots[key].enabled.pan = false;
                });
            }
        }
        if (_this.attr.annotatable){
            quorra.events.ShiftA.down = function(){
                d3.selectAll('.glyphbox#annotate')
                    .selectAll('.glyph')
                    .style('stroke-width', 3);
                _.each(Object.keys(quorra.plots), function(key){
                    quorra.plots[key].enabled.annotate = true;
                });
            }
            quorra.events.ShiftA.up = function(){
                d3.selectAll('.glyphbox#annotate')
                    .selectAll('.glyph')
                    .style('stroke-width', 1);
                _.each(Object.keys(quorra.plots), function(key){
                    quorra.plots[key].enabled.annotate = false;
                });
            }
        }

    };

    this.enablezoom = function() {

        // return processed mouse coordinates
        function mouse(){
            var coordinates = d3.mouse(_this.attr.svg.node());
            var res = {};
            res.x = coordinates[0] - _this.attr.margin.left;
            res.y = coordinates[1] - _this.attr.margin.top;
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
            .origin(function(d){ return d; })
            .on("dragstart", function() {
                var movement = mouse();
                _this.zoomdata.x = movement.x;
                _this.zoomdata.y = movement.y;
            }).on("dragend", function() {
                viewbox.attr('d', '');
                var movement = mouse();
                
                if (!_this.enabled.pan || !withinBounds(movement)) {
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
                    }
                }
            }).on("drag", function() {
                var movement = mouse();
                if (!_this.enabled.pan) {
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
                } else if(withinBounds(movement)) {
                    viewbox.attr('d', '');
                    var xmap = d3.scale.linear().domain(_this.xscale.range()).range(_this.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.yscale.range()).range(_this.yscale.domain());
                    var xval = _.map(_this.xscale.range(), function(x){ return xmap(x - d3.event.dx); });
                    var yval = _.map(_this.yscale.range(), function(x){ return ymap(x - d3.event.dy); });
                    _this.redraw(xval, yval, false);
                    var l = _this.xstack.length;
                    _this.xscale = d3.scale.linear().domain(xval).range(_this.xstack[l-1].range());
                    _this.yscale = d3.scale.linear().domain(yval).range(_this.ystack[l-1].range());
                }
            });

        // // set up zoom behavior
        // THIS WAS TEMPORARILY REMOVED BECAUSE IT SCROLLJACKS, BUT SOME EFFORT SHOULD
        // BE PUT INTO MAKING THIS AN OPTION AND MAKING IT COMPATIBLE WITH THE CURRENT CODE
        // var zoom = d3.behavior.zoom()
        //     .on("zoom", function(){
        //         var movement = mouse();
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
    };

    this.enableannotation = function() {

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
            click: function(d){},
            add: function(d){}
        }, _this.attr.annotatable);

        // enable annotation on click event
        _this.attr.svg.on('click', function(){
            if (_this.enabled.annotate) {
                var coordinates = d3.mouse(_this.attr.svg.node());
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
                d.click = triggers.click;
                _.each(['id', 'type', 'text', 'style', 'meta', 'size', 'group', 'text-size', 'text-position'], function(x){
                    d[x] = (typeof triggers[x] === "function") ? triggers[x](d) : triggers[x];
                });
                if (_this.attr.annotation){
                    _this.attr.annotation.push(d);
                }else{
                    _this.attr.annotation = [d];
                }
                _this.annotate();
                triggers.add(d);
            }
        });
    };


    // tuneable plot attributes
    this.attr = {
        // sizing
        plotname: "quorra-plot",
        type: "quorra-plot",
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 40, "left": 40, "right": 40},
        container: null,
        svg: null,
        
        // data rendering
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
        lposition: "inside",
        lshape: "square",
        lorder: [],
        toggle: true,
        toggled: [],

        // glyphs
        glyphs: true,
        gshape: "circle",
        
        // additional display
        annotation: []
    };

    // plot tooltip -- maybe include this as an object attribure
    this.attr.tooltip = d3.select("body").append("div")
        .attr("id", this.attr.id)
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    this.attr = _.extend(this.attr, attributes);

    this.attr.id = (typeof this.attr.id !== 'undefined') ?  this.attr.id : quorra.uuid();

    // binding attributes to constructor function
    Object.keys(_this.attr).forEach(function(i) {
        _this.go[i] = function(value) {
            if (!arguments.length) return _this.attr[i];

            // binding a tooltip requires removal of the previous
            if (i === 'tooltip') {
                _this.attr[i].remove();
            }
            // maintain non-overridden object arguments
            if (typeof value === 'object' && i != 'tooltip') {
                if (typeof _this.attr[i] === 'object') {
                    if (Array.isArray(_this.attr[i]) && ! Array.isArray(value)) {
                        value = [value];
                    }
                    _this.attr[i] = _.extend(_this.attr[i], value);
                } else {
                    _this.attr[i] = value;
                }
            } else {
                _this.attr[i] = value;
            }
            return _this.go;
        };
    });

    // add instantiated plot to plot list
    quorra.plots[this.attr.id] = this;

    return this.go;
}

