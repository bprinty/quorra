quorra.scatter = function(attributes) {
    /**
    quorra.scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
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
        
        // transform data (if transformation function is applied)
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

            // plotting points
            var dot = svg.selectAll(".dot")
                .data(newdata)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", attr.size)
                .attr("cx", function(d, i) {
                    return (quorra.random()-0.5)*attr.xjitter + axes.xScale(attr.x(d, i));
                })
                .attr("cy", function(d, i) {
                    return (quorra.random()-0.5)*attr.yjitter + axes.yScale(attr.y(d, i));
                })
                .style("fill", function(d, i) { return color(attr.group(d, i)); })
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
                });

            // generating density ticks (if specified)
            if (attr.xdensity){
                svg.selectAll(".xtick")
                    .data(newdata)
                    .enter().append("line")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", function(d, i){
                        return "xtick " + "g_" + d.group;
                    })
                    .attr("x1", function(d, i) { return axes.xScale(attr.x(d, i)); })
                    .attr("x2", function(d, i) { return axes.xScale(attr.x(d, i)); })
                    .attr("y1", function(d, i) { return dim.innerHeight; })
                    .attr("y2", function(d, i) { return dim.innerHeight-10; })
                    .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
                    });
                    // TODO: maybe include two-way selection/highlighting here?
            }
            if (attr.ydensity){
                svg.selectAll(".ytick")
                    .data(newdata)
                    .enter().append("line")
                    .attr("clip-path", "url(#clip)")
                    .attr("class", function(d, i){
                        return "ytick " + "g_" + d.group;
                    })
                    .attr("x1", function(d, i) { return 0; })
                    .attr("x2", function(d, i) { return 10; })
                    .attr("y1", function(d, i) { return axes.yScale(attr.y(d, i)); })
                    .attr("y2", function(d, i) { return axes.yScale(attr.y(d, i)); })
                    .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
                    .style("opacity", attr.opacity)
                    .style("visibility", function(d){
                        return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
                    });
            }

            // generating regression line with smoothing curve (if specified)
            if (attr.lm != false){
                console.log("Not yet implemented!");
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

        if (attr.zoomable){
            enableZoom(attr.id);
        }

        if (attr.annotatable){
            enableAnnotation(attr.id);
        }

        if (attr.glyphs){
            enableGlyphs(attr.id);
        }
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};