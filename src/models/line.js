quorra.line = function() {
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
};