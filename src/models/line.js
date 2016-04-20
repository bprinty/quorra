function Line(attributes) {
    /**
    quorra.line()

    Line plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-line",
        points: 0,
        size: 3,
        layout: "line",
        interpolate: "linear"
    }, attributes));
    this.type = "line";

    // overwrite render method
    this.plot = function() {
        quorra.log('drawing plot data');

        // configuring path renderer
        var path = d3.svg.line()
            .x(function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
            .y(function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
            .interpolate(_this.attr.interpolate);

        // draw lines
        var ugrps = _this.pallette.domain();
        for (var grp in ugrps) {

            // lines
            var subdat = _.filter(_this.data, function(d){ return d.group == ugrps[grp]; });
            _this.plotarea.append("path")
                .datum(subdat)
                .attr("class", function(d, i){
                    return "line " + "g_" + d[0].group;
                })
                .attr("d", function(d){
                    var p = path(d);
                    if (_this.attr.layout === "line") {
                        return p;
                    } else if (_this.attr.layout === "area") {
                        return [
                            p,
                            "L" + _this.xscale(_this.xmapper(_this.domain[_this.domain.length - 1])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                            "L" + _this.xscale(_this.xmapper(_this.domain[0])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                            "Z"
                        ].join('');
                    }
                })
                .style("fill", function(d){
                    if (_this.attr.layout === "line") {
                        return "none";
                    } else if (_this.attr.layout === "area") {
                        return _this.pallette(d[0].group);
                    }
                })
                .style("stroke", _this.pallette(ugrps[grp]))
                .style("stroke-width", _this.attr.size)
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d[0], i)) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i) {
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d[0].group)
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mousemove", function(d) {
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mouseout", function(d) {
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                }).on("click", _this.attr.groupclick);
        }

        // draw points (if specified)
        if (_this.attr.points > 0) {

            _this.plotarea.selectAll(".dot")
                .remove().data(_this.data)
                .enter().append("circle")
                .attr("class", function(d, i){
                    return "dot " + "g_" + d.group;
                })
                .attr("r", _this.attr.points)
                .attr("cx", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .attr("cy", function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
                .style("fill", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i) {
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                })
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(_this.attr.label(d, i))
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mousemove", function(d){
                    if (_this.attr.tooltip){
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                }).on("click", _this.attr.labelclick);
        }
    }

    return this.go;
}

Line.prototype = Object.create(QuorraPlot.prototype);
Line.prototype.constructor = Line;
quorra.line = function(attributes) {
    return new Line(attributes);
};
