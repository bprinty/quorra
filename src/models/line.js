quorra.line = function(attributes) {
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

        // construct legend
        var legend = legendConstructor(svg, attr, dim.innerWidth, dim.innerHeight, color);

        var axes, line, dot;
        function render(xrange, yrange){

            // clean previous rendering
            svg.selectAll("*").remove();

            // configure axes
            attr.xrange = xrange;
            attr.yrange = yrange;
            axes = parameterizeAxes(selection, newdata, attr, dim.innerWidth, dim.innerHeight);

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
            var annotation = annotationConstructor(svg, attr, axes.xScale, axes.yScale);
        }
        render(attr.xrange, attr.yrange);

        // bind attributes to controller
        quorra.controller[attr.id] = {
            x: attr.margin.left,
            y: attr.margin.top,
            left: attr.margin.left,
            top: attr.margin.top,
            xstack: [axes.xScale],
            ystack: [axes.yScale],
            render: render,
            svg: selection.select('svg'),
            attr: attr 
        }
        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.annotatable){
            enableAnnotation(attr.id);
        }

        // expose editable attributes (user control)
        go.render = render;
        go.svg = svg;
        go.line = line;
        go.dot = dot;
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