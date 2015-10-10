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

        // transform data (if transformation function is applied)
        // this is used for density plots
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr);

        // determine inner dimensions for plot
        var dim = parameterizeInnerDimensions(selection, attr);

        // configure axes
        var axes = parameterizeAxes(selection, newdata, attr, dim.innerWidth, dim.innerHeight);

        // axes
        drawAxes(svg, attr, axes.xAxis, axes.yAxis, dim.innerWidth, dim.innerHeight);
        
        // construct legend
        var legend = legendConstructor(svg, attr, dim.innerWidth, dim.innerHeight);

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
        go.innerWidth = dim.innerWidth;
        go.innerHeight = dim.innerHeight;
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};