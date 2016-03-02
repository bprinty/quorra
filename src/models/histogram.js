function Histogram(attributes) {
    /**
    quorra.histogram()

    Histogram. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */
    var _this = this;

    // parent class initialization
    Bar.call(this, _.extend({
        class: "quorra-histogram",
        bins: 10,
        display: 'counts' // fraction, percent, counts
    }, attributes));
    this.type = "histogram";

    // data transformation
    _this.attr.transform = function(data) {

        // formatters
        if (_this.attr.display == "percent") {
            var format = d3.format("0.02%");
        } else if (_this.attr.display == "counts") {
            var format = d3.format(".0f");
        } else if (_this.attr.display == "fraction"){
            var format = d3.format(".02f");
        }

        // generate histogram binning
        var histogram = d3.layout.histogram()
            .frequency(false)
            .bins(d3.scale.linear().ticks(_this.attr.bins));

        // rearranging data
        var grps = _.uniquesort(data, _this.attr.group);
        var newdata = [];
        for (var grp in grps){
            var subdat = _.filter(data, function(d){ return d.group == grps[grp]; });
            var newgrp = histogram(_.map(subdat, function(d){ return d.x }));
            newgrp = _.map(newgrp, function(d){
                if (_this.attr.display == 'counts') {
                    d.y = d.y*subdat.length;
                } else if (_this.attr.display == 'percent') {
                    d.y = d.y;
                }
                return {
                    x: d.x,
                    y: d.y,
                    group: grps[grp],
                    label: format(d.y)
                };
            });
            newdata = newdata.concat(newgrp);
        }

        return newdata;
    }

    return this.go;
}


Histogram.prototype = Object.create(Bar.prototype);
Histogram.prototype.constructor = Histogram;
quorra.histogram = Histogram;
