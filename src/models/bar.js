quorra.bar = function(attributes) {
    /**
    quorra.bar()

    Bar plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3943967

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
    attr.layout = "stacked";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);

        // transform data (if transformation function is applied)
        // this is used for histogram plots
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
            zoom: false,
            pan: true,
            color: color
        }

        var axes, bar;
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
                .attr("class","layer")
                .attr("clip-path", "url(#clip)");

            var bar = layer.selectAll("rect")
                .data(function(d){ return d; })
                .enter().append("rect")
                .attr("class", function(d, i){
                    return "bar " + "g_" + d.group;
                })
                .attr("x", function(d, i){
                    if (layers[0].length > 1){
                        if (attr.layout === "stacked"){
                            return axes.xScale(attr.x(d, i));
                        }else{
                            var diff = Math.abs(axes.xScale(attr.x(layers[0][1])) - axes.xScale(attr.x(layers[0][0])));
                            return axes.xScale(attr.x(d, i)) + color.range().indexOf(color(d.group))*(diff / color.domain().length);
                        }
                    }else{
                        var range = axes.xScale.range();
                        return range[1] - range[0] - 2;
                    }
                })
                // NOTE: this needs to be fixed so that y0 is 
                // parameterized before this takes place.
                .attr("y", function(d, i){ return (attr.layout == "stacked") ? axes.yScale(d.y0 + d.y) : axes.yScale(d.y); })
                .attr("height", function(d, i){ return (attr.layout == "stacked") ? (axes.yScale(d.y0) - axes.yScale(d.y0 + d.y)) : _.max([dim.innerHeight - axes.yScale(d.y), 0]); })
                .attr("width", function(d){
                    if (layers[0].length > 1){
                        var diff = Math.abs(axes.xScale(attr.x(layers[0][1])) - axes.xScale(attr.x(layers[0][0])));
                        if (attr.layout === "stacked"){
                            return diff - 2;
                        }else{
                            return (diff / color.domain().length) - 2;
                        }
                    }else{
                        var range = axes.xScale.range();
                        return range[1] - range[0] - 2;
                    }
                }).attr("fill", function(d, i){ return color(d.group); })
                .style("opacity", attr.opacity)
                .style("visibility", function(d){
                    return _.contains(attr.toggled, d.group) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (attr.tooltip){
                        attr.tooltip.html(d.label)
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
                });

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

        if (attr.glyphs){
            enableGlyphs(attr.id);
        }
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};