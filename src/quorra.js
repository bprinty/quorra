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
        .text(data.text);

    return text;
}


shapeAnnotation = function(svg, x, y, data){

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
        plotname: "quorra_plot",
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


enableZoom = function(id){
    /**
    quorra.enableZoom()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
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


enableGlyphs = function(id){

    
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
                                'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink',
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



