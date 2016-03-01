
function Scatter(attributes) {
    /**
    Scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */
    var _this = this;

    // plot-specific attributes
    QuorraPlot.call(this, _.extend({
        lm: false,
        xdensity: false,
        ydensity: false,
        xjitter: 0,
        yjitter: 0,
        size: 5,
    }, attributes));

    // overwrite render method
    _this.plot = function(xrange, yrange) {
        console.log('plot');
    }

        // // bind attributes to controller
        // quorra.controller[attr.id] = {
        //     x: attr.margin.left,
        //     y: attr.margin.top,
        //     left: attr.margin.left,
        //     top: attr.margin.top,
        //     width: dim.innerWidth,
        //     height: dim.innerHeight,
        //     xstack: [],
        //     ystack: [],
        //     xdrag: null,
        //     ydrag: null,
        //     scale: 1,
        //     time: Date.now(),
        //     svg: selection.select('svg'),
        //     attr: attr,
        //     zoom: false,
        //     pan: true,
        //     color: color
        // }

        // var axes, line, dot;
        // quorra.controller[_this.attr.id].render = function(xrange, yrange){
            
        //     // clean previous rendering
        //     svg.selectAll("*").remove();

        //     // configure axes
        //     _this.attr.xrange = xrange;
        //     _this.attr.yrange = yrange;
        //     axes = parameterizeAxes(selection, newdata, _this.attr, dim.innerWidth, dim.innerHeight);
        //     if (quorra.controller[_this.attr.id].xstack.length == 0){
        //         quorra.controller[_this.attr.id].xstack.push(axes.xScale);
        //         quorra.controller[_this.attr.id].ystack.push(axes.yScale);
        //     }
        //     quorra.controller[_this.attr.id].xdrag = axes.xScale;
        //     quorra.controller[_this.attr.id].ydrag = axes.yScale;

        //     // axes
        //     _this.drawAxes(svg, _this.attr, axes.xAxis, axes.yAxis, dim.innerWidth, dim.innerHeight);

        //     // plotting points
        //     var dot = svg.selectAll(".dot")
        //         .data(newdata)
        //         .enter().append("circle")
        //         .attr("class", function(d, i){
        //             return "dot " + "g_" + d.group;
        //         })
        //         .attr("r", attr.size)
        //         .attr("cx", function(d, i) {
        //             return (quorra.random() - 0.5) * _this.attr.xjitter + axes.xScale(_this.attr.x(d, i));
        //         })
        //         .attr("cy", function(d, i) {
        //             return (quorra.random() - 0.5) * _this.attr.yjitter + axes.yScale(_this.attr.y(d, i));
        //         })
        //         .style("fill", function(d, i) { return color(_this.attr.group(d, i)); })
        //         .style("opacity", _this.attr.opacity)
        //         .style("visibility", function(d){
        //             return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
        //         })
        //         .attr("clip-path", "url(#clip)")
        //         .on("mouseover", function(d, i){
        //             d3.select(this).style("opacity", 0.25);
        //             if (_this.attr.tooltip){
        //                 _this.attr.tooltip.html(attr.label(d, i))
        //                     .style("opacity", 1)
        //                     .style("left", (d3.event.pageX + 5) + "px")
        //                     .style("top", (d3.event.pageY - 20) + "px");
        //             }
        //         }).on("mousemove", function(d){
        //             if (_this.attr.tooltip){
        //                 _this.attr.tooltip
        //                     .style("left", (d3.event.pageX + 5) + "px")
        //                     .style("top", (d3.event.pageY - 20) + "px");
        //             }
        //         }).on("mouseout", function(d){
        //             d3.select(this).style("opacity", _this.attr.opacity);
        //             if (_this.attr.tooltip){
        //                 _this.attr.tooltip.style("opacity", 0);
        //             }
        //         });

            // // generating density ticks (if specified)
            // if (attr.xdensity){
            //     svg.selectAll(".xtick")
            //         .data(newdata)
            //         .enter().append("line")
            //         .attr("clip-path", "url(#clip)")
            //         .attr("class", function(d, i){
            //             return "xtick " + "g_" + d.group;
            //         })
            //         .attr("x1", function(d, i) { return axes.xScale(attr.x(d, i)); })
            //         .attr("x2", function(d, i) { return axes.xScale(attr.x(d, i)); })
            //         .attr("y1", function(d, i) { return dim.innerHeight; })
            //         .attr("y2", function(d, i) { return dim.innerHeight-10; })
            //         .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
            //         .style("opacity", attr.opacity)
            //         .style("visibility", function(d){
            //             return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
            //         });
            //         // TODO: maybe include two-way selection/highlighting here?
            // }
            // if (attr.ydensity){
            //     svg.selectAll(".ytick")
            //         .data(newdata)
            //         .enter().append("line")
            //         .attr("clip-path", "url(#clip)")
            //         .attr("class", function(d, i){
            //             return "ytick " + "g_" + d.group;
            //         })
            //         .attr("x1", function(d, i) { return 0; })
            //         .attr("x2", function(d, i) { return 10; })
            //         .attr("y1", function(d, i) { return axes.yScale(attr.y(d, i)); })
            //         .attr("y2", function(d, i) { return axes.yScale(attr.y(d, i)); })
            //         .attr("stroke", function(d, i){ return color(attr.group(d, i)); })
            //         .style("opacity", attr.opacity)
            //         .style("visibility", function(d){
            //             return _.contains(attr.toggled, attr.group(d)) ? 'hidden' : 'visible';
            //         });
            // }

            // // generating regression line with smoothing curve (if specified)
            // if (_this.attr.lm != false){
            //     console.log("Not yet implemented!");
            // }

            // // do annotation
            // if (_this.attr.annotation){
            //     annotatePlot(attr.id);
            // }
        // }

        // render
        // quorra.controller[attr.id].render(_this.attr.xrange, _this.attr.yrange);

        // // enable components
        // if (_this.attr.legend){
        //     _this.enableLegend(attr.id);
        // }

        // if (_this.attr.zoomable){
        //     _this.enableZoom(attr.id);
        // }

        // if (_this.attr.glyphs){
        //     _this.enableGlyphs(attr.id);
        // }

    return this.go;
}

Scatter.prototype = Object.create(QuorraPlot.prototype);

Scatter.prototype.constructor = Scatter;

quorra.scatter = Scatter;