quorra.scatter = function() {
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