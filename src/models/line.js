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
    attr.size = 3;
    attr.layout = "line";
    attr.interpolate = "linear";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection) {
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
            scale: 1,
            time: Date.now(),
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
            if (attr.tooltip){
                attr.tooltip.style("opacity", 0);
            }

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
                    .style("stroke-width", attr.size)
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d[0])) ? 'hidden' : 'visible';
                    })
                    .attr("clip-path", "url(#clip)")
                    .on("mouseover", function(d, i){
                        d3.select(this).style("opacity", 0.25);
                        if (attr.tooltip){
                            attr.tooltip.html(d[0].group)
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mousemove", function(d){
                        if (attr.tooltip){
                            attr.tooltip
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mouseout", function(d){
                        d3.select(this).style("opacity", attr.opacity);
                        if (attr.tooltip){
                            attr.tooltip.style("opacity", 0);
                        }
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
                        if (attr.tooltip){
                            attr.tooltip.html(attr.label(d, i))
                                .style("opacity", 1)
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mousemove", function(d){
                        if (attr.tooltip){
                            attr.tooltip
                                .style("left", (d3.event.pageX + 5) + "px")
                                .style("top", (d3.event.pageY - 20) + "px");
                        }
                    }).on("mouseout", function(d){
                        d3.select(this).style("opacity", attr.opacity);
                        if (attr.tooltip){
                            attr.tooltip.style("opacity", 0);
                        }
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

        if (attr.annotatable){
            enableAnnotation(attr.id);
        }

        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.glyphs){
            enableGlyphs(attr.id);
        }
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};