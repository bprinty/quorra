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
    
    var cl = (data.group == null) ? 'annotation ' + data.type : 'annotation text g_' + data.group;
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

legendConstructor = function(svg, attr, innerWidth, innerHeight, color){
    /**
    quorra.legendConstructor()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */

    if (!attr.legend){ return undefined; }

    var leg;
    // we have to use a set interval here, because
    // sometimes the plot isn't rendered before this method is called
    var ival = setInterval(function(){
        
        if (d3.select('#' + svg.node().parentNode.id)[0][0] == null){
            return;
        }
        leg = d3.select('#' + svg.node().parentNode.id)
            .append("g")
            .attr("transform", "translate(" + attr.margin.left + "," + attr.margin.top + ")")
            .selectAll(".legend")
            .data(color.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("id", attr.id + "-legend")
            .attr("transform", function(d, i) { return "translate(0," + (attr.lmargin.top + i * 20) + ")"; });

        var selector;
        if (attr.lshape === "square"){
            selector = leg.append("rect")
                .attr("class", "selector")
                .attr("x", innerWidth - 18 - attr.lmargin.right + attr.lmargin.left)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", color)
                .style("fill-opacity", function(d){
                    return _.contains(attr.toggled, d) ? 0 : 1;
                });        
        }else if (attr.lshape === "circle"){
            selector = leg.append("circle")
                .attr("class", "selector")
                .attr("cx", innerWidth - 10 - attr.lmargin.right + attr.lmargin.left)
                .attr("cy", 8)
                .attr("r", 9)
                .style("fill", color)
                .style("fill-opacity", function(d){
                    return _.contains(attr.toggled, d) ? 0 : 1;
                });
        }

        if (attr.toggle){
            selector.on("mouseover", function(d, i){
                d3.select(this).style('opacity', 0.75);
            }).on("mouseout", function(d, i){
                d3.select(this).style('opacity', 1);
            }).on("click", function(d, i){
                if (d3.select(this).style('fill-opacity') == 0){
                    d3.select(this).style('fill-opacity', 1);
                    svg.selectAll(".g_" + d).style('visibility', 'visible');
                    attr.toggled = _.without(attr.toggled, d);
                }else{
                    d3.select(this).style('fill-opacity', 0);
                    svg.selectAll(".g_" + d).style('visibility', 'hidden');
                    attr.toggled = _.union(attr.toggled, [d]);
                }
            });
        }

        leg.append("text")
            .attr("x", function(){
                if (attr.lposition === "inside"){
                    return innerWidth - 24 - attr.lmargin.right + attr.lmargin.left;
                }else if (attr.lposition === "outside"){
                    return innerWidth + 2 - attr.lmargin.right + attr.lmargin.left;
                }        
            })
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", function(){
                if (attr.lposition === "inside"){
                    return "end";
                }else if (attr.lposition === "outside"){
                    return "beginning";
                }
            })
            .text(function(d) { return d; });

        clearInterval(ival);
    }, 100);

    return leg;
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
        .attr("id", quorra.uuid())
        .attr("class", "quorra-" + attr.id)
        .attr("width", attr.width)
        .attr("height", attr.height)
        .on("click", attr.plotclick)
        .append("g")
        .attr("transform", "translate(" + attr.margin.left + "," + attr.margin.top + ")");

    return svg;
}


annotationConstructor = function(selection, attr, xScale, yScale){
    /**
    quorra.initializeCanvas()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
    */

    if (attr.annotation == false){ return false; }

    if (!Array.isArray(attr.annotation)){
        attr.annotation = [attr.annotation]
    }
    _.map(attr.annotation, function(d){
        d = _.extend({
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
        d3.selectAll('.annotation#' + d.id).remove();
        shapeAnnotation(
            selection,
            xScale(d.x),
            yScale(d.y),
            d
        ).attr("clip-path", "url(#clip)")
        .style("visibility", function(d){
            return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
        });
        if (d.text != ''){
            textAnnotation(
                selection,
                xScale(d.x) + d['text-position'].x,
                yScale(d.y) - d['text-position'].y,
                d
            ).attr("clip-path", "url(#clip)")
            .style("visibility", function(d){
                return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
            });
        }
        return;
    });
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

    // set up default translation
    quorra.controller[id].xdrag = quorra.controller[id].xstack[0];
    quorra.controller[id].ydrag = quorra.controller[id].ystack[0];

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
            if (!quorra.keys.Shift){
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
            if (quorra.keys.Shift){
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
        quorra.controller[id].render(quorra.controller[id].xstack[l-1].domain(), quorra.controller[id].ystack[l-1].domain());
        quorra.controller[id].xdrag = quorra.controller[id].xstack[l-1];
        quorra.controller[id].ydrag = quorra.controller[id].ystack[l-1];
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
    
    var l = quorra.controller[id].xstack.length;
    var xscale = quorra.controller[id].xstack[l-1];
    var yscale = quorra.controller[id].ystack[l-1]
    var xmap = d3.scale.linear().domain(xscale.range()).range(xscale.domain());
    var ymap = d3.scale.linear().domain(yscale.range()).range(yscale.domain());
    
    quorra.controller[id].svg.on('click', function(){
        if (quorra.keys.Shift && quorra.keys.A){
            var coordinates = d3.mouse(quorra.controller[id].svg.node());
            coordinates[0] = coordinates[0];
            coordinates[1] = coordinates[1];

            var d = {
                x: xmap(coordinates[0] - quorra.controller[id].left),
                y: ymap(coordinates[1] + quorra.controller[id].top),
            }
            d.id = triggers.id(d);
            d.type = triggers.type(d);
            d.text = triggers.text(d);
            d.click = triggers.click;
            d.style = triggers.style(d);
            d.size = triggers.size(d);
            d.group = triggers.group(d);
            d['text-size'] = triggers['text-size'](d);
            d['text-position'] = triggers['text-size'](d);
            var l = quorra.controller[id].xstack.length;
            var scaled = {
                x: xscale(triggers.x(d)) + quorra.controller[id].left,
                y: yscale(triggers.y(d)) - quorra.controller[id].top,
            }

            shapeAnnotation(
                quorra.controller[id].svg,
                scaled.x,
                scaled.y,
                d
            ).attr("clip-path", "url(#clip)");

            if (d.text != ''){
                textAnnotation(
                    quorra.controller[id].svg,
                    xscale(d.x) + triggers['text-position'](d).x + quorra.controller[id].left,
                    yscale(d.y) - triggers['text-position'](d).y - quorra.controller[id].top,
                    d
                ).attr("clip-path", "url(#clip)");
            }
            d.x = xmap(scaled.x - quorra.controller[id].left);
            d.y = ymap(scaled.y - quorra.controller[id].top);
            if (quorra.controller[id].attr.annotation){
                quorra.controller[id].attr.annotation.push(d);
            }else{
                quorra.controller[id].attr.annotation = [d];
            }
        }
    });
}



