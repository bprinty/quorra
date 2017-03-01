function Scatter(attributes) {
    /**
    Scatter()

    Scatter plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887118

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-scatter",
        lm: false,
        xdensity: false,
        ydensity: false,
        xjitter: 0,
        yjitter: 0,
        size: 5,
        line: false,
        lineinterpolate: "linear",
        linelayout: "line",
        linesize: 3
    }, attributes));
    this.type = "scatter";

    // overwrite render method
    this.plot = function() {

        // re-rendering data with jitter
        var domain = _this.xscale.domain();
        _this.plotdata = _.map(
            _this.hotdata(), function(d, i) {
            var c = extend({}, d);
            c.x = (quorra.pseudorandom(i) - 0.5) * _this.attr.xjitter + _this.xscale(_this.xmapper(_this.attr.x(d, i)));
            c.y = (quorra.pseudorandom(i) - 0.5) * _this.attr.yjitter + _this.yscale(_this.ymapper(_this.attr.y(d, i)));
            return c;
        });

        // plotting line
        if (_this.attr.line !== false) {
            var path = d3.svg.line()
                .x(function(d, i) { return d.x; })
                .y(function(d, i) { return d.y; })
                .interpolate(_this.attr.lineinterpolate);
    
            var ugrps = _this.pallette.domain();
            for (var grp in ugrps) {
                var subdat = _.filter(_this.plotdata, function(d, i){ return _this.attr.group(d) == ugrps[grp]; });
                if (subdat.length == 0) {
                    continue;
                }
                _this.plotarea.append("path")
                    .datum(subdat)
                    .attr("class", function(d, i){
                        return "line " + "g_" + _this.attr.group(d[0]);
                    })
                    .attr("d", function(d){
                        var p = path(d);
                        if (_this.attr.linelayout === "line") {
                            return p;
                        } else if (_this.attr.linelayout === "area") {
                            return [
                                p,
                                "L" + _this.xscale(_this.xmapper(_this.domain[_this.domain.length - 1])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                                "L" + _this.xscale(_this.xmapper(_this.domain[0])) + "," + _this.yscale(_this.ymapper(_this.range[0])),
                                "Z"
                            ].join('');
                        }
                    })
                    .style("fill", function(d){
                        if (_this.attr.linelayout === "line") {
                            return "none";
                        } else if (_this.attr.linelayout === "area") {
                            return _this.pallette(_this.attr.group(d[0]));
                        }
                    })
                    .style("stroke", function(d, i) {
                        if (_.contains(_this.attr.selected, _this.attr.group(d[0]))) {
                            if (_this.attr.hovercolor !== false) {
                                return _this.attr.hovercolor;
                            } else {
                                return 'firebrick';
                            }
                        } else {
                            return _this.pallette(_this.attr.group(d[0]));
                        }
                    })
                    .style("stroke-width", _this.attr.linesize)
                    .style("opacity", _this.attr.opacity)
                    .style("visibility", function(d, i) {
                        if (_.contains(_this.attr.selected, _this.attr.group(d[0]))) {
                            return 'visible';
                        }
                        if (_this.attr.line === 'hover') {
                            return 'hidden';
                        } else if (_this.attr.line) {
                            return _.contains(_this.attr.toggled, _this.attr.group(d[0])) ? 'hidden' : 'visible';
                        }
                    }).on("click", function(d, i){
                        if (_this.attr.selectable !== false) {
                            _this.attr.selected = selectmerge(_this.attr.selected, _this.attr.group(d[0]), _this.attr.selectable);
                            _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                        }
                        if (_this.attr.slider) {
                            _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                            _this.attr.slider.__parent__.redraw();
                        }
                        _this.attr.events.click(d, i);
                    });
            }
        }

        // plotting points
        _this.plotarea.selectAll(".dot")
            .remove().data(_this.plotdata)
            .enter().append("circle")
            .attr("class", function(d, i){
                return "dot " + "g_" + _this.attr.group(d, i);
            })
            .attr("r", _this.attr.size)
            .attr("cx", function(d, i) { return d.x; })
            .attr("cy", function(d, i) { return d.y; })
            .style("fill", function(d, i){
                if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                    if (_this.attr.hovercolor !== false) {
                        return _this.attr.hovercolor;
                    } else {
                        return 'firebrick';
                    }
                } else {
                    return _this.pallette(_this.attr.group(d, i));
                }
            })
            .style("opacity", _this.attr.opacity)
            .style("visibility", function(d, i){
                return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
            })
            .attr("clip-path", "url(#clip)")
            .on("mouseover", function(d, i){
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(_this.attr.label(d, i))
                        .style("visibility", "visible")
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
                if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                    return;
                }
                if (_this.attr.line === 'hover') {
                    _this.plotarea.selectAll('.line.g_' + _this.attr.group(d, i)).style('visibility', 'visible');
                }
                if (_this.attr.hovercolor !== false) {
                    _this.plotarea.selectAll('.dot.g_' + _this.attr.group(d, i)).style("fill", _this.attr.hovercolor);
                    _this.plotarea.selectAll('.line.g_' + _this.attr.group(d, i)).style("stroke", _this.attr.hovercolor);
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.dot.g_' + _this.attr.group(d, i)).style("fill", _this.attr.hovercolor);
                        _this.attr.slider.__parent__.plotarea.selectAll('.line.g_' + _this.attr.group(d, i)).style("stroke", _this.attr.hovercolor);
                    }
                } else {
                    d3.select(this).style("opacity", 0.25);
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.g_' + _this.attr.group(d, i)).style("opacity", 0.25);
                    }
                }
            }).on("mousemove", function(d, i){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mouseout", function(d, i){
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("visibility", "hidden");
                }
                if (_.contains(_this.attr.selected, _this.attr.group(d, i))) {
                    return;
                }
                if (_this.attr.line === 'hover') {
                    _this.plotarea.selectAll('.line.g_' + _this.attr.group(d, i)).style('visibility', 'hidden');
                }
                if (_this.attr.hovercolor !== false) {
                    _this.plotarea.selectAll('.dot.g_' + _this.attr.group(d, i)).style("fill", _this.pallette(_this.attr.group(d, i)));
                    _this.plotarea.selectAll('.line.g_' + _this.attr.group(d, i)).style("stroke", _this.pallette(_this.attr.group(d, i)));
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.dot.g_' + _this.attr.group(d, i)).style("fill", _this.pallette(_this.attr.group(d, i)));
                        _this.attr.slider.__parent__.plotarea.selectAll('.line.g_' + _this.attr.group(d, i)).style("stroke", _this.pallette(_this.attr.group(d, i)));
                    }
                } else {
                    d3.select(this).style("opacity", _this.attr.opacity);
                    if (_this.attr.slider !== null) {
                        _this.attr.slider.__parent__.plotarea.selectAll('.g_' + _this.attr.group(d, i)).style("opacity", _this.attr.opacity);
                    }
                }
            }).on("click", function(d, i){
                if (_this.attr.selectable !== false) {
                    _this.attr.selected = selectmerge(_this.attr.selected, _this.attr.group(d, i), _this.attr.selectable);
                    _this.redraw(_this.xscale.domain(), _this.yscale.domain(), false);
                    if (_this.attr.slider) {
                        _this.attr.slider.__parent__.attr.selected = _this.attr.selected;
                        _this.attr.slider.__parent__.redraw();
                    }
                }
                _this.attr.events.click(d, i);
            });

        // generating density ticks (if specified)
        if (_this.attr.xdensity){
            _this.plotarea.selectAll(".xtick")
                .remove().data(_this.plotdata)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "xtick " + "g_" + _this.attr.group(d, i);
                })
                .attr("x1", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .attr("x2", function(d, i) { return _this.xscale(_this.xmapper(_this.attr.x(d, i))); })
                .attr("y1", function(d, i) { return _this.innerheight; })
                .attr("y2", function(d, i) { return _this.innerheight-10; })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        if (_this.attr.ydensity){
            _this.plotarea.selectAll(".ytick")
                .remove().data(_this.plotdata)
                .enter().append("line")
                .attr("clip-path", "url(#clip)")
                .attr("class", function(d, i){
                    return "ytick " + "g_" + _this.attr.group(d, i);
                })
                .attr("x1", function(d, i) { return 0; })
                .attr("x2", function(d, i) { return 10; })
                .attr("y1", function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
                .attr("y2", function(d, i) { return _this.yscale(_this.ymapper(_this.attr.y(d, i))); })
                .attr("stroke", function(d, i){ return _this.pallette(_this.attr.group(d, i)); })
                .style("opacity", _this.attr.opacity)
                .style("visibility", function(d, i){
                    return _.contains(_this.attr.toggled, _this.attr.group(d, i)) ? 'hidden' : 'visible';
                });
        }

        // generating regression line with smoothing curve (if specified)
        if (_this.attr.lm != false){
            quorra.error("Not yet implemented!");
        }
    }

    return this.go;
}

Scatter.prototype = Object.create(QuorraPlot.prototype);
Scatter.prototype.constructor = Scatter;
quorra.scatter = function(attributes) {
    return new Scatter(attributes);
};
