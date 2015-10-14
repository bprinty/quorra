/* quorra version 0.0.1 (http://bprinty.github.io/quorra) 2015-10-14 */
(function(){
function quorra() {
    /**
    quorra()

    Base class for all visualization components.

    @author <bprinty@gmail.com>
    */
}


// manager for all frames and plot metadata
quorra.controller = {};


// shapes
textAnnotation = function(svg, x, y, data){

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
        .text(data.text)
        .on('mouseover', function(){
            d3.select(this).style('opacity', 0.75);
        }).on('mouseout', function(){
            d3.select(this).style('opacity', 1);
        }).on('click', data.click);

    return text;
}


shapeAnnotation = function(svg, x, y, data){
    
    var cl = (data.group == null) ? 'annotation ' + data.type : 'annotation ' + data.type + ' g_' + data.group;
    if (data.type == 'square'){
        var annot = svg.selectAll('.annotation.square#' + data.id)
            .data([data]).enter()
            .append('rect')
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
            .attr('id', data.id)
            .attr('class', cl)
            // TODO: get rotating annotation
            // .attr('transform', 'translate(' + -1*((y - data.size)*1.5) + ', ' + -1*(x*1.5 - data.size/2) + ') rotate(-90)')
            .attr('d', function(d){
                return [
                'M' + (x - (d.size / 2)) + ',' + (y - (d.size / 2)),
                'L' + (x + (d.size / 2)) + ',' + (y - (d.size / 2)),
                'L' + x + ',' + (y + (d.size / 2)),
                'Z'].join('');
            });
    }

    // mouse events
    annot.on('mouseover', function(){
        d3.select(this).style('opacity', 0.75);
    })
    .on('mouseout', function(){
        d3.select(this).style('opacity', 1);
    })
    .on('click', data.click);

    // styling
    for (i in data.style){
        annot.style(i, data.style[i]);
    }
    
    return annot;
}


attributeConstructor = function(id){
    /**
    attributeConstructor()

    Return dictionary with common quorra attributes. This
    is for cutting down code duplication.

    @author <bprinty@gmail.com>
    */

    return {
        // sizing
        id: (typeof id !== 'undefined') ?  id : quorra.uuid(),
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 40, "left": 40, "right": 20},
        
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
        opacity: 0.75,
        
        // legend
        legend: true,
        lmargin: {"top": 0, "bottom": 0, "left": 0, "right": 0},
        lposition: "inside",
        lshape: "square",
        toggle: true,
        toggled: [],

        // glyphs
        glyphs: true,
        gmargin: {"top": 0, "bottom": 0, "left": 0, "right": 0},
        gshape: "circle",
        
        // additional display
        annotation: false,
        tooltip: d3.select("body").append("div")
            .attr("id", id + "-tooltip")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0),
    };
}


bindConstructorAttributes = function(constructor, attributes){
    /**
    quorra.bindConstructorAttributes()

    Bind attributes to constructor function in quorra to 
    enable attribute getting/setting.

    @author <bprinty@gmail.com>
    */

    Object.keys(attributes).forEach(function(i){
        constructor[i] = function(value) {
            if (!arguments.length) return attributes[i];

            // binding a tooltip requires removal of the previous
            if (i === 'tooltip'){
                attributes[i].remove();
            }
            // maintain non-overridden object arguments
            if (typeof value === 'object' && i != 'tooltip'){            
                if (typeof attributes[i] === 'object'){
                    attributes[i] = _.extend(attributes[i], value);
                }else{
                    attributes[i] = value;
                }
            }else{
                attributes[i] = value;
            }
            return constructor;
        }    
    });
}

parameterizeInnerDimensions = function(selection, attr){
    /**
    quorra.parameterizeInnerDimensions()

    Parameterize dimensions for plot based on margins.

    @author <bprinty@gmail.com>
    */
    var width = (attr.width == "auto") ? parseInt(selection.style("width")) : attr.width;
    var height = (attr.height == "auto") ? parseInt(selection.style("height")) : attr.height;
    
    var iw = width - attr.margin.left - attr.margin.right - attr.labelpadding.y;
    var ih = height - attr.margin.top - attr.margin.bottom - attr.labelpadding.x;

    return {
        innerWidth: iw,
        innerHeight: ih
    };
}


parameterizeColorPallete = function(data, attr){
    /**
    quorra.parameterizeColorPallete()

    Parameterize color pallete based on grouping.

    @author <bprinty@gmail.com>
    */
    var pallette = (attr.color === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(attr.color);
    var domain = _.unique(_.map(data, attr.group)).sort();
    return pallette.domain(domain);
}


parameterizeAxes = function(selection, data, attr, innerWidth, innerHeight){
    /**
    quorra.parameterizeAxes()

    Parameterize axes for plot based on data and attributes.

    @author <bprinty@gmail.com>
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


drawAxes = function(svg, attr, xAxis, yAxis, innerWidth, innerHeight){
    /**
    quorra.drawAxes()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */
    if (attr.grid){
        xAxis = xAxis.tickSize(-innerHeight, 0, 0);
        yAxis = yAxis.tickSize(-innerWidth, 0, 0);
    }

    // x axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(xAxis)
    .append("text")
        .attr("class", "label")
        .attr("x", function(x){
            if (attr.labelposition == "end"){
                return innerWidth;
            }else if (attr.labelposition == "middle"){
                return innerWidth / 2;
            }else if (attr.labelposition == "beginning"){
                return 0;
            }
        })
        .attr("y", function(){
            if (attr.xposition == "inside"){
                return -6 + attr.labelpadding.x;
            }else if(attr.xposition === "outside"){
                return 35 + attr.labelpadding.x;
            }
        })
        .style("text-anchor", attr.labelposition)
        .text(attr.xlabel);

    // y axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
    .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("x", function(x){
            if (attr.labelposition == "end"){
                return 0;
            }else if (attr.labelposition == "middle"){
                return -innerHeight / 2;
            }else if (attr.labelposition == "beginning"){
                return -innerHeight;
            }
        }).attr("y", function(){
            if (attr.yposition == "inside"){
                return 6 + attr.labelpadding.y;
            }else if(attr.yposition === "outside"){
                return -40 + attr.labelpadding.y;
            }
        })
        .attr("dy", ".71em")
        .style("text-anchor", attr.labelposition).text(attr.ylabel);

    // clip plot area
    svg.append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight);

    return;
}


initializeCanvas = function(selection, attr){
    /**
    quorra.initializeCanvas()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
    */

    var svg;
    if (selection.select("svg")[0][0] == null){
        svg = selection.append("svg");
    } else {
        svg = selection.select("svg");
    }

    svg = svg
        .attr("id", attr.id)
        .attr("class", "quorra-plot")
        .attr("width", attr.width)
        .attr("height", attr.height)
        .on("click", attr.plotclick)
        .append("g")
        .attr("transform", "translate(" + attr.margin.left + "," + attr.margin.top + ")");

    return svg;
}


annotatePlot = function(id){
    /**
    quorra.initializeCanvas()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
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
        d = _.extend({
            parent: id,
            id: quorra.uuid(),
            type: 'circle',
            text: '',
            size: 15,
            group: null,
            rotate: 0,
            'text-size': 13,
            'text-position': {x: 0, y: 20},
            'text-rotation': 0,
            x: 0,
            y: 0,
            style: {},
            click: function(){}
        }, d);
        d['text-position'] = _.extend({x: 0, y: 20}, d['text-position']);
        ctrl.svg.select('g').selectAll('.annotation#' + d.id).remove();
        shapeAnnotation(
            ctrl.svg.select('g'),
            ctrl.xdrag(d.x),
            ctrl.ydrag(d.y),
            d
        ).attr("clip-path", "url(#clip)")
        .style("visibility", function(d){
            return _.contains(ctrl.attr.toggled, ctrl.attr.group(d)) ? 'hidden' : 'visible';
        });
        if (d.text != ''){
            textAnnotation(
                ctrl.svg.select('g'),
                ctrl.xdrag(d.x) + d['text-position'].x,
                ctrl.ydrag(d.y) - d['text-position'].y,
                d
            ).attr("clip-path", "url(#clip)")
            .style("visibility", function(d){
                return _.contains(ctrl.attr.toggled, ctrl.attr.group(d)) ? 'hidden' : 'visible';
            });
        }
        return;
    });

    return;
}


enableLegend = function(id){
    /**
    quorra.enableLegend()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */
    
    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    var ival = setInterval(function(){
        
        if (d3.select('#' + id)[0][0] == null){
            return;
        }
        var ctrl = quorra.controller[id];
        var leg = ctrl.svg
            .append("g")
            .attr("transform", "translate(" + ctrl.attr.margin.left + "," + ctrl.attr.margin.top + ")")
            .selectAll(".legend")
            .data(ctrl.color.domain())
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
                    return _.contains(ctrl.attr.toggled, d) ? 0 : 1;
                });        
        }else if (ctrl.attr.lshape === "circle"){
            selector = leg.append("circle")
                .attr("class", "selector")
                .attr("cx", ctrl.width - 10 - ctrl.attr.lmargin.right + ctrl.attr.lmargin.left)
                .attr("cy", 8)
                .attr("r", 9)
                .style("fill", ctrl.color)
                .style("fill-opacity", function(d){
                    return _.contains(ctrl.attr.toggled, d) ? 0 : 1;
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


enableZoom = function(id){
    /**
    quorra.enableZoom()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
    */

    // return processed mouse coordinates
    function mouseCoordinates(){
        var coordinates = d3.mouse(quorra.controller[id].svg.node());
        coordinates[0] = coordinates[0] - quorra.controller[id].left;
        coordinates[1] = coordinates[1] - quorra.controller[id].top;
        return coordinates;
    }

    // init viewbox for selection
    var viewbox = quorra.controller[id].svg
        .append('path')
        .attr('class', 'viewbox')
        .attr("transform", "translate(" + quorra.controller[id].left + "," + quorra.controller[id].top + ")")

    // set up drag behavior
    var drag = d3.behavior.drag()
        .origin(function(d){ return d; })
        .on("dragstart", function(d){
            var coordinates = mouseCoordinates();
            quorra.controller[id].x = coordinates[0];
            quorra.controller[id].y = coordinates[1];
        })
        .on("dragend", function(d){
            if (!quorra.keys.Shift && !quorra.controller[id].pan){
                viewbox.attr('d', '');
                var coordinates = mouseCoordinates();
                if (Math.abs(quorra.controller[id].x - coordinates[0]) > 10 && Math.abs(quorra.controller[id].y - coordinates[1]) > 10){
                    var l = quorra.controller[id].xstack.length;
                    var xmap = d3.scale.linear()
                        .domain(quorra.controller[id].xdrag.range())
                        .range(quorra.controller[id].xdrag.domain());
                    var ymap = d3.scale.linear()
                        .domain(quorra.controller[id].ydrag.range())
                        .range(quorra.controller[id].ydrag.domain());
                    var xval = [xmap(quorra.controller[id].x), xmap(coordinates[0])].sort(function(a, b){ return a - b; });
                    var yval = [ymap(quorra.controller[id].y), ymap(coordinates[1])].sort(function(a, b){ return a - b; });
                    var xscale = d3.scale.linear().domain(xval).range(quorra.controller[id].xdrag.range());
                    var yscale = d3.scale.linear().domain(yval).range(quorra.controller[id].ydrag.range());
                    quorra.controller[id].render(xval, yval);
                    quorra.controller[id].xstack.push(xscale);
                    quorra.controller[id].ystack.push(yscale);
                    quorra.controller[id].xdrag = xscale;
                    quorra.controller[id].ydrag = yscale;
                }
            }
        })
        .on("drag", function(d){
            var coordinates = mouseCoordinates();
            if (quorra.keys.Shift || quorra.controller[id].pan){
                var l = quorra.controller[id].xstack.length;
                var xmap = d3.scale.linear().domain(quorra.controller[id].xdrag.range()).range(quorra.controller[id].xdrag.domain());
                var ymap = d3.scale.linear().domain(quorra.controller[id].ydrag.range()).range(quorra.controller[id].ydrag.domain());
                var xval = _.map(quorra.controller[id].xdrag.range(), function(x){ return xmap(x - d3.event.dx); });
                var yval = _.map(quorra.controller[id].ydrag.range(), function(x){ return ymap(x - d3.event.dy); });
                quorra.controller[id].render(xval, yval);
                quorra.controller[id].xdrag = d3.scale.linear().domain(xval).range(quorra.controller[id].xstack[l-1].range());
                quorra.controller[id].ydrag = d3.scale.linear().domain(yval).range(quorra.controller[id].ystack[l-1].range());
            }else{
                viewbox.attr('d', [
                    'M' + quorra.controller[id].x + ',' + quorra.controller[id].y,
                    'L' + quorra.controller[id].x + ',' + coordinates[1],
                    'L' + coordinates[0] + ',' + coordinates[1],
                    'L' + coordinates[0] + ',' + quorra.controller[id].y,
                    'Z'
                ].join(''));
            }
        });

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
    .call(drag);

    return;
}

enableAnnotation = function(id){
    /**
    quorra.enableAnnotation()

    Enable manual annotation for plot.

    @author <bprinty@gmail.com>
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
        click: function(d){}
    }, quorra.controller[id].attr.annotatable);
    
    var ctrl = quorra.controller[id];
    var l = ctrl.xstack.length;
    var xscale = ctrl.xstack[l-1];
    var yscale = ctrl.ystack[l-1]
    var xmap = d3.scale.linear().domain(xscale.range()).range(xscale.domain());
    var ymap = d3.scale.linear().domain(yscale.range()).range(yscale.domain());
    
    quorra.controller[id].svg.on('click', function(){
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
            _.each(['id', 'type', 'text', 'click', 'style', 'size', 'group', 'text-size', 'text-position'], function(x){
                d[x] = triggers[x](d);
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
        }
    });
}

enableGlyphs = function(id){

    
    var ctrl = quorra.controller[id];
    var gdata = [];
    if (ctrl.attr.annotatable){
        gdata.push('annotate');
    }
    if (ctrl.attr.zoomable){
        gdata.push('zoom', 'pan', 'refresh');
    }
    
    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    var ival = setInterval(function(){
        var gly = ctrl.svg
                .append("g")
                .attr("transform", "translate(" + (ctrl.attr.margin.left + 30) + "," + (ctrl.height - ctrl.attr.margin.bottom - gdata.length * 22 + 52) + ")")
                .selectAll(".glyphbox")
                .data(gdata)
                .enter().append("g")
                .attr("class", "glyphbox")
                .attr("id", function(d){ return d; })
                .attr("transform", function(d, i) { return "translate(0," + (i * 25) + ")"; })
                .style("opacity", function(d){
                    return (ctrl[d]) ? 0.5 : 1;
                }).on('mouseover', function(d){
                    d3.select(this).style('opacity', 0.5);
                }).on('mouseout', function(d){
                    if (!ctrl[d]){
                        d3.select(this).style('opacity', 1);
                    }
                }).on('click', function(d){
                    switch(d){
                        case 'pan':
                            if (ctrl.zoom){
                                ctrl.svg.selectAll('.glyphbox#zoom').style('opacity', 1);
                                ctrl.zoom = false;
                            }
                            if (!ctrl.pan){
                                d3.select(this).style('opacity', 0.5);
                                ctrl.pan = true;
                            }
                            break;
                        case 'zoom':
                            if (ctrl.pan){
                                ctrl.svg.selectAll('.glyphbox#pan').style('opacity', 1);
                                ctrl.pan = false;
                            }
                            if (!ctrl.zoom){
                                d3.select(this).style('opacity', 0.5);
                                ctrl.zoom = true;
                            }
                            break;
                        case 'refresh':
                            ctrl.xstack = [ctrl.xstack[0]]
                            ctrl.ystack = [ctrl.ystack[0]]
                            ctrl.render(ctrl.xstack[0].domain(), ctrl.ystack[0].domain());
                            break;
                        case 'annotate':
                            ctrl.annotate = !ctrl.annotate;
                            d3.select(this).style('opacity', (ctrl.annotate) ? 0.5 : 1);
                            break;
                    }
                });
        
        if (ctrl.attr.gshape === "square"){
            gly.append("rect")
                .attr("class", "glyph")
                .attr("x", ctrl.width - 18 - ctrl.attr.gmargin.right + ctrl.attr.gmargin.left)
                .attr("width", 22)
                .attr("height", 22)
                .attr("rx", 5)
                .attr("ry", 5)
                .style("fill", "transparent");

        }else if (ctrl.attr.gshape === "circle"){
            gly.append("circle")
                .attr("class", "glyph")
                .attr("cx", ctrl.width - 10 - ctrl.attr.gmargin.right + ctrl.attr.gmargin.left)
                .attr("cy", 8)
                .attr("r", 11)
                .style("fill", "transparent"); 
        }
        gly.append("text")
            .attr("class", "glyph")
            .attr("x", function(d){
                var offset = (ctrl.attr.gshape === "square") ? 15 : 18;
                switch(d){
                    case 'pan': offset = offset - 1; break;
                    case 'zoom': offset = offset; break;
                    case 'refresh': offset = offset - 1; break;
                    case 'annotate': offset = offset - 3; break;
                }
                return ctrl.width - offset - ctrl.attr.gmargin.right + ctrl.attr.gmargin.left;
            }).attr("y", function(d){
                var offset = (ctrl.attr.gshape === "square") ? 17 : 13;
                switch(d){
                    case 'pan': offset = offset - 2; break;
                    case 'zoom': break;
                    case 'refresh': break;
                    case 'annotate': break;
                }
                return offset;
            }).text(function(d){
                switch(d){
                    case 'pan': return '↔'; break;
                    case 'zoom': return '🔍'; break;
                    case 'refresh': return '🔃'; break;
                    case 'annotate': return 'A'; break;
                }
            });

        clearInterval(ival);
    }, 100);

}




// key maps
var baseKeys = { 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc'};
var metaKeys = { 9: 'Tab', 13: 'Enter', 65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z'};
var allKeys = _.extend(_.clone(baseKeys), metaKeys);

// key press storage
quorra.keys = {};
_.each(allKeys, function(key){
    quorra.keys[key] = false;
});

// event handlers
quorra.events = {};
_.each(baseKeys, function(base){
    _.each(metaKeys, function(meta){
        quorra.events[base + meta] = function(){};
    });
});


// press/release events
document.onkeydown = function (e) {
    e = e || window.event;
    var k = e.which;
    if (_.has(allKeys, k)){
        quorra.keys[allKeys[k]] = true;
        if (_.has(metaKeys, k)){
            _.each(baseKeys, function(i){
                if (quorra.keys[i]){
                    quorra.events[i+metaKeys[k]]();
                }
            });
        }
    }
};

document.onkeyup = function (e) {
    e = e || window.event;
    var k = e.which;
    if (_.has(allKeys, k)){
        quorra.keys[allKeys[k]] = false;
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


// underscore additions
_.center = function(x, bounds){
    return _.min([_.max([x, bounds[0]]), bounds[1]]);
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
            svg: selection.select('svg'),
            attr: attr,
            annotate: false,
            zoom: true,
            pan: false,
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
                    attr.tooltip.html(d.label)
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mousemove", function(d){
                    attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", attr.opacity);
                    attr.tooltip.style("opacity", 0);
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

        if (attr.annotatable){
            enableAnnotation(attr.id);
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
    attr.layout = "line";
    attr.interpolate = "linear";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection){
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
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d[0])) ? 'hidden' : 'visible';
                    })
                    .attr("clip-path", "url(#clip)")
                    .on("mouseover", function(d, i){
                        d3.select(this).style("opacity", 0.25);
                        attr.tooltip.html(d[0].group)
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }).on("mousemove", function(d){
                        attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }).on("mouseout", function(d){
                        d3.select(this).style("opacity", attr.opacity);
                        attr.tooltip.style("opacity", 0);
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
                        attr.tooltip.html(attr.label(d, i))
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }).on("mousemove", function(d){
                        attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }).on("mouseout", function(d){
                        d3.select(this).style("opacity", attr.opacity);
                        attr.tooltip.style("opacity", 0);
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

        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.annotatable){
            enableAnnotation(attr.id);
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
    var attr = attributeConstructor('pie');
    attr.aggregate = function(x){ return(x[0]); }
    attr.radius = "auto";
    attr.inner = "auto";
    attr = _.extend(attr, attributes);


    // generator
    function go(selection){
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (attr.width == "auto") ? (parseInt(selection.style("width")) - attr.margin.left - attr.margin.right) : attr.width;
        var h = (attr.height == "auto") ? (parseInt(selection.style("height")) - attr.margin.top - attr.margin.bottom) : attr.height;
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
        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-pie")
            .attr("id", quorra.uuid())
            .attr("width", w + attr.margin.left + attr.margin.right)
            .attr("height", h + attr.margin.top + attr.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + (w + attr.margin.left + attr.margin.right) / 2 + "," + (h + attr.margin.top + attr.margin.bottom) / 2 + ")");

        var arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius(ir);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d){ return d.x; });

        // coloring
        var color = parameterizeColorPallete(newdata, attr);

        // construct legend
        var legend = legendConstructor(svg, attr, w, h, color);

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
                if (attr.tooltip == false) { return 0; }
                attr.tooltip.html(attr.label(d.data, i))
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mousemove", function(d){
                if (attr.tooltip == false) { return 0; }
                attr.tooltip
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", attr.opacity);
                if (attr.tooltip == false) { return 0; }
                attr.tooltip.style("opacity", 0);
            }).on("click", attr.labelclick);

        // expose editable attributes (user control)
        go.svg = svg;
        go.legend = legend;
        go.arc = g;
        go.innerWidth = w;
        go.innerHeight = h;
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};quorra.scatter = function(attributes) {
    /**
    quorra.scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
    attr.lm = false; // options are "smooth", "poly-x" (x is order), and "linear"
    attr.xdensity = false;
    attr.ydensity = false;
    attr.xjitter = 0;
    attr.yjitter = 0;
    attr.size = 5;
    attr = _.extend(attr, attributes);


    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);
        
        // transform data (if transformation function is applied)
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

            // plotting points
            var dot = svg.selectAll(".dot")
                .data(newdata)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", attr.size)
                .attr("cx", function(d, i) {
                    return (quorra.random()-0.5)*attr.xjitter + axes.xScale(attr.x(d, i));
                })
                .attr("cy", function(d, i) {
                    return (quorra.random()-0.5)*attr.yjitter + axes.yScale(attr.y(d, i));
                })
                .style("fill", function(d, i) { return color(attr.group(d, i)); })
                .style("opacity", attr.opacity)
                .style("visibility", function(d){
                    return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
                })
                .attr("clip-path", "url(#clip)")
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    attr.tooltip.html(attr.label(d, i))
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mousemove", function(d){
                    attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", attr.opacity);
                    attr.tooltip.style("opacity", 0);
                });

            // generating density ticks (if specified)
            if (attr.xdensity){
                svg.selectAll(".xtick")
                    .data(newdata)
                    .enter().append("line")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", function(d, i){
                        return "xtick " + "g_" + d.group;
                    })
                    .attr("x1", function(d, i) { return axes.xScale(attr.x(d, i)); })
                    .attr("x2", function(d, i) { return axes.xScale(attr.x(d, i)); })
                    .attr("y1", function(d, i) { return dim.innerHeight; })
                    .attr("y2", function(d, i) { return dim.innerHeight-10; })
                    .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
                    });
                    // TODO: maybe include two-way selection/highlighting here?
            }
            if (attr.ydensity){
                svg.selectAll(".ytick")
                    .data(newdata)
                    .enter().append("line")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", function(d, i){
                        return "ytick " + "g_" + d.group;
                    })
                    .attr("x1", function(d, i) { return 0; })
                    .attr("x2", function(d, i) { return 10; })
                    .attr("y1", function(d, i) { return axes.yScale(attr.y(d, i)); })
                    .attr("y2", function(d, i) { return axes.yScale(attr.y(d, i)); })
                    .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
                    });
            }

            // generating regression line with smoothing curve (if specified)
            if (attr.lm != false){
                console.log("Not yet implemented!");
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

        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.annotatable){
            enableAnnotation(attr.id);
        }

        if (attr.glyphs){
            enableGlyphs(attr.id);
        }
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};

quorra.version = "0.0.1";

window.quorra = quorra;

})();