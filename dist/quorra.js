/* quorra version 0.0.1 (http://bprinty.github.io/quorra) 2016-02-29 */
(function(){
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


// manager for all frames and plot metadata
quorra.controller = {};


function QuorraPlot(attributes) {
    var _this = this;

    // constructor
    this.go = function(selection) {
        
        // configure selection
        this.selection = selection;

        if (typeof this.selection === 'string') this.selection = d3.select(this.selection);

        if (this.selection.select("svg")[0][0] == null){
            this.svg = this.selection.append("svg");
        } else {
            this.svg = this.selection.select("svg");
        }

        // create svg
        this.svg
            .attr("id", _this.attr.id)
            .attr("class", _this.attr.class)
            .attr("width", _this.attr.width)
            .attr("height", _this.attr.height)
            .on("click", _this.attr.plotclick)
            .append("g")
            .attr("transform", "translate(" + _this.attr.margin.left + "," + _this.attr.margin.top + ")");

        // configure/transform data -- figure out how to run
        // this whenever the selection-bound data is changed, and
        // not every time
        _this.data = _this.attr.transform(this.selection.data()[0]);
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
        this.pallette = (_this.attr.color === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(_this.attr.color);
        this.pallette = this.pallette.domain(_.uniquesort(_this.data, _this.attr.group));

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
        this.axes();
        this.plot();
        if (_this.attr.annotation) {
            this.annotate();
        }
    };
    
    // rendering methods
    this.axes = function() {
        
        // calculate plot dimensions
        var width = (_this.attr.width == "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        _this.innerwidth = width - _this.attr.margin.left - _this.attr.margin.right - _this.attr.labelpadding.y;
        _this.innerheight = height - _this.attr.margin.top - _this.attr.margin.bottom - _this.attr.labelpadding.x;

        // parameterize axes scaling
        var domain = _this.attr.xrange === "auto" ? _this.domain : _this.attr.xrange;
        var range = _this.attr.yrange === "auto" ? _this.range : _this.attr.yrange;
        
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
            _this.xscale = d3.scale.ordinal()
                .domain(range)
                .range([0, _this.innerheight])
                .rangePoints([0, _this.innerheight], 1);
        } else {
            _this.xscale = d3.scale.linear()
                .domain(range)
                .range([0, _this.innerheight]);
        }

        // tick formatting
        _this.xaxis = d3.svg.axis().scale(_this.xscale).orient(_this.attr.xorient);
        if (_this.attr.xticks != "auto") {
            _this.xaxis = _this.xaxis.ticks(_this.attr.xticks);
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
            _this.xaxis = _this.xaxis.tickSize(-_this.innerwidth, 0, 0);
            _this.yaxis = _this.yaxis.tickSize(-_this.innerheight, 0, 0);
        }

        // x axis
        _this.go.svg.append("g")
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
        _this.go.svg.append("g")
            .attr("class", "y axis")
            .call(_this.yaxis)
            .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("x", function(x){
                    if (_this.attr.labelposition == "end"){
                        return 0;
                    }else if (_this.attr.labelposition == "middle"){
                        return -innerHeight / 2;
                    }else if (_this.attr.labelposition == "beginning"){
                        return -innerHeight;
                    }
                }).attr("y", function(){
                    if (_this.attr.yposition == "inside"){
                        return 6 + _this.attr.labelpadding.y;
                    }else if(attr.yposition === "outside"){
                        return -40 + _this.attr.labelpadding.y;
                    }
                })
                .attr("dy", ".71em")
                .style("text-anchor", _this.attr.labelposition)
                .text(_this.attr.ylabel);

        // clip plot area
        _this.go.svg.append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", _this.innerwidth)
            .attr("height", _this.innerheight);

        // configure stack for interaction
        _this.xstack.push(_this.xscale);
        _this.ystack.push(_this.yscale);
    };

    this.plot = function() {

    };

    this.annotate = function() {

    };

    this.enablezoom = function() {

    };

    this.drawlegend = function() {

    };

    this.drawglyphs = function() {

    };


    // tuneable plot attributes
    this.attr = {
        // sizing
        plotname: "quorra-plot",
        class: "quorra-plot",
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 40, "left": 40, "right": 40},
        
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
        annotation: false
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

    return this.go;
}

QuorraPlot.prototype.textAnnotation = function(svg, x, y, data){
    /** 
    QuorraPlot.prototype.textAnnotation()

    Plot textual annotation creation.
    */

    var cl = (data.group == null) ? 'annotation text' : 'annotation text g_' + data.group;
    var text = svg.selectAll('.annotation.text#' + data.id)
        .data([data]).enter()
        .append('text')
        .attr('id', data.id)
        .attr('class', cl)
        .attr('x', x)
        .attr('y', y)
        .style("font-size", data['text-size'])
        .style("text-anchor", "middle")
        .text(data.text);

    return text;
}


QuorraPlot.prototype.shapeAnnotation = function(svg, x, y, data) {
    /**
    QuorraPlot.prototype.shapeAnnotation()

    Plot shape annotation creation.
    */

    var cl = (data.group == null) ? 'annotation ' + data.type : 'annotation ' + data.type + ' g_' + data.group;
    if (data.type == 'square'){
        var annot = svg.selectAll('.annotation.square#' + data.id)
            .data([data]).enter()
            .append('rect')
            .attr('transform', 'rotate(' + data.rotate + ' ' + x + ' ' + y + ')')
            .attr('id', data.id)
            .attr('class', cl)
            .attr('width', data.size)
            .attr('height', data.size)
            .attr('x', x - data.size / 2)
            .attr('y', y - data.size / 2);
    }else if (data.type == 'circle'){
        var annot = svg.selectAll('.annotation.circle#' + data.id)
            .data([data]).enter()
            .append('circle')
            .attr('id', data.id)
            .attr('class', cl)
            .attr('r', data.size / 2)
            .attr('cx', x)
            .attr('cy', y);
    }else if (data.type == 'triangle'){
        var annot = svg.selectAll('.annotation.triangle#' + data.id)
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
    }else if (data.type == 'rectangle'){
        var annot = svg.selectAll('.annotation.rectangle#' + data.id)
            .data([data]).enter()
            .append('rect')
            .attr('transform', 'rotate(' + data.rotate + ' ' + x + ' ' + y + ')')
            .attr('id', data.id)
            .attr('class', cl)
            .attr('width', data.xwidth)
            .attr('height', data.xheight)
            .attr('x', x)
            .attr('y', y);
    }

    // styling
    for (i in data.style){
        annot.style(i, data.style[i]);
    }
    
    return annot;
}


QuorraPlot.prototype.parameterizeAxes = function(selection, data, attr, innerWidth, innerHeight){
    /**
    QuorraPlot.prototype.parameterizeAxes()

    Parameterize axes for plot based on data and attributes.
    */

    // x scaling
    var xScale, xGroups;
    if (typeof data[0].x === 'string') {
        xGroups = _.unique(_.map(selection.data()[0], attr.x));
        xScale = d3.scale.ordinal().range([0, innerWidth]);
        xScale.domain(xGroups).rangePoints(xScale.range(), 1);
    }else{
        xScale = d3.scale.linear().range([0, innerWidth]);
        // manually set the domain here because it needs to 
        // be aware of the data object (histogram plots)
        // and x axis tweaks for histogram objects
        if (attr.xrange === "auto"){
            var xmax;
            if (typeof attr.bins === 'undefined') {
                xmax = _.max(_.map(data, attr.x));
            } else {
                xmax = _.max(xScale.ticks(attr.bins));
            }
            xScale.domain([
                _.min(_.map(data, attr.x)),
                xmax
            ]).nice();            
        }else{
            xScale.domain(attr.xrange);
        }
    }

    // y scaling
    var yScale, yGroups;
    if (typeof data[0].y === 'string') {
        yGroups = _.unique(_.map(data, attr.y));
        yScale = d3.scale.ordinal().range([innerHeight, 0]);
        yScale.domain(yGroups).rangePoints(yScale.range(), 1);
    }else{
        yScale = d3.scale.linear().range([innerHeight, 0]);
        // manually set the domain here because it needs to 
        // be aware of the data object (histogram plots)
        if (attr.yrange === "auto"){
            if (attr.layout === 'stacked'){
                // for some reason, underscore's map function won't 
                // work for accessing the d.y0 property -- so we have
                // to do it another way
                var ux = _.unique(_.map(data, attr.x));
                var marr = _.map(ux, function(d){
                    var nd =_.filter(
                            data,
                            function(g){ return attr.x(g) == d; }
                        );
                    var tmap = _.map(nd, function(g){ return attr.y(g); });
                    return _.reduce(tmap, function(a, b){ return a + b; }, 0);
                });
                var max = _.max(marr);
            }else{
                var max = _.max(_.map(data, attr.y));
            }
            yScale.domain([
                _.min(_.map(data, attr.y)),
                max
            ]).nice();
        }else{
            yScale.domain(attr.yrange);
        }
    }

    // tick formatting
    var xAxis = d3.svg.axis().scale(xScale).orient(attr.xorient);
    if (attr.xticks != "auto") {
        xAxis = xAxis.ticks(attr.xticks);
    }
    var yAxis = d3.svg.axis().scale(yScale).orient(attr.yorient);
    if (attr.yticks != "auto") {
        yAxis = yAxis.ticks(attr.yticks);
    }

    // number formatting
    if (attr.xformat != "auto"){
        xAxis = xAxis.tickFormat(attr.xformat);
    }
    if (attr.yformat != "auto"){
        yAxis = yAxis.tickFormat(attr.yformat);
    }

    return {
        xGroups: xGroups,
        yGroups: yGroups,
        xScale: xScale,
        yScale: yScale,
        xAxis: xAxis,
        yAxis: yAxis
    }
}



QuorraPlot.prototype.annotatePlot = function(id){
    /**
    QuorraPlot.prototype.initializeCanvas()

    Initialze canvas for quorra plot and return svg selection.
    */

    var ctrl = quorra.controller[id];
    if (!Array.isArray(ctrl.attr.annotation)){
        ctrl.attr.annotation = [ctrl.attr.annotation]
    }

    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    // we also need to try and render it before the timeout for panning
    // operations, so we encapsulate it in a function and call it before
    // the timeout
    _.map(ctrl.attr.annotation, function(d){
        d.id = quorra.uuid();
        var data = _.extend({
            parent: id,
            exists: false,
            id: quorra.uuid(),
            type: 'circle',
            text: '',
            hovertext: '',
            xfixed: false,
            yfixed: false,
            size: 15,
            group: null,
            rotate: 0,
            'text-size': 13,
            'text-position': {x: 0, y: 20},
            'text-rotation': 0,
            x: 0,
            width: 0,
            y: 0,
            height: 0,
            style: {
                opacity: 1,
            },
            meta: {},
            click: function(){},
        }, d);
        data['text-position'] = _.extend({x: 0, y: 20}, data['text-position']);
        data['style'] = _.extend({opacity: 1}, data['style']);
        ctrl.svg.select('g').selectAll('.annotation#' + data.id).remove();
        var xscale = data.xfixed ? ctrl.xstack[0] : ctrl.xdrag;
        var yscale = data.yfixed ? ctrl.ystack[0] : ctrl.ydrag;
        data.xwidth = Math.abs(xscale(data.width) - xscale(0));
        data.xheight = Math.abs(yscale(data.height) - yscale(0));
        shapeAnnotation(
            ctrl.svg.select('g'),
            xscale(d.x),
            yscale(d.y),
            data
        ).attr("clip-path", "url(#clip)")
        .style("visibility", function(d){
            return _.contains(ctrl.attr.toggled, ctrl.attr.group(d)) ? 'hidden' : 'visible';
        }).on('mouseover', function(d){
            d3.select(this).style('opacity', 0.75*d.style.opacity);
            if (ctrl.attr.tooltip){
                ctrl.attr.tooltip.html(d.hovertext)
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }
        }).on('mousemove', function(){
            if (ctrl.attr.tooltip){
                ctrl.attr.tooltip
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }
        }).on('mouseout', function(){
            d3.select(this).style('opacity', d.style.opacity);
            if (ctrl.attr.tooltip){
                ctrl.attr.tooltip.style("opacity", 0);
            }
        }).on('click', function(d){
            d.click(d);
        });
        if (data.text != ''){
            textAnnotation(
                ctrl.svg.select('g'),
                xscale(d.x) + data['text-position'].x,
                yscale(d.y) - data['text-position'].y,
                data
            ).attr("clip-path", "url(#clip)")
            .style("visibility", function(d){
                return _.contains(ctrl.attr.toggled, ctrl.attr.group(d)) ? 'hidden' : 'visible';
            }).on('mouseover', function(){
                d3.select(this).style('opacity', 0.75);
            }).on('mouseout', function(){
                d3.select(this).style('opacity', 1);
            }).on('click', function(d){
                d.click(d);
            });
        }
        return;
    });

    return;
}


QuorraPlot.prototype.enableLegend = function(id){
    /**
    QuorraPlot.prototype.enableLegend()

    Construct legend component of plot, using plot attributes.
    */
    
    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    var ival = setInterval(function(){
        
        if (d3.select('#' + id)[0][0] == null){
            return;
        }
        var ctrl = quorra.controller[id];
        var data = ctrl.color.domain();
        if (ctrl.attr.lorder.length == data.length){
            data = ctrl.attr.lorder;
        }

        var leg = ctrl.svg
            .append("g")
            .attr("transform", "translate(" + ctrl.attr.margin.left + "," + ctrl.attr.margin.top + ")")
            .selectAll(".legend")
            .data(data)
            .enter().append("g")
            .attr("class", "legend")
            .attr("id", id + "-legend")
            .attr("transform", function(d, i) { return "translate(0," + (ctrl.attr.lmargin.top + i * 20) + ")"; });

        var selector
        if (ctrl.attr.lshape === "square"){
            selector = leg.append("rect")
                .attr("class", "selector")
                .attr("x", ctrl.width - 18 - ctrl.attr.lmargin.right + ctrl.attr.lmargin.left)
                .attr("width", 18)
                .attr("height", 18)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", ctrl.color)
                .style("fill-opacity", function(d){
                    return _.contains(ctrl.attr.toggled, d) ? 0 : ctrl.attr.opacity;
                });        
        }else if (ctrl.attr.lshape === "circle"){
            selector = leg.append("circle")
                .attr("class", "selector")
                .attr("cx", ctrl.width - 10 - ctrl.attr.lmargin.right + ctrl.attr.lmargin.left)
                .attr("cy", 8)
                .attr("r", 9)
                .style("fill", ctrl.color)
                .style("fill-opacity", function(d){
                    return _.contains(ctrl.attr.toggled, d) ? 0 : ctrl.attr.opacity;
                });
        }

        if (ctrl.attr.toggle){
            selector.on("mouseover", function(d, i){
                d3.select(this).style('opacity', 0.75);
            }).on("mouseout", function(d, i){
                d3.select(this).style('opacity', 1);
            }).on("click", function(d, i){
                if (d3.select(this).style('fill-opacity') == 0){
                    d3.select(this).style('fill-opacity', 1);
                    ctrl.svg.selectAll(".g_" + d).style('visibility', 'visible');
                    ctrl.attr.toggled = _.without(ctrl.attr.toggled, d);
                }else{
                    d3.select(this).style('fill-opacity', 0);
                    ctrl.svg.selectAll(".g_" + d).style('visibility', 'hidden');
                    ctrl.attr.toggled = _.union(ctrl.attr.toggled, [d]);
                }
            });
        }

        leg.append("text")
            .attr("x", function(){
                if (ctrl.attr.lposition === "inside"){
                    return ctrl.width - 24 - ctrl.attr.lmargin.right + ctrl.attr.lmargin.left;
                }else if (ctrl.attr.lposition === "outside"){
                    return ctrl.width + 2 - ctrl.attr.lmargin.right + ctrl.attr.lmargin.left;
                }        
            })
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", function(){
                if (ctrl.attr.lposition === "inside"){
                    return "end";
                }else if (ctrl.attr.lposition === "outside"){
                    return "beginning";
                }
            })
            .text(function(d) { return d; });

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


quorra.plot = QuorraPlot;
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
quorra.bar = function(attributes) {
    /**
    quorra.bar()

    Bar plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3943967

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
    attr.layout = "stacked";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);

        // transform data (if transformation function is applied)
        // this is used for histogram plots
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr);

        // determine inner dimensions for plot
        var dim = parameterizeInnerDimensions(selection, attr);
        
        // coloring
        var color = parameterizeColorPallete(newdata, attr);

        // bind attributes to controller
        quorra.controller[attr.id] = {
            x: attr.margin.left,
            y: attr.margin.top,
            left: attr.margin.left,
            top: attr.margin.top,
            width: dim.innerWidth,
            height: dim.innerHeight,
            xstack: [],
            ystack: [],
            xdrag: null,
            ydrag: null,
            scale: 1,
            time: Date.now(),
            svg: selection.select('svg'),
            attr: attr,
            zoom: false,
            pan: true,
            color: color
        }

        var axes, bar;
        quorra.controller[attr.id].render = function(xrange, yrange){

            // clean previous rendering
            svg.selectAll("*").remove();

            // configure axes
            attr.xrange = xrange;
            attr.yrange = yrange;
            axes = parameterizeAxes(selection, newdata, attr, dim.innerWidth, dim.innerHeight);
            if (quorra.controller[attr.id].xstack.length == 0){
                quorra.controller[attr.id].xstack.push(axes.xScale);
                quorra.controller[attr.id].ystack.push(axes.yScale);
            }
            quorra.controller[attr.id].xdrag = axes.xScale;
            quorra.controller[attr.id].ydrag = axes.yScale;

            // axes
            drawAxes(svg, attr, axes.xAxis, axes.yAxis, dim.innerWidth, dim.innerHeight);

            // organizing data
            // no interpolation should happen here because 
            // users should be responsible for ensuring that their data
            // is complete
            var layers = [];
            var ugrps = _.unique(_.map(newdata, function(d){ return d.group; }));
            for (var grp in ugrps) {
                var flt = _.filter(newdata, function(d){ return d.group == ugrps[grp]; });
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
            var layer = svg.selectAll(".layer")
                .data(layers)
                .enter().append("g")
                .attr("class","layer")
                .attr("clip-path", "url(#clip)");

            var bar = layer.selectAll("rect")
                .data(function(d){ return d; })
                .enter().append("rect")
                .attr("class", function(d, i){
                    return "bar " + "g_" + d.group;
                })
                .attr("x", function(d, i){
                    if (layers[0].length > 1){
                        if (attr.layout === "stacked"){
                            return axes.xScale(attr.x(d, i));
                        }else{
                            var diff = Math.abs(axes.xScale(attr.x(layers[0][1])) - axes.xScale(attr.x(layers[0][0])));
                            return axes.xScale(attr.x(d, i)) + color.range().indexOf(color(d.group))*(diff / color.domain().length);
                        }
                    }else{
                        var range = axes.xScale.range();
                        return range[1] - range[0] - 2;
                    }
                })
                // NOTE: this needs to be fixed so that y0 is 
                // parameterized before this takes place.
                .attr("y", function(d, i){ return (attr.layout == "stacked") ? axes.yScale(d.y0 + d.y) : axes.yScale(d.y); })
                .attr("height", function(d, i){ return (attr.layout == "stacked") ? (axes.yScale(d.y0) - axes.yScale(d.y0 + d.y)) : _.max([dim.innerHeight - axes.yScale(d.y), 0]); })
                .attr("width", function(d){
                    if (layers[0].length > 1){
                        var diff = Math.abs(axes.xScale(attr.x(layers[0][1])) - axes.xScale(attr.x(layers[0][0])));
                        if (attr.layout === "stacked"){
                            return diff - 2;
                        }else{
                            return (diff / color.domain().length) - 2;
                        }
                    }else{
                        var range = axes.xScale.range();
                        return range[1] - range[0] - 2;
                    }
                }).attr("fill", function(d, i){ return color(d.group); })
                .style("opacity", attr.opacity)
                .style("visibility", function(d){
                    return _.contains(attr.toggled, d.group) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (attr.tooltip){
                        attr.tooltip.html(d.label)
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mousemove", function(d){
                    if (attr.tooltip){
                        attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", attr.opacity);
                    if (attr.tooltip){
                        attr.tooltip.style("opacity", 0);
                    }
                });

            // do annotation
            if (attr.annotation){
                annotatePlot(attr.id);
            }
        }

        // render
        quorra.controller[attr.id].render(attr.xrange, attr.yrange);

        // enable components
        if (attr.legend){
            enableLegend(attr.id);
        }

        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.glyphs){
            enableGlyphs(attr.id);
        }
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};quorra.density = function() {
    /**
    quorra.density()

    Density plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var tooltip = d3.select("body").append("div")
        .attr("id", "density-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.line({
            resolution: 10
        })
        .id('density')
        .tooltip(tooltip)
        .transform(function(data){
        
        // generate kde scaling function
        var format = d3.format(".04f");
        var xScale = d3.scale.linear().range([0, go.innerWidth]);
        var kde = kdeEstimator(epanechnikovKernel(9), xScale.ticks(go.resolution()));

        // rearranging data
        var grps = _.unique(_.map(data, function(d){ return d.group; }));
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
    });

    return go;
};quorra.histogram = function(attributes) {
    /**
    quorra.histogram()

    Histogram. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // tooltip
    var tooltip = d3.select("body").append("div")
        .attr("id", "histogram-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.bar({
            bins: 10,
            display: 'counts'  // fraction, percent, counts
        })
        .id('histogram')
        .tooltip(tooltip)
        .transform(function(data){
        
            // formatters
            var format;
            if (go.display() == "percent") {
                format = d3.format("0.02%");
            } else if (go.display() == "counts") {
                format = d3.format(".0f");
            } else if (go.display() == "fraction"){
                format = d3.format(".02f");
            }
            if (go.yformat() === "auto"){
                go.yformat(format);
            }
            var xScale = d3.scale.linear().range([0, go.innerWidth]);

            // generate histogram binning
            var histogram = d3.layout.histogram()
                .frequency(false)
                .bins(xScale.ticks(go.bins()));

            // rearranging data
            var grps = _.unique(_.map(data, function(d){ return d.group; }));
            var newdata = [];
            for (var grp in grps){
                var subdat = _.filter(data, function(d){ return d.group == grps[grp]; });
                var newgrp = histogram(_.map(subdat, function(d){ return d.x }));
                newgrp = _.map(newgrp, function(d){
                    if (go.display() == 'counts'){
                        d.y = d.y*subdat.length;
                    } else if (go.display() == 'percent'){
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
        });

    return go;
};quorra.line = function(attributes) {
    /**
    quorra.line()

    Line plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
    attr.points = 0;
    attr.size = 3;
    attr.layout = "line";
    attr.interpolate = "linear";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection) {
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // transform data (if transformation function is applied)
        // this is used for density plots
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr);

        // determine inner dimensions for plot
        var dim = parameterizeInnerDimensions(selection, attr);

        // coloring
        var color = parameterizeColorPallete(newdata, attr);

        // bind attributes to controller
        quorra.controller[attr.id] = {
            x: attr.margin.left,
            y: attr.margin.top,
            left: attr.margin.left,
            top: attr.margin.top,
            width: dim.innerWidth,
            height: dim.innerHeight,
            xstack: [],
            ystack: [],
            xdrag: null,
            ydrag: null,
            scale: 1,
            time: Date.now(),
            svg: selection.select('svg'),
            attr: attr,
            annotate: false,
            zoom: true,
            pan: false,
            color: color
        }

        var axes, line, dot;
        quorra.controller[attr.id].render = function(xrange, yrange){

            // clean previous rendering
            svg.selectAll("*").remove();
            if (attr.tooltip){
                attr.tooltip.style("opacity", 0);
            }

            // configure axes
            attr.xrange = xrange;
            attr.yrange = yrange;
            axes = parameterizeAxes(selection, newdata, attr, dim.innerWidth, dim.innerHeight);
            if (quorra.controller[attr.id].xstack.length == 0){
                quorra.controller[attr.id].xstack.push(axes.xScale);
                quorra.controller[attr.id].ystack.push(axes.yScale);
            }
            quorra.controller[attr.id].xdrag = axes.xScale;
            quorra.controller[attr.id].ydrag = axes.yScale;
            

            // axes
            drawAxes(svg, attr, axes.xAxis, axes.yAxis, dim.innerWidth, dim.innerHeight);

            // plotting lines
            var path = d3.svg.line()
                .x(function(d, i) { return axes.xScale(attr.x(d, i)); })
                .y(function(d, i) { return axes.yScale(attr.y(d, i)); })
                .interpolate(attr.interpolate);

            var ugrps = _.unique(_.map(newdata, function(d){ return d.group; }));
            for (var grp in ugrps) {

                // lines
                var subdat = _.filter(newdata, function(d){ return d.group == ugrps[grp]; });
                line = svg.append("path")
                    .datum(subdat)
                    .attr("class", function(d, i){
                        return "line " + "g_" + d[0].group;
                    })
                    .attr("d", function(d){
                        var p = path(d);
                        if (attr.layout === "line"){
                            return p;
                        }else if (attr.layout === "area"){
                            return [
                                p,
                                "L" + axes.xScale(_.max(_.map(d, attr.x))) + "," + axes.yScale(_.min(_.map(d, attr.y))),
                                "L" + axes.xScale(_.min(_.map(d, attr.x))) + "," + axes.yScale(_.min(_.map(d, attr.y))),
                                "Z"
                            ].join('');
                        }
                    })
                    .style("fill", function(d){
                        if (attr.layout === "line"){
                            return "none";
                        }else if (attr.layout === "area"){
                            return color(d[0].group);
                        }
                    })
                    .style("stroke", color(ugrps[grp]))
                    .style("stroke-width", attr.size)
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d[0])) ? 'hidden' : 'visible';
                    })
                    .attr("clip-path", "url(#clip)")
                    .on("mouseover", function(d, i){
                        d3.select(this).style("opacity", 0.25);
                        if (attr.tooltip){
                            attr.tooltip.html(d[0].group)
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mousemove", function(d){
                        if (attr.tooltip){
                            attr.tooltip
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mouseout", function(d){
                        d3.select(this).style("opacity", attr.opacity);
                        if (attr.tooltip){
                            attr.tooltip.style("opacity", 0);
                        }
                    }).on("click", attr.groupclick);

            }

            // points (if specified)
            if (attr.points > 0){
                dot = svg.selectAll(".dot")
                    .data(newdata)
                    .enter().append("circle")
                    .attr("class", function(d, i){
                        return "dot " + "g_" + d.group;
                    })
                    .attr("r", attr.points)
                    .attr("cx", function(d, i) { return axes.xScale(attr.x(d, i)); })
                    .attr("cy", function(d, i) { return axes.yScale(attr.y(d, i)); })
                    .style("fill", function(d, i){ return color(attr.group(d, i)); })
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
                    })
                    .attr("clip-path", "url(#clip)")
                    .on("mouseover", function(d, i){
                        d3.select(this).style("opacity", 0.25);
                        if (attr.tooltip){
                            attr.tooltip.html(attr.label(d, i))
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mousemove", function(d){
                        if (attr.tooltip){
                            attr.tooltip
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mouseout", function(d){
                        d3.select(this).style("opacity", attr.opacity);
                        if (attr.tooltip){
                            attr.tooltip.style("opacity", 0);
                        }
                    }).on("click", attr.labelclick);
            }

            // do annotation
            if (attr.annotation){
                annotatePlot(attr.id);
            }
        }

        // render
        quorra.controller[attr.id].render(attr.xrange, attr.yrange);

        // enable components
        if (attr.legend){
            enableLegend(attr.id);
        }

        if (attr.annotatable){
            enableAnnotation(attr.id);
        }

        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.glyphs){
            enableGlyphs(attr.id);
        }
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};quorra.multiline = function() {
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
};quorra.pie = function(attributes) {
    /**
    quorra.pie()

    Pie chart. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
    attr.aggregate = function(x){ return(x[0]); }
    attr.radius = "auto";
    attr.inner = "auto";
    attr.margin = {"top": 0, "bottom": 0, "left": 0, "right": 0};
    attr.lmargin = {"top": 15, "bottom": 0, "left": 0, "right": 0};
    attr = _.extend(attr, attributes);


    // generator
    function go(selection){
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (attr.width == "auto") ? parseInt(selection.style("width")) : attr.width;
        var h = (attr.height == "auto") ? parseInt(selection.style("height")) : attr.height;
        w = w - attr.margin.left - attr.margin.right;
        h = h - attr.margin.top - attr.margin.bottom;
        

        var r = (attr.radius == "auto") ? (Math.min(w, h) / 2) : attr.radius;
        var ir = (attr.inner == "auto") ? 0 : attr.inner;

        // aggregate data
        var data = selection.data()[0];
        var newdata = [];
        var gps = _.unique(_.map(data, function(d){ return( d.group ); }));
        for (var i in gps){
            var subdat = _.filter(data, function(d){ return d.group == gps[i]; });
            newdata.push({
                x: attr.aggregate(_.map(subdat, function(d){ return d.x; })),
                group: gps[i],
                label: _.map(subdat, function(d){ return d.label; })
            });
        }

        // initialize canvas
        // THIS NEEDS TO BE REFACTORED TO START USING
        // THE initializeCanvas function
        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-pie")
            .attr("id", attr.id)
            .attr("width", w + attr.margin.left + attr.margin.right)
            .attr("height", h + attr.margin.top + attr.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + (attr.margin.left + w / 2) + "," + (attr.margin.top + h /2) + ")");

        // coloring
        var color = parameterizeColorPallete(newdata, attr);

        // bind attributes to controller
        quorra.controller[attr.id] = {
            x: attr.margin.left,
            y: attr.margin.top,
            left: attr.margin.left,
            top: attr.margin.top,
            width: w,
            height: h,
            xstack: [],
            ystack: [],
            xdrag: null,
            ydrag: null,
            svg: selection.select('svg'),
            attr: attr,
            zoom: true,
            pan: false,
            color: color
        }

        quorra.controller[attr.id].render = function(xrange, yrange){

            var arc = d3.svg.arc()
                .outerRadius(r)
                .innerRadius(ir);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d){ return d.x; });

            // plot
            var g = svg.selectAll(".arc")
                .data(pie(newdata))
                .enter().append("g")
                .attr("class", function(d){
                    return "arc g_" + d.data.group;
                })
                .style("visibility", function(d){
                    return _.contains(attr.toggled, attr.group(d.data)) ? 'hidden' : 'visible';
                });

            g.append("path")
                .attr("d", arc)
                .style("fill", function(d, i) { return color(attr.group(d.data, i)); })
                .style("opacity", attr.opacity)
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (attr.tooltip){
                        attr.tooltip.html(attr.label(d.data, i))
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mousemove", function(d){
                    if (attr.tooltip){
                        attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", attr.opacity);
                    if (attr.tooltip){
                        attr.tooltip.style("opacity", 0);
                    }
                }).on("click", attr.labelclick);
        }

        // render
        quorra.controller[attr.id].render(attr.xrange, attr.yrange);

        // enable components
        if (attr.legend){
            enableLegend(attr.id);
        }
    }


    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};
function Scatter(attributes) {
    /**
    Scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */
    var _this = this;

    // plot-specific attributes
    QuorraPlot.call(this, _.extend({
        lm: false,
        xdensity: false,
        ydensity: false,
        xjitter: 0,
        yjitter: 0,
        size: 5,
    }, attributes));

    // overwrite render method
    _this.plot = function(xrange, yrange) {
        console.log('plot');
    }

        // // bind attributes to controller
        // quorra.controller[attr.id] = {
        //     x: attr.margin.left,
        //     y: attr.margin.top,
        //     left: attr.margin.left,
        //     top: attr.margin.top,
        //     width: dim.innerWidth,
        //     height: dim.innerHeight,
        //     xstack: [],
        //     ystack: [],
        //     xdrag: null,
        //     ydrag: null,
        //     scale: 1,
        //     time: Date.now(),
        //     svg: selection.select('svg'),
        //     attr: attr,
        //     zoom: false,
        //     pan: true,
        //     color: color
        // }

        // var axes, line, dot;
        // quorra.controller[_this.attr.id].render = function(xrange, yrange){
            
        //     // clean previous rendering
        //     svg.selectAll("*").remove();

        //     // configure axes
        //     _this.attr.xrange = xrange;
        //     _this.attr.yrange = yrange;
        //     axes = parameterizeAxes(selection, newdata, _this.attr, dim.innerWidth, dim.innerHeight);
        //     if (quorra.controller[_this.attr.id].xstack.length == 0){
        //         quorra.controller[_this.attr.id].xstack.push(axes.xScale);
        //         quorra.controller[_this.attr.id].ystack.push(axes.yScale);
        //     }
        //     quorra.controller[_this.attr.id].xdrag = axes.xScale;
        //     quorra.controller[_this.attr.id].ydrag = axes.yScale;

        //     // axes
        //     _this.drawAxes(svg, _this.attr, axes.xAxis, axes.yAxis, dim.innerWidth, dim.innerHeight);

        //     // plotting points
        //     var dot = svg.selectAll(".dot")
        //         .data(newdata)
        //         .enter().append("circle")
        //         .attr("class", function(d, i){
        //             return "dot " + "g_" + d.group;
        //         })
        //         .attr("r", attr.size)
        //         .attr("cx", function(d, i) {
        //             return (quorra.random() - 0.5) * _this.attr.xjitter + axes.xScale(_this.attr.x(d, i));
        //         })
        //         .attr("cy", function(d, i) {
        //             return (quorra.random() - 0.5) * _this.attr.yjitter + axes.yScale(_this.attr.y(d, i));
        //         })
        //         .style("fill", function(d, i) { return color(_this.attr.group(d, i)); })
        //         .style("opacity", _this.attr.opacity)
        //         .style("visibility", function(d){
        //             return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
        //         })
        //         .attr("clip-path", "url(#clip)")
        //         .on("mouseover", function(d, i){
        //             d3.select(this).style("opacity", 0.25);
        //             if (_this.attr.tooltip){
        //                 _this.attr.tooltip.html(attr.label(d, i))
        //                     .style("opacity", 1)
        //                     .style("left", (d3.event.pageX + 5) + "px")
        //                     .style("top", (d3.event.pageY - 20) + "px");
        //             }
        //         }).on("mousemove", function(d){
        //             if (_this.attr.tooltip){
        //                 _this.attr.tooltip
        //                     .style("left", (d3.event.pageX + 5) + "px")
        //                     .style("top", (d3.event.pageY - 20) + "px");
        //             }
        //         }).on("mouseout", function(d){
        //             d3.select(this).style("opacity", _this.attr.opacity);
        //             if (_this.attr.tooltip){
        //                 _this.attr.tooltip.style("opacity", 0);
        //             }
        //         });

            // // generating density ticks (if specified)
            // if (attr.xdensity){
            //     svg.selectAll(".xtick")
            //         .data(newdata)
            //         .enter().append("line")
            //         .attr("clip-path", "url(#clip)")
            //         .attr("class", function(d, i){
            //             return "xtick " + "g_" + d.group;
            //         })
            //         .attr("x1", function(d, i) { return axes.xScale(attr.x(d, i)); })
            //         .attr("x2", function(d, i) { return axes.xScale(attr.x(d, i)); })
            //         .attr("y1", function(d, i) { return dim.innerHeight; })
            //         .attr("y2", function(d, i) { return dim.innerHeight-10; })
            //         .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
            //         .style("opacity", attr.opacity)
            //         .style("visibility", function(d){
            //             return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
            //         });
            //         // TODO: maybe include two-way selection/highlighting here?
            // }
            // if (attr.ydensity){
            //     svg.selectAll(".ytick")
            //         .data(newdata)
            //         .enter().append("line")
            //         .attr("clip-path", "url(#clip)")
            //         .attr("class", function(d, i){
            //             return "ytick " + "g_" + d.group;
            //         })
            //         .attr("x1", function(d, i) { return 0; })
            //         .attr("x2", function(d, i) { return 10; })
            //         .attr("y1", function(d, i) { return axes.yScale(attr.y(d, i)); })
            //         .attr("y2", function(d, i) { return axes.yScale(attr.y(d, i)); })
            //         .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
            //         .style("opacity", attr.opacity)
            //         .style("visibility", function(d){
            //             return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
            //         });
            // }

            // // generating regression line with smoothing curve (if specified)
            // if (_this.attr.lm != false){
            //     console.log("Not yet implemented!");
            // }

            // // do annotation
            // if (_this.attr.annotation){
            //     annotatePlot(attr.id);
            // }
        // }

        // render
        // quorra.controller[attr.id].render(_this.attr.xrange, _this.attr.yrange);

        // // enable components
        // if (_this.attr.legend){
        //     _this.enableLegend(attr.id);
        // }

        // if (_this.attr.zoomable){
        //     _this.enableZoom(attr.id);
        // }

        // if (_this.attr.glyphs){
        //     _this.enableGlyphs(attr.id);
        // }

    return this.go;
}

Scatter.prototype = Object.create(QuorraPlot.prototype);

Scatter.prototype.constructor = Scatter;

quorra.scatter = Scatter;

quorra.version = "0.0.1";

window.quorra = quorra;

})();