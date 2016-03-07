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
        class: "quorra-scatter",
        lm: false,
        xdensity: false,
        ydensity: false,
        xjitter: 0,
        yjitter: 0,
        size: 5,
    }, attributes));
    this.type = "scatter";

    // overwrite render method
    this.plot = function() {

        // plotting points
        _this.plotarea.selectAll(".dot")
            .remove().data(_this.data)
            .enter().append("circle")
            .attr("class", function(d, i){
                return "dot " + "g_" + d.group;
            })
            .attr("r", _this.attr.size)
            .attr("cx", function(d, i) {
                return (quorra.random() - 0.5) * _this.attr.xjitter + _this.xscale(_this.attr.x(d, i));
            })
            .attr("cy", function(d, i) {
                return (quorra.random() - 0.5) * _this.attr.yjitter + _this.yscale(_this.attr.y(d, i));
            })
            .style("fill", function(d, i) { return _this.pallette(_this.attr.group(d, i)); })
            .style("opacity", _this.attr.opacity)
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, _this.attr.group(d)) ? 'hidden' : 'visible';
            })
            .attr("clip-path", "url(#clip)")
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(_this.attr.label(d, i))
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("opacity", 0);
                }
            });

        // generating density ticks (if specified)
        if (_this.attr.xdensity){
            _this.plotarea.selectAll(".xtick")
                .remove().data(_this.data)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "xtick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return _this.xscale(_this.attr.x(d, i)); })
                .attr("x2", function(d, i) { return _this.xscale(_this.attr.x(d, i)); })
                .attr("y1", function(d, i) { return _this.innerheight; })
                .attr("y2", function(d, i) { return _this.innerheight-10; })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        if (_this.attr.ydensity){
            _this.plotarea.selectAll(".ytick")
                .remove().data(_this.data)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "ytick " + "g_" + d.group;
                })
                .attr("x1", function(d, i) { return 0; })
                .attr("x2", function(d, i) { return 10; })
                .attr("y1", function(d, i) { return _this.yscale(_this.attr.y(d, i)); })
                .attr("y2", function(d, i) { return _this.yscale(_this.attr.y(d, i)); })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        // generating regression line with smoothing curve (if specified)
        if (_this.attr.lm != false){
            console.log("Not yet implemented!");
        }
    }

    return this.go;
}

Scatter.prototype = Object.create(QuorraPlot.prototype);
Scatter.prototype.constructor = Scatter;
quorra.scatter = function(attributes) {
    return new Scatter(attributes);
};
