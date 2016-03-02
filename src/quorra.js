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
        this.object = _this;
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

        // segment sections of canvas (makes axis rendering easier)
        _this.plotarea = _this.attr.svg.append('g')
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")");
            
        _this.plotarea.append("clipPath")
            .attr("id", "clip").append("rect")
            .attr("width", _this.innerwidth)
            .attr("height", _this.innerheight);

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
    };

    this.redraw = function(xrange, yrange) {
        if (typeof xrange !== 'undefined') {
            _this.attr.xrange = xrange;
            // recompute scaling
        }
        if (typeof yrange !== 'undefined') {
            _this.attr.yrange = yrange;
            // recompute scaling
        }
        _this.axes();
        _this.plot();
        _this.xstack.push(_this.xscale);
        _this.ystack.push(_this.yscale);
        _this.xdrag = _this.xscale;
        _this.ydrag = _this.yscale;
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
                .range([0, _this.innerwidth]).nice();
        }
        if (typeof _this.data[0].y === 'string') {
            _this.yscale = d3.scale.ordinal()
                .domain(range)
                .range([0, _this.innerheight])
                .rangePoints([_this.innerheight, 0], 1);
        } else {
            _this.yscale = d3.scale.linear()
                .domain(range)
                .range([ _this.innerheight, 0]).nice();
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
                    if (_this.attr.xposition == "inside"){
                        return -6 + _this.attr.labelpadding.x;
                    }else if(_this.attr.xposition === "outside"){
                        return 35 + _this.attr.labelpadding.x;
                    }
                })
                .style("text-anchor", _this.attr.labelposition)
                .text(_this.attr.xlabel);

        // y axis
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
                    if (_this.attr.yposition == "inside"){
                        return 6 + _this.attr.labelpadding.y;
                    }else if(_this.attr.yposition === "outside"){
                        return -40 + _this.attr.labelpadding.y;
                    }
                })
                .attr("dy", ".71em")
                .style("text-anchor", _this.attr.labelposition)
                .text(_this.attr.ylabel);
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
                data['text-margin'].x = data['text-margin'].x + (_this.xscale(data.width) / 2);
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
                }else{
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

    };

    this.enablezoom = function() {

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
        xformat: "auto",
        yformat: "auto",
        xorient: "bottom",
        yorient: "left",
        xlabel: "",
        ylabel: "",
        yposition: "outside",
        xposition: "outside",
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




QuorraPlot.prototype.enableLegend = function(id){
    /**
    QuorraPlot.prototype.enableLegend()

    Construct legend component of plot, using plot attributes.
    */
    
    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    var ival = setInterval(function(){
        
        

        clearInterval(ival);
    }, 100);

    return;
}


QuorraPlot.prototype.enableZoom = function(id){
    /**
    QuorraPlot.prototype.enableZoom()

    Initialze canvas for quorra plot and return svg selection.
    */

    // return processed mouse coordinates
    function mouse(){
        var coordinates = d3.mouse(quorra.controller[id].svg.node());
        var res = {};
        res.x = coordinates[0] - quorra.controller[id].left;
        res.y = coordinates[1] - quorra.controller[id].top;
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
            (motion.x > quorra.controller[id].width) ||
            (motion.x < 0) ||
            (motion.y > quorra.controller[id].height) ||
            (motion.y < 0)
        ){
            return false;
        }
        return true;
    }

    // init viewbox for selection
    var viewbox = quorra.controller[id].svg
        .append('path')
        .attr('class', 'viewbox')
        .attr("transform", "translate(" + quorra.controller[id].left + "," + quorra.controller[id].top + ")")

    // set up drag behavior
    var drag = d3.behavior.drag()
        .origin(function(d){ return d; })
        .on("dragstart", function(){
            var movement = mouse();
            quorra.controller[id].x = movement.x;
            quorra.controller[id].y = movement.y;
        })
        .on("dragend", function(){
            viewbox.attr('d', '');
            var movement = mouse();
            if ((!quorra.controller[id].pan && !quorra.keys.Shift) || !withinBounds(movement)){
                var changed = false;
                var l = quorra.controller[id].xstack.length;
                var xscale, yscale, xval, yval;

                // only zoom on x if the selection is significant
                if (Math.abs(quorra.controller[id].x - movement.x) > 10 && (quorra.controller[id].x > 0)){
                    var xmap = d3.scale.linear()
                        .domain(quorra.controller[id].xdrag.range())
                        .range(quorra.controller[id].xdrag.domain());
                    xval = [xmap(quorra.controller[id].x), xmap(movement.x)].sort(function(a, b){ return a - b; });
                    
                    // bound zooming into current viewframe
                    xval[0] = Math.max(xval[0], quorra.controller[id].xdrag.domain()[0]);
                    xval[1] = Math.min(xval[1], quorra.controller[id].xdrag.domain()[1]);
                    xscale = d3.scale.linear().domain(xval).range(quorra.controller[id].xdrag.range());
                    changed = true;
                }else{
                    xval = quorra.controller[id].xstack[l-1].domain();
                    xscale = quorra.controller[id].xstack[l-1];
                }

                // only zoom on y if the selection is significant
                if (Math.abs(quorra.controller[id].y - movement.y) > 10 && (quorra.controller[id].y < quorra.controller[id].height)){
                    var ymap = d3.scale.linear()
                        .domain(quorra.controller[id].ydrag.range())
                        .range(quorra.controller[id].ydrag.domain());
                    yval = [ymap(quorra.controller[id].y), ymap(movement.y)].sort(function(a, b){ return a - b; });
                    
                    // bound zooming into current viewframe
                    yval[0] = Math.max(yval[0], quorra.controller[id].ydrag.domain()[0]);
                    yval[1] = Math.min(yval[1], quorra.controller[id].ydrag.domain()[1]);
                    yscale = d3.scale.linear().domain(yval).range(quorra.controller[id].ydrag.range());
                    changed = true;
                }else{
                    yval = quorra.controller[id].ystack[l-1].domain();
                    yscale = quorra.controller[id].ystack[l-1];
                }

                // only trigger event if something changed
                if (changed){
                    quorra.controller[id].render(xval, yval);
                    quorra.controller[id].xstack.push(xscale);
                    quorra.controller[id].ystack.push(yscale);
                    quorra.controller[id].xdrag = xscale;
                    quorra.controller[id].ydrag = yscale;
                }
            }else{
                quorra.controller[id].xstack.push(quorra.controller[id].xdrag);
                quorra.controller[id].ystack.push(quorra.controller[id].ydrag);
            }
        })
        .on("drag", function(){
            var movement = mouse();
            if ((!quorra.controller[id].pan && !quorra.keys.Shift) || !withinBounds(movement)){
                var xspan = movement.x;
                var yspan = movement.y;
                if (quorra.controller[id].y > quorra.controller[id].height){
                    yspan = 0;
                }
                if (quorra.controller[id].x < 0){
                    xspan = quorra.controller[id].width;
                }
                viewbox.attr('d', [
                    'M' + quorra.controller[id].x + ',' + quorra.controller[id].y,
                    'L' + quorra.controller[id].x + ',' + yspan,
                    'L' + xspan + ',' + yspan,
                    'L' + xspan + ',' + quorra.controller[id].y,
                    'Z'
                ].join(''));
            }else{
                viewbox.attr('d', '');
                var l = quorra.controller[id].xstack.length;
                var xmap = d3.scale.linear().domain(quorra.controller[id].xdrag.range()).range(quorra.controller[id].xdrag.domain());
                var ymap = d3.scale.linear().domain(quorra.controller[id].ydrag.range()).range(quorra.controller[id].ydrag.domain());
                var xval = _.map(quorra.controller[id].xdrag.range(), function(x){ return xmap(x - d3.event.dx); });
                var yval = _.map(quorra.controller[id].ydrag.range(), function(x){ return ymap(x - d3.event.dy); });
                quorra.controller[id].render(xval, yval);
                quorra.controller[id].xdrag = d3.scale.linear().domain(xval).range(quorra.controller[id].xstack[l-1].range());
                quorra.controller[id].ydrag = d3.scale.linear().domain(yval).range(quorra.controller[id].ystack[l-1].range());
            }
        });

    // // set up zoom behavior
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
    quorra.controller[id].svg.on('dblclick', function(){
        var l = quorra.controller[id].xstack.length;
        if (l > 1){
            quorra.controller[id].xstack.pop();
            quorra.controller[id].ystack.pop();
            l = l - 1;
        }
        quorra.controller[id].xdrag = quorra.controller[id].xstack[l-1];
        quorra.controller[id].ydrag = quorra.controller[id].ystack[l-1];
        quorra.controller[id].render(quorra.controller[id].xstack[l-1].domain(), quorra.controller[id].ystack[l-1].domain());
    })
    .call(drag) // .call(zoom)
    .on("dblclick.zoom", null)
    .on("mousedown.zoom", null)
    .on("touchstart.zoom", null)
    .on("touchmove.zoom", null)
    .on("touchend.zoom", null);

    return;
}


QuorraPlot.prototype.enableAnnotation = function(id){
    /**
    QuorraPlot.prototype.enableAnnotation()

    Enable manual annotation for plot.
    */

    // TODO: UPDATE TO TAKE FUNCTION OR OTHER STUFF AS INPUT
    var triggers = _.extend({
        id: function(d){ return quorra.uuid(); },
        type: function(d){ return 'circle'; },
        text: function(d){ return (quorra.controller[id].attr.xformat == "auto") ? d3.format(".2f")(d.x) : quorra.controller[id].attr.xformat(d.x); },
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
    }, quorra.controller[id].attr.annotatable);

    
    var ctrl = quorra.controller[id];
    ctrl.svg.on('click', function(){
        if ((quorra.keys.Shift && quorra.keys.A) || ctrl.annotate){
            var coordinates = d3.mouse(ctrl.svg.node());
            coordinates[0] = coordinates[0];
            coordinates[1] = coordinates[1];

            if (coordinates[0] > (ctrl.width + ctrl.left) ||
                coordinates[0] < ctrl.left ||
                coordinates[1] > (ctrl.height + ctrl.top) ||
                coordinates[1] < ctrl.top){
                return;
            }

            var l = ctrl.xstack.length;
            var xscale = ctrl.xstack[l-1];
            var yscale = ctrl.ystack[l-1];
            var xmap = d3.scale.linear().domain(xscale.range()).range(xscale.domain());
            var ymap = d3.scale.linear().domain(yscale.range()).range(yscale.domain());
            var d = {
                x: xmap(coordinates[0] - ctrl.left),
                y: ymap(coordinates[1] - ctrl.top),
            }
            for (i in ctrl.attr.annotation){
                var annot = ctrl.attr.annotation[i];
                if ((Math.abs(xscale(annot.x) - xscale(d.x)) < 20) && (Math.abs(yscale(annot.y) - yscale(d.y)) < 20)){
                    return;
                }
            }

            d.parent = id;
            d.click = triggers.click;
            _.each(['id', 'type', 'text', 'style', 'meta', 'size', 'group', 'text-size', 'text-position'], function(x){
                d[x] = (typeof triggers[x] === "function") ? triggers[x](d) : triggers[x];
            });
            if (ctrl.attr.annotation){
                ctrl.attr.annotation.push(d);
            }else{
                ctrl.attr.annotation = [d];
            }
            var l = ctrl.xstack.length;
            ctrl.render(
                ctrl.xstack[l-1].domain(),
                ctrl.ystack[l-1].domain()
            );
            triggers.add(d);
        }
    });
}


QuorraPlot.prototype.enableGlyphs = function(id){
    /**
    QuorraPlot.prototype.enableGlyphs()

    Enable manual annotation for plot.
    */
    
    var ctrl = quorra.controller[id];
    var gdata = [];
    if (ctrl.attr.annotatable){
        gdata.push('annotate');
    }
    if (ctrl.attr.zoomable){
        gdata.push('pan', 'refresh');
    }
    if (ctrl.attr.exportable){
        gdata.push('export');
    }
    
    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    var ival = setInterval(function(){

        // all glyphs pulled from https://icomoon.io/app

        // refresh glyph
        ctrl.svg.append('symbol')
            .attr('id', 'glyph-refresh')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M1024 384h-384l143.53-143.53c-72.53-72.526-168.96-112.47-271.53-112.47s-199 39.944-271.53 112.47c-72.526 72.53-112.47 168.96-112.47 271.53s39.944 199 112.47 271.53c72.53 72.526 168.96 112.47 271.53 112.47s199-39.944 271.528-112.472c6.056-6.054 11.86-12.292 17.456-18.668l96.32 84.282c-93.846 107.166-231.664 174.858-385.304 174.858-282.77 0-512-229.23-512-512s229.23-512 512-512c141.386 0 269.368 57.326 362.016 149.984l149.984-149.984v384z');

        // zoom glyph
        ctrl.svg.append('symbol')
            .attr('id', 'glyph-search')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M992.262 871.396l-242.552-206.294c-25.074-22.566-51.89-32.926-73.552-31.926 57.256-67.068 91.842-154.078 91.842-249.176 0-212.078-171.922-384-384-384-212.076 0-384 171.922-384 384s171.922 384 384 384c95.098 0 182.108-34.586 249.176-91.844-1 21.662 9.36 48.478 31.926 73.552l206.294 242.552c35.322 39.246 93.022 42.554 128.22 7.356s31.892-92.898-7.354-128.22zM384 640c-141.384 0-256-114.616-256-256s114.616-256 256-256 256 114.616 256 256-114.614 256-256 256z');

        // image glyph
        ctrl.svg.append('symbol')
            .attr('id', 'glyph-image')
            .attr('viewBox', '0 0 1024 1024')
            .html([
                '<path d="M959.884 128c0.040 0.034 0.082 0.076 0.116 0.116v767.77c-0.034 0.040-0.076 0.082-0.116 0.116h-895.77c-0.040-0.034-0.082-0.076-0.114-0.116v-767.772c0.034-0.040 0.076-0.082 0.114-0.114h895.77zM960 64h-896c-35.2 0-64 28.8-64 64v768c0 35.2 28.8 64 64 64h896c35.2 0 64-28.8 64-64v-768c0-35.2-28.8-64-64-64v0z"></path>',
                '<path d="M832 288c0 53.020-42.98 96-96 96s-96-42.98-96-96 42.98-96 96-96 96 42.98 96 96z"></path>',
                '<path d="M896 832h-768v-128l224-384 256 320h64l224-192z"></path>'
            ].join(''));

        // pan glyph
        ctrl.svg.append('symbol')
            .attr('id', 'glyph-pan')
            .attr('viewBox', '0 0 1024 1024')
            .html([
                '<path d="M1024 0h-416l160 160-192 192 96 96 192-192 160 160z"></path>',
                '<path d="M1024 1024v-416l-160 160-192-192-96 96 192 192-160 160z"></path>',
                '<path d="M0 1024h416l-160-160 192-192-96-96-192 192-160-160z"></path>',
                '<path d="M0 0v416l160-160 192 192 96-96-192-192 160-160z"></path>'
            ].join(''));

        // annotate glyph
        ctrl.svg.append('symbol')
            .attr('id', 'glyph-annotate')
            .attr('viewBox', '0 0 1024 1024')
            .append('path')
            .attr('d', 'M864 0c88.364 0 160 71.634 160 160 0 36.020-11.91 69.258-32 96l-64 64-224-224 64-64c26.742-20.090 59.978-32 96-32zM64 736l-64 288 288-64 592-592-224-224-592 592zM715.578 363.578l-448 448-55.156-55.156 448-448 55.156 55.156z');
 
        // adding glyphs
        var gly = ctrl.svg
                .append("g")
                .attr("transform", "translate(" + (ctrl.width + ctrl.attr.margin.left + 7) + "," + (ctrl.height - ctrl.attr.margin.bottom - gdata.length * 22 + 52) + ")")
                .selectAll(".glyphbox")
                .data(gdata)
                .enter().append("g")
                .attr("class", "glyphbox")
                .attr("id", function(d){ return d; })
                .attr("transform", function(d, i) { return "translate(0," + (i * 25) + ")"; })
                .on('mouseover', function(d){
                    d3.select(this).style('opacity', 0.5);
                    if (ctrl.attr.tooltip){
                        ctrl.attr.tooltip.html(d)
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 10) + "px")
                                .style("top", (d3.event.pageY - 10) + "px");
                    }
                }).on("mousemove", function(d){
                    if (ctrl.attr.tooltip){
                        ctrl.attr.tooltip
                            .style("left", (d3.event.pageX + 10) + "px")
                            .style("top", (d3.event.pageY - 10) + "px");
                    }
                }).on('mouseout', function(d){
                    d3.select(this).style('opacity', 1);
                    if (ctrl.attr.tooltip){
                        ctrl.attr.tooltip.style("opacity", 0);
                    }
                }).on('click', function(d){
                    switch(d){

                        case 'zoom':
                            ctrl.zoom = !ctrl.zoom;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke', (ctrl.zoom) ? 'forestgreen' : '#555')
                                .style('stroke-width', (ctrl.zoom) ? 2 : 1);
                            break;

                        case 'pan':
                            ctrl.pan = !ctrl.pan;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke', (ctrl.pan) ? 'forestgreen' : '#555')
                                .style('stroke-width', (ctrl.pan) ? 2 : 1);
                            break;

                        case 'refresh':
                            ctrl.xstack = [ctrl.xstack[0]]
                            ctrl.ystack = [ctrl.ystack[0]]
                            ctrl.render(ctrl.xstack[0].domain(), ctrl.ystack[0].domain());
                            break;

                        case 'annotate':
                            ctrl.annotate = !ctrl.annotate;
                            d3.select(this).selectAll('.glyph')
                                .style('stroke', (ctrl.annotate) ? 'forestgreen' : '#555')
                                .style('stroke-width', (ctrl.annotate) ? 2 : 1);
                            break;

                        case 'export':
                            // get svg and change attributes -- for some reason, it won't
                            // render well if xmlns is not set
                            var svg = ctrl.svg.attr({
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
                                a.download = ctrl.attr.plotname + ".png";
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
        
        if (ctrl.attr.gshape === "square"){
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
            .attr('x', ctrl.attr.gshape == 'square' ? 4 : 4)
            .attr('y', ctrl.attr.gshape == 'square' ? 4 : 0)
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

        clearInterval(ival);
    }, 100);

    // set glyph highlight on shift event (for zoom)
    if (ctrl.attr.zoomable){
        quorra.events.Shift.down = function(){
            d3.selectAll('.glyphbox#pan')
                .selectAll('.glyph')
                .style('stroke', 'forestgreen')
                .style('stroke-width', 2);
            _.each(quorra.controller, function(ctrl){
                ctrl.pan = true;
            });
        }
        quorra.events.Shift.up = function(){
            d3.selectAll('.glyphbox#pan')
                .selectAll('.glyph')
                .style('stroke', '#555')
                .style('stroke-width', 1);
            _.each(quorra.controller, function(ctrl){
                ctrl.pan = false;
            });
        }
    }
    if (ctrl.attr.annotatable){
        quorra.events.ShiftA.down = function(){
            d3.selectAll('.glyphbox#annotate')
                .selectAll('.glyph')
                .style('stroke', 'forestgreen')
                .style('stroke-width', 2);
            _.each(quorra.controller, function(ctrl){
                ctrl.annotate = true;
            });
        }
        quorra.events.ShiftA.up = function(){
            d3.selectAll('.glyphbox#annotate')
                .selectAll('.glyph')
                .style('stroke', '#555')
                .style('stroke-width', 1);
            _.each(quorra.controller, function(ctrl){
                ctrl.annotate = false;
            });
        }
    }

}
