quorra.line = function(attributes) {
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
                .attr("class", "line")
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
                });

        }

        // points (if specified)
        if (attr.points > 0){
            svg.selectAll(".dot")
                .data(newdata)
                .enter().append("circle")
                .attr("class", "dot")
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
                });
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