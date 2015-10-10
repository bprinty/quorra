/* quorra version 0.0.1 (http://bprinty.github.io/quorra) 2015-10-10 */
(function(){
function quorra() {
    /**
    quorra()

    Base class for all visualization components.

    @author <bprinty@gmail.com>
    */
}


attributeConstructor = function(id){
    /**
    attributeConstructor()

    Return dictionary with common quorra attributes. This
    is for cutting down code duplication.

    @author <bprinty@gmail.com>
    */

    id = typeof id !== 'undefined' ?  id : 'qplot';
    return {
        // sizing
        id: id,
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 20, "left": 40, "right": 20},
        
        // data rendering
        x: function(d, i) { return d.x; },
        y: function(d, i) { return d.y; },
        group: function(d, i){ return (typeof d.group === 'undefined') ? 0 : d.group; },
        label: function(d, i){ return (typeof d.label === 'undefined') ? i : d.label; },
        transform: function(d){ return d; },

        // triggers
        groupclick: function(d, i){},
        labelclick: function(d, i){},
        
        // plot styling
        color: d3.scale.category10(),
        grid: false,
        xlabel: "",
        ylabel: "",
        xformat: "auto",
        yformat: "auto",
        xorient: "bottom",
        yorient: "left",
        xticks: "auto",
        yticks: "auto",
        
        // legend
        legend: true,
        lmargin: {"top": 0, "bottom": 0, "left": 0, "right": 0},
        lposition: "inner",
        lshape: "square",
        toggle: true,
        
        // tooltip
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
            attributes[i] = value;
            return constructor;
        }        
    });
}

legendConstructor = function(svg, attr, innerWidth, innerHeight){
    /**
    quorra.legendConstructor()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */

    if (!attr.legend){ return undefined; }

    var leg = svg.selectAll(".legend")
        .data(attr.color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("id", attr.id + "-legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    var selector;
    if (attr.lshape === "square"){
        selector = leg.append("rect")
            .attr("class", "selector")
            .attr("x", attr.lmargin.left + innerWidth - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", attr.color);        
    }else if (attr.lshape === "circle"){
        selector = leg.append("circle")
            .attr("class", "selector")
            .attr("cx", innerWidth - 10)
            .attr("cy", 8)
            .attr("r", 9)
            .style("fill", attr.color);
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
            }else{
                d3.select(this).style('fill-opacity', 0);
                svg.selectAll(".g_" + d).style('visibility', 'hidden');
            }
        });
    }

    leg.append("text")
        .attr("x", function(){
            if (attr.lposition === "inner"){
                return innerWidth - 24;
            }else if (attr.lposition === "outer"){
                return innerWidth + 2;
            }        
        })
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", function(){
            if (attr.lposition === "inner"){
                return "end";
            }else if (attr.lposition === "outer"){
                return "beginning";
            }
        })
        .text(function(d) { return d; });

    return leg;
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
        yScale.domain(d3.extent(data, attr.y)).nice();
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

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(xAxis)
    .append("text")
        .attr("class", "label")
        .attr("x", innerWidth)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(attr.xlabel);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
    .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(attr.ylabel);

    return;
}


initializeCanvas = function(selection, attr, innerWidth, innerHeight){
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

    svg = svg.attr("class", "quorra-bar")
        .attr("width", innerWidth + attr.margin.left + attr.margin.right)
        .attr("height", innerHeight + attr.margin.top + attr.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + attr.margin.left + "," + attr.margin.top + ")");

    return svg;
}

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
    var attr = attributeConstructor('bar');
    attr.layout = "stacked";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (attr.width == "auto") ? (parseInt(selection.style("width")) - attr.margin.left - attr.margin.right) : attr.width;
        var h = (attr.height == "auto") ? (parseInt(selection.style("height")) - attr.margin.top - attr.margin.bottom) : attr.height;
        
        // transform data (if transformation function is applied)
        // this is used for histogram plots
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr, w, h);

        // configure axes
        var axes = parameterizeAxes(selection, newdata, attr, w, h);

        // axes
        drawAxes(svg, attr, axes.xAxis, axes.yAxis, w, h);
        
        // construct legend
        var legend = legendConstructor(svg, attr, w, h);

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
            .attr("class","layer");
        
        var rect = layer.selectAll("rect")
            .data(function(d){ return d; })
            .enter().append("rect")
            .attr("class", function(d, i){
                return "bar " + "g_" + d.group;
            })
            .attr("x", function(d, i){
                if (attr.layout == "stacked"){
                    return axes.xScale(attr.x(d, i));    
                }else{
                    return axes.xScale(attr.x(d, i)) + attr.color.range().indexOf(attr.color(d.group))*w/newdata.length;
                }
            })
            // NOTE: this needs to be fixed so that y0 is 
            // parameterized before this takes place.
            .attr("y", function(d, i){ return (attr.layout == "stacked") ? axes.yScale(d.y0 + d.y) : axes.yScale(d.y); })
            .attr("height", function(d, i){ return (attr.layout == "stacked") ? (axes.yScale(d.y0) - axes.yScale(d.y0 + d.y)) : (h - axes.yScale(d.y)); })
            .attr("width", function(){
                if (attr.layout == "stacked"){
                    var xlim = _.max(_.map(layers, function(d){ return d.length; }));
                    return (w-xlim)/xlim;
                }else{
                    return (w-newdata.length)/newdata.length;
                }
            }).attr("fill", function(d, i){ return attr.color(d.group); })
            .style("opacity", 0.75)
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
                d3.select(this).style("opacity", 0.75);
                attr.tooltip.style("opacity", 0);
            });

        // expose editable attributes (user control)
        go.svg = svg;
        go.legend = legend;
        go.xScale = axes.xScale;
        go.xAxis = axes.xAxis;
        go.xGroups = axes.xGroups;
        go.yScale = axes.yScale;
        go.yAxis = axes.yAxis;
        go.yGroups = axes.yGroups;
        go.innerWidth = w;
        go.innerHeight = h;
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
            var format = d3.format(".04f");
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
                        d.y = d.y*100;
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

    // config display
    if (go.display() == "percent") {
        go = go.yformat(d3.format("%"));
    } else if (go.display() == "counts") {
        go = go.yformat(d3.format(".0f"));
    } else if (go.display() == "fraction"){
        go = go.yformat(d3.format(".02f"));
    }

    return go;
};quorra.line = function(attributes) {
    /**
    quorra.line()

    Line plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor('line');
    attr.points = 0;
    attr = _.extend(attr, attributes);

    // generator
    function go(selection){
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (attr.width == "auto") ? (parseInt(selection.style("width")) - attr.margin.left - attr.margin.right) : attr.width;
        var h = (attr.height == "auto") ? (parseInt(selection.style("height")) - attr.margin.top - attr.margin.bottom) : attr.height;
        
        // transform data (if transformation function is applied)
        // this is used for density plots
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr, w, h);

        // configure axes
        var axes = parameterizeAxes(selection, newdata, attr, w, h);

        // axes
        drawAxes(svg, attr, axes.xAxis, axes.yAxis, w, h);
        
        // construct legend
        var legend = legendConstructor(svg, attr, w, h);

        // plotting lines
        var line = d3.svg.line()
            .x(function(d, i) { return axes.xScale(attr.x(d, i)); })
            .y(function(d, i) { return axes.yScale(attr.y(d, i)); });
        
        var ugrps = _.unique(_.map(newdata, function(d){ return d.group; }));
        for (var grp in ugrps) {
            
            // lines
            var subdat = _.filter(newdata, function(d){ return d.group == ugrps[grp]; });
            svg.append("path")
                .datum(subdat)
                .attr("class", function(d, i){
                    return "line " + "g_" + d[0].group;
                })
                .attr("d", line)
                .style("stroke", attr.color(ugrps[grp]))
                .style("opacity", 0.75)
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
                    d3.select(this).style("opacity", 0.75);
                    attr.tooltip.style("opacity", 0);
                }).on("click", attr.groupclick);

        }

        // points (if specified)
        if (attr.points > 0){
            svg.selectAll(".dot")
                .data(newdata)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", attr.points)
                .attr("cx", function(d, i) { return axes.xScale(attr.x(d, i)); })
                .attr("cy", function(d, i) { return axes.yScale(attr.y(d, i)); })
                .style("fill", function(d, i){ return attr.color(attr.group(d, i)); })
                .style("opacity", 0.75)
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
                    d3.select(this).style("opacity", 0.75);
                    attr.tooltip.style("opacity", 0);
                }).on("click", attr.labelclick);
        }

        // expose editable attributes (user control)
        go.svg = svg;
        go.legend = legend;
        go.xScale = axes.xScale;
        go.xAxis = axes.xAxis;
        go.xGroups = axes.xGroups;
        go.yScale = axes.yScale;
        go.yAxis = axes.yAxis;
        go.yGroups = axes.yGroups;
        go.innerWidth = w;
        go.innerHeight = h;
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

        // construct legend
        var legend = legendConstructor(svg, attr, w, h);

        // plot
        var g = svg.selectAll(".arc")
            .data(pie(newdata))
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return attr.color(attr.group(d.data, i)); })
            .style("opacity", 0.75)
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
                d3.select(this).style("opacity", 0.75);
                if (attr.tooltip == false) { return 0; }
                attr.tooltip.style("opacity", 0);
            });

        // legend (if specified)
        if (attr.legend) {
            g.append("text")
                .attr("class", "axis")
                .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function(d) { return attr.group(d.data, i); });
        }

        // expose editable attributes (user control)
        go.svg = svg;
        go.legend = legend;
        go.arc = arc;
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
    var attr = attributeConstructor('scatter');
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

        // if height/width are auto, determine them from selection
        var w = (attr.width === 'auto') ? (parseInt(selection.style("width")) - attr.margin.left - attr.margin.right) : attr.width;
        var h = (attr.height === 'auto') ? (parseInt(selection.style("height")) - attr.margin.top - attr.margin.bottom) : attr.height;
        
        // transform data (if transformation function is applied)
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr, w, h);

        // configure axes
        var axes = parameterizeAxes(selection, newdata, attr, w, h);

        // axes
        drawAxes(svg, attr, axes.xAxis, axes.yAxis, w, h);
        
        // construct legend
        var legend = legendConstructor(svg, attr, w, h);

        // plotting points
        svg.selectAll(".dot")
            .data(newdata)
            .enter().append("circle")
            .attr("class", function(d, i){
                return "dot " + "g_" + d.group;
            })
            .attr("r", attr.size)
            .attr("cx", function(d, i) { return (Math.random()-0.5)*attr.xjitter + axes.xScale(attr.x(d, i)); })
            .attr("cy", function(d, i) { return (Math.random()-0.5)*attr.yjitter + axes.yScale(attr.y(d, i)); })
            .style("fill", function(d, i) { return attr.color(attr.group(d, i)); })
            .style("opacity", 0.75)
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
                d3.select(this).style("opacity", 0.75);
                attr.tooltip.style("opacity", 0);
            });

        // generating density ticks (if specified)
        if (attr.xdensity){
            svg.selectAll(".xtick")
                .data(newdata)
                .enter().append("line")
                .attr("class", function(d, i){
                    return "xtick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return axes.xScale(attr.x(d, i)); })
                .attr("x2", function(d, i) { return axes.xScale(attr.x(d, i)); })
                .attr("y1", function(d, i) { return h-5; })
                .attr("y2", function(d, i) { return h+5; })
                .attr("stroke", function(d, i){ return attr.color(attr.group(d, i)); })
                .style("opacity", 0.75);
                // TODO: maybe include two-way selection/highlighting here?
        }
        if (attr.ydensity){
            svg.selectAll(".ytick")
                .data(newdata)
                .enter().append("line")
                .attr("class", function(d, i){
                    return "ytick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return -5; })
                .attr("x2", function(d, i) { return 5; })
                .attr("y1", function(d, i) { return axes.yScale(attr.y(d, i)); })
                .attr("y2", function(d, i) { return axes.yScale(attr.y(d, i)); })
                .attr("stroke", function(d, i){ return attr.color(attr.group(d, i)); })
                .style("opacity", 0.75);
        }

        // generating regression line with smoothing curve (if specified)
        if (attr.lm != false){
            console.log("Not yet implemented!");
        }

        // expose editable attributes (user control)
        go.svg = svg;
        go.legend = legend;
        go.xScale = axes.xScale;
        go.xAxis = axes.xAxis;
        go.xGroups = axes.xGroups;
        go.yScale = axes.yScale;
        go.yAxis = axes.yAxis;
        go.yGroups = axes.yGroups;
        go.innerWidth = w;
        go.innerHeight = h;
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};

quorra.version = "0.0.1";

window.quorra = quorra;

})();