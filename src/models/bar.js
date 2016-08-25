import { quorra, QuorraPlot } from '../quorra.js';


function Bar(attributes) {
    /**
    quorra.bar()

    Bar plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3943967

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-bar",
        layout: "stacked"
    }, attributes));
    this.type = "bar";

    // overwrite render method
    this.plot = function() {

        // get hot data
        _this.plotdata = _this.hotdata();

        // organizing data
        // no interpolation should happen here because users should be
        // responsible for ensuring that their data is complete
        var layers = [];
        var ugrps = _this.pallette.domain();
        if (typeof _this.plotdata[0].x === 'string') {
            _this.plotdata = _this.plotdata.sort(function(a, b) { return a.x > b.x; });
        }
        for (var grp in ugrps) {
            var flt = _.filter(_this.plotdata, function(d){ return d.group == ugrps[grp]; });
            flt = _.map(flt, function(d) {
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
        var layer = _this.plotarea.selectAll(".layer")
            .remove().data(layers)
            .enter().append("g")
            .attr("class","layer");

        var bar = layer.selectAll("rect")
            .remove().data(function(d){ return d; })
            .enter().append("rect")
            .attr("class", function(d, i) {
                return "bar " + "g_" + d.group;
            })
            .attr("x", function(d, i) {
                if (layers[0].length > 1){
                    var offset = (typeof _this.attr.x(d, i) === 'string') ? 0.5 : 0;
                    if (_this.attr.layout === "stacked"){
                        return _this.xscale(_this.xmapper(_this.attr.x(d, i)) - offset);
                    }else{
                        var diff = Math.abs(_this.xscale(_this.xmapper(_this.attr.x(layers[0][1]))) - _this.xscale(_this.xmapper(_this.attr.x(layers[0][0]))));
                        return _this.xscale(_this.xmapper(_this.attr.x(d, i)) - offset) + _this.pallette.range().indexOf(_this.pallette(d.group))*(diff / _this.pallette.domain().length);
                    }
                }else{
                    var range = _this.xscale.range();
                    return range[1] - range[0] - 2;
                }
            })
            // NOTE: this needs to be fixed so that y0 is 
            // parameterized before this takes place.
            .attr("y", function(d, i) {
                return (_this.attr.layout == "stacked") ? _this.yscale(_this.ymapper(d.y0 + d.y)) : _this.yscale(_this.ymapper(d.y));
            })
            .attr("height", function(d, i){ return (_this.attr.layout == "stacked") ? (_this.yscale(_this.ymapper(d.y0)) - _this.yscale(_this.ymapper(d.y0 + d.y))) : _.max([_this.innerheight - _this.yscale(_this.ymapper(d.y)), 0]); })
            .attr("width", function(d){
                if (layers[0].length > 1){
                    var diff = Math.abs(_this.xscale(_this.xmapper(_this.attr.x(layers[0][1]))) - _this.xscale(_this.xmapper(_this.attr.x(layers[0][0]))));
                    if (_this.attr.layout === "stacked"){
                        return diff - 2;
                    }else{
                        return (diff / _this.pallette.domain().length) - 2;
                    }
                }else{
                    var range = _this.xscale.range();
                    return range[1] - range[0] - 2;
                }
            }).attr("fill", function(d, i){ return _this.pallette(d.group); })
            .style("opacity", _this.attr.opacity)
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, d.group) ? 'hidden' : 'visible';
            })
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(d.label)
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
            }).on("click", function(d, i) {
                _this.attr.events.click(d, i);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            });
    }

    return this.go;
}

Bar.prototype = Object.create(QuorraPlot.prototype);
Bar.prototype.constructor = Bar;
quorra.bar = function(attributes) {
    return new Bar(attributes);
};

export { Bar }
