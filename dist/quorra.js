/* quorra version 0.0.1 (http://bprinty.github.io/quorra) 2015-10-06 */
(function(){
function quorra() {
    /**
    quorra()

    Base class for all visualization components.

    @author <bprinty@gmail.com>
    */
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
}quorra.bar = function() {
    /**
    quorra.bar()

    Bar plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3943967

    @author <bprinty@gmail.com>
    */

    // attributes
    var width = "auto";
    var height = "auto";
    var margin = {"top": 20, "bottom": 20, "left": 40, "right": 20};
    var color = d3.scale.category10();
    var x = function(d, i) { return d.x; };
    var y = function(d, i) { return d.y; };
    var group = function(d, i){ return (typeof d.group === 'undefined') ? 0 : d.group; };
    var label = function(d, i){ return (typeof d.label === 'undefined') ? i : d.label; };
    var transform = function(d){ return d; };
    var grid = false;
    var xlabel = "";
    var ylabel = "";
    var xformat = "auto";
    var yformat = "auto";
    var legend = true;
    var xticks = "auto";
    var yticks = "auto";
    var layout = "stacked";
    var tooltip = d3.select("body").append("div")
            .attr("id", "bar-tooltip")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0);

    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (width == "auto") ? (parseInt(selection.style("width")) - margin.left - margin.right) : width;
        var h = (height == "auto") ? (parseInt(selection.style("height")) - margin.top - margin.bottom) : height;
        
        // transform data (if transformation function is applied)
        // this is used for histogram plots
        var newdata = transform(selection.data()[0]);

        // configure axes
        var xScale, yScale;
        var xGroups, yGroups;
        if (typeof newdata[0].x === 'string') {
            xGroups = _.unique(_.map(selection.data()[0], function(d){ return d.x; }));
            xScale = d3.scale.ordinal().range([0, w]);
            xScale.domain(xGroups).rangePoints(xScale.range(), 1);
        }else{
            xScale = d3.scale.linear().range([0, w]);
            // manually set the domain here because it needs to 
            // be aware of the newdata object (histogram plots)
            // and x axis tweaks for histogram objects
            var xmax;
            if (typeof go.bins === 'function') {
                xmax = _.max(xScale.ticks(go.bins()));
            } else {
                xmax = _.max(_.map(newdata, function(d){ return d.x; }));
            }
            xScale.domain([
                _.min(_.map(newdata, function(d){ return d.x; })),
                xmax
            ]).nice();
        }
        if (typeof newdata[0].y === 'string') {
            yGroups = _.unique(_.map(newdata, function(d){ return d.y; }));
            yScale = d3.scale.ordinal().range([h, 0]);
            yScale.domain(yGroups).rangePoints(yScale.range(), 1);
        }else{
            yScale = d3.scale.linear().range([h, 0]);
            // manually set the domain here because it needs to 
            // be aware of the newdata object (histogram plots)
            yScale.domain([
                _.min(_.map(newdata, function(d){ return d.y; })),
                _.max(_.map(newdata, function(d){ return d.y; }))
            ]).nice();
        }
        var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
        if (xticks != "auto") {
            xAxis = xAxis.ticks(xticks);
        }
        var yAxis = d3.svg.axis().scale(yScale).orient("left");
        if (yticks != "auto") {
            yAxis = yAxis.ticks(yticks);
        }
        if (xformat != "auto"){
            xAxis = xAxis.tickFormat(xformat);
        }
        if (yformat != "auto"){
            yAxis = yAxis.tickFormat(yformat);
        }

        // initialize canvas
        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-bar")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // gridlines (if specified)
        if (grid){
            xAxis = xAxis.tickSize(-h, 0, 0);
            yAxis = yAxis.tickSize(-w, 0, 0);
        }

        // axes
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis)
        .append("text")
            .attr("class", "label")
            .attr("x", w)
            .attr("y", -6)
            .style("text-anchor", "end")
            .text(xlabel);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
        .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(ylabel);
        
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
            .attr("x", function(d, i){
                if (layout == "stacked"){
                    return xScale(x(d, i));    
                }else{
                    return xScale(x(d, i)) + color.range().indexOf(color(d.group))*w/newdata.length;
                }
            })
            // NOTE: this needs to be fixed so that y0 is 
            // parameterized before this takes place.
            .attr("y", function(d, i){ return (layout == "stacked") ? yScale(d.y0 + d.y) : yScale(d.y); })
            .attr("height", function(d, i){ return (layout == "stacked") ? (yScale(d.y0) - yScale(d.y0 + d.y)) : (h - yScale(d.y)); })
            .attr("width", function(){
                if (layout == "stacked"){
                    var xlim = _.max(_.map(layers, function(d){ return d.length; }));
                    return (w-xlim)/xlim;
                }else{
                    return (w-newdata.length)/newdata.length;
                }
            }).attr("fill", function(d, i){ return color(d.group); })
            .style("opacity", 0.75)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                tooltip.html(d.label)
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

        // legend (if specified)
        if (legend) {
            var leg = svg.selectAll(".legend")
                .data(color.domain())
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            leg.append("rect")
                .attr("x", w - 18)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", color);

            leg.append("text")
                .attr("x", w - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function(d) { return d; });
        }
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
    go.y = function(value) {
        if (!arguments.length) return y;
        y = value;
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
    go.grid = function(value) {
        if (!arguments.length) return grid;
        grid = value;
        return go;
    };
    go.xticks = function(value) {
        if (!arguments.length) return xticks;
        xticks = value;
        return go;
    };
    go.yticks = function(value) {
        if (!arguments.length) return yticks;
        yticks = value;
        return go;
    };
    go.xformat = function(value) {
        if (!arguments.length) return xformat;
        xformat = value;
        return go;
    };
    go.yformat = function(value) {
        if (!arguments.length) return yformat;
        yformat = value;
        return go;
    };
    go.xlabel = function(value) {
        if (!arguments.length) return xlabel;
        xlabel = value;
        return go;
    };
    go.ylabel = function(value) {
        if (!arguments.length) return ylabel;
        ylabel = value;
        return go;
    };
    go.legend = function(value) {
        if (!arguments.length) return legend;
        legend = value;
        return go;
    };
    go.transform = function(value) {
        if (!arguments.length) return transform;
        transform = value;
        return go;
    };
    go.layout = function(value) {
        if (!arguments.length) return layout;
        layout = value;
        return go;
    };
    go.tooltip = function(value) {
        if (!arguments.length) return tooltip;
        tooltip.remove();
        tooltip = value;
        return go;
    };

    return go;
};quorra.density = function() {
    /**
    quorra.density()

    Density plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var resolution = 10;
    var tooltip = d3.select("body").append("div")
        .attr("id", "density-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.line()
        .tooltip(tooltip)
        .transform(function(data){
        
        // generate kde scaling function
        var format = d3.format(".04f");
        var xScale = d3.scale.linear().range([0, go.w]);
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

    // getters/setters
    go.resolution = function(value) {
        if (!arguments.length) return resolution;
        resolution = value;
        return go;
    };

    return go;
};quorra.histogram = function() {
    /**
    quorra.histogram()

    Histogram. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var bins = 10;
    var display = 'counts'; // fraction, percent, counts
    var tooltip = d3.select("body").append("div")
        .attr("id", "histogram-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.bar()
        .tooltip(tooltip)
        .transform(function(data){
        
        // formatters
        var format = d3.format(".04f");
        var xScale = d3.scale.linear().range([0, go.w]);

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
                } else if (display == 'percent'){
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
    if (display == "percent") {
        go = go.yformat(d3.format("%"));
    } else if (display == "counts") {
        go = go.yformat(d3.format(".0f"));
    } else if (display == "fraction"){
        go = go.yformat(d3.format(".02f"));
    }

    // getters/setters
    go.bins = function(value) {
        if (!arguments.length) return bins;
        bins = value;
        return go;
    };
    go.display = function(value) {
        if (!arguments.length) return display;
        display = value;
        return go;
    };

    return go;
};quorra.line = function() {
    /**
    quorra.line()

    Line plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var width = "auto";
    var height = "auto";
    var margin = {"top": 20, "bottom": 20, "left": 40, "right": 20};
    var color = d3.scale.category10();
    var x = function(d, i) { return d.x; };
    var y = function(d, i) { return d.y; };
    var group = function(d, i){ return (typeof d.group == "undefined") ? 0 : d.group; };
    var label = function(d, i){ return (typeof d.label == "undefined") ? i : d.label; };
    var transform = function(d){ return d; };
    var grid = false;
    var xlabel = "";
    var ylabel = "";
    var xformat = "auto";
    var yformat = "auto";
    var legend = true;
    var points = 0;
    var xticks = "auto";
    var yticks = "auto";
    var tooltip = d3.select("body").append("div")
            .attr("id", "line-tooltip")
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
        var newdata = transform(selection.data()[0]);

        // configure axes
        var xScale, yScale;
        var xGroups, yGroups;
        if (typeof newdata[0].x === 'string') {
            xGroups = _.unique(_.map(selection.data()[0], function(d){ return d.x; }));
            xScale = d3.scale.ordinal().range([0, w]);
            xScale.domain(xGroups).rangePoints(xScale.range(), 1);
        }else{
            xScale = d3.scale.linear().range([0, w]);
            // manually set the domain here because it needs to 
            // be aware of the newdata object (density plots)
            xScale.domain([
                _.min(_.map(newdata, function(d){ return d.x; })),
                _.max(_.map(newdata, function(d){ return d.x; }))
            ]).nice();
        }
        if (typeof newdata[0].y === 'string') {
            yGroups = _.unique(_.map(newdata, function(d){ return d.y; }));
            yScale = d3.scale.ordinal().range([h, 0]);
            yScale.domain(yGroups).rangePoints(yScale.range(), 1);
        }else{
            yScale = d3.scale.linear().range([h, 0]);
            // manually set the domain here because it needs to 
            // be aware of the newdata object (density plots)
            yScale.domain([
                _.min(_.map(newdata, function(d){ return d.y; })),
                _.max(_.map(newdata, function(d){ return d.y; }))
            ]).nice();
        }
        var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
        if (xticks != "auto") {
            xAxis = xAxis.ticks(xticks);
        }
        var yAxis = d3.svg.axis().scale(yScale).orient("left");
        if (yticks != "auto") {
            yAxis = yAxis.ticks(yticks);
        }
        if (xformat != "auto"){
            xAxis = xAxis.tickFormat(xformat);
        }
        if (yformat != "auto"){
            yAxis = yAxis.tickFormat(yformat);
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

        // gridlines (if specified)
        if (grid){
            xAxis = xAxis.tickSize(-h, 0, 0);
            yAxis = yAxis.tickSize(-w, 0, 0);
        }

        // axes
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis)
        .append("text")
            .attr("class", "label")
            .attr("x", w)
            .attr("y", -6)
            .style("text-anchor", "end")
            .text(xlabel);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
        .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(ylabel);

        // plotting lines
        var line = d3.svg.line()
            .x(function(d, i) { return xScale(x(d, i)); })
            .y(function(d, i) { return yScale(y(d, i)); });
        
        var ugrps = _.unique(_.map(newdata, function(d){ return d.group; }));
        for (var grp in ugrps) {
            
            // lines
            var subdat = _.filter(newdata, function(d){ return d.group == ugrps[grp]; });
            svg.append("path")
                .datum(subdat)
                .attr("class", "line")
                .attr("d", line)
                .style("stroke", color(ugrps[grp]))
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

        }

        // points (if specified)
        if (points > 0){
            svg.selectAll(".dot")
                .data(newdata)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("r", points)
                .attr("cx", function(d, i) { return xScale(x(d, i)); })
                .attr("cy", function(d, i) { return yScale(y(d, i)); })
                .style("fill", function(d, i){ return color(group(d, i)); })
                .style("opacity", 0.75)
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    tooltip.html(label(d, i))
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
        }

        // legend (if specified)
        if (legend) {
            var leg = svg.selectAll(".legend")
                .data(color.domain())
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            leg.append("rect")
                .attr("x", w - 18)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", color);

            leg.append("text")
                .attr("x", w - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function(d) { return d; });
        }
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
    go.y = function(value) {
        if (!arguments.length) return y;
        y = value;
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
    go.points = function(value) {
        if (!arguments.length) return points;
        points = value;
        return go;
    };
    go.grid = function(value) {
        if (!arguments.length) return grid;
        grid = value;
        return go;
    };
    go.xticks = function(value) {
        if (!arguments.length) return xticks;
        xticks = value;
        return go;
    };
    go.yticks = function(value) {
        if (!arguments.length) return yticks;
        yticks = value;
        return go;
    };
    go.xformat = function(value) {
        if (!arguments.length) return xformat;
        xformat = value;
        return go;
    };
    go.yformat = function(value) {
        if (!arguments.length) return yformat;
        yformat = value;
        return go;
    };
    go.xlabel = function(value) {
        if (!arguments.length) return xlabel;
        xlabel = value;
        return go;
    };
    go.ylabel = function(value) {
        if (!arguments.length) return ylabel;
        ylabel = value;
        return go;
    };
    go.legend = function(value) {
        if (!arguments.length) return legend;
        legend = value;
        return go;
    };
    go.transform = function(value) {
        if (!arguments.length) return transform;
        transform = value;
        return go;
    };
    go.tooltip = function(value) {
        if (!arguments.length) return tooltip;
        tooltip.remove();
        tooltip = value;
        return go;
    };

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
};quorra.pie = function() {
    /**
    quorra.pie()

    Pie chart. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */

    // attributes
    var radius = "auto";
    var inner = "auto";
    var width = "auto";
    var height = "auto";
    var margin = {"top": 20, "bottom": 20, "left": 20, "right": 20};
    var color = d3.scale.category10();
    var x = function(d, i) { return d.x; };
    var group = function(d, i){ return (typeof d.group == "undefined") ? i : d.group; };
    var label = function(d, i){ return (typeof d.label == "undefined") ? i : d.label[0]; };
    var aggregate = function(x){ return(x[0]); }
    var legend = true;
    var tooltip = d3.select("body").append("div")
            .attr("id", "pie-tooltip")
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
        var r = (radius == "auto") ? (Math.min(w, h) / 2) : radius;
        var ir = (inner == "auto") ? 0 : inner;

        // aggregate data
        var data = selection.data()[0];
        var newdata = [];
        var gps = _.unique(_.map(data, function(d){ return( d.group ); }));
        for (var i in gps){
            var subdat = _.filter(data, function(d){ return d.group == gps[i]; });
            newdata.push({
                x: aggregate(_.map(subdat, function(d){ return d.x; })),
                group: gps[i],
                label: _.map(subdat, function(d){ return d.label; })
            });
        }

        // initialize canvas
        var arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius(ir);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d){ return d.x; });

        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-pie")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + (w + margin.left + margin.right) / 2 + "," + (h + margin.top + margin.bottom) / 2 + ")");

        // plot
        var g = svg.selectAll(".arc")
            .data(pie(newdata))
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return color(group(d, i)); })
            .style("opacity", 0.75)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (tooltip == false) { return 0; }
                tooltip.html(label(d.data, i))
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mousemove", function(d){
                if (tooltip == false) { return 0; }
                tooltip
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", 0.75);
                if (tooltip == false) { return 0; }
                tooltip.style("opacity", 0);
            });

        // legend (if specified)
        if (legend) {
            g.append("text")
                .attr("class", "axis")
                .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function(d) { return group(d.data, i); });
        }
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
    go.radius = function(value) {
        if (!arguments.length) return radius;
        radius = value;
        return go;
    };
    go.inner = function(value) {
        if (!arguments.length) return inner;
        inner = value;
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
    go.aggregate = function(value) {
        if (!arguments.length) return aggregate;
        aggregate = value;
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
};quorra.scatter = function() {
    /**
    quorra.scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */

    // attributes
    var width = "auto";
    var height = "auto";
    var margin = {"top": 20, "bottom": 20, "left": 40, "right": 20};
    var color = d3.scale.category10();
    var x = function(d, i) { return d.x; };
    var y = function(d, i) { return d.y; };
    var group = function(d, i){ return (typeof d.group === 'undefined') ? 0 : d.group; };
    var label = function(d, i){ return (typeof d.label === 'undefined') ? i : d.label; };
    var size = function(d, i){ return (typeof d.size === 'undefined') ? 5 : d.size; };
    var shape = function(d, i){ return (typeof d.shape === 'undefined') ? "circle" : d.shape; };
    var lm = false; // options are "smooth", "poly-x" (x is order), and "linear"
    var grid = false;
    var xlabel = "";
    var ylabel = "";
    var xformat = "auto";
    var yformat = "auto";
    var legend = true;
    var xjitter = 0;
    var yjitter = 0;
    var xticks = "auto";
    var yticks = "auto";
    var xdensity = false;
    var ydensity = false;
    var tooltip = d3.select("body").append("div")
            .attr("id", "scatter-tooltip")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0);

    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (width === 'auto') ? (parseInt(selection.style("width")) - margin.left - margin.right) : width;
        var h = (height === 'auto') ? (parseInt(selection.style("height")) - margin.top - margin.bottom) : height;
        
        // configure axes
        var xScale, yScale;
        var xGroups, yGroups;
        if (typeof selection.data()[0][0].x === 'string') {
            xGroups = _.unique(_.map(selection.data()[0], function(d){ return d.x; }));
            xScale = d3.scale.ordinal().range([0, w]);
            xScale.domain(xGroups).rangePoints(xScale.range(), 1);
        }else{
            xScale = d3.scale.linear().range([0, w]);
            xScale.domain(d3.extent(data, x)).nice();
        }
        if (typeof selection.data()[0][0].y === 'string') {
            yGroups = _.unique(_.map(selection.data()[0], function(d){ return d.y; }));
            yScale = d3.scale.ordinal().range([h, 0]);
            yScale.domain(yGroups).rangePoints(yScale.range(),1);
        }else{
            yScale = d3.scale.linear().range([h, 0]);
            yScale.domain(d3.extent(data, y)).nice();
        }
        var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
        if (xticks != "auto") {
            xAxis = xAxis.ticks(xticks);
        }
        var yAxis = d3.svg.axis().scale(yScale).orient("left");
        if (yticks != "auto") {
            yAxis = yAxis.ticks(yticks);
        }
        if (xformat != "auto"){
            xAxis = xAxis.tickFormat(xformat);
        }
        if (yformat != "auto"){
            yAxis = yAxis.tickFormat(yformat);
        }

        // initialize canvas
        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-scatter")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // gridlines (if specified)
        if (grid){
            xAxis = xAxis.tickSize(-h, 0, 0);
            yAxis = yAxis.tickSize(-w, 0, 0);
        }

        // axes
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis)
        .append("text")
            .attr("class", "label")
            .attr("x", w)
            .attr("y", -6)
            .style("text-anchor", "end")
            .text(xlabel);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
        .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(ylabel);

        // plotting points
        svg.selectAll(".dot")
            .data(svg.data()[0])
            .enter().append("circle")
            .attr("class", "dot")
            .attr("r", size)
            .attr("cx", function(d, i) { return (Math.random()-0.5)*xjitter + xScale(x(d, i)); })
            .attr("cy", function(d, i) { return (Math.random()-0.5)*yjitter + yScale(y(d, i)); })
            .style("fill", function(d, i) { return color(group(d, i)); })
            .style("opacity", 0.75)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                tooltip.html(label(d, i))
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

        // generating density ticks (if specified)
        if (xdensity){
            svg.selectAll(".xtick")
                .data(svg.data()[0])
                .enter().append("line")
                .attr("class", "xtick")
                .attr("x1", function(d, i) { return xScale(x(d, i)); })
                .attr("x2", function(d, i) { return xScale(x(d, i)); })
                .attr("y1", function(d, i) { return h-5; })
                .attr("y2", function(d, i) { return h+5; })
                .attr("stroke", function(d, i){ return color(group(d, i)); })
                .style("opacity", 0.75);
                // TODO: maybe include two-way selection/highlighting here?
        }
        if (ydensity){
            svg.selectAll(".ytick")
                .data(svg.data()[0])
                .enter().append("line")
                .attr("class", "ytick")
                .attr("x1", function(d, i) { return -5; })
                .attr("x2", function(d, i) { return 5; })
                .attr("y1", function(d, i) { return yScale(y(d, i)); })
                .attr("y2", function(d, i) { return yScale(y(d, i)); })
                .attr("stroke", function(d, i){ return color(group(d, i)); })
                .style("opacity", 0.75);
        }

        // generating regression line with smoothing curve (if specified)
        if (lm != false){
            console.log("Not yet implemented!");
        }

        // legend (if specified)
        if (legend) {
            var leg = svg.selectAll(".legend")
                .data(color.domain())
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

            leg.append("rect")
                .attr("x", width - 18)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", color);

            leg.append("text")
                .attr("x", width - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function(d) { return d; });
        }
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
    go.y = function(value) {
        if (!arguments.length) return y;
        y = value;
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
    go.size = function(value) {
        if (!arguments.length) return size;
        size = value;
        return go;
    };
    go.shape = function(value) {
        if (!arguments.length) return shape;
        shape = value;
        return go;
    };
    go.lm = function(value) {
        if (!arguments.length) return lm;
        lm = value;
        return go;
    };
    go.grid = function(value) {
        if (!arguments.length) return grid;
        grid = value;
        return go;
    };
    go.xticks = function(value) {
        if (!arguments.length) return xticks;
        xticks = value;
        return go;
    };
    go.yticks = function(value) {
        if (!arguments.length) return yticks;
        yticks = value;
        return go;
    };
    go.xformat = function(value) {
        if (!arguments.length) return xformat;
        xformat = value;
        return go;
    };
    go.yformat = function(value) {
        if (!arguments.length) return yformat;
        yformat = value;
        return go;
    };
    go.xdensity = function(value) {
        if (!arguments.length) return xdensity;
        xdensity = value;
        return go;
    };
    go.ydensity = function(value) {
        if (!arguments.length) return ydensity;
        ydensity = value;
        return go;
    };
    go.xjitter = function(value) {
        if (!arguments.length) return xjitter;
        xjitter = value;
        return go;
    };
    go.yjitter = function(value) {
        if (!arguments.length) return yjitter;
        yjitter = value;
        return go;
    };
    go.xlabel = function(value) {
        if (!arguments.length) return xlabel;
        xlabel = value;
        return go;
    };
    go.ylabel = function(value) {
        if (!arguments.length) return ylabel;
        ylabel = value;
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
};

quorra.version = "0.0.1";

window.quorra = quorra;

})();